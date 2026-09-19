/**
 * dialogue.js — 선택지 대화 UI
 *
 * NPC에 choices 배열이 있으면 이 모듈이 오버레이를 띄운다.
 * 각 선택지는 { text, response, clue?, journal? } 형태.
 */
import { G } from "./state.js";
import { addJournalEntry } from "./journal.js";
import { AudioSystem } from "./audio.js";
import { showMessage } from "./ui.js";

let dialogueOpen = false;
let currentNPC = null;

export function isDialogueOpen() { return dialogueOpen; }

/**
 * 선택지 대화 열기
 * @param {object} npc - registerNPC로 등록된 NPC 객체
 */
export function openChoiceDialogue(npc) {
    currentNPC = npc;
    dialogueOpen = true;

    const overlay = document.getElementById("dialogueOverlay");
    const nameEl = document.getElementById("dialogueName");
    const promptEl = document.getElementById("dialoguePrompt");
    const choicesEl = document.getElementById("dialogueChoices");

    if (!overlay) return;

    nameEl.textContent = "【 " + npc.name + " 】";
    promptEl.textContent = npc.greeting || "무슨 일로 왔소?";

    choicesEl.innerHTML = "";
    npc.choices.forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.className = "dialogue-choice";
        btn.textContent = (i + 1) + ". " + choice.text;
        btn.addEventListener("click", () => selectChoice(choice));
        choicesEl.appendChild(btn);
    });

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.className = "dialogue-choice dialogue-close";
    closeBtn.textContent = "✕  대화를 끝내다";
    closeBtn.addEventListener("click", closeDialogue);
    choicesEl.appendChild(closeBtn);

    overlay.classList.add("open");
    overlay.focus();
}

function selectChoice(choice) {
    AudioSystem.playInvestigate();

    // 단서 획득
    if (choice.clue && !G.clues.has(choice.clue)) {
        G.clues.add(choice.clue);
        showMessage("🔍 새로운 단서를 얻었습니다!\n\n" + choice.response);
        addJournalEntry("clue", "단서: " + choice.text, choice.response);
    } else {
        showMessage("【 " + (currentNPC ? currentNPC.name : "NPC") + " 】\n\n\"" + choice.response + "\"");
        if (choice.journal) {
            addJournalEntry("npc", currentNPC ? currentNPC.name : "NPC", choice.response);
        }
    }

    // 응답 후 선택지 갱신 (다른 선택지 계속 가능하도록 패널 유지)
    updatePromptAfterChoice(choice);
}

function updatePromptAfterChoice(choice) {
    const promptEl = document.getElementById("dialoguePrompt");
    if (promptEl) {
        promptEl.textContent = choice.followUp || "...또 묻고 싶은 게 있소?";
    }
}

export function closeDialogue() {
    dialogueOpen = false;
    currentNPC = null;
    const overlay = document.getElementById("dialogueOverlay");
    if (overlay) overlay.classList.remove("open");
}

/** 숫자키 1-3으로 선택지 선택 */
export function handleDialogueKey(key) {
    if (!dialogueOpen || !currentNPC) return;
    if (key === "Escape") { closeDialogue(); return; }

    const idx = parseInt(key) - 1;
    if (!isNaN(idx) && currentNPC.choices && idx >= 0 && idx < currentNPC.choices.length) {
        selectChoice(currentNPC.choices[idx]);
    }
}
