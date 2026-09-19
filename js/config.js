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

        // 한낮에서 이른 오후로. 하루의 시작 지점.
        weather: {
            band: [0.58, 0.70],
            speed: 0.0042,
            start: "clear",
            pool: ["haze", "clear", "haze", "overcast", "rain", "haze", "clear"]
        },
        fog: 0x5e706c,
        fogDensity: 0.0115,

        // 지평선 하늘 그라데이션 (맑은 푸른빛과 따뜻한 수평선)
        sky: { top: 0x364f66, mid: 0x688494, bottom: 0xb5cbd2 },

        // 멀어질수록 옅어지는 푸르스름한 산 능선
        ridges: [
            { dist: 74, height: 34, color: 0x657878, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x526868, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x415757, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x334949, opacity: 0.75, base: -3 }
        ],

        intro: "강가의 얕게 깎인 신석기 마을입니다.\n움집과 갈대밭 사이로 오랜 생활의 흔적이 남아 있습니다.\n주변을 조사해 보세요.",

        light: {
            hemiSky: 0xdff0fa,
            hemiGround: 0x3e4a3c,
            hemiIntensity: 0.58,
            ambient: 0x8ea89a,
            ambientIntensity: 0.28,
            sun: 0xffedd2,
            sunIntensity: 2.15,
            sunPos: [-13, 14, -16],
            fillIntensity: 0.18
        },

        // 후처리 그레이딩: 맑고 선명한 색감 복원
        grade: {
            tint: [1.02, 1.00, 0.96],
            lift: [0.012, 0.012, 0.015],
            sat: 0.88,
            sepia: 0.08,
            contrast: 1.15,
            vignette: 0.95
        }
    },

    // ---------------------------------------------------------- 청동기
    {
        name: "청동기 시대 · 고인돌 제단",
        completeText: "부러진 동검과 제단의 문양이 같은 곳을 가리킵니다.\\n사람들은 그 자리를 덮지 않고 표시해 두었습니다.",
        goal: "제단 주변의 청동기 흔적 3개를 조사하세요.",
        total: 3,
        start: { x: 0.0, z: 0.0 },

        // 이른 오후에서 늦은 오후로. 해가 기울며 제의가 시작된다.
        weather: {
            band: [0.70, 0.80],
            speed: 0.0030,
            start: "clear",
            pool: ["clear", "clear", "haze", "overcast", "clear"]
        },
        fog: 0x6d5334,
        fogDensity: 0.0105,

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
            tint: [1.03, 1.00, 0.95],
            lift: [0.014, 0.012, 0.012],
            sat: 0.86,
            sepia: 0.10,
            contrast: 1.18,
            vignette: 1.0
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

        // 해질녘. 성벽과 고분이 긴 그림자를 끈다.
        weather: {
            band: [0.80, 0.88],
            speed: 0.0038,
            start: "clear",
            pool: ["clear", "haze", "rain", "haze", "overcast", "clear"]
        },

        fog: 0x687870,
        fogDensity: 0.0115,

        sky: { top: 0x3a4e60, mid: 0x6e8494, bottom: 0xc4d4db },

        ridges: [
            { dist: 74, height: 34, color: 0x687b80, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x54676c, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x43565a, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x36484c, opacity: 0.75, base: -3 }
        ],

        intro: "낙동강을 따라 자리한 마을입니다.\n토성과 고분, 논과 대장간이 어우러져 있습니다.\n성벽이 한 자리에서만 바깥으로 꺾여 있습니다.",

        light: {
            hemiSky: 0xe2f0fa,
            hemiGround: 0x3e4838,
            hemiIntensity: 0.58,
            ambient: 0x90a89a,
            ambientIntensity: 0.28,
            sun: 0xffedd2,
            sunIntensity: 1.85,
            // 해질녘 — 해가 낮게 걸린다
            sunPos: [-15, 11, -15],
            fillIntensity: 0.18
        },

        grade: {
            tint: [1.01, 1.01, 0.98],
            lift: [0.012, 0.012, 0.014],
            sat: 0.90,
            sepia: 0.06,
            contrast: 1.14,
            vignette: 0.95
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

        // 저녁에서 밤으로. 고대에서 이어온 하루가 여기서 저문다.
        // 이야기에서도 가장 어두운 지점이다 — 금기와 두려움의 시대.
        weather: {
            band: [0.88, 0.95],
            speed: 0.0026,
            start: "clear",
            pool: ["clear", "haze", "overcast", "haze", "rain", "clear"]
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
            tint: [0.98, 1.00, 1.04],
            lift: [0.045, 0.045, 0.060],
            sat: 0.90,
            sepia: 0.05,
            contrast: 1.10,
            vignette: 0.82
        }
    },

    // ---------------------------------------------------------- 1970년대
    {
        name: "1970년대 · 시골 마을",
        completeText: "포크레인이 멈춘 자리에 삽이 그대로 남았습니다.\\n이유를 아는 사람은 이미 없었습니다.",
        goal: "멈춘 공사의 흔적 3개를 조사하세요.",
        total: 3,
        // 화면 좌표 (0, -9.5) — 마을 한가운데, 신작로 옆
        start: { x: 6.7, z: 6.7 },

        // 아침에서 한낮으로. 여기서 하루가 새로 시작된다.
        // 조선의 밤 다음에 오는 이 아침이 "새 시대가 밝았다"가 된다.
        weather: {
            band: [0.34, 0.52],
            speed: 0.0040,
            start: "clear",
            pool: ["clear", "clear", "haze", "rain", "overcast", "clear"]
        },

        fog: 0x6e786b,
        fogDensity: 0.0100,

        sky: { top: 0x385268, mid: 0x768f9e, bottom: 0xccd8db },

        ridges: [
            { dist: 74, height: 34, color: 0x687b70, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x54675c, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x43564b, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x36483d, opacity: 0.75, base: -3 }
        ],

        intro: "햇살이 비추는 시골 마을입니다.\n전봇대가 하늘을 가르고 신작로에 버스가 들어옵니다.\n마을 안길 공사가 한 자리에서 멈춰 있습니다.",

        light: {
            hemiSky: 0xe6f2fa,
            hemiGround: 0x3e4834,
            hemiIntensity: 0.62,
            ambient: 0xa4b89e,
            ambientIntensity: 0.30,
            sun: 0xffedd6,
            sunIntensity: 2.15,
            // 아침 해 — 반대편에서 비친다
            sunPos: [15, 17, 13],
            fillIntensity: 0.20
        },

        grade: {
            tint: [1.02, 1.01, 0.97],
            lift: [0.014, 0.014, 0.015],
            sat: 0.90,
            sepia: 0.06,
            contrast: 1.15,
            vignette: 0.95
        }
    },

    // ---------------------------------------------------------- 2000년대
    {
        name: "2000년대 · 한강변 신도시",
        completeText: "모든 흔적을 조사했습니다.\\n\\n신석기의 아이가 묻힌 자리를,\\n여섯 시대의 사람들이 차례로 비껴갔습니다.\\n\\n아무도 기억하지 못했지만, 아무도 잊지 않았습니다.",
        goal: "발굴 현장의 기록 3개를 조사하세요.",
        total: 3,
        // 화면 좌표 (0, -9.5) — 교차로 한가운데
        start: { x: 6.7, z: 6.7 },
        night: true,

        // 해질녘에서 저녁으로. 두 번째 하루가 저물며 답이 나온다.
        weather: {
            band: [0.76, 0.90],
            speed: 0.0028,
            start: "haze",
            pool: ["haze", "clear", "haze", "rain", "overcast", "haze"]
        },

        fog: 0x4a4c56,
        fogDensity: 0.0145,

        sky: { top: 0x242e44, mid: 0x4e5468, bottom: 0x8c8490 },

        ridges: [
            { dist: 74, height: 32, color: 0x505668, opacity: 0.55, base: -6 },
            { dist: 56, height: 24, color: 0x404658, opacity: 0.62, base: -5 },
            { dist: 42, height: 16, color: 0x32384a, opacity: 0.72, base: -4 },
            { dist: 30, height: 10, color: 0x262c3e, opacity: 0.80, base: -3 }
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
            tint: [0.98, 1.00, 1.02],
            lift: [0.045, 0.045, 0.055],
            sat: 0.94,
            sepia: 0.04,
            contrast: 1.10,
            vignette: 0.82
        }
    }
];

export const MOVE_CODES = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
]);

export const SPRINT_CODES = new Set(["ShiftLeft", "ShiftRight"]);

