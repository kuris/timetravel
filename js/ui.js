/**
 * UI — DOM 참조, 메시지창, 인벤토리, 상단 정보
 */
import { advisor } from "./advisor.js";
import { AGE_DATA } from "./config.js";
import { G } from "./state.js";
import { weatherLabel } from "./weather.js";

export const dom = {
    game: document.getElementById("game"),
    eraText: document.getElementById("eraText"),
    objectiveText: document.getElementById("objectiveText"),
    countText: document.getElementById("countText"),
    weatherText: document.getElementById("weatherText"),
    popText: document.getElementById("popText"),
    woodText: document.getElementById("woodText"),
    stoneText: document.getElementById("stoneText"),
    progressText: document.getElementById("progressText"),
    prompt: document.getElementById("prompt"),
    message: document.getElementById("message"),
    slots: [...document.querySelectorAll("#relicSlots .slot")],
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
}

/**
 * 한국어 조사 고르기 — "집을 / 창고를" 처럼 받침에 따라 갈라진다.
 * "을(를)" 같은 표기는 안내문을 읽다 걸리게 만든다.
 */
export function josa(word, pair = "을/를") {
    const [withJong, without] = pair.split("/");
    const code = String(word).charCodeAt(String(word).length - 1);
    if (code < 0xac00 || code > 0xd7a3) return without;
    return (code - 0xac00) % 28 !== 0 ? withJong : without;
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
    // 지금 당장 무엇을 하면 되는지는 advisor 가 한 줄로 정해 준다.
    // 끝난 목표는 줄을 그어 "해냈다"가 눈에 보이게 한다.
    const goal = advisor();
    dom.objectiveText.textContent = goal.text;
    dom.objectiveText.classList.toggle("done", !!goal.done);
    dom.countText.textContent = G.ageProgress + " / " + age.total;
    updateResourceUI();
    dom.weatherText.textContent = weatherLabel();

    const icons = { "부러진 마패": "🎖️", "수탈 장부": "📜", "장승 밑 탄원서": "🗿" };
    const visibleItems = G.inventory.slice(-3);
    for (let i = 0; i < dom.slots.length; i++) {
        const item = visibleItems[i];
        dom.slots[i].textContent = item ? ((icons[item] || "🏺") + " " + item) : "";
        dom.slots[i].classList.toggle("filled", Boolean(item));
    }
}
