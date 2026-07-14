// ----------------------------------------------
// FILTERS.JS – Full filter system with real-time preview and strength sliders
// KittyCreate Studio v1
// ----------------------------------------------

import { getActiveLayer, renderLayers, getLayers } from '../core/layers.js';
import { pushState } from '../core/history.js';
import { getCanvasContext, getCanvasSize } from '../core/canvas.js';
import { showStatus } from '../utils/utils.js';

// --- State ---
let ctx = null;
let canvas = null;
let previewCanvas = null;
let isPreviewing = false;

// --- Init ---
export function initFilters(context, canvasEl) {
    ctx = context;
    canvas = canvasEl;

    // Create preview canvas
    previewCanvas = document.createElement('canvas');
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.top = '0';
    previewCanvas.style.left = '0';
    previewCanvas.style.pointerEvents = 'none';
    previewCanvas.style.display = 'none';
    canvas.parentElement.appendChild(previewCanvas);

    // Bind UI controls
    document.getElementById('filter-blur')?.addEventListener('click', () => {
        showFilterDialog('blur', 'Blur Radius', 3, 1, 20);
    });
    document.getElementById('filter-glow')?.addEventListener('click', () => {
        showFilterDialog('glow', 'Glow Strength', 20, 5, 80);
    });
    document.getElementById('filter-edge')?.addEventListener('click', () => {
        applyFilter('edge');
    });
    document.getElementById('filter-sharpen')?.addEventListener('click', () => {
        showFilterDialog('sharpen', 'Sharpen Strength', 1, 0.5, 3);
    });
    document.getElementById('filter-pixelate')?.addEventListener('click', () => {
        showFilterDialog('pixelate', 'Pixel Size', 10, 2, 30);
    });
    document.getElementById('filter-halftone')?.addEventListener('click', () => {
        showFilterDialog('halftone', 'Dot Size', 4, 2, 20);
    });

    console.log('🎨 Filters initialized');
}

// --- Show filter dialog with slider ---
function showFilterDialog(filterName, label, defaultValue, min, max) {
    const dialog = document.getElementById('filter-dialog');
    if (!dialog) {
        // Fallback to prompt
        const value = prompt(`${label} (${min}-${max}):`, defaultValue);
        if (value !== null) {
            applyFilter(filterName, { [getParamName(filterName)]: parseFloat(value) });
        }
        return;
    }

    document.getElementById('filter-label').textContent = label;
    const slider = document.getElementById('filter-slider');
    slider.min = min;
    slider.max = max;
    slider.step = (max - min) / 100;
    slider.value = defaultValue;
    document.getElementById('filter-value').textContent = defaultValue;

    // Store current filter
    slider.dataset.filter = filterName;
    slider.dataset.param = getParamName(filterName);

    dialog.style.display = 'block';
    isPreviewing = false;

    // Preview on slider change
    slider.oninput = () => {
        const val = parseFloat(slider.value);
        document.getElementById('filter-value').textContent = val;
        previewFilter(filterName, { [slider.dataset.param]: val });
    };

    // Apply button
    document.getElementById('filter-apply').onclick = () => {
        const val = parseFloat(slider.value);
        applyFilter(filterName, { [slider.dataset.param]: val });
        dialog.style.display = 'none';
        previewCanvas.style.display = 'none';
    };

    // Cancel button
    document.getElementById('filter-cancel').onclick = () => {
        dialog.style.display = 'none';
        previewCanvas.style.display = 'none';
        renderLayers();
    };
}

// --- Get param name ---
function getParamName(filter) {
    const map = {
        blur: 'radius',
        glow: 'strength',
        sharpen: 'strength',
        pixelate: 'size',
        halftone: 'dotSize'
    };
    return map[filter] || 'strength';
}

// --- Preview filter ---
function previewFilter(filterName, params) {
    const layer = getActiveLayer();
    if (!layer) return;

    // Copy current layer to preview
    const src = layer.canvas;
    previewCanvas.width = src.width;
    previewCanvas.height = src.height;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.drawImage(src, 0, 0);

    // Apply filter to preview
    const imageData = pCtx.getImageData(0, 0, src.width, src.height);
    applyFilterToData(imageData.data, src.width, src.height, filterName, params);
    pCtx.putImageData(imageData, 0, 0);

    // Show preview
    const rect = canvas.getBoundingClientRect();
    previewCanvas.style.width = canvas.style.width;
    previewCanvas.style.height = canvas.style.height;
    previewCanvas.style.display = 'block';
    previewCanvas.style.left = '0';
    previewCanvas.style.top = '0';
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.pointerEvents = 'none';

    isPreviewing = true;
}

// --- Apply filter ---
export function applyFilter(filterName, params = {}) {
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const layerCtx = layer.canvas.getContext('2d');
    const imageData = layerCtx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const w = layer.canvas.width;
    const h = layer.canvas.height;

    applyFilterToData(imageData.data, w, h, filterName, params);
    layerCtx.putImageData(imageData, 0, 0);

    renderLayers();
    pushState(ctx, w, h);
    showStatus(`🎨 Applied ${filterName} filter`);

    // Hide preview
    if (previewCanvas) previewCanvas.style.display = 'none';
    isPreviewing = false;
}

// --- Filter algorithms ---
function applyFilterToData(data, w, h, filterName, params) {
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
    }
}

// ----- Individual filters -----

function applyBlur(data, w, h, radius) {
    const copy = new Uint8ClampedArray(data);
    const r = Math.max(1, Math.floor(radius));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const px = Math.max(0, Math.min(w - 1, x + dx));
                    const py = Math.max(0, Math.min(h - 1, y + dy));
                    const idx = (py * w + px) * 4;
                    rSum += copy[idx];
                    gSum += copy[idx + 1];
                    bSum += copy[idx + 2];
                    count++;
                }
            }
            const idx = (y * w + x) * 4;
            data[idx] = rSum / count;
            data[idx + 1] = gSum / count;
            data[idx + 2] = bSum / count;
        }
    }
}

function applyGlow(data, w, h, strength) {
    const copy = new Uint8ClampedArray(data);
    const radius = Math.max(2, Math.floor(strength / 10));
    applyBlur(data, w, h, radius);
    const factor = strength / 100;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + copy[i] * factor);
        data[i + 1] = Math.min(255, data[i + 1] + copy[i + 1] * factor);
        data[i + 2] = Math.min(255, data[i + 2] + copy[i + 2] * factor);
    }
}

function applyEdgeDetect(data, w, h) {
    const copy = new Uint8ClampedArray(data);
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let gxSum = 0, gySum = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const px = Math.max(0, Math.min(w - 1, x + dx));
                    const py = Math.max(0, Math.min(h - 1, y + dy));
                    const idx = (py * w + px) * 4;
                    const gray = (copy[idx] + copy[idx + 1] + copy[idx + 2]) / 3;
                    const kx = [[-1,0,1],[-2,0,2],[-1,0,1]][dy+1][dx+1];
                    const ky = [[-1,-2,-1],[0,0,0],[1,2,1]][dy+1][dx+1];
                    gxSum += gray * kx;
                    gySum += gray * ky;
                }
            }
            const mag = Math.min(255, Math.sqrt(gxSum*gxSum + gySum*gySum));
            const idx = (y * w + x) * 4;
            data[idx] = data[idx+1] = data[idx+2] = mag;
        }
    }
}

function applySharpen(data, w, h, strength) {
    const copy = new Uint8ClampedArray(data);
    const s = Math.min(3, Math.max(0.5, strength));
    const kernel = [[0,-s,0],[-s,1+4*s,-s],[0,-s,0]];
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let rSum = 0, gSum = 0, bSum = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const px = Math.max(0, Math.min(w - 1, x + dx));
                    const py = Math.max(0, Math.min(h - 1, y + dy));
                    const idx = (py * w + px) * 4;
                    const k = kernel[dy+1][dx+1];
                    rSum += copy[idx] * k;
                    gSum += copy[idx+1] * k;
                    bSum += copy[idx+2] * k;
                }
            }
            const idx = (y * w + x) * 4;
            data[idx] = Math.max(0, Math.min(255, rSum));
            data[idx+1] = Math.max(0, Math.min(255, gSum));
            data[idx+2] = Math.max(0, Math.min(255, bSum));
        }
    }
}

function applyPixelate(data, w, h, size) {
    const s = Math.max(2, Math.floor(size));
    for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
            const cx = Math.min(x + Math.floor(s/2), w - 1);
            const cy = Math.min(y + Math.floor(s/2), h - 1);
            const srcIdx = (cy * w + cx) * 4;
            const r = data[srcIdx], g = data[srcIdx+1], b = data[srcIdx+2], a = data[srcIdx+3];
            for (let dy = 0; dy < s && y+dy < h; dy++) {
                for (let dx = 0; dx < s && x+dx < w; dx++) {
                    const idx = ((y+dy) * w + (x+dx)) * 4;
                    data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = a;
                }
            }
        }
    }
}

function applyHalftone(data, w, h, dotSize) {
    const size = Math.max(2, Math.floor(dotSize));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const gray = (data[idx] + data[idx+1] + data[idx+2]) / 3;
            const gridX = x % size, gridY = y % size;
            const dist = Math.sqrt((gridX - size/2)**2 + (gridY - size/2)**2);
            const dotThreshold = (1 - (gray / 255)) * (size/2);
            const val = dist < dotThreshold ? 0 : 255;
            data[idx] = data[idx+1] = data[idx+2] = val;
        }
    }
}

// --- Expose ---
window.__filters = { applyFilter, previewFilter };