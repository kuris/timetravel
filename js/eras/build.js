/**
 * 시대 빌드 — 질감 팔레트와 장면 조립
 */
import { AudioSystem } from "../audio.js";
import { updateCamera } from "../camera.js";
import { AGE_DATA } from "../config.js";
import { buildBronze } from "./bronze.js";
import { buildJoseon } from "./joseon.js";
import { buildNeolithic } from "./neolithic.js";
import { resetHint } from "../hint.js";
import { createPlayer } from "../player.js";
import { applyGrade } from "../postprocess.js";
import { seedRandom } from "../rng.js";
import { G, cameraTarget } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { makeMistTexture, makeStoneTexture, makeTerrainTexture, makeThatchTexture, makeWaterTexture, makeWoodTexture } from "../textures.js";
import { dom, showMessage, updateUI } from "../ui.js";
import { addBackdrop, addDustMotes, addLights, addMistLayers, cssHex, cssRGBA } from "../world.js";

/**
 * 시대별 텍스처 팔레트.
 * 여기 색만 바꾸면 그 시대의 땅/돌/지붕 질감이 통째로 바뀐다.
 */
export const TEX_PALETTE = [
    // 신석기: 강가의 마른 흙, 마른 갈대
    {
        dirtBase: 0x9d7249,
        dirtSpots: [0xc59a62, 0x7d6b42, 0xb5854f, 0x6d5637, 0xd8b784],
        stoneBase: 0x77706a,
        stoneSpots: [0x9a9187, 0x5a554f, 0x6f7a55],
        thatch: [0xb08a4c, 0x6b4f26, 0xd8b877],
        wood: [0x6d4a26, 0x33210f],
        water: [0x52707a, 0xd8e6dc],
        cloth: [0x6a5a44, 0x2f2718]
    },
    // 청동기: 붉은 황토
    {
        dirtBase: 0x8e6b43,
        dirtSpots: [0xb08653, 0x6f5637, 0xa47c48, 0x5d4a30, 0xc7a06a],
        stoneBase: 0x6f665d,
        stoneSpots: [0x8e8378, 0x4f4941, 0x6b6f4d],
        thatch: [0xa87f45, 0x63481f, 0xd0ac6a],
        wood: [0x66421f, 0x2d1c0c],
        water: [0x4e6a6d, 0xcfdcd2],
        cloth: [0x6b4f33, 0x2b1d10]
    },
    // 조선: 밤의 흙길
    {
        dirtBase: 0x6b5a4a,
        dirtSpots: [0x816c57, 0x4d4238, 0x77654c, 0x565045, 0x8d7a62],
        stoneBase: 0x545059,
        stoneSpots: [0x6b6772, 0x3a373f, 0x4a5246],
        thatch: [0x8b7449, 0x4d3c22, 0xb09566],
        wood: [0x4d3620, 0x221609],
        water: [0x38414f, 0x9fb0bd],
        cloth: [0x4f4a52, 0x24202a]
    }
];

/** 현재 시대의 절차적 텍스처를 모두 새로 굽는다. */
export function buildTextures(index) {
    const p = TEX_PALETTE[index];

    // 텍스처 생성에도 같은 시드를 써서 매번 같은 결과가 나오게 한다
    seedRandom(7000 + index * 911);

    // 오브젝트용 텍스처는 "거의 흰 바탕 + 어두운 결" 이어야 한다.
    // 재질의 color 와 곱해지므로, 텍스처까지 색을 가지면 두 번 어두워진다.
    const GRUNGE = "#e2ddd4";
    const GRUNGE_DARK = "rgba(40,30,20,ALPHA)";
    const GRUNGE_LIGHT = "rgba(255,250,240,ALPHA)";

    G.TEX = {
        // 지면용: 실제 흙 색을 가진 유일한 텍스처 (재질 color 는 흰색)
        dirt: makeTerrainTexture(
            p.dirtSpots.map(cssRGBA),
            cssHex(p.dirtBase),
            { repeat: 26, grit: 38, washes: 150 }
        ),
        // 오브젝트용 흙: 색 없이 질감만
        dirtObj: makeTerrainTexture(
            [GRUNGE_DARK, GRUNGE_LIGHT, "rgba(90,70,50,ALPHA)"],
            GRUNGE,
            { repeat: 2, grit: 22, washes: 70 }
        ),
        stone: makeStoneTexture(GRUNGE, [GRUNGE_DARK, GRUNGE_LIGHT, "rgba(70,80,55,ALPHA)"]),
        thatch: makeThatchTexture("#ded3bd", GRUNGE_DARK, GRUNGE_LIGHT),
        wood: makeWoodTexture("#dcd2c2", GRUNGE_DARK),
        water: makeWaterTexture("#cfd6d4", GRUNGE_LIGHT),
        cloth: makeWoodTexture("#dcd6cc", GRUNGE_DARK),
        mist: makeMistTexture()
    };
}

export function buildAge(index) {
    G.currentAge = index;
    G.ageProgress = 0;
    G.ageCompleteTriggered = false;
    G.transitioning = false;
    G.demoFinished = false;
    G.activeGate = null;
    G.clickTarget = null;
    G.interactables = [];
    G.animated = [];
    G.mapShapes = [];
    G.mapMarkers = [];
    resetHint(); // 이전 scene 에 붙어 있던 이정표를 버린다
    G.backdrop = null;
    G.sunLight = null;
    G.terrainCarve = null;
    G.glitchAmount = 0;

    dom.completeOverlay.classList.remove("show");

    const age = AGE_DATA[G.currentAge];

    // ---- 텍스처를 먼저 구워 둔다 (지형/오브젝트가 참조한다) ----
    buildTextures(index);

    // ---- 장면 / 안개 ----
    G.scene = new THREE.Scene();
    G.scene.background = new THREE.Color(age.fog);
    G.scene.fog = new THREE.FogExp2(age.fog, age.fogDensity);

    G.world = new THREE.Group();
    G.scene.add(G.world);

    addLights(age);

    // ---- 프리렌더식 지평선 배경 ----
    seedRandom(4000 + index * 177);
    addBackdrop({
        skyTop: age.sky.top,
        skyMid: age.sky.mid,
        skyBottom: age.sky.bottom,
        ridges: age.ridges
    });

    // ---- 지형과 오브젝트 ----
    seedRandom(1000 + index * 333);

    if (index === 0) buildNeolithic();
    if (index === 1) buildBronze();
    if (index === 2) buildJoseon();

    // ---- 대기 연출: 지면 안개 + 떠도는 먼지 ----
    addMistLayers(age.fog, index === 2 ? 5 : 4);
    addDustMotes(index === 2 ? 0xb9c4d8 : 0xffe3b4, 140);

    // ---- 후처리 그레이딩 ----
    applyGrade(age.grade);

    // ---- 시대에 맞는 배경음으로 전환 ----
    if (AudioSystem.started) AudioSystem.setEra(index);

    // ---- 플레이어 배치 ----
    G.player = createPlayer();
    G.player.position.set(age.start.x, terrainHeight(age.start.x, age.start.z), age.start.z);
    G.scene.add(G.player);

    cameraTarget.set(G.player.position.x, 0.6, G.player.position.z);
    updateCamera(0, true);
    updateUI();
    showMessage(age.intro + "\n첫 키 입력 또는 클릭 후 소리가 켜집니다.");
}
