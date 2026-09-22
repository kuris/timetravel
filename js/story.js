/**
 * 조선 · 아랑 편에서 지금 할 일 하나.
 *
 * 소문 → 유모의 말 → 향을 판 사람 → 비녀와 기록 → 장석의 방 → 칼집을 들이민다.
 * 단서가 없는 질문은 목록에 없고, 자리를 듣기 전의 증거는 빛나지 않는다.
 */
import { G } from "./state.js";

const PIN = "대숲의 비녀";
const DOC = "찢긴 순찰 기록";
const SHEATH = "문양이 같은 칼집";

function seen(name) {
    return G.investigated.has(G.currentAge + ":" + name);
}

/** 이정표가 가리킬 사람 또는 물건 이름. 없으면 null. */
export function joseonFocusName() {
    if (G.demoFinished || G.clues.has("arang_confess")) return null;
    if (!G.clues.has("arang_who")) return "아랑";
    if (!G.clues.has("arang_lured")) return "늙은 유모";
    if (!seen(DOC) && !G.clues.has("arang_incense")) return "가판 상인";
    if (!seen(PIN)) return PIN;
    if (!seen(DOC)) return DOC;
    if (!seen(SHEATH)) return SHEATH;
    return "객주 장석";
}

export function joseonObjective() {
    if (G.demoFinished || G.clues.has("arang_confess")) {
        return { text: "장석을 압송했다", done: true };
    }
    if (!G.clues.has("arang_who")) {
        return { text: "다음 인물: 아랑 · 월영루 — 붉은 나비가 머무는 여인에게 사건을 물어라" };
    }
    if (!G.clues.has("arang_lured")) {
        return { text: "다음 인물: 늙은 유모 · 강가 마을길 — 아랑이 말한 그날 밤을 확인하라" };
    }
    if (!seen(DOC) && !G.clues.has("arang_incense")) {
        return { text: "다음 인물: 가판 상인 · 장터 — 그날 밤의 향을 누가 준비했는지 확인하라" };
    }
    if (!seen(PIN)) return { text: "다음 장소: 강가 대숲 — 아랑이 말한 비녀를 찾아 그날 밤의 흔적을 확인하라" };
    if (!seen(DOC)) return { text: "다음 장소: 관아 문서고 — 상인이 말한 향 장부와 순찰 기록을 확인하라" };
    if (!seen(SHEATH)) return { text: "다음 장소: 객주 장석의 방 · 주막 뒤 — 비녀와 기록이 가리킨 증거를 찾아라" };
    return { text: "다음 인물: 객주 장석 · 객주 앞 — 칼집 문양과 그의 거짓말을 대조하라" };
}
