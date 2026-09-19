/**
 * 1시대 — 신석기 강가 마을
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { registerInteractable } from "../interaction.js";
import { addMapMarker, addMapShape } from "../minimap.js";
import { smooth } from "../noise.js";
import { pick, rand, randRange, seedRandom } from "../rng.js";
import { addAnimalPen, addCanoe, addCropField, addFishingNet, addHayStack, addJarPlatform, addLaundryLine, addStoragePit, addStoneWallRun } from "../props.js";
import { addBirdFlock, addCow, addDog, addPig, addVillager, addWorker, registerNPC } from "../npc.js";
import { registerEnemy } from "../combat.js";
import { GATE_SPOT, RIVER, S, SHARED_ROCKS, addRiver, carveRiver, riverPerp, riverPoint } from "../landmarks.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { addGround, addInstanced, addTreeLine, scatterGrass, scatterStones } from "../world.js";

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

    // 마을 안쪽의 생기 있는 풀밭
    scatterGrass(360, [0x4d6e36, 0x5d8042, 0x6f8f4a, 0x3d592a, 0x7ea354], 3, 31);

    // ---- 돌과 자갈 ----
    scatterStones(130, -30, 30, -30, 30, [0x77706a, 0x8b8172, 0x625c55, 0x8f8a74]);

    // 시대를 가로질러 같은 자리에 남는 큰 바위
    for (const r of SHARED_ROCKS) addBoulder(r.x, r.z, r.s);

    // ---- 먼 나무 실루엣 (푸른 녹음) ----
    addTreeLine([0x38523c, 0x2e4532, 0x48664e, 0x273b2a], 40, 26, 36);

    // ================================================================
    // 마을 — 화면 좌표 S(u, v) 로 배치한다. u = 오른쪽, v = 위쪽.
    // 강은 화면 위쪽(v > 8)을 흐르므로 마을은 그 아래 둔덕에 앉는다.
    // ================================================================

    // 움집 11채. 크기와 각도를 전부 다르게 해서 정렬감을 없앤다.
    const huts = [
        [-4, 4, 0.35, 1.00],
        [3, 6, -0.65, 1.14],
        [9, 2, 0.22, 0.88],
        [-11, 1, 1.05, 0.96],
        [-2, -3, -0.30, 1.05],
        [7, -5, 0.62, 0.92],
        [15, 5, -0.85, 0.84],
        [-16, 6, 0.18, 1.02],
        [-9, -8, 0.48, 0.98],
        [5, -12, -0.22, 0.90],
        [18, -2, 0.75, 0.94]
    ];
    for (const [u, v, rot, sc] of huts) {
        const c = P(u, v);
        addPitHouse(c[0], c[1], rot, sc);
    }

    // ---- 나무 울타리 ----
    addFence([P(-8, 6), P(-6, 2), P(-7, -6), P(-4, -13)]);
    addFence([P(12, 6), P(14, 2), P(13, -5)]);
    addFence([P(-20, 2), P(-18, -5)]);

    // 낮은 돌담 (울타리와 겹치지 않는 구간)
    addStoneWallRun([P(0, 6), P(8, 6.5)], 0.75);
    addStoneWallRun([P(-14, -10), P(-6, -11)], 0.7);

    // ---- 생활의 밀도 ----
    // 하나하나는 단순하지만, 모이면 사람이 살던 자리가 된다.
    let q;
    for (const [pu, pv] of [[0, 2], [-6, 7], [6, 9], [-13, -3], [11, -8], [-1, -9]]) {
        q = P(pu, pv); addStoragePit(q[0], q[1]);
    }

    for (const [hu, hv, hs] of [[10, 6, 0.85], [11, 5, 0.7], [-14, 3, 0.78],
                                 [-3, -15, 0.82], [16, -6, 0.75]]) {
        q = P(hu, hv); addHayStack(q[0], q[1], hs);
    }

    for (const [ju, jv, jr] of [[2, 3, 0.4], [-5, 0, -0.7], [8, -2, 0.2], [-12, 5, 0.6]]) {
        q = P(ju, jv); addJarPlatform(q[0], q[1], jr);
    }

    for (const [au, av, bu, bv] of [[-9, 4, -6, 5], [13, 7, 16, 6], [1, -6, 4, -7]]) {
        const c1 = P(au, av), c2 = P(bu, bv);
        addLaundryLine(c1[0], c1[1], c2[0], c2[1]);
    }

    // 화덕 — 마을의 중심
    q = P(0, 0); addHearth(q[0], q[1]);
    q = P(-12, -6); addHearth(q[0], q[1]);
    q = P(12, 0); addHearth(q[0], q[1]);

    // 작은 제단
    q = P(17, 2); addSmallAltar(q[0], q[1]);

    // 돌무더기 / 조개더미
    for (const [su, sv] of [[-15, 0], [5, -8], [20, 5], [-7, -12]]) {
        q = P(su, sv); addStonePile(q[0], q[1]);
    }
    for (const [su, sv] of [[-2, 6], [7, 6.5], [-11, 5.5]]) {
        q = P(su, sv); addShellHeap(q[0], q[1]);
    }

    // 장작과 나무 걸이
    for (const [fu, fv] of [[2, 1], [-7, 2], [10, -3], [-16, -8], [14, -10]]) {
        q = P(fu, fv); addFirewood(q[0], q[1]);
    }
    for (const [du, dv, dr] of [[-4, 6, 0.4], [9, 7, -0.3], [-17, 2, 0.8], [3, -10, 0.2]]) {
        q = P(du, dv); addDryingRack(q[0], q[1], dr);
    }

    // ---- 강가 ----
    // 강변에 올려 둔 통나무배
    for (const [cu, cv, cr] of [[-13, 6.6], [-1, 7.0], [9, 6.8], [17, 6.4]].map((a,i)=>[a[0],a[1],[0.9,0.55,1.25,0.3][i]])) {
        q = P(cu, cv); addCanoe(q[0], q[1], cr);
    }
    // 그물 말리는 틀
    for (const [nu, nv, nr] of [[-18, 6.2, 0.7], [4, 6.8, -0.3], [14, 6.0, 0.4]]) {
        q = P(nu, nv); addFishingNet(q[0], q[1], nr);
    }

    // ---- 밭과 가축 ----
    // 신석기 후기의 원시 농경
    q = P(-22, -4); addCropField(q[0], q[1], 0.3, 5, 4, [0x7a7a3e, 0x62652f, 0x8a8848]);
    q = P(20, -8); addCropField(q[0], q[1], -0.5, 4, 4, [0x7a7a3e, 0x62652f, 0x8a8848]);
    q = P(-19, -12); addCropField(q[0], q[1], 0.6, 4, 3, [0x7a7a3e, 0x62652f, 0x8a8848]);

    q = P(-21, 6); addAnimalPen(q[0], q[1], 2.8);
    for (const [pu, pv] of [[-21.5, 6.5], [-20.5, 5.5], [-21, 7]]) {
        q = P(pu, pv); addPig(q[0], q[1]);
    }

    // ================================================================
    // 사람과 짐승 — 적이 아니다. 각자 자기 일을 한다.
    // ================================================================
    addVillager([P(-2, 2), P(4, 3), P(8, 6), P(1, 6), P(-5, 5)], "neolithic");
    addVillager([P(-12, 3), P(-16, 5), P(-18, 0), P(-13, -3)], "neolithic");
    addVillager([P(10, 4), P(15, 6), P(17, 1), P(12, -2)], "neolithic");
    addVillager([P(-6, -8), P(-12, -10), P(-15, -5), P(-9, -3)], "neolithic", { speed: 0.8 });
    addVillager([P(4, -7), P(9, -10), P(14, -7), P(8, -4)], "neolithic");
    addVillager([P(-8, 5), P(-2, 6.5), P(4, 6), P(-4, 4)], "neolithic", { speed: 0.9 });
    addVillager([P(16, 6), P(20, 6.5), P(18, 3), P(13, 5)], "neolithic", { speed: 0.85 });

    // 장로: 선택지 대화 NPC — 화재와 단서를 알려준다
    addVillager([P(-4, -2), P(0, 0), P(-3, 2), P(-5, 0)], "neolithic", {
        name: "마을 장로",
        hat: "straw",
        speed: 0.4,
        greeting: "음... 길을 잃은 나그네인가? 무엇이든 물어보게.",
        choices: [
            {
                text: "마을이 불탄 적이 있다고 들었습니다.",
                response: "그래... 옛날에 큰불이 마을을 집어삼켰지. 하지만 저 동쪽 화덕 옆 땅만은 신기하게도 불길이 비껴갔어. 그곳 흙을 잘 살펴보게.",
                clue: "neolithic_fire",
                journal: true,
                followUp: "...(먼 산을 바라보며 깊은 생각에 잠긴다)"
            },
            {
                text: "부러진 간석기는 왜 묻어둔 건가요?",
                response: "간석기는 쓰던 이와 함께 묻는 것이라네. 부러뜨려 묻는 것은 물건의 명을 다하게 하여 저승에서도 쓰게 하려는 선조들의 뜻이지.",
                journal: true,
                followUp: "선대의 돌에 대해 더 알고 싶다면 돌무더기를 조사해보게."
            },
            {
                text: "마을 숲 쪽으로 가도 됩니까?",
                response: "숲가에는 사나운 늑대가 어슬렁거리고 있어. 가까이 가면 크게 다치니 멀리 피해 다니게!",
                followUp: "...(조심하라는 듯 손짓을 한다)"
            }
        ]
    });

    // 마을 동쪽 숲 부근 위험 요소 (늑대)
    registerEnemy({
        type: "wolf",
        name: "늑대",
        waypoints: [P(16, -12), P(22, -8), P(20, -16)],
        speed: 1.8,
        detectRadius: 5.0,
        attackRadius: 1.5,
        damage: 18,
        attackCooldown: 1.8
    });

    // 화덕 앞에서 불을 지피는 사람
    q = P(0.8, 0.6); addWorker(q[0], q[1], "neolithic", { rot: -2.3 });
    q = P(-11.4, -6.4); addWorker(q[0], q[1], "neolithic", { rot: 0.9 });
    // 조개더미에서 일하는 사람
    q = P(-2, 5.4); addWorker(q[0], q[1], "neolithic", { rot: 0.7 });
    // 그물 손질
    q = P(-17, 5.6); addWorker(q[0], q[1], "neolithic", { rot: -0.9 });
    // 배 손질
    q = P(0, 6.2); addWorker(q[0], q[1], "neolithic", { rot: 1.6 });
    // 밭일
    q = P(-21, -4); addWorker(q[0], q[1], "neolithic", { rot: 0.3 });

    // 마을 개
    addDog([P(0, 4), P(6, 2), P(2, 6), P(-5, 3)]);
    addDog([P(-12, -6), P(-6, -9), P(-15, -2)]);

    // 강 위를 도는 새떼
    addBirdFlock(P(-4, 18)[0], 7.5, P(-4, 18)[1], 16);
    addBirdFlock(P(12, 16)[0], 9.0, P(12, 16)[1], 10);

    // ================================================================
    // 조사 대상 3개
    // ================================================================
    q = P(-3, 5.6);
    const pottery = createPotteryShard(q[0], q[1]);
    registerInteractable({
        name: "토기",
        group: pottery,
        pickup: true,
        range: 1.9,
        description: "빗살무늬 토기 조각\n\n조개더미 옆 재 섞인 흙에서 나왔습니다.\n표면에 빗살무늬가 남아 있습니다.\n한쪽 면만 검게 그을렸습니다. 불에 한 번 닿았던 자리입니다."
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

    q = P(1, -1);
    const burntWood = createBurntWoodArtifact(q[0], q[1]);
    registerInteractable({
        name: "탄목",
        group: burntWood,
        pickup: true,
        range: 1.9,
        locked: true,
        unlockClue: "neolithic_fire",
        lockedMsg: "흙 속에 무언가 묻혀 있으나 어디를 파야 할지 알 수 없습니다.\n(마을 장로와 대화하여 단서를 얻으세요)",
        description: "불탄 나무 조각\n\n화덕 옆 땅에서 회수했습니다.\n마을이 한 번 크게 탄 적이 있습니다.\n장로의 말대로 마을 동쪽 한 자리만 불길이 비껴갔습니다."
    });

    // ---- 시간의 문 (고인돌) ----
    G.activeGate = createTimeGate(GATE_SPOT.x, GATE_SPOT.z, GATE_SPOT.rot);
}

/** 큰 바위: 여러 덩이를 겹쳐 자연스러운 형태로 만든다 */
export function addBoulder(x, z, scale) {
    addMapMarker(x, z, "#6f6960", 2.5, "prop");
    const y = terrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = randRange(0, Math.PI);
    G.world.add(g);

    const chunks = Math.floor(randRange(3, 6));
    for (let i = 0; i < chunks; i++) {
        const r = randRange(0.45, 0.85) * scale;
        addBlob(g, r, pick([0x7b746c, 0x8d8478, 0x655f58]),
            randRange(-0.5, 0.5) * scale,
            r * randRange(0.45, 0.8),
            randRange(-0.5, 0.5) * scale, {
            sx: randRange(1.0, 1.6),
            sy: randRange(0.55, 1.0),
            sz: randRange(0.9, 1.5),
            ry: randRange(0, Math.PI),
            rz: randRange(-0.2, 0.2),
            roughness: 1,
            map: G.TEX.stone
        });
    }
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
