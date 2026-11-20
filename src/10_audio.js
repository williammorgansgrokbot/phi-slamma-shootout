// Original WebAudio score + SFX. Everything runs through a 120 Hz high-pass, with a mute toggle.
const Snd = (() => {
  let ctx = null, master = null, musicG = null, sfxG = null, crowdG = null, crowdSrc = null, muted = store.get('muted', false);
  let timer = null, nextT = 0, step = 0;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120; hp.Q.value = 0.7;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
    hp.connect(comp); comp.connect(master); master.connect(ctx.destination);
    musicG = ctx.createGain(); musicG.gain.value = 0.42; musicG.connect(hp);
    sfxG = ctx.createGain(); sfxG.gain.value = 0.9; sfxG.connect(hp);
    crowdG = ctx.createGain(); crowdG.gain.value = 0; crowdG.connect(hp);
  }
  function tone(type, f, t, dur, vol, o) {
    o = o || {}; const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ctx.createGain(); const a = o.a || 0.004;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = osc;
    if (o.lp) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(o.lp, t); osc.connect(lp); last = lp; }
    last.connect(g); g.connect(o.dest || musicG); osc.start(t); osc.stop(t + dur + 0.05);
  }
  let nbuf = null;
  function noiseBuf() { if (nbuf) return nbuf; nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return nbuf; }
  function noise(t, dur, vol, type, f1, f2, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf();
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f1, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxG); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // Original early-80s funk groove in A minor (synth bass, clav stabs, brassy lead); bass kept above 120 Hz.
  const bass = [57, -1, 57, 69, -1, 57, 67, -1, 55, -1, 55, 67, -1, 55, 62, 64];
  const chords = [[69, 72, 76], [67, 71, 74], [65, 69, 72], [64, 67, 71]];
  const lead = [81, -1, 79, 76, -1, 74, 76, -1, 79, -1, 81, 84, -1, 81, 79, -1, 76, -1, 74, 72, -1, 74, 76, -1, 72, -1, 69, -1, 71, 72, 74, -1];
  function sched(st, t) {
    const sp = st & 15, bar = (st >> 4) & 3;
    if (sp % 4 === 0) { tone('sine', 150, t, 0.14, 0.5, { f2: 60, a: 0.001 }); }
    if (sp === 4 || sp === 12) noise(t, 0.14, 0.22, 'bandpass', 2200, 1400, musicG);
    if (sp % 2 === 1) noise(t, 0.035, 0.06, 'highpass', 8000, 0, musicG);
    const b = bass[sp]; if (b > 0) tone('square', mtof(b - 12 + (bar === 2 ? -2 : bar === 3 ? -4 : 0)), t, 0.14, 0.12, { lp: 1100 });
    if (sp === 2 || sp === 7 || sp === 10) chords[bar].forEach((m) => tone('sawtooth', mtof(m - 12), t, 0.09, 0.035, { lp: 2600 }));
    const m = lead[(st) & 31]; if (m > 0 && bar % 2 === 1) tone('triangle', mtof(m), t, 0.2, 0.08, { lp: 3200, a: 0.01 });
  }
  function tick() { if (!ctx) return; while (nextT < ctx.currentTime + 0.15) { sched(step, nextT); nextT += 60 / 108 / 4; step = (step + 1) % 64; } }
  function startMusic() { init(); if (!ctx || timer) return; step = 0; nextT = ctx.currentTime + 0.06; timer = setInterval(tick, 30); tick(); }
  function stopMusic() { if (timer) { clearInterval(timer); timer = null; } }
  function crowd(on) {
    init(); if (!ctx) return;
    if (on && !crowdSrc) {
      crowdSrc = ctx.createBufferSource(); crowdSrc.buffer = noiseBuf(); crowdSrc.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
      crowdSrc.connect(f); f.connect(crowdG); crowdSrc.start();
    }
    crowdG.gain.cancelScheduledValues(ctx.currentTime);
    crowdG.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.4);
  }
  const ok = () => ctx && !muted;
  return {
    init, startMusic, stopMusic, crowd,
    get muted() { return muted; },
    setMuted(v) { muted = !!v; store.set('muted', muted); if (master) master.gain.value = muted ? 0 : 0.9; },
    click() { init(); if (!ok()) return; tone('square', 880, ctx.currentTime, 0.06, 0.07, { dest: sfxG, lp: 3000 }); },
    release() { if (!ok()) return; noise(ctx.currentTime, 0.12, 0.12, 'bandpass', 1200, 500); },
    swish() { if (!ok()) return; const t = ctx.currentTime; noise(t, 0.35, 0.35, 'highpass', 5000, 2500); noise(t + 0.03, 0.25, 0.18, 'bandpass', 3000, 1500); },
    rim() { if (!ok()) return; const t = ctx.currentTime; [523, 1046, 1568].forEach((f, i) => tone('triangle', f * rand(0.98, 1.02), t, 0.35 - i * 0.08, 0.12 / (i + 1), { dest: sfxG })); noise(t, 0.06, 0.2, 'bandpass', 2500); },
    board() { if (!ok()) return; const t = ctx.currentTime; tone('sine', 190, t, 0.18, 0.4, { dest: sfxG, f2: 120 }); noise(t, 0.08, 0.2, 'lowpass', 900); },
    bounce(v) { if (!ok()) return; const t = ctx.currentTime; tone('sine', 170, t, 0.12, 0.35 * clamp(v, 0.1, 1), { dest: sfxG, f2: 130 }); },
    cheer(big) { if (!ok()) return; const t = ctx.currentTime; noise(t, big ? 1.6 : 1.0, big ? 0.32 : 0.2, 'bandpass', 700, 1300); noise(t + 0.05, big ? 1.4 : 0.8, 0.12, 'bandpass', 1800, 2400); },
    groan() { if (!ok()) return; const t = ctx.currentTime; noise(t, 0.7, 0.14, 'bandpass', 600, 380); },
    money() { if (!ok()) return; const t = ctx.currentTime; [76, 81, 88].forEach((m, i) => tone('square', mtof(m), t + i * 0.07, 0.25, 0.07, { dest: sfxG, lp: 4000 })); },
    tick() { if (!ok()) return; tone('square', 1320, ctx.currentTime, 0.05, 0.05, { dest: sfxG }); },
    buzzer() { if (!ok()) return; const t = ctx.currentTime; tone('sawtooth', 220, t, 1.1, 0.16, { dest: sfxG, lp: 1500, a: 0.01 }); tone('sawtooth', 227, t, 1.1, 0.12, { dest: sfxG, lp: 1500, a: 0.01 }); }
  };
})();
