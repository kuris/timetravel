/**
 * 게임 설정 — 상수와 시대 정의
 */
import { grade } from "./postprocess.js";

export const VIEW_SIZE = 27.5;  // 등각 시야 크기. 클수록 더 넓은 풍경이 보인다.
export const RENDER_SCALE = 0.48; // 내부 렌더 해상도 배율. 낮출수록 픽셀이 굵어진다.
export const PLAYER_SPEED = 4.1;
export const SPRINT_MULTIPLIER = 1.9;  // Shift 를 누르고 있을 때
export const WORLD_LIMIT = 31;

export const AGE_DATA = [
    // ---------------------------------------------------------- 신석기
    {
        name: "신석기 시대 · 한반도 강가 마을",
        completeText: "세 유물이 한 자리에서 나왔습니다.\\n마을이 불탄 해에, 누군가를 여기 묻었습니다.",
        goal: "마을 주변의 유물 3개를 조사하고 회수하세요.",
        total: 3,
        // 화면 좌표 (0, 0) — 마을 한가운데
        start: { x: 0.0, z: 0.0 },

        // 늦은 오후에서 해질녘 사이를 오간다
        weather: {
            band: [0.60, 0.80],
            speed: 0.0042,
            start: "clear",
            pool: ["clear", "haze", "overcast", "haze", "rain", "clear"]
        },
        fog: 0x7b6343,
        fogDensity: 0.0105,

        // 지평선 하늘 그라데이션 (위 -> 아래)
        sky: { top: 0x4a3a28, mid: 0x8e7148, bottom: 0xd2ad78 },

        // 멀어질수록 옅어지는 산 능선
        ridges: [
            { dist: 74, height: 34, color: 0xa48a63, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x8d7450, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x74603f, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x5e4d33, opacity: 0.75, base: -3 }
        ],

        intro: "강가의 얕게 깎인 신석기 마을입니다.\n움집과 갈대밭 사이로 오랜 생활의 흔적이 남아 있습니다.\n주변을 조사해 보세요.",

        light: {
            hemiSky: 0xffdcab,
            hemiGround: 0x4a3724,
            hemiIntensity: 0.52,
            ambient: 0xc79a6e,
            ambientIntensity: 0.24,
            sun: 0xffd9a4,
            sunIntensity: 2.10,
            sunPos: [-13, 14, -16],
            fillIntensity: 0.16
        },

        // 후처리 그레이딩: 바랜 세피아 사진
        grade: {
            tint: [1.10, 0.96, 0.75],
            lift: [0.028, 0.017, 0.008],
            sat: 0.58,
            sepia: 0.36,
            contrast: 1.24,
            vignette: 1.0
        }
    },

    // ---------------------------------------------------------- 청동기
    {
        name: "청동기 시대 · 고인돌 제단",
        completeText: "부러진 동검과 제단의 문양이 같은 곳을 가리킵니다.\\n사람들은 그 자리를 덮지 않고 표시해 두었습니다.",
        goal: "제단 주변의 청동기 흔적 3개를 조사하세요.",
        total: 3,
        start: { x: 0.0, z: 0.0 },

        // 해질녘 고정에 가깝다. 제의의 시간.
        weather: {
            band: [0.72, 0.88],
            speed: 0.0030,
            start: "clear",
            pool: ["clear", "haze", "overcast", "clear"]
        },
        fog: 0x6d5334,
        fogDensity: 0.0115,

        sky: { top: 0x4e3320, mid: 0x9a6236, bottom: 0xd9a05c },

        ridges: [
            { dist: 74, height: 36, color: 0xb08050, opacity: 0.52, base: -6 },
            { dist: 56, height: 27, color: 0x8f6540, opacity: 0.60, base: -5 },
            { dist: 42, height: 18, color: 0x734f33, opacity: 0.70, base: -4 },
            { dist: 30, height: 11, color: 0x5a3f2a, opacity: 0.78, base: -3 }
        ],

        intro: "황토빛 언덕 위, 고인돌 제단이 낮게 울립니다.\n돌기둥 사이로 청동의 흔적이 흩어져 있습니다.\n\n비파형 동검 조각, 청동 방울, 제단 문양을 조사하세요.",

        light: {
            hemiSky: 0xffc78c,
            hemiGround: 0x482d1b,
            hemiIntensity: 0.50,
            ambient: 0xc08a58,
            ambientIntensity: 0.22,
            sun: 0xffbb76,
            sunIntensity: 2.15,
            sunPos: [-15, 13.5, -15],
            fillIntensity: 0.14
        },

        grade: {
            tint: [1.09, 0.95, 0.75],
            lift: [0.028, 0.017, 0.007],
            sat: 0.56,
            sepia: 0.33,
            contrast: 1.26,
            vignette: 1.05
        }
    },

    // ---------------------------------------------------------- 삼국시대
    {
        name: "삼국시대 · 낙동강 유역의 마을",
        completeText: "성을 쌓으면서도 그 돌만은 건드리지 않았습니다.\\n이유는 아무도 적어 두지 않았습니다.",
        goal: "성벽이 꺾인 자리의 기록 3개를 조사하세요.",
        total: 3,
        // 화면 좌표 (0, -4) — 마을 한가운데, 성벽이 화면에 들어오는 자리
        start: { x: 2.8, z: 2.8 },

        // 이른 오후에서 늦은 오후로. 성벽 그림자가 길어진다.
        weather: {
            band: [0.48, 0.70],
            speed: 0.0038,
            start: "clear",
            pool: ["clear", "haze", "overcast", "rain", "clear"]
        },

        fog: 0x7f6a48,
        fogDensity: 0.0115,

        sky: { top: 0x47412c, mid: 0x8c7a4e, bottom: 0xd0b581 },

        ridges: [
            { dist: 74, height: 34, color: 0x9a8f63, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x847a52, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x6a6340, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x545033, opacity: 0.75, base: -3 }
        ],

        intro: "낙동강을 따라 자리한 마을입니다.\n토성과 고분, 논과 대장간이 어우러져 있습니다.\n성벽이 한 자리에서만 바깥으로 꺾여 있습니다.",

        light: {
            hemiSky: 0xffe6bc,
            hemiGround: 0x4e4128,
            hemiIntensity: 0.58,
            ambient: 0xcaa878,
            ambientIntensity: 0.26,
            sun: 0xffe0ae,
            sunIntensity: 2.05,
            sunPos: [-14, 16, -15],
            fillIntensity: 0.18
        },

        grade: {
            tint: [1.07, 0.98, 0.79],
            lift: [0.030, 0.020, 0.010],
            sat: 0.60,
            sepia: 0.30,
            contrast: 1.22,
            vignette: 1.0
        }
    },

    // ---------------------------------------------------------- 조선
    {
        name: "조선 시대 · 한양 외곽 마을",
        completeText: "관아의 금기와 장승의 시선이 같은 곳을 향합니다.\\n기억이 문서로 넘어왔습니다.",
        night: true,
        goal: "저녁 마을의 기록 3개를 조사하세요.",
        total: 3,
        start: { x: 0.0, z: 0.0 },

        // 저녁에서 밤으로. 등불이 살아나는 시간.
        weather: {
            band: [0.80, 0.91],
            speed: 0.0026,
            start: "clear",
            pool: ["clear", "haze", "rain", "overcast", "clear"]
        },
        fog: 0x453f4e,
        fogDensity: 0.0150,

        sky: { top: 0x24283c, mid: 0x52465c, bottom: 0x9d7a63 },

        ridges: [
            { dist: 74, height: 32, color: 0x4b4557, opacity: 0.58, base: -6 },
            { dist: 56, height: 24, color: 0x3d3846, opacity: 0.66, base: -5 },
            { dist: 42, height: 16, color: 0x2f2b36, opacity: 0.76, base: -4 },
            { dist: 30, height: 10, color: 0x241f28, opacity: 0.84, base: -3 }
        ],

        intro: "저녁빛이 내려앉은 한양 외곽 마을입니다.\n등불 아래 돌담과 장승이 길게 그림자를 늘어뜨립니다.\n\n어사패, 낡은 문서, 장승의 문양을 조사하세요.",

        light: {
            hemiSky: 0x8189b8,
            hemiGround: 0x38302a,
            hemiIntensity: 1.60,
            ambient: 0x796f92,
            ambientIntensity: 1.05,
            sun: 0xdbe2f8,
            sunIntensity: 2.05,
            sunPos: [-11, 15, -15],
            fillIntensity: 0.22
        },

        // 밤이지만 전체 게임의 낡은 필터는 유지한다
        grade: {
            tint: [1.06, 1.00, 0.97],
            lift: [0.092, 0.082, 0.090],
            sat: 0.62,
            sepia: 0.22,
            contrast: 1.06,
            vignette: 0.78
        }
    },

    // ---------------------------------------------------------- 1970년대
    {
        name: "1970년대 · 시골 마을",
        completeText: "포크레인이 멈춘 자리에 삽이 그대로 남았습니다.\\n이유를 아는 사람은 이미 없었습니다.",
        goal: "멈춘 공사의 흔적 3개를 조사하세요.",
        total: 3,
        // 화면 좌표 (0, 5) — 구멍가게 앞 신작로
        start: { x: -3.5, z: -3.5 },

        // 한낮의 마른 햇볕
        weather: {
            band: [0.40, 0.62],
            speed: 0.0040,
            start: "clear",
            pool: ["clear", "haze", "overcast", "rain", "clear"]
        },

        fog: 0x85714c,
        fogDensity: 0.0110,

        sky: { top: 0x4e4a30, mid: 0x928052, bottom: 0xd6bc8a },

        ridges: [
            { dist: 74, height: 34, color: 0x9a9066, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x847b56, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x6a6444, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x545037, opacity: 0.75, base: -3 }
        ],

        intro: "햇살이 비추는 시골 마을입니다.\n전봇대가 하늘을 가르고 신작로에 버스가 들어옵니다.\n마을 안길 공사가 한 자리에서 멈춰 있습니다.",

        light: {
            hemiSky: 0xffeecb,
            hemiGround: 0x4e4630,
            hemiIntensity: 0.62,
            ambient: 0xd2b489,
            ambientIntensity: 0.30,
            sun: 0xfff0cd,
            sunIntensity: 2.15,
            sunPos: [-14, 19, -14],
            fillIntensity: 0.20
        },

        grade: {
            tint: [1.05, 0.99, 0.83],
            lift: [0.032, 0.024, 0.014],
            sat: 0.64,
            sepia: 0.26,
            contrast: 1.18,
            vignette: 0.98
        }
    },

    // ---------------------------------------------------------- 2000년대
    {
        name: "2000년대 · 한강변 신도시",
        completeText: "모든 흔적을 조사했습니다.\\n\\n신석기의 아이가 묻힌 자리를,\\n여섯 시대의 사람들이 차례로 비껴갔습니다.\\n\\n아무도 기억하지 못했지만, 아무도 잊지 않았습니다.",
        goal: "발굴 현장의 기록 3개를 조사하세요.",
        total: 3,
        // 화면 좌표 (0, 2) — 교차로 한가운데
        start: { x: -1.4, z: -1.4 },
        night: true,

        // 해질녘에서 초저녁. 간판과 가로등이 켜지는 시간.
        weather: {
            band: [0.78, 0.90],
            speed: 0.0028,
            start: "clear",
            pool: ["clear", "haze", "rain", "overcast", "clear"]
        },

        fog: 0x4a4c56,
        fogDensity: 0.0135,

        sky: { top: 0x2a3042, mid: 0x5a5462, bottom: 0xa08470 },

        ridges: [
            { dist: 74, height: 32, color: 0x585c6e, opacity: 0.55, base: -6 },
            { dist: 56, height: 24, color: 0x484c5c, opacity: 0.62, base: -5 },
            { dist: 42, height: 16, color: 0x393d4c, opacity: 0.72, base: -4 },
            { dist: 30, height: 10, color: 0x2e313e, opacity: 0.80, base: -3 }
        ],

        intro: "한강이 흐르는 작은 신도시입니다.\n아파트와 상가, 편의점 불빛이 이어집니다.\n길 한가운데, 울타리에 둘러싸인 돌 하나가 남아 있습니다.",

        light: {
            hemiSky: 0x8d93bc,
            hemiGround: 0x3a3630,
            hemiIntensity: 1.70,
            ambient: 0x827e9a,
            ambientIntensity: 1.15,
            sun: 0xe2e6f8,
            sunIntensity: 1.85,
            sunPos: [-12, 15, -14],
            fillIntensity: 0.22
        },

        grade: {
            tint: [1.02, 1.00, 1.02],
            lift: [0.080, 0.076, 0.086],
            sat: 0.66,
            sepia: 0.18,
            contrast: 1.08,
            vignette: 0.82
        }
    }
];

export const MOVE_CODES = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
]);

export const SPRINT_CODES = new Set(["ShiftLeft", "ShiftRight"]);

