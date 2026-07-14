// ----------------------------------------------
// AUTOSAVE.JS – Auto-save to localStorage
// KittyCreate Studio v1
// ----------------------------------------------

import { getLayers, getActiveIndex, getLayerCount } from '../core/layers.js';
import { getCanvasSize } from '../core/canvas.js';

// --- State ---
let autosaveInterval = null;
let intervalMs = 15000; // 15 seconds
let onSaveCallback = null;
let isEnabled = true;

// --- Init ---
export function initAutosave(callback) {
    onSaveCallback = callback || (() => {});

    // Load saved state on init
    loadState();

    // Start autosave interval
    startAutosave();

    // Save on page close
    window.addEventListener('beforeunload', () => {
        saveState();
    });

    // Save on visibility change (user leaves tab)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveState();
        }
    });

    console.log('💾 Autosave initialized (every', intervalMs / 1000, 's)');
}

// --- Start autosave ---
export function startAutosave() {
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(() => {
        if (isEnabled) {
            saveState();
            if (onSaveCallback) onSaveCallback();
        }
    }, intervalMs);
}

// --- Stop autosave ---
export function stopAutosave() {
    if (autosaveInterval) {
        clearInterval(autosaveInterval);
        autosaveInterval = null;
    }
}

// --- Set interval ---
export function setAutosaveInterval(ms) {
    intervalMs = Math.max(1000, ms);
    if (autosaveInterval) {
        startAutosave(); // Restart with new interval
    }
}

// --- Enable/disable ---
export function toggleAutosave(enabled) {
    isEnabled = enabled !== undefined ? enabled : !isEnabled;
    if (!isEnabled) {
        stopAutosave();
    } else {
        startAutosave();
    }
    return isEnabled;
}

// --- Save state ---
export function saveState() {
    try {
        const layers = getLayers();
        const { width, height } = getCanvasSize();

        // Serialize layer data to base64
        const layerData = layers.map(layer => {
            const c = layer.canvas.getContext('2d');
            const imageData = c.getImageData(0, 0, width, height);
            return {
                data: Array.from(imageData.data),
                width: imageData.width,
                height: imageData.height,
                name: layer.name,
                visible: layer.visible,
                opacity: layer.opacity,
                blendMode: layer.blendMode,
                locked: layer.locked,
            };
        });

        const state = {
            version: '1.0',
            timestamp: Date.now(),
            width,
            height,
            activeIndex: getActiveIndex(),
            layers: layerData,
        };

        localStorage.setItem('kittycreate_state', JSON.stringify(state));
        console.log('💾 Autosaved at', new Date().toLocaleTimeString());

    } catch (error) {
        console.warn('❌ Autosave failed:', error);
    }
}

// --- Load state ---
export function loadState() {
    try {
        const raw = localStorage.getItem('kittycreate_state');
        if (!raw) return false;

        const state = JSON.parse(raw);
        if (!state.layers || state.layers.length === 0) return false;

        console.log('📂 Loading saved state from', new Date(state.timestamp).toLocaleTimeString());

        // Restore layers
        const { width, height } = getCanvasSize();
        const layers = getLayers();

        // Clear existing layers
        while (layers.length > 0) {
            layers.pop();
        }

        // Restore each layer
        for (const layerData of state.layers) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const c = canvas.getContext('2d');

            // Restore image data
            const imageData = new ImageData(
                new Uint8ClampedArray(layerData.data),
                width,
                height
            );
            c.putImageData(imageData, 0, 0);

            // Create layer
            const layer = {
                canvas,
                name: layerData.name || 'Layer',
                visible: layerData.visible !== undefined ? layerData.visible : true,
                opacity: layerData.opacity || 1,
                blendMode: layerData.blendMode || 'normal',
                locked: layerData.locked || false,
            };

            layers.push(layer);
        }

        // Restore active index
        if (state.activeIndex !== undefined && state.activeIndex < layers.length) {
            // We'll need to set this via layers module
            // For now, we'll rely on the UI to update
        }

        // Trigger render
        const renderLayers = window.__layers?.renderLayers;
        if (renderLayers) renderLayers();

        // Update UI
        const updateUI = window.__layers?.updateLayerUI;
        if (updateUI) updateUI();

        return true;

    } catch (error) {
        console.warn('❌ Load state failed:', error);
        return false;
    }
}

// --- Clear saved state ---
export function clearSavedState() {
    localStorage.removeItem('kittycreate_state');
    console.log('🧹 Cleared saved state');
}

// --- Expose ---
window.__autosave = {
    saveState,
    loadState,
    clearSavedState,
    toggleAutosave,
    setAutosaveInterval,
};