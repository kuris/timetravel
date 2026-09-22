/**
 * 입력 — 키보드 / 마우스
 */
import { AudioSystem } from "./audio.js";
import { beginOpening, skipOpening } from "./intro.js";
import { toggleViewMode } from "./camera.js";
import { MOVE_CODES, SPRINT_CODES, WORLD_LIMIT } from "./config.js";
import { toggleHint } from "./hint.js";
import { tryInteract } from "./interaction.js";
import { toggleJournal, isJournalOpen } from "./journal.js";
import { handleDialogueKey, isDialogueOpen, closeDialogue } from "./dialogue.js";
import { G, groundPlane, keys, mouse, raycaster } from "./state.js";
import { dom, hideMessage, showMessage } from "./ui.js";
import { cycleTime, cycleWeather, weatherLabel } from "./weather.js";

function beginAudio() {
    try { AudioSystem.start(); } catch (_) { /* 소리 없이도 입력은 받는다 */ }
}

/** 첫 클릭·키는 음악과 함께 오프닝을 연다. 그 다음부터는 건너뛴다. */
function onOpeningGesture() {
    beginAudio();
    if (beginOpening()) return;
    skipOpening();
}

export function setupInput() {
    window.addEventListener("keydown", (e) => {
        if (G.cinematic) {
            if (!e.repeat) onOpeningGesture();
            e.preventDefault();
            return;
        }

        beginAudio();

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

        // M: 지도 토글 (미니맵 패널 접기/펴기)
        if (e.code === "KeyM") {
            if (!e.repeat) {
                const p = document.getElementById("minimapPanel");
                if (p) p.style.display = (p.style.display === "none") ? "" : "none";
            }
            e.preventDefault();
        }

        // N: 배경음악 켜기/끄기
        if (e.code === "KeyN") {
            if (!e.repeat) {
                const on = AudioSystem.toggleMusic();
                const btn = document.getElementById("musicBtn");
                if (btn) btn.textContent = on ? "[N] ♪ 음악 끄기" : "[N] ♪ 음악 켜기";
            }
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

    const musicBtn = document.getElementById("musicBtn");
    if (musicBtn) {
        musicBtn.addEventListener("click", () => {
            AudioSystem.start();
            const on = AudioSystem.toggleMusic();
            musicBtn.textContent = on ? "[N] ♪ 음악 끄기" : "[N] ♪ 음악 켜기";
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

    // 하단 어드벤처 바: 조사 / 가방 / 지도 (모바일 터치용)
    const verbInvestigate = document.getElementById("verbInvestigate");
    if (verbInvestigate) {
        verbInvestigate.addEventListener("click", () => {
            AudioSystem.start();
            tryInteract();
        });
    }
    const verbBag = document.getElementById("verbBag");
    if (verbBag) {
        verbBag.addEventListener("click", () => {
            AudioSystem.start();
            toggleJournal();
        });
    }
    const verbMap = document.getElementById("verbMap");
    if (verbMap) {
        verbMap.addEventListener("click", () => {
            AudioSystem.start();
            if (window.innerWidth <= 760) {
                document.body.classList.toggle("ui-open");
            } else {
                const p = document.getElementById("minimapPanel");
                if (p) p.style.display = (p.style.display === "none") ? "" : "none";
            }
        });
    }

    // 모바일 UI 토글 (☰): 지도·이정표 여닫기
    const uiToggle = document.getElementById("uiToggle");
    if (uiToggle) {
        uiToggle.addEventListener("click", () => {
            AudioSystem.start();
            document.body.classList.toggle("ui-open");
        });
    }

    // 메시지창 클릭하면 바로 닫기
    if (dom.message) {
        dom.message.addEventListener("click", () => hideMessage());
    }

    const introOverlay = document.getElementById("introOverlay");
    if (introOverlay) {
        introOverlay.addEventListener("pointerdown", (e) => {
            if (!G.cinematic || (e.button != null && e.button !== 0)) return;
            onOpeningGesture();
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
        if (G.cinematic) {
            if (e.button == null || e.button === 0) onOpeningGesture();
            return;
        }

        beginAudio();

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
