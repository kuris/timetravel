/**
 * 게임 설정 — 상수와 시대 정의
 */
import { grade } from "./postprocess.js";

export const VIEW_SIZE = 19.5;  // 등각 시야 크기. 클수록 더 넓은 풍경이 보인다.
export const RENDER_SCALE = 0.78; // 내부 렌더 해상도 배율. 낮출수록 픽셀이 굵어진다.
export const PLAYER_SPEED = 4.1;
export const SPRINT_MULTIPLIER = 1.9;  // Shift 를 누르고 있을 때
export const WORLD_LIMIT = 31;

/**
 * 단서가 여는 시대.
 *
 * 시간의 문은 가 본 시대와 바로 다음 시대만 보여 준다.
 * 가 보지 않은 과거는 목록에 없다 — 누군가 그 시대를 입에 올려야 길이 생긴다.
 * 그래서 "저 돌은 아주 옛날부터 있었대요" 같은 한마디가 실제로 문을 연다.
 *
 *   시대 index: 그 시대를 여는 단서 ID
 */
export const ERA_OPENED_BY = {
    1: "samguk_child",  // 청동기 — 삼국의 아이가 "옛날에 저기서 밤에 모였다"고 말한다
    0: "bronze_fate"    // 신석기 — 청동기의 제사장과 이야기하고 나면
};

export const AGE_DATA = [
    // ---------------------------------------------------------- 신석기
    {
        name: "신석기 시대 · 한반도 강가",
        completeText: "세 유물이 한 자리에서 나왔습니다.\n마을이 불탄 해에, 누군가를 여기 묻었습니다.",
        goal: "나무와 돌을 모아 빈 땅에 첫 집을 세우세요.",
        total: 3,
        // 화면 좌표 (0, 0) — 아직 아무것도 없는 강가 한복판
        start: { x: 0.0, z: 0.0 },

        // 한낮에서 이른 오후로. 하루의 시작 지점.
        weather: {
            band: [0.44, 0.56],
            speed: 0.0042,
            start: "clear",
            pool: ["haze", "clear", "haze", "overcast", "rain", "haze", "clear"]
        },
        fog: 0x5e706c,
        fogDensity: 0.0057,

        // 지평선 하늘 그라데이션 (맑은 푸른빛과 따뜻한 수평선)
        sky: { top: 0x364f66, mid: 0x688494, bottom: 0xb5cbd2 },

        // 멀어질수록 옅어지는 푸르스름한 산 능선
        ridges: [
            { dist: 74, height: 34, color: 0x657878, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x526868, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x415757, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x334949, opacity: 0.75, base: -3 }
        ],

        intro: "강가의 빈 땅입니다. 집도 길도 없습니다.\n쓰러진 나무와 돌을 주워([E]) 원하는 자리에 서서 [E]로 집을 세우세요.\n마을이 자라면 시간의 문이 깨어납니다.",

        light: {
            hemiSky: 0xdff0fa,
            hemiGround: 0x3e4a3c,
            hemiIntensity: 0.84,
            ambient: 0x8ea89a,
            ambientIntensity: 0.48,
            sun: 0xffedd2,
            sunIntensity: 2.58,
            sunPos: [-13, 14, -16],
            fillIntensity: 0.18
        },

        // 후처리 그레이딩: 맑고 선명한 색감 복원
        grade: {
            tint: [1.02, 1.00, 0.96],
            lift: [0.012, 0.012, 0.015],
            sat: 1.10,
            sepia: 0.02,
            contrast: 1.10,
            vignette: 0.40
        }
    },

    // ---------------------------------------------------------- 청동기
    {
        name: "청동기 시대 · 고인돌 제단",
        completeText: "부러진 동검과 제단의 문양이 같은 곳을 가리킵니다.\n사람들은 그 자리를 덮지 않고 표시해 두었습니다.",
        goal: "제단 곁으로 마을을 옮겨 세우세요.",
        total: 3,
        start: { x: 0.0, z: 0.0 },

        // 이른 오후에서 늦은 오후로. 해가 기울며 제의가 시작된다.
        weather: {
            band: [0.50, 0.62],
            speed: 0.0030,
            start: "clear",
            pool: ["clear", "clear", "haze", "overcast", "clear"]
        },
        fog: 0x8a8b74,
        fogDensity: 0.0053,

        sky: { top: 0x3f5a72, mid: 0x8b9a92, bottom: 0xdcc79a },

        ridges: [
            { dist: 74, height: 36, color: 0xb08050, opacity: 0.52, base: -6 },
            { dist: 56, height: 27, color: 0x8f6540, opacity: 0.60, base: -5 },
            { dist: 42, height: 18, color: 0x734f33, opacity: 0.70, base: -4 },
            { dist: 30, height: 11, color: 0x5a3f2a, opacity: 0.78, base: -3 }
        ],

        intro: "황토빛 언덕 위, 고인돌 제단이 낮게 울립니다.\n제단과 선돌뿐, 사는 사람은 제사장 하나입니다.\n제사장에게 말을 걸어 보세요.",

        light: {
            hemiSky: 0xffc78c,
            hemiGround: 0x482d1b,
            hemiIntensity: 0.72,
            ambient: 0xc08a58,
            ambientIntensity: 0.37,
            sun: 0xffbb76,
            sunIntensity: 2.58,
            sunPos: [-15, 13.5, -15],
            fillIntensity: 0.14
        },

        grade: {
            tint: [1.03, 1.00, 0.95],
            lift: [0.014, 0.012, 0.012],
            sat: 1.07,
            sepia: 0.03,
            contrast: 1.13,
            vignette: 0.42
        }
    },

    // ---------------------------------------------------------- 삼국시대
    {
        name: "삼국시대 · 낙동강 유역",
        completeText: "성을 쌓으면서도 그 돌만은 건드리지 않았습니다.\n이유는 아무도 적어 두지 않았습니다.",
        goal: "성벽 안쪽으로 마을을 더 키우세요.",
        total: 3,
        // 화면 좌표 (0, -4) — 마을 한가운데, 성벽이 화면에 들어오는 자리
        start: { x: 2.8, z: 2.8 },

        // 해질녘. 성벽과 고분이 긴 그림자를 끈다.
        weather: {
            band: [0.40, 0.54],
            speed: 0.0038,
            start: "clear",
            pool: ["clear", "haze", "rain", "haze", "overcast", "clear"]
        },

        fog: 0x687870,
        fogDensity: 0.0057,

        sky: { top: 0x3a4e60, mid: 0x6e8494, bottom: 0xc4d4db },

        ridges: [
            { dist: 74, height: 34, color: 0x687b80, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x54676c, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x43565a, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x36484c, opacity: 0.75, base: -3 }
        ],

        intro: "낙동강을 따라 토성이 쌓였습니다.\n성벽이 한 자리에서만 바깥으로 꺾여 있습니다.\n사람들을 만나고 흔적을 살펴보세요.",

        light: {
            hemiSky: 0xe2f0fa,
            hemiGround: 0x3e4838,
            hemiIntensity: 0.84,
            ambient: 0x90a89a,
            ambientIntensity: 0.48,
            sun: 0xffedd2,
            sunIntensity: 2.22,
            // 해질녘 — 해가 낮게 걸린다
            sunPos: [-15, 11, -15],
            fillIntensity: 0.18
        },

        grade: {
            tint: [1.01, 1.01, 0.98],
            lift: [0.012, 0.012, 0.014],
            sat: 1.12,
            sepia: 0.01,
            contrast: 1.09,
            vignette: 0.40
        }
    },

    // ---------------------------------------------------------- 조선
    {
        name: "조선 시대 · 밀양 월영루",
        completeText: "암행어사 출두야!\n마패가 번쩍이고, 관아의 문이 열립니다.",
        night: false,
        goal: "월영루의 붉은 나비 소문을 조사하라.",
        total: 3,
        start: { x: 0.0, z: 0.0 },

        // 늦은 오후~해질녘 직전. 첨부 이미지처럼 밝고 따뜻한 마을.
        weather: {
            band: [0.70, 0.79],
            speed: 0.0016,
            start: "clear",
            pool: ["clear", "haze", "haze", "clear", "overcast"]
        },
        fog: 0xd8b088,
        fogDensity: 0.0042,

        sky: { top: 0x5a6a9a, mid: 0xd89a6a, bottom: 0xf0c890 },

        ridges: [
            { dist: 74, height: 32, color: 0x6a5a6e, opacity: 0.55, base: -6 },
            { dist: 56, height: 24, color: 0x5a4a5e, opacity: 0.62, base: -5 },
            { dist: 42, height: 16, color: 0x4a3d4e, opacity: 0.72, base: -4 },
            { dist: 30, height: 10, color: 0x3a3040, opacity: 0.80, base: -3 }
        ],

        intro: "밀양 고을, 강가의 누각 월영루입니다.\n밤마다 붉은 나비가 날고, 새로 부임한 수령마다 첫날밤 죽었다 합니다.\n떠돌이 선비 행세로 잠입하십시오. 사람들의 입을 여는 것이 먼저입니다.",

        light: {
            hemiSky: 0xffe2c0,
            hemiGround: 0x6a5238,
            hemiIntensity: 0.95,
            ambient: 0xe8b888,
            ambientIntensity: 0.50,
            sun: 0xffc878,
            sunIntensity: 2.9,
            sunPos: [-14, 13, -10],
            fillIntensity: 0.24
        },

        // 해질녘 노을 — 따뜻하고 선명하게
        grade: {
            tint: [1.04, 1.00, 0.94],
            lift: [0.015, 0.012, 0.010],
            sat: 1.14,
            sepia: 0.04,
            contrast: 1.10,
            vignette: 0.38
        }
    },

    // ---------------------------------------------------------- 1970년대
    {
        name: "1970년대 · 신작로가 난 들",
        completeText: "포크레인이 멈춘 자리에 삽이 그대로 남았습니다.\n이유를 아는 사람은 이미 없었습니다.",
        goal: "길가에 마을을 더 키우세요.",
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
        fogDensity: 0.0050,

        sky: { top: 0x385268, mid: 0x768f9e, bottom: 0xccd8db },

        ridges: [
            { dist: 74, height: 34, color: 0x687b70, opacity: 0.55, base: -6 },
            { dist: 56, height: 25, color: 0x54675c, opacity: 0.60, base: -5 },
            { dist: 42, height: 17, color: 0x43564b, opacity: 0.68, base: -4 },
            { dist: 30, height: 10, color: 0x36483d, opacity: 0.75, base: -3 }
        ],

        intro: "신작로가 들을 가르고 전봇대가 하늘을 지납니다.\n길은 지나갈 뿐, 사는 사람은 나와 내 주민들뿐입니다.\n마을 안길 공사가 한 자리에서 멈춰 있습니다.",

        light: {
            hemiSky: 0xe6f2fa,
            hemiGround: 0x3e4834,
            hemiIntensity: 0.90,
            ambient: 0xa4b89e,
            ambientIntensity: 0.51,
            sun: 0xffedd6,
            sunIntensity: 2.58,
            // 아침 해 — 반대편에서 비친다
            sunPos: [15, 17, 13],
            fillIntensity: 0.20
        },

        grade: {
            tint: [1.02, 1.01, 0.97],
            lift: [0.014, 0.014, 0.015],
            sat: 1.12,
            sepia: 0.01,
            contrast: 1.10,
            vignette: 0.40
        }
    },

    // ---------------------------------------------------------- 2000년대
    {
        name: "2000년대 · 한강변 빈 부지",
        completeText: "모든 흔적을 조사했습니다.\n\n신석기의 아이가 묻힌 자리를,\n여섯 시대의 사람들이 차례로 비껴갔습니다.\n\n아무도 기억하지 못했지만, 아무도 잊지 않았습니다.",
        goal: "마지막으로 마을을 완성하세요.",
        total: 3,
        // 화면 좌표 (0, -9.5) — 교차로 한가운데
        start: { x: 6.7, z: 6.7 },
        night: true,

        // 해질녘에서 저녁으로. 두 번째 하루가 저물며 답이 나온다.
        weather: {
            band: [0.46, 0.60],
            speed: 0.0028,
            start: "haze",
            pool: ["haze", "clear", "haze", "rain", "overcast", "haze"]
        },

        fog: 0x83908c,
        fogDensity: 0.0073,

        sky: { top: 0x3a5478, mid: 0x7e93a6, bottom: 0xc3ccd4 },

        ridges: [
            { dist: 74, height: 32, color: 0x505668, opacity: 0.55, base: -6 },
            { dist: 56, height: 24, color: 0x404658, opacity: 0.62, base: -5 },
            { dist: 42, height: 16, color: 0x32384a, opacity: 0.72, base: -4 },
            { dist: 30, height: 10, color: 0x262c3e, opacity: 0.80, base: -3 }
        ],

        intro: "한강변의 빈 부지입니다. 길과 가로등만 깔려 있습니다.\n여섯 시대에 걸쳐 내가 지어 온 것들이 여기까지 따라왔습니다.\n길 한가운데, 울타리에 둘러싸인 돌 하나가 남아 있습니다.",

        light: {
            hemiSky: 0x8d93bc,
            hemiGround: 0x3a3630,
            hemiIntensity: 0.88,
            ambient: 0x827e9a,
            ambientIntensity: 0.48,
            sun: 0xe2e6f8,
            sunIntensity: 2.22,
            sunPos: [-12, 15, -14],
            fillIntensity: 0.22
        },

        grade: {
            tint: [0.98, 1.00, 1.02],
            lift: [0.045, 0.045, 0.055],
            sat: 1.15,
            sepia: 0.01,
            contrast: 1.06,
            vignette: 0.34
        }
    }
];

export const MOVE_CODES = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
]);

export const SPRINT_CODES = new Set(["ShiftLeft", "ShiftRight"]);

