/**
 * 랜드마크 — 시대를 가로질러 같은 자리에 남는 것들
 *
 * 이 게임의 핵심은 "같은 장소가 시간에 따라 변해 간다"는 감각이다.
 * 그래서 강의 위치, 큰 바위, 고인돌 자리는 모든 시대가 공유한다.
 *
 * 플레이어가 신석기에서 본 그 바위를, 2000년대 아파트 화단에서 다시 본다.
 */
import { addBlob, addBox, addCylinder, addFlatCircle, makeBasicMat, makeMat } from "./build.js";
import { pick, rand, randRange, seedRandom } from "./rng.js";
import { G } from "./state.js";
import { smooth } from "./noise.js";
import { terrainHeight } from "./terrain.js";
import { addMapShape } from "./minimap.js";
import { addInstanced } from "./world.js";

// 강의 중심선 (등각 화면에서 가로로 흐르도록 45° 회전)
export const RIVER = {
    center: { x: 0, z: -15 },
    rot: Math.PI / 4,
    // 강 쪽으로 파고드는 경계까지의 거리
    bank: 4.0
};

/** 강 중심선 기준 수직 거리. 양수 = 뭍, 음수 = 물 */
export function riverPerp(x, z) {
    return (x - RIVER.center.x + z - RIVER.center.z) * Math.SQRT1_2;
}

/**
 * 강바닥을 파내는 지형 변형.
 * 모든 시대가 같은 강을 쓰므로 terrainCarve 에 이걸 그대로 넣는다.
 */
export function carveRiver(x, z, h) {
    const u = riverPerp(x, z);
    if (u > RIVER.bank) return h;

    // 둔덕 -> 얕은 물 -> 깊은 물로 완만하게 내려간다
    const t = smooth(THREE.MathUtils.clamp((RIVER.bank - u) / 7.5, 0, 1));
    return h * (1 - t) - t * 1.9;
}

/** 강 중심선 좌표계 -> 월드 좌표 */
export function riverPoint(along, perp) {
    return [
        RIVER.center.x + along * Math.SQRT1_2 + perp * Math.SQRT1_2,
        RIVER.center.z - along * Math.SQRT1_2 + perp * Math.SQRT1_2
    ];
}

/**
 * 시대를 가로질러 같은 자리에 있는 큰 바위들.
 * 신석기에는 그냥 바위, 조선에는 이끼 낀 바위,
 * 2000년대에는 화단 한가운데 남은 바위가 된다.
 */
export const SHARED_ROCKS = [
    { x: -13.5, z: 4.0, s: 1.5 },
    { x: -11.2, z: 6.4, s: 1.05 },
    { x: 14.0, z: -6.5, s: 1.3 },
    { x: -16.5, z: -3.2, s: 1.15 }
];

/**
 * 화면 좌표 -> 월드 좌표.
 *
 * 등각 고정 시점이라 화면에서의 위치를 직접 잡는 편이 구도를 만들기 훨씬 쉽다.
 *   u = 화면 오른쪽  (월드 (1,0,-1)/√2 방향)
 *   v = 화면 위쪽    (월드 -(1,0,1)/√2 방향)
 *
 * 화면에 들어오는 범위는 대략 u ∈ [-26, 26], v ∈ [-25, 25] 이다.
 * (세로는 등각 때문에 눌려 보이므로 v 를 더 크게 잡아야 화면을 채운다.)
 */
export function S(u, v) {
    return [(u - v) * Math.SQRT1_2, -(u + v) * Math.SQRT1_2];
}

/** 시간의 문이 서 있는 자리. 모든 시대에서 같다. */
export const GATE_SPOT = { x: 17.0, z: -11.3, rot: -Math.PI / 5 };

/**
 * 강: 반투명한 수면 + 흐르는 잔물결 + 물가 자갈.
 * 색은 일부러 파랗지 않게, 탁한 청회색으로 둔다.
 */
export function addRiver() {
    // 미니맵용 강 영역: 중심선 기준 perp <= 3 인 띠
    const along = 60, nearPerp = 3, farPerp = -60;
    const pt = (a, pp) => [
        RIVER.center.x + a * Math.SQRT1_2 + pp * Math.SQRT1_2,
        RIVER.center.z - a * Math.SQRT1_2 + pp * Math.SQRT1_2
    ];
    addMapShape([
        pt(-along, nearPerp), pt(along, nearPerp),
        pt(along, farPerp), pt(-along, farPerp)
    ], "#3e5257");

    const g = new THREE.Group();
    g.position.set(RIVER.center.x, 0, RIVER.center.z);
    g.rotation.y = RIVER.rot;
    g.userData.base = true; // 강은 시대가 바뀌어도 그 자리에 있다
    G.world.add(g);

    // 수면
    const water = new THREE.Mesh(
        new THREE.PlaneGeometry(160, 70),
        new THREE.MeshStandardMaterial({
            map: G.TEX.water,
            color: 0x3c4c54,
            transparent: true,
            opacity: 0.96,
            // 직교 카메라에서는 매끈한 수면이 화면 전체에 균일한
            // 스펙큘러를 만들어 하얗게 타버린다. 일부러 거칠게 둔다.
            roughness: 0.82,
            metalness: 0.0,
            depthWrite: true
        })
    );
    water.rotation.x = -Math.PI / 2;
    // 수면이 파낸 둔덕(perp <= 3)까지 덮도록 살짝 앞으로 뺀다
    water.position.set(0, -0.14, -32);
    water.receiveShadow = false;
    g.add(water);

    // 수면에 비치는 햇빛 (참조 이미지의 강 반짝임)
    // 넓게 퍼진 반사
    const glare = new THREE.Mesh(
        new THREE.PlaneGeometry(15, 30),
        new THREE.MeshBasicMaterial({
            map: G.TEX.mist,
            color: 0xffe6bd,
            transparent: true,
            opacity: 0.38,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: true
        })
    );
    glare.rotation.x = -Math.PI / 2;
    glare.position.set(3, -0.11, -12);
    g.add(glare);

    // 중심의 강한 빛기둥 (참조 이미지의 강 반짝임)
    const glareCore = new THREE.Mesh(
        new THREE.PlaneGeometry(5.5, 24),
        new THREE.MeshBasicMaterial({
            map: G.TEX.mist,
            color: 0xfff6e2,
            transparent: true,
            opacity: 0.62,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: true
        })
    );
    glareCore.rotation.x = -Math.PI / 2;
    glareCore.position.set(3, -0.10, -11);
    g.add(glareCore);

    // 잔물결: 가로로 아주 천천히 흐른다
    seedRandom(3300);
    for (let i = 0; i < 130; i++) {
        const wave = new THREE.Mesh(
            new THREE.BoxGeometry(randRange(1.0, 5.0), 0.02, 0.06),
            makeBasicMat(0xffeed2, {
                transparent: true,
                opacity: randRange(0.20, 0.46),
                depthWrite: false
            })
        );
        wave.position.set(randRange(-40, 40), -0.10, randRange(-30, 1));
        wave.rotation.y = randRange(-0.15, 0.15);
        wave.castShadow = false;
        wave.receiveShadow = false;
        g.add(wave);

        G.animated.push({
            type: "wave",
            mesh: wave,
            speed: randRange(0.2, 0.75),
            minX: -42,
            maxX: 42
        });
    }

    // ---- 젖은 모래 띠: 물과 뭍의 경계를 흐린다 ----
    seedRandom(3350);
    for (let i = 0; i < 120; i++) {
        const along = randRange(-38, 38);
        const perp = randRange(0.2, 4.6);
        const x = RIVER.center.x + along * Math.SQRT1_2 + perp * Math.SQRT1_2;
        const z = RIVER.center.z - along * Math.SQRT1_2 + perp * Math.SQRT1_2;

        // 물에 가까울수록 진하게 젖어 있다
        const wet = 1 - THREE.MathUtils.clamp((perp - 0.2) / 4.4, 0, 1);

        addFlatCircle(G.world, randRange(1.0, 2.8), 0x6d5a45,
            x, terrainHeight(x, z) + 0.03, z, 8, {
            material: makeMat(0x6d5a45, {
                transparent: true,
                opacity: 0.12 + wet * 0.34,
                side: THREE.DoubleSide,
                depthWrite: false,
                roughness: 0.55,
                map: G.TEX.dirtObj
            })
        });
    }

    // ---- 포말선: 물과 뭍이 만나는 밝은 띠 ----
    const foam = new THREE.Mesh(
        new THREE.PlaneGeometry(150, 3.0),
        new THREE.MeshBasicMaterial({
            map: G.TEX.mist,
            color: 0xf6e6c8,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: true
        })
    );
    foam.rotation.x = -Math.PI / 2;
    // 로컬 z 가 곧 강 중심선 기준 perp 거리다
    foam.position.set(0, -0.05, 1.5);
    foam.renderOrder = 3;
    g.add(foam);

    // 물가 자갈 (인스턴싱)
    seedRandom(3400);
    const pebbleCols = [0x8d8579, 0xa2988a, 0x6f685f].map((c) => new THREE.Color(c));
    const pebbles = [];

    for (let i = 0; i < 260; i++) {
        const along = randRange(-38, 38);
        const perp = randRange(-2.6, 5.2);
        const x = RIVER.center.x + along * Math.SQRT1_2 + perp * Math.SQRT1_2;
        const z = RIVER.center.z - along * Math.SQRT1_2 + perp * Math.SQRT1_2;
        const sc = randRange(0.07, 0.22);

        pebbles.push({
            x, y: terrainHeight(x, z) + sc * 0.4, z,
            sx: sc * randRange(1, 1.8),
            sy: sc * randRange(0.3, 0.7),
            sz: sc * randRange(0.9, 1.4),
            ry: randRange(0, Math.PI),
            color: pebbleCols[Math.floor(rand() * pebbleCols.length)]
        });
    }

    addInstanced(
        new THREE.DodecahedronGeometry(1, 0),
        makeMat(0xffffff, { roughness: 1, map: G.TEX.stone }),
        pebbles,
        { castShadow: false }
    );
}
