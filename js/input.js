/**
 * 입력 — 키보드 / 마우스
 */
import { AudioSystem } from "./audio.js";
import { MOVE_CODES, SPRINT_CODES, WORLD_LIMIT } from "./config.js";
import { toggleHint } from "./hint.js";
import { tryInteract } from "./interaction.js";
import { G, groundPlane, keys, mouse, raycaster } from "./state.js";
import { dom } from "./ui.js";

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
    });

    dom.hintBtn.addEventListener("click", () => {
        AudioSystem.start();
        toggleHint();
    });

    window.addEventListener("keyup", (e) => {
        keys.delete(e.code);
    });

    G.renderer.domElement.addEventListener("pointerdown", (e) => {
        AudioSystem.start();

        if (G.transitioning || G.demoFinished || e.button !== 0) return;

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
