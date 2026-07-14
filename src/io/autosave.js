// ----------------------------------------------
// AUTOSAVE.JS – Full autosave with UI state restore
// KittyCreate Studio v1
// ----------------------------------------------

import { getLayers, getActiveIndex, getLayerCount, renderLayers, updateLayerUI, setActiveIndex } from '../core/layers.js';
import { getCanvasSize, getZoom, getPan, setZoom, setPan } from '../core/canvas.js';
import { getActiveTool, setActiveTool } from '../tools/tools.js';
import { goToFrame, getCurrentFrameIndex } from '../animation/animation.js';
import { showStatus } from '../utils/utils.js';

let autosaveInterval = null;
let intervalMs = 15000;
let onSaveCallback = null;
let isEnabled = true;

export function initAutosave(callback) {
    onSaveCallback = callback || (() => {});

    // Load state on init
    const loaded = loadState();
    if (loaded) {
        showStatus('📂 Auto-saved project restored');
    }

    startAutosave();

    window.addEventListener('beforeunload', () => saveState());
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) saveState();
    });

    console.log('💾 Autosave initialized (every', intervalMs / 1000, 's)');
}

export function startAutosave() {
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(() => {
        if (isEnabled) {
            saveState();
            if (onSaveCallback) onSaveCallback();
        }
    }, intervalMs);
}

export function stopAutosave() {
    if (autosaveInterval) {
        clearInterval(autosaveInterval);
        autosaveInterval = null;
    }
}

export function setAutosaveInterval(ms) {
    intervalMs = Math.max(1000, ms);
    if (autosaveInterval) startAutosave();
}

export function toggleAutosave(enabled) {
    isEnabled = enabled !== undefined ? enabled : !isEnabled;
    if (!isEnabled) stopAutosave();
    else startAutosave();
    return isEnabled;
}

// --- Save ---
export function saveState() {
    try {
        const layers = getLayers();
        const { width, height } = getCanvasSize();
        const zoom = getZoom();
        const pan = getPan();
        const activeTool = getActiveTool ? getActiveTool() : 'pounce';

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
            activeTool: activeTool,
            zoom: zoom,
            panX: pan.x || 0,
            panY: pan.y || 0,
            layers: layerData,
            frameIndex: getCurrentFrameIndex ? getCurrentFrameIndex() : 0,
        };

        localStorage.setItem('kittycreate_state', JSON.stringify(state));
    } catch (error) {
        console.warn('❌ Autosave failed:', error);
    }
}

// --- Load ---
export function loadState() {
    try {
        const raw = localStorage.getItem('kittycreate_state');
        if (!raw) return false;

        const state = JSON.parse(raw);
        if (!state.layers || state.layers.length === 0) return false;

        const { width, height } = getCanvasSize();
        const layers = getLayers();

        // Clear existing layers
        while (layers.length > 0) layers.pop();

        // Restore layers
        for (const layerData of state.layers) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const c = canvas.getContext('2d');

            const imageData = new ImageData(
                new Uint8ClampedArray(layerData.data),
                width,
                height
            );
            c.putImageData(imageData, 0, 0);

            layers.push({
                canvas,
                name: layerData.name || 'Layer',
                visible: layerData.visible !== undefined ? layerData.visible : true,
                opacity: layerData.opacity || 1,
                blendMode: layerData.blendMode || 'normal',
                locked: layerData.locked || false,
            });
        }

        // Restore active index
        if (state.activeIndex !== undefined && state.activeIndex < layers.length) {
            setActiveIndex(state.activeIndex);
        }

        // Restore zoom and pan
        if (state.zoom !== undefined) {
            setZoom(state.zoom);
        }
        if (state.panX !== undefined && state.panY !== undefined) {
            setPan(state.panX, state.panY);
        }

        // Restore tool
        if (state.activeTool && setActiveTool) {
            setActiveTool(state.activeTool);
            // Update UI
            const toolButtons = document.querySelectorAll('.tool');
            toolButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tool === state.activeTool);
            });
            const statusTool = document.getElementById('status-tool');
            if (statusTool) {
                statusTool.textContent = `Tool: ${state.activeTool.charAt(0).toUpperCase() + state.activeTool.slice(1)}`;
            }
        }

        // Restore frame
        if (state.frameIndex !== undefined && goToFrame) {
            goToFrame(state.frameIndex);
        }

        renderLayers();
        updateLayerUI();

        // Update zoom status
        const statusZoom = document.getElementById('status-zoom');
        if (statusZoom && state.zoom !== undefined) {
            statusZoom.textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
        }

        return true;

    } catch (error) {
        console.warn('❌ Load state failed:', error);
        return false;
    }
}

export function clearSavedState() {
    localStorage.removeItem('kittycreate_state');
    showStatus('🧹 Cleared saved state');
}

// --- Expose ---
window.__autosave = {
    saveState,
    loadState,
    clearSavedState,
    toggleAutosave,
    setAutosaveInterval
};