/**
 * 5시대 — 1970년대 · 시골 마을
 *
 * 조선과 가장 크게 달라지는 것:
 *   - 하늘에 전선이 걸린다 (전봇대)
 *   - 초가지붕이 슬레이트로 바뀐다 (새마을운동)
 *   - 흙길이 신작로가 되고 버스가 들어온다
 *   - 시멘트 블록 담이 돌담을 밀어낸다
 *
 * 이 시대의 이야기:
 *   마을 안길을 넓히면서 그 돌을 치우려 했다.
 *   공사가 중간에 멈췄고, 서류에는 이유가 적혀 있지 않다.
 */
import { paintBaseMap } from "../basemap.js";
import { addBlob, addBox, addCone, addCylinder, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { registerInteractable } from "../interaction.js";
import { GATE_SPOT, S, addRiver, carveRiver, riverPoint } from "../landmarks.js";
import { addMapMarker } from "../minimap.js";
import { addBirdFlock, addCow, addDog, addVillager, addWorker } from "../npc.js";
import { addBridge, addCart, addCropField, addHayStack, addJarPlatform, addLaundryLine } from "../props.js";
import {
    addBench, addBicycle, addConcreteWall, addHandPump, addPowerLine, addPowerPole,
    addRoad, addRoadSign, addSign, addStreetLamp, addStreetTree, addUtilityBox, addVehicle
} from "../props_modern.js";
import { pick, rand, randRange } from "../rng.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { addGround, addStonePath, addTreeLine } from "../world.js";
import { addFirewood, addReedCluster, addStonePile, createTimeGate } from "./neolithic.js";
import { addRicePaddy } from "./bronze.js";
import { addChoga } from "./joseon.js";

/* ================================================================
   새마을 시대의 집
   ================================================================ */
/**
 * 슬레이트 지붕 집.
 * 초가를 걷어내고 골함석/슬레이트를 얹었다.
 * 지붕 색(청록, 파랑, 주황)이 이 시대의 표식이다.
 */
export function addSlateHouse(x, z, rot, scale = 1) {
    addMapMarker(x, z, "#6f8a92", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    G.world.add(g);

    const w = 5.2, d = 3.2, wallH = 1.9;
    const slate = pick([0x4f6f74, 0x3f5a72, 0x7a5a42, 0x54685a]);

    // 시멘트 기단
    addBox(g, w + 0.5, 0.26, d + 0.5, 0x8e8980, 0, 0.13, 0, 0,
        { roughness: 1, map: G.TEX.stone });

    // 흙벽에 시멘트를 바른 벽
    addBox(g, w, wallH, d, pick([0xbfb5a2, 0xc7bca6, 0xb0a691]),
        0, 0.26 + wallH / 2, 0, 0, { roughness: 1, map: G.TEX.dirtObj });

    // 지붕: 맞배 형태를 두 장의 판으로
    for (const sx of [-1, 1]) {
        const panel = addBox(g, w * 0.62, 0.12, d + 0.9, slate,
            sx * w * 0.24, 0.26 + wallH + 0.42, 0, 0,
            { roughness: 0.7, metalness: 0.15 });
        panel.rotation.z = -sx * 0.42;
    }
    // 용마루
    addBox(g, 0.3, 0.14, d + 0.9, slate, 0, 0.26 + wallH + 0.78, 0, 0,
        { roughness: 0.7, castShadow: false });

    // 골 무늬
    for (let i = 0; i < 9; i++) {
        addBox(g, 0.04, 0.03, d + 0.85, 0x2f3a3c,
            -w * 0.45 + i * (w * 0.9 / 8), 0.26 + wallH + 0.5, 0, 0,
            { castShadow: false });
    }

    // 툇마루
    addBox(g, w * 0.8, 0.14, 0.8, 0x7a5530, 0, 0.32, d / 2 + 0.4, 0,
        { roughness: 1, map: G.TEX.wood });

    // 미닫이 유리문
    const lit = rand() > 0.35;
    for (let i = 0; i < 2; i++) {
        addBox(g, w * 0.26, wallH * 0.62, 0.06,
            lit ? 0xf0c078 : 0x6f6a5c,
            -w * 0.16 + i * w * 0.32, 0.26 + wallH * 0.45, d / 2 + 0.04, 0, {
            material: makeBasicMat(lit ? 0xf0c078 : 0x6f6a5c,
                { transparent: true, opacity: 0.88 }),
            castShadow: false
        });
    }
    if (lit) {
        const light = new THREE.PointLight(0xffb570, 1.4, 8);
        light.position.set(0, 0.26 + wallH * 0.5, d / 2 + 1.0);
        g.add(light);
    }

    // 굴뚝
    addBox(g, 0.34, 0.9, 0.34, 0x9a958c, w * 0.36, 0.26 + wallH + 0.8, -d * 0.3, 0,
        { roughness: 1, map: G.TEX.stone });

    // 장독대와 빨래
    addBox(g, 0.5, 0.5, 0.5, 0x6f6a62, -w * 0.4, 0.5, d / 2 + 0.7, 0.3,
        { roughness: 1, castShadow: false });

    return g;
}

/** 구멍가게: 간판과 평상, 음료 냉장고 */
export function addVillageStore(x, z, rot) {
    addMapMarker(x, z, "#b0553a", 4, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const w = 6.0, d = 3.6, wallH = 2.4;

    addBox(g, w + 0.4, 0.3, d + 0.4, 0x8e8980, 0, 0.15, 0, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, w, wallH, d, 0xc2b7a2, 0, 0.3 + wallH / 2, 0, 0,
        { roughness: 1, map: G.TEX.dirtObj });

    // 기와를 얹은 낮은 지붕
    for (const sx of [-1, 1]) {
        const panel = addBox(g, w * 0.6, 0.14, d + 1.0, 0x4a4f56,
            sx * w * 0.24, 0.3 + wallH + 0.34, 0, 0, { roughness: 0.8 });
        panel.rotation.z = -sx * 0.32;
    }
    addBox(g, 0.32, 0.16, d + 1.0, 0x3a3f46, 0, 0.3 + wallH + 0.62, 0, 0, { castShadow: false });

    // 차양
    addBox(g, w, 0.08, 1.3, 0xb0654a, 0, 0.3 + wallH * 0.82, d / 2 + 0.6, 0,
        { roughness: 0.85, castShadow: false });
    for (const sx of [-1, 1]) {
        addCylinder(g, 0.05, 0.05, wallH * 0.82, 5, 0x6f6a62,
            sx * w * 0.42, 0.3 + wallH * 0.41, d / 2 + 1.15, { castShadow: false });
    }

    // 간판
    addSign(g, 0, 0.3 + wallH + 0.15, d / 2 + 0.1, w * 0.78, 0.66, 0xb8482f,
        { lit: true, textColor: 0xf3e2c0 });

    // 열린 진열창
    addBox(g, w * 0.5, wallH * 0.5, 0.06, 0x3a3f46, 0, 0.3 + wallH * 0.42, d / 2 + 0.04, 0, {
        material: makeBasicMat(0x3a3f46, { transparent: true, opacity: 0.6 }), castShadow: false
    });

    // 음료 냉장고
    addBox(g, 0.75, 1.5, 0.6, 0xa8312a, w * 0.38, 0.3 + 0.75, d / 2 + 0.55, 0,
        { roughness: 0.6 });
    addBox(g, 0.6, 0.9, 0.05, 0xe8d8a8, w * 0.38, 0.3 + 0.95, d / 2 + 0.86, 0, {
        material: makeBasicMat(0xe8d8a8, { transparent: true, opacity: 0.8 }), castShadow: false
    });

    // 평상
    addBox(g, 2.0, 0.12, 1.3, 0x8a6a45, -w * 0.3, 0.7, d / 2 + 1.4, 0,
        { roughness: 1, map: G.TEX.wood });
    for (const [px, pz] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) {
        addCylinder(g, 0.07, 0.08, 0.64, 5, 0x6d4a26,
            -w * 0.3 + px, 0.32, d / 2 + 1.4 + pz, { castShadow: false });
    }

    // 쌓아 둔 상자
    for (let i = 0; i < 4; i++) {
        addBox(g, 0.5, 0.35, 0.4, pick([0x8a7a58, 0x6f6a52, 0x9c8a62]),
            -w * 0.42 + randRange(-0.2, 0.2), 0.48 + i * 0.36, d / 2 + 0.6, randRange(0, 0.4),
            { roughness: 1, castShadow: false });
    }

    return g;
}

/** 창고 / 정미소: 골함석 벽의 큰 건물 */
export function addWarehouse(x, z, rot) {
    addMapMarker(x, z, "#7a736a", 4, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const w = 7.0, d = 4.6, wallH = 3.0;

    addBox(g, w + 0.4, 0.3, d + 0.4, 0x8e8980, 0, 0.15, 0, 0, { roughness: 1 });
    addBox(g, w, wallH, d, 0x9a958c, 0, 0.3 + wallH / 2, 0, 0,
        { roughness: 0.8, metalness: 0.1 });

    // 골함석 무늬
    for (let i = 0; i < 16; i++) {
        addBox(g, 0.05, wallH, 0.04, 0x7f7a72,
            -w / 2 + i * (w / 15), 0.3 + wallH / 2, d / 2 + 0.02, 0, { castShadow: false });
    }

    for (const sx of [-1, 1]) {
        const panel = addBox(g, w * 0.6, 0.14, d + 0.8, 0x5f6a66,
            sx * w * 0.24, 0.3 + wallH + 0.4, 0, 0, { roughness: 0.7, metalness: 0.15 });
        panel.rotation.z = -sx * 0.38;
    }
    addBox(g, 0.34, 0.16, d + 0.8, 0x4a5450, 0, 0.3 + wallH + 0.72, 0, 0, { castShadow: false });

    // 큰 미닫이문
    addBox(g, w * 0.44, wallH * 0.8, 0.08, 0x5a5048, 0, 0.3 + wallH * 0.4, d / 2 + 0.05, 0,
        { roughness: 0.8 });

    // 쌓아 둔 가마니
    for (let i = 0; i < 7; i++) {
        addBox(g, 0.7, 0.4, 0.5, pick([0xb5a273, 0xa8956a, 0xc2b084]),
            -w * 0.36 + (i % 3) * 0.78, 0.5 + Math.floor(i / 3) * 0.42, d / 2 + 1.1,
            randRange(-0.15, 0.15), { roughness: 1, map: G.TEX.thatch, castShadow: false });
    }

    return g;
}

/** 태극기 게양대 (면사무소 / 학교 앞) */
export function addFlagPole(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    addCylinder(g, 0.18, 0.28, 0.5, 8, 0x9a958c, 0, 0.25, 0, { roughness: 1 });
    addCylinder(g, 0.055, 0.07, 6.5, 6, 0xc4bfb6, 0, 3.5, 0, { roughness: 0.6, metalness: 0.3 });

    // 깃발
    const flag = addBox(g, 1.5, 1.0, 0.03, 0xe8e2d4, 0.8, 6.0, 0, 0,
        { roughness: 1, map: G.TEX.cloth, castShadow: false });
    // 가운데 문양 (붉은/푸른 원을 단순화)
    addBox(g, 0.36, 0.18, 0.02, 0xa8312a, 0.8, 6.09, 0.03, 0,
        { material: makeBasicMat(0xa8312a), castShadow: false });
    addBox(g, 0.36, 0.18, 0.02, 0x2f4a7a, 0.8, 5.91, 0.03, 0,
        { material: makeBasicMat(0x2f4a7a), castShadow: false });

    G.animated.push({
        type: "sway", group: flag,
        amp: 0.09, speed: randRange(1.2, 1.9), phase: randRange(0, Math.PI * 2)
    });

    return g;
}

/** 새마을 표어 간판 */
export function addSaemaulSign(x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    for (const sx of [-1, 1]) {
        addCylinder(g, 0.07, 0.09, 2.6, 5, 0x6d4a26, sx * 0.85, 1.3, 0,
            { roughness: 1, map: G.TEX.wood });
    }
    addBox(g, 2.1, 1.4, 0.1, 0x3f6a4a, 0, 2.0, 0, 0, { roughness: 0.8 });
    // 표어 글줄
    for (let i = 0; i < 3; i++) {
        addBox(g, 1.5, 0.16, 0.03, 0xe8dcc0, 0, 2.4 - i * 0.4, 0.06, 0,
            { material: makeBasicMat(0xe8dcc0, { transparent: true, opacity: 0.9 }),
              castShadow: false });
    }
    return g;
}

/** 경운기 */
export function addTractor(x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    // 엔진부
    addBox(g, 0.9, 0.7, 1.3, 0x5a6a52, 0, 0.75, 0.3, 0, { roughness: 0.6, metalness: 0.3 });
    // 굴뚝
    addCylinder(g, 0.08, 0.1, 0.7, 6, 0x3a3530, 0.3, 1.35, 0.6, { castShadow: false });
    // 손잡이
    for (const sx of [-1, 1]) {
        const bar = addCylinder(g, 0.04, 0.04, 1.8, 5, 0x4a443c, sx * 0.35, 1.0, -0.8,
            { castShadow: false });
        bar.rotation.x = 0.55;
    }
    // 큰 바퀴
    for (const sx of [-1, 1]) {
        const wheel = addCylinder(g, 0.55, 0.55, 0.28, 10, 0x2b2824, sx * 0.62, 0.55, 0.3,
            { roughness: 0.95 });
        wheel.rotation.z = Math.PI / 2;
    }
    // 끌고 다니는 수레
    addBox(g, 1.4, 0.16, 1.8, 0x7a5530, 0, 0.6, -1.7, 0, { roughness: 1, map: G.TEX.wood });
    for (const sx of [-1, 1]) {
        const wheel = addCylinder(g, 0.34, 0.34, 0.18, 8, 0x2b2824, sx * 0.72, 0.34, -1.7,
            { castShadow: false });
        wheel.rotation.z = Math.PI / 2;
    }

    addMapMarker(x, z, "#6f7a5e", 2.5, "prop");
    return g;
}

/* ================================================================
   유물
   ================================================================ */

/** 새마을 공사 기록: 안길 넓히기 공사 서류 */
export function createConstructionRecord(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z) + 0.04, z);
    g.rotation.y = -0.4;
    G.world.add(g);

    // 나무 상자 위에 눌러 둔 서류철
    addBox(g, 0.9, 0.4, 0.7, 0x8a7a58, 0, 0.2, 0, 0, { roughness: 1, map: G.TEX.wood });
    addBox(g, 0.62, 0.09, 0.46, 0xd8cdb0, 0, 0.44, 0, 0.2, { roughness: 1 });
    addBox(g, 0.6, 0.03, 0.44, 0xbfb08c, 0, 0.5, 0, 0.26, { castShadow: false });
    // 붉은 도장
    addBox(g, 0.12, 0.012, 0.12, 0xa8312a, 0.18, 0.52, 0.12, 0.26,
        { material: makeBasicMat(0xa8312a), castShadow: false });
    // 눌러 둔 돌
    addBlob(g, 0.14, 0x77706a, -0.18, 0.55, -0.1,
        { sy: 0.6, roughness: 1, map: G.TEX.stone, castShadow: false });

    return g;
}

/** 마을 어른의 수첩 */
export function createOldNotebook(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z) + 0.04, z);
    g.rotation.y = 0.6;
    G.world.add(g);

    addBox(g, 0.34, 0.07, 0.48, 0x5a4a3a, 0, 0.04, 0, 0, { roughness: 1 });
    addBox(g, 0.32, 0.05, 0.46, 0xd8cdb0, 0, 0.09, 0.01, 0.06, { roughness: 1 });
    // 손글씨 줄
    for (let i = 0; i < 5; i++) {
        addBox(g, 0.22, 0.008, 0.02, 0x3a3228, 0, 0.12, -0.16 + i * 0.08, 0.06,
            { castShadow: false });
    }
    // 끼워 둔 연필
    const pencil = addCylinder(g, 0.014, 0.014, 0.4, 5, 0xb08a3a, 0.22, 0.06, 0,
        { castShadow: false });
    pencil.rotation.z = Math.PI / 2;
    pencil.rotation.y = 0.3;

    return g;
}

/** 치우다 만 흙더미: 공사가 멈춘 자리 */
export function createAbandonedDig(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = 0.2;
    G.world.add(g);

    // 파헤친 흙
    addFlatCircle(g, 2.0, 0x6b5238, 0, 0.03, 0, 10, {
        material: makeMat(0x6b5238, {
            transparent: true, opacity: 0.75, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1, map: G.TEX.dirtObj
        })
    });

    // 퍼낸 흙더미
    for (let i = 0; i < 6; i++) {
        const a = randRange(0, Math.PI * 2), r = randRange(1.2, 1.9);
        addBlob(g, randRange(0.35, 0.6), pick([0x7d6343, 0x6b5238, 0x8a6f4a]),
            Math.cos(a) * r, 0.2, Math.sin(a) * r, {
            sx: randRange(1.2, 1.7), sy: randRange(0.5, 0.8), sz: randRange(1.1, 1.5),
            ry: a, roughness: 1, map: G.TEX.dirtObj, castShadow: false
        });
    }

    // 버려진 삽과 곡괭이
    const shovel = addCylinder(g, 0.028, 0.028, 1.4, 5, 0x8a6a45, 0.6, 0.35, 0.3,
        { map: G.TEX.wood });
    shovel.rotation.z = 0.9;
    addBox(g, 0.24, 0.04, 0.3, 0x5f5a52, 1.15, 0.08, 0.3, 0.2,
        { roughness: 0.5, metalness: 0.4, castShadow: false });

    // 세워 둔 공사 팻말
    addCylinder(g, 0.05, 0.06, 1.3, 5, 0x6d4a26, -1.3, 0.65, 0.4, { map: G.TEX.wood });
    addBox(g, 0.8, 0.42, 0.06, 0xc4a23a, -1.3, 1.25, 0.4, 0.15, { roughness: 0.8 });
    addBox(g, 0.6, 0.08, 0.02, 0x3a3228, -1.3, 1.3, 0.44, 0.15,
        { material: makeBasicMat(0x3a3228), castShadow: false });

    return g;
}

/* ================================================================
   마을
   ================================================================ */
export function build1970() {
    // 배치용 화면 좌표.
    //
    // 육지는 화면 좌표 v < 7.6 까지만 있다 (그 위는 강이다).
    // 이 시대의 배치는 v 를 넓게 잡아 두었으므로, 여기서 한 번에
    // 육지 범위 안으로 눌러 넣는다. 덕분에 배치 코드는 읽기 쉬운 값을 그대로 쓴다.
    const P = (u, v) => S(u, v * 0.78378 + -13.02703);

    // 같은 강. 이제 시멘트 다리가 놓였다.
    G.terrainCarve = carveRiver;

    addGround(0x87724f, [0xa08a5e, 0x6f5f42, 0x967f55, 0x5c5340, 0xb59a6a]);

    // 신석기의 그 바위가 아직 그 자리에 있다. 이제 시멘트 담장 옆이다.
    // 마을이 커지면서 나무가 절반 넘게 베였다.
    paintBaseMap({
        stone: [0x7c766c, 0x655f58, 0x8f887c],
        grass: [0x6f7a3c, 0x5a6431, 0x7f8a48, 0x4c5329],
        tree: [0x53602f, 0x455127, 0x61703a],
        treeSurvival: 0.45,
        grassDensity: 0.7
    });
    addTreeLine([0x53602f, 0x455127, 0x61703a], 34, 24, 36);

    addRiver();
    for (let i = 0; i < 20; i++) {
        const [rx, rz] = riverPoint(randRange(-30, 30), randRange(-0.5, 4.5));
        addReedCluster(rx, rz, Math.floor(randRange(4, 8)));
    }

    // ================================================================
    // 신작로 — 이 시대의 뼈대. 마을을 가로지르는 곧은 길.
    // ================================================================
    let a = P(-27, 1), b = P(27, -7);
    addRoad(a[0], a[1], b[0], b[1], 5.0, { paved: false });

    // 마을 안길 (그 돌 쪽으로 이어지다 끊긴다)
    a = P(6, -3); b = P(18, -5);
    addRoad(a[0], a[1], b[0], b[1], 3.2, { paved: false });

    // 강을 건너는 시멘트 다리
    // 다리는 강을 건너야 하므로 압축하지 않은 좌표(S)를 쓴다
    const br1 = S(-16, 4), br2 = S(-18, 17);
    addBridge(br1[0], br1[1], br2[0], br2[1], 2.4);

    // ================================================================
    // 전봇대와 전선 — 하늘을 가른다
    // ================================================================
    const poleSpots = [[-26, 4], [-17, 3], [-8, 2], [1, 0], [10, -2], [19, -4], [26, -6]];
    const poles = [];
    for (let i = 0; i < poleSpots.length; i++) {
        const c = P(poleSpots[i][0], poleSpots[i][1]);
        poles.push(addPowerPole(c[0], c[1], {
            transformer: i === 2 || i === 5,
            height: randRange(6.2, 7.0)
        }));
    }
    addPowerLine(poles);

    // 마을 안쪽으로 갈라지는 전선
    const branch = [];
    for (const [bu, bv] of [[1, 0], [3, 8], [5, 15]]) {
        const c = P(bu, bv);
        branch.push(addPowerPole(c[0], c[1], { height: randRange(5.8, 6.4) }));
    }
    addPowerLine(branch);

    // ================================================================
    // 마을은 없다.
    // 신작로와 전봇대는 지나갈 뿐이고, 여기 사는 사람은 나뿐이다.
    // ================================================================
    let q;




    // 표지판과 배전함
    q = P(-9, 3); addRoadSign(q[0], q[1], 0.78, 0x2f6a4a);
    q = P(12, -1); addRoadSign(q[0], q[1], 0.78, 0x8c3a2a);
    q = P(-13, 2); addUtilityBox(q[0], q[1], 0.4);
    q = P(7, 0); addUtilityBox(q[0], q[1], -0.3);

    // 신작로를 따라 심은 가로수
    for (const [tu, tv] of [
        [-26, 7], [-22, 6], [-17, 5.5], [-13, 5], [-8, 4.5], [-4, 4],
        [1, 3], [5, 2], [10, 1], [15, 0], [19, -1], [23, -2], [27, -3],
        [-19, 12], [-6, 13], [8, 14], [21, 12], [-24, 17], [14, 21]
    ]) {
        const c = P(tu, tv);
        addStreetTree(c[0], c[1], randRange(0.9, 1.3));
    }

    // 가게 앞 가로등 하나 (아직 몇 개 없다)
    for (const [lu, lv] of [[-1, 4], [-14, 6], [12, 1], [-22, 9], [8, 15]]) {
        const c = P(lu, lv);
        addStreetLamp(c[0], c[1], { height: 4.6, intensity: 1.7, distance: 11 });
    }

    // ================================================================
    // 사람과 짐승
    // ================================================================
    // 길에는 아무도 없다. 새떼만 지나간다.

    addBirdFlock(P(-6, 20)[0], 10, P(-6, 20)[1], 12);

    // ================================================================
    // 조사 대상 3개
    // ================================================================
    q = P(-4, 7);
    const record = createConstructionRecord(q[0], q[1]);
    registerInteractable({
        name: "공사 기록",
        group: record,
        pickup: true,
        range: 1.8,
        glowColor: 0xffd36d,
        description: "새마을 공사 기록\n\n멈춘 공사 옆 상자에 그대로 남아 있었습니다.\n마을 안길 넓히기 공사 서류인데,\n마지막 장에 붉은 도장과 함께 \"중지\"라고만 적혀 있습니다. 사유란은 비어 있습니다."
    });

    q = P(-11, 10);
    const notebook = createOldNotebook(q[0], q[1]);
    registerInteractable({
        name: "낡은 수첩",
        group: notebook,
        pickup: true,
        range: 1.8,
        glowColor: 0xffe0a0,
        description: "마을 어른의 수첩\n\n길가에 떨어진 채였습니다. 연필로 눌러쓴 글씨가 남아 있습니다.\n\"포크레인 기사가 그 돌을 못 치우겠다고 했다.\n예전부터 아무도 안 건드렸다고, 그러니 그냥 두자고.\"\n\n누가 처음 그랬는지는 아무도 몰랐습니다."
    });

    q = P(19, -6);
    const dig = createAbandonedDig(q[0], q[1]);
    registerInteractable({
        name: "멈춘 공사",
        group: dig,
        pickup: false,
        range: 2.4,
        glowColor: 0x9fe0ff,
        description: "치우다 만 흙더미\n\n돌 둘레를 파내다가 그대로 멈췄습니다.\n삽과 곡괭이가 그 자리에 그냥 놓여 있습니다.\n파낸 흙이 오래 비를 맞아 이미 굳었습니다."
    });

    // ---- 시간의 문: 공사가 비껴간 그 돌 ----
    G.activeGate = createTimeGate(GATE_SPOT.x, GATE_SPOT.z, GATE_SPOT.rot);
}
