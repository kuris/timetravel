/**
 * 상호작용 — 조사, 획득, 시간의 문
 */
import { AudioSystem } from "./audio.js";
import { addBlob, fadeGroup, makeBasicMat } from "./build.js";
import { AGE_DATA } from "./config.js";
import { addMapMarker } from "./minimap.js";
import { randRange } from "./rng.js";
import { G , progressGoal } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { transitionToAge } from "./transition.js";
import { addInventoryItem, dom, showMessage, updateUI } from "./ui.js";
import { addJournalEntry } from "./journal.js";
import { openChoiceDialogue } from "./dialogue.js";

export function registerInteractable({
    name,
    description,
    group,
    pickup = true,
    range = 1.75,
    glowColor = 0xffd071,
    locked = false,      // 잠긴 유물: 단서 필요
    unlockClue = null,   // 필요 단서 ID
    lockedMsg = null,    // 잠겼을 때 메시지
    material = null,     // 재료 노드면 "wood" | "stone"
    amount = 1           // 주울 개수
}) {
    const p = new THREE.Vector3();
    group.getWorldPosition(p);

    const glow = createInteractionGlow(p.x, p.z, locked ? 0x6090c0 : glowColor);
    const item = {
        material,
        amount,
        name,
        description,
        group,
        pickup,
        range,
        done: false,
        glow,
        locked,
        unlockClue,
        lockedMsg,
        position: new THREE.Vector3(p.x, 0, p.z)
    };

    // 재료는 지도에 찍지 않는다. 찾는 재미가 남아야 한다.
    if (!material) {
        item.marker = addMapMarker(p.x, p.z, locked ? "#6090c0" : "#ffd071", 3, "artifact");
    }

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

    // NPC 대화 대상
    if (G.npcs) {
        for (const npc of G.npcs) {
            const dx = npc.group.position.x - G.player.position.x;
            const dz = npc.group.position.z - G.player.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);

            if (d <= npc.range && d < bestDist) {
                bestDist = d;
                best = { kind: "npc", npc, distance: d };
            }
        }
    }

    // 아무 대상도 없고 지을 수 있는 자리라면 "짓기"
    if (!best && G.buildReady) {
        best = { kind: "build", distance: 0 };
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

    if (action.kind === "build") {
        dom.prompt.textContent = "[E] 이 자리에 짓기";
    } else if (action.kind === "object") {
        const isLocked = action.item.locked && action.item.unlockClue && !G.clues.has(action.item.unlockClue);
        dom.prompt.textContent = isLocked
            ? "🔒 " + action.item.name + " (단서 필요)"
            : (action.item.material ? "[E] 줍기 · " : "[E] 조사 · ") + action.item.name;
    } else if (action.kind === "npc") {
        dom.prompt.textContent = "[E] " + (action.npc.isAnimal ? "교감 · " : "대화 · ") + action.npc.name;
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
        showMessage("조사하거나 대화할 대상에 조금 더 가까이 다가가세요.");
        return;
    }

    if (action.kind === "object") {
        investigateObject(action.item);
    } else if (action.kind === "build") {
        import("./village.js").then((m) => m.openBuildMenu());
    } else if (action.kind === "npc") {
        if (action.npc.choices && action.npc.choices.length > 0) {
            openChoiceDialogue(action.npc);
        } else {
            talkToNPC(action.npc);
        }
    } else if (action.kind === "gate") {
        showMessage("고인돌 사이의 푸른빛이 화면을 삼킵니다.\n잊힌 시간의 결을 따라 다음 시대로 이동합니다.");
        transitionToAge(G.currentAge + 1);
    } else if (action.kind === "inactiveGate") {
        AudioSystem.playInvestigate();
        showMessage("돌 구조물은 아직 차갑게 잠들어 있습니다.\n마을이 더 자라야 시간의 문이 열릴 것 같습니다.\n\n발전도 " + G.progress + " / " + progressGoal());
    }
}

export function talkToNPC(npc) {
    if (!G.player) return;

    // NPC가 플레이어를 바라보도록 회전
    const dx = G.player.position.x - npc.group.position.x;
    const dz = G.player.position.z - npc.group.position.z;
    npc.group.rotation.y = Math.atan2(dx, dz);

    // 순찰 중이었다면 5초간 멈춰 섬
    if (npc.group.userData && npc.group.userData.anim) {
        npc.group.userData.anim.pauseLeft = 5.0;
    }

    // 소리
    if (npc.isAnimal) {
        AudioSystem.playPickup();
    } else {
        AudioSystem.playInvestigate();
    }

    // 대사 출력 (순환)
    const line = npc.lines[npc.lineIndex % npc.lines.length];
    npc.lineIndex++;

    showMessage("【 " + npc.name + " 】\n\n\"" + line + "\"");

    // 첫 대화만 일지에 기록
    if (npc.lineIndex === 1) {
        addJournalEntry("npc", npc.name, line);
    }
}

export function investigateObject(item) {
    if (item.done) return;

    // 재료 채집 — 조사가 아니라 줍는 것이다. 발전도와 무관하다.
    if (item.material) {
        item.done = true;
        if (item.glow) item.glow.visible = false;
        fadeGroup(item.group);
        G.materials[item.material] = (G.materials[item.material] || 0) + (item.amount || 1);
        AudioSystem.playPickup();
        const label = { wood: "나무", stone: "돌" }[item.material] || item.material;
        showMessage(label + "을(를) " + (item.amount || 1) + "개 주웠습니다.\n"
            + "가진 것 — 나무 " + G.materials.wood + ", 돌 " + G.materials.stone);
        import("./village.js").then((m) => m.updateVillageUI());
        return;
    }

    // 프롤로그 낯선 돌 — 전용 플로우 (카운트/게이트와 무관)
    if (item.prologueGate) {
        item.done = true;
        if (item.marker) item.marker.done = true;
        if (item.glow) item.glow.visible = false;
        AudioSystem.playInvestigate();
        import("./prologue.js").then((m) => m.finishPrologue(item));
        return;
    }

    // 잠금 확인
    if (item.locked && item.unlockClue && !G.clues.has(item.unlockClue)) {
        AudioSystem.playInvestigate();
        showMessage("🔒 " + (item.lockedMsg || "이 유물을 조사하려면 먼저 단서가 필요합니다.\nNPC와 대화하여 단서를 수집해 보세요."));
        return;
    }

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

    // 유물은 단서이자 재원이다. 조사하면 마을에 쓸 것이 생긴다.
    // 탐험을 해야 마을이 자라고, 마을이 자라야 다음 시대가 열린다.
    G.materials.wood += 3;
    G.materials.stone += 2;
    G.progress += 4;
    const reward = "\n\n(나무 +3, 돌 +2, 발전도 +4)";

    // 일지 기록
    addJournalEntry("artifact", item.name, item.description);

    const extra = handleAgeCompletion();
    showMessage(item.description + reward + (extra ? "\n\n" + extra : ""));
    import("./village.js").then((m) => m.updateVillageUI());
    updateUI();
}

/**
 * 한 시대의 조사를 모두 마쳤을 때.
 *
 * 마지막 시대가 아니면 시간의 문이 깨어나고,
 * 마지막 시대라면 여기서 이야기가 끝난다.
 */
export function handleAgeCompletion() {
    const age = AGE_DATA[G.currentAge];
    if (!age) return "";

    // 진급 조건은 "유물 3개"가 아니라 "마을 발전도"다.
    // 무엇을 지을지는 플레이어가 고르고, 유물은 그 재원이 된다.
    const goal = progressGoal();
    if (G.progress < goal || G.ageCompleteTriggered) return "";
    G.ageCompleteTriggered = true;

    const isLast = G.currentAge >= AGE_DATA.length - 1;

    if (!isLast) {
        activateGate();
        return (age.completeText || "흩어진 기록이 서로 맞물립니다.") +
            "\n시간의 문이 깨어났습니다.";
    }

    // 마지막 시대 — 모든 시대가 하나로 이어진다
    AudioSystem.playGate();
    G.demoFinished = true;
    setTimeout(() => {
        dom.completeOverlay.classList.add("show");
    }, 1200);

    return age.completeText || "모든 흔적을 조사했습니다.";
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
