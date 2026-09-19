/**
 * 2시대 — 청동기 고인돌 제단
 */
import { addBlob, addBox, addCone, addCylinder, addCylinderBetween, makeBasicMat, makeMat } from "../build.js";
import { addFirewood, addStonePile, createTimeGate } from "./neolithic.js";
import { registerInteractable } from "../interaction.js";
import { addMapMarker } from "../minimap.js";
import { randRange } from "../rng.js";
import { G } from "../state.js";
import { addGround, addStonePath, addTreeLine, scatterGrass, scatterStones } from "../world.js";

export function buildBronze() {
    // 황토 언덕. 강은 없지만 돌길과 제단이 중심이 된다.
    addGround(0x8e6b43, [0xb08653, 0x7d6039, 0xa47c48, 0x63513a, 0xc9a26c]);

    scatterStones(150, -30, 30, -30, 30, [0x786d62, 0x635b55, 0x8b8072, 0x6e6455]);
    scatterGrass(260, [0x7c6c3a, 0x635a30, 0x8d7a45, 0x544d2b], 3, 31);
    addTreeLine([0x6a603c, 0x5a5131, 0x776b45], 34, 26, 36);

    // 제단으로 이어지는 돌길
    addStonePath(0, 16, 0, 6.5, 1.5);

    addDolmen(-8.5, -2.6, 1.1, 0.5);
    addDolmen(7.5, -2.2, 0.95, -0.4);
    addDolmen(-2.0, 9.2, 1.15, 0.15);
    addDolmen(12.0, 6.2, 0.8, 0.8);
    addDolmen(-12.0, 6.8, 0.75, -0.7);

    addStonePillar(-4.2, 2.5, 2.2);
    addStonePillar(4.2, 2.5, 2.0);
    addStonePillar(-3.4, 6.1, 1.75);
    addStonePillar(3.4, 6.1, 1.85);

    addBronzeAltar(0, 4.0);

    addTorch(-2.4, 2.0);
    addTorch(2.4, 2.0);
    addTorch(-2.6, 6.1);
    addTorch(2.6, 6.1);

    const dagger = createBronzeDaggerFragment(-5.3, 0.8);
    registerInteractable({
        name: "비파형 동검 조각",
        group: dagger,
        pickup: true,
        range: 1.8,
        glowColor: 0xffc35d,
        description: "흙 속에서 비파형 동검 조각을 찾았습니다.\n얇은 청동 표면은 녹이 슬었지만, 제의의 빛을 머금은 형태가 남아 있습니다."
    });

    const bell = createBronzeBellArtifact(5.3, -4.4);
    registerInteractable({
        name: "청동 방울",
        group: bell,
        pickup: true,
        range: 1.9,
        glowColor: 0xffbd5f,
        description: "작은 틀에 걸린 청동 방울을 조사했습니다.\n움직이지 않아도 아주 낮은 울림이 귀 뒤쪽에서 번지는 듯합니다."
    });

    // 제단 주변의 돌무더기와 장작
    addStonePile(-9.6, 3.4);
    addStonePile(10.4, -5.2);
    addFirewood(-1.8, -3.2);
    addFirewood(2.2, 8.6);

    const pattern = createAltarPattern(0, 4.0);
    registerInteractable({
        name: "제단 문양",
        group: pattern,
        pickup: false,
        range: 2.0,
        glowColor: 0x8ee6ff,
        description: "제단 위의 문양을 손끝으로 따라 읽었습니다.\n동심원과 번개 모양 선이 하늘, 조상, 마을을 잇는 길처럼 배치되어 있습니다."
    });

    // 다음 시대로 이어지는 시간의 문
    G.activeGate = createTimeGate(13.5, 12.5, -Math.PI / 6);
}

export function addDolmen(x, z, s, rot) {
    addMapMarker(x, z, "#8a8174", 3, "building");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    g.rotation.y = rot;
    G.world.add(g);

    addBox(g, 0.6, 1.35, 0.75, 0x6d6861, -0.72, 0.68, 0, 0.08, { roughness: 1 });
    addBox(g, 0.6, 1.25, 0.75, 0x787069, 0.72, 0.63, 0, -0.06, { roughness: 1 });
    addBox(g, 2.35, 0.42, 1.25, 0x817870, 0, 1.47, 0, 0.02, { roughness: 1 });
}

export function addStonePillar(x, z, h) {
    addMapMarker(x, z, "#7d766c", 2, "prop");
    const p = addCylinder(G.world, 0.30, 0.42, h, 5, 0x736a60, x, h * 0.5, z, { roughness: 1 });
    p.rotation.y = randRange(0, Math.PI);
    addBlob(G.world, 0.38, 0x82776c, x, h + 0.15, z, { sx: 0.9, sy: 0.35, sz: 0.9 });
}

export function addBronzeAltar(x, z) {
    addMapMarker(x, z, "#c08a3c", 4, "building");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    G.world.add(g);

    addBox(g, 2.8, 0.45, 2.0, 0x65534a, 0, 0.23, 0, 0, { roughness: 1 });
    addBox(g, 2.15, 0.35, 1.45, 0x7a6658, 0, 0.62, 0, 0, { roughness: 1 });
    addBox(g, 1.55, 0.20, 1.0, 0x8b735e, 0, 0.90, 0, 0, { roughness: 1 });
}

export function addTorch(x, z) {
    addMapMarker(x, z, "#d4733a", 2, "prop");
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    G.world.add(g);

    addCylinder(g, 0.055, 0.075, 1.15, 6, 0x51311d, 0, 0.58, 0);
    addCylinder(g, 0.18, 0.14, 0.18, 8, 0x2f2119, 0, 1.20, 0);

    const flameMat = makeBasicMat(0xff9b35, { transparent: true, opacity: 0.95 });
    const flame = addCone(g, 0.22, 0.48, 7, 0xff9b35, 0, 1.52, 0, {
        material: flameMat,
        castShadow: false,
        receiveShadow: false
    });

    const light = new THREE.PointLight(0xff8a33, 0.85, 6);
    light.position.set(0, 1.35, 0);
    g.add(light);

    G.animated.push({
        type: "torch",
        flame,
        light,
        baseIntensity: 0.85,
        speed: randRange(5.2, 7.0),
        phase: randRange(0, Math.PI * 2)
    });
}

export function createBronzeDaggerFragment(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.08, z);
    g.rotation.y = 0.72;
    G.world.add(g);

    const bronze = makeMat(0xb47b3e, {
        metalness: 0.25,
        roughness: 0.58,
        emissive: 0x2b1405,
        emissiveIntensity: 0.08
    });

    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.22, 4), bronze);
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0, 0.12, 0.04);
    blade.castShadow = true;
    blade.receiveShadow = true;
    g.add(blade);

    addBox(g, 0.16, 0.08, 0.42, 0x6f4628, 0, 0.12, -0.58, 0, {
        metalness: 0.1,
        roughness: 0.7
    });

    return g;
}

export function createBronzeBellArtifact(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = -0.3;
    G.world.add(g);

    addCylinder(g, 0.045, 0.06, 1.25, 6, 0x4d301d, -0.48, 0.63, 0);
    addCylinder(g, 0.045, 0.06, 1.25, 6, 0x4d301d, 0.48, 0.63, 0);
    addCylinderBetween(g, new THREE.Vector3(-0.55, 1.20, 0), new THREE.Vector3(0.55, 1.20, 0), 0.045, 0x4d301d);

    const bronze = makeMat(0xb98243, {
        metalness: 0.25,
        roughness: 0.55,
        emissive: 0x291505,
        emissiveIntensity: 0.08
    });

    addCylinder(g, 0.18, 0.40, 0.55, 10, 0xb98243, 0, 0.84, 0, { material: bronze });
    addBlob(g, 0.08, 0x8d6035, 0, 0.51, 0, {
        material: bronze,
        sy: 0.75
    });

    return g;
}

export function createAltarPattern(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.92, z);
    G.world.add(g);

    const mat = makeMat(0x69d6e7, {
        emissive: 0x1fb6d0,
        emissiveIntensity: 0.8,
        roughness: 0.4
    });

    addBox(g, 1.15, 0.035, 0.08, 0x69d6e7, 0, 0.035, 0, 0, { material: mat });
    addBox(g, 0.08, 0.035, 0.85, 0x69d6e7, 0, 0.04, 0, 0, { material: mat });
    addBox(g, 0.65, 0.035, 0.06, 0x69d6e7, -0.35, 0.045, 0.32, -0.65, { material: mat });
    addBox(g, 0.65, 0.035, 0.06, 0x69d6e7, 0.35, 0.045, -0.32, -0.65, { material: mat });

    return g;
}
