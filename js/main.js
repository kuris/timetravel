/**
 * 시간유적 — 진입점 (실시간 전략)
 *
 * 한국사 여섯 시대를 시대(Age)로 삼은 Age of Empires 식 단일 플레이다.
 * 같은 강가에서 두 진영이 마을을 세우고, 모으고, 싸우고, 시대를 연다.
 *
 * three.min.js 는 index.html 에서 전역 THREE 로 먼저 불러온다.
 */
import { AudioSystem } from "./audio.js";
import { generateBaseMap } from "./basemap.js";
import { initThree } from "./renderer.js";
import { G } from "./state.js";
import { resetAI } from "./rts/ai.js";
import { initControls, minimapHandlers, refreshCommands } from "./rts/control.js";
import { hideOverlay, initHud, logMessage, showOverlay } from "./rts/hud.js";
import { INPUT } from "./rts/input.js";
import { rtsAnimate, simulate } from "./rts/loop.js";
import { startGame } from "./rts/map.js";
import { applyCamera } from "./rts/rtscam.js";
import { R } from "./rts/state.js";
import * as rtsTutorial from "./rts/tutorial.js";
import { startTutorial } from "./rts/tutorial.js";
import * as rtsBuildings from "./rts/buildings.js";
import * as rtsUnits from "./rts/units.js";
import * as rtsControl from "./rts/control.js";

initThree();
initHud(minimapHandlers);
initControls();

// 여섯 시대가 함께 쓰는 자연 지형. ?seed= 로 고정할 수 있다.
const seedParam = parseInt(new URLSearchParams(location.search).get("seed"), 10);
G.runSeed = Number.isFinite(seedParam) ? seedParam : 20260920;
generateBaseMap(G.runSeed);

startGame();
resetAI();
applyCamera();
refreshCommands();
rtsAnimate();

const INTRO_MOUSE =
    `  왼쪽 클릭  고르기 (끌면 상자 선택)
  오른쪽 클릭  가기 · 캐기 · 치기 · 짓기
  화면 가장자리 / 방향키  시점 이동 · 휠  확대
  아래 명령 칸을 눌러도 되고 Q W E R T Y / A S D F G H 로 눌러도 됩니다
  위쪽 [회관] [노는 주민] [사건] 단추, 왼쪽 아래 부대 칸 —
  자판 없이 마우스만으로도 전부 할 수 있습니다`;

const INTRO_TOUCH =
    `  톡  고르기 (고른 것이 있으면 그 자리가 명령이 됩니다)
  끌기  시점 이동 · 두 손가락  확대 · 축소
  길게 눌렀다 끌기  상자 선택
  아래 명령 칸과 위쪽 [회관] [노는 주민] [사건] 단추로 나머지를 합니다`;

const INTRO =
    `강 하나를 사이에 두고 두 마을이 앉았습니다.

주민(주)이 나무 · 돌 · 금을 모으고 먹을 것을 거둡니다.
집을 지으면 사람이 더 들어오고, 병영을 세우면 병사를 뽑습니다.
마을회관에서 시대를 열면 땅과 하늘과 건물이 다음 시대의 모습으로 바뀝니다.
신석기에서 2000년대까지 여섯 시대입니다.

적의 마을을 전부 없애면 이깁니다.

` + (INPUT.touch ? INTRO_TOUCH : INTRO_MOUSE) + `

처음이라면 [튜토리얼] 로 시작하세요. 판 위에서 열두 걸음을 일러 줍니다.
안내가 도는 동안에는 적이 쳐들어오지 않습니다.
위쪽 [안내] 단추(F1)로 언제든 열고 닫습니다.`;

// 디버그용 손잡이 (콘솔에서 판을 들여다볼 때 쓴다)
window.RTS = {
    R, G, simulate,
    buildings: rtsBuildings, units: rtsUnits, control: rtsControl, tutorial: rtsTutorial
};

function begin(tutorial) {
    hideOverlay();
    AudioSystem.start();
    R.started = true;
    if (tutorial) startTutorial();
    else logMessage(INPUT.touch
        ? "주민을 톡 누르고 나무를 누르세요. (위쪽 [안내])"
        : "주민을 골라 나무를 캐게 하세요. (F1 — 안내)");
}

showOverlay(
    "시간유적", "한국사 실시간 전략", INTRO,
    "바로 시작", () => begin(false),
    { label: "튜토리얼", onClick: () => begin(true) }
);
