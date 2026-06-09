// engineCore.js — NUCLEO del motor de animacion por timeline (Canvas 2D, puro y determinista).
// drawFrame(ctx, t) dibuja el cuadro del tiempo t (segundos) en el espacio logico W x H.
// Lo usan los dos lados: el preview en vivo (engine.js) y la composicion de Remotion (MP4).
export const W = 405, H = 720;
let ctx = null;

// Acento de marca, variable por timeline. setAccent() lo cambia; por defecto, sunset vivo.
let A1 = '#ff8a4c', A2 = '#ff4f8b';
function _lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function setAccent(hex) {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) { A1 = hex; A2 = _lighten(hex, 0.3); }
  else { A1 = '#ff8a4c'; A2 = '#ff4f8b'; }
}

// FONDO por tema de marca: el ADN detecta el tema (organic-natural, ocean-deep, etc.) y el motor
// pinta un fondo acorde al rubro, no violeta para todo. Textos del motor son claros -> todos los
// fondos son oscuros pero con el HUE de la marca. El glow ambiente sale del acento de la marca.
const THEMES = {
  'organic-natural': { bg: ['#34291b', '#241c10', '#140e06'], mote: '255,240,210' },
  'sunset-warm':     { bg: ['#3a201a', '#251210', '#140807'], mote: '255,220,190' },
  'crimson-bold':    { bg: ['#3a121a', '#240a10', '#140509'], mote: '255,205,210' },
  'gold-lux':        { bg: ['#2c2614', '#1c170b', '#0f0c05'], mote: '255,238,190' },
  'berry-glow':      { bg: ['#2a1336', '#1a0c22', '#0c0512'], mote: '255,220,245' },
  'ocean-deep':      { bg: ['#0e3848', '#07242f', '#03141b'], mote: '200,240,255' },
  'clinical-formal': { bg: ['#16243f', '#0e162e', '#070c1b'], mote: '220,235,255' },
  'saas-explainer':  { bg: ['#1e2b40', '#11192a', '#070c16'], mote: '215,230,255' },
  'cyber-neon':      { bg: ['#101a2a', '#0a0f1c', '#05080f'], mote: '180,220,255' },
  'mono-ink':        { bg: ['#262626', '#161616', '#080808'], mote: '230,230,230' },
};
const THEME_DEFAULT = { bg: ['#202836', '#12161f', '#080a10'], mote: '225,232,245' };  // slate neutro (NO violeta)
let BG = THEME_DEFAULT.bg, MOTE = THEME_DEFAULT.mote;
function setTheme(name) {
  const p = THEMES[name] || THEME_DEFAULT;
  BG = p.bg; MOTE = p.mote;
}
function _rgba(hex, a) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(255,140,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}


  // roundRect polyfill (por las dudas)
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
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
    g.addColorStop(0, A1); g.addColorStop(1, A2);
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
    g.addColorStop(0, BG[0]); g.addColorStop(0.5, BG[1]); g.addColorStop(1, BG[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // glow que respira y se mueve lento — tinte del ACENTO de la marca (antes era rosa fijo)
    const gx = W * 0.5 + Math.sin(t * 0.3) * 70, gy = H * 0.33 + Math.cos(t * 0.23) * 40;
    const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, 260);
    gl.addColorStop(0, _rgba(A1, 0.12)); gl.addColorStop(1, _rgba(A1, 0));
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    // partículas (tinte segun tema)
    ctx.save();
    for (const m of motes) {
      const y = (m.y - t * m.sp) % (H + 20); const yy = y < -10 ? y + H + 20 : y;
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.5 + m.ph));
      ctx.beginPath(); ctx.fillStyle = `rgba(${MOTE},${0.10 * tw})`;
      ctx.arc(m.x, yy, m.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // viñeta
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
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
  function sceneTitle(t, p = {}) {
    const cx = W / 2, cy = H * 0.40;
    const appear = inv(t, 0.35, 0.6);

    // ----- el "objeto botón": círculo que crece y se vuelve pill -----
    let bw, bh;
    if (t < 1.05) { const p = clamp(inv(t, 0.4, 1.05), 0, 1); const sz = lerp(7, 56, eOutBack(p)); bw = bh = sz; }
    else { const p = clamp(inv(t, 1.05, 1.85), 0, 1); bw = lerp(56, 252, eOutBack(p)); bh = lerp(56, 74, eInOutCubic(p)); }
    const br = Math.min(bw, bh) / 2;

    const meltP = inv(t, 2.95, 3.85);
    const sink = lerp(0, 38, meltP * meltP);
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
      // borde inferior con UN goteo central limpio (no una ola amorfa)
      const drip = meltP * 30;
      ctx.lineTo(bx + bw, by + bh - br);
      ctx.quadraticCurveTo(bx + bw * 0.74, by + bh + drip * 0.5, bx + bw * 0.6, by + bh);
      ctx.quadraticCurveTo(bx + bw * 0.5, by + bh + drip * 1.7, bx + bw * 0.4, by + bh);
      ctx.quadraticCurveTo(bx + bw * 0.26, by + bh + drip * 0.5, bx + br, by + bh);
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
        ctx.fillText(p.title || '', 0, 0); ctx.restore();
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
      const _ttl = p.title || '';
      const titleY = paintY, fontSize = _ttl.length > 13 ? Math.max(34, 58 - (_ttl.length - 13) * 2.2) : 58, half = fontSize * 0.62;
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
      ctx.fillText(_ttl, cx, titleY);
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
    const _subs = p.subtitles || [];
    if (_subs[0]) fxText(_subs[0], cx, H * 0.72, 22, inv(t, 5.2, 5.8), 600, '#e9d9e4');
    if (_subs[1]) fxText(_subs[1], cx, H * 0.755, 22, inv(t, 5.45, 6.0), 600, '#e9d9e4');
  }

  // ---------- ESCENA 2: carrito → click → caja → alas → vuela → casa ----------
  function sceneCart(t, p = {}) {
    const cx = W / 2, cy = H * 0.44;
    const hx = W * 0.72, hy = H * 0.64;
    if (p.caption) fxText(p.caption, W / 2, H * 0.15, 23, inv(t, 0.3, 1.0), 600, '#f0e7f0');

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
  function sceneList(t, p = {}) {
    const cx = W / 2;
    fxText(p.title || '', cx, H * 0.24, (p.title || '').length > 18 ? 24 : 30, inv(t, 0.1, 0.7), 800);
    const items = (p.items || []).slice(0, 4);
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
  function sceneOutro(t, p = {}) {
    const cx = W / 2, cy = H * 0.42;
    // marca paint-in
    const bn = inv(t, 0.2, 1.05);
    if (bn > 0) {
      const _bn = p.brand || '';
      const fontSize = _bn.length > 13 ? Math.max(34, 56 - (_bn.length - 13) * 2.2) : 56, half = fontSize * 0.62, top = cy - half, bot = cy + half;
      const front = lerp(top - 6, bot, eOutCubic(bn));
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, top - 30); ctx.lineTo(W, top - 30); ctx.lineTo(W, front);
      for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, front + Math.sin(x * 0.08 + t * 6) * 3);
      ctx.closePath(); ctx.clip();
      ctx.font = `800 ${fontSize}px "Inter",system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = accent(cx - 130, top, cx + 130, bot);
      ctx.fillText(_bn, cx, cy);
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
      ctx.fillText((p.cta || 'Visitá ahora') + '  →', 0, 1);
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
  // ---------- timeline (DATOS) -> escenas ----------
  // Cada escena: { type, ...props, durationInFrames }. El motor mapea type -> dibujante y lo
  // renderiza con sus props. El contenido (texto / items / acento) viene de los DATOS, no horneado.
  // Asi la IA puede componer cualquier video escribiendo un timeline; el render es el mismo.
  // ESCENA: statement — una linea con gancho, revelado limpio (sin clipart). Las lineas suben/aparecen
  // escalonadas y un barrido de acento (mascara) subraya el bloque. Nativo de Canvas, premium, no generico.
  function sceneStatement(t, p = {}) {
    const text = p.text || '';
    if (!text) return;
    const cx = W / 2;
    const fs = text.length > 26 ? 30 : (text.length > 16 ? 36 : 42);
    ctx.font = `800 ${fs}px "Inter",system-ui,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // wrap por ancho
    const words = text.split(' ');
    const maxW = W * 0.82;
    const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    const lh = fs * 1.18;
    const topY = H * 0.42 - (lines.length * lh) / 2 + lh / 2;
    // lineas suben + aparecen escalonadas
    lines.forEach((ln, i) => {
      const start = 0.15 + i * 0.26;
      const pr = eOutCubic(inv(t, start, start + 0.55));
      if (pr <= 0) return;
      ctx.save();
      ctx.globalAlpha = pr;
      ctx.fillStyle = '#f3ecf7';
      ctx.fillText(ln, cx, topY + i * lh + (1 - pr) * 26);
      ctx.restore();
    });
    // barrido de acento que subraya el bloque
    const uStart = 0.15 + lines.length * 0.26 + 0.12;
    const up = eInOutCubic(inv(t, uStart, uStart + 0.5));
    if (up > 0) {
      const uy = topY + (lines.length - 1) * lh + fs * 0.72;
      const half = Math.min(maxW, ctx.measureText(lines[lines.length - 1]).width) / 2 + 6;
      ctx.save();
      ctx.fillStyle = accent(cx - half, uy, cx + half, uy);
      ctx.beginPath();
      ctx.roundRect(cx - half, uy, half * 2 * up, 5, 3);
      ctx.fill();
      ctx.restore();
    }
  }

  // ESCENA: bigStat — un numero que cuenta de 0 al valor + label debajo. El beat de "dato que impacta".
  // Solo con un numero REAL del sitio. Nativo de Canvas, limpio.
  function sceneBigStat(t, p = {}) {
    const cx = W / 2, cy = H * 0.42;
    const value = Number(p.value) || 0;
    const prog = eOutCubic(inv(t, 0.2, 1.7));
    const shown = value * prog;
    const dec = (value % 1 !== 0) ? 1 : 0;
    const body = shown.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const num = (p.prefix || '') + body + (p.suffix || '');
    const pop = lerp(0.72, 1, eOutCubic(inv(t, 0.1, 0.6)));
    ctx.save();
    ctx.globalAlpha = inv(t, 0.05, 0.4);
    ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
    ctx.font = '800 92px "Inter",system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = accent(cx - 130, cy, cx + 130, cy);
    ctx.fillText(num, cx, cy);
    ctx.restore();
    if (p.label) fxText(p.label, cx, cy + 84, 24, inv(t, 1.3, 1.9), 600, '#e9d9e4');
  }

  const DRAWERS = { paintTitle: sceneTitle, deliver: sceneCart, checklist: sceneList, outro: sceneOutro, statement: sceneStatement, bigStat: sceneBigStat };
  // Cuanto dura la COREOGRAFIA de cada escena (segundos). Pasado esto, el motor CONGELA el frame final
  // = tiempo de lectura. Asi: durationInFrames = animacion + lectura (mas largo = mas tiempo para leer).
  const ANIM_LEN = { paintTitle: 6.0, deliver: 6.4, checklist: 3.9, outro: 3.2, statement: 2.6, bigStat: 2.4 };
  const SCENE_LABELS = {
    paintTitle: '<b>paintTitle</b> · puntito -> boton -> barra -> se derrite -> gota -> pinta el titulo',
    deliver: '<b>deliver</b> · carrito -> click -> caja -> le salen alas -> vuela -> cae en la casa',
    checklist: '<b>checklist</b> · lista con botones OK',
    statement: '<b>statement</b> · linea con gancho + barrido de acento',
    bigStat: '<b>bigStat</b> · numero que impacta (cuenta de 0)',
    outro: '<b>outro</b> · marca + CTA',
  };

  // Timeline por defecto = la demo de siempre, ahora expresada como DATOS (render identico).
  const DEMO_TIMELINE = {
    brand: 'Sabor real', accent: '#ff5a8a',
    scenes: [
      { type: 'paintTitle', title: 'Sabor real', subtitles: ['Productos naturales', 'directo a tu casa'], durationInFrames: 240 },
      { type: 'statement', text: 'Del campo a tu mesa, sin vueltas', durationInFrames: 150 },
      { type: 'checklist', title: 'Por que Sabor real', items: ['Sin conservantes', 'Envio en el dia', 'Precios claros', 'Atencion humana'], durationInFrames: 192 },
      { type: 'outro', brand: 'Sabor real', cta: 'Visita ahora', durationInFrames: 150 },
    ],
  };

  function pickTimeline(tl) {
    return (tl && Array.isArray(tl.scenes) && tl.scenes.length) ? tl : DEMO_TIMELINE;
  }

  // Acumula los rangos [s,e] (segundos) de cada escena a partir de su durationInFrames.
  function layout(tl) {
    let cursor = 0; const out = [];
    for (const sc of (tl.scenes || [])) {
      const f = Math.max(30, sc.durationInFrames || 120);
      const d = f / 30;
      out.push({ ...sc, s: cursor, e: cursor + d });
      cursor += d;
    }
    return out;
  }

  function sceneEdge(t, s, e) {
    if (t < s || t > e) return 0;
    const fin = eInOutCubic(inv(t, s, s + 0.5));
    const fout = eInOutCubic(1 - inv(t, e - 0.5, e));
    return clamp(Math.min(fin, fout), 0, 1);
  }

  function drawFrame(c, t, timeline) {
    ctx = c;
    const tl = pickTimeline(timeline);
    setAccent(tl.accent);
    setTheme(tl.theme);
    ctx.clearRect(0, 0, W, H);
    drawBg(t);
    for (const sc of layout(tl)) {
      const a = sceneEdge(t, sc.s, sc.e);
      if (a <= 0) continue;
      const drawer = DRAWERS[sc.type];
      if (!drawer) continue;
      // micro zoom de entrada/salida para sabor cinematografico
      const local = t - sc.s, dur = sc.e - sc.s;
      // tiempo de LECTURA: la escena anima a velocidad natural hasta ANIM_LEN y despues congela
      // su frame final (queda quieto, legible) el resto de la escena.
      const animLen = ANIM_LEN[sc.type] || dur;
      const tFed = Math.min(local, animLen);
      const zin = lerp(1.04, 1, eOutCubic(inv(local, 0, 0.5)));
      const zout = lerp(1, 0.985, eInCubic(inv(local, dur - 0.5, dur)));
      const z = Math.min(zin, zout);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      drawer(tFed, sc);
      ctx.restore();
    }
  }

  function timelineDuration(timeline) {
    const s = layout(pickTimeline(timeline));
    return s.length ? s[s.length - 1].e : 0;
  }

  function beatAt(t, timeline) {
    const s = layout(pickTimeline(timeline));
    const cur = s.find(x => t >= x.s && t < x.e) || s[s.length - 1];
    if (!cur) return '';
    return cur.label || SCENE_LABELS[cur.type] || ('Escena · ' + cur.type);
  }

export { drawFrame, beatAt, timelineDuration, setAccent, setTheme, DEMO_TIMELINE };
