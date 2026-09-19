/**
 * raid.js — 들개
 *
 * 싸우지 않는다. 이 게임에는 체력도 무기도 없다.
 * 대신 들개는 **일을 멈추게 한다.**
 *
 *   한동안 지나면 들개 떼가 들판 끝에서 내려온다
 *   집 가까이 붙으면 그 둘레의 주민이 겁을 먹고 재료를 나르지 못한다
 *   화톳불 빛 안이나 울타리 안은 건드리지 못한다
 *   망루가 있으면 내려오기 전에 미리 알려 준다
 *
 * 그래서 늘어나는 것은 무기가 아니라 건물이다.
 * 집을 지을 이유가 "손이 는다"였다면, 화톳불과 울타리를 지을 이유는 이것이다.
 *
 * 플레이어가 가까이 가면 들개는 물러선다. 쫓을 수는 있지만 잡을 수는 없다.
 */
import { AudioSystem } from "./audio.js";
import { addWolf } from "./npc.js";
import { rand, randRange } from "./rng.js";
import { G } from "./state.js";
import { isUnderwater, terrainHeight } from "./terrain.js";
import { showMessage } from "./ui.js";

/** 시대를 열고 첫 습격까지 / 그 뒤의 간격 (초) */
const FIRST_RAID = 150;
const RAID_EVERY = 120;

/** 한 번 내려와 머무는 시간 */
const STAY = 42;

/** 막아 주는 반경 */
export const GUARD_RADIUS = { campfire: 8.0, fence: 5.0 };

/** 들개가 이만큼 가까이 있으면 주민이 겁을 먹는다 */
const SCARE_RADIUS = 9.0;

/** 플레이어가 이만큼 다가오면 물러선다 */
const SHY_RADIUS = 3.4;

/** 망루가 있으면 이만큼 먼저 알려 준다 */
const WARN_LEAD = 20;

const state = {
    timer: FIRST_RAID,
    warned: false,
    wolves: [],
    stayLeft: 0,
    active: false
};

/* ================================================================
   마을 쪽 사정
   ================================================================ */

function countOf(type) {
    let n = 0;
    for (const b of G.village) if (b.type === type) n++;
    return n;
}

/** 그 자리가 불빛이나 울타리 안인가 */
export function isGuarded(x, z) {
    for (const b of G.village) {
        const r = GUARD_RADIUS[b.type];
        if (!r) continue;
        if (Math.hypot(b.x - x, b.z - z) <= r) return true;
    }
    return false;
}

/** 들개가 노릴 만한 집 — 지키지 않는 것부터 */
function pickTarget() {
    const open = G.village.filter((b) => !GUARD_RADIUS[b.type] && !isGuarded(b.x, b.z));
    if (open.length) return open[Math.floor(rand() * open.length)];

    // 다 지키고 있으면 마을 언저리를 겉돈다
    if (G.village.length) {
        const b = G.village[Math.floor(rand() * G.village.length)];
        return { x: b.x, z: b.z, circling: true };
    }
    return null;
}

/** 이 자리 가까이에 들개가 있는가 — settlers.js 가 묻는다 */
export function wolvesNear(x, z) {
    for (const w of state.wolves) {
        if (Math.hypot(w.group.position.x - x, w.group.position.z - z) < SCARE_RADIUS) return true;
    }
    return false;
}

export function raidActive() {
    return state.active;
}

/** 다음 습격까지 남은 시간 (초). 망루가 없으면 -1 (모른다) */
export function raidCountdown() {
    if (state.active) return 0;
    if (!countOf("tower")) return -1;
    return Math.max(0, Math.round(state.timer));
}

/* ================================================================
   습격
   ================================================================ */

function spawnSpot() {
    for (let i = 0; i < 20; i++) {
        const a = randRange(0, Math.PI * 2);
        const r = randRange(27, 31);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!isUnderwater(x, z)) return [x, z];
    }
    return [28, 0];
}

function startRaid() {
    const houses = G.village.filter((b) => !GUARD_RADIUS[b.type]).length;
    const count = Math.max(1, Math.min(4, 1 + Math.floor(houses / 2)));

    state.wolves = [];
    for (let i = 0; i < count; i++) {
        const [x, z] = spawnSpot();
        const group = addWolf(x, z);
        const target = pickTarget();
        state.wolves.push({
            group,
            marker: group.userData.marker,
            target,
            home: [x, z],
            leaving: false,
            shyLeft: 0,
            wander: randRange(0, Math.PI * 2)
        });
    }

    state.active = true;
    state.stayLeft = STAY;
    state.warned = false;

    AudioSystem.playHowl();
    showMessage("들개가 마을로 내려옵니다.\n불빛이 닿는 곳과 울타리 안은 건드리지 못합니다.");
}

function endRaid(quiet = false) {
    // 붙을 자리를 못 찾고 물러가는 것과 실컷 헤집고 가는 것은 다르다
    const blocked = state.wolves.length > 0
        && state.wolves.every((w) => (w.blockedFor || 0) > 0);

    for (const w of state.wolves) {
        if (w.group.parent) w.group.parent.remove(w.group);
        // 걷기 애니메이션 등록도 같이 걷어낸다
        const anim = w.group.userData.anim;
        if (anim) {
            const i = G.animated.indexOf(anim);
            if (i >= 0) G.animated.splice(i, 1);
        }
        const mi = G.mapMarkers.indexOf(w.marker);
        if (mi >= 0) G.mapMarkers.splice(mi, 1);
    }
    state.wolves = [];
    state.active = false;
    state.timer = RAID_EVERY;
    state.warned = false;
    if (!quiet) {
        showMessage(blocked
            ? "들개가 불빛과 울타리를 못 넘고 물러갔습니다."
            : "들개가 물러갔습니다.");
    }
}

/* ================================================================
   갱신
   ================================================================ */

export function updateRaid(delta) {
    if (G.transitioning || G.demoFinished || G.prologue) return;
    if (!G.player || !G.world) return;

    // 지은 것이 없으면 올 이유도 없다
    if (!G.village.length) return;

    if (!state.active) {
        state.timer -= delta;

        // 망루가 있으면 미리 알려 준다
        if (!state.warned && countOf("tower") && state.timer <= WARN_LEAD) {
            state.warned = true;
            showMessage("망루에서 신호가 옵니다.\n곧 들개가 내려옵니다. 화톳불과 울타리를 살피세요.");
            AudioSystem.playHowl();
        }

        if (state.timer <= 0) startRaid();
        return;
    }

    // ---- 습격 중 ----
    state.stayLeft -= delta;
    if (state.stayLeft <= 0) {
        for (const w of state.wolves) w.leaving = true;
    }

    let allGone = true;

    for (const w of state.wolves) {
        const g = w.group;
        const anim = g.userData.anim;
        if (!anim) continue;

        // 플레이어가 다가오면 물러선다 (싸우지는 않는다)
        const dp = Math.hypot(
            g.position.x - G.player.position.x,
            g.position.z - G.player.position.z
        );
        if (dp < SHY_RADIUS) w.shyLeft = 2.2;
        if (w.shyLeft > 0) w.shyLeft -= delta;

        let tx, tz;

        if (w.leaving || !w.target) {
            tx = w.home[0]; tz = w.home[1];
            if (Math.hypot(g.position.x - tx, g.position.z - tz) > 1.5) allGone = false;
        } else if (w.shyLeft > 0) {
            // 플레이어 반대쪽으로
            const ax = g.position.x - G.player.position.x;
            const az = g.position.z - G.player.position.z;
            const d = Math.hypot(ax, az) || 1;
            tx = g.position.x + (ax / d) * 6;
            tz = g.position.z + (az / d) * 6;
            allGone = false;
        } else {
            // 집으로 다가가되, 불빛 안으로는 들어가지 못한다
            w.wander += delta * 0.6;

            // 마을을 다 지키고 있으면 애초에 붙을 자리가 없다
            if (w.target.circling) w.blockedFor = (w.blockedFor || 0) + delta;

            const circle = w.target.circling ? 7.5 : 2.2;
            tx = w.target.x + Math.cos(w.wander) * circle;
            tz = w.target.z + Math.sin(w.wander) * circle;

            if (isGuarded(tx, tz)) {
                // 불빛에 막혔다 — 둘레를 돌다 일찍 물러간다
                w.wander += delta * 1.6;
                tx = w.target.x + Math.cos(w.wander) * 11;
                tz = w.target.z + Math.sin(w.wander) * 11;
                w.blockedFor = (w.blockedFor || 0) + delta;
                if (w.blockedFor > 12) w.leaving = true;
            }
            allGone = false;
        }

        // 걷기는 loop.js 의 npc 애니메이터가 맡는다. 목적지만 갈아 끼운다.
        anim.waypoints[0][0] = tx;
        anim.waypoints[0][1] = tz;
        anim.pauseLeft = 0;

        // 지도에 붉은 점
        if (w.marker) {
            w.marker.x = g.position.x;
            w.marker.z = g.position.z;
        }
    }

    if (state.stayLeft <= 0 && allGone) endRaid();
}

/** 시대가 바뀔 때 */
export function resetRaid() {
    state.wolves = [];
    state.active = false;
    state.warned = false;
    state.timer = FIRST_RAID;
    state.stayLeft = 0;
}

export const RAID_STATE = state;
