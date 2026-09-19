/**
 * 상호작용 — 조사, 획득, 시간의 문
 */
import { AudioSystem } from "./audio.js";
import { addBlob, fadeGroup, makeBasicMat } from "./build.js";
import { AGE_DATA } from "./config.js";
import { addMapMarker } from "./minimap.js";
import { randRange } from "./rng.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { transitionToAge } from "./transition.js";
import { addInventoryItem, dom, showMessage, updateUI } from "./ui.js";

export function registerInteractable({
    name,
    description,
    group,
    pickup = true,
    range = 1.75,
    glowColor = 0xffd071
}) {
    const p = new THREE.Vector3();
    group.getWorldPosition(p);

    const glow = createInteractionGlow(p.x, p.z, glowColor);
    const item = {
        name,
        description,
        group,
        pickup,
        range,
        done: false,
        glow,
        position: new THREE.Vector3(p.x, 0, p.z)
    };

    item.marker = addMapMarker(p.x, p.z, "#ffd071", 3, "artifact");

    G.interactables.push(item);
    return item;
}

export function createInteractionGlow(x, z, color) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z) + 0.08, z);

    const ringMat = makeBasicMat(color, {
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.025, 5, 24),
        ringMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = false;
    ring.receiveShadow = false;
    g.add(ring);

    const mote = addBlob(g, 0.08, color, 0, 0.55, 0, {
        material: makeBasicMat(color, { transparent: true, opacity: 0.9 }),
        castShadow: false,
        receiveShadow: false
    });

    const light = new THREE.PointLight(color, 0.45, 4);
    light.position.set(0, 0.55, 0);
    g.add(light);

    G.world.add(g);

    G.animated.push({
        type: "glow",
        group: g,
        ring,
        mote,
        light,
        baseY: g.position.y,
        speed: randRange(0.8, 1.25),
        phase: randRange(0, Math.PI * 2)
    });

    return g;
}

export function getNearestAction() {
    if (!G.player) return null;

    let best = null;
    let bestDist = Infinity;

    for (const item of G.interactables) {
        if (item.done) continue;

        const dx = item.position.x - G.player.position.x;
        const dz = item.position.z - G.player.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);

        if (d <= item.range && d < bestDist) {
            bestDist = d;
            best = { kind: "object", item, distance: d };
        }
    }

    if (G.activeGate) {
        const dx = G.activeGate.position.x - G.player.position.x;
        const dz = G.activeGate.position.z - G.player.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);

        if (d <= G.activeGate.range && d < bestDist + 0.25) {
            best = {
                kind: G.activeGate.active ? "gate" : "inactiveGate",
                gate: G.activeGate,
                distance: d
            };
        }
    }

    return best;
}

export function updatePrompt() {
    if (G.transitioning || G.demoFinished) {
        dom.prompt.classList.add("hidden");
        return;
    }

    const action = getNearestAction();
    if (!action) {
        dom.prompt.classList.add("hidden");
        return;
    }

    if (action.kind === "object") {
        dom.prompt.textContent = "[E] 조사 · " + action.item.name;
    } else if (action.kind === "gate") {
        dom.prompt.textContent = "[E] 시대 이동";
    } else {
        dom.prompt.textContent = "[E] 고인돌 확인";
    }

    dom.prompt.classList.remove("hidden");
}

export function tryInteract() {
    if (G.transitioning || G.demoFinished) return;

    const action = getNearestAction();

    if (!action) {
        showMessage("조사할 대상에 조금 더 가까이 다가가세요.");
        return;
    }

    if (action.kind === "object") {
        investigateObject(action.item);
    } else if (action.kind === "gate") {
        showMessage("고인돌 사이의 푸른빛이 화면을 삼킵니다.\n잊힌 시간의 결을 따라 다음 시대로 이동합니다.");
        transitionToAge(G.currentAge + 1);
    } else if (action.kind === "inactiveGate") {
        AudioSystem.playInvestigate();
        showMessage("돌 구조물은 아직 차갑게 잠들어 있습니다.\n이 시대에 흩어진 세 흔적을 모두 조사해야 시간의 문이 열릴 것 같습니다.");
    }
}

export function investigateObject(item) {
    if (item.done) return;

    item.done = true;
    G.ageProgress++;

    if (item.marker) item.marker.done = true;
    if (item.glow) item.glow.visible = false;
    fadeGroup(item.group);

    AudioSystem.playInvestigate();

    if (item.pickup) {
        setTimeout(() => AudioSystem.playPickup(), 90);
    }

    addInventoryItem(item.name);

    const extra = handleAgeCompletion();
    showMessage(item.description + (extra ? "\n\n" + extra : ""));
    updateUI();
}

export function handleAgeCompletion() {
    const age = AGE_DATA[G.currentAge];

    if (G.ageProgress < age.total || G.ageCompleteTriggered) return "";
    G.ageCompleteTriggered = true;

    if (G.currentAge === 0) {
        activateGate();
        return "세 유물의 기억이 서로 맞물립니다.\n시간의 문이 깨어났습니다.";
    }

    if (G.currentAge === 1) {
        activateGate();
        return "고인돌 제단의 문양과 청동 방울 소리가 하나의 리듬이 됩니다.\n시간의 문이 깨어났습니다.";
    }

    if (G.currentAge === 2) {
        AudioSystem.playGate();
        G.demoFinished = true;
        setTimeout(() => {
            dom.completeOverlay.classList.add("show");
        }, 800);
        return "저녁 마을의 기록이 모두 이어졌습니다.\n시간유적의 첫 복원이 완료되었습니다.";
    }

    return "";
}

export function activateGate() {
    if (!G.activeGate || G.activeGate.active) return;

    G.activeGate.active = true;
    if (G.activeGate.marker) G.activeGate.marker.done = true;
    G.activeGate.portal.visible = true;
    G.activeGate.ring.visible = true;
    G.activeGate.portal.material.opacity = 0.34;
    G.activeGate.ring.material.opacity = 0.95;
    G.activeGate.light.intensity = 1.35;

    AudioSystem.playGate();
    updateUI();
}
