// ----------------------------------------------
// FILTERS.JS – Image filters (blur, glow, edge, sharpen, pixelate, halftone)
// KittyCreate Studio v1
// ----------------------------------------------

import { getActiveLayer, renderLayers, getLayers } from '../core/layers.js';
import { pushState } from '../core/history.js';
import { getCanvasContext, getCanvasSize } from '../core/canvas.js';

// --- State ---
let ctx = null;
let canvas = null;

// --- Init ---
export function initFilters(context, canvasEl) {
    ctx = context;
    canvas = canvasEl;
}

// --- Apply filter to active layer ---
export function applyFilter(filterName, params = {}) {
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const layerCtx = layer.canvas.getContext('2d');
    const imageData = layerCtx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const data = imageData.data;
    const w = layer.canvas.width;
    const h = layer.canvas.height;

    // Apply the filter
    switch (filterName) {
        case 'blur':
            applyBlur(data, w, h, params.radius || 3);
            break;
        case 'glow':
            applyGlow(data, w, h, params.strength || 20);
            break;
        case 'edge':
            applyEdgeDetect(data, w, h);
            break;
        case 'sharpen':
            applySharpen(data, w, h, params.strength || 1);
            break;
        case 'pixelate':
            applyPixelate(data, w, h, params.size || 10);
            break;
        case 'halftone':
            applyHalftone(data, w, h, params.dotSize || 4);
            break;
        default:
            console.warn(`Unknown filter: ${filterName}`);
            return;
    }

    // Put back the data
    layerCtx.putImageData(imageData, 0, 0);
    renderLayers();
    pushState(ctx, w, h);

    // Update status
    const status = document.getElementById('status-tool');
    if (status) status.textContent = `Filter: ${filterName}`;
}

// ----- Filters -----

// 1. Blur (simple box blur)
function applyBlur(data, w, h, radius) {
    const copy = new Uint8ClampedArray(data);
    const r = Math.max(1, Math.floor(radius));
    const size = r * 2 + 1;
    const area = size * size;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
            let count = 0;

            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const px = Math.max(0, Math.min(w - 1, x + dx));
                    const py = Math.max(0, Math.min(h - 1, y + dy));
                    const idx = (py * w + px) * 4;
                    rSum += copy[idx];
                    gSum += copy[idx + 1];
                    bSum += copy[idx + 2];
                    aSum += copy[idx + 3];
                    count++;
                }
            }

            const idx = (y * w + x) * 4;
            data[idx] = rSum / count;
            data[idx + 1] = gSum / count;
            data[idx + 2] = bSum / count;
            data[idx + 3] = aSum / count;
        }
    }
}

// 2. Glow (blur + overlay)
function applyGlow(data, w, h, strength) {
    const copy = new Uint8ClampedArray(data);
    const radius = Math.max(2, Math.floor(strength / 10));

    // Apply blur
    applyBlur(data, w, h, radius);

    // Blend with original (additive)
    for (let i = 0; i < data.length; i += 4) {
        const factor = strength / 100;
        data[i] = Math.min(255, data[i] + copy[i] * factor);
        data[i + 1] = Math.min(255, data[i + 1] + copy[i + 1] * factor);
        data[i + 2] = Math.min(255, data[i + 2] + copy[i + 2] * factor);
        // Keep alpha
    }
}

// 3. Edge Detection (Sobel)
function applyEdgeDetect(data, w, h) {
    const copy = new Uint8ClampedArray(data);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            // Sobel kernels
            const gx = [
                [-1, 0, 1],
                [-2, 0, 2],
                [-1, 0, 1]
            ];
            const gy = [
                [-1, -2, -1],
                [0, 0, 0],
                [1, 2, 1]
            ];

            let rx = 0, ry = 0;
            let gxSum = 0, gySum = 0;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const px = Math.max(0, Math.min(w - 1, x + dx));
                    const py = Math.max(0, Math.min(h - 1, y + dy));
                    const idx = (py * w + px) * 4;
                    const gray = (copy[idx] + copy[idx + 1] + copy[idx + 2]) / 3;

                    const kx = gx[dy + 1][dx + 1];
                    const ky = gy[dy + 1][dx + 1];
                    gxSum += gray * kx;
                    gySum += gray * ky;
                }
            }

            const mag = Math.min(255, Math.sqrt(gxSum * gxSum + gySum * gySum));
            const idx = (y * w + x) * 4;
            data[idx] = mag;
            data[idx + 1] = mag;
            data[idx + 2] = mag;
            // Keep alpha
        }
    }
}

// 4. Sharpen
function applySharpen(data, w, h, strength) {
    const copy = new Uint8ClampedArray(data);
    const s = Math.min(3, Math.max(0.5, strength));

    const kernel = [
        [0, -s, 0],
        [-s, 1 + 4 * s, -s],
        [0, -s, 0]
    ];

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let rSum = 0, gSum = 0, bSum = 0;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const px = Math.max(0, Math.min(w - 1, x + dx));
                    const py = Math.max(0, Math.min(h - 1, y + dy));
                    const idx = (py * w + px) * 4;
                    const k = kernel[dy + 1][dx + 1];

                    rSum += copy[idx] * k;
                    gSum += copy[idx + 1] * k;
                    bSum += copy[idx + 2] * k;
                }
            }

            const idx = (y * w + x) * 4;
            data[idx] = Math.max(0, Math.min(255, rSum));
            data[idx + 1] = Math.max(0, Math.min(255, gSum));
            data[idx + 2] = Math.max(0, Math.min(255, bSum));
        }
    }
}

// 5. Pixelate
function applyPixelate(data, w, h, size) {
    const s = Math.max(2, Math.floor(size));

    for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
            // Sample color from center of block
            const cx = Math.min(x + Math.floor(s / 2), w - 1);
            const cy = Math.min(y + Math.floor(s / 2), h - 1);
            const srcIdx = (cy * w + cx) * 4;

            const r = data[srcIdx];
            const g = data[srcIdx + 1];
            const b = data[srcIdx + 2];
            const a = data[srcIdx + 3];

            // Fill block
            for (let dy = 0; dy < s && y + dy < h; dy++) {
                for (let dx = 0; dx < s && x + dx < w; dx++) {
                    const idx = ((y + dy) * w + (x + dx)) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = a;
                }
            }
        }
    }
}

// 6. Halftone (manga tone)
function applyHalftone(data, w, h, dotSize) {
    const size = Math.max(2, Math.floor(dotSize));

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const threshold = 128;

            // Dot pattern
            const gridX = x % size;
            const gridY = y % size;
            const center = size / 2;
            const dist = Math.sqrt((gridX - center) ** 2 + (gridY - center) ** 2);
            const maxDist = center;

            // Dot size based on gray value
            const dotThreshold = (1 - (gray / 255)) * maxDist;

            const val = dist < dotThreshold ? 0 : 255;
            data[idx] = val;
            data[idx + 1] = val;
            data[idx + 2] = val;
            // Keep alpha
        }
    }
}

// --- Expose ---
window.__filters = { applyFilter };