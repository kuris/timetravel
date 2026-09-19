/**
 * 기본 도형 조합 헬퍼
 *
 * ── 지오메트리 공유 ──
 * 상자 하나, 기둥 하나마다 BufferGeometry 를 새로 만들면
 * 한 시대에 2만 개 가까이 쌓인다. 크기는 전부 다르지만 모양은 몇 가지뿐이므로,
 * "단위 크기" 도형 하나를 만들어 두고 mesh.scale 로 크기를 준다.
 * 공유 지오메트리는 시대가 바뀌어도 버리지 않는다 (SHARED 표시).
 */

const GEO_CACHE = new Map();

function shared(key, make) {
    let g = GEO_CACHE.get(key);
    if (!g) {
        g = make();
        g.userData.shared = true; // 시대 전환 때 dispose 하면 안 된다
        GEO_CACHE.set(key, g);
    }
    return g;
}

/** 1x1x1 상자 */
function unitBox() {
    return shared("box", () => new THREE.BoxGeometry(1, 1, 1));
}

/** 반지름 1, 높이 1 원뿔 */
function unitCone(segments) {
    return shared("cone:" + segments, () => new THREE.ConeGeometry(1, 1, segments));
}

/**
 * 아래 반지름 1, 높이 1 기둥.
 * 위아래 반지름 비율만 캐시 키로 쓰고 나머지는 scale 로 준다.
 */
function unitCylinder(ratio, segments) {
    const r = Math.round(ratio * 100) / 100;
    return shared("cyl:" + r + ":" + segments,
        () => new THREE.CylinderGeometry(r, 1, 1, segments));
}

/** 반지름 1 원판 */
function unitCircle(segments) {
    return shared("circle:" + segments, () => new THREE.CircleGeometry(1, segments));
}

/** 반지름 1 다면체 (돌덩이) */
function unitBlob() {
    return shared("blob", () => new THREE.DodecahedronGeometry(1, 0));
}

export function makeMat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        // 텍스처를 주면 색과 곱해져서 거친 표면 느낌이 난다
        map: opts.map ?? null,
        roughness: opts.roughness ?? 0.92,
        metalness: opts.metalness ?? 0.0,
        flatShading: opts.flatShading ?? true,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        side: opts.side ?? THREE.FrontSide,
        depthWrite: opts.depthWrite ?? true
    });
}

export function makeBasicMat(color, opts = {}) {
    return new THREE.MeshBasicMaterial({
        color,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
        side: opts.side ?? THREE.FrontSide,
        depthWrite: opts.depthWrite ?? true
    });
}

export function setMeshFlags(mesh, opts = {}) {
    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = opts.receiveShadow ?? true;
    return mesh;
}

export function addBox(parent, w, h, d, color, x, y, z, rotY = 0, opts = {}) {
    const mesh = new THREE.Mesh(unitBox(), opts.material || makeMat(color, opts));
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function addCylinder(parent, rTop, rBottom, h, segments, color, x, y, z, opts = {}) {
    // 아래 반지름을 기준으로 삼고 위아래 비율만 지오메트리에 남긴다
    const base = rBottom !== 0 ? rBottom : (rTop || 1);
    const mesh = new THREE.Mesh(
        unitCylinder(rTop / base, segments),
        opts.material || makeMat(color, opts)
    );
    mesh.scale.set(base, h, base);
    mesh.position.set(x, y, z);
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function addCone(parent, radius, h, segments, color, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(unitCone(segments), opts.material || makeMat(color, opts));
    mesh.scale.set(radius, h, radius);
    mesh.position.set(x, y, z);
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function addBlob(parent, radius, color, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(unitBlob(), opts.material || makeMat(color, opts));
    mesh.position.set(x, y, z);
    mesh.scale.set(radius * (opts.sx ?? 1), radius * (opts.sy ?? 1), radius * (opts.sz ?? 1));
    mesh.rotation.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function addFlatCircle(parent, radius, color, x, y, z, segments = 12, opts = {}) {
    const mesh = new THREE.Mesh(
        unitCircle(segments),
        opts.material || makeMat(color, {
            ...opts,
            side: opts.side ?? THREE.DoubleSide
        })
    );
    mesh.scale.set(radius, radius, 1);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = opts.castShadow ?? false;
    mesh.receiveShadow = opts.receiveShadow ?? false;
    parent.add(mesh);
    return mesh;
}

export function addCylinderBetween(parent, a, b, radius, color, opts = {}) {
    const dir = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    const len = dir.length();
    const mesh = new THREE.Mesh(
        unitCylinder(1, opts.segments ?? 6),
        opts.material || makeMat(color, opts)
    );
    mesh.scale.set(radius, len, radius);

    mesh.position.set(
        (a.x + b.x) * 0.5,
        (a.y + b.y) * 0.5,
        (a.z + b.z) * 0.5
    );

    dir.normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function fadeGroup(group) {
    group.traverse((child) => {
        if (!child.isMesh || !child.material) return;

        const fadeOne = (mat) => {
            const m = mat.clone();
            m.transparent = true;
            m.opacity = Math.min(m.opacity ?? 1, 0.36);
            m.depthWrite = false;
            if ("emissiveIntensity" in m) m.emissiveIntensity *= 0.18;
            return m;
        };

        child.material = Array.isArray(child.material)
            ? child.material.map(fadeOne)
            : fadeOne(child.material);
    });
}
