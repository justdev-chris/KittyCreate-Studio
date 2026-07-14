// ----------------------------------------------
// TEXT.JS – Full text tool with UI controls
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
    stroke: false,
    strokeColor: '#ffffff',
    strokeWidth: 2,
};

let isPlacingText = false;
let textX = 0, textY = 0;

// --- Init ---
export function initText() {
    // Bind UI controls
    document.getElementById('text-font')?.addEventListener('change', (e) => {
        textParams.font = e.target.value;
    });
    document.getElementById('text-size')?.addEventListener('change', (e) => {
        textParams.size = parseInt(e.target.value) || 24;
    });
    document.getElementById('text-bold')?.addEventListener('change', (e) => {
        textParams.bold = e.target.checked;
    });
    document.getElementById('text-italic')?.addEventListener('change', (e) => {
        textParams.italic = e.target.checked;
    });
    document.getElementById('text-align')?.addEventListener('change', (e) => {
        textParams.align = e.target.value;
    });
    document.getElementById('text-stroke')?.addEventListener('change', (e) => {
        textParams.stroke = e.target.checked;
    });
    document.getElementById('text-stroke-color')?.addEventListener('input', (e) => {
        textParams.strokeColor = e.target.value;
    });
    document.getElementById('text-stroke-width')?.addEventListener('change', (e) => {
        textParams.strokeWidth = parseInt(e.target.value) || 2;
    });
}

// --- Set params ---
export function setTextParams(params) {
    Object.assign(textParams, params);
}

export function getTextParams() { return { ...textParams }; }

// --- Show text dialog ---
export function showTextDialog(x, y) {
    const dialog = document.getElementById('text-dialog');
    if (!dialog) {
        // Fallback to prompt
        const text = prompt('Enter text:', 'Meow!');
        if (text) {
            const colorPicker = document.getElementById('color-picker');
            textParams.color = colorPicker ? colorPicker.value : '#000000';
            placeText(x, y, text);
        }
        return;
    }

    textX = x;
    textY = y;
    isPlacingText = true;
    dialog.style.display = 'block';

    // Populate current values
    document.getElementById('text-input')?.focus();
    document.getElementById('text-input')?.select();
}

// --- Place text ---
export function placeText(x, y, text) {
    if (!text || text.length === 0) return;

    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const ctx = layer.canvas.getContext('2d');

    let fontStyle = '';
    if (textParams.italic) fontStyle += 'italic ';
    if (textParams.bold) fontStyle += 'bold ';
    fontStyle += `${textParams.size}px "${textParams.font}"`;

    ctx.save();
    ctx.font = fontStyle;
    ctx.textAlign = textParams.align;
    ctx.textBaseline = 'top';

    // Stroke (for readability)
    if (textParams.stroke) {
        ctx.strokeStyle = textParams.strokeColor;
        ctx.lineWidth = textParams.strokeWidth;
        ctx.strokeText(text, x, y);
    }

    // Fill
    ctx.fillStyle = textParams.color;
    ctx.fillText(text, x, y);

    ctx.restore();
    renderLayers();
    pushState(getCanvasContext(), layer.canvas.width, layer.canvas.height);
    showStatus(`📝 Text placed: "${text}"`);
}

// --- Confirm text from dialog ---
export function confirmText() {
    const input = document.getElementById('text-input');
    if (!input) return;

    const text = input.value;
    if (text) {
        // Get current color
        const colorPicker = document.getElementById('color-picker');
        textParams.color = colorPicker ? colorPicker.value : '#000000';
        placeText(textX, textY, text);
    }

    closeTextDialog();
}

// --- Close text dialog ---
export function closeTextDialog() {
    const dialog = document.getElementById('text-dialog');
    if (dialog) dialog.style.display = 'none';
    isPlacingText = false;
}

// --- Render text (generic) ---
export function renderText(ctx, x, y, text, options = {}) {
    const opts = { ...textParams, ...options };

    let fontStyle = '';
    if (opts.italic) fontStyle += 'italic ';
    if (opts.bold) fontStyle += 'bold ';
    fontStyle += `${opts.size}px "${opts.font}"`;

    ctx.save();
    ctx.font = fontStyle;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = 'top';

    if (opts.stroke) {
        ctx.strokeStyle = opts.strokeColor || '#ffffff';
        ctx.lineWidth = opts.strokeWidth || 2;
        ctx.strokeText(text, x, y);
    }

    ctx.fillStyle = opts.color;
    ctx.fillText(text, x, y);
    ctx.restore();
}

// --- Status ---
function showStatus(message) {
    const status = document.getElementById('status-tool');
    if (status) status.textContent = message;
}

// --- Expose ---
window.__text = {
    setTextParams,
    getTextParams,
    placeText,
    renderText,
    showTextDialog,
    confirmText,
    closeTextDialog,
    initText
};