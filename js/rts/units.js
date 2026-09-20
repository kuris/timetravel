/**
 * units.js — 유닛의 삶
 *
 * 주민은 모으고 짓고, 병사는 싸우고, 짐승은 달아난다.
 * 명령은 전부 u.order 하나에 담긴다. 상태 기계가 그것만 보고 움직인다.
 *
 *   idle · move · amove(공격이동) · gather · return · build · repair · attack
 *   wander · flee (짐승)
 */
import { AudioSystem } from "../audio.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { accepts, TEAM, UNITS } from "./defs.js";
import { fogAt } from "./fog.js";
import { makeAnimal, makeHpBar, makePerson, makeSelectRing, makeTeamDisc, setHpBar } from "./models.js";
import { addNode, nearestNode, removeNode } from "./nodes.js";
import { R, nextId } from "./state.js";
import { damageBuilding, completeBuilding, popRecount } from "./buildings.js";
import { spawnArrow } from "./combat.js";
import { clamp, dist, disposeObj, formation, isWater } from "./util.js";
import { flashEvent } from "./hud.js";

export const MAP_R = 46;          // 이 바깥으로는 나갈 수 없다
const SEP_R = 0.62;               // 서로 밀어내는 거리

/* ------------------------------------------------------------ 생성 / 소멸 */

export function spawnUnit(key, owner, x, z) {
    const def = UNITS[key];
    const u = {
        id: nextId(), key, def, owner,
        x, z, rot: 0,
        hp: def.hp, maxHp: def.hp,
        alive: true,
        order: { t: "idle" },
        carry: { res: null, amt: 0 },
        home: null,
        cool: 0, work: 0, swing: 0, walkPhase: Math.random() * 6,
        scan: Math.random() * 0.6,
        moving: false,
        lastNode: null
    };

    attachUnitMesh(u);

    R.units.push(u);
    popRecount();
    return u;
}

/** 유닛의 모형을 (다시) 붙인다. 시대가 바뀌어 장면을 다시 지을 때도 쓴다. */
export function attachUnitMesh(u) {
    const def = u.def;
    const g = new THREE.Group();
    const mesh = def.animal ? makeAnimal(def) : makePerson(def, u.owner);
    // 등각 화면에서 사람이 너무 작으면 무엇을 고른 건지 눈이 못 따라간다.
    mesh.scale.setScalar(def.animal ? 1.15 : 1.3);
    g.add(mesh);
    u.mesh = mesh;
    u.load = null;

    if (!def.animal) {
        u.disc = makeTeamDisc(0.4, u.owner);
        g.add(u.disc);
    }
    u.ring = makeSelectRing(0.55, def.animal ? 2 : u.owner);
    g.add(u.ring);

    u.bar = makeHpBar(0.8, def.mounted ? 1.9 : 1.65);
    g.add(u.bar);

    g.position.set(u.x, terrainHeight(u.x, u.z), u.z);
    g.rotation.y = u.rot;
    G.world.add(g);
    u.group = g;
    return g;
}

export function killUnit(u) {
    if (!u.alive) return;
    u.alive = false;

    const i = R.units.indexOf(u);
    if (i >= 0) R.units.splice(i, 1);
    const s = R.selection.indexOf(u);
    if (s >= 0) { R.selection.splice(s, 1); R.dirty.sel = true; }

    if (u.ring) u.ring.visible = false;
    if (u.bar) u.bar.visible = false;

    // 짐승은 쓰러져 고기가 된다
    if (u.def.animal) {
        u.group.rotation.z = Math.PI / 2.2;
        u.group.position.y = terrainHeight(u.x, u.z) + 0.15;
        addNode("food", u.x, u.z, u.def.food, u.group, { radius: 0.8, carcass: true });
    } else {
        R.effects.push({ t: "corpse", group: u.group, life: 1.6, max: 1.6 });
        u.group.rotation.x = -Math.PI / 2.4;
    }

    popRecount();
    R.dirty.res = true;
}

/** 피해를 입힌다. 되받아치는 것도 여기서 정한다. */
export function damageUnit(u, dmg, from) {
    if (!u.alive) return;
    u.hp -= Math.max(1, dmg - (u.def.armor || 0));
    u.bar.visible = true;
    setHpBar(u.bar, u.hp / u.maxHp);

    if (u.hp <= 0) {
        if (u.owner === 0) flashEvent(u.x, u.z, "유닛을 잃었습니다");
        killUnit(u);
        return;
    }

    if (!from) return;

    // 짐승: 사슴은 달아나고 멧돼지는 달려든다
    if (u.def.animal) {
        if (u.def.aggressive) u.order = { t: "attack", target: from, chase: true };
        else u.order = { t: "flee", fx: u.x + (u.x - from.x), fz: u.z + (u.z - from.z), time: 4 };
        return;
    }

    // 병사는 맞으면 반격한다
    if (u.def.atk > 0 && u.key !== "villager" && u.order.t === "idle") {
        u.order = { t: "attack", target: from, chase: true, guard: { x: u.x, z: u.z } };
    }
    if (u.owner === 0 && u.key === "villager" && u.order.t === "idle") {
        flashEvent(u.x, u.z, "주민이 공격받고 있습니다");
    }
}

/* ------------------------------------------------------------------ 명령 */

export function orderStop(units) {
    for (const u of units) {
        if (u.owner !== 0) continue;
        u.order = { t: "idle" };
    }
}

export function orderMove(units, x, z, attackMove = false) {
    const offs = formation(units.length);
    units.forEach((u, i) => {
        const tx = x + offs[i][0], tz = z + offs[i][1];
        u.order = attackMove
            ? { t: "amove", x: tx, z: tz }
            : { t: "move", x: tx, z: tz };
    });
}

export function orderGather(units, node) {
    for (const u of units) {
        if (u.key !== "villager") { u.order = { t: "move", x: node.x, z: node.z }; continue; }
        if (u.carry.amt > 0 && u.carry.res !== node.kind) {
            u.carry.res = null; u.carry.amt = 0;   // 들고 있던 것은 버린다 (AoE 와 같다)
        }
        u.order = { t: "gather", node };
    }
}

export function orderBuild(units, site) {
    for (const u of units) {
        if (u.key !== "villager") continue;
        u.order = { t: "build", site };
    }
}

export function orderRepair(units, b) {
    for (const u of units) {
        if (u.key !== "villager") continue;
        u.order = { t: "repair", b };
    }
}

export function orderAttack(units, target) {
    const hunt = !!(target.def && target.def.animal);
    for (const u of units) {
        if (u.def.atk <= 0) { u.order = { t: "move", x: target.x, z: target.z }; continue; }
        u.order = { t: "attack", target, chase: true, hunt };
    }
}

/* ------------------------------------------------------------------ 이동 */

function blocked(x, z, u) {
    if (Math.hypot(x, z) > MAP_R) return true;
    if (isWater(x, z)) return true;

    for (const b of R.buildings) {
        if (!b.alive) continue;
        if (u.order.site === b || u.order.b === b || u.order.target === b) continue;
        const r = b.def.radius * 0.8;
        if ((b.x - x) ** 2 + (b.z - z) ** 2 < r * r) return true;
    }
    return false;
}

/** 목표 쪽으로 한 걸음. 막히면 옆으로 비껴 간다. */
function stepTo(u, tx, tz, dt, stopDist) {
    const dx = tx - u.x, dz = tz - u.z;
    const d = Math.hypot(dx, dz);
    if (d <= stopDist) { u.moving = false; return true; }

    const sp = u.def.speed;
    const step = Math.min(sp * dt, d);
    const ang = Math.atan2(dx, dz);

    // 정면이 막히면 옆으로, 그래도 막히면 뒤까지 돌아 본다
    for (const off of SIDESTEP) {
        const a = ang + off;
        const nx = u.x + Math.sin(a) * step;
        const nz = u.z + Math.cos(a) * step;
        if (blocked(nx, nz, u)) continue;
        u.x = nx; u.z = nz;
        if (Math.abs(off) < 1.6) u.rot = a;
        u.moving = true;
        u.stuck = 0;
        return false;
    }

    // 어디로도 못 가면 갇힌 것이다. 오래 갇혀 있으면 하던 일을 놓는다.
    u.moving = false;
    u.stuck = (u.stuck || 0) + dt;
    if (u.stuck > 2.5) {
        u.stuck = 0;
        giveUp(u);
    }
    return false;
}

const SIDESTEP = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.4, -2.4, 3.0, -3.0, Math.PI];

/** 갇혔을 때: 캐던 것이면 다른 자원으로, 아니면 그 자리에 선다 */
function giveUp(u) {
    if (u.order.t === "gather" && u.order.node) {
        const other = nearestNode(u.order.node.kind, u.x, u.z, 26, u.order.node);
        u.order = other ? { t: "gather", node: other } : { t: "idle" };
        return;
    }
    if (u.order.t === "return") { u.order = { t: "idle" }; return; }
    u.order = { t: "idle" };
}

/** 서로 겹치지 않게 살짝 밀어낸다 */
function separate(dt) {
    const n = R.units.length;
    for (let i = 0; i < n; i++) {
        const a = R.units[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < n; j++) {
            const b = R.units[j];
            const dx = b.x - a.x, dz = b.z - a.z;
            const d2 = dx * dx + dz * dz;
            if (d2 > SEP_R * SEP_R || d2 < 1e-6) continue;

            const d = Math.sqrt(d2);
            const push = (SEP_R - d) * 0.5;
            const ux = (dx / d) * push, uz = (dz / d) * push;
            if (!blocked(a.x - ux, a.z - uz, a)) { a.x -= ux; a.z -= uz; }
            if (!blocked(b.x + ux, b.z + uz, b)) { b.x += ux; b.z += uz; }
        }
    }
}

/* --------------------------------------------------------------- 찾아보기 */

function targetRadius(t) {
    return t.def.radius !== undefined ? t.def.radius : 0.4;
}

function inRange(u, t) {
    const r = (u.def.range || 0.8) + targetRadius(t);
    return dist(u.x, u.z, t.x, t.z) <= r;
}

/** 자원을 내려놓을 가장 가까운 건물 */
export function nearestDropoff(owner, res, x, z) {
    let best = null, bd = 1e9;
    for (const b of R.buildings) {
        if (!b.alive || b.owner !== owner || !b.built) continue;
        if (!accepts(b, res)) continue;
        const d = (b.x - x) ** 2 + (b.z - z) ** 2;
        if (d < bd) { bd = d; best = b; }
    }
    return best;
}

/** 가까운 적 (유닛 우선, 없으면 건물) */
export function findEnemy(u, radius) {
    const r2 = radius * radius;
    let best = null, bd = r2;

    for (const o of R.units) {
        if (!o.alive || o.owner === u.owner) continue;
        if (o.owner === 2 && u.owner !== 2) continue;  // 짐승은 먼저 건드리지 않는다
        const d = (o.x - u.x) ** 2 + (o.z - u.z) ** 2;
        if (d < bd) { bd = d; best = o; }
    }
    if (best) return best;

    for (const b of R.buildings) {
        if (!b.alive || b.owner === u.owner || b.owner === 2) continue;
        const d = (b.x - u.x) ** 2 + (b.z - u.z) ** 2;
        if (d < bd) { bd = d; best = b; }
    }
    return best;
}

/* ------------------------------------------------------------------ 갱신 */

export function updateUnits(dt, t) {
    for (let i = R.units.length - 1; i >= 0; i--) {
        const u = R.units[i];
        if (!u.alive) continue;
        u.cool = Math.max(0, u.cool - dt);
        u.moving = false;

        if (u.def.animal) updateAnimal(u, dt);
        else updateOrder(u, dt);
    }

    separate(dt);

    // 모형 갱신
    for (const u of R.units) {
        if (!u.alive) continue;
        const g = u.group;
        g.position.set(u.x, terrainHeight(u.x, u.z), u.z);

        // 진행 방향으로 부드럽게 돈다
        let diff = u.rot - g.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        g.rotation.y += diff * Math.min(1, dt * 9);

        animate(u, dt, t);

        // 적은 보일 때만 보인다
        if (u.owner !== 0) g.visible = fogAt(u.x, u.z) === 2;

        if (u.bar.visible) {
            u.bar.quaternion.copy(G.camera.quaternion);
            if (u.hp >= u.maxHp && !R.selection.includes(u)) u.bar.visible = false;
        }
    }

    // 쓰러진 것들
    for (let i = R.effects.length - 1; i >= 0; i--) {
        const e = R.effects[i];
        e.life -= dt;
        if (e.t === "corpse") {
            const k = e.life / e.max;
            e.group.position.y = terrainHeight(e.group.position.x, e.group.position.z) - (1 - k) * 0.5;
        }
        if (e.life <= 0) {
            disposeObj(e.group);
            R.effects.splice(i, 1);
        }
    }
}

function updateOrder(u, dt) {
    const o = u.order;

    switch (o.t) {
        case "idle": {
            // 병사는 곁에 적이 오면 스스로 친다
            if (u.def.atk > 0 && u.key !== "villager") {
                u.scan -= dt;
                if (u.scan <= 0) {
                    u.scan = 0.5;
                    const e = findEnemy(u, (u.def.los || 7) * 0.85);
                    if (e) u.order = { t: "attack", target: e, chase: true, guard: { x: u.x, z: u.z } };
                }
            }
            break;
        }

        case "move": {
            if (stepTo(u, o.x, o.z, dt, 0.25)) u.order = { t: "idle" };
            break;
        }

        case "amove": {
            u.scan -= dt;
            if (u.scan <= 0) {
                u.scan = 0.4;
                const e = findEnemy(u, u.def.los || 7);
                if (e) {
                    u.order = { t: "attack", target: e, chase: true, amove: { x: o.x, z: o.z } };
                    break;
                }
            }
            if (stepTo(u, o.x, o.z, dt, 0.35)) u.order = { t: "idle" };
            break;
        }

        case "gather": {
            let node = o.node;
            if (!node || !node.alive) {
                node = nearestNode(node ? node.kind : "wood", u.x, u.z);
                if (!node) { u.order = { t: "idle" }; break; }
                o.node = node;
            }

            if (u.carry.amt >= u.def.carry) {
                u.order = { t: "return", node, res: u.carry.res };
                break;
            }

            if (!stepTo(u, node.x, node.z, dt, node.radius + 0.75)) break;

            // 캔다
            u.rot = Math.atan2(node.x - u.x, node.z - u.z);
            u.work += dt;
            const take = Math.min(u.def.gather * dt, node.amount,
                u.def.carry - u.carry.amt);
            node.amount -= take;
            u.carry.res = node.kind;
            u.carry.amt += take;

            if (u.owner === 0 && u.work > 0.9) {
                u.work = 0;
                if (node.kind === "wood" || node.kind === "stone") AudioSystem.playHammer();
            }

            if (node.amount <= 0.01) {
                const kind = node.kind;
                if (node.farm) {
                    node.farm.hp = 0;    // 다 거둔 농장은 사라진다
                    damageBuilding(node.farm, 9999, null);
                } else {
                    removeNode(node, { stump: kind === "wood" });
                }
                const next = nearestNode(kind, u.x, u.z);
                u.order = u.carry.amt > 0
                    ? { t: "return", node: next, res: kind }
                    : (next ? { t: "gather", node: next } : { t: "idle" });
            }
            break;
        }

        case "return": {
            const res = o.res || u.carry.res;
            if (!res || u.carry.amt <= 0) {
                u.order = o.node && o.node.alive ? { t: "gather", node: o.node } : { t: "idle" };
                break;
            }

            let b = o.b;
            if (!b || !b.alive || !b.built) {
                b = nearestDropoff(u.owner, res, u.x, u.z);
                if (!b) { u.order = { t: "idle" }; break; }
                o.b = b;
            }

            if (!stepTo(u, b.x, b.z, dt, b.def.radius + 0.7)) break;

            R.players[u.owner].res[res] += Math.floor(u.carry.amt);
            u.carry.amt = 0;
            u.carry.res = null;
            if (u.owner === 0) { R.dirty.res = true; AudioSystem.playPickup(); }

            const node = (o.node && o.node.alive) ? o.node : nearestNode(res, u.x, u.z);
            u.order = node ? { t: "gather", node } : { t: "idle" };
            break;
        }

        case "build": {
            const s = o.site;
            if (!s || !s.alive) { u.order = { t: "idle" }; break; }
            if (s.built) {
                // 농장을 지었으면 바로 거둔다
                if (s.def.farm && s.node) u.order = { t: "gather", node: s.node };
                else u.order = { t: "idle" };
                break;
            }
            if (!stepTo(u, s.x, s.z, dt, s.def.radius + 0.7)) break;

            u.rot = Math.atan2(s.x - u.x, s.z - u.z);
            u.work += dt;
            s.work += dt * (u.def.build || 1);
            if (u.owner === 0 && u.work > 0.55) { u.work = 0; AudioSystem.playHammer(); }

            if (s.work >= s.def.time) completeBuilding(s);
            break;
        }

        case "repair": {
            const b = o.b;
            if (!b || !b.alive || b.hp >= b.maxHp) { u.order = { t: "idle" }; break; }
            if (!stepTo(u, b.x, b.z, dt, b.def.radius + 0.7)) break;
            u.rot = Math.atan2(b.x - u.x, b.z - u.z);
            u.work += dt;
            b.hp = Math.min(b.maxHp, b.hp + dt * 12);
            if (u.owner === 0 && u.work > 0.55) { u.work = 0; AudioSystem.playHammer(); }
            break;
        }

        case "attack": {
            const t = o.target;
            if (!t || !t.alive) {
                // 사냥이었다면 쓰러진 자리의 고기를 거둔다
                if (o.hunt && t) {
                    const meat = nearestNode("food", t.x, t.z, 4);
                    if (meat) { u.order = { t: "gather", node: meat }; break; }
                }
                if (o.amove) { u.order = { t: "amove", x: o.amove.x, z: o.amove.z }; break; }
                const e = findEnemy(u, (u.def.los || 7) * 0.9);
                u.order = e ? { t: "attack", target: e, chase: true, guard: o.guard }
                    : (o.guard ? { t: "move", x: o.guard.x, z: o.guard.z } : { t: "idle" });
                break;
            }

            if (!inRange(u, t)) {
                if (!o.chase) { u.order = { t: "idle" }; break; }
                stepTo(u, t.x, t.z, dt, (u.def.range || 0.8) + targetRadius(t) - 0.1);
                break;
            }

            u.rot = Math.atan2(t.x - u.x, t.z - u.z);
            if (u.cool <= 0) {
                u.cool = u.def.rate || 1.5;
                u.swing = 0.42;
                if ((u.def.range || 0) >= 2) {
                    spawnArrow(u, t);
                } else {
                    applyHit(u, t);
                }
            }
            break;
        }

        case "flee": {
            o.time -= dt;
            if (o.time <= 0) { u.order = { t: "wander", wait: 1 }; break; }
            stepTo(u, o.fx, o.fz, dt, 0.4);
            break;
        }
    }
}

/** 명중 — 대상이 유닛이든 건물이든 같은 자리로 모은다 */
export function applyHit(attacker, target) {
    const atk = attacker.def ? attacker.def.atk : attacker.atk;
    if (target.def && target.def.hp !== undefined && target.built !== undefined) {
        damageBuilding(target, atk, attacker);
    } else {
        damageUnit(target, atk, attacker);
    }
    if (attacker.owner === 0 || target.owner === 0) {
        AudioSystem.noiseBurst(0.06, 0.05, "bandpass", 1400);
    }
}

/* ------------------------------------------------------------------ 짐승 */

function updateAnimal(u, dt) {
    const o = u.order;

    if (o.t === "attack") {
        const t = o.target;
        if (!t || !t.alive) { u.order = { t: "wander", wait: 0.5 }; return; }
        if (!inRange(u, t)) { stepTo(u, t.x, t.z, dt, 0.7); return; }
        u.rot = Math.atan2(t.x - u.x, t.z - u.z);
        if (u.cool <= 0) {
            u.cool = u.def.rate || 1.4;
            u.swing = 0.4;
            applyHit(u, t);
        }
        return;
    }

    if (o.t === "flee") {
        o.time -= dt;
        if (o.time <= 0) u.order = { t: "wander", wait: 1 };
        else stepTo(u, o.fx, o.fz, dt, 0.4);
        return;
    }

    // 어슬렁거린다
    if (o.t !== "wander") { u.order = { t: "wander", wait: Math.random() * 3 }; return; }
    if (o.x === undefined || o.wait > 0) {
        o.wait -= dt;
        if (o.wait > 0) return;
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 5;
        o.x = clamp(u.x + Math.cos(a) * r, -MAP_R + 2, MAP_R - 2);
        o.z = clamp(u.z + Math.sin(a) * r, -MAP_R + 2, MAP_R - 2);
        if (isWater(o.x, o.z)) { o.x = u.x; o.z = u.z; }
        return;
    }
    if (stepTo(u, o.x, o.z, dt, 0.3)) u.order = { t: "wander", wait: 2 + Math.random() * 4 };
}

/* ---------------------------------------------------------------- 동작 */

function animate(u, dt, t) {
    const d = u.mesh.userData;
    if (!d) return;

    u.swing = Math.max(0, u.swing - dt);
    const working = u.order.t === "gather" || u.order.t === "build" || u.order.t === "repair";

    if (u.def.animal) {
        const move = u.moving ? 1 : 0;
        d.walk += dt * (move ? 11 : 0.6);
        const a = Math.sin(d.walk) * 0.5 * move;
        d.legs[0].rotation.x = a; d.legs[3].rotation.x = a;
        d.legs[1].rotation.x = -a; d.legs[2].rotation.x = -a;
        d.head.position.y = (u.def.key === "boar" ? 0.04 : 0.18)
            + (move ? 0 : Math.sin(t * 1.4 + u.id) * 0.06);
        return;
    }

    d.walk += dt * (u.moving ? 9 : 1.2);
    const move = u.moving ? 1 : 0;
    const swing = Math.sin(d.walk) * 0.62 * move;

    if (d.legL) { d.legL.rotation.x = swing; d.legR.rotation.x = -swing; }
    d.body.position.y = (u.def.mounted ? 0.78 : 0.30)
        + Math.abs(Math.sin(d.walk)) * 0.035 * move;

    if (u.swing > 0) {
        // 내려치는 동작
        const k = 1 - u.swing / 0.42;
        d.armR.rotation.x = -2.0 + k * 2.6;
        d.armL.rotation.x = -0.4;
        d.body.rotation.x = 0.16 * Math.sin(k * Math.PI);
    } else if (working) {
        const k = Math.sin(t * 7 + u.id);
        d.armR.rotation.x = -0.9 + k * 0.8;
        d.armL.rotation.x = -0.6 + k * 0.5;
        d.body.rotation.x = 0.14 + k * 0.08;
    } else {
        d.armR.rotation.x = -swing * 0.6;
        d.armL.rotation.x = swing * 0.6;
        d.body.rotation.x = 0;
    }

    // 짐을 진 주민은 등에 자원이 보인다 (AoE 의 "나르는 모습")
    if (u.key === "villager") {
        if (u.carry.amt > 0.5 && !u.load) {
            u.load = new THREE.Mesh(
                new THREE.BoxGeometry(0.28, 0.24, 0.2),
                new THREE.MeshStandardMaterial({
                    color: u.carry.res === "wood" ? 0x6b4a2c
                        : u.carry.res === "food" ? 0x8a6a3a
                            : u.carry.res === "stone" ? 0x8d8579 : 0xd8a93c,
                    roughness: 1, flatShading: true
                })
            );
            u.load.position.set(0, 0.62, -0.22);
            u.mesh.add(u.load);
        } else if (u.carry.amt <= 0.5 && u.load) {
            u.mesh.remove(u.load);
            u.load.geometry.dispose();
            u.load.material.dispose();
            u.load = null;
        }
    }
}

/** 선택 고리 표시 */
export function refreshRings() {
    for (const u of R.units) {
        if (!u.ring) continue;
        const on = R.selection.includes(u);
        u.ring.visible = on;
        if (on) { u.bar.visible = true; setHpBar(u.bar, u.hp / u.maxHp); }
    }
    for (const b of R.buildings) {
        if (!b.ring) continue;
        const on = R.selection.includes(b);
        b.ring.visible = on;
        if (on) { b.bar.visible = true; setHpBar(b.bar, b.hp / b.maxHp); }
    }
}
