/**
 * 1시대 — 신석기 강가 마을
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { registerInteractable } from "../interaction.js";
import { addMapMarker, addMapShape } from "../minimap.js";
import { smooth } from "../noise.js";
import { pick, rand, randRange, seedRandom } from "../rng.js";
import { addAnimalPen, addCanoe, addCropField, addFishingNet, addHayStack, addJarPlatform, addLaundryLine, addStoragePit, addStoneWallRun } from "../props.js";
import { addBirdFlock, addCow, addDog, addPig, addVillager, addWorker } from "../npc.js";
import { GATE_SPOT, RIVER, SHARED_ROCKS, addRiver, carveRiver, riverPerp, riverPoint } from "../landmarks.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { addGround, addInstanced, addTreeLine, scatterGrass, scatterStones } from "../world.js";

export function buildNeolithic() {
    // ---- 강바닥을 파낸다 (지형 생성 전에 등록해야 한다) ----
    G.terrainCarve = carveRiver;

    // ---- 지면 ----
    addGround(0x9d7249, [0xc59a62, 0x8a7644, 0xb5854f, 0x6f5637, 0xd6b47f]);

    // ---- 강 ----
    addRiver();

    // ---- 강변 갈대밭 ----
    seedRandom(2100);
    for (let i = 0; i < 30; i++) {
        // 물가를 따라 자라도록 강 중심선 좌표계로 배치한다
        const along = randRange(-34, 34);
        const perp = randRange(-1.2, 5.2);
        const x = RIVER.center.x + along * Math.SQRT1_2 + perp * Math.SQRT1_2;
        const z = RIVER.center.z - along * Math.SQRT1_2 + perp * Math.SQRT1_2;
        addReedCluster(x, z, Math.floor(randRange(5, 9)));
    }

    // 마을 안쪽에도 마른 풀 무더기를 흩뿌린다
    scatterGrass(330, [0x8d7b45, 0x6f6a38, 0xa08a4e, 0x5f5c33, 0x7a6b3c], 3, 31);

    // ---- 돌과 자갈 ----
    scatterStones(130, -30, 30, -30, 30, [0x77706a, 0x8b8172, 0x625c55, 0x8f8a74]);

    // 큰 바위 몇 덩이 (구도에 무게를 준다)
    addBoulder(-13.5, 4.0, 1.5);
    addBoulder(-11.2, 6.4, 1.05);
    addBoulder(14.0, -6.5, 1.3);
    addBoulder(-16.5, -3.2, 1.15);

    // ---- 먼 나무 실루엣 ----
    addTreeLine([0x77714a, 0x655f3c, 0x837a52, 0x6d6742], 40, 26, 36);

    // ---- 마을 ----
    // 움집 8채. 크기와 각도를 전부 다르게 해서 정렬감을 없앤다.
    addPitHouse(1.6, 1.2, 0.35, 1.00);
    addPitHouse(5.2, 6.6, -0.65, 1.14);
    addPitHouse(9.4, 3.2, 0.22, 0.88);
    addPitHouse(-1.4, 7.8, 1.05, 0.96);
    addPitHouse(4.0, 11.4, -0.30, 1.05);
    addPitHouse(-5.2, 12.6, 0.62, 0.92);
    addPitHouse(12.0, 7.8, -0.85, 0.84);
    addPitHouse(-9.4, 6.2, 0.18, 1.02);

    // ---- 생활의 밀도 ----
    // 하나하나는 단순하지만, 모이면 사람이 살던 자리가 된다.
    addStoragePit(2.8, 4.6);
    addStoragePit(-3.6, 10.2);
    addStoragePit(7.2, 8.8);

    addHayStack(6.8, 13.0, 0.85);
    addHayStack(8.0, 12.2, 0.7);
    addHayStack(-7.6, 9.4, 0.78);

    addJarPlatform(3.0, 8.4, 0.4);
    addJarPlatform(-2.4, 5.0, -0.7);

    addLaundryLine(-6.4, 3.2, -6.0, 6.4);
    addLaundryLine(10.6, 9.4, 13.4, 9.0);

    addFishingNet(-9.0, -4.4, 0.7);
    addFishingNet(-13.0, -1.0, -0.3);

    // 강가에 올려 둔 통나무배
    addCanoe(-6.6, -7.4, 0.9);
    addCanoe(1.2, -9.4, 0.55);
    addCanoe(8.4, -6.2, 1.25);

    // 작은 밭 (신석기 후기의 원시 농경)
    addCropField(-13.5, 9.5, 0.3, 5, 4, [0x7a7a3e, 0x62652f, 0x8a8848]);
    addCropField(13.5, 1.5, -0.5, 4, 4, [0x7a7a3e, 0x62652f, 0x8a8848]);

    // 가축 우리와 짐승
    addAnimalPen(-12.5, 3.0, 2.6);
    addPig(-12.9, 3.4);
    addPig(-11.8, 2.4);
    addPig(-12.2, 3.9);

    // 마을을 두른 낮은 돌담 (울타리와 겹치지 않는 구간)
    addStoneWallRun([[13.0, 3.4], [14.2, 8.0], [13.0, 13.2]], 0.75);
    addStoneWallRun([[-11.0, 10.4], [-6.2, 13.6]], 0.7);

    // 나무 울타리 (일부러 구부러진 선)
    addFence([
        [-10.6, -4.2],
        [-8.1, 1.6],
        [-6.4, 7.4],
        [-4.9, 13.6]
    ]);
    addFence([
        [13.2, 6.0],
        [12.1, 11.4],
        [9.4, 15.8]
    ]);

    // 생활 흔적
    addHearth(7.6, 0.4);
    addSmallAltar(11.4, -3.6);
    addStonePile(-11.0, 1.4);
    addShellHeap(-5.6, -6.6);
    addFirewood(3.4, -1.2);
    addFirewood(-2.6, 3.4);
    addDryingRack(-4.2, -2.6, 0.4);

    // ---- 조사 대상 3개 ----
    const pottery = createPotteryShard(-5.0, -5.3);
    registerInteractable({
        name: "토기",
        group: pottery,
        pickup: true,
        range: 1.9,
        description: "빗살무늬 토기 조각\n\n오래된 토기의 일부입니다.\n표면에 빗살무늬가 남아 있습니다."
    });

    const stoneTool = createStoneTool(-10.2, 2.2);
    registerInteractable({
        name: "간석기",
        group: stoneTool,
        pickup: true,
        range: 1.9,
        description: "간석기\n\n매끈하게 갈아 만든 돌도구입니다.\n신석기인의 생활 흔적을 보여줍니다."
    });

    const burntWood = createBurntWoodArtifact(8.5, 1.4);
    registerInteractable({
        name: "탄목",
        group: burntWood,
        pickup: true,
        range: 1.9,
        description: "불탄 나무 조각\n\n오래된 화덕에서 발견된 탄화된 나무입니다.\n이곳에서 사람들이 불을 사용했음을 보여줍니다."
    });

    // ---- 사람과 짐승 ----
    // 적이 아니다. 각자 자기 일을 한다.
    addVillager([[0.5, 3.0], [4.6, 4.4], [6.4, 8.8], [2.0, 10.4], [-1.0, 6.0]], "neolithic");
    addVillager([[-4.0, 9.0], [-7.6, 11.2], [-9.0, 6.6], [-5.0, 4.2]], "neolithic");
    addVillager([[9.0, 10.6], [12.4, 9.0], [11.6, 5.0], [7.6, 6.2]], "neolithic");
    addVillager([[-7.4, -3.0], [-10.6, -5.2], [-12.4, -1.6], [-8.4, 0.6]], "neolithic", { speed: 0.8 });
    addVillager([[3.4, -6.4], [7.0, -5.0], [9.2, -2.0], [5.0, -1.4]], "neolithic");

    // 화덕 앞에서 불을 지피는 사람
    addWorker(6.9, 1.5, "neolithic", { rot: -2.3 });
    // 조개더미에서 일하는 사람
    addWorker(-4.9, -5.9, "neolithic", { rot: 0.7 });
    // 그물 손질
    addWorker(-8.4, -3.6, "neolithic", { rot: -0.9 });

    // 마을 개
    addDog([[2.0, 5.0], [7.0, 3.0], [4.0, 9.0], [-1.0, 7.0]]);

    // 강 위를 도는 새떼
    addBirdFlock(-4, 7.5, -13, 16);
    addBirdFlock(11, 9.0, -9, 10);

    // ---- 시간의 문 (고인돌) ----
    G.activeGate = createTimeGate(14.6, 11.0, -Math.PI / 5);
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
            pick([0xa8924f, 0x8c7a3c, 0xc0a75f, 0x6f6431]),
            randRange(-0.45, 0.45), h * 0.5, randRange(-0.45, 0.45),
            randRange(0, Math.PI), {
            roughness: 1,
            castShadow: false,
            receiveShadow: false
        });
        reed.rotation.z = randRange(-0.22, 0.22);

        // 이삭
        if (rand() > 0.45) {
            addBox(g, 0.07, 0.2, 0.05, 0x6e5a2a,
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
