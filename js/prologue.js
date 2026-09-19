/**
 * 프롤로그 — 마지막 현대 맵(2000년)에서 시작하는 귀갓길.
 *
 * 흐름: 2000년 밤 맵(prologue2000) → 낯선 돌 1개 조사 → 신석기로 전이.
 * 별도 골목 맵을 두지 않고 마지막 시대 맵을 재사용해 고리를 닫는다.
 */
import { buildAge } from "./eras/build.js";
import { addJournalEntry } from "./journal.js";
import { G } from "./state.js";
import { dom, showMessage } from "./ui.js";

const PROLOGUE_INTRO = "밤 11시. 집에 가던 길이다.\n평소엔 없던 돌이 길 한가운데 서 있다.\n가까이 가서 조사해 보자.";
const PROLOGUE_GOAL = "길 한가운데 낯선 돌을 조사하세요.";

export function buildPrologue() {
    G.prologue = true;
    G.prologueDone = false;

    // 2000년 맵을 프롤로그 모드로 빌드 (낯선 돌 1개만)
    buildAge(5, { prologue2000: true });

    // buildAge가 잠금을 풀었으므로 프롤로그 플래그 복원
    G.prologue = true;
    G.currentAge = -1;
    G.ageProgress = 0;
    G.ageCompleteTriggered = false;

    dom.eraText.textContent = "현대 · 귀갓길 (밤)";
    dom.objectiveText.textContent = PROLOGUE_GOAL;
    dom.countText.textContent = G.ageProgress + " / 1";
    showMessage(PROLOGUE_INTRO + "\n첫 키 입력 또는 클릭 후 소리가 켜집니다.");
}

/** 프롤로그 전용 조사 후처리 — Journal 기록 + 기절 연출 후 신석기로 */
export function finishPrologue(item) {
    if (!G.prologue) return false;
    addJournalEntry("system", "낯선 돌", item.description);
    showMessage(item.description + "\n\n정신을 잃었다…\n눈을 뜨니 강물 소리가 들린다.");
    G.ageProgress = 1;
    dom.countText.textContent = G.ageProgress + " / 1";

    setTimeout(() => {
        import("./transition.js").then((m) => m.transitionToAge(0, { fromPrologue: true }));
    }, 1600);
    return true;
}
