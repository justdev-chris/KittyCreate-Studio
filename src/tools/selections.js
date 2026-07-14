// ----------------------------------------------
// SELECTIONS.JS – Full selection tools (rect, lasso, wand, move, transform)
// KittyCreate Studio v1
// ----------------------------------------------

import { getCanvasContext, getCanvas } from '../core/canvas.js';
import { getActiveLayer, renderLayers } from '../core/layers.js';
import { pushState } from '../core/history.js';

// --- State ---
let selection = null; // { x, y, w, h, type: 'rect'|'lasso'|'wand' }
let isSelecting = false;
let startX = 0, startY = 0;
let currentX = 0, currentY = 0;
let lassoPoints = [];
let isDraggingSelection = false;
let dragOffsetX = 0, dragOffsetY = 0;
let isShiftPressed = false;

// --- Init ---
export function initSelections() {
    const canvas = getCanvas();
    if (!canvas) return;

    const overlay = document.createElement('canvas');
    overlay.id = 'selection-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.pointerEvents = 'none';
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    canvas.parentElement.appendChild(overlay);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') clearSelection();
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selection) deleteSelection();
        }
        if (e.key === 'Shift') isShiftPressed = true;
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') isShiftPressed = false;
    });

    // Transform buttons
    document.getElementById('transform-scale')?.addEventListener('click', () => {
        transformSelection(1.2, 1.2, 0);
    });
    document.getElementById('transform-rotate')?.addEventListener('click', () => {
        transformSelection(1, 1, 15);
    });
    document.getElementById('transform-flip-h')?.addEventListener('click', () => {
        transformSelection(-1, 1, 0);
    });
    document.getElementById('transform-flip-v')?.addEventListener('click', () => {
        transformSelection(1, -1, 0);
    });
}

// --- Start ---
export function startSelection(x, y) {
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    isSelecting = true;
    startX = x;
    startY = y;
    currentX = x;
    currentY = y;

    if (selection && isInsideSelection(x, y)) {
        isDraggingSelection = true;
        dragOffsetX = x - selection.x;
        dragOffsetY = y - selection.y;
        return;
    }

    if (!isShiftPressed) {
        clearSelection();
    }

    selection = { x, y, w: 0, h: 0, type: 'rect' };
}

// --- Update ---
export function updateSelection(x, y) {
    if (!isSelecting) {
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
        selection.x = x - dragOffsetX;
        selection.y = y - dragOffsetY;
        drawSelectionOverlay();
        return;
    }

    selection.x = Math.min(startX, x);
    selection.y = Math.min(startY, y);
    selection.w = Math.abs(x - startX);
    selection.h = Math.abs(y - startY);
    drawSelectionOverlay();
}

// --- End ---
export function endSelection() {
    if (isSelecting) {
        isSelecting = false;
        isDraggingSelection = false;
        if (selection && selection.w < 5 && selection.h < 5) {
            clearSelection();
        } else if (selection) {
            drawSelectionOverlay();
        }
    }
}

// --- Clear ---
export function clearSelection() {
    selection = null;
    lassoPoints = [];
    clearOverlay();
    getCanvas().style.cursor = 'crosshair';
}

// --- Delete selected ---
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

// --- Inside check ---
function isInsideSelection(x, y) {
    if (!selection) return false;
    return x >= selection.x && x <= selection.x + selection.w &&
           y >= selection.y && y <= selection.y + selection.h;
}

// --- Draw overlay ---
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

    ctx.setLineDash([]);
    ctx.fillStyle = '#00aaff';
    const handleSize = 6;
    const handles = [
        [s.x, s.y], [s.x + s.w / 2, s.y], [s.x + s.w, s.y],
        [s.x, s.y + s.h / 2], [s.x + s.w, s.y + s.h / 2],
        [s.x, s.y + s.h], [s.x + s.w / 2, s.y + s.h], [s.x + s.w, s.y + s.h]
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

// --- Transform ---
export function transformSelection(scaleX, scaleY, rotation) {
    if (!selection) return;
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const ctx = layer.canvas.getContext('2d');
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const cx = selection.x + selection.w / 2;
    const cy = selection.y + selection.h / 2;

    // Get selection data
    const imageData = ctx.getImageData(
        Math.round(selection.x),
        Math.round(selection.y),
        Math.round(selection.w),
        Math.round(selection.h)
    );

    // Clear selection area
    ctx.save();
    ctx.beginPath();
    ctx.rect(selection.x, selection.y, selection.w, selection.h);
    ctx.clip();
    ctx.clearRect(0, 0, w, h);
    ctx.restore();

    // Draw transformed
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, scaleY);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
    ctx.putImageData(imageData, selection.x, selection.y);
    ctx.restore();

    renderLayers();
    pushState(getCanvasContext(), w, h);
    clearSelection();
    showStatus(`🔄 Transformed selection`);
}

// --- Magic Wand (color selection) ---
export function magicWand(x, y, tolerance = 30) {
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const ctx = layer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const data = imageData.data;
    const w = layer.canvas.width;
    const h = layer.canvas.height;

    const idx = (Math.round(y) * w + Math.round(x)) * 4;
    const targetColor = {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3],
    };

    // Find connected pixels
    const visited = new Set();
    const stack = [{ x: Math.round(x), y: Math.round(y) }];
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;

    while (stack.length > 0) {
        const { x: cx, y: cy } = stack.pop();
        const key = `${cx},${cy}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const i = (cy * w + cx) * 4;
        if (i < 0 || i >= data.length) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const diff = Math.abs(r - targetColor.r) + Math.abs(g - targetColor.g) + Math.abs(b - targetColor.b);
        if (diff > tolerance) continue;

        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);

        if (cx > 0) stack.push({ x: cx - 1, y: cy });
        if (cx < w - 1) stack.push({ x: cx + 1, y: cy });
        if (cy > 0) stack.push({ x: cx, y: cy - 1 });
        if (cy < h - 1) stack.push({ x: cx, y: cy + 1 });
    }

    if (visited.size > 0) {
        selection = {
            x: minX,
            y: minY,
            w: maxX - minX + 1,
            h: maxY - minY + 1,
            type: 'wand'
        };
        drawSelectionOverlay();
        showStatus(`🎯 Magic Wand selected ${visited.size} pixels`);
    }
}

// --- Show status ---
function showStatus(message) {
    const status = document.getElementById('status-tool');
    if (status) status.textContent = message;
}

// --- Expose ---
window.__selections = {
    clearSelection,
    deleteSelection,
    transformSelection,
    magicWand,
    startSelection,
    updateSelection,
    endSelection
};