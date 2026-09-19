/**
 * 시대 변이 (MORPH)
 *
 * 시대가 바뀔 때 장면을 통째로 갈아 끼우지 않는다.
 * 화면 왼쪽에서 오른쪽으로 빛의 경계선이 쓸고 지나가면서,
 * 그 선을 넘은 건물부터 하나씩 다음 시대의 모습으로 바뀐다.
 *
 * 같은 땅 위에서 시간만 흘러가는 느낌을 만드는 것이 목적이다.
 */
import { G, cameraTarget } from "./state.js";
import { AudioSystem } from "./audio.js";

/** 쓸고 지나가는 방향 = 화면 가로축 = 월드 (1,0,-1)/√2 */
const SWEEP_DIR = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2);

const MORPH = {
    active: false,
    t: 0,
    duration: 3.4,
    from: -46,
    to: 46,
    oldWorld: null,
    newWorld: null,
    oldItems: [],
    newItems: [],
    extraDispose: [],
    oldTextures: null,
    curtain: null,
    sparks: null,
    onDone: null
};

/** 오브젝트가 경계선을 만나는 지점 (화면 가로 좌표) */
function wipeCoord(obj) {
    return (obj.position.x - obj.position.z) * Math.SQRT1_2;
}

/**
 * 지면 · 강 · 하늘처럼 화면 전체에 깔린 것은 하나씩 바뀔 수 없다.
 * 이런 것은 경계선과 상관없이 즉시 교체한다.
 */
function isBase(obj) {
    if (obj.userData && obj.userData.base) return true;
    if (obj.isInstancedMesh) return true;
    if (obj.isMesh && obj.geometry) {
        if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
        if (obj.geometry.boundingSphere && obj.geometry.boundingSphere.radius > 25) return true;
    }
    return false;
}

/** 경계선에 세우는 빛의 커튼 */
function makeCurtain() {
    const g = new THREE.Group();

    // 세로로 선 발광 판. 등각 카메라라 회전이 고정이다.
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 42),
        new THREE.MeshBasicMaterial({
            color: 0xfff1cf,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            fog: false,
            side: THREE.DoubleSide
        })
    );
    plane.position.y = 9;
    // 경계선의 법선이 쓸어가는 방향을 향하게 한다
    plane.rotation.y = Math.atan2(SWEEP_DIR.x, SWEEP_DIR.z);
    g.add(plane);

    // 넓게 번지는 빛
    const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 46),
        new THREE.MeshBasicMaterial({
            color: 0xffd79a,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            fog: false,
            side: THREE.DoubleSide
        })
    );
    glow.position.y = 9;
    glow.rotation.y = plane.rotation.y;
    g.add(glow);

    g.renderOrder = 60;
    return g;
}

/** 경계선을 따라 흩날리는 먼지 */
function makeSparks() {
    const COUNT = 220;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const seeds = [];

    for (let i = 0; i < COUNT; i++) {
        seeds.push({
            along: (Math.random() - 0.5) * 40,
            y: Math.random() * 14,
            off: (Math.random() - 0.5) * 3.2,
            rise: 0.6 + Math.random() * 2.2
        });
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const points = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xffe6b8,
        size: 0.16,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        depthTest: false,
        fog: false,
        blending: THREE.AdditiveBlending
    }));

    points.renderOrder = 61;
    points.userData.seeds = seeds;
    return points;
}

/**
 * 변이 시작.
 * @param {THREE.Group} oldWorld 이전 시대의 월드 (새 scene 에 이미 붙어 있어야 한다)
 * @param {THREE.Group} newWorld 새 시대의 월드
 */
export function startMorph(oldWorld, newWorld, onDone, extraDispose, oldTextures) {
    MORPH.active = true;
    MORPH.t = 0;
    MORPH.oldWorld = oldWorld;
    MORPH.newWorld = newWorld;
    MORPH.onDone = onDone;
    // 이전 시대의 배경판·플레이어처럼 world 밖에 있던 것들
    MORPH.extraDispose = extraDispose || [];
    MORPH.oldTextures = oldTextures || null;

    // 경계선이 지나갈 범위를 플레이어 주변으로 맞춘다
    const cx = (cameraTarget.x - cameraTarget.z) * Math.SQRT1_2;
    MORPH.from = cx - 52;
    MORPH.to = cx + 52;

    // --- 이전 시대: 전부 보이는 상태에서 시작 ---
    MORPH.oldItems = oldWorld.children.map((obj) => ({
        obj, u: wipeCoord(obj), base: isBase(obj), gone: false
    }));

    // --- 새 시대: 전부 숨긴 상태에서 시작 ---
    MORPH.newItems = newWorld.children.map((obj) => {
        const base = isBase(obj);
        obj.visible = false;
        return { obj, u: wipeCoord(obj), base, shown: false, pop: 0 };
    });

    MORPH.curtain = makeCurtain();
    MORPH.sparks = makeSparks();
    G.scene.add(MORPH.curtain);
    G.scene.add(MORPH.sparks);
}

export function isMorphing() {
    return MORPH.active;
}

/** 매 프레임 호출 */
export function updateMorph(delta) {
    if (!MORPH.active) return;

    MORPH.t += delta;
    const k = Math.min(1, MORPH.t / MORPH.duration);

    // 가운데서 빨라지고 양 끝에서 느려진다
    const eased = k < 0.5
        ? 2 * k * k
        : 1 - Math.pow(-2 * k + 2, 2) / 2;

    const sweep = MORPH.from + (MORPH.to - MORPH.from) * eased;

    // --- 이전 시대: 경계선을 지난 것부터 사라진다 ---
    for (const it of MORPH.oldItems) {
        if (it.gone) continue;
        // 바닥/하늘은 경계선이 반쯤 지났을 때 한 번에 교체한다
        const threshold = it.base ? (MORPH.from + MORPH.to) * 0.5 : it.u;
        if (sweep >= threshold) {
            it.obj.visible = false;
            it.gone = true;
        }
    }

    // --- 새 시대: 경계선을 지난 것부터 나타난다 ---
    for (const it of MORPH.newItems) {
        const threshold = it.base ? (MORPH.from + MORPH.to) * 0.5 : it.u;

        if (!it.shown && sweep >= threshold) {
            it.shown = true;
            it.obj.visible = true;
            // 솟아오르는 느낌을 주기 위해 잠깐 눌러 둔다
            if (!it.base) {
                it.obj.userData.morphScale = it.obj.scale.clone();
                it.obj.scale.set(it.obj.scale.x, it.obj.scale.y * 0.05, it.obj.scale.z);
            }
        }

        // 나타난 뒤 0.45초에 걸쳐 제 크기로 자란다
        if (it.shown && !it.base && it.pop < 1) {
            it.pop = Math.min(1, it.pop + delta / 0.45);
            const base = it.obj.userData.morphScale;
            if (base) {
                // 살짝 넘쳤다가 제자리로
                const s = 1.08 * Math.sin(it.pop * Math.PI * 0.5) - 0.08 * Math.sin(it.pop * Math.PI);
                it.obj.scale.set(base.x, base.y * Math.max(0.05, s), base.z);
                if (it.pop >= 1) it.obj.scale.copy(base);
            }
        }
    }

    // --- 빛의 경계선 ---
    if (MORPH.curtain) {
        MORPH.curtain.position.set(
            SWEEP_DIR.x * sweep,
            0,
            SWEEP_DIR.z * sweep
        );
        // 시작과 끝에서 부드럽게 사라진다
        const fade = Math.sin(k * Math.PI);
        MORPH.curtain.children[0].material.opacity = 0.75 * fade;
        MORPH.curtain.children[1].material.opacity = 0.22 * fade;
    }

    // --- 경계선의 먼지 ---
    if (MORPH.sparks) {
        const arr = MORPH.sparks.geometry.attributes.position.array;
        const seeds = MORPH.sparks.userData.seeds;
        const perpX = -SWEEP_DIR.z, perpZ = SWEEP_DIR.x; // 경계선을 따라가는 축

        for (let i = 0; i < seeds.length; i++) {
            const s = seeds[i];
            s.y += s.rise * delta;
            if (s.y > 15) s.y = 0;

            const d = sweep + s.off;
            arr[i * 3] = SWEEP_DIR.x * d + perpX * s.along;
            arr[i * 3 + 1] = s.y;
            arr[i * 3 + 2] = SWEEP_DIR.z * d + perpZ * s.along;
        }
        MORPH.sparks.geometry.attributes.position.needsUpdate = true;
        MORPH.sparks.material.opacity = 0.85 * Math.sin(k * Math.PI);
    }

    // --- 끝 ---
    if (k >= 1) finishMorph();
}

function finishMorph() {
    MORPH.active = false;

    // 남은 것들을 제자리로
    for (const it of MORPH.newItems) {
        it.obj.visible = true;
        if (it.obj.userData.morphScale) {
            it.obj.scale.copy(it.obj.userData.morphScale);
            delete it.obj.userData.morphScale;
        }
    }

    if (MORPH.oldWorld) {
        G.scene.remove(MORPH.oldWorld);
        disposeGroup(MORPH.oldWorld);
        MORPH.oldWorld = null;
    }

    // world 밖에 있던 이전 시대 자원 (배경판, 플레이어, 하늘 텍스처)
    for (const obj of MORPH.extraDispose) {
        if (!obj) continue;
        if (obj.parent) obj.parent.remove(obj);
        disposeGroup(obj);
    }
    MORPH.extraDispose = [];

    // 이전 시대가 구운 텍스처 (재질에 안 붙은 것까지)
    disposeTextures(MORPH.oldTextures);
    MORPH.oldTextures = null;
    // 경계선 연출에 쓴 것들도 버린다 (전환마다 쌓인다)
    if (MORPH.curtain) {
        G.scene.remove(MORPH.curtain);
        disposeGroup(MORPH.curtain);
        MORPH.curtain = null;
    }
    if (MORPH.sparks) {
        G.scene.remove(MORPH.sparks);
        MORPH.sparks.geometry.dispose();
        MORPH.sparks.material.dispose();
        MORPH.sparks = null;
    }

    MORPH.oldItems = [];
    MORPH.newItems = [];

    const cb = MORPH.onDone;
    MORPH.onDone = null;
    if (cb) cb();
}

/**
 * 한 시대가 구운 절차적 텍스처를 통째로 버린다.
 *
 * 어떤 텍스처는 그 시대에 쓰이지 않는다 (예: 고대 시대의 아스팔트).
 * 재질을 타고 내려가는 방식으로는 그런 것들이 잡히지 않아
 * 시대마다 조금씩 쌓였다.
 */
export function disposeTextures(tex) {
    if (!tex) return;
    for (const key in tex) {
        const t = tex[key];
        if (t && typeof t.dispose === "function") t.dispose();
    }
}

/** 이전 시대가 쓰던 GPU 자원을 정리한다 */
export function disposeGroup(group) {
    if (!group) return;

    group.traverse((child) => {
        // 그림자를 만드는 조명은 깊이 텍스처를 하나씩 들고 있다.
        // 재질을 타고 내려가는 정리로는 안 잡혀서 시대마다 하나씩 쌓였다.
        if (child.isLight && child.shadow) {
            if (child.shadow.map) child.shadow.map.dispose();
            if (typeof child.shadow.dispose === "function") child.shadow.dispose();
        }

        // 공유 지오메트리(단위 상자 / 기둥 / 원뿔 ...)는 다음 시대도 쓴다
        if (child.geometry && !child.geometry.userData.shared) child.geometry.dispose();
        if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const m of mats) {
                // 텍스처는 시대별로 새로 구우므로 같이 버린다
                if (m.map && m.map.dispose) m.map.dispose();
                m.dispose();
            }
        }
    });
}
