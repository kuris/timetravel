/**
 * defs.js — RTS 규칙표
 *
 * Age of Empires 1 의 단일 플레이를 이 세계(한국사 여섯 시대)로 옮긴 것이다.
 *   시대(Age)      = 신석기 → 청동기 → 삼국 → 조선 → 1970 → 2000
 *   자원(Resource) = 식량 · 나무 · 돌 · 금
 *   건물은 시대가 오르면 같은 자리에서 그 시대의 모습으로 바뀐다.
 *
 * 여기에는 "숫자와 표"만 둔다. 동작은 units / buildings / ai 가 맡는다.
 */
import { addPitHouse, addFence } from "../eras/neolithic.js";
import { addBronzeHouse, addRaisedGranary, addWatchtower, addPalisade } from "../eras/bronze.js";
import { addSamgukHouse, addTowerTall, addEarthWall } from "../eras/samguk.js";
import { addChoga, addGiwa } from "../eras/joseon.js";
import { addSlateHouse, addVillageStore, addWarehouse } from "../eras/modern1970.js";
import { addShopBuilding, addConvenienceStore, addApartment } from "../eras/modern2000.js";
import { addStoragePit, addJarPlatform, addRicePaddyPlot } from "./models.js";
import { addBarracksHut, addArcheryRange, addLumberCamp, addWallBlock } from "./models.js";

/** 자원 넷. 순서는 화면 상단 표시 순서와 같다. */
export const RES_KEYS = ["food", "wood", "stone", "gold"];
export const RES_NAME = { food: "식량", wood: "나무", stone: "돌", gold: "금" };

/** 시대 이름 (AGE_DATA 와 같은 순서) */
export const AGE_NAME = ["신석기 시대", "청동기 시대", "삼국 시대", "조선 시대", "1970년대", "2000년대"];
export const AGE_SHORT = ["신석기", "청동기", "삼국", "조선", "1970", "2000"];

/**
 * 시대 발전 비용. AoE 의 도구/청동/철기 시대 승급과 같은 자리에 있다.
 * 발전하려면 "지금 시대의 건물"이 둘 이상 있어야 한다.
 */
export const AGE_UP = [
    { food: 400, gold: 0 },
    { food: 600, gold: 150 },
    { food: 800, gold: 300 },
    { food: 1000, gold: 450 },
    { food: 1200, gold: 600 }
];
export const AGE_UP_TIME = 32; // 초

/** 인구 상한 (AoE 1 과 같이 50) */
export const POP_MAX = 50;

/* ------------------------------------------------------------------ 유닛 */

/**
 * 유닛 규칙.
 *   hp/atk/armor  — 전투
 *   speed         — 초당 이동 거리 (월드 단위)
 *   range         — 공격 사거리. 2 이상이면 화살을 쏜다.
 *   rate          — 공격 간격 (초)
 *   los           — 시야 반경 (전장의 안개)
 *   from          — 생산 건물, age — 필요한 시대
 */
export const UNITS = {
    villager: {
        key: "villager", name: "주민", glyph: "주", hp: 25, atk: 3, armor: 0,
        speed: 2.7, range: 0.7, rate: 1.6, los: 7, cost: { food: 50 }, time: 8,
        from: "towncenter", age: 0, pop: 1, carry: 10, gather: 0.62, build: 1.0,
        desc: "모으고 짓는다. 마을의 전부."
    },
    clubman: {
        key: "clubman", name: "몽둥이병", glyph: "몽", hp: 40, atk: 5, armor: 0,
        speed: 2.5, range: 0.8, rate: 1.5, los: 7, cost: { food: 50 }, time: 12,
        from: "barracks", age: 0, pop: 1, desc: "돌을 묶은 몽둥이. 가장 오래된 병사."
    },
    axeman: {
        key: "axeman", name: "도끼병", glyph: "도", hp: 50, atk: 8, armor: 0,
        speed: 2.5, range: 0.8, rate: 1.5, los: 7, cost: { food: 60, wood: 20 }, time: 14,
        from: "barracks", age: 1, pop: 1, desc: "청동 날을 물린 도끼."
    },
    spearman: {
        key: "spearman", name: "창병", glyph: "창", hp: 65, atk: 11, armor: 1,
        speed: 2.4, range: 1.1, rate: 1.6, los: 7, cost: { food: 70, wood: 25 }, time: 16,
        from: "barracks", age: 2, pop: 1, desc: "줄을 지어 막는다."
    },
    cavalry: {
        key: "cavalry", name: "기병", glyph: "기", hp: 95, atk: 13, armor: 1,
        speed: 3.9, range: 0.9, rate: 1.4, los: 9, cost: { food: 90, gold: 20 }, time: 20,
        from: "barracks", age: 3, pop: 1, mounted: true, desc: "빠르게 돌아 들어간다."
    },
    archer: {
        key: "archer", name: "궁수", glyph: "궁", hp: 35, atk: 6, armor: 0,
        speed: 2.5, range: 5.4, rate: 1.9, los: 9, cost: { food: 60, wood: 30 }, time: 14,
        from: "range", age: 1, pop: 1, desc: "멀리서 쏜다. 붙으면 약하다."
    },
    crossbow: {
        key: "crossbow", name: "쇠뇌수", glyph: "뇌", hp: 42, atk: 10, armor: 1,
        speed: 2.4, range: 6.2, rate: 2.2, los: 10, cost: { food: 70, wood: 40 }, time: 18,
        from: "range", age: 3, pop: 1, desc: "쇠뇌. 한 발이 무겁다."
    },
    // 중립 동물 (사냥감)
    deer: {
        key: "deer", name: "사슴", glyph: "록", hp: 24, atk: 0, armor: 0,
        speed: 3.4, range: 0, rate: 0, los: 0, pop: 0, animal: true, food: 140,
        desc: "쫓으면 달아난다."
    },
    boar: {
        key: "boar", name: "멧돼지", glyph: "돈", hp: 60, atk: 8, armor: 0,
        speed: 3.0, range: 0.8, rate: 1.4, los: 6, pop: 0, animal: true, aggressive: true,
        food: 220, desc: "건드리면 달려든다."
    }
};

/* ---------------------------------------------------------------- 건물 */

/** (x, z, rot) 를 받아 그룹을 돌려주는 시대별 빌더 표 */
const tiers = {
    towncenter: [
        (x, z, r) => addPitHouse(x, z, r, 1.7),
        (x, z, r) => addBronzeHouse(x, z, r, 1.6),
        (x, z, r) => addSamgukHouse(x, z, r, 1.6, true),
        (x, z, r) => addGiwa(x, z, r, 1.5),
        (x, z, r) => addVillageStore(x, z, r),
        (x, z, r) => addShopBuilding(x, z, r, 4, { signColor: 0x2f5d8c })
    ],
    house: [
        (x, z, r) => addPitHouse(x, z, r, 1.0),
        (x, z, r) => addBronzeHouse(x, z, r, 1.0),
        (x, z, r) => addSamgukHouse(x, z, r, 1.0, false),
        (x, z, r) => addChoga(x, z, r, 1.0),
        (x, z, r) => addSlateHouse(x, z, r, 1.0),
        (x, z, r) => addApartment(x, z, r, 6, 5)
    ],
    granary: [
        (x, z, r) => addStoragePit(x, z, r),
        (x, z, r) => addRaisedGranary(x, z, r),
        (x, z, r) => addRaisedGranary(x, z, r),
        (x, z, r) => addJarPlatform(x, z, r),
        (x, z, r) => addWarehouse(x, z, r),
        (x, z, r) => addConvenienceStore(x, z, r)
    ],
    storage: [
        (x, z, r) => addLumberCamp(x, z, r, 0),
        (x, z, r) => addLumberCamp(x, z, r, 1),
        (x, z, r) => addLumberCamp(x, z, r, 2),
        (x, z, r) => addLumberCamp(x, z, r, 3),
        (x, z, r) => addLumberCamp(x, z, r, 4),
        (x, z, r) => addLumberCamp(x, z, r, 5)
    ],
    barracks: [
        (x, z, r) => addBarracksHut(x, z, r, 0),
        (x, z, r) => addBarracksHut(x, z, r, 1),
        (x, z, r) => addBarracksHut(x, z, r, 2),
        (x, z, r) => addBarracksHut(x, z, r, 3),
        (x, z, r) => addBarracksHut(x, z, r, 4),
        (x, z, r) => addBarracksHut(x, z, r, 5)
    ],
    range: [
        (x, z, r) => addArcheryRange(x, z, r, 0),
        (x, z, r) => addArcheryRange(x, z, r, 1),
        (x, z, r) => addArcheryRange(x, z, r, 2),
        (x, z, r) => addArcheryRange(x, z, r, 3),
        (x, z, r) => addArcheryRange(x, z, r, 4),
        (x, z, r) => addArcheryRange(x, z, r, 5)
    ],
    farm: [
        (x, z, r) => addRicePaddyPlot(x, z, r),
        (x, z, r) => addRicePaddyPlot(x, z, r),
        (x, z, r) => addRicePaddyPlot(x, z, r),
        (x, z, r) => addRicePaddyPlot(x, z, r),
        (x, z, r) => addRicePaddyPlot(x, z, r),
        (x, z, r) => addRicePaddyPlot(x, z, r)
    ],
    tower: [
        (x, z, r) => addWatchtower(x, z, r),
        (x, z, r) => addWatchtower(x, z, r),
        (x, z, r) => addTowerTall(x, z, r),
        (x, z, r) => addTowerTall(x, z, r),
        (x, z, r) => addWatchtower(x, z, r),
        (x, z, r) => addTowerTall(x, z, r)
    ],
    wall: [
        (x, z, r) => addWallBlock(x, z, r, 0),
        (x, z, r) => addWallBlock(x, z, r, 1),
        (x, z, r) => addWallBlock(x, z, r, 2),
        (x, z, r) => addWallBlock(x, z, r, 3),
        (x, z, r) => addWallBlock(x, z, r, 4),
        (x, z, r) => addWallBlock(x, z, r, 5)
    ]
};

/**
 * 건물 규칙.
 *   radius   — 차지하는 반경 (배치 간격과 충돌 판정)
 *   drop     — 이 건물에 자원을 내려놓을 수 있다 ("*" 는 전부)
 *   trains   — 여기서 뽑는 유닛
 *   pop      — 늘려 주는 인구 상한
 */
export const BUILDINGS = {
    towncenter: {
        key: "towncenter", name: "마을회관", glyph: "회", hp: 600, armor: 3,
        cost: { wood: 200, stone: 100 }, time: 40, radius: 2.4, los: 11, age: 0,
        drop: "*", pop: 4, trains: ["villager"], ageUp: true,
        desc: "주민을 뽑고 시대를 연다. 모든 자원을 내려놓을 수 있다."
    },
    house: {
        key: "house", name: "집", glyph: "집", hp: 200, armor: 2,
        cost: { wood: 30 }, time: 14, radius: 1.5, los: 5, age: 0, pop: 4,
        desc: "인구 상한이 4 늘어난다."
    },
    granary: {
        key: "granary", name: "곡식창고", glyph: "곡", hp: 250, armor: 2,
        cost: { wood: 120 }, time: 20, radius: 1.6, los: 6, age: 0, drop: "food",
        desc: "식량을 내려놓는 곳."
    },
    storage: {
        key: "storage", name: "저장고", glyph: "저", hp: 250, armor: 2,
        cost: { wood: 120 }, time: 20, radius: 1.6, los: 6, age: 0,
        drop: "wood|stone|gold", desc: "나무 · 돌 · 금을 내려놓는 곳."
    },
    barracks: {
        key: "barracks", name: "병영", glyph: "병", hp: 350, armor: 2,
        cost: { wood: 125 }, time: 26, radius: 2.0, los: 6, age: 0,
        trains: ["clubman", "axeman", "spearman", "cavalry"],
        desc: "근접 병사를 뽑는다."
    },
    range: {
        key: "range", name: "활터", glyph: "활", hp: 350, armor: 2,
        cost: { wood: 150 }, time: 28, radius: 2.0, los: 6, age: 1,
        trains: ["archer", "crossbow"], desc: "활을 쏘는 병사를 뽑는다."
    },
    farm: {
        key: "farm", name: "농장", glyph: "농", hp: 70, armor: 0,
        cost: { wood: 75 }, time: 14, radius: 1.7, los: 3, age: 0,
        farm: 250, desc: "주민이 식량을 거둔다 (250). 다 거두면 사라진다."
    },
    tower: {
        key: "tower", name: "망루", glyph: "망", hp: 320, armor: 4,
        cost: { stone: 150 }, time: 26, radius: 1.3, los: 11, age: 1,
        atk: 9, range: 7.0, rate: 2.0, desc: "다가오는 적을 쏜다. 멀리 본다."
    },
    wall: {
        key: "wall", name: "성벽", glyph: "벽", hp: 250, armor: 6,
        cost: { stone: 5 }, time: 4, radius: 0.95, los: 3, age: 1,
        desc: "길을 막는다. 한 칸씩 세운다."
    }
};

/** 시대별 모습 */
export function buildingMesh(type, age, x, z, rot) {
    const table = tiers[type] || tiers.house;
    const fn = table[Math.max(0, Math.min(table.length - 1, age))];
    return fn(x, z, rot);
}

/** 이 건물이 그 자원을 받는가 */
export function accepts(b, res) {
    if (!b.def.drop) return false;
    if (b.def.drop === "*") return true;
    return b.def.drop.split("|").includes(res);
}

/** 진영 색 (0 = 나, 1 = 적, 2 = 중립) */
export const TEAM = [
    { name: "나", color: 0x4d7fd6, css: "#5b8ee8", dark: 0x24406e },
    { name: "적", color: 0xc2452f, css: "#d8563c", dark: 0x6d2216 },
    { name: "들짐승", color: 0x9a8a5c, css: "#9a8a5c", dark: 0x4a4230 }
];
