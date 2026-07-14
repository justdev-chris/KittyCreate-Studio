// ----------------------------------------------
// HISTORY.JS – Full Undo/Redo system
// KittyCreate Studio v1
// ----------------------------------------------

import { getLayers, getActiveIndex, renderLayers } from './layers.js';
import { getCanvasSize } from './canvas.js';

// --- State ---
let history = [];
let currentIndex = -1;
let maxHistory = 50;
let isRestoring = false;

// --- Init ---
export function initHistory() {
    history = [];
    currentIndex = -1;
    updateUndoUI();
}

// --- Push ---
export function pushState(ctx, width, height) {
    if (isRestoring) return;

    // If we're not at the end, truncate
    if (currentIndex < history.length - 1) {
        history = history.slice(0, currentIndex + 1);
    }

    const snapshot = captureState(ctx, width, height);
    history.push(snapshot);
    currentIndex++;

    if (history.length > maxHistory) {
        history.shift();
        currentIndex--;
    }

    updateUndoUI();
}

// --- Capture ---
function captureState(ctx, width, height) {
    const layers = getLayers();
    const layerData = layers.map(layer => {
        const c = layer.canvas.getContext('2d');
        return c.getImageData(0, 0, width, height);
    });
    return {
        layerData,
        activeIndex: getActiveIndex(),
        width,
        height,
        timestamp: Date.now(),
    };
}

// --- Restore ---
function restoreState(ctx, index) {
    if (index < 0 || index >= history.length) return;
    isRestoring = true;

    const state = history[index];
    const layers = getLayers();

    // Ensure we have enough layers
    while (layers.length < state.layerData.length) {
        const newLayer = createLayerFromCanvas(state.width, state.height);
        layers.push(newLayer);
    }

    for (let i = 0; i < Math.min(layers.length, state.layerData.length); i++) {
        const c = layers[i].canvas.getContext('2d');
        c.putImageData(state.layerData[i], 0, 0);
    }

    // Trim extra layers
    while (layers.length > state.layerData.length) {
        layers.pop();
    }

    // Restore active index
    if (state.activeIndex !== undefined && state.activeIndex < layers.length) {
        // Update active index via layers module
        const { setActiveIndex } = require('./layers.js');
        setActiveIndex(state.activeIndex);
    }

    currentIndex = index;
    isRestoring = false;
    renderLayers();
    updateUndoUI();
}

// --- Helper ---
function createLayerFromCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext('2d');
    c.fillStyle = 'rgba(0,0,0,0)';
    c.fillRect(0, 0, width, height);
    return { canvas };
}

// --- Undo ---
export function undo() {
    if (currentIndex <= 0) return;
    const { getCanvasContext } = require('./canvas.js');
    const ctx = getCanvasContext();
    if (!ctx) return;
    restoreState(ctx, currentIndex - 1);
}

// --- Redo ---
export function redo() {
    if (currentIndex >= history.length - 1) return;
    const { getCanvasContext } = require('./canvas.js');
    const ctx = getCanvasContext();
    if (!ctx) return;
    restoreState(ctx, currentIndex + 1);
}

// --- Clear ---
export function clearHistory() {
    history = [];
    currentIndex = -1;
    updateUndoUI();
}

// --- Getters ---
export function canUndo() { return currentIndex > 0; }
export function canRedo() { return currentIndex < history.length - 1; }
export function getHistorySize() { return history.length; }
export function getCurrentIndex() { return currentIndex; }

// --- UI ---
function updateUndoUI() {
    const undoBtn = document.getElementById('menu-edit-undo');
    const redoBtn = document.getElementById('menu-edit-redo');
    if (undoBtn) undoBtn.disabled = !canUndo();
    if (redoBtn) redoBtn.disabled = !canRedo();

    const status = document.getElementById('status-tool');
    if (status && history.length > 0) {
        // Don't override status, just update internally
    }
}

// --- Expose ---
window.__history = { history, currentIndex, undo, redo, clearHistory, canUndo, canRedo };