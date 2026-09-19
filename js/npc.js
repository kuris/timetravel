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
import { addJournalEntry } from "./journal.js";
import { addMapMarker } from "./minimap.js";

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
    modern: {
        // 근현대는 색이 다양해진다. 그게 시대 차이로 읽힌다.
        cloth: [0x4a6a8a, 0x8a4a3a, 0x3f5a48, 0x6a5a8a, 0xb0a698, 0x5a5f6a, 0x8a7a3a],
        skin: [0xd8a877, 0xc99a68, 0xe0b184],
        hair: [0x241810, 0x1c120b, 0x3a2a1a]
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

/* ------------------------------------------------------------------ 주민 대화 */
export const DEFAULT_DIALOGUES = {
    neolithic: [
        "마을이 한 번 크게 불탄 적이 있어. 그런데 저 동쪽 한 자리만 불길이 닿지 않았지.",
        "강가 흙더미 옆에서 불탄 흔적을 보았는가? 화덕 옆 땅을 파보면 나올걸세.",
        "조개더미 사이를 잘 살펴보게. 깨진 빗살무늬 토기 조각이 묻혀 있을 거야.",
        "매끈하게 갈아 만든 돌도구는 떠난 이를 위해 부러뜨려 묻어둔 것이라 들었네.",
        "저 큰 고인돌은 우리 할아버지 때부터 저기 서 있었지. 아무도 손대지 않는 자리야."
    ],
    bronze: [
        "오늘 밤 제천 행사를 올리오. 제단 한가운데 문양은 하늘이 아니라 땅속을 가리킨다오.",
        "비파형 동검의 날을 일부러 부러뜨려 바쳤소. 누군가를 기리기 위한 것이지.",
        "청동 방울 소리가 바람을 타고 울리면, 이 언덕의 공기가 엄숙해진다오.",
        "이 언덕의 돌들은 선대부터 신성하게 여겨 온 곳이오. 함부로 치우지 않소."
    ],
    samguk: [
        "성을 쌓을 때 왜 저 돌만 피해서 벽을 꺾었냐고? 허물지 말라는 관아의 엄명이 있었기 때문이지.",
        "목간에 적힌 기록의 마지막 줄을 보았소? 누군가 다른 필체로 글을 덧대어 놓았더군.",
        "명문 기와 조각이 성벽 아래 묻혀 있소. 옛 마을의 기억이 그 아래 잠들어 있지.",
        "저 고인돌 주변의 흙은 이상하게도 늘 서늘한 기운이 감돈다오."
    ],
    joseon: [
        "어두워지면 저 고인돌 근처엔 가지 말게. 장승 셋이 다 같은 곳을 쏘아보고 있지 않나.",
        "관아의 옛 책에 '그 자리를 범치 말라'는 금기가 대대로 전해져 내려온다네.",
        "밤길을 순찰하던 야경꾼이 그 돌 주변에서 푸른 기운을 보았다고 하더군.",
        "마을 어귀 장승의 문양을 보았는가? 선사시대부터 전해진 표식이라더군."
    ],
    modern: [
        "안길 포장 공사를 하다가 갑자기 중단됐어. 포크레인 기사가 땅속에서 뭘 봤다더군.",
        "공사 장부의 사유란이 비어 있어... 어르신들이 저 자리는 절대 손대지 말라고 신신당부하셨지.",
        "저 고인돌은 어릴 때부터 동네 아이들의 놀이터였는데, 신비로운 구석이 있어.",
        "아파트 단지 발굴 구덩이 맨 아래층에서... 선사시대 아이의 유골이 확인되었다더군요."
    ]
};

export function registerNPC({ name, group, lines, range = 2.4, isAnimal = false, choices = null, greeting = null }) {
    const npc = {
        name: name || (isAnimal ? "동물" : "마을 주민"),
        group,
        lines: lines && lines.length > 0 ? lines : ["..."],
        lineIndex: 0,
        range,
        isAnimal,
        choices,
        greeting
    };
    G.npcs.push(npc);
    return npc;
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

    const animData = {
        type: "npc",
        group: g,
        waypoints,
        index: 0,
        speed: opts.speed || randRange(0.7, 1.25),
        pauseLeft: randRange(0, 3),
        pauseRange: opts.pauseRange || [1.5, 5]
    };
    G.animated.push(animData);
    g.userData.anim = animData;

    // 대화 등록
    const diagPool = DEFAULT_DIALOGUES[palette] || DEFAULT_DIALOGUES.neolithic;
    const lines = opts.dialogue ? (Array.isArray(opts.dialogue) ? opts.dialogue : [opts.dialogue]) : [pick(diagPool), pick(diagPool)];
    registerNPC({
        name: opts.name || (palette === "joseon" ? "마을 양반" : "마을 사람"),
        group: g,
        lines,
        range: 2.3,
        choices: opts.choices || null,
        greeting: opts.greeting || null
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

    const animData = {
        type: "worker",
        group: g,
        speed: randRange(1.4, 2.4),
        phase: randRange(0, Math.PI * 2)
    };
    G.animated.push(animData);
    g.userData.anim = animData;

    // 대화 등록
    const diagPool = DEFAULT_DIALOGUES[palette] || DEFAULT_DIALOGUES.neolithic;
    const lines = opts.dialogue ? (Array.isArray(opts.dialogue) ? opts.dialogue : [opts.dialogue]) : [pick(diagPool)];
    registerNPC({
        name: opts.name || "일하는 사람",
        group: g,
        lines,
        range: 2.2
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
    registerNPC({ name: "누렁이", group: g, lines: ["음메~ (느긋하게 풀을 되새김질한다)", "커다란 눈망울로 물끄러미 바라본다."], isAnimal: true, range: 2.3 });
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
    registerNPC({ name: "토종 돼지", group: g, lines: ["꿀꿀! (흙바닥을 코로 킁킁거리며 파헤친다)", "꿀~"], isAnimal: true, range: 2.0 });
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

    const animData = {
        type: "npc", group: g, waypoints, index: 0,
        speed: randRange(1.6, 2.6), pauseLeft: randRange(0, 2), pauseRange: [0.6, 2.4],
        quad: true
    };
    G.animated.push(animData);
    g.userData.anim = animData;

    registerNPC({ name: "바둑이", group: g, lines: ["멍! 멍! (반갑게 꼬리를 세차게 흔든다)", "손을 핥으며 발치 주위를 맴돈다."], isAnimal: true, range: 2.2 });
    return g;
}

/**
 * 들개: 마을로 내려오는 위협.
 *
 * 물지 않는다. 이 게임에는 체력이 없다.
 * 가까이 붙으면 주민이 겁을 먹고 일을 멈출 뿐이다 (raid.js).
 * 목적지는 raid.js 가 매 프레임 갈아 끼우고, 걷는 것은 loop.js 의 npc 애니메이터가 맡는다.
 */
export function addWolf(x, z) {
    const g = createQuadruped({
        bodyW: 0.26, bodyH: 0.28, bodyL: 0.68, legH: 0.31, legR: 0.042,
        color: pick([0x4a4640, 0x565049, 0x3e3a35]), snout: 0x27241f,
        shadow: 0.30, horns: false
    });

    // 어둠 속에서 눈만 보인다
    for (const sx of [-1, 1]) {
        addBlob(g.userData.body, 0.035, 0xffcf6b,
            sx * 0.07, 0.24, 0.40, {
            material: makeBasicMat(0xffcf6b, { transparent: true, opacity: 0.9 }),
            castShadow: false, receiveShadow: false
        });
    }

    g.position.set(x, terrainHeight(x, z), z);
    G.world.add(g);

    const animData = {
        type: "npc", group: g, waypoints: [[x, z]], index: 0,
        speed: randRange(2.0, 2.9), pauseLeft: 0, pauseRange: [0, 0], quad: true
    };
    G.animated.push(animData);

    g.userData.anim = animData;
    g.userData.marker = addMapMarker(x, z, "#c0392b", 3, "prop");
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
