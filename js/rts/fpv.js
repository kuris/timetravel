/**
 * fpv.js — 1인칭으로 내려다보지 않고 서 보기
 *
 * `V` 를 누르면 등각 시점에서 내려와 그 땅에 선다. 언제든 된다.
 * 판은 그대로 돌아간다 — 주민은 계속 나무를 베고, 적은 계속 온다.
 * 명령은 내릴 수 없다. 눈만 있다.
 *
 * 시야(전장의 안개)는 규칙을 따른다. 안 보이는 적은 여기서도 안 보인다.
 */
import { AudioSystem } from "../audio.js";
import { G, cameraOffset, cameraTarget, keys } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { logMessage, showBig } from "./hud.js";
import { INPUT } from "./input.js";
import { R } from "./state.js";
import { MAP_R } from "./units.js";
import { clamp, dist, isWater } from "./util.js";

const EYE = 1.62;              // 눈높이
const WALK = 4.2;              // 초당 걷는 거리
const RUN = 8.0;               // Shift
const PITCH_MAX = 1.35;

export const FPV = {
    on: false,
    x: 0, z: 0,
    yaw: 0, pitch: -0.04,
    bob: 0, phase: 0,
    hold: 0,                   // 단추를 눌러 걷는 중 (1 앞, -1 뒤)
    locked: false
};

const euler = new THREE.Euler(0, 0, 0, "YXZ");
const el = {};

/* ------------------------------------------------------------ 들고 나기 */

function grab() {
    if (el.bar) return;
    el.bar = document.getElementById("fpvBar");
    el.hint = document.getElementById("fpvHint");
    el.out = document.getElementById("fpvOut");
    el.fwd = document.getElementById("fpvFwd");
    el.back = document.getElementById("fpvBack");

    el.out.addEventListener("click", () => exitFpv());

    // 손가락 · 마우스로도 걸을 수 있게 (자판이 없어도 된다)
    const hold = (node, dir) => {
        const set = (v) => (e) => { e.preventDefault(); FPV.hold = v; };
        node.addEventListener("pointerdown", set(dir));
        node.addEventListener("pointerup", set(0));
        node.addEventListener("pointerleave", set(0));
        node.addEventListener("pointercancel", set(0));
    };
    hold(el.fwd, 1);
    hold(el.back, -1);
}

/** 어디에 설 것인가 — 고른 것이 있으면 그 곁에, 없으면 지금 보고 있는 자리에 */
function standWhere() {
    const sel = R.selection.find((e) => e.owner === 0 && e.alive !== false);
    const spot = sel ? { x: sel.x, z: sel.z } : { x: cameraTarget.x, z: cameraTarget.z };
    return nudgeOut(spot);
}

/**
 * 건물 안이나 물 위에 서지 않게 밀어낸다.
 * 마을회관 한가운데에 내려서면 사방이 막혀 한 걸음도 못 뗀다 — 거기서 시작하는 일이 잦다.
 */
function nudgeOut(spot) {
    let { x, z } = spot;
    for (let i = 0; i < 12; i++) {
        const b = R.buildings.find((o) =>
            o.alive && dist(x, z, o.x, o.z) < o.def.radius + 0.7);
        if (!b && !isWater(x, z)) break;

        const from = b || { x: 0, z: 0, def: { radius: 0 } };
        const a = Math.atan2(z - from.z, x - from.x) || (i * 1.4);
        const r = (b ? b.def.radius + 1.1 : 2.2);
        x = from.x + Math.cos(a) * r;
        z = from.z + Math.sin(a) * r;
    }
    return { x, z };
}

export function enterFpv() {
    if (FPV.on) return;
    grab();

    const spot = standWhere();
    FPV.x = clamp(spot.x, -MAP_R + 1, MAP_R - 1);
    FPV.z = clamp(spot.z, -MAP_R + 1, MAP_R - 1);
    // 등각 화면이 보던 방향(카메라에서 땅을 향하는 쪽)을 그대로 바라본다.
    // 시선 앞쪽은 (-sin yaw, -cos yaw) 이고, 등각 카메라의 시선은 -cameraOffset 이다.
    FPV.yaw = Math.atan2(cameraOffset.x, cameraOffset.z);
    FPV.pitch = -0.04;
    FPV.bob = FPV.phase = 0;
    FPV.hold = 0;
    FPV.on = true;
    G.isFirstPerson = true;

    document.body.classList.add("fpv");
    el.hint.textContent = INPUT.touch
        ? "끌어서 둘러보기 · 아래 단추로 걷기"
        : "끌거나 마우스를 움직여 둘러보기 · W A S D 또는 왼쪽 단추를 눌러 걷기";

    // 포인터 락은 자판 · 단추를 누른 그 순간에만 걸 수 있다
    if (!INPUT.touch) {
        const cv = G.renderer.domElement;
        try { cv.requestPointerLock && cv.requestPointerLock(); } catch { /* 막히면 끌어서 본다 */ }
    }

    AudioSystem.tone(330, 0.16, "sine", 0.05, 0, 250);
    showBig("1인칭 — V 로 돌아간다", 1.8);
}

export function exitFpv() {
    if (!FPV.on) return;
    FPV.on = false;
    FPV.hold = 0;
    G.isFirstPerson = false;
    G.camera = G.isoCamera;

    document.body.classList.remove("fpv");
    if (document.pointerLockElement) document.exitPointerLock && document.exitPointerLock();

    // 서 있던 자리를 등각 화면 한가운데로 가져온다
    cameraTarget.set(FPV.x, 0.6, FPV.z);
    AudioSystem.tone(250, 0.16, "sine", 0.05, 0, 330);
}

export function toggleFpv() {
    if (FPV.on) exitFpv();
    else enterFpv();
}

/* ---------------------------------------------------------------- 둘러보기 */

/** 마우스 · 손가락이 움직인 만큼 고개를 돌린다 */
export function fpvLook(dx, dy) {
    if (!FPV.on) return;
    FPV.yaw -= dx * 0.0032;
    FPV.pitch = clamp(FPV.pitch - dy * 0.0028, -PITCH_MAX, PITCH_MAX);
}

/* ------------------------------------------------------------------ 갱신 */

/** 그 자리에 설 수 있는가 (물과 판 밖은 언제나 막는다) */
function blocked(x, z, ignoreBuildings) {
    if (Math.hypot(x, z) > MAP_R - 1) return true;
    if (isWater(x, z)) return true;
    if (ignoreBuildings) return false;
    for (const b of R.buildings) {
        if (!b.alive) continue;
        if (dist(x, z, b.x, b.z) < b.def.radius * 0.8) return true;
    }
    return false;
}

export function updateFpv(dt) {
    if (!FPV.on) return;

    // ---- 걷기 ----
    let f = FPV.hold, s = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) f += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) f -= 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) s -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) s += 1;
    f = clamp(f, -1, 1);

    const moving = f !== 0 || s !== 0;
    if (moving) {
        const sp = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? RUN : WALK) * dt;
        const sin = Math.sin(FPV.yaw), cos = Math.cos(FPV.yaw);
        // 화면 앞쪽은 -Z 를 yaw 로 돌린 방향이다
        const nx = FPV.x + (-sin * f + cos * s) * sp;
        const nz = FPV.z + (-cos * f - sin * s) * sp;

        // 어쩌다 건물 안에 갇혔다면 그 한 발짝은 건물을 무시한다 (나올 길은 있어야 한다)
        const stuck = blocked(FPV.x, FPV.z) && !blocked(FPV.x, FPV.z, true);

        if (!blocked(nx, FPV.z, stuck)) FPV.x = nx;
        if (!blocked(FPV.x, nz, stuck)) FPV.z = nz;

        FPV.phase += dt * (keys.has("ShiftLeft") ? 11 : 8);
        FPV.bob = Math.sin(FPV.phase) * 0.055;
    } else {
        FPV.bob *= Math.max(0, 1 - dt * 6);
    }

    // ---- 카메라 ----
    const cam = G.fpvCamera;
    G.camera = cam;
    cam.position.set(FPV.x, terrainHeight(FPV.x, FPV.z) + EYE + FPV.bob, FPV.z);
    euler.set(FPV.pitch, FPV.yaw, 0);
    cam.quaternion.setFromEuler(euler);

    // 미니맵과 배경판 · 그림자는 서 있는 자리를 따른다
    cameraTarget.set(FPV.x, 0.6, FPV.z);
    if (G.backdrop) {
        G.backdrop.position.x = FPV.x;
        G.backdrop.position.z = FPV.z;
    }
    if (G.sunLight && G.sunLight.userData) {
        const u = G.sunLight.userData;
        G.sunLight.position.set(FPV.x + (u.ox ?? 0), u.oy ?? 18, FPV.z + (u.oz ?? 0));
        G.sunLight.target.position.set(FPV.x, 0, FPV.z);
        G.sunLight.target.updateMatrixWorld();
    }
}

/** 시대가 올라 장면을 다시 지어도 서 있던 자리는 그대로다 */
export function fpvActive() {
    return FPV.on;
}
