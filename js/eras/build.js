/**
 * 시대 빌드 — 질감 팔레트와 장면 조립
 */
import { advisorText } from "../advisor.js";
import { AudioSystem } from "../audio.js";
import { updateCamera } from "../camera.js";
import { AGE_DATA } from "../config.js";
import { buildBronze } from "./bronze.js";
import { buildJoseon } from "./joseon.js";
import { buildSamguk } from "./samguk.js";
import { build1970 } from "./modern1970.js";
import { build2000 } from "./modern2000.js";
import { buildNeolithic } from "./neolithic.js";
import { resetGather } from "../gather.js";
import { resetHint } from "../hint.js";
import { resetRaid } from "../raid.js";
import { resetSettlers } from "../settlers.js";
import { createPlayer } from "../player.js";
import { seedRandom } from "../rng.js";
import { G, cameraTarget } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { makeMistTexture, makeStoneTexture, makeTerrainTexture, makeThatchTexture, makeWaterTexture, makeWoodTexture } from "../textures.js";
import { dom, showMessage, updateUI } from "../ui.js";
import { addBackdrop, addDustMotes, addLights, addMistLayers, cssHex, cssRGBA } from "../world.js";
import { disposeGroup, disposeTextures } from "../morph.js";
import { renderVillage, resetBuildGhost, updateVillageUI, applyVillageEffects } from "../village.js";
import { scatterMaterials } from "../materials.js";
import { initWeather } from "../weather.js";
import { TEX_PALETTE, buildTextures } from "../palette.js";

export { TEX_PALETTE, buildTextures };

/**
 * 시대를 만든다.
 *
 * @param {object} opts
 *   keepOld  true 면 이전 시대의 자원을 여기서 버리지 않는다.
 *            시대 변이(모프)는 두 시대를 잠시 함께 보여 주므로,
 *            정리를 모프가 끝난 뒤로 미뤄야 한다.
 */
export function buildAge(index, opts = {}) {
    // 모프가 뒤처리를 맡지 않는 경로(디버그용 ?era=, 첫 실행)에서는
    // 여기서 이전 시대를 정리한다. 안 그러면 텍스처가 계속 쌓인다.
    if (!opts.keepOld && G.scene) {
        const stale = [G.world, G.backdrop, G.player, G.sunLight].filter(Boolean);
        for (const obj of stale) {
            if (obj.parent) obj.parent.remove(obj);
            disposeGroup(obj);
        }
        disposeTextures(G.TEX);
    }

    G.currentAge = index;
    G.ageProgress = 0;
    G.ageCompleteTriggered = false;
    G.transitioning = false;
    G.demoFinished = false;
    G.activeGate = null;
    G.clickTarget = null;
    G.interactables = [];
    G.npcs = [];
    G.exploredTiles = new Set();
    G.inventory = [];
    // fateChoice는 시대를 잇는 인과 기록이라 유지, 단서는 시대마다 초기화
    G.clues = new Set();
    G.stamina = G.maxStamina;
    G.animated = [];
    G.mapShapes = [];
    G.mapMarkers = [];
    resetHint();   // 이전 scene 에 붙어 있던 이정표를 버린다
    resetGather();   // 캐던 것과 튀어 있던 파편을 버린다
    resetSettlers(); // 주민은 집과 함께 이 시대의 모습으로 다시 들어온다
    resetRaid();     // 들개는 시대마다 처음부터 센다
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
    if (index === 2) buildSamguk();
    if (index === 3) buildJoseon();
    if (index === 4) build1970();
    if (index === 5) build2000({ prologue: !!opts.prologue2000 });

    // ---- 대기 연출: 지면 안개 + 떠도는 먼지 ----
    addMistLayers(age.fog, age.night ? 5 : 4);
    addDustMotes(age.night ? 0xb9c4d8 : 0xffe3b4, 140);

    // ---- 날씨와 시간 (후처리 그레이딩도 여기서 관리한다) ----
    initWeather(index);

    // ---- 시대에 맞는 배경음으로 전환 ----
    if (AudioSystem.started) AudioSystem.setEra(index);

    // ---- 지금까지 지은 마을을 이 시대의 모습으로 다시 세운다 ----
    // 같은 자리에 다음 시대의 건물이 선다. 이것이 "내 마을이 시간을 통과한다"의 실체다.
    // 프롤로그는 2000년 맵을 밤 골목으로 빌려 쓸 뿐이라 마을도 재료도 놓지 않는다.
    const isPrologue = !!opts.prologue2000;

    resetBuildGhost();
    if (!isPrologue) {
        renderVillage(index);

        // 이정표는 시대마다 세 번. 망루 시야는 지은 만큼 이어진다.
        G.hintCharges = 3;
        applyVillageEffects();
        import("../hint.js").then((m) => m.updateHintBadge());

        // ---- 재료 노드 ----
        scatterMaterials(index);
    }

    // ---- 플레이어 배치 ----
    G.player = createPlayer();
    G.player.position.set(age.start.x, terrainHeight(age.start.x, age.start.z), age.start.z);
    G.player.visible = !G.isFirstPerson;
    G.scene.add(G.player);

    cameraTarget.set(G.player.position.x, 0.6, G.player.position.z);
    updateCamera(0, true);
    updateUI();
    updateVillageUI();
    showMessage(age.intro + "\n\n▶ " + advisorText()
        + "\n첫 키 입력 또는 클릭 후 소리가 켜집니다.");
}
