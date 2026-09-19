/**
 * basemap.js — 한 판에 한 번만 만들어지는 자연 지형
 *
 * 이 게임의 전제는 "같은 장소가 시대에 따라 변해 간다"이다.
 * 그런데 지금까지는 시대마다 돌과 풀을 따로 뿌려서,
 * 같은 땅인데 바위 하나가 매번 다른 자리에 있었다.
 *
 * 여기서는 자연물의 "자리"를 한 번만 정하고,
 * 각 시대는 그것을 자기 색으로 칠하기만 한다.
 * 신석기에서 본 그 바위가 2000년대 화단 한가운데 그대로 있다.
 *
 * 시대가 정하는 것은 두 가지뿐이다.
 *   팔레트   — 같은 바위를 황갈로 칠할지 회색으로 칠할지
 *   지워진 것 — 건물과 도로가 들어선 자리의 자연물은 생략된다
 */
import { makeMat } from "./build.js";
import { carveRiver } from "./landmarks.js";
import { fbm } from "./noise.js";
import { rand, randRange, seedRandom } from "./rng.js";
import { G } from "./state.js";
import { isUnderwater, terrainHeight } from "./terrain.js";
import { addInstanced } from "./world.js";

/** 자연물이 놓이는 범위 (월드 단위 반경) */
const FIELD = 31;

/**
 * 자연 지형을 만든다. 한 판에 한 번만 호출된다.
 *
 * 색은 여기서 정하지 않는다. 위치와 크기만 정한다.
 * 물속은 애초에 제외하므로 시대마다 다시 검사할 필요가 없다.
 */
/**
 * 뭍에 놓일 자리를 찾는다.
 * 강이 맵의 상당 부분을 차지하므로, 물에 걸리면 버리지 말고 다시 뽑는다.
 * 그냥 버리면 목표 개수의 절반도 안 남는다.
 */
function landSpot(pick, tries = 24) {
    for (let i = 0; i < tries; i++) {
        const p = pick();
        if (!isUnderwater(p[0], p[1])) return p;
    }
    return null;
}

export function generateBaseMap(seed) {
    seedRandom(seed);

    // 강도 이 땅의 일부다. 물속 판정이 되려면 먼저 파 두어야 한다.
    G.terrainCarve = carveRiver;

    const map = { boulders: [], stones: [], grass: [], trees: [] };

    // ---- 큰 바위 ----
    // 여섯 시대 내내 남는 것들. 플레이어가 알아볼 수 있을 만큼 크고 적다.
    for (let i = 0; i < 10; i++) {
        const spot = landSpot(() => {
            const a = randRange(0, Math.PI * 2);
            const r = randRange(9, 27);
            return [Math.cos(a) * r, Math.sin(a) * r];
        });
        if (!spot) continue;
        const [x, z] = spot;

        const chunks = [];
        const scale = randRange(0.9, 1.6);
        const n = Math.floor(randRange(3, 6));
        for (let c = 0; c < n; c++) {
            const cr = randRange(0.45, 0.85) * scale;
            chunks.push({
                dx: randRange(-0.5, 0.5) * scale,
                dy: cr * randRange(0.45, 0.8),
                dz: randRange(-0.5, 0.5) * scale,
                sx: cr * randRange(1.0, 1.6),
                sy: cr * randRange(0.55, 1.0),
                sz: cr * randRange(0.9, 1.5),
                ry: randRange(0, Math.PI),
                rz: randRange(-0.2, 0.2)
            });
        }
        map.boulders.push({ x, z, chunks });
    }

    // ---- 자갈 ----
    for (let i = 0; i < 230; i++) {
        const spot = landSpot(() => [randRange(-FIELD, FIELD), randRange(-FIELD, FIELD)]);
        if (!spot) continue;
        const [x, z] = spot;

        const s = randRange(0.07, 0.3);
        map.stones.push({
            x, z, s,
            sx: s * randRange(1, 1.9),
            sy: s * randRange(0.32, 0.8),
            sz: s * randRange(0.8, 1.5),
            ry: randRange(0, Math.PI),
            rz: randRange(-0.14, 0.14)
        });
    }

    // ---- 풀 다발 ----
    // 다발 단위로 저장해 두면 시대별로 "얼마나 남길지"를 고르기 쉽다.
    for (let i = 0; i < 380; i++) {
        const spot = landSpot(() => {
            const a = randRange(0, Math.PI * 2);
            const r = randRange(3, FIELD);
            return [Math.cos(a) * r, Math.sin(a) * r];
        });
        if (!spot) continue;
        const [cx, cz] = spot;

        const blades = [];
        const n = Math.floor(randRange(3, 7));
        for (let b = 0; b < n; b++) {
            const h = randRange(0.22, 0.62);
            blades.push({
                dx: randRange(-0.22, 0.22),
                dz: randRange(-0.22, 0.22),
                h,
                sx: randRange(0.03, 0.07),
                ry: randRange(0, Math.PI),
                rz: randRange(-0.35, 0.35),
                rx: randRange(-0.2, 0.2)
            });
        }
        // 비옥도 — 시대가 흘러도 풀이 잘 나는 자리는 대체로 같다
        const fertility = fbm(cx * 0.04 + 5.5, cz * 0.04 + 2.2, 3);
        map.grass.push({ x: cx, z: cz, blades, fertility });
    }

    // ---- 나무 ----
    // 시대가 흐를수록 줄어든다. 어느 나무가 먼저 베이는지는 여기서 정해 둔다.
    for (let i = 0; i < 52; i++) {
        // 나무는 지평선을 채우는 역할이라 물가에서 조금 떨어뜨린다
        const spot = landSpot(() => {
            const a = randRange(0, Math.PI * 2);
            const r = randRange(22, 36);
            return [Math.cos(a) * r, Math.sin(a) * r];
        }, 40);
        if (!spot) continue;
        const [x, z] = spot;

        const h = randRange(1.9, 3.6);
        const blobs = [];
        const n = Math.floor(randRange(2, 4));
        for (let b = 0; b < n; b++) {
            blobs.push({
                dx: randRange(-0.3, 0.3),
                dy: b * randRange(0.25, 0.42),
                dz: randRange(-0.3, 0.3),
                r: randRange(0.42, 0.72),
                sx: randRange(1.0, 1.5),
                sy: randRange(0.7, 1.05),
                sz: randRange(1.0, 1.5),
                ry: randRange(0, Math.PI)
            });
        }
        // 베이는 순서. 값이 작을수록 오래 살아남는다.
        map.trees.push({ x, z, h, blobs, felling: rand() });
    }

    G.baseMap = map;
    return map;
}

/** 지워진 자리(건물·도로) 안에 들어가는지 */
function cleared(x, z, clear) {
    for (let i = 0; i < clear.length; i++) {
        const c = clear[i];
        const dx = x - c.x, dz = z - c.z;
        if (dx * dx + dz * dz < c.r * c.r) return true;
    }
    return false;
}

/**
 * 자연 지형을 이 시대의 색으로 그린다.
 *
 * @param {object} opts
 *   stone / grass / tree  — 색 배열 (시대 팔레트)
 *   clear                 — [{x, z, r}] 건물·도로가 들어선 자리
 *   treeSurvival          — 0..1 남아 있는 나무 비율 (시대가 흐를수록 낮아진다)
 *   grassDensity          — 0..1 풀 밀도
 */
export function paintBaseMap(opts) {
    const map = G.baseMap;
    if (!map) return;

    const clear = opts.clear || [];
    const stoneCols = (opts.stone || [0x77706a]).map((c) => new THREE.Color(c));
    const grassCols = (opts.grass || [0x7c6c3a]).map((c) => new THREE.Color(c));
    const treeCols = (opts.tree || [0x5f5c38]).map((c) => new THREE.Color(c));
    const treeSurvival = opts.treeSurvival ?? 1;
    const grassDensity = opts.grassDensity ?? 1;

    // ---- 큰 바위 ----
    // 건물이 들어서도 치우지 않는다. 너무 커서 옮길 수 없었기 때문이다.
    const boulderList = [];
    for (const b of map.boulders) {
        const y = terrainHeight(b.x, b.z);
        for (const c of b.chunks) {
            boulderList.push({
                x: b.x + c.dx, y: y + c.dy, z: b.z + c.dz,
                sx: c.sx, sy: c.sy, sz: c.sz, ry: c.ry, rz: c.rz,
                color: stoneCols[Math.floor(rand() * stoneCols.length)]
            });
        }
    }
    addInstanced(
        new THREE.DodecahedronGeometry(1, 0),
        makeMat(0xffffff, { roughness: 1, map: G.TEX.stone }),
        boulderList
    );

    // ---- 자갈 ----
    const stoneList = [];
    for (const s of map.stones) {
        if (cleared(s.x, s.z, clear)) continue;
        stoneList.push({
            x: s.x, y: terrainHeight(s.x, s.z) + s.s * 0.45, z: s.z,
            sx: s.sx, sy: s.sy, sz: s.sz, ry: s.ry, rz: s.rz,
            color: stoneCols[Math.floor(rand() * stoneCols.length)]
        });
    }
    addInstanced(
        new THREE.DodecahedronGeometry(1, 0),
        makeMat(0xffffff, { roughness: 1, map: G.TEX.stone }),
        stoneList
    );

    // ---- 풀 ----
    const grassList = [];
    for (const g of map.grass) {
        if (cleared(g.x, g.z, clear)) continue;
        // 비옥한 자리부터 남는다
        if (g.fertility > grassDensity) continue;

        const cy = terrainHeight(g.x, g.z);
        for (const bl of g.blades) {
            grassList.push({
                x: g.x + bl.dx, y: cy + bl.h * 0.5, z: g.z + bl.dz,
                sx: bl.sx, sy: bl.h, sz: 0.02,
                ry: bl.ry, rz: bl.rz, rx: bl.rx,
                color: grassCols[Math.floor(rand() * grassCols.length)]
            });
        }
    }
    addInstanced(
        new THREE.BoxGeometry(1, 1, 1),
        makeMat(0xffffff, { roughness: 1 }),
        grassList,
        { castShadow: false, receiveShadow: false }
    );

    // ---- 나무 ----
    // 시대가 흐를수록 줄어든다. 사람이 땅을 바꿔 온 흔적이다.
    const trunkList = [], leafList = [];
    for (const t of map.trees) {
        if (t.felling > treeSurvival) continue;
        if (cleared(t.x, t.z, clear)) continue;

        const y = terrainHeight(t.x, t.z);
        const trunkH = t.h * 0.34;
        trunkList.push({
            x: t.x, y: y + trunkH * 0.5, z: t.z,
            sx: 0.13, sy: trunkH, sz: 0.13
        });

        const col = treeCols[Math.floor(rand() * treeCols.length)];
        for (const b of t.blobs) {
            leafList.push({
                x: t.x + b.dx,
                y: y + trunkH + t.h * 0.3 + b.dy,
                z: t.z + b.dz,
                sx: b.r * b.sx, sy: b.r * b.sy, sz: b.r * b.sz,
                ry: b.ry, color: col
            });
        }
    }
    addInstanced(
        new THREE.CylinderGeometry(0.7, 1, 1, 5),
        makeMat(0x3d2c1c, { roughness: 1 }),
        trunkList,
        { castShadow: false, receiveShadow: false }
    );
    addInstanced(
        new THREE.DodecahedronGeometry(1, 0),
        makeMat(0xffffff, { roughness: 1 }),
        leafList,
        { castShadow: false, receiveShadow: false }
    );
}
