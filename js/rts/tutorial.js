/**
 * tutorial.js — 첫 판을 위한 안내
 *
 * Age of Empires 의 튜토리얼 시나리오와 같은 자리에 있다. 다만 따로 판을 만들지
 * 않는다. 지금 그 판 위에서, 할 일을 하나씩 일러 주고 해내면 다음으로 넘어간다.
 *
 * 규칙은 건드리지 않는다. 매 프레임 R 을 들여다보며 "해냈는가"만 묻는다.
 * 그래서 안내를 건너뛰어도 게임은 조금도 달라지지 않는다.
 * 안내가 도는 동안에는 적이 쳐들어오지 않는다 (ai.js 가 R.tutorial 을 본다).
 */
import { AudioSystem } from "../audio.js";
import { makeBasicMat } from "../build.js";
import { G, cameraTarget } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { logMessage, showBig } from "./hud.js";
import { INPUT } from "./input.js";
import { centerCamera } from "./rtscam.js";
import { R } from "./state.js";
import { disposeObj, worldToScreen } from "./util.js";

const el = {};
let marker = null;          // 땅 위에 뜨는 화살표
let markTimer = 0;
let doneTimer = 0;          // ✓ 를 보여 주는 동안
let camDist = 0;            // 시점을 얼마나 옮겼나 (첫 걸음을 재는 데 쓴다)
let lastCam = { x: 0, z: 0 };
let mark = { x: 0, z: 0, on: false };
let paintedTouch = null;      // 어떤 입력으로 쓴 문구인가

/* ------------------------------------------------------------ 상태 묻기 */

const myUnits = (key) => R.units.filter(
    (u) => u.alive && u.owner === 0 && (!key || u.key === key));

const myBuildings = (type) => R.buildings.filter(
    (b) => b.alive && b.owner === 0 && (!type || b.type === type));

/** 주민 하나라도 그 자원에 붙어 있는가 */
function gathering(kind) {
    return R.units.some((u) =>
        u.alive && u.owner === 0 && u.key === "villager" && (
            (u.order.t === "gather" && u.order.node && u.order.node.kind === kind) ||
            (u.order.t === "return" && (u.order.res || u.carry.res) === kind) ||
            (u.carry.res === kind && u.carry.amt > 0)
        ));
}

/** 마을회관 (없으면 아무 건물) */
function home() {
    return myBuildings("towncenter")[0] || myBuildings()[0] || null;
}

/** 마을에서 가장 가까운 자원 */
function nearResource(kind) {
    const h = home();
    if (!h) return null;
    let best = null, bd = 1e9;
    for (const n of R.nodes) {
        if (!n.alive || n.kind !== kind) continue;
        const d = (n.x - h.x) ** 2 + (n.z - h.z) ** 2;
        if (d < bd) { bd = d; best = n; }
    }
    return best;
}

/* ------------------------------------------------------------ 열두 걸음 */

/**
 * 한 걸음.
 *   title  한 줄 제목      body  마우스로 하는 법
 *   touch  손가락으로 하는 법 (없으면 body 를 그대로 쓴다)
 *   goal   해내야 하는 것   done  해냈는지 묻는 함수
 *   point  깜빡여 줄 명령 칸 이름들   mark  화살표를 세울 자리
 *   enter  이 걸음에 들어설 때 한 번
 *
 * 마우스만 쓰는 사람도 자판 없이 전부 할 수 있어야 한다.
 * 그래서 Ctrl+숫자 대신 부대 칸을, Home 대신 위쪽 [회관] 단추를 함께 일러 준다.
 */
const STEPS = [
    {
        title: "강가를 둘러본다",
        body: "커서를 화면 가장자리로 가져가면 시점이 따라 옵니다.\n방향키도 같고, Shift 를 누르면 빠릅니다.\n오른쪽 아래 지도를 눌러도 그 자리로 갑니다. 휠로 당기고 물립니다.",
        touch: "화면을 손가락으로 끌면 땅이 따라옵니다.\n두 손가락을 벌리면 가까이, 오므리면 넓게 봅니다.\n오른쪽 위 지도를 눌러도 그 자리로 갑니다.",
        goal: "시점 옮기기",
        enter: () => { camDist = 0; },
        done: () => camDist > 14
    },
    {
        title: "주민을 고른다",
        body: "마을회관 곁의 주민(주) 하나를 왼쪽 클릭하세요.\n아래 왼쪽 칸에 그 주민의 초상과 체력이 뜹니다.",
        touch: "화살표가 선 주민(주)을 한 번 톡 누르세요.\n아래 왼쪽 칸에 그 주민의 초상과 체력이 뜹니다.",
        goal: "주민 하나 고르기",
        mark: () => myUnits("villager")[0],
        done: () => R.selection.some((e) => e.owner === 0 && e.key === "villager")
    },
    {
        title: "나무를 벤다",
        body: "주민을 고른 채로 나무를 오른쪽 클릭하세요.\n오른쪽 클릭은 무엇을 찍었느냐에 따라 뜻이 달라집니다 —\n땅이면 가고, 자원이면 캐고, 적이면 칩니다.",
        touch: "주민을 고른 채로 나무를 톡 누르세요.\n고른 것이 있으면 누른 자리가 곧 명령이 됩니다 —\n땅이면 가고, 자원이면 캐고, 적이면 칩니다.",
        goal: "주민에게 나무를 캐게 하기",
        mark: () => nearResource("wood"),
        done: () => gathering("wood")
    },
    {
        title: "여럿을 한꺼번에",
        body: "빈 땅에서 왼쪽 단추를 누른 채 끌면 상자가 생깁니다.\n상자 안의 내 유닛이 한꺼번에 골라집니다. 주민 둘 이상을 골라 보세요.\n주민 하나를 두 번 클릭해도 화면 안의 주민을 전부 고릅니다.",
        touch: "빈 땅을 잠깐 누르고 있으면 상자가 생깁니다.\n그대로 끌면 상자 안의 내 유닛이 한꺼번에 골라집니다.\n주민 하나를 두 번 톡 해도 화면 안의 주민을 전부 고릅니다.",
        goal: "둘 이상 고르기",
        done: () => R.selection.filter((e) => e.owner === 0 && e.key).length >= 2
    },
    {
        title: "먹을 것을 모은다",
        body: "고른 주민들에게 덤불(식)을 오른쪽 클릭하세요.\n들판의 사슴도 식량입니다. 쓰러뜨리면 그 자리가 식량이 됩니다.",
        touch: "고른 주민들로 덤불(식)을 톡 누르세요.\n들판의 사슴도 식량입니다. 쓰러뜨리면 그 자리가 식량이 됩니다.",
        goal: "식량 캐기",
        mark: () => nearResource("food"),
        done: () => gathering("food")
    },
    {
        title: "집을 짓는다",
        body: "인구가 차면 아무도 못 뽑습니다. 집 한 채가 인구를 넷 늘립니다.\n주민을 고르고 [짓기] → [집] 을 누른 뒤, 빈 땅을 왼쪽 클릭해 자리를 잡으세요.\n초록이면 지을 수 있고 빨강이면 못 짓습니다. 오른쪽 클릭으로 물립니다.",
        touch: "인구가 차면 아무도 못 뽑습니다. 집 한 채가 인구를 넷 늘립니다.\n주민을 고르고 [짓기] → [집] 을 누른 뒤, 빈 땅을 톡 눌러 자리를 잡으세요.\n초록이면 지을 수 있고 빨강이면 못 짓습니다. [취소] 로 물립니다.",
        goal: "집 자리 잡기",
        point: ["짓기", "집"],
        done: () => myBuildings("house").length > 0
    },
    {
        title: "주민이 걸어와 짓는다",
        body: "건물은 값만 치른다고 서지 않습니다. 주민이 가서 지어야 합니다.\n여럿을 붙이면 빨리 섭니다. 다 지을 때까지 기다리세요.",
        goal: "집 완성",
        mark: () => myBuildings("house").find((b) => !b.built),
        done: () => myBuildings("house").some((b) => b.built)
    },
    {
        title: "주민을 더 뽑는다",
        body: "위쪽 [회관] 단추(또는 Home)를 누르면 마을회관으로 갑니다.\n마을회관을 고르고 [주민] 을 누르세요. 주민이 많을수록 마을이 빨리 큽니다.\n[노는 주민] 단추는 놀고 있는 주민을 찾아 줍니다.",
        touch: "위쪽 [회관] 단추를 누르면 마을회관으로 갑니다.\n마을회관을 고르고 [주민] 을 누르세요. 주민이 많을수록 마을이 빨리 큽니다.\n[노는 주민] 단추는 놀고 있는 주민을 찾아 줍니다.",
        goal: "주민 뽑기",
        point: ["주민"],
        enter: (s) => { s.base = myUnits("villager").length; },
        done: (s) => myUnits("villager").length > (s.base || 0)
    },
    {
        title: "병영을 세운다",
        body: "병사는 병영에서 나옵니다. 나무 125 가 듭니다.\n주민을 고르고 [짓기] → [병영] 을 지으세요.",
        goal: "병영 완성",
        point: ["짓기", "병영"],
        done: () => myBuildings("barracks").some((b) => b.built)
    },
    {
        title: "병사를 뽑는다",
        body: "병영을 고르고 [몽둥이병] 을 뽑으세요.\n시대가 오르면 도끼병 · 창병 · 기병으로 이어집니다.",
        goal: "병사 하나 뽑기",
        point: ["몽둥이병"],
        done: () => myUnits().some((u) => u.key !== "villager")
    },
    {
        title: "부대로 묶는다",
        body: "병사를 고르고, 왼쪽 아래 부대 칸의 [1] 을 누르세요 (Ctrl+1 도 같습니다).\n다음부터는 [1] 만 눌러도 그들이 돌아옵니다. 이어서 또 누르면 그 자리로 갑니다.\n다시 묶으려면 그 칸을 길게 누르거나 오른쪽 클릭하세요.",
        touch: "병사를 고르고, 왼쪽 아래 부대 칸의 [1] 을 톡 누르세요.\n다음부터는 [1] 만 눌러도 그들이 돌아옵니다. 이어서 또 누르면 그 자리로 갑니다.\n다시 묶으려면 그 칸을 길게 누르세요.",
        goal: "1번 부대로 묶기",
        done: () => (R.groups["1"] || []).some((e) => e.alive)
    },
    {
        title: "시대를 연다",
        body: "건물이 셋 이상이고 값이 모이면 마을회관에서 [시대 발전] 을 누를 수 있습니다.\n32초 뒤 청동기가 열립니다. 건물만이 아니라 땅과 하늘과 소리까지 바뀝니다.\n유닛도 건물도 자리를 지킨 채 시간만 지나갑니다.",
        goal: "시대 발전 누르기",
        point: ["시대 발전"],
        done: () => !!R.players[0].ageUp || R.players[0].age > 0
    }
];

/* ------------------------------------------------------------ 화면 */

function grab() {
    if (el.panel) return;
    const id = (k) => document.getElementById(k);
    Object.assign(el, {
        panel: id("tutPanel"), num: id("tutNum"), title: id("tutTitle"),
        body: id("tutBody"), goal: id("tutGoal"), goalText: id("tutGoalText"),
        skip: id("tutSkip"), head: id("tutHead"), fold: id("tutFold")
    });
    // 제목 줄을 누르면 접힌다 (좁은 화면에서 땅을 더 보려고)
    el.head.addEventListener("click", () => {
        const mini = el.panel.classList.toggle("mini");
        el.fold.textContent = mini ? "▸" : "▾";
    });
    el.skip.addEventListener("click", () => {
        if (R.tutorial.step >= STEPS.length) endTutorial(false);
        else skipStep();
    });
}

function paint() {
    const s = STEPS[R.tutorial.step];
    if (!s) return;
    el.num.textContent = `${R.tutorial.step + 1} / ${STEPS.length}`;
    el.title.textContent = s.title;
    el.body.textContent = (INPUT.touch && s.touch) ? s.touch : s.body;
    paintedTouch = INPUT.touch;
    el.goalText.textContent = s.goal;
    el.goal.classList.remove("done");
    el.skip.textContent = "이 걸음 건너뛰기";
}

/* ------------------------------------------------------------ 화살표 */

function showMark(x, z) {
    if (!marker || !marker.parent) {
        const g = new THREE.Group();
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.75, 1.0, 22),
            makeBasicMat(0xe8c489, {
                transparent: true, opacity: 0.85, side: THREE.DoubleSide,
                depthWrite: false, fog: false
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.07;
        g.add(ring);

        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.34, 0.8, 4),
            makeBasicMat(0xe8c489, { transparent: true, opacity: 0.95, depthWrite: false, fog: false })
        );
        arrow.rotation.x = Math.PI;         // 아래를 가리킨다
        arrow.rotation.y = Math.PI / 4;
        arrow.position.y = 2.6;
        g.add(arrow);

        G.world.add(g);
        marker = g;
        marker.userData.arrow = arrow;
        marker.userData.ring = ring;
    }
    marker.visible = true;
    marker.position.set(x, terrainHeight(x, z), z);
    mark = { x, z, on: true };
}

function hideMark() {
    if (marker) marker.visible = false;
    mark.on = false;
}

function updateMark(dt) {
    const s = STEPS[R.tutorial.step];
    markTimer -= dt;
    if (markTimer <= 0) {
        markTimer = 0.3;
        const target = s && s.mark ? s.mark() : null;
        if (target && target.alive !== false) showMark(target.x, target.z);
        else hideMark();
    }
    if (marker && marker.visible) {
        const t = R.time;
        marker.userData.arrow.position.y = 2.5 + Math.sin(t * 3.2) * 0.35;
        marker.userData.ring.scale.setScalar(1 + Math.sin(t * 3.2) * 0.09);
    }
}

/* ------------------------------------------------------------ 흐름 */

/** 가리킬 것이 화면 밖이면 한 번만 시점을 옮겨 준다 (걸음에 들어설 때뿐) */
function lookAtMark(s) {
    if (!s.mark) return;
    const target = s.mark();
    if (!target || target.alive === false) return;
    const p = worldToScreen(target.x, terrainHeight(target.x, target.z), target.z);
    const off = p.x < 60 || p.x > window.innerWidth - 60
        || p.y < 70 || p.y > window.innerHeight - 170;
    if (off) centerCamera(target.x, target.z);
}

function enter(i) {
    R.tutorial.step = i;
    const s = STEPS[i];
    if (!s) { finish(); return; }

    if (s.enter) s.enter(s);
    R.tutorial.point = s.point || null;
    R.dirty.cmd = true;
    markTimer = 0;
    paint();
    lookAtMark(s);
    lastCam = { x: cameraTarget.x, z: cameraTarget.z };   // 시점을 옮겨 준 몫은 세지 않는다
}

/** 지금 걸음을 해냈다 */
function complete() {
    el.goal.classList.add("done");
    el.skip.textContent = "";
    AudioSystem.tone(784, 0.10, "triangle", 0.045);
    AudioSystem.tone(1046, 0.16, "sine", 0.038, 0.09);
    doneTimer = 1.1;
    hideMark();
    R.tutorial.point = null;
    R.dirty.cmd = true;
}

function skipStep() {
    doneTimer = 0;
    enter(R.tutorial.step + 1);
}

function finish() {
    R.tutorial.step = STEPS.length;
    R.tutorial.point = null;
    R.dirty.cmd = true;
    hideMark();
    el.num.textContent = "끝";
    el.title.textContent = "이제 당신의 강가다";
    el.body.textContent =
        "주민을 늘리고, 집을 올리고, 시대를 열고, 병사를 모으세요.\n" +
        "적도 같은 값을 치르며 같은 일을 하고 있습니다. 다만 쉬지 않습니다.\n" +
        "적의 건물과 유닛을 전부 없애면 이깁니다.";
    el.goalText.textContent = "안내 끝";
    el.goal.classList.add("done");
    el.skip.textContent = "닫 기";
    showBig("안내 끝 — 이제 적이 움직입니다", 3.0);
    AudioSystem.playGateAwaken && AudioSystem.playGateAwaken();
    R.tutorial.active = false;        // 적이 다시 쳐들어온다
    logMessage("안내가 끝났습니다. 적이 떼를 모읍니다.");
}

/* ------------------------------------------------------------ 바깥 문 */

export function startTutorial() {
    grab();
    R.tutorial.active = true;
    R.tutorial.shown = true;
    el.panel.classList.add("show");
    doneTimer = 0;
    camDist = 0;
    const h = home();
    if (h) centerCamera(h.x, h.z);
    enter(0);
}

export function endTutorial(silent = true) {
    R.tutorial.active = false;
    R.tutorial.point = null;
    R.dirty.cmd = true;
    hideMark();
    if (el.panel) el.panel.classList.remove("show");
    if (!silent) logMessage("안내를 닫았습니다. F1 로 다시 열 수 있습니다.");
}

/** F1 — 안내를 열고 닫는다 */
export function toggleTutorial() {
    grab();
    const on = el.panel.classList.contains("show");
    if (on) { endTutorial(false); return; }
    if (R.tutorial.shown && R.tutorial.step < STEPS.length) {
        // 보던 걸음부터 이어 본다
        R.tutorial.active = true;
        el.panel.classList.add("show");
        enter(R.tutorial.step);
    } else {
        startTutorial();
    }
}

export function updateTutorial(dt) {
    if (!el.panel || !el.panel.classList.contains("show")) return;

    // 시점이 움직인 거리 (첫 걸음을 재는 데 쓴다).
    // 미니맵으로 건너뛴 거리는 한 번에 8 까지만 센다.
    const d = Math.hypot(cameraTarget.x - lastCam.x, cameraTarget.z - lastCam.z);
    camDist += Math.min(d, 8);
    lastCam = { x: cameraTarget.x, z: cameraTarget.z };

    if (R.tutorial.step >= STEPS.length) return;   // 끝난 화면을 띄워 둔 상태

    // 마우스를 쥐었다 손가락으로 바꿔도 문구가 맞게 따라온다
    if (paintedTouch !== INPUT.touch && doneTimer <= 0) paint();

    if (doneTimer > 0) {
        doneTimer -= dt;
        if (doneTimer <= 0) enter(R.tutorial.step + 1);
        return;
    }

    const s = STEPS[R.tutorial.step];
    if (!s) return;

    updateMark(dt);

    if (s.done(s)) complete();
}

export { STEPS };
