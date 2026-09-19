/**
 * 시대 전환 연출
 */
import { AudioSystem } from "./audio.js";
import { buildAge } from "./eras/build.js";
import { startMorph } from "./morph.js";
import { G } from "./state.js";
import { dom } from "./ui.js";

/**
 * 시대 이동.
 *
 * 장면을 통째로 갈아 끼우지 않는다.
 * 짧은 섬광 뒤에 빛의 경계선이 화면을 쓸고 지나가면서
 * 건물이 하나씩 다음 시대의 모습으로 바뀐다.
 */
export function transitionToAge(nextAge) {
    if (G.transitioning) return;

    G.transitioning = true;
    G.clickTarget = null;

    AudioSystem.playGlitch();
    playFlash();

    // 짧게 화면이 깨졌다가
    rampGlitch(0, 0.6, 240, () => {
        const oldWorld = G.world;
        // 배경판과 플레이어는 world 밖에 있어서 따로 챙겨야 한다.
        // 안 챙기면 하늘 텍스처가 시대마다 쌓인다.
        // 태양광은 그림자 깊이 텍스처를 들고 있어서 같이 버려야 한다
        const oldExtras = [G.backdrop, G.player, G.sunLight];
        const oldTextures = G.TEX;

        // 새 시대를 만든다. 정리는 모프가 끝난 뒤에 한다.
        buildAge(nextAge, { keepOld: true });

        // 이전 시대의 월드를 새 scene 으로 옮겨 와 나란히 둔다.
        // 여기서부터 두 시대가 한 화면에 공존한다.
        G.scene.add(oldWorld);

        rampGlitch(0.6, 0, 600);

        // buildAge 가 잠금을 풀었으므로 다시 잠근다
        G.transitioning = true;
        startMorph(oldWorld, G.world, () => {
            G.transitioning = false;
        }, oldExtras, oldTextures);
    });
}

/** glitchAmount 를 from -> to 로 보간한다 */
export function rampGlitch(from, to, duration, onDone) {
    const startTime = performance.now();

    const step = () => {
        const k = Math.min(1, (performance.now() - startTime) / duration);
        // 계단식으로 끊어야 90년대 CRT 처럼 보인다
        const stepped = Math.floor(k * 9) / 9;
        G.glitchAmount = from + (to - from) * stepped;

        if (k < 1) {
            requestAnimationFrame(step);
        } else {
            G.glitchAmount = to;
            if (onDone) onDone();
        }
    };

    step();
}

export function playFlash() {
    dom.flash.classList.remove("play");
    dom.glitch.classList.remove("play");
    void dom.flash.offsetWidth;
    dom.flash.classList.add("play");
    dom.glitch.classList.add("play");
}
