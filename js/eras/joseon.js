/**
 * 3시대 — 조선 한양 외곽 마을
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { addFence, createTimeGate } from "./neolithic.js";
import { registerInteractable } from "../interaction.js";
import { addMapMarker } from "../minimap.js";
import { pick, rand, randRange } from "../rng.js";
import { addBanner, addBridge, addCart, addCropField, addHayStack, addJarPlatform, addLaundryLine, addMarketStall, addStoneWallRun } from "../props.js";
import { addCow, addDog, addVillager, addWorker } from "../npc.js";
import { GATE_SPOT, S } from "../landmarks.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { addGround, addPond, addStonePath, addTreeLine, scatterGrass, scatterStones } from "../world.js";

/**
 * 3시대 — 조선 한양 외곽 마을 (늦은 저녁)
 *
 * 마을의 뼈대:
 *   화면 위-오른쪽   관아 문루와 담장
 *   화면 가운데       우물이 있는 마당
 *   화면 아래-왼쪽    장승 · 볏가리 · 수레 · 텃밭
 *   화면 아래-오른쪽  연못과 나무다리
 *
 * 등각 화면에서 오른쪽 = 월드 (1,0,-1), 위쪽 = 월드 -(1,0,1) 이다.
 */
/**
 * 3시대 — 조선 한양 외곽 마을 (늦은 저녁)
 *
 * 배치는 전부 화면 좌표 S(u, v) 로 잡는다.
 *   u = 화면 오른쪽, v = 화면 위쪽
 *
 * 구도:
 *   위-오른쪽   관아 문루와 담장
 *   위-왼쪽     기와집과 나무
 *   가운데      우물이 있는 마당, 장터 가판
 *   왼쪽        텃밭
 *   아래-왼쪽   장승 셋 · 볏가리 · 수레
 *   아래-오른쪽 연못과 나무다리
 */
export function buildJoseon() {
    // 늦은 저녁. 등불 외에는 빛이 거의 없다.
    addGround(0x7b6a58, [0x917c66, 0x605244, 0x87745a, 0x564f45, 0x9d8a70]);

    scatterStones(110, -30, 30, -30, 30, [0x5f5d5b, 0x716c66, 0x4f4d4c, 0x57535a]);
    scatterGrass(240, [0x4a4636, 0x3b3a2c, 0x565033, 0x333127], 3, 31);
    addTreeLine([0x3b3a49, 0x31303d, 0x454256], 34, 24, 36);

    // 화면 좌표로 배치하기 위한 짧은 이름
    const P = S;

    // ---- 길: 마을을 가로지르는 큰길과 관아로 오르는 샛길 ----
    let p1 = P(-26, -6), p2 = P(24, 6);
    addStonePath(p1[0], p1[1], p2[0], p2[1], 2.6);
    p1 = P(2, 2); p2 = P(13, 15);
    addStonePath(p1[0], p1[1], p2[0], p2[1], 1.6);
    p1 = P(-4, 0); p2 = P(-17, -10);
    addStonePath(p1[0], p1[1], p2[0], p2[1], 1.4);

    // ---- 관아 (위-오른쪽) ----
    let q = P(13, 18);
    addGovernmentGate(q[0], q[1], 0.35);

    addStoneWallRun([P(4, 15), P(8, 17), P(10, 19)], 1.35);
    addStoneWallRun([P(18, 17), P(22, 13), P(22, 8)], 1.35);
    addStoneWallRun([P(22, 8), P(16, 6)], 1.2);

    q = P(7, 15); addBanner(q[0], q[1], 0.4, 0x8c3a2a);
    q = P(19, 15); addBanner(q[0], q[1], -0.3, 0x8c3a2a);

    // ---- 기와집 ----
    q = P(1, 14); addGiwa(q[0], q[1], -0.28, 1.00);
    q = P(-12, 12); addGiwa(q[0], q[1], 0.42, 0.92);
    q = P(20, -4); addGiwa(q[0], q[1], -0.75, 0.88);

    // ---- 초가집 ----
    const chogas = [
        [-20, 9, 0.35, 1.00],
        [-14, 15, -0.55, 0.92],
        [-8, 5, 0.22, 1.05],
        [7, 7, -0.42, 0.95],
        [-22, -2, 0.62, 0.88],
        [14, 2, -0.20, 0.98],
        [-6, -9, 1.05, 0.90],
        [4, -12, -0.7, 0.96],
        [19, 8, 0.5, 0.9]
    ];
    for (const [u, v, rot, sc] of chogas) {
        const c = P(u, v);
        addChoga(c[0], c[1], rot, sc);
    }

    // ---- 돌담: 마당을 나눈다 ----
    addStoneWallRun([P(-16, 7), P(-10, 7), P(-9, 2)], 0.95);
    addStoneWallRun([P(-3, 10), P(4, 10)], 0.9);
    addStoneWallRun([P(10, 4), P(11, -3)], 0.9);
    addStoneWallRun([P(-24, 3), P(-18, 3)], 0.85);
    addStoneWallRun([P(0, -7), P(8, -7)], 0.85);

    // 마을 바깥 목책
    addFence([P(-26, 12), P(-24, -8), P(-10, -18)]);
    addFence([P(24, 10), P(25, -4)]);

    // ---- 마당과 우물 (가운데) ----
    q = P(0, 2); addWell(q[0], q[1]);
    q = P(-5, 4); addJarPlatform(q[0], q[1], 0.3);
    q = P(8, 12); addJarPlatform(q[0], q[1], -0.6);
    let l1 = P(-12, 2), l2 = P(-8, 0);
    addLaundryLine(l1[0], l1[1], l2[0], l2[1]);
    l1 = P(16, 4); l2 = P(20, 2);
    addLaundryLine(l1[0], l1[1], l2[0], l2[1]);

    // ---- 텃밭 (왼쪽) ----
    q = P(-21, 2); addCropField(q[0], q[1], 0.25, 6, 5);
    q = P(-22, -6); addCropField(q[0], q[1], -0.4, 5, 4);
    q = P(-13, -3); addCropField(q[0], q[1], 0.8, 4, 4);

    // ---- 볏가리와 수레 (아래-왼쪽) ----
    q = P(-13, -12); addHayStack(q[0], q[1], 1.0);
    q = P(-15, -14); addHayStack(q[0], q[1], 0.85);
    q = P(-11, -15); addHayStack(q[0], q[1], 0.75);
    q = P(-7, -13); addCart(q[0], q[1], 0.6);
    q = P(6, 3); addCart(q[0], q[1], -0.9);

    // ---- 장터 가판 (가운데) ----
    q = P(4, 4); addMarketStall(q[0], q[1], 0.2);
    q = P(7, 0); addMarketStall(q[0], q[1], -0.5);

    // ---- 연못과 나무다리 (아래-오른쪽) ----
    q = P(16, -11); addPond(q[0], q[1], 3.8);
    const b1 = P(10, -8), b2 = P(22, -14);
    addBridge(b1[0], b1[1], b2[0], b2[1], 1.7);

    // ---- 장승 셋 (마을 어귀, 아래-왼쪽) ----
    q = P(-17, -9);
    const jangPattern = addJangseung(q[0], q[1], 0.28);
    q = P(-19, -10); addJangseung(q[0], q[1], 0.15);
    q = P(-15, -11); addJangseung(q[0], q[1], 0.42);

    // ---- 등불: 밤 마을의 뼈대 ----
    const lanternSpots = [
        [-2, 6], [5, 1], [11, 9], [-9, 3], [-16, 5], [2, -5],
        [14, -2], [-20, 12], [8, 16], [18, 12], [-6, -6], [20, 0],
        [-12, -8], [12, -12]
    ];
    for (const [lu, lv] of lanternSpots) {
        const c = P(lu, lv);
        addLantern(c[0], c[1]);
    }

    // ---- 사람과 짐승 ----
    // 밤이라 많지는 않다. 흰 옷이 어둠 속에서 눈에 띈다.
    addVillager([P(-2, 4), P(4, 2), P(8, 6), P(2, 9), P(-4, 7)], "joseon", { hat: "gat" });
    addVillager([P(-14, 4), P(-18, 6), P(-20, 0), P(-15, -2)], "joseon", { hat: "straw", speed: 0.8 });
    addVillager([P(10, -2), P(16, -4), P(18, 2), P(12, 4)], "joseon");
    addVillager([P(6, 13), P(12, 14), P(14, 10), P(8, 9)], "joseon", { hat: "gat", speed: 0.9 });
    addVillager([P(-8, -10), P(-2, -12), P(2, -8), P(-5, -6)], "joseon", { hat: "straw" });

    // 우물가에서 물 긷는 사람
    q = P(-1, 4); addWorker(q[0], q[1], "joseon", { rot: 0.8, hat: "straw" });
    // 가판 지키는 사람
    q = P(4, 6); addWorker(q[0], q[1], "joseon", { rot: 0.1, hat: "gat" });
    // 빨래하는 사람
    q = P(-11, 0); addWorker(q[0], q[1], "joseon", { rot: -0.6 });
    // 볏가리 옆에서 일하는 사람
    q = P(-12, -14); addWorker(q[0], q[1], "joseon", { rot: 1.2, hat: "straw" });

    // 소와 개
    q = P(-9, -13); addCow(q[0], q[1], 0.7);
    q = P(-6, -15); addCow(q[0], q[1], 1.4);
    addDog([P(0, 0), P(6, -2), P(2, -8), P(-4, -2)]);

    // ---- 조사 대상 3개 ----
    q = P(11, 14);
    const badge = createBadgeArtifact(q[0], q[1]);
    registerInteractable({
        name: "어사패",
        group: badge,
        pickup: true,
        range: 1.8,
        glowColor: 0xffd36d,
        description: "어사패\n\n관아 앞 흙 속에 반쯤 묻혀 있었습니다.\n패에 새긴 글자는 닳았지만, 누군가 이 마을을 살피러 왔었다는 뜻입니다."
    });

    q = P(1, 1);
    const documentItem = createOldDocument(q[0], q[1]);
    registerInteractable({
        name: "낡은 문서",
        group: documentItem,
        pickup: true,
        range: 1.8,
        glowColor: 0xffe0a0,
        description: "낡은 문서\n\n우물 옆 탁자에 눌려 있던 관아의 기록입니다.\n세금과 길 이름 사이에, 마을 동쪽 \"옛 돌\"을 건드리지 말라는 줄이 끼어 있습니다."
    });

    registerInteractable({
        name: "장승 문양",
        group: jangPattern,
        pickup: false,
        range: 2.0,
        glowColor: 0x9fe0ff,
        description: "장승의 문양\n\n마을을 지키는 장승에 새겨진 표식입니다.\n세 장승이 모두 같은 곳을 바라보고 있습니다. 마을 동쪽, 그 돌이 있는 자리입니다."
    });

    // ---- 시간의 문: 장승이 바라보는 그 돌 ----
    G.activeGate = createTimeGate(GATE_SPOT.x, GATE_SPOT.z, GATE_SPOT.rot);
}

export function addHanokRoof(parent, w, d, y, opts = {}) {
    const tile = opts.tile ?? 0x39404e;      // 기와
    const under = opts.under ?? 0x2a2019;    // 서까래 그늘
    const eave = opts.eave ?? 0.55;          // 처마가 내밀린 길이
    const h = opts.h ?? 0.72;

    const W = w + eave * 2;
    const D = d + eave * 2;

    // 처마 밑 그늘 (서까래가 보이는 부분)
    addBox(parent, W * 0.98, 0.14, D * 0.98, under, 0, y - 0.05, 0, 0,
        { roughness: 1, castShadow: false });

    // 서까래
    const rafters = Math.max(4, Math.floor(W / 0.34));
    for (let i = 0; i < rafters; i++) {
        addBox(parent, 0.06, 0.06, D * 0.98, 0x4a3524,
            -W / 2 + (W / (rafters - 1)) * i, y - 0.13, 0, 0,
            { castShadow: false });
    }

    // 지붕면: 사각뿔을 눌러서 만든다
    const roof = addCone(parent, Math.max(W, D) * 0.72, h, 4, tile, 0, y + h * 0.5 + 0.02, 0,
        { roughness: 0.85, map: opts.map });
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, (D / W) * 0.98);

    // 용마루
    addBox(parent, w * 0.92, 0.16, 0.22, opts.ridge ?? 0x232936, 0, y + h + 0.02, 0, 0,
        { roughness: 0.8 });
    // 용마루 양 끝 장식
    addBox(parent, 0.2, 0.24, 0.24, opts.ridge ?? 0x232936, -w * 0.46, y + h + 0.08, 0);
    addBox(parent, 0.2, 0.24, 0.24, opts.ridge ?? 0x232936, w * 0.46, y + h + 0.08, 0);

    // 네 귀퉁이를 들어 올린다 (한옥의 인상을 만드는 부분)
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            const tip = addBox(parent, 0.5, 0.1, 0.5, tile,
                sx * W * 0.44, y + 0.12, sz * D * 0.44, 0,
                { roughness: 0.85, castShadow: false });
            tip.rotation.z = -sx * 0.42;
            tip.rotation.x = sz * 0.42;
        }
    }

    return roof;
}

/**
 * 초가지붕. 볏짚을 둥글게 덮은 모양이라 기와보다 훨씬 부드럽다.
 */
export function addThatchRoof(parent, w, d, y, opts = {}) {
    const straw = opts.straw ?? 0xc4a463;
    const eave = opts.eave ?? 0.42;
    const W = w + eave * 2, D = d + eave * 2;

    addBox(parent, W * 0.98, 0.12, D * 0.98, 0x2a2019, 0, y - 0.04, 0, 0,
        { roughness: 1, castShadow: false });

    // 두 겹으로 덮어 두께를 준다
    const lower = addCone(parent, Math.max(W, D) * 0.70, 0.62, 7, straw, 0, y + 0.32, 0,
        { roughness: 1, map: G.TEX.thatch });
    lower.scale.set(1, 1, (D / W) * 0.95);

    const upper = addCone(parent, Math.max(W, D) * 0.52, 0.5, 7, opts.strawTop ?? 0xa88c4e,
        0, y + 0.72, 0, { roughness: 1, map: G.TEX.thatch });
    upper.scale.set(1, 1, (D / W) * 0.95);

    // 지붕을 눌러 묶은 새끼줄
    for (let i = 0; i < 3; i++) {
        const rope = addCylinder(parent, W * 0.36 - i * 0.12, W * 0.36 - i * 0.12, 0.035, 8,
            0x6b5628, 0, y + 0.3 + i * 0.22, 0, { castShadow: false });
        rope.scale.z = (D / W) * 0.95;
    }
    return lower;
}

/**
 * 한옥 공통 몸체: 기단 + 기둥 + 벽 + 마루 + 창호.
 * 밤이라 창호에서 새어 나오는 빛이 중요하다.
 */
export function addHanokBody(g, w, d, wallH, opts = {}) {
    const wall = opts.wall ?? 0xcbb08a;
    // 기단 (돌로 쌓은 단)
    addBox(g, w + 0.5, 0.26, d + 0.5, 0x6f6960, 0, 0.13, 0, 0,
        { roughness: 1, map: G.TEX.stone });

    // 흙벽
    addBox(g, w, wallH, d, wall, 0, 0.26 + wallH / 2, 0, 0,
        { roughness: 1, map: G.TEX.dirtObj });

    // 나무 기둥 (네 귀퉁이 + 앞면)
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            addCylinder(g, 0.09, 0.10, wallH + 0.1, 6, 0x4a3524,
                sx * w * 0.5, 0.26 + wallH / 2, sz * d * 0.5, { map: G.TEX.wood });
        }
    }

    // 마루 (앞쪽에 낸 나무 바닥)
    if (opts.porch !== false) {
        addBox(g, w * 0.9, 0.1, 0.62, 0x7a5530, 0, 0.3, d * 0.5 + 0.3, 0,
            { roughness: 1, map: G.TEX.wood });
    }

    // 창호 — 밤에는 등불 빛이 새어 나온다
    const lit = opts.lit !== false;
    const winColor = lit ? 0xe89a4a : 0x6b5c45;

    const winCount = Math.max(1, Math.floor(w / 1.1));
    for (let i = 0; i < winCount; i++) {
        const wx = -w * 0.5 + (w / winCount) * (i + 0.5);
        addBox(g, w / winCount * 0.7, wallH * 0.52, 0.06, winColor,
            wx, 0.26 + wallH * 0.55, d * 0.5 + 0.02, 0, {
            material: makeBasicMat(winColor, { transparent: true, opacity: lit ? 0.85 : 0.75 }),
            castShadow: false
        });
        // 창살
        addBox(g, w / winCount * 0.7, 0.03, 0.02, 0x3f2d1d,
            wx, 0.26 + wallH * 0.55, d * 0.5 + 0.06, 0, { castShadow: false });
        addBox(g, 0.03, wallH * 0.52, 0.02, 0x3f2d1d,
            wx, 0.26 + wallH * 0.55, d * 0.5 + 0.06, 0, { castShadow: false });
    }

    // 창호에서 새어 나오는 빛
    if (lit) {
        const light = new THREE.PointLight(0xffb066, 1.7, 8.5);
        light.position.set(0, 0.26 + wallH * 0.6, d * 0.5 + 0.8);
        g.add(light);
        G.animated.push({
            type: "lantern",
            flame: addBox(g, 0.01, 0.01, 0.01, 0x000000, 0, -5, 0, 0, { castShadow: false }),
            light, baseIntensity: 1.7,
            speed: randRange(2.5, 4.0), phase: randRange(0, Math.PI * 2)
        });
    }
}


/**
 * 초가집. 마을에서 가장 흔한 집.
 * @param {number} scale 집마다 크기를 달리해서 줄 세운 느낌을 없앤다
 */
export function addChoga(x, z, rot, scale = 1) {
    addMapMarker(x, z, "#9c8350", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    G.world.add(g);

    const w = 2.5, d = 1.8, wallH = 1.0;
    addHanokBody(g, w, d, wallH, { wall: 0xd2b287, lit: rand() > 0.3 });
    addThatchRoof(g, w, d, 0.26 + wallH, {});

    // 굴뚝
    if (rand() > 0.5) {
        addCylinder(g, 0.13, 0.16, 0.7, 6, 0x6b5a48, w * 0.42, 0.26 + wallH + 0.3, -d * 0.42,
            { roughness: 1, map: G.TEX.stone });
    }

    // 문
    addBox(g, 0.62, 0.78, 0.07, 0x3a281a, 0, 0.26 + 0.39, d * 0.5 + 0.03, 0,
        { map: G.TEX.wood });

    return g;
}

/**
 * 기와집. 초가집보다 크고 기단이 높다.
 * 어두운 청회색 기와가 밤 화면에서 무게를 잡아 준다.
 */
export function addGiwa(x, z, rot, scale = 1) {
    addMapMarker(x, z, "#6c6470", 3.5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    G.world.add(g);

    const w = 3.3, d = 2.1, wallH = 1.25;

    // 기와집은 기단을 한 단 더 올린다
    addBox(g, w + 0.9, 0.22, d + 0.9, 0x635d55, 0, 0.11, 0, 0,
        { roughness: 1, map: G.TEX.stone });

    const inner = new THREE.Group();
    inner.position.y = 0.22;
    g.add(inner);

    addHanokBody(inner, w, d, wallH, { wall: 0xcbb290, lit: true });
    addHanokRoof(inner, w, d, 0.26 + wallH, { tile: 0x39404e, ridge: 0x232936, h: 0.78, eave: 0.62 });

    // 댓돌 (마루 앞 디딤돌)
    addBox(g, 0.7, 0.14, 0.4, 0x6f6960, 0, 0.29, d * 0.5 + 0.95, 0,
        { roughness: 1, map: G.TEX.stone });

    return g;
}

/**
 * 관아 문루. 마을에서 가장 큰 건물.
 * 계단을 올라 큰 문이 있고, 양옆으로 담이 이어진다.
 */
export function addGovernmentGate(x, z, rot) {
    addMapMarker(x, z, "#b0553a", 5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    // 석축 기단
    addBox(g, 6.2, 0.55, 3.0, 0x635d55, 0, 0.27, 0, 0, { roughness: 1, map: G.TEX.stone });

    // 계단
    for (let i = 0; i < 3; i++) {
        addBox(g, 2.6, 0.18, 0.4, 0x6f6960, 0, 0.09 + i * 0.18, 1.5 + (2 - i) * 0.4, 0,
            { roughness: 1, map: G.TEX.stone });
    }

    const body = new THREE.Group();
    body.position.y = 0.55;
    g.add(body);

    // 기둥 여섯
    for (const px of [-2.4, -0.9, 0.9, 2.4]) {
        for (const pz of [-1.1, 1.1]) {
            addCylinder(body, 0.16, 0.18, 2.4, 8, 0x6b2f22, px, 1.2, pz,
                { roughness: 0.9, map: G.TEX.wood });
        }
    }

    // 문짝
    addBox(body, 1.7, 2.0, 0.12, 0x4a2318, 0, 1.0, 1.05, 0, { map: G.TEX.wood });
    addCylinder(body, 0.07, 0.07, 0.3, 6, 0xc9a14d, -0.35, 1.05, 1.13).rotation.x = Math.PI / 2;
    addCylinder(body, 0.07, 0.07, 0.3, 6, 0xc9a14d, 0.35, 1.05, 1.13).rotation.x = Math.PI / 2;

    // 창방 (기둥 위를 잇는 보)
    addBox(body, 5.6, 0.34, 2.5, 0x5b2a20, 0, 2.55, 0, 0, { roughness: 0.9 });
    // 단청 느낌의 띠
    addBox(body, 5.65, 0.1, 2.55, 0x2f5a5e, 0, 2.72, 0, 0, { castShadow: false });

    addHanokRoof(body, 5.6, 2.5, 2.9, { tile: 0x333a47, ridge: 0x1f242f, h: 0.95, eave: 0.85 });

    // 문 앞 등불
    for (const px of [-2.7, 2.7]) {
        const lamp = addBox(body, 0.3, 0.38, 0.3, 0xffa84e, px, 2.2, 1.0, 0, {
            material: makeBasicMat(0xffa84e, { transparent: true, opacity: 0.85 }),
            castShadow: false
        });
        const light = new THREE.PointLight(0xffb066, 1.8, 9);
        light.position.set(px, 2.2, 1.2);
        body.add(light);
        G.animated.push({
            type: "lantern", flame: lamp, light, baseIntensity: 1.8,
            speed: randRange(4, 6), phase: randRange(0, Math.PI * 2)
        });
    }

    return g;
}


export function addWell(x, z) {
    addMapMarker(x, z, "#5b6b74", 2.5, "prop");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    G.world.add(g);

    addCylinder(g, 0.78, 0.78, 0.55, 12, 0x716a62, 0, 0.28, 0, { roughness: 1 });
    addFlatCircle(g, 0.54, 0x15191f, 0, 0.57, 0, 12, {
        material: makeBasicMat(0x15191f, { transparent: true, opacity: 0.88, side: THREE.DoubleSide })
    });
    addCylinderBetween(g, new THREE.Vector3(-0.75, 1.05, 0), new THREE.Vector3(0.75, 1.05, 0), 0.055, 0x4d3320);
    addCylinder(g, 0.05, 0.06, 1.0, 6, 0x4d3320, -0.75, 0.55, 0);
    addCylinder(g, 0.05, 0.06, 1.0, 6, 0x4d3320, 0.75, 0.55, 0);
}

export function addLantern(x, z) {
    addMapMarker(x, z, "#d99a3c", 2, "prop");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    G.world.add(g);

    addCylinder(g, 0.04, 0.055, 1.25, 6, 0x3c271b, 0, 0.63, 0);
    addBox(g, 0.36, 0.42, 0.36, 0xffa84e, 0, 1.30, 0, 0, {
        material: makeBasicMat(0xffa84e, {
            transparent: true,
            opacity: 0.78
        }),
        castShadow: false,
        receiveShadow: false
    });

    const flame = addCone(g, 0.13, 0.28, 7, 0xffc45f, 0, 1.32, 0, {
        material: makeBasicMat(0xffc45f, { transparent: true, opacity: 0.95 }),
        castShadow: false,
        receiveShadow: false
    });

    const light = new THREE.PointLight(0xffa855, 3.4, 15);
    light.position.set(0, 1.25, 0);
    g.add(light);

    G.animated.push({
        type: "lantern",
        flame,
        light,
        baseIntensity: 3.4,
        speed: randRange(4.5, 6.0),
        phase: randRange(0, Math.PI * 2)
    });
}

export function addJangseung(x, z, rot) {
    addMapMarker(x, z, "#8a6a3f", 2.5, "prop");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    G.world.add(g);

    addCylinder(g, 0.22, 0.28, 1.65, 7, 0x5b3722, 0, 0.83, 0, { roughness: 1 });
    addBlob(g, 0.33, 0x6a3f28, 0, 1.78, 0, { sx: 0.85, sy: 1.12, sz: 0.75 });
    addCone(g, 0.36, 0.30, 7, 0x3b261a, 0, 2.17, 0);

    // 얼굴
    addBox(g, 0.055, 0.055, 0.04, 0x14100d, -0.10, 1.83, 0.25);
    addBox(g, 0.055, 0.055, 0.04, 0x14100d, 0.10, 1.83, 0.25);
    addBox(g, 0.26, 0.04, 0.045, 0x14100d, 0, 1.68, 0.25);

    // 조사 대상인 장승 문양만 별도 그룹으로 반환
    const pattern = new THREE.Group();
    pattern.position.set(0, 1.17, 0.26);
    g.add(pattern);

    const pmat = makeMat(0x74d6ff, {
        emissive: 0x1d8db6,
        emissiveIntensity: 0.7,
        roughness: 0.5
    });
    addBox(pattern, 0.34, 0.04, 0.045, 0x74d6ff, 0, 0.08, 0, 0, { material: pmat });
    addBox(pattern, 0.04, 0.34, 0.045, 0x74d6ff, 0, 0.08, 0, 0, { material: pmat });
    addBox(pattern, 0.24, 0.035, 0.045, 0x74d6ff, 0, -0.08, 0, 0.75, { material: pmat });

    return pattern;
}

export function createBadgeArtifact(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.05, z);
    g.rotation.y = -0.25;
    G.world.add(g);

    addBox(g, 0.72, 0.16, 0.54, 0x5a3c24, 0, 0.08, 0);
    const gold = makeMat(0xc99b4f, {
        metalness: 0.15,
        roughness: 0.55,
        emissive: 0x241200,
        emissiveIntensity: 0.08
    });
    addCylinder(g, 0.27, 0.27, 0.07, 8, 0xc99b4f, 0, 0.21, 0, { material: gold });
    addBox(g, 0.28, 0.035, 0.05, 0x704b24, 0, 0.26, 0.01);

    return g;
}

export function createOldDocument(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.05, z);
    g.rotation.y = 0.18;
    G.world.add(g);

    addBox(g, 1.10, 0.16, 0.72, 0x5b3925, 0, 0.08, 0);
    addBox(g, 0.92, 0.035, 0.55, 0xd9c39a, 0, 0.19, 0, 0, { roughness: 1 });

    addCylinderBetween(g, new THREE.Vector3(-0.50, 0.24, -0.28), new THREE.Vector3(0.50, 0.24, -0.28), 0.035, 0xb69662);
    addCylinderBetween(g, new THREE.Vector3(-0.50, 0.24, 0.28), new THREE.Vector3(0.50, 0.24, 0.28), 0.035, 0xb69662);

    for (let i = 0; i < 4; i++) {
        addBox(g, 0.60 - i * 0.07, 0.012, 0.025, 0x5b4232, -0.05, 0.215, -0.16 + i * 0.10);
    }

    return g;
}
