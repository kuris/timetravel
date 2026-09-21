/**
 * 조선 부속 건축 + 지형 요소.
 *
 * joseon.js 가 비대해지지 않게 별도 파일로 뺐다.
 * 전부 기본 도형 조합이며, 지형 높이를 따라간다.
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { addHanokBody, addHanokRoof, addThatchRoof } from "./joseon.js";
import { addRicePaddy } from "./bronze.js";
import { addInstanced } from "../world.js";
import { addMapMarker, addMapShape } from "../minimap.js";
import { pick, rand, randRange } from "../rng.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";

function groundGroup(x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot || 0;
    G.world.add(g);
    return g;
}

/* ------------------------------------------------------------------ 정자 */
export function addPavilion(x, z, rot) {
    addMapMarker(x, z, "#7a9a8a", 3, "building");
    const g = groundGroup(x, z, rot);

    addBox(g, 3.0, 0.45, 3.0, 0x6f6960, 0, 0.22, 0, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, 2.7, 0.1, 2.7, 0x7a5530, 0, 0.5, 0, 0, { roughness: 1, map: G.TEX.wood });

    for (const [px, pz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
        addCylinder(g, 0.11, 0.13, 1.9, 6, 0x6b2f22, px, 1.5, pz, { map: G.TEX.wood });
    }

    for (const [bx, bz, bw, bd] of [[0, -1.2, 2.6, 0.08], [-1.2, 0, 0.08, 2.6], [1.2, 0, 0.08, 2.6]]) {
        addBox(g, bw, 0.45, bd, 0x6d4a26, bx, 1.6, bz, 0, { castShadow: false });
    }

    addBox(g, 1.2, 0.3, 0.5, 0x7a5530, 0, 0.7, 0, 0, { map: G.TEX.wood });

    addHanokRoof(g, 2.9, 2.9, 2.45, { tile: pick([0x39404e, 0x424a55]), ridge: 0x232936, h: 0.9, eave: 0.5 });
    return g;
}

/* ------------------------------------------------------------------ 주막 */
export function addJumak(x, z, rot) {
    addMapMarker(x, z, "#a8793f", 3.5, "building");
    const g = groundGroup(x, z, rot);

    const w = 4.2, d = 2.4, wallH = 1.1;
    addHanokBody(g, w, d, wallH, { wall: 0xc4a87e, lit: true });
    addThatchRoof(g, w, d, 0.26 + wallH, { straw: 0xb5975a });

    for (let i = 0; i < 3; i++) {
        const cloth = addBox(g, 0.5, 0.9, 0.04, pick([0x2f4a6a, 0x8c3a2a, 0x3f5a48]),
            -0.9 + i * 0.9, 1.0, d * 0.5 + 0.75, 0, { roughness: 1, map: G.TEX.cloth, castShadow: false });
        G.animated.push({ type: "sway", group: cloth, amp: 0.09, speed: randRange(1.0, 1.7), phase: randRange(0, Math.PI * 2) });
    }

    for (const [tx, tz] of [[-1.2, 2.2], [1.1, 2.4]]) {
        addBox(g, 1.1, 0.08, 0.7, 0x7a5530, tx, 0.45, tz, 0, { map: G.TEX.wood });
        for (const [sx, sz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) {
            addCylinder(g, 0.05, 0.05, 0.45, 5, 0x5c3f20, tx + sx, 0.22, tz + sz, { castShadow: false });
        }
        addCylinder(g, 0.16, 0.13, 0.3, 7, 0x5c3a25, tx - 0.2, 0.64, tz, { roughness: 0.8 });
        addCylinder(g, 0.13, 0.11, 0.24, 7, 0x6b4630, tx + 0.25, 0.61, tz + 0.1, { roughness: 0.8 });
    }
    return g;
}

/* ------------------------------------------------------------------ 사당 */
export function addShrine(x, z, rot) {
    addMapMarker(x, z, "#8a6a3f", 2.5, "building");
    const g = groundGroup(x, z, rot);

    addBox(g, 2.6, 0.2, 2.6, 0x6f6960, 0, 0.1, 0, 0, { roughness: 1, map: G.TEX.stone });
    addBox(g, 1.1, 0.9, 0.9, 0x6b4a30, 0, 0.65, -0.3, 0, { roughness: 1, map: G.TEX.wood });
    addBox(g, 1.3, 0.08, 1.1, 0x3a281a, 0, 1.12, -0.3, 0, { map: G.TEX.wood });
    const roof = addCone(g, 1.2, 0.55, 4, 0x8a7a52, 0, 1.42, -0.3, { roughness: 1, map: G.TEX.thatch });
    roof.rotation.y = Math.PI / 4;

    addBox(g, 0.5, 0.35, 0.4, 0x7d766c, 0, 0.38, 0.9, 0, { roughness: 1, map: G.TEX.stone });

    for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        addCylinder(g, 0.04, 0.05, 0.7, 5, 0x5c3f20, -1.2 + t * 2.4, 0.35, 1.25, { map: G.TEX.wood });
    }
    addCylinderBetween(g, new THREE.Vector3(-1.2, 0.6, 1.25), new THREE.Vector3(1.2, 0.6, 1.25), 0.03, 0x6d4724, { castShadow: false });
    return g;
}

/* ------------------------------------------------------------------ 서당 */
export function addSeodang(x, z, rot) {
    addMapMarker(x, z, "#336b66", 3, "building");
    const g = groundGroup(x, z, rot);

    const w = 3.0, d = 1.9, wallH = 1.15;
    addHanokBody(g, w, d, wallH, { wall: 0xc0a582, lit: true });
    addHanokRoof(g, w, d, 0.26 + wallH, { tile: 0x4a4a52, ridge: 0x2e2e36, h: 0.85, eave: 0.5 });

    addBox(g, 1.5, 0.4, 0.06, 0x2e2015, 0, 1.35, d * 0.5 + 0.12, 0, { map: G.TEX.wood });
    addBox(g, 1.2, 0.22, 0.02, 0xd9c39a, 0, 1.35, d * 0.5 + 0.16, 0, { castShadow: false });

    addBox(g, 1.4, 0.1, 0.5, 0x7a5530, -0.5, 0.32, d * 0.5 + 0.7, 0, { map: G.TEX.wood });
    addBox(g, 1.4, 0.1, 0.5, 0x7a5530, 0.9, 0.32, d * 0.5 + 0.7, 0, { map: G.TEX.wood });
    return g;
}

/* ------------------------------------------------------------------ 대장간 */
export function addSmithy(x, z, rot) {
    addMapMarker(x, z, "#c4552f", 3, "building");
    const g = groundGroup(x, z, rot);

    for (const [px, pz] of [[-1.4, -1.0], [1.4, -1.0], [-1.4, 1.0], [1.4, 1.0]]) {
        addCylinder(g, 0.1, 0.12, 1.9, 6, 0x5c3f20, px, 0.95, pz, { map: G.TEX.wood });
    }
    addBox(g, 3.1, 1.4, 0.14, 0x8a6a45, 0, 0.9, -1.05, 0, { roughness: 1, map: G.TEX.dirtObj });
    const roof = addCone(g, 2.6, 0.9, 4, 0xa88a4e, 0, 2.3, 0, { roughness: 1, map: G.TEX.thatch });
    roof.rotation.y = Math.PI / 4;
    roof.scale.z *= 0.8;

    addCylinder(g, 0.5, 0.62, 0.7, 8, 0x5b4a3e, -0.7, 0.35, 0.1, { roughness: 1, map: G.TEX.stone });
    const coals = addFlatCircle(g, 0.36, 0xff5a1e, -0.7, 0.72, 0.1, 8, {
        material: makeBasicMat(0xff5a1e, { transparent: true, opacity: 0.9, depthWrite: false })
    });
    G.animated.push({ type: "ember", mesh: coals, phase: randRange(0, Math.PI * 2) });
    const fire = new THREE.PointLight(0xff7a2e, 2.0, 8);
    fire.position.set(-0.7, 0.9, 0.1);
    g.add(fire);
    G.animated.push({
        type: "torch", light: fire,
        flame: addCone(g, 0.14, 0.3, 6, 0xff9a3c, -0.7, 0.85, 0.1, {
            material: makeBasicMat(0xff9a3c, { transparent: true, opacity: 0.7, depthWrite: false }),
            castShadow: false
        }),
        baseIntensity: 2.0, speed: randRange(7, 10), phase: randRange(0, Math.PI * 2)
    });

    addCylinder(g, 0.18, 0.22, 0.5, 6, 0x4a4038, 0.6, 0.25, 0.2, { roughness: 1, map: G.TEX.wood });
    addBox(g, 0.5, 0.2, 0.26, 0x3f3a36, 0.6, 0.6, 0.2, 0.2, { roughness: 0.5, metalness: 0.4 });
    addCylinder(g, 0.14, 0.17, 1.1, 6, 0x6b5a48, 1.5, 0.55, -0.7, { roughness: 1, map: G.TEX.stone });
    return g;
}

/* ------------------------------------------------------------------ 방앗간 */
export function addMillHouse(x, z, rot) {
    addMapMarker(x, z, "#7a5530", 3, "building");
    const g = groundGroup(x, z, rot);

    addHanokBody(g, 2.2, 1.8, 1.0, { wall: 0x9c7a4c, lit: rand() > 0.4 });
    addThatchRoof(g, 2.2, 1.8, 1.26, {});

    const R = 1.0;
    const wheel = new THREE.Group();
    wheel.position.set(-1.5, 0.95, 0);
    wheel.rotation.y = Math.PI / 2;
    g.add(wheel);
    addCylinder(wheel, 0.1, 0.1, 0.5, 6, 0x5c3f20, 0, 0, 0, { map: G.TEX.wood }).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spoke = addBox(wheel, 0.07, R * 2, 0.07, 0x6d4a26, 0, 0, 0, 0, { map: G.TEX.wood, castShadow: false });
        spoke.rotation.z = a;
        const paddle = addBox(wheel, 0.4, 0.28, 0.05, 0x7a5530, Math.cos(a) * R, Math.sin(a) * R, 0, 0, { map: G.TEX.wood, castShadow: false });
        paddle.rotation.z = a;
    }
    return g;
}

/* ------------------------------------------------------------------ 개울 */
export function addStream(points, width = 1.6) {
    const pts = [];
    for (let i = 0; i < points.length - 1; i++) {
        const [x1, z1] = points[i];
        const [x2, z2] = points[i + 1];
        const dist = Math.hypot(x2 - x1, z2 - z1);
        const steps = Math.max(3, Math.floor(dist / 1.2));
        for (let s2 = 0; s2 <= steps; s2++) {
            const t = s2 / steps;
            pts.push([x1 + (x2 - x1) * t, z1 + (z2 - z1) * t]);
        }
    }
    addMapShape(pts.map(([x, z]) => [x, z]), "#3a6068");

    for (const [x, z] of pts) {
        const y = terrainHeight(x, z);
        addFlatCircle(G.world, width * randRange(0.45, 0.6), 0x41505e, x, y + 0.03, z, 8, {
            material: makeBasicMat(0x41505e, { transparent: true, opacity: 0.85 })
        });
        if (rand() < 0.3) {
            const sx = x + randRange(-width, width);
            const sz = z + randRange(-width, width);
            addBlob(G.world, randRange(0.1, 0.22), pick([0x6a655e, 0x7d766c]),
                sx, terrainHeight(sx, sz) + 0.08, sz, {
                sx: randRange(1, 1.6), sy: 0.5, sz: 1.0, ry: randRange(0, Math.PI),
                roughness: 1, map: G.TEX.stone, castShadow: false
            });
        }
    }
}

/* ------------------------------------------------------------------ 논 묶음 */
export function addPaddyCluster(x, z, rot, cols = 2, rows = 1) {
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const lx = (c - (cols - 1) / 2) * 8.3;
            const lz = (r - (rows - 1) / 2) * 6.8;
            const wx = x + lx * Math.cos(rot) + lz * Math.sin(rot);
            const wz = z - lx * Math.sin(rot) + lz * Math.cos(rot);
            addRicePaddy(wx, wz, rot, 2, 2);
        }
    }
}
