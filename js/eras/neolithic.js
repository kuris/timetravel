/**
 * 1시대 — 신석기 강가 (빈 땅)
 *
 * 여기에는 마을이 없다. 강과 숲과 바위뿐이다.
 * 플레이어는 나무와 돌을 주워 첫 집을 세우고, 거기서부터 마을이 시작된다.
 * 땅에 남은 사람의 자취는 셋뿐이다 — 오래된 조개더미, 불탄 그루터기, 그리고 고인돌.
 *
 * 다른 시대의 빌더들이 이 파일의 부품(움집·화덕·갈대·돌무더기·시간의 문)을
 * 가져다 쓰므로, 빌더 함수는 전부 그대로 export 해 둔다.
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { paintBaseMap } from "../basemap.js";
import { registerInteractable } from "../interaction.js";
import { addMapMarker } from "../minimap.js";
import { pick, rand, randRange, seedRandom } from "../rng.js";
import { addBirdFlock, addVillager } from "../npc.js";
import { GATE_SPOT, S, addRiver, carveRiver, riverPoint } from "../landmarks.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { addGround } from "../world.js";

export function buildNeolithic() {
    const P = S;

    // ---- 강바닥을 파낸다 (지형 생성 전에 등록해야 한다) ----
    G.terrainCarve = carveRiver;

    // ---- 지면 ----
    addGround(0x9d7249, [0xc59a62, 0x8a7644, 0xb5854f, 0x6f5637, 0xd6b47f]);

    // ---- 강 ----
    addRiver();

    // ---- 강변 갈대밭 ----
    seedRandom(2100);
    for (let i = 0; i < 52; i++) {
        const [x, z] = riverPoint(randRange(-34, 34), randRange(-1.2, 5.2));
        addReedCluster(x, z, Math.floor(randRange(5, 10)));
    }

    // ---- 자연 지형 ----
    // 돌과 풀과 나무의 자리는 여섯 시대가 공유한다.
    // 여기서 하는 일은 그것을 신석기의 색으로 칠하는 것뿐이다.
    // 사람이 아직 땅을 별로 바꾸지 않은 시대라 나무가 가장 많이 남아 있다.
    paintBaseMap({
        stone: [0x77706a, 0x8b8172, 0x625c55, 0x8f8a74],
        grass: [0x4d6e36, 0x5d8042, 0x6f8f4a, 0x3d592a, 0x7ea354],
        tree: [0x38523c, 0x2e4532, 0x48664e, 0x273b2a],
        treeSurvival: 1.0,
        grassDensity: 1.0
    });

    // ================================================================
    // 여기에는 아직 아무것도 없다.
    //
    // 움집도 울타리도 밭도 놓지 않는다. 마을은 플레이어가 세우는 것이다.
    // 땅에 남은 것은 사람이 지은 것이 아니라, 사람이 떠난 뒤에 남은 것들뿐이다.
    //   조개더미  — 예전에도 누군가 이 강가에서 먹고 살았다
    //   불탄 자리 — 불이 이 땅을 지나갔고, 돌 한 자리만 비껴갔다
    // ================================================================

    let q;

    // ---- 자연 그대로의 돌무더기 ----
    for (const [su, sv] of [[-15, 0], [5, -8], [20, 5], [-7, -12], [-22, -3], [11, 10]]) {
        q = P(su, sv); addStonePile(q[0], q[1]);
    }

    // ---- 오래된 조개더미 ----
    q = P(-3, 6.2); addShellHeap(q[0], q[1]);
    q = P(8, 6.8); addShellHeap(q[0], q[1]);

    // ---- 불탄 자리 ----
    // 고인돌 자리(화면 좌표로 약 (20, -4)) 둘레만 새까맣게 탔다.
    // 이야기의 시작점이다. 그 한복판은 타지 않았다.
    for (const [bu, bv, bs] of [[15, -1, 1.0], [17, 2, 0.8], [22, 1, 0.9], [24, -3, 1.1],
                                [23, -8, 0.85], [18, -9, 1.0], [14, -5, 0.75]]) {
        q = P(bu, bv); addBurntStump(q[0], q[1], bs);
    }
    for (const [au, av, ar] of [[16, -2, 1.6], [22, -1, 2.0], [23, -6, 1.7], [16, -7, 1.4]]) {
        q = P(au, av); addAshPatch(q[0], q[1], ar);
    }

    // ================================================================
    // 사람 — 나와 함께 이 강가에 닿은 무리. 셋뿐이고, 아직 집이 없다.
    // ================================================================

    // 장로: 선택지 대화 NPC — 이 땅의 내력과 첫 단서를 알려준다
    addVillager([P(-4, -2), P(0, 0), P(-3, 2), P(-5, 0)], "neolithic", {
        name: "무리의 장로",
        hat: "straw",
        speed: 0.4,
        greeting: "여기서 멈추세. 강이 있고 돌이 있고 나무가 있으니, 겨울은 날 만하다.",
        choices: [
            {
                text: "예전에 이 땅에 누가 살았습니까?",
                response: "살았지. 오래전에. 저 동쪽 큰 돌 둘레를 보게. 그루터기가 새까맣게 타서 아직 서 있어.\n불이 이 땅을 다 삼켰는데, 그 돌 한 자리만은 비껴갔네. 그 흙을 파 보게.",
                clue: "neolithic_fire",
                journal: true,
                followUp: "...(동쪽을 오래 바라본다)"
            },
            {
                text: "부러진 돌도구가 땅에 묻혀 있습니다.",
                response: "간석기는 쓰던 이와 함께 묻는 것이라네. 부러뜨려 묻는 것은 물건의 명을 다하게 하여 저승에서도 쓰게 하려는 뜻이지.",
                journal: true,
                followUp: "돌무더기 사이를 잘 뒤져 보게."
            },
            {
                text: "무엇부터 해야 합니까?",
                response: "쓰러진 나무와 돌을 주워 오게. 빈 땅에 서서 짓겠다고 하면 집 한 채가 선다네.\n집이 서야 사람이 머물고, 사람이 머물러야 마을일세.",
                followUp: "...(빈 들판을 둘러본다)"
            }
        ]
    });

    // 동행 둘 — 집이 없으니 하루 종일 걸어다닌다
    addVillager([P(3, 2), P(7, -1), P(2, -5), P(-1, 1)], "neolithic", {
        name: "동행",
        speed: 0.85,
        dialogue: [
            "쓸 만한 나무는 저쪽 숲에 쓰러져 있더군.",
            "오늘 밤은 어디서 자야 하나. 지붕이 있으면 좋겠는데."
        ]
    });
    addVillager([P(-9, 3), P(-4, 6), P(-11, 6), P(-12, 1)], "neolithic", {
        name: "동행",
        speed: 0.95,
        dialogue: [
            "강가에 조개껍데기가 수북해. 우리 말고도 여기서 살던 이들이 있었어.",
            "물은 가깝고 땅은 평평하다. 여기면 되겠어."
        ]
    });

    // 강 위를 도는 새떼
    addBirdFlock(P(-4, 18)[0], 7.5, P(-4, 18)[1], 16);
    addBirdFlock(P(12, 16)[0], 9.0, P(12, 16)[1], 10);

    // ================================================================
    // 조사 대상 3개 — 세운 것이 아니라 남겨진 것들
    // ================================================================
    q = P(-3, 5.6);
    const pottery = createPotteryShard(q[0], q[1]);
    registerInteractable({
        name: "토기",
        group: pottery,
        pickup: true,
        range: 1.9,
        description: "빗살무늬 토기 조각\n\n강가 조개더미 옆, 재 섞인 흙에서 나왔습니다.\n표면에 빗살무늬가 남아 있습니다.\n한쪽 면만 검게 그을렸습니다. 불에 한 번 닿았던 자리입니다."
    });

    q = P(-15, 0);
    const stoneTool = createStoneTool(q[0], q[1]);
    registerInteractable({
        name: "간석기",
        group: stoneTool,
        pickup: true,
        range: 1.9,
        description: "간석기\n\n돌무더기 사이에서 회수했습니다.\n매끈하게 갈아 만든 돌도구입니다.\n쓰던 물건인데 부러뜨려서 묻었습니다. 누군가와 함께 보낸 것입니다."
    });

    q = P(17, -7);
    const burntWood = createBurntWoodArtifact(q[0], q[1]);
    registerInteractable({
        name: "탄목",
        group: burntWood,
        pickup: true,
        range: 1.9,
        locked: true,
        unlockClue: "neolithic_fire",
        lockedMsg: "탄 그루터기 사이 흙 속에 무언가 묻혀 있으나 어디를 파야 할지 알 수 없습니다.\n(무리의 장로와 대화하여 단서를 얻으세요)",
        description: "불탄 나무 조각\n\n탄 그루터기 사이의 땅에서 회수했습니다.\n오래전 이 강가가 한 번 크게 탔습니다.\n장로의 말대로, 큰 돌이 선 한 자리만은 불길이 비껴갔습니다."
    });

    // ---- 시간의 문 (고인돌) ----
    G.activeGate = createTimeGate(GATE_SPOT.x, GATE_SPOT.z, GATE_SPOT.rot);
}




/** 갈대 다발: 가늘고 긴 판이 바람에 흔들린다 */
export function addReedCluster(x, z, count = 6) {
    const y = terrainHeight(x, z);

    const g = new THREE.Group();
    g.position.set(x, y, z);
    G.world.add(g);

    for (let i = 0; i < count; i++) {
        const h = randRange(0.9, 2.1);
        const reed = addBox(g,
            randRange(0.035, 0.075), h, 0.03,
            pick([0x58783e, 0x6e8e46, 0x86a250, 0x486430, 0xb09c52]),
            randRange(-0.45, 0.45), h * 0.5, randRange(-0.45, 0.45),
            randRange(0, Math.PI), {
            roughness: 1,
            castShadow: false,
            receiveShadow: false
        });
        reed.rotation.z = randRange(-0.22, 0.22);

        // 이삭
        if (rand() > 0.45) {
            addBox(g, 0.07, 0.2, 0.05, 0x7a6430,
                reed.position.x, h * 0.98, reed.position.z,
                reed.rotation.y, { castShadow: false, receiveShadow: false });
        }
    }

    G.animated.push({
        type: "sway",
        group: g,
        amp: randRange(0.04, 0.11),
        speed: randRange(0.6, 1.3),
        phase: randRange(0, Math.PI * 2)
    });
}

/**
 * 움집: 땅을 판 자리 + 흙벽 + 갈대 지붕 + 지붕 뼈대.
 * scale 로 집마다 크기를 다르게 한다.
 */
export function addPitHouse(x, z, rot, scale = 1) {
    const y = terrainHeight(x, z);
    addMapMarker(x, z, "#9c7b45", 3, "building");
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    G.world.add(g);

    // 집을 두른 흙 둔덕
    addCylinder(g, 1.75, 1.95, 0.14, 12, 0x8a6740, 0, 0.07, 0, {
        roughness: 1, map: G.TEX.dirtObj, castShadow: false
    });

    // 흙벽 (살짝 기울여 낡은 느낌)
    const wall = addCylinder(g, 1.14, 1.32, 0.72, 9, 0x9a6d40, 0, 0.42, 0, {
        roughness: 1, map: G.TEX.dirtObj
    });
    wall.rotation.z = 0.012;

    // 갈대 지붕: 2단으로 겹쳐 두께를 준다
    addCone(g, 1.62, 0.95, 9, 0xc9a45f, 0, 1.24, 0, { roughness: 1, map: G.TEX.thatch });
    addCone(g, 1.30, 0.72, 9, 0xb08c4b, 0, 1.62, 0, { roughness: 1, map: G.TEX.thatch });

    // 꼭대기 묶음
    addCylinder(g, 0.06, 0.12, 0.34, 5, 0x5a4522, 0, 2.02, 0, { map: G.TEX.wood });

    // 지붕을 누르는 나무 뼈대
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        addCylinderBetween(g,
            new THREE.Vector3(Math.cos(a) * 1.52, 0.80, Math.sin(a) * 1.52),
            new THREE.Vector3(0, 1.98, 0),
            0.035, 0x5e4423, { map: G.TEX.wood, castShadow: false });
    }

    // 입구
    addBox(g, 0.52, 0.56, 0.08, 0x241609, 0, 0.32, 1.22);
    addCylinder(g, 0.05, 0.06, 0.9, 5, 0x60421f, -0.44, 0.47, 1.24, { map: G.TEX.wood });
    addCylinder(g, 0.05, 0.06, 0.9, 5, 0x60421f, 0.44, 0.47, 1.24, { map: G.TEX.wood });
    addBox(g, 1.0, 0.07, 0.07, 0x60421f, 0, 0.90, 1.24);

    // 문 앞에 밟힌 흙자국
    addFlatCircle(g, 0.85, 0x7a5734, 0, 0.026, 1.7, 10, {
        material: makeMat(0x7a5734, {
            transparent: true, opacity: 0.55, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1
        })
    });

    return g;
}

/** 장작더미 */
export function addFirewood(x, z) {
    const y = terrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = randRange(0, Math.PI);
    G.world.add(g);

    for (let i = 0; i < 7; i++) {
        const len = randRange(0.7, 1.15);
        const log = addCylinder(g, 0.055, 0.065, len, 5,
            pick([0x5c3f20, 0x6d4a26, 0x47301a]),
            randRange(-0.18, 0.18), 0.06 + i * 0.1, randRange(-0.12, 0.12),
            { map: G.TEX.wood });
        log.rotation.z = Math.PI / 2;
        log.rotation.y = randRange(-0.4, 0.4);
    }
}

/** 물고기 말리는 나무 걸이 */
export function addDryingRack(x, z, rot) {
    const y = terrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    G.world.add(g);

    addCylinder(g, 0.05, 0.07, 1.25, 5, 0x5e4122, -0.85, 0.62, 0, { map: G.TEX.wood });
    addCylinder(g, 0.05, 0.07, 1.25, 5, 0x5e4122, 0.85, 0.62, 0, { map: G.TEX.wood });
    addBox(g, 1.9, 0.06, 0.06, 0x6a4a28, 0, 1.2, 0, 0, { map: G.TEX.wood });

    // 걸린 가죽/물고기
    for (let i = 0; i < 4; i++) {
        addBox(g, 0.22, randRange(0.3, 0.5), 0.03,
            pick([0x8a6b45, 0x6f5436, 0x9b7c52]),
            -0.6 + i * 0.4, 1.0, 0, randRange(-0.2, 0.2), { map: G.TEX.cloth });
    }
}

export function addFence(points) {
    for (let i = 0; i < points.length - 1; i++) {
        addFenceSegment(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    }
}

/** 울타리 한 구간: 기둥이 조금씩 기울어 낡아 보이게 한다 */
export function addFenceSegment(x1, z1, x2, z2) {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const posts = Math.max(2, Math.floor(dist / 1.45));

    for (let i = 0; i <= posts; i++) {
        const t = i / posts;
        const x = x1 + (x2 - x1) * t + randRange(-0.09, 0.09);
        const z = z1 + (z2 - z1) * t + randRange(-0.09, 0.09);
        const y = terrainHeight(x, z);
        const h = randRange(0.95, 1.25);

        const post = addCylinder(G.world, 0.05, 0.08, h, 5,
            pick([0x5c3d1d, 0x6b4826, 0x4c3218]),
            x, y + h * 0.5, z, { map: G.TEX.wood });

        // 기둥마다 조금씩 다른 방향으로 기울인다
        post.rotation.z = randRange(-0.09, 0.09);
        post.rotation.x = randRange(-0.07, 0.07);
    }

    const y1 = terrainHeight(x1, z1);
    const y2 = terrainHeight(x2, z2);

    addCylinderBetween(G.world,
        new THREE.Vector3(x1, y1 + 0.52, z1),
        new THREE.Vector3(x2, y2 + 0.52, z2),
        0.042, 0x6d4724, { map: G.TEX.wood });

    addCylinderBetween(G.world,
        new THREE.Vector3(x1, y1 + 0.84, z1),
        new THREE.Vector3(x2, y2 + 0.84, z2),
        0.036, 0x66421f, { map: G.TEX.wood });
}

/** 화덕: 돌 테두리 + 잉걸불 + 피어오르는 연기 */
export function addHearth(x, z) {
    addMapMarker(x, z, "#d4733a", 2.5, "prop");
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    addFlatCircle(g, 0.72, 0x2e2520, 0, 0.023, 0, 12, {
        transparent: true,
        opacity: 0.72,
        roughness: 1
    });

    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        addBlob(g, 0.15, pick([0x6e665e, 0x81776c, 0x5f5a54]),
            Math.cos(a) * 0.72, 0.11, Math.sin(a) * 0.72,
            { sx: 1.1, sy: 0.55, sz: 0.9, ry: a }
        );
    }

    addCylinderBetween(g, new THREE.Vector3(-0.36, 0.13, -0.10), new THREE.Vector3(0.35, 0.13, 0.10), 0.07, 0x241815);
    addCylinderBetween(g, new THREE.Vector3(-0.30, 0.15, 0.18), new THREE.Vector3(0.31, 0.15, -0.17), 0.055, 0x1b1210);

    const ember = addFlatCircle(g, 0.35, 0xff6b24, 0, 0.036, 0, 8, {
        material: makeBasicMat(0xff6b24, {
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    });

    G.animated.push({ type: "ember", mesh: ember, phase: randRange(0, Math.PI * 2) });

    // 작은 불꽃
    const flame = addCone(g, 0.16, 0.42, 6, 0xff9a3c, 0, 0.26, 0, {
        material: makeBasicMat(0xff9a3c, { transparent: true, opacity: 0.72, depthWrite: false }),
        castShadow: false,
        receiveShadow: false
    });

    const fireLight = new THREE.PointLight(0xff9440, 1.1, 6.5);
    fireLight.position.set(0, 0.5, 0);
    g.add(fireLight);

    G.animated.push({
        type: "torch",
        light: fireLight,
        flame,
        baseIntensity: 1.1,
        speed: randRange(7, 10),
        phase: randRange(0, Math.PI * 2)
    });

    // 피어오르는 연기 (참조 이미지의 연기 기둥)
    addSmokePlume(g, 0, 0.45, 0);
}

/**
 * 연기 기둥: 반투명 판이 천천히 올라가며 커지고 사라진다.
 * 부모 그룹 기준 좌표로 붙인다.
 */
export function addSmokePlume(parent, x, y, z) {
    const puffs = [];

    for (let i = 0; i < 9; i++) {
        const puff = new THREE.Mesh(
            new THREE.PlaneGeometry(1.1, 1.1),
            new THREE.MeshBasicMaterial({
                map: G.TEX.mist,
                color: 0xbfae93,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                fog: true
            })
        );

        // 등각 카메라는 회전하지 않으므로 고정 각도로 세워 두면 항상 정면이다
        puff.rotation.y = Math.PI / 4;
        puff.position.set(x, y, z);
        puff.renderOrder = 5;
        parent.add(puff);
        puffs.push(puff);
    }

    G.animated.push({
        type: "smoke",
        puffs,
        origin: new THREE.Vector3(x, y, z),
        life: puffs.map((_, i) => i / puffs.length)
    });
}

export function addStonePile(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    for (let i = 0; i < 19; i++) {
        addBlob(g, randRange(0.12, 0.32), pick([0x746e65, 0x8a8174, 0x67625c]),
            randRange(-0.7, 0.7), randRange(0.08, 0.35), randRange(-0.55, 0.55),
            { sx: randRange(1, 1.7), sy: randRange(0.45, 0.9), sz: randRange(0.8, 1.4), ry: randRange(0, Math.PI) }
        );
    }
}

/**
 * 불탄 그루터기: 오래전 이 땅을 지나간 불의 흔적.
 * 집이 아니라 "집이 있었던 자리"를 알려 주는 유일한 물건이다.
 */
export function addBurntStump(x, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = randRange(0, Math.PI);
    g.scale.setScalar(scale);
    G.world.add(g);

    const h = randRange(0.7, 1.5);
    const trunk = addCylinder(g, 0.19, 0.31, h, 6, 0x2b211a, 0, h * 0.5, 0, {
        roughness: 1, map: G.TEX.wood
    });
    trunk.rotation.z = randRange(-0.12, 0.12);

    // 쪼개진 꼭대기 — 잘린 것이 아니라 타다 부러진 것이다
    for (let i = 0; i < 3; i++) {
        const sh = randRange(0.15, 0.45);
        const sp = addCylinder(g, 0.035, 0.07, sh, 4, 0x1a1311,
            randRange(-0.13, 0.13), h + sh * 0.4, randRange(-0.13, 0.13),
            { castShadow: false });
        sp.rotation.z = randRange(-0.4, 0.4);
        sp.rotation.x = randRange(-0.4, 0.4);
    }

    // 발치에 떨어진 숯
    for (let i = 0; i < 5; i++) {
        addBlob(g, randRange(0.07, 0.15), pick([0x241b16, 0x33281f, 0x181211]),
            randRange(-0.8, 0.8), 0.05, randRange(-0.8, 0.8),
            { sx: randRange(1, 1.6), sy: 0.4, sz: randRange(0.8, 1.3),
              ry: randRange(0, Math.PI), castShadow: false });
    }
}

/** 재 자국: 땅에 남은 검은 얼룩. 비에 씻기고 남은 만큼만 진하다. */
export function addAshPatch(x, z, r = 1.6) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    addFlatCircle(g, r, 0x352c25, 0, 0.02, 0, 12, {
        material: makeMat(0x352c25, {
            transparent: true, opacity: 0.42, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1
        })
    });

    for (let i = 0; i < 7; i++) {
        addBlob(g, randRange(0.05, 0.11), pick([0x2a221c, 0x1d1815, 0x3b322a]),
            randRange(-r * 0.8, r * 0.8), 0.045, randRange(-r * 0.8, r * 0.8),
            { sx: randRange(1, 1.6), sy: 0.35, sz: randRange(0.8, 1.3),
              ry: randRange(0, Math.PI), castShadow: false });
    }
}

export function addShellHeap(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    addFlatCircle(g, 1.0, 0xe4c791, 0, 0.022, 0, 10, {
        transparent: true,
        opacity: 0.52,
        roughness: 1
    });

    for (let i = 0; i < 26; i++) {
        addBlob(g, randRange(0.05, 0.12), pick([0xf0dfbd, 0xd7c39e, 0xf8edcf]),
            randRange(-0.78, 0.78), 0.075, randRange(-0.62, 0.62),
            { sx: 1.5, sy: 0.25, sz: 0.8, ry: randRange(0, Math.PI) }
        );
    }
}

export function addSmallAltar(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = -0.2;
    G.world.add(g);

    addBox(g, 1.2, 0.32, 0.9, 0x6d665e, 0, 0.16, 0);
    addBox(g, 0.9, 0.25, 0.62, 0x80776d, 0, 0.45, 0);
    addBlob(g, 0.17, 0xcab079, -0.28, 0.68, 0.05, { sy: 0.55 });
    addBlob(g, 0.15, 0xcab079, 0.24, 0.68, -0.06, { sy: 0.55 });
}

export function createPotteryShard(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z) + 0.05, z);
    g.rotation.y = 0.35;
    G.world.add(g);

    addBox(g, 0.78, 0.075, 0.48, 0xb9683e, 0, 0.05, 0, 0, { roughness: 1 });
    for (let i = -1; i <= 1; i++) {
        addBox(g, 0.035, 0.032, 0.42, 0x673b25, i * 0.18, 0.115, 0, 0, { roughness: 1 });
    }
    addBox(g, 0.58, 0.028, 0.035, 0x673b25, 0, 0.12, -0.12);
    addBox(g, 0.58, 0.028, 0.035, 0x673b25, 0, 0.12, 0.12);

    return g;
}

export function createStoneTool(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z) + 0.05, z);
    g.rotation.y = -0.75;
    G.world.add(g);

    addBlob(g, 0.52, 0x7d8278, 0, 0.10, 0, {
        sx: 0.45,
        sy: 0.16,
        sz: 1.22,
        roughness: 1
    });
    addBox(g, 0.18, 0.045, 0.35, 0x575c55, 0, 0.16, -0.30, 0, { roughness: 1 });

    return g;
}

export function createBurntWoodArtifact(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z) + 0.02, z);
    g.rotation.y = 0.42;
    G.world.add(g);

    addCylinderBetween(g, new THREE.Vector3(-0.46, 0.12, 0), new THREE.Vector3(0.42, 0.13, 0.09), 0.085, 0x211614);
    addCylinderBetween(g, new THREE.Vector3(-0.22, 0.18, 0.18), new THREE.Vector3(0.25, 0.18, -0.18), 0.055, 0x160f0e);
    addBlob(g, 0.075, 0xff5f25, 0.13, 0.19, 0.02, {
        material: makeBasicMat(0xff5f25, { transparent: true, opacity: 0.82 })
    });

    return g;
}

export function createTimeGate(x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    addBox(g, 0.62, 1.95, 0.72, 0x6e6a64, -0.92, 0.98, 0, 0.05, { roughness: 1 });
    addBox(g, 0.62, 1.88, 0.72, 0x77716a, 0.92, 0.94, 0, -0.05, { roughness: 1 });
    addBox(g, 2.75, 0.52, 0.86, 0x817970, 0, 2.05, 0, 0.02, { roughness: 1 });

    const portal = new THREE.Mesh(
        new THREE.CircleGeometry(0.88, 24),
        makeBasicMat(0x77ddff, {
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    portal.position.set(0, 1.08, 0.03);
    portal.visible = false;
    g.add(portal);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.94, 0.045, 6, 28),
        makeBasicMat(0x8fe6ff, {
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    ring.position.set(0, 1.08, 0.05);
    ring.visible = false;
    g.add(ring);

    const light = new THREE.PointLight(0x7bdcff, 0, 5);
    light.position.set(0, 1.15, 0.25);
    g.add(light);

    const gateMarker = addMapMarker(x, z, "#8b8072", 4, "gate");

    const gate = {
        group: g,
        marker: gateMarker,
        position: new THREE.Vector3(x, 0, z),
        range: 2.8,
        active: false,
        portal,
        ring,
        light
    };

    G.animated.push({ type: "gate", gate });
    return gate;
}
