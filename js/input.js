/**
 * 입력 — 키보드 / 마우스
 */
import { AudioSystem } from "./audio.js";
import { toggleViewMode } from "./camera.js";
import { MOVE_CODES, SPRINT_CODES, WORLD_LIMIT } from "./config.js";
import { toggleHint } from "./hint.js";
import { tryInteract } from "./interaction.js";
import { toggleJournal, isJournalOpen } from "./journal.js";
import { handleDialogueKey, isDialogueOpen, closeDialogue } from "./dialogue.js";
import { G, groundPlane, keys, mouse, raycaster } from "./state.js";
import { dom, showMessage } from "./ui.js";
import { cycleTime, cycleWeather, weatherLabel } from "./weather.js";

export function setupInput() {
    window.addEventListener("keydown", (e) => {
        AudioSystem.start();

        if (MOVE_CODES.has(e.code)) {
            keys.add(e.code);
            e.preventDefault();
        }

        if (SPRINT_CODES.has(e.code)) {
            keys.add(e.code);
        }

        if (e.code === "KeyE") {
            if (!e.repeat) tryInteract();
            e.preventDefault();
        }

        // H: 목표 방향 이정표
        if (e.code === "KeyH") {
            if (!e.repeat) toggleHint();
            e.preventDefault();
        }

        // V: 1인칭 / 3인칭 시점 전환
        if (e.code === "KeyV") {
            if (!e.repeat) toggleViewMode();
            e.preventDefault();
        }

        // T: 시간 변경 (한낮 -> 늦은 오후 -> 해질녘 -> 깊은 밤 -> 새벽)
        if (e.code === "KeyT") {
            if (!e.repeat) {
                const tName = cycleTime();
                dom.weatherText.textContent = weatherLabel();
                showMessage("시간대 변경: " + tName);
            }
            e.preventDefault();
        }

        // Y: 날씨 변경 (맑음 -> 엷은 안개 -> 흐림 -> 비)
        if (e.code === "KeyY") {
            if (!e.repeat) {
                const wName = cycleWeather();
                dom.weatherText.textContent = weatherLabel();
                showMessage("날씨 변경: " + wName);
            }
            e.preventDefault();
        }

        // J: 탐험 일지 토글
        if (e.code === "KeyJ") {
            if (!e.repeat) toggleJournal();
            e.preventDefault();
        }

        // Escape: 대화/일지 닫기
        if (e.code === "Escape") {
            if (isDialogueOpen()) { closeDialogue(); e.preventDefault(); }
            else if (isJournalOpen()) { toggleJournal(); e.preventDefault(); }
        }

        // 숫자키 1-3: 선택지 대화
        if (isDialogueOpen() && ["Digit1", "Digit2", "Digit3"].includes(e.code)) {
            handleDialogueKey(e.code.replace("Digit", ""));
            e.preventDefault();
        }
    });

    dom.hintBtn.addEventListener("click", () => {
        AudioSystem.start();
        toggleHint();
    });

    if (dom.timeBtn) {
        dom.timeBtn.addEventListener("click", () => {
            AudioSystem.start();
            const tName = cycleTime();
            dom.weatherText.textContent = weatherLabel();
            showMessage("시간대 변경: " + tName);
        });
    }

    if (dom.weatherBtn) {
        dom.weatherBtn.addEventListener("click", () => {
            AudioSystem.start();
            const wName = cycleWeather();
            dom.weatherText.textContent = weatherLabel();
            showMessage("날씨 변경: " + wName);
        });
    }

    // 일지 뺄튼
    const journalBtn = document.getElementById("journalBtn");
    if (journalBtn) {
        journalBtn.addEventListener("click", () => {
            AudioSystem.start();
            toggleJournal();
        });
    }

    window.addEventListener("keyup", (e) => {
        keys.delete(e.code);
    });

    // 1인칭 마우스 시선 회전
    window.addEventListener("mousemove", (e) => {
        if (!G.isFirstPerson) return;

        if (document.pointerLockElement === G.renderer.domElement) {
            const sensitivity = 0.0024;
            G.fpvYaw -= e.movementX * sensitivity;
            G.fpvPitch -= e.movementY * sensitivity;

            // 상하 각도 제한: -75도 ~ +75도
            const maxPitch = Math.PI * 0.42;
            G.fpvPitch = THREE.MathUtils.clamp(G.fpvPitch, -maxPitch, maxPitch);
        }
    });

    G.renderer.domElement.addEventListener("pointerdown", (e) => {
        AudioSystem.start();

        if (G.transitioning || G.demoFinished || e.button !== 0) return;

        if (G.isFirstPerson) {
            // 1인칭일 때는 클릭 시 포인터 락 활성화
            if (document.pointerLockElement !== G.renderer.domElement) {
                G.renderer.domElement.requestPointerLock?.();
            }
            return;
        }

        // 3인칭 등각 시점: 클릭 이동
        const rect = G.renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, G.camera);

        const point = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, point)) {
            G.clickTarget = new THREE.Vector3(
                THREE.MathUtils.clamp(point.x, -WORLD_LIMIT, WORLD_LIMIT),
                0,
                THREE.MathUtils.clamp(point.z, -WORLD_LIMIT, WORLD_LIMIT)
            );
        }
    });
}
