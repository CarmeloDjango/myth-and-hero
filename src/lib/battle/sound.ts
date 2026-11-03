/**
 * 카드 배틀 효과음 (브라우저 전용)
 * 소리 파일 없이 Web Audio로 그때그때 만듭니다 → 저작권 걱정 없고, 내려받을 것도 없습니다.
 * 아이패드 Safari는 화면을 한 번 누른 뒤에야 소리를 낼 수 있어서, 첫 소리는 누른 순간에 준비합니다.
 * 끄기는 이 기기에 기억합니다.
 */
export type SoundName = "play" | "attack" | "hit" | "leaderHit" | "death" | "divine" | "guard" | "charge" | "scheme" | "fire" | "crisis" | "turn" | "win" | "lose" | "tap" | "nope";

const MUTE_KEY = "battle-sound-muted";
let ctx: AudioContext | null = null;

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* 기억 못 해도 지금은 적용 */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Tone = { freq: number; to?: number; at?: number; dur: number; type?: OscillatorType; vol?: number };

function tones(list: Tone[]) {
  const a = audio();
  if (!a) return;
  const now = a.currentTime;
  for (const t of list) {
    const start = now + (t.at ?? 0);
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = t.type ?? "triangle";
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.dur);
    const vol = t.vol ?? 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(gain).connect(a.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

/** 짧은 잡음 (부딪힘, 번개) */
function noise(dur: number, vol = 0.2, at = 0, lowpass = 1800) {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  const gain = a.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(a.currentTime + at);
}

const SOUNDS: Record<SoundName, () => void> = {
  tap: () => tones([{ freq: 660, dur: 0.06, vol: 0.08 }]),
  nope: () => tones([{ freq: 220, to: 160, dur: 0.15, type: "square", vol: 0.06 }]),
  play: () => tones([{ freq: 440, to: 880, dur: 0.12 }, { freq: 660, at: 0.08, dur: 0.12, vol: 0.12 }]),
  attack: () => {
    tones([{ freq: 300, to: 900, dur: 0.15, type: "sawtooth", vol: 0.06 }]);
    noise(0.12, 0.08, 0, 4000);
  },
  hit: () => {
    noise(0.15, 0.25, 0, 1200);
    tones([{ freq: 180, to: 90, dur: 0.15, type: "square", vol: 0.08 }]);
  },
  leaderHit: () => {
    noise(0.25, 0.3, 0, 900);
    tones([{ freq: 140, to: 60, dur: 0.3, type: "square", vol: 0.1 }]);
  },
  death: () => {
    tones([{ freq: 520, to: 120, dur: 0.4, type: "triangle", vol: 0.14 }]);
    noise(0.3, 0.12, 0.05, 3000);
  },
  divine: () => {
    noise(0.5, 0.3, 0, 6000);
    tones([{ freq: 880, to: 1760, dur: 0.3, vol: 0.1 }, { freq: 1320, at: 0.1, dur: 0.3, vol: 0.08 }]);
  },
  guard: () => tones([{ freq: 520, dur: 0.12, type: "square", vol: 0.06 }, { freq: 780, at: 0.1, dur: 0.18, vol: 0.1 }]),
  charge: () => noise(0.35, 0.18, 0, 5000),
  fire: () => {
    noise(0.45, 0.25, 0, 2500);
    tones([{ freq: 200, to: 600, dur: 0.35, type: "sawtooth", vol: 0.07 }]);
  },
  scheme: () => tones([{ freq: 700, dur: 0.08 }, { freq: 900, at: 0.08, dur: 0.08 }, { freq: 1100, at: 0.16, dur: 0.12 }]),
  crisis: () => tones([{ freq: 200, dur: 0.18, type: "square", vol: 0.07 }, { freq: 200, at: 0.25, dur: 0.18, type: "square", vol: 0.07 }]),
  turn: () => tones([{ freq: 523, dur: 0.1, vol: 0.1 }, { freq: 784, at: 0.1, dur: 0.15, vol: 0.1 }]),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tones([{ freq: f, at: i * 0.12, dur: i === 3 ? 0.5 : 0.14, vol: 0.14 }])),
  lose: () => [392, 349, 311, 262].forEach((f, i) => tones([{ freq: f, at: i * 0.18, dur: 0.22, vol: 0.1 }])),
};

export function playSound(name: SoundName) {
  if (isMuted()) return;
  try {
    SOUNDS[name]();
  } catch {
    /* 소리가 안 나도 게임은 그대로 */
  }
}
