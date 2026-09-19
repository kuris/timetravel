/**
 * 월드 — 지면, 배경판, 안개, 식생, 길, 연못
 */
import { addBlob, addCylinder, addFlatCircle, makeMat } from "./build.js";
import { addMapShape } from "./minimap.js";
import { fbm } from "./noise.js";
import { pick, rand, randRange } from "./rng.js";
import { G } from "./state.js";
import { isNearWater, isUnderwater, terrainHeight } from "./terrain.js";
import { makeCanvas } from "./textures.js";

/** 0xRRGGBB -> "rgba(r,g,b,ALPHA)" (캔버스 텍스처용 자리표시자) */
export function cssRGBA(hex) {
    const c = new THREE.Color(hex);
    return "rgba(" +
        Math.round(c.r * 255) + "," +
        Math.round(c.g * 255) + "," +
        Math.round(c.b * 255) + ",ALPHA)";
}

export function cssHex(hex) {
    return "#" + new THREE.Color(hex).getHexString();
}

export function addLights(age) {
    const l = age.light;

    const hemi = new THREE.HemisphereLight(l.hemiSky, l.hemiGround, l.hemiIntensity);
    G.scene.add(hemi);

    const ambient = new THREE.AmbientLight(l.ambient, l.ambientIntensity);
    G.scene.add(ambient);

    // 날씨/시간 시스템이 세기를 조절할 수 있도록 보관한다
    G.hemiLight = hemi;
    G.ambientLight = ambient;

    const sun = new THREE.DirectionalLight(l.sun, l.sunIntensity);
    sun.position.set(l.sunPos[0], l.sunPos[1], l.sunPos[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.bias = -0.0009;
    sun.shadow.normalBias = 0.02;
    G.scene.add(sun);

    // 그림자 카메라가 플레이어를 따라다니도록 보관
    sun.userData.ox = l.sunPos[0];
    sun.userData.oy = l.sunPos[1];
    sun.userData.oz = l.sunPos[2];
    G.scene.add(sun.target);
    G.sunLight = sun;

    // 반대편에서 아주 약하게 채워주는 빛 (완전히 검은 면이 없도록)
    const fill = new THREE.DirectionalLight(l.hemiSky, l.fillIntensity ?? 0.22);
    fill.position.set(-l.sunPos[0], l.sunPos[1] * 0.55, -l.sunPos[2]);
    G.scene.add(fill);
}

/**
 * TERRAIN
 * 커다란 평면을 노이즈로 변형하고, 수채화풍 텍스처 + 정점 색 얼룩을 입힌다.
 */
export function addGround(baseColor, patchColors) {
    const SIZE = 210;
    const SEG = 150;

    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // 정점 색은 색상이 아니라 "밝기/색조 변조" 로 쓴다.
    // 각 패치 색을 최대 채널 기준으로 정규화해서 색조만 남긴다.
    const normalize = (hex) => {
        const c = new THREE.Color(hex);
        const m = Math.max(c.r, c.g, c.b) || 1;
        return c.multiplyScalar(1 / m);
    };

    const base = normalize(baseColor);
    const patch = patchColors.map(normalize);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i); // 회전 전이므로 y가 월드 z가 된다

        // 높이 변형
        pos.setZ(i, terrainHeight(x, -y));

        // 큰 얼룩(저주파) + 작은 얼룩(고주파)를 섞어 프리렌더 배경처럼
        // 저주파가 너무 강하면 위장무늬처럼 보이므로 약하게 쓴다.
        const macro = fbm(x * 0.055 + 3.1, -y * 0.055 + 5.7, 3);
        const micro = fbm(x * 0.22 + 19.2, -y * 0.22 + 2.4, 2);

        // 흰색에서 살짝만 색조 쪽으로 기울인다 (텍스처 색을 죽이지 않도록)
        tmp.setRGB(1, 1, 1)
            .lerp(base, 0.22)
            .lerp(patch[Math.floor(macro * patch.length) % patch.length], 0.20);

        const shade = 0.70 + macro * 0.52 + micro * 0.22;
        tmp.multiplyScalar(shade);

        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        map: G.TEX.dirt,
        vertexColors: true,
        roughness: 1,
        metalness: 0,
        flatShading: false
    });

    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.base = true; // 시대 변이 때 한 번에 교체된다
    G.world.add(ground);

    return ground;
}

/**
 * BACKDROP
 * 카메라 시선 방향 정면에 세워 두는 프리렌더식 배경판.
 * 카메라가 회전하지 않는 등각 시점이므로 항상 지평선에 붙어 있다.
 */
export function addBackdrop(cfg) {
    G.backdrop = new THREE.Group();
    G.scene.add(G.backdrop);

    // 카메라 시선 방향(수평 성분) — 배경판은 여기에 수직으로 선다.
    const DIR = Math.PI / 4;
    const place = (dist) => ({
        x: -Math.sin(DIR) * dist,
        z: -Math.cos(DIR) * dist
    });

    // ---- 하늘 그라데이션 (안개 영향 없음, 가장 뒤) ----
    const skyCanvas = makeCanvas(64);
    const sg = skyCanvas.getContext("2d");
    const grd = sg.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0.00, cssHex(cfg.skyTop));
    grd.addColorStop(0.55, cssHex(cfg.skyMid));
    grd.addColorStop(1.00, cssHex(cfg.skyBottom));
    sg.fillStyle = grd;
    sg.fillRect(0, 0, 64, 64);

    // 수평선 부근의 햇무리
    const sun = sg.createRadialGradient(38, 46, 0, 38, 46, 30);
    sun.addColorStop(0, "rgba(255,238,200,0.55)");
    sun.addColorStop(1, "rgba(255,238,200,0)");
    sg.fillStyle = sun;
    sg.fillRect(0, 0, 64, 64);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.magFilter = THREE.LinearFilter;
    if ("colorSpace" in skyTex) skyTex.colorSpace = THREE.SRGBColorSpace;

    const skyPos = place(150);
    const sky = new THREE.Mesh(
        new THREE.PlaneGeometry(420, 200),
        new THREE.MeshBasicMaterial({ map: skyTex, fog: false, depthWrite: false })
    );
    sky.position.set(skyPos.x, 44, skyPos.z);
    sky.rotation.y = DIR;
    sky.renderOrder = -10;
    G.backdrop.add(sky);

    // ---- 산 능선 실루엣 여러 겹 ----
    // 가까운 겹은 진하고, 먼 겹은 안개에 묻힌다.
    cfg.ridges.forEach((r, layer) => {
        const shape = new THREE.Shape();
        const width = 360;
        const steps = 110;

        shape.moveTo(-width / 2, -40);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = -width / 2 + width * t;
            // 능선: 여러 주파수를 겹쳐 자연스러운 굴곡을 만든다
            const h =
                fbm(x * 0.013 + layer * 31.7, layer * 9.3, 4) * r.height +
                fbm(x * 0.055 + layer * 12.1, 40 + layer, 3) * r.height * 0.30;
            shape.lineTo(x, h);
        }
        shape.lineTo(width / 2, -40);
        shape.closePath();

        const mesh = new THREE.Mesh(
            new THREE.ShapeGeometry(shape),
            new THREE.MeshBasicMaterial({
                color: r.color,
                transparent: true,
                opacity: r.opacity,
                depthWrite: false,
                fog: true
            })
        );

        const p = place(r.dist);
        mesh.position.set(p.x, r.base ?? 0, p.z);
        mesh.rotation.y = DIR;
        mesh.renderOrder = -9 + layer;
        G.backdrop.add(mesh);
    });
}

/**
 * 지면을 스치는 안개 띠.
 * 수평 평면 여러 장을 아주 천천히 흘려보낸다.
 */
export function addMistLayers(color, count = 4) {
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(80, 80),
            new THREE.MeshBasicMaterial({
                map: G.TEX.mist,
                color,
                transparent: true,
                // 아주 옅게. 화면을 덮으면 안 되고 "결"만 남아야 한다.
                opacity: randRange(0.035, 0.075),
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                fog: false
            })
        );

        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = randRange(0, Math.PI * 2);
        // 지면을 스치듯 낮게 깔린다
        mesh.position.set(randRange(-16, 16), 0.28 + i * 0.30, randRange(-16, 16));
        mesh.renderOrder = 6;
        mesh.userData.base = true;
        G.world.add(mesh);

        G.animated.push({
            type: "mist",
            mesh,
            speed: randRange(0.09, 0.26) * (rand() > 0.5 ? 1 : -1),
            spin: randRange(-0.006, 0.006)
        });
    }
}

/** 공중에 떠도는 먼지 입자 */
export function addDustMotes(color, count = 190) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        pos[i * 3] = randRange(-30, 30);
        pos[i * 3 + 1] = randRange(0.3, 9);
        pos[i * 3 + 2] = randRange(-30, 30);
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const points = new THREE.Points(geo, new THREE.PointsMaterial({
        color,
        size: 0.075,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.30,
        depthWrite: false,
        fog: true
    }));

    points.userData.base = true;
    G.world.add(points);
    G.animated.push({ type: "dust", points, geo });
}

/** 먼 나무 실루엣: 지평선 근처를 채워 준다 */
export function addTreeLine(colors, count, minR, maxR) {
    for (let i = 0; i < count; i++) {
        const a = randRange(0, Math.PI * 2);
        const r = randRange(minR, maxR);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (isNearWater(x, z)) continue; // 강 위에는 나무가 서지 않는다
        const y = terrainHeight(x, z);

        const h = randRange(1.9, 3.6);
        const trunkH = h * 0.34;
        const col = pick(colors);

        addCylinder(G.world, 0.09, 0.15, trunkH, 5, 0x3d2c1c,
            x, y + trunkH * 0.5, z, { roughness: 1, castShadow: false, receiveShadow: false });

        // 잎 덩어리를 2~3개 겹쳐 둥글고 낡은 실루엣을 만든다
        const blobs = Math.floor(randRange(2, 4));
        for (let b = 0; b < blobs; b++) {
            addBlob(G.world, randRange(0.42, 0.72), col,
                x + randRange(-0.3, 0.3),
                y + trunkH + h * 0.3 + b * randRange(0.25, 0.42),
                z + randRange(-0.3, 0.3), {
                sx: randRange(1.0, 1.5),
                sy: randRange(0.7, 1.05),
                sz: randRange(1.0, 1.5),
                ry: randRange(0, Math.PI),
                roughness: 1,
                castShadow: false,
                receiveShadow: false
            });
        }
    }
}

/**
 * 흙길 / 돌길: 밟혀서 색이 빠진 자국과 박힌 돌을 깐다.
 * (x1,z1) -> (x2,z2) 를 따라 자연스럽게 구부러진다.
 */
export function addStonePath(x1, z1, x2, z2, width) {
    const steps = Math.floor(Math.hypot(x2 - x1, z2 - z1) * 2.2);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // 약간의 사행(蛇行)을 넣어 직선으로 보이지 않게 한다
        const wobble = Math.sin(t * Math.PI * 2.4) * width * 0.55;
        const nx = -(z2 - z1), nz = (x2 - x1);
        const nl = Math.hypot(nx, nz) || 1;

        const x = x1 + (x2 - x1) * t + (nx / nl) * wobble;
        const z = z1 + (z2 - z1) * t + (nz / nl) * wobble;
        const y = terrainHeight(x, z);

        // 밟힌 흙 자국
        addFlatCircle(G.world, randRange(width * 0.55, width * 0.85), 0x8a6d4b,
            x, y + 0.02, z, 8, {
            material: makeMat(0x8a6d4b, {
                transparent: true,
                opacity: randRange(0.18, 0.34),
                side: THREE.DoubleSide,
                depthWrite: false,
                roughness: 1,
                map: G.TEX.dirtObj
            })
        });

        // 박힌 돌
        if (rand() > 0.55) {
            const sx = x + randRange(-width * 0.5, width * 0.5);
            const sz = z + randRange(-width * 0.5, width * 0.5);
            const r = randRange(0.1, 0.24);
            addBlob(G.world, r, pick([0x8a8279, 0x6d675f, 0x9a9184]),
                sx, terrainHeight(sx, sz) + r * 0.22, sz, {
                sx: randRange(1, 1.6),
                sy: 0.3,
                sz: randRange(0.9, 1.4),
                ry: randRange(0, Math.PI),
                roughness: 1,
                map: G.TEX.stone,
                castShadow: false
            });
        }
    }
}

/** 작은 연못: 어두운 수면 + 가장자리 돌 + 풀 */
export function addPond(x, z, radius) {
    // 미니맵용 연못 (원을 다각형으로)
    const pts = [];
    for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        pts.push([x + Math.cos(a) * radius, z + Math.sin(a) * radius]);
    }
    addMapShape(pts, "#3a4650");

    const y = terrainHeight(x, z);

    const water = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 20),
        new THREE.MeshStandardMaterial({
            map: G.TEX.water,
            color: 0x41505e,
            transparent: true,
            opacity: 0.90,
            // 위와 같은 이유로 거칠게 (연못이 흰 구멍처럼 보이는 것 방지)
            roughness: 0.88,
            metalness: 0.0,
            depthWrite: false
        })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, y + 0.035, z);
    water.renderOrder = 1;
    water.userData.base = true;
    G.world.add(water);

    // 가장자리 돌
    const count = Math.floor(radius * 7);
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + randRange(-0.12, 0.12);
        const r = radius + randRange(-0.15, 0.4);
        const sx = x + Math.cos(a) * r;
        const sz = z + Math.sin(a) * r;
        const sr = randRange(0.12, 0.3);

        addBlob(G.world, sr, pick([0x6a655e, 0x7d766c, 0x565149]),
            sx, terrainHeight(sx, sz) + sr * 0.3, sz, {
            sx: randRange(1, 1.6),
            sy: randRange(0.4, 0.8),
            sz: randRange(0.9, 1.4),
            ry: a,
            roughness: 1,
            map: G.TEX.stone
        });
    }
}

/**
 * 인스턴싱 산포.
 * 같은 도형 수천 개를 드로우콜 한 번으로 그린다.
 * transforms: [{x,y,z, rx,ry,rz, sx,sy,sz, color}]
 */
export function addInstanced(geometry, material, transforms, opts = {}) {
    if (!transforms.length) return null;

    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();

    for (let i = 0; i < transforms.length; i++) {
        const t = transforms[i];
        e.set(t.rx || 0, t.ry || 0, t.rz || 0);
        q.setFromEuler(e);
        pos.set(t.x, t.y, t.z);
        scl.set(t.sx || 1, t.sy || 1, t.sz || 1);
        m.compose(pos, q, scl);
        mesh.setMatrixAt(i, m);
        if (t.color) mesh.setColorAt(i, t.color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = opts.receiveShadow ?? true;
    // 월드 전체에 퍼져 있으므로 컬링 기준 구를 넉넉히 잡는다
    mesh.frustumCulled = false;

    G.world.add(mesh);
    return mesh;
}

/** 흩어진 돌 / 자갈 (인스턴싱). 지형 높이를 따라간다. */
export function scatterStones(count, minX, maxX, minZ, maxZ, colors) {
    const cols = colors.map((c) => new THREE.Color(c));
    const list = [];

    for (let i = 0; i < count; i++) {
        const s = randRange(0.07, 0.3);
        const x = randRange(minX, maxX);
        const z = randRange(minZ, maxZ);
        if (isUnderwater(x, z)) continue;

        list.push({
            x, y: terrainHeight(x, z) + s * 0.45, z,
            sx: s * randRange(1, 1.9),
            sy: s * randRange(0.32, 0.8),
            sz: s * randRange(0.8, 1.5),
            ry: randRange(0, Math.PI),
            rz: randRange(-0.14, 0.14),
            color: cols[Math.floor(rand() * cols.length)]
        });
    }

    addInstanced(
        new THREE.DodecahedronGeometry(1, 0),
        makeMat(0xffffff, { roughness: 1, map: G.TEX.stone }),
        list
    );
}

/**
 * 마른 풀 / 잡초 다발 (인스턴싱).
 * 수천 장의 풀잎을 드로우콜 한 번으로 그린다.
 */
export function scatterGrass(count, colors, minR, maxR) {
    const cols = colors.map((c) => new THREE.Color(c));
    const list = [];

    for (let i = 0; i < count; i++) {
        const a = randRange(0, Math.PI * 2);
        const r = randRange(minR, maxR);
        const cx = Math.cos(a) * r;
        const cz = Math.sin(a) * r;
        if (isUnderwater(cx, cz)) continue;
        const cy = terrainHeight(cx, cz);

        const blades = Math.floor(randRange(3, 7));
        for (let b = 0; b < blades; b++) {
            const h = randRange(0.22, 0.62);
            list.push({
                x: cx + randRange(-0.22, 0.22),
                y: cy + h * 0.5,
                z: cz + randRange(-0.22, 0.22),
                sx: randRange(0.03, 0.07),
                sy: h,
                sz: 0.02,
                ry: randRange(0, Math.PI),
                rz: randRange(-0.35, 0.35),
                rx: randRange(-0.2, 0.2),
                color: cols[Math.floor(rand() * cols.length)]
            });
        }
    }

    addInstanced(
        new THREE.BoxGeometry(1, 1, 1),
        makeMat(0xffffff, { roughness: 1 }),
        list,
        { castShadow: false, receiveShadow: false }
    );
}
