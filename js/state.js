/**
 * 공유 상태
 */
/**
 * 공유 상태.
 *
 * 시대가 바뀔 때마다 통째로 교체되는 값들(scene, world, player, 조사 목록 ...)을
 * 한 곳에 모아 둔다. ES 모듈의 import 바인딩은 재할당할 수 없으므로,
 * 재할당이 필요한 값은 전부 이 객체의 속성으로 둔다.
 */
export const G = {
    // --- Three.js 핵심 ---
    renderer: null,
    camera: null,
    isoCamera: null,
    fpvCamera: null,
    isFirstPerson: false,
    fpvYaw: -Math.PI * 0.75, // 초기 쿼터뷰 시선 방향과 유사하게 설정
    fpvPitch: -0.15,
    fpvBob: 0,
    scene: null,
    world: null,     // 시대별 오브젝트가 들어가는 그룹
    player: null,
    backdrop: null,  // 지평선 배경판 (카메라를 따라다닌다)
    sunLight: null,  // 그림자 카메라를 플레이어에 맞추기 위해 보관
    hemiLight: null, // 날씨에 따라 세기가 바뀐다
    ambientLight: null,

    // --- 진행 상태 ---
    currentAge: 0,
    ageProgress: 0,
    ageCompleteTriggered: false,
    transitioning: false,
    demoFinished: false,
    prologue: false, // 현대 프롤로그 진행 중 (전용 플로우)
    prologueDone: false,
    fateChoice: null, // 청동기 제단 인과 선택 ("bury" | "raise")
    glitchAmount: 0, // 시대 전환 셰이더 글리치 강도 (0..1)

    // --- 월드 내용물 ---
    activeGate: null,
    clickTarget: null,
    interactables: [],
    npcs: [],
    animated: [],
    inventory: [],
    enemies: [],       // 위험 NPC (접근 시 피해)
    lockedZones: [],   // 진입 제한 구역

    // --- HP / 스태미나 ---
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    hpCooldown: 0,     // 피해 후 무적 시간
    respawnPending: false,

    // --- 단서 / 일지 ---
    clues: new Set(),       // 획득한 단서 ID
    journal: [],            // { type, title, text, age } 기록

    // --- 미니맵 ---
    mapShapes: [],
    mapMarkers: [],
    exploredTiles: new Set(), // Fog of War — 지나간 격자

    // --- 시대별 리소스 ---
    TEX: {},          // 절차적 텍스처 캐시
    terrainCarve: null, // 시대별 지형 변형 (예: 강바닥 파내기)

    // --- 여섯 시대가 공유하는 자연 지형 ---
    // 한 판에 한 번만 만들어진다. 시대는 이것을 자기 색으로 칠하기만 한다.
    // 그래야 신석기에서 본 바위를 2000년대에 다시 만날 수 있다.
    runSeed: 1,
    baseMap: null,

    // --- 마을 (시대를 넘어 계승된다) ---
    // 플레이어가 지은 것. buildAge 에서 절대 초기화하지 말 것.
    // 시대가 바뀌면 같은 좌표에 다음 시대의 건물이 들어선다.
    village: [],                        // [{ x, z, type, builtAtEra }]
    materials: { wood: 0, stone: 0 },   // 탐험으로 줍는다
    progress: 0                         // 발전도. 목표치에 닿으면 시간의 문이 깨어난다
};

/**
 * 마을 발전도 목표.
 *
 * G.progress 는 시대를 넘어 누적되므로 목표도 누적이어야 한다.
 * 시대별로 새로 필요한 양은 30, 40, 50 ... 으로 늘어난다.
 *   신석기 30 → 청동기 70 → 삼국 120 → 조선 180 → 1970 250 → 2000 330
 */
export function progressGoal(age = G.currentAge) {
    const a = Math.max(0, age);
    return (a + 1) * (30 + 5 * a);
}

export const clock = new THREE.Clock();

// 고정 등각 오프셋. 절대 회전하지 않는다.
export const cameraOffset = new THREE.Vector3(20, 18, 20);
export const cameraTarget = new THREE.Vector3();

export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();
export const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export const keys = new Set();

