/**
 * 시간유적 — 진입점.
 *
 * 한반도의 같은 강가를 여섯 시대가 나눠 쓴다.
 * 플레이어는 그 땅 위를 걸어 다니며 조사하고, 시간의 문으로 시대를 건넌다.
 * 시작은 삼국시대다. 신석기와 청동기는 이 이야기의 "그 전"이라,
 * 단서가 그리로 데려갈 때에만 열린다.
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
import { transitionToAge } from "./transition.js";
import { G } from "./state.js";

initThree();
setupInput();

// 여섯 시대가 함께 쓸 자연 지형을 먼저 만든다.
// 한 판에 한 번뿐이라, 시대를 오가도 강과 바위는 그 자리에 그대로 있다.
// 이 게임이 시간 여행물일 수 있는 것은 순전히 이 한 줄 덕분이다.
// ?seed= 로 고정할 수 있다 (같은 값이면 언제나 같은 땅).
const params = new URLSearchParams(location.search);
const seedParam = parseInt(params.get("seed"), 10);
G.runSeed = Number.isFinite(seedParam) ? seedParam : 20260920;
generateBaseMap(G.runSeed);

/** 이야기가 시작되는 시대. 조선(3) 단일 시대. */
export const START_AGE = 3;

/**
 * 시대를 건넌다.
 *
 * 앞으로도 뒤로도 간다. 가진 것과 알아낸 것은 따라온다 (build.js 참고).
 * 같은 시대를 다시 고르면 아무 일도 없다.
 */
export function travel(index, opts = {}) {
    const to = THREE.MathUtils.clamp(index | 0, 0, AGE_DATA.length - 1);
    if (to === G.currentAge || G.transitioning) return false;
    transitionToAge(to, opts);
    return true;
}

const eraParam = params.get("era");
if (eraParam === "prologue") {
    buildPrologue();
} else if (eraParam !== null) {
    buildAge(THREE.MathUtils.clamp(parseInt(eraParam, 10) || 0, 0, AGE_DATA.length - 1));
} else {
    buildAge(START_AGE);
}
animate();

// 디버그용 손잡이 (콘솔에서 판을 들여다볼 때 쓴다)
window.TR = { G, buildAge, travel, AGE_DATA };
