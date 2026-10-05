/* ARUNA — "Wear ARUNA": a single scarf hanging in space, interactive (three.js r128, no external models). */
(() => {
'use strict';
const root = document.getElementById('tryon3d');
if (!root) return;
if (typeof THREE === 'undefined') { root.classList.add('nogl'); return; }

const PALETTES = {
  noir: { bg: '#f3ede2', fg: '#0d0b09' },
  sand: { bg: '#eadfc9', fg: '#8a6a43' },
  ash:  { bg: '#e9e6df', fg: '#4a4743' }
};
let pal = 'noir', windBase = .55;

/* ---------- renderer / scene ---------- */
const canvas = root.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, .1, 20);
scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3a2a1a, .9));
const key = new THREE.DirectionalLight(0xffd9a8, 1.7); key.position.set(2, 2.5, 3); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fb4ff, .7);  rim.position.set(-3, 1, -2); scene.add(rim);
const rig = new THREE.Group(); scene.add(rig);

/* ---------- scarf texture: keffiyeh-inspired weave with woven edge bands ---------- */
const TW = 512, TH = 768, CELL = 16;
const texCanvas = document.createElement('canvas'); texCanvas.width = TW; texCanvas.height = TH;
const scarfTex = new THREE.CanvasTexture(texCanvas);
scarfTex.anisotropy = 8; scarfTex.encoding = THREE.sRGBEncoding;
function paintTex() {
  const p = PALETTES[pal], g = texCanvas.getContext('2d'), s = CELL;
  g.fillStyle = p.bg; g.fillRect(0, 0, TW, TH); g.fillStyle = p.fg;
  for (let y = 0; y < TH / s; y++) for (let x = 0; x < TW / s; x++) {
    const px = x * s, py = y * s; g.beginPath();
    if ((x + y) % 2 === 0) { g.moveTo(px, py); g.lineTo(px + s * .7, py); g.lineTo(px + s, py + s * .4); g.lineTo(px + s * .3, py + s * .4); }
    else { g.moveTo(px + s * .3, py + s * .6); g.lineTo(px + s, py + s * .6); g.lineTo(px + s * .7, py + s); g.lineTo(px, py + s); }
    g.fill();
  }
  g.globalAlpha = .09; g.strokeStyle = p.fg; g.lineWidth = 1;                       // thread grain
  for (let i = 0; i < Math.max(TW, TH); i += 2) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, TH); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(TW, i); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = p.bg;                                            // clear border lanes, then draw bands
  g.fillRect(0, 0, 44, TH); g.fillRect(TW - 44, 0, 44, TH); g.fillRect(0, TH - 118, TW, 112);
  g.fillStyle = p.fg;
  g.fillRect(6, 0, 20, TH); g.fillRect(TW - 26, 0, 20, TH); g.fillRect(34, 0, 3, TH); g.fillRect(TW - 37, 0, 3, TH);
  g.fillRect(0, TH - 112, TW, 20); g.fillRect(0, TH - 84, TW, 4); g.fillRect(0, TH - 40, TW, 14);
  scarfTex.needsUpdate = true;
}
paintTex();
const scarfMat = new THREE.MeshStandardMaterial({ map: scarfTex, bumpMap: scarfTex, bumpScale: .45, roughness: .95, side: THREE.DoubleSide });
const fringeTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 8); g.fillStyle = '#fff'; for (let x = 0; x < 64; x += 4) g.fillRect(x, 0, 2, 8); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; })();
const fringeMat = new THREE.MeshStandardMaterial({ color: PALETTES.noir.bg, alphaMap: fringeTex, transparent: true, alphaTest: .45, side: THREE.DoubleSide, roughness: 1 });

/* ---------- the scarf ---------- */
const W = .72, H = 1.15, FH = .09, COLS = 40, ROWS = 64, ARC = 1.5, R = W / ARC;
const swing = new THREE.Group(); swing.position.y = H / 2; rig.add(swing);       // pivot = top edge
const geo = new THREE.PlaneGeometry(W, H, COLS, ROWS), pos = geo.attributes.position, N = pos.count;
const base = new Float32Array(N * 3), uu = new Float32Array(N), nn = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const u = pos.getX(i) / W + .5, n = .5 - pos.getY(i) / H;
  const a = (u - .5) * ARC * (1 - .2 * Math.pow(1 - n, 2.2));                   // gathered at the top
  const folds = (Math.sin(u * Math.PI * 9 + n * 2) * .016 + Math.sin(u * Math.PI * 21) * .005) * (.35 + (1 - n) * 1.6);
  base[i * 3] = R * Math.sin(a); base[i * 3 + 1] = -n * H; base[i * 3 + 2] = R * (Math.cos(a) - 1) + folds;
  uu[i] = u; nn[i] = n;
}
const cloth = new THREE.Mesh(geo, scarfMat); swing.add(cloth);
const fgeo = new THREE.PlaneGeometry(W, FH, COLS, 1), fpos = fgeo.attributes.position;
const fringe = new THREE.Mesh(fgeo, fringeMat); swing.add(fringe);

function animate(t, wind) {
  for (let i = 0; i < N; i++) {
    const n = nn[i], w = wind * Math.pow(n, 1.2), bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
    pos.setXYZ(i,
      bx + Math.sin(t * 1.3 + n * 3) * .014 * w,
      by + Math.abs(Math.sin(t * 1.7 + bx * 6)) * -.006 * w,
      bz + (Math.sin(t * 2.1 + n * 5 + uu[i] * 4) * .03 + Math.sin(t * 3.3 + n * 9 + bx * 30) * .01) * w);
  }
  pos.needsUpdate = true; geo.computeVertexNormals();
  const last = ROWS * (COLS + 1);
  for (let i = 0; i <= COLS; i++) {
    const x = pos.getX(last + i), y = pos.getY(last + i), z = pos.getZ(last + i), s = Math.sin(t * 2.4 + i * .55) * wind;
    fpos.setXYZ(i, x, y, z); fpos.setXYZ(COLS + 1 + i, x + s * .008, y - FH, z + s * .012);
  }
  fpos.needsUpdate = true;
}

/* ---------- interaction ---------- */
let yaw = .3, pitch = 0, vel = 0, drag = false, moved = 0, lastX = 0, lastY = 0, idleT = 0, gust = 0;
const look = { x: 0, y: 0 }, lookT = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', e => { drag = true; moved = 0; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
canvas.addEventListener('pointermove', e => {
  const b = canvas.getBoundingClientRect();
  lookT.x = ((e.clientX - b.left) / b.width - .5) * 2; lookT.y = ((e.clientY - b.top) / b.height - .5) * 2;
  if (!drag) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  yaw += dx * .008; vel = dx * .008; pitch = Math.max(-.25, Math.min(.25, pitch + dy * .004)); idleT = 0;
});
const endDrag = () => { if (!drag) return; drag = false; canvas.style.cursor = 'grab'; if (moved < 6) gust = 2.2; };   // tap = gust of wind
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { lookT.x = lookT.y = 0; });

const panel = root.parentElement;
panel.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
  pal = b.dataset.c; paintTex(); fringeMat.color.set(PALETTES[pal].bg); gust = 1.5;
  panel.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b));
}));
const windBtn = panel.querySelector('[data-wind]');
if (windBtn) windBtn.addEventListener('click', () => { windBase = windBase > 1 ? .55 : 1.5; windBtn.classList.toggle('on', windBase > 1); });

/* ---------- loop (renders only while the section is on screen) ---------- */
let visible = false, last = performance.now(), T = 0;
new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(tick); } }, { threshold: 0 }).observe(root);
function resize() {
  const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const tn = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), fh = (H + FH) * 1.14, fw = W * 1.5;
  camera.position.z = Math.max(fh / 2 / tn, fw / 2 / tn / camera.aspect);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(root);
rig.position.y = FH / 2;   // centre the scarf (fringe included) in the frame

function tick(now) {
  if (!visible) return;
  requestAnimationFrame(tick);
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt; idleT += dt;
  if (!drag) { yaw += vel; vel *= Math.exp(-dt * 4); if (idleT > 3) yaw += (Math.sin(T * .5) * .6 - yaw) * dt * .6; }
  rig.rotation.y = yaw; rig.rotation.x = pitch;
  const a = 1 - Math.exp(-dt * 5);
  look.x += (lookT.x - look.x) * a; look.y += (lookT.y - look.y) * a;
  gust *= Math.exp(-dt * 1.1);
  const wind = windBase + gust;
  swing.rotation.z = Math.sin(T * 1.1) * .02 * wind + look.x * .06;            // pendulum sway from the top edge, leans toward the cursor
  swing.rotation.x = Math.sin(T * .9 + 1) * .015 * wind + look.y * .05;
  animate(T, wind);
  renderer.render(scene, camera);
}
canvas.style.cursor = 'grab'; resize();
})();
