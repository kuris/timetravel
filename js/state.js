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
    glitchAmount: 0, // 시대 전환 셰이더 글리치 강도 (0..1)

    // --- 월드 내용물 ---
    activeGate: null,
    clickTarget: null,
    interactables: [],
    animated: [],
    inventory: [],

    // --- 미니맵 ---
    mapShapes: [],
    mapMarkers: [],

    // --- 시대별 리소스 ---
    TEX: {},          // 절차적 텍스처 캐시
    terrainCarve: null // 시대별 지형 변형 (예: 강바닥 파내기)
};

export const clock = new THREE.Clock();

// 고정 등각 오프셋. 절대 회전하지 않는다.
export const cameraOffset = new THREE.Vector3(20, 18, 20);
export const cameraTarget = new THREE.Vector3();

export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();
export const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export const keys = new Set();

