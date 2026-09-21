/**
 * advisor.js — 다음에 무엇을 할 것인가
 *
 * 빈 땅에 떨어뜨려 놓고 "알아서 하세요"라고 하면 대부분 아무것도 하지 않는다.
 * 그리고 한 번 "뭘 해야 하지?" 하고 멈추면 대개 거기서 그만둔다.
 *
 * 그래서 이 줄은 언제나 **지금 당장 할 수 있는 일 하나**를 가리킨다.
 * 순서는 궁금한 것부터다.
 *
 *   말을 걸 사람 → 아직 못 본 흔적 → 열린 시간의 문
 *
 * 마을 짓기는 맨 뒤다. 하고 싶으면 하는 것이지, 시대를 넘는 조건이 아니다.
 * 나무를 베라는 말이 이 게임의 첫 문장이 되어서는 안 된다.
 */
import { AGE_DATA } from "./config.js";
import { G } from "./state.js";
import { josa } from "./ui.js";

/** 플레이어에게서 그것까지의 거리 */
function distTo(obj) {
    if (!G.player || !obj) return Infinity;
    const p = obj.position || (obj.group && obj.group.position);
    if (!p) return Infinity;
    return Math.hypot(p.x - G.player.position.x, p.z - G.player.position.z);
}

/** 어느 쪽인지 말로 일러 준다. 화살표가 없어도 걸어갈 수 있어야 한다. */
function bearing(obj) {
    if (!G.player || !obj) return "";
    const p = obj.position || (obj.group && obj.group.position);
    if (!p) return "";
    const dx = p.x - G.player.position.x;
    const dz = p.z - G.player.position.z;
    // 등각 화면이라 월드 축을 45도 돌려야 "화면에서 오른쪽"이 된다
    const u = (dx - dz) * Math.SQRT1_2;
    const v = (dx + dz) * Math.SQRT1_2;
    const ns = v > 0 ? "아래" : "위";
    const ew = u > 0 ? "오른쪽" : "왼쪽";
    if (Math.abs(u) > Math.abs(v) * 1.6) return ew;
    if (Math.abs(v) > Math.abs(u) * 1.6) return "화면 " + ns;
    return ew + " " + ns;
}

const LABEL = { wood: "나무", stone: "돌" };

/**
 * 상단에 뜨는 한 줄.
 *
 * 걸을 때마다 바뀌면 믿음이 안 간다.
 * 시대에 들어온 순간 목표 하나를 정하고 끝까지 간다.
 *   1. 못 만난 사람이 있으면 그중 첫 번째 (등록 순서)
 *   2. 다 만났으면 못 본 흔적 (전체 개수만)
 *   3. 다 봤으면 시간의 문
 *
 * { text, done } 을 돌려준다. done 이면 UI 가 줄을 긋는다.
 * 목표가 바뀌면 직전 목표를 2.5초간 줄 그어 보여 주고 다음으로 넘어간다.
 */
export function advisor() {
    if (G.demoFinished) return { text: "데모 완료", done: true };
    if (G.currentAge < 0) return { text: "길 한가운데 낯선 돌을 조사하세요", done: false };

    // 방금 끝낸 목표는 잠시 줄 그어 보여 준다
    if (G.justDone && Date.now() < G.justDone.until) {
        return { text: G.justDone.text, done: true };
    }
    G.justDone = null;

    if (G.activeGate && G.activeGate.active) {
        return { text: "증거를 다 모았습니다 — 관아로 가서 사또를 대면하세요", done: false };
    }

    const pinKey = "objective:" + G.currentAge;
    if (!G.pinnedObjective || G.pinnedObjective.key !== pinKey) {
        const first = pickObjective();
        G.pinnedObjective = { key: pinKey, text: first.text, target: first.target || null };
        return { text: G.pinnedObjective.text, done: false };
    }

    // 핀한 사람이면: 그 사람을 만났을 때만 다음으로 넘어간다
    if (G.pinnedObjective.target) {
        const npc = G.npcs.find((n) => n.name === G.pinnedObjective.target);
        if (npc && npc.met) {
            const old = G.pinnedObjective.text;
            const fresh = pickObjective();
            G.pinnedObjective = { key: pinKey, text: fresh.text, target: fresh.target || null };
            G.justDone = { text: old, until: Date.now() + 2500 };
            return { text: old, done: true };
        }
        return { text: G.pinnedObjective.text, done: false };
    }

    // 흔적 단계: 개수가 줄면 다음 문구로 (줄 그은 뒤 갱신)
    const fresh = pickObjective();
    if (fresh.text !== G.pinnedObjective.text) {
        const old = G.pinnedObjective.text;
        G.pinnedObjective = { key: pinKey, text: fresh.text, target: fresh.target || null };
        G.justDone = { text: old, until: Date.now() + 2500 };
        return { text: old, done: true };
    }
    return { text: G.pinnedObjective.text, done: false };
}

/** 기존 호출부 호환 */
export function advisorText() {
    return advisor().text;
}

/** 시대 진입 시점에 목표 하나를 정한다 */
function pickObjective() {
    const unmet = G.npcs.filter((n) => !n.isAnimal && !n.met);
    if (unmet.length) {
        const n = unmet[0];
        return { text: n.name + josa(n.name, "과/와") + " 이야기하세요 — 다가가 [E]" };
    }

    const age = AGE_DATA[G.currentAge];
    const left = Math.max(0, (age.total || 3) - G.ageProgress);
    if (left > 0) {
        return { text: "마을 안의 유물 " + left + "개를 조사하고 회수하세요" };
    }

    return { text: "증거를 다 모았습니다 — 관아로 가서 사또를 대면하세요", done: true };
}

/** 그 건물이 무엇에 쓸모가 있는지 (메뉴에 같이 보여 준다) */
export const USE_HINT = {
    campfire: "불빛이 닿는 곳(반경 8)에는 들개가 들어오지 못한다.",
    fence: "두른 안쪽(반경 5)은 들개가 넘지 못한다.",
    house: "사람 하나가 들어와 산다. 그 사람이 나무와 돌을 모아 온다.",
    store: "주민이 재료를 더 자주 날라 온다.",
    tower: "지도가 한 번에 넓게 열린다.",
    altar: "이정표를 두 번 더 쓸 수 있다."
};
