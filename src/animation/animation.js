// ----------------------------------------------
// ANIMATION.JS – Full animation system with GIF export
// KittyCreate Studio v1
// ----------------------------------------------

import { getLayers, renderLayers, getActiveLayer } from '../core/layers.js';
import { pushState } from '../core/history.js';
import { getCanvasContext, getCanvasSize } from '../core/canvas.js';
import { showStatus } from '../utils/utils.js';

// --- State ---
let frames = [];
let currentFrameIndex = 0;
let isPlaying = false;
let playInterval = null;
let frameDelay = 100;
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

    document.getElementById('onion-skin')?.addEventListener('change', (e) => {
        renderFrame(currentFrameIndex);
    });

    document.getElementById('frame-delay')?.addEventListener('change', (e) => {
        setFrameDelay(parseInt(e.target.value) || 100);
    });

    document.getElementById('export-gif')?.addEventListener('click', exportGIF);

    console.log('🎞️ Animation initialized');
}

// --- Frame management ---
export function addFrame() {
    const frame = captureFrame();
    frames.splice(currentFrameIndex + 1, 0, frame);
    currentFrameIndex++;
    updateFrameUI();
    updateTimelineUI();
    renderFrame(currentFrameIndex);
    showStatus(`➕ Added frame ${currentFrameIndex + 1}`);
}

export function duplicateFrame() {
    const frame = captureFrame();
    frames.splice(currentFrameIndex + 1, 0, frame);
    currentFrameIndex++;
    updateFrameUI();
    updateTimelineUI();
    renderFrame(currentFrameIndex);
    showStatus(`📋 Duplicated frame ${currentFrameIndex + 1}`);
}

export function deleteFrame() {
    if (frames.length <= 1) return;
    frames.splice(currentFrameIndex, 1);
    if (currentFrameIndex >= frames.length) currentFrameIndex = frames.length - 1;
    updateFrameUI();
    updateTimelineUI();
    renderFrame(currentFrameIndex);
    showStatus(`🗑️ Deleted frame ${currentFrameIndex + 1}`);
}

export function goToFrame(index) {
    if (index < 0 || index >= frames.length) return;
    currentFrameIndex = index;
    updateFrameUI();
    updateTimelineUI();
    renderFrame(index);
}

export function prevFrame() {
    if (currentFrameIndex > 0) goToFrame(currentFrameIndex - 1);
}

export function nextFrame() {
    if (currentFrameIndex < frames.length - 1) goToFrame(currentFrameIndex + 1);
}

export function getFrames() { return frames; }
export function getFrameCount() { return frames.length; }
export function getCurrentFrameIndex() { return currentFrameIndex; }

// --- Capture ---
function captureFrame() {
    const layers = getLayers();
    const frameData = layers.map(layer => {
        const c = layer.canvas.getContext('2d');
        return c.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    });
    return { layerData: frameData, timestamp: Date.now() };
}

// --- Render ---
export function renderFrame(index) {
    if (index < 0 || index >= frames.length) return;

    const frame = frames[index];
    const layers = getLayers();

    // Restore layers
    for (let i = 0; i < Math.min(layers.length, frame.layerData.length); i++) {
        const c = layers[i].canvas.getContext('2d');
        c.putImageData(frame.layerData[i], 0, 0);
    }

    // Onion skin
    const onionCheck = document.getElementById('onion-skin');
    if (onionCheck?.checked && index > 0) {
        const prevFrame = frames[index - 1];
        const tempCanvas = document.createElement('canvas');
        const size = getCanvasSize();
        tempCanvas.width = size.width;
        tempCanvas.height = size.height;
        const tCtx = tempCanvas.getContext('2d');

        for (let i = 0; i < Math.min(layers.length, prevFrame.layerData.length); i++) {
            tCtx.putImageData(prevFrame.layerData[i], 0, 0);
        }

        // Ghost overlay
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.globalAlpha = onionSkinOpacity;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    }

    renderLayers();
    updateFrameUI();
}

// --- Play ---
export function togglePlay() {
    if (isPlaying) stopPlay();
    else startPlay();
}

function startPlay() {
    if (frames.length < 2) {
        showStatus('⚠️ Need at least 2 frames to play');
        return;
    }
    isPlaying = true;
    document.getElementById('frame-play').textContent = '⏹️';
    playInterval = setInterval(() => {
        if (currentFrameIndex < frames.length - 1) goToFrame(currentFrameIndex + 1);
        else goToFrame(0);
    }, frameDelay);
}

function stopPlay() {
    isPlaying = false;
    clearInterval(playInterval);
    document.getElementById('frame-play').textContent = '▶️';
}

// --- Set delay ---
export function setFrameDelay(ms) {
    frameDelay = Math.max(10, ms);
    if (isPlaying) { stopPlay(); startPlay(); }
}

// --- Onion skin opacity ---
export function setOnionSkinOpacity(value) {
    onionSkinOpacity = Math.max(0, Math.min(1, value));
    renderFrame(currentFrameIndex);
}

// --- Export GIF (full implementation) ---
export function exportGIF() {
    if (frames.length < 2) {
        showStatus('⚠️ Need at least 2 frames for GIF');
        return;
    }

    showStatus('🎞️ Generating GIF...');

    // Use gif.js library (loaded from CDN)
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
    script.onload = () => {
        generateGIF();
    };
    script.onerror = () => {
        // Fallback: use canvas capture + simple animation
        showStatus('⚠️ GIF library failed, using fallback...');
        generateGIFFallback();
    };
    document.head.appendChild(script);
}

function generateGIF() {
    try {
        const size = getCanvasSize();
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: size.width,
            height: size.height,
        });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size.width;
        tempCanvas.height = size.height;
        const tCtx = tempCanvas.getContext('2d');

        const delay = document.getElementById('frame-delay')?.value || 100;

        for (const frame of frames) {
            tCtx.clearRect(0, 0, size.width, size.height);
            // Composite all layers from frame
            const layers = getLayers();
            for (let i = 0; i < Math.min(layers.length, frame.layerData.length); i++) {
                const imageData = frame.layerData[i];
                const canvas = document.createElement('canvas');
                canvas.width = size.width;
                canvas.height = size.height;
                const c = canvas.getContext('2d');
                c.putImageData(imageData, 0, 0);
                tCtx.drawImage(canvas, 0, 0);
            }
            gif.addFrame(tCtx, { copy: true, delay: parseInt(delay) });
        }

        gif.on('progress', (p) => {
            showStatus(`🎞️ GIF rendering: ${Math.round(p * 100)}%`);
        });

        gif.on('finished', (blob) => {
            const link = document.createElement('a');
            link.download = 'kitty-animation.gif';
            link.href = URL.createObjectURL(blob);
            link.click();
            showStatus('✅ GIF exported!');
        });

        gif.render();
    } catch (err) {
        console.error('GIF export failed:', err);
        showStatus('❌ GIF export failed, using fallback...');
        generateGIFFallback();
    }
}

// --- Fallback: export as PNG sequence ---
function generateGIFFallback() {
    showStatus('📦 Exporting as PNG sequence (fallback)...');
    // Zip all frames as PNGs
    const size = getCanvasSize();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size.width;
    tempCanvas.height = size.height;
    const tCtx = tempCanvas.getContext('2d');

    // Create a ZIP file using JSZip (loaded from CDN)
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => {
        const zip = new JSZip();
        const layers = getLayers();

        for (let i = 0; i < frames.length; i++) {
            tCtx.clearRect(0, 0, size.width, size.height);
            for (let j = 0; j < Math.min(layers.length, frames[i].layerData.length); j++) {
                const imageData = frames[i].layerData[j];
                const canvas = document.createElement('canvas');
                canvas.width = size.width;
                canvas.height = size.height;
                const c = canvas.getContext('2d');
                c.putImageData(imageData, 0, 0);
                tCtx.drawImage(canvas, 0, 0);
            }
            zip.file(`frame_${String(i+1).padStart(3, '0')}.png`, 
                tempCanvas.toDataURL('image/png').split(',')[1], { base64: true });
        }

        zip.generateAsync({ type: 'blob' }).then((blob) => {
            const link = document.createElement('a');
            link.download = 'kitty-frames.zip';
            link.href = URL.createObjectURL(blob);
            link.click();
            showStatus('✅ PNG sequence exported as ZIP!');
        });
    };
    script.onerror = () => {
        showStatus('❌ Fallback failed. Please try again.');
    };
    document.head.appendChild(script);
}

// --- UI Updates ---
function updateFrameUI() {
    const counter = document.getElementById('frame-counter');
    if (counter) {
        counter.textContent = `Frame ${currentFrameIndex + 1} / ${frames.length}`;
    }
}

function updateTimelineUI() {
    const strip = document.getElementById('frame-strip');
    if (!strip) return;

    strip.innerHTML = '';
    const size = getCanvasSize();

    for (let i = 0; i < frames.length; i++) {
        const div = document.createElement('div');
        div.className = `frame-thumb${i === currentFrameIndex ? ' active' : ''}`;
        div.dataset.index = i;

        const thumb = document.createElement('canvas');
        thumb.width = 60;
        thumb.height = 45;
        const tCtx = thumb.getContext('2d');

        // Composite first layer for thumbnail
        const frame = frames[i];
        const layers = getLayers();
        if (frame.layerData && frame.layerData.length > 0) {
            const imgData = frame.layerData[0];
            const canvas = document.createElement('canvas');
            canvas.width = size.width;
            canvas.height = size.height;
            const c = canvas.getContext('2d');
            c.putImageData(imgData, 0, 0);
            tCtx.drawImage(canvas, 0, 0, 60, 45);
        }

        div.appendChild(thumb);
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
    getFrames,
    getFrameCount,
    getCurrentFrameIndex,
    renderFrame,
    setOnionSkinOpacity
};