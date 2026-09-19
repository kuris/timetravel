/**
 * 노이즈 — value noise / fbm
 */
export function hash2(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
}

export function smooth(t) {
    return t * t * (3 - 2 * t);
}

export function valueNoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = smooth(xf), v = smooth(yf);

    const a = hash2(xi, yi);
    const b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1);
    const d = hash2(xi + 1, yi + 1);

    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export function fbm(x, y, octaves = 4) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
        sum += valueNoise(x * freq, y * freq) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.05;
    }
    return sum / norm;
}
