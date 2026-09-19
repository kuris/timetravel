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
        goal: "마을 주변의 유물 3개를 조사하고 회수하세요.",
        total: 3,
        start: { x: -7.0, z: 9.0 },

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
            hemiIntensity: 0.42,
            ambient: 0xc79a6e,
            ambientIntensity: 0.16,
            sun: 0xffd9a4,
            sunIntensity: 1.95,
            sunPos: [-13, 14, -16],
            fillIntensity: 0.13
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
        goal: "제단 주변의 청동기 흔적 3개를 조사하세요.",
        total: 3,
        start: { x: -8.2, z: 7.5 },

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
            hemiIntensity: 0.38,
            ambient: 0xb87a49,
            ambientIntensity: 0.15,
            sun: 0xffb168,
            sunIntensity: 1.85,
            sunPos: [-15, 13.5, -15],
            fillIntensity: 0.12
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

    // ---------------------------------------------------------- 조선
    {
        name: "조선 시대 · 한양 외곽 마을",
        goal: "저녁 마을의 기록 3개를 조사하세요.",
        total: 3,
        start: { x: -7.5, z: -7.2 },

        // 저녁에서 밤으로. 등불이 살아나는 시간.
        weather: {
            band: [0.88, 0.99],
            speed: 0.0026,
            start: "clear",
            pool: ["clear", "haze", "rain", "overcast", "clear"]
        },
        fog: 0x353140,
        fogDensity: 0.0150,

        sky: { top: 0x161a26, mid: 0x3b3546, bottom: 0x7d6154 },

        ridges: [
            { dist: 74, height: 32, color: 0x4b4557, opacity: 0.58, base: -6 },
            { dist: 56, height: 24, color: 0x3d3846, opacity: 0.66, base: -5 },
            { dist: 42, height: 16, color: 0x2f2b36, opacity: 0.76, base: -4 },
            { dist: 30, height: 10, color: 0x241f28, opacity: 0.84, base: -3 }
        ],

        intro: "저녁빛이 내려앉은 한양 외곽 마을입니다.\n등불 아래 돌담과 장승이 길게 그림자를 늘어뜨립니다.\n\n어사패, 낡은 문서, 장승의 문양을 조사하세요.",

        light: {
            // 달빛. 밤이지만 길과 건물이 읽혀야 한다.
            hemiSky: 0x7078a8,
            hemiGround: 0x2b241d,
            hemiIntensity: 1.05,
            ambient: 0x5d5878,
            ambientIntensity: 0.66,
            sun: 0xc6d2f2,
            sunIntensity: 1.55,
            sunPos: [-11, 15, -15],
            fillIntensity: 0.22
        },

        // 밤이지만 전체 게임의 낡은 필터는 유지한다
        grade: {
            tint: [1.00, 1.00, 1.06],
            lift: [0.072, 0.070, 0.088],
            sat: 0.58,
            sepia: 0.18,
            contrast: 1.10,
            vignette: 0.85
        }
    }
];

export const MOVE_CODES = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
]);

export const SPRINT_CODES = new Set(["ShiftLeft", "ShiftRight"]);

