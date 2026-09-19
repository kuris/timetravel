/**
 * advisor.js — 다음에 무엇을 할 것인가
 *
 * 빈 땅에 떨어뜨려 놓고 "알아서 하세요"라고 하면 대부분 아무것도 하지 않는다.
 * Age of Empires 의 기본 흐름을 그대로 따른다.
 *
 *   재료를 모은다 → 집을 세운다 → 창고 · 망루 · 제단으로 마을을 갖춘다
 *   → 발전도가 차면 시간의 문이 열리고 다음 시대로 넘어간다
 *
 * 여기서는 그 순서를 한 줄로 일러 주기만 한다. 강제하지는 않는다.
 * 무엇을 지을지는 여전히 플레이어가 고른다.
 */
import { G, progressGoal } from "./state.js";
import { josa } from "./ui.js";
import { BUILDING_TYPES } from "./village.js";

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
    if (countOf("house") < 2 && buildable("house")) return "house";
    if (countOf("store") < 1 && buildable("store")) return "store";
    if (countOf("tower") < 1 && buildable("tower")) return "tower";
    if (countOf("altar") < 1 && buildable("altar")) return "altar";
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
        return "시간의 문이 열렸습니다 — 고인돌로 가서 [E]";
    }

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
                  tower: "지도가 넓게 열린다", altar: "이정표가 두 번 충전된다" }[type];

    return b.name + josa(b.name) + " 세우세요 — 빈 땅에 서서 [E] · " + costText(type)
        + (why ? " · " + why : "") + " (발전도 " + left + " 남음)";
}

/** 건설 메뉴에서 권하는 항목에 붙는 꼬리표 */
export function recommendNote(type) {
    return type === recommendedType() ? "  ← 권함" : "";
}

/** 그 건물이 무엇에 쓸모가 있는지 (메뉴에 같이 보여 준다) */
export const USE_HINT = {
    house: "사람 하나가 들어와 산다. 그 사람이 나무와 돌을 모아 온다.",
    store: "주민이 재료를 더 자주 날라 온다.",
    tower: "지도가 한 번에 넓게 열린다.",
    altar: "이정표를 두 번 더 쓸 수 있다."
};
