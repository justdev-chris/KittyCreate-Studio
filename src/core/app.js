// ----------------------------------------------
// APP.JS – KittyCreate Studio v1
// Full implementation – keyboard shortcuts, menus, init
// ----------------------------------------------

import { initCanvas, resizeCanvas, getCanvasContext, getCanvas, setZoom, resetZoom, zoomIn, zoomOut } from './canvas.js';
import { initLayers, addLayer, deleteLayer, getLayers, getActiveLayer, getActiveIndex, setActiveIndex, renderLayers, updateLayerUI } from './layers.js';
import { initHistory, pushState, undo, redo, canUndo, canRedo, getHistorySize } from './history.js';
import { initTools, setActiveTool, getActiveTool, updateBrushFromUI } from '../tools/tools.js';
import { initSelections, clearSelection } from '../tools/selections.js';
import { initAutosave, saveState, loadState, toggleAutosave } from '../io/autosave.js';
import { initExport } from '../io/export.js';
import { initAnimation, goToFrame, getFrameCount } from '../animation/animation.js';
import { initFilters } from '../filters/filters.js';
import { showStatus, debounce } from '../utils/utils.js';

// --- State ---
let isInitialized = false;
const state = {
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
    if (isInitialized) return;

    console.log('🐱 KittyCreate Studio v1 initializing...');

    // Canvas
    initCanvas(canvasEl);
    state.canvas = canvasEl;
    state.ctx = getCanvasContext();

    // Layers
    initLayers(state.ctx, canvasEl.width, canvasEl.height);
    state.layers = getLayers();

    // History
    initHistory();
    pushState(state.ctx, canvasEl.width, canvasEl.height);

    // Tools
    initTools(state.ctx, canvasEl);
    setActiveTool('pounce');

    // Selections
    initSelections();

    // Export
    initExport(state.ctx, canvasEl);

    // Animation
    initAnimation(canvasEl, state.ctx);

    // Filters
    initFilters(state.ctx, canvasEl);

    // Autosave
    initAutosave(() => {
        saveState();
        statusAutosave.textContent = '💾 Auto-saved';
        setTimeout(() => {
            statusAutosave.textContent = '💾 Auto-save ready';
        }, 2000);
    });

    // UI events
    bindEvents();
    updateToolUI('pounce');
    updateZoomUI();

    // Keyboard shortcuts
    bindKeyboardShortcuts();

    // Load saved state
    const loaded = loadState();
    if (loaded) {
        renderLayers();
        updateLayerUI();
        showStatus('📂 Loaded saved project');
    }

    isInitialized = true;
    showStatus('🐱 KittyCreate Studio ready');
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

    // Window resize (debounced)
    const handleResize = debounce(() => {
        resizeCanvas(canvasEl);
        state.ctx = getCanvasContext();
        renderLayers();
        updateZoomUI();
    }, 200);
    window.addEventListener('resize', handleResize);

    // Canvas mouse move for position tracking
    canvasEl.addEventListener('mousemove', (e) => {
        const rect = canvasEl.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) * (canvasEl.width / rect.width));
        const y = Math.round((e.clientY - rect.top) * (canvasEl.height / rect.height));
        statusPos.textContent = `X: ${x} Y: ${y}`;
    });

    // Layer opacity slider
    const opacitySlider = document.getElementById('layer-opacity');
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) / 100;
            const layer = getActiveLayer();
            if (layer) {
                layer.opacity = val;
                renderLayers();
                updateLayerUI();
            }
        });
    }

    // Layer blend mode dropdown
    const blendSelect = document.getElementById('blend-mode');
    if (blendSelect) {
        blendSelect.addEventListener('change', (e) => {
            const layer = getActiveLayer();
            if (layer) {
                layer.blendMode = e.target.value;
                renderLayers();
                updateLayerUI();
            }
        });
    }

    // Layer controls
    document.getElementById('layer-add')?.addEventListener('click', () => {
        addLayer(`Layer ${getLayers().length + 1}`);
        updateLayerUI();
        pushState(state.ctx, canvasEl.width, canvasEl.height);
    });

    document.getElementById('layer-delete')?.addEventListener('click', () => {
        if (getLayers().length > 1) {
            deleteLayer(getActiveIndex());
            updateLayerUI();
            pushState(state.ctx, canvasEl.width, canvasEl.height);
        }
    });

    document.getElementById('layer-up')?.addEventListener('click', () => {
        const idx = getActiveIndex();
        if (idx < getLayers().length - 1) {
            const layers = getLayers();
            [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
            setActiveIndex(idx + 1);
            updateLayerUI();
            renderLayers();
        }
    });

    document.getElementById('layer-down')?.addEventListener('click', () => {
        const idx = getActiveIndex();
        if (idx > 0) {
            const layers = getLayers();
            [layers[idx], layers[idx - 1]] = [layers[idx - 1], layers[idx]];
            setActiveIndex(idx - 1);
            updateLayerUI();
            renderLayers();
        }
    });

    // Zoom controls
    document.getElementById('zoom-in')?.addEventListener('click', () => {
        zoomIn();
        updateZoomUI();
    });

    document.getElementById('zoom-out')?.addEventListener('click', () => {
        zoomOut();
        updateZoomUI();
    });

    document.getElementById('zoom-fit')?.addEventListener('click', () => {
        resetZoom();
        updateZoomUI();
    });

    // File menu
    document.getElementById('menu-file-new')?.addEventListener('click', () => {
        if (confirm('Clear all layers and start fresh?')) {
            const layers = getLayers();
            for (const layer of layers) {
                const ctx = layer.canvas.getContext('2d');
                ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            }
            renderLayers();
            pushState(state.ctx, canvasEl.width, canvasEl.height);
            showStatus('📄 New project created');
        }
    });

    document.getElementById('menu-file-save')?.addEventListener('click', () => {
        saveState();
        statusAutosave.textContent = '💾 Saved!';
        setTimeout(() => {
            statusAutosave.textContent = '💾 Auto-save ready';
        }, 2000);
        showStatus('💾 Project saved');
    });

    document.getElementById('menu-file-open')?.addEventListener('click', () => {
        const loaded = loadState();
        if (loaded) {
            renderLayers();
            updateLayerUI();
            showStatus('📂 Project loaded');
        } else {
            showStatus('⚠️ No saved project found');
        }
    });
}

// --- Keyboard shortcuts ---
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

        // --- Tool shortcuts (1-9) ---
        const toolMap = {
            '1': 'pounce',
            '2': 'scratch',
            '3': 'purr',
            '4': 'lick',
            '5': 'nip',
            '6': 'claw',
            '7': 'pelt',
            '8': 'whisper',
            '9': 'flick',
        };
        if (e.key >= '1' && e.key <= '9') {
            const tool = toolMap[e.key];
            if (tool) {
                setActiveTool(tool);
                updateToolUI(tool);
                statusTool.textContent = `Tool: ${tool.charAt(0).toUpperCase() + tool.slice(1)}`;
                e.preventDefault();
            }
        }

        // --- Modifier shortcuts ---
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                    updateUndoUI();
                    break;
                case 'y':
                    e.preventDefault();
                    redo();
                    updateUndoUI();
                    break;
                case 's':
                    e.preventDefault();
                    saveState();
                    statusAutosave.textContent = '💾 Saved!';
                    setTimeout(() => {
                        statusAutosave.textContent = '💾 Auto-save ready';
                    }, 2000);
                    showStatus('💾 Project saved');
                    break;
                case 'o':
                    e.preventDefault();
                    const loaded = loadState();
                    if (loaded) {
                        renderLayers();
                        updateLayerUI();
                        showStatus('📂 Project loaded');
                    } else {
                        showStatus('⚠️ No saved project found');
                    }
                    break;
                case 'a':
                    e.preventDefault();
                    // Select all layers? (Future feature)
                    break;
            }
        }

        // --- Standalone shortcuts ---
        switch (e.key) {
            case '[':
                // Previous frame
                const prev = getFrameCount ? goToFrame : null;
                if (prev) {
                    const current = document.getElementById('frame-counter')?.textContent;
                    // Will be handled by animation module
                }
                break;
            case ']':
                // Next frame
                break;
            case 'Escape':
                clearSelection();
                break;
        }
    });
}

// --- UI updates ---
function updateToolUI(tool) {
    toolButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
}

function updateZoomUI() {
    const zoom = statusZoom;
    if (zoom) {
        const z = window.__canvas?.zoom || 1;
        zoom.textContent = `Zoom: ${Math.round(z * 100)}%`;
    }
}

function updateUndoUI() {
    const undoBtn = document.getElementById('menu-edit-undo');
    const redoBtn = document.getElementById('menu-edit-redo');
    if (undoBtn) undoBtn.disabled = !canUndo();
    if (redoBtn) redoBtn.disabled = !canRedo();
}

// --- Expose ---
window.__kitty = { state, initApp, updateToolUI, updateZoomUI };

// --- Start ---
document.addEventListener('DOMContentLoaded', initApp);