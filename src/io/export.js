// ----------------------------------------------
// EXPORT.JS – Export PNG, JPG, GIF
// KittyCreate Studio v1
// ----------------------------------------------

import { getCanvas, getCanvasContext, getCanvasSize } from '../core/canvas.js';
import { getLayers, renderLayers } from '../core/layers.js';
import { getFrames } from '../animation/animation.js';

// --- State ---
let ctx = null;
let canvas = null;

// --- Init ---
export function initExport(context, canvasEl) {
    ctx = context;
    canvas = canvasEl;

    // Bind export buttons
    document.getElementById('export-png')?.addEventListener('click', () => exportPNG());
    document.getElementById('export-jpg')?.addEventListener('click', () => exportJPG());
    document.getElementById('export-gif')?.addEventListener('click', () => exportGIF());

    console.log('📦 Export module ready');
}

// --- Export PNG ---
export function exportPNG(filename = 'kitty-export.png') {
    const layers = getLayers();
    const tempCanvas = document.createElement('canvas');
    const { width, height } = getCanvasSize();
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // Composite all visible layers
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, width, height);

    for (const layer of layers) {
        if (!layer.visible) continue;
        tempCtx.globalAlpha = layer.opacity;
        tempCtx.globalCompositeOperation = layer.blendMode;
        tempCtx.drawImage(layer.canvas, 0, 0);
    }

    // Download
    const link = document.createElement('a');
    link.download = filename;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();

    updateStatus('📤 Exported PNG');
}

// --- Export JPG ---
export function exportJPG(filename = 'kitty-export.jpg', quality = 0.92) {
    const layers = getLayers();
    const tempCanvas = document.createElement('canvas');
    const { width, height } = getCanvasSize();
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // Composite with white background (JPG doesn't support alpha)
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, width, height);

    for (const layer of layers) {
        if (!layer.visible) continue;
        tempCtx.globalAlpha = layer.opacity;
        tempCtx.globalCompositeOperation = layer.blendMode;
        tempCtx.drawImage(layer.canvas, 0, 0);
    }

    // Download
    const link = document.createElement('a');
    link.download = filename;
    link.href = tempCanvas.toDataURL('image/jpeg', quality);
    link.click();

    updateStatus('📤 Exported JPG');
}

// --- Export GIF (using frames) ---
export function exportGIF(filename = 'kitty-animation.gif', delay = 100) {
    // Check if we have animation module loaded
    const frames = getFrames ? getFrames() : null;
    if (!frames || frames.length < 2) {
        alert('No animation frames found. Add at least 2 frames.');
        return;
    }

    // For now, we'll use a simple GIF export with a library
    // This is a placeholder that will use the frames array
    console.log('🎞️ Exporting GIF with', frames.length, 'frames');
    updateStatus(`🎞️ Exporting ${frames.length}-frame GIF...`);

    // In a real implementation, we'd use gif.js or similar
    // For now, we'll inform the user
    alert(
        'GIF export will be available when we integrate a library.\n' +
        `Frames: ${frames.length}\n` +
        'Coming soon!'
    );

    // Placeholder download
    // For actual GIF export, you'd use:
    // 1. Include gif.js library
    // 2. Create GIF instance with frames
    // 3. Render and download
}

// --- Export as PawMage (custom format) ---
export function exportPawMage(filename = 'kitty-export.pawm') {
    // Placeholder for PawMage support (v1.5 feature)
    alert('🐱 PawMage export coming in v1.5!');
}

// --- Status update ---
function updateStatus(message) {
    const status = document.getElementById('status-tool');
    if (status) status.textContent = message;
    setTimeout(() => {
        if (status) status.textContent = 'Ready';
    }, 2000);
}

// --- Expose ---
window.__export = { exportPNG, exportJPG, exportGIF, exportPawMage };