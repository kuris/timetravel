/**
 * 렌더러 / 등각 카메라 초기화
 */
import { RENDER_SCALE, VIEW_SIZE } from "./config.js";
import { initPost, postMaterial, renderTarget } from "./postprocess.js";
import { INPUT } from "./rts/input.js";
import { G, cameraOffset } from "./state.js";
import { dom } from "./ui.js";

export function initThree() {
    G.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance"
    });

    G.renderer.setPixelRatio(1);

    // 좁은 화면에서는 처음부터 조금 당겨 본다. 손가락으로 집으려면 유닛이 커야 한다.
    if (!G.viewSize) G.viewSize = INPUT.small ? VIEW_SIZE * 0.66 : VIEW_SIZE;
    G.renderer.shadowMap.enabled = true;
    G.renderer.shadowMap.type = THREE.PCFShadowMap;

    if ("outputColorSpace" in G.renderer) {
        // 최종 출력은 셰이더가 직접 만든 sRGB 값을 그대로 내보낸다.
        G.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    }

    dom.game.appendChild(G.renderer.domElement);

    // CAMERA: 고정 등각(Isometric) 및 1인칭(Perspective)
    G.isoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 260);
    G.isoCamera.position.copy(cameraOffset);
    G.isoCamera.lookAt(0, 0, 0);

    const aspect = window.innerWidth / window.innerHeight;
    G.fpvCamera = new THREE.PerspectiveCamera(72, aspect, 0.08, 200);

    G.camera = G.isFirstPerson ? G.fpvCamera : G.isoCamera;

    initPost();

    window.addEventListener("resize", resizeRenderer);
    resizeRenderer();
}

/** 지금의 시야 크기 (확대/축소를 반영한다) */
export function viewSize() {
    return G.viewSize || VIEW_SIZE;
}

export function resizeRenderer() {
    // 내부 렌더링 해상도를 낮춰서 굵은 픽셀을 만든다.
    const w = Math.max(320, Math.floor(window.innerWidth * RENDER_SCALE));
    const h = Math.max(200, Math.floor(window.innerHeight * RENDER_SCALE));

    G.renderer.setSize(w, h, false);
    renderTarget.setSize(w, h);
    postMaterial.uniforms.uRes.value.set(w, h);

    const aspect = window.innerWidth / window.innerHeight;
    const view = viewSize();

    if (G.isoCamera) {
        G.isoCamera.left = -view * aspect * 0.5;
        G.isoCamera.right = view * aspect * 0.5;
        G.isoCamera.top = view * 0.5;
        G.isoCamera.bottom = -view * 0.5;
        G.isoCamera.updateProjectionMatrix();
    }

    if (G.fpvCamera) {
        G.fpvCamera.aspect = aspect;
        G.fpvCamera.updateProjectionMatrix();
    }
}
