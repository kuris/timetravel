/**
 * nodes.js — 땅에 있는 자원
 *
 * 나무 · 덤불 · 돌 · 금, 그리고 사냥한 짐승과 농장.
 * 다 거두면 사라지고, 주민은 가까운 같은 자원을 스스로 찾아간다.
 */
import { G } from "../state.js";
import {
    makeBerryBush, makeCarcass, makeGoldMine, makeNodePin, makeStoneMine, makeStump, makeTree
} from "./models.js";
import { R, nextId } from "./state.js";
import { disposeObj } from "./util.js";

/** 자원 하나를 놓는다 */
const NODE_DEF = {
    wood: { name: "나무", glyph: "목" },
    food: { name: "먹을 것", glyph: "식" },
    stone: { name: "돌", glyph: "석" },
    gold: { name: "금", glyph: "금" }
};

/**
 * 자원 이름표 색.
 *
 * 숲은 빽빽해서 이름표를 달면 글자 숲이 된다 — 나무에는 달지 않는다.
 * 덤불 · 돌 · 금은 드문드문 있고, 그래서 찾기 어렵다. 그것만 달아 준다.
 */
const NODE_TAG = {
    food: 0xe2542f,
    stone: 0xd4cec4,
    gold: 0xf2c430
};

export function tagNode(node, opts = {}) {
    const hex = NODE_TAG[node.kind];
    if (!hex || !node.group) return null;
    const tag = makeNodePin(hex, opts.y ?? 1.5);
    // 쓰러진 짐승처럼 모형이 기울어 있으면 표시만 되세운다
    if (opts.rotZ) tag.rotation.z = opts.rotZ;
    node.group.add(tag);
    node.tag = tag;
    return tag;
}

function addNodeTag(node) {
    return tagNode(node);
}

export function addNode(kind, x, z, amount, group, opts = {}) {
    const node = {
        id: nextId(),
        kind, x, z,
        owner: 2,
        def: NODE_DEF[kind],
        hp: amount, maxHp: amount,
        amount,
        max: amount,
        group,
        radius: opts.radius ?? 0.7,
        farm: opts.farm || null,   // 농장이면 그 건물
        carcass: !!opts.carcass,
        alive: true
    };
    R.nodes.push(node);
    return node;
}

/** 나무는 베고 나면 그루터기를 남긴다 */
export function removeNode(node, opts = {}) {
    node.alive = false;
    const i = R.nodes.indexOf(node);
    if (i >= 0) R.nodes.splice(i, 1);

    if (node.group) disposeObj(node.group);

    if (opts.stump) {
        const s = makeStump(node.x, node.z);
        G.world.add(s);
    }
}

/** 가까운 같은 자원. 주민이 하나를 다 캔 뒤 스스로 찾아간다. */
export function nearestNode(kind, x, z, maxDist = 34, exclude = null) {
    let best = null, bd = maxDist * maxDist;
    for (const n of R.nodes) {
        if (!n.alive || n.kind !== kind || n === exclude) continue;
        const d = (n.x - x) ** 2 + (n.z - z) ** 2;
        if (d < bd) { bd = d; best = n; }
    }
    return best;
}

/** 자원 모형 만들기 (지도 생성에서 쓴다) */
export function spawnResource(kind, x, z, amount) {
    let group;
    if (kind === "wood") group = makeTree(x, z);
    else if (kind === "food") group = makeBerryBush(x, z);
    else if (kind === "stone") group = makeStoneMine(x, z);
    else group = makeGoldMine(x, z);

    G.world.add(group);
    const node = addNode(kind, x, z, amount, group, { radius: kind === "wood" ? 0.8 : 1.0 });
    addNodeTag(node);
    return node;
}

/** 장면을 다시 지었을 때 자원 모형을 되살린다 */
export function remakeNodeMesh(n) {
    let group;
    if (n.farm) return;                       // 농장은 건물이 그린다
    if (n.carcass) group = makeCarcass(n.x, n.z);
    else if (n.kind === "wood") group = makeTree(n.x, n.z);
    else if (n.kind === "food") group = makeBerryBush(n.x, n.z);
    else if (n.kind === "stone") group = makeStoneMine(n.x, n.z);
    else group = makeGoldMine(n.x, n.z);

    G.world.add(group);
    n.group = group;
    addNodeTag(n);
}
