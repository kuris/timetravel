/**
 * map.js — 판 만들기
 *
 * 한 장의 땅 위에 두 진영이 앉는다. 강은 한쪽으로 흐르고,
 * 숲 · 덤불 · 돌 · 금 · 짐승이 두 진영 곁에 고르게 놓인다.
 * (Age of Empires 의 랜덤 맵이 하던 일과 같다.)
 */
import { AudioSystem } from "../audio.js";
import { generateBaseMap, paintBaseMap } from "../basemap.js";
import { AGE_DATA } from "../config.js";
import { addRiver, carveRiver } from "../landmarks.js";
import { disposeGroup, disposeTextures } from "../morph.js";
import { buildTextures } from "../palette.js";
import { randRange, seedRandom } from "../rng.js";
import { G, cameraTarget } from "../state.js";

import { initWeather } from "../weather.js";
import { addBackdrop, addDustMotes, addGround, addLights, addMistLayers } from "../world.js";
import { placeBuilding } from "./buildings.js";
import { fogInit, fogUpdate } from "./fog.js";
import { spawnResource } from "./nodes.js";
import { R, resetRts } from "./state.js";
import { bakeMinimapTerrain } from "./hud.js";
import { MAP_R, spawnUnit } from "./units.js";
import { dist, isWater } from "./util.js";

/** 두 진영의 자리. 강(물) 반대편 뭍에 앉힌다. */
export const BASE = [
    { x: -17, z: 21 },   // 나
    { x: 22, z: -9 }     // 적
];

/** 시대별 지면 색 (탐험 모드의 시대 빌더에서 그대로 가져왔다) */
const GROUND = [
    { base: 0x9d7249, patch: [0xc59a62, 0x8a7644, 0xb5854f, 0x6f5637, 0xd6b47f] },
    { base: 0x8e6b43, patch: [0xb08653, 0x7d6039, 0xa47c48, 0x63513a, 0xc9a26c] },
    { base: 0x8a7048, patch: [0xa88a58, 0x736040, 0x9c7e4e, 0x5f5238, 0xc0a068] },
    { base: 0x7b6a58, patch: [0x917c66, 0x605244, 0x87745a, 0x564f45, 0x9d8a70] },
    { base: 0x87724f, patch: [0xa08a5e, 0x6f5f42, 0x967f55, 0x5c5340, 0xb59a6a] },
    { base: 0x6f6a60, patch: [0x817b70, 0x5c574f, 0x76705f, 0x8a8478, 0x615c54] }
];

/** 시대별 자연물 색 */
const NATURE = [
    { stone: [0x77706a, 0x8b8172, 0x625c55], grass: [0x4d6e36, 0x5d8042, 0x6f8f4a, 0x3d592a], density: 1.0 },
    { stone: [0x786d62, 0x635b55, 0x8b8072], grass: [0x7c6c3a, 0x635a30, 0x8d7a45, 0x544d2b], density: 0.95 },
    { stone: [0x786d62, 0x635b55, 0x8b8072], grass: [0x757a3c, 0x5f6531, 0x878c4a, 0x4e5329], density: 0.85 },
    { stone: [0x5f5d5b, 0x716c66, 0x4f4d4c], grass: [0x4a4636, 0x3b3a2c, 0x565033, 0x333127], density: 0.8 },
    { stone: [0x7c766c, 0x655f58, 0x8f887c], grass: [0x6f7a3c, 0x5a6431, 0x7f8a48, 0x4c5329], density: 0.7 },
    { stone: [0x7c766c, 0x8f887c], grass: [0x5a6b3c, 0x4a5a30, 0x667742], density: 0.5 }
];

/* ---------------------------------------------------------------- 장면 */

function clearLights() {
    const kill = [];
    G.scene.traverse((o) => { if (o.isLight) kill.push(o); });
    for (const l of kill) {
        if (l.shadow) {
            if (l.shadow.map) l.shadow.map.dispose();
            if (typeof l.shadow.dispose === "function") l.shadow.dispose();
        }
        if (l.parent) l.parent.remove(l);
    }
    G.sunLight = null;
    G.hemiLight = null;
    G.ambientLight = null;
}

/**
 * 이 시대의 땅을 만든다.
 * 유닛과 건물은 여기에 없다 — 시대가 올라도 그들은 살아남기 때문이다.
 */
export function buildScenery(age) {
    if (G.scene) {
        if (G.world) { G.scene.remove(G.world); disposeGroup(G.world); }
        if (G.backdrop) { G.scene.remove(G.backdrop); disposeGroup(G.backdrop); }
        clearLights();
        disposeTextures(G.TEX);
    } else {
        G.scene = new THREE.Scene();
    }

    G.backdrop = null;
    G.world = null;
    G.animated = [];
    G.mapShapes = [];
    G.mapMarkers = [];
    G.terrainCarve = carveRiver;

    const a = AGE_DATA[age];
    buildTextures(age);

    G.scene.background = new THREE.Color(a.fog);
    G.scene.fog = new THREE.FogExp2(a.fog, a.fogDensity);

    G.world = new THREE.Group();
    G.scene.add(G.world);

    addLights(a);

    seedRandom(4000 + age * 177);
    addBackdrop({
        skyTop: a.sky.top, skyMid: a.sky.mid, skyBottom: a.sky.bottom, ridges: a.ridges
    });

    seedRandom(1000 + age * 333);
    addGround(GROUND[age].base, GROUND[age].patch);
    addRiver();

    const nat = NATURE[age];
    paintBaseMap({
        stone: nat.stone,
        grass: nat.grass,
        tree: [0x3f4a2c],
        treeSurvival: 0,      // 나무는 RTS 의 자원이므로 장식용은 놓지 않는다
        grassDensity: nat.density
    });

    addMistLayers(a.fog, a.night ? 5 : 4);
    addDustMotes(a.night ? 0xb9c4d8 : 0xffe3b4, 120);

    initWeather(age);
    if (AudioSystem.started) AudioSystem.setEra(age);
}

/* ---------------------------------------------------------------- 자원 */

function ok(x, z, gap = 2.2) {
    if (Math.hypot(x, z) > MAP_R - 3) return false;
    if (isWater(x, z)) return false;
    // 물가에서 한 걸음 떨어뜨린다 (주민이 낄 자리가 없으면 곤란하다)
    if (isWater(x + 1.4, z + 1.4) || isWater(x - 1.4, z - 1.4)) return false;

    for (const b of BASE) if (dist(x, z, b.x, b.z) < 5.5) return false;
    for (const n of R.nodes) if (dist(x, z, n.x, n.z) < gap) return false;
    return true;
}

function cluster(kind, cx, cz, count, spread, amount) {
    let placed = 0, guard = 0;
    while (placed < count && guard++ < count * 40) {
        const a = randRange(0, Math.PI * 2);
        const r = Math.sqrt(Math.random()) * spread;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (!ok(x, z, kind === "wood" ? 1.5 : 2.1)) continue;
        spawnResource(kind, x, z, amount);
        placed++;
    }
}

function herd(key, cx, cz, count) {
    for (let i = 0; i < count; i++) {
        const a = randRange(0, Math.PI * 2);
        const x = cx + Math.cos(a) * randRange(0.5, 2.5);
        const z = cz + Math.sin(a) * randRange(0.5, 2.5);
        if (!ok(x, z, 0.8)) continue;
        spawnUnit(key, 2, x, z);
    }
}

/** 한 진영 곁에 놓이는 것들. 두 진영에 똑같이 준다. */
function baseResources(bx, bz, toward) {
    const ang = Math.atan2(-bz + toward.z, -bx + toward.x); // 판 가운데 쪽
    const at = (d, off) => [
        bx + Math.cos(ang + off) * d,
        bz + Math.sin(ang + off) * d
    ];

    let [x, z] = at(11, 0.9); cluster("wood", x, z, 16, 4.2, 75);
    [x, z] = at(12, -1.1); cluster("wood", x, z, 14, 4.0, 75);
    [x, z] = at(7.5, 2.3); cluster("food", x, z, 5, 1.6, 150);
    [x, z] = at(9, -2.4); cluster("stone", x, z, 4, 1.8, 250);
    [x, z] = at(14, 0.2); cluster("gold", x, z, 4, 1.8, 300);
    [x, z] = at(15, 2.0); herd("deer", x, z, 4);
    [x, z] = at(10, -3.0); herd("boar", x, z, 1);
}

function scatterResources() {
    seedRandom((G.runSeed || 1) * 31 + 977);

    baseResources(BASE[0].x, BASE[0].z, BASE[1]);
    baseResources(BASE[1].x, BASE[1].z, BASE[0]);

    // 가운데 — 둘이 다투게 되는 자리
    const mid = { x: (BASE[0].x + BASE[1].x) / 2, z: (BASE[0].z + BASE[1].z) / 2 };
    cluster("wood", mid.x + 6, mid.z + 6, 18, 5, 75);
    cluster("wood", mid.x - 7, mid.z - 5, 16, 5, 75);
    cluster("gold", mid.x, mid.z, 5, 2.4, 300);
    cluster("stone", mid.x - 4, mid.z + 5, 4, 2.0, 250);
    cluster("food", mid.x + 5, mid.z - 4, 4, 1.8, 150);
    herd("deer", mid.x + 2, mid.z + 3, 4);
    herd("boar", mid.x - 3, mid.z - 2, 1);

    // 판 가장자리의 숲
    for (let i = 0; i < 5; i++) {
        const a = randRange(0, Math.PI * 2);
        const r = randRange(26, MAP_R - 8);
        cluster("wood", Math.cos(a) * r, Math.sin(a) * r, 12, 4.5, 75);
    }
}

/* ------------------------------------------------------------ 판 시작 */

export function startGame() {
    resetRts();
    fogInit();

    if (!G.baseMap) generateBaseMap(G.runSeed || 20260920);
    buildScenery(0);
    scatterResources();

    // 두 진영의 마을회관과 주민 (AoE 의 시작과 같다)
    for (let owner = 0; owner < 2; owner++) {
        const b = BASE[owner];
        const other = BASE[1 - owner];
        const rot = Math.atan2(other.x - b.x, other.z - b.z);
        const tc = placeBuilding("towncenter", owner, b.x, b.z, rot, true);

        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + 0.6;
            const x = b.x + Math.cos(a) * 3.2, z = b.z + Math.sin(a) * 3.2;
            spawnUnit("villager", owner, x, z);
        }
        if (owner === 0) {
            cameraTarget.set(tc.x, 0.6, tc.z);
        }
    }

    fogUpdate(999);
    bakeMinimapTerrain();
}

export { GROUND, NATURE };
