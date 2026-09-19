/**
 * 날씨와 시간
 *
 * 각 시대는 고유한 "시간대 구간"을 가진다. 시간은 그 구간 안에서만
 * 아주 천천히 오간다. (조선이 대낮이 되어 버리면 시대의 인상이 무너진다.)
 *
 * 날씨는 1~2분마다 바뀌고, 12초에 걸쳐 서서히 섞인다.
 * 바뀌는 것: 안개 농도와 색, 햇빛 세기와 각도, 환경광, 후처리 색보정, 빗줄기.
 */
import { AGE_DATA } from "./config.js";
import { applyGrade } from "./postprocess.js";
import { G, cameraTarget } from "./state.js";
import { AudioSystem } from "./audio.js";

/** 날씨 종류. 숫자는 시대별 기본값에 곱해지는 배율이다. */
export const WEATHER_TYPES = {
    clear: {
        name: "맑음",
        fogMul: 1.00, sunMul: 1.00, ambMul: 1.00,
        rain: 0, snow: 0, satMul: 1.00, contrastAdd: 0.00
    },
    haze: {
        name: "엷은 안개",
        fogMul: 1.32, sunMul: 0.88, ambMul: 1.12,
        rain: 0, snow: 0, satMul: 0.92, contrastAdd: -0.04
    },
    overcast: {
        name: "흐림",
        fogMul: 1.18, sunMul: 0.52, ambMul: 1.28,
        rain: 0, snow: 0, satMul: 0.84, contrastAdd: -0.06
    },
    rain: {
        name: "비",
        fogMul: 1.55, sunMul: 0.34, ambMul: 1.24,
        rain: 1, snow: 0, satMul: 0.72, contrastAdd: -0.02
    },
    snow: {
        name: "눈",
        fogMul: 1.40, sunMul: 0.45, ambMul: 1.35,
        rain: 0, snow: 1, satMul: 0.65, contrastAdd: 0.05
    }
};

/** 시간대 이름 (0=자정, 0.5=정오) */
function timeName(t) {
    if (t < 0.18) return "깊은 밤";
    if (t < 0.28) return "새벽";
    if (t < 0.40) return "아침";
    if (t < 0.56) return "한낮";
    if (t < 0.68) return "이른 오후";
    if (t < 0.78) return "늦은 오후";
    if (t < 0.86) return "해질녘";
    if (t < 0.93) return "저녁";
    return "밤";
}

// ---------------------------------------------------------------- 상태
export const W = {
    dayT: 0.7,          // 0..1 하루 중 위치
    dir: 1,             // 시간이 흐르는 방향 (구간 끝에서 반전)
    band: [0.55, 0.78],
    speed: 0.004,       // 초당 진행량

    type: "clear",      // 현재 날씨
    next: "clear",      // 섞여 들어오는 날씨
    blend: 1,           // 0 = 이전 날씨, 1 = 다음 날씨
    timer: 90,          // 다음 변화까지 남은 시간(초)

    rainAmount: 0,      // 0..1 실제로 내리는 양 (부드럽게 따라간다)
    rainMesh: null,

    snowAmount: 0,      // 0..1 실제로 내리는 눈 양
    snowMesh: null
};

/** 시대가 바뀔 때 호출. 그 시대의 시간대와 날씨로 초기화한다. */
export function initWeather(index, ageOverride = null) {
    const age = ageOverride || AGE_DATA[index];
    if (!age) return;
    const w = age.weather;

    W.band = w.band.slice();
    W.dayT = (w.band[0] + w.band[1]) * 0.5;
    W.dir = 1;
    W.speed = w.speed;

    W.type = w.start;
    W.next = w.start;
    W.blend = 1;
    W.timer = 60 + Math.random() * 50;
    W.rainAmount = WEATHER_TYPES[w.start].rain;
    W.snowAmount = WEATHER_TYPES[w.start].snow ?? 0;
    W.pool = w.pool;

    W.rainMesh = null; // 새 scene 에서 다시 만든다
    W.snowMesh = null;
    buildRain();
    buildSnow();
    apply(index, 0, true, ageOverride);
}

/** 빗줄기: 카메라를 따라다니는 인스턴싱 박스 */
function buildRain() {
    const COUNT = 900;
    const geo = new THREE.BoxGeometry(0.02, 0.62, 0.02);
    const mat = new THREE.MeshBasicMaterial({
        color: 0xc8d4dc,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true
    });

    const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = false;

    const m = new THREE.Matrix4();
    const drops = [];

    for (let i = 0; i < COUNT; i++) {
        const d = {
            x: (Math.random() - 0.5) * 46,
            y: Math.random() * 20,
            z: (Math.random() - 0.5) * 46,
            v: 16 + Math.random() * 10
        };
        drops.push(d);
        m.makeTranslation(d.x, d.y, d.z);
        mesh.setMatrixAt(i, m);
    }

    mesh.userData.drops = drops;
    G.scene.add(mesh);
    W.rainMesh = mesh;
}

/** 눈송이: 카메라를 따라다니는 인스턴싱 박스 */
function buildSnow() {
    const COUNT = 600;
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshBasicMaterial({
        color: 0xeef4ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true
    });

    const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = false;

    const m = new THREE.Matrix4();
    const flakes = [];

    for (let i = 0; i < COUNT; i++) {
        const f = {
            x: (Math.random() - 0.5) * 50,
            y: Math.random() * 22,
            z: (Math.random() - 0.5) * 50,
            v: 1.2 + Math.random() * 1.4,    // 낙하 속도 (느리게)
            wx: (Math.random() - 0.5) * 0.8, // 흔들림 X
            wz: (Math.random() - 0.5) * 0.8, // 흔들림 Z
            phase: Math.random() * Math.PI * 2
        };
        flakes.push(f);
        m.makeTranslation(f.x, f.y, f.z);
        mesh.setMatrixAt(i, m);
    }

    mesh.userData.flakes = flakes;
    mesh.userData.time = 0;
    G.scene.add(mesh);
    W.snowMesh = mesh;
}

/** 다음 날씨를 고른다 (같은 날씨가 연달아 나오지 않게) */
function rollWeather() {
    const pool = W.pool || ["clear"];
    let pickName = pool[Math.floor(Math.random() * pool.length)];
    if (pickName === W.next && pool.length > 1) {
        pickName = pool[(pool.indexOf(pickName) + 1) % pool.length];
    }
    W.type = W.next;
    W.next = pickName;
    W.blend = 0;
    W.timer = 70 + Math.random() * 60;
}

/** 두 날씨 사이를 섞은 현재 계수 */
function currentFactors() {
    const a = WEATHER_TYPES[W.type];
    const b = WEATHER_TYPES[W.next];
    const k = W.blend;
    return {
        fogMul: a.fogMul + (b.fogMul - a.fogMul) * k,
        sunMul: a.sunMul + (b.sunMul - a.sunMul) * k,
        ambMul: a.ambMul + (b.ambMul - a.ambMul) * k,
        satMul: a.satMul + (b.satMul - a.satMul) * k,
        contrastAdd: a.contrastAdd + (b.contrastAdd - a.contrastAdd) * k,
        rain: a.rain + (b.rain - a.rain) * k,
        snow: (a.snow ?? 0) + ((b.snow ?? 0) - (a.snow ?? 0)) * k,
        name: k < 0.5 ? a.name : b.name
    };
}

const _tmpColor = new THREE.Color();

/** 계산된 값들을 실제 장면에 반영한다 */
function apply(index, delta, immediate, ageOverride = null) {
    const age = ageOverride || AGE_DATA[index];
    if (!age) return;
    const f = currentFactors();

    // --- 시간에 따른 태양/달 위치 및 세기 (0..1 전체 시간대 지원) ---
    const t = W.dayT;
    const isNight = t < 0.22 || t > 0.88;
    const isSunset = t >= 0.78 && t <= 0.88;
    const isDawn = t >= 0.22 && t < 0.35;

    // 태양 수평 회전 각도 (-Math.PI/3 ~ +Math.PI/3)
    const sunAngle = (t - 0.55) * Math.PI * 0.9;
    const cos = Math.cos(sunAngle), sin = Math.sin(sunAngle);
    const [sx, sy, sz] = age.light.sunPos;

    if (G.sunLight) {
        G.sunLight.userData.ox = sx * cos - sz * sin;
        G.sunLight.userData.oz = sx * sin + sz * cos;

        if (isNight) {
            // 밤: 차가운 달빛으로 변하고 높이는 고정, 강도는 대폭 감소
            G.sunLight.userData.oy = Math.max(10, sy * 0.8);
            G.sunLight.intensity = age.light.sunIntensity * 0.18 * f.sunMul;
            G.sunLight.color.set(0x7a92b0); // 푸른 달빛
        } else {
            // 낮/노을/새벽: 시간에 따라 고도와 색상 변화
            const sunElevation = Math.sin((t - 0.2) / 0.68 * Math.PI);
            G.sunLight.userData.oy = Math.max(2.5, sy * Math.max(0.18, sunElevation));
            G.sunLight.intensity = age.light.sunIntensity * Math.max(0.3, sunElevation) * f.sunMul;

            _tmpColor.set(age.light.sun);
            if (isSunset) {
                // 노을: 붉은 주황빛
                _tmpColor.lerp(new THREE.Color(0xff6e30), 0.75);
            } else if (isDawn) {
                // 새벽: 은은한 분홍/보랏빛
                _tmpColor.lerp(new THREE.Color(0xdda6a0), 0.5);
            }
            G.sunLight.color.copy(_tmpColor);
        }
    }

    const nightDim = isNight ? 0.35 : 1.0;
    if (G.hemiLight) G.hemiLight.intensity = age.light.hemiIntensity * f.ambMul * nightDim;
    if (G.ambientLight) G.ambientLight.intensity = age.light.ambientIntensity * f.ambMul * (isNight ? 0.45 : 1.0);

    // --- 안개 ---
    if (G.scene && G.scene.fog) {
        const target = age.fogDensity * f.fogMul * (isNight ? 1.25 : 1.0);
        G.scene.fog.density = immediate
            ? target
            : G.scene.fog.density + (target - G.scene.fog.density) * Math.min(1, delta * 0.5);
    }

    // --- 후처리 색보정 ---
    const g = age.grade;
    const nightSat = isNight ? 0.6 : 1.0;
    applyGrade({
        tint: isNight ? [g.tint[0] * 0.75, g.tint[1] * 0.85, g.tint[2] * 1.15] : g.tint,
        lift: isNight ? [g.lift[0] * 0.5, g.lift[1] * 0.5, g.lift[2] * 0.7] : g.lift,
        sat: g.sat * f.satMul * nightSat,
        sepia: isNight ? g.sepia * 0.4 : g.sepia,
        contrast: g.contrast + f.contrastAdd,
        vignette: isNight ? g.vignette * 1.25 : g.vignette
    });

    // --- 비 ---
    const targetRain = f.rain;
    W.rainAmount += (targetRain - W.rainAmount) * Math.min(1, delta * 0.6);
    if (immediate) W.rainAmount = targetRain;

    if (W.rainMesh) {
        W.rainMesh.visible = W.rainAmount > 0.02;
        W.rainMesh.material.opacity = W.rainAmount * 0.5;
    }

    AudioSystem.setRain(W.rainAmount);

    // --- 눈 ---
    const targetSnow = f.snow ?? 0;
    W.snowAmount += (targetSnow - W.snowAmount) * Math.min(1, delta * 0.6);
    if (immediate) W.snowAmount = targetSnow;

    if (W.snowMesh) {
        W.snowMesh.visible = W.snowAmount > 0.02;
        W.snowMesh.material.opacity = W.snowAmount * 0.72;
    }
}

const _m = new THREE.Matrix4();

/** 매 프레임 호출 */
export function updateWeather(delta) {
    if (!G.scene) return;

    // --- 시간 흐름 (수동 조절 모드가 아닐 때만 자동 흐름) ---
    if (!W.manualTime) {
        W.dayT += W.speed * delta * W.dir;
        if (W.dayT > W.band[1]) { W.dayT = W.band[1]; W.dir = -1; }
        if (W.dayT < W.band[0]) { W.dayT = W.band[0]; W.dir = 1; }
    }

    // --- 날씨 전환 ---
    if (!W.manualWeather) {
        W.timer -= delta;
        if (W.timer <= 0 && W.blend >= 1) rollWeather();
    }
    if (W.blend < 1) W.blend = Math.min(1, W.blend + delta / 8);

    if (G.prologue && G.prologueAge) {
        apply(G.currentAge, delta, false, G.prologueAge);
    } else {
        apply(G.currentAge, delta, false);
    }

    // --- 빗줄기 낙하 ---
    if (W.rainMesh && W.rainMesh.visible) {
        const drops = W.rainMesh.userData.drops;
        for (let i = 0; i < drops.length; i++) {
            const d = drops[i];
            d.y -= d.v * delta;
            if (d.y < -1) {
                d.y = 19 + Math.random() * 3;
                d.x = (Math.random() - 0.5) * 46;
                d.z = (Math.random() - 0.5) * 46;
            }
            _m.makeTranslation(cameraTarget.x + d.x, d.y, cameraTarget.z + d.z);
            W.rainMesh.setMatrixAt(i, _m);
        }
        W.rainMesh.instanceMatrix.needsUpdate = true;
    }

    // --- 눈송이 낙하 ---
    if (W.snowMesh && W.snowMesh.visible) {
        W.snowMesh.userData.time += delta;
        const t = W.snowMesh.userData.time;
        const flakes = W.snowMesh.userData.flakes;
        for (let i = 0; i < flakes.length; i++) {
            const f = flakes[i];
            f.y -= f.v * delta;
            // 좌우로 부드럽게 흔들림
            const sway = Math.sin(t * 0.9 + f.phase) * 0.55;
            if (f.y < -1) {
                f.y = 21 + Math.random() * 4;
                f.x = (Math.random() - 0.5) * 50;
                f.z = (Math.random() - 0.5) * 50;
            }
            _m.makeTranslation(
                cameraTarget.x + f.x + sway * f.wx,
                f.y,
                cameraTarget.z + f.z + sway * f.wz
            );
            W.snowMesh.setMatrixAt(i, _m);
        }
        W.snowMesh.instanceMatrix.needsUpdate = true;
    }
}

/** UI 에 보여 줄 문구 */
export function weatherLabel() {
    return currentFactors().name + " · " + timeName(W.dayT);
}

const WEATHER_LIST = ["clear", "haze", "overcast", "rain", "snow"];
const TIME_PRESETS = [
    { t: 0.50, name: "한낮" },
    { t: 0.74, name: "늦은 오후" },
    { t: 0.85, name: "해질녘" },
    { t: 0.08, name: "깊은 밤" },
    { t: 0.28, name: "새벽" }
];

/** 날씨 순환 변경 (clear -> haze -> overcast -> rain) */
export function cycleWeather() {
    W.manualWeather = true;
    const curIdx = WEATHER_LIST.indexOf(W.type);
    const nextType = WEATHER_LIST[(curIdx + 1) % WEATHER_LIST.length];

    W.type = nextType;
    W.next = nextType;
    W.blend = 1;
    apply(G.currentAge, 0, true, G.prologue ? G.prologueAge : null);
    return WEATHER_TYPES[nextType].name;
}

/** 시간대 순환 변경 (한낮 -> 늦은 오후 -> 해질녘 -> 깊은 밤 -> 새벽) */
export function cycleTime() {
    W.manualTime = true;
    let nextIdx = 0;
    for (let i = 0; i < TIME_PRESETS.length; i++) {
        if (Math.abs(W.dayT - TIME_PRESETS[i].t) < 0.08) {
            nextIdx = (i + 1) % TIME_PRESETS.length;
            break;
        }
    }
    W.dayT = TIME_PRESETS[nextIdx].t;
    apply(G.currentAge, 0, true, G.prologue ? G.prologueAge : null);
    return TIME_PRESETS[nextIdx].name;
}
