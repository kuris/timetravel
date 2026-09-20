/**
 * rtscam.js — RTS 카메라
 *
 * 따라다닐 주인공이 없다. 지도를 훑는 눈만 있다.
 * 화면 가장자리 · 방향키 · 미니맵으로 움직이고, 시점은 절대 돌지 않는다.
 */
import { VIEW_SIZE } from "../config.js";
import { G, cameraOffset, cameraTarget, keys } from "../state.js";
import { MAP_R } from "./units.js";
import { clamp } from "./util.js";

export const CAM = {
    speed: 26,
    edge: 14,          // 가장자리 스크롤이 먹는 폭 (px)
    mouseX: -1,
    mouseY: -1,
    inWindow: false,
    desired: new THREE.Vector3()
};

/** 등각 화면에서의 "오른쪽" 과 "위쪽" 을 월드 방향으로 */
const RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const UP = new THREE.Vector3(-1, 0, -1).normalize();

export function centerCamera(x, z) {
    cameraTarget.set(x, 0.6, z);
    applyCamera();
}

export function panCamera(dx, dz) {
    cameraTarget.x = clamp(cameraTarget.x + dx, -MAP_R, MAP_R);
    cameraTarget.z = clamp(cameraTarget.z + dz, -MAP_R, MAP_R);
}

export function updateRtsCamera(dt, blockEdge = false) {
    let mx = 0, my = 0;

    // 방향키로 훑는다. (글자 키는 AoE 처럼 명령 단축키로 쓴다)
    if (keys.has("ArrowUp")) my += 1;
    if (keys.has("ArrowDown")) my -= 1;
    if (keys.has("ArrowRight")) mx += 1;
    if (keys.has("ArrowLeft")) mx -= 1;

    // 화면 가장자리 스크롤
    if (!blockEdge && CAM.inWindow) {
        if (CAM.mouseX < CAM.edge) mx -= 1;
        else if (CAM.mouseX > window.innerWidth - CAM.edge) mx += 1;
        if (CAM.mouseY < CAM.edge) my += 1;
        else if (CAM.mouseY > window.innerHeight - CAM.edge) my -= 1;
    }

    if (mx || my) {
        const sp = CAM.speed * dt * (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1.9 : 1);
        cameraTarget.x += (RIGHT.x * mx + UP.x * my) * sp;
        cameraTarget.z += (RIGHT.z * mx + UP.z * my) * sp;
        cameraTarget.x = clamp(cameraTarget.x, -MAP_R, MAP_R);
        cameraTarget.z = clamp(cameraTarget.z, -MAP_R, MAP_R);
    }

    applyCamera();
}

export function applyCamera() {
    if (!G.isoCamera) return;
    G.camera = G.isoCamera;
    G.isoCamera.position.copy(cameraTarget).add(cameraOffset);
    G.isoCamera.lookAt(cameraTarget);

    if (G.backdrop) {
        G.backdrop.position.x = cameraTarget.x;
        G.backdrop.position.z = cameraTarget.z;
    }

    // 그림자 카메라를 화면 가운데에 모아 해상도를 아낀다
    if (G.sunLight && G.sunLight.userData) {
        const u = G.sunLight.userData;
        G.sunLight.position.set(cameraTarget.x + (u.ox ?? 0), u.oy ?? 18, cameraTarget.z + (u.oz ?? 0));
        G.sunLight.target.position.set(cameraTarget.x, 0, cameraTarget.z);
        G.sunLight.target.updateMatrixWorld();
    }
}

/** 미니맵과 화면을 잇는 값: 등각 화면의 세로 압축률 */
export const ISO_SQUASH = cameraOffset.y /
    Math.hypot(cameraOffset.x, cameraOffset.z, cameraOffset.y);

export const VIEW = VIEW_SIZE;
