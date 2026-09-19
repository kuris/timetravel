/**
 * NPC — 주민과 가축
 *
 * 적이 아니다. 말을 걸 수도, 싸울 수도 없다.
 * 그냥 자기 일을 하며 돌아다닌다.
 *
 * "여기 사람이 산다"는 인상을 만드는 것이 전부이고,
 * 그게 이 게임에서는 가장 중요한 일이다.
 */
import { addBlob, addBox, addCone, addCylinder, addFlatCircle, makeBasicMat } from "./build.js";
import { pick, rand, randRange } from "./rng.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";

/* ------------------------------------------------------------------ 주민 */

/** 시대별 옷 색 팔레트 */
export const NPC_PALETTES = {
    neolithic: {
        cloth: [0x6a5a44, 0x7b6647, 0x5c5039, 0x866f4e],
        skin: [0xd8a877, 0xc99a68, 0xe0b184],
        hair: [0x3a2818, 0x2b1d12]
    },
    bronze: {
        cloth: [0x7d6242, 0x8a6b45, 0x6b5636, 0x94764d],
        skin: [0xd8a877, 0xc99a68],
        hair: [0x332315, 0x2a1c11]
    },
    samguk: {
        // 삼국시대는 염색한 옷이 나타난다. 붉은 기가 섞인다.
        cloth: [0x8a6a45, 0x7d5a3c, 0x6b5636, 0x94764d, 0x8c4a38],
        skin: [0xd8a877, 0xc99a68],
        hair: [0x2e2015, 0x241a10]
    },
    joseon: {
        // 흰 옷이 밤에도 눈에 띈다
        cloth: [0xd8d2c4, 0xc7c0ae, 0xe0dbcd, 0xb9b2a0],
        skin: [0xd8a877, 0xc99a68],
        hair: [0x241810, 0x1c120b]
    }
};

/**
 * 작은 사람 하나.
 * 플레이어보다 살짝 작게 만들어서 플레이어가 구분되게 한다.
 */
function createPerson(palette, hatType) {
    const g = new THREE.Group();

    addFlatCircle(g, 0.34, 0x000000, 0, 0.02, 0, 10, {
        material: makeBasicMat(0x000000, {
            transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false
        }),
        castShadow: false, receiveShadow: false
    });

    const body = new THREE.Group();
    body.position.y = 0.30;
    g.add(body);

    const cloth = pick(palette.cloth);
    const skin = pick(palette.skin);

    addCylinder(body, 0.17, 0.23, 0.42, 6, cloth, 0, 0.21, 0, { map: G.TEX.cloth });
    addCylinder(body, 0.055, 0.065, 0.06, 5, skin, 0, 0.46, 0);
    const head = addBlob(body, 0.14, skin, 0, 0.56, 0, { sy: 1.1, sx: 0.94, sz: 0.94 });

    // 머리 모양 / 모자
    if (hatType === "gat") {
        // 갓: 챙이 넓은 검은 모자
        addCylinder(body, 0.36, 0.36, 0.02, 10, 0x201812, 0, 0.66, 0, { castShadow: false });
        addCylinder(body, 0.11, 0.14, 0.16, 8, 0x201812, 0, 0.74, 0);
    } else if (hatType === "straw") {
        // 삿갓
        addCone(body, 0.32, 0.18, 9, 0xb59a5c, 0, 0.72, 0, { map: G.TEX.thatch });
    } else {
        addCone(body, 0.17, 0.15, 6, pick(palette.hair), 0, 0.65, 0);
    }

    // 팔 (어깨 피벗)
    const mkArm = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.20, 0.38, 0);
        body.add(pivot);
        addCylinder(pivot, 0.045, 0.04, 0.32, 5, skin, 0, -0.16, 0, { castShadow: false });
        return pivot;
    };

    // 다리
    const mkLeg = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.08, 0, 0);
        body.add(pivot);
        addCylinder(pivot, 0.055, 0.048, 0.30, 5, cloth, 0, -0.15, 0, { castShadow: false });
        return pivot;
    };

    g.userData = {
        body, head,
        armL: mkArm(-1), armR: mkArm(1),
        legL: mkLeg(-1), legR: mkLeg(1),
        walk: 0
    };
    return g;
}

/**
 * 순찰하는 주민.
 * waypoints 를 천천히 돌고, 가끔 멈춰 선다.
 *
 * @param {Array<[number,number]>} waypoints 돌아다닐 지점들
 */
export function addVillager(waypoints, palette, opts = {}) {
    const p = NPC_PALETTES[palette] || NPC_PALETTES.neolithic;
    const g = createPerson(p, opts.hat);

    const start = waypoints[0];
    g.position.set(start[0], terrainHeight(start[0], start[1]), start[1]);
    G.world.add(g);

    G.animated.push({
        type: "npc",
        group: g,
        waypoints,
        index: 0,
        speed: opts.speed || randRange(0.7, 1.25),
        // 지점에 닿으면 잠시 쉰다
        pauseLeft: randRange(0, 3),
        pauseRange: opts.pauseRange || [1.5, 5]
    });

    return g;
}

/** 제자리에서 일하는 사람 (불 지피기, 물 긷기 등) */
export function addWorker(x, z, palette, opts = {}) {
    const p = NPC_PALETTES[palette] || NPC_PALETTES.neolithic;
    const g = createPerson(p, opts.hat);

    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = opts.rot ?? randRange(0, Math.PI * 2);
    G.world.add(g);

    G.animated.push({
        type: "worker",
        group: g,
        speed: randRange(1.4, 2.4),
        phase: randRange(0, Math.PI * 2)
    });

    return g;
}

/* ------------------------------------------------------------------ 가축 */

/** 네 발 짐승의 공통 뼈대 */
function createQuadruped(cfg) {
    const g = new THREE.Group();

    addFlatCircle(g, cfg.shadow, 0x000000, 0, 0.02, 0, 10, {
        material: makeBasicMat(0x000000, {
            transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false
        }),
        castShadow: false, receiveShadow: false
    });

    const body = new THREE.Group();
    body.position.y = cfg.legH;
    g.add(body);

    // 몸통
    addBox(body, cfg.bodyW, cfg.bodyH, cfg.bodyL, cfg.color, 0, cfg.bodyH / 2, 0, 0,
        { roughness: 1, map: G.TEX.cloth });
    // 머리
    addBox(body, cfg.bodyW * 0.72, cfg.bodyH * 0.72, cfg.bodyL * 0.34, cfg.color,
        0, cfg.bodyH * 0.62, cfg.bodyL * 0.58, 0, { roughness: 1 });
    // 주둥이
    addBox(body, cfg.bodyW * 0.42, cfg.bodyH * 0.36, cfg.bodyL * 0.2, cfg.snout,
        0, cfg.bodyH * 0.48, cfg.bodyL * 0.76, 0, { castShadow: false });

    if (cfg.horns) {
        addCone(body, 0.06, 0.26, 5, 0xd8cdb4, -cfg.bodyW * 0.32, cfg.bodyH * 1.0, cfg.bodyL * 0.52,
            { castShadow: false }).rotation.z = 0.7;
        addCone(body, 0.06, 0.26, 5, 0xd8cdb4, cfg.bodyW * 0.32, cfg.bodyH * 1.0, cfg.bodyL * 0.52,
            { castShadow: false }).rotation.z = -0.7;
    }

    // 꼬리
    const tail = addCylinder(body, 0.025, 0.035, cfg.bodyL * 0.45, 4, cfg.color,
        0, cfg.bodyH * 0.7, -cfg.bodyL * 0.55, { castShadow: false });
    tail.rotation.x = 0.5;

    // 다리 네 개
    const legs = [];
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            const pivot = new THREE.Group();
            pivot.position.set(sx * cfg.bodyW * 0.36, 0, sz * cfg.bodyL * 0.34);
            body.add(pivot);
            addCylinder(pivot, cfg.legR, cfg.legR * 0.85, cfg.legH, 4, cfg.color,
                0, -cfg.legH / 2, 0, { castShadow: false });
            legs.push(pivot);
        }
    }

    g.userData = { body, legs, walk: 0 };
    return g;
}

/** 소: 마을에서 가장 큰 짐승. 거의 움직이지 않는다. */
export function addCow(x, z, rot) {
    const g = createQuadruped({
        bodyW: 0.52, bodyH: 0.56, bodyL: 1.25, legH: 0.52, legR: 0.075,
        color: pick([0x6b5540, 0x574433, 0x7d6449]), snout: 0x3f3228,
        shadow: 0.62, horns: true
    });
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot ?? randRange(0, Math.PI * 2);
    G.world.add(g);

    G.animated.push({ type: "graze", group: g, phase: randRange(0, Math.PI * 2), speed: randRange(0.3, 0.6) });
    return g;
}

/** 돼지 */
export function addPig(x, z) {
    const g = createQuadruped({
        bodyW: 0.34, bodyH: 0.32, bodyL: 0.68, legH: 0.2, legR: 0.05,
        color: pick([0x8a6a58, 0x7d5f4e]), snout: 0x9c7a68,
        shadow: 0.36, horns: false
    });
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = randRange(0, Math.PI * 2);
    G.world.add(g);
    G.animated.push({ type: "graze", group: g, phase: randRange(0, Math.PI * 2), speed: randRange(0.8, 1.4) });
    return g;
}

/** 개: 마을을 돌아다닌다 */
export function addDog(waypoints) {
    const g = createQuadruped({
        bodyW: 0.22, bodyH: 0.24, bodyL: 0.52, legH: 0.24, legR: 0.038,
        color: pick([0xa8895c, 0x6f5a42, 0xc2a877]), snout: 0x3f3228,
        shadow: 0.26, horns: false
    });

    const s = waypoints[0];
    g.position.set(s[0], terrainHeight(s[0], s[1]), s[1]);
    G.world.add(g);

    G.animated.push({
        type: "npc", group: g, waypoints, index: 0,
        speed: randRange(1.6, 2.6), pauseLeft: randRange(0, 2), pauseRange: [0.6, 2.4],
        quad: true
    });
    return g;
}

/** 새떼: 하늘을 천천히 도는 점들 */
export function addBirdFlock(x, y, z, count = 14) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const offsets = [];

    for (let i = 0; i < count; i++) {
        offsets.push({
            r: randRange(3, 9),
            a: randRange(0, Math.PI * 2),
            speed: randRange(0.18, 0.4),
            yOff: randRange(-1.2, 1.2)
        });
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const points = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0x2e2519, size: 0.22, sizeAttenuation: true,
        transparent: true, opacity: 0.75, depthWrite: false, fog: true
    }));

    G.world.add(points);
    G.animated.push({ type: "birds", points, geo, offsets, center: { x, y, z } });
    return points;
}
