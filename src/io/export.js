// ----------------------------------------------
// EXPORT.JS – Full export with PNG, JPG, GIF, PawMage
// KittyCreate Studio v1
// ----------------------------------------------

import { getCanvas, getCanvasContext, getCanvasSize } from '../core/canvas.js';
import { getLayers, renderLayers } from '../core/layers.js';
import { getFrames } from '../animation/animation.js';
import { showStatus } from '../utils/utils.js';

let ctx = null;
let canvas = null;

export function initExport(context, canvasEl) {
    ctx = context;
    canvas = canvasEl;

    document.getElementById('export-png')?.addEventListener('click', () => exportPNG());
    document.getElementById('export-jpg')?.addEventListener('click', () => exportJPG());
    document.getElementById('export-gif')?.addEventListener('click', () => {
        // Use animation module's GIF export
        const anim = window.__animation;
        if (anim && anim.exportGIF) {
            anim.exportGIF();
        } else {
            showStatus('⚠️ Animation module not loaded');
        }
    });
    document.getElementById('export-pawmage')?.addEventListener('click', () => exportPawMage());

    console.log('📦 Export module ready');
}

export function exportPNG(filename = 'kitty-export.png') {
    const data = compositeLayers();
    const link = document.createElement('a');
    link.download = filename;
    link.href = data;
    link.click();
    showStatus('📤 Exported PNG');
}

export function exportJPG(filename = 'kitty-export.jpg', quality = 0.92) {
    const data = compositeLayers('image/jpeg', quality);
    const link = document.createElement('a');
    link.download = filename;
    link.href = data;
    link.click();
    showStatus('📤 Exported JPG');
}

function compositeLayers(format = 'image/png', quality = 1) {
    const layers = getLayers();
    const { width, height } = getCanvasSize();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');

    // White background for JPG
    if (format === 'image/jpeg') {
        tCtx.fillStyle = '#ffffff';
        tCtx.fillRect(0, 0, width, height);
    }

    for (const layer of layers) {
        if (!layer.visible) continue;
        tCtx.globalAlpha = layer.opacity;
        tCtx.globalCompositeOperation = layer.blendMode;
        tCtx.drawImage(layer.canvas, 0, 0);
    }

    return tempCanvas.toDataURL(format, quality);
}

// --- PawMage export (custom format) ---
export function exportPawMage(filename = 'kitty-export.pawm') {
    showStatus('🐱 Generating PawMage...');

    const layers = getLayers();
    const { width, height } = getCanvasSize();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');

    // Composite all layers
    for (const layer of layers) {
        if (!layer.visible) continue;
        tCtx.globalAlpha = layer.opacity;
        tCtx.globalCompositeOperation = layer.blendMode;
        tCtx.drawImage(layer.canvas, 0, 0);
    }

    // Get pixel data
    const imageData = tCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Build PawMage format
    // Header: "PAWM" (4 bytes) + width (4) + height (4) + depth (1) + metadata length (4)
    const magic = new TextEncoder().encode('PAWM');
    const wBytes = new Uint32Array([width]);
    const hBytes = new Uint32Array([height]);
    const depth = 32; // RGBA
    const meta = JSON.stringify({
        author: 'KittyCreate Studio',
        timestamp: new Date().toISOString(),
        layers: layers.length,
        software: 'KittyCreate Studio v1'
    });
    const metaBytes = new TextEncoder().encode(meta);
    const metaLen = new Uint32Array([metaBytes.length]);

    // RLE compress pixel data
    const compressed = rleCompress(data);

    // Build file
    const header = new Uint8Array(4 + 4 + 4 + 1 + 4);
    header.set(magic, 0);
    header.set(new Uint8Array(wBytes.buffer), 4);
    header.set(new Uint8Array(hBytes.buffer), 8);
    header[12] = depth;
    header.set(new Uint8Array(metaLen.buffer), 13);

    const final = new Uint8Array(
        header.length + metaBytes.length + compressed.length
    );
    let offset = 0;
    final.set(header, offset);
    offset += header.length;
    final.set(metaBytes, offset);
    offset += metaBytes.length;
    final.set(compressed, offset);

    // Download
    const blob = new Blob([final], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();

    showStatus('🐱 PawMage exported!');
}

// --- RLE Compression ---
function rleCompress(data) {
    const output = [];
    let i = 0;
    while (i < data.length) {
        let runLength = 1;
        while (i + runLength < data.length &&
               data[i + runLength] === data[i] &&
               runLength < 255) {
            runLength++;
        }
        output.push(runLength);
        output.push(data[i]);
        i += runLength;
    }
    return new Uint8Array(output);
}

// --- Expose ---
window.__export = { exportPNG, exportJPG, exportPawMage, compositeLayers };