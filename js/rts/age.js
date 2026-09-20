/**
 * age.js — 시대가 오르는 순간
 *
 * AoE 에서 시대가 오르면 건물의 생김새가 바뀐다.
 * 여기서는 땅과 하늘과 소리까지 통째로 다음 시대가 된다.
 * 유닛과 건물의 "자리"는 그대로 남는다. 시간만 지나간 것이다.
 */
import { AudioSystem } from "../audio.js";
import { G } from "../state.js";
import { buildMeshFor } from "./buildings.js";
import { AGE_NAME } from "./defs.js";
import { buildScenery } from "./map.js";
import { remakeNodeMesh } from "./nodes.js";
import { R } from "./state.js";
import { attachUnitMesh, refreshRings } from "./units.js";
import { bakeMinimapTerrain, flashScreen, logMessage, showBig } from "./hud.js";

export function applyAge(owner) {
    const p = R.players[owner];

    // 적의 시대는 건물 모습만 바뀐다 (내 눈에 보이는 땅은 내 시대다)
    if (owner !== 0) {
        for (const b of R.buildings) if (b.alive && b.owner === owner) buildMeshFor(b);
        logMessage(`적이 ${AGE_NAME[p.age]}로 들어섰습니다.`);
        return;
    }

    R.age = p.age;
    G.currentAge = p.age;
    G.glitchAmount = 1;
    flashScreen();

    buildScenery(p.age);
    bakeMinimapTerrain();

    // 장면을 통째로 다시 지었으므로 모형을 되살린다
    for (const n of R.nodes) remakeNodeMesh(n);
    for (const b of R.buildings) buildMeshFor(b);
    for (const u of R.units) attachUnitMesh(u);
    refreshRings();

    if (AudioSystem.started) AudioSystem.playGateAwaken();
    logMessage(`${AGE_NAME[p.age]}로 들어섰습니다.`);
    showBig(AGE_NAME[p.age], 3);
    R.dirty.cmd = true;
    R.dirty.res = true;
}
