/**
 * AUDIO — Web Audio API 로 직접 합성하는 소리
 */
import { G } from "./state.js";

export const AudioSystem = {
    ctx: null,
    master: null,
    started: false,
    era: 0,
    drumTimer: null,
    melodyTimer: null,
    ambientTimer: null,
    windFilter: null,
    windGain: null,
    waterGain: null,
    rainGain: null,

    start() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!this.ctx) {
            this.ctx = new AudioContextClass();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.56;
            this.master.connect(this.ctx.destination);

            this.createWind();
            this.createWater();
            this.createRain();
            this.started = true;
            this.scheduleDrum();
            this.scheduleMelody();
            this.scheduleAmbient();
            this.setEra(G.currentAge);
        }

        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    },

    createNoiseBuffer(seconds) {
        const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    },

    createWind() {
        const seconds = 3.0;
        const length = Math.floor(this.ctx.sampleRate * seconds);
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // 낮은 바람 느낌을 위해 갈색 잡음에 가까운 느린 노이즈를 만든다.
        let v = 0;
        for (let i = 0; i < length; i++) {
            v = (v + (Math.random() * 2 - 1) * 0.018) * 0.995;
            data[i] = v * 3.0;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 420;
        lowpass.Q.value = 0.55;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.052;

        // 바람의 세기가 아주 천천히 흔들리도록 LFO 연결
        const lfo = this.ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.055;

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.022;

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        source.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.master);

        source.start();
        lfo.start();

        // 시대별로 바람의 음색과 세기를 바꾸기 위해 보관
        this.windFilter = lowpass;
        this.windGain = gain;
    },

    /**
     * 강물 소리 레이어 (신석기 전용).
     * 대역 통과 노이즈에 아주 느린 LFO 를 걸어 물결이 밀려오는 느낌을 만든다.
     */
    createWater() {
        const src = this.ctx.createBufferSource();
        src.buffer = this.createNoiseBuffer(4.0);
        src.loop = true;

        const band = this.ctx.createBiquadFilter();
        band.type = "bandpass";
        band.frequency.value = 900;
        band.Q.value = 0.6;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

        const lfo = this.ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.13;

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.010;

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        src.connect(band);
        band.connect(gain);
        gain.connect(this.master);

        src.start();
        lfo.start();

        this.waterGain = gain;
    },

    /**
     * 빗소리 레이어.
     * 넓은 대역 노이즈를 살짝 눌러서 "쏴" 하는 소리를 만든다.
     * 날씨 시스템이 setRain() 으로 세기만 조절한다.
     */
    createRain() {
        const src = this.ctx.createBufferSource();
        src.buffer = this.createNoiseBuffer(4.0);
        src.loop = true;

        const hp = this.ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 700;

        const lp = this.ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 5200;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

        src.connect(hp);
        hp.connect(lp);
        lp.connect(gain);
        gain.connect(this.master);
        src.start();

        this.rainGain = gain;
    },

    /** 비의 세기 (0..1). 날씨 시스템에서 매 프레임 호출된다. */
    setRain(amount) {
        if (!this.ctx || !this.rainGain) return;
        this.rainGain.gain.setTargetAtTime(amount * 0.055, this.ctx.currentTime, 0.8);
    },

    /**
     * AUDIO — 시대별 배경 설정
     * 바람 음색, 북의 간격, 선율 악기와 음계를 통째로 바꾼다.
     * 모든 소리는 아주 작게. 탐험을 방해하면 안 된다.
     */
    setEra(index) {
        this.era = index;
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const cfg = this.ERA_SOUND[index];

        if (this.windFilter) {
            this.windFilter.frequency.setTargetAtTime(cfg.windCutoff, t, 1.2);
        }
        if (this.windGain) {
            this.windGain.gain.setTargetAtTime(cfg.windLevel, t, 1.2);
        }
        if (this.waterGain) {
            this.waterGain.gain.setTargetAtTime(cfg.waterLevel, t, 1.5);
        }
    },

    /** 시대별 사운드 설정표. 여기 숫자만 바꾸면 분위기가 바뀐다. */
    /**
     * 시대별 사운드 설정표.
     *
     * 음계에 대해
     *   국악의 5음 음계는 크게 두 갈래다.
     *     평조(平調)  — 장5음에 가깝다. 밝고 트여 있다.
     *     계면조(界面調) — 단5음에 가깝다. 어둡고 굽이친다.
     *   여섯 시대에 같은 음계를 쓰면 전부 같은 정서가 된다.
     *
     * 신석기에는 "음계"라고 부를 것이 없었다.
     * 그래서 완전4도·5도·8도만 쓴다. 조성이 생기기 전의 소리다.
     *
     * 타악
     *   skin — 가죽 북
     *   wood — 나무를 치는 소리 (조선의 야경꾼 딱따기)
     *   none — 근현대에는 규칙적으로 울리는 북이 없다
     */
    ERA_SOUND: [
        {
            // 신석기: 강가의 바람과 물, 낮고 느린 가죽 북
            windCutoff: 420,
            windLevel: 0.052,
            waterLevel: 0.020,
            drumType: "skin",
            drumMin: 3400, drumMax: 6200,
            drumFreq: 86, drumDecay: 0.55, drumLevel: 0.17,
            melodyMin: 9000, melodyMax: 16000,
            melodyWave: "sine", melodyLevel: 0.028, melodyLen: 2.4,
            melodyVoice: "plain",
            // 조성이 생기기 전 — 완전음정만
            scale: [147, 196, 220, 294],
            ambient: "bird", ambientMin: 6000, ambientMax: 16000
        },
        {
            // 청동기: 메마른 바람, 제의의 겹북, 청동 방울의 잔향
            windCutoff: 620,
            windLevel: 0.044,
            waterLevel: 0.0,
            drumType: "skin",
            drumMin: 2400, drumMax: 4200,
            drumFreq: 74, drumDecay: 0.70, drumLevel: 0.20,
            melodyMin: 6000, melodyMax: 11000,
            melodyWave: "triangle", melodyLevel: 0.024, melodyLen: 2.8,
            melodyVoice: "plain",
            // 계면조 — 제의의 음계. 어둡고 굽이친다.
            scale: [131, 156, 175, 196, 233],
            ambient: "bell", ambientMin: 8000, ambientMax: 20000
        },
        {
            // 삼국: 강바람과 쇠 두드리는 소리, 넓고 낮은 북
            windCutoff: 480,
            windLevel: 0.048,
            waterLevel: 0.014,
            drumType: "skin",
            drumMin: 3000, drumMax: 5400,
            drumFreq: 68, drumDecay: 0.78, drumLevel: 0.19,
            melodyMin: 6000, melodyMax: 11000,
            melodyWave: "triangle", melodyLevel: 0.026, melodyLen: 2.4,
            melodyVoice: "pluck",
            // 평조 — 거문고와 가야금이 생긴 시대. 밝고 트여 있다.
            scale: [147, 165, 196, 220, 247],
            ambient: "forge", ambientMin: 5000, ambientMax: 12000
        },
        {
            // 조선: 밤의 정적, 대금 같은 숨소리, 야경꾼의 딱따기, 풀벌레
            windCutoff: 300,
            windLevel: 0.034,
            waterLevel: 0.006,
            drumType: "wood",
            drumMin: 9000, drumMax: 16000,
            drumFreq: 900, drumDecay: 0.12, drumLevel: 0.05,
            melodyMin: 6000, melodyMax: 11000,
            melodyWave: "sine", melodyLevel: 0.032, melodyLen: 3.2,
            melodyVoice: "breath",
            // 계면조 — 대금 정악의 음계
            scale: [196, 220, 262, 294, 349],
            ambient: "cricket", ambientMin: 6000, ambientMax: 14000
        },
        {
            // 1970: 마른 바람, 멀리서 오는 라디오와 경운기
            windCutoff: 520,
            windLevel: 0.044,
            waterLevel: 0.010,
            drumType: "none",
            drumMin: 0, drumMax: 0,
            drumFreq: 0, drumDecay: 0, drumLevel: 0,
            melodyMin: 14000, melodyMax: 26000,
            melodyWave: "sine", melodyLevel: 0.022, melodyLen: 1.6,
            melodyVoice: "radio",
            // 평조 높은 음역 — 라디오에서 새어 나오는 가락
            scale: [262, 294, 349, 392, 440],
            ambient: "village", ambientMin: 5000, ambientMax: 12000
        },
        {
            // 2000: 낮은 도시 소음. 가락이라 할 것이 거의 없다.
            windCutoff: 260,
            windLevel: 0.030,
            waterLevel: 0.008,
            drumType: "none",
            drumMin: 0, drumMax: 0,
            drumFreq: 0, drumDecay: 0, drumLevel: 0,
            melodyMin: 22000, melodyMax: 40000,
            melodyWave: "sine", melodyLevel: 0.016, melodyLen: 5.0,
            melodyVoice: "drone",
            // 선율이 아니라 낮게 깔리는 지속음 두 개
            scale: [98, 131],
            ambient: "city", ambientMin: 3000, ambientMax: 8000
        }
    ],

    scheduleDrum() {
        const loop = () => {
            if (!this.started) return;
            const cfg = this.ERA_SOUND[this.era || 0];

            // 근현대에는 규칙적으로 울리는 북이 없다
            if (cfg.drumType === "none") {
                this.drumTimer = setTimeout(loop, 4000);
                return;
            }

            if (cfg.drumType === "wood") {
                // 조선 야경꾼의 딱따기 — 나무를 두 번 친다
                this.playClapper();
                setTimeout(() => this.playClapper(0.8), 220);
            } else {
                this.playDrum();
                // 청동기 제의는 겹쳐 친다
                if (cfg.drumDecay > 0.65 && cfg.drumFreq < 80) {
                    setTimeout(() => this.playDrum(0.62), 330);
                }
            }

            this.drumTimer = setTimeout(loop, cfg.drumMin + Math.random() * (cfg.drumMax - cfg.drumMin));
        };
        this.drumTimer = setTimeout(loop, 1600);
    },

    /**
     * 딱따기 — 나무 두 조각을 마주쳐 내는 소리.
     * 조선의 밤 마을에서 야경꾼이 시각을 알리던 소리다.
     * 북과 달리 울림이 거의 없고 아주 짧다.
     */
    playClapper(strength = 1) {
        if (!this.ctx) return;
        const cfg = this.ERA_SOUND[this.era || 0];
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(cfg.drumFreq, t);
        osc.frequency.exponentialRampToValueAtTime(cfg.drumFreq * 0.6, t + 0.05);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(cfg.drumLevel * strength, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + cfg.drumDecay);

        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + cfg.drumDecay + 0.05);

        // 나무가 부딪히는 마찰음
        this.noiseBurst(0.04, cfg.drumLevel * 0.8 * strength, "highpass", 2200);
    },

    /** 아주 드물게 한 음씩 떨어지는 선율 */
    scheduleMelody() {
        const loop = () => {
            if (!this.started) return;
            const cfg = this.ERA_SOUND[this.era || 0];
            this.playMelodyNote();
            this.melodyTimer = setTimeout(loop, cfg.melodyMin + Math.random() * (cfg.melodyMax - cfg.melodyMin));
        };
        this.melodyTimer = setTimeout(loop, 4200);
    },

    playMelodyNote() {
        const cfg = this.ERA_SOUND[this.era || 0];
        const f = cfg.scale[Math.floor(Math.random() * cfg.scale.length)];

        // 예전에는 시대 번호를 직접 비교했는데, 시대를 끼워 넣자
        // 대금 숨소리가 엉뚱한 시대로 옮겨 갔다. 설정에서 받는다.
        switch (cfg.melodyVoice) {
            case "breath":
                // 대금 — 숨소리가 섞인 긴 음
                this.breathTone(f, cfg.melodyLen, cfg.melodyLevel);
                break;

            case "pluck":
                // 거문고 / 가야금 — 뜯는 소리. 빠르게 서고 길게 죽는다.
                this.pluckTone(f, cfg.melodyLen, cfg.melodyLevel);
                break;

            case "radio":
                // 멀리서 새어 나오는 라디오 — 좁은 대역으로 눌려 있다
                this.radioTone(f, cfg.melodyLen, cfg.melodyLevel);
                break;

            case "drone":
                // 도시의 저음. 가락이라기보다 공기의 울림에 가깝다.
                this.tone(f, cfg.melodyLen, "sine", cfg.melodyLevel);
                this.tone(f * 1.002, cfg.melodyLen, "sine", cfg.melodyLevel * 0.8, 0.1);
                break;

            default:
                this.tone(f, cfg.melodyLen, cfg.melodyWave, cfg.melodyLevel);
                // 5도 위를 아주 작게 겹쳐 공간감을 준다
                this.tone(f * 1.5, cfg.melodyLen * 0.8, "sine", cfg.melodyLevel * 0.35, 0.18);
        }
    },

    /** 줄을 뜯는 소리 (거문고 / 가야금) */
    pluckTone(freq, duration, volume) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        // 뜯은 직후 음이 아주 살짝 내려앉는다
        osc.frequency.exponentialRampToValueAtTime(freq * 0.995, t + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + duration + 0.05);

        // 줄이 튕기는 잡음
        this.noiseBurst(0.05, volume * 0.5, "bandpass", freq * 3);
    },

    /** 멀리서 들리는 라디오 — 좁은 대역으로 눌린 소리 */
    radioTone(freq, duration, volume) {
        if (!this.ctx || !this.master) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, t);

        // 라디오 스피커 대역만 남긴다
        const band = this.ctx.createBiquadFilter();
        band.type = "bandpass";
        band.frequency.value = 1200;
        band.Q.value = 3.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(volume, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(band);
        band.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + duration + 0.05);

        // 전파 잡음
        this.noiseBurst(duration * 0.8, volume * 0.35, "bandpass", 2000);
    },

    /** 숨소리가 섞인 관악기 느낌 (대금/퉁소) */
    breathTone(freq, duration, volume) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);

        // 느린 농현(비브라토)
        const vib = this.ctx.createOscillator();
        vib.type = "sine";
        vib.frequency.value = 4.6;
        const vibGain = this.ctx.createGain();
        vibGain.gain.value = freq * 0.012;
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(volume, t + 0.42);
        gain.gain.setValueAtTime(volume, t + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + duration + 0.1);
        vib.start(t);
        vib.stop(t + duration + 0.1);

        // 숨 소리
        this.noiseBurst(duration * 0.5, volume * 0.35, "bandpass", freq * 2.2);
    },

    /** 시대별 환경음: 새 / 방울 / 대장간 / 풀벌레 */
    scheduleAmbient() {
        const loop = () => {
            if (!this.started) return;
            const cfg = this.ERA_SOUND[this.era || 0];

            if (cfg.ambient === "bird") {
                // 멀리서 우는 물새
                const f = 900 + Math.random() * 600;
                this.tone(f, 0.10, "sine", 0.018, 0, f * 0.72);
                this.tone(f * 0.9, 0.09, "sine", 0.014, 0.16, f * 0.66);
            } else if (cfg.ambient === "bell") {
                // 청동 방울의 희미한 잔향
                const f = 1100 + Math.random() * 900;
                this.tone(f, 1.6, "sine", 0.016);
                this.tone(f * 1.51, 1.3, "sine", 0.010, 0.04);
            } else if (cfg.ambient === "forge") {
                // 대장간에서 쇠를 두드리는 소리
                const hits = 2 + Math.floor(Math.random() * 3);
                for (let i = 0; i < hits; i++) {
                    this.tone(1400 + Math.random() * 600, 0.10, "triangle", 0.020, i * 0.26);
                    this.noiseBurst(0.05, 0.014, "highpass", 3000);
                }
            } else if (cfg.ambient === "village") {
                const r = Math.random();
                if (r > 0.66) {
                    // 멀리서 개 짖는 소리
                    this.tone(300, 0.16, "sawtooth", 0.014, 0, 210);
                    this.tone(280, 0.14, "sawtooth", 0.011, 0.24, 200);
                } else if (r > 0.33) {
                    // 경운기 — 낮은 박동
                    for (let i = 0; i < 10; i++) {
                        this.tone(70 + Math.random() * 20, 0.09, "square", 0.009, i * 0.12);
                    }
                } else {
                    // 확성기에서 나오는 마을 방송 (말소리는 못 알아듣게)
                    for (let i = 0; i < 5; i++) {
                        this.noiseBurst(0.12 + Math.random() * 0.1, 0.012, "bandpass",
                            700 + Math.random() * 500);
                    }
                }
            } else if (cfg.ambient === "city") {
                const r = Math.random();
                // 멀리 지나가는 차 한 대
                this.noiseBurst(1.8, 0.016, "lowpass", 380);
                if (r > 0.75) {
                    // 아주 가끔 들리는 경적
                    this.tone(440, 0.22, "square", 0.010, 0.6);
                    this.tone(392, 0.18, "square", 0.008, 0.62);
                } else if (r > 0.55) {
                    // 버스가 서면서 내는 공기압
                    this.noiseBurst(0.5, 0.018, "highpass", 2600);
                } else if (r > 0.4) {
                    // 건널목 신호기
                    for (let i = 0; i < 4; i++) {
                        this.tone(1046, 0.07, "sine", 0.008, i * 0.42);
                    }
                }
            } else {
                // 밤의 풀벌레
                for (let i = 0; i < 5; i++) {
                    this.noiseBurst(0.035, 0.012, "bandpass", 4200 + Math.random() * 1200);
                }
            }

            // 도시는 잦고 신석기는 드물다
            const lo = cfg.ambientMin ?? 4000;
            const hi = cfg.ambientMax ?? 12000;
            this.ambientTimer = setTimeout(loop, lo + Math.random() * (hi - lo));
        };
        this.ambientTimer = setTimeout(loop, 3000);
    },

    tone(freq, duration, type = "sine", volume = 0.08, delay = 0, glideTo = null) {
        if (!this.ctx || !this.master) return;

        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(1, freq), t);
        if (glideTo) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t + duration * 0.92);
        }

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + duration + 0.04);
    },

    noiseBurst(duration, volume, filterType = "bandpass", freq = 700) {
        if (!this.ctx || !this.master) return;

        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = freq;
        filter.Q.value = 0.8;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        src.start(t);
        src.stop(t + duration + 0.03);
    },

    playDrum(strength = 1) {
        if (!this.ctx) return;

        const cfg = this.ERA_SOUND[this.era || 0];
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(cfg.drumFreq, t);
        osc.frequency.exponentialRampToValueAtTime(cfg.drumFreq * 0.49, t + 0.24);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(cfg.drumLevel * strength, t + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + cfg.drumDecay);

        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + cfg.drumDecay + 0.1);

        // 북 가죽이 울리는 질감
        this.noiseBurst(0.11, 0.033 * strength, "lowpass", 230);
    },

    playInvestigate() {
        this.tone(520, 0.12, "triangle", 0.05, 0, 690);
        this.tone(870, 0.16, "sine", 0.035, 0.08);
    },

    playPickup() {
        this.tone(392, 0.12, "triangle", 0.055, 0);
        this.tone(588, 0.14, "triangle", 0.052, 0.08);
        this.tone(784, 0.18, "sine", 0.045, 0.16);
    },

    playGate() {
        this.tone(130, 1.1, "sine", 0.055, 0, 98);
        this.tone(196, 1.0, "sine", 0.045, 0.03);
        this.tone(247, 1.0, "triangle", 0.04, 0.08);
        this.tone(330, 1.2, "sine", 0.035, 0.12);
        this.noiseBurst(0.7, 0.04, "lowpass", 520);
    },

    playGlitch() {
        this.noiseBurst(0.45, 0.16, "highpass", 950);
        for (let i = 0; i < 12; i++) {
            const f = 90 + Math.random() * 1250;
            this.tone(f, 0.035 + Math.random() * 0.035, "sawtooth", 0.035, i * 0.035);
        }
    }
};
