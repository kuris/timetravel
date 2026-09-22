/**
 * 오프닝 — 설명 상자 대신, 마을 위를 카메라가 지나가며 대사가 한 줄씩 나온다.
 *
 * 월영루(화면 21, 3)까지 다가갔다가 플레이어 자리로 돌아온다.
 * 클릭이나 아무 키나 건너뛴다.
 */
import { resizeRenderer } from "./renderer.js";
import { G, cameraTarget } from "./state.js";

const R2 = Math.SQRT1_2;
const END = 18.2;

/** 화면 좌표. landmarks.S 와 같다. 인트로가 배치 모듈을 끌어오지 않게 여기 둔다. */
function at(u, v) {
    return { x: (u - v) * R2, z: -(u + v) * R2 };
}

const PAVILION = at(21, 3);

const LINES = [
    { t: 1.55, text: "강가에 누각이 하나 서 있다." },
    { t: 5.35, text: "밤마다, 그 위에 붉은 나비가 난다." },
    { t: 9.05, text: "새로 부임한 수령은 첫날밤을 넘기지 못했다." },
    { t: 12.35, text: "귀신의 소행이라 하나, 장부는 수상하다." },
    { t: 15.15, title: "붉은 나비", text: "진상을 밝히라." }
];

let baseView = 19.5;
let keys = [];
let t = 0;
let ended = false;
let mode = "play";
let settle = null;
let lineI = -1;
let typed = 0;
let lineAt = 0;
let begun = false;

function smooth(x) {
    const u = Math.max(0, Math.min(1, x));
    return u * u * (3 - 2 * u);
}

function buildKeys(view) {
    const yard = at(1, 2);
    return [
        { t: 0, ...at(-10, -6), y: 1.1, view: view * 1.9 },
        { t: 4.9, x: PAVILION.x, z: PAVILION.z, y: 2.8, view: view * 0.62 },
        { t: 10.3, x: PAVILION.x + 0.7, z: PAVILION.z + 0.35, y: 2.35, view: view * 0.56 },
        { t: 14.7, x: yard.x, z: yard.z, y: 0.9, view: view * 1.08 },
        { t: END, x: G.player.position.x, z: G.player.position.z, y: 0.6, view }
    ];
}

function sample(time) {
    let i = 0;
    while (i < keys.length - 2 && time >= keys[i + 1].t) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const u = smooth((time - a.t) / Math.max(0.001, b.t - a.t));
    return {
        x: a.x + (b.x - a.x) * u,
        z: a.z + (b.z - a.z) * u,
        y: a.y + (b.y - a.y) * u,
        view: a.view + (b.view - a.view) * u
    };
}

function pose(s, drift) {
    cameraTarget.set(s.x + drift, s.y, s.z - drift * 0.35);
    if (Math.abs(G.viewSize - s.view) > 0.015) {
        G.viewSize = s.view;
        resizeRenderer();
    }
}

function updateCaption(time) {
    const kicker = document.getElementById("introKicker");
    if (kicker && time >= 0.35) kicker.classList.add("on");

    let idx = -1;
    for (let i = 0; i < LINES.length; i++) {
        if (time >= LINES[i].t) idx = i;
    }
    if (idx < 0) return;

    const line = LINES[idx];
    const titleEl = document.getElementById("introTitle");
    const lineEl = document.getElementById("introLine");
    if (!lineEl) return;

    if (idx !== lineI) {
        lineI = idx;
        typed = 0;
        lineAt = time;
        if (titleEl) {
            titleEl.textContent = line.title || "";
            titleEl.classList.toggle("on", !!line.title);
        }
        lineEl.textContent = "";
    }

    const full = line.text || "";
    const n = Math.min(full.length, Math.floor((time - lineAt) * 22));
    if (n === typed) return;
    typed = n;
    lineEl.textContent = full.slice(0, n);
    if (n < full.length) {
        const caret = document.createElement("span");
        caret.className = "caret";
        lineEl.appendChild(caret);
    }
}

function finish() {
    if (ended) return;
    ended = true;
    G.cinematic = false;
    G.viewSize = baseView;
    resizeRenderer();
    if (G.player) {
        G.player.visible = !G.isFirstPerson;
        cameraTarget.set(G.player.position.x, 0.6, G.player.position.z);
    }
    const overlay = document.getElementById("introOverlay");
    if (overlay) {
        overlay.classList.add("out");
        overlay.classList.remove("live");
        setTimeout(() => overlay.classList.remove("show", "out"), 760);
    }
    document.body.classList.remove("intro-on");
}

export function startOpening() {
    const overlay = document.getElementById("introOverlay");
    if (!overlay || !G.player || !G.isoCamera) return;

    baseView = G.viewSize || 19.5;
    keys = buildKeys(baseView);
    t = 0;
    ended = false;
    mode = "play";
    settle = null;
    lineI = -1;
    typed = 0;
    begun = false;

    G.cinematic = true;
    if (G.player) G.player.visible = false;
    document.body.classList.add("intro-on");
    overlay.classList.remove("out", "live");
    overlay.classList.add("show");
    pose(sample(0), 0);
}

/** 첫 입력. 음악이 켜질 수 있는 순간이고, 오프닝 시계도 여기서 시작한다. */
export function beginOpening() {
    if (!G.cinematic || ended || begun) return false;
    begun = true;
    document.getElementById("introOverlay")?.classList.add("live");
    return true;
}

export function updateIntro(delta) {
    if (!G.cinematic || ended || !begun) return;

    if (mode === "settle" && settle) {
        settle.u = Math.min(1, settle.u + delta / 0.85);
        const k = smooth(settle.u);
        const px = G.player ? G.player.position.x : 0;
        const pz = G.player ? G.player.position.z : 0;
        pose({
            x: settle.x + (px - settle.x) * k,
            z: settle.z + (pz - settle.z) * k,
            y: settle.y + (0.6 - settle.y) * k,
            view: settle.view + (baseView - settle.view) * k
        }, 0);
        if (settle.u > 0.4 && G.player) G.player.visible = !G.isFirstPerson;
        if (settle.u >= 1) finish();
        return;
    }

    t += Math.min(delta, 0.05);
    const drift = t > 15.5 ? 0 : Math.sin(t * 0.37) * 0.42;
    pose(sample(t), drift);
    updateCaption(t);
    if (t > 14.3 && G.player) G.player.visible = !G.isFirstPerson;
    if (t >= END) finish();
}

/** 남은 대사를 건너뛰고 플레이어 쪽으로 카메라를 붙인다. */
export function skipOpening() {
    if (!G.cinematic || ended || mode === "settle") return;
    mode = "settle";
    settle = {
        x: cameraTarget.x,
        z: cameraTarget.z,
        y: cameraTarget.y,
        view: G.viewSize,
        u: 0
    };
    document.getElementById("introCaption")?.classList.add("out");
    document.getElementById("introSkip")?.classList.add("out");
}
