/**
 * 후처리 — 저해상도 렌더 타겟 + 90년대 느낌 셰이더
 */
export let renderTarget, postScene, postCamera, postMaterial;

// 시대별 그레이딩 값. buildAge()에서 갱신된다.
export const grade = {
    tint: new THREE.Color(1.02, 1.01, 0.98), // 맑은 전체 색조 밸런스
    lift: new THREE.Color(0.010, 0.010, 0.012), // 자연스러운 암부
    sat: 1.08,   // 한낮의 색을 살린다
    sepia: 0.02, // 세피아는 흔적만
    contrast: 1.10,
    vignette: 0.40
};

export const POST_VERT = [
    "varying vec2 vUv;",
    "void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }"
].join("\n");

export const POST_FRAG = [
    "precision highp float;",
    "varying vec2 vUv;",
    "uniform sampler2D tDiffuse;",
    "uniform vec2 uRes;",      // 저해상도 픽셀 크기
    "uniform float uTime;",
    "uniform float uGlitch;",  // 0..1 시대 전환
    "uniform vec3 uTint;",
    "uniform vec3 uLift;",
    "uniform float uSat;",
    "uniform float uSepia;",
    "uniform float uContrast;",
    "uniform float uVignette;",

    // 선형 -> sRGB (렌더 타겟은 선형으로 저장된다)
    "vec3 toSRGB(vec3 c){ return pow(clamp(c, 0.0, 1.0), vec3(0.4545)); }",

    "float hash(vec2 p){",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);",
    "}",

    // 부드러운 값 노이즈 — 수채화 종이의 얼룩진 결에 쓴다
    "float vnoise(vec2 p){",
    "  vec2 i = floor(p), f = fract(p);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float a = hash(i);",
    "  float b = hash(i + vec2(1.0, 0.0));",
    "  float c = hash(i + vec2(0.0, 1.0));",
    "  float d = hash(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
    "}",

    // 2x2 Bayer 를 재귀적으로 4x4 로 확장
    "float bayer2(float x, float y){ return 2.0*x + 3.0*y - 4.0*x*y; }",
    "float bayer4(vec2 p){",
    "  float x = mod(p.x, 4.0), y = mod(p.y, 4.0);",
    "  float fine   = bayer2(mod(x, 2.0), mod(y, 2.0));",
    "  float coarse = bayer2(floor(x * 0.5), floor(y * 0.5));",
    "  return (fine * 4.0 + coarse) / 16.0;",
    "}",

    "void main(){",
    "  vec2 uv = vUv;",
    "  vec2 px = uv * uRes;",

    // --- 시대 전환 글리치: 가로 줄 단위로 화면을 찢는다 ---
    "  if(uGlitch > 0.001){",
    "    float band = floor(uv.y * 34.0);",
    "    float jitter = (hash(vec2(band, floor(uTime * 22.0))) - 0.5);",
    "    float strong = step(0.62, hash(vec2(band * 1.7, floor(uTime * 14.0))));",
    "    uv.x += jitter * 0.10 * uGlitch * (0.35 + strong);",
    "    uv.y += (hash(vec2(floor(uTime*30.0), 3.0)) - 0.5) * 0.015 * uGlitch;",
    "  }",

    // --- 색수차: 화면 바깥쪽으로 갈수록 RGB 가 미세하게 어긋난다 ---
    "  vec2 dir = uv - 0.5;",
    "  float ab = (0.0012 + uGlitch * 0.020);",
    "  vec3 col;",
    "  col.r = texture2D(tDiffuse, uv + dir * ab).r;",
    "  col.g = texture2D(tDiffuse, uv).g;",
    "  col.b = texture2D(tDiffuse, uv - dir * ab).b;",

    "  col = toSRGB(col);",

    // --- 바랜 필름 같은 채도 저하 ---
    "  float lum = dot(col, vec3(0.299, 0.587, 0.114));",
    "  col = mix(vec3(lum), col, uSat);",

    // --- 은은한 웜톤 필터 ---
    "  vec3 sepia = lum * vec3(1.08, 0.98, 0.82);",
    "  col = mix(col, sepia, uSepia);",

    // --- 시대별 색조 + 검정 들어올리기 ---
    "  col = col * uTint + uLift;",

    // --- 대비 ---
    "  col = (col - 0.5) * uContrast + 0.5;",

    // --- 수채화 종이 질감: 물감이 번진 듯 밝기가 고르지 않다 ---
    "  float paper = vnoise(uv * vec2(9.0, 6.0)) * 0.6 + vnoise(uv * vec2(29.0, 21.0)) * 0.4;",
    "  col *= 0.975 + paper * 0.05;",

    // --- 비네팅 (오래된 CRT 의 어두운 모서리) ---
    "  float vig = 1.0 - dot(dir, dir) * 1.15 * uVignette;",
    "  col *= mix(0.58, 1.0, clamp(pow(clamp(vig, 0.0, 1.0), 1.10), 0.0, 1.0));",

    // --- 필름 그레인 (저해상도 픽셀 단위라 알갱이가 굵다) ---
    "  float grain = hash(floor(px) + vec2(floor(uTime * 24.0) * 13.7, 0.0));",
    "  col += (grain - 0.5) * 0.022;",

    // --- 아주 약한 수평 주사선 (저해상도 단계) ---
    "  col *= 1.0 - 0.016 * mod(floor(px.y), 2.0);",

    // --- Bayer 디더링 + 색 단계 축소 (256색 시절 그라데이션) ---
    "  float levels = 52.0;",
    "  float d = bayer4(px) - 0.5;",
    "  col = floor(clamp(col, 0.0, 1.0) * levels + 0.5 + d) / levels;",

    // --- 전환 중 화이트 아웃 ---
    "  col = mix(col, vec3(0.99, 0.95, 0.86), uGlitch * 0.18);",

    "  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);",
    "}"
].join("\n");

export function initPost() {
    renderTarget = new THREE.WebGLRenderTarget(320, 180, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false
    });

    // 렌더 타겟은 선형으로 두고 셰이더에서 직접 sRGB 변환한다.
    if ("colorSpace" in renderTarget.texture) {
        renderTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
    }

    postMaterial = new THREE.ShaderMaterial({
        vertexShader: POST_VERT,
        fragmentShader: POST_FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
            tDiffuse: { value: renderTarget.texture },
            uRes: { value: new THREE.Vector2(320, 180) },
            uTime: { value: 0 },
            uGlitch: { value: 0 },
            uTint: { value: grade.tint.clone() },
            uLift: { value: grade.lift.clone() },
            uSat: { value: grade.sat },
            uSepia: { value: grade.sepia },
            uContrast: { value: grade.contrast },
            uVignette: { value: grade.vignette }
        }
    });

    postScene = new THREE.Scene();
    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    quad.frustumCulled = false; // 클립 공간에 직접 그리므로 컬링하면 안 된다
    postScene.add(quad);
}

// 시대가 바뀔 때 그레이딩 유니폼을 갱신
export function applyGrade(g) {
    if (!postMaterial) return;
    const u = postMaterial.uniforms;
    u.uTint.value.setRGB(g.tint[0], g.tint[1], g.tint[2]);
    u.uLift.value.setRGB(g.lift[0], g.lift[1], g.lift[2]);
    u.uSat.value = g.sat;
    u.uSepia.value = g.sepia;
    u.uContrast.value = g.contrast;
    u.uVignette.value = g.vignette;
}
