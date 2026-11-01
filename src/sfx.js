// Tiny synthesized sound effects (no audio files).

let ac = null;

export function initAudio() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === "suspended") ac.resume();
}

function tone(freq, dur, { type = "square", vol = 0.06, slide = 0, delay = 0 } = {}) {
  if (!ac) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.1, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  s.buffer = buf;
  g.gain.value = vol;
  s.connect(f).connect(g).connect(ac.destination);
  s.start(t);
}

export const sfx = {
  knock() {
    tone(140, 0.08, { type: "triangle", vol: 0.35, slide: -60 });
    tone(140, 0.08, { type: "triangle", vol: 0.35, slide: -60, delay: 0.16 });
  },
  treat() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { vol: 0.05, delay: i * 0.07 }));
  },
  pickup() {
    tone(880, 0.06, { vol: 0.04 });
    tone(1320, 0.08, { vol: 0.04, delay: 0.05 });
  },
  trick() {
    tone(420, 0.5, { type: "sawtooth", vol: 0.05, slide: -320 });
    tone(300, 0.6, { type: "sawtooth", vol: 0.04, slide: -220, delay: 0.1 });
  },
  boo() {
    noise(0.35, 0.18);
    tone(160, 0.4, { type: "sawtooth", vol: 0.06, slide: -90 });
  },
  nobody() {
    tone(220, 0.25, { type: "triangle", vol: 0.08, slide: -40 });
  },
  beep(hi) {
    tone(hi ? 1046 : 660, hi ? 0.35 : 0.12, { vol: 0.06 });
  },
  tick() {
    tone(1500, 0.03, { vol: 0.03 });
  },
  sticky() {
    tone(90, 0.15, { type: "triangle", vol: 0.08 });
  },
  end() {
    [784, 659, 523, 392].forEach((f, i) => tone(f, 0.2, { vol: 0.05, delay: i * 0.14 }));
  },
};
