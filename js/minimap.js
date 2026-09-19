/**
 * 미니맵
 */
import { G, clock } from "./state.js";
import { dom } from "./ui.js";

export const MAP_RANGE = 34; // 지도에 담을 월드 반경

/** 월드 좌표 -> 미니맵 캔버스 좌표 */
export function worldToMap(x, z, size) {
    const mx = (x - z) * Math.SQRT1_2;
    const my = (x + z) * Math.SQRT1_2;
    const scale = (size * 0.5) / MAP_RANGE;
    return [size * 0.5 + mx * scale, size * 0.5 + my * scale];
}

export function addMapMarker(x, z, color, size, kind) {
    const marker = { x, z, color, size: size || 2, kind: kind || "prop", done: false };
    G.mapMarkers.push(marker);
    return marker;
}

export function addMapShape(points, color) {
    G.mapShapes.push({ points, color });
}

export function drawMinimap() {
    const cv = dom.minimap;
    if (!cv) return;

    const ctx = cv.getContext("2d");
    const S = cv.width;

    ctx.clearRect(0, 0, S, S);

    // ---- 바탕 (낡은 종이/가죽 지도) ----
    ctx.fillStyle = "#2a1d12";
    ctx.fillRect(0, 0, S, S);

    // 지도에 낀 얼룩
    ctx.fillStyle = "rgba(122, 90, 48, 0.18)";
    ctx.beginPath();
    ctx.arc(S * 0.32, S * 0.28, S * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S * 0.72, S * 0.74, S * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // ---- 면 (강, 연못) ----
    for (const shape of G.mapShapes) {
        ctx.fillStyle = shape.color;
        ctx.beginPath();
        shape.points.forEach((pt, i) => {
            const [px, py] = worldToMap(pt[0], pt[1], S);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
    }

    // ---- 표식 ----
    for (const m of G.mapMarkers) {
        const [px, py] = worldToMap(m.x, m.z, S);
        if (px < -6 || px > S + 6 || py < -6 || py > S + 6) continue;

        if (m.kind === "artifact") {
            // 조사 대상은 깜빡이는 마름모
            const blink = m.done ? 0.22 : 0.65 + Math.sin(clock.elapsedTime * 3.4) * 0.35;
            ctx.fillStyle = m.done ? "#6a5936" : "#ffd071";
            ctx.globalAlpha = blink;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-2.5, -2.5, 5, 5);
            ctx.restore();
            ctx.globalAlpha = 1;
        } else if (m.kind === "gate") {
            // 시간의 문
            ctx.strokeStyle = m.done ? "#7bdcff" : "#8b8072";
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = m.done
                ? 0.6 + Math.sin(clock.elapsedTime * 4) * 0.4
                : 0.8;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        } else if (m.kind === "building") {
            ctx.fillStyle = m.color;
            ctx.fillRect(px - m.size, py - m.size, m.size * 2, m.size * 2);
            ctx.strokeStyle = "rgba(20,12,6,0.8)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px - m.size, py - m.size, m.size * 2, m.size * 2);
        } else {
            ctx.fillStyle = m.color;
            ctx.fillRect(px - m.size * 0.5, py - m.size * 0.5, m.size, m.size);
        }
    }

    // ---- 플레이어 ----
    if (G.player) {
        const [px, py] = worldToMap(G.player.position.x, G.player.position.z, S);

        // 시야 방향 삼각형
        ctx.save();
        ctx.translate(px, py);
        // 월드 회전 -> 지도 회전 보정 (지도는 45도 돌아가 있다)
        ctx.rotate(-G.player.rotation.y + Math.PI * 0.75);
        ctx.fillStyle = "#fff0bd";
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(3.2, 3.5);
        ctx.lineTo(-3.2, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 주변 시야 원
        ctx.strokeStyle = "rgba(255, 224, 150, 0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 13, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ---- 테두리 + 방위 ----
    ctx.strokeStyle = "rgba(190, 145, 72, 0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, S - 1, S - 1);

    ctx.fillStyle = "rgba(200, 160, 90, 0.75)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("北", S * 0.5, 11);
}
