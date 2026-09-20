/**
 * control.js — 마우스와 키보드
 *
 * Age of Empires 의 조작을 그대로 따른다.
 *   왼쪽 클릭      고르기 (끌면 상자 선택, 두 번 누르면 같은 종류 전부)
 *   오른쪽 클릭    상황에 맞는 명령 (가면 · 캐면 · 치면 · 지으면)
 *   화면 가장자리  시점 이동, 방향키도 같다
 *   숫자키         부대 지정 (Ctrl + 숫자로 묶는다)
 *   Q W E R T Y / A S D F G H  — 아래 명령 칸의 단축키
 */
import { AudioSystem } from "../audio.js";
import { G, keys } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { AGE_UP, BUILDINGS, UNITS } from "./defs.js";
import {
    canAfford, canPlace, cancelQueue, placeBuilding, queueUnit,
    startAgeUp, trainable
} from "./buildings.js";
import { makeBasicMat } from "../build.js";
import {
    hotkeyIndex, hudEl, logMessage, minimapToWorld, runCommand,
    setCommands, setSelRect, showBig
} from "./hud.js";
import { CAM, centerCamera, panCamera } from "./rtscam.js";
import { R } from "./state.js";
import {
    MAP_R, killUnit, orderAttack, orderBuild, orderGather, orderMove,
    orderRepair, orderStop, refreshRings
} from "./units.js";
import { disposeObj, screenToWorld, worldToScreen } from "./util.js";

const PICK_PX = 26;
let drag = null;              // { x0, y0, x, y, moved }
let lastClick = { t: 0, id: 0 };
let miniDrag = false;

/* ------------------------------------------------------------------ 고르기 */

/** 화면의 한 점에서 무엇을 집었는지 */
function pickAt(px, py, opts = {}) {
    let best = null, bd = PICK_PX * PICK_PX;

    const test = (e, y, bonus) => {
        const s = worldToScreen(e.x, terrainHeight(e.x, e.z) + y, e.z);
        const d = (s.x - px) ** 2 + (s.y - py) ** 2;
        if (d < bd * bonus) { bd = d / bonus; best = e; }
    };

    for (const u of R.units) {
        if (!u.alive) continue;
        if (u.owner !== 0 && u.group && !u.group.visible) continue;
        test(u, 0.6, u.owner === 0 ? 1.6 : 1);
    }
    if (best) return best;

    let bb = null, bbd = 1e9;
    for (const b of R.buildings) {
        if (!b.alive) continue;
        if (b.owner !== 0 && b.group && !b.group.visible) continue;
        const s = worldToScreen(b.x, terrainHeight(b.x, b.z) + 0.8, b.z);
        const r = 26 + b.def.radius * 12;
        const d = Math.hypot(s.x - px, s.y - py);
        if (d < r && d < bbd) { bbd = d; bb = b; }
    }
    if (bb) return bb;

    if (opts.nodes !== false) {
        let bn = null, bnd = 30;
        for (const n of R.nodes) {
            if (!n.alive) continue;
            const s = worldToScreen(n.x, terrainHeight(n.x, n.z) + 0.5, n.z);
            const d = Math.hypot(s.x - px, s.y - py);
            if (d < bnd) { bnd = d; bn = n; }
        }
        if (bn) return bn;
    }
    return null;
}

function isUnit(e) { return e && e.def && e.def.hp !== undefined && e.queue === undefined && !e.kind; }
function isBuilding(e) { return e && e.queue !== undefined; }
function isNode(e) { return e && e.kind !== undefined; }

export function select(list, add = false) {
    if (!add) R.selection.length = 0;
    for (const e of list) {
        if (!R.selection.includes(e)) R.selection.push(e);
    }
    if (R.selection.length > 40) R.selection.length = 40;
    R.cmdPage = "root";
    R.dirty.sel = true;
    R.dirty.cmd = true;
    refreshRings();
}

/** 상자 안의 내 유닛을 고른다 */
function boxSelect(x1, y1, x2, y2, add) {
    const lo = { x: Math.min(x1, x2), y: Math.min(y1, y2) };
    const hi = { x: Math.max(x1, x2), y: Math.max(y1, y2) };
    const got = [];

    for (const u of R.units) {
        if (!u.alive || u.owner !== 0) continue;
        const s = worldToScreen(u.x, terrainHeight(u.x, u.z) + 0.6, u.z);
        if (s.x >= lo.x && s.x <= hi.x && s.y >= lo.y && s.y <= hi.y) got.push(u);
    }

    // 병사가 하나라도 있으면 주민은 빼고 고른다 (AoE 와 같다)
    const soldiers = got.filter((u) => u.key !== "villager");
    select(soldiers.length ? soldiers : got, add);
}

/* ------------------------------------------------------------------ 명령 */

function commandAt(px, py, shift) {
    const own = R.selection.filter((e) => e.owner === 0);
    if (!own.length) return;

    // 건물 하나만 골랐다면 집결점을 찍는 것이다
    if (own.length === 1 && isBuilding(own[0])) {
        const p = screenToWorld(px, py);
        if (!p) return;
        own[0].rally = { x: p.x, z: p.z };
        logMessage("집결점을 정했습니다.");
        return;
    }

    const units = own.filter(isUnit);
    if (!units.length) return;

    const target = pickAt(px, py);

    if (target && target !== units[0]) {
        if (isNode(target)) {
            orderGather(units.filter((u) => u.key === "villager"), target);
            const rest = units.filter((u) => u.key !== "villager");
            if (rest.length) orderMove(rest, target.x, target.z);
            ping(target.x, target.z);
            return;
        }
        if ((isUnit(target) || isBuilding(target)) && target.owner !== 0) {
            orderAttack(units, target);
            ping(target.x, target.z);
            return;
        }
        if (isBuilding(target) && target.owner === 0) {
            const villagers = units.filter((u) => u.key === "villager");
            if (!target.built && villagers.length) orderBuild(villagers, target);
            else if (target.hp < target.maxHp && villagers.length) orderRepair(villagers, target);
            else orderMove(units, target.x, target.z);
            ping(target.x, target.z);
            return;
        }
    }

    const p = screenToWorld(px, py);
    if (!p) return;
    orderMove(units, p.x, p.z, R.attackMove);
    R.attackMove = false;
    ping(p.x, p.z);
}

/** 명령을 내린 자리에 잠깐 표시가 남는다 */
function ping(x, z) {
    const m = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.45, 16),
        makeBasicMat(R.attackMove ? 0xd8563c : 0x9fe08a, {
            transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, fog: false
        })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, terrainHeight(x, z) + 0.06, z);
    G.world.add(m);
    R.effects.push({ t: "ping", group: m, life: 0.5, max: 0.5 });
    AudioSystem.tone(660, 0.05, "triangle", 0.03);
}

/* ------------------------------------------------------------------ 배치 */

export function startPlacing(type) {
    const def = BUILDINGS[type];
    if (!canAfford(def.cost, 0)) { logMessage("자원이 모자랍니다."); return; }
    cancelPlacing();
    R.placing = { type };
    R.cmdPage = "root";

    const g = new THREE.Group();
    const disc = new THREE.Mesh(
        new THREE.CircleGeometry(def.radius, 18),
        makeBasicMat(0x5fbf5a, {
            transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, fog: false
        })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.05;
    g.add(disc);

    const box = new THREE.Mesh(
        new THREE.BoxGeometry(def.radius * 1.6, 1.4, def.radius * 1.6),
        makeBasicMat(0x9fe08a, {
            transparent: true, opacity: 0.22, depthWrite: false, fog: false
        })
    );
    box.position.y = 0.7;
    g.add(box);

    G.world.add(g);
    R.ghost = { group: g, disc, box };
    R.dirty.cmd = true;
}

export function cancelPlacing() {
    if (R.ghost) disposeObj(R.ghost.group);
    R.ghost = null;
    R.placing = null;
    R.dirty.cmd = true;
}

export function updateGhost() {
    if (!R.placing || !R.ghost) return;
    const p = screenToWorld(CAM.mouseX, CAM.mouseY);
    if (!p) return;

    R.placing.x = p.x;
    R.placing.z = p.z;
    R.placeOk = canPlace(R.placing.type, p.x, p.z, 0)
        && canAfford(BUILDINGS[R.placing.type].cost, 0);

    R.ghost.group.position.set(p.x, terrainHeight(p.x, p.z), p.z);
    const col = R.placeOk ? 0x5fbf5a : 0xc2452f;
    R.ghost.disc.material.color.setHex(col);
    R.ghost.box.material.color.setHex(col);
}

function tryPlace() {
    if (!R.placing || !R.placeOk) {
        AudioSystem.tone(180, 0.09, "square", 0.04);
        return;
    }
    const type = R.placing.type;
    const def = BUILDINGS[type];
    const { x, z } = R.placing;

    // 값을 치르고 터를 놓는다. 주민이 걸어와서 짓는다.
    const res = R.players[0].res;
    for (const k in def.cost) res[k] -= def.cost[k];
    R.dirty.res = true;

    const rot = Math.random() * Math.PI * 2;
    const site = placeBuilding(type, 0, x, z, rot, false);

    const villagers = R.selection.filter((e) => e.owner === 0 && isUnit(e) && e.key === "villager");
    if (villagers.length) orderBuild(villagers, site);

    if (!keys.has("ShiftLeft") && !keys.has("ShiftRight")) cancelPlacing();
    else { R.placeOk = false; }
}

/* ------------------------------------------------------------------ 입력 */

export function initControls() {
    const cv = G.renderer.domElement;

    cv.addEventListener("contextmenu", (e) => e.preventDefault());

    cv.addEventListener("pointerdown", (e) => {
        AudioSystem.start();
        if (e.button === 2) {
            if (R.placing) { cancelPlacing(); return; }
            commandAt(e.clientX, e.clientY, e.shiftKey);
            return;
        }
        if (e.button !== 0) return;

        if (R.placing) { tryPlace(); return; }
        if (R.attackMove) {
            const p = screenToWorld(e.clientX, e.clientY);
            const units = R.selection.filter((u) => u.owner === 0 && isUnit(u));
            if (p && units.length) { orderMove(units, p.x, p.z, true); ping(p.x, p.z); }
            R.attackMove = false;
            return;
        }
        drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false };
    });

    window.addEventListener("pointermove", (e) => {
        CAM.mouseX = e.clientX;
        CAM.mouseY = e.clientY;
        CAM.inWindow = true;

        if (miniDrag) {
            const [wx, wz] = minimapToWorld(e.clientX, e.clientY);
            centerCamera(wx, wz);
            return;
        }
        if (!drag) return;
        drag.x = e.clientX;
        drag.y = e.clientY;
        if (Math.hypot(drag.x - drag.x0, drag.y - drag.y0) > 5) drag.moved = true;
        if (drag.moved) setSelRect(drag.x0, drag.y0, drag.x, drag.y, true);
    });

    window.addEventListener("pointerup", (e) => {
        miniDrag = false;
        if (!drag || e.button !== 0) { drag = null; return; }
        setSelRect(0, 0, 0, 0, false);

        if (drag.moved) {
            boxSelect(drag.x0, drag.y0, drag.x, drag.y, e.shiftKey);
        } else {
            const hit = pickAt(e.clientX, e.clientY);
            if (!hit) {
                if (!e.shiftKey) select([]);
            } else {
                // 같은 자리를 빠르게 두 번 누르면 화면 안의 같은 종류를 전부
                const now = performance.now();
                const dbl = now - lastClick.t < 380 && lastClick.id === hit.id;
                lastClick = { t: now, id: hit.id };

                if (dbl && isUnit(hit) && hit.owner === 0) {
                    const all = R.units.filter((u) =>
                        u.alive && u.owner === 0 && u.key === hit.key && onScreen(u));
                    select(all, e.shiftKey);
                } else {
                    select([hit], e.shiftKey);
                }
            }
        }
        drag = null;
    });

    window.addEventListener("pointerleave", () => { CAM.inWindow = false; });

    window.addEventListener("keydown", (e) => {
        if (e.repeat) { keys.add(e.code); return; }
        keys.add(e.code);
        AudioSystem.start();
        handleKey(e);
    });
    window.addEventListener("keyup", (e) => keys.delete(e.code));
    window.addEventListener("blur", () => keys.clear());
}

function onScreen(u) {
    const s = worldToScreen(u.x, terrainHeight(u.x, u.z), u.z);
    return s.x > 0 && s.x < window.innerWidth && s.y > 0 && s.y < window.innerHeight - 150;
}

/** 미니맵 조작 (hud 가 넘겨준다) */
export const minimapHandlers = {
    minimapDown(e) {
        const [wx, wz] = minimapToWorld(e.clientX, e.clientY);
        if (e.button === 2) {
            const units = R.selection.filter((u) => u.owner === 0 && isUnit(u));
            if (units.length) { orderMove(units, wx, wz, R.attackMove); R.attackMove = false; }
            return;
        }
        miniDrag = true;
        centerCamera(wx, wz);
    },
    minimapMove(e) {
        if (!miniDrag) return;
        const [wx, wz] = minimapToWorld(e.clientX, e.clientY);
        centerCamera(wx, wz);
    }
};

/* ---------------------------------------------------------------- 단축키 */

let idleIndex = 0;

function handleKey(e) {
    const code = e.code;

    if (code === "Escape") {
        if (R.placing) cancelPlacing();
        else if (R.cmdPage === "build") { R.cmdPage = "root"; R.dirty.cmd = true; }
        else select([]);
        return;
    }

    if (code === "Delete") {
        for (const u of R.selection.filter((x) => x.owner === 0 && isUnit(x))) killUnit(u);
        select([]);
        return;
    }

    // 부대 지정
    const digit = code.startsWith("Digit") ? code.slice(5) : null;
    if (digit && digit !== "0") {
        if (e.ctrlKey || e.metaKey) {
            R.groups[digit] = R.selection.filter((x) => x.alive && x.owner === 0);
            logMessage(`${digit}번 부대로 묶었습니다 (${R.groups[digit].length}).`);
        } else {
            const g = (R.groups[digit] || []).filter((x) => x.alive);
            if (g.length) {
                select(g);
                if (performance.now() - lastClick.t < 400) centerCamera(g[0].x, g[0].z);
                lastClick = { t: performance.now(), id: -1 };
            }
        }
        return;
    }

    // 마을회관으로
    if (code === "KeyH" && e.shiftKey) return;
    if (code === "Home") {
        const tc = R.buildings.find((b) => b.alive && b.owner === 0 && b.type === "towncenter");
        if (tc) { centerCamera(tc.x, tc.z); select([tc]); }
        return;
    }

    // 놀고 있는 주민 찾기
    if (code === "Period") {
        const idle = R.units.filter((u) =>
            u.alive && u.owner === 0 && u.key === "villager" && u.order.t === "idle");
        if (!idle.length) { logMessage("노는 주민이 없습니다."); return; }
        idleIndex = (idleIndex + 1) % idle.length;
        const u = idle[idleIndex];
        select([u]);
        centerCamera(u.x, u.z);
        return;
    }

    // 마지막 사건 자리로
    if (code === "Space") {
        if (R.lastEvent) centerCamera(R.lastEvent.x, R.lastEvent.z);
        e.preventDefault();
        return;
    }

    // 명령 칸 단축키
    const idx = hotkeyIndex(code);
    if (idx >= 0) {
        runCommand(idx);
        return;
    }
}

/* -------------------------------------------------------------- 명령 목록 */

function cmdStop(units) {
    return {
        glyph: "■", name: "정지", tip: "하던 일을 멈춘다.",
        run: () => orderStop(units)
    };
}

function cmdAttackMove(units) {
    return {
        glyph: "⚔", name: "공격 이동", tip: "가는 길에 만나는 적을 친다. 누른 뒤 갈 곳을 찍는다.",
        run: () => { R.attackMove = true; showBig("공격 이동 — 갈 곳을 찍으세요", 1.4); }
    };
}

function cmdBuildMenu() {
    return {
        glyph: "⌂", name: "짓기", tip: "건물을 세운다.",
        run: () => { R.cmdPage = "build"; R.dirty.cmd = true; }
    };
}

function cmdBack() {
    return {
        glyph: "↩", name: "뒤로", tip: "",
        run: () => { R.cmdPage = "root"; R.dirty.cmd = true; }
    };
}

function cmdPlace(type) {
    const def = BUILDINGS[type];
    const off = !canAfford(def.cost, 0);
    return {
        glyph: def.glyph, name: def.name, cost: def.cost, tip: def.desc, off,
        reason: `${def.name}을(를) 지을 자원이 모자랍니다.`,
        run: () => startPlacing(type)
    };
}

function cmdTrain(b, key) {
    const def = UNITS[key];
    const p = R.players[0];
    const poor = !canAfford(def.cost, 0);
    const full = p.pop >= p.popCap && !b.queue.length;
    return {
        glyph: def.glyph, name: def.name, cost: def.cost,
        tip: `${def.desc}<br>체력 ${def.hp} · 공격 ${def.atk} · ${def.time}초`,
        off: poor || full,
        reason: full ? "인구가 찼습니다. 집을 지으세요." : "자원이 모자랍니다.",
        run: () => queueUnit(b, key)
    };
}

function cmdAgeUp(b) {
    const p = R.players[0];
    if (p.age >= 5) return null;
    const cost = AGE_UP[p.age];
    const off = !!p.ageUp || !canAfford(cost, 0);
    return {
        glyph: "↟", name: "시대 발전", cost,
        reason: p.ageUp ? "이미 시대를 여는 중입니다." : "시대를 열 자원이 모자랍니다.",
        tip: `다음 시대로 넘어간다. 건물이 셋 이상 있어야 한다.<br>땅과 하늘과 건물이 전부 바뀐다.`,
        off,
        run: () => startAgeUp(b)
    };
}

/** 지금 골라 둔 것에 맞는 명령 열두 칸을 만든다 */
export function refreshCommands() {
    const list = [];
    const own = R.selection.filter((e) => e.owner === 0);

    if (R.placing) {
        list[11] = {
            glyph: "✕", name: "취소", tip: "배치를 그만둔다 (Esc).",
            run: cancelPlacing
        };
        setCommands(list);
        return;
    }

    if (!own.length) { setCommands([]); return; }

    // 건물 하나
    if (own.length === 1 && isBuilding(own[0])) {
        const b = own[0];
        if (b.built) {
            for (const k of trainable(b)) list.push(cmdTrain(b, k));
            if (b.def.ageUp) {
                const c = cmdAgeUp(b);
                if (c) list.push(c);
            }
            if (b.queue.length) {
                list[11] = {
                    glyph: "✕", name: "취소", tip: "대기열의 마지막을 물린다.",
                    run: () => cancelQueue(b)
                };
            }
        }
        setCommands(list);
        return;
    }

    const units = own.filter(isUnit);
    const villagers = units.filter((u) => u.key === "villager");
    const soldiers = units.filter((u) => u.key !== "villager");

    if (R.cmdPage === "build" && villagers.length) {
        const types = ["house", "granary", "storage", "farm", "barracks",
            "range", "tower", "wall", "towncenter"];
        for (const t of types) {
            if ((BUILDINGS[t].age || 0) > R.players[0].age) continue;
            list.push(cmdPlace(t));
        }
        list[11] = cmdBack();
        setCommands(list);
        return;
    }

    if (villagers.length) {
        list.push(cmdBuildMenu());
        list.push({
            glyph: "✛", name: "수리", tip: "부서진 건물을 고친다. 누른 뒤 건물을 찍는다.",
            run: () => showBig("고칠 건물을 오른쪽 클릭하세요", 1.6)
        });
    }
    if (soldiers.length) list.push(cmdAttackMove(units));
    list.push(cmdStop(units));

    setCommands(list);
}
