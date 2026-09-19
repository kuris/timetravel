/**
 * 난수 — 장면을 매번 같게 생성하기 위한 시드 PRNG
 */
export let rngSeed = 1;

export function seedRandom(seed) {
    rngSeed = seed;
}

export function rand() {
    const x = Math.sin(rngSeed++) * 10000;
    return x - Math.floor(x);
}

export function randRange(min, max) {
    return min + rand() * (max - min);
}

export function pick(arr) {
    return arr[Math.floor(rand() * arr.length)];
}
