/**
 * village.js — 플레이어가 키우는 마을
 *
 * 이 게임의 성장 루프를 담당한다.
 *
 *   탐험해서 재료를 줍는다
 *     → 원하는 자리에 걸어가서 짓는다
 *     → 발전도가 차면 시간의 문이 깨어난다
 *     → 시대가 바뀌며 내가 지은 건물이 그 자리에서 한 단계 승격한다
 *
 * 배치는 자유다. 정해진 터가 없고, **플레이어가 서 있는 자리**에 짓는다.
 * 그 덕분에 "물속인가 / 갈 수 있는 곳인가"를 따로 검사할 필요가 거의 없다.
 * 플레이어가 거기 서 있다는 것 자체가 이미 증명이다.
 *
 * G.village 는 좌표와 종류만 들고 있다. 시대별 생김새는 BUILDING_TYPES 의
 * tiers 표가 정한다. 그래서 같은 자리가 움집 → 청동기 집 → 기와집으로 이어진다.
 */
import { addFlatCircle, makeBasicMat } from "./build.js";
import { openChoiceDialogue, closeDialogue } from "./dialogue.js";
import { AudioSystem } from "./audio.js";
import { addJournalEntry } from "./journal.js";
import { G, progressGoal } from "./state.js";
import { isUnderwater, terrainHeight } from "./terrain.js";
import { dom, showMessage } from "./ui.js";

// 시대별 건물 빌더
import { addPitHouse, addSmallAltar } from "./eras/neolithic.js";
import { addBronzeHouse, addRaisedGranary, addBronzeAltar, addWatchtower } from "./eras/bronze.js";
import { addSamgukHouse, addTowerTall, addTumulus } from "./eras/samguk.js";
import { addChoga, addJangseung, addGovernmentGate } from "./eras/joseon.js";
import { addSlateHouse, addWarehouse, addFlagPole, addSaemaulSign } from "./eras/modern1970.js";
import { addShopBuilding, addConvenienceStore, addApartment, addHeritageEnclosure } from "./eras/modern2000.js";
import { addJarPlatform, addStoragePit } from "./props.js";

/** 건물 사이 최소 간격 (너무 붙으면 겹쳐 보인다) */
const MIN_GAP = 4.0;

/** 지을 수 있는지 살피는 거리 */
export const BUILD_RANGE = 1.6;

/**
 * 건물 종류.
 *
 * tiers 는 시대별 빌더다. 신호가 `null` 이면 그 시대에는 이 건물이 없다.
 * 모든 빌더를 (x, z, rot) 형태로 감싸서 표가 한눈에 들어오게 했다.
 */
export const BUILDING_TYPES = {
    house: {
        name: "집",
        desc: "사람이 산다. 마을의 기본.",
        cost: { wood: 3, stone: 1 },
        progress: 10,
        tiers: [
            (x, z, r) => addPitHouse(x, z, r, 1.0),
            (x, z, r) => addBronzeHouse(x, z, r, 1.0),
            (x, z, r) => addSamgukHouse(x, z, r, 1.0, false),
            (x, z, r) => addChoga(x, z, r, 1.0),
            (x, z, r) => addSlateHouse(x, z, r, 1.0),
            (x, z, r) => addShopBuilding(x, z, r, 3, { signColor: 0x8c3a2a })
        ]
    },

    store: {
        name: "창고",
        desc: "거둔 것을 쌓아 둔다.",
        cost: { wood: 2, stone: 3 },
        progress: 12,
        tiers: [
            (x, z) => addStoragePit(x, z),
            (x, z, r) => addRaisedGranary(x, z, r),
            (x, z, r) => addRaisedGranary(x, z, r),
            (x, z, r) => addJarPlatform(x, z, r),
            (x, z, r) => addWarehouse(x, z, r),
            (x, z, r) => addConvenienceStore(x, z, r)
        ]
    },

    tower: {
        name: "망루",
        desc: "멀리 내다본다. 지도가 넓게 열린다.",
        cost: { wood: 5, stone: 4 },
        progress: 16,
        tiers: [
            null,                                   // 신석기에는 망루가 없다
            (x, z, r) => addWatchtower(x, z, r),
            (x, z, r) => addTowerTall(x, z, r),
            (x, z, r) => addGovernmentGate(x, z, r),
            (x, z) => addFlagPole(x, z),
            (x, z, r) => addApartment(x, z, r, 12, 7)
        ]
    },

    altar: {
        name: "제단",
        desc: "무언가를 기린다. 유물이 있는 쪽을 알려 준다.",
        cost: { wood: 2, stone: 5 },
        progress: 14,
        tiers: [
            (x, z) => addSmallAltar(x, z),
            (x, z) => addBronzeAltar(x, z),
            (x, z) => addTumulus(x, z, 2.4, 1.8),
            (x, z, r) => addJangseung(x, z, r),
            (x, z, r) => addSaemaulSign(x, z, r),
            (x, z) => addHeritageEnclosure(x, z)
        ]
    }
};

/* ================================================================
   배치
   ================================================================ */

/**
 * 여기에 지을 수 있는가.
 * 플레이어가 서 있는 자리를 기준으로 하므로 도달 가능성은 이미 보장된다.
 * 남는 것은 물가와 건물 간격뿐이다.
 */
export function canBuildHere(x, z) {
    if (isUnderwater(x, z)) return { ok: false, why: "물가에는 지을 수 없습니다." };

    // 경사가 급하면 안 된다 (주변 높이차로 가늠한다)
    const h = terrainHeight(x, z);
    const slope = Math.max(
        Math.abs(terrainHeight(x + 1.2, z) - h),
        Math.abs(terrainHeight(x - 1.2, z) - h),
        Math.abs(terrainHeight(x, z + 1.2) - h),
        Math.abs(terrainHeight(x, z - 1.2) - h)
    );
    if (slope > 0.55) return { ok: false, why: "땅이 너무 기울어 있습니다." };

    for (const b of G.village) {
        if (Math.hypot(b.x - x, b.z - z) < MIN_GAP) {
            return { ok: false, why: "다른 건물과 너무 가깝습니다." };
        }
    }
    return { ok: true };
}

/** 재료가 충분한가 */
function canAfford(type) {
    const cost = BUILDING_TYPES[type].cost;
    for (const k in cost) {
        if ((G.materials[k] || 0) < cost[k]) return false;
    }
    return true;
}

function costText(type) {
    const cost = BUILDING_TYPES[type].cost;
    const label = { wood: "나무", stone: "돌" };
    return Object.keys(cost).map((k) => label[k] + " " + cost[k]).join(", ");
}

/** 현재 시대에 지을 수 있는 종류만 추린다 */
function availableTypes() {
    return Object.keys(BUILDING_TYPES)
        .filter((t) => BUILDING_TYPES[t].tiers[G.currentAge]);
}

/**
 * 건설 메뉴를 연다.
 * NPC 대화 오버레이를 그대로 쓴다 — 선택지 UI가 이미 있으니 새로 만들 이유가 없다.
 */
export function openBuildMenu() {
    const x = G.player.position.x, z = G.player.position.z;
    const spot = canBuildHere(x, z);

    if (!spot.ok) {
        AudioSystem.playInvestigate();
        showMessage(spot.why);
        return;
    }

    const types = availableTypes();
    if (!types.length) {
        showMessage("이 시대에는 더 지을 것이 없습니다.");
        return;
    }

    const choices = types.map((t) => {
        const b = BUILDING_TYPES[t];
        const afford = canAfford(t);
        return {
            text: b.name + "  (" + costText(t) + ")" + (afford ? "" : "  — 재료 부족"),
            response: b.desc,
            onSelect: () => {
                closeDialogue();
                build(t, x, z);
            }
        };
    });

    openChoiceDialogue({
        name: "이 자리에 짓기",
        greeting: "무엇을 세울까?\n\n가진 것 — 나무 " + G.materials.wood + ", 돌 " + G.materials.stone,
        choices
    });
}

/** 실제로 짓는다 */
export function build(type, x, z) {
    const b = BUILDING_TYPES[type];

    if (!canAfford(type)) {
        showMessage("재료가 모자랍니다.\n필요 — " + costText(type));
        return false;
    }

    for (const k in b.cost) G.materials[k] -= b.cost[k];

    const entry = {
        x, z,
        type,
        rot: Math.random() * Math.PI * 2,
        builtAtEra: G.currentAge
    };
    G.village.push(entry);

    // 지금 시대의 모습으로 즉시 세운다
    spawnBuilding(entry, G.currentAge);

    G.progress += b.progress;
    AudioSystem.playPickup();
    addJournalEntry("system", b.name + " 건설", "마을에 " + b.name + "을(를) 세웠습니다.");

    showMessage(b.name + "을(를) 세웠습니다.\n마을 발전도 " + G.progress + " / " + progressGoal());
    updateVillageUI();

    // 발전도가 차면 시간의 문이 깨어난다
    import("./interaction.js").then((m) => {
        const extra = m.handleAgeCompletion();
        if (extra) showMessage(extra);
    });

    return true;
}

/** 한 채를 그 시대의 모습으로 세운다 */
function spawnBuilding(entry, eraIndex) {
    const tier = BUILDING_TYPES[entry.type].tiers[eraIndex];
    if (!tier) return; // 이 시대에는 이 건물이 없다 — 건너뛴다
    tier(entry.x, entry.z, entry.rot);
}

/**
 * 시대를 지을 때 호출한다.
 * 플레이어가 지금까지 지은 것을 전부 이 시대의 모습으로 다시 세운다.
 * 이것이 "내 마을이 시간을 통과한다"의 실체다.
 */
export function renderVillage(eraIndex) {
    for (const entry of G.village) {
        spawnBuilding(entry, eraIndex);
    }
}

// 목표치 계산은 state.js 에 있다 (ui·interaction 도 써야 해서 순환 참조를 피했다)
export { progressGoal };

/* ================================================================
   발밑 표시
   ================================================================ */

let ghost = null;

/** 지을 수 있는 자리인지 발밑에 흐리게 보여 준다 */
export function updateBuildGhost() {
    if (!G.player || !G.scene) return;

    if (!ghost) {
        ghost = addFlatCircle(G.scene, 1.1, 0xffd071, 0, 0, 0, 20, {
            material: makeBasicMat(0xffd071, {
                transparent: true,
                opacity: 0.0,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        });
        ghost.renderOrder = 8;
    }

    const x = G.player.position.x, z = G.player.position.z;
    const spot = canBuildHere(x, z);
    const near = availableTypes().length > 0;

    ghost.position.set(x, terrainHeight(x, z) + 0.06, z);
    ghost.material.color.setHex(spot.ok ? 0xffd071 : 0x8a4a3a);
    ghost.material.opacity = near ? (spot.ok ? 0.22 : 0.10) : 0;
}

/** 시대가 바뀔 때 이전 scene 의 표시를 버린다 */
export function resetBuildGhost() {
    ghost = null;
}

/* ================================================================
   UI
   ================================================================ */

export function updateVillageUI() {
    if (dom.materialText) {
        dom.materialText.textContent = "나무 " + G.materials.wood + " · 돌 " + G.materials.stone;
    }
    if (dom.progressText) {
        dom.progressText.textContent = G.progress + " / " + progressGoal();
    }
}
