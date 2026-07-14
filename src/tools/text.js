// ----------------------------------------------
// TEXT.JS – Text tool
// KittyCreate Studio v1
// ----------------------------------------------

import { getActiveLayer, renderLayers } from '../core/layers.js';
import { pushState } from '../core/history.js';
import { getCanvasContext } from '../core/canvas.js';

// --- State ---
let textParams = {
    font: 'Arial',
    size: 24,
    color: '#000000',
    bold: false,
    italic: false,
    align: 'left',
};

// --- Set text params ---
export function setTextParams(params) {
    Object.assign(textParams, params);
}

// --- Get text params ---
export function getTextParams() { return { ...textParams }; }

// --- Place text ---
export function placeText(x, y, text) {
    if (!text || text.length === 0) return;

    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const ctx = layer.canvas.getContext('2d');

    // Build font string
    let fontStyle = '';
    if (textParams.italic) fontStyle += 'italic ';
    if (textParams.bold) fontStyle += 'bold ';
    fontStyle += `${textParams.size}px "${textParams.font}"`;

    ctx.save();
    ctx.font = fontStyle;
    ctx.fillStyle = textParams.color;
    ctx.textAlign = textParams.align;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);

    ctx.restore();
    renderLayers();
    pushState(getCanvasContext(), layer.canvas.width, layer.canvas.height);
}

// --- Render text with options ---
export function renderText(ctx, x, y, text, options = {}) {
    const opts = { ...textParams, ...options };

    let fontStyle = '';
    if (opts.italic) fontStyle += 'italic ';
    if (opts.bold) fontStyle += 'bold ';
    fontStyle += `${opts.size}px "${opts.font}"`;

    ctx.save();
    ctx.font = fontStyle;
    ctx.fillStyle = opts.color;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = 'top';

    // Optional: stroke for better readability
    if (opts.stroke) {
        ctx.strokeStyle = opts.strokeColor || '#ffffff';
        ctx.lineWidth = opts.strokeWidth || 2;
        ctx.strokeText(text, x, y);
    }

    ctx.fillText(text, x, y);
    ctx.restore();
}

// --- Text tool UI ---
export function showTextDialog(x, y) {
    // This would open a dialog with text input + font options
    // For now, we use prompt
    const text = prompt('Enter text:');
    if (text) {
        // Get current color
        const colorPicker = document.getElementById('color-picker');
        const color = colorPicker ? colorPicker.value : '#000000';
        textParams.color = color;
        placeText(x, y, text);
    }
}

// --- Expose ---
window.__text = { setTextParams, getTextParams, placeText, renderText };