/**
 * 기본 도형 조합 헬퍼
 */
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
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        opts.material || makeMat(color, opts)
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function addCylinder(parent, rTop, rBottom, h, segments, color, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBottom, h, segments),
        opts.material || makeMat(color, opts)
    );
    mesh.position.set(x, y, z);
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function addCone(parent, radius, h, segments, color, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(radius, h, segments),
        opts.material || makeMat(color, opts)
    );
    mesh.position.set(x, y, z);
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function addBlob(parent, radius, color, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(radius, 0),
        opts.material || makeMat(color, opts)
    );
    mesh.position.set(x, y, z);
    mesh.scale.set(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1);
    mesh.rotation.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    setMeshFlags(mesh, opts);
    parent.add(mesh);
    return mesh;
}

export function addFlatCircle(parent, radius, color, x, y, z, segments = 12, opts = {}) {
    const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(radius, segments),
        opts.material || makeMat(color, {
            ...opts,
            side: opts.side ?? THREE.DoubleSide
        })
    );
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
        new THREE.CylinderGeometry(radius, radius, len, opts.segments ?? 6),
        opts.material || makeMat(color, opts)
    );

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
