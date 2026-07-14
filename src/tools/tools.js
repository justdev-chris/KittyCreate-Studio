// ----------------------------------------------
// TOOLS.JS – Tool manager and router
// KittyCreate Studio v1
// ----------------------------------------------

import { getCanvasContext, getCanvas, screenToCanvas } from '../core/canvas.js';
import { getActiveLayer, renderLayers } from '../core/layers.js';
import { pushState } from '../core/history.js';
import { brushStroke, setBrushParams } from './brushEngine.js';
import { startSelection, updateSelection, endSelection } from './selections.js';
import { placeText } from './text.js';

// --- State ---
let currentTool = 'pounce';
let ctx = null;
let canvas = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// --- Init ---
export function initTools(context, canvasEl) {
    ctx = context;
    canvas = canvasEl;

    // Mouse events
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);

    // Touch events
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // Set default brush params
    setBrushParams({
        size: 10,
        opacity: 1,
        flow: 1,
        hardness: 1,
        color: '#000000',
        shape: 'round',
        spacing: 0.1,
    });
}

// --- Tool switching ---
export function setActiveTool(tool) {
    currentTool = tool;
    updateCursor(tool);
}

export function getActiveTool() {
    return currentTool;
}

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
    if (e.button !== 0) return; // Left click only
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
        case 'claw':
            startSelection(x, y);
            break;
        case 'whisper':
            // Text tool: single click to place
            const text = prompt('Enter text:');
            if (text) placeText(x, y, text);
            isDrawing = false;
            break;
        // Other tools handled in move/end
    }
}

function moveTool(x, y) {
    if (!isDrawing) return;

    switch (currentTool) {
        case 'pounce':
        case 'scratch':
        case 'purr':
            brushMove(x, y);
            break;
        case 'lick':
            brushMove(x, y);
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
            brushEnd();
            break;
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
    // Get color from UI
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

function brushEnd() {
    // Push to history on stroke end
    const layer = getActiveLayer();
    if (layer) {
        pushState(ctx, layer.canvas.width, layer.canvas.height);
    }
}

// --- Update brush params from UI ---
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

// --- Expose ---
window.__tools = { setActiveTool, getActiveTool, updateBrushFromUI };