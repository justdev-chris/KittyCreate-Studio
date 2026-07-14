// ----------------------------------------------
// HISTORY.JS – Undo/Redo system
// KittyCreate Studio v1
// ----------------------------------------------

import { getLayers, renderLayers, getActiveIndex } from './layers.js';

// --- State ---
let history = [];
let currentIndex = -1;
let maxHistory = 30;
let isRestoring = false;

// --- Init ---
export function initHistory() {
    history = [];
    currentIndex = -1;
}

// --- Push ---
export function pushState(ctx, width, height) {
    if (isRestoring) return;

    // If we're not at the end, truncate
    if (currentIndex < history.length - 1) {
        history = history.slice(0, currentIndex + 1);
    }

    // Capture state
    const snapshot = captureState(ctx, width, height);
    history.push(snapshot);
    currentIndex++;

    // Limit history
    if (history.length > maxHistory) {
        history.shift();
        currentIndex--;
    }

    // Update UI
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

    // Restore each layer
    for (let i = 0; i < Math.min(layers.length, state.layerData.length); i++) {
        const c = layers[i].canvas.getContext('2d');
        c.putImageData(state.layerData[i], 0, 0);
    }

    // If layer count changed, handle it
    if (state.layerData.length > layers.length) {
        // Add missing layers (shouldn't happen often)
        for (let i = layers.length; i < state.layerData.length; i++) {
            // Will be handled by layers.js
        }
    }

    currentIndex = index;
    isRestoring = false;
    renderLayers();
    updateUndoUI();
}

// --- Undo ---
export function undo() {
    if (currentIndex <= 0) return;
    const ctx = document.getElementById('main-canvas')?.getContext('2d');
    if (!ctx) return;
    restoreState(ctx, currentIndex - 1);
}

// --- Redo ---
export function redo() {
    if (currentIndex >= history.length - 1) return;
    const ctx = document.getElementById('main-canvas')?.getContext('2d');
    if (!ctx) return;
    restoreState(ctx, currentIndex + 1);
}

// --- Clear ---
export function clearHistory() {
    history = [];
    currentIndex = -1;
    updateUndoUI();
}

// --- UI ---
function updateUndoUI() {
    // Could add buttons to enable/disable undo/redo
    // For now, just log
    // console.log(`History: ${currentIndex + 1}/${history.length}`);
}

// --- Getters ---
export function canUndo() { return currentIndex > 0; }
export function canRedo() { return currentIndex < history.length - 1; }
export function getHistorySize() { return history.length; }
export function getCurrentIndex() { return currentIndex; }

// --- Expose ---
window.__history = { history, currentIndex, undo, redo, clearHistory };