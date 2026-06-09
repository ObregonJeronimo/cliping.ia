// Motor de animación por timeline (Canvas 2D, determinístico, sin IA generativa).
// La UI (TimelineStudio) solo lo monta y le da controles. Mismo motor que despues va a Remotion.
export function createTimelineEngine(canvas, { onFrame } = {}) {


  // ---------- setup ----------
  const W = 405, H = 720;
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  // roundRect polyfill (por las dudas)
  if (!ctx.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }

  // ---------- math / easing ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (t, a, b) => clamp((t - a) / (b - a), 0, 1);     // progreso normalizado en [a,b]
  const eOutCubic = t => 1 - Math.pow(1 - t, 3);
  const eInCubic = t => t * t * t;
  const eInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const eOutBack = (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  const eOutElastic = t => (t === 0 || t === 1) ? t : Math.pow(2, -10 * t) * Math.sin((t - .075) * (2 * Math.PI) / .3) + 1;
  const smooth = t => t * t * (3 - 2 * t);
  const TAU = Math.PI * 2;

  // gradiente de acento reutilizable
  function accent(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#ff8a4c'); g.addColorStop(1, '#ff4f8b');
    return g;
  }
  function setShadow(color, blur, dy = 0) { ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetY = dy; }
  function noShadow() { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

  // ---------- fondo cinematográfico ----------
  const motes = Array.from({ length: 16 }, () => ({
    x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + .6,
    sp: Math.random() * 8 + 4, ph: Math.random() * TAU
  }));
  function drawBg(t) {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.34, 40, W * 0.5, H * 0.4, H * 0.9);
    g.addColorStop(0, '#241640'); g.addColorStop(0.5, '#150d28'); g.addColorStop(1, '#08060f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // glow que respira y se mueve lento
    const gx = W * 0.5 + Math.sin(t * 0.3) * 70, gy = H * 0.33 + Math.cos(t * 0.23) * 40;
    const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, 260);
    gl.addColorStop(0, 'rgba(255,90,140,0.10)'); gl.addColorStop(1, 'rgba(255,90,140,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    // partículas
    ctx.save();
    for (const m of motes) {
      const y = (m.y - t * m.sp) % (H + 20); const yy = y < -10 ? y + H + 20 : y;
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.5 + m.ph));
      ctx.beginPath(); ctx.fillStyle = `rgba(255,225,235,${0.10 * tw})`;
      ctx.arc(m.x, yy, m.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // viñeta
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  // ---------- iconos (paths vectoriales, dibujados al origen) ----------
  function drawBox(s, squash = 0) {
    // caja de producto, centrada en (0,0)
    ctx.save();
    ctx.scale(s * (1 + squash * 0.5), s * (1 - squash));
    const w = 88, h = 80, r = 16;
    setShadow('rgba(255,79,139,0.45)', 26, 8);
    ctx.fillStyle = accent(-w / 2, -h / 2, w / 2, h / 2);
    ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.fill();
    noShadow();
    // tapa + cinta
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h / 2 + 22); ctx.lineTo(w / 2 - 6, -h / 2 + 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -h / 2 + 4); ctx.lineTo(0, h / 2 - 6); ctx.stroke();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.roundRect(-w / 2 + 8, -h / 2 + 6, 26, 10, 5); ctx.fill();
    ctx.restore();
  }
  function drawWings(s, flap, fold = 0) {
    // dos alas arriba de la caja, batiendo
    const span = lerp(70, 18, fold);
    const up = Math.sin(flap) * 0.5 - 0.1;
    ctx.save(); ctx.scale(s, s);
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(dir * 30, -34);
      ctx.rotate(dir * (-0.5 + up));
      ctx.fillStyle = 'rgba(255,246,250,0.95)';
      setShadow('rgba(0,0,0,0.25)', 8, 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(dir * span * 0.6, -span * 0.7, dir * span, -span * 0.25);
      ctx.quadraticCurveTo(dir * span * 0.85, span * 0.18, dir * span * 0.35, span * 0.12);
      ctx.quadraticCurveTo(dir * span * 0.2, 0, 0, 0);
      ctx.fill();
      noShadow();
      // pluma interior
      ctx.strokeStyle = 'rgba(255,79,139,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dir * 6, 0); ctx.quadraticCurveTo(dir * span * 0.5, -span * 0.35, dir * span * 0.8, -span * 0.12); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function drawCart(s, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(255,246,250,0.95)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    setShadow('rgba(255,79,139,0.4)', 18, 4);
    // canasta
    ctx.beginPath();
    ctx.moveTo(-44, -28); ctx.lineTo(-30, -28); ctx.lineTo(-20, 16); ctx.lineTo(30, 16);
    ctx.lineTo(40, -14); ctx.lineTo(-26, -14);
    ctx.stroke(); noShadow();
    // ruedas
    ctx.fillStyle = 'rgba(255,246,250,0.95)';
    ctx.beginPath(); ctx.arc(-12, 30, 7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(24, 30, 7, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawHouse(s, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.scale(s, s);
    // cuerpo
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
    ctx.roundRect(-46, -6, 92, 70, 10); ctx.fill(); ctx.stroke();
    // techo
    ctx.fillStyle = accent(-56, -56, 56, -6);
    setShadow('rgba(255,79,139,0.4)', 18, 6);
    ctx.beginPath(); ctx.moveTo(-58, -4); ctx.lineTo(0, -56); ctx.lineTo(58, -4); ctx.closePath(); ctx.fill();
    noShadow();
    // puerta
    ctx.fillStyle = 'rgba(20,12,30,0.9)';
    ctx.roundRect(-14, 24, 28, 40, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.9)'; ctx.beginPath(); ctx.arc(7, 46, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // texto con escala desde minúsculo + sombra de marca
  function fxText(str, x, y, size, p, weight = 700, col = '#fff6f0') {
    if (p <= 0) return;
    const sc = lerp(0.06, 1, eOutBack(clamp(p, 0, 1)));
    ctx.save();
    ctx.globalAlpha *= clamp(p * 1.4, 0, 1);
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.font = `${weight} ${size}px "Inter",system-ui,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  // ---------- ESCENA 1: título (puntito → botón → barra → derretir → gota pinta título) ----------
  function sceneTitle(t) {
    const cx = W / 2, cy = H * 0.40;
    const appear = inv(t, 0.35, 0.6);

    // ----- el "objeto botón": círculo que crece y se vuelve pill -----
    let bw, bh;
    if (t < 1.05) { const p = clamp(inv(t, 0.4, 1.05), 0, 1); const sz = lerp(7, 56, eOutBack(p)); bw = bh = sz; }
    else { const p = clamp(inv(t, 1.05, 1.85), 0, 1); bw = lerp(56, 252, eOutBack(p)); bh = lerp(56, 74, eInOutCubic(p)); }
    const br = Math.min(bw, bh) / 2;

    const meltP = inv(t, 2.95, 3.85);
    const sink = lerp(0, 52, meltP * meltP);
    const meltAlpha = 1 - inv(t, 3.35, 3.9);
    const showBtn = t < 3.95;

    if (showBtn && meltAlpha > 0.001) {
      ctx.save();
      ctx.globalAlpha *= appear * meltAlpha;
      const bx = cx - bw / 2, by = cy - bh / 2 + sink;
      setShadow('rgba(255,79,139,0.5)', 30, 10);
      ctx.fillStyle = accent(bx, by, bx + bw, by + bh);
      // cuerpo del botón con fondo que se derrite (bordes inferiores caen)
      ctx.beginPath();
      ctx.moveTo(bx + br, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, br);
      // borde inferior con goteo
      const drip = meltP * 46;
      ctx.lineTo(bx + bw, by + bh - br);
      ctx.quadraticCurveTo(bx + bw * 0.78, by + bh + drip, bx + bw * 0.62, by + bh);
      ctx.quadraticCurveTo(bx + bw * 0.5, by + bh + drip * 1.6, bx + bw * 0.38, by + bh);
      ctx.quadraticCurveTo(bx + bw * 0.22, by + bh + drip, bx + br, by + bh);
      ctx.arcTo(bx, by + bh, bx, by, br);
      ctx.arcTo(bx, by, bx + bw, by, br);
      ctx.closePath(); ctx.fill();
      noShadow();
      // brillo superior
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.roundRect(bx + 10, by + 7, Math.max(0, bw * 0.4), Math.max(0, bh * 0.18), 6); ctx.fill();

      // barra de progresión dentro del botón
      const prog = inv(t, 1.95, 2.85);
      if (prog > 0 && meltP < 0.2) {
        const pad = 12, innerW = (bw - pad * 2) * eInOutCubic(prog);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.roundRect(bx + pad, by + bh - 16, Math.max(0, innerW), 7, 4); ctx.fill();
      }
      // título chico dentro
      const tin = inv(t, 1.45, 1.95);
      if (tin > 0 && meltP < 0.35) {
        ctx.globalAlpha *= (1 - meltP);
        ctx.font = `700 26px "Inter",system-ui,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff6f0';
        ctx.save(); ctx.translate(cx, cy + sink); ctx.scale(eOutBack(clamp(tin, 0, 1)) * 0.06 + 0.94, eOutBack(clamp(tin, 0, 1)) * 0.06 + 0.94);
        ctx.fillText('Sabor real', 0, 0); ctx.restore();
      }
      ctx.restore();
    }

    // ----- gota que cae y pinta -----
    const paintX = cx, paintY = H * 0.62;
    if (t > 3.5 && t < 4.5) {
      const dp = inv(t, 3.5, 4.15);
      const y = lerp(cy + sink + 30, paintY - 40, eInCubic(dp));
      ctx.save();
      ctx.fillStyle = accent(paintX - 10, y - 16, paintX + 10, y + 16);
      // teardrop
      ctx.beginPath();
      ctx.moveTo(paintX, y - 16);
      ctx.quadraticCurveTo(paintX + 11, y - 2, paintX + 8, y + 8);
      ctx.arc(paintX, y + 8, 8, 0, Math.PI);
      ctx.quadraticCurveTo(paintX - 11, y - 2, paintX, y - 16);
      ctx.fill();
      ctx.restore();
    }
    // impacto
    const imp = inv(t, 4.12, 4.5);
    if (imp > 0 && imp < 1) {
      ctx.save();
      ctx.globalAlpha *= (1 - imp);
      ctx.strokeStyle = 'rgba(255,160,120,0.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(paintX, paintY, lerp(4, 60, eOutCubic(imp)), 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // ----- título grande "pintado" progresivamente -----
    const pp = inv(t, 4.3, 5.7);
    if (pp > 0) {
      const titleY = paintY, fontSize = 58, half = fontSize * 0.62;
      const top = titleY - half, bot = titleY + half + 8;
      const front = lerp(top - 6, bot, eOutCubic(pp));
      ctx.save();
      // clip = de arriba al frente de pintura, con borde ondulado
      ctx.beginPath();
      ctx.moveTo(0, top - 30); ctx.lineTo(W, top - 30); ctx.lineTo(W, front);
      for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, front + Math.sin(x * 0.08 + t * 6) * 4);
      ctx.closePath(); ctx.clip();
      ctx.font = `800 ${fontSize}px "Inter",system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = accent(cx - 140, titleY - 30, cx + 140, titleY + 30);
      ctx.fillText('Sabor real', cx, titleY);
      ctx.restore();
      // goteos en el frente
      if (pp < 1) {
        ctx.save(); ctx.fillStyle = accent(cx - 40, front, cx + 40, front + 20);
        for (const dx of [-70, -10, 60]) {
          const len = 8 + (Math.sin(dx + t * 5) * 0.5 + 0.5) * 14;
          ctx.beginPath(); ctx.ellipse(cx + dx, front + len * 0.5, 3, len * 0.5, 0, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
    }

    // ----- subtítulos minúsculo → leíble -----
    fxText('Productos naturales', cx, H * 0.72, 22, inv(t, 5.2, 5.8), 600, '#e9d9e4');
    fxText('directo a tu casa', cx, H * 0.755, 22, inv(t, 5.45, 6.0), 600, '#e9d9e4');
  }

  // ---------- ESCENA 2: carrito → click → caja → alas → vuela → casa ----------
  function sceneCart(t) {
    const cx = W / 2, cy = H * 0.44;
    const hx = W * 0.72, hy = H * 0.64;

    // casa aparece antes de que llegue
    const hin = inv(t, 3.2, 4.1);
    if (hin > 0) {
      ctx.save(); ctx.translate(hx, hy);
      const s = lerp(0.2, 1, eOutBack(clamp(hin, 0, 1)));
      drawHouse(s, clamp(hin * 1.3, 0, 1)); ctx.restore();
    }

    // ----- fase carrito -----
    const cartIn = inv(t, 0.2, 0.85);
    const click = inv(t, 0.95, 1.2);
    const cartOut = inv(t, 1.25, 1.62);
    if (t < 1.7) {
      ctx.save(); ctx.translate(cx, cy);
      const grow = eOutBack(clamp(cartIn, 0, 1));
      const squashClick = Math.sin(clamp(click, 0, 1) * Math.PI) * 0.18;
      const shrink = lerp(1, 0.02, eInCubic(clamp(cartOut, 0, 1)));
      const sc = grow * shrink;
      // motion blur al achicarse rápido
      if (cartOut > 0 && cartOut < 1) {
        for (let i = 3; i >= 1; i--) {
          const tt = clamp(cartOut - i * 0.04, 0, 1);
          ctx.save(); ctx.globalAlpha *= 0.12; ctx.scale(1 - squashClick, 1 + squashClick);
          drawCart(grow * lerp(1, 0.02, eInCubic(tt))); ctx.restore();
        }
      }
      ctx.save(); ctx.scale(1 - squashClick, 1 + squashClick);
      drawCart(sc, 1 - inv(t, 1.5, 1.62));
      ctx.restore();
      ctx.restore();
      // cursor que hace click
      if (click > 0 && click < 1.2 && t < 1.3) {
        const px = cx + 26, py = cy + 18;
        ctx.save(); ctx.translate(px, py);
        ctx.globalAlpha *= clamp(1 - inv(t, 1.15, 1.35), 0, 1);
        // ripple
        const rp = inv(t, 0.98, 1.25);
        if (rp > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, lerp(2, 26, rp), 0, TAU); ctx.globalAlpha *= (1 - rp); ctx.stroke(); ctx.globalAlpha /= (1 - rp || 1); }
        // puntero
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a0a14'; ctx.lineWidth = 1.5;
        const tap = -Math.sin(clamp(click, 0, 1) * Math.PI) * 5;
        ctx.translate(0, tap);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 18); ctx.lineTo(5, 13); ctx.lineTo(9, 20); ctx.lineTo(12, 18); ctx.lineTo(8, 11); ctx.lineTo(14, 11); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    // ----- fase caja: crece, le salen alas, vuela a la casa -----
    const boxGrow = inv(t, 1.55, 2.3);
    if (boxGrow > 0) {
      const fly = inv(t, 3.0, 5.25);
      const land = inv(t, 5.25, 5.65);
      // posición a lo largo de una curva bezier
      let px = cx, py = cy, ang = 0;
      if (fly > 0) {
        const u = eInOutCubic(clamp(fly, 0, 1));
        const p0 = { x: cx, y: cy }, p1 = { x: cx + 30, y: cy - 150 }, p2 = { x: hx, y: hy - 70 };
        const mt = 1 - u;
        px = mt * mt * p0.x + 2 * mt * u * p1.x + u * u * p2.x;
        py = mt * mt * p0.y + 2 * mt * u * p1.y + u * u * p2.y;
        const dx = 2 * mt * (p1.x - p0.x) + 2 * u * (p2.x - p1.x);
        const dy = 2 * mt * (p1.y - p0.y) + 2 * u * (p2.y - p1.y);
        ang = Math.atan2(dy, dx) * 0.35; // banking suave
      }
      const grow = eOutBack(clamp(boxGrow, 0, 1));
      const sc = grow;
      const flap = t * 16;
      const fold = clamp(land, 0, 1);
      const squashLand = Math.sin(clamp(land, 0, 1) * Math.PI) * 0.22;

      // motion blur durante el vuelo rápido
      if (fly > 0.02 && fly < 0.98) {
        for (let i = 4; i >= 1; i--) {
          const uu = eInOutCubic(clamp(fly - i * 0.022, 0, 1));
          const p0 = { x: cx, y: cy }, p1 = { x: cx + 30, y: cy - 150 }, p2 = { x: hx, y: hy - 70 };
          const mt = 1 - uu;
          const gx = mt * mt * p0.x + 2 * mt * uu * p1.x + uu * uu * p2.x;
          const gy = mt * mt * p0.y + 2 * mt * uu * p1.y + uu * uu * p2.y;
          ctx.save(); ctx.globalAlpha *= 0.10; ctx.translate(gx, gy); ctx.rotate(ang); drawBox(sc * 0.92); ctx.restore();
        }
      }
      ctx.save();
      ctx.translate(px, py + (fly > 0 ? Math.sin(t * 8) * 3 : 0)); // bob al volar
      ctx.rotate(ang);
      if (boxGrow > 0.6 || fly > 0) drawWings(sc, flap, fold);
      drawBox(sc, squashLand);
      ctx.restore();
    }
  }

  // ---------- ESCENA 3: checklist con botones OK ----------
  function sceneList(t) {
    const cx = W / 2;
    fxText('Por qué Sabor real', cx, H * 0.24, 30, inv(t, 0.1, 0.7), 800);
    const items = ['Sin conservantes', 'Envío en el día', 'Precios claros', 'Atención humana'];
    const startY = H * 0.36, gap = 64;
    items.forEach((label, i) => {
      const d = 0.55 + i * 0.26;
      const rin = inv(t, d, d + 0.55);
      if (rin <= 0) return;
      const x = cx - 150, y = startY + i * gap;
      const slide = lerp(46, 0, eOutCubic(rin));
      ctx.save();
      ctx.globalAlpha *= clamp(rin * 1.5, 0, 1);
      ctx.translate(slide, 0);
      // tarjeta
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5;
      ctx.roundRect(x, y - 24, 300, 48, 14); ctx.fill(); ctx.stroke();
      // botón OK con check que se dibuja
      const okScale = eOutBack(clamp(inv(t, d + 0.1, d + 0.5), 0, 1));
      ctx.save(); ctx.translate(x + 30, y); ctx.scale(okScale, okScale);
      setShadow('rgba(55,211,154,0.5)', 14, 4);
      ctx.fillStyle = '#37d39a'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill(); noShadow();
      const ck = inv(t, d + 0.25, d + 0.6);
      ctx.strokeStyle = '#0a2218'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      const pts = [[-6, 0], [-2, 5], [7, -6]];
      ctx.moveTo(pts[0][0], pts[0][1]);
      if (ck > 0) {
        const seg1 = clamp(ck / 0.45, 0, 1), seg2 = clamp((ck - 0.45) / 0.55, 0, 1);
        ctx.lineTo(lerp(pts[0][0], pts[1][0], seg1), lerp(pts[0][1], pts[1][1], seg1));
        if (seg2 > 0) ctx.lineTo(lerp(pts[1][0], pts[2][0], seg2), lerp(pts[1][1], pts[2][1], seg2));
        ctx.stroke();
      }
      ctx.restore();
      // label
      ctx.font = `600 21px "Inter",system-ui,sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f0e7f0';
      ctx.fillText(label, x + 58, y);
      ctx.restore();
    });
  }

  // ---------- ESCENA 4: marca + CTA ----------
  function sceneOutro(t) {
    const cx = W / 2, cy = H * 0.42;
    // marca paint-in
    const bn = inv(t, 0.2, 1.05);
    if (bn > 0) {
      const fontSize = 56, half = fontSize * 0.62, top = cy - half, bot = cy + half;
      const front = lerp(top - 6, bot, eOutCubic(bn));
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, top - 30); ctx.lineTo(W, top - 30); ctx.lineTo(W, front);
      for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, front + Math.sin(x * 0.08 + t * 6) * 3);
      ctx.closePath(); ctx.clip();
      ctx.font = `800 ${fontSize}px "Inter",system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = accent(cx - 130, top, cx + 130, bot);
      ctx.fillText('Sabor real', cx, cy);
      ctx.restore();
    }
    // barra
    const bar = inv(t, 0.9, 1.4);
    if (bar > 0) { ctx.save(); ctx.fillStyle = accent(cx - 60, 0, cx + 60, 0); ctx.roundRect(cx - 60 * eOutCubic(bar), cy + 44, 120 * eOutCubic(bar), 5, 3); ctx.fill(); ctx.restore(); }
    // CTA
    const cta = inv(t, 1.1, 1.6);
    if (cta > 0) {
      const pulse = 1 + Math.sin(t * 4) * 0.025 * clamp(inv(t, 1.6, 1.8), 0, 1);
      const sc = eOutBack(clamp(cta, 0, 1)) * pulse;
      ctx.save(); ctx.translate(cx, cy + 110); ctx.scale(sc, sc);
      const w = 250, h = 64;
      setShadow('rgba(255,79,139,0.55)', 30, 10);
      ctx.fillStyle = accent(-w / 2, -h / 2, w / 2, h / 2);
      ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); noShadow();
      ctx.font = `700 25px "Inter",system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1a0a14';
      ctx.fillText('Visitá ahora  →', 0, 1);
      ctx.restore();
      // chispas al aparecer
      const burst = inv(t, 1.1, 1.55);
      if (burst > 0 && burst < 1) {
        ctx.save(); ctx.translate(cx, cy + 110);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU, d = lerp(20, 90, eOutCubic(burst));
          ctx.globalAlpha = (1 - burst) * 0.9;
          ctx.fillStyle = i % 2 ? '#ff8a4c' : '#ff4f8b';
          ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 3, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  // ---------- timeline / escenas ----------
  const SCENES = [
    { s: 0.0, e: 6.4, f: sceneTitle, label: '<b>Escena 1</b> · puntito → botón → barra → se derrite → gota → pinta el título' },
    { s: 6.4, e: 13.2, f: sceneCart, label: '<b>Escena 2</b> · carrito → click → caja → le salen alas → vuela → cae en la casa' },
    { s: 13.2, e: 17.4, f: sceneList, label: '<b>Escena 3</b> · checklist con botones OK' },
    { s: 17.4, e: 21.4, f: sceneOutro, label: '<b>Escena 4</b> · marca + CTA “Visitá ahora”' },
  ];
  const T = SCENES[SCENES.length - 1].e;

  function sceneEdge(t, s, e) {
    if (t < s || t > e) return 0;
    const fin = eInOutCubic(inv(t, s, s + 0.5));
    const fout = eInOutCubic(1 - inv(t, e - 0.5, e));
    return clamp(Math.min(fin, fout), 0, 1);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    drawBg(t);
    for (const sc of SCENES) {
      const a = sceneEdge(t, sc.s, sc.e);
      if (a <= 0) continue;
      // micro zoom de entrada/salida para sabor cinematográfico
      const local = t - sc.s, dur = sc.e - sc.s;
      const zin = lerp(1.04, 1, eOutCubic(inv(local, 0, 0.5)));
      const zout = lerp(1, 0.985, eInCubic(inv(local, dur - 0.5, dur)));
      const z = Math.min(zin, zout);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      sc.f(local);
      ctx.restore();
    }
  }


  // ---------- transporte ----------
  let playhead = 0, playing = true, speed = 1, last = performance.now(), raf = 0;
  function emit() {
    const cur = SCENES.find(sc => playhead >= sc.s && playhead < sc.e) || SCENES[SCENES.length - 1];
    if (onFrame) onFrame({ playhead, T, playing, label: cur.label });
  }
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05) * speed;
    last = now;
    if (playing) { playhead += dt; if (playhead >= T) playhead -= T; }
    draw(playhead);
    emit();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return {
    toggle() { playing = !playing; last = performance.now(); return playing; },
    play() { playing = true; last = performance.now(); },
    pause() { playing = false; },
    restart() { playhead = 0; last = performance.now(); },
    seek(frac) { playhead = clamp(frac, 0, 1) * T; if (!playing) { draw(playhead); emit(); } },
    setSpeed(s) { speed = s; },
    getDuration() { return T; },
    destroy() { cancelAnimationFrame(raf); },
  };
}
