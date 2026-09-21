/**
 * 상호작용 — 조사, 획득, 시간의 문
 */
import { AudioSystem } from "./audio.js";
import { addBlob, fadeGroup, makeBasicMat } from "./build.js";
import { AGE_DATA, ERA_OPENED_BY } from "./config.js";
import { addMapMarker } from "./minimap.js";
import { randRange } from "./rng.js";
import { G } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { transitionToAge } from "./transition.js";
import { addInventoryItem, dom, josa, showMessage, updateUI } from "./ui.js";
import { addJournalEntry } from "./journal.js";
import { closeDialogue, openChoiceDialogue } from "./dialogue.js";
import { awakenGate } from "./gateaura.js";

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

    // 시대를 다시 찾아왔다면, 전에 조사한 것은 조사된 채로 서 있어야 한다.
    // 재료 노드는 시대마다 새로 돋는 것이라 제외한다.
    if (!material && G.investigated.has(investigateKey(name))) {
        item.done = true;
        if (item.marker) item.marker.done = true;
        item.glow.visible = false;
        item.group.visible = !!item.pickup ? false : item.group.visible;
    }

    G.interactables.push(item);
    return item;
}

/** 조사 기록의 열쇠. 시대와 이름을 함께 묶는다. */
export function investigateKey(name, age = G.currentAge) {
    return age + ":" + name;
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
        // 거리에 따라 흐려질 때의 기준값 (loop.js 가 쓴다)
        ringOpacity: 0.75,
        moteOpacity: 0.9,
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

    // 아무 대상도 없으면 끝. 건설 루프는 끊었다.
    // 원숭이섬처럼 돌아다니며 보고 말 거는 것만 남긴다.

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
        const isLocked = action.item.locked && action.item.unlockClue && !G.clues.has(action.item.unlockClue);
        dom.prompt.textContent = isLocked
            ? "🔒 " + action.item.name + " (단서 필요)"
            : "[E] 조사 · " + action.item.name;
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
    } else if (action.kind === "npc") {
        if (action.npc.choices && action.npc.choices.length > 0) {
            action.npc.met = true;
            openChoiceDialogue(action.npc);
        } else {
            talkToNPC(action.npc);
        }
    } else if (action.kind === "gate") {
        openGateChooser();
    } else if (action.kind === "inactiveGate") {
        AudioSystem.playInvestigate();
        const age = AGE_DATA[G.currentAge];
        const left = Math.max(0, (age.total || 3) - G.ageProgress);
        showMessage("돌 사이의 틈이 아직 차갑습니다.\n"
            + "이 시대에서 아직 보지 못한 것이 " + left + "가지 남았습니다.\n"
            + "다 보고 나면 길이 열립니다.");
    }
}

/**
 * 시간의 문 — 어느 때로 갈 것인가.
 *
 * 다음 시대로 떠미는 문이 아니다. 앞으로도 뒤로도 간다.
 * 한 번이라도 발 디딘 시대와, 바로 다음 시대만 고를 수 있다.
 * (가 보지 않은 먼 미래가 목록에 죽 늘어서 있으면 고를 이유가 없다)
 *
 * 선택지 대화 UI 를 그대로 빌려 쓴다 — 문도 말을 거는 상대다.
 */
export function openGateChooser() {
    const here = G.currentAge;
    const reachable = [];
    for (let i = 0; i < AGE_DATA.length; i++) {
        if (i === here) continue;
        const visited = G.visitedAges.has(i);
        const isNext = i === here + 1;
        const opener = ERA_OPENED_BY[i];
        const unlocked = opener && G.clues.has(opener);
        if (visited || isNext || unlocked) reachable.push({ i, visited });
    }

    const choices = reachable.map(({ i, visited }) => ({
        text: AGE_DATA[i].name + (visited ? "  (가 본 적 있다)" : "  (처음이다)"),
        response: "돌 사이의 푸른빛이 화면을 삼킵니다.",
        followUp: "...",
        onSelect: () => {
            closeDialogue();
            transitionToAge(i);
        }
    }));

    AudioSystem.playGate();
    openChoiceDialogue({
        name: "시간의 문",
        greeting: "돌 사이로 여러 때의 빛이 겹쳐 보입니다. 어느 때로 가시겠습니까?",
        choices,
        lines: ["..."]
    });
}

export function talkToNPC(npc) {
    if (!G.player) return;
    npc.met = true;

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

    // 재료 노드는 이제 없다. 어드벤처에서는 보고 줍는 것만 남긴다.
    if (item.material) return;

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
    G.investigated.add(investigateKey(item.name));

    if (item.marker) item.marker.done = true;
    if (item.glow) item.glow.visible = false;
    fadeGroup(item.group);

    AudioSystem.playInvestigate();

    if (item.pickup) {
        setTimeout(() => AudioSystem.playPickup(), 90);
    }

    addInventoryItem(item.name);

    // 일지 기록
    addJournalEntry("artifact", item.name, item.description);

    const extra = handleAgeCompletion();
    showMessage(item.description + (extra ? "\n\n" + extra : ""));
    updateUI();
}

/**
 * 한 시대의 조사를 모두 마쳤을 때.
 *
 * 조선 단일 시대: 유물 3개를 다 모으면 에피소드 클리어다.
 * 시간의 문은 쓰지 않는다.
 */
export function handleAgeCompletion() {
    const age = AGE_DATA[G.currentAge];
    if (!age) return "";

    // 문을 여는 것은 마을이 아니라 "본 것"이다.
    // 이 게임에서 앞으로 나아가게 하는 힘은 집이 아니라 궁금증이어야 한다.
    // 마을 짓기는 남겨 두되, 시대를 넘는 조건에서는 뺀다.
    if (G.ageProgress < (age.total || 3) || G.ageCompleteTriggered) return "";
    G.ageCompleteTriggered = true;

    // 조선 단일 시대 — 증거 3개를 다 모으면 바로 에피소드 클리어
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

    // 하늘이 열린다 — 빛기둥과 고리, 충격파 (gateaura.js)
    awakenGate(G.activeGate);
    updateUI();
}
