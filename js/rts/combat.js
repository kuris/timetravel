/**
 * combat.js — 날아가는 것
 *
 * 활과 쇠뇌, 망루의 화살. 맞는 순간에만 피해가 들어간다.
 * (근접 공격은 units.js 가 바로 처리한다.)
 */
import { G } from "../state.js";
import { terrainHeight } from "../terrain.js";
import { makeArrow } from "./models.js";
import { R } from "./state.js";
import { applyHit } from "./units.js";
import { disposeObj } from "./util.js";

const SPEED = 16;

export function spawnArrow(attacker, target, yOff = 1.05) {
    const g = makeArrow();
    const x = attacker.x, z = attacker.z;
    const y = terrainHeight(x, z) + yOff;
    g.position.set(x, y, z);
    G.world.add(g);

    R.projectiles.push({
        group: g, attacker, target,
        x, y, z,
        life: 3
    });
}

export function updateProjectiles(dt) {
    for (let i = R.projectiles.length - 1; i >= 0; i--) {
        const p = R.projectiles[i];
        p.life -= dt;

        const t = p.target;
        if (!t || !t.alive || p.life <= 0) {
            disposeObj(p.group);
            R.projectiles.splice(i, 1);
            continue;
        }

        const ty = terrainHeight(t.x, t.z) + 0.6;
        const dx = t.x - p.x, dy = ty - p.y, dz = t.z - p.z;
        const d = Math.hypot(dx, dy, dz);
        const step = SPEED * dt;

        if (d <= step) {
            applyHit(p.attacker, t);
            disposeObj(p.group);
            R.projectiles.splice(i, 1);
            continue;
        }

        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
        p.z += (dz / d) * step;
        p.group.position.set(p.x, p.y, p.z);
        p.group.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
        p.group.rotation.z = Math.asin(Math.max(-1, Math.min(1, dy / d)));
    }
}
