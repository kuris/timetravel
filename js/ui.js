/**
 * UI — DOM 참조, 메시지창, 인벤토리, 상단 정보
 */
import { AGE_DATA } from "./config.js";
import { G , progressGoal } from "./state.js";
import { weatherLabel } from "./weather.js";

export const dom = {
    game: document.getElementById("game"),
    eraText: document.getElementById("eraText"),
    objectiveText: document.getElementById("objectiveText"),
    countText: document.getElementById("countText"),
    weatherText: document.getElementById("weatherText"),
    woodText: document.getElementById("woodText"),
    stoneText: document.getElementById("stoneText"),
    progressText: document.getElementById("progressText"),
    prompt: document.getElementById("prompt"),
    message: document.getElementById("message"),
    slots: [...document.querySelectorAll(".slot")],
    flash: document.getElementById("flash"),
    glitch: document.getElementById("glitch"),
    completeOverlay: document.getElementById("completeOverlay"),
    minimap: document.getElementById("minimap"),
    hintBtn: document.getElementById("hintBtn"),
    signpost: document.getElementById("signpost"),
    signArrow: document.getElementById("signArrow"),
    signText: document.getElementById("signText"),
    signDist: document.getElementById("signDist"),
    timeBtn: document.getElementById("timeBtn"),
    weatherBtn: document.getElementById("weatherBtn")
};

/**
 * 상단 자원 표시.
 *
 * 값이 바뀔 때만 다시 쓰고, 바뀐 숫자는 한 번 튀게 한다.
 * 나무 하나가 늘어난 것을 눈이 잡아야 채집이 일처럼 느껴진다.
 */
function setResource(el, text) {
    if (!el || el.textContent === text) return;
    el.textContent = text;
    el.classList.remove("bump");
    void el.offsetWidth; // 애니메이션을 처음부터 다시 돌린다
    el.classList.add("bump");
}

export function updateResourceUI() {
    setResource(dom.woodText, String(G.materials.wood));
    setResource(dom.stoneText, String(G.materials.stone));
    setResource(dom.progressText, G.progress + " / " + progressGoal());
}

export function showMessage(text) {
    dom.message.textContent = text;
}

export function addInventoryItem(name) {
    G.inventory.push(name);
    updateUI();
}

export function updateUI() {
    // 프롤로그는 자기 문구를 직접 쓴다 (G.currentAge 가 -1 이라 시대 정보가 없다)
    const age = AGE_DATA[G.currentAge];
    if (!age) return;

    dom.eraText.textContent = age.name;

    // 목표는 "유물 몇 개"가 아니라 마을이 얼마나 자랐는가다.
    // 무엇을 지을지는 플레이어가 고르므로 목표 문구도 그에 맞춘다.
    let goal = "빈 땅에서 [E] — 마을을 세우세요";
    if (G.activeGate && G.activeGate.active) {
        goal = "깨어난 시간의 문 근처에서 E를 누르세요.";
    } else if (G.progress > 0) {
        goal = "마을을 더 키우세요 (발전도 " + (progressGoal() - G.progress) + " 남음)";
    }
    if (G.demoFinished) {
        goal = "데모 완료";
    }

    dom.objectiveText.textContent = goal;
    dom.countText.textContent = G.ageProgress + " / " + age.total;
    updateResourceUI();
    dom.weatherText.textContent = weatherLabel();

    const visibleItems = G.inventory.slice(-5);
    for (let i = 0; i < dom.slots.length; i++) {
        const item = visibleItems[i];
        dom.slots[i].textContent = item || "";
        dom.slots[i].classList.toggle("filled", Boolean(item));
    }
}
