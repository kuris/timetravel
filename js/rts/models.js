/**
 * models.js — RTS 가 쓰는 모형
 *
 * 유닛(사람 · 말 탄 사람 · 짐승), 진영 깃발, 선택 고리, 체력 막대,
 * 그리고 시대 빌더에 없는 건물(병영 · 활터 · 저장고 · 성벽)을 만든다.
 *
 * 모든 모형은 기본 도형 조합이다. 외부 에셋은 쓰지 않는다.
 */
import {
    addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle,
    makeBasicMat, makeMat
} from "../build.js";
import { addRicePaddy } from "../eras/bronze.js";
import { addStoragePit as propStoragePit, addJarPlatform as propJarPlatform } from "../props.js";
import { pick, rand, randRange } from "../rng.js";
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { TEAM } from "./defs.js";

/* -------------------------------------------------------------- 공용 */

/** 시대별 지붕 / 벽 색 (일반 건물용) */
const ERA_TONE = [
    { wall: 0x9a6d40, roof: 0xc9a45f, wood: 0x5e4423, accent: 0x7a5734 },
    { wall: 0x9b7146, roof: 0xb98f4e, wood: 0x66421f, accent: 0x84603a },
    { wall: 0xa38352, roof: 0x6f6a64, wood: 0x5d3f21, accent: 0x8c6e45 },
    { wall: 0xcfc5ae, roof: 0x5a5550, wood: 0x4d3620, accent: 0x7d6a52 },
    { wall: 0xc8bda8, roof: 0x8a8378, wood: 0x66421f, accent: 0x9a8f7c },
    { wall: 0xbdb7ac, roof: 0x7a746c, wood: 0x5c4630, accent: 0x8f8a80 }
];

export function eraTone(age) {
    return ERA_TONE[Math.max(0, Math.min(5, age))];
}

/** 진영을 알리는 깃대. 깃폭은 빛을 받지 않아 밤에도 같은 밝기로 보인다. */
export function addTeamFlag(parent, owner, x, y, z, h = 1.9) {
    const col = TEAM[owner].color;
    addCylinder(parent, 0.035, 0.045, h, 5, 0x4a3a24, x, y + h * 0.5, z, { castShadow: false });
    const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.38),
        makeBasicMat(col, { side: THREE.DoubleSide, fog: false })
    );
    flag.position.set(x + 0.32, y + h - 0.24, z);
    flag.rotation.y = Math.PI / 4;
    parent.add(flag);
    return flag;
}

/** 선택 고리 — 발밑에 깔리는 밝은 원 */
export function makeSelectRing(radius, owner) {
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.86, radius, 20),
        makeBasicMat(TEAM[owner].color, {
            transparent: true, opacity: 0.95, side: THREE.DoubleSide,
            depthWrite: false, fog: false
        })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.045;
    ring.visible = false;
    ring.renderOrder = 3;
    return ring;
}

/** 진영 표시 점 — 발밑의 작은 원판 (AoE 의 플레이어 색) */
export function makeTeamDisc(radius, owner) {
    const disc = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 14),
        makeBasicMat(TEAM[owner].color, {
            transparent: true, opacity: 0.55, side: THREE.DoubleSide,
            depthWrite: false, fog: false
        })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.03;
    disc.renderOrder = 2;
    return disc;
}

/** 체력 막대 — 카메라가 돌지 않으므로 고정 방향 판 두 장이면 된다 */
export function makeHpBar(width, y) {
    const g = new THREE.Group();
    g.position.y = y;

    const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(width, 0.13),
        makeBasicMat(0x1a1410, { fog: false, depthTest: false, transparent: true, opacity: 0.85 })
    );
    bg.renderOrder = 10;
    g.add(bg);

    const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(width - 0.04, 0.09),
        makeBasicMat(0x5fbf5a, { fog: false, depthTest: false, transparent: true })
    );
    fill.position.z = 0.01;
    fill.renderOrder = 11;
    g.add(fill);

    g.userData = { fill, width: width - 0.04 };
    g.visible = false;
    return g;
}

/** 체력 막대 갱신 */
export function setHpBar(bar, ratio) {
    const { fill, width } = bar.userData;
    const r = Math.max(0, Math.min(1, ratio));
    fill.scale.x = Math.max(0.001, r);
    fill.position.x = -(width * (1 - r)) * 0.5;
    fill.material.color.setHex(r > 0.6 ? 0x5fbf5a : r > 0.3 ? 0xd8b03c : 0xc2452f);
}

/* -------------------------------------------------------------- 사람 */

const SKIN = [0xd8a877, 0xc99a68, 0xe0b184];

/**
 * 유닛 한 사람.
 * userData 에 팔다리를 담아 두어 걷기/일하기 동작을 붙일 수 있게 한다.
 */
export function makePerson(def, owner) {
    const g = new THREE.Group();
    const team = TEAM[owner];
    const cloth = def.animal ? 0x7a6444 : team.color;

    const body = new THREE.Group();
    body.position.y = 0.30;
    g.add(body);

    const skin = pick(SKIN);

    // 몸통 — 진영 색 옷
    addCylinder(body, 0.17, 0.23, 0.42, 6, cloth, 0, 0.21, 0, { map: G.TEX.cloth });
    // 어깨 아래로 진영색을 한 번 더 (멀리서도 편이 구분되게)
    addCylinder(body, 0.185, 0.195, 0.10, 6, team.dark, 0, 0.40, 0, { map: G.TEX.cloth });
    addCylinder(body, 0.055, 0.065, 0.06, 5, skin, 0, 0.46, 0);
    addBlob(body, 0.14, skin, 0, 0.56, 0, { sy: 1.1, sx: 0.94, sz: 0.94 });
    // 머리카락
    addBlob(body, 0.135, 0x2b1d12, 0, 0.60, -0.015, { sy: 0.72, sx: 0.98, sz: 0.98 });

    const arm = (side) => {
        const a = new THREE.Group();
        a.position.set(side * 0.19, 0.40, 0);
        body.add(a);
        addCylinder(a, 0.05, 0.055, 0.34, 5, cloth, 0, -0.17, 0, { castShadow: false });
        addBlob(a, 0.055, skin, 0, -0.36, 0, { castShadow: false });
        return a;
    };
    const armL = arm(-1), armR = arm(1);

    const leg = (side) => {
        const l = new THREE.Group();
        l.position.set(side * 0.08, 0.30, 0);
        g.add(l);
        addCylinder(l, 0.06, 0.07, 0.30, 5, 0x50412c, 0, -0.15, 0, { castShadow: false });
        return l;
    };
    const legL = leg(-1), legR = leg(1);

    // 무기 / 연장
    let weapon = null;
    const wk = def.key;
    if (wk === "villager") {
        weapon = new THREE.Group();
        armR.add(weapon);
        weapon.position.set(0, -0.30, 0.06);
        addCylinder(weapon, 0.025, 0.028, 0.52, 5, 0x6b4a2c, 0, 0, 0, { castShadow: false });
        addBox(weapon, 0.19, 0.11, 0.05, 0x8d8579, 0, 0.24, 0.02, 0, { castShadow: false });
    } else if (wk === "clubman") {
        weapon = new THREE.Group();
        armR.add(weapon);
        weapon.position.set(0, -0.30, 0.05);
        addCylinder(weapon, 0.03, 0.045, 0.54, 5, 0x5c4028, 0, 0, 0, { castShadow: false });
        addBlob(weapon, 0.09, 0x807a70, 0, 0.28, 0, { castShadow: false });
    } else if (wk === "axeman") {
        weapon = new THREE.Group();
        armR.add(weapon);
        weapon.position.set(0, -0.30, 0.05);
        addCylinder(weapon, 0.026, 0.03, 0.56, 5, 0x5c4028, 0, 0, 0, { castShadow: false });
        addBox(weapon, 0.22, 0.16, 0.035, 0xa9843f, 0.08, 0.26, 0, 0, { castShadow: false });
    } else if (wk === "spearman") {
        weapon = new THREE.Group();
        armR.add(weapon);
        weapon.position.set(0, -0.28, 0.05);
        addCylinder(weapon, 0.022, 0.024, 1.15, 5, 0x6b4a2c, 0, 0.18, 0, { castShadow: false });
        addCone(weapon, 0.05, 0.22, 5, 0xb9b0a0, 0, 0.83, 0, { castShadow: false });
        // 방패
        const sh = addCylinder(g, 0.21, 0.21, 0.05, 8, team.dark, -0.26, 0.56, 0.05, { castShadow: false });
        sh.rotation.x = Math.PI / 2;
    } else if (wk === "archer" || wk === "crossbow") {
        weapon = new THREE.Group();
        armL.add(weapon);
        weapon.position.set(0, -0.30, 0.04);
        const bow = addCylinder(weapon, 0.02, 0.02, wk === "archer" ? 0.66 : 0.5, 5,
            0x6b4a2c, 0, 0, 0, { castShadow: false });
        bow.rotation.z = 0.25;
        if (wk === "crossbow") {
            const cross = addBox(weapon, 0.34, 0.04, 0.05, 0x5c4028, 0, 0.02, 0.04, 0, { castShadow: false });
            cross.rotation.z = 0.1;
        }
        // 등에 멘 화살통
        addCylinder(g, 0.055, 0.06, 0.3, 5, 0x6b5636, 0.13, 0.62, -0.13, { castShadow: false });
    }

    let mount = null;
    if (def.mounted) {
        // 말: 몸통 위에 사람을 올린다
        mount = new THREE.Group();
        g.add(mount);
        addBlob(mount, 0.36, 0x6b4a30, 0, 0.54, 0, { sx: 1.5, sy: 0.82, sz: 0.72 });
        addBlob(mount, 0.15, 0x6b4a30, 0, 0.72, 0.42, { sx: 0.8, sy: 1.0, sz: 0.9 });
        addCylinder(mount, 0.06, 0.07, 0.5, 5, 0x5a3f28, 0, 0.26, 0.28, { castShadow: false });
        addCylinder(mount, 0.06, 0.07, 0.5, 5, 0x5a3f28, 0, 0.26, -0.28, { castShadow: false });
        addCylinder(mount, 0.06, 0.07, 0.5, 5, 0x5a3f28, 0.18, 0.26, 0.2, { castShadow: false });
        addCylinder(mount, 0.06, 0.07, 0.5, 5, 0x5a3f28, -0.18, 0.26, -0.2, { castShadow: false });
        body.position.y = 0.78;
        legL.visible = false;
        legR.visible = false;
    }

    g.userData = { body, armL, armR, legL, legR, weapon, mount, walk: rand() * 6 };
    return g;
}

/** 짐승 (사슴 · 멧돼지) */
export function makeAnimal(def) {
    const g = new THREE.Group();
    const boar = def.key === "boar";
    const col = boar ? 0x4a3a2c : 0x8a6a45;

    const body = new THREE.Group();
    body.position.y = boar ? 0.42 : 0.62;
    g.add(body);

    addBlob(body, boar ? 0.34 : 0.32, col, 0, 0, 0, { sx: 1.5, sy: 0.9, sz: 0.78 });
    const head = addBlob(body, 0.15, col, 0, boar ? 0.04 : 0.18, 0.42,
        { sx: 0.9, sy: 0.9, sz: 1.1 });

    if (!boar) {
        // 뿔
        addCylinderBetween(body,
            new THREE.Vector3(0.07, 0.28, 0.42), new THREE.Vector3(0.16, 0.56, 0.3),
            0.022, 0x6b5636, { castShadow: false });
        addCylinderBetween(body,
            new THREE.Vector3(-0.07, 0.28, 0.42), new THREE.Vector3(-0.16, 0.56, 0.3),
            0.022, 0x6b5636, { castShadow: false });
    } else {
        addCone(body, 0.05, 0.14, 5, 0xded6c4, 0.08, 0.02, 0.56, { castShadow: false });
        addCone(body, 0.05, 0.14, 5, 0xded6c4, -0.08, 0.02, 0.56, { castShadow: false });
    }

    const legs = [];
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const l = new THREE.Group();
        l.position.set(sx * 0.16, boar ? 0.34 : 0.5, sz * 0.26);
        g.add(l);
        addCylinder(l, 0.045, 0.05, boar ? 0.34 : 0.5, 5, col, 0, boar ? -0.17 : -0.25, 0,
            { castShadow: false });
        legs.push(l);
    }

    g.userData = { body, head, legs, walk: rand() * 6 };
    return g;
}

/** 화살 */
export function makeArrow() {
    const g = new THREE.Group();
    const shaft = addCylinder(g, 0.016, 0.016, 0.52, 4, 0x6b4a2c, 0, 0, 0,
        { castShadow: false, receiveShadow: false });
    shaft.rotation.z = Math.PI / 2;
    addCone(g, 0.035, 0.1, 4, 0xb9b0a0, 0.3, 0, 0, { castShadow: false, receiveShadow: false })
        .rotation.z = -Math.PI / 2;
    return g;
}

/* ------------------------------------------------------------ 자원 모형 */

/** 나무 한 그루 (벌목 대상) */
export function makeTree(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = randRange(0, Math.PI * 2);

    const h = randRange(2.4, 3.6);
    const trunkH = h * 0.36;
    addCylinder(g, 0.11, 0.17, trunkH, 5, 0x3d2c1c, 0, trunkH * 0.5, 0,
        { roughness: 1, map: G.TEX.wood });

    const col = pick([0x4e5c34, 0x5f6b38, 0x44522e, 0x6a7140]);
    const blobs = Math.floor(randRange(3, 5));
    for (let b = 0; b < blobs; b++) {
        addBlob(g, randRange(0.5, 0.8), col,
            randRange(-0.3, 0.3),
            trunkH + h * 0.26 + b * randRange(0.26, 0.4),
            randRange(-0.3, 0.3), {
            sx: randRange(1.0, 1.5), sy: randRange(0.7, 1.05), sz: randRange(1.0, 1.5),
            ry: randRange(0, Math.PI), roughness: 1, receiveShadow: false
        });
    }
    return g;
}

/** 나무가 베인 자리에 남는 그루터기 */
export function makeStump(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    addCylinder(g, 0.17, 0.2, 0.26, 6, 0x4a3524, 0, 0.13, 0,
        { roughness: 1, map: G.TEX.wood, castShadow: false });
    addFlatCircle(g, 0.19, 0x7a5c3a, 0, 0.27, 0, 8, { castShadow: false });
    return g;
}

/** 산딸기 덤불 (식량) */
export function makeBerryBush(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);

    for (let i = 0; i < 4; i++) {
        addBlob(g, randRange(0.3, 0.44), 0x4a5e34,
            randRange(-0.3, 0.3), randRange(0.24, 0.4), randRange(-0.3, 0.3),
            { sy: 0.8, ry: rand() * 3, roughness: 1, receiveShadow: false });
    }
    // 붉은 열매
    for (let i = 0; i < 9; i++) {
        addBlob(g, 0.055, 0xa83a3a,
            randRange(-0.42, 0.42), randRange(0.3, 0.62), randRange(-0.42, 0.42),
            { castShadow: false, receiveShadow: false });
    }
    return g;
}

/** 돌 광산 */
export function makeStoneMine(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);

    for (let i = 0; i < 6; i++) {
        const r = randRange(0.3, 0.55);
        addBlob(g, r, pick([0x8d8579, 0x736c63, 0x9a938a]),
            randRange(-0.7, 0.7), r * 0.55, randRange(-0.7, 0.7), {
            sx: randRange(1, 1.5), sy: randRange(0.7, 1.1), sz: randRange(0.9, 1.4),
            ry: rand() * 3, roughness: 1, map: G.TEX.stone
        });
    }
    return g;
}

/** 금 광산 — 돌 사이에 노란 광맥이 박혀 있다 */
export function makeGoldMine(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);

    for (let i = 0; i < 5; i++) {
        const r = randRange(0.3, 0.5);
        addBlob(g, r, pick([0x7d766a, 0x6a645a]),
            randRange(-0.6, 0.6), r * 0.55, randRange(-0.6, 0.6), {
            sx: randRange(1, 1.4), sy: randRange(0.7, 1.1), sz: randRange(0.9, 1.3),
            ry: rand() * 3, roughness: 1, map: G.TEX.stone
        });
    }
    for (let i = 0; i < 7; i++) {
        addBlob(g, randRange(0.07, 0.12), 0xd8a93c,
            randRange(-0.6, 0.6), randRange(0.16, 0.5), randRange(-0.6, 0.6),
            { emissive: 0x5a4210, emissiveIntensity: 0.35, castShadow: false });
    }
    return g;
}

/** 무너진 건물 자리 */
export function makeRubble(x, z, radius) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);

    addFlatCircle(g, radius * 0.9, 0x2e2520, 0, 0.025, 0, 12, {
        material: makeMat(0x2e2520, {
            transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false
        })
    });
    for (let i = 0; i < 7; i++) {
        const r = randRange(0.12, 0.3);
        addBlob(g, r, pick([0x6a645a, 0x574f46, 0x7a6a56]),
            randRange(-radius * 0.7, radius * 0.7), r * 0.5,
            randRange(-radius * 0.7, radius * 0.7),
            { sy: 0.6, ry: rand() * 3, roughness: 1, castShadow: false });
    }
    return g;
}

/* ------------------------------------------------------------ 건물 모형 */

/** 병영 — 무기 걸이가 선 긴 집 */
export function addBarracksHut(x, z, rot, age) {
    const t = eraTone(age);
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot || 0;
    G.world.add(g);

    addFlatCircle(g, 2.5, t.accent, 0, 0.026, 0, 14, {
        material: makeMat(t.accent, {
            transparent: true, opacity: 0.5, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1
        })
    });

    // 몸채
    addBox(g, 3.5, 1.3, 2.3, t.wall, 0, 0.65, 0, 0, { map: G.TEX.dirtObj, roughness: 1 });

    // 지붕 — 두 면을 기울여 맞댄다
    for (const s of [-1, 1]) {
        const roof = addBox(g, 3.8, 0.13, 1.5, t.roof, 0, 1.62, s * 0.62, 0,
            { map: age >= 3 ? G.TEX.stone : G.TEX.thatch, roughness: 1 });
        roof.rotation.x = s * 0.62;
    }
    addBox(g, 3.9, 0.12, 0.2, t.wood, 0, 1.98, 0, 0, { map: G.TEX.wood });

    // 기둥
    for (const sx of [-1.6, 1.6]) {
        for (const sz of [-1.05, 1.05]) {
            addCylinder(g, 0.1, 0.12, 1.3, 5, t.wood, sx, 0.65, sz, { map: G.TEX.wood });
        }
    }

    // 무기 걸이
    const rack = new THREE.Group();
    rack.position.set(0, 0, 1.9);
    g.add(rack);
    addCylinder(rack, 0.05, 0.06, 1.1, 5, t.wood, -0.7, 0.55, 0, { map: G.TEX.wood });
    addCylinder(rack, 0.05, 0.06, 1.1, 5, t.wood, 0.7, 0.55, 0, { map: G.TEX.wood });
    addBox(rack, 1.6, 0.08, 0.08, t.wood, 0, 1.05, 0, 0, { map: G.TEX.wood });
    for (let i = 0; i < 4; i++) {
        const sp = addCylinder(rack, 0.022, 0.025, 1.5, 4, 0x6b4a2c,
            -0.55 + i * 0.37, 0.7, 0.06, { castShadow: false });
        sp.rotation.x = 0.16;
        addCone(rack, 0.05, 0.18, 4, 0xb9b0a0, -0.55 + i * 0.37, 1.48, -0.06,
            { castShadow: false });
    }
    return g;
}

/** 활터 — 짚 과녁이 늘어선 마당 */
export function addArcheryRange(x, z, rot, age) {
    const t = eraTone(age);
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot || 0;
    G.world.add(g);

    addFlatCircle(g, 2.6, t.accent, 0, 0.026, 0, 14, {
        material: makeMat(t.accent, {
            transparent: true, opacity: 0.45, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1
        })
    });

    // 지붕만 있는 사대(射臺)
    addBox(g, 2.8, 0.25, 1.6, t.wood, 0, 0.13, -1.0, 0, { map: G.TEX.wood });
    for (const sx of [-1.25, 1.25]) {
        for (const sz of [-1.6, -0.4]) {
            addCylinder(g, 0.08, 0.1, 1.7, 5, t.wood, sx, 0.85, sz, { map: G.TEX.wood });
        }
    }
    const roof = addBox(g, 3.1, 0.14, 2.0, t.roof, 0, 1.78, -1.0, 0,
        { map: age >= 3 ? G.TEX.stone : G.TEX.thatch, roughness: 1 });
    roof.rotation.x = 0.1;

    // 활 걸이
    addBox(g, 2.2, 0.07, 0.07, t.wood, 0, 1.05, -0.35, 0, { map: G.TEX.wood });
    for (let i = 0; i < 3; i++) {
        const bow = addCylinder(g, 0.022, 0.022, 0.8, 5, 0x6b4a2c,
            -0.6 + i * 0.6, 0.72, -0.3, { castShadow: false });
        bow.rotation.z = 0.2;
    }

    // 과녁 둘
    for (const sx of [-1.0, 1.0]) {
        const tg = new THREE.Group();
        tg.position.set(sx, 0, 1.7);
        g.add(tg);
        addCylinder(tg, 0.52, 0.52, 0.22, 12, 0xc7b184, 0, 0.62, 0,
            { map: G.TEX.thatch, roughness: 1 }).rotation.x = Math.PI / 2;
        addFlatCircle(tg, 0.2, 0xa83a3a, 0, 0.62, 0.13, 10, { castShadow: false })
            .rotation.set(0, 0, 0);
        addCylinder(tg, 0.06, 0.07, 0.62, 5, t.wood, 0, 0.31, -0.06, { map: G.TEX.wood });
    }
    return g;
}

/** 저장고 — 통나무와 돌을 쌓아 둔 마당 */
export function addLumberCamp(x, z, rot, age) {
    const t = eraTone(age);
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot || 0;
    G.world.add(g);

    addFlatCircle(g, 2.0, t.accent, 0, 0.026, 0, 12, {
        material: makeMat(t.accent, {
            transparent: true, opacity: 0.5, side: THREE.DoubleSide,
            depthWrite: false, roughness: 1
        })
    });

    // 지붕만 얹은 헛간
    for (const sx of [-1.1, 1.1]) {
        for (const sz of [-0.8, 0.8]) {
            addCylinder(g, 0.08, 0.1, 1.35, 5, t.wood, sx, 0.67, sz, { map: G.TEX.wood });
        }
    }
    const roof = addBox(g, 2.8, 0.16, 2.2, t.roof, 0, 1.42, 0, 0,
        { map: age >= 4 ? G.TEX.stone : G.TEX.thatch, roughness: 1 });
    roof.rotation.x = 0.12;

    // 쌓인 통나무
    for (let i = 0; i < 3; i++) {
        const log = addCylinder(g, 0.15, 0.15, 1.8, 6, 0x5c4028,
            -0.5, 0.16 + i * 0.28, -0.3 + (i % 2) * 0.22,
            { map: G.TEX.wood, roughness: 1 });
        log.rotation.z = Math.PI / 2;
    }
    // 쌓인 돌
    for (let i = 0; i < 5; i++) {
        addBlob(g, randRange(0.14, 0.24), pick([0x8d8579, 0x736c63]),
            randRange(0.4, 1.0), 0.14, randRange(-0.6, 0.6),
            { sy: 0.7, ry: rand() * 3, roughness: 1, map: G.TEX.stone, castShadow: false });
    }
    return g;
}

/** 성벽 한 칸 — 시대에 따라 나무 울 → 토성 → 돌담 → 콘크리트 */
export function addWallBlock(x, z, rot, age) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot || 0;
    G.world.add(g);

    if (age <= 1) {
        // 목책
        for (let i = -1; i <= 1; i++) {
            const h = randRange(1.5, 1.8);
            const post = addCylinder(g, 0.11, 0.13, h, 5, 0x6b4a2c, i * 0.62, h * 0.5, 0,
                { map: G.TEX.wood, roughness: 1 });
            post.rotation.z = randRange(-0.04, 0.04);
            addCone(g, 0.12, 0.2, 5, 0x5c4028, i * 0.62, h + 0.08, 0, { castShadow: false });
        }
        addBox(g, 1.9, 0.1, 0.1, 0x5c4028, 0, 1.15, 0.1, 0, { map: G.TEX.wood });
    } else if (age <= 3) {
        // 돌담
        addBox(g, 1.9, 1.5, 0.7, 0x7d766a, 0, 0.75, 0, 0, { map: G.TEX.stone, roughness: 1 });
        for (let i = 0; i < 3; i++) {
            addBox(g, 0.5, 0.26, 0.8, 0x8d8579, -0.6 + i * 0.6, 1.62, 0, 0,
                { map: G.TEX.stone, roughness: 1 });
        }
    } else {
        // 시멘트 블록 담
        addBox(g, 1.9, 1.7, 0.45, 0xb0aba2, 0, 0.85, 0, 0, { map: G.TEX.stone, roughness: 1 });
        addBox(g, 2.0, 0.14, 0.6, 0x9a938a, 0, 1.78, 0, 0, { map: G.TEX.stone, roughness: 1 });
    }
    return g;
}

/* ------------------------------------- 기존 소품을 RTS 규격으로 감싼 것 */

export function addStoragePit(x, z, rot) {
    const g = propStoragePit(x, z);
    if (g && rot) g.rotation.y = rot;
    return g;
}

export function addJarPlatform(x, z, rot) {
    return propJarPlatform(x, z, rot || 0);
}

/** 농장 — 논 한 배미 */
export function addRicePaddyPlot(x, z, rot) {
    return addRicePaddy(x, z, rot || 0, 2, 2);
}

/** 사냥한 짐승 — 고기 더미 */
export function makeCarcass(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    for (let i = 0; i < 4; i++) {
        addBlob(g, randRange(0.18, 0.3), pick([0x7a4a3a, 0x8a5a44, 0x6b4030]),
            randRange(-0.3, 0.3), randRange(0.1, 0.26), randRange(-0.3, 0.3),
            { sy: 0.7, ry: rand() * 3, roughness: 1, castShadow: false });
    }
    return g;
}
