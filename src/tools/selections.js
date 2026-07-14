// ----------------------------------------------
// SELECTIONS.JS – Selection tools (rect, lasso, wand, move, transform)
// KittyCreate Studio v1
// ----------------------------------------------

import { getCanvasContext, getCanvas, screenToCanvas } from '../core/canvas.js';
import { getActiveLayer, renderLayers } from '../core/layers.js';
import { pushState } from '../core/history.js';

// --- State ---
let selection = null; // { x, y, w, h, type: 'rect'|'lasso'|'wand' }
let isSelecting = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let selectionMode = 'rect'; // 'rect', 'lasso', 'wand'
let lassoPoints = [];
let isDraggingSelection = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// --- Init ---
export function initSelections() {
    const canvas = getCanvas();
    if (!canvas) return;

    // Overlay canvas for selection preview
    const overlay = document.createElement('canvas');
    overlay.id = 'selection-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.pointerEvents = 'none';
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    canvas.parentElement.appendChild(overlay);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearSelection();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selection) deleteSelection();
        }
    });
}

// --- Start selection ---
export function startSelection(x, y) {
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    isSelecting = true;
    startX = x;
    startY = y;
    currentX = x;
    currentY = y;

    // Check if we're clicking inside existing selection (for move)
    if (selection && isInsideSelection(x, y)) {
        isDraggingSelection = true;
        dragOffsetX = x - selection.x;
        dragOffsetY = y - selection.y;
        return;
    }

    // Clear old selection unless holding Shift (add to selection)
    if (!isShiftPressed()) {
        clearSelection();
    }

    selection = {
        x: x,
        y: y,
        w: 0,
        h: 0,
        type: 'rect',
    };
}

// --- Update selection ---
export function updateSelection(x, y) {
    if (!isSelecting) {
        // Check if we're hovering over a selection for cursor change
        if (selection && isInsideSelection(x, y)) {
            getCanvas().style.cursor = 'move';
        } else {
            getCanvas().style.cursor = 'crosshair';
        }
        return;
    }

    currentX = x;
    currentY = y;

    if (isDraggingSelection) {
        // Move the selection
        selection.x = x - dragOffsetX;
        selection.y = y - dragOffsetY;
        drawSelectionOverlay();
        return;
    }

    // Update selection rect
    selection.x = Math.min(startX, x);
    selection.y = Math.min(startY, y);
    selection.w = Math.abs(x - startX);
    selection.h = Math.abs(y - startY);
    drawSelectionOverlay();
}

// --- End selection ---
export function endSelection() {
    if (isSelecting) {
        isSelecting = false;
        isDraggingSelection = false;

        // If selection is too small, clear it
        if (selection && selection.w < 5 && selection.h < 5) {
            clearSelection();
        } else if (selection) {
            // Finalize selection
            drawSelectionOverlay();
        }
    }
}

// --- Clear selection ---
export function clearSelection() {
    selection = null;
    lassoPoints = [];
    clearOverlay();
}

// --- Delete selected area ---
export function deleteSelection() {
    if (!selection) return;

    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const ctx = layer.canvas.getContext('2d');
    const w = layer.canvas.width;
    const h = layer.canvas.height;

    const sx = Math.round(selection.x);
    const sy = Math.round(selection.y);
    const sw = Math.round(selection.w);
    const sh = Math.round(selection.h);

    // Clear the selected area
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    ctx.clearRect(0, 0, w, h);
    ctx.restore();

    renderLayers();
    pushState(getCanvasContext(), w, h);
    clearSelection();
}

// --- Is inside selection ---
function isInsideSelection(x, y) {
    if (!selection) return false;
    const s = selection;
    // For lasso, we'd need point-in-polygon
    // For now, just rect
    return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
}

// --- Shift key ---
function isShiftPressed() {
    return false; // We'll track this properly later
}

// --- Draw selection overlay ---
function drawSelectionOverlay() {
    const overlay = document.getElementById('selection-overlay');
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!selection) return;

    const s = selection;
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);

    // Draw handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#00aaff';
    const handleSize = 6;
    const handles = [
        [s.x, s.y],
        [s.x + s.w / 2, s.y],
        [s.x + s.w, s.y],
        [s.x, s.y + s.h / 2],
        [s.x + s.w, s.y + s.h / 2],
        [s.x, s.y + s.h],
        [s.x + s.w / 2, s.y + s.h],
        [s.x + s.w, s.y + s.h],
    ];
    for (const [hx, hy] of handles) {
        ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    }
}

// --- Clear overlay ---
function clearOverlay() {
    const overlay = document.getElementById('selection-overlay');
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
}

// --- Transform selection ---
export function transformSelection(scaleX, scaleY, rotation) {
    // Placeholder – will be implemented later
    // This would handle scale, rotate, flip
    console.log('Transform selection:', { scaleX, scaleY, rotation });
}

// --- Expose ---
window.__selections = { clearSelection, deleteSelection, transformSelection };