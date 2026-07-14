// ----------------------------------------------
// BRUSHENGINE.JS – Full custom brush engine
// KittyCreate Studio v1
// ----------------------------------------------

// --- Params ---
let params = {
    size: 10,
    opacity: 1,
    flow: 1,
    hardness: 1,
    color: '#000000',
    shape: 'round',
    spacing: 0.1,
};

// --- Set ---
export function setBrushParams(newParams) {
    Object.assign(params, newParams);
}

export function getBrushParams() { return { ...params }; }

// --- Brush stroke ---
export function brushStroke(ctx, x1, y1, x2, y2, color) {
    if (!ctx) return;

    const size = params.size;
    const opacity = params.opacity * params.flow;
    const hardness = params.hardness;
    const actualColor = color || params.color;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.5) {
        drawDot(ctx, x1, y1, size, actualColor, opacity, hardness);
        return;
    }

    const step = Math.max(1, size * params.spacing);
    const steps = Math.max(1, Math.floor(distance / step));

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + dx * t;
        const y = y1 + dy * t;

        const flowVariation = 1 + (params.flow - 1) * 0.2;
        const currentSize = size * (0.9 + 0.2 * Math.random()) * flowVariation;
        const currentOpacity = opacity * (0.85 + 0.3 * Math.random());

        drawDot(ctx, x, y, currentSize, actualColor, currentOpacity, hardness);
    }
}

// --- Draw dot ---
function drawDot(ctx, x, y, size, color, opacity, hardness) {
    if (size < 0.5) return;

    const radius = size / 2;
    const rgb = hexToRgb(color);
    if (!rgb) return;

    ctx.save();

    if (hardness >= 0.99) {
        ctx.globalAlpha = Math.min(1, opacity);
        ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        if (params.shape === 'square') {
            ctx.fillRect(x - radius, y - radius, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const alpha = Math.min(1, opacity);
        const hardnessFactor = Math.max(0.1, hardness);

        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
        const outerAlpha = Math.max(0, alpha * (1 - hardnessFactor * 0.9));
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${outerAlpha})`);

        ctx.fillStyle = gradient;
        if (params.shape === 'square') {
            ctx.fillRect(x - radius, y - radius, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

// --- Hex to RGB ---
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// --- Flood fill (Nip) ---
export function floodFill(ctx, x, y, fillColor, tolerance = 30) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const startIdx = (y * w + x) * 4;
    const targetColor = {
        r: data[startIdx],
        g: data[startIdx + 1],
        b: data[startIdx + 2],
        a: data[startIdx + 3],
    };

    const fillRgb = hexToRgb(fillColor);
    if (!fillRgb) return;

    const stack = [{ x, y }];
    const visited = new Set();

    while (stack.length > 0) {
        const { x: cx, y: cy } = stack.pop();
        const key = `${cx},${cy}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const idx = (cy * w + cx) * 4;
        if (idx < 0 || idx >= data.length) continue;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const diff = Math.abs(r - targetColor.r) + Math.abs(g - targetColor.g) + Math.abs(b - targetColor.b);
        if (diff > tolerance) continue;

        data[idx] = fillRgb.r;
        data[idx + 1] = fillRgb.g;
        data[idx + 2] = fillRgb.b;
        data[idx + 3] = 255;

        if (cx > 0) stack.push({ x: cx - 1, y: cy });
        if (cx < w - 1) stack.push({ x: cx + 1, y: cy });
        if (cy > 0) stack.push({ x: cx, y: cy - 1 });
        if (cy < h - 1) stack.push({ x: cx, y: cy + 1 });
    }

    ctx.putImageData(imageData, 0, 0);
}

// --- Expose ---
window.__brush = { setBrushParams, getBrushParams, brushStroke, floodFill };