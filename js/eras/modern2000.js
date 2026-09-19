/**
 * 6시대 — 2000년대 · 한강변 신도시
 *
 * 마지막 시대. 그리고 답이 나오는 곳.
 *
 * 1970년대와 달라지는 것:
 *   - 흙길이 아스팔트가 되고 중앙선이 그어진다
 *   - 논이 아파트가 된다
 *   - 전봇대가 콘크리트로 바뀐다
 *   - 그리고 그 돌 둘레에 울타리가 생긴다. 이제 "문화재"다.
 *
 * 이야기의 끝:
 *   발굴 보고서가 신석기부터 지금까지를 한 줄로 잇는다.
 */
import { addBlob, addBox, addCone, addCylinder, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { registerInteractable } from "../interaction.js";
import { GATE_SPOT, S, addRiver, carveRiver, riverPoint } from "../landmarks.js";
import { addMapMarker } from "../minimap.js";
import { addBirdFlock, addDog, addVillager, addWorker } from "../npc.js";
import { addBridge } from "../props.js";
import {
    addBench, addBicycle, addBollards, addConcreteWall, addCrosswalk, addPlanter,
    addPowerLine, addPowerPole, addRoad, addRoadSign, addSidewalk, addSign,
    addStreetLamp, addStreetTree, addTrashBin, addUtilityBox, addVehicle
} from "../props_modern.js";
import { pick, rand, randRange } from "../rng.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { addGround, addTreeLine, scatterGrass, scatterStones } from "../world.js";
import { createTimeGate } from "./neolithic.js";

/* ================================================================
   신도시 건물
   ================================================================ */

/**
 * 아파트.
 * 창을 격자로 찍어 층을 표현한다. 몇 집에만 불이 켜져 있다.
 */
export function addApartment(x, z, rot, floors = 12, width = 7) {
    addMapMarker(x, z, "#9a958c", 4.5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const FH = 1.5;                 // 한 층 높이
    const H = floors * FH;
    const d = 5.0;
    const body = pick([0xbfb5a2, 0xc9c0ad, 0xb2a999, 0xd0c8b6]);

    // 기단
    addBox(g, width + 0.8, 0.5, d + 0.8, 0x8e8980, 0, 0.25, 0, 0, { roughness: 1 });

    // 몸체
    addBox(g, width, H, d, body, 0, 0.5 + H / 2, 0, 0,
        { roughness: 0.9, map: G.TEX.stone });

    // 세로 띠 (계단실)
    addBox(g, 1.5, H, d + 0.12, 0xa8a094, 0, 0.5 + H / 2, 0, 0,
        { roughness: 0.9, castShadow: false });

    // 창문 격자
    const cols = Math.max(2, Math.floor(width / 2.2));
    for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
            // 계단실 자리는 건너뛴다
            const cx = -width / 2 + (width / cols) * (c + 0.5);
            if (Math.abs(cx) < 0.9) continue;

            const lit = rand() > 0.62;
            const col = lit ? 0xffd79a : 0x4a5058;

            for (const sz of [1, -1]) {
                addBox(g, width / cols * 0.62, FH * 0.5, 0.05, col,
                    cx, 0.5 + f * FH + FH * 0.55, sz * (d / 2 + 0.03), 0, {
                    material: makeBasicMat(col, { transparent: true, opacity: lit ? 0.92 : 0.7 }),
                    castShadow: false
                });
            }

            // 불 켜진 집에서 새어 나오는 빛 (아래층만, 너무 많으면 무겁다)
            if (lit && f < 3 && rand() > 0.5) {
                const light = new THREE.PointLight(0xffb878, 0.5, 5);
                light.position.set(cx, 0.5 + f * FH + FH * 0.55, d / 2 + 0.8);
                g.add(light);
            }
        }
    }

    // 옥탑
    addBox(g, width * 0.4, 0.9, d * 0.5, 0xa8a094, 0, 0.5 + H + 0.45, 0, 0,
        { roughness: 0.9 });
    // 물탱크
    addCylinder(g, 0.6, 0.6, 0.9, 8, 0x8a9a9e, width * 0.25, 0.5 + H + 0.45, 0,
        { roughness: 0.7, castShadow: false });

    return g;
}

/** 상가 건물: 1층 점포, 위층 사무실 */
export function addShopBuilding(x, z, rot, floors = 3, opts = {}) {
    addMapMarker(x, z, opts.marker ?? "#a8875e", 3.5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const w = opts.width ?? 6.5, d = 4.4, FH = 1.7;
    const H = floors * FH;
    const body = opts.color ?? pick([0xc4b9a4, 0xb0a08a, 0xa89a88, 0xd2c6ae]);

    addBox(g, w + 0.4, 0.3, d + 0.4, 0x8e8980, 0, 0.15, 0, 0, { roughness: 1 });
    addBox(g, w, H, d, body, 0, 0.3 + H / 2, 0, 0, { roughness: 0.9, map: G.TEX.stone });

    // 1층 통유리 점포
    addBox(g, w * 0.86, FH * 0.72, 0.08, 0x3d4a52, 0, 0.3 + FH * 0.45, d / 2 + 0.03, 0, {
        material: makeBasicMat(0x3d4a52, { transparent: true, opacity: 0.75 }), castShadow: false
    });
    // 점포 안 불빛
    const shopLight = new THREE.PointLight(opts.shopLight ?? 0xcfe4e8, 1.6, 10);
    shopLight.position.set(0, 0.3 + FH * 0.5, d / 2 + 1.2);
    g.add(shopLight);

    // 간판
    addSign(g, 0, 0.3 + FH * 0.95, d / 2 + 0.08, w * 0.8, 0.6,
        opts.signColor ?? pick([0x2f6a4a, 0x8c3a2a, 0x2f4a7a, 0xb07a2a]),
        { lit: true, textColor: 0xf3ecd8 });

    // 위층 창
    for (let f = 1; f < floors; f++) {
        const cols = 3;
        for (let c = 0; c < cols; c++) {
            const lit = rand() > 0.55;
            const col = lit ? 0xffdba4 : 0x46505a;
            addBox(g, w / cols * 0.6, FH * 0.5, 0.05, col,
                -w / 2 + (w / cols) * (c + 0.5), 0.3 + f * FH + FH * 0.5, d / 2 + 0.03, 0, {
                material: makeBasicMat(col, { transparent: true, opacity: 0.85 }),
                castShadow: false
            });
        }
    }

    // 옥상 난간
    addBox(g, w + 0.2, 0.35, d + 0.2, 0xa8a094, 0, 0.3 + H + 0.17, 0, 0,
        { roughness: 0.9, castShadow: false });

    // 에어컨 실외기
    for (let i = 0; i < 2; i++) {
        addBox(g, 0.5, 0.4, 0.3, 0xb8b2a8, -w * 0.3 + i * 1.2, 0.3 + FH * 1.2, -d / 2 - 0.2, 0,
            { roughness: 0.8, castShadow: false });
    }

    return g;
}

/** 편의점: 밝은 통유리와 파란 간판 */
export function addConvenienceStore(x, z, rot) {
    addMapMarker(x, z, "#3f7a8a", 4, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const w = 7.0, d = 5.0, H = 2.6;

    addBox(g, w + 0.6, 0.3, d + 0.6, 0x9a958c, 0, 0.15, 0, 0, { roughness: 1 });
    addBox(g, w, H, d, 0xd8d2c4, 0, 0.3 + H / 2, 0, 0, { roughness: 0.9 });

    // 앞뒤 통유리
    for (const sz of [1, -1]) {
        addBox(g, w * 0.9, H * 0.66, 0.06, 0xbfe0e4, 0, 0.3 + H * 0.46, sz * (d / 2 + 0.03), 0, {
            material: makeBasicMat(0xbfe0e4, { transparent: true, opacity: 0.8 }),
            castShadow: false
        });
    }

    // 파란 간판 띠
    addBox(g, w + 0.2, 0.62, d + 0.2, 0x2f6a8a, 0, 0.3 + H + 0.31, 0, 0, { roughness: 0.8 });
    addSign(g, 0, 0.3 + H + 0.31, d / 2 + 0.16, w * 0.62, 0.4, 0x2f6a8a,
        { textColor: 0xf0f4f0 });

    // 편의점은 안이 아주 밝다 — 밤 화면의 기준점이 된다
    const inside = new THREE.PointLight(0xdff0f4, 3.6, 18);
    inside.position.set(0, 0.3 + H * 0.6, 0);
    g.add(inside);
    const spill = new THREE.PointLight(0xcfe8ee, 2.0, 12);
    spill.position.set(0, 0.3 + H * 0.5, d / 2 + 1.6);
    g.add(spill);

    // 앞에 내놓은 파라솔 테이블
    addCylinder(g, 0.05, 0.05, 1.9, 5, 0x9a958c, w * 0.3, 0.95, d / 2 + 1.8,
        { castShadow: false });
    addCone(g, 1.1, 0.35, 7, 0x8a9a6a, w * 0.3, 2.05, d / 2 + 1.8, { roughness: 0.9 });
    addCylinder(g, 0.55, 0.55, 0.08, 10, 0xc4bfb6, w * 0.3, 0.7, d / 2 + 1.8,
        { castShadow: false });

    // 쌓아 둔 상자
    for (let i = 0; i < 3; i++) {
        addBox(g, 0.5, 0.36, 0.4, pick([0x8a7a58, 0x6f6a52]),
            -w * 0.38, 0.48 + i * 0.37, d / 2 + 0.7, randRange(0, 0.3),
            { roughness: 1, castShadow: false });
    }

    return g;
}

/** 버스 정류장 */
export function addBusStop(x, z, rot) {
    addMapMarker(x, z, "#7a8a92", 2.5, "prop");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    for (const px of [-1.6, 1.6]) {
        addCylinder(g, 0.07, 0.08, 2.5, 6, 0x8a8f94, px, 1.25, -0.6, { roughness: 0.7 });
    }
    // 지붕
    addBox(g, 3.6, 0.1, 1.5, 0x6f7a80, 0, 2.5, -0.1, 0, { roughness: 0.8 });
    // 뒷판
    addBox(g, 3.6, 1.7, 0.06, 0x9fb0b8, 0, 1.4, -0.85, 0, {
        material: makeBasicMat(0x9fb0b8, { transparent: true, opacity: 0.55 }), castShadow: false
    });
    // 벤치
    addBox(g, 2.6, 0.1, 0.4, 0x7a6a52, 0, 0.55, -0.55, 0, { roughness: 1, map: G.TEX.wood });
    // 노선도 (빛나는 패널)
    addBox(g, 0.8, 1.1, 0.05, 0xdfe8ea, 1.35, 1.5, -0.8, 0, {
        material: makeBasicMat(0xdfe8ea, { transparent: true, opacity: 0.9 }), castShadow: false
    });

    const light = new THREE.PointLight(0xcfe0e8, 1.2, 8);
    light.position.set(0, 2.2, 0);
    g.add(light);

    return g;
}

/** 신호등 */
export function addTrafficLight(x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    addCylinder(g, 0.1, 0.14, 4.4, 6, 0x5f6a66, 0, 2.2, 0, { roughness: 0.7 });
    const arm = addCylinder(g, 0.07, 0.07, 3.0, 5, 0x5f6a66, 1.5, 4.2, 0, { castShadow: false });
    arm.rotation.z = Math.PI / 2;

    // 등함
    const box = addBox(g, 1.1, 0.36, 0.3, 0x2f3a36, 2.7, 4.0, 0, 0, { roughness: 0.8 });
    const colors = [0xd84a3a, 0xd8c04a, 0x4ac06a];
    const on = Math.floor(rand() * 3);
    for (let i = 0; i < 3; i++) {
        addBox(g, 0.26, 0.26, 0.05, i === on ? colors[i] : 0x1f2420,
            2.35 + i * 0.35, 4.0, 0.18, 0, {
            material: makeBasicMat(i === on ? colors[i] : 0x1f2420,
                { transparent: true, opacity: i === on ? 0.95 : 0.6 }),
            castShadow: false
        });
    }

    return g;
}

/**
 * 문화재 보호 울타리와 안내판.
 * 이 게임의 마지막 장면. 신석기부터 서 있던 그 돌이
 * 이제 낮은 울타리 안에 있다.
 */
export function addHeritageEnclosure(x, z) {
    addMapMarker(x, z, "#c9a14d", 5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    const R = 5.0;

    // 잔디 단
    addFlatCircle(g, R + 1.0, 0x5a6b3c, 0, 0.04, 0, 20, {
        material: makeMat(0x5a6b3c, {
            transparent: true, opacity: 0.55, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1
        })
    });

    // 낮은 철제 울타리
    const posts = 22;
    for (let i = 0; i < posts; i++) {
        const a = (i / posts) * Math.PI * 2;
        // 앞쪽은 사람이 드나들게 터 둔다
        if (a > Math.PI * 0.35 && a < Math.PI * 0.65) continue;
        addCylinder(g, 0.045, 0.05, 0.85, 5, 0x4a5450,
            Math.cos(a) * R, 0.42, Math.sin(a) * R, { roughness: 0.7, castShadow: false });
    }
    // 가로 난간
    for (const h of [0.45, 0.78]) {
        const ring = addCylinder(g, R, R, 0.035, 24, 0x4a5450, 0, h, 0,
            { roughness: 0.7, castShadow: false });
        ring.rotation.x = Math.PI / 2;
    }

    // 자갈 마당
    for (let i = 0; i < 40; i++) {
        const a = randRange(0, Math.PI * 2), r = randRange(1.6, R - 0.4);
        addBlob(g, randRange(0.08, 0.16), pick([0x9a958c, 0xa8a49a, 0x8a8680]),
            Math.cos(a) * r, 0.06, Math.sin(a) * r,
            { sy: 0.5, ry: a, roughness: 1, castShadow: false });
    }

    // 안내판
    const sign = new THREE.Group();
    sign.position.set(0, 0, R + 1.4);
    sign.rotation.y = Math.PI;
    g.add(sign);

    for (const px of [-0.85, 0.85]) {
        addCylinder(sign, 0.06, 0.07, 1.5, 5, 0x5f5a52, px, 0.75, 0, { roughness: 0.7 });
    }
    // 비스듬히 세운 판
    const board = addBox(sign, 2.0, 1.3, 0.08, 0x3f4a44, 0, 1.45, 0, 0, { roughness: 0.8 });
    board.rotation.x = 0.35;
    // 판 위의 글줄
    for (let i = 0; i < 4; i++) {
        const line = addBox(sign, 1.5 - i * 0.12, 0.09, 0.02, 0xdcd4bc,
            -i * 0.02, 1.72 - i * 0.2, 0.09 + i * 0.06, 0, {
            material: makeBasicMat(0xdcd4bc, { transparent: true, opacity: 0.9 }),
            castShadow: false
        });
        line.rotation.x = 0.35;
    }

    // 안내판 조명
    const light = new THREE.PointLight(0xffe0b0, 1.6, 9);
    light.position.set(0, 1.9, R + 2.0);
    g.add(light);

    return g;
}

/* ================================================================
   유물
   ================================================================ */

/** 발굴 보고서 */
export function createExcavationReport(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = -0.3;
    G.world.add(g);

    // 접이식 탁자
    addBox(g, 1.6, 0.08, 0.9, 0xc4bfb6, 0, 0.75, 0, 0, { roughness: 0.8 });
    for (const [px, pz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) {
        addCylinder(g, 0.035, 0.035, 0.75, 5, 0x8a8f94, px, 0.37, pz, { castShadow: false });
    }

    // 보고서 뭉치
    addBox(g, 0.62, 0.12, 0.46, 0xe4dcc8, -0.25, 0.85, 0, 0.12, { roughness: 1 });
    for (let i = 0; i < 4; i++) {
        addBox(g, 0.5, 0.006, 0.02, 0x3a3228, -0.25, 0.92, -0.14 + i * 0.09, 0.12,
            { castShadow: false });
    }

    // 펼쳐 놓은 도면
    const plan = addBox(g, 0.75, 0.01, 0.6, 0xd8e0e4, 0.45, 0.8, 0, -0.08, { roughness: 1 });
    // 도면 위의 층위선
    for (let i = 0; i < 5; i++) {
        addBox(g, 0.6, 0.004, 0.012, 0x5a6a78, 0.45, 0.81, -0.2 + i * 0.1, -0.08,
            { castShadow: false });
    }

    // 유물 담은 지퍼백
    for (let i = 0; i < 3; i++) {
        addBox(g, 0.18, 0.04, 0.14, 0xdfe6e8, -0.55 + i * 0.2, 0.82, 0.3, randRange(-0.2, 0.2), {
            material: makeBasicMat(0xdfe6e8, { transparent: true, opacity: 0.6 }),
            castShadow: false
        });
    }

    return g;
}

/** 발굴 구덩이: 층위가 드러난 단면 */
export function createExcavationPit(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    // 파낸 구덩이
    addFlatCircle(g, 1.9, 0x3a2e22, 0, 0.03, 0, 4, {
        material: makeBasicMat(0x3a2e22, { transparent: true, opacity: 0.9 })
    });

    // 층위 (시대가 쌓인 단면)
    const layers = [
        [0x6b5a48, 0.0],   // 지금
        [0x7d6343, -0.18], // 1970
        [0x8a7048, -0.34], // 조선
        [0x8e6b43, -0.5],  // 삼국
        [0x9d7249, -0.64]  // 그 아래
    ];
    for (const [col, y] of layers) {
        addBox(g, 3.4, 0.16, 0.12, col, 0, y + 0.1, -1.75, 0,
            { roughness: 1, map: G.TEX.dirtObj, castShadow: false });
    }

    // 측량 기준 막대
    const rod = addCylinder(g, 0.025, 0.025, 1.2, 5, 0xe0e0e0, 1.3, 0.5, -1.4,
        { castShadow: false });
    for (let i = 0; i < 6; i++) {
        addBox(g, 0.06, 0.1, 0.06, i % 2 ? 0xd84a3a : 0xf0f0f0, 1.3, 0.05 + i * 0.2, -1.4, 0,
            { castShadow: false });
    }

    // 모눈 줄
    for (let i = 0; i <= 3; i++) {
        addBox(g, 3.6, 0.01, 0.015, 0xe8e4d8, 0, 0.16, -1.7 + i * 1.15, 0,
            { material: makeBasicMat(0xe8e4d8, { transparent: true, opacity: 0.5 }),
              castShadow: false });
    }

    // 솔과 흙손
    addCylinder(g, 0.02, 0.02, 0.24, 5, 0x8a6a45, -1.1, 0.06, 0.6, { castShadow: false });
    addBox(g, 0.1, 0.03, 0.18, 0x9a958c, -0.8, 0.05, 0.9, 0.3, { castShadow: false });

    return g;
}

/* ================================================================
   신도시
   ================================================================ */
export function build2000(opts = {}) {
    // 배치용 화면 좌표.
    //
    // 육지는 화면 좌표 v < 7.6 까지만 있다 (그 위는 강이다).
    // 이 시대의 배치는 v 를 넓게 잡아 두었으므로, 여기서 한 번에
    // 육지 범위 안으로 눌러 넣는다. 덕분에 배치 코드는 읽기 쉬운 값을 그대로 쓴다.
    const P = (u, v) => S(u, v * 0.72500 + -9.50000);
    // 프롤로그: 마지막 맵을 밤 귀갓길로 재사용. 돌 1개만 남긴다.
    const isPrologue = !!opts.prologue;

    G.terrainCarve = carveRiver;

    // 아스팔트와 콘크리트의 회색 땅
    addGround(0x6f6a60, [0x817b70, 0x5c574f, 0x76705f, 0x8a8478, 0x615c54]);

    scatterStones(60, -30, 30, -30, 30, [0x7c766c, 0x8f887c]);
    scatterGrass(200, [0x5a6b3c, 0x4a5a30, 0x667742], 3, 31);
    addTreeLine([0x3f4a2c, 0x364226, 0x4a5636], 30, 26, 36);

    addRiver();

    // ================================================================
    // 도로 — 이 시대의 뼈대
    // ================================================================
    let a = P(-28, 2), b = P(28, -6);
    addRoad(a[0], a[1], b[0], b[1], 7.0, { paved: true, centerLine: true });

    a = P(2, 20); b = P(-2, -20);
    addRoad(a[0], a[1], b[0], b[1], 6.0, { paved: true, centerLine: true });

    // 교차로 횡단보도
    let q = P(0, 5); addCrosswalk(q[0], q[1], Math.PI / 4, 7, 3.2);
    q = P(-2, -6); addCrosswalk(q[0], q[1], Math.PI / 4 + Math.PI / 2, 6, 3.0);

    // 신호등
    q = P(-5, 4); addTrafficLight(q[0], q[1], 0.3);
    q = P(5, -4); addTrafficLight(q[0], q[1], -2.8);

    // 한강을 건너는 콘크리트 다리
    // 다리는 강을 건너야 하므로 압축하지 않은 좌표(S)를 쓴다
    const br1 = S(-16, 4), br2 = S(-18, 17);
    addBridge(br1[0], br1[1], br2[0], br2[1], 3.2);

    // ================================================================
    // 아파트 단지 (화면 위쪽 — 멀리 보이는 벽)
    // ================================================================
    // 화면 위쪽 멀리. 안개에 반쯤 묻혀 스카이라인이 된다.
    // 강 바로 앞 둔치에 선다. (더 뒤로 보내면 강물 위에 서게 된다)
    const apts = [
        [-24, 19, 0.2, 13, 7.5],
        [-12, 20, -0.1, 15, 7.0],
        [1, 20, 0.15, 12, 8.0],
        [14, 19, -0.25, 14, 7.0],
        [26, 17.5, 0.3, 11, 6.5],
        [-34, 16.5, 0.1, 10, 6.5],
        [34, 15.5, -0.2, 12, 6.0]
    ];
    for (const [u, v, rot, fl, w] of apts) {
        const c = P(u, v);
        addApartment(c[0], c[1], rot, fl, w);
    }

    // ================================================================
    // 상가 (도로변)
    // ================================================================
    q = P(-9, 11); addConvenienceStore(q[0], q[1], 0.15);
    q = P(4, 14); addShopBuilding(q[0], q[1], -0.2, 3, { signColor: 0x8c3a2a });
    q = P(14, 12); addShopBuilding(q[0], q[1], 0.1, 2, { signColor: 0x2f6a4a, width: 5.5 });
    q = P(-21, 11); addShopBuilding(q[0], q[1], 0.4, 3, { signColor: 0x2f4a7a });
    q = P(23, 9); addShopBuilding(q[0], q[1], -0.5, 2, { signColor: 0xb07a2a, width: 6.0 });
    q = P(-4, -12); addShopBuilding(q[0], q[1], 0.25, 2, { signColor: 0x2f6a8a, width: 7.0 });
    q = P(-14, -9); addShopBuilding(q[0], q[1], -0.3, 3, { signColor: 0x8c3a2a, width: 5.8 });
    q = P(9, -12); addShopBuilding(q[0], q[1], 0.4, 2, { signColor: 0xb07a2a, width: 6.2 });
    q = P(-24, -4); addShopBuilding(q[0], q[1], 0.6, 2, { signColor: 0x2f6a4a, width: 5.2 });
    q = P(24, -14); addShopBuilding(q[0], q[1], -0.2, 3, { signColor: 0x2f4a7a, width: 6.4 });
    q = P(17, 16); addShopBuilding(q[0], q[1], 0.15, 2, { signColor: 0x8c3a2a, width: 5.6 });
    q = P(-22, 16); addShopBuilding(q[0], q[1], -0.4, 3, { signColor: 0xb07a2a, width: 6.0 });

    // 버스 정류장
    q = P(-6, 6); addBusStop(q[0], q[1], 0.78);

    // ================================================================
    // 콘크리트 전봇대와 가로등
    // ================================================================
    const poleSpots = [[-26, 5], [-16, 3], [-6, 1], [4, -1], [14, -3], [24, -5]];
    const poles = [];
    for (let i = 0; i < poleSpots.length; i++) {
        const c = P(poleSpots[i][0], poleSpots[i][1]);
        poles.push(addPowerPole(c[0], c[1], { concrete: true, transformer: i === 3, height: 7.2 }));
    }
    addPowerLine(poles);

    for (const [lu, lv] of [
        [-26, 7], [-20, 5], [-14, 4], [-8, 3], [-2, 2], [4, 0], [10, -1],
        [16, -2], [22, -4], [28, -5],
        [-22, -4], [-10, -6], [2, -8], [14, -10], [24, -11],
        [4, 13], [4, 18], [-4, 12], [-4, 18], [-1, -15]
    ]) {
        const c = P(lu, lv);
        addStreetLamp(c[0], c[1], { height: 5.4, intensity: 2.6, distance: 16, color: 0xcfe0ea });
    }

    // ---- 인도 ----
    // 큰길 양쪽으로 보도블록을 깐다. 도시가 되었다는 가장 확실한 표시.
    let s1 = P(-28, 6), s2 = P(28, -2);
    addSidewalk(s1[0], s1[1], s2[0], s2[1], 2.8);
    s1 = P(-28, -2); s2 = P(28, -10);
    addSidewalk(s1[0], s1[1], s2[0], s2[1], 2.8);
    s1 = P(6, 20); s2 = P(2, -20);
    addSidewalk(s1[0], s1[1], s2[0], s2[1], 2.6);
    s1 = P(-2, 20); s2 = P(-6, -20);
    addSidewalk(s1[0], s1[1], s2[0], s2[1], 2.6);

    // 가로수 — 인도를 따라 촘촘히
    for (const [tu, tv] of [
        [-26, 5], [-22, 4.5], [-18, 4], [-14, 3.5], [-10, 3], [-6, 2.5],
        [-2, 2], [2, 1.5], [6, 1], [10, 0.5], [14, 0], [18, -0.5],
        [22, -1], [26, -1.5],
        [-24, -3], [-18, -4], [-12, -5], [-6, -6], [0, -7], [6, -8], [12, -9],
        [5, 12], [5, 17], [-3, 12], [-3, 17], [4, -12], [-5, -14]
    ]) {
        const c = P(tu, tv);
        addStreetTree(c[0], c[1], randRange(0.9, 1.35));
    }

    // 화단
    for (const [pu, pv, prot, pw] of [
        [-15, 15, 0.3, 4.0], [10, 5, -0.4, 3.2], [-20, -6, 0.2, 3.6],
        [16, 14, -0.3, 3.4], [-8, -16, 0.5, 3.0], [22, -12, 0.1, 3.8]
    ]) {
        const c = P(pu, pv);
        addPlanter(c[0], c[1], prot, pw, 1.3);
    }

    // ---- 거리 소품 ----
    for (const [bu, bv, brot] of [
        [-10, 5, 0.78], [8, 2, 0.78], [-4, 14, -0.78], [18, -3, 0.78],
        [-20, 3, 0.78], [3, -10, -0.78]
    ]) {
        const c = P(bu, bv);
        addBench(c[0], c[1], brot);
    }

    for (const [tu, tv] of [[-9, 4], [7, 1], [-3, 13], [17, -4], [-19, 2], [2, -11],
                            [12, 7], [-14, -4]]) {
        const c = P(tu, tv);
        addTrashBin(c[0], c[1]);
    }

    for (const [uu, uv, urot] of [[-13, 3, 0.4], [11, -1, -0.3], [-1, 16, 0.8],
                                   [21, -6, 0.2]]) {
        const c = P(uu, uv);
        addUtilityBox(c[0], c[1], urot);
    }

    for (const [su, sv, srot, scol] of [
        [-7, 3, 0.78, 0x2f6a4a], [9, 0, -2.36, 0x2f4a7a], [-3, 10, 0.78, 0x8c3a2a],
        [15, -5, 0.78, 0x2f6a4a]
    ]) {
        const c = P(su, sv);
        addRoadSign(c[0], c[1], srot, scol);
    }

    // 편의점 앞 자전거
    for (const [cu, cv, crot] of [[-11, 8, 0.4], [-12, 7, 1.1], [5, 9, -0.3],
                                   [19, 5, 0.7]]) {
        const c = P(cu, cv);
        addBicycle(c[0], c[1], crot);
    }

    // 문화재 둘레 볼라드
    let v1 = P(14, -1), v2 = P(26, -3);
    addBollards(v1[0], v1[1], v2[0], v2[1], 7);

    // 담장
    addConcreteWall([P(-26, 18), P(-16, 19)], 1.7);
    addConcreteWall([P(16, 17), P(26, 16)], 1.7);

    // ================================================================
    // 차
    // ================================================================
    // 큰길을 달리거나 길가에 세워 둔 차들
    const cars = [
        [-12, 2, 0.42, "bus", 0x4a7a6a],
        [6, -2, 0.42, "car", null],
        [-20, 4, 0.42, "car", 0x9ba3aa],
        [16, -4, -2.72, "truck", null],
        [2, 8, -0.2, "car", 0x5c6470],
        [-8, -14, 0.9, "car", 0xb0a696],
        [-24, 2, 0.42, "car", 0x6f7a80],
        [22, -6, 0.42, "bus", 0xc9c2b0],
        [11, 4, -0.3, "car", 0x9ba3aa],
        [-16, 10, 0.5, "truck", 0x5a6a52],
        [-4, -18, 0.78, "car", 0x5c6470],
        [24, 2, -0.6, "car", 0xb0a696],
        [-2, 17, 0.1, "car", 0x6f7a80],
        [13, -13, 0.78, "car", null],
        [-21, -8, 0.42, "car", 0x9ba3aa]
    ];
    for (const [cu, cv, crot, ctype, ccol] of cars) {
        const c = P(cu, cv);
        addVehicle(c[0], c[1], crot, ctype, ccol);
    }

    // ================================================================
    // 그 돌 — 이제 문화재다
    // ================================================================
    // GATE_SPOT 둘레에 보호 울타리와 안내판
    addHeritageEnclosure(GATE_SPOT.x, GATE_SPOT.z);

    // 발굴 현장
    q = P(15, -8);
    const pit = createExcavationPit(q[0], q[1]);

    // ================================================================
    // 사람
    // ================================================================
    addVillager([P(-6, 7), P(0, 6), P(4, 9), P(-2, 12), P(-8, 10)], "modern");
    addVillager([P(-18, 6), P(-22, 9), P(-16, 12), P(-12, 8)], "modern", { speed: 0.95 });
    addVillager([P(10, 6), P(16, 4), P(20, 8), P(13, 10)], "modern");
    addVillager([P(2, -8), P(-4, -10), P(-6, -5), P(0, -3)], "modern", { speed: 0.85 });

    // 정류장에서 기다리는 사람
    q = P(-6, 5); addWorker(q[0], q[1], "modern", { rot: 0.8 });
    // 발굴 현장의 조사원
    q = P(13, -7); addWorker(q[0], q[1], "modern", { rot: -0.5 });
    q = P(17, -10); addWorker(q[0], q[1], "modern", { rot: 1.4 });

    addVillager([P(-14, 12), P(-20, 14), P(-24, 10), P(-18, 8)], "modern", { speed: 1.0 });
    addVillager([P(14, 14), P(20, 12), P(22, 16), P(16, 17)], "modern", { speed: 0.9 });
    addVillager([P(-10, -8), P(-16, -11), P(-12, -14), P(-6, -12)], "modern");
    addVillager([P(8, -12), P(14, -15), P(20, -12), P(12, -9)], "modern", { speed: 0.95 });
    addVillager([P(0, 16), P(6, 18), P(2, 12), P(-4, 15)], "modern", { speed: 0.85 });

    // 편의점 앞, 벤치, 건널목에 선 사람들
    q = P(-10, 9); addWorker(q[0], q[1], "modern", { rot: 1.2 });
    q = P(8, 3); addWorker(q[0], q[1], "modern", { rot: -0.4 });
    q = P(-3, 15); addWorker(q[0], q[1], "modern", { rot: 2.2 });
    q = P(18, -2); addWorker(q[0], q[1], "modern", { rot: 0.6 });

    addDog([P(-4, 8), P(2, 5), P(-1, 13)]);
    addDog([P(16, -6), P(22, -8), P(19, -3)]);
    addBirdFlock(P(-4, 18)[0], 12, P(-4, 18)[1], 10);

    // ================================================================
    // 조사 대상 3개 — 여기서 모든 것이 이어진다
    // (프롤로그에서는 낯선 돌 1개만 남긴다)
    // ================================================================
    if (isPrologue) {
        buildPrologueStone();
        return;
    }
    q = P(14, -6);
    const report = createExcavationReport(q[0], q[1]);
    // 인과: 청동기 제사장의 선택이 보고서 마지막 줄에 반영된다
    const fateLine = G.fateChoice === "raise"
        ? "\n\n마지막 줄: \"청동기 제단 기록 — 돌을 세워 표시하였다. 그 뜻대로 이 자리가 남았다.\""
        : G.fateChoice === "bury"
            ? "\n\n마지막 줄: \"청동기 제단 기록 — 깊이 묻고 표시 없이 두었다. 그 뜻대로 아무도 건드리지 않았다.\""
            : "\n\n마지막 줄: \"모든 시대가 이 돌을 피해 갔다.\"";
    registerInteractable({
        name: "발굴 보고서",
        group: report,
        pickup: true,
        range: 1.9,
        glowColor: 0xffd36d,
        description: "발굴 보고서\n\n층위 도면이 펼쳐져 있습니다.\n맨 아래 신석기 불탄 층, 그 위에 청동기 고인돌 기초,\n삼국시대 성벽이 비껴간 자리, 조선 관아 기록,\n1970년대에 파다 만 자국까지 순서대로 적혀 있습니다." + fateLine
    });

    registerInteractable({
        name: "발굴 구덩이",
        group: pit,
        pickup: false,
        range: 2.4,
        glowColor: 0x9fe0ff,
        description: "발굴 구덩이\n\n단면에 시대가 층층이 쌓여 있습니다.\n흙 색이 바뀌는 자리마다 사람들이 한 번씩 살다 갔습니다.\n\n맨 아래층에서 사람 뼈 한 구가 나왔습니다.\n신석기 마을이 불탄 그 해에 묻힌 아이였습니다."
    });

    // 안내판 (그 돌 앞)
    const signGroup = new THREE.Group();
    signGroup.position.set(GATE_SPOT.x, terrainHeight(GATE_SPOT.x, GATE_SPOT.z), GATE_SPOT.z + 6.4);
    G.world.add(signGroup);

    registerInteractable({
        name: "안내판",
        group: signGroup,
        pickup: false,
        range: 3.0,
        glowColor: 0xffe0a0,
        description: "문화재 안내판\n\n\"고인돌. 청동기시대. 지방기념물.\"\n\n설명은 세 줄뿐입니다. 아래에 한 줄이 더 붙어 있습니다.\n\n\"이 자리는 신석기시대부터 훼손되지 않았다.\n주민들이 대대로 옮기지 않았기 때문으로 추정된다.\"\n\n그 아이를 아무도 잊지 않았습니다."
    });

    // 마지막 시대에는 시간의 문이 없다. 여기가 끝이다.
    G.activeGate = null;
}

/**
 * 프롤로그 낯선 돌 — 2000년 맵의 그 돌을 귀갓길 시점으로 조사한다.
 * 조사 즉시 신석기로 전이한다.
 */
function buildPrologueStone() {
    const g = new THREE.Group();
    g.position.set(GATE_SPOT.x, terrainHeight(GATE_SPOT.x, GATE_SPOT.z), GATE_SPOT.z);
    g.rotation.y = -0.3;
    G.world.add(g);

    addBox(g, 0.7, 2.1, 0.8, 0x6e6a64, -0.9, 1.05, 0, 0.05, { roughness: 1 });
    addBox(g, 0.7, 2.0, 0.8, 0x77716a, 0.9, 1.0, 0, -0.05, { roughness: 1 });
    addBox(g, 2.8, 0.55, 0.9, 0x817970, 0, 2.2, 0, 0.02, { roughness: 1 });
    addBlob(g, 0.2, 0x8ee6ff, 0, 1.2, 0.3, {
        material: makeBasicMat(0x8ee6ff, { transparent: true, opacity: 0.75 })
    });

    registerInteractable({
        name: "낯선 돌",
        group: g,
        pickup: false,
        range: 2.6,
        glowColor: 0x8ee6ff,
        description: "낯선 돌\n\n어제까지 없던 돌이 길 한가운데 서 있다.\n손을 대자 돌 틈에서 푸른빛이 새어 나온다.\n눈앞이 하얘진다…"
    });
    const item = G.interactables[G.interactables.length - 1];
    item.prologueGate = true;
}
