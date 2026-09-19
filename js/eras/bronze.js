/**
 * 2시대 — 청동기 고인돌 제단
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { registerInteractable } from "../interaction.js";
import { addMapMarker } from "../minimap.js";
import { pick, randRange } from "../rng.js";
import { GATE_SPOT, S } from "../landmarks.js";
import { addAnimalPen, addHayStack, addJarPlatform, addStoragePit } from "../props.js";
import { addBirdFlock, addDog, addPig, addVillager, addWorker } from "../npc.js";
import { addFirewood, addHearth, addStonePile, createTimeGate } from "./neolithic.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { addGround, addStonePath, addTreeLine, scatterGrass, scatterStones } from "../world.js";

/**
 * 2시대 — 청동기 고인돌 제단
 *
 * 신석기와 가장 크게 달라지는 것:
 *   - 벼농사가 시작된다 (논, 고상 창고)
 *   - 마을을 목책으로 두르기 시작한다 (지킬 것이 생겼다)
 *   - 죽은 사람 위에 큰 돌을 올린다 (고인돌)
 *
 * 배치는 화면 좌표 S(u, v) 로 잡는다. u = 오른쪽, v = 위쪽.
 */
export function buildBronze() {
    const P = S;

    // 황토 언덕. 신석기보다 메마르고 붉다.
    addGround(0x8e6b43, [0xb08653, 0x7d6039, 0xa47c48, 0x63513a, 0xc9a26c]);

    scatterStones(150, -30, 30, -30, 30, [0x786d62, 0x635b55, 0x8b8072, 0x6e6455]);
    scatterGrass(260, [0x7c6c3a, 0x635a30, 0x8d7a45, 0x544d2b], 3, 31);
    addTreeLine([0x6a603c, 0x5a5131, 0x776b45], 34, 26, 36);

    // ---- 길: 마을에서 제단으로 오르는 돌길 ----
    let p1 = P(-8, -12), p2 = P(4, 10);
    addStonePath(p1[0], p1[1], p2[0], p2[1], 2.0);
    p1 = P(-24, 0); p2 = P(-4, -4);
    addStonePath(p1[0], p1[1], p2[0], p2[1], 1.4);

    // ================================================================
    // 제단 구역 (화면 위쪽) — 이 시대의 중심
    // ================================================================
    let q = P(4, 14);
    addBronzeAltar(q[0], q[1]);

    // 제단으로 이어지는 선돌 열
    const menhirRow = [[-2, 4], [10, 4], [-3, 8], [11, 8]];
    for (const [mu, mv] of menhirRow) {
        const c = P(mu, mv);
        addMenhir(c[0], c[1], randRange(2.0, 2.9));
    }

    // 제단을 둘러싼 고인돌들 (두 형식을 섞는다)
    q = P(-8, 16); addDolmenTable(q[0], q[1], 1.15, 0.5);
    q = P(16, 17); addDolmenTable(q[0], q[1], 0.95, -0.4);
    q = P(-14, 9); addDolmenGoban(q[0], q[1], 1.1, 0.15);
    q = P(19, 9); addDolmenGoban(q[0], q[1], 0.9, 0.8);
    q = P(9, 20); addDolmenGoban(q[0], q[1], 1.2, -0.7);

    // 돌널무덤 구역
    q = P(-18, 14); addStoneCist(q[0], q[1], 0.3);
    q = P(-20, 11); addStoneCist(q[0], q[1], -0.5);
    q = P(22, 14); addStoneCist(q[0], q[1], 0.9);

    // 제단 둘레의 횃불
    for (const [tu, tv] of [[0, 11], [8, 11], [0, 17], [8, 17], [-4, 14], [12, 14]]) {
        const c = P(tu, tv);
        addTorch(c[0], c[1]);
    }

    // ================================================================
    // 마을 (화면 아래-왼쪽) — 목책으로 둘렀다
    // ================================================================
    const houses = [
        [-16, -6, 0.35, 1.00],
        [-10, -10, -0.55, 0.92],
        [-20, -12, 0.22, 1.05],
        [-6, -16, -0.42, 0.95],
        [-14, -18, 0.62, 0.88],
        [-22, -3, -0.2, 0.95]
    ];
    for (const [u, v, rot, sc] of houses) {
        const c = P(u, v);
        addBronzeHouse(c[0], c[1], rot, sc);
    }

    // 고상 창고 — 벼농사가 시작된 시대의 표식
    q = P(-13, -2); addRaisedGranary(q[0], q[1], 0.3);
    q = P(-18, -15); addRaisedGranary(q[0], q[1], -0.6);
    q = P(-4, -11); addRaisedGranary(q[0], q[1], 0.9);

    // 목책과 망루
    addPalisade([P(-26, 2), P(-24, -8), P(-16, -21), P(-2, -22)]);
    addPalisade([P(2, -20), P(8, -14)]);
    q = P(-25, -4); addWatchtower(q[0], q[1], 0.4);
    q = P(0, -21); addWatchtower(q[0], q[1], -0.3);

    // 마을 살림
    q = P(-12, -13); addStoragePit(q[0], q[1]);
    q = P(-8, -6); addStoragePit(q[0], q[1]);
    q = P(-19, -8); addHayStack(q[0], q[1], 0.9);
    q = P(-17, -9.5); addHayStack(q[0], q[1], 0.75);
    q = P(-9, -3); addJarPlatform(q[0], q[1], 0.4);
    q = P(-22, -18); addAnimalPen(q[0], q[1], 2.6);
    q = P(-22.4, -17.6); addPig(q[0], q[1]);
    q = P(-21.2, -18.6); addPig(q[0], q[1]);

    // 화덕
    q = P(-14, -8); addHearth(q[0], q[1]);

    // ================================================================
    // 논 (화면 아래-오른쪽) — 이 시대를 신석기와 갈라놓는 풍경
    // ================================================================
    q = P(14, -8); addRicePaddy(q[0], q[1], 0.15, 2, 2);
    q = P(22, -16); addRicePaddy(q[0], q[1], -0.2, 2, 1);
    q = P(6, -18); addRicePaddy(q[0], q[1], 0.35, 2, 1);

    // 논 사이의 돌무더기와 장작
    q = P(10, -2); addStonePile(q[0], q[1]);
    q = P(18, 2); addStonePile(q[0], q[1]);
    q = P(2, -6); addFirewood(q[0], q[1]);
    q = P(-2, 2); addFirewood(q[0], q[1]);

    // ================================================================
    // 사람과 짐승
    // ================================================================
    // 제단을 도는 사람들
    addVillager([P(2, 10), P(10, 12), P(8, 18), P(0, 16)], "bronze", { speed: 0.65 });
    // 마을 사람들
    addVillager([P(-14, -8), P(-20, -10), P(-18, -16), P(-10, -14)], "bronze");
    addVillager([P(-22, -2), P(-16, -4), P(-12, -1), P(-20, 2)], "bronze", { speed: 0.9 });
    // 논에서 일하는 사람들
    addVillager([P(12, -6), P(18, -10), P(20, -14), P(14, -12)], "bronze", { speed: 0.8 });

    // 제단 앞에서 절하는 사람
    q = P(4, 10); addWorker(q[0], q[1], "bronze", { rot: 0 });
    // 화덕 앞
    q = P(-14.8, -8.6); addWorker(q[0], q[1], "bronze", { rot: 1.1 });
    // 논일
    q = P(15, -9); addWorker(q[0], q[1], "bronze", { rot: -0.4 });

    addDog([P(-14, -6), P(-8, -10), P(-18, -12), P(-20, -4)]);
    addBirdFlock(P(6, 22)[0], 9, P(6, 22)[1], 12);

    // ================================================================
    // 조사 대상 3개
    // ================================================================
    q = P(-6, 12);
    const dagger = createBronzeDaggerFragment(q[0], q[1]);
    registerInteractable({
        name: "동검 조각",
        group: dagger,
        pickup: true,
        range: 1.8,
        glowColor: 0xffc35d,
        description: "비파형 동검 조각\n\n고인돌 아래 흙에서 나왔습니다.\n날이 일부러 부러뜨려져 있습니다. 죽은 이와 함께 묻으려고 그랬을 것입니다."
    });

    q = P(14, 11);
    const bell = createBronzeBellArtifact(q[0], q[1]);
    registerInteractable({
        name: "청동 방울",
        group: bell,
        pickup: true,
        range: 1.9,
        glowColor: 0xffbd5f,
        description: "청동 방울\n\n제단 옆 틀에 걸려 있습니다.\n흔들지 않아도 낮은 울림이 남아 있습니다. 여기서 오래 제사를 지냈다는 뜻입니다."
    });

    q = P(4, 14);
    const pattern = createAltarPattern(q[0], q[1]);
    registerInteractable({
        name: "제단 문양",
        group: pattern,
        pickup: false,
        range: 2.2,
        glowColor: 0x8ee6ff,
        description: "제단의 문양\n\n동심원과 번개 모양 선이 새겨져 있습니다.\n한가운데 원은 하늘이 아니라 땅을 가리킵니다. 이 아래에 무언가를 묻었습니다."
    });

    // ---- 시간의 문: 신석기와 같은 자리에 선 고인돌 ----
    G.activeGate = createTimeGate(GATE_SPOT.x, GATE_SPOT.z, GATE_SPOT.rot);
}

/* ================================================================
   청동기 시대의 돌
   고인돌은 두 가지 형식이 있다.
     탁자식(북방식) — 판돌을 세우고 그 위에 덮개돌을 올린다
     바둑판식(남방식) — 낮은 굄돌 위에 큰 덮개돌만 올린다
   두 형식을 섞어 두면 훨씬 그럴듯해진다.
   ================================================================ */

/** 탁자식 고인돌: 판돌을 세워 방을 만들고 덮개돌을 올린다 */
export function addDolmenTable(x, z, s, rot) {
    addMapMarker(x, z, "#8a8174", 3.5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.scale.setScalar(s);
    g.rotation.y = rot;
    G.world.add(g);

    const stone = () => pick([0x6f6a62, 0x7c766c, 0x635e57, 0x847d72]);

    // 세운 판돌 넷 (앞쪽은 낮게 터 둔다)
    const slabs = [
        [-1.0, 0, 0.12, 1.55, 0.26, 1.5],
        [1.0, 0, -0.1, 1.5, 0.26, 1.5],
        [0, -0.85, 0, 1.75, 1.4, 0.24],
        [0, 0.85, 0, 1.75, 0.55, 0.22]
    ];
    for (const [sx, sz, tilt, w, h, d] of slabs) {
        const slab = addBox(g, w, h, d, stone(), sx, h / 2, sz, 0,
            { roughness: 1, map: G.TEX.stone });
        slab.rotation.z = tilt;
        slab.rotation.x = randRange(-0.04, 0.04);
    }

    // 덮개돌 — 고인돌의 인상을 결정한다. 크고 두껍게.
    const cap = addBox(g, 3.1, 0.52, 2.3, stone(), 0, 1.72, 0, 0.03,
        { roughness: 1, map: G.TEX.stone });
    cap.rotation.z = 0.035;
    cap.rotation.x = -0.02;

    // 덮개돌 가장자리를 깨진 것처럼
    for (let i = 0; i < 5; i++) {
        addBlob(g, randRange(0.18, 0.32), stone(),
            randRange(-1.4, 1.4), 1.75, randRange(-1.0, 1.0), {
            sx: randRange(1.1, 1.8), sy: 0.5, sz: randRange(1.0, 1.6),
            ry: randRange(0, Math.PI), roughness: 1, map: G.TEX.stone,
            castShadow: false
        });
    }

    // 발치에 쌓인 돌
    for (let i = 0; i < 7; i++) {
        const a = randRange(0, Math.PI * 2), r = randRange(1.4, 2.1);
        addBlob(g, randRange(0.14, 0.26), stone(),
            Math.cos(a) * r, 0.1, Math.sin(a) * r,
            { sy: 0.55, ry: a, roughness: 1, map: G.TEX.stone, castShadow: false });
    }

    return g;
}

/** 바둑판식 고인돌: 낮은 굄돌 위에 덮개돌만 얹혀 있다 */
export function addDolmenGoban(x, z, s, rot) {
    addMapMarker(x, z, "#8a8174", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.scale.setScalar(s);
    g.rotation.y = rot;
    G.world.add(g);

    const stone = () => pick([0x6f6a62, 0x7c766c, 0x635e57]);

    // 굄돌 넷
    for (const [sx, sz] of [[-0.75, -0.55], [0.75, -0.5], [-0.7, 0.6], [0.8, 0.55]]) {
        addBlob(g, 0.36, stone(), sx, 0.24, sz, {
            sx: randRange(1.0, 1.4), sy: randRange(0.9, 1.3), sz: randRange(1.0, 1.3),
            ry: randRange(0, Math.PI), roughness: 1, map: G.TEX.stone
        });
    }

    // 큼직한 덮개돌 하나
    const cap = addBlob(g, 1.45, stone(), 0, 0.72, 0, {
        sx: 1.5, sy: 0.32, sz: 1.15,
        ry: randRange(0, Math.PI), roughness: 1, map: G.TEX.stone
    });
    cap.rotation.z = randRange(-0.09, 0.09);

    return g;
}

/** 선돌: 하늘을 향해 세워 둔 길쭉한 돌 */
export function addMenhir(x, z, h) {
    addMapMarker(x, z, "#7d766c", 2, "prop");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = randRange(0, Math.PI);
    G.world.add(g);

    const stone = addCylinder(g, 0.22, 0.42, h, 6, pick([0x746f66, 0x817a70, 0x685f56]),
        0, h / 2, 0, { roughness: 1, map: G.TEX.stone });
    stone.rotation.z = randRange(-0.07, 0.07);
    stone.rotation.x = randRange(-0.05, 0.05);

    // 밑동을 잡아 주는 돌
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        addBlob(g, 0.17, 0x6f6960, Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45,
            { sy: 0.6, ry: a, roughness: 1, map: G.TEX.stone, castShadow: false });
    }
    return g;
}

/** 돌널무덤: 땅에 판돌을 짜 넣어 만든 무덤 */
export function addStoneCist(x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    // 파낸 자리
    addFlatCircle(g, 1.1, 0x4a3b2c, 0, 0.03, 0, 8, {
        material: makeMat(0x4a3b2c, {
            transparent: true, opacity: 0.6, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1, map: G.TEX.dirtObj
        })
    });

    // 네 벽을 이루는 판돌
    addBox(g, 1.5, 0.42, 0.1, 0x776f66, 0, 0.21, -0.45, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, 1.5, 0.42, 0.1, 0x6f6860, 0, 0.21, 0.45, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, 0.1, 0.42, 0.9, 0x7c746a, -0.7, 0.21, 0, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, 0.1, 0.42, 0.9, 0x6a635b, 0.7, 0.21, 0, 0, { roughness: 1, map: G.TEX.stone });

    // 반쯤 덮인 뚜껑돌
    const lid = addBox(g, 1.6, 0.16, 0.6, 0x827a70, 0.15, 0.48, -0.15, 0.1,
        { roughness: 1, map: G.TEX.stone });
    lid.rotation.z = 0.06;

    return g;
}

/* ================================================================
   청동기 마을
   신석기의 움집보다 크고, 벼농사가 시작되면서
   고상 창고(기둥 위에 올린 곳간)가 나타난다.
   ================================================================ */

/** 송국리형 원형 움집: 신석기 움집보다 크고 지붕이 가파르다 */
export function addBronzeHouse(x, z, rot, scale = 1) {
    addMapMarker(x, z, "#9c7b45", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    G.world.add(g);

    // 파낸 자리를 두른 흙 둔덕
    addCylinder(g, 2.05, 2.25, 0.18, 12, 0x8a6740, 0, 0.09, 0,
        { roughness: 1, map: G.TEX.dirtObj, castShadow: false });

    // 흙벽
    addCylinder(g, 1.35, 1.52, 0.85, 10, 0x96703f, 0, 0.5, 0,
        { roughness: 1, map: G.TEX.dirtObj });

    // 가파른 지붕 (신석기보다 뾰족하다)
    addCone(g, 1.95, 1.35, 10, 0xb08c4b, 0, 1.55, 0, { roughness: 1, map: G.TEX.thatch });
    addCone(g, 1.5, 0.9, 10, 0x977741, 0, 2.15, 0, { roughness: 1, map: G.TEX.thatch });
    addCylinder(g, 0.07, 0.14, 0.4, 5, 0x5a4522, 0, 2.65, 0, { map: G.TEX.wood });

    // 지붕을 잡아 주는 서까래
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.25;
        addCylinderBetween(g,
            new THREE.Vector3(Math.cos(a) * 1.85, 0.9, Math.sin(a) * 1.85),
            new THREE.Vector3(0, 2.6, 0),
            0.04, 0x5e4423, { map: G.TEX.wood, castShadow: false });
    }

    // 입구
    addBox(g, 0.6, 0.66, 0.08, 0x241609, 0, 0.38, 1.45);
    addCylinder(g, 0.055, 0.07, 1.05, 5, 0x60421f, -0.5, 0.55, 1.48, { map: G.TEX.wood });
    addCylinder(g, 0.055, 0.07, 1.05, 5, 0x60421f, 0.5, 0.55, 1.48, { map: G.TEX.wood });

    return g;
}

/**
 * 고상 창고.
 * 기둥 위에 바닥을 올려 곡식을 습기와 쥐로부터 지킨다.
 * 벼농사가 시작된 청동기의 상징 같은 건물이다.
 */
export function addRaisedGranary(x, z, rot) {
    addMapMarker(x, z, "#b08a4c", 2.5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const H = 1.5; // 바닥 높이

    // 기둥 넷과 쥐막이 판
    for (const [px, pz] of [[-0.75, -0.6], [0.75, -0.6], [-0.75, 0.6], [0.75, 0.6]]) {
        addCylinder(g, 0.09, 0.11, H, 6, 0x6b4826, px, H / 2, pz, { map: G.TEX.wood });
        // 쥐막이: 기둥 위에 끼운 넓은 원판
        addCylinder(g, 0.28, 0.28, 0.06, 8, 0x8a6534, px, H - 0.12, pz,
            { map: G.TEX.wood, castShadow: false });
    }

    // 바닥
    addBox(g, 1.95, 0.12, 1.6, 0x7a5530, 0, H + 0.06, 0, 0, { roughness: 1, map: G.TEX.wood });

    // 벽
    addBox(g, 1.8, 0.95, 1.45, 0x9c7a4c, 0, H + 0.6, 0, 0, { roughness: 1, map: G.TEX.thatch });

    // 지붕
    const roof = addCone(g, 1.6, 0.8, 4, 0xa88a4e, 0, H + 1.45, 0,
        { roughness: 1, map: G.TEX.thatch });
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.82;

    // 사다리
    const ladder = new THREE.Group();
    ladder.position.set(0, 0, 1.15);
    ladder.rotation.x = -0.3;
    g.add(ladder);
    addCylinder(ladder, 0.04, 0.04, H + 0.3, 4, 0x5c3f20, -0.22, (H + 0.3) / 2, 0, { map: G.TEX.wood });
    addCylinder(ladder, 0.04, 0.04, H + 0.3, 4, 0x5c3f20, 0.22, (H + 0.3) / 2, 0, { map: G.TEX.wood });
    for (let i = 0; i < 5; i++) {
        addBox(ladder, 0.5, 0.04, 0.04, 0x6d4a26, 0, 0.22 + i * 0.32, 0, 0, { castShadow: false });
    }

    return g;
}

/**
 * 논.
 * 청동기에 벼농사가 시작된다. 물을 댄 네모난 구획과 논둑이
 * 화면에서 이 시대를 신석기와 구분해 주는 가장 큰 차이다.
 */
export function addRicePaddy(x, z, rot, cols = 2, rows = 2) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const CW = 3.4, CD = 2.8;

    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const cx = (c - (cols - 1) / 2) * (CW + 0.5);
            const cz = (r - (rows - 1) / 2) * (CD + 0.5);

            // 물을 댄 면
            const water = new THREE.Mesh(
                new THREE.PlaneGeometry(CW, CD),
                new THREE.MeshStandardMaterial({
                    map: G.TEX.water,
                    color: 0x6b7a6a,
                    transparent: true,
                    opacity: 0.88,
                    // 직교 카메라에서는 매끈한 면이 전체가 하얗게 탄다
                    roughness: 0.78,
                    metalness: 0.0,
                    depthWrite: false
                })
            );
            water.rotation.x = -Math.PI / 2;
            water.position.set(cx, 0.06, cz);
            water.renderOrder = 1;
            g.add(water);

            // 논둑
            for (const [bw, bd, bx, bz] of [
                [CW + 0.5, 0.34, cx, cz - CD / 2 - 0.17],
                [CW + 0.5, 0.34, cx, cz + CD / 2 + 0.17],
                [0.34, CD + 0.5, cx - CW / 2 - 0.17, cz],
                [0.34, CD + 0.5, cx + CW / 2 + 0.17, cz]
            ]) {
                addBox(g, bw, 0.2, bd, 0x7d6343, bx, 0.1, bz, 0,
                    { roughness: 1, map: G.TEX.dirtObj, castShadow: false });
            }

            // 모: 줄지어 심는다
            for (let i = 0; i < 7; i++) {
                for (let j = 0; j < 5; j++) {
                    const sx = cx - CW / 2 + 0.4 + i * (CW - 0.8) / 6;
                    const sz = cz - CD / 2 + 0.4 + j * (CD - 0.8) / 4;
                    for (let b = 0; b < 3; b++) {
                        const blade = addBox(g, 0.03, randRange(0.22, 0.4), 0.02,
                            pick([0x7f8a44, 0x6b7538, 0x93a054]),
                            sx + randRange(-0.07, 0.07), 0.2, sz + randRange(-0.07, 0.07),
                            randRange(0, Math.PI), { castShadow: false });
                        blade.rotation.z = randRange(-0.3, 0.3);
                    }
                }
            }
        }
    }
    return g;
}

/**
 * 목책: 끝을 뾰족하게 깎은 통나무를 촘촘히 박는다.
 * 청동기에 마을을 둘러싸기 시작한다. (지킬 것이 생겼다는 뜻이다)
 */
export function addPalisade(points) {
    for (let i = 0; i < points.length - 1; i++) {
        const [x1, z1] = points[i];
        const [x2, z2] = points[i + 1];
        const dist = Math.hypot(x2 - x1, z2 - z1);
        const n = Math.max(2, Math.floor(dist / 0.32));

        for (let s = 0; s <= n; s++) {
            const t = s / n;
            const x = x1 + (x2 - x1) * t + randRange(-0.05, 0.05);
            const z = z1 + (z2 - z1) * t + randRange(-0.05, 0.05);
            const y = terrainHeight(x, z);
            const h = randRange(1.7, 2.2);

            const log = addCylinder(G.world, 0.09, 0.12, h, 5,
                pick([0x5c3f20, 0x6b4826, 0x4c3218]),
                x, y + h / 2, z, { map: G.TEX.wood });
            log.rotation.z = randRange(-0.05, 0.05);

            // 뾰족하게 깎은 끝
            addCone(G.world, 0.1, 0.24, 5, 0x6b4826, x, y + h + 0.1, z,
                { map: G.TEX.wood, castShadow: false });
        }
    }
}

/** 망루: 목책 안쪽에서 멀리 내다본다 */
export function addWatchtower(x, z, rot) {
    addMapMarker(x, z, "#8a6a3f", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const H = 3.4;

    // 안쪽으로 기울어진 기둥 넷
    for (const [px, pz] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) {
        const post = addCylinder(g, 0.09, 0.13, H, 5, 0x5c3f20, px * 0.85, H / 2, pz * 0.85,
            { map: G.TEX.wood });
        post.rotation.z = -px * 0.06;
        post.rotation.x = pz * 0.06;
    }

    // 가새
    for (let i = 0; i < 3; i++) {
        const y = 0.9 + i * 1.0;
        addBox(g, 1.85, 0.07, 0.07, 0x6d4a26, 0, y, -0.8, 0, { castShadow: false });
        addBox(g, 1.85, 0.07, 0.07, 0x6d4a26, 0, y, 0.8, 0, { castShadow: false });
        addBox(g, 0.07, 0.07, 1.7, 0x6d4a26, -0.8, y, 0, 0, { castShadow: false });
        addBox(g, 0.07, 0.07, 1.7, 0x6d4a26, 0.8, y, 0, 0, { castShadow: false });
    }

    // 망루 바닥과 난간
    addBox(g, 2.1, 0.12, 2.1, 0x7a5530, 0, H, 0, 0, { roughness: 1, map: G.TEX.wood });
    for (const [bx, bz, bw, bd] of [[0, -1.0, 2.1, 0.08], [0, 1.0, 2.1, 0.08],
                                     [-1.0, 0, 0.08, 2.1], [1.0, 0, 0.08, 2.1]]) {
        addBox(g, bw, 0.55, bd, 0x6d4a26, bx, H + 0.34, bz, 0, { castShadow: false });
    }

    // 지붕
    const roof = addCone(g, 1.85, 0.75, 4, 0xa88a4e, 0, H + 1.1, 0,
        { roughness: 1, map: G.TEX.thatch });
    roof.rotation.y = Math.PI / 4;

    // 사다리
    for (let i = 0; i < 7; i++) {
        addBox(g, 0.7, 0.05, 0.05, 0x5c3f20, 0, 0.35 + i * 0.45, 1.05, 0, { castShadow: false });
    }

    return g;
}

/**
 * 제단.
 * 이 시대의 중심. 계단식 돌단 위에 청동 제기를 올려 둔다.
 */
export function addBronzeAltar(x, z) {
    addMapMarker(x, z, "#c08a3c", 5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    // 계단식 석단
    addBox(g, 5.4, 0.4, 4.2, 0x635d55, 0, 0.2, 0, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, 4.2, 0.38, 3.2, 0x6f6960, 0, 0.59, 0, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, 3.0, 0.34, 2.2, 0x7c756a, 0, 0.95, 0, 0, { roughness: 1, map: G.TEX.stone });

    // 단 위에 올린 큰 덮개돌 (제단 판)
    const slab = addBox(g, 2.5, 0.28, 1.8, 0x857d71, 0, 1.26, 0, 0.02,
        { roughness: 1, map: G.TEX.stone });
    slab.rotation.z = 0.015;

    // 청동 제기
    addCylinder(g, 0.26, 0.2, 0.3, 8, 0x9c7b3a, -0.7, 1.55, 0.3, { metalness: 0.55, roughness: 0.4 });
    addCylinder(g, 0.2, 0.15, 0.24, 8, 0x8c6d33, 0.65, 1.52, -0.25, { metalness: 0.55, roughness: 0.4 });
    // 제단 위의 토기
    addCylinder(g, 0.15, 0.22, 0.34, 8, 0x8a5236, 0.1, 1.57, 0.45, { roughness: 0.8 });

    // 단에 오르는 계단
    for (let i = 0; i < 3; i++) {
        addBox(g, 1.5, 0.2, 0.4, 0x6f6960, 0, 0.1 + i * 0.2, 2.1 + (2 - i) * 0.4, 0,
            { roughness: 1, map: G.TEX.stone, castShadow: false });
    }

    // 발치에 놓인 공물
    for (let i = 0; i < 6; i++) {
        const a = randRange(0, Math.PI * 2), r = randRange(2.8, 3.6);
        addBlob(g, randRange(0.12, 0.2), pick([0x8a5236, 0x9c7b3a, 0x6f5a3c]),
            Math.cos(a) * r, 0.1, Math.sin(a) * r,
            { sy: 0.7, ry: a, roughness: 0.8, castShadow: false });
    }

    return g;
}


export function addTorch(x, z) {
    addMapMarker(x, z, "#d4733a", 2, "prop");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    G.world.add(g);

    addCylinder(g, 0.055, 0.075, 1.15, 6, 0x51311d, 0, 0.58, 0);
    addCylinder(g, 0.18, 0.14, 0.18, 8, 0x2f2119, 0, 1.20, 0);

    const flameMat = makeBasicMat(0xff9b35, { transparent: true, opacity: 0.95 });
    const flame = addCone(g, 0.22, 0.48, 7, 0xff9b35, 0, 1.52, 0, {
        material: flameMat,
        castShadow: false,
        receiveShadow: false
    });

    const light = new THREE.PointLight(0xff8a33, 0.85, 6);
    light.position.set(0, 1.35, 0);
    g.add(light);

    G.animated.push({
        type: "torch",
        flame,
        light,
        baseIntensity: 0.85,
        speed: randRange(5.2, 7.0),
        phase: randRange(0, Math.PI * 2)
    });
}

export function createBronzeDaggerFragment(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.08, z);
    g.rotation.y = 0.72;
    G.world.add(g);

    const bronze = makeMat(0xb47b3e, {
        metalness: 0.25,
        roughness: 0.58,
        emissive: 0x2b1405,
        emissiveIntensity: 0.08
    });

    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.22, 4), bronze);
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0, 0.12, 0.04);
    blade.castShadow = true;
    blade.receiveShadow = true;
    g.add(blade);

    addBox(g, 0.16, 0.08, 0.42, 0x6f4628, 0, 0.12, -0.58, 0, {
        metalness: 0.1,
        roughness: 0.7
    });

    return g;
}

export function createBronzeBellArtifact(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = -0.3;
    G.world.add(g);

    addCylinder(g, 0.045, 0.06, 1.25, 6, 0x4d301d, -0.48, 0.63, 0);
    addCylinder(g, 0.045, 0.06, 1.25, 6, 0x4d301d, 0.48, 0.63, 0);
    addCylinderBetween(g, new THREE.Vector3(-0.55, 1.20, 0), new THREE.Vector3(0.55, 1.20, 0), 0.045, 0x4d301d);

    const bronze = makeMat(0xb98243, {
        metalness: 0.25,
        roughness: 0.55,
        emissive: 0x291505,
        emissiveIntensity: 0.08
    });

    addCylinder(g, 0.18, 0.40, 0.55, 10, 0xb98243, 0, 0.84, 0, { material: bronze });
    addBlob(g, 0.08, 0x8d6035, 0, 0.51, 0, {
        material: bronze,
        sy: 0.75
    });

    return g;
}

export function createAltarPattern(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.92, z);
    G.world.add(g);

    const mat = makeMat(0x69d6e7, {
        emissive: 0x1fb6d0,
        emissiveIntensity: 0.8,
        roughness: 0.4
    });

    addBox(g, 1.15, 0.035, 0.08, 0x69d6e7, 0, 0.035, 0, 0, { material: mat });
    addBox(g, 0.08, 0.035, 0.85, 0x69d6e7, 0, 0.04, 0, 0, { material: mat });
    addBox(g, 0.65, 0.035, 0.06, 0x69d6e7, -0.35, 0.045, 0.32, -0.65, { material: mat });
    addBox(g, 0.65, 0.035, 0.06, 0x69d6e7, 0.35, 0.045, -0.32, -0.65, { material: mat });

    return g;
}
