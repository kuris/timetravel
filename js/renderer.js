/**
 * 렌더러 / 등각 카메라 초기화
 */
import { RENDER_SCALE, VIEW_SIZE } from "./config.js";
import { initPost, postMaterial, renderTarget } from "./postprocess.js";
import { G, cameraOffset } from "./state.js";
import { dom } from "./ui.js";

export function initThree() {
    G.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance"
    });

    G.renderer.setPixelRatio(1);
    G.renderer.shadowMap.enabled = true;
    G.renderer.shadowMap.type = THREE.PCFShadowMap;

    if ("outputColorSpace" in G.renderer) {
        // 최종 출력은 셰이더가 직접 만든 sRGB 값을 그대로 내보낸다.
        G.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    }

    dom.game.appendChild(G.renderer.domElement);

    // CAMERA: 고정 등각(Isometric). 절대 캐릭터 뒤를 따라가지 않는다.
    G.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 260);
    G.camera.position.copy(cameraOffset);
    G.camera.lookAt(0, 0, 0);

    initPost();

    window.addEventListener("resize", resizeRenderer);
    resizeRenderer();
}

export function resizeRenderer() {
    // 내부 렌더링 해상도를 낮춰서 굵은 픽셀을 만든다.
    const w = Math.max(320, Math.floor(window.innerWidth * RENDER_SCALE));
    const h = Math.max(200, Math.floor(window.innerHeight * RENDER_SCALE));

    G.renderer.setSize(w, h, false);
    renderTarget.setSize(w, h);
    postMaterial.uniforms.uRes.value.set(w, h);

    const aspect = window.innerWidth / window.innerHeight;
    G.camera.left = -VIEW_SIZE * aspect * 0.5;
    G.camera.right = VIEW_SIZE * aspect * 0.5;
    G.camera.top = VIEW_SIZE * 0.5;
    G.camera.bottom = -VIEW_SIZE * 0.5;
    G.camera.updateProjectionMatrix();
}
