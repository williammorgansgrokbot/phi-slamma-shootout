// ---------- constants ----------
const RIM = new THREE.Vector3(0, 3.05, 0);
const RIM_R = 0.6, BALL_R = 0.22, G = -9.8;
const ROUND_TIME = 60, RACKS = 5, PER_RACK = 5;
const SPOT_R = 7.35, SPOT_ANG = [-78, -40, 0, 40, 78].map((d) => d * Math.PI / 180);
const CHARS = {
  hakeem: { name: 'Hakeem', nick: 'The Dream', sweet: 0.15, reload: 0.42 },
  clyde: { name: 'Clyde', nick: 'The Glide', sweet: 0.12, reload: 0.3 }
};
const FILL_TIME = 0.95, SWEET_MIN = 0.3, SWEET_MAX = 0.92;

// ---------- renderer / scene ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0b24);
scene.fog = new THREE.Fog(0x2a1426, 34, 80);
const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 120);
const loader = new THREE.TextureLoader();
const TEX = {};
function tex(name, o) {
  o = o || {};
  const t = loader.load(ASSET(name));
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  if (o.mirror) { t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.set(o.mirror, 1); }
  TEX[name] = t; return t;
}
const IMG_SIZE = {
  'hakeem_set.png': [301, 720], 'hakeem_shoot.png': [252, 720], 'hakeem_follow.png': [225, 720], 'hakeem_cheer.png': [319, 720],
  'clyde_set.png': [270, 720], 'clyde_shoot.png': [228, 720], 'clyde_follow.png': [255, 720], 'clyde_cheer.png': [306, 720]
};

// floor: painted half court + plank surround
const court = new THREE.Mesh(new THREE.PlaneGeometry(15.3, 11.9), new THREE.MeshBasicMaterial({ map: tex('court.jpg') }));
court.rotation.x = -Math.PI / 2; court.position.set(0, 0, -11.9 * 0.08 + 11.9 / 2); scene.add(court);
const planks = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ map: tex('planks.jpg', { repeat: [22, 26] }), color: 0xd9b48a }));
planks.rotation.x = -Math.PI / 2; planks.position.set(0, -0.01, 4); scene.add(planks);
// shine strip: subtle warm glow pools on the floor (soft light reflection)
// arena: painted crowd wrapped around a cylinder
const ARENA_R = 30;
const arenaTex = tex('arena_back.jpg', { mirror: 6 });
const arena = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R, ARENA_R, 17, 96, 1, true), new THREE.MeshBasicMaterial({ map: arenaTex, side: THREE.BackSide, fog: false }));
arena.position.set(0, 8.5 - 0.05, 4); arena.rotation.y = Math.PI / 2 + Math.PI / 6; scene.add(arena);
const ceil = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R, 48), new THREE.MeshBasicMaterial({ color: 0x140a10, side: THREE.DoubleSide }));
ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 16.9, 4); scene.add(ceil);

// hoop: two painted layers sharing one yaw-billboard so the ball can drop inside the net
const STAN_PX = [216, 700];
const HOOP_PX = [606, 672], RIM_PX = [258, 368], PX = (RIM_R * 2) / 355;
const hoop = new THREE.Group(); hoop.position.copy(RIM); scene.add(hoop);
function hoopLayer(name, order) {
  const w = HOOP_PX[0] * PX, h = HOOP_PX[1] * PX;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(name), transparent: true, depthTest: false, depthWrite: false }));
  m.position.set((HOOP_PX[0] / 2 - RIM_PX[0]) * PX, (RIM_PX[1] - HOOP_PX[1] / 2) * PX, 0);
  m.renderOrder = order; hoop.add(m); return m;
}
const hoopBack = hoopLayer('hoop_full.png', 10);
const hoopFront = hoopLayer('hoop_front.png', 30);
{ // padded stanchion behind the board so the hoop doesn't float
  const H = RIM.y + 0.32, W = H * STAN_PX[0] / STAN_PX[1];
  const st = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex('stanchion.png'), transparent: true, depthWrite: false }));
  st.position.set(0, -RIM.y + H / 2, -0.9); st.renderOrder = 8; hoop.add(st);
}
// stanchion shadow-free: the board hangs from the scoreboard rig in the painting

// shooter: billboard sprite
function spriteMat(name) { return new THREE.SpriteMaterial({ map: TEX[name] || tex(name), transparent: true, depthWrite: false }); }
const shooter = new THREE.Sprite(spriteMat('hakeem_set.png')); shooter.material.depthWrite = true; shooter.material.alphaTest = 0.35; shooter.center.set(0.5, 0); shooter.renderOrder = 40; scene.add(shooter);
['hakeem', 'clyde'].forEach((c) => ['set', 'shoot', 'follow', 'cheer'].forEach((p) => tex(c + '_' + p + '.png')));
const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
const shooterShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
shooterShadow.rotation.x = -Math.PI / 2; scene.add(shooterShadow);

// balls
const ballTex = tex('ball.png'), moneyTex = tex('moneyball.png');
tex('logo.png'); tex('arena_wide.jpg');
const balls = [];
for (let i = 0; i < 6; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ballTex, transparent: true, depthTest: false, depthWrite: false }));
  s.scale.set(BALL_R * 2.1, BALL_R * 2.1, 1); s.visible = false; scene.add(s);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.visible = false; scene.add(sh);
  balls.push({ s, sh, active: false });
}

// ---------- racks: one at every spot around the horn, balls disappear as they're shot ----------
const RACK_W = 2.0, RACK_H = RACK_W * 264 / 600, RACK_CUPS = [103, 207, 308, 410, 515];
const racks = [];
function buildRacks() { for (let i = 0; i < 5; i++) {
  const g = new THREE.Group(); scene.add(g);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(RACK_W, RACK_H), new THREE.MeshBasicMaterial({ map: TEX['rack_empty.png'] || tex('rack_empty.png'), transparent: true, alphaTest: 0.35 }));
  m.position.y = RACK_H / 2; m.renderOrder = 35; g.add(m);
  const bl = [];
  for (let k = 0; k < 5; k++) {
    const d = 92 / 600 * RACK_W * 1.05;
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(d, d), new THREE.MeshBasicMaterial({ map: k === 4 ? moneyTex : ballTex, transparent: true, alphaTest: 0.35 }));
    bm.position.set((RACK_CUPS[k] / 600 - 0.5) * RACK_W, RACK_H - 0.012 * RACK_W + d * 0.32, 0.01); bm.renderOrder = 36; g.add(bm); bl.push(bm);
  }
  const p = spotPos(i);
  if (i === 2) g.position.set(p.x - 1.55, 0, p.z + 0.1); else if (i === 0 || i === 4) g.position.set(p.x - Math.sign(p.x) * 1.45, 0, p.z + 0.35); else g.position.set(p.x - Math.sign(p.x) * 0.8, 0, p.z + 1.2);
  g.rotation.y = Math.atan2(CAM_FIXED.x - g.position.x, CAM_FIXED.z - g.position.z);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(RACK_W * 1.1, 0.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(g.position.x, 0.015, g.position.z); scene.add(sh);
  racks.push({ g, balls: bl });
} }
function updateRacks() {
  racks.forEach((r, i) => r.balls.forEach((b, k) => { b.visible = i > S.rack || (i === S.rack && k >= S.ball); }));
}

// ---------- layout ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  // keep ~33 deg of horizontal half-angle so both corners stay on screen at any landscape size
  camera.fov = clamp(2 * Math.atan(Math.tan(33 * Math.PI / 180) / camera.aspect) * 180 / Math.PI, 24, 50); camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

function spotPos(i) { const a = SPOT_ANG[i]; return new THREE.Vector3(Math.sin(a) * SPOT_R, 0, Math.cos(a) * SPOT_R); }
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
// Fixed camera behind the top of the arc: the hoop never moves on screen, the shooter walks the horn.
const CAM_FIXED = new THREE.Vector3(0, 5.5, 17.5), LOOK_FIXED = new THREE.Vector3(0, 1.95, 2.6);
function camFor(i, out, look) { out.copy(CAM_FIXED); look.copy(LOOK_FIXED); }
function arcPos(a) { return new THREE.Vector3(Math.sin(a) * SPOT_R, 0, Math.cos(a) * SPOT_R); }

// ---------- game state ----------
const S = {
  screen: 'title', mode: 'solo', players: [], turn: 0, cur: null,
  time: ROUND_TIME, rack: 0, ball: 0, score: 0, shots: [],
  phase: 'idle', phaseT: 0, holdT: 0, charging: false, reloadT: 0, moveT: 0, moveFrom: 0, over: false, paused: false,
  cpuNext: 0, cpuHold: 0, cpuTarget: 0, lastTick: 0, best: store.get('best', 0)
};

function setScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('show', s.id === id));
  S.screen = id; $('hud').classList.toggle('hidden', id !== 'play' && id !== 'pause' && id !== 'handoff');
  if (id === 'title' || id === 'select' || id === 'results') { Snd.startMusic(); Snd.crowd(id === 'results'); } else Snd.stopMusic();
  focusFirst();
}
function updateMute() { [$('btnMute'), $('btnMuteTitle')].forEach((b) => b.innerHTML = Snd.muted ? ICON_OFF : ICON_ON); }
$('btnMute').onclick = $('btnMuteTitle').onclick = () => { Snd.init(); Snd.setMuted(!Snd.muted); updateMute(); };
updateMute();

// title / select
$('logo').src = ASSET('logo.png');
$('title').style.backgroundImage = 'url(' + ASSET('arena_wide.jpg') + ')';
$('cardHakeem').src = ASSET('hakeem_ready.png'); $('cardClyde').src = ASSET('clyde_ready.png');
$('bestScore').textContent = 'Best ' + S.best;
document.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { Snd.init(); Snd.click(); startSelect(b.dataset.mode); });
let picking = 0;
function startSelect(mode) {
  S.mode = mode; S.players = []; picking = 0;
  document.querySelectorAll('.card').forEach((c) => c.classList.remove('taken'));
  $('selTitle').textContent = mode === 'pass' ? 'Player 1: pick your shooter' : 'Pick your shooter';
  setScreen('select');
}
document.querySelectorAll('.card').forEach((c) => c.onclick = () => {
  Snd.click(); const ch = c.dataset.char;
  if (S.mode === 'pass') {
    S.players.push({ char: ch, label: 'P' + (picking + 1), cpu: false, score: null }); picking++;
    if (picking < 2) { $('selTitle').textContent = 'Player 2: pick your shooter'; c.classList.add('taken'); focusFirst(); return; }
  } else {
    S.players.push({ char: ch, label: 'YOU', cpu: false, score: null });
    if (S.mode === 'cpu') S.players.push({ char: ch === 'hakeem' ? 'clyde' : 'hakeem', label: 'CPU', cpu: true, score: null });
  }
  beginTurn(0);
});
$('selBack').onclick = () => { Snd.click(); setScreen('title'); };

function beginTurn(i) {
  S.turn = i; S.cur = S.players[i];
  if (i > 0 && !S.cur.cpu) {
    $('hoTitle').textContent = S.cur.label === 'P2' ? 'Player 2, you\'re up!' : 'Your turn!';
    $('hoSub').textContent = 'Pass the phone to ' + (S.cur.label === 'P2' ? 'Player 2' : 'the next shooter') + '. Beat ' + S.players[0].score + '!';
    resetRound(); setScreen('handoff'); return;
  }
  resetRound(); startRound();
}
$('hoGo').onclick = () => { Snd.click(); startRound(); };

function resetRound() {
  S.time = ROUND_TIME; S.rack = 0; S.ball = 0; S.score = 0; S.shots = []; S.over = false;
  S.phase = 'ready'; S.phaseT = 0; S.charging = false; S.holdT = 0; S.reloadT = 0.6; S.cpuNext = 1.0;
  balls.forEach((b) => { b.active = false; b.s.visible = b.sh.visible = false; });
  camFor(0, camPos, camLook); placeShooter(0, 0); setPose('set');
  const c = S.cur; $('sbName').textContent = (c.cpu ? 'CPU ' : (S.mode === 'pass' ? c.label + ' ' : '')) + CHARS[c.char].name.toUpperCase();
  const opp = S.players.find((p) => p !== c && p.score != null);
  $('sbOppWrap').classList.toggle('hidden', !opp && S.mode === 'solo');
  if (S.mode === 'solo') { $('sbOppName').textContent = 'BEST'; $('sbOpp').textContent = S.best; $('sbOppWrap').classList.remove('hidden'); }
  else if (opp) { $('sbOppName').textContent = (opp.cpu ? 'CPU' : opp.label); $('sbOpp').textContent = opp.score; }
  else { $('sbOppName').textContent = S.players.length > 1 ? (S.players[1].cpu ? 'CPU' : S.players[1].label) : ''; $('sbOpp').textContent = '-'; }
  $('cpuTag').classList.toggle('hidden', !c.cpu); $('btnSkip').classList.toggle('hidden', !c.cpu);
  $('btnShoot').classList.toggle('hidden', c.cpu); $('shootZone').classList.toggle('hidden', c.cpu);
  S.sweetC = null; newSweet();
  $('meterFill').style.height = '0%'; $('board').classList.remove('low');
  shooter.material.rotation = 0; renderRack(); updateBoard();
}
// Each throw gets a fresh sweet spot at a random height (never too close to the last one).
function sweetWidth() { return CHARS[S.cur.char].sweet * (S.ball === PER_RACK - 1 ? 0.85 : 1); }
function newSweet() {
  const w = sweetWidth(), lo = SWEET_MIN + w / 2, hi = SWEET_MAX - w / 2; let c, n = 0;
  do { c = rand(lo, hi); n++; } while (S.sweetC != null && Math.abs(c - S.sweetC) < 0.16 && n < 20);
  S.sweetC = c; S.sweetW = w;
  const el = $('meterSweet'); el.style.bottom = ((c - w / 2) * 100) + '%'; el.style.height = (w * 100) + '%';
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}
function startRound() { Input.reset(); setScreen('play'); Snd.crowd(true); callout('GO!', 0); S.lastTick = 0; S.paused = false; }

function renderRack() {
  updateRacks();
  const el = $('rackBalls'); el.innerHTML = '';
  for (let i = 0; i < PER_RACK; i++) {
    const im = document.createElement('img'); im.src = ASSET(i === PER_RACK - 1 ? 'moneyball.png' : 'ball.png');
    if (i < S.ball) im.className = 'used'; else if (i === S.ball) im.className = 'next'; el.appendChild(im);
  }
  $('rackLabel').textContent = 'RACK ' + Math.min(S.rack + 1, RACKS) + ' / ' + RACKS;
}
function updateBoard() {
  $('sbScore').textContent = S.score; $('sbTime').textContent = Math.ceil(Math.max(0, S.time));
  $('board').classList.toggle('low', S.time <= 10 && S.time > 0);
}
let calloutTimer = 0;
function callout(text, color) {
  const el = $('callout'); el.textContent = text; el.style.color = color || '';
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

// ---------- shooter placement / poses ----------
const shooterBase = new THREE.Vector3();
function placeShooter(i, jump) {
  const p = spotPos(i); const u = new THREE.Vector3(-p.x, 0, -p.z).normalize(); const r = new THREE.Vector3(-u.z, 0, u.x);
  shooterBase.copy(p).addScaledVector(r, -0.1);
  shooter.position.copy(shooterBase); shooter.position.y = jump || 0;
  shooterShadow.position.set(shooterBase.x, 0.02, shooterBase.z);
}
let pose = 'set';
function setPose(p) {
  pose = p; const name = S.cur.char + '_' + p + '.png'; shooter.material.map = TEX[name]; shooter.material.needsUpdate = true;
  const sz = IMG_SIZE[name], H = 2.25; shooter.scale.set(H * sz[0] / sz[1], H, 1);
}

// ---------- shooting ----------
function gradeRelease(v, sweet) {
  const d = v - S.sweetC, h = sweet / 2;
  if (Math.abs(d) <= h) return 'perfect';
  if (Math.abs(d) <= h + 0.09) return Math.random() < 0.62 ? 'good' : (d < 0 ? 'rimShort' : 'rimLong');
  return d < 0 ? 'short' : 'long';
}
function fire(v) {
  const c = S.cur, money = S.ball === PER_RACK - 1;
  const sweet = S.sweetW;
  const g = gradeRelease(v, sweet);
  const made = g === 'perfect' || g === 'good';
  const pts = made ? (money ? 2 : 1) : 0;
  const b = balls.find((x) => !x.active) || balls[0];
  const p = shooterBase.clone(); const u = new THREE.Vector3(-p.x, 0, -p.z).normalize(); const r = new THREE.Vector3(-u.z, 0, u.x);
  const start = p.clone().addScaledVector(u, 0.25).addScaledVector(r, 0.18); start.y = 2.85;
  b.s.material.map = money ? moneyTex : ballTex; b.s.material.needsUpdate = true;
  b.active = true; b.s.visible = b.sh.visible = true; b.money = money; b.pts = pts; b.scored = false; b.u = u; b.r = r;
  b.pos = start.clone(); b.t = 0; b.spin = (Math.random() < 0.5 ? -1 : 1) * rand(6, 10); b.free = false; b.life = 0; b.bounces = 0;
  // build path segments
  const segs = [];
  const T = rand(1.0, 1.1);
  if (g === 'perfect') { segs.push({ to: RIM.clone().add(new THREE.Vector3(0, 0.02, 0)), T, ev: 'swish' }); }
  else if (g === 'good') {
    const front = RIM.clone().addScaledVector(u, -RIM_R * 0.85).addScaledVector(r, rand(-0.08, 0.08)); front.y += BALL_R * 0.6;
    segs.push({ to: front, T, ev: 'rim' });
    const up = RIM.clone().addScaledVector(r, rand(-0.04, 0.04)); up.y += 0.02; segs.push({ to: up, T: 0.38, ev: 'in' });
  } else if (g === 'rimShort' || g === 'short') {
    const front = RIM.clone().addScaledVector(u, -RIM_R * (g === 'short' ? 1.25 : 0.95)).addScaledVector(r, rand(-0.1, 0.1)); front.y += g === 'short' ? -0.25 : BALL_R * 0.5;
    segs.push({ to: front, T: T * (g === 'short' ? 0.95 : 1), ev: g === 'short' ? 'airball' : 'rimOut', bounce: g === 'short' ? null : u.clone().multiplyScalar(-1.6).addScaledVector(r, rand(-1, 1)).setY(2.2) });
  } else {
    const back = RIM.clone().addScaledVector(u, RIM_R + 0.12).addScaledVector(r, rand(-0.15, 0.15)); back.y += g === 'long' ? 0.5 : 0.08;
    segs.push({ to: back, T: T * 1.03, ev: g === 'long' ? 'boardOut' : 'rimOut', bounce: u.clone().multiplyScalar(g === 'long' ? -2.4 : -1.4).addScaledVector(r, rand(-1.2, 1.2)).setY(g === 'long' ? 0.8 : 2.4) });
  }
  b.segs = segs; b.seg = 0; startSeg(b);
  S.shots.push({ made, money, pts, v: +v.toFixed(3), c: +S.sweetC.toFixed(3) });
  const label = { perfect: 'SWISH!', good: 'IN!', rimShort: 'RIMMED OUT', rimLong: 'RIMMED OUT', short: 'TOO EARLY', long: 'TOO LATE' }[g];
  b.label = label; b.grade = g;
  Snd.release();
  S.ball++; if (S.ball >= PER_RACK) { S.rack++; S.ball = 0; S.moveT = S.rack < RACKS ? 0.55 : 0; S.moveFrom = S.rack - 1; }
  renderRack();
  return g;
}
function startSeg(b) {
  const sg = b.segs[b.seg]; const from = b.pos.clone(); const T = sg.T;
  sg.from = from; sg.v = sg.to.clone().sub(from).sub(new THREE.Vector3(0, 0.5 * G * T * T, 0)).divideScalar(T); b.t = 0;
}
function onSegEvent(b, sg) {
  const ev = sg.ev;
  if (ev === 'swish' || ev === 'in') {
    if (ev === 'swish') Snd.swish(); else Snd.rim();
    if (ev === 'swish' || ev === 'in') score(b);
    // fall through the net
    b.free = true; b.vel = new THREE.Vector3(0, -2.2, 0).addScaledVector(b.u, 0.25); b.netDrop = 0.35; return;
  }
  if (ev === 'rim') { Snd.rim(); return; }
  if (ev === 'airball') { b.free = true; b.vel = sg.v.clone().add(new THREE.Vector3(0, G * sg.T, 0)); miss(b, true); return; }
  if (ev === 'rimOut') Snd.rim(); if (ev === 'boardOut') Snd.board();
  b.free = true; b.vel = sg.bounce.clone(); miss(b, false);
}
function score(b) {
  if (b.scored) return; b.scored = true; S.score += b.pts; updateBoard();
  if (b.money) { callout('MONEY! +2', '#ffe066'); Snd.money(); Snd.cheer(true); }
  else { callout(b.label); Snd.cheer(false); }
  if (b.pts && S.cur && !S.cur.cpu) cheerPose();
}
function miss(b, air) { callout(b.label, '#ffb3a0'); if (air) Snd.groan(); }
let cheerT = 0;
function cheerPose() { cheerT = 0; }

function updateBall(b, dt) {
  if (!b.active) return;
  b.life += dt;
  if (!b.free) {
    const sg = b.segs[b.seg]; b.t += dt;
    const t = Math.min(b.t, sg.T);
    b.pos.copy(sg.from).addScaledVector(sg.v, t); b.pos.y += 0.5 * G * t * t;
    if (b.t >= sg.T) { onSegEvent(b, sg); if (!b.free) { b.seg++; if (b.seg < b.segs.length) startSeg(b); else b.free = true, b.vel = new THREE.Vector3(0, -1, 0); } }
  } else {
    if (b.netDrop > 0) { b.netDrop -= dt; b.vel.multiplyScalar(0.9); b.vel.y = -2.4; }
    else b.vel.y += G * dt;
    b.pos.addScaledVector(b.vel, dt);
    if (b.pos.y < BALL_R) { b.pos.y = BALL_R; if (Math.abs(b.vel.y) > 0.8) { Snd.bounce(Math.abs(b.vel.y) / 6); b.bounces++; } b.vel.y = Math.abs(b.vel.y) * 0.62; b.vel.x *= 0.8; b.vel.z *= 0.8; }
    if (b.life > 4.2 || (b.bounces > 3)) { b.active = false; b.s.visible = b.sh.visible = false; }
  }
  b.s.position.copy(b.pos); b.s.material.rotation += b.spin * dt;
  b.sh.position.set(b.pos.x, 0.03, b.pos.z); const hgt = clamp(b.pos.y / 4, 0, 1); b.sh.material.opacity = 0.7 * (1 - hgt); b.sh.scale.setScalar(0.6 + hgt);
  // draw order vs the two hoop layers (painted sprites, no depth): behind board / inside net / in front
  const toCam = camera.position.clone().sub(RIM).setY(0).normalize();
  const along = b.pos.clone().sub(RIM).setY(0).dot(toCam);
  const nearRim = Math.hypot(b.pos.x - RIM.x, b.pos.z - RIM.z) < RIM_R + 0.05 && b.pos.y < RIM.y + 0.15 && b.pos.y > RIM.y - 0.9;
  b.s.renderOrder = along < -0.25 ? 5 : nearRim ? 20 : 50;
}

// ---------- CPU ----------
function cpuThink(dt) {
  const c = CHARS[S.cur.char];
  if (S.phase === 'charge') {
    S.holdT += dt; const v = clamp(S.holdT / FILL_TIME, 0, 1.05); $('meterFill').style.height = (Math.min(v, 1) * 100) + '%';
    if (S.holdT >= S.cpuTarget * FILL_TIME) release(S.holdT / FILL_TIME);
    return;
  }
  S.cpuNext -= dt;
  if (S.cpuNext <= 0 && canShoot()) {
    // CPU plays by the same rules: aims at this throw's random sweet spot, sometimes early/late
    const roll = Math.random(), sw = S.sweetW, C = S.sweetC, sg = () => (Math.random() < 0.5 ? -1 : 1);
    S.cpuTarget = clamp(roll < 0.5 ? C + rand(-sw / 2.2, sw / 2.2) : roll < 0.78 ? C + sg() * rand(sw / 2 + 0.01, sw / 2 + 0.08) : C + sg() * rand(sw / 2 + 0.1, 0.25), 0.05, 1.05);
    beginCharge(); S.cpuNext = rand(0.15, 0.45);
  }
}

// ---------- round flow ----------
function canShoot() { return S.phase === 'ready' && S.reloadT <= 0 && S.moveT <= 0 && S.rack < RACKS && S.time > 0; }
function beginCharge() { S.phase = 'charge'; S.holdT = 0; setPose('shoot'); }
function release(v) {
  v = clamp(v, 0, 1.08);
  fire(v);
  setPose('follow'); S.phase = 'follow'; S.phaseT = 0; $('meter').classList.toggle('hit', Math.abs(v - S.sweetC) <= S.sweetW / 2);
}
function endRound() {
  if (S.over) return; S.over = true; Snd.buzzer(); callout('TIME!', '#ff7a5a');
  S.cur.score = S.score;
  setTimeout(() => {
    if (S.turn + 1 < S.players.length) { beginTurn(S.turn + 1); return; }
    showResults();
  }, 1700);
}
function showResults() {
  const rows = $('resRows'); rows.innerHTML = '';
  let top = Math.max(...S.players.map((p) => p.score)); const winners = S.players.filter((p) => p.score === top);
  S.players.forEach((p) => {
    const d = document.createElement('div'); if (S.players.length > 1 && winners.length === 1 && winners[0] === p) d.className = 'win';
    d.innerHTML = '<small>' + (S.mode === 'solo' ? 'SCORE' : (p.cpu ? 'CPU ' : p.label === 'YOU' ? 'YOU ' : p.label + ' ') + CHARS[p.char].name.toUpperCase()) + '</small><b>' + p.score + '</b>'; rows.appendChild(d);
  });
  let hero = S.players[0], title = 'Final Score', sub = '';
  if (S.mode === 'solo') {
    const p = S.players[0]; const nb = p.score > S.best; if (nb) { S.best = p.score; store.set('best', S.best); }
    title = nb ? 'New Best!' : 'Final Score'; sub = nb ? 'That\'s a new personal best.' : 'Best: ' + S.best + '. Max possible is 30.';
  } else if (winners.length > 1) { title = 'It\'s a Tie!'; sub = 'Run it back for the win.'; }
  else { hero = winners[0]; title = hero.cpu ? 'CPU Wins' : (hero.label === 'YOU' ? 'You Win!' : hero.label + ' Wins!'); sub = CHARS[hero.char].name + ' "' + CHARS[hero.char].nick + '" takes the shootout.'; }
  S.players.forEach((p) => { if (!p.cpu && p.score > S.best) { S.best = p.score; store.set('best', S.best); } });
  $('bestScore').textContent = 'Best ' + S.best;
  $('resHero').src = ASSET(hero.char + '_cheer.png'); $('resTitle').textContent = title; $('resSub').textContent = sub;
  setScreen('results');
}
$('resAgain').onclick = () => { Snd.click(); S.players.forEach((p) => p.score = null); beginTurn(0); };
$('resMenu').onclick = () => { Snd.click(); setScreen('title'); };
$('btnPause').onclick = () => pause();
function pause() { if (S.screen !== 'play' || S.over) return; S.paused = true; Input.reset(); setScreen('pause'); Snd.crowd(false); }
$('pResume').onclick = () => { Snd.click(); S.paused = false; setScreen('play'); Snd.crowd(true); };
$('pRestart').onclick = () => { Snd.click(); S.players.forEach((p) => p.score = null); beginTurn(0); };
$('pQuit').onclick = () => { Snd.click(); setScreen('title'); };
$('btnSkip').onclick = () => { // finish the CPU round instantly with a fair simulated score
  if (!S.cur || !S.cur.cpu || S.over) return;
  while (S.rack < RACKS) { const money = S.ball === PER_RACK - 1; const r = Math.random(); if (r < 0.62) S.score += money ? 2 : 1; S.ball++; if (S.ball >= PER_RACK) { S.rack++; S.ball = 0; } }
  balls.forEach((b) => { b.active = false; b.s.visible = b.sh.visible = false; });
  updateBoard(); renderRack(); endRound();
};

// ---------- menu gamepad / keyboard focus ----------
function visibleButtons() { const sc = document.querySelector('.screen.show'); return sc ? [...sc.querySelectorAll('button')].filter((b) => b.offsetParent && !b.classList.contains('hidden')) : []; }
function focusFirst() { setTimeout(() => { const b = visibleButtons().find((x) => !x.classList.contains('roundBtn')); if (b && S.screen !== 'play') b.focus({ preventScroll: true }); }, 30); }
let padPrev = {};
function menuPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; const p = [...pads].find((x) => x); if (!p) return;
  const btn = (i) => p.buttons[i] && p.buttons[i].pressed;
  const now = { a: btn(0), b: btn(1), l: btn(14) || p.axes[0] < -0.6, r: btn(15) || p.axes[0] > 0.6, u: btn(12) || p.axes[1] < -0.6, d: btn(13) || p.axes[1] > 0.6 };
  const edge = (k) => now[k] && !padPrev[k]; padPrev = now;
  const list = visibleButtons(); if (!list.length) return; let i = list.indexOf(document.activeElement);
  if (edge('r') || edge('d')) list[(i + 1 + list.length) % list.length].focus();
  if (edge('l') || edge('u')) list[(i - 1 + list.length) % list.length].focus();
  if (edge('a') && i >= 0) list[i].click();
}

// ---------- main loop ----------
let last = performance.now(), attract = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  Input.poll(); const inp = Input.consume();
  if (S.screen !== 'play' && S.screen !== 'pause') menuPad();
  if (S.screen === 'play' && !S.paused) {
    if (inp.pause) pause();
    stepGame(dt, inp);
  } else if (S.screen === 'pause' && inp.pause) { $('pResume').click(); }
  else if (S.screen === 'title' || S.screen === 'select') { // slow attract orbit behind the menus
    attract += dt * 0.12; const a = Math.sin(attract) * 1.1; const p = new THREE.Vector3(Math.sin(a) * 9.5, 3.2, Math.cos(a) * 9.5);
    camPos.copy(p); camLook.copy(RIM).setY(2.4);
  }
  for (const b of balls) if (S.screen === 'play' && !S.paused) updateBall(b, dt);
  // hoop yaw-billboard toward camera
  hoop.rotation.y = Math.atan2(camera.position.x - RIM.x, camera.position.z - RIM.z);
  camera.position.copy(camPos); camera.lookAt(camLook);
  renderer.render(scene, camera);
}
function stepGame(dt, inp) {
  const c = S.cur;
  if (!S.over) {
    S.time -= dt; updateBoard();
    const sec = Math.ceil(S.time); if (S.time <= 5 && S.time > 0 && sec !== S.lastTick) { S.lastTick = sec; Snd.tick(); }
    if (S.time <= 0) { S.time = 0; updateBoard(); if (S.phase === 'charge') { S.phase = 'ready'; setPose('set'); } endRound(); }
  }
  // rack move: walk to the next spot while the clock runs
  if (S.moveT > 0 && S.phase !== 'charge') {
    S.moveT -= dt;
    if (S.moveT <= 0) S.moveT = -0.85;
  }
  if (S.moveT < 0) {
    S.moveT += dt; const k = smooth(clamp(1 + S.moveT / 0.85, 0, 1));
    const a = new THREE.Vector3(), la = new THREE.Vector3(), b2 = new THREE.Vector3(), lb = new THREE.Vector3();
    camFor(S.moveFrom, a, la); camFor(S.rack, b2, lb); camPos.lerpVectors(a, b2, k); camLook.lerpVectors(la, lb, k);
    const pp = arcPos(lerp(SPOT_ANG[S.moveFrom], SPOT_ANG[S.rack], k));
    const u = new THREE.Vector3(-pp.x, 0, -pp.z).normalize(); const r = new THREE.Vector3(-u.z, 0, u.x); pp.addScaledVector(r, -0.1);
    shooterBase.copy(pp); shooter.position.set(pp.x, Math.abs(Math.sin(k * Math.PI * 5)) * 0.09, pp.z); shooter.material.rotation = Math.sin(k * Math.PI * 5) * 0.04; shooterShadow.position.set(pp.x, 0.02, pp.z);
    if (S.moveT >= 0) { S.moveT = 0; shooter.material.rotation = 0; placeShooter(S.rack, 0); renderRack(); }
  } else if (S.moveT > 0) { camFor(S.moveFrom, camPos, camLook); } else if (S.rack < RACKS) { camFor(S.rack, camPos, camLook); }
  if (S.over) { if (S.phase === 'follow') { S.phaseT += dt; if (S.phaseT > 0.3) { S.phase = 'ready'; setPose('set'); } } return; }
  // shooter state machine
  if (S.reloadT > 0) S.reloadT -= dt;
  if (c.cpu) cpuThink(dt);
  else {
    if (S.phase === 'ready' && (inp.pressed || (inp.down && S.wantShoot)) ) { if (canShoot()) { beginCharge(); S.wantShoot = false; } else S.wantShoot = inp.down; }
    if (!inp.down) S.wantShoot = false;
    if (S.phase === 'charge') {
      S.holdT += dt; const v = S.holdT / FILL_TIME; $('meterFill').style.height = (Math.min(v, 1) * 100) + '%';
      if (inp.released || !inp.down || v >= 1.08) release(v);
    }
  }
  // jump arc while charging/releasing
  let jump = 0;
  if (S.phase === 'charge') jump = Math.min(S.holdT / FILL_TIME, 1) * 0.38;
  if (S.phase === 'follow') { S.phaseT += dt; jump = Math.max(0, 0.38 * (1 - S.phaseT / 0.32)); if (S.phaseT > 0.36) { S.phase = 'ready'; S.reloadT = CHARS[c.char].reload; setPose('set'); $('meter').classList.remove('hit'); if (S.rack < RACKS) newSweet(); setTimeout(() => { if (S.phase === 'ready') $('meterFill').style.height = '0%'; }, 150); } }
  if (S.moveT >= 0) { shooter.position.y = jump; }
  // round complete when all 25 balls are up and settled
  if (S.rack >= RACKS && !balls.some((b) => b.active && !b.scored && !b.free) && S.phase === 'ready' && !S.over) {
    if (!S.allDoneT) S.allDoneT = 0; S.allDoneT += dt;
    if (S.allDoneT > 1.0) { S.allDoneT = 0; endRound(); }
  }
}

// ---------- boot ----------
buildRacks();
camFor(0, camPos, camLook);
placeShooter(0, 0); S.cur = { char: 'hakeem' }; setPose('set');
THREE.DefaultLoadingManager.onLoad = () => { $('loading').classList.add('hidden'); };
setTimeout(() => $('loading').classList.add('hidden'), 6000);
setScreen('title');
requestAnimationFrame(frame);
window.__game = { S, release, fire, setScreen, startSelect, beginTurn, gradeRelease };
