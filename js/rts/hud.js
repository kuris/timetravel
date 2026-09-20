/**
 * hud.js — 조작판
 *
 * Age of Empires 의 화면 구성을 그대로 따른다.
 *   위     자원 넷과 인구, 지금 시대, 지난 시간
 *   아래   왼쪽에 초상과 능력치, 가운데에 명령 칸, 오른쪽에 지도
 *
 * 명령 칸은 여섯 칸 두 줄이고, 단축키는 Q W E R T Y / A S D F G H 다.
 */
import { viewSize } from "../renderer.js";
import { G, cameraTarget } from "../state.js";

import { AGE_NAME, AGE_SHORT, AGE_UP, BUILDINGS, RES_NAME, TEAM, UNITS } from "./defs.js";
import { FOG, fogAt } from "./fog.js";
import { GROUND } from "./map.js";
import { ISO_SQUASH } from "./rtscam.js";
import { R } from "./state.js";
import { MAP_R } from "./units.js";
import { isWater } from "./util.js";

export const HOTKEYS = ["Q", "W", "E", "R", "T", "Y", "A", "S", "D", "F", "G", "H"];

const el = {};
let commands = [];          // 지금 명령 칸에 걸린 것들
let lastSelKey = "";
let bigTimer = 0;

/* ------------------------------------------------------------------ 초기화 */

export function initHud(handlers) {
    const id = (k) => document.getElementById(k);
    Object.assign(el, {
        food: id("vFood"), wood: id("vWood"), stone: id("vStone"), gold: id("vGold"),
        pop: id("vPop"), age: id("ageBadge"), clock: id("clock"),
        log: id("eventLog"), big: id("bigMsg"),
        portrait: id("portrait"), portGlyph: id("portGlyph"), portName: id("portName"),
        portOwner: id("portOwner"), portHpFill: id("portHpFill"), portStats: id("portStats"),
        selGrid: id("selGrid"), cmdGrid: id("cmdGrid"),
        queueList: id("queueList"), progWrap: id("progWrap"),
        progFill: id("progFill"), progText: id("progText"),
        mini: id("rtsMinimap"), tip: id("hoverTip"), selRect: id("selRect"),
        groupBar: id("groupBar"), selClear: id("selClear"),
        overlay: id("overOverlay"), overTitle: id("overTitle"), overSub: id("overSub"),
        overText: id("overText"), overBtn: id("overBtn"), overBtn2: id("overBtn2"),
        flash: id("flash")
    });

    // 명령 칸 열두 개를 미리 만들어 둔다 (매 프레임 새로 만들지 않는다)
    el.cells = [];
    for (let i = 0; i < 12; i++) {
        const b = document.createElement("button");
        b.className = "cmd empty";
        b.innerHTML = `<span class="g"></span><span class="n"></span><span class="k">${HOTKEYS[i]}</span>`;
        b.addEventListener("click", () => runCommand(i));
        b.addEventListener("mouseenter", () => showTip(b, commands[i]));
        b.addEventListener("mouseleave", hideTip);
        el.cmdGrid.appendChild(b);
        el.cells.push(b);
    }

    el.mini.addEventListener("pointerdown", handlers.minimapDown);
    el.mini.addEventListener("pointermove", handlers.minimapMove);
    el.mini.addEventListener("contextmenu", (e) => e.preventDefault());

    initGroupBar(handlers);
    initQuickBar(handlers);
    bakeMinimapTerrain();
}

/* ------------------------------------------------------- 부대 칸 (1~4) */

/**
 * Ctrl+숫자 없이도 부대를 묶을 수 있어야 한다 (마우스만, 손가락만 쓰는 사람).
 *   빈 칸을 누르면   고른 것을 그 번호로 묶는다
 *   찬 칸을 누르면   그 부대를 부른다 (두 번 누르면 그 자리로 간다)
 *   길게 누르거나 오른쪽 클릭하면  고른 것으로 다시 묶는다
 */
const GROUP_KEYS = ["1", "2", "3", "4"];
let groupHold = 0;

function initGroupBar(handlers) {
    el.groupCells = [];
    for (const k of GROUP_KEYS) {
        const b = document.createElement("button");
        b.className = "grp empty";
        b.innerHTML = `<span class="gn">${k}</span><span class="gc"></span>`;

        const bind = () => { handlers.bindGroup(k); R.dirty.sel = true; };
        b.addEventListener("contextmenu", (e) => { e.preventDefault(); bind(); });
        b.addEventListener("pointerdown", (e) => {
            if (e.button === 2) return;
            groupHold = setTimeout(bind, 550);     // 길게 누르면 다시 묶는다
        });
        const stop = () => clearTimeout(groupHold);
        b.addEventListener("pointerup", stop);
        b.addEventListener("pointerleave", stop);
        b.addEventListener("pointercancel", stop);
        b.addEventListener("click", () => {
            clearTimeout(groupHold);
            handlers.useGroup(k);
        });

        el.groupBar.appendChild(b);
        el.groupCells.push(b);
    }
}

/** 부대 칸의 겉모습을 지금 상태에 맞춘다 */
function refreshGroupBar() {
    if (!el.groupCells) return;
    GROUP_KEYS.forEach((k, i) => {
        const live = (R.groups[k] || []).filter((e) => e.alive);
        const cell = el.groupCells[i];
        cell.className = "grp" + (live.length ? "" : " empty");
        cell.children[1].textContent = live.length || "";
        cell.title = live.length
            ? `${k}번 부대 (${live.length}) — 누르면 부른다. 길게 누르면 다시 묶는다`
            : `${k}번 부대 — 고른 것을 여기 묶는다`;
    });
}

/* --------------------------------------------------- 빠른 단추 (상단) */

function initQuickBar(handlers) {
    const on = (id, fn) => {
        const b = document.getElementById(id);
        if (b) b.addEventListener("click", fn);
    };
    on("qbHome", handlers.goHome);
    on("qbIdle", handlers.findIdle);
    on("qbEvent", handlers.goEvent);
    on("qbTut", handlers.toggleTutorial);
    on("qbFpv", handlers.toggleFpv);
    on("zoomIn", () => handlers.zoom(1 / 1.18));
    on("zoomOut", () => handlers.zoom(1.18));
    if (el.selClear) el.selClear.addEventListener("click", handlers.clearSelection);
}

/* ------------------------------------------------------------------ 명령 */

export function runCommand(i) {
    const c = commands[i];
    if (!c) return;
    if (c.off) {
        // 왜 안 되는지는 말해 줘야 한다. 그냥 안 눌리면 고장으로 보인다.
        if (c.reason) logMessage(c.reason);
        return;
    }
    c.run();
    R.dirty.cmd = true;
}

export function hotkeyIndex(code) {
    const letter = code.startsWith("Key") ? code.slice(3) : "";
    return HOTKEYS.indexOf(letter);
}

export function setCommands(list) {
    commands = list;
    for (let i = 0; i < 12; i++) {
        const b = el.cells[i];
        const c = list[i];
        if (!c) {
            b.className = "cmd empty";
            b.children[0].textContent = "";
            b.children[1].textContent = "";
            continue;
        }
        const pointed = R.tutorial.point && R.tutorial.point.includes(c.name);
        b.className = "cmd" + (c.off ? " off" : "") + (pointed ? " point" : "");
        b.children[0].textContent = c.glyph;
        b.children[1].textContent = c.name;
    }
}

function showTip(node, c) {
    if (!c) return;
    const r = node.getBoundingClientRect();
    let html = `<b>${c.name}</b>`;
    if (c.cost) {
        const parts = [];
        for (const k in c.cost) parts.push(`${RES_NAME[k]} ${c.cost[k]}`);
        html += `  <span>${parts.join(" · ")}</span>`;
    }
    if (c.tip) html += `<br>${c.tip}`;
    el.tip.innerHTML = html;
    el.tip.style.display = "block";
    el.tip.style.left = Math.max(6, r.left - 40) + "px";
    el.tip.style.top = (r.top - el.tip.offsetHeight - 8) + "px";
}

function hideTip() {
    el.tip.style.display = "none";
}

/* ------------------------------------------------------------------ 기록 */

export function logMessage(text) {
    const d = document.createElement("div");
    d.textContent = text;
    el.log.prepend(d);
    while (el.log.children.length > 6) el.log.lastChild.remove();
    setTimeout(() => d.remove(), 9000);
}

/** 사건: 기록에 남기고, 스페이스바로 그 자리에 갈 수 있게 한다 */
export function flashEvent(x, z, text) {
    R.lastEvent = { x, z };
    logMessage(text);
}

export function showBig(text, time = 2.4) {
    el.big.textContent = text;
    el.big.classList.add("show");
    bigTimer = time;
}

export function flashScreen() {
    if (!el.flash) return;
    el.flash.style.transition = "none";
    el.flash.style.opacity = "0.85";
    requestAnimationFrame(() => {
        el.flash.style.transition = "opacity 1.1s ease-out";
        el.flash.style.opacity = "0";
    });
}

export function setSelRect(x1, y1, x2, y2, on) {
    if (!on) { el.selRect.style.display = "none"; return; }
    el.selRect.style.display = "block";
    el.selRect.style.left = Math.min(x1, x2) + "px";
    el.selRect.style.top = Math.min(y1, y2) + "px";
    el.selRect.style.width = Math.abs(x2 - x1) + "px";
    el.selRect.style.height = Math.abs(y2 - y1) + "px";
}

/* ---------------------------------------------------------------- 갱신 */

export function updateHud(dt) {
    const p = R.players[0];

    if (R.dirty.res) {
        R.dirty.res = false;
        el.food.textContent = Math.floor(p.res.food);
        el.wood.textContent = Math.floor(p.res.wood);
        el.stone.textContent = Math.floor(p.res.stone);
        el.gold.textContent = Math.floor(p.res.gold);
        el.pop.textContent = `${p.pop}/${p.popCap}`;
        el.pop.style.color = p.pop >= p.popCap ? "#e0a05a" : "";
        // 좁은 화면에서는 시대 이름을 줄인다 (위 막대에 단추까지 들어가야 한다)
        el.age.textContent = (window.innerWidth < 620 ? AGE_SHORT : AGE_NAME)[p.age];
    }

    const m = Math.floor(R.time / 60), s = Math.floor(R.time % 60);
    el.clock.textContent = `${m}:${String(s).padStart(2, "0")}`;

    if (bigTimer > 0) {
        bigTimer -= dt;
        if (bigTimer <= 0) el.big.classList.remove("show");
    }

    updateSelectionPanel();
    updateProgress();
    drawMinimap(dt);
}

/** 선택한 것이 바뀌었는지 (문자열 하나로 비교한다) */
function selKey() {
    return R.selection.map((e) => e.id).join(",") + "|" + (R.cmdPage || "") +
        "|" + (R.placing ? R.placing.type : "");
}

function updateSelectionPanel() {
    const sel = R.selection;
    const key = selKey();

    if (key !== lastSelKey) {
        lastSelKey = key;
        R.dirty.cmd = true;

        // 여럿 고른 경우의 작은 칸들
        el.selGrid.innerHTML = "";
        if (sel.length > 1) {
            sel.slice(0, 40).forEach((e) => {
                const d = document.createElement("div");
                d.className = "sel";
                d.textContent = e.def.glyph;
                d.title = e.def.name;
                d.addEventListener("click", () => {
                    R.selection = [e];
                    R.dirty.sel = true;
                });
                el.selGrid.appendChild(d);
            });
        }
    }

    refreshGroupBar();

    const first = sel[0];
    if (el.selClear) el.selClear.style.display = sel.length ? "block" : "none";
    if (!first) {
        el.portGlyph.textContent = "—";
        el.portName.textContent = "—";
        el.portOwner.textContent = "";
        el.portStats.textContent = "";
        el.portHpFill.style.width = "0%";
        return;
    }

    const def = first.def;
    el.portGlyph.textContent = def.glyph;
    el.portName.textContent = sel.length > 1 ? `${def.name} 외 ${sel.length - 1}` : def.name;
    el.portOwner.textContent = TEAM[first.owner].name + (first.built === false ? " · 짓는 중" : "");
    el.portOwner.style.color = TEAM[first.owner].css;

    // 자원은 "남은 양"이 곧 체력이다
    if (first.kind) { first.hp = first.amount; first.maxHp = first.max; }

    const hpR = Math.max(0, first.hp) / first.maxHp;
    el.portHpFill.style.width = (hpR * 100).toFixed(0) + "%";
    el.portHpFill.style.background = hpR > 0.6 ? "#5fbf5a" : hpR > 0.3 ? "#d8b03c" : "#c2452f";

    const lines = [`체력 ${Math.max(0, Math.ceil(first.hp))} / ${first.maxHp}`];
    if (def.atk) lines.push(`공격 ${def.atk} · 방어 ${def.armor || 0}`);
    if (def.range >= 2) lines.push(`사거리 ${def.range}`);
    if (def.carry && first.carry && first.carry.amt > 0.5) {
        lines.push(`나르는 것: ${RES_NAME[first.carry.res]} ${Math.floor(first.carry.amt)}`);
    }
    if (def.pop) lines.push(`인구 +${def.pop}`);
    if (first.node) lines.push(`남은 식량 ${Math.ceil(first.node.amount)}`);
    if (first.kind) lines.push(`남은 양 ${Math.ceil(first.amount)}`);
    el.portStats.innerHTML = lines.join("<br>");
}

function updateProgress() {
    const sel = R.selection;
    const b = sel.length === 1 && sel[0].queue !== undefined ? sel[0] : null;
    const p = R.players[0];

    // 생산 대기열
    if (b && b.owner === 0) {
        const want = b.queue.map((q) => UNITS[q.key].glyph).join("");
        if (el.queueList.dataset.k !== want) {
            el.queueList.dataset.k = want;
            el.queueList.innerHTML = "";
            b.queue.forEach((q, i) => {
                const s = document.createElement("span");
                s.textContent = UNITS[q.key].glyph;
                s.title = UNITS[q.key].name + " (누르면 취소)";
                s.addEventListener("click", () => {
                    import("./buildings.js").then((m) => m.cancelQueue(b, i));
                });
                el.queueList.appendChild(s);
            });
        }
    } else if (el.queueList.dataset.k !== "") {
        el.queueList.dataset.k = "";
        el.queueList.innerHTML = "";
    }

    // 진행 막대: 시대 발전 > 생산 > 건설
    let ratio = -1, text = "";
    if (p.ageUp && (!b || b === p.ageUp.b)) {
        ratio = 1 - p.ageUp.left / p.ageUp.total;
        text = `${AGE_NAME[Math.min(5, p.age + 1)]}로 (${Math.ceil(p.ageUp.left)}초)`;
    } else if (b && b.owner === 0 && b.queue.length) {
        const def = UNITS[b.queue[0].key];
        ratio = 1 - b.trainLeft / def.time;
        text = `${def.name} (${Math.ceil(b.trainLeft)}초)`;
    } else if (b && b.owner === 0 && !b.built) {
        ratio = b.work / b.def.time;
        text = `짓는 중 ${Math.floor(ratio * 100)}%`;
    }

    if (ratio >= 0) {
        el.progWrap.classList.add("show");
        el.progFill.style.width = (Math.max(0, Math.min(1, ratio)) * 100).toFixed(1) + "%";
        el.progText.textContent = text;
    } else {
        el.progWrap.classList.remove("show");
    }
}

/* ---------------------------------------------------------------- 지도 */

const MINI = {
    terrain: null,   // 월드 격자에 구운 지형
    tdim: 132,
    fogCanvas: null,
    timer: 0
};

/** 지형을 한 번 굽는다 (시대가 바뀌면 다시 굽는다) */
export function bakeMinimapTerrain() {
    const n = MINI.tdim;
    const c = document.createElement("canvas");
    c.width = n; c.height = n;
    const g = c.getContext("2d");

    const base = GROUND[R.age] ? GROUND[R.age].base : 0x8a7048;
    const col = new THREE.Color(base);
    const step = (MAP_R * 2) / n;

    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const x = -MAP_R + (i + 0.5) * step;
            const z = -MAP_R + (j + 0.5) * step;
            if (Math.hypot(x, z) > MAP_R) { continue; }

            if (isWater(x, z)) {
                g.fillStyle = "#24515c";
            } else {
                const k = 0.78 + ((i * 7 + j * 13) % 5) * 0.055;
                g.fillStyle = `rgb(${Math.floor(col.r * 255 * k)},${Math.floor(col.g * 255 * k)},${Math.floor(col.b * 255 * k)})`;
            }
            g.fillRect(i, j, 1, 1);
        }
    }
    MINI.terrain = c;

    const f = document.createElement("canvas");
    f.width = FOG.dim; f.height = FOG.dim;
    MINI.fogCanvas = f;
}

/** 월드 좌표 -> 지도 픽셀 */
function miniPos(x, z, W, H) {
    const u = (x - z) * Math.SQRT1_2;
    const v = -(x + z) * Math.SQRT1_2;
    return [W / 2 + u * (W / 2 / MAP_R), H / 2 - v * (H / 2 / MAP_R)];
}

export function drawMinimap(dt) {
    MINI.timer -= dt;
    if (MINI.timer > 0) return;
    MINI.timer = 0.1;

    const cv = el.mini;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const sx = (W / 2) / MAP_R, sy = (H / 2) / MAP_R;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0b0805";
    ctx.fillRect(0, 0, W, H);

    // 지형: 월드 격자를 45° 돌려 그린다 (화면과 같은 방향이 된다)
    ctx.imageSmoothingEnabled = false;
    const a = sx * Math.SQRT1_2, b = sy * Math.SQRT1_2;
    const applyGrid = (dim, span) => {
        const cell = span / dim;
        ctx.setTransform(
            a * cell, b * cell,
            -a * cell, b * cell,
            W / 2 + (-span / 2) * a + (span / 2) * a,
            H / 2 + (-span / 2) * b - (span / 2) * b
        );
    };

    if (MINI.terrain) {
        applyGrid(MINI.tdim, MAP_R * 2);
        ctx.drawImage(MINI.terrain, 0, 0);
    }

    // 전장의 안개
    if (MINI.fogCanvas) {
        const fc = MINI.fogCanvas.getContext("2d");
        const img = fc.createImageData(FOG.dim, FOG.dim);
        for (let k = 0; k < FOG.grid.length; k++) {
            const s = FOG.grid[k];
            img.data[k * 4 + 3] = s === 2 ? 0 : s === 1 ? 110 : 255;
        }
        fc.putImageData(img, 0, 0);
        applyGrid(FOG.dim, FOG.half * 2);
        ctx.drawImage(MINI.fogCanvas, 0, 0);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 자원
    for (const n of R.nodes) {
        if (!n.alive || fogAt(n.x, n.z) === 0) continue;
        const [px, py] = miniPos(n.x, n.z, W, H);
        ctx.fillStyle = n.kind === "wood" ? "#3f6a34"
            : n.kind === "food" ? "#b6893c"
                : n.kind === "stone" ? "#9a938a" : "#d8a93c";
        ctx.fillRect(px - 1, py - 1, 2, 2);
    }

    // 건물
    for (const bl of R.buildings) {
        if (!bl.alive) continue;
        if (bl.owner !== 0 && fogAt(bl.x, bl.z) === 0) continue;
        const [px, py] = miniPos(bl.x, bl.z, W, H);
        const s = bl.type === "towncenter" ? 6 : 4;
        ctx.fillStyle = TEAM[bl.owner].css;
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.strokeRect(px - s / 2, py - s / 2, s, s);
    }

    // 유닛
    for (const u of R.units) {
        if (!u.alive) continue;
        if (u.owner !== 0 && fogAt(u.x, u.z) !== 2) continue;
        const [px, py] = miniPos(u.x, u.z, W, H);
        ctx.fillStyle = u.owner === 2 ? "#9a8a5c" : TEAM[u.owner].css;
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }

    // 지금 보고 있는 자리
    const aspect = window.innerWidth / window.innerHeight;
    const view = viewSize();
    const uc = (cameraTarget.x - cameraTarget.z) * Math.SQRT1_2;
    const vc = -(cameraTarget.x + cameraTarget.z) * Math.SQRT1_2;
    const hw = (view * aspect * 0.5) * sx;
    const hh = ((view * 0.5) / ISO_SQUASH) * sy;
    ctx.strokeStyle = "rgba(240,225,190,0.85)";
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 + uc * sx - hw, H / 2 - vc * sy - hh, hw * 2, hh * 2);
}

/** 미니맵 픽셀 -> 월드 좌표 */
export function minimapToWorld(px, py) {
    const cv = el.mini;
    const rect = cv.getBoundingClientRect();
    const W = cv.width, H = cv.height;
    const cx = (px - rect.left) * (W / rect.width);
    const cy = (py - rect.top) * (H / rect.height);

    const u = (cx - W / 2) / ((W / 2) / MAP_R);
    const v = -(cy - H / 2) / ((H / 2) / MAP_R);
    return [(u - v) * Math.SQRT1_2, -(u + v) * Math.SQRT1_2];
}

/* ------------------------------------------------------------ 시작/결과 */

/**
 * 시작 화면과 결과 화면.
 * alt 를 주면 단추가 둘이 된다 ({ label, onClick }) — 시작 화면의 "튜토리얼".
 */
export function showOverlay(title, sub, text, btn, onClick, alt = null) {
    el.overTitle.textContent = title;
    el.overSub.textContent = sub;
    el.overText.textContent = text;
    el.overBtn.textContent = btn;
    el.overBtn.onclick = onClick;

    if (alt) {
        el.overBtn2.textContent = alt.label;
        el.overBtn2.onclick = alt.onClick;
        el.overBtn2.classList.remove("hide");
    } else {
        el.overBtn2.classList.add("hide");
    }
    el.overlay.classList.remove("hide");
}

export function hideOverlay() {
    el.overlay.classList.add("hide");
}

export { el as hudEl };
