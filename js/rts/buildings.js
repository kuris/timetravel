/**
 * buildings.js — 건물
 *
 * 놓고 · 짓고 · 뽑고 · 무너진다.
 * 건물은 시대가 오르면 같은 자리에서 그 시대의 모습으로 다시 선다 (age.js).
 */
import { AudioSystem } from "../audio.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { AGE_UP, AGE_UP_TIME, BUILDINGS, POP_MAX, TEAM, UNITS, buildingMesh } from "./defs.js";
import { fogAt } from "./fog.js";
import {
    addTeamFlag, makeHpBar, makeNameTag, makeRubble, makeSelectRing, makeTeamDisc, setHpBar
} from "./models.js";
import { addNode, removeNode } from "./nodes.js";
import { R, nextId } from "./state.js";
import { spawnUnit, applyHit, findEnemy, MAP_R } from "./units.js";
import { spawnArrow } from "./combat.js";
import { disposeObj, dist, isWater } from "./util.js";
import { flashEvent, logMessage } from "./hud.js";
import { applyAge } from "./age.js";

/* ------------------------------------------------------------------ 배치 */

/** 여기에 지을 수 있는가 */
export function canPlace(type, x, z, owner = 0) {
    const def = BUILDINGS[type];
    if (!def) return false;
    if (Math.hypot(x, z) > MAP_R - 1) return false;

    const r = def.radius;
    // 물 위에는 못 짓는다. 가장자리까지 본다.
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        if (isWater(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false;
    }
    if (isWater(x, z)) return false;

    // 본 적 없는 땅에는 못 짓는다 (AoE 와 같다)
    if (owner === 0 && fogAt(x, z) === 0) return false;

    for (const b of R.buildings) {
        if (!b.alive) continue;
        if (dist(x, z, b.x, b.z) < r + b.def.radius + 0.35) return false;
    }
    for (const n of R.nodes) {
        if (!n.alive) continue;
        if (dist(x, z, n.x, n.z) < r + n.radius + 0.2) return false;
    }
    for (const u of R.units) {
        if (!u.alive || u.owner === owner) continue;
        if (dist(x, z, u.x, u.z) < r + 0.4) return false;
    }
    return true;
}

/** 비용을 낼 수 있는가 */
export function canAfford(cost, owner = 0) {
    const res = R.players[owner].res;
    for (const k in cost) if ((res[k] || 0) < cost[k]) return false;
    return true;
}

export function pay(cost, owner = 0) {
    const res = R.players[owner].res;
    for (const k in cost) res[k] -= cost[k];
    if (owner === 0) R.dirty.res = true;
}

export function refund(cost, owner = 0) {
    const res = R.players[owner].res;
    for (const k in cost) res[k] += cost[k];
    if (owner === 0) R.dirty.res = true;
}

/**
 * 건물을 놓는다.
 * instant 면 다 지어진 채로 선다 (판을 시작할 때의 마을회관).
 */
export function placeBuilding(type, owner, x, z, rot = 0, instant = false) {
    const def = BUILDINGS[type];
    const b = {
        id: nextId(), type, def, owner, x, z, rot,
        hp: instant ? def.hp : Math.max(1, Math.floor(def.hp * 0.15)),
        maxHp: def.hp,
        built: instant, work: instant ? def.time : 0,
        queue: [], trainLeft: 0,
        rally: null, alive: true,
        cool: 0, scan: Math.random(),
        node: null, smoke: null
    };

    buildMeshFor(b);
    R.buildings.push(b);

    if (instant) completeBuilding(b, true);
    else if (owner === 0) AudioSystem.playBuildStart();

    popRecount();
    return b;
}

/** 이 건물의 모형을 (다시) 만든다. 시대가 오를 때도 여기를 쓴다. */
export function buildMeshFor(b) {
    if (b.group) disposeObj(b.group);

    const age = R.players[b.owner] ? R.players[b.owner].age : R.age;
    const g = buildingMesh(b.type, age, b.x, b.z, b.rot);
    b.group = g;

    // 농장은 납작해서 더 안 보인다 — 깃발 없이 이름표만 세운다
    if (b.type === "farm") {
        b.tag = makeNameTag(b.def.glyph, b.owner, 1.15, 0.72);
        b.tag.userData.baseY = b.tag.position.y;
        g.add(b.tag);
    }

    // 진영 색: 발밑 원판 + 깃발 + 지붕 위 이름표
    if (b.type !== "wall" && b.type !== "farm") {
        const disc = makeTeamDisc(b.def.radius * 0.95, b.owner);
        disc.position.y = 0.035;
        g.add(disc);
        addTeamFlag(g, b.owner, b.def.radius * 0.72, 0, -b.def.radius * 0.5,
            b.type === "towncenter" ? 3.0 : 2.1);

        b.tag = makeNameTag(b.def.glyph, b.owner,
            b.def.radius * 1.6 + 0.7, b.type === "towncenter" ? 1.15 : 0.9);
        b.tag.userData.baseY = b.tag.position.y;
        g.add(b.tag);
    }

    b.ring = makeSelectRing(b.def.radius + 0.25, b.owner);
    g.add(b.ring);

    b.bar = makeHpBar(b.def.radius * 1.4, b.def.radius * 1.6 + 1.2);
    b.bar.userData.baseY = b.bar.position.y;
    g.add(b.bar);

    g.scale.y = b.built ? 1 : 0.08 + 0.92 * Math.min(1, b.work / b.def.time);
    unsquash(b);
    return g;
}

export function completeBuilding(b, silent = false) {
    if (b.built) return;
    b.built = true;
    b.work = b.def.time;
    b.hp = b.maxHp;
    b.group.scale.y = 1;
    unsquash(b);

    if (b.def.farm) {
        b.node = addNode("food", b.x, b.z, b.def.farm, null,
            { radius: b.def.radius * 0.6, farm: b });
    }

    popRecount();
    if (!silent && b.owner === 0) {
        AudioSystem.playBuildDone();
        logMessage(`${b.def.name}이(가) 세워졌습니다.`);
    }
    R.dirty.cmd = true;
}

/* ------------------------------------------------------------------ 피해 */

export function damageBuilding(b, dmg, from) {
    if (!b.alive) return;
    b.hp -= Math.max(1, dmg - (b.def.armor || 0));
    b.bar.visible = true;
    setHpBar(b.bar, Math.max(0, b.hp) / b.maxHp);

    if (b.owner === 0 && from && (!b.warned || R.time - b.warned > 12)) {
        b.warned = R.time;
        flashEvent(b.x, b.z, `${b.def.name}이(가) 공격받고 있습니다`);
    }
    if (b.hp <= 0) destroyBuilding(b);
}

export function destroyBuilding(b) {
    if (!b.alive) return;
    b.alive = false;

    const i = R.buildings.indexOf(b);
    if (i >= 0) R.buildings.splice(i, 1);
    const s = R.selection.indexOf(b);
    if (s >= 0) { R.selection.splice(s, 1); R.dirty.sel = true; }

    if (b.node) removeNode(b.node);
    disposeObj(b.group);

    const rub = makeRubble(b.x, b.z, b.def.radius);
    G.world.add(rub);
    R.effects.push({ t: "rubble", group: rub, life: 999, max: 999 });

    // 큐에 걸린 값은 돌려준다
    for (const q of b.queue) refund(UNITS[q.key].cost, b.owner);
    b.queue.length = 0;

    if (b.owner === 0) {
        AudioSystem.noiseBurst(0.5, 0.16, "lowpass", 300);
        logMessage(`${b.def.name}이(가) 무너졌습니다.`);
    }
    popRecount();
    R.dirty.cmd = true;
}

/* ------------------------------------------------------------------ 인구 */

export function popRecount() {
    for (let o = 0; o < 2; o++) {
        let pop = 0, cap = 0;
        for (const u of R.units) if (u.alive && u.owner === o) pop += u.def.pop || 0;
        for (const b of R.buildings) {
            if (b.alive && b.built && b.owner === o) cap += b.def.pop || 0;
        }
        R.players[o].pop = pop;
        R.players[o].popCap = Math.min(POP_MAX, cap);
    }
    R.dirty.res = true;
}

/* ---------------------------------------------------------------- 생산 */

export function queueUnit(b, key) {
    const def = UNITS[key];
    const p = R.players[b.owner];
    if (!def || !b.built) return false;
    if ((def.age || 0) > p.age) {
        if (b.owner === 0) logMessage("아직 그 시대가 아닙니다.");
        return false;
    }
    if (p.pop + (def.pop || 0) > p.popCap && b.queue.length === 0) {
        if (b.owner === 0) logMessage("인구가 찼습니다. 집을 지으세요.");
        return false;
    }
    if (!canAfford(def.cost, b.owner)) {
        if (b.owner === 0) logMessage("자원이 모자랍니다.");
        return false;
    }
    if (b.queue.length >= 8) return false;

    pay(def.cost, b.owner);
    b.queue.push({ key, left: def.time });
    if (b.queue.length === 1) b.trainLeft = def.time;
    R.dirty.cmd = true;
    return true;
}

export function cancelQueue(b, index = -1) {
    if (!b.queue.length) return;
    const i = index < 0 ? b.queue.length - 1 : index;
    const q = b.queue.splice(i, 1)[0];
    if (q) refund(UNITS[q.key].cost, b.owner);
    if (i === 0 && b.queue.length) b.trainLeft = UNITS[b.queue[0].key].time;
    R.dirty.cmd = true;
}

/** 새 유닛이 나올 자리 */
function spawnSpot(b) {
    const r = b.def.radius + 0.9;
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + b.rot;
        const x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
        if (!isWater(x, z) && Math.hypot(x, z) < MAP_R) return [x, z];
    }
    return [b.x + r, b.z];
}

/* ---------------------------------------------------------------- 시대 */

export function canAgeUp(owner) {
    const p = R.players[owner];
    if (p.age >= 5 || p.ageUp) return false;
    // 지금 시대의 건물이 둘 이상 (AoE 의 승급 조건)
    let n = 0;
    for (const b of R.buildings) if (b.alive && b.built && b.owner === owner) n++;
    return n >= 3 && canAfford(AGE_UP[p.age], owner);
}

export function startAgeUp(b) {
    const p = R.players[b.owner];
    if (p.ageUp || p.age >= 5) return false;

    let n = 0;
    for (const x of R.buildings) if (x.alive && x.built && x.owner === b.owner) n++;
    if (n < 3) {
        if (b.owner === 0) logMessage("건물이 셋 이상 있어야 시대를 열 수 있습니다.");
        return false;
    }
    if (!canAfford(AGE_UP[p.age], b.owner)) {
        if (b.owner === 0) logMessage("시대를 열 자원이 모자랍니다.");
        return false;
    }

    pay(AGE_UP[p.age], b.owner);
    p.ageUp = { left: AGE_UP_TIME, total: AGE_UP_TIME, b };
    if (b.owner === 0) {
        logMessage("시대 발전을 시작했습니다.");
        AudioSystem.playGateAwaken && AudioSystem.playGateAwaken();
    }
    R.dirty.cmd = true;
    return true;
}

/* ------------------------------------------------------------------ 갱신 */

/**
 * 짓는 동안 건물은 y 로 눌린 채 자란다.
 * 그 안에 든 이름표와 체력 막대까지 같이 눌리면 납작한 글자가 된다 — 되돌려 준다.
 */
function unsquash(b) {
    const k = b.group ? b.group.scale.y || 1 : 1;
    for (const o of [b.tag, b.bar]) {
        if (!o || o.userData.baseY === undefined) continue;
        o.scale.y = 1 / k;
        o.position.y = o.userData.baseY / k;
    }
}

export function updateBuildings(dt) {
    for (let i = R.buildings.length - 1; i >= 0; i--) {
        const b = R.buildings[i];
        if (!b.alive) continue;

        // 짓는 중
        if (!b.built) {
            const k = Math.min(1, b.work / b.def.time);
            b.group.scale.y = 0.08 + 0.92 * k;
            unsquash(b);
            b.hp = Math.max(1, Math.floor(b.maxHp * (0.15 + 0.85 * k)));
            b.bar.visible = true;
            setHpBar(b.bar, k);
        } else if (b.bar.visible) {
            if (b.hp >= b.maxHp && !R.selection.includes(b)) b.bar.visible = false;
            else setHpBar(b.bar, Math.max(0, b.hp) / b.maxHp);
        }

        if (b.bar.visible) b.bar.quaternion.copy(G.camera.quaternion);

        // 적 건물은 한 번 본 자리면 기억한다
        if (b.owner !== 0) b.group.visible = fogAt(b.x, b.z) > 0;

        // 생산
        if (b.built && b.queue.length) {
            const p = R.players[b.owner];
            const q = b.queue[0];
            const def = UNITS[q.key];

            if (p.pop + (def.pop || 0) <= p.popCap) {
                b.trainLeft -= dt;
                if (b.trainLeft <= 0) {
                    const [sx, sz] = spawnSpot(b);
                    const u = spawnUnit(q.key, b.owner, sx, sz);
                    if (b.rally) {
                        u.order = { t: "move", x: b.rally.x, z: b.rally.z };
                    }
                    b.queue.shift();
                    b.trainLeft = b.queue.length ? UNITS[b.queue[0].key].time : 0;
                    if (b.owner === 0) {
                        R.dirty.cmd = true;
                        AudioSystem.tone(520, 0.08, "triangle", 0.05);
                    }
                }
                if (b.owner === 0) R.dirty.cmd = true;
            }
        }

        // 망루는 스스로 쏜다
        if (b.built && b.def.atk) {
            b.cool = Math.max(0, b.cool - dt);
            b.scan -= dt;
            if (b.scan <= 0) {
                b.scan = 0.4;
                b.target = findEnemy({ x: b.x, z: b.z, owner: b.owner, def: b.def },
                    b.def.range);
            }
            const t = b.target;
            if (t && t.alive && dist(b.x, b.z, t.x, t.z) <= b.def.range && b.cool <= 0) {
                b.cool = b.def.rate || 2;
                spawnArrow(b, t, b.def.radius * 1.4 + 1.6);
            }
        }

        // 부서진 건물은 연기가 난다
        if (b.built && b.hp < b.maxHp * 0.4 && !b.smoke) {
            b.smoke = true;
        }
    }

    // 시대 발전 진행
    for (let o = 0; o < 2; o++) {
        const p = R.players[o];
        if (!p.ageUp) continue;
        if (!p.ageUp.b.alive) { p.ageUp = null; continue; }

        p.ageUp.left -= dt;
        if (o === 0) R.dirty.cmd = true;
        if (p.ageUp.left <= 0) {
            p.ageUp = null;
            p.age = Math.min(5, p.age + 1);
            applyAge(o);
        }
    }
}

/** 지금 이 건물에서 뽑을 수 있는 유닛 목록 */
export function trainable(b) {
    if (!b.def.trains) return [];
    const p = R.players[b.owner];
    return b.def.trains.filter((k) => (UNITS[k].age || 0) <= p.age);
}

/** 이 진영이 지을 수 있는 건물 목록 */
export function buildable(owner) {
    const p = R.players[owner];
    return Object.keys(BUILDINGS).filter((k) => (BUILDINGS[k].age || 0) <= p.age);
}
