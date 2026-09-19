/**
 * 지형 — 높이 계산과 물 판정
 */
import { fbm, smooth } from "./noise.js";
import { G } from "./state.js";

export const TERRAIN = {
    flatRadius: 15,  // 이 반경 안쪽은 평지 (오브젝트 배치가 안정적)
    falloff: 26,     // 이 반경부터 굴곡이 최대
    amplitude: 3.4
};

/** 물속이면 true — 풀/돌/나무를 놓지 않는다 */
export function isUnderwater(x, z) {
    return terrainHeight(x, z) < -0.22;
}

/** 물가 근처인지 (나무는 물가에서 조금 떨어져 자란다) */
export function isNearWater(x, z) {
    return isUnderwater(x, z) ||
        isUnderwater(x + 2.6, z + 2.6) ||
        isUnderwater(x - 2.6, z - 2.6);
}

export function terrainHeight(x, z) {
    const d = Math.hypot(x, z);
    let h = 0;

    if (d > TERRAIN.flatRadius) {
        // 평지 -> 언덕으로 부드럽게 전이
        let t = (d - TERRAIN.flatRadius) / (TERRAIN.falloff - TERRAIN.flatRadius);
        t = smooth(THREE.MathUtils.clamp(t, 0, 1));

        const n = fbm(x * 0.045 + 11.3, z * 0.045 + 7.9, 4) - 0.5;
        h = n * TERRAIN.amplitude * t;
    }

    return G.terrainCarve ? G.terrainCarve(x, z, h) : h;
}
