/**
 * 시대 전환 연출
 */
import { AudioSystem } from "./audio.js";
import { buildAge } from "./eras/build.js";
import { G } from "./state.js";
import { dom } from "./ui.js";

export function transitionToAge(nextAge) {
    if (G.transitioning) return;

    G.transitioning = true;
    G.clickTarget = null;

    AudioSystem.playGlitch();
    playFlash();

    // 셰이더 글리치를 직접 시간축으로 굴린다 (CSS 연출과 겹쳐진다)
    rampGlitch(0, 1, 260, () => {
        buildAge(nextAge);
        // 새 시대는 깨진 화면에서 서서히 안정된다
        rampGlitch(1, 0, 900);
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
