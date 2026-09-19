/**
 * gateaura.js — 시간의 문이 깨어나는 순간
 *
 * 고인돌은 이 게임에서 단 하나뿐인 "다음"으로 가는 문이다.
 * 그것이 열리는데 돌 사이에 파란 원판이 하나 켜지고 마는 것은 약하다.
 *
 * 그래서 하늘이 열린다.
 *   고인돌에서 빛기둥이 솟고,
 *   그 둘레로 고리가 차례로 떠오르며,
 *   땅에서는 충격파가 한 번씩 퍼져 나간다.
 *
 * 깨어나는 3초 동안만 요란하고, 그 뒤에는 조용히 맥박처럼 남는다.
 * 계속 시끄러우면 시대의 인상을 잡아먹는다.
 */
import { AudioSystem } from "./audio.js";
import { makeBasicMat } from "./build.js";
import { randRange } from "./rng.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { dom } from "./ui.js";

const AURA_COLOR = 0x8fe6ff;
const AURA_WARM = 0xd8f4ff;

/** 깨어나는 연출이 요란한 구간 (초) */
const OPENING = 2.6;

/** 충격파가 다시 도는 간격 */
const PULSE_EVERY = 5.2;

/* ================================================================
   부품
   ================================================================ */

/** 하늘로 솟는 빛기둥. 아래가 굵고 위로 갈수록 옅어진다. */
function makeBeam() {
    const g = new THREE.Group();

    const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 1.15, 30, 14, 1, true),
        makeBasicMat(AURA_COLOR, {
            map: G.TEX.mist,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false,
            blending: THREE.AdditiveBlending
        })
    );
    beam.position.y = 15;
    g.add(beam);

    // 안쪽의 진한 심
    const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.42, 30, 10, 1, true),
        makeBasicMat(AURA_WARM, {
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false,
            blending: THREE.AdditiveBlending
        })
    );
    core.position.y = 15;
    g.add(core);

    g.scale.y = 0.01;
    return { group: g, beam, core };
}

/** 하늘에 열리는 고리들. 아래에서 위로 차례로 떠오른다. */
function makeSkyRings() {
    const rings = [];
    const spec = [
        { y: 4.6, r: 3.2, w: 0.075, spin: 0.35 },
        { y: 7.8, r: 4.5, w: 0.065, spin: -0.28 },
        { y: 11.2, r: 5.9, w: 0.055, spin: 0.22 },
        { y: 15.0, r: 7.4, w: 0.045, spin: -0.16 }
    ];

    spec.forEach((s, i) => {
        const mesh = new THREE.Mesh(
            new THREE.TorusGeometry(s.r, s.w, 6, 44),
            makeBasicMat(i % 2 ? AURA_WARM : AURA_COLOR, {
                transparent: true,
                opacity: 0,
                depthWrite: false,
                side: THREE.DoubleSide,
                fog: false,
                blending: THREE.AdditiveBlending
            })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = s.y;
        mesh.scale.setScalar(0.25);
        rings.push({ mesh, ...s, delay: 0.35 + i * 0.24, phase: randRange(0, Math.PI * 2) });
    });

    return rings;
}

/** 기둥 꼭대기에 뜨는 흐린 원판 — 하늘에 난 구멍처럼 보이게 한다 */
function makeSkyDisc() {
    const disc = new THREE.Mesh(
        new THREE.CircleGeometry(8.5, 28),
        makeBasicMat(AURA_COLOR, {
            map: G.TEX.mist,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false,
            blending: THREE.AdditiveBlending
        })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 17.5;
    return disc;
}

/** 땅으로 퍼지는 충격파 고리 */
function makeShockwave() {
    const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.86, 1, 40),
        makeBasicMat(AURA_WARM, {
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false,
            blending: THREE.AdditiveBlending
        })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.09;
    return mesh;
}

/** 기둥을 따라 올라가는 티끌 */
function makeMotes(count = 70) {
    const pos = new Float32Array(count * 3);
    const seeds = [];

    for (let i = 0; i < count; i++) {
        seeds.push({
            a: randRange(0, Math.PI * 2),
            r: randRange(0.2, 2.1),
            y: randRange(0, 18),
            speed: randRange(1.4, 4.2)
        });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const points = new THREE.Points(geo, new THREE.PointsMaterial({
        color: AURA_WARM,
        size: 0.19,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending
    }));
    points.userData.seeds = seeds;
    return points;
}

/* ================================================================
   깨우기
   ================================================================ */

/** 화면 섬광 — 시대 전환의 흰 섬광과 달리 푸르게 번진다 */
function flashSky() {
    if (!dom.flash) return;
    dom.flash.classList.remove("play", "gate");
    void dom.flash.offsetWidth;
    dom.flash.classList.add("gate");
    setTimeout(() => dom.flash.classList.remove("gate"), 1100);
}

/**
 * 시간의 문을 깨운다.
 * interaction.js 의 activateGate() 가 부른다.
 */
export function awakenGate(gate) {
    if (!gate || gate.aura) return null;

    const root = new THREE.Group();
    // 고인돌 그룹은 돌아가 있으므로, 연출은 월드에 바로 붙여 수직을 지킨다
    root.position.set(gate.position.x, terrainHeight(gate.position.x, gate.position.z), gate.position.z);
    G.world.add(root);

    const beam = makeBeam();
    const rings = makeSkyRings();
    const disc = makeSkyDisc();
    const shock = makeShockwave();
    const motes = makeMotes();

    root.add(beam.group, disc, shock, motes);
    for (const r of rings) root.add(r.mesh);

    const aura = {
        type: "gateAura",
        t: 0,
        root,
        beam,
        rings,
        disc,
        shock,
        motes,
        shockT: 0,      // 지금 퍼지고 있는 충격파의 진행도 (>=1 이면 쉬는 중)
        nextPulse: PULSE_EVERY,
        done: false
    };

    gate.aura = aura;
    G.animated.push(aura);

    // 소리와 화면
    AudioSystem.playGateAwaken();
    flashSky();

    return aura;
}

/* ================================================================
   갱신
   ================================================================ */

export function updateGateAura(a, delta) {
    a.t += delta;

    // 여는 동안(0~1)과 다 열린 뒤(1)를 나눈다
    const open = Math.min(1, a.t / OPENING);
    const settle = Math.min(1, Math.max(0, (a.t - OPENING) / 1.2));
    // 처음에는 세게, 뒤로 갈수록 은은하게
    const power = 1.9 - 0.9 * settle;

    // ---- 빛기둥 ----
    const grow = Math.min(1, a.t / 0.5);
    a.beam.group.scale.y = Math.max(0.01, 1.06 * Math.sin(grow * Math.PI * 0.5)
        - 0.06 * Math.sin(grow * Math.PI));
    a.beam.group.rotation.y += delta * 0.16;
    const pulse = 0.82 + Math.sin(a.t * 1.7) * 0.18;
    a.beam.beam.material.opacity = 0.115 * power * pulse * open;
    a.beam.core.material.opacity = 0.20 * power * pulse * open;

    // ---- 하늘 고리 ----
    for (const r of a.rings) {
        const k = (a.t - r.delay) / 0.55;
        if (k < 0) continue;

        if (k < 1) {
            // 튀어나오듯 커졌다가 제 크기로
            const s = 1.16 * Math.sin(k * Math.PI * 0.5) - 0.16 * Math.sin(k * Math.PI);
            r.mesh.scale.setScalar(Math.max(0.05, s));
        } else {
            r.mesh.scale.setScalar(1);
        }

        r.mesh.rotation.z += delta * r.spin;
        r.mesh.position.y = r.y + Math.sin(a.t * 0.9 + r.phase) * 0.22;
        r.mesh.material.opacity = Math.min(1, Math.max(0, k)) * 0.42 * power;
    }

    // ---- 하늘의 원판 ----
    a.disc.rotation.z += delta * 0.07;
    a.disc.material.opacity = 0.075 * power * open * (0.85 + Math.sin(a.t * 1.1) * 0.15);

    // ---- 충격파 ----
    a.shockT += delta / 1.5;
    if (a.shockT < 1) {
        const k = a.shockT;
        const r = 1 + k * 13;
        a.shock.scale.setScalar(r);
        a.shock.material.opacity = (1 - k) * 0.55 * power;
    } else {
        a.shock.material.opacity = 0;
        a.nextPulse -= delta;
        if (a.nextPulse <= 0) {
            a.nextPulse = PULSE_EVERY;
            a.shockT = 0;
        }
    }

    // ---- 티끌 ----
    const arr = a.motes.geometry.attributes.position.array;
    const seeds = a.motes.userData.seeds;
    for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        s.y += s.speed * delta;
        if (s.y > 19) { s.y = 0; s.a = randRange(0, Math.PI * 2); }

        // 위로 갈수록 살짝 벌어진다
        const spread = s.r * (1 + s.y * 0.045);
        arr[i * 3] = Math.cos(s.a + a.t * 0.35) * spread;
        arr[i * 3 + 1] = s.y;
        arr[i * 3 + 2] = Math.sin(s.a + a.t * 0.35) * spread;
    }
    a.motes.geometry.attributes.position.needsUpdate = true;
    a.motes.material.opacity = 0.75 * open * (0.7 + 0.3 * Math.sin(a.t * 2.1));
}
