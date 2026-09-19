/**
 * 카메라 — 고정 등각 추적
 */
import { G, cameraOffset, cameraTarget } from "./state.js";

export function updateCamera(delta, immediate = false) {
    if (!G.player) return;

    const desired = new THREE.Vector3(G.player.position.x, 0.6, G.player.position.z);

    if (immediate) {
        cameraTarget.copy(desired);
    } else {
        // 살짝 지연되며 따라가서 "지도를 훑는" 느낌을 준다
        const t = 1 - Math.pow(0.0025, delta);
        cameraTarget.lerp(desired, t);
    }

    G.camera.position.copy(cameraTarget).add(cameraOffset);
    G.camera.lookAt(cameraTarget);

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
