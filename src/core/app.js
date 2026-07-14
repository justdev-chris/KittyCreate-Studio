// ----------------------------------------------
// APP.JS – KittyCreate Studio v1
// Core application initializer and orchestrator
// ----------------------------------------------

import { initCanvas, resizeCanvas, getCanvasContext } from './canvas.js';
import { initLayers, getActiveLayer, getLayerCount } from './layers.js';
import { initHistory, pushState } from './history.js';
import { initTools, setActiveTool, getActiveTool } from '../tools/tools.js';
import { initAutosave, triggerAutosave } from '../io/autosave.js';
import { initExport } from '../io/export.js';
import { initAnimation } from '../animation/animation.js';
import { initFilters } from '../filters/filters.js';
import { showStatus } from '../utils/utils.js';

// --- State ---
const state = {
    isInitialized: false,
    canvas: null,
    ctx: null,
    layers: [],
    activeLayerIndex: 0,
    history: [],
    historyIndex: -1,
    tool: 'pounce',
    zoom: 1,
    panX: 0,
    panY: 0,
    isDrawing: false,
    isPanning: false,
};

// --- DOM refs ---
const canvasEl = document.getElementById('main-canvas');
const toolButtons = document.querySelectorAll('.tool');
const layerList = document.getElementById('layer-list');
const statusTool = document.getElementById('status-tool');
const statusPos = document.getElementById('status-pos');
const statusZoom = document.getElementById('status-zoom');
const statusAutosave = document.getElementById('status-autosave');

// --- Init ---
export function initApp() {
    if (state.isInitialized) return;

    console.log('🐱 KittyCreate Studio v1 initializing...');

    // 1. Canvas
    initCanvas(canvasEl);
    state.canvas = canvasEl;
    state.ctx = getCanvasContext();

    // 2. Layers
    initLayers(state.ctx, canvasEl.width, canvasEl.height);
    state.layers = getLayers();

    // 3. History
    initHistory();
    pushState(state.ctx, canvasEl.width, canvasEl.height);

    // 4. Tools
    initTools(state.ctx, canvasEl);
    setActiveTool('pounce');

    // 5. UI events
    bindEvents();

    // 6. Autosave
    initAutosave(() => {
        triggerAutosave(state);
        statusAutosave.textContent = '💾 Auto-saved';
        setTimeout(() => {
            statusAutosave.textContent = '💾 Auto-save ready';
        }, 2000);
    });

    // 7. Export
    initExport(state.ctx, canvasEl);

    // 8. Animation
    initAnimation(canvasEl, state.ctx);

    // 9. Filters
    initFilters(state.ctx, canvasEl);

    // 10. Status
    showStatus('🐱 KittyCreate Studio ready');
    statusTool.textContent = 'Tool: Pounce';

    state.isInitialized = true;
    console.log('✅ KittyCreate Studio initialized');
}

// --- Event binding ---
function bindEvents() {
    // Tool buttons
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            setActiveTool(tool);
            updateToolUI(tool);
            statusTool.textContent = `Tool: ${tool.charAt(0).toUpperCase() + tool.slice(1)}`;
        });
    });

    // Window resize
    window.addEventListener('resize', () => {
        resizeCanvas(canvasEl);
        state.ctx = getCanvasContext();
        // Re-render layers after resize
        renderAllLayers();
    });

    // Keyboard shortcuts (basic)
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z = undo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        // Ctrl+Y = redo
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        }
        // Ctrl+S = save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            triggerAutosave(state);
            statusAutosave.textContent = '💾 Saved!';
            setTimeout(() => {
                statusAutosave.textContent = '💾 Auto-save ready';
            }, 2000);
        }
    });

    // Canvas mouse move for position tracking
    canvasEl.addEventListener('mousemove', (e) => {
        const rect = canvasEl.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) * (canvasEl.width / rect.width));
        const y = Math.round((e.clientY - rect.top) * (canvasEl.height / rect.height));
        statusPos.textContent = `X: ${x} Y: ${y}`;
    });
}

// --- UI Updates ---
function updateToolUI(tool) {
    toolButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
}

function renderAllLayers() {
    // Will be implemented in layers.js
    // This is a placeholder for the event binding
}

function getLayers() {
    // Placeholder – will be implemented in layers.js
    return [];
}

// --- Undo/Redo (placeholders) ---
function undo() {
    console.log('Undo triggered');
    // Will be implemented in history.js
}

function redo() {
    console.log('Redo triggered');
    // Will be implemented in history.js
}

// --- Start ---
document.addEventListener('DOMContentLoaded', initApp);

// Expose for debugging
window.__kitty = { state, initApp };