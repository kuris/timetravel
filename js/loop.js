/**
 * 애니메이션 갱신과 게임 루프
 */
import { updateCamera } from "./camera.js";
import { updateHint } from "./hint.js";
import { updatePrompt } from "./interaction.js";
import { drawMinimap, updateExploration } from "./minimap.js";
import { updateMorph } from "./morph.js";
import { canBuildHere, updateBuildGhost } from "./village.js";
import { updateMovement, updatePlayerAnimation, updatePlayerOcclusion } from "./player.js";
import { postCamera, postMaterial, postScene, renderTarget } from "./postprocess.js";
import { randRange } from "./rng.js";
import { G, clock } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { updateWeather, weatherLabel } from "./weather.js";
import { updateCombat, updateHPBar, updateStaminaBar } from "./combat.js";
import { dom } from "./ui.js";

let lastWeatherLabel = 0;

export function updateAnimated(t, delta) {
    for (const a of G.animated) {
        if (a.type === "glow") {
            a.group.position.y = a.baseY + Math.sin(t * 2.1 * a.speed + a.phase) * 0.07;
            a.ring.rotation.z += delta * 1.1;
            a.mote.position.y = 0.50 + Math.sin(t * 3.0 + a.phase) * 0.06;
            a.light.intensity = 0.32 + Math.sin(t * 2.7 + a.phase) * 0.12;
        }

        if (a.type === "wave") {
            a.mesh.position.x += delta * a.speed;
            if (a.mesh.position.x > a.maxX) a.mesh.position.x = a.minX;
        }

        if (a.type === "torch" || a.type === "lantern") {
            const f = 0.8 + Math.sin(t * a.speed + a.phase) * 0.22 + randRange(-0.03, 0.03);
            a.light.intensity = a.baseIntensity * f;
            a.flame.scale.y = 0.85 + Math.sin(t * a.speed * 1.4 + a.phase) * 0.16;
        }

        if (a.type === "ember") {
            a.mesh.material.opacity = 0.18 + Math.sin(t * 2.8 + a.phase) * 0.05;
        }

        // 지면을 스치는 안개: 아주 천천히 흐른다
        if (a.type === "mist") {
            a.mesh.position.x += delta * a.speed;
            a.mesh.position.z += delta * a.speed * 0.45;
            a.mesh.rotation.z += delta * a.spin;

            // 너무 멀어지면 반대편으로 되돌린다
            if (Math.abs(a.mesh.position.x) > 34) a.mesh.position.x *= -1;
            if (Math.abs(a.mesh.position.z) > 34) a.mesh.position.z *= -1;
        }

        // 떠도는 먼지
        if (a.type === "dust") {
            const arr = a.geo.attributes.position.array;
            for (let i = 0; i < arr.length; i += 3) {
                arr[i] += delta * 0.32;
                arr[i + 1] += delta * 0.055 * Math.sin(t * 0.7 + i);
                if (arr[i] > 30) arr[i] = -30;
                if (arr[i + 1] > 9) arr[i + 1] = 0.3;
            }
            a.geo.attributes.position.needsUpdate = true;
        }

        // --- 주민: 지점 사이를 천천히 오간다 ---
        if (a.type === "npc") {
            const g = a.group;
            const u = g.userData;

            if (a.pauseLeft > 0) {
                a.pauseLeft -= delta;
                u.walk += delta * 0.6; // 서 있을 때도 아주 약하게 움직인다
                applyWalk(u, 0, a.quad);
            } else {
                const wp = a.waypoints[a.index];
                const dx = wp[0] - g.position.x;
                const dz = wp[1] - g.position.z;
                const d = Math.hypot(dx, dz);

                if (d < 0.25) {
                    // 지점에 닿았다. 잠시 쉬고 다음 지점으로.
                    a.index = (a.index + 1) % a.waypoints.length;
                    a.pauseLeft = randRange(a.pauseRange[0], a.pauseRange[1]);
                } else {
                    const step = a.speed * delta;
                    g.position.x += (dx / d) * step;
                    g.position.z += (dz / d) * step;
                    g.position.y = terrainHeight(g.position.x, g.position.z);

                    // 진행 방향으로 부드럽게 돈다
                    const target = Math.atan2(dx, dz);
                    let diff = target - g.rotation.y;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    g.rotation.y += diff * Math.min(1, delta * 6);

                    u.walk += delta * (a.quad ? 11 : 8);
                    applyWalk(u, 1, a.quad);
                }
            }
        }

        // --- 제자리에서 일하는 사람 ---
        if (a.type === "worker") {
            const u = a.group.userData;
            // 팔을 위아래로 움직인다 (불 지피기 / 절구질 / 빨래)
            const swing = Math.sin(t * a.speed + a.phase);
            u.armL.rotation.x = -0.5 + swing * 0.55;
            u.armR.rotation.x = -0.5 - swing * 0.55;
            u.body.rotation.x = 0.12 + swing * 0.08;
            u.body.position.y = 0.30 - Math.abs(swing) * 0.03;
        }

        // --- 풀 뜯는 가축 ---
        if (a.type === "graze") {
            const u = a.group.userData;
            // 가끔 고개를 숙였다 든다
            const k = Math.sin(t * a.speed + a.phase);
            u.body.rotation.x = k > 0.6 ? (k - 0.6) * 0.5 : 0;
            u.body.position.y += (0 - u.body.position.y) * 0; // 위치는 고정
        }

        // --- 새떼: 천천히 원을 그린다 ---
        if (a.type === "birds") {
            const arr = a.geo.attributes.position.array;
            for (let i = 0; i < a.offsets.length; i++) {
                const o = a.offsets[i];
                o.a += o.speed * delta;
                arr[i * 3] = a.center.x + Math.cos(o.a) * o.r;
                arr[i * 3 + 1] = a.center.y + o.yOff + Math.sin(o.a * 2.1) * 0.5;
                arr[i * 3 + 2] = a.center.z + Math.sin(o.a) * o.r;
            }
            a.geo.attributes.position.needsUpdate = true;
        }

        // 피어오르는 연기
        if (a.type === "smoke") {
            for (let i = 0; i < a.puffs.length; i++) {
                a.life[i] += delta * 0.20;
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
                // 올라가면서 나타났다가 흩어진다
                puff.material.opacity = Math.sin(k * Math.PI) * 0.30;
            }
        }

        // 바람에 흔들리는 풀 / 갈대
        if (a.type === "sway") {
            a.group.rotation.z = Math.sin(t * a.speed + a.phase) * a.amp;
            a.group.rotation.x = Math.cos(t * a.speed * 0.7 + a.phase) * a.amp * 0.55;
        }

        if (a.type === "gate" && a.gate.active) {
            a.gate.ring.rotation.z += delta * 1.1;
            a.gate.portal.material.opacity = 0.27 + Math.sin(t * 3.0) * 0.08;
            a.gate.light.intensity = 1.15 + Math.sin(t * 4.2) * 0.32;
        }
    }
}

/******************************************************************
 * GAME LOOP
 * 1) 장면을 저해상도 렌더 타겟에 그리고
 * 2) 후처리 셰이더로 그레이딩/디더링/그레인을 입혀 화면에 출력한다.
 ******************************************************************/
/**
 * NPC / 가축의 걷기 포즈.
 * moving 이 0 이면 서 있는 자세로 돌아간다.
 */
function applyWalk(u, moving, quad) {
    if (quad) {
        // 네 발: 대각선끼리 함께 움직인다
        const a = Math.sin(u.walk) * 0.5 * moving;
        const b = Math.sin(u.walk + Math.PI) * 0.5 * moving;
        u.legs[0].rotation.x = a;
        u.legs[3].rotation.x = a;
        u.legs[1].rotation.x = b;
        u.legs[2].rotation.x = b;
        u.body.position.y = u.body.position.y; // 높이는 생성 시 값 유지
        return;
    }

    const swing = Math.sin(u.walk) * 0.62 * moving;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.6;
    u.armR.rotation.x = swing * 0.6;
    u.body.position.y = 0.30 + Math.abs(Math.sin(u.walk)) * 0.035 * moving;
}

export function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    let moving = false;
    if (!G.transitioning && !G.demoFinished) {
        moving = updateMovement(delta);
    }

    updatePlayerAnimation(delta, moving, t);
    updateCamera(delta);
    updatePlayerOcclusion();
    updateWeather(delta);
    updateMorph(delta);
    updateAnimated(t, delta);
    updateCombat(delta);
    updateExploration();
    updateBuildGhost();
    G.buildReady = canBuildHere(G.player.position.x, G.player.position.z).ok;
    updatePrompt();
    updateHint();
    drawMinimap();

    // 날씨 표시는 자주 바꿀 필요가 없다 (1초에 두 번)
    if (t - lastWeatherLabel > 0.5) {
        lastWeatherLabel = t;
        dom.weatherText.textContent = weatherLabel();
    }

    // 후처리 유니폼 갱신
    postMaterial.uniforms.uTime.value = t;
    postMaterial.uniforms.uGlitch.value = G.glitchAmount;

    // 1단계: 장면 -> 저해상도 렌더 타겟
    G.renderer.setRenderTarget(renderTarget);
    G.renderer.clear();
    G.renderer.render(G.scene, G.camera);

    // 2단계: 후처리 -> 화면 (CSS 가 픽셀 단위로 확대)
    G.renderer.setRenderTarget(null);
    G.renderer.render(postScene, postCamera);
}
