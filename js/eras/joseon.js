/**
 * 3시대 — 조선 한양 외곽 마을
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, addFlatCircle, makeBasicMat, makeMat } from "../build.js";
import { addFence } from "./neolithic.js";
import { registerInteractable } from "../interaction.js";
import { addMapMarker } from "../minimap.js";
import { pick, randRange } from "../rng.js";
import { G } from "../state.js";
import { addGround, addPond, addStonePath, addTreeLine, scatterGrass, scatterStones } from "../world.js";

export function buildJoseon() {
    // 늦은 저녁. 등불 외에는 빛이 거의 없다.
    addGround(0x6b5a4a, [0x816c57, 0x54473a, 0x77654c, 0x4a443b, 0x8d7a62]);

    scatterStones(110, -30, 30, -30, 30, [0x5f5d5b, 0x716c66, 0x4f4d4c, 0x57535a]);
    scatterGrass(240, [0x4a4636, 0x3b3a2c, 0x565033, 0x333127], 3, 31);
    addTreeLine([0x3b3a49, 0x31303d, 0x454256], 34, 24, 36);

    // 마을을 가로지르는 흙길
    addStonePath(-16, 10, 12, -8, 2.2);

    // 작은 연못
    addPond(-11.5, -8.5, 3.4);

    addChoga(-9.5, 4.7, 0.35);
    addChoga(-12.5, -1.6, -0.55);
    addGiwa(1.5, 5.8, -0.25);
    addGiwa(7.7, 1.8, 0.48);

    addGovernmentGate(7.5, -6.0, 0.0);
    addFence([
        [-14.5, -5.2],
        [-13.5, 8.0],
        [10.5, 8.6],
        [13.2, -4.9]
    ]);

    addStoneWall(-4.8, -6.0, 3.0, -6.5);
    addStoneWall(3.0, 8.0, 10.5, 7.2);
    addWell(-2.2, -3.5);

    addLantern(4.6, -5.0);
    addLantern(10.3, -5.0);
    addLantern(-5.8, 2.2);
    addLantern(3.2, 3.2);

    const jangPattern = addJangseung(-8.0, 0.8, 0.28);

    const badge = createBadgeArtifact(5.7, -4.5);
    registerInteractable({
        name: "어사패",
        group: badge,
        pickup: true,
        range: 1.8,
        glowColor: 0xffd36d,
        description: "관아 입구 근처에서 어사패를 발견했습니다.\n작은 패 위의 문양은 희미하지만, 권한과 감시의 기억이 묵직하게 남아 있습니다."
    });

    const documentItem = createOldDocument(-2.2, -3.1);
    registerInteractable({
        name: "낡은 문서",
        group: documentItem,
        pickup: true,
        range: 1.8,
        glowColor: 0xffe0a0,
        description: "우물 옆 낮은 탁자에서 낡은 문서를 회수했습니다.\n먹이 번진 줄 사이로 외곽 마을의 세금, 길, 사람들의 이름이 흐릿하게 이어집니다."
    });

    registerInteractable({
        name: "장승의 문양",
        group: jangPattern,
        pickup: false,
        range: 2.0,
        glowColor: 0x9fe0ff,
        description: "장승에 새겨진 문양을 조사했습니다.\n마을을 지키던 나무 표식은 밤길과 사람들의 두려움을 조용히 받아내고 있었습니다."
    });
}

export function addChoga(x, z, rot) {
    addMapMarker(x, z, "#9c8350", 3, "building");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    G.world.add(g);

    addBox(g, 2.25, 1.05, 1.65, 0xc79d6a, 0, 0.53, 0, 0, { roughness: 1 });
    const roof = addCone(g, 1.70, 0.88, 4, 0xb68845, 0, 1.35, 0, { roughness: 1 });
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.78;
    addBox(g, 0.52, 0.65, 0.08, 0x36241a, 0, 0.43, 0.84);
}

export function addGiwa(x, z, rot) {
    addMapMarker(x, z, "#6c6470", 3.5, "building");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    G.world.add(g);

    addBox(g, 2.65, 1.18, 1.95, 0xb99d7a, 0, 0.59, 0, 0, { roughness: 1 });
    const roof = addCone(g, 1.95, 0.72, 4, 0x2e3542, 0, 1.55, 0, { roughness: 0.8 });
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.78;
    addCylinderBetween(g, new THREE.Vector3(-1.05, 1.88, 0), new THREE.Vector3(1.05, 1.88, 0), 0.055, 0x1f2430);
    addBox(g, 0.58, 0.72, 0.08, 0x322019, 0, 0.46, 1.0);
}

export function addGovernmentGate(x, z, rot) {
    addMapMarker(x, z, "#b0553a", 4, "building");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    G.world.add(g);

    addBox(g, 0.42, 1.75, 0.42, 0x5b3026, -1.0, 0.88, 0);
    addBox(g, 0.42, 1.75, 0.42, 0x5b3026, 1.0, 0.88, 0);
    addBox(g, 2.65, 0.30, 0.52, 0x3b2b29, 0, 1.78, 0);
    const roof = addCone(g, 1.62, 0.55, 4, 0x2d3341, 0, 2.08, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.44;
    addBox(g, 1.05, 0.34, 0.08, 0x84623b, 0, 1.43, 0.28);
}

export function addStoneWall(x1, z1, x2, z2) {
    const n = 13;
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = x1 + (x2 - x1) * t + randRange(-0.12, 0.12);
        const z = z1 + (z2 - z1) * t + randRange(-0.12, 0.12);

        addBlob(G.world, randRange(0.18, 0.32), pick([0x696461, 0x77716c, 0x555250]),
            x, randRange(0.16, 0.32), z,
            { sx: 1.25, sy: 0.55, sz: 0.85, ry: randRange(0, Math.PI) }
        );
    }
}

export function addWell(x, z) {
    addMapMarker(x, z, "#5b6b74", 2.5, "prop");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    G.world.add(g);

    addCylinder(g, 0.78, 0.78, 0.55, 12, 0x716a62, 0, 0.28, 0, { roughness: 1 });
    addFlatCircle(g, 0.54, 0x15191f, 0, 0.57, 0, 12, {
        material: makeBasicMat(0x15191f, { transparent: true, opacity: 0.88, side: THREE.DoubleSide })
    });
    addCylinderBetween(g, new THREE.Vector3(-0.75, 1.05, 0), new THREE.Vector3(0.75, 1.05, 0), 0.055, 0x4d3320);
    addCylinder(g, 0.05, 0.06, 1.0, 6, 0x4d3320, -0.75, 0.55, 0);
    addCylinder(g, 0.05, 0.06, 1.0, 6, 0x4d3320, 0.75, 0.55, 0);
}

export function addLantern(x, z) {
    addMapMarker(x, z, "#d99a3c", 2, "prop");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    G.world.add(g);

    addCylinder(g, 0.04, 0.055, 1.25, 6, 0x3c271b, 0, 0.63, 0);
    addBox(g, 0.36, 0.42, 0.36, 0xffa84e, 0, 1.30, 0, 0, {
        material: makeBasicMat(0xffa84e, {
            transparent: true,
            opacity: 0.78
        }),
        castShadow: false,
        receiveShadow: false
    });

    const flame = addCone(g, 0.13, 0.28, 7, 0xffc45f, 0, 1.32, 0, {
        material: makeBasicMat(0xffc45f, { transparent: true, opacity: 0.95 }),
        castShadow: false,
        receiveShadow: false
    });

    const light = new THREE.PointLight(0xffb066, 2.3, 11);
    light.position.set(0, 1.25, 0);
    g.add(light);

    G.animated.push({
        type: "lantern",
        flame,
        light,
        baseIntensity: 2.3,
        speed: randRange(4.5, 6.0),
        phase: randRange(0, Math.PI * 2)
    });
}

export function addJangseung(x, z, rot) {
    addMapMarker(x, z, "#8a6a3f", 2.5, "prop");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    G.world.add(g);

    addCylinder(g, 0.22, 0.28, 1.65, 7, 0x5b3722, 0, 0.83, 0, { roughness: 1 });
    addBlob(g, 0.33, 0x6a3f28, 0, 1.78, 0, { sx: 0.85, sy: 1.12, sz: 0.75 });
    addCone(g, 0.36, 0.30, 7, 0x3b261a, 0, 2.17, 0);

    // 얼굴
    addBox(g, 0.055, 0.055, 0.04, 0x14100d, -0.10, 1.83, 0.25);
    addBox(g, 0.055, 0.055, 0.04, 0x14100d, 0.10, 1.83, 0.25);
    addBox(g, 0.26, 0.04, 0.045, 0x14100d, 0, 1.68, 0.25);

    // 조사 대상인 장승 문양만 별도 그룹으로 반환
    const pattern = new THREE.Group();
    pattern.position.set(0, 1.17, 0.26);
    g.add(pattern);

    const pmat = makeMat(0x74d6ff, {
        emissive: 0x1d8db6,
        emissiveIntensity: 0.7,
        roughness: 0.5
    });
    addBox(pattern, 0.34, 0.04, 0.045, 0x74d6ff, 0, 0.08, 0, 0, { material: pmat });
    addBox(pattern, 0.04, 0.34, 0.045, 0x74d6ff, 0, 0.08, 0, 0, { material: pmat });
    addBox(pattern, 0.24, 0.035, 0.045, 0x74d6ff, 0, -0.08, 0, 0.75, { material: pmat });

    return pattern;
}

export function createBadgeArtifact(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.05, z);
    g.rotation.y = -0.25;
    G.world.add(g);

    addBox(g, 0.72, 0.16, 0.54, 0x5a3c24, 0, 0.08, 0);
    const gold = makeMat(0xc99b4f, {
        metalness: 0.15,
        roughness: 0.55,
        emissive: 0x241200,
        emissiveIntensity: 0.08
    });
    addCylinder(g, 0.27, 0.27, 0.07, 8, 0xc99b4f, 0, 0.21, 0, { material: gold });
    addBox(g, 0.28, 0.035, 0.05, 0x704b24, 0, 0.26, 0.01);

    return g;
}

export function createOldDocument(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.05, z);
    g.rotation.y = 0.18;
    G.world.add(g);

    addBox(g, 1.10, 0.16, 0.72, 0x5b3925, 0, 0.08, 0);
    addBox(g, 0.92, 0.035, 0.55, 0xd9c39a, 0, 0.19, 0, 0, { roughness: 1 });

    addCylinderBetween(g, new THREE.Vector3(-0.50, 0.24, -0.28), new THREE.Vector3(0.50, 0.24, -0.28), 0.035, 0xb69662);
    addCylinderBetween(g, new THREE.Vector3(-0.50, 0.24, 0.28), new THREE.Vector3(0.50, 0.24, 0.28), 0.035, 0xb69662);

    for (let i = 0; i < 4; i++) {
        addBox(g, 0.60 - i * 0.07, 0.012, 0.025, 0x5b4232, -0.05, 0.215, -0.16 + i * 0.10);
    }

    return g;
}
