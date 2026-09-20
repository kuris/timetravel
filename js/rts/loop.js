/**
 * loop.js — RTS 한 프레임
 *
 * 규칙(R)을 굴리고, 장면(G)을 그린다.
 * 그리는 방식은 탐험 모드와 같다 — 저해상도 렌더 타겟 + 90년대식 후처리.
 */
import { AudioSystem } from "../audio.js";
import { postCamera, postMaterial, postScene, renderTarget } from "../postprocess.js";
import { randRange } from "../rng.js";
import { G, clock } from "../state.js";
import { updateWeather } from "../weather.js";
import { updateAI } from "./ai.js";
import { updateBuildings } from "./buildings.js";
import { updateProjectiles } from "./combat.js";
import { cancelPlacing, refreshCommands, updateGhost } from "./control.js";
import { fogUpdate } from "./fog.js";
import { hideOverlay, showOverlay, updateHud } from "./hud.js";
import { updateRtsCamera } from "./rtscam.js";
import { R } from "./state.js";
import { updateUnits } from "./units.js";
import { disposeObj } from "./util.js";

/** 장면에 떠 있는 것들 (안개 · 먼지 · 물결 · 연기) */
function updateAmbient(t, dt) {
    for (const a of G.animated) {
        if (a.type === "wave") {
            a.mesh.position.x += dt * a.speed;
            if (a.mesh.position.x > a.maxX) a.mesh.position.x = a.minX;
        } else if (a.type === "mist") {
            a.mesh.position.x += dt * a.speed;
            a.mesh.position.z += dt * a.speed * 0.45;
            a.mesh.rotation.z += dt * a.spin;
            if (Math.abs(a.mesh.position.x) > 34) a.mesh.position.x *= -1;
            if (Math.abs(a.mesh.position.z) > 34) a.mesh.position.z *= -1;
        } else if (a.type === "dust") {
            const arr = a.geo.attributes.position.array;
            for (let i = 0; i < arr.length; i += 3) {
                arr[i] += dt * 0.32;
                arr[i + 1] += dt * 0.055 * Math.sin(t * 0.7 + i);
                if (arr[i] > 30) arr[i] = -30;
                if (arr[i + 1] > 9) arr[i + 1] = 0.3;
            }
            a.geo.attributes.position.needsUpdate = true;
        } else if (a.type === "sway") {
            a.group.rotation.z = Math.sin(t * a.speed + a.phase) * a.amp;
            a.group.rotation.x = Math.cos(t * a.speed * 0.7 + a.phase) * a.amp * 0.55;
        } else if (a.type === "torch" || a.type === "lantern") {
            const f = 0.8 + Math.sin(t * a.speed + a.phase) * 0.22 + randRange(-0.03, 0.03);
            a.light.intensity = a.baseIntensity * f;
            a.flame.scale.y = 0.85 + Math.sin(t * a.speed * 1.4 + a.phase) * 0.16;
        } else if (a.type === "ember") {
            a.mesh.material.opacity = 0.18 + Math.sin(t * 2.8 + a.phase) * 0.05;
        } else if (a.type === "smoke") {
            for (let i = 0; i < a.puffs.length; i++) {
                a.life[i] += dt * 0.20;
                if (a.life[i] > 1) a.life[i] -= 1;
                const k = a.life[i];
                const puff = a.puffs[i];
                puff.position.set(
                    a.origin.x + Math.sin(k * 5.0 + i) * 0.55 * k,
                    a.origin.y + k * 4.2,
                    a.origin.z + Math.cos(k * 4.1 + i) * 0.45 * k
                );
                const sc = 0.5 + k * 2.6;
                puff.scale.set(sc, sc, sc);
                puff.material.opacity = Math.sin(k * Math.PI) * 0.30;
            }
        } else if (a.type === "birds") {
            const arr = a.geo.attributes.position.array;
            for (let i = 0; i < a.offsets.length; i++) {
                const o = a.offsets[i];
                o.a += o.speed * dt;
                arr[i * 3] = a.center.x + Math.cos(o.a) * o.r;
                arr[i * 3 + 1] = a.center.y + o.yOff + Math.sin(o.a * 2.1) * 0.5;
                arr[i * 3 + 2] = a.center.z + Math.sin(o.a) * o.r;
            }
            a.geo.attributes.position.needsUpdate = true;
        }
    }
}

/** 명령 표시처럼 잠깐 떴다 사라지는 것들 */
function updatePings(dt) {
    for (let i = R.effects.length - 1; i >= 0; i--) {
        const e = R.effects[i];
        if (e.t !== "ping") continue;
        e.life -= dt;
        const k = e.life / e.max;
        e.group.scale.setScalar(1 + (1 - k) * 1.6);
        e.group.children[0].material.opacity = Math.max(0, k);
        if (e.life <= 0) {
            disposeObj(e.group);
            R.effects.splice(i, 1);
        }
    }
}

function checkVictory() {
    if (R.over || !R.started) return;

    const alive = (owner) =>
        R.buildings.some((b) => b.alive && b.owner === owner) ||
        R.units.some((u) => u.alive && u.owner === owner);

    if (!alive(1)) {
        R.over = "win";
        showOverlay("승 리", "정복 완료",
            "적의 마을이 사라졌습니다.\n같은 강가에서 여섯 시대를 지나, 이 땅은 당신의 것이 되었습니다.",
            "다시 하기", () => location.reload());
    } else if (!alive(0)) {
        R.over = "lose";
        showOverlay("패 배", "마을이 사라졌습니다",
            "주민도 건물도 남지 않았습니다.\n이 강가의 이야기는 여기서 끊깁니다.",
            "다시 하기", () => location.reload());
    }
    if (R.over) {
        AudioSystem.playGate && AudioSystem.playGate();
        cancelPlacing();
    }
}

export function rtsAnimate() {
    requestAnimationFrame(rtsAnimate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (R.started && !R.over) {
        R.time += dt;

        updateUnits(dt, t);
        updateBuildings(dt);
        updateProjectiles(dt);
        updateAI(dt);
        fogUpdate(dt);
        checkVictory();
    }

    updateRtsCamera(dt, !!R.over);
    updateGhost();
    updateWeather(dt);
    updateAmbient(t, dt);
    updatePings(dt);

    if (R.dirty.cmd) { R.dirty.cmd = false; refreshCommands(); }
    updateHud(dt);

    // 시대 전환의 잔상
    if (G.glitchAmount > 0) G.glitchAmount = Math.max(0, G.glitchAmount - dt * 0.7);

    postMaterial.uniforms.uTime.value = t;
    postMaterial.uniforms.uGlitch.value = G.glitchAmount;

    G.renderer.setRenderTarget(renderTarget);
    G.renderer.clear();
    G.renderer.render(G.scene, G.camera);

    G.renderer.setRenderTarget(null);
    G.renderer.render(postScene, postCamera);
}

/**
 * 판을 빨리 굴려 본다 (개발용).
 * 그리지 않고 규칙만 여러 번 돌린다. 콘솔에서 RTS.simulate(120) 처럼 쓴다.
 */
export function simulate(seconds, step = 0.05) {
    const n = Math.floor(seconds / step);
    for (let i = 0; i < n; i++) {
        R.time += step;
        updateUnits(step, R.time);
        updateBuildings(step);
        updateProjectiles(step);
        updateAI(step);
        fogUpdate(step);
        checkVictory();
        if (R.over) break;
    }
    return { time: Math.round(R.time), over: R.over };
}
