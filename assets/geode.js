/* Geode: interactive crystal background.
 *
 * Performance rules (the launcher must stay light on a modest laptop):
 * - a single 2D canvas, capped at 30 fps;
 * - frames are drawn only while something changes (light moving, a wave,
 *   a colour change); idle means one static frame and no work at all;
 * - pause() stops everything (window hidden, game running);
 * - prefers-reduced-motion and the "animated background" setting are honoured.
 */
(function () {
  'use strict';

  function Geode(canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext('2d', { alpha: false });
    const edges = document.createElement('canvas');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const S = 84, FRAME_MS = 33;
    let W = 0, H = 0, scale = 1, SIGMA2 = 1;
    let tris = [], light = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    let hue = 266, hueTarget = 266, waves = [], shards = [];
    let raf = 0, lastFrame = 0, paused = false, enabled = true, glintTimer = 0, resizeTimer = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    function size() {
      scale = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
      edges.width = canvas.width; edges.height = canvas.height;
      SIGMA2 = 2 * Math.pow(Math.max(W, H) * 0.34, 2);
      if (!light.x) { light = { x: W * 0.62, y: H * 0.28 }; target = { ...light }; }
    }

    function build() {
      const cols = Math.ceil(W / S) + 2, rows = Math.ceil(H / S) + 2, P = [];
      for (let r = 0; r <= rows; r++) {
        P.push([]);
        for (let c = 0; c <= cols; c++) {
          const edge = r === 0 || c === 0 || r === rows || c === cols;
          P[r].push({ x: (c - 1) * S + (edge ? 0 : rand(-.38, .38) * S), y: (r - 1) * S + (edge ? 0 : rand(-.38, .38) * S) });
        }
      }
      tris = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const a = P[r][c], b = P[r][c + 1], d = P[r + 1][c], e = P[r + 1][c + 1];
        const pair = (r + c) % 2 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
        for (const t of pair) {
          const ang = rand(0, Math.PI * 2), tilt = rand(.45, 1);
          tris.push({ p: t, cx: (t[0].x + t[1].x + t[2].x) / 3, cy: (t[0].y + t[1].y + t[2].y) / 3,
            nx: Math.cos(ang) * tilt, ny: Math.sin(ang) * tilt, base: rand(0, 1), j: (Math.random() * 3) | 0 });
        }
      }
      const g = edges.getContext('2d');
      g.setTransform(scale, 0, 0, scale, 0, 0);
      g.clearRect(0, 0, W, H);
      g.strokeStyle = 'rgba(196,181,253,0.06)'; g.lineWidth = 1; g.beginPath();
      for (const t of tris) { g.moveTo(t.p[0].x, t.p[0].y); g.lineTo(t.p[1].x, t.p[1].y); g.lineTo(t.p[2].x, t.p[2].y); g.closePath(); }
      g.stroke();
    }

    function palette() {
      const pal = [];
      for (let j = 0; j < 3; j++) {
        const h = hue + (j - 1) * 9, row = [];
        for (let k = 0; k < 40; k++) row.push('hsl(' + h.toFixed(1) + ' 56% ' + (5 + k * 0.85).toFixed(1) + '%)');
        pal.push(row);
      }
      return pal;
    }

    function draw() {
      const pal = palette();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = 'hsl(' + hue.toFixed(1) + ' 50% 5%)';
      ctx.fillRect(0, 0, W, H);
      for (const t of tris) {
        const dx = light.x - t.cx, dy = light.y - t.cy, d2 = dx * dx + dy * dy, dist = Math.sqrt(d2) || 1;
        const near = Math.exp(-d2 / SIGMA2);
        const facing = Math.max(0, (dx * t.nx + dy * t.ny) / dist);
        let b = t.base * 0.14 + near * (0.16 + facing * 0.5);
        for (const w of waves) {
          const band = Math.abs(Math.hypot(t.cx - w.x, t.cy - w.y) - w.r);
          if (band < 90) b += (1 - band / 90) * w.s * (0.35 + facing * 0.5);
        }
        ctx.fillStyle = pal[t.j][Math.min(39, (b * 39) | 0)];
        ctx.beginPath(); ctx.moveTo(t.p[0].x, t.p[0].y); ctx.lineTo(t.p[1].x, t.p[1].y); ctx.lineTo(t.p[2].x, t.p[2].y); ctx.closePath(); ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(edges, 0, 0);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (shards.length) {
        ctx.fillStyle = 'hsl(' + hue.toFixed(1) + ' 90% 82%)';
        for (const s of shards) {
          ctx.globalAlpha = Math.max(0, s.life);
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
          ctx.beginPath(); ctx.moveTo(0, -s.size); ctx.lineTo(s.size * .6, s.size * .5); ctx.lineTo(-s.size * .6, s.size * .5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      const v = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, Math.max(W, H) * .8);
      v.addColorStop(0, 'rgba(10,10,24,0)'); v.addColorStop(1, 'rgba(10,10,24,.75)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      if (opts.onLight) opts.onLight(light.x / W, light.y / H);
    }

    const busy = () =>
      Math.abs(light.x - target.x) > .5 || Math.abs(light.y - target.y) > .5 ||
      Math.abs(hue - hueTarget) > .3 || waves.length > 0 || shards.length > 0;

    function tick(now) {
      raf = 0;
      if (paused) return;
      if (now - lastFrame < FRAME_MS) { raf = requestAnimationFrame(tick); return; }
      const dt = Math.min(.06, (now - lastFrame) / 1000); lastFrame = now;
      const ease = 1 - Math.pow(.0015, dt);
      light.x += (target.x - light.x) * ease; light.y += (target.y - light.y) * ease;
      hue += (hueTarget - hue) * (1 - Math.pow(.02, dt));
      for (const w of waves) { w.r += w.v * dt; w.s = w.s0 * Math.max(0, 1 - w.r / w.max); }
      waves = waves.filter(w => w.s > .01);
      for (const s of shards) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt; s.rot += s.vr * dt; s.life -= dt * 1.1; }
      shards = shards.filter(s => s.life > 0);
      draw();
      if (busy()) raf = requestAnimationFrame(tick);
    }

    function kick() {
      if (!enabled || paused || raf) return;
      lastFrame = performance.now() - FRAME_MS;
      raf = requestAnimationFrame(tick);
    }

    function burst(x, y, power, withShards) {
      power = power || 1;
      if (!enabled) return;
      if (reduce) { waves.push({ x, y, r: 0, v: 2400, s0: .5 * power, s: .5, max: 500 }); kick(); return; }
      waves.push({ x, y, r: 0, v: 760 + 240 * power, s0: .9 * power, s: .9, max: Math.hypot(W, H) * (.55 + .25 * power) });
      const n = withShards ? Math.round(9 * power) : 0;
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(90, 260) * power;
        shards.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, rot: rand(0, 6), vr: rand(-6, 6), size: rand(3, 8), life: rand(.7, 1) });
      }
      kick();
    }

    function scheduleGlint() {
      clearTimeout(glintTimer);
      if (reduce) return;
      glintTimer = setTimeout(() => {
        if (enabled && !paused && !busy()) {
          waves.push({ x: Math.random() < .5 ? 0 : W, y: rand(0, H), r: 0, v: 520, s0: .26, s: .26, max: W * 1.1 });
          kick();
        }
        scheduleGlint();
      }, 8000);
    }

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { size(); build(); draw(); }, 150);
    });

    size(); build(); draw(); scheduleGlint();

    return {
      point(x, y) { target.x = x; target.y = y; kick(); },
      burst,
      setHue(h) {
        hueTarget = h;
        if (enabled) kick(); else { hue = h; draw(); }
      },
      pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
      resume() { if (!paused) return; paused = false; kick(); },
      setEnabled(on) {
        enabled = on;
        if (!on) { waves = []; shards = []; light = { ...target }; hue = hueTarget; draw(); } else kick();
      },
    };
  }

  window.Geode = Geode;
})();
