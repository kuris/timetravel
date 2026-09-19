/**
 * 프롤로그 — 현대 밤 골목. 집에 가던 길에 시간의 문을 발견한다.
 *
 * 흐름: 골목 입구 시작 → 시간의 문 1개 조사 → 쓰러짐(플래시) → 신석기로.
 * AGE_DATA 바깥의 전용 맵이라 buildAge 분기에 타지 않는다.
 */
import { AudioSystem } from "./audio.js";
import { addBlob, addBox, addCylinder, makeBasicMat } from "./build.js";
import { updateCamera } from "./camera.js";
import { AGE_DATA } from "./config.js";
import { resetHint } from "./hint.js";
import { registerInteractable } from "./interaction.js";
import { GATE_SPOT } from "./landmarks.js";
import { createTimeGate } from "./eras/neolithic.js";
import { createPlayer } from "./player.js";
import { seedRandom } from "./rng.js";
import { G, cameraTarget } from "./state.js";
import { terrainHeight } from "./terrain.js";
import { makeMistTexture, makeStoneTexture, makeTerrainTexture, makeThatchTexture, makeWaterTexture, makeWoodTexture } from "./textures.js";
import { addJournalEntry } from "./journal.js";
import { dom, showMessage, updateUI } from "./ui.js";
import { addBackdrop, addDustMotes, addGround, addLights, addMistLayers, cssHex, cssRGBA } from "./world.js";
import { disposeGroup, disposeTextures } from "./morph.js";
import { initWeather } from "./weather.js";
import { addStreetLamp } from "./props_modern.js";
import { addMapMarker } from "./minimap.js";

const PROLOGUE_AGE = {
    name: "현대 · 집 앞 골목 (밤)",
    goal: "골목 끝의 이상한 돌을 조사하세요.",
    total: 1,
    start: { x: -14.0, z: 10.0 },
    weather: {
        band: [0.02, 0.10],
        speed: 0.0012,
        start: "clear",
        pool: ["clear", "haze", "clear"]
    },
    fog: 0x14161e,
    fogDensity: 0.0160,
    sky: { top: 0x0c1020, mid: 0x1c2233, bottom: 0x3a3a44 },
    ridges: [
        { dist: 74, height: 30, color: 0x1a1e2a, opacity: 0.6, base: -6 },
        { dist: 56, height: 22, color: 0x141824, opacity: 0.7, base: -5 },
        { dist: 42, height: 15, color: 0x10131e, opacity: 0.8, base: -4 },
        { dist: 30, height: 9, color: 0x0c0e16, opacity: 0.9, base: -3 }
    ],
    intro: "밤 11시. 집에 가던 골목이다.\n평소엔 없던 돌이 골목 끝에 서 있다.\n가까이 가서 조사해 보자.",
    light: {
        hemiSky: 0x5a6488,
        hemiGround: 0x1a1611,
        hemiIntensity: 1.1,
        ambient: 0x4a4a5e,
        ambientIntensity: 0.7,
        sun: 0x8a9ab8,
        sunIntensity: 0.7,
        sunPos: [-8, 16, -10],
        fillIntensity: 0.2
    },
    grade: {
        tint: [0.95, 0.98, 1.06],
        lift: [0.05, 0.05, 0.07],
        sat: 0.85,
        sepia: 0.03,
        contrast: 1.08,
        vignette: 0.85
    }
};

export function buildPrologue() {
    if (G.scene && !G.prologue) {
        const stale = [G.world, G.backdrop, G.player, G.sunLight].filter(Boolean);
        for (const obj of stale) {
            if (obj.parent) obj.parent.remove(obj);
            disposeGroup(obj);
        }
        disposeTextures(G.TEX);
    }

    G.prologue = true;
    G.currentAge = -1;
    G.ageProgress = 0;
    G.ageCompleteTriggered = false;
    G.transitioning = false;
    G.demoFinished = false;
    G.activeGate = null;
    G.clickTarget = null;
    G.interactables = [];
    G.npcs = [];
    G.enemies = [];
    G.lockedZones = [];
    G.exploredTiles = new Set();
    G.animated = [];
    G.mapShapes = [];
    G.mapMarkers = [];
    resetHint();
    G.backdrop = null;
    G.sunLight = null;
    G.terrainCarve = null;
    G.glitchAmount = 0;

    dom.completeOverlay.classList.remove("show");

    seedRandom(9000);
    G.TEX = {
        dirt: makeTerrainTexture(["rgba(40,36,32,ALPHA)"], "#3a3632", { repeat: 18, grit: 30, washes: 100 }),
        dirtObj: makeTerrainTexture(["rgba(40,30,20,ALPHA)"], "#e2ddd4", { repeat: 2, grit: 22, washes: 70 }),
        stone: makeStoneTexture("#ded3bd", ["rgba(40,30,20,ALPHA)"]),
        thatch: makeThatchTexture("#ded3bd", "rgba(40,30,20,ALPHA)", "rgba(255,250,240,ALPHA)"),
        wood: makeWoodTexture("#dcd2c2", "rgba(40,30,20,ALPHA)"),
        water: makeWaterTexture("#cfd6d4", "rgba(255,250,240,ALPHA)"),
        cloth: makeWoodTexture("#dcd6cc", "rgba(40,30,20,ALPHA)"),
        asphalt: makeStoneTexture("#d6d2ca", ["rgba(40,30,20,ALPHA)"]),
        mist: makeMistTexture()
    };

    G.scene = new THREE.Scene();
    G.scene.background = new THREE.Color(PROLOGUE_AGE.fog);
    G.scene.fog = new THREE.FogExp2(PROLOGUE_AGE.fog, PROLOGUE_AGE.fogDensity);
    G.world = new THREE.Group();
    G.scene.add(G.world);

    addLights(PROLOGUE_AGE);

    seedRandom(4100);
    addBackdrop({
        skyTop: PROLOGUE_AGE.sky.top,
        skyMid: PROLOGUE_AGE.sky.mid,
        skyBottom: PROLOGUE_AGE.sky.bottom,
        ridges: PROLOGUE_AGE.ridges
    });

    // 맨땅 대신 어두운 아스팔트 바닥 느낌은 지면 색으로
    seedRandom(1100);
    addGround(0x35322e, [0x2e2b28, 0x3d3a35, 0x44413b]);

    buildAlley();

    addMistLayers(PROLOGUE_AGE.fog, 5);
    addDustMotes(0xb9c4d8, 90);

    overrideAgeData();
    initWeather(0);
    restoreAgeData();
    applyPrologueWeather();

    if (AudioSystem.started) AudioSystem.setEra(5);

    G.player = createPlayer();
    G.player.position.set(PROLOGUE_AGE.start.x, terrainHeight(PROLOGUE_AGE.start.x, PROLOGUE_AGE.start.z), PROLOGUE_AGE.start.z);
    G.player.visible = !G.isFirstPerson;
    G.scene.add(G.player);

    cameraTarget.set(G.player.position.x, 0.6, G.player.position.z);
    updateCamera(0, true);
    updatePrologueUI();
    showMessage(PROLOGUE_AGE.intro + "\n첫 키 입력 또는 클릭 후 소리가 켜집니다.");
}

// addGround 순환 import 회피용 (world.js는 state만 참조하므로 직접 import)
// weather.js가 AGE_DATA[index]를 직접 읽기 때문에 프롤로그 동안만 0번을 덮어쓴다
let savedAge0 = null;
function overrideAgeData() {
    savedAge0 = AGE_DATA[0];
    AGE_DATA[0] = PROLOGUE_AGE;
}
function restoreAgeData() {
    if (savedAge0) AGE_DATA[0] = savedAge0;
    savedAge0 = null;
}
function applyPrologueWeather() {
    // initWeather(0)이 신석기 band로 돌려놨을 수 있으니 프롤로그 값으로 고정
    import("./weather.js").then((m) => {
        m.W.band = PROLOGUE_AGE.weather.band.slice();
        m.W.dayT = 0.06;
        m.W.dir = 1;
        m.W.speed = PROLOGUE_AGE.weather.speed;
    });
}

function updatePrologueUI() {
    dom.eraText.textContent = PROLOGUE_AGE.name;
    dom.objectiveText.textContent = PROLOGUE_AGE.goal;
    dom.countText.textContent = G.ageProgress + " / " + PROLOGUE_AGE.total;
    for (let i = 0; i < dom.slots.length; i++) {
        dom.slots[i].textContent = "";
        dom.slots[i].classList.remove("filled");
    }
}

/** 밤 골목 — 가로등 몇 개, 담벼락, 끝에 시간의 문 */
function buildAlley() {
    const alleyX = -6;
    // 골목 바닥 라인
    for (let z = -22; z <= 18; z += 2.2) {
        const y = terrainHeight(alleyX, z);
        addBox(G.world, 5.2, 0.06, 2.0, 0x2b2926, alleyX, y + 0.03, z, 0, { roughness: 1 });
    }

    // 좌우 담벼락
    for (const sx of [-1, 1]) {
        for (let z = -22; z <= 18; z += 4) {
            const x = alleyX + sx * 3.4;
            addBox(G.world, 0.5, randH(z), 4.0, sx < 0 ? 0x4a423a : 0x3c3835, x, terrainHeight(x, z) + 1.1, z, 0, { roughness: 1 });
        }
    }

    // 가로등 3개
    addStreetLamp(alleyX - 2.2, 8, { light: 0xffc98a, intensity: 1.6 });
    addStreetLamp(alleyX + 2.2, -4, { light: 0xffc98a, intensity: 1.6 });
    addStreetLamp(alleyX - 2.2, -14, { light: 0xffb878, intensity: 1.3 });

    // 집 앞 박스/자전거 느낌 소품
    addBox(G.world, 0.8, 0.6, 0.8, 0x4a4438, alleyX - 2.4, terrainHeight(alleyX - 2.4, 12) + 0.3, 12, 0.3, { roughness: 1 });
    addBox(G.world, 0.6, 0.5, 0.6, 0x3a3630, alleyX + 2.3, terrainHeight(alleyX + 2.3, 2) + 0.25, 2, -0.2, { roughness: 1 });

    // 편의점 간판 빛 (멀리)
    const signMat = makeBasicMat(0xff9a5a, { transparent: true, opacity: 0.9 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.15), signMat);
    sign.position.set(alleyX + 6.5, terrainHeight(alleyX + 6.5, 16) + 3.2, 16);
    G.world.add(sign);
    const signLight = new THREE.PointLight(0xff9a5a, 1.1, 9);
    signLight.position.set(alleyX + 6.5, terrainHeight(alleyX + 6.5, 16) + 2.6, 16);
    G.world.add(signLight);

    addMapMarker(alleyX, 0, "#8a7a5a", 3, "building");

    // 골목 끝 시간의 문 — 평소엔 없던 돌
    G.activeGate = createTimeGate(GATE_SPOT.x, GATE_SPOT.z, GATE_SPOT.rot);
    G.activeGate.active = false;
    G.activeGate.portal.visible = false;
    G.activeGate.ring.visible = false;

    const stone = createPrologueStone(GATE_SPOT.x, GATE_SPOT.z);
    registerInteractable({
        name: "낯선 돌",
        group: stone,
        pickup: false,
        range: 2.4,
        glowColor: 0x8ee6ff,
        description: "낯선 돌\n\n어제까지 없던 돌이 골목 끝에 서 있다.\n손을 대자 돌 틈에서 푸른빛이 새어 나온다.\n눈앞이 하얘진다…"
    });
    // 조사 즉시 프롤로그 종료 플로우로 (handleAgeCompletion 대신 전용 처리)
    const item = G.interactables[G.interactables.length - 1];
    item.prologueGate = true;
}

function randH(z) {
    return 2.0 + ((Math.sin(z * 12.9898) * 43758.5453 % 1 + 1) % 1) * 0.7;
}

function createPrologueStone(x, z) {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = -0.3;
    G.world.add(g);

    addBox(g, 0.7, 2.1, 0.8, 0x6e6a64, -0.9, 1.05, 0, 0.05, { roughness: 1 });
    addBox(g, 0.7, 2.0, 0.8, 0x77716a, 0.9, 1.0, 0, -0.05, { roughness: 1 });
    addBox(g, 2.8, 0.55, 0.9, 0x817970, 0, 2.2, 0, 0.02, { roughness: 1 });
    addBlob(g, 0.2, 0x8ee6ff, 0, 1.2, 0.3, {
        material: makeBasicMat(0x8ee6ff, { transparent: true, opacity: 0.75 })
    });

    return g;
}

/** 프롤로그 전용 조사 후처리 — Journal 기록 + 기절 연출 후 신석기로 */
export function finishPrologue(item) {
    if (!G.prologue) return false;
    addJournalEntry("system", "낯선 돌", item.description);
    showMessage(item.description + "\n\n정신을 잃었다…\n눈을 뜨니 강물 소리가 들린다.");
    G.ageProgress = 1;
    updatePrologueUI();

    setTimeout(() => {
        import("./transition.js").then((m) => m.transitionToAge(0, { fromPrologue: true }));
    }, 1600);
    return true;
}

function randRange(a, b) {
    return a + Math.random() * (b - a);
}
