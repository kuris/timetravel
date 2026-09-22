/**
 * 카메라 — 고정 등각 추적 및 1인칭 시점 지원
 */
import { G, cameraOffset, cameraTarget } from "./state.js";

const fpvEuler = new THREE.Euler(0, 0, 0, "YXZ");
const shotNPCPos = new THREE.Vector3();
const shotDesired = new THREE.Vector3();
const shotLook = new THREE.Vector3();

/**
 * 위처·폴아웃식 대화 샷. 조작 1인칭이 아니라 플레이어 어깨 너머에서
 * 상대를 바라보는 짧은 시네마틱 카메라다.
 */
export function startDialogueShot(npc) {
    if (!G.player || !npc?.group || !G.fpvCamera) return;

    npc.group.getWorldPosition(shotNPCPos);
    const dx = G.player.position.x - shotNPCPos.x;
    const dz = G.player.position.z - shotNPCPos.z;
    const len = Math.hypot(dx, dz) || 1;
    const awayX = dx / len;
    const awayZ = dz / len;

    // 대화 상대가 플레이어 쪽으로 몸을 돌려, 초상과 월드 인물이 같은 장면을 만든다.
    npc.group.rotation.y = Math.atan2(dx, dz);

    // 플레이어 뒤쪽으로 반 걸음, 살짝 옆으로 비켜 선 어깨 너머 구도.
    shotDesired.set(
        G.player.position.x + awayX * 0.78 - awayZ * 0.32,
        G.player.position.y + 1.16,
        G.player.position.z + awayZ * 0.78 + awayX * 0.32
    );
    shotLook.set(shotNPCPos.x, shotNPCPos.y + (npc.isAnimal ? 0.42 : 0.70), shotNPCPos.z);

    const anim = npc.group.userData?.anim;
    G.dialogueShot = {
        npc,
        start: G.camera ? G.camera.position.clone() : shotDesired.clone(),
        desired: shotDesired.clone(),
        look: shotLook.clone(),
        u: 0,
        fromFov: G.fpvCamera.fov,
        pausedNPC: anim || null,
        oldPause: anim ? anim.pauseLeft : 0
    };

    // 카메라가 바라보는 동안 NPC가 멀어지지 않게 한다.
    if (anim) anim.pauseLeft = 999;
    G.player.visible = true;
    if (G.player.userData.markerRing) G.player.userData.markerRing.visible = false;
    if (G.player.userData.markerDot) G.player.userData.markerDot.visible = false;
}

export function stopDialogueShot() {
    const shot = G.dialogueShot;
    if (!shot) return;
    if (shot.pausedNPC) shot.pausedNPC.pauseLeft = shot.oldPause;
    G.dialogueShot = null;
    if (G.fpvCamera) {
        G.fpvCamera.fov = 72;
        G.fpvCamera.updateProjectionMatrix();
    }
    if (G.player) {
        G.player.visible = !G.isFirstPerson;
        if (G.player.userData.markerRing) G.player.userData.markerRing.visible = !G.isFirstPerson;
        if (G.player.userData.markerDot) G.player.userData.markerDot.visible = !G.isFirstPerson;
    }
}

function applyDialogueRig(delta) {
    const shot = G.dialogueShot;
    if (!shot || !G.fpvCamera) return;

    // NPC의 작은 숨쉬기/회전에도 시선이 따라간다.
    if (shot.npc?.group) {
        shot.npc.group.getWorldPosition(shotNPCPos);
        shot.look.set(shotNPCPos.x, shotNPCPos.y + (shot.npc.isAnimal ? 0.42 : 0.70), shotNPCPos.z);
    }
    shot.u = Math.min(1, shot.u + delta / 0.28);
    const k = shot.u * shot.u * (3 - 2 * shot.u);
    G.camera = G.fpvCamera;
    G.fpvCamera.position.lerpVectors(shot.start, shot.desired, k);
    G.fpvCamera.lookAt(shot.look);
    const fov = shot.fromFov + (54 - shot.fromFov) * k;
    if (Math.abs(G.fpvCamera.fov - fov) > 0.02) {
        G.fpvCamera.fov = fov;
        G.fpvCamera.updateProjectionMatrix();
    }

    if (G.backdrop) {
        G.backdrop.position.x = shot.look.x;
        G.backdrop.position.z = shot.look.z;
    }
}

function applyIsoRig() {
    G.camera = G.isoCamera;
    G.isoCamera.position.copy(cameraTarget).add(cameraOffset);
    G.isoCamera.lookAt(cameraTarget);

    if (G.backdrop) {
        G.backdrop.position.x = cameraTarget.x;
        G.backdrop.position.z = cameraTarget.z;
    }

    if (G.sunLight) {
        G.sunLight.position.set(
            cameraTarget.x + G.sunLight.userData.ox,
            G.sunLight.userData.oy,
            cameraTarget.z + G.sunLight.userData.oz
        );
        G.sunLight.target.position.set(cameraTarget.x, 0, cameraTarget.z);
        G.sunLight.target.updateMatrixWorld();
    }
}

export function updateCamera(delta, immediate = false) {
    if (!G.player) return;

    if (G.cinematic) {
        applyIsoRig();
        return;
    }

    if (G.dialogueShot) {
        applyDialogueRig(delta);
        return;
    }

    if (G.isFirstPerson && G.fpvCamera) {
        G.camera = G.fpvCamera;

        // 1인칭: 플레이어의 눈높이에 카메라 배치 (헤드 바빙 적용)
        const eyeY = G.player.position.y + 0.95 + (G.fpvBob || 0);
        G.fpvCamera.position.set(G.player.position.x, eyeY, G.player.position.z);

        // 오일러(YXZ) 기반 1인칭 회전
        fpvEuler.set(G.fpvPitch, G.fpvYaw, 0);
        G.fpvCamera.quaternion.setFromEuler(fpvEuler);

        // 배경판도 플레이어를 따라다닌다
        if (G.backdrop) {
            G.backdrop.position.x = G.player.position.x;
            G.backdrop.position.z = G.player.position.z;
        }

        // 그림자 라이트
        if (G.sunLight) {
            G.sunLight.position.set(
                G.player.position.x + G.sunLight.userData.ox,
                G.sunLight.userData.oy,
                G.player.position.z + G.sunLight.userData.oz
            );
            G.sunLight.target.position.set(G.player.position.x, 0, G.player.position.z);
            G.sunLight.target.updateMatrixWorld();
        }
        return;
    }

    // 3인칭 쿼터뷰 (기존 등각 카메라)
    G.camera = G.isoCamera;
    const desired = new THREE.Vector3(G.player.position.x, 0.6, G.player.position.z);

    if (immediate) {
        cameraTarget.copy(desired);
    } else {
        // 살짝 지연되며 따라가서 "지도를 훑는" 느낌을 준다
        const t = 1 - Math.pow(0.0025, delta);
        cameraTarget.lerp(desired, t);
    }

    applyIsoRig();
}

export function toggleViewMode() {
    if (G.cinematic || G.transitioning || G.demoFinished || !G.player) return;

    G.isFirstPerson = !G.isFirstPerson;
    G.camera = G.isFirstPerson ? G.fpvCamera : G.isoCamera;

    if (G.player) {
        G.player.visible = !G.isFirstPerson;
    }

    const crosshair = document.getElementById("crosshair");

    if (G.isFirstPerson) {
        // 1인칭 진입: 플레이어의 현재 진행 방향을 바라보도록 초기 yaw 설정
        G.fpvYaw = G.player.rotation.y + Math.PI;
        G.fpvPitch = -0.05;

        // 포인터 락 요청
        G.renderer.domElement.requestPointerLock?.();
        document.body.classList.add("fpv-mode");
        if (crosshair) crosshair.classList.remove("hidden");
    } else {
        // 3인칭 복귀
        if (document.pointerLockElement) {
            document.exitPointerLock?.();
        }
        document.body.classList.remove("fpv-mode");
        if (crosshair) crosshair.classList.add("hidden");
        updateCamera(0, true);
    }
}
