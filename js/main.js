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
import { generateBaseMap } from "./basemap.js";
import { G } from "./state.js";

initThree();
setupInput();

// 여섯 시대가 함께 쓸 자연 지형을 먼저 만든다.
// 한 판에 한 번뿐이라, 시대를 오가도 바위와 나무는 그 자리에 그대로 있다.
// ?seed= 로 고정할 수 있다 (같은 값이면 언제나 같은 땅).
const seedParam = parseInt(new URLSearchParams(location.search).get("seed"), 10);
G.runSeed = Number.isFinite(seedParam) ? seedParam : 20260920;
generateBaseMap(G.runSeed);

// 시작은 언제나 선사시대의 빈 땅이다 (AoE 처럼, 아무것도 없는 데서 시작한다).
// 현대 프롤로그(밤 귀갓길)는 ?era=prologue 로만 볼 수 있게 남겨 둔다.
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
    // 기본: 신석기 빈 들판
    buildAge(0);
}
animate();

