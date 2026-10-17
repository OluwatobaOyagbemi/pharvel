// Real 3D molecules from PubChem (public, CORS-enabled): conformer SDF + computed properties.
// Self-contained canvas renderer: ball-and-stick / space-filling, drag to rotate, optional hydrogens, synced rotation.
(() => {
  const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/';
  const CPK = { H: ['#ffffff', .24], C: ['#8a8a82', .4], N: ['#3b6fe0', .38], O: ['#e03b3b', .36], S: ['#e0c13b', .5], P: ['#f08a2c', .5], F: ['#6fd36f', .34], Cl: ['#2fb34f', .48], Br: ['#a5402b', .55], I: ['#7a2fb3', .6] };
  const cache = new Map();

  function parseSDF(t) {
    const L = t.split('\n'), nA = +L[3].slice(0, 3), nB = +L[3].slice(3, 6), atoms = [], bonds = [];
    for (let i = 0; i < nA; i++) { const p = L[4 + i].trim().split(/\s+/); atoms.push({ x: +p[0], y: +p[1], z: +p[2], el: p[3] }); }
    for (let i = 0; i < nB; i++) { const l = L[4 + nA + i]; bonds.push([+l.slice(0, 3) - 1, +l.slice(3, 6) - 1, +l.slice(6, 9)]); }
    const c = atoms.reduce((s, a) => ({ x: s.x + a.x / nA, y: s.y + a.y / nA, z: s.z + a.z / nA }), { x: 0, y: 0, z: 0 });
    atoms.forEach(a => { a.x -= c.x; a.y -= c.y; a.z -= c.z; });
    const R = Math.max(...atoms.map(a => Math.hypot(a.x, a.y, a.z))) + 1;
    return { atoms, bonds, R };
  }

  // Loads once per name; resolves {atoms,bonds,R,flat,props} or null when PubChem has nothing.
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const get = (url) => fetch(url).then(r => r.ok ? r : Promise.reject(r.status));
    const p = (async () => {
      const q = encodeURIComponent(name);
      let flat = false, sdf;
      try { sdf = await (await get(`${PUG}${q}/SDF?record_type=3d`)).text(); }
      catch { try { sdf = await (await get(`${PUG}${q}/SDF`)).text(); flat = true; } catch { return null; } }
      const mol = parseSDF(sdf); mol.flat = flat;
      try { mol.props = (await (await get(`${PUG}${q}/property/MolecularFormula,MolecularWeight,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount/JSON`)).json()).PropertyTable.Properties[0]; }
      catch { mol.props = {}; }
      return mol;
    })();
    cache.set(name, p); return p;
  }

  const viewers = new Set(); let raf = 0;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  class Viewer {
    // opts: {mode:'stick'|'fill', hydrogens:bool, sync:{ay,ax} shared object}
    constructor(canvas, mol, opts = {}) {
      Object.assign(this, { canvas, mol, mode: 'stick', hydrogens: false, sync: { ay: 0, ax: -.35 }, spin: !still }, opts);
      this.g = canvas.getContext('2d'); this.drag = null;
      canvas.onpointerdown = e => { this.drag = e.clientX; this.dy = e.clientY; this.spin = false; canvas.setPointerCapture(e.pointerId); };
      canvas.onpointerup = () => { this.drag = null; };
      canvas.onpointermove = e => { if (this.drag == null) return; this.sync.ay += (e.clientX - this.drag) * .012; this.sync.ax += (e.clientY - this.dy) * .012; this.drag = e.clientX; this.dy = e.clientY; this.draw(); };
      canvas.ondblclick = () => { this.spin = !this.spin && !still; };
      viewers.add(this); this.draw(); start();
    }
    destroy() { viewers.delete(this); }
    draw() {
      const { g, canvas: cv, mol } = this, W = cv.width, ink = css('--ink');
      g.clearRect(0, 0, W, cv.height);
      const { ay, ax } = this.sync, k = (Math.min(W, cv.height) * .5) / mol.R, fill = this.mode === "fill";
      const items = [], P = mol.atoms.map(a => {
        const X = a.x * Math.cos(ay) + a.z * Math.sin(ay), Z0 = -a.x * Math.sin(ay) + a.z * Math.cos(ay);
        const Y = a.y * Math.cos(ax) - Z0 * Math.sin(ax), Z = a.y * Math.sin(ax) + Z0 * Math.cos(ax), s = 1 / (1 - Z / (mol.R * 4));
        return { x: W / 2 + X * k * s, y: cv.height / 2 + Y * k * s, z: Z, s };
      });
      const show = i => this.hydrogens || mol.atoms[i].el !== 'H';
      if (!fill) mol.bonds.forEach(([a, b, o]) => { if (show(a) && show(b)) items.push({ z: (P[a].z + P[b].z) / 2 - .01, f: () => this.stick(P[a], P[b], o, ink, k) }); });
      P.forEach((p, i) => { if (show(i)) items.push({ z: p.z, f: () => this.ball(p, mol.atoms[i].el, ink, k, fill) }); });
      items.sort((a, b) => a.z - b.z).forEach(i => i.f());
    }
    stick(a, b, o, ink, k) {
      const g = this.g, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, w = k * .13 * (a.s + b.s) / 2;
      g.strokeStyle = ink; g.globalAlpha = .8; g.lineCap = 'round';
      (o > 1 ? [-.6, .6] : [0]).forEach(f => { g.lineWidth = o > 1 ? w * .55 : w; g.beginPath(); g.moveTo(a.x + nx * f * w, a.y + ny * f * w); g.lineTo(b.x + nx * f * w, b.y + ny * f * w); g.stroke(); });
      g.globalAlpha = 1;
    }
    ball(p, el, ink, k, fill) {
      const g = this.g, [col, r0] = CPK[el] || ['#cc66cc', .5], r = r0 * k * p.s * (fill ? 2.6 : .55);
      const gr = g.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .1, p.x, p.y, r);
      gr.addColorStop(0, '#fff'); gr.addColorStop(.25, col); gr.addColorStop(1, el === 'C' ? '#3a3a35' : col);
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, Math.max(r, 1.5), 0, 7); g.fill();
      g.strokeStyle = ink; g.globalAlpha = .3; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
    }
  }

  function start() {
    if (raf || still) return;
    const tick = () => {
      let any = false;
      viewers.forEach(v => { if (!v.canvas.isConnected) { viewers.delete(v); return; } if (v.spin && v.drag == null) { v.sync.ay += .006; any = true; } });
      viewers.forEach(v => v.draw());
      raf = viewers.size ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
  }

  window.Mol3D = { load, Viewer };
})();
