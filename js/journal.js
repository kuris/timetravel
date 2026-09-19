/**
 * journal.js — 탐험 일지
 *
 * 유물 조사, NPC 대화, 단서 획득 내용을 누적 기록한다.
 * J 키 또는 버튼으로 패널을 열고 닫는다.
 */
import { G } from "./state.js";
import { AGE_DATA } from "./config.js";

let journalOpen = false;

/** 일지에 항목 추가 */
export function addJournalEntry(type, title, text) {
    const age = AGE_DATA[G.currentAge];
    G.journal.push({
        type,          // "artifact" | "clue" | "npc" | "system"
        title,
        text,
        age: age ? age.name : "알 수 없음",
        time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    });
    // 새 항목 알림 뱃지
    const badge = document.getElementById("journalBadge");
    if (badge && !journalOpen) {
        badge.textContent = G.journal.length;
        badge.style.display = "inline-block";
    }
}

/** 일지 패널 토글 (J 키) */
export function toggleJournal() {
    journalOpen = !journalOpen;
    const panel = document.getElementById("journalOverlay");
    if (!panel) return;

    if (journalOpen) {
        renderJournal();
        panel.classList.add("open");
        // 뱃지 초기화
        const badge = document.getElementById("journalBadge");
        if (badge) badge.style.display = "none";
    } else {
        panel.classList.remove("open");
    }
}

export function isJournalOpen() { return journalOpen; }

/** 일지 내용 DOM 렌더 */
function renderJournal() {
    const list = document.getElementById("journalList");
    if (!list) return;

    if (G.journal.length === 0) {
        list.innerHTML = "<p class='j-empty'>아직 기록이 없습니다.<br>유물을 조사하거나 주민과 대화하면<br>이곳에 내용이 쌓입니다.</p>";
        return;
    }

    const icons = { artifact: "🏺", clue: "🔍", npc: "💬", system: "📌" };
    list.innerHTML = [...G.journal].reverse().map((e, i) => `
        <div class="j-entry j-${e.type}">
            <div class="j-header">
                <span class="j-icon">${icons[e.type] || "📄"}</span>
                <span class="j-title">${e.title}</span>
                <span class="j-age">${e.age}</span>
            </div>
            <p class="j-text">${e.text.replace(/\n/g, "<br>")}</p>
        </div>
    `).join("");
}
