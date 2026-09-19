/**
 * 근현대 공용 소품
 *
 * 1970년대와 2000년대가 함께 쓰는 것들.
 * 전봇대와 전선, 길, 자동차, 가로등, 간판, 시멘트 담.
 *
 * 앞선 시대와 가장 크게 달라지는 것은 "직선"이다.
 * 흙길이 곧은 도로가 되고, 담이 반듯해지고, 전선이 하늘을 가른다.
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "./build.js";
import { addMapMarker } from "./minimap.js";
import { pick, rand, randRange } from "./rng.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";

function groundGroup(x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot || 0;
    G.world.add(g);
    return g;
}

/* ------------------------------------------------------------------ 길 */
/**
 * 포장도로 / 신작로.
 * 앞선 시대의 구불구불한 흙길과 달리 곧게 뻗는다.
 *
 * @param {boolean} opts.paved 아스팔트인지 (false 면 다져진 흙길)
 * @param {boolean} opts.centerLine 중앙선을 긋는지
 */
export function addRoad(x1, z1, x2, z2, width, opts = {}) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const rot = Math.atan2(dx, dz);

    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, terrainHeight((x1 + x2) / 2, (z1 + z2) / 2) + 0.04, (z1 + z2) / 2);
    g.rotation.y = rot;
    G.world.add(g);

    const surface = opts.paved ? 0x4a4744 : 0x8a7355;

    // 노면
    const road = addBox(g, width, 0.08, len, surface, 0, 0, 0, 0, {
        roughness: opts.paved ? 0.85 : 1,
        map: opts.paved ? G.TEX.asphalt : G.TEX.dirtObj,
        castShadow: false
    });
    road.receiveShadow = true;

    // 갓길 경계석
    if (opts.paved) {
        for (const sx of [-1, 1]) {
            addBox(g, 0.22, 0.16, len, 0x9a958e, sx * (width / 2 + 0.11), 0.04, 0, 0,
                { roughness: 1, castShadow: false });
        }
    }

    // 중앙선
    if (opts.centerLine) {
        const dashes = Math.floor(len / 3.2);
        for (let i = 0; i < dashes; i++) {
            addBox(g, 0.16, 0.02, 1.6, 0xd8c98a, 0, 0.06, -len / 2 + i * 3.2 + 1.6, 0,
                { material: makeBasicMat(0xd8c98a, { transparent: true, opacity: 0.55 }),
                  castShadow: false });
        }
    }

    // 낡은 자국
    for (let i = 0; i < Math.floor(len / 2); i++) {
        addFlatCircle(g, randRange(0.3, 0.9), 0x3a3734,
            randRange(-width / 2, width / 2), 0.055, randRange(-len / 2, len / 2), 6, {
            material: makeBasicMat(0x3a3734, { transparent: true, opacity: randRange(0.05, 0.16),
                                               depthWrite: false })
        });
    }

    return g;
}

/** 횡단보도 */
export function addCrosswalk(x, z, rot, width = 7, depth = 3.2) {
    const g = groundGroup(x, z, rot);
    const bars = Math.floor(width / 0.8);

    for (let i = 0; i < bars; i++) {
        addBox(g, 0.42, 0.02, depth, 0xdcd4c0,
            -width / 2 + i * 0.8 + 0.4, 0.07, 0, 0, {
            material: makeBasicMat(0xdcd4c0, { transparent: true, opacity: 0.6 }),
            castShadow: false
        });
    }
    return g;
}

/* ------------------------------------------------------------------ 전봇대 */
/**
 * 전봇대.
 * 이 시대의 하늘을 가르는 선. 1970년대 시골 풍경의 상징이다.
 */
export function addPowerPole(x, z, opts = {}) {
    const g = groundGroup(x, z, randRange(-0.1, 0.1));
    const H = opts.height ?? 6.5;
    const concrete = opts.concrete ?? false;

    // 기둥 (나무 또는 콘크리트)
    const pole = addCylinder(g, concrete ? 0.13 : 0.11, concrete ? 0.2 : 0.18, H, 6,
        concrete ? 0x8d8880 : 0x5c4630, 0, H / 2, 0,
        { roughness: 1, map: concrete ? G.TEX.stone : G.TEX.wood });
    pole.rotation.z = randRange(-0.03, 0.03);

    // 완철 (전선을 거는 가로대)
    addBox(g, 1.7, 0.08, 0.1, 0x4a443c, 0, H - 0.4, 0, 0, { castShadow: false });
    if (opts.double !== false) {
        addBox(g, 1.3, 0.07, 0.09, 0x4a443c, 0, H - 1.0, 0, 0, { castShadow: false });
    }

    // 애자
    for (const px of [-0.7, 0, 0.7]) {
        addCylinder(g, 0.07, 0.09, 0.16, 6, 0x6f6a62, px, H - 0.28, 0, { castShadow: false });
    }

    // 변압기
    if (opts.transformer) {
        addCylinder(g, 0.26, 0.26, 0.6, 8, 0x5f5a52, 0.32, H - 1.9, 0,
            { roughness: 0.8, castShadow: false });
    }

    g.userData.top = H - 0.4;
    return g;
}

/** 전봇대 사이를 잇는 전선. 가운데가 늘어진다. */
export function addPowerLine(poles) {
    for (let i = 0; i < poles.length - 1; i++) {
        const a = poles[i], b = poles[i + 1];
        const ya = a.position.y + a.userData.top;
        const yb = b.position.y + b.userData.top;

        // 늘어짐을 표현하려고 세 도막으로 나눈다
        const SEG = 4;
        for (const off of [-0.55, 0, 0.55]) {
            let prev = null;
            for (let s = 0; s <= SEG; s++) {
                const t = s / SEG;
                const sag = Math.sin(t * Math.PI) * 0.55;
                const p = new THREE.Vector3(
                    a.position.x + (b.position.x - a.position.x) * t,
                    ya + (yb - ya) * t - sag,
                    a.position.z + (b.position.z - a.position.z) * t
                );
                if (prev) {
                    addCylinderBetween(G.world, prev, p, 0.022, 0x2b2620,
                        { segments: 3, castShadow: false, receiveShadow: false });
                }
                prev = p;
            }
        }
    }
}

/* ------------------------------------------------------------------ 가로등 */
export function addStreetLamp(x, z, opts = {}) {
    const g = groundGroup(x, z, randRange(0, Math.PI * 2));
    const H = opts.height ?? 5.0;

    addCylinder(g, 0.07, 0.12, H, 6, 0x6f6a62, 0, H / 2, 0, { roughness: 0.8 });

    // 구부러진 팔
    const arm = addCylinder(g, 0.055, 0.055, 1.3, 5, 0x6f6a62, 0.55, H - 0.2, 0,
        { castShadow: false });
    arm.rotation.z = Math.PI / 2 - 0.35;

    // 등
    const head = addBox(g, 0.55, 0.18, 0.32, 0xffe0a8, 1.05, H - 0.42, 0, 0, {
        material: makeBasicMat(0xffe0a8, { transparent: true, opacity: 0.9 }),
        castShadow: false
    });

    const light = new THREE.PointLight(opts.color ?? 0xffcf8a, opts.intensity ?? 2.2,
        opts.distance ?? 14);
    light.position.set(1.05, H - 0.6, 0);
    g.add(light);

    G.animated.push({
        type: "lantern", flame: head, light,
        baseIntensity: opts.intensity ?? 2.2,
        speed: randRange(0.4, 0.8), phase: randRange(0, Math.PI * 2)
    });

    return g;
}

/* ------------------------------------------------------------------ 탈것 */
/**
 * 자동차 / 트럭 / 버스.
 * 바퀴 달린 상자지만 비율만 맞으면 충분히 알아본다.
 */
export function addVehicle(x, z, rot, type = "car", color) {
    const g = groundGroup(x, z, rot);

    const SPEC = {
        car:   { w: 1.7, h: 0.72, l: 4.0, cabin: 0.55, wheel: 0.33, y: 0.42 },
        truck: { w: 2.0, h: 0.95, l: 5.2, cabin: 0.85, wheel: 0.42, y: 0.5 },
        bus:   { w: 2.4, h: 1.9,  l: 8.6, cabin: 0.0,  wheel: 0.46, y: 0.62 }
    }[type];

    const body = color ?? pick(
        type === "bus" ? [0x4a7a6a, 0x5d7f9c, 0xc9c2b0]
            : type === "truck" ? [0x8c4034, 0x5a6a52, 0x7a6f5e]
                : [0x9ba3aa, 0x6f7a80, 0xb0a696, 0x5c6470]);

    // 차체
    addBox(g, SPEC.w, SPEC.h, SPEC.l, body, 0, SPEC.y, 0, 0, { roughness: 0.55, metalness: 0.25 });

    if (type === "bus") {
        // 창문 띠
        addBox(g, SPEC.w + 0.03, 0.72, SPEC.l * 0.88, 0x2f3a42, 0, SPEC.y + 0.4, 0, 0, {
            material: makeBasicMat(0x2f3a42, { transparent: true, opacity: 0.85 }),
            castShadow: false
        });
        // 지붕
        addBox(g, SPEC.w * 0.96, 0.12, SPEC.l * 0.97, 0xd8d2c4, 0, SPEC.y + SPEC.h / 2 + 0.06, 0, 0,
            { roughness: 0.7, castShadow: false });
    } else {
        // 운전석
        const cw = SPEC.w * 0.92;
        addBox(g, cw, SPEC.cabin, SPEC.l * (type === "truck" ? 0.32 : 0.42),
            body, 0, SPEC.y + SPEC.h / 2 + SPEC.cabin / 2,
            type === "truck" ? SPEC.l * 0.26 : 0, 0, { roughness: 0.55, metalness: 0.25 });
        // 유리
        addBox(g, cw + 0.02, SPEC.cabin * 0.62, SPEC.l * (type === "truck" ? 0.33 : 0.43),
            0x33404a, 0, SPEC.y + SPEC.h / 2 + SPEC.cabin * 0.58,
            type === "truck" ? SPEC.l * 0.26 : 0, 0, {
            material: makeBasicMat(0x33404a, { transparent: true, opacity: 0.8 }),
            castShadow: false
        });
        // 짐칸
        if (type === "truck") {
            addBox(g, SPEC.w, 0.5, SPEC.l * 0.5, 0x4a3f34, 0, SPEC.y + SPEC.h / 2 + 0.25,
                -SPEC.l * 0.24, 0, { roughness: 0.9, map: G.TEX.wood });
        }
    }

    // 바퀴
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            const wheel = addCylinder(g, SPEC.wheel, SPEC.wheel, 0.24, 8, 0x22201e,
                sx * SPEC.w * 0.5, SPEC.wheel, sz * SPEC.l * 0.33,
                { roughness: 0.95, castShadow: false });
            wheel.rotation.z = Math.PI / 2;
        }
    }

    // 전조등
    for (const sx of [-1, 1]) {
        addBox(g, 0.22, 0.14, 0.05, 0xffeec4, sx * SPEC.w * 0.3, SPEC.y, SPEC.l / 2, 0, {
            material: makeBasicMat(0xffeec4, { transparent: true, opacity: 0.75 }),
            castShadow: false
        });
    }

    addMapMarker(x, z, "#9aa2ab", 2, "prop");
    return g;
}

/* ------------------------------------------------------------------ 담 / 간판 */
/** 시멘트 블록 담 */
export function addConcreteWall(points, height = 1.6) {
    for (let i = 0; i < points.length - 1; i++) {
        const [x1, z1] = points[i];
        const [x2, z2] = points[i + 1];
        const dist = Math.hypot(x2 - x1, z2 - z1);
        const steps = Math.max(1, Math.floor(dist / 1.6));

        for (let s = 0; s < steps; s++) {
            const t = (s + 0.5) / steps;
            const x = x1 + (x2 - x1) * t;
            const z = z1 + (z2 - z1) * t;
            const y = terrainHeight(x, z);
            const ang = Math.atan2(x2 - x1, z2 - z1);

            addBox(G.world, dist / steps + 0.05, height, 0.24,
                pick([0x9a958c, 0x8e8980, 0xa39d93]),
                x, y + height / 2, z, ang, { roughness: 1, map: G.TEX.stone });

            // 담 윗면 마감
            addBox(G.world, dist / steps + 0.12, 0.09, 0.34, 0x7f7a72,
                x, y + height + 0.04, z, ang, { roughness: 1, castShadow: false });
        }
    }
}

/**
 * 간판.
 * 글자는 만들지 않는다. 색 띠와 네모만으로 "간판이 걸렸다"는 인상만 준다.
 */
export function addSign(parent, x, y, z, w, h, color, opts = {}) {
    const board = addBox(parent, w, h, 0.08, color, x, y, z, 0,
        { roughness: 0.75, castShadow: false });

    // 글자 자리 (네모 몇 개)
    const n = Math.max(2, Math.floor(w / (h * 0.9)));
    for (let i = 0; i < n; i++) {
        addBox(parent, h * 0.5, h * 0.5, 0.02,
            opts.textColor ?? 0xf0e6cc,
            x - w / 2 + (w / n) * (i + 0.5), y, z + 0.05, 0,
            { material: makeBasicMat(opts.textColor ?? 0xf0e6cc,
                { transparent: true, opacity: 0.9 }), castShadow: false });
    }

    // 간판 조명
    if (opts.lit) {
        const light = new THREE.PointLight(opts.lightColor ?? 0xffd9a0, 1.2, 7);
        light.position.set(x, y, z + 0.8);
        parent.add(light);
    }

    return board;
}

/** 가로수 / 화단의 나무 */
export function addStreetTree(x, z, scale = 1) {
    const g = groundGroup(x, z, randRange(0, Math.PI));
    g.scale.setScalar(scale);

    addCylinder(g, 0.13, 0.19, 1.9, 6, 0x4a3a2a, 0, 0.95, 0, { roughness: 1, map: G.TEX.wood });

    const col = pick([0x5f6b38, 0x6d7a42, 0x515c30, 0x74804a]);
    for (let i = 0; i < 4; i++) {
        addBlob(g, randRange(0.75, 1.15), col,
            randRange(-0.4, 0.4), 2.2 + i * 0.42, randRange(-0.4, 0.4), {
            sx: randRange(1.1, 1.5), sy: randRange(0.75, 1.0), sz: randRange(1.1, 1.5),
            ry: randRange(0, Math.PI), roughness: 1, castShadow: false
        });
    }

    // 보호틀
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        addBox(g, 0.7, 0.12, 0.08, 0x7f7a72, Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5, a,
            { castShadow: false });
    }

    return g;
}

/** 화단 */
export function addPlanter(x, z, rot, w = 3.0, d = 1.2) {
    const g = groundGroup(x, z, rot);

    addBox(g, w, 0.4, d, 0x8e8980, 0, 0.2, 0, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, w - 0.3, 0.12, d - 0.3, 0x4a3a2a, 0, 0.42, 0, 0, { castShadow: false });

    const n = Math.floor(w * 3);
    for (let i = 0; i < n; i++) {
        addBlob(g, randRange(0.12, 0.26), pick([0x5f6b38, 0x6d7a42, 0x7b5a52, 0x8a6a3a]),
            randRange(-w / 2 + 0.3, w / 2 - 0.3), 0.55, randRange(-d / 2 + 0.2, d / 2 - 0.2),
            { sy: 0.8, ry: randRange(0, Math.PI), castShadow: false });
    }

    return g;
}

/* ------------------------------------------------------------------ 거리 소품 */
/**
 * 보도블록.
 * 인도가 생긴다는 것이 도시가 되었다는 가장 확실한 표시다.
 */
export function addSidewalk(x1, z1, x2, z2, width = 2.4) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const rot = Math.atan2(dx, dz);

    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, terrainHeight((x1 + x2) / 2, (z1 + z2) / 2) + 0.05, (z1 + z2) / 2);
    g.rotation.y = rot;
    G.world.add(g);

    // 바닥판
    const base = addBox(g, width, 0.1, len, 0x968f84, 0, 0, 0, 0,
        { roughness: 1, map: G.TEX.stone, castShadow: false });
    base.receiveShadow = true;

    // 블록 눈금
    const rows = Math.floor(len / 0.8);
    const cols = Math.max(2, Math.floor(width / 0.8));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r + c) % 2) continue;
            addBox(g, width / cols * 0.88, 0.02, 0.7,
                pick([0x8e877c, 0xa39b90, 0x999288]),
                -width / 2 + (width / cols) * (c + 0.5), 0.06, -len / 2 + r * 0.8 + 0.4, 0,
                { castShadow: false });
        }
    }

    // 경계석
    for (const sx of [-1, 1]) {
        addBox(g, 0.2, 0.18, len, 0xa8a49a, sx * (width / 2 + 0.1), 0.04, 0, 0,
            { roughness: 1, castShadow: false });
    }

    return g;
}

/** 벤치 */
export function addBench(x, z, rot) {
    const g = groundGroup(x, z, rot);

    for (const sx of [-1, 1]) {
        addBox(g, 0.1, 0.42, 0.5, 0x5f6a66, sx * 0.7, 0.21, 0, 0, { roughness: 0.7 });
    }
    // 앉는 판
    for (let i = 0; i < 3; i++) {
        addBox(g, 1.7, 0.07, 0.14, 0x7a5f3c, 0, 0.45, -0.18 + i * 0.18, 0,
            { roughness: 1, map: G.TEX.wood, castShadow: false });
    }
    // 등받이
    for (let i = 0; i < 2; i++) {
        addBox(g, 1.7, 0.07, 0.12, 0x7a5f3c, 0, 0.66 + i * 0.16, -0.24, 0,
            { roughness: 1, map: G.TEX.wood, castShadow: false });
    }
    return g;
}

/** 쓰레기통 */
export function addTrashBin(x, z) {
    const g = groundGroup(x, z, randRange(0, Math.PI));
    addCylinder(g, 0.26, 0.22, 0.75, 8, pick([0x4f5a52, 0x5f5a52]), 0, 0.38, 0,
        { roughness: 0.8 });
    addCylinder(g, 0.28, 0.28, 0.06, 8, 0x3f4a44, 0, 0.78, 0, { castShadow: false });
    return g;
}

/** 볼라드 (차 막이 기둥) */
export function addBollards(x1, z1, x2, z2, count = 5) {
    for (let i = 0; i <= count; i++) {
        const t = i / count;
        const x = x1 + (x2 - x1) * t;
        const z = z1 + (z2 - z1) * t;
        addCylinder(G.world, 0.08, 0.1, 0.7, 6, pick([0xc4b03a, 0x9a958c]),
            x, terrainHeight(x, z) + 0.35, z, { roughness: 0.8, castShadow: false });
    }
}

/** 자전거 */
export function addBicycle(x, z, rot) {
    const g = groundGroup(x, z, rot);

    for (const sz of [-0.55, 0.55]) {
        const wheel = addCylinder(g, 0.33, 0.33, 0.04, 12, 0x2b2824, 0, 0.33, sz,
            { roughness: 0.9, castShadow: false });
        wheel.rotation.z = Math.PI / 2;
    }
    // 프레임
    addBox(g, 0.05, 0.05, 1.0, pick([0x6a3a3a, 0x2f4a6a, 0x3f5a3a]), 0, 0.5, 0, 0,
        { roughness: 0.6, castShadow: false });
    addBox(g, 0.05, 0.3, 0.05, 0x4a4a4a, 0, 0.62, -0.5, 0, { castShadow: false });
    // 안장과 핸들
    addBox(g, 0.1, 0.05, 0.22, 0x2b2824, 0, 0.78, 0.2, 0, { castShadow: false });
    addBox(g, 0.5, 0.04, 0.04, 0x4a4a4a, 0, 0.82, -0.52, 0, { castShadow: false });
    return g;
}

/** 도로 표지판 */
export function addRoadSign(x, z, rot, color = 0x2f6a4a) {
    const g = groundGroup(x, z, rot);
    addCylinder(g, 0.05, 0.06, 2.6, 6, 0x8a8f94, 0, 1.3, 0, { roughness: 0.7 });
    addBox(g, 1.4, 0.5, 0.06, color, 0, 2.5, 0, 0, { roughness: 0.8 });
    for (let i = 0; i < 3; i++) {
        addBox(g, 0.28, 0.2, 0.02, 0xeeeade, -0.4 + i * 0.4, 2.5, 0.05, 0,
            { material: makeBasicMat(0xeeeade, { transparent: true, opacity: 0.9 }),
              castShadow: false });
    }
    return g;
}

/** 길가의 배전함 / 통신함 */
export function addUtilityBox(x, z, rot) {
    const g = groundGroup(x, z, rot);
    addBox(g, 0.7, 1.1, 0.45, pick([0x6f7a72, 0x7a756a, 0x5f6a66]), 0, 0.55, 0, 0,
        { roughness: 0.8 });
    addBox(g, 0.72, 0.08, 0.48, 0x4f5a52, 0, 1.13, 0, 0, { castShadow: false });
    // 붙은 종이 쪼가리
    if (rand() > 0.5) {
        addBox(g, 0.22, 0.28, 0.02, 0xd8d0b8, 0.15, 0.7, 0.24, 0.1,
            { castShadow: false });
    }
    return g;
}

/** 마을 수동 펌프 (1970년대 우물 대신) */
export function addHandPump(x, z, rot) {
    const g = groundGroup(x, z, rot);

    // 시멘트 바닥
    addCylinder(g, 1.1, 1.15, 0.14, 10, 0x9a958c, 0, 0.07, 0, { roughness: 1 });
    // 펌프 몸통
    addCylinder(g, 0.13, 0.17, 0.95, 8, 0x5a4a42, 0, 0.62, 0, { roughness: 0.6, metalness: 0.3 });
    addCylinder(g, 0.1, 0.1, 0.3, 6, 0x5a4a42, 0.22, 1.0, 0, { castShadow: false })
        .rotation.z = Math.PI / 2 - 0.4;
    // 손잡이
    const lever = addBox(g, 0.62, 0.06, 0.06, 0x4a3f38, -0.2, 1.15, 0, 0, { castShadow: false });
    lever.rotation.z = -0.35;
    // 물통
    addCylinder(g, 0.22, 0.19, 0.3, 8, 0x8a8f94, 0.6, 0.29, 0.3, { roughness: 0.7 });

    addMapMarker(x, z, "#5b6b74", 2.5, "prop");
    return g;
}
