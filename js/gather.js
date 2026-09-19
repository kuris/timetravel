/**
 * gather.js — 나무를 자르고 돌을 캐는 동작
 *
 * 재료가 손만 대면 사라지면 "주웠다"는 느낌밖에 남지 않는다.
 * 몇 번 내리쳐야 넘어가도록 하면, 재료 하나하나에 시간이 붙는다.
 *
 * 나무는 도끼질 세 번, 돌은 곡괭이질 네 번.
 * 내리칠 때마다 대상이 휘청하고 파편이 튄다.
 * 도중에 멀어지면 중단된다 — 붙잡아 두지 않는다.
 */
import { AudioSystem } from "./audio.js";
import { addBlob } from "./build.js";
import { pick, randRange } from "./rng.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { josa, showMessage } from "./ui.js";

/** 재료별 채집 방식 */
const KIND = {
    wood: {
        verb: "베는",
        swings: 3,
        interval: 0.46,
        chip: [0x6b4a2c, 0x54381f, 0x8a6338],
        chipCount: 7,
        shake: 0.10
    },
    stone: {
        verb: "캐는",
        swings: 4,
        interval: 0.40,
        chip: [0x8a8379, 0x6f6960, 0xa39a8c],
        chipCount: 9,
        shake: 0.06
    }
};

/** 진행 중인 채집. 한 번에 하나뿐이다. */
let job = null;

/** 튄 파편들 (채집이 끝나도 잠시 남는다) */
let chips = [];

export function isGathering(item = null) {
    if (!job) return false;
    return item ? job.item === item : true;
}

/** 지금 무엇을 하고 있는지 — 프롬프트에 쓴다 */
export function gatherLabel() {
    if (!job) return "";
    return job.item.name + josa(job.item.name) + " " + job.cfg.verb + " 중… (" +
        Math.min(job.hits, job.cfg.swings) + " / " + job.cfg.swings + ")";
}

/** 지금 몇 번째 내리치는 중인지 — player.js 가 팔 각도를 여기서 가져간다 */
export function gatherPose() {
    if (!job) return null;

    // 한 번의 내리침: 뒤로 들었다가(0~0.45) 빠르게 내린다(0.45~1)
    const k = (job.t % job.cfg.interval) / job.cfg.interval;
    const arm = k < 0.45
        ? -2.35 * (k / 0.45)                       // 머리 뒤로 들어올린다
        : -2.35 + 3.05 * Math.pow((k - 0.45) / 0.55, 0.55); // 내리친다

    return {
        arm,
        lean: 0.10 + Math.sin(k * Math.PI) * 0.12
    };
}

/**
 * 채집을 시작한다.
 * @param item  registerInteractable 로 등록된 재료 노드
 * @param onDone 다 캐냈을 때 부를 것 (실제 획득 처리)
 */
export function startGather(item, onDone) {
    if (!G.player || item.done) return;
    if (job && job.item === item) return;

    // 다른 것을 캐다 말았으면 그쪽을 먼저 제자리로 돌려놓는다
    if (job) restoreTarget(job.item);

    const cfg = KIND[item.material] || KIND.wood;

    job = {
        item,
        cfg,
        onDone,
        t: 0,
        hits: 0
    };

    // 대상을 향해 선다
    const dx = item.position.x - G.player.position.x;
    const dz = item.position.z - G.player.position.z;
    G.player.rotation.y = Math.atan2(dx, dz);

    showMessage((item.material === "wood" ? "나무를 베고 있습니다" : "돌을 캐고 있습니다") + "…");
}

export function cancelGather(quiet = false) {
    if (!job) return;
    restoreTarget(job.item);
    job = null;
    if (!quiet) showMessage("채집을 멈췄습니다.");
}

/** 대상이 휘청인 것을 되돌린다 */
function restoreTarget(item) {
    if (item && item.group) {
        item.group.rotation.z = 0;
        item.group.position.y = item.group.userData.gatherBaseY ?? item.group.position.y;
    }
}

/**
 * 한 프레임. loop.js 가 매 프레임 부른다 (파편은 채집이 없어도 계속 움직인다).
 */
export function updateGather(delta) {
    updateChips(delta);
    if (!job) return;

    const item = job.item;

    // 대상이 사라졌거나 시대가 바뀌면 그만둔다
    if (item.done || G.transitioning || !G.player) {
        cancelGather(true);
        return;
    }

    // 멀어지면 중단
    const d = Math.hypot(
        item.position.x - G.player.position.x,
        item.position.z - G.player.position.z
    );
    if (d > item.range + 0.8) {
        cancelGather();
        return;
    }

    if (item.group.userData.gatherBaseY === undefined) {
        item.group.userData.gatherBaseY = item.group.position.y;
    }

    job.t += delta;

    // 내리칠 때마다 한 번씩 맞는다
    const shouldHit = Math.floor(job.t / job.cfg.interval) + 1;
    if (shouldHit > job.hits && job.hits < job.cfg.swings) {
        job.hits = shouldHit;
        impact(item, job.cfg);
    }

    // 맞은 뒤 0.1초 동안 휘청인다
    const since = job.t - (job.hits - 1) * job.cfg.interval;
    const wobble = Math.max(0, 1 - since / 0.22);
    item.group.rotation.z = Math.sin(since * 46) * job.cfg.shake * wobble;
    item.group.position.y = (item.group.userData.gatherBaseY ?? 0) - 0.06 * wobble;

    // 다 캐냈다
    if (job.hits >= job.cfg.swings && since > 0.26) {
        const done = job;
        restoreTarget(item);
        job = null;
        done.onDone(item);
    }
}

/** 한 번 내리쳤다 — 소리와 파편 */
function impact(item, cfg) {
    AudioSystem.playHammer();

    const y = terrainHeight(item.position.x, item.position.z);
    for (let i = 0; i < cfg.chipCount; i++) {
        const a = randRange(0, Math.PI * 2);
        const sp = randRange(1.1, 2.9);
        const mesh = addBlob(G.world, randRange(0.045, 0.1), pick(cfg.chip),
            item.position.x, y + randRange(0.25, 0.65), item.position.z,
            {
                sx: randRange(0.8, 1.6), sy: randRange(0.4, 0.9), sz: randRange(0.9, 1.4),
                ry: randRange(0, Math.PI), roughness: 1, castShadow: false, receiveShadow: false
            });

        chips.push({
            mesh,
            baseScale: mesh.scale.clone(),
            vx: Math.cos(a) * sp,
            vy: randRange(1.8, 3.6),
            vz: Math.sin(a) * sp,
            spin: randRange(-9, 9),
            life: randRange(0.7, 1.1),
            t: 0,
            groundY: y
        });
    }
}

/** 파편: 튀어 올랐다가 떨어지고 사그라든다 */
function updateChips(delta) {
    if (!chips.length) return;

    const alive = [];
    for (const c of chips) {
        c.t += delta;

        // 월드가 통째로 바뀌었으면 버린다
        if (!c.mesh.parent || c.t > c.life) {
            if (c.mesh.parent) c.mesh.parent.remove(c.mesh);
            c.mesh.geometry.dispose();
            c.mesh.material.dispose();
            continue;
        }

        c.vy -= 9.4 * delta;
        c.mesh.position.x += c.vx * delta;
        c.mesh.position.y += c.vy * delta;
        c.mesh.position.z += c.vz * delta;
        c.mesh.rotation.x += c.spin * delta;
        c.mesh.rotation.z += c.spin * 0.7 * delta;

        // 땅에 닿으면 튀고 미끄러진다
        if (c.mesh.position.y < c.groundY + 0.04) {
            c.mesh.position.y = c.groundY + 0.04;
            c.vy = -c.vy * 0.32;
            c.vx *= 0.55;
            c.vz *= 0.55;
            c.spin *= 0.5;
        }

        // 끝에서 가라앉으며 사라진다
        const k = c.t / c.life;
        if (k > 0.7) {
            const f = 1 - (k - 0.7) / 0.3;
            const b = c.baseScale;
            c.mesh.scale.set(b.x * f, b.y * f, b.z * f);
        }

        alive.push(c);
    }
    chips = alive;
}

/** 시대가 바뀔 때 — 남은 파편과 진행 중인 채집을 버린다 */
export function resetGather() {
    job = null;
    chips = [];
}
