// Shoot input: hold touch (button or anywhere in the play area), Space/Enter, or gamepad A. Start/Esc/P = pause.
const Input = (() => {
  const st = { down: false, pressed: false, released: false, pausePressed: false };
  let touchCount = 0, keyDown = false, padDown = false, padStart = false;
  function set(v) { const was = st.down; st.down = v; if (v && !was) st.pressed = true; if (!v && was) st.released = true; }
  function recompute() { set(touchCount > 0 || keyDown || padDown); }
  function bindHold(el) {
    const ids = new Set();
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); Snd.init(); ids.add(e.pointerId); touchCount++; try { el.setPointerCapture(e.pointerId); } catch (_) {} $('btnShoot').classList.add('down'); recompute(); });
    const up = (e) => { if (!ids.has(e.pointerId)) return; ids.delete(e.pointerId); touchCount = Math.max(0, touchCount - 1); if (!touchCount) $('btnShoot').classList.remove('down'); recompute(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  }
  bindHold($('btnShoot')); bindHold($('shootZone'));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') { if (!e.repeat) { Snd.init(); keyDown = true; recompute(); } e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') st.pausePressed = true;
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') { keyDown = false; recompute(); } });
  window.addEventListener('blur', () => { keyDown = false; touchCount = 0; recompute(); });
  function poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let a = false, s = false;
    for (const p of pads) { if (!p) continue; a = a || (p.buttons[0] && p.buttons[0].pressed) || (p.buttons[7] && p.buttons[7].value > 0.5); s = s || (p.buttons[9] && p.buttons[9].pressed); }
    if (a !== padDown) { padDown = a; recompute(); }
    if (s && !padStart) st.pausePressed = true; padStart = s;
    return { a, s };
  }
  function consume() { const r = { pressed: st.pressed, released: st.released, pause: st.pausePressed, down: st.down }; st.pressed = st.released = st.pausePressed = false; return r; }
  function reset() { touchCount = 0; keyDown = false; padDown = false; st.down = false; st.pressed = st.released = false; $('btnShoot').classList.remove('down'); }
  return { poll, consume, reset, get padA() { return padDown; } };
})();
