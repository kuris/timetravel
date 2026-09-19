/**
 * materials.js — 탐험으로 줍는 재료
 *
 * 공유 자연 지형(basemap)에서 일부를 골라 "주울 수 있는 것"으로 표시한다.
 * 돌무더기와 쓰러진 나무. 걸어가서 E 를 누르면 재료가 된다.
 *
 * 재료는 시대를 넘어 유지되므로, 신석기에서 모은 나무로
 * 청동기에서 집을 지을 수도 있다.
 */
import { addBlob, addCylinder, makeMat } from "./build.js";
import { registerInteractable } from "./interaction.js";
import { rand, randRange } from "./rng.js";
import { G } from "./state.js";
import { isUnderwater, terrainHeight } from "./terrain.js";

/**
 * 시대마다 맵에 놓이는 재료 노드 수.
 *
 * 발전도 목표가 시대마다 30 → 80 으로 늘어나므로 공급도 같이 늘어야 한다.
 * 고정값으로 두었더니 1970년대에서 나무가 말라 진행이 막혔다.
 *
 * 비용이 나무 쪽으로 기울어 있어(집 나무3/돌1) 나무를 더 많이 놓는다.
 */
function nodeCount(era) {
    return { wood: 8 + era * 2, stone: 7 + era };
}

/** 쓰러진 나무 — 나무 재료 */
function makeWoodNode(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = randRange(0, Math.PI);
    G.world.add(g);

    // 쓰러진 줄기
    const log = addCylinder(g, 0.17, 0.2, 2.2, 6, 0x5c4028, 0, 0.19, 0,
        { roughness: 1, map: G.TEX.wood });
    log.rotation.z = Math.PI / 2;

    // 잘린 토막 몇 개
    for (let i = 0; i < 3; i++) {
        const piece = addCylinder(g, 0.12, 0.13, 0.5, 6, 0x6b4a2c,
            randRange(-0.9, 0.9), 0.13, randRange(0.4, 0.8),
            { roughness: 1, map: G.TEX.wood, castShadow: false });
        piece.rotation.z = Math.PI / 2;
        piece.rotation.y = randRange(0, Math.PI);
    }
    return g;
}

/** 돌무더기 — 돌 재료 */
function makeStoneNode(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = randRange(0, Math.PI);
    G.world.add(g);

    for (let i = 0; i < 6; i++) {
        const r = randRange(0.18, 0.34);
        addBlob(g, r, [0x807a70, 0x6f6960, 0x938b7e][Math.floor(rand() * 3)],
            randRange(-0.6, 0.6), r * 0.5, randRange(-0.5, 0.5), {
            sx: randRange(1, 1.5), sy: randRange(0.6, 1.0), sz: randRange(0.9, 1.3),
            ry: randRange(0, Math.PI), roughness: 1, map: G.TEX.stone
        });
    }
    return g;
}

/**
 * 재료 노드를 뿌린다. 시대를 지을 때마다 새로 놓인다.
 * basemap 의 자갈·나무 자리를 빌려 쓰되, 마을 한가운데는 피한다.
 */
export function scatterMaterials(era = G.currentAge) {
    if (!G.baseMap) return;
    const count = nodeCount(Math.max(0, era));

    const place = (kind, count, make) => {
        let placed = 0, guard = 0;
        while (placed < count && guard++ < 400) {
            const a = randRange(0, Math.PI * 2);
            const r = randRange(7, 28);
            const x = Math.cos(a) * r, z = Math.sin(a) * r;
            if (isUnderwater(x, z)) continue;

            // 이미 지은 건물과 겹치지 않게
            let tooClose = false;
            for (const b of G.village) {
                if (Math.hypot(b.x - x, b.z - z) < 3.0) { tooClose = true; break; }
            }
            if (tooClose) continue;

            const group = make(x, z);
            registerInteractable({
                name: kind === "wood" ? "나무" : "돌",
                description: "",
                group,
                pickup: true,
                range: 1.9,
                glowColor: kind === "wood" ? 0xa87a3a : 0x9aa0a8,
                material: kind,
                // 돌은 덜 쓰이므로 적게, 나무는 많이 든다
                amount: kind === "wood"
                    ? Math.floor(randRange(2, 4))
                    : Math.floor(randRange(1, 3))
            });
            placed++;
        }
    };

    place("wood", count.wood, makeWoodNode);
    place("stone", count.stone, makeStoneNode);
}
