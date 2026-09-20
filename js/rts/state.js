/**
 * state.js — RTS 한 판의 상태
 *
 * G (three.js 장면) 와는 따로 둔다. R 은 "규칙의 세계", G 는 "보이는 세계"다.
 * 시대가 올라 장면을 다시 지어도 R 은 그대로 살아남는다.
 */
import { POP_MAX } from "./defs.js";

export const R = {
    age: 0,
    time: 0,
    started: false,
    over: null,            // "win" | "lose"

    // 두 진영 (0 = 나, 1 = 적)
    players: [
        { age: 0, res: { food: 200, wood: 200, stone: 150, gold: 100 }, pop: 0, popCap: 0, ageUp: null },
        { age: 0, res: { food: 200, wood: 200, stone: 150, gold: 100 }, pop: 0, popCap: 0, ageUp: null }
    ],

    units: [],
    buildings: [],
    nodes: [],
    projectiles: [],
    effects: [],

    selection: [],
    groups: {},            // 숫자키 부대 지정
    placing: null,         // { type } — 건물을 놓는 중
    placeOk: false,
    ghost: null,
    attackMove: false,     // A 를 누른 뒤 목표를 찍는 중
    rallyFrom: null,

    hovered: null,
    lastEvent: null,       // 스페이스바로 찾아가는 마지막 사건 위치

    nextId: 1,
    messages: [],

    // 전장의 안개
    fog: null,

    // 안내 (tutorial.js 가 채운다. ai.js 는 active 만 본다)
    tutorial: { active: false, shown: false, step: 0, point: null },

    // HUD 갱신 요청 플래그
    dirty: { res: true, sel: true, cmd: true }
};

export const POP_LIMIT = POP_MAX;

export function nextId() {
    return R.nextId++;
}

/** 내 것인지 */
export function mine(e) {
    return e && e.owner === 0 && e.alive !== false;
}

export function resetRts() {
    R.age = 0;
    R.time = 0;
    R.over = null;
    R.units.length = 0;
    R.buildings.length = 0;
    R.nodes.length = 0;
    R.projectiles.length = 0;
    R.effects.length = 0;
    R.selection.length = 0;
    R.groups = {};
    R.placing = null;
    R.ghost = null;
    R.attackMove = false;
    R.nextId = 1;
    R.messages.length = 0;
    R.tutorial.active = false;
    R.tutorial.shown = false;
    R.tutorial.step = 0;
    R.tutorial.point = null;
    for (const p of R.players) {
        p.age = 0;
        p.res = { food: 200, wood: 200, stone: 150, gold: 100 };
        p.pop = 0;
        p.popCap = 0;
        p.ageUp = null;
    }
    R.dirty.res = R.dirty.sel = R.dirty.cmd = true;
}
