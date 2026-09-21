/**
 * dialogue.js — 선택지 대화 UI
 *
 * NPC에 choices 배열이 있으면 이 모듈이 오버레이를 띄운다.
 * 각 선택지는 { text, response, clue?, journal? } 형태.
 */
import { G } from "./state.js";
import { AGE_DATA, ERA_OPENED_BY } from "./config.js";
import { addJournalEntry } from "./journal.js";
import { AudioSystem } from "./audio.js";
import { showMessage } from "./ui.js";

let dialogueOpen = false;
let currentNPC = null;
let typeTimer = null;

export function isDialogueOpen() { return dialogueOpen; }

/** 진행 중인 타자기 효과를 멈춘다 */
function stopTyping() {
    if (typeTimer) {
        clearInterval(typeTimer);
        typeTimer = null;
    }
}

/**
 * 타자기 효과로 한 줄씩 보여 준다.
 * 클릭·키 입력이 들어오면 남은 글자를 한 번에 보여 준다.
 */
function typeText(el, text) {
    stopTyping();
    if (!el) return;
    el.textContent = "";
    el.classList.add("typing");
    let i = 0;
    const full = String(text);
    typeTimer = setInterval(() => {
        i++;
        el.textContent = full.slice(0, i);
        if (i >= full.length) {
            stopTyping();
            el.classList.remove("typing");
        }
    }, 28);
}

/** 타자기 진행 중이면 남은 글자를 한 번에 보여 주고 true.
 *  그 줄이 다 나왔는데 다음 줄이 있으면 다음 줄을 시작하고 true. */
function advanceTyping() {
    const el = document.getElementById("dialoguePrompt");
    if (typeTimer) {
        if (el && el.dataset.full) el.textContent = el.dataset.full;
        stopTyping();
        if (el) el.classList.remove("typing");
        return true;
    }
    if (lineQueue.length && el) {
        const next = lineQueue.shift();
        el.dataset.full = next;
        typeText(el, next);
        return true;
    }
    return false;
}

/** 전부(남은 글자 + 남은 줄)를 한 번에 보여 주고 true */
function finishTyping() {
    if (!typeTimer && !lineQueue.length) return false;
    const el = document.getElementById("dialoguePrompt");
    if (el && lineQueue.length) {
        el.textContent = lineQueue[lineQueue.length - 1];
        el.dataset.full = el.textContent;
    } else if (el && el.dataset.full) {
        el.textContent = el.dataset.full;
    }
    stopTyping();
    lineQueue = [];
    if (el) el.classList.remove("typing");
    return true;
}

/**
 * 여러 줄을 차례대로 타자기로 보여 준다.
 * 답변 → 알림 → 행동 순으로 한 줄씩 읽히게.
 * 클릭하면 그 줄을 다 보여 주고, 다시 클릭하면 다음 줄로.
 */
let lineQueue = [];
function playLines(el, lines) {
    stopTyping();
    lineQueue = lines.slice(1);
    el.dataset.full = lines[0];
    typeText(el, lines[0]);
    el.dataset.more = lineQueue.length ? "1" : "";
}

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

    nameEl.textContent = npc.name;
    const portraitFace = document.getElementById("portraitFace");
    const portraitName = document.getElementById("portraitName");
    const dlgPortrait = document.getElementById("dialoguePortrait");
    const faces = {
        "포도청 나졸": "najol", "밭 가는 노인": "old_farmer", "행상": "peddler",
        "관아 서생": "clerk", "장터 아이": "kid", "우물가 아낙": "well_woman",
        "가판 상인": "merchant", "빨래하는 아낙": "laundry_woman", "볏가리 노인": "straw_elder"
    };
    const key = faces[npc.name];
    const src = key ? ("assets/portraits/" + key + ".png") : "assets/portraits/eosa.png";
    if (portraitName) portraitName.textContent = npc.name;
    if (portraitFace) { portraitFace.src = src; portraitFace.alt = npc.name; }
    if (dlgPortrait) { dlgPortrait.src = src; dlgPortrait.alt = npc.name; }
    const greeting = npc.greeting || "무슨 일로 왔소?";
    promptEl.dataset.full = greeting;
    typeText(promptEl, greeting);

    choicesEl.innerHTML = "";
    renderChoices(choicesEl);

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.className = "dialogue-choice dialogue-close";
    closeBtn.textContent = "✕  대화를 끝내다";
    closeBtn.addEventListener("click", () => {
        if (advanceTyping()) return;
        closeDialogue();
    });
    choicesEl.appendChild(closeBtn);

    overlay.onclick = (e) => {
        if (e.target === overlay && advanceTyping()) return;
    };

    overlay.classList.add("open");
    document.body.classList.add("dialogue-open");
    overlay.focus();

    // 대화창 클릭도 타자기 넘기기로 (왼쪽 말풍선 전체)
    const dlgMain = document.getElementById("dialogueMain");
    if (dlgMain) dlgMain.onclick = () => { advanceTyping(); };
    promptEl.onclick = () => { advanceTyping(); };
}

/**
 * 선택지 목록을 그린다.
 * 한 번 답한 것은 빼고 필요한 것만 — 끝난 질문은 다시 묻지 않게.
 * 단서 질문(hideAfter)은 단서를 얻으면 숨기고,
 * 일반 질문은 한 번 답하면 숨긴다.
 */
function renderChoices(choicesEl) {
    const asked = currentNPC.asked || (currentNPC.asked = new Set());
    const list = (currentNPC.choices || []).filter((c) => {
        if (asked.has(c.text)) return false;
        if (c.clue && G.clues.has(c.clue) && c.hideAfter) return false;
        return true;
    });
    // 첨부처럼 항상 3칸: 남은 선택지 + "그냥 간다."
    const shown = list.slice(0, 2);
    const items = [...shown.map((c) => ({ choice: c })), { leave: true }];
    items.forEach((item, i) => {
        const btn = document.createElement("button");
        btn.className = "dialogue-choice";
        if (item.leave) {
            btn.textContent = (i + 1) + ". 그냥 간다.";
            btn.addEventListener("click", () => {
                if (advanceTyping()) return;
                closeDialogue();
            });
        } else {
            btn.textContent = (i + 1) + ". " + item.choice.text;
            btn.addEventListener("click", () => selectChoice(item.choice));
        }
        choicesEl.appendChild(btn);
    });
    return list.length;
}

function selectChoice(choice) {
    // 타자기 진행 중이면 그 줄부터 다 보여 준다.
    // 다음 줄이 남았으면 다음 줄로, 다 봤으면 선택으로.
    if (advanceTyping()) return;
    AudioSystem.playInvestigate();

    // 선택 콜백 (인과 분기 등) — 메시지/일지보다 먼저 실행
    if (choice.onSelect) {
        try { choice.onSelect(choice); } catch (e) { console.error(e); }
    }

    // 응답을 대화창에 차례대로 보여 준다.
    // 답변 → (단서면 알림) → 행동 순. 대화창을 닫지 않고 안에서 다 본다.
    // 답한 질문은 목록에서 뺀다 — 닫았다 열어도 같은 목록이 유지되게.
    if (currentNPC) {
        if (!currentNPC.asked) currentNPC.asked = new Set();
        currentNPC.asked.add(choice.text);
    }
    const lines = ['"' + choice.response + '"'];
    if (choice.clue && !G.clues.has(choice.clue)) {
        lines.push("🔍 새로운 단서를 얻었습니다!");
    }
    if (choice.followUp) lines.push(choice.followUp);

    // 단서 획득
    if (choice.clue && !G.clues.has(choice.clue)) {
        G.clues.add(choice.clue);

        // 그 한마디가 시대를 열었는가.
        // 열렸다면 바로 말해 줘야 한다 — 이 게임에서 제일 큰 보상이다.
        for (const idx in ERA_OPENED_BY) {
            if (ERA_OPENED_BY[idx] !== choice.clue) continue;
            if (G.visitedAges.has(+idx)) continue;
            lines.push("⌛ 시간의 문에 새로운 때가 비칩니다 — "
                + AGE_DATA[+idx].name + "\n그 돌로 가면 그리로 갈 수 있습니다.");
            addJournalEntry("system", "시간의 문", AGE_DATA[+idx].name + " 로 가는 길이 열렸습니다.");
        }

        addJournalEntry("clue", "단서: " + choice.text, choice.response);
    } else if (choice.journal) {
        addJournalEntry("npc", currentNPC ? currentNPC.name : "NPC", choice.response);
    }

    // 응답 후 선택지 갱신.
    // 끝난 단서 선택지는 목록에서 걷어낸다 — 필요한 것만 보이게.
    const promptEl = document.getElementById("dialoguePrompt");
    if (promptEl) {
        playLines(promptEl, lines);
    }
    const choicesEl = document.getElementById("dialogueChoices");
    if (choicesEl) {
        choicesEl.innerHTML = "";
        const n = renderChoices(choicesEl);
        const closeBtn = document.createElement("button");
        closeBtn.className = "dialogue-choice dialogue-close";
        closeBtn.textContent = n ? "✕  대화를 끝내다" : "✕  닫기";
        closeBtn.addEventListener("click", () => {
            if (advanceTyping()) return;
            closeDialogue();
        });
        choicesEl.appendChild(closeBtn);
    }
}

export function closeDialogue() {
    if (advanceTyping()) return;
    stopTyping();
    lineQueue = [];
    dialogueOpen = false;
    currentNPC = null;
    const portraitName = document.getElementById("portraitName");
    if (portraitName) portraitName.textContent = "암행어사";
    const portraitFace = document.getElementById("portraitFace");
    if (portraitFace) {
        portraitFace.src = "assets/portraits/eosa.png";
        portraitFace.alt = "암행어사";
    }
    const overlay = document.getElementById("dialogueOverlay");
    if (overlay) overlay.classList.remove("open");
    document.body.classList.remove("dialogue-open");
}

/** 숫자키 1-3으로 선택지 선택 */
export function handleDialogueKey(key) {
    if (!dialogueOpen || !currentNPC) return;
    if (key === "Escape") { stopTyping(); lineQueue = []; closeDialogue(); return; }
    if (advanceTyping()) return;

    const idx = parseInt(key) - 1;
    if (!isNaN(idx) && currentNPC.choices && idx >= 0 && idx < currentNPC.choices.length) {
        selectChoice(currentNPC.choices[idx]);
    }
}
