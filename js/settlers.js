/**
 * settlers.js — 집에 사는 사람
 *
 * "집을 왜 지어야 하는가"에 대한 답이다.
 *
 * 발전도라는 숫자만으로는 집을 지을 이유가 되지 않는다.
 * Age of Empires 에서 집을 짓는 이유는 인구가 늘어야 일꾼이 늘고,
 * 일꾼이 늘어야 자원이 들어오기 때문이다. 여기서도 같게 만든다.
 *
 *   집 한 채 = 주민 한 사람
 *   주민은 스스로 돌아다니며 나무와 돌을 모아 온다
 *   창고를 지으면 더 자주 날라 온다
 *
 * 그래서 집은 "숫자를 올리는 것"이 아니라 "손을 늘리는 것"이 된다.
 * 주민은 시대를 넘어 따라온다. 내가 지은 집이 그 자리에 다시 서기 때문이다.
 */
import { addVillager } from "./npc.js";
import { wolvesNear } from "./raid.js";
import { pick, rand, randRange } from "./rng.js";
import { G } from "./state.js";
import { isUnderwater, terrainHeight } from "./terrain.js";
import { updateResourceUI } from "./ui.js";

/** 시대별 사람 모양 */
const ERA_PALETTE = ["neolithic", "bronze", "samguk", "joseon", "modern", "modern"];

/** 한 사람이 한 번 날라 오는 데 걸리는 시간 (초) */
const DELIVER_MIN = 11;
const DELIVER_MAX = 16;

const LINES = [
    "이 집에 살게 되었네. 나무는 내가 모아 오지.",
    "손이 하나 늘면 그만큼 빨리 자라는 법이지.",
    "강가 쪽에 쓸 만한 돌이 많더군.",
    "집이 한 채 더 서면 사람이 또 올 걸세."
];

let settlers = [];

/** 지금 주민 수 */
export function population() {
    return settlers.length;
}

/** 창고가 많을수록 더 자주 날라 온다 */
function deliverInterval() {
    let stores = 0;
    for (const b of G.village) if (b.type === "store") stores++;
    return randRange(DELIVER_MIN, DELIVER_MAX) / (1 + 0.25 * stores);
}

/** 집 둘레를 도는 길 — 물에 빠지지 않게 고른다 */
function routeAround(x, z) {
    const pts = [];
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + randRange(-0.4, 0.4);
        const r = randRange(2.6, 6.5);
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        pts.push(isUnderwater(px, pz) ? [x, z] : [px, pz]);
    }
    return pts;
}

/**
 * 집 한 채에 사람 하나를 들인다.
 * village.js 가 집을 세울 때마다, 그리고 시대를 새로 지을 때마다 부른다.
 */
export function settleHouse(entry) {
    if (!G.world) return null;

    const palette = ERA_PALETTE[Math.max(0, G.currentAge)] || "neolithic";
    const group = addVillager(routeAround(entry.x, entry.z), palette, {
        name: "주민",
        speed: randRange(0.85, 1.25),
        dialogue: [pick(LINES), pick(LINES)]
    });

    group.position.y = terrainHeight(entry.x, entry.z);

    const settler = { group, home: entry, timer: deliverInterval() * randRange(0.3, 1) };
    settlers.push(settler);
    return settler;
}

/**
 * 한 프레임. loop.js 가 부른다.
 * 주민이 하나씩 재료를 날라 온다 — 화면에서는 그냥 걸어다니는 사람이지만,
 * 상단의 숫자가 혼자 올라가는 것으로 "사람이 일하고 있다"가 읽힌다.
 */
export function updateSettlers(delta) {
    if (!settlers.length || G.transitioning) return;

    for (const s of settlers) {
        // 들개가 가까이 있으면 겁을 먹고 일을 멈춘다.
        // 화톳불이나 울타리가 들개를 막아 주면 그럴 일이 없다.
        const p = s.group.position;
        if (wolvesNear(p.x, p.z)) { s.scared = true; continue; }
        s.scared = false;

        s.timer -= delta;
        if (s.timer > 0) continue;

        s.timer = deliverInterval();

        // 나무가 더 많이 드는 만큼 나무를 더 자주 가져온다
        const kind = rand() < 0.68 ? "wood" : "stone";
        G.materials[kind] = (G.materials[kind] || 0) + 1;
        updateResourceUI();
    }
}

/** 시대를 새로 지을 때 — 목록만 비운다 (사람은 world 와 함께 사라진다) */
export function resetSettlers() {
    settlers = [];
}
