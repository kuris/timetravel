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
    ERA_SOUND: [
        {
            // 신석기: 강가의 바람과 물, 낮고 느린 가죽 북
            windCutoff: 420,
            windLevel: 0.052,
            waterLevel: 0.020,
            drumMin: 3400, drumMax: 6200,
            drumFreq: 86, drumDecay: 0.55, drumLevel: 0.17,
            melodyMin: 7000, melodyMax: 13000,
            melodyWave: "sine", melodyLevel: 0.030, melodyLen: 1.9,
            // 국악 5음 음계 (계면조 느낌)
            scale: [147, 175, 196, 220, 262, 294],
            ambient: "bird"
        },
        {
            // 청동기: 메마른 바람, 제의의 겹북, 청동 방울의 잔향
            windCutoff: 620,
            windLevel: 0.044,
            waterLevel: 0.0,
            drumMin: 2400, drumMax: 4200,
            drumFreq: 74, drumDecay: 0.70, drumLevel: 0.20,
            melodyMin: 5200, melodyMax: 9500,
            melodyWave: "triangle", melodyLevel: 0.024, melodyLen: 2.6,
            scale: [131, 156, 175, 196, 233, 262],
            ambient: "bell"
        },
        {
            // 삼국: 강바람과 쇠 두드리는 소리, 넓고 낮은 북
            windCutoff: 480,
            windLevel: 0.048,
            waterLevel: 0.014,
            drumMin: 3000, drumMax: 5400,
            drumFreq: 68, drumDecay: 0.78, drumLevel: 0.19,
            melodyMin: 6000, melodyMax: 11000,
            melodyWave: "triangle", melodyLevel: 0.026, melodyLen: 2.4,
            scale: [139, 165, 185, 220, 247, 277],
            ambient: "forge"
        },
        {
            // 조선: 밤의 정적, 대금 같은 숨소리, 풀벌레
            windCutoff: 300,
            windLevel: 0.034,
            waterLevel: 0.006,
            drumMin: 5200, drumMax: 9000,
            drumFreq: 96, drumDecay: 0.42, drumLevel: 0.11,
            melodyMin: 6000, melodyMax: 11000,
            melodyWave: "sine", melodyLevel: 0.032, melodyLen: 2.8,
            scale: [196, 220, 262, 294, 349, 392],
            ambient: "cricket"
        }
    ],

    scheduleDrum() {
        const loop = () => {
            if (!this.started) return;
            const cfg = this.ERA_SOUND[this.era || 0];
            this.playDrum();
            // 청동기는 제의처럼 두 번 친다
            if (this.era === 1) setTimeout(() => this.playDrum(0.62), 330);
            this.drumTimer = setTimeout(loop, cfg.drumMin + Math.random() * (cfg.drumMax - cfg.drumMin));
        };
        this.drumTimer = setTimeout(loop, 1600);
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

        if (this.era === 2) {
            // 대금처럼: 숨소리 섞인 긴 음
            this.breathTone(f, cfg.melodyLen, cfg.melodyLevel);
        } else {
            this.tone(f, cfg.melodyLen, cfg.melodyWave, cfg.melodyLevel);
            // 5도 위를 아주 작게 겹쳐 공간감을 준다
            this.tone(f * 1.5, cfg.melodyLen * 0.8, "sine", cfg.melodyLevel * 0.35, 0.18);
        }
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
            } else {
                // 밤의 풀벌레
                for (let i = 0; i < 5; i++) {
                    this.noiseBurst(0.035, 0.012, "bandpass", 4200 + Math.random() * 1200);
                }
            }

            this.ambientTimer = setTimeout(loop, 4000 + Math.random() * 8000);
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
