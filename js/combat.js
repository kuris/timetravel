/**
 * combat.js — 위험 NPC 시스템
 *
 * 적/위험 존재를 등록하면 매 프레임 플레이어와의 거리를 확인한다.
 * 범위 내에 진입하면 쿨다운마다 피해를 준다.
 * HP가 0이 되면 붉은 화면 효과 + 현재 시대 리스폰.
 */
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { dom, showMessage } from "./ui.js";
import { transitionToAge } from "./transition.js";

/**
 * 위험 NPC 등록
 * @param {object} opts
 *   group   — THREE.Group (위치 기준, 없으면 waypoints[0]에 생성)
 *   waypoints — 순찰 경로 [[x,z],...] (없으면 제자리)
 *   speed   — 순찰 속도 (기본 1.6)
 *   name    — 표시 이름
 *   damage  — 1회 피해량 (기본 20)
 *   range / attackRadius — 피해 거리 (기본 2.5)
 *   cooldown / attackCooldown — 피해 쿨다운 초 (기본 2.5)
 *   warn / detectRadius — 경고 거리 (기본 5)
 *   warnMsg — 경고 메시지
 */
export function registerEnemy(opts) {
    const waypoints = opts.waypoints || null;
    let group = opts.group || null;

    if (!group && waypoints && waypoints.length > 0) {
        group = makeWolfMarker(waypoints[0][0], waypoints[0][1]);
    }

    const enemy = {
        group,
        name: opts.name || "위험",
        damage: opts.damage ?? 20,
        range: opts.range ?? opts.attackRadius ?? 2.5,
        cooldown: opts.cooldown ?? opts.attackCooldown ?? 2.5,
        _timer: 0,
        warn: opts.warn ?? opts.detectRadius ?? 5,
        warnMsg: opts.warnMsg || (opts.name ? "⚠️ " + opts.name + "의 기척이 느껴집니다. 가까이 가지 마세요." : null),
        _warned: false,
        waypoints,
        waypointIndex: 1,
        speed: opts.speed ?? 1.6
    };
    G.enemies.push(enemy);
    return enemy;
}

/** 늑대 자리 표시 — 어두운 형체 + 붉은 눈 */
function makeWolfMarker(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);

    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x1c1512 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.4), bodyMat);
    body.position.y = 0.45;
    g.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), bodyMat);
    head.position.set(0.55, 0.72, 0);
    g.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3322 });
    for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.06), eyeMat);
        eye.position.set(0.72, 0.76, s * 0.1);
        g.add(eye);
    }

    for (const [lx, lz] of [[-0.3, -0.14], [-0.3, 0.14], [0.3, -0.14], [0.3, 0.14]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), bodyMat);
        leg.position.set(lx, 0.22, lz);
        g.add(leg);
    }

    if (G.world) G.world.add(g);
    return g;
}

/** 순찰 이동 */
function updatePatrol(enemy, delta) {
    if (!enemy.waypoints || enemy.waypoints.length < 2 || !enemy.group) return;

    const wp = enemy.waypoints[enemy.waypointIndex % enemy.waypoints.length];
    const dx = wp[0] - enemy.group.position.x;
    const dz = wp[1] - enemy.group.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);

    if (d < 0.3) {
        enemy.waypointIndex = (enemy.waypointIndex + 1) % enemy.waypoints.length;
        return;
    }

    const step = Math.min(d, enemy.speed * delta);
    enemy.group.position.x += (dx / d) * step;
    enemy.group.position.z += (dz / d) * step;
    enemy.group.position.y = terrainHeight(enemy.group.position.x, enemy.group.position.z);
    enemy.group.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
}

/** 매 프레임 호출 */
export function updateCombat(delta) {
    if (!G.player || G.transitioning || G.demoFinished) return;

    // 무적 쿨다운
    if (G.hpCooldown > 0) G.hpCooldown -= delta;

    for (const enemy of G.enemies) {
        enemy._timer = Math.max(0, enemy._timer - delta);
        if (!enemy.group) continue;

        updatePatrol(enemy, delta);

        const dx = enemy.group.position.x - G.player.position.x;
        const dz = enemy.group.position.z - G.player.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);

        // 경고 범위 진입
        if (d <= enemy.warn && !enemy._warned && enemy.warnMsg) {
            enemy._warned = true;
            showMessage("⚠️ " + enemy.warnMsg);
        }
        if (d > enemy.warn) enemy._warned = false;

        // 피해 범위 진입
        if (d <= enemy.range && enemy._timer <= 0 && G.hpCooldown <= 0) {
            applyDamage(enemy.damage, enemy.name);
            enemy._timer = enemy.cooldown;
        }
    }

    // 리스폰 처리
    if (G.respawnPending && !G.transitioning) {
        G.respawnPending = false;
        transitionToAge(G.currentAge);
    }
}

/** 피해 적용 */
export function applyDamage(amount, source) {
    if (G.hpCooldown > 0) return;

    G.hp = Math.max(0, G.hp - amount);
    G.hpCooldown = 1.5;

    updateHPBar();
    flashDamage();

    if (G.hp <= 0) {
        onDeath(source);
    }
}

/** HP 회복 */
export function healHP(amount) {
    G.hp = Math.min(G.maxHp, G.hp + amount);
    updateHPBar();
}

function onDeath(source) {
    showMessage("【 쓰러졌습니다 】\n\n" + (source || "알 수 없는 위험") + "에 의해 탐험이 중단됩니다.\n이 시대의 처음으로 돌아갑니다...");
    dom.flash.style.backgroundColor = "#8b0000";
    dom.flash.style.opacity = "0.7";
    dom.flash.style.transition = "opacity 0.2s";

    G.hp = G.maxHp;
    G.stamina = G.maxStamina;
    updateHPBar();
    updateStaminaBar();

    setTimeout(() => {
        dom.flash.style.opacity = "0";
        G.respawnPending = true;
    }, 1800);
}

function flashDamage() {
    dom.flash.style.backgroundColor = "#cc2200";
    dom.flash.style.opacity = "0.45";
    dom.flash.style.transition = "opacity 0.08s";
    setTimeout(() => {
        dom.flash.style.transition = "opacity 0.4s";
        dom.flash.style.opacity = "0";
    }, 120);
}

export function updateHPBar() {
    const bar = document.getElementById("hpFill");
    const label = document.getElementById("hpLabel");
    if (!bar) return;
    const pct = Math.max(0, G.hp / G.maxHp * 100);
    bar.style.width = pct + "%";
    if (pct > 60) bar.style.background = "linear-gradient(90deg, #2a9d4e, #3dbd64)";
    else if (pct > 30) bar.style.background = "linear-gradient(90deg, #c97c1a, #e89e2a)";
    else bar.style.background = "linear-gradient(90deg, #8b1a1a, #cc2222)";
    if (label) label.textContent = Math.ceil(G.hp) + " / " + G.maxHp;
}

export function updateStaminaBar() {
    const bar = document.getElementById("staminaFill");
    if (!bar) return;
    const pct = Math.max(0, G.stamina / G.maxStamina * 100);
    bar.style.width = pct + "%";
    if (pct > 50) bar.style.background = "linear-gradient(90deg, #1a6e9e, #2894cc)";
    else if (pct > 20) bar.style.background = "linear-gradient(90deg, #9e7c1a, #c8a022)";
    else bar.style.background = "linear-gradient(90deg, #7a1a1a, #aa2222)";
}
