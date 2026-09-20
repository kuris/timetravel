/**
 * util.js — RTS 잡동사니
 */
import { RIVER, riverPerp } from "../landmarks.js";
import { G, groundPlane, mouse, raycaster } from "../state.js";
import { terrainHeight } from "../terrain.js";

/**
 * 못 지나가는 물.
 *
 * terrain.isUnderwater 는 "높이가 -0.22 보다 낮은 곳"이라서,
 * 강에서 멀리 떨어진 자연스러운 웅덩이까지 물로 친다.
 * 탐험 모드에서는 풀을 안 심는 정도의 문제였지만, 여기서는
 * 주민이 그 앞에서 멈춰 선다. 그래서 물은 강으로만 친다.
 */
export function isWater(x, z) {
    return riverPerp(x, z) < RIVER.bank + 1.2 && terrainHeight(x, z) < -0.18;
}

/**
 * 오브젝트 하나를 버린다.
 *
 * morph.disposeGroup 은 텍스처까지 버리는데, 그건 시대를 통째로 갈아엎을 때 쓴다.
 * 여기서 쓰면 G.TEX 를 함께 쓰는 다른 건물까지 하얗게 날아간다.
 */
export function disposeObj(obj) {
    if (!obj) return;
    obj.traverse((child) => {
        if (child.geometry && !child.geometry.userData.shared) child.geometry.dispose();
        if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const m of mats) m.dispose();
        }
    });
    if (obj.parent) obj.parent.remove(obj);
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function dist(ax, az, bx, bz) {
    return Math.hypot(ax - bx, az - bz);
}

/** 화면 좌표(px) -> 땅 위의 월드 좌표 */
export function screenToWorld(clientX, clientY) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, G.camera);

    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
    hit.y = terrainHeight(hit.x, hit.z);
    return hit;
}

const _v = new THREE.Vector3();

/** 월드 좌표 -> 화면 좌표(px). 유닛 고르기는 이걸로 한다. */
export function worldToScreen(x, y, z) {
    _v.set(x, y, z).project(G.camera);
    return {
        x: (_v.x * 0.5 + 0.5) * window.innerWidth,
        y: (-_v.y * 0.5 + 0.5) * window.innerHeight,
        z: _v.z
    };
}

/**
 * 여럿을 한 점으로 보낼 때 쓰는 대형.
 * 전부 같은 자리로 보내면 서로 밀어내느라 춤을 춘다.
 */
export function formation(count, spacing = 1.05) {
    const out = [];
    if (count === 1) return [[0, 0]];

    let placed = 0, ring = 0;
    while (placed < count) {
        const n = ring === 0 ? 1 : ring * 6;
        for (let i = 0; i < n && placed < count; i++) {
            const a = (i / n) * Math.PI * 2;
            out.push([Math.cos(a) * ring * spacing, Math.sin(a) * ring * spacing]);
            placed++;
        }
        ring++;
    }
    return out;
}
