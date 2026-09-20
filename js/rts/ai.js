/**
 * ai.js — 적 진영
 *
 * AoE 의 단일 플레이 상대처럼 군다.
 *   모으고 → 집을 늘리고 → 병영을 세우고 → 시대를 올리고 → 떼를 지어 온다
 *
 * 속이지 않는다. 같은 값을 치르고 같은 속도로 모은다.
 * 강한 이유는 딴 데 있다 — 쉬지 않기 때문이다.
 */
import { AGE_UP, BUILDINGS, UNITS } from "./defs.js";
import {
    canAfford, canPlace, pay, placeBuilding, queueUnit, startAgeUp, trainable
} from "./buildings.js";
import { nearestNode } from "./nodes.js";
import { R } from "./state.js";
import { orderAttack, orderBuild, orderGather, orderMove, spawnUnit } from "./units.js";
import { dist } from "./util.js";
import { BASE } from "./map.js";

const AI = {
    timer: 0,
    wave: 0,
    waveSize: 4,
    attackTimer: 150,   // 첫 습격까지 (초)
    owner: 1
};

export function resetAI() {
    AI.timer = 0;
    AI.wave = 0;
    AI.waveSize = 4;
    AI.attackTimer = 150;
}

const own = (list) => list.filter((e) => e.alive && e.owner === AI.owner);

function myUnits(key) {
    return R.units.filter((u) => u.alive && u.owner === AI.owner && (!key || u.key === key));
}

function myBuildings(type) {
    return R.buildings.filter((b) => b.alive && b.owner === AI.owner && (!type || b.type === type));
}

function townCenter() {
    return myBuildings("towncenter").find((b) => b.built) || myBuildings("towncenter")[0];
}

/* ------------------------------------------------------------------ 건설 */

function findSpot(tc, def) {
    for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 9;
        const x = tc.x + Math.cos(a) * r;
        const z = tc.z + Math.sin(a) * r;
        if (canPlace(def.key, x, z, AI.owner)) return [x, z];
    }
    return null;
}

function aiBuild(type) {
    const def = BUILDINGS[type];
    const tc = townCenter();
    if (!tc || !canAfford(def.cost, AI.owner)) return false;
    if ((def.age || 0) > R.players[AI.owner].age) return false;

    const spot = findSpot(tc, def);
    if (!spot) return false;

    pay(def.cost, AI.owner);
    const site = placeBuilding(type, AI.owner, spot[0], spot[1], Math.random() * 6.28, false);

    // 가까운 주민 둘을 보낸다
    const vs = myUnits("villager")
        .sort((a, b) => dist(a.x, a.z, site.x, site.z) - dist(b.x, b.z, site.x, site.z))
        .slice(0, 2);
    orderBuild(vs, site);
    return true;
}

/* ------------------------------------------------------------------ 경제 */

/**
 * 주민을 어디에 붙일까.
 *
 * "가장 적게 가진 자원"을 쫓으면 식량과 나무만 캐게 된다 (늘 쓰니까 늘 적다).
 * 그래서 AoE 처럼 **몫**으로 나눈다. 시대가 오를수록 금이 필요해진다.
 */
function quota(p) {
    return p.age === 0
        ? { food: 0.5, wood: 0.38, stone: 0.04, gold: 0.08 }
        : { food: 0.44, wood: 0.32, stone: 0.08, gold: 0.16 };
}

function gatheringKind(u) {
    if (u.order.t === "gather" && u.order.node) return u.order.node.kind;
    if (u.order.t === "return") return u.order.res || u.carry.res;
    return null;
}

/** 몫에 견주어 가장 모자란 자원 */
function neededRes(p) {
    const q = quota(p);
    const have = { food: 0, wood: 0, stone: 0, gold: 0 };
    let total = 0;
    for (const u of myUnits("villager")) {
        const k = gatheringKind(u);
        if (k) { have[k]++; total++; }
    }
    total = Math.max(1, total);

    let best = "food", bv = 1e9;
    for (const k in q) {
        const v = have[k] / total - q[k];
        if (v < bv) { bv = v; best = k; }
    }
    return best;
}

function assignIdleVillagers(tc) {
    const p = R.players[AI.owner];
    for (const u of myUnits("villager")) {
        if (u.order.t !== "idle") continue;
        const kind = neededRes(p);
        let node = nearestNode(kind, u.x, u.z, 40);
        if (!node) node = nearestNode("wood", u.x, u.z, 40) || nearestNode("food", u.x, u.z, 40);
        if (node) orderGather([u], node);
        else if (tc) orderMove([u], tc.x + (Math.random() - 0.5) * 6, tc.z + (Math.random() - 0.5) * 6);
    }
}

/* ------------------------------------------------------------------ 군사 */

function idleSoldiers() {
    return R.units.filter((u) =>
        u.alive && u.owner === AI.owner && u.key !== "villager" &&
        (u.order.t === "idle" || u.order.t === "move"));
}

function enemyNearBase(tc) {
    if (!tc) return null;
    for (const u of R.units) {
        if (!u.alive || u.owner !== 0) continue;
        if (dist(u.x, u.z, tc.x, tc.z) < 20) return u;
    }
    for (const b of R.buildings) {
        if (!b.alive || b.owner !== 0) continue;
        if (dist(b.x, b.z, tc.x, tc.z) < 22) return b;
    }
    return null;
}

/** 칠 곳: 가장 가까운 사람의 건물 */
function attackTarget(from) {
    let best = null, bd = 1e9;
    for (const b of R.buildings) {
        if (!b.alive || b.owner !== 0) continue;
        const d = dist(b.x, b.z, from.x, from.z);
        if (d < bd) { bd = d; best = b; }
    }
    if (best) return best;
    return R.units.find((u) => u.alive && u.owner === 0) || null;
}

/* ------------------------------------------------------------------ 갱신 */

export function updateAI(dt) {
    if (R.over) return;

    AI.timer -= dt;
    AI.attackTimer -= dt;
    if (AI.timer > 0) return;
    AI.timer = 1.0;

    const p = R.players[AI.owner];
    const tc = townCenter();
    if (!tc) return;                 // 마을회관을 잃으면 더 이상 크지 못한다

    assignIdleVillagers(tc);

    const pending = myBuildings().filter((b) => !b.built);
    const count = (type) => myBuildings(type).length;          // 짓는 중인 것도 센다
    const busy = pending.length >= 2;                          // 한꺼번에 여러 채를 벌이지 않는다

    // 시대를 열 값을 모으는 중인가. 모으는 동안에는 씀씀이를 줄인다.
    const ageCost = p.age < 5 ? AGE_UP[p.age] : null;
    const saving = !!ageCost && !p.ageUp && p.res.food < ageCost.food + 120;

    // ---- 주민 ----
    const villagers = myUnits("villager").length;
    const wantVillagers = count("barracks") ? 13 : 16;
    if (tc.built && villagers < wantVillagers && !tc.queue.length
        && (!saving || villagers < 9)) {
        queueUnit(tc, "villager");
    }

    // ---- 집 ----
    // 한 채씩만 올린다. 한꺼번에 여러 채를 벌이면 다른 걸 못 짓는다.
    if (p.popCap - p.pop <= 3 && p.popCap < 50 && !pending.some((b) => b.type === "house")) {
        aiBuild("house");
    }

    if (!busy) {
        // ---- 자원 건물 ----
        if (!count("granary") && R.time > 30) aiBuild("granary");
        else if (!count("storage") && R.time > 55) aiBuild("storage");

        // ---- 군사 건물 ----
        else if (count("barracks") < (R.time > 260 ? 2 : 1) && R.time > 75) aiBuild("barracks");
        else if (p.age >= 1 && !count("range") && R.time > 130) aiBuild("range");
        else if (p.age >= 1 && count("farm") < 3 && p.res.wood > 240) aiBuild("farm");
        else if (p.age >= 1 && count("tower") < 2 && R.time > 220 && p.res.stone > 180) aiBuild("tower");
    }

    // ---- 시대 ----
    if (!p.ageUp && myBuildings().filter((b) => b.built).length >= 3) startAgeUp(tc);

    // ---- 병사 ----
    // 시대를 열 값을 모으는 동안에는 최소한만 뽑는다.
    const soldiers = R.units.filter((u) =>
        u.alive && u.owner === AI.owner && u.key !== "villager").length;
    const barracks = myBuildings("barracks").filter((b) => b.built);
    for (const b of [...barracks, ...myBuildings("range").filter((x) => x.built)]) {
        if (saving && soldiers >= 6) break;
        if (b.queue.length >= 2) continue;
        if (p.pop >= p.popCap) break;
        const opts = trainable(b);
        if (!opts.length) continue;
        // 뽑을 수 있는 것 중 가장 센 것부터
        const key = opts[opts.length - 1];
        if (!queueUnit(b, key)) queueUnit(b, opts[0]);
    }

    // ---- 방어 ----
    const threat = enemyNearBase(tc);
    if (threat) {
        const guards = R.units.filter((u) =>
            u.alive && u.owner === AI.owner && u.key !== "villager");
        if (guards.length) orderAttack(guards, threat);
        return;
    }

    // ---- 공격 ----
    const ready = idleSoldiers();
    if (AI.attackTimer <= 0 && ready.length >= AI.waveSize) {
        const target = attackTarget(tc);
        if (target) {
            orderMove(ready, target.x, target.z, true);
            AI.wave++;
            AI.waveSize = Math.min(14, 4 + AI.wave);
            AI.attackTimer = Math.max(70, 130 - AI.wave * 6);
        }
    }
}

export { AI };
