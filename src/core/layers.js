// ----------------------------------------------
// LAYERS.JS – Full layer stack management
// KittyCreate Studio v1
// ----------------------------------------------

import { getCanvasContext, getCanvasSize } from './canvas.js';
import { pushState } from './history.js';

// --- State ---
let layers = [];
let activeIndex = 0;
let ctx = null;
let canvasWidth = 800;
let canvasHeight = 600;
let layerIdCounter = 0;

// --- Init ---
export function initLayers(context, width, height) {
    ctx = context;
    canvasWidth = width;
    canvasHeight = height;
    layers = [createLayer('Background')];
    activeIndex = 0;
    renderLayers();
    updateLayerUI();
}

// --- Create ---
function createLayer(name) {
    const id = ++layerIdCounter;
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const c = canvas.getContext('2d');
    c.fillStyle = 'rgba(0,0,0,0)';
    c.fillRect(0, 0, canvasWidth, canvasHeight);
    return {
        id,
        name: name || `Layer ${id}`,
        canvas,
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
    };
}

// --- Getters ---
export function getLayers() { return layers; }
export function getActiveLayer() { return layers[activeIndex] || null; }
export function getActiveIndex() { return activeIndex; }
export function getLayerCount() { return layers.length; }

// --- Set active ---
export function setActiveIndex(index) {
    if (index >= 0 && index < layers.length) {
        activeIndex = index;
        updateLayerUI();
        renderLayers();
        // Sync UI controls
        syncLayerUI();
    }
}

// --- Add ---
export function addLayer(name) {
    const layer = createLayer(name);
    layers.push(layer);
    activeIndex = layers.length - 1;
    updateLayerUI();
    renderLayers();
    syncLayerUI();
    pushState(ctx, canvasWidth, canvasHeight);
    return layer;
}

// --- Delete ---
export function deleteLayer(index) {
    if (layers.length <= 1) return;
    if (index === undefined) index = activeIndex;
    if (index < 0 || index >= layers.length) return;

    layers.splice(index, 1);
    if (activeIndex >= layers.length) activeIndex = layers.length - 1;
    if (activeIndex === index && index > 0) activeIndex--;
    updateLayerUI();
    renderLayers();
    syncLayerUI();
    pushState(ctx, canvasWidth, canvasHeight);
}

// --- Duplicate ---
export function duplicateLayer(index) {
    if (index === undefined) index = activeIndex;
    if (index < 0 || index >= layers.length) return;

    const src = layers[index];
    const newLayer = createLayer(`${src.name} (copy)`);
    const dstCtx = newLayer.canvas.getContext('2d');
    dstCtx.drawImage(src.canvas, 0, 0);
    layers.push(newLayer);
    activeIndex = layers.length - 1;
    updateLayerUI();
    renderLayers();
    syncLayerUI();
    pushState(ctx, canvasWidth, canvasHeight);
}

// --- Move ---
export function moveLayerUp(index) {
    if (index === undefined) index = activeIndex;
    if (index >= layers.length - 1) return;
    [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
    if (activeIndex === index) activeIndex++;
    else if (activeIndex === index + 1) activeIndex--;
    updateLayerUI();
    renderLayers();
}

export function moveLayerDown(index) {
    if (index === undefined) index = activeIndex;
    if (index <= 0) return;
    [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
    if (activeIndex === index) activeIndex--;
    else if (activeIndex === index - 1) activeIndex++;
    updateLayerUI();
    renderLayers();
}

// --- Visibility ---
export function toggleLayerVisibility(index) {
    if (index === undefined) index = activeIndex;
    if (index < 0 || index >= layers.length) return;
    layers[index].visible = !layers[index].visible;
    updateLayerUI();
    renderLayers();
}

// --- Opacity ---
export function setLayerOpacity(index, opacity) {
    if (index === undefined) index = activeIndex;
    if (index < 0 || index >= layers.length) return;
    layers[index].opacity = Math.max(0, Math.min(1, opacity));
    updateLayerUI();
    renderLayers();
    syncLayerUI();
}

// --- Blend mode ---
export function setLayerBlendMode(index, mode) {
    if (index === undefined) index = activeIndex;
    if (index < 0 || index >= layers.length) return;
    layers[index].blendMode = mode;
    updateLayerUI();
    renderLayers();
    syncLayerUI();
}

// --- Render ---
export function renderLayers() {
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (const layer of layers) {
        if (!layer.visible) continue;
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

// --- Layer data access ---
export function getLayerImageData(index) {
    if (index === undefined) index = activeIndex;
    if (index < 0 || index >= layers.length) return null;
    const l = layers[index];
    const c = l.canvas.getContext('2d');
    return c.getImageData(0, 0, canvasWidth, canvasHeight);
}

export function setLayerImageData(index, imageData) {
    if (index === undefined) index = activeIndex;
    if (index < 0 || index >= layers.length) return;
    const l = layers[index];
    const c = l.canvas.getContext('2d');
    c.putImageData(imageData, 0, 0);
    renderLayers();
}

// --- Clear ---
export function clearLayer(index) {
    if (index === undefined) index = activeIndex;
    if (index < 0 || index >= layers.length) return;
    const l = layers[index];
    const c = l.canvas.getContext('2d');
    c.clearRect(0, 0, canvasWidth, canvasHeight);
    renderLayers();
    pushState(ctx, canvasWidth, canvasHeight);
}

// --- Sync UI controls ---
function syncLayerUI() {
    const active = getActiveLayer();
    const opacitySlider = document.getElementById('layer-opacity');
    const blendSelect = document.getElementById('blend-mode');

    if (active) {
        if (opacitySlider) opacitySlider.value = active.opacity * 100;
        if (blendSelect) blendSelect.value = active.blendMode;
    }
}

// --- UI Update ---
export function updateLayerUI() {
    const list = document.getElementById('layer-list');
    if (!list) return;

    list.innerHTML = '';
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const li = document.createElement('li');
        li.className = (i === activeIndex) ? 'active' : '';
        li.dataset.index = i;

        const visSpan = document.createElement('span');
        visSpan.className = 'layer-vis';
        visSpan.textContent = layer.visible ? '👁️' : '👁️‍🗨️';
        visSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLayerVisibility(i);
        });

        const nameSpan = document.createElement('span');
        nameSpan.className = 'layer-name';
        nameSpan.textContent = layer.name;

        const lockSpan = document.createElement('span');
        lockSpan.textContent = layer.locked ? '🔒' : '';

        li.appendChild(visSpan);
        li.appendChild(nameSpan);
        li.appendChild(lockSpan);

        li.addEventListener('click', () => {
            setActiveIndex(i);
        });

        list.appendChild(li);
    }

    syncLayerUI();
}

// --- Resize ---
export function resizeLayers(newWidth, newHeight) {
    canvasWidth = newWidth;
    canvasHeight = newHeight;
    for (const layer of layers) {
        const oldCanvas = layer.canvas;
        const oldCtx = oldCanvas.getContext('2d');
        const imageData = oldCtx.getImageData(0, 0, oldCanvas.width, oldCanvas.height);

        const newCanvas = document.createElement('canvas');
        newCanvas.width = newWidth;
        newCanvas.height = newHeight;
        const newCtx = newCanvas.getContext('2d');
        newCtx.putImageData(imageData, 0, 0);
        layer.canvas = newCanvas;
    }
    renderLayers();
}

// --- Expose ---
window.__layers = { layers, activeIndex, addLayer, deleteLayer, duplicateLayer, renderLayers };