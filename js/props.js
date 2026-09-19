/**
 * 공용 소품
 *
 * 세 시대가 함께 쓰는 "마을을 마을답게 만드는" 물건들.
 * 전부 기본 geometry 조합이고, 위치는 지형 높이를 따라간다.
 *
 * 밀도가 핵심이다. 하나하나는 단순해도 여러 개가 모이면
 * 사람이 살던 자리처럼 보인다.
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "./build.js";
import { addMapMarker } from "./minimap.js";
import { pick, rand, randRange } from "./rng.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";

/** 지형 위에 놓인 그룹을 만든다 */
function groundGroup(x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot || 0;
    G.world.add(g);
    return g;
}

/* ------------------------------------------------------------------ 돌담 */
/**
 * 돌담: 다듬지 않은 돌을 쌓아 올린 낮은 담.
 * points 를 따라 이어진다.
 */
export function addStoneWallRun(points, height = 1.0, colors) {
    const cols = colors || [0x7a736a, 0x8d8579, 0x655f58, 0x918a7d];

    for (let i = 0; i < points.length - 1; i++) {
        const [x1, z1] = points[i];
        const [x2, z2] = points[i + 1];
        const dist = Math.hypot(x2 - x1, z2 - z1);
        const steps = Math.max(2, Math.floor(dist / 0.42));

        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const x = x1 + (x2 - x1) * t;
            const z = z1 + (z2 - z1) * t;
            const y = terrainHeight(x, z);

            // 한 칸에 돌을 2~3 층 쌓는다
            const layers = Math.floor(randRange(2, 4));
            for (let l = 0; l < layers; l++) {
                const r = randRange(0.16, 0.27);
                addBlob(G.world, r, pick(cols),
                    x + randRange(-0.09, 0.09),
                    y + 0.13 + l * (height / layers) * 0.92,
                    z + randRange(-0.09, 0.09), {
                    sx: randRange(1.0, 1.5),
                    sy: randRange(0.6, 0.95),
                    sz: randRange(1.0, 1.4),
                    ry: randRange(0, Math.PI),
                    rz: randRange(-0.15, 0.15),
                    roughness: 1,
                    map: G.TEX.stone
                });
            }
        }
    }
}

/* ------------------------------------------------------------------ 텃밭 */
/**
 * 텃밭: 이랑과 작물.
 * 조선 마을에 초록빛을 넣어 주는 유일한 요소라 꽤 중요하다.
 */
export function addCropField(x, z, rot, cols = 5, rows = 4, cropColors) {
    const g = groundGroup(x, z, rot);
    const crops = cropColors || [0x6f7a3c, 0x5c6b33, 0x7d8845, 0x4f5c2c];

    const W = cols * 0.62, D = rows * 0.72;

    // 갈아 놓은 흙
    addFlatCircle(g, Math.max(W, D) * 0.62, 0x6b5238, 0, 0.025, 0, 6, {
        material: makeMat(0x6b5238, {
            transparent: true, opacity: 0.6, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1, map: G.TEX.dirtObj
        })
    });

    for (let r = 0; r < rows; r++) {
        // 이랑
        const ridge = addBox(g, W, 0.11, 0.22, 0x7a5c3c,
            0, 0.055, -D / 2 + r * 0.72 + 0.36, 0, { roughness: 1, map: G.TEX.dirtObj });
        ridge.receiveShadow = true;

        for (let c = 0; c < cols; c++) {
            const cx = -W / 2 + c * 0.62 + 0.31 + randRange(-0.05, 0.05);
            const cz = ridge.position.z + randRange(-0.06, 0.06);

            // 작물 한 포기: 잎 몇 장
            const leaves = Math.floor(randRange(3, 6));
            for (let l = 0; l < leaves; l++) {
                const leaf = addBox(g, randRange(0.06, 0.13), randRange(0.16, 0.34), 0.03,
                    pick(crops), cx + randRange(-0.09, 0.09), 0.2, cz + randRange(-0.09, 0.09),
                    randRange(0, Math.PI), { roughness: 1, castShadow: false });
                leaf.rotation.z = randRange(-0.5, 0.5);
            }
        }
    }
    return g;
}

/* ------------------------------------------------------------------ 짚단 */
/** 볏가리: 원뿔형으로 쌓은 짚단 */
export function addHayStack(x, z, scale = 1) {
    const g = groundGroup(x, z, randRange(0, Math.PI));
    g.scale.setScalar(scale);

    addCone(g, 0.72, 1.35, 8, 0xb59a5c, 0, 0.67, 0, { roughness: 1, map: G.TEX.thatch });
    addCone(g, 0.55, 0.55, 8, 0xa08744, 0, 1.26, 0, { roughness: 1, map: G.TEX.thatch });
    // 꼭대기 묶음
    addCylinder(g, 0.05, 0.08, 0.22, 5, 0x6b5628, 0, 1.6, 0, { map: G.TEX.wood });
    // 바닥에 흘린 짚
    for (let i = 0; i < 5; i++) {
        addBox(g, randRange(0.2, 0.5), 0.03, 0.05, 0xa89250,
            randRange(-0.9, 0.9), 0.02, randRange(-0.9, 0.9),
            randRange(0, Math.PI), { castShadow: false });
    }
    return g;
}

/* ------------------------------------------------------------------ 수레 */
/** 소달구지: 바퀴 두 개와 짐칸 */
export function addCart(x, z, rot) {
    const g = groundGroup(x, z, rot);

    // 짐칸
    addBox(g, 1.5, 0.12, 0.86, 0x6d4a26, 0, 0.52, 0, 0, { map: G.TEX.wood });
    // 옆판
    addBox(g, 1.5, 0.26, 0.06, 0x7a5530, 0, 0.66, 0.42, 0, { map: G.TEX.wood });
    addBox(g, 1.5, 0.26, 0.06, 0x7a5530, 0, 0.66, -0.42, 0, { map: G.TEX.wood });
    // 끌채
    addCylinder(g, 0.04, 0.05, 1.3, 5, 0x66421f, 0.95, 0.5, 0.22, { map: G.TEX.wood })
        .rotation.z = Math.PI / 2;
    addCylinder(g, 0.04, 0.05, 1.3, 5, 0x66421f, 0.95, 0.5, -0.22, { map: G.TEX.wood })
        .rotation.z = Math.PI / 2;

    // 바퀴
    for (const side of [-1, 1]) {
        const wheel = addCylinder(g, 0.42, 0.42, 0.08, 10, 0x5c3f20, 0, 0.42, side * 0.5,
            { map: G.TEX.wood });
        wheel.rotation.x = Math.PI / 2;
        // 바퀴살
        for (let i = 0; i < 4; i++) {
            const spoke = addBox(g, 0.72, 0.05, 0.05, 0x4a3319, 0, 0.42, side * 0.5,
                0, { castShadow: false });
            spoke.rotation.x = (i / 4) * Math.PI;
            spoke.rotation.z = (i / 4) * Math.PI;
        }
    }

    // 짐
    if (rand() > 0.4) {
        addBox(g, 0.6, 0.3, 0.55, 0xa08a52, randRange(-0.3, 0.3), 0.72, 0,
            randRange(0, 0.6), { map: G.TEX.thatch });
    }
    return g;
}

/* ------------------------------------------------------------------ 항아리 */
/** 장독: 배가 부른 항아리. 여러 개 모아 두면 장독대가 된다. */
export function addJar(parent, x, y, z, scale = 1, color = 0x5c3a25) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);

    addCylinder(g, 0.19, 0.13, 0.12, 8, color, 0, 0.06, 0, { roughness: 0.75 });
    addCylinder(g, 0.26, 0.19, 0.22, 8, color, 0, 0.23, 0, { roughness: 0.75 });
    addCylinder(g, 0.17, 0.26, 0.16, 8, color, 0, 0.42, 0, { roughness: 0.75 });
    // 뚜껑
    addCylinder(g, 0.2, 0.18, 0.05, 8, 0x4a2e1c, 0, 0.52, 0, { roughness: 0.8 });
    return g;
}

/** 장독대: 낮은 단 위에 항아리 여러 개 */
export function addJarPlatform(x, z, rot) {
    const g = groundGroup(x, z, rot);

    addBox(g, 1.9, 0.18, 1.4, 0x6f6960, 0, 0.09, 0, 0, { roughness: 1, map: G.TEX.stone });

    const spots = [[-0.6, -0.35], [0.0, -0.4], [0.62, -0.3], [-0.45, 0.32], [0.3, 0.38]];
    for (const [jx, jz] of spots) {
        addJar(g, jx, 0.18, jz, randRange(0.85, 1.15), pick([0x5c3a25, 0x4d3220, 0x6b4630]));
    }
    return g;
}

/* ------------------------------------------------------------------ 빨래줄 */
/** 빨랫줄: 기둥 두 개와 널린 천 */
export function addLaundryLine(x1, z1, x2, z2) {
    const y1 = terrainHeight(x1, z1), y2 = terrainHeight(x2, z2);

    addCylinder(G.world, 0.05, 0.07, 1.7, 5, 0x6b4826, x1, y1 + 0.85, z1, { map: G.TEX.wood });
    addCylinder(G.world, 0.05, 0.07, 1.7, 5, 0x6b4826, x2, y2 + 0.85, z2, { map: G.TEX.wood });

    addCylinderBetween(G.world,
        new THREE.Vector3(x1, y1 + 1.6, z1),
        new THREE.Vector3(x2, y2 + 1.6, z2),
        0.018, 0x3f3226, { castShadow: false });

    // 널린 천
    const n = Math.max(2, Math.floor(Math.hypot(x2 - x1, z2 - z1) / 0.75));
    for (let i = 1; i < n; i++) {
        const t = i / n;
        const x = x1 + (x2 - x1) * t;
        const z = z1 + (z2 - z1) * t;
        const y = (y1 + (y2 - y1) * t) + 1.6;
        const h = randRange(0.4, 0.75);

        const cloth = addBox(G.world, 0.04, h, randRange(0.3, 0.5),
            pick([0xd8cdb4, 0xbfae90, 0xa8b0a2, 0xcbbfa2]),
            x, y - h / 2, z, 0, { roughness: 1, map: G.TEX.cloth, castShadow: false });
        cloth.rotation.y = Math.atan2(x2 - x1, z2 - z1);

        G.animated.push({
            type: "sway", group: cloth,
            amp: randRange(0.04, 0.1), speed: randRange(0.9, 1.7),
            phase: randRange(0, Math.PI * 2)
        });
    }
}

/* ------------------------------------------------------------------ 깃발 */
/** 장대에 걸린 천 깃발 */
export function addBanner(x, z, rot, color = 0x8c3a2a) {
    const g = groundGroup(x, z, rot);

    addCylinder(g, 0.045, 0.06, 3.0, 6, 0x5c3f20, 0, 1.5, 0, { map: G.TEX.wood });
    addBox(g, 0.7, 0.05, 0.05, 0x5c3f20, 0.3, 2.9, 0);

    const flag = addBox(g, 0.5, 1.5, 0.03, color, 0.38, 2.1, 0, 0,
        { roughness: 1, map: G.TEX.cloth, castShadow: false });

    G.animated.push({
        type: "sway", group: flag,
        amp: 0.07, speed: randRange(1.1, 1.9), phase: randRange(0, Math.PI * 2)
    });
    return g;
}

/* ------------------------------------------------------------------ 다리 */
/** 나무다리: 연못이나 개울을 건넌다 */
export function addBridge(x1, z1, x2, z2, width = 1.5) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const rot = Math.atan2(dx, dz);

    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, Math.max(terrainHeight(x1, z1), terrainHeight(x2, z2)) + 0.32, (z1 + z2) / 2);
    g.rotation.y = rot;
    G.world.add(g);

    // 상판: 널빤지를 한 장씩
    const planks = Math.floor(len / 0.34);
    for (let i = 0; i < planks; i++) {
        addBox(g, width, 0.07, 0.26,
            pick([0x7a5530, 0x6d4a26, 0x855f38]),
            0, 0, -len / 2 + i * 0.34 + 0.17,
            randRange(-0.02, 0.02), { roughness: 1, map: G.TEX.wood });
    }

    // 난간
    for (const side of [-1, 1]) {
        const posts = Math.max(2, Math.floor(len / 1.1));
        for (let i = 0; i <= posts; i++) {
            const pz = -len / 2 + (len / posts) * i;
            addCylinder(g, 0.04, 0.05, 0.62, 5, 0x66421f, side * width * 0.46, 0.31, pz,
                { map: G.TEX.wood });
        }
        addCylinderBetween(g,
            new THREE.Vector3(side * width * 0.46, 0.6, -len / 2),
            new THREE.Vector3(side * width * 0.46, 0.6, len / 2),
            0.035, 0x6d4a26, { map: G.TEX.wood });
    }

    // 교각
    for (const t of [0.25, 0.75]) {
        addCylinder(g, 0.07, 0.09, 0.9, 5, 0x4a3319, 0, -0.45, -len / 2 + len * t,
            { map: G.TEX.wood, castShadow: false });
    }
    return g;
}

/* ------------------------------------------------------------------ 가판 */
/** 장터 가판: 기둥 넷과 천 지붕 */
export function addMarketStall(x, z, rot) {
    const g = groundGroup(x, z, rot);
    addMapMarker(x, z, "#a8793f", 2.5, "building");

    for (const [px, pz] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]]) {
        addCylinder(g, 0.05, 0.06, 1.6, 5, 0x6b4826, px, 0.8, pz, { map: G.TEX.wood });
    }

    // 천 지붕
    const roof = addBox(g, 2.0, 0.06, 1.5, 0xc9b184, 0, 1.62, 0, 0,
        { roughness: 1, map: G.TEX.cloth });
    roof.rotation.z = 0.06;

    // 좌판
    addBox(g, 1.7, 0.08, 1.0, 0x7a5530, 0, 0.72, 0, 0, { map: G.TEX.wood });

    // 늘어놓은 물건
    for (let i = 0; i < 6; i++) {
        addBlob(g, randRange(0.07, 0.13), pick([0x9c6b3a, 0x7d8845, 0xa8894f, 0x6f5233]),
            randRange(-0.7, 0.7), 0.82, randRange(-0.35, 0.35),
            { sy: 0.8, ry: randRange(0, Math.PI), castShadow: false });
    }
    return g;
}

/* ------------------------------------------------------------------ 통나무배 */
/** 통나무배: 강가에 올려 둔 배 */
export function addCanoe(x, z, rot) {
    const g = groundGroup(x, z, rot);

    // 속을 파낸 통나무
    const hull = addCylinder(g, 0.34, 0.34, 3.0, 8, 0x5f4226, 0, 0.22, 0,
        { roughness: 1, map: G.TEX.wood });
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(1, 1, 0.55);

    // 안쪽 그늘
    addBox(g, 2.5, 0.12, 0.3, 0x2b1c10, 0, 0.36, 0, 0, { castShadow: false });

    // 뱃머리
    addCone(g, 0.3, 0.6, 7, 0x5f4226, 1.65, 0.24, 0, { roughness: 1, map: G.TEX.wood })
        .rotation.z = -Math.PI / 2;

    // 노
    const oar = addCylinder(g, 0.03, 0.04, 1.8, 5, 0x6d4a26, -0.2, 0.42, 0.28, { map: G.TEX.wood });
    oar.rotation.z = Math.PI / 2 - 0.15;
    addBox(g, 0.35, 0.03, 0.18, 0x6d4a26, -1.05, 0.44, 0.3, 0, { castShadow: false });

    return g;
}

/* ------------------------------------------------------------------ 어망 */
/** 그물 말리는 틀 */
export function addFishingNet(x, z, rot) {
    const g = groundGroup(x, z, rot);

    addCylinder(g, 0.05, 0.07, 1.9, 5, 0x5e4122, -1.1, 0.95, 0, { map: G.TEX.wood });
    addCylinder(g, 0.05, 0.07, 1.9, 5, 0x5e4122, 1.1, 0.95, 0, { map: G.TEX.wood });
    addBox(g, 2.4, 0.06, 0.06, 0x6a4a28, 0, 1.85, 0, 0, { map: G.TEX.wood });

    // 그물: 격자로 늘어뜨린 얇은 판
    for (let i = 0; i < 9; i++) {
        const nx = -1.0 + i * 0.25;
        const h = randRange(0.8, 1.35);
        const strand = addBox(g, 0.02, h, 0.02, 0x8a7d5c, nx, 1.85 - h / 2, 0, 0,
            { castShadow: false });
        strand.rotation.z = randRange(-0.08, 0.08);
    }
    for (let i = 0; i < 4; i++) {
        addBox(g, 2.1, 0.02, 0.02, 0x8a7d5c, 0, 1.6 - i * 0.28, 0, 0, { castShadow: false });
    }
    return g;
}

/* ------------------------------------------------------------------ 가축우리 */
/** 나무 울타리로 두른 작은 우리 */
export function addAnimalPen(x, z, radius = 2.4) {
    const g = groundGroup(x, z, 0);

    const posts = 12;
    for (let i = 0; i < posts; i++) {
        const a = (i / posts) * Math.PI * 2;
        const px = Math.cos(a) * radius, pz = Math.sin(a) * radius;
        const h = randRange(0.7, 0.95);
        const post = addCylinder(g, 0.04, 0.06, h, 5, 0x5c3f20, px, h / 2, pz, { map: G.TEX.wood });
        post.rotation.z = randRange(-0.08, 0.08);

        // 가로대
        const a2 = ((i + 1) / posts) * Math.PI * 2;
        addCylinderBetween(g,
            new THREE.Vector3(px, 0.5, pz),
            new THREE.Vector3(Math.cos(a2) * radius, 0.5, Math.sin(a2) * radius),
            0.03, 0x6d4724, { map: G.TEX.wood, castShadow: false });
    }

    // 바닥의 짚
    for (let i = 0; i < 14; i++) {
        addBox(g, randRange(0.15, 0.4), 0.02, 0.05, 0xa89250,
            randRange(-radius * 0.7, radius * 0.7), 0.015, randRange(-radius * 0.7, radius * 0.7),
            randRange(0, Math.PI), { castShadow: false });
    }
    return g;
}

/* ------------------------------------------------------------------ 저장 구덩이 */
/** 곡식 저장 구덩이: 흙을 파고 뚜껑을 덮었다 */
export function addStoragePit(x, z) {
    const g = groundGroup(x, z, randRange(0, Math.PI));

    addCylinder(g, 0.62, 0.7, 0.16, 10, 0x6b5238, 0, 0.08, 0,
        { roughness: 1, map: G.TEX.dirtObj });
    addFlatCircle(g, 0.5, 0x2b1c10, 0, 0.17, 0, 10, {
        material: makeBasicMat(0x2b1c10, { transparent: true, opacity: 0.8 })
    });
    // 덮개로 쓰던 나무판
    addBox(g, 0.9, 0.06, 0.7, 0x6d4a26, randRange(0.5, 0.9), 0.05, randRange(-0.3, 0.3),
        randRange(0, Math.PI), { roughness: 1, map: G.TEX.wood });
    // 둘레의 돌
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        addBlob(g, 0.13, pick([0x7a736a, 0x8d8579]), Math.cos(a) * 0.72, 0.09, Math.sin(a) * 0.72,
            { sy: 0.6, ry: a, map: G.TEX.stone, castShadow: false });
    }
    return g;
}
