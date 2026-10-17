// Ball-and-stick molecule (a benzene ring with an isobutyl-style side chain, ibuprofen-like),
// projected in perspective, depth-sorted and shaded, slowly rotating. Drag to spin.
const cv = document.getElementById('mol'), g = cv.getContext('2d');
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const atoms = [], bonds = [];
const add = (x, y, z, el) => atoms.push({ x, y, z, el }) - 1;
// ring
const ring = [];
for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ring.push(add(Math.cos(a) * 1, Math.sin(a) * 1, 0, 'C')); }
for (let i = 0; i < 6; i++) bonds.push([ring[i], ring[(i + 1) % 6], i % 2 ? 2 : 1]);
// side chain going out of plane + a carboxyl-like group on the opposite side
const c1 = add(2.4, 0.4, 0.7, 'C'), c2 = add(3.3, -0.5, -0.4, 'C'), c3 = add(4.6, -0.1, 0.2, 'N');
bonds.push([ring[0], c1, 1], [c1, c2, 1], [c2, c3, 1]);
const o1 = add(-2.3, 0.5, -0.6, 'C'), o2 = add(-3.2, 1.5, 0.2, 'O'), o3 = add(-3.0, -0.6, -1.3, 'O');
bonds.push([ring[3], o1, 1], [o1, o2, 2], [o1, o3, 1]);
const R = { C: [.34, '#141414', '#555'], N: [.4, '#0b6b57', '#3fb89c'], O: [.4, '#b3121d', '#ff6b6b'] };
let ay = 0, ax = -.35, drag = null, vy = .008;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
cv.onpointerdown = e => { drag = e.clientX; cv.setPointerCapture(e.pointerId); };
cv.onpointerup = () => drag = null;
cv.onpointermove = e => { if (drag != null) { vy = (e.clientX - drag) * .0008; ay += (e.clientX - drag) * .01; drag = e.clientX; } };
const proj = p => {
  let x = p.x - .6, y = p.y, z = p.z;
  let X = x * Math.cos(ay) + z * Math.sin(ay), Z = -x * Math.sin(ay) + z * Math.cos(ay);
  let Y = y * Math.cos(ax) - Z * Math.sin(ax); Z = y * Math.sin(ax) + Z * Math.cos(ax);
  const s = 1 / (1 - Z / 14), k = cv.width * 0.1;
  return { x: cv.width / 2 + X * k * s, y: cv.height / 2 + Y * k * s, z: Z, s };
};
function frame(t) {
  if (!drag && !still) { ay += vy; vy += (.008 - vy) * .02; }
  const ink = css('--ink'), accent = css('--accent');
  g.clearRect(0, 0, cv.width, cv.height);
  const P = atoms.map(proj);
  const items = [];
  bonds.forEach(([a, b, o]) => items.push({ z: (P[a].z + P[b].z) / 2, draw: () => stick(P[a], P[b], o, ink) }));
  P.forEach((p, i) => items.push({ z: p.z, draw: () => ball(p, atoms[i].el, ink, accent) }));
  items.sort((a, b) => a.z - b.z).forEach(i => i.draw());
  if (!still) requestAnimationFrame(frame);
}
function stick(a, b, order, ink) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  const w = 7 * (a.s + b.s) / 2, offs = order === 2 ? [-.28, .28] : [0];
  g.lineCap = 'round'; g.strokeStyle = ink; g.globalAlpha = .85;
  offs.forEach(o => { g.lineWidth = order === 2 ? w * .5 : w; g.beginPath();
    g.moveTo(a.x + nx * o * w * 1.3, a.y + ny * o * w * 1.3); g.lineTo(b.x + nx * o * w * 1.3, b.y + ny * o * w * 1.3); g.stroke(); });
  g.globalAlpha = 1;
}
function ball(p, el, ink, accent) {
  const [r0, base, hi] = R[el], r = r0 * cv.width * 0.1 * p.s;
  const base2 = el === 'C' ? ink : base === '#0b6b57' ? accent : base;
  const gr = g.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .1, p.x, p.y, r);
  gr.addColorStop(0, el === 'C' ? '#8a8a82' : hi); gr.addColorStop(1, base2);
  g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill();
  g.strokeStyle = ink; g.lineWidth = 2; g.globalAlpha = .35; g.stroke(); g.globalAlpha = 1;
}
frame(0);
