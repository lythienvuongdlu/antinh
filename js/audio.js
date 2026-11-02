// Âm thanh tổng hợp bằng Web Audio: không dùng file ghi âm nên không vướng bản quyền.
let ctx = null;
let master = null;
let ambient = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function noiseBuffer(sec) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// Chuông chùa: các họa âm không điều hòa, tắt dần chậm, hơi lệch tần để có tiếng "ngân".
export function bell(strength = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const f0 = 118;
  const partials = [
    [0.5, 0.55, 14], [1, 1, 11], [1.183, 0.5, 8], [1.506, 0.4, 7],
    [2.0, 0.32, 5.5], [2.514, 0.22, 4], [2.662, 0.18, 3.5], [3.011, 0.14, 2.8], [4.1, 0.08, 1.8],
  ];
  const out = ctx.createGain();
  out.gain.value = 0.22 * strength;
  out.connect(master);
  for (const [ratio, amp, decay] of partials) {
    for (const detune of [-0.35, 0.35]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f0 * ratio + detune;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + decay + 0.1);
    }
  }
  // Tiếng dùi gỗ chạm chuông
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.5, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  n.connect(lp).connect(ng).connect(out);
  n.start(t);
}

// Mõ gỗ: tiếng "cốc" ngắn, rỗng.
export function mo() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(master);
  for (const [f, a, d] of [[620, 0.9, 0.16], [1240, 0.25, 0.07], [360, 0.4, 0.12]]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.08, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(a, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + d + 0.05);
  }
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.06);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 4;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.6, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  n.connect(bp).connect(ng).connect(out);
  n.start(t);
}

// Tiếng lắc ống xăm
export function rattle(sec = 1.4) {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < sec * 14; i++) {
    const at = t + i / 14 + Math.random() * 0.03;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 1400 + Math.random() * 900;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.08, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + 0.06);
  }
}

// Âm nền: gió nhẹ + một nốt trầm rất khẽ
export function setAmbient(on) {
  if (!ctx) return;
  if (on && !ambient) {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
    g.connect(master);
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(4);
    n.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoG.gain.value = 0.03;
    lfo.connect(lfoG).connect(ng.gain);
    n.connect(lp).connect(ng).connect(g);
    const drones = [110, 164.8].map((f) => {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.frequency.value = f;
      og.gain.value = 0.012;
      o.connect(og).connect(g);
      o.start();
      return o;
    });
    n.start();
    lfo.start();
    ambient = { g, nodes: [n, lfo, ...drones] };
  } else if (!on && ambient) {
    const a = ambient;
    ambient = null;
    a.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    setTimeout(() => a.nodes.forEach((x) => x.stop()), 1200);
  }
}
