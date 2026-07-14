// ----------------------------------------------
// CANVAS.JS – Full canvas management
// KittyCreate Studio v1
// ----------------------------------------------

let canvas = null;
let ctx = null;
let width = 800;
let height = 600;
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let isSpaceDown = false;

// --- Init ---
export function initCanvas(canvasEl) {
    canvas = canvasEl;
    ctx = canvasEl.getContext('2d', { willReadFrequently: true });
    resizeCanvas(canvasEl);

    // Pan with middle mouse or space + drag
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseUp);
    canvas.addEventListener('wheel', onCanvasWheel, { passive: false });

    // Touch support
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // Space key for pan
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.code === 'Space') {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            isSpaceDown = true;
            canvas.style.cursor = 'grab';
            e.preventDefault();
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.code === 'Space') {
            isSpaceDown = false;
            canvas.style.cursor = 'crosshair';
        }
    });

    return { canvas, ctx };
}

// --- Resize ---
export function resizeCanvas(canvasEl) {
    if (!canvasEl) canvasEl = canvas;
    const rect = canvasEl.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    width = Math.max(200, Math.floor(rect.width * 0.9));
    height = Math.max(200, Math.floor(rect.height * 0.9));

    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;
    canvasEl.style.width = width + 'px';
    canvasEl.style.height = height + 'px';

    if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        updateTransform();
    }

    return { width, height };
}

// --- Getters ---
export function getCanvas() { return canvas; }
export function getCanvasContext() { return ctx; }
export function getCanvasSize() { return { width, height }; }
export function getZoom() { return zoom; }
export function getPan() { return { x: panX, y: panY }; }

// --- Zoom ---
export function setZoom(newZoom, centerX, centerY) {
    const oldZoom = zoom;
    zoom = Math.max(0.1, Math.min(20, newZoom));

    if (centerX !== undefined && centerY !== undefined) {
        panX = centerX - (centerX - panX) * (zoom / oldZoom);
        panY = centerY - (centerY - panY) * (zoom / oldZoom);
    }

    updateTransform();
    updateZoomStatus();
    return zoom;
}

export function zoomIn() {
    const cx = width / 2;
    const cy = height / 2;
    return setZoom(zoom * 1.15, cx, cy);
}

export function zoomOut() {
    const cx = width / 2;
    const cy = height / 2;
    return setZoom(zoom / 1.15, cx, cy);
}

export function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
    updateTransform();
    updateZoomStatus();
    return zoom;
}

// --- Pan ---
export function setPan(x, y) {
    panX = x;
    panY = y;
    updateTransform();
}

// --- Transform ---
function updateTransform() {
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(panX, panY);
}

// --- Coordinate conversion ---
export function screenToCanvas(screenX, screenY) {
    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left) * (canvas.width / rect.width);
    const y = (screenY - rect.top) * (canvas.height / rect.height);
    return {
        x: (x / zoom) - panX,
        y: (y / zoom) - panY
    };
}

export function canvasToScreen(canvasX, canvasY) {
    return {
        x: (canvasX + panX) * zoom,
        y: (canvasY + panY) * zoom
    };
}

// --- Event Handlers ---
function onCanvasMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && isSpaceDown)) {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
    }
}

function onCanvasMouseMove(e) {
    if (isPanning) {
        const dx = (e.clientX - panStartX) / zoom;
        const dy = (e.clientY - panStartY) / zoom;
        panX += dx;
        panY += dy;
        panStartX = e.clientX;
        panStartY = e.clientY;
        updateTransform();
        e.preventDefault();
    }
}

function onCanvasMouseUp(e) {
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = isSpaceDown ? 'grab' : 'crosshair';
    }
}

function onCanvasWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const centerX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const centerY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(zoom * delta, centerX, centerY);
}

// --- Touch ---
let touchStartX = 0, touchStartY = 0, touchStartDist = 0;

function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        isPanning = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
}

function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isPanning) {
        const dx = (e.touches[0].clientX - touchStartX) / zoom;
        const dy = (e.touches[0].clientY - touchStartY) / zoom;
        panX += dx;
        panY += dy;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        updateTransform();
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = dist / touchStartDist;
        setZoom(zoom * delta);
        touchStartDist = dist;
    }
}

function onTouchEnd(e) {
    isPanning = false;
}

// --- Status ---
function updateZoomStatus() {
    const statusZoom = document.getElementById('status-zoom');
    if (statusZoom) {
        statusZoom.textContent = `Zoom: ${Math.round(zoom * 100)}%`;
    }
}

// --- Expose ---
window.__canvas = { canvas, ctx, width, height, zoom, panX, panY };