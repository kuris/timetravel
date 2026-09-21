/**
 * 이정표 — 목표 방향 안내
 */
import { AudioSystem } from "./audio.js";
import { addBlob, addBox, addCylinder } from "./build.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { dom, showMessage } from "./ui.js";

export let hintActive = false;
export let hintSign = null;     // 플레이어 옆에 세워지는 3D 이정표
export let hintTimer = null;

export const HINT_DURATION = 9000; // ms

/** 지금 안내할 목표를 고른다 */
export function getHintTarget() {
    // 1) 아직 조사하지 않은 대상 중 가장 가까운 것
    let best = null, bestDist = Infinity;

    for (const item of G.interactables) {
        if (item.done) continue;
        const d = Math.hypot(
            item.position.x - G.player.position.x,
            item.position.z - G.player.position.z
        );
        if (d < bestDist) {
            bestDist = d;
            best = { name: item.name, x: item.position.x, z: item.position.z, distance: d };
        }
    }

    // 2) 전부 조사했다면 시간의 문
    if (!best && G.activeGate && G.activeGate.active) {
        const d = Math.hypot(
            G.activeGate.position.x - G.player.position.x,
            G.activeGate.position.z - G.player.position.z
        );
        best = { name: "시간의 문", x: G.activeGate.position.x, z: G.activeGate.position.z, distance: d };
    }

    return best;
}

/** 나무 이정표 만들기 (기본 도형 조합) */
export function createSignpost() {
    const g = new THREE.Group();

    // 기둥
    addCylinder(g, 0.045, 0.06, 1.05, 5, 0x6b4826, 0, 0.52, 0, { map: G.TEX.wood });

    // 방향을 가리키는 판자 (로컬 +Z 를 향한다)
    const board = new THREE.Group();
    board.position.y = 0.92;
    g.add(board);

    addBox(board, 0.62, 0.20, 0.05, 0x8a6534, 0.18, 0, 0, 0, { map: G.TEX.wood });
    // 화살촉
    const tip = addBox(board, 0.17, 0.17, 0.05, 0x8a6534, 0.55, 0, 0, Math.PI / 4, { map: G.TEX.wood });
    tip.rotation.z = Math.PI / 4;
    tip.rotation.y = 0;

    // 판자에 새긴 홈
    addBox(board, 0.42, 0.03, 0.02, 0x4a3319, 0.16, 0.04, 0.03);
    addBox(board, 0.34, 0.03, 0.02, 0x4a3319, 0.14, -0.03, 0.03);

    // 발밑의 작은 돌무더기
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        addBlob(g, 0.11, 0x7b746c, Math.cos(a) * 0.17, 0.05, Math.sin(a) * 0.17, {
            sy: 0.5, ry: a, map: G.TEX.stone, castShadow: false
        });
    }

    // 은은한 빛 (밤 시대에도 보이도록)
    const light = new THREE.PointLight(0xffc978, 0.5, 3.2);
    light.position.set(0, 1.0, 0);
    g.add(light);

    g.userData.board = board;
    return g;
}

/** 남은 횟수를 버튼에 적는다 */
export function updateHintBadge() {
    if (dom.hintBtn) {
        dom.hintBtn.textContent = "[H] 이정표 (" + Math.max(0, G.hintCharges) + ")";
        dom.hintBtn.classList.toggle("empty", G.hintCharges <= 0);
    }
}

export function toggleHint() {
    hintActive ? hideHint() : showHint();
}

export function showHint() {
    if (G.transitioning || G.demoFinished || !G.player) return;

    const target = getHintTarget();
    if (!target) {
        showMessage("지금은 안내할 곳이 없습니다.");
        return;
    }

    // 무제한이면 걸어다닐 이유가 없어진다. 시대마다 세 번.
    if (G.hintCharges <= 0) {
        AudioSystem.playInvestigate();
        showMessage("이정표를 다 썼습니다. (시대마다 3회)");
        return;
    }
    G.hintCharges--;
    updateHintBadge();

    hintActive = true;
    dom.hintBtn.classList.add("on");
    dom.signpost.classList.add("show");

    // 3D 이정표를 플레이어 바로 옆에 세운다
    if (!hintSign) {
        hintSign = createSignpost();
        G.scene.add(hintSign);
    }
    hintSign.visible = true;

    AudioSystem.playInvestigate();

    // 일정 시간 후 자동으로 사라진다
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, HINT_DURATION);
}

export function hideHint() {
    hintActive = false;
    clearTimeout(hintTimer);
    dom.hintBtn.classList.remove("on");
    dom.signpost.classList.remove("show");
    if (hintSign) hintSign.visible = false;
}

/** 매 프레임 이정표의 방향과 거리 갱신 */
export function updateHint() {
    if (!hintActive || !G.player) return;

    const target = getHintTarget();
    if (!target) {
        hideHint();
        return;
    }

    const dx = target.x - G.player.position.x;
    const dz = target.z - G.player.position.z;
    const dist = Math.hypot(dx, dz);

    // ---- 3D 이정표: 플레이어 옆에 서서 목표를 가리킨다 ----
    if (hintSign) {
        hintSign.position.set(
            G.player.position.x - 1.15,
            terrainHeight(G.player.position.x - 1.15, G.player.position.z + 0.5),
            G.player.position.z + 0.5
        );
        // 판자가 목표를 향하도록 (로컬 +X 가 화살표 방향)
        hintSign.userData.board.rotation.y = -Math.atan2(dz, dx);
    }

    // ---- 화면 아래 표시 ----
    // 등각 화면 기준으로 방향을 계산한다.
    // 화면 오른쪽 = 월드 (1,0,-1)/√2, 화면 위쪽 = 월드 -(1,0,1)/√2
    const sx = (dx - dz) * Math.SQRT1_2;
    const syUp = -(dx + dz) * Math.SQRT1_2 * 0.54; // 등각 수직 압축

    const angle = Math.atan2(sx, syUp) * (180 / Math.PI);
    dom.signArrow.style.transform = "rotate(" + angle.toFixed(1) + "deg)";

    dom.signText.innerHTML = "이정표 — <b>" + target.name + "</b>";
    dom.signDist.textContent = "약 " + Math.round(dist * 1.4) + "걸음 · " + compassName(dx, dz);
}

/** 월드 방향을 한국식 방위로 (지도의 北 과 같은 기준) */
export function compassName(dx, dz) {
    const names = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
    // -Z 를 북으로 둔다
    let a = Math.atan2(dx, -dz) * (180 / Math.PI);
    if (a < 0) a += 360;
    return names[Math.round(a / 45) % 8] + "쪽";
}

/** 시대가 바뀔 때 호출. 이전 scene 에 붙어 있던 이정표 참조를 버린다. */
export function resetHint() {
    hintSign = null;
    hideHint();
}

