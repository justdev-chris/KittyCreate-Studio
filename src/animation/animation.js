// ----------------------------------------------
// ANIMATION.JS – Frame-by-frame animation with onion skin, timeline, GIF export
// KittyCreate Studio v1
// ----------------------------------------------

import { getActiveLayer, getLayers, renderLayers } from '../core/layers.js';
import { pushState } from '../core/history.js';
import { getCanvasContext, getCanvasSize } from '../core/canvas.js';

// --- State ---
let frames = [];
let currentFrameIndex = 0;
let isPlaying = false;
let playInterval = null;
let frameDelay = 100; // ms per frame
let onionSkinOpacity = 0.3;
let ctx = null;
let canvas = null;

// --- Init ---
export function initAnimation(canvasEl, context) {
    canvas = canvasEl;
    ctx = context;

    // Start with one frame
    frames = [captureFrame()];
    currentFrameIndex = 0;
    updateFrameUI();
    updateTimelineUI();

    // Bind UI events
    document.getElementById('frame-add')?.addEventListener('click', addFrame);
    document.getElementById('frame-duplicate')?.addEventListener('click', duplicateFrame);
    document.getElementById('frame-delete')?.addEventListener('click', deleteFrame);
    document.getElementById('frame-prev')?.addEventListener('click', prevFrame);
    document.getElementById('frame-next')?.addEventListener('click', nextFrame);
    document.getElementById('frame-play')?.addEventListener('click', togglePlay);
}

// --- Frame management ---
export function addFrame() {
    const frame = captureFrame();
    frames.splice(currentFrameIndex + 1, 0, frame);
    currentFrameIndex++;
    updateFrameUI();
    updateTimelineUI();
    renderFrame(currentFrameIndex);
}

export function duplicateFrame() {
    const frame = captureFrame();
    frames.splice(currentFrameIndex + 1, 0, frame);
    currentFrameIndex++;
    updateFrameUI();
    updateTimelineUI();
    renderFrame(currentFrameIndex);
}

export function deleteFrame() {
    if (frames.length <= 1) return;
    frames.splice(currentFrameIndex, 1);
    if (currentFrameIndex >= frames.length) currentFrameIndex = frames.length - 1;
    updateFrameUI();
    updateTimelineUI();
    renderFrame(currentFrameIndex);
}

export function goToFrame(index) {
    if (index < 0 || index >= frames.length) return;
    currentFrameIndex = index;
    updateFrameUI();
    updateTimelineUI();
    renderFrame(index);
}

export function prevFrame() {
    if (currentFrameIndex > 0) {
        goToFrame(currentFrameIndex - 1);
    }
}

export function nextFrame() {
    if (currentFrameIndex < frames.length - 1) {
        goToFrame(currentFrameIndex + 1);
    }
}

// --- Capture ---
function captureFrame() {
    const layers = getLayers();
    const frameData = layers.map(layer => {
        const c = layer.canvas.getContext('2d');
        return c.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    });
    return {
        layerData: frameData,
        timestamp: Date.now(),
    };
}

// --- Render ---
export function renderFrame(index) {
    if (index < 0 || index >= frames.length) return;

    const frame = frames[index];
    const layers = getLayers();

    // Restore layer data from frame
    for (let i = 0; i < Math.min(layers.length, frame.layerData.length); i++) {
        const c = layers[i].canvas.getContext('2d');
        c.putImageData(frame.layerData[i], 0, 0);
    }

    // Apply onion skin (show previous frame ghosted)
    if (index > 0 && document.getElementById('onion-skin')?.checked) {
        const prevFrame = frames[index - 1];
        const overlay = document.createElement('canvas');
        overlay.width = layers[0].canvas.width;
        overlay.height = layers[0].canvas.height;
        const oCtx = overlay.getContext('2d');

        for (let i = 0; i < Math.min(layers.length, prevFrame.layerData.length); i++) {
            oCtx.putImageData(prevFrame.layerData[i], 0, 0);
        }

        // Draw ghosted overlay
        ctx.save();
        ctx.globalAlpha = onionSkinOpacity;
        ctx.drawImage(overlay, 0, 0);
        ctx.restore();
    }

    // Update counter
    document.getElementById('frame-counter').textContent =
        `Frame ${currentFrameIndex + 1} / ${frames.length}`;

    renderLayers();
}

// --- Play ---
export function togglePlay() {
    if (isPlaying) {
        stopPlay();
    } else {
        startPlay();
    }
}

function startPlay() {
    if (frames.length < 2) return;
    isPlaying = true;
    document.getElementById('frame-play').textContent = '⏹️ Stop';

    playInterval = setInterval(() => {
        if (currentFrameIndex < frames.length - 1) {
            goToFrame(currentFrameIndex + 1);
        } else {
            goToFrame(0);
        }
    }, frameDelay);
}

function stopPlay() {
    isPlaying = false;
    clearInterval(playInterval);
    document.getElementById('frame-play').textContent = '▶️ Play';
}

// --- Set frame delay ---
export function setFrameDelay(ms) {
    frameDelay = Math.max(10, ms);
    if (isPlaying) {
        stopPlay();
        startPlay();
    }
}

// --- Set onion skin opacity ---
export function setOnionSkinOpacity(value) {
    onionSkinOpacity = Math.max(0, Math.min(1, value));
    renderFrame(currentFrameIndex);
}

// --- Export GIF ---
export function exportGIF() {
    // Simple GIF export using canvas frames
    // For real GIF export, we'd use a library like gif.js
    // This is a placeholder
    console.log('Exporting GIF...');
    alert('GIF export will use a library like gif.js. Coming soon!');
}

// --- UI Updates ---
function updateFrameUI() {
    document.getElementById('frame-counter').textContent =
        `Frame ${currentFrameIndex + 1} / ${frames.length}`;
}

function updateTimelineUI() {
    const strip = document.getElementById('frame-strip');
    if (!strip) return;

    strip.innerHTML = '';
    for (let i = 0; i < frames.length; i++) {
        const div = document.createElement('div');
        div.className = `frame-thumb${i === currentFrameIndex ? ' active' : ''}`;
        div.dataset.index = i;

        // Draw a tiny preview of the frame
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 45;
        const c = canvas.getContext('2d');

        const layer = frames[i]?.layerData?.[0];
        if (layer) {
            const imgData = new ImageData(
                layer.data,
                layer.width,
                layer.height
            );
            c.putImageData(imgData, 0, 0);
        }

        div.appendChild(canvas);
        div.addEventListener('click', () => goToFrame(i));
        strip.appendChild(div);
    }
}

// --- Expose ---
window.__animation = {
    addFrame,
    duplicateFrame,
    deleteFrame,
    goToFrame,
    prevFrame,
    nextFrame,
    togglePlay,
    setFrameDelay,
    exportGIF,
};