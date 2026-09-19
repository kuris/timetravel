/**
 * 절차적 텍스처 — canvas 로 직접 그린다
 */
import { fbm } from "./noise.js";
import { pick, rand, randRange } from "./rng.js";

export function makeCanvas(size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    return c;
}

export function finishTexture(canvas, repeat) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;   // 픽셀 느낌 유지
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 1;
    if (repeat) t.repeat.set(repeat, repeat);
    if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/**
 * 수채화풍 흙/땅 텍스처.
 * @param {string[]} colors 얼룩에 쓸 색 (CSS 문자열)
 * @param {string} base 바탕색
 */
export function makeTerrainTexture(colors, base, opts = {}) {
    const S = 256;
    const c = makeCanvas(S);
    const g = c.getContext("2d");

    g.fillStyle = base;
    g.fillRect(0, 0, S, S);

    // 1) 크게 번진 수채화 얼룩 (여러 겹 반투명으로 겹쳐 물감처럼)
    const washes = opts.washes ?? 110;
    for (let i = 0; i < washes; i++) {
        const x = rand() * S, y = rand() * S;
        const r = randRange(10, 52);
        const col = pick(colors);
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, col.replace("ALPHA", (randRange(0.05, 0.16)).toFixed(3)));
        grd.addColorStop(0.65, col.replace("ALPHA", (randRange(0.02, 0.07)).toFixed(3)));
        grd.addColorStop(1, col.replace("ALPHA", "0"));
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
    }

    // 2) 마른 붓자국 (수채화 가장자리 느낌)
    g.globalAlpha = 0.10;
    for (let i = 0; i < 26; i++) {
        g.strokeStyle = pick(colors).replace("ALPHA", "0.5");
        g.lineWidth = randRange(1, 4);
        g.beginPath();
        const x = rand() * S, y = rand() * S;
        g.moveTo(x, y);
        g.bezierCurveTo(
            x + randRange(-40, 40), y + randRange(-40, 40),
            x + randRange(-60, 60), y + randRange(-60, 60),
            x + randRange(-70, 70), y + randRange(-70, 70)
        );
        g.stroke();
    }
    g.globalAlpha = 1;

    // 3) 자갈/흙알갱이 (픽셀 단위 점묘)
    const img = g.getImageData(0, 0, S, S);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const px = (i / 4) % S, py = Math.floor((i / 4) / S);
        // 종이 결처럼 저주파 노이즈도 섞는다
        const paper = (fbm(px * 0.06, py * 0.06, 3) - 0.5) * 26;
        const speck = (Math.random() - 0.5) * (opts.grit ?? 26);
        d[i] = THREE.MathUtils.clamp(d[i] + speck + paper, 0, 255);
        d[i + 1] = THREE.MathUtils.clamp(d[i + 1] + speck * 0.95 + paper, 0, 255);
        d[i + 2] = THREE.MathUtils.clamp(d[i + 2] + speck * 0.85 + paper * 0.9, 0, 255);
    }
    g.putImageData(img, 0, 0);

    return finishTexture(c, opts.repeat ?? 9);
}

/** 물 표면: 잔물결 + 반짝임 */
export function makeWaterTexture(base, hi) {
    const S = 128;
    const c = makeCanvas(S);
    const g = c.getContext("2d");
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);

    for (let i = 0; i < 260; i++) {
        g.strokeStyle = hi.replace("ALPHA", randRange(0.04, 0.16).toFixed(3));
        g.lineWidth = randRange(0.6, 1.8);
        const y = rand() * S, x = rand() * S;
        const w = randRange(4, 26);
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + w * 0.5, y + randRange(-1.6, 1.6), x + w, y);
        g.stroke();
    }
    return finishTexture(c, 7);
}

/** 초가지붕 / 갈대 지붕: 세로 결 */
export function makeThatchTexture(base, dark, light) {
    const S = 128;
    const c = makeCanvas(S);
    const g = c.getContext("2d");
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);

    for (let i = 0; i < 700; i++) {
        g.strokeStyle = (rand() > 0.5 ? dark : light).replace("ALPHA", randRange(0.08, 0.34).toFixed(3));
        g.lineWidth = randRange(0.5, 1.6);
        const x = rand() * S, y = rand() * S;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + randRange(-2.5, 2.5), y + randRange(6, 22));
        g.stroke();
    }
    return finishTexture(c, 3);
}

/** 돌 / 바위: 얼룩과 이끼 */
export function makeStoneTexture(base, spots) {
    const S = 128;
    const c = makeCanvas(S);
    const g = c.getContext("2d");
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);

    for (let i = 0; i < 160; i++) {
        const x = rand() * S, y = rand() * S, r = randRange(2, 16);
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        const col = pick(spots);
        grd.addColorStop(0, col.replace("ALPHA", randRange(0.05, 0.22).toFixed(3)));
        grd.addColorStop(1, col.replace("ALPHA", "0"));
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
    }
    return finishTexture(c, 2);
}

/** 나무 재질: 세로 나뭇결 */
export function makeWoodTexture(base, dark) {
    const S = 64;
    const c = makeCanvas(S);
    const g = c.getContext("2d");
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 120; i++) {
        g.fillStyle = dark.replace("ALPHA", randRange(0.05, 0.25).toFixed(3));
        g.fillRect(rand() * S, 0, randRange(0.5, 2.2), S);
    }
    return finishTexture(c, 2);
}

/** 안개 판에 쓰는 부드러운 원형 알파 텍스처 */
export function makeMistTexture() {
    const S = 128;
    const c = makeCanvas(S);
    const g = c.getContext("2d");

    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
        const x = randRange(20, S - 20), y = randRange(20, S - 20);
        const r = randRange(14, 46);
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, "rgba(255,255,255," + randRange(0.05, 0.16).toFixed(3) + ")");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
    }

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    return t;
}

// 생성된 텍스처는 G.TEX 에 보관된다 (eras/build.js 의 buildTextures 참고).

