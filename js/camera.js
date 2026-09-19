/**
 * 카메라 — 고정 등각 추적 및 1인칭 시점 지원
 */
import { G, cameraOffset, cameraTarget } from "./state.js";

const fpvEuler = new THREE.Euler(0, 0, 0, "YXZ");

export function updateCamera(delta, immediate = false) {
    if (!G.player) return;

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

    G.isoCamera.position.copy(cameraTarget).add(cameraOffset);
    G.isoCamera.lookAt(cameraTarget);

    // 배경판은 항상 지평선에 붙어 있어야 하므로 카메라를 따라다닌다
    if (G.backdrop) {
        G.backdrop.position.x = cameraTarget.x;
        G.backdrop.position.z = cameraTarget.z;
    }

    // 그림자 카메라를 플레이어 주변에 집중시켜 해상도를 아낀다
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

export function toggleViewMode() {
    if (G.transitioning || G.demoFinished || !G.player) return;

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
