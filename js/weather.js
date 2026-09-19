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
        rain: 0, satMul: 1.00, contrastAdd: 0.00
    },
    haze: {
        name: "엷은 안개",
        fogMul: 1.32, sunMul: 0.88, ambMul: 1.12,
        rain: 0, satMul: 0.92, contrastAdd: -0.04
    },
    overcast: {
        name: "흐림",
        fogMul: 1.18, sunMul: 0.52, ambMul: 1.28,
        rain: 0, satMul: 0.84, contrastAdd: -0.06
    },
    rain: {
        name: "비",
        fogMul: 1.55, sunMul: 0.34, ambMul: 1.24,
        rain: 1, satMul: 0.72, contrastAdd: -0.02
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
    rainMesh: null
};

/** 시대가 바뀔 때 호출. 그 시대의 시간대와 날씨로 초기화한다. */
export function initWeather(index) {
    const age = AGE_DATA[index];
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
    W.pool = w.pool;

    W.rainMesh = null; // 새 scene 에서 다시 만든다
    buildRain();
    apply(index, 0, true);
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
        name: k < 0.5 ? a.name : b.name
    };
}

const _tmpColor = new THREE.Color();

/** 계산된 값들을 실제 장면에 반영한다 */
function apply(index, delta, immediate) {
    const age = AGE_DATA[index];
    const f = currentFactors();

    // --- 시간에 따른 태양 위치 ---
    // 구간 안에서만 움직이므로 시대의 인상은 유지된다.
    const k = (W.dayT - W.band[0]) / Math.max(0.0001, W.band[1] - W.band[0]);
    const ang = (k - 0.5) * 0.85;           // 좌우로 회전
    const drop = 1 - Math.abs(k - 0.15) * 0.45; // 늦어질수록 낮아진다

    const [sx, sy, sz] = age.light.sunPos;
    const cos = Math.cos(ang), sin = Math.sin(ang);

    if (G.sunLight) {
        G.sunLight.userData.ox = sx * cos - sz * sin;
        G.sunLight.userData.oy = Math.max(2.5, sy * drop);
        G.sunLight.userData.oz = sx * sin + sz * cos;
        G.sunLight.intensity = age.light.sunIntensity * f.sunMul;

        // 해가 낮아질수록 붉어진다
        _tmpColor.set(age.light.sun);
        _tmpColor.lerp(new THREE.Color(0xff9a4e), Math.max(0, k - 0.3) * 0.5);
        G.sunLight.color.copy(_tmpColor);
    }

    if (G.hemiLight) G.hemiLight.intensity = age.light.hemiIntensity * f.ambMul;
    if (G.ambientLight) G.ambientLight.intensity = age.light.ambientIntensity * f.ambMul;

    // --- 안개 ---
    if (G.scene && G.scene.fog) {
        const target = age.fogDensity * f.fogMul;
        G.scene.fog.density = immediate
            ? target
            : G.scene.fog.density + (target - G.scene.fog.density) * Math.min(1, delta * 0.5);
    }

    // --- 후처리 색보정 ---
    const g = age.grade;
    applyGrade({
        tint: g.tint,
        lift: g.lift,
        sat: g.sat * f.satMul,
        sepia: g.sepia,
        contrast: g.contrast + f.contrastAdd,
        vignette: g.vignette
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
}

const _m = new THREE.Matrix4();

/** 매 프레임 호출 */
export function updateWeather(delta) {
    if (!G.scene) return;

    // --- 시간 흐름 (구간 안에서 왕복) ---
    W.dayT += W.speed * delta * W.dir;
    if (W.dayT > W.band[1]) { W.dayT = W.band[1]; W.dir = -1; }
    if (W.dayT < W.band[0]) { W.dayT = W.band[0]; W.dir = 1; }

    // --- 날씨 전환 ---
    W.timer -= delta;
    if (W.timer <= 0 && W.blend >= 1) rollWeather();
    if (W.blend < 1) W.blend = Math.min(1, W.blend + delta / 12); // 12초에 걸쳐 섞인다

    apply(G.currentAge, delta, false);

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
}

/** UI 에 보여 줄 문구 */
export function weatherLabel() {
    return currentFactors().name + " · " + timeName(W.dayT);
}
