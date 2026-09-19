/**
 * 시간유적 — 진입점.
 *
 * three.min.js 는 index.html 에서 전역 THREE 로 먼저 불러온다.
 */
import { AGE_DATA } from "./config.js";
import { initThree } from "./renderer.js";
import { setupInput } from "./input.js";
import { buildAge } from "./eras/build.js";
import { buildPrologue } from "./prologue.js";
import { animate } from "./loop.js";

initThree();
setupInput();

// 개발 편의: index.html?era=1 로 특정 시대부터 시작할 수 있다 (?era=prologue 제외)
const eraParam = new URLSearchParams(location.search).get("era");
if (eraParam === "prologue") {
    buildPrologue();
} else if (eraParam !== null) {
    const startEra = THREE.MathUtils.clamp(
        parseInt(eraParam, 10) || 0,
        0, AGE_DATA.length - 1
    );
    buildAge(startEra);
} else {
    // 기본: 현대 프롤로그(밤 골목) → 낯선 돌 → 신석기
    buildPrologue();
}
animate();

