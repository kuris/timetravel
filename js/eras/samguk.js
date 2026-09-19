/**
 * 3시대 — 삼국시대 · 낙동강 유역의 마을
 *
 * 청동기와 가장 크게 달라지는 것:
 *   - 흙을 다져 성을 쌓는다 (토성 + 그 위의 목책)
 *   - 죽은 사람 위에 흙을 크게 쌓아 올린다 (고분)
 *   - 쇠를 다룬다 (대장간)
 *   - 물의 힘을 쓴다 (물레방아)
 *   - 기와를 얹은 건물이 처음 나타난다
 *
 * 이 시대의 이야기:
 *   성을 쌓으면서 마을 어귀의 그 돌만 피해 벽을 꺾었다.
 *   목간에 그 이유가, 기와에 공사를 맡은 사람의 이름이 남았다.
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { paintBaseMap } from "../basemap.js";
import { registerInteractable } from "../interaction.js";
import { GATE_SPOT, S, addRiver, carveRiver, riverPoint } from "../landmarks.js";
import { addMapMarker } from "../minimap.js";
import { addBirdFlock, addCow, addDog, addPig, addVillager, addWorker } from "../npc.js";
import {
    addBanner, addBridge, addCart, addCropField, addHayStack, addJarPlatform,
    addLaundryLine, addMarketStall, addStoneWallRun
} from "../props.js";
import { pick, rand, randRange } from "../rng.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { addGround, addInstanced, addStonePath, addTreeLine } from "../world.js";
import { addFirewood, addHearth, addReedCluster, addStonePile, createTimeGate } from "./neolithic.js";
import { addHanokBody, addHanokRoof, addThatchRoof } from "./joseon.js";
import { addPalisade, addRaisedGranary, addRicePaddy } from "./bronze.js";

/* ================================================================
   토성 — 흙을 다져 쌓고 그 위에 목책을 올린다
   ================================================================ */
/**
 * @param {Array<[number,number]>} points 성벽이 지나는 자리
 */
export function addEarthWall(points, height = 2.2) {
    // 성벽 한 줄에 흙덩이가 수백 개 생긴다. 전부 인스턴싱한다.
    const lower = [], upper = [], posts = [], stones = [];
    const dirtCols = [0x8a6a45, 0x7d6039, 0x93744c].map((c) => new THREE.Color(c));
    const dirtCols2 = [0x93744c, 0x846a44].map((c) => new THREE.Color(c));
    const stoneCols = [0x77706a, 0x635e57].map((c) => new THREE.Color(c));

    for (let i = 0; i < points.length - 1; i++) {
        const [x1, z1] = points[i];
        const [x2, z2] = points[i + 1];
        const dist = Math.hypot(x2 - x1, z2 - z1);
        const steps = Math.max(2, Math.floor(dist / 0.85));

        for (let s2 = 0; s2 <= steps; s2++) {
            const t = s2 / steps;
            const x = x1 + (x2 - x1) * t;
            const z = z1 + (z2 - z1) * t;
            const y = terrainHeight(x, z);
            const ang = Math.atan2(x2 - x1, z2 - z1);

            // 다져 올린 흙 — 아래가 넓고 위가 좁다
            lower.push({ x, y: y + height * 0.275, z, sx: 3.4, sy: height * 0.55, sz: 1.1,
                         ry: ang, color: dirtCols[Math.floor(rand() * dirtCols.length)] });
            upper.push({ x, y: y + height * 0.72, z, sx: 2.4, sy: height * 0.5, sz: 0.95,
                         ry: ang, color: dirtCols2[Math.floor(rand() * dirtCols2.length)] });

            // 성벽 위의 목책
            if (s2 % 2 === 0) {
                const ph = randRange(0.85, 1.1);
                posts.push({ x, y: y + height + ph / 2 - 0.05, z, sx: 0.09, sy: ph, sz: 0.09 });
            }

            // 성벽 아랫단을 받치는 돌
            if (s2 % 3 === 0) {
                stones.push({
                    x: x + Math.cos(ang) * 1.6, y: y + 0.14, z: z - Math.sin(ang) * 1.6,
                    sx: 0.28 * 1.4, sy: 0.28 * 0.7, sz: 0.28 * 1.1, ry: ang,
                    color: stoneCols[Math.floor(rand() * stoneCols.length)]
                });
            }
        }
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    addInstanced(boxGeo, makeMat(0xffffff, { roughness: 1, map: G.TEX.dirtObj }), lower);
    addInstanced(new THREE.BoxGeometry(1, 1, 1),
        makeMat(0xffffff, { roughness: 1, map: G.TEX.dirtObj }), upper);
    addInstanced(new THREE.CylinderGeometry(0.78, 1, 1, 5),
        makeMat(0xffffff, { roughness: 1, map: G.TEX.wood }), posts);
    addInstanced(new THREE.DodecahedronGeometry(1, 0),
        makeMat(0xffffff, { roughness: 1, map: G.TEX.stone }), stones, { castShadow: false });
}

/** 성문: 토성을 끊고 세운 기와지붕 문루 */
export function addFortressGate(x, z, rot) {
    addMapMarker(x, z, "#b0553a", 5, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    // 문 양옆의 흙 둔덕 (토성이 이어지는 부분)
    for (const sx of [-1, 1]) {
        addBox(g, 2.6, 2.2, 3.2, 0x8a6a45, sx * 3.4, 1.1, 0, 0,
            { roughness: 1, map: G.TEX.dirtObj });
    }

    // 석축 기단
    addBox(g, 5.0, 0.5, 3.4, 0x635d55, 0, 0.25, 0, 0, { roughness: 1, map: G.TEX.stone });

    const body = new THREE.Group();
    body.position.y = 0.5;
    g.add(body);

    // 기둥
    for (const px of [-1.9, 1.9]) {
        for (const pz of [-1.2, 1.2]) {
            addCylinder(body, 0.19, 0.22, 2.7, 8, 0x6b2f22, px, 1.35, pz,
                { roughness: 0.9, map: G.TEX.wood });
        }
    }

    // 홍예문 (아치 느낌을 계단식 박스로)
    addBox(body, 2.6, 0.3, 1.4, 0x5b2a20, 0, 2.05, 0);
    addBox(body, 2.0, 0.25, 1.4, 0x5b2a20, 0, 2.28, 0);

    // 문짝
    addBox(body, 2.2, 1.9, 0.14, 0x4a2318, 0, 0.95, 1.25, 0, { map: G.TEX.wood });
    addCylinder(body, 0.08, 0.08, 0.34, 6, 0xc9a14d, -0.45, 1.0, 1.34).rotation.x = Math.PI / 2;
    addCylinder(body, 0.08, 0.08, 0.34, 6, 0xc9a14d, 0.45, 1.0, 1.34).rotation.x = Math.PI / 2;

    // 누각
    addBox(body, 5.2, 0.35, 2.8, 0x5b2a20, 0, 2.75, 0, 0, { roughness: 0.9 });
    addBox(body, 5.25, 0.12, 2.85, 0x2f5a5e, 0, 2.95, 0, 0, { castShadow: false });

    // 누각 난간
    for (const [bx, bz, bw, bd] of [[0, -1.35, 5.2, 0.1], [0, 1.35, 5.2, 0.1]]) {
        addBox(body, bw, 0.4, bd, 0x6b3a28, bx, 3.2, bz, 0, { castShadow: false });
    }

    addHanokRoof(body, 5.2, 2.8, 3.45, { tile: 0x3d4450, ridge: 0x272d38, h: 1.0, eave: 0.9 });

    // 치미 (용마루 끝 장식) — 삼국시대 기와집의 표식
    for (const sx of [-1, 1]) {
        const chimi = addBox(body, 0.22, 0.5, 0.3, 0x2b313d, sx * 2.45, 4.6, 0, 0,
            { roughness: 0.8 });
        chimi.rotation.z = -sx * 0.3;
    }

    // 문 위의 붉은 깃발
    for (const sx of [-1, 1]) {
        const flag = addBox(body, 0.35, 1.4, 0.03, 0x93342a, sx * 2.1, 2.1, 1.35, 0,
            { roughness: 1, map: G.TEX.cloth, castShadow: false });
        G.animated.push({
            type: "sway", group: flag,
            amp: 0.08, speed: randRange(1.1, 1.8), phase: randRange(0, Math.PI * 2)
        });
    }

    return g;
}

/** 망루: 성벽 위에서 멀리 내다본다. 청동기보다 높고 기와를 얹었다. */
export function addTowerTall(x, z, rot) {
    addMapMarker(x, z, "#8a6a3f", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    const H = 4.6;

    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const post = addCylinder(g, 0.1, 0.15, H, 5, 0x5c3f20, px * 0.95, H / 2, pz * 0.95,
            { map: G.TEX.wood });
        post.rotation.z = -px * 0.055;
        post.rotation.x = pz * 0.055;
    }

    for (let i = 0; i < 4; i++) {
        const y = 1.0 + i * 1.1;
        addBox(g, 2.1, 0.08, 0.08, 0x6d4a26, 0, y, -0.9, 0, { castShadow: false });
        addBox(g, 2.1, 0.08, 0.08, 0x6d4a26, 0, y, 0.9, 0, { castShadow: false });
        addBox(g, 0.08, 0.08, 1.9, 0x6d4a26, -0.9, y, 0, 0, { castShadow: false });
        addBox(g, 0.08, 0.08, 1.9, 0x6d4a26, 0.9, y, 0, 0, { castShadow: false });
    }

    // 누마루
    addBox(g, 2.6, 0.14, 2.6, 0x7a5530, 0, H, 0, 0, { roughness: 1, map: G.TEX.wood });
    for (const [bx, bz, bw, bd] of [[0, -1.25, 2.6, 0.09], [0, 1.25, 2.6, 0.09],
                                     [-1.25, 0, 0.09, 2.6], [1.25, 0, 0.09, 2.6]]) {
        addBox(g, bw, 0.6, bd, 0x6d4a26, bx, H + 0.37, bz, 0, { castShadow: false });
    }

    addHanokRoof(g, 2.5, 2.5, H + 0.7, { tile: 0x3d4450, ridge: 0x272d38, h: 0.7, eave: 0.55 });

    // 사다리
    for (let i = 0; i < 9; i++) {
        addBox(g, 0.8, 0.055, 0.055, 0x5c3f20, 0, 0.4 + i * 0.5, 1.2, 0, { castShadow: false });
    }

    // 망루 깃발
    addCylinder(g, 0.04, 0.05, 2.0, 5, 0x5c3f20, 1.15, H + 1.6, 1.15, { castShadow: false });
    const flag = addBox(g, 0.3, 1.1, 0.03, 0x93342a, 1.32, H + 1.9, 1.15, 0,
        { roughness: 1, map: G.TEX.cloth, castShadow: false });
    G.animated.push({
        type: "sway", group: flag,
        amp: 0.1, speed: randRange(1.3, 2.0), phase: randRange(0, Math.PI * 2)
    });

    return g;
}

/**
 * 고분: 흙을 둥글게 크게 쌓아 올린 무덤.
 * 이 시대의 풍경을 가장 확실하게 규정하는 것.
 */
export function addTumulus(x, z, radius, height) {
    addMapMarker(x, z, "#8f7a52", 4, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = randRange(0, Math.PI);
    G.world.add(g);

    // 봉분: 반구를 눌러서
    const mound = addBlob(g, radius, pick([0x7d6f47, 0x6f6440, 0x88794e]), 0, height * 0.35, 0, {
        sx: 1.0, sy: (height / radius) * 0.9, sz: 1.05,
        ry: randRange(0, Math.PI), roughness: 1, map: G.TEX.dirtObj
    });

    // 위에 덮인 풀
    for (let i = 0; i < 26; i++) {
        const a = randRange(0, Math.PI * 2), r = randRange(0.2, 0.92) * radius;
        const gy = height * (1 - Math.pow(r / radius, 2)) * 0.82;
        const blade = addBox(g, 0.045, randRange(0.18, 0.34), 0.03,
            pick([0x6e7440, 0x5c6236, 0x7d8449]),
            Math.cos(a) * r, gy + 0.1, Math.sin(a) * r,
            randRange(0, Math.PI), { castShadow: false });
        blade.rotation.z = randRange(-0.4, 0.4);
    }

    // 무덤 둘레를 두른 호석 (護石)
    const n = Math.max(10, Math.floor(radius * 5));
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        addBlob(g, 0.26, pick([0x77706a, 0x8d8579, 0x655f58]),
            Math.cos(a) * radius * 1.02, 0.14, Math.sin(a) * radius * 1.02, {
            sx: 1.1, sy: 0.85, sz: 0.8, ry: a,
            roughness: 1, map: G.TEX.stone, castShadow: false
        });
    }

    return g;
}

/**
 * 대장간. 쇠를 다루기 시작한 시대의 표식.
 * 화덕의 붉은 빛이 밤낮 없이 새어 나온다.
 */
export function addForge(x, z, rot) {
    addMapMarker(x, z, "#c4552f", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    // 한쪽이 트인 작업채
    for (const [px, pz] of [[-1.3, -1.0], [1.3, -1.0], [-1.3, 1.0], [1.3, 1.0]]) {
        addCylinder(g, 0.1, 0.12, 1.9, 6, 0x5c3f20, px, 0.95, pz, { map: G.TEX.wood });
    }
    addBox(g, 2.9, 1.5, 0.14, 0x8a6a45, 0, 0.95, -1.05, 0,
        { roughness: 1, map: G.TEX.dirtObj });

    const roof = addCone(g, 2.5, 0.95, 4, 0xa88a4e, 0, 2.35, 0,
        { roughness: 1, map: G.TEX.thatch });
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.8;

    // 화덕
    addCylinder(g, 0.5, 0.62, 0.7, 8, 0x5b4a3e, -0.7, 0.35, 0.1,
        { roughness: 1, map: G.TEX.stone });
    const coals = addFlatCircle(g, 0.36, 0xff5a1e, -0.7, 0.72, 0.1, 8, {
        material: makeBasicMat(0xff5a1e, { transparent: true, opacity: 0.9, depthWrite: false })
    });
    G.animated.push({ type: "ember", mesh: coals, phase: randRange(0, Math.PI * 2) });

    const fire = new THREE.PointLight(0xff7a2e, 2.2, 8);
    fire.position.set(-0.7, 0.9, 0.1);
    g.add(fire);
    G.animated.push({
        type: "torch", light: fire,
        flame: addCone(g, 0.14, 0.3, 6, 0xff9a3c, -0.7, 0.85, 0.1, {
            material: makeBasicMat(0xff9a3c, { transparent: true, opacity: 0.7, depthWrite: false }),
            castShadow: false
        }),
        baseIntensity: 2.2, speed: randRange(7, 10), phase: randRange(0, Math.PI * 2)
    });

    // 모루와 망치
    addCylinder(g, 0.18, 0.22, 0.5, 6, 0x4a4038, 0.6, 0.25, 0.2, { roughness: 1, map: G.TEX.wood });
    addBox(g, 0.5, 0.2, 0.26, 0x3f3a36, 0.6, 0.6, 0.2, 0.2, { roughness: 0.5, metalness: 0.4 });

    // 쌓아 둔 쇠붙이
    for (let i = 0; i < 5; i++) {
        addBox(g, randRange(0.2, 0.45), 0.06, 0.09, 0x4a443e,
            randRange(0.9, 1.5), 0.05 + i * 0.07, randRange(-0.6, 0.6),
            randRange(0, Math.PI), { roughness: 0.5, metalness: 0.35, castShadow: false });
    }

    // 숯더미
    for (let i = 0; i < 9; i++) {
        addBlob(g, randRange(0.07, 0.13), 0x1f1a16,
            randRange(-1.6, -1.0), 0.06, randRange(0.5, 1.2),
            { sy: 0.7, ry: randRange(0, Math.PI), castShadow: false });
    }

    return g;
}

/** 물레방아: 강물의 힘으로 곡식을 찧는다 */
export function addWaterMill(x, z, rot) {
    addMapMarker(x, z, "#7a5530", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    G.world.add(g);

    // 방앗간
    addBox(g, 2.2, 1.5, 1.8, 0x9c7a4c, 0.9, 0.75, 0, 0, { roughness: 1, map: G.TEX.dirtObj });
    const roof = addCone(g, 2.0, 0.8, 4, 0xa88a4e, 0.9, 1.85, 0,
        { roughness: 1, map: G.TEX.thatch });
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.85;

    // 물레바퀴
    const wheel = new THREE.Group();
    wheel.position.set(-0.9, 0.95, 0);
    g.add(wheel);

    const R = 1.25;
    addCylinder(wheel, 0.12, 0.12, 0.7, 6, 0x5c3f20, 0, 0, 0, { map: G.TEX.wood })
        .rotation.x = Math.PI / 2;

    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        // 살
        const spoke = addBox(wheel, 0.08, R * 2, 0.08, 0x6d4a26, 0, 0, 0, 0,
            { map: G.TEX.wood, castShadow: false });
        spoke.rotation.z = a;
        // 물받이 판
        const paddle = addBox(wheel, 0.5, 0.32, 0.06, 0x7a5530,
            Math.cos(a) * R, Math.sin(a) * R, 0, 0, { map: G.TEX.wood, castShadow: false });
        paddle.rotation.z = a;
    }

    // 테두리
    for (const zz of [-0.3, 0.3]) {
        const rim = addCylinder(wheel, R, R, 0.07, 14, 0x66421f, 0, 0, zz,
            { map: G.TEX.wood, castShadow: false });
        rim.rotation.x = Math.PI / 2;
    }

    G.animated.push({ type: "wheel", group: wheel, speed: randRange(0.5, 0.75) });

    // 물길
    addBox(g, 3.2, 0.14, 0.7, 0x6d4a26, -1.6, 1.9, 0, 0,
        { roughness: 1, map: G.TEX.wood, castShadow: false });

    return g;
}

/** 삼국시대 기와집: 조선보다 지붕이 무겁고 치미가 달렸다 */
export function addSamgukHouse(x, z, rot, scale = 1, tiled = true) {
    addMapMarker(x, z, tiled ? "#6c6470" : "#9c8350", 3, "building");

    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    G.world.add(g);

    const w = tiled ? 3.1 : 2.5;
    const d = tiled ? 2.0 : 1.8;
    const wallH = tiled ? 1.2 : 1.0;

    addHanokBody(g, w, d, wallH, { wall: tiled ? 0xc0a582 : 0xcbb08a, lit: rand() > 0.4 });

    if (tiled) {
        addHanokRoof(g, w, d, 0.26 + wallH, { tile: 0x424956, ridge: 0x2b313d, h: 0.8, eave: 0.6 });
        // 치미
        for (const sx of [-1, 1]) {
            const chimi = addBox(g, 0.16, 0.36, 0.22, 0x2b313d,
                sx * w * 0.46, 0.26 + wallH + 0.95, 0, 0, { roughness: 0.8 });
            chimi.rotation.z = -sx * 0.28;
        }
    } else {
        addThatchRoof(g, w, d, 0.26 + wallH, {});
    }

    return g;
}

/* ================================================================
   유물
   ================================================================ */

/** 명문 기와: 공사를 맡은 사람의 이름이 새겨져 있다 */
export function createInscribedTile(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z) + 0.05, z);
    g.rotation.y = 0.4;
    G.world.add(g);

    // 반원통형 기와
    const tile = addCylinder(g, 0.3, 0.3, 0.7, 10, 0x4a515e, 0, 0.12, 0,
        { roughness: 0.8, map: G.TEX.stone });
    tile.rotation.z = Math.PI / 2;
    tile.scale.y = 0.55;

    // 깨진 자리
    addBox(g, 0.34, 0.06, 0.3, 0x3d4450, 0.3, 0.14, 0.05, 0.3, { castShadow: false });

    // 새긴 글자
    for (let i = 0; i < 4; i++) {
        addBox(g, 0.045, 0.02, 0.1, 0x22262e, -0.22 + i * 0.14, 0.26, 0, 0,
            { castShadow: false });
    }

    return g;
}

/** 목간: 물자와 사람 이름을 적은 나무 조각 */
export function createWoodenSlip(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z) + 0.04, z);
    g.rotation.y = -0.6;
    G.world.add(g);

    for (let i = 0; i < 3; i++) {
        const slip = addBox(g, 0.13, 0.03, 0.78, pick([0xb99a6a, 0xa88a5c, 0xc2a678]),
            i * 0.18 - 0.18, 0.04 + i * 0.03, randRange(-0.05, 0.05),
            randRange(-0.2, 0.2), { roughness: 1, map: G.TEX.wood });
        slip.rotation.x = randRange(-0.04, 0.04);

        // 먹으로 쓴 글자
        for (let k = 0; k < 4; k++) {
            addBox(g, 0.05, 0.012, 0.05, 0x2e2418,
                slip.position.x, slip.position.y + 0.02, -0.26 + k * 0.17, 0,
                { castShadow: false });
        }
    }

    return g;
}

/** 성벽 각자: 성돌에 새긴 축성 기록 */
export function createWallInscription(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = 0.2;
    G.world.add(g);

    // 유난히 반듯하게 다듬은 성돌 하나
    addBox(g, 1.15, 0.7, 0.55, 0x8b8479, 0, 0.35, 0, 0,
        { roughness: 1, map: G.TEX.stone });

    // 새긴 글줄
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            addBox(g, 0.075, 0.075, 0.02, 0x4f4a42,
                -0.36 + c * 0.24, 0.52 - r * 0.16, 0.28, 0, { castShadow: false });
        }
    }

    // 둘레의 거친 성돌
    for (let i = 0; i < 5; i++) {
        addBlob(g, randRange(0.22, 0.34), pick([0x77706a, 0x655f58]),
            randRange(-1.3, 1.3), 0.18, randRange(-0.8, 0.8),
            { sx: 1.3, sy: 0.8, sz: 1.0, ry: randRange(0, Math.PI),
              roughness: 1, map: G.TEX.stone, castShadow: false });
    }

    return g;
}

/**
 * 낙동강 유역의 마을.
 *
 * 강은 화면 위쪽(v > 8)을 흐른다. 마을은 그 아래 둔덕에 앉는다.
 *
 * 성벽이 마을 아래를 지나는데, 마을 어귀의 그 돌 앞에서만
 * 바깥으로 크게 꺾여 돌아간다. 이 시대의 이야기가 거기 있다.
 */
export function buildSamguk() {
    const P = S;

    // 신석기와 같은 강. 같은 자리에서 시간만 흘렀다.
    G.terrainCarve = carveRiver;

    addGround(0x8a7048, [0xa88a58, 0x736040, 0x9c7e4e, 0x5f5238, 0xc0a068]);

    // 신석기와 같은 돌, 같은 자리. 색만 이 시대의 것이다.
    // 성을 쌓고 논을 열면서 나무가 눈에 띄게 줄었다.
    paintBaseMap({
        stone: [0x786d62, 0x635b55, 0x8b8072],
        grass: [0x757a3c, 0x5f6531, 0x878c4a, 0x4e5329],
        tree: [0x5d6338, 0x4c512c, 0x6b7141],
        treeSurvival: 0.7,
        grassDensity: 0.85
    });

    addRiver();

    // 강변 갈대
    for (let i = 0; i < 26; i++) {
        const [rx, rz] = riverPoint(randRange(-32, 32), randRange(-1.0, 5.0));
        addReedCluster(rx, rz, Math.floor(randRange(5, 9)));
    }

    // ---- 길 ----
    let p1 = P(-24, -6), p2 = P(22, 2);
    addStonePath(p1[0], p1[1], p2[0], p2[1], 2.6);
    p1 = P(2, 6); p2 = P(6, -14);
    addStonePath(p1[0], p1[1], p2[0], p2[1], 1.8);

    // ================================================================
    // 토성 — 마을 아래를 두른다.
    // 그 돌(GATE_SPOT) 앞에서만 바깥으로 꺾여 돌아간다.
    // ================================================================
    // 그 돌은 화면 오른쪽 아래(대략 u 20, v -4)에 서 있다.
    // 성벽이 거기서만 바깥으로 크게 부풀어 돌아간다.
    addEarthWall([
        P(-26, -10), P(-14, -14), P(0, -15), P(12, -12), P(17, -9),
        // --- 여기서부터 돌을 피해 바깥으로 ---
        P(23, -9), P(27, -5), P(26, 0),
        // --- 다시 제자리로 ---
        P(21, 2), P(17, 5)
    ], 2.2);

    // 성문
    let q = P(4, -14);
    addFortressGate(q[0], q[1], 0.15);

    // 망루
    q = P(-16, -13); addTowerTall(q[0], q[1], 0.4);
    q = P(13, -11); addTowerTall(q[0], q[1], -0.2);
    q = P(19, 4); addTowerTall(q[0], q[1], -0.9);

    // 성벽을 따라 세운 붉은 깃발
    for (const [bu, bv] of [[-20, -12], [-6, -14], [9, -13], [24, -7], [23, 1]]) {
        const c = P(bu, bv);
        addBanner(c[0], c[1], randRange(-0.4, 0.4), 0x93342a);
    }

    // ================================================================
    // 고분 (화면 오른쪽) — 이 시대의 풍경을 규정한다
    // ================================================================
    q = P(19, 6); addTumulus(q[0], q[1], 3.6, 2.6);
    q = P(25, 2); addTumulus(q[0], q[1], 2.8, 2.0);
    q = P(14, 5.5); addTumulus(q[0], q[1], 2.2, 1.6);

    // ================================================================
    // 마을 (화면 가운데)
    // ================================================================
    const houses = [
        [3, 2, -0.28, 1.00, true],
        [-4, 4, 0.42, 0.92, true],
        [9, -2, -0.75, 0.88, true],
        [-9, 0, 0.35, 1.00, false],
        [-14, 3, -0.55, 0.92, false],
        [-2, -3, 0.22, 1.05, false],
        [7, 5, -0.42, 0.95, false],
        [-16, -4, 0.62, 0.88, false],
        [13, 2, -0.20, 0.98, false],
        [-7, -8, 1.05, 0.90, false]
    ];
    for (const [u, v, rot, sc, tiled] of houses) {
        const c = P(u, v);
        addSamgukHouse(c[0], c[1], rot, sc, tiled);
    }

    // 대장간 — 쇠를 다루기 시작했다
    q = P(-12, -9); addForge(q[0], q[1], 0.5);

    // 물레방아 — 강가에 붙여 세운다
    q = P(-6, 6.4); addWaterMill(q[0], q[1], 0.9);

    // 고상 창고
    q = P(0, 7); addRaisedGranary(q[0], q[1], 0.3);
    q = P(-18, 1); addRaisedGranary(q[0], q[1], -0.6);

    // 마당 살림
    q = P(1, 0); addHearth(q[0], q[1]);
    q = P(-5, 1); addJarPlatform(q[0], q[1], 0.3);
    q = P(11, 6); addJarPlatform(q[0], q[1], -0.6);
    let l1 = P(-12, 6), l2 = P(-8, 5);
    addLaundryLine(l1[0], l1[1], l2[0], l2[1]);
    q = P(5, -6); addMarketStall(q[0], q[1], 0.2);
    q = P(8, -9); addMarketStall(q[0], q[1], -0.5);
    q = P(-10, -5); addCart(q[0], q[1], 0.6);
    q = P(12, -7); addCart(q[0], q[1], -0.9);
    q = P(-20, 6); addHayStack(q[0], q[1], 1.0);
    q = P(-22, 4); addHayStack(q[0], q[1], 0.82);
    q = P(16, -5); addFirewood(q[0], q[1]);
    q = P(-3, -12); addStonePile(q[0], q[1]);

    // 목책으로 두른 안마당
    addPalisade([P(-8, 5.5), P(-2, 6)]);
    addStoneWallRun([P(6, 0), P(11, 0)], 0.9);
    addStoneWallRun([P(-16, 1), P(-12, 1)], 0.9);

    // ================================================================
    // 논과 밭 (화면 아래-왼쪽)
    // ================================================================
    q = P(-20, -8); addRicePaddy(q[0], q[1], 0.15, 2, 2);
    q = P(-8, -11); addRicePaddy(q[0], q[1], -0.2, 2, 1);
    q = P(-25, -2); addCropField(q[0], q[1], 0.3, 6, 5);
    q = P(8, -9); addCropField(q[0], q[1], -0.3, 5, 4);

    // ---- 강을 건너는 나무다리 ----
    const br1 = P(-14, 5), br2 = P(-16, 17);
    addBridge(br1[0], br1[1], br2[0], br2[1], 1.8);

    // ================================================================
    // 사람과 짐승
    // ================================================================
    addVillager([P(0, 2), P(6, 0), P(9, 4), P(2, 6), P(-3, 3)], "samguk");
    addVillager([P(-12, 2), P(-17, 4), P(-19, -2), P(-13, -4)], "samguk", { speed: 0.85 });
    addVillager([P(10, -6), P(15, -9), P(19, -6), P(13, -3)], "samguk", { hat: "straw" });
    addVillager([P(-6, -12), P(-14, -16), P(-18, -12), P(-9, -8)], "samguk", { speed: 0.9 });
    addVillager([P(18, 2), P(23, 5), P(20, 6), P(15, 5)], "samguk", { hat: "straw", speed: 0.75 });

    // 대장간에서 쇠를 두드리는 사람
    q = P(-11.5, -9.5); addWorker(q[0], q[1], "samguk", { rot: -0.9 });
    // 모닥불 앞
    q = P(1.6, 0.8); addWorker(q[0], q[1], "samguk", { rot: 2.0 });
    // 논일
    q = P(-19, -17); addWorker(q[0], q[1], "samguk", { rot: 0.4, hat: "straw" });
    // 가판
    q = P(5, -5); addWorker(q[0], q[1], "samguk", { rot: 0.1 });

    q = P(-8, -6); addCow(q[0], q[1], 0.7);
    q = P(-9.5, -4.5); addCow(q[0], q[1], 1.4);
    q = P(-21, 5.5); addPig(q[0], q[1]);
    addDog([P(0, 4), P(7, 2), P(3, -4), P(-5, 0)]);
    addBirdFlock(P(-2, 16)[0], 10, P(-2, 16)[1], 14);

    // ================================================================
    // 조사 대상 3개
    // ================================================================
    q = P(5, -12);
    const tile = createInscribedTile(q[0], q[1]);
    registerInteractable({
        name: "명문 기와",
        group: tile,
        pickup: true,
        range: 1.8,
        glowColor: 0xa8d4ff,
        description: "명문 기와\n\n성문 아래 깨진 채 떨어져 있었습니다.\n뒷면에 공사를 맡은 사람의 이름이 눌러 새겨져 있습니다.\n같은 이름이 성벽 어딘가에 한 번 더 있을 것입니다."
    });

    q = P(-11, -7);
    const slip = createWoodenSlip(q[0], q[1]);
    registerInteractable({
        name: "목간",
        group: slip,
        pickup: true,
        range: 1.8,
        glowColor: 0xffe0a0,
        description: "목간\n\n대장간 옆에 묶인 채 버려져 있었습니다.\n성벽에 쓸 돌과 일꾼의 수를 적어 둔 기록인데,\n마지막 줄만 글씨가 다릅니다. \"동쪽 끝은 돌아서 쌓으라.\""
    });

    q = P(24, -6);
    const inscription = createWallInscription(q[0], q[1]);
    registerInteractable({
        name: "성벽 각자",
        group: inscription,
        pickup: false,
        range: 2.2,
        glowColor: 0x9fe0ff,
        description: "성벽의 각자\n\n성벽이 바깥으로 꺾이는 바로 그 자리의 성돌입니다.\n기와에 있던 이름이 여기에도 있습니다. 그 아래에 한 줄이 더 있습니다.\n\"옛 돌을 덮지 않았다.\""
    });

    // ---- 시간의 문: 성벽이 피해 간 바로 그 돌 ----
    G.activeGate = createTimeGate(GATE_SPOT.x, GATE_SPOT.z, GATE_SPOT.rot);
}
