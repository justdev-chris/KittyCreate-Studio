// ----------------------------------------------
// TOOLS.JS – Full tool manager with all tools wired
// KittyCreate Studio v1
// ----------------------------------------------

import { getCanvasContext, getCanvas, screenToCanvas } from '../core/canvas.js';
import { getActiveLayer, renderLayers } from '../core/layers.js';
import { pushState } from '../core/history.js';
import { brushStroke, setBrushParams, floodFill } from './brushEngine.js';
import { startSelection, updateSelection, endSelection, clearSelection } from './selections.js';
import { placeText, showTextDialog } from './text.js';
import { applyFilter } from '../filters/filters.js';

// --- State ---
let currentTool = 'pounce';
let ctx = null;
let canvas = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let mirrorActive = false;
let mirrorAxis = 'vertical'; // 'vertical' | 'horizontal'

// --- Init ---
export function initTools(context, canvasEl) {
    ctx = context;
    canvas = canvasEl;

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    setBrushParams({
        size: 10,
        opacity: 1,
        flow: 1,
        hardness: 1,
        color: '#000000',
        shape: 'round',
        spacing: 0.1,
    });

    // Mirror toggle
    document.getElementById('toggle-mirror')?.addEventListener('click', () => {
        mirrorActive = !mirrorActive;
        document.getElementById('toggle-mirror')?.classList.toggle('active');
        showStatus(mirrorActive ? '🪞 Mirror ON' : '🪞 Mirror OFF');
    });

    // Tone (Pelt) dialog
    document.getElementById('apply-tone')?.addEventListener('click', () => {
        const size = prompt('Tone dot size (2-20):', '4');
        if (size) {
            applyFilter('halftone', { dotSize: parseInt(size) });
        }
    });

    console.log('🔧 Tools initialized');
}

// --- Tool switching ---
export function setActiveTool(tool) {
    currentTool = tool;
    updateCursor(tool);
    // Clear selection when switching tools
    if (tool !== 'claw') {
        clearSelection();
    }
    showStatus(`Tool: ${tool.charAt(0).toUpperCase() + tool.slice(1)}`);
}

export function getActiveTool() { return currentTool; }

// --- Cursor ---
function updateCursor(tool) {
    if (!canvas) return;
    const cursors = {
        pounce: 'crosshair',
        scratch: 'crosshair',
        purr: 'crosshair',
        lick: 'crosshair',
        nip: 'crosshair',
        claw: 'crosshair',
        pelt: 'crosshair',
        whisper: 'text',
        mirror: 'crosshair',
        flick: 'default',
    };
    canvas.style.cursor = cursors[tool] || 'crosshair';
}

// --- Pointer events ---
function onPointerDown(e) {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    startTool(x, y);
}

function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    moveTool(x, y);
}

function onPointerUp(e) {
    endTool();
}

// --- Touch events ---
function onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    startTool(x, y);
}

function onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    moveTool(x, y);
}

function onTouchEnd(e) {
    e.preventDefault();
    endTool();
}

// --- Tool router ---
function startTool(x, y) {
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    isDrawing = true;
    lastX = x;
    lastY = y;

    switch (currentTool) {
        case 'pounce':
        case 'scratch':
        case 'purr':
            brushStart(x, y);
            break;
        case 'lick':
            brushStart(x, y);
            break;
        case 'nip':
            // Fill tool - flood fill at click position
            const colorPicker = document.getElementById('color-picker');
            const color = colorPicker ? colorPicker.value : '#000000';
            const layerCtx = layer.canvas.getContext('2d');
            floodFill(layerCtx, Math.round(x), Math.round(y), color);
            renderLayers();
            pushState(ctx, layer.canvas.width, layer.canvas.height);
            isDrawing = false;
            break;
        case 'claw':
            startSelection(x, y);
            break;
        case 'whisper':
            showTextDialog(x, y);
            isDrawing = false;
            break;
        case 'pelt':
            // Tone tool - apply halftone with current settings
            const toneSize = prompt('Tone dot size (2-20):', '4');
            if (toneSize) {
                applyFilter('halftone', { dotSize: parseInt(toneSize) });
            }
            isDrawing = false;
            break;
        case 'flick':
            // Animation tool - handled in animation module
            isDrawing = false;
            break;
    }
}

function moveTool(x, y) {
    if (!isDrawing) return;

    switch (currentTool) {
        case 'pounce':
        case 'scratch':
        case 'purr':
        case 'lick':
            // Mirror drawing
            if (mirrorActive) {
                const layer = getActiveLayer();
                if (layer) {
                    const layerCtx = layer.canvas.getContext('2d');
                    const w = layer.canvas.width;
                    const h = layer.canvas.height;

                    // Original stroke
                    brushMove(x, y);

                    // Mirror stroke
                    if (mirrorAxis === 'vertical') {
                        const mirrorX = w - x;
                        const mirrorLastX = w - lastX;
                        brushMoveMirrored(mirrorX, y, mirrorLastX, lastY);
                    } else {
                        const mirrorY = h - y;
                        const mirrorLastY = h - lastY;
                        brushMoveMirrored(x, mirrorY, lastX, mirrorLastY);
                    }
                }
            } else {
                brushMove(x, y);
            }
            break;
        case 'claw':
            updateSelection(x, y);
            break;
    }

    lastX = x;
    lastY = y;
}

function endTool() {
    if (!isDrawing) return;

    switch (currentTool) {
        case 'pounce':
        case 'scratch':
        case 'purr':
        case 'lick':
            brushEnd();
            break;
        case 'claw':
            endSelection();
            break;
    }

    isDrawing = false;
}

// --- Brush wrappers ---
function brushStart(x, y) {
    const colorPicker = document.getElementById('color-picker');
    const color = colorPicker ? colorPicker.value : '#000000';
    const layer = getActiveLayer();
    if (!layer) return;
    const layerCtx = layer.canvas.getContext('2d');
    brushStroke(layerCtx, x, y, x, y, color);
    renderLayers();
}

function brushMove(x, y) {
    const colorPicker = document.getElementById('color-picker');
    const color = colorPicker ? colorPicker.value : '#000000';
    const layer = getActiveLayer();
    if (!layer) return;
    const layerCtx = layer.canvas.getContext('2d');
    brushStroke(layerCtx, lastX, lastY, x, y, color);
    renderLayers();
}

function brushMoveMirrored(x, y, lastXMirrored, lastYMirrored) {
    const colorPicker = document.getElementById('color-picker');
    const color = colorPicker ? colorPicker.value : '#000000';
    const layer = getActiveLayer();
    if (!layer) return;
    const layerCtx = layer.canvas.getContext('2d');
    brushStroke(layerCtx, lastXMirrored, lastYMirrored, x, y, color);
    renderLayers();
}

function brushEnd() {
    const layer = getActiveLayer();
    if (layer) {
        pushState(ctx, layer.canvas.width, layer.canvas.height);
    }
}

// --- Update brush params ---
export function updateBrushFromUI() {
    const sizeSlider = document.getElementById('brush-size');
    const opacitySlider = document.getElementById('brush-opacity');
    const flowSlider = document.getElementById('brush-flow');
    const hardnessSlider = document.getElementById('brush-hardness');

    setBrushParams({
        size: sizeSlider ? parseFloat(sizeSlider.value) : 10,
        opacity: opacitySlider ? parseFloat(opacitySlider.value) : 1,
        flow: flowSlider ? parseFloat(flowSlider.value) : 1,
        hardness: hardnessSlider ? parseFloat(hardnessSlider.value) : 1,
    });
}

// --- Mirror control ---
export function toggleMirror() {
    mirrorActive = !mirrorActive;
    return mirrorActive;
}

export function setMirrorAxis(axis) {
    if (axis === 'vertical' || axis === 'horizontal') {
        mirrorAxis = axis;
    }
}

// --- Status ---
function showStatus(message) {
    const status = document.getElementById('status-tool');
    if (status) status.textContent = message;
}

// --- Expose ---
window.__tools = { setActiveTool, getActiveTool, updateBrushFromUI, toggleMirror, setMirrorAxis };