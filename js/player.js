/**
 * 플레이어 — 모델, 걷기 애니메이션, 이동
 */
import { addBlob, addBox, addCone, addCylinder, addFlatCircle, makeBasicMat } from "./build.js";
import { PLAYER_SPEED, SPRINT_MULTIPLIER, WORLD_LIMIT } from "./config.js";
import { G, keys } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { W } from "./weather.js";
import { updateStaminaBar } from "./combat.js";

export function createPlayer() {
    const g = new THREE.Group();

    // 바닥에 깔리는 가짜 그림자 (실제 그림자와 함께 무게감을 준다)
    addFlatCircle(g, 0.46, 0x000000, 0, 0.02, 0, 12, {
        material: makeBasicMat(0x000000, {
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false
        }),
        castShadow: false,
        receiveShadow: false
    });

    // ---- 상체 (걸을 때 위아래로 살짝 흔들린다) ----
    const body = new THREE.Group();
    body.position.y = 0.34;
    g.add(body);

    // 가죽옷 몸통
    addCylinder(body, 0.21, 0.27, 0.48, 7, 0x6f9184, 0, 0.24, 0, { map: G.TEX.cloth });
    // 어깨에 두른 가죽
    addCylinder(body, 0.25, 0.23, 0.13, 7, 0xa5763f, 0, 0.45, 0, { map: G.TEX.cloth });
    // 목
    addCylinder(body, 0.06, 0.07, 0.07, 5, 0xd8a877, 0, 0.53, 0);
    // 머리
    const head = addBlob(body, 0.16, 0xe3b384, 0, 0.64, 0, { sy: 1.12, sx: 0.94, sz: 0.94 });
    // 머리카락 / 두건
    addCone(body, 0.20, 0.18, 7, 0x4a3122, 0, 0.75, 0);
    // 등짐
    addBox(body, 0.21, 0.25, 0.14, 0x9c6c3f, 0, 0.27, -0.22, 0, { map: G.TEX.cloth });

    // ---- 팔 (어깨에서 회전하도록 피벗 그룹 사용) ----
    const mkArm = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.24, 0.42, 0);
        body.add(pivot);
        addCylinder(pivot, 0.055, 0.048, 0.36, 5, 0xd2a271, 0, -0.18, 0);
        return pivot;
    };

    // ---- 다리 ----
    const mkLeg = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.095, 0.0, 0);
        body.add(pivot);
        addCylinder(pivot, 0.068, 0.058, 0.34, 5, 0x8a6e52, 0, -0.17, 0);
        // 발
        addBox(pivot, 0.11, 0.06, 0.17, 0x3c2c1e, 0, -0.33, 0.03);
        return pivot;
    };

    g.userData = {
        body,
        head,
        armL: mkArm(-1),
        armR: mkArm(1),
        legL: mkLeg(-1),
        legR: mkLeg(1),
        walk: 0,     // 걷기 위상
        moving: 0    // 0..1 이동 여부 보간값
    };

    return g;
}

/** 걷기 애니메이션: 팔다리 스윙 + 상체 흔들림 */
export function updatePlayerAnimation(delta, isMoving, t) {
    if (!G.player) return;
    const u = G.player.userData;

    // 걷기/멈춤 전환을 부드럽게
    u.moving += ((isMoving ? 1 : 0) - u.moving) * Math.min(1, delta * 11);

    // 달릴 때는 보폭과 속도가 커진다
    const cadence = sprinting ? 14.5 : 9.2;
    const stride = sprinting ? 1.05 : 0.75;

    if (isMoving) u.walk += delta * cadence;

    const swing = Math.sin(u.walk) * stride * u.moving;
    const swing2 = Math.sin(u.walk + Math.PI) * stride * u.moving;

    u.legL.rotation.x = swing;
    u.legR.rotation.x = swing2;
    u.armL.rotation.x = swing2 * 0.7;
    u.armR.rotation.x = swing * 0.7;

    // 걸음마다 몸이 살짝 올라갔다 내려온다
    const bob = Math.abs(Math.sin(u.walk)) * 0.045 * u.moving;
    u.body.position.y = 0.34 + bob;
    u.body.rotation.z = Math.sin(u.walk) * 0.035 * u.moving;
    u.body.rotation.x = (sprinting ? 0.16 : 0.02) * u.moving;

    // 1인칭 헤드 바빙
    G.fpvBob = Math.sin(u.walk * 2) * (sprinting ? 0.035 : 0.02) * u.moving;

    // 서 있을 때는 아주 느리게 숨쉬는 느낌
    u.head.position.y = 0.64 + Math.sin(t * 1.6) * 0.006 * (1 - u.moving);
}

/******************************************************************
 * MOVEMENT
 * WASD / 방향키가 항상 우선. 마우스 클릭 이동도 지원.
 ******************************************************************/
export const prevPos = new THREE.Vector3();
export let sprinting = false;

export function updateMovement(delta) {
    if (!G.player) return false;

    prevPos.copy(G.player.position);
    const move = new THREE.Vector3();

    // 등각 시점 기준의 전후좌우
    const forward = new THREE.Vector3();
    G.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys.has("KeyW") || keys.has("ArrowUp")) move.add(forward);
    if (keys.has("KeyS") || keys.has("ArrowDown")) move.sub(forward);
    if (keys.has("KeyD") || keys.has("ArrowRight")) move.add(right);
    if (keys.has("KeyA") || keys.has("ArrowLeft")) move.sub(right);

    let usedDir = null;

    if (move.lengthSq() > 0) {
        G.clickTarget = null; // 키 입력이 클릭 이동보다 우선
        move.normalize();
        usedDir = move;
    } else if (G.clickTarget) {
        const to = new THREE.Vector3(
            G.clickTarget.x - G.player.position.x,
            0,
            G.clickTarget.z - G.player.position.z
        );

        if (to.length() < 0.15) {
            G.clickTarget = null;
        } else {
            to.normalize();
            usedDir = to;
        }
    }

    if (usedDir) {
        // Shift: 달리기. 스태미나가 있어야 달릴 수 있다.
        const wantSprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
        sprinting = wantSprint && G.stamina > 0;

        // 낮: 최대 스태미나 감소 (70%)
        const isNight = W.dayT < 0.22 || W.dayT > 0.88;
        G.maxStamina = isNight ? 70 : 100;

        const speed = PLAYER_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);

        // 스태미나 소모 / 회복
        if (sprinting) {
            G.stamina = Math.max(0, G.stamina - delta * 22);
        }

        G.player.position.addScaledVector(usedDir, speed * delta);
        G.player.position.x = THREE.MathUtils.clamp(G.player.position.x, -WORLD_LIMIT, WORLD_LIMIT);
        G.player.position.z = THREE.MathUtils.clamp(G.player.position.z, -WORLD_LIMIT, WORLD_LIMIT);

        // 진행 방향으로 머뢰 돌린다
        if (G.isFirstPerson) {
            G.player.rotation.y = G.fpvYaw + Math.PI;
        } else {
            const target = Math.atan2(usedDir.x, usedDir.z);
            let diff = target - G.player.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            G.player.rotation.y += diff * Math.min(1, delta * 12);
        }
    } else {
        // 몈춰 있으면 스태미나 회복
        G.stamina = Math.min(G.maxStamina, G.stamina + delta * 18);
        if (G.isFirstPerson) {
            G.player.rotation.y = G.fpvYaw + Math.PI;
        }
    }

    updateStaminaBar();

    if (!usedDir) sprinting = false;

    // 잠긴 구역 충돌
    for (const zone of G.lockedZones) {
        if (G.inventory.includes(zone.requiredItem)) continue; // 아이템 보유 시 통과
        const dx = G.player.position.x - zone.x;
        const dz = G.player.position.z - zone.z;
        if (Math.sqrt(dx * dx + dz * dz) < zone.radius) {
            G.player.position.copy(prevPos);
            if (!zone._warned) {
                zone._warned = true;
                // showMessage 이 프레임마다 호출 안 되도록 쿼다운 사용
                zone._warnTimeout = setTimeout(() => { zone._warned = false; }, 4000);
                import("./ui.js").then(m => m.showMessage("🔒 " + (zone.message || "이곳을 지나가려면 " + zone.requiredItem + "가 필요합니다.")));
            }
            break;
        }
    }

    // 물속으로는 들어가지 못한다 (전투도 수영도 없는 게임)
    const h = terrainHeight(G.player.position.x, G.player.position.z);
    if (h < -0.42) {
        G.player.position.copy(prevPos);
    } else {
        G.player.position.y = h;
    }

    return Boolean(usedDir);
}
