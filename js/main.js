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
import { rtsAnimate, simulate } from "./rts/loop.js";
import { startGame } from "./rts/map.js";
import { applyCamera } from "./rts/rtscam.js";
import { R } from "./rts/state.js";
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

const INTRO =
    `강 하나를 사이에 두고 두 마을이 앉았습니다.

주민(주)이 나무 · 돌 · 금을 모으고 먹을 것을 거둡니다.
집을 지으면 사람이 더 들어오고, 병영을 세우면 병사를 뽑습니다.
마을회관에서 시대를 열면 땅과 하늘과 건물이 다음 시대의 모습으로 바뀝니다.
신석기에서 2000년대까지 여섯 시대입니다.

적의 마을을 전부 없애면 이깁니다.

  왼쪽 클릭  고르기 (끌면 상자 선택)
  오른쪽 클릭  가기 · 캐기 · 치기 · 짓기
  방향키 / 화면 가장자리  시점 이동
  Q W E R T Y / A S D F G H  아래 명령 칸
  Ctrl+숫자 부대 묶기 · 숫자 불러오기 · Home 마을회관 · . 노는 주민`;

// 디버그용 손잡이 (콘솔에서 판을 들여다볼 때 쓴다)
window.RTS = { R, G, simulate, buildings: rtsBuildings, units: rtsUnits, control: rtsControl };

showOverlay("시간유적", "한국사 실시간 전략", INTRO, "시작", () => {
    hideOverlay();
    AudioSystem.start();
    R.started = true;
    logMessage("주민을 골라 나무를 캐게 하세요.");
});
