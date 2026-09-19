/**
 * construct.js — 짓는 동안의 연출
 *
 * 건물이 툭 하고 나타나면 "내가 지었다"는 감각이 남지 않는다.
 * 땅을 다지고, 먼지가 일고, 기둥이 솟고, 마지막에 한 번 내려앉아야
 * 비로소 한 채를 세운 일이 된다.
 *
 * 시대 변이(morph.js)가 쓰는 "솟아오르는" 어법을 그대로 빌려 온다.
 * 거기서는 시간이 건물을 세우고, 여기서는 사람이 세운다.
 */
import { addFlatCircle, makeBasicMat, makeMat } from "./build.js";
import { randRange } from "./rng.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";

/** 한 채가 다 서기까지 (초) */
export const RISE = 0.85;

/** 부품이 여럿이면 하나씩 시차를 두고 선다 */
const STAGGER = 0.13;

/**
 * 다져진 땅.
 * 건물 밑에 깔리는 흙자국이다. 시대가 바뀌어도 같은 자리에 다시 깔린다.
 */
export function addBuildPad(x, z, radius = 1.7) {
    const pad = addFlatCircle(G.world, radius, 0x7a5c3a,
        x, terrainHeight(x, z) + 0.03, z, 14, {
        material: makeMat(0x7a5c3a, {
            transparent: true,
            opacity: 0.38,
            side: THREE.DoubleSide,
            depthWrite: false,
            roughness: 1,
            map: G.TEX.dirtObj
        })
    });
    pad.renderOrder = 2;
    return pad;
}

/** 발밑에서 피어오르는 흙먼지 (한 번만 일고 가라앉는다) */
function makeDust(x, y, z, count = 12) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    G.world.add(g);

    const puffs = [];
    for (let i = 0; i < count; i++) {
        const puff = new THREE.Mesh(
            new THREE.PlaneGeometry(1.15, 1.15),
            makeBasicMat(0xd8c5a2, {
                map: G.TEX.mist,
                transparent: true,
                opacity: 0,
                depthWrite: false
            })
        );
        // 등각 카메라는 회전하지 않으므로 고정 각도면 항상 정면이다
        puff.rotation.y = Math.PI / 4;
        puff.renderOrder = 5;
        g.add(puff);

        const a = (i / count) * Math.PI * 2 + randRange(-0.3, 0.3);
        puffs.push({
            mesh: puff,
            dx: Math.cos(a),
            dz: Math.sin(a),
            reach: randRange(0.9, 2.3),
            rise: randRange(0.5, 1.5),
            delay: randRange(0, 0.5),
            life: randRange(0.7, 1.2)
        });
    }

    return { group: g, puffs };
}

/**
 * 짓기 시작한다.
 *
 * @param objects  이번에 세워진 최상위 오브젝트들 (G.world 의 새 자식들)
 * @param x,z      건물 자리
 * @param pad      다져진 땅 (같이 짙어진다)
 */
export function startConstruction(objects, x, z, pad = null) {
    const parts = [];

    objects.forEach((obj, i) => {
        if (!obj) return;
        parts.push({
            obj,
            base: obj.scale.clone(),
            delay: i * STAGGER,
            shown: false
        });
        // 다 서기 전까지는 보이지 않는다
        obj.visible = false;
    });

    if (!parts.length) return null;

    const y = terrainHeight(x, z);
    const dust = makeDust(x, y + 0.12, z);

    if (pad) {
        pad.userData.padOpacity = pad.material.opacity;
        pad.material.opacity = 0;
    }

    const anim = {
        type: "construct",
        t: 0,
        parts,
        dust,
        pad,
        // 망치질 소리가 들어갈 자리
        knocks: [0.05, 0.28, 0.52, 0.78].map((at) => ({ at, done: false })),
        total: RISE + (parts.length - 1) * STAGGER + 0.45,
        done: false
    };

    G.animated.push(anim);
    return anim;
}

/**
 * 한 프레임. loop.js 가 부른다.
 * 끝나면 anim.done 을 올린다 (loop 가 목록에서 걷어낸다).
 */
export function updateConstruction(a, delta, AudioSystem) {
    a.t += delta;

    // ---- 망치질 ----
    for (const k of a.knocks) {
        if (!k.done && a.t >= k.at) {
            k.done = true;
            AudioSystem.playHammer();
        }
    }

    // ---- 다져지는 땅 ----
    if (a.pad) {
        const p = Math.min(1, a.t / 0.35);
        a.pad.material.opacity = (a.pad.userData.padOpacity ?? 0.38) * p;
    }

    // ---- 솟아오르는 부품 ----
    let rising = false;
    for (const part of a.parts) {
        const p = (a.t - part.delay) / RISE;
        if (p < 0) { rising = true; continue; }

        if (!part.shown) {
            part.shown = true;
            part.obj.visible = true;
        }

        if (p >= 1) {
            part.obj.scale.copy(part.base);
            continue;
        }

        rising = true;
        // 살짝 넘쳤다가 제자리로 내려앉는다
        const s = 1.08 * Math.sin(p * Math.PI * 0.5) - 0.08 * Math.sin(p * Math.PI);
        const w = 0.90 + 0.10 * Math.sin(p * Math.PI * 0.5);
        part.obj.scale.set(
            part.base.x * w,
            part.base.y * Math.max(0.04, s),
            part.base.z * w
        );
    }

    // ---- 먼지 ----
    for (const puff of a.dust.puffs) {
        const k = (a.t - puff.delay) / puff.life;
        if (k < 0 || k > 1) { puff.mesh.material.opacity = 0; continue; }

        puff.mesh.position.set(
            puff.dx * puff.reach * k,
            puff.rise * k,
            puff.dz * puff.reach * k
        );
        const sc = 0.55 + k * 1.7;
        puff.mesh.scale.set(sc, sc, sc);
        puff.mesh.material.opacity = Math.sin(k * Math.PI) * 0.34;
    }

    // ---- 끝 ----
    if (a.t >= a.total && !rising) {
        for (const part of a.parts) {
            part.obj.visible = true;
            part.obj.scale.copy(part.base);
        }
        disposeDust(a.dust);
        AudioSystem.playBuildDone();
        a.done = true;
    }
}

function disposeDust(dust) {
    for (const puff of dust.puffs) {
        puff.mesh.geometry.dispose();
        puff.mesh.material.dispose();
    }
    if (dust.group.parent) dust.group.parent.remove(dust.group);
}
