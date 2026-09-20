/**
 * fog.js — 전장의 안개
 *
 * 격자마다 셋 중 하나다.
 *   0 아직 못 본 땅 (미니맵에서 검다)
 *   1 지나간 땅 (지형은 기억하지만 지금 무슨 일이 일어나는지는 모른다)
 *   2 지금 보이는 땅
 *
 * 적 유닛은 2 에서만 보인다. 건물은 한 번 본 자리면 기억한다 (AoE 와 같다).
 */
import { R } from "./state.js";

export const FOG = {
    half: 54,     // 월드 반경
    cell: 2,
    dim: 0,
    grid: null,
    timer: 0
};

export function fogInit() {
    FOG.dim = Math.ceil((FOG.half * 2) / FOG.cell);
    FOG.grid = new Uint8Array(FOG.dim * FOG.dim);
}

function idx(x, z) {
    const i = Math.floor((x + FOG.half) / FOG.cell);
    const j = Math.floor((z + FOG.half) / FOG.cell);
    if (i < 0 || j < 0 || i >= FOG.dim || j >= FOG.dim) return -1;
    return j * FOG.dim + i;
}

/** 시야를 한 번 칠한다 */
function stamp(x, z, radius) {
    const r = Math.ceil(radius / FOG.cell);
    const ci = Math.floor((x + FOG.half) / FOG.cell);
    const cj = Math.floor((z + FOG.half) / FOG.cell);

    for (let j = cj - r; j <= cj + r; j++) {
        if (j < 0 || j >= FOG.dim) continue;
        for (let i = ci - r; i <= ci + r; i++) {
            if (i < 0 || i >= FOG.dim) continue;
            const dx = (i - ci), dz = (j - cj);
            if (dx * dx + dz * dz > r * r) continue;
            FOG.grid[j * FOG.dim + i] = 2;
        }
    }
}

/** 0.2 초마다 다시 계산한다. 매 프레임 할 이유가 없다. */
export function fogUpdate(dt) {
    FOG.timer -= dt;
    if (FOG.timer > 0) return;
    FOG.timer = 0.2;

    const g = FOG.grid;
    for (let k = 0; k < g.length; k++) if (g[k] === 2) g[k] = 1;

    for (const u of R.units) {
        if (u.owner !== 0 || !u.alive) continue;
        stamp(u.x, u.z, u.def.los || 6);
    }
    for (const b of R.buildings) {
        if (b.owner !== 0 || !b.alive) continue;
        stamp(b.x, b.z, b.def.los || 6);
    }
}

export function fogAt(x, z) {
    const k = idx(x, z);
    return k < 0 ? 0 : FOG.grid[k];
}

export function isVisible(x, z) {
    return fogAt(x, z) === 2;
}

export function isExplored(x, z) {
    return fogAt(x, z) > 0;
}
