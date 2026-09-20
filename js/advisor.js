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
import { isGuarded, raidActive } from "./raid.js";
import { G, progressGoal } from "./state.js";
import { josa } from "./ui.js";
import { BUILDING_TYPES } from "./village.js";

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

/** 이 시대에 세울 수 있는 종류인가 */
function buildable(type) {
    const b = BUILDING_TYPES[type];
    return !!(b && b.tiers[G.currentAge]);
}

/** 이미 몇 채 지었나 */
function countOf(type) {
    let n = 0;
    for (const b of G.village) if (b.type === type) n++;
    return n;
}

/** 모자란 재료 */
function missing(type) {
    const cost = BUILDING_TYPES[type].cost;
    const lack = {};
    let any = false;
    for (const k in cost) {
        const d = cost[k] - (G.materials[k] || 0);
        if (d > 0) { lack[k] = d; any = true; }
    }
    return any ? lack : null;
}

function costText(type) {
    const cost = BUILDING_TYPES[type].cost;
    return Object.keys(cost).map((k) => LABEL[k] + " " + cost[k]).join(", ");
}

/**
 * 지금 권하는 건물.
 *
 * 마을은 살 곳에서 시작한다. 그다음이 쌓아 둘 곳,
 * 그다음이 멀리 보는 것(망루)과 기리는 것(제단)이다.
 * 다 갖춘 뒤에는 다시 집이다 — 마을은 사람이 늘어야 자란다.
 */
export function recommendedType() {
    if (countOf("house") < 1 && buildable("house")) return "house";
    // 첫 집이 서면 지킬 것이 생긴다. 들개가 내려오기 전에 불을 피워 둔다.
    if (countOf("campfire") < 1 && buildable("campfire")) return "campfire";
    if (countOf("house") < 2 && buildable("house")) return "house";
    if (countOf("store") < 1 && buildable("store")) return "store";
    if (countOf("tower") < 1 && buildable("tower")) return "tower";
    if (countOf("altar") < 1 && buildable("altar")) return "altar";
    if (countOf("campfire") < 2 && buildable("campfire")) return "campfire";
    if (buildable("house")) return "house";

    for (const t in BUILDING_TYPES) if (buildable(t)) return t;
    return null;
}

/**
 * 상단에 뜨는 한 줄.
 * "지금 당장 무엇을 하면 되는가"만 말한다.
 */
export function advisorText() {
    if (G.demoFinished) return "데모 완료";
    if (G.currentAge < 0) return "길 한가운데 낯선 돌을 조사하세요";

    if (G.activeGate && G.activeGate.active) {
        return "시간의 문이 열렸습니다 — 그 돌로 가서 [E] · 어느 때로든 갑니다";
    }

    if (raidActive()) {
        // 이미 다 막아 두었으면 할 일을 다시 말해 줄 이유가 없다
        const open = G.village.filter((b) => b.type === "house" && !isGuarded(b.x, b.z));
        return open.length
            ? "들개가 내려왔습니다 — 집 " + open.length + "채가 비어 있습니다. 화톳불을 피우세요"
            : "들개가 불빛 밖에서 겉돌고 있습니다 — 곧 물러갑니다";
    }

    // ---- 1. 아직 말을 걸어 보지 않은 사람 ----
    // 사람이 제일 앞이다. 말을 걸면 무엇을 찾아야 하는지 그 사람이 알려 준다.
    const unmet = G.npcs.filter((n) => !n.isAnimal && !n.met);
    unmet.sort((a, b) => distTo(a) - distTo(b));

    // ---- 2. 아직 보지 않은 흔적 ----
    const unseen = G.interactables.filter((i) => !i.material && !i.done);
    unseen.sort((a, b) => distTo(a) - distTo(b));

    // 둘 다 남았으면 가까운 쪽을 권한다. 걸어가는 거리가 짧을수록 실제로 간다.
    const person = unmet[0];
    const trace = unseen[0];
    const dp = distTo(person);
    const dt = distTo(trace);

    const callOut = (n) =>
        n.name + josa(n.name, "이/가") + " " + bearing(n) + "에 있습니다 — 다가가 [E]로 말을 거세요";

    if (person && dp <= dt) return callOut(person);
    if (trace) {
        const age = AGE_DATA[G.currentAge];
        const left = (age.total || 3) - G.ageProgress;
        return "아직 보지 않은 흔적이 " + left + "가지 — 가장 가까운 것은 " + bearing(trace)
            + "입니다 ([H] 이정표)";
    }
    if (person) return callOut(person);

    // ---- 3. 이 시대에서 볼 것을 다 봤다. 마을은 그다음이다 ----
    const type = recommendedType();
    if (!type) return "마을을 더 키우세요";

    const b = BUILDING_TYPES[type];
    const left = Math.max(0, progressGoal() - G.progress);
    const lack = missing(type);

    if (lack) {
        // 모자란 것부터 캐 오게 한다
        const what = Object.keys(lack)
            .map((k) => LABEL[k] + " " + lack[k] + "개")
            .join(", ");
        const how = lack.wood
            ? "쓰러진 나무를 [E]로 베세요"
            : "돌무더기를 [E]로 캐세요";
        return what + " 더 필요합니다 — " + how + " (다음: " + b.name + ")";
    }

    const why = { house: "사람이 하나 늘어난다", store: "주민이 더 자주 날라 온다",
                  tower: "지도가 넓게 열리고 들개를 미리 알려 준다",
                  altar: "이정표가 두 번 충전된다",
                  campfire: "들개가 불빛 안으로 못 들어온다",
                  fence: "울타리 안은 들개가 못 넘는다" }[type];

    return b.name + josa(b.name) + " 세우세요 — 빈 땅에 서서 [E] · " + costText(type)
        + (why ? " · " + why : "") + " (발전도 " + left + " 남음)";
}

/** 건설 메뉴에서 권하는 항목에 붙는 꼬리표 */
export function recommendNote(type) {
    return type === recommendedType() ? "  ← 권함" : "";
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
