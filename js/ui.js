/**
 * UI — DOM 참조, 메시지창, 인벤토리, 상단 정보
 */
import { AGE_DATA } from "./config.js";
import { G } from "./state.js";

export const dom = {
    game: document.getElementById("game"),
    eraText: document.getElementById("eraText"),
    objectiveText: document.getElementById("objectiveText"),
    countText: document.getElementById("countText"),
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
    signDist: document.getElementById("signDist")
};

export function showMessage(text) {
    dom.message.textContent = text;
}

export function addInventoryItem(name) {
    G.inventory.push(name);
    updateUI();
}

export function updateUI() {
    const age = AGE_DATA[G.currentAge];

    dom.eraText.textContent = age.name;

    let goal = age.goal;
    if (G.activeGate && G.activeGate.active) {
        goal = "깨어난 시간의 문 근처에서 E를 누르세요.";
    }
    if (G.demoFinished) {
        goal = "데모 완료";
    }

    dom.objectiveText.textContent = goal;
    dom.countText.textContent = G.ageProgress + " / " + age.total;

    const visibleItems = G.inventory.slice(-5);
    for (let i = 0; i < dom.slots.length; i++) {
        const item = visibleItems[i];
        dom.slots[i].textContent = item || "";
        dom.slots[i].classList.toggle("filled", Boolean(item));
    }
}
