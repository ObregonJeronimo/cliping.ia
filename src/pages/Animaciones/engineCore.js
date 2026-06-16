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
  'organic-natural': { bg: ['#4f4230', '#3d3120', '#2b2114'], mote: '255,240,210' },
  'sunset-warm':     { bg: ['#4a2b22', '#341c17', '#22100c'], mote: '255,220,190' },
  'crimson-bold':    { bg: ['#48181f', '#300f15', '#1e070b'], mote: '255,205,210' },
  'gold-lux':        { bg: ['#3a321c', '#28200f', '#181206'], mote: '255,238,190' },
  'berry-glow':      { bg: ['#2a1336', '#1a0c22', '#0c0512'], mote: '255,220,245' },
  'ocean-deep':      { bg: ['#0e3848', '#07242f', '#03141b'], mote: '200,240,255' },
  'clinical-formal': { bg: ['#16243f', '#0e162e', '#070c1b'], mote: '220,235,255' },
  'saas-explainer':  { bg: ['#1e2b40', '#11192a', '#070c16'], mote: '215,230,255' },
  'cyber-neon':      { bg: ['#101a2a', '#0a0f1c', '#05080f'], mote: '180,220,255' },
  'mono-ink':        { bg: ['#262626', '#161616', '#080808'], mote: '230,230,230' },
};
const THEME_DEFAULT = { bg: ['#2a3240', '#1a1f2a', '#0e1118'], mote: '225,232,245' };  // slate neutro (NO violeta)
const THEME_NAMES = Object.keys(THEMES);   // para la seccion "Fondo" del sidebar (lab)
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
  const eOutBack = (t, s = 2.0) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);   // overshoot mas vivo
  const eOutElastic = t => (t === 0 || t === 1) ? t : Math.pow(2, -9 * t) * Math.sin((t - .1) * (2 * Math.PI) / .42) + 1;  // rebote mas lento/visible
  const smooth = t => t * t * (3 - 2 * t);
  const TAU = Math.PI * 2;
  let _holdT = 0;   // tiempo CONTINUO de la escena actual (para idle-loops durante el hold; el dibujo base usa tFed congelado)
  let _BRAND = '';  // nombre de marca del timeline (lo usa el eyebrow del statement para anclar el tercio superior)

  // ---------- aleatoriedad SEMBRADA (determinista, reemplaza Math.random) ----------
  // mulberry32: PRNG rapido y determinista. Misma semilla => misma secuencia, en cada corrida
  // y en cada hilo del render paralelo de Remotion (Math.random NO es reproducible y rompe el render).
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let r = Math.imul(a ^ (a >>> 15), 1 | a);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  // hash de string -> entero 32 bits (FNV-1a): deriva una semilla ESTABLE de la marca/tema/acento.
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    const s = String(str == null ? 'urvid' : str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // gradiente de acento reutilizable
  function accent(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, A1); g.addColorStop(1, A2);
    return g;
  }
  // MODO DE SOMBRA por estilo: 'soft' = glow difuso (premium) | 'hard' = sombra solida desplazada sin blur
  // (neo-brutalist / grafico plano). Es el switch barato que cambia toda la familia visual (lo confirma la
  // investigacion: shadowBlur 0 vs N).
  let SHADOW_MODE = 'soft';
  function setShadowMode(m) { SHADOW_MODE = (m === 'hard') ? 'hard' : 'soft'; }
  function setShadow(color, blur, dy = 0) {
    if (SHADOW_MODE === 'hard') { ctx.shadowColor = color; ctx.shadowBlur = 0; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = Math.max(5, dy + 4); }
    else { ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = dy; }
  }
  function noShadow() { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }

  // ---------- fondo FLUIDO (mesh-gradient + motes), SEMBRADO y determinista ----------
  // Toda la "materia prima" del fondo (posiciones, fases, frecuencias, amplitudes) sale de la SEMILLA
  // del timeline: misma marca => mismo fondo; marca distinta => fondo distinto. Cero Math.random => el
  // render paralelo de Remotion es reproducible. El movimiento es funcion pura de (t, seed).
  let SEED = 0, motes = [], blobs = [], grain = [];
  let BG_TEX = 'none';   // textura del fondo por rubro: grain | grain2 | grid | lines | none
  function setTexture(n) { BG_TEX = (typeof n === 'string' && n) ? n : 'none'; }
  // SUSTRATO por rubro: trama tenue de "materia" sobre TODO el lienzo (scanlines / contour-topo / dotgrid).
  // Suma identidad de rubro + unicidad por marca (frecuencia/fase sembradas) sin pisar el contenido (alpha bajo,
  // detras del texto). Determinista (SEED + CLK). 'none' = sin sustrato.
  let SUBSTRATE = 'none';
  function setSubstrate(n) { SUBSTRATE = (typeof n === 'string' && n) ? n : 'none'; }
  let BG_ENERGY = 1;     // energia/velocidad del mesh por rubro (rapido tech/fitness, sereno salud/inmob)
  function setEnergy(n) { BG_ENERGY = (typeof n === 'number' && isFinite(n)) ? clamp(n, 0.4, 2.2) : 1; }
  // SISTEMA DE FONDO por marca: rompe el "todos los videos tienen el mismo mesh". Cada estilo es un mundo
  // visual distinto. mesh (fluido Canva) | field (campo sobrio premium) | spotlight (luz de escenario,
  // editorial) | bands (bloques de color geometricos, bold) | aurora (cintas verticales que fluyen).
  let BG_STYLE = 'mesh';
  function setBgStyle(n) { BG_STYLE = (typeof n === 'string' && n) ? n : 'mesh'; }
  // SISTEMA DE FUENTES por estilo (rompe el "Inter para todo"): 3 roles. display = titular/hero/wordmark;
  // text = cuerpo/listas (siempre caption-safe); accent = numeros/indices (suele ser mono). Cada estilo
  // declara su set en style_catalog -> el timeline lo trae -> setFonts lo aplica. fontStr() arma el ctx.font.
  let FONT_DISPLAY = 'Space Grotesk', FONT_TEXT = 'Inter', FONT_ACCENT = 'JetBrains Mono';
  function setFonts(o) {
    FONT_DISPLAY = (o && o.fontDisplay) || 'Space Grotesk';
    FONT_TEXT = (o && o.fontText) || 'Inter';
    FONT_ACCENT = (o && o.fontAccent) || FONT_TEXT;
  }
  // arma el string de ctx.font segun rol ('d' display | 't' text | 'a' accent). Fallback acorde al rol.
  function fontStr(weight, size, role) {
    const f = role === 'd' ? FONT_DISPLAY : role === 'a' ? FONT_ACCENT : FONT_TEXT;
    const fb = role === 'a' ? 'ui-monospace,monospace' : 'system-ui,sans-serif';
    return `${weight} ${size}px "${f}",${fb}`;
  }
  // LOGO real de la marca: el RENDERER lo precarga (imagen) y llama setLogo ANTES de drawFrame (sync ->
  // determinista: nunca a mitad de carga). Si no hay logo (o es de baja calidad), queda el monograma/wordmark.
  let LOGO = null;
  function setLogo(img) { LOGO = (img && (img.width || img.naturalWidth)) ? img : null; }
  // FOTOS REALES del sitio (mismo contrato que el logo: el renderer las PRECARGA y llama setPhotos antes de
  // drawFrame -> determinista). Son la apuesta para que el video NO parezca plantilla: muestra el producto/
  // propiedad/local real, distinto por marca. Sin fotos -> las escenas caen a su render vectorial.
  let PHOTOS = [];
  function setPhotos(arr) { PHOTOS = Array.isArray(arr) ? arr.filter(im => im && (im.width || im.naturalWidth)) : []; }
  // cover-fit + Ken Burns determinista (zoom 1->1.1 + pan sembrado por SEED) -> dibuja la foto i llenando (x,y,w,h).
  function _drawPhoto(img, x, y, w, h, t, salt) {
    if (!img) return false;
    const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight; if (!iw || !ih) return false;
    const r = mulberry32(((SEED || 1) ^ (salt | 0) ^ 0x9F0) >>> 0);
    const dir = r() < 0.5 ? -1 : 1, ax = 0.5 + (r() - 0.5) * 0.3, ay = 0.42 + (r() - 0.5) * 0.2;   // ancla sembrada (sujeto seguro)
    const zoom = 1.0 + 0.1 * clamp(t / 6, 0, 1);                                                    // Ken Burns lento
    const cover = Math.max(w / iw, h / ih) * zoom, dw = iw * cover, dh = ih * cover;
    const panX = dir * (dw - w) * 0.12 * Math.sin(t * 0.15);
    const dx = x + (w - dw) * ax + panX, dy = y + (h - dh) * ay;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, Math.round(dx), Math.round(dy), Math.ceil(dw), Math.ceil(dh)); ctx.restore();   // redondeo anti sub-pixel shimmer en el Ken Burns lento
    return true;
  }
  // MOTIVO CONTEXTUAL del fondo segun el rubro (skyline, sparkline, vapor, pulso, botanico, circuito...).
  // Hace que el fondo HABLE del dominio del link, no un gradiente generico. Se dibuja tenue, detras del contenido.
  let MOTIF = '';
  function setMotif(n) { MOTIF = (typeof n === 'string' && n) ? n : ''; }
  // TONO del video: 'dark' (texto claro sobre fondo oscuro) | 'light' (editorial: texto oscuro sobre fondo
  // claro). Que ~parte de las marcas sean claras rompe fuerte el "todos los videos se parecen". INK/DIM =
  // colores de texto que se invierten; _accentInk = el acento usado como TEXTO, legible segun el tono.
  let TONE = 'dark', INK = '#fbf6ec', DIM = '#efe6d6';
  function setTone(n) {
    TONE = (n === 'light') ? 'light' : 'dark';
    if (TONE === 'light') { INK = '#1c1510'; DIM = '#564a3e'; }
    else { INK = '#fbf6ec'; DIM = '#efe6d6'; }
  }
  // acento legible como TEXTO/relleno-protagonico segun el tono del fondo (claro -> mas oscuro y saturado;
  // oscuro -> aclarado). Asi wordmark/CTA/numero contrastan en ambos tonos.
  function _accentInk(hex, amt) {
    const a = _hexToHsl(hex || A1 || '#3aa0ff');
    if (TONE === 'light') return _hslToHex(a.h, Math.min(0.94, a.s + 0.16), Math.max(0.3, Math.min(a.l, 0.4)));
    return _lighten(hex || A1, (amt == null ? 0.55 : amt) * 0.85);   // un punto menos pastel -> color mas rico (no "candy")
  }
  // relleno/borde de cards y paneles segun el tono (blanco translucido en oscuro, negro translucido en claro)
  function _panelFill() { return TONE === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.10)'; }
  function _panelStroke() { return TONE === 'light' ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.20)'; }
  // HSL <-> hex (para construir una paleta MULTI-COLOR a partir del acento de marca)
  function _hexToHsl(hex) {
    let r = 0, g = 0, b = 0;
    if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
      const n = parseInt(hex.slice(1), 16); r = ((n >> 16) & 255) / 255; g = ((n >> 8) & 255) / 255; b = (n & 255) / 255;
    }
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0; const l = (mx + mn) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h, s, l };
  }
  function _hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }
  // versión SATURADA del acento para el "dato que golpea" (numero de bigStat / CTA): asi en rubros
  // desaturados (grafito / finanzas sobrio) el elemento estrella igual tiene fuerza cromatica, sin
  // tocar el fondo sobrio del rubro.
  function _accentPop(hex) {
    const a = _hexToHsl(hex);
    // TONE-AWARE: en tono CLARO el "dato que golpea" (numero/CTA) iba claro -> bajo contraste sobre fondo claro.
    // Ahora en claro devuelve un acento OSCURO+saturado (contrasta); en oscuro, el acento claro de siempre (pop).
    if (TONE === 'light') return _hslToHex(a.h, Math.max(a.s, 0.72), clamp(Math.min(a.l, 0.4), 0.26, 0.4));
    return _hslToHex(a.h, Math.max(a.s, 0.62), clamp(Math.max(a.l, 0.55), 0, 0.64));
  }
  // paleta multi-hue ANCLADA en el acento de marca (generica para cualquier rubro): brand + analogos
  // + contraste casi-complementario + tinte del tema. Da "zonas de color" tipo Canva, no un unico glow.
  function _meshPalette() {
    const a = _hexToHsl(A1 || '#3aa0ff');
    const S = clamp(a.s || 0.6, 0.5, 0.85);
    const mk = (dh, l, s) => _hslToHex(a.h + dh, s == null ? S : s, l);
    const th = _hexToHsl((BG && BG[0]) ? BG[0] : '#223040');
    return [
      mk(0, 0.58), mk(30, 0.56), mk(-34, 0.55), mk(158, 0.6, clamp(a.s, 0.55, 0.9)),
      _hslToHex(th.h, clamp((th.s || 0.3) + 0.28, 0.4, 0.72), 0.5),
    ];
  }
  // RELOJ LENTO COMPARTIDO (F1): una sola frecuencia base para TODA la deriva lenta (camara + blobs del mesh
  // + marca de agua). Los osciladores lentos se snapean a ARMONICOS ENTEROS de CLK -> la diferencia entre dos
  // armonicos es otro armonico, asi el campo de movimiento queda COHERENTE y periodico (no "bate"/se va de fase
  // a la deriva, que era el micro-wobble que se leia como falta de fluidez). 0.025 rad/s = fundamental largo;
  // los multiplos 2..16 cubren exactamente el rango lento que ya usaba el motor (la sparkle rapida queda libre).
  const CLK = 0.025;
  const _harm = (rnd, lo, hi) => CLK * (lo + Math.floor(rnd() * (hi - lo + 1)));   // frecuencia = armonico entero [lo..hi] de CLK
  function _buildBg() {
    const rnd = mulberry32(SEED || 1);
    // motes: polvo fino que flota (base sembrada; reemplaza el Math.random sin semilla original).
    motes = Array.from({ length: 26 }, () => ({
      x: rnd() * W, y: rnd() * H, r: rnd() * 1.8 + 0.5,
      sp: rnd() * 7 + 3, ph: rnd() * TAU,
    }));
    // blobs del mesh-gradient: 7 manchas distribuidas en un ANILLO (evitan el centro -> color a los
    // lados y centro mas calmo para el texto). Cada una deriva lento y se funde de forma aditiva.
    // Posicion/color/tamano sembrados => fondo irrepetible por marca.
    blobs = Array.from({ length: 7 }, () => {
      const ang = rnd() * TAU, dist = 0.34 + 0.52 * rnd();
      return {
        bx: W / 2 + Math.cos(ang) * dist * W * 0.66,
        by: H / 2 + Math.sin(ang) * dist * H * 0.54,
        rad: H * (0.28 + 0.26 * rnd()),
        ax: 55 + rnd() * 120, ay: 70 + rnd() * 150,
        fx: _harm(rnd, 2, 8), fy: _harm(rnd, 2, 8),   // deriva en armonicos de CLK (antes continuo -> batia entre blobs y contra la camara)
        px: rnd() * TAU, py: rnd() * TAU,
        pi: Math.floor(rnd() * 5),   // indice de paleta (color resuelto al dibujar -> accent/tema en vivo)
        a: 0.17 + rnd() * 0.11,      // alpha mas contenido -> evita bandas demasiado brillantes (Aura)
      };
    });
    // grano sembrado (textura organica para rubros calidos; tinte del tema). Mas denso/visible.
    grain = Array.from({ length: 230 }, () => ({ x: rnd() * W, y: rnd() * H, a: 0.05 + rnd() * 0.08, r: 1.3 + rnd() * 0.9 }));
  }
  function setSeed(n) {
    const s = (typeof n === 'number' && isFinite(n)) ? (n >>> 0) : hashSeed(n);
    if (s === SEED && blobs.length) return;   // ya construido para esta semilla
    SEED = s; _buildBg();
  }
  // ---------- ESTILOS DE FONDO (cada uno un mundo visual; deterministas por SEED + t) ----------
  // 'mesh': zonas de color que derivan y se funden de forma aditiva (look Canva, el original).
  function _bgMesh(t, pal) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const cx = b.bx + Math.sin(t * b.fx * BG_ENERGY + b.px) * b.ax;
      const cy = b.by + Math.cos(t * b.fy * BG_ENERGY + b.py) * b.ay;
      const col = pal[b.pi % pal.length];
      const aa = b.a * 1.5;   // mas presencia -> el flujo de color del mesh se VE (no colapsa a dark plano)
      const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.rad);
      gl.addColorStop(0, _rgba(col, aa)); gl.addColorStop(0.5, _rgba(col, aa * 0.45)); gl.addColorStop(1, _rgba(col, 0));
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
  // 'field': premium sobrio -> un gran glow de acento a un lado + un analogo opuesto, muy suave.
  function _bgField(t, pal) {
    const rnd = mulberry32((SEED || 1) ^ 0x515);
    const side = rnd() < 0.5 ? 0.26 : 0.74, top = 0.30 + rnd() * 0.22;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gx = W * side + Math.sin(t * CLK * 3) * 22, gy = H * top + Math.cos(t * CLK * 2) * 18;   // deriva del glow en armonicos de CLK
    let gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, H * 0.88);
    gl.addColorStop(0, _rgba(pal[0], 0.30)); gl.addColorStop(0.5, _rgba(pal[0], 0.10)); gl.addColorStop(1, _rgba(pal[0], 0));
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    const hx = W * (1 - side), hy = H * (1.05 - top);
    gl = ctx.createRadialGradient(hx, hy, 0, hx, hy, H * 0.52);
    gl.addColorStop(0, _rgba(pal[1], 0.15)); gl.addColorStop(1, _rgba(pal[1], 0));
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // 'spotlight': editorial dramatico -> luz de escenario. Oscurece FUERTE alrededor y deja un cono
  // brillante (centro casi blanco-acento) desde un borde. Maximo contraste = se siente "de autor".
  function _bgSpotlight(t, pal) {
    const rnd = mulberry32((SEED || 1) ^ 0x5907);
    const fromTop = rnd() < 0.6;
    const px = fromTop ? W * (0.28 + rnd() * 0.44) : (rnd() < 0.5 ? -W * 0.06 : W * 1.06);
    const py = fromTop ? -H * 0.05 : H * (0.22 + rnd() * 0.3);
    // 1) oscurecer FUERTE todo menos el cono (negro real) -> el cono resalta, no queda embarrado
    const dk = ctx.createRadialGradient(px, py, H * 0.04, px, py, H * 0.92);
    dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(0.5, 'rgba(0,0,0,0.45)'); dk.addColorStop(1, 'rgba(8,8,11,0.86)');
    ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
    // 2) cono de luz: centro casi blanco-acento, cae rapido (no inunda)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const sw = 0.5 + Math.sin(t * 0.18) * 0.05;
    const gl = ctx.createRadialGradient(px, py, 0, px, py, H * (0.54 + sw * 0.14));
    // nucleo blanco-platino (independiente del rubro) -> la luz de escenario que DEFINE el estilo.
    // antes dependia de pal[0] (teal/acento desaturado) y se lavaba -> leia como grid plano generico.
    gl.addColorStop(0, 'rgba(246,248,251,0.85)');
    gl.addColorStop(0.2, _rgba(_lighten(pal[0], 0.4), 0.46));
    gl.addColorStop(0.55, _rgba(pal[0], 0.1));
    gl.addColorStop(1, _rgba(pal[0], 0));
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // 'bands': grafico/bold -> 3 bandas diagonales anchas de color que derivan lento.
  function _bgBands(t, pal) {
    const rnd = mulberry32((SEED || 1) ^ 0xBA2D);
    const ang = (-0.5 + rnd()) * 0.5;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(-W / 2, -H / 2);
    ctx.globalCompositeOperation = 'lighter';
    const n = 3, span = H * 1.5;
    for (let i = 0; i < n; i++) {
      const cy = ((i + 0.5) / n + Math.sin(t * CLK * 3 + i) * 0.04) * span - (span - H) / 2;   // vaiven de banda en armonico de CLK
      const bw = H * (0.15 + 0.06 * (((i * 53) % 7) / 7));
      const col = pal[[0, 3, 1][i % 3]];
      const gl = ctx.createLinearGradient(0, cy - bw, 0, cy + bw);
      gl.addColorStop(0, _rgba(col, 0)); gl.addColorStop(0.5, _rgba(col, 0.36)); gl.addColorStop(1, _rgba(col, 0));
      ctx.fillStyle = gl; ctx.fillRect(-W, cy - bw, W * 3, bw * 2);
    }
    ctx.restore();
  }
  // 'aurora': organico premium -> cintas verticales que ondulan (tipo aurora boreal).
  function _bgAurora(t, pal) {
    // aurora REAL: cortinas verticales MULTI-HUE (teal/verde/magenta/violeta) que ondulan y brillan sobre
    // el oscuro + un velo horizontal que las ata. Antes: 4 cintas monocromaticas casi planas (alpha 0.2)
    // -> el panel lo leia como "degradado marron liso, no hay aurora". Ahora el abanico de color es la firma.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const aH = _hexToHsl(A1 || '#3aa0ff');
    const hues = [aH.h, aH.h + 145, aH.h - 95, aH.h + 60, aH.h + 205];   // abanico tipo aurora boreal
    const n = 5;
    for (let i = 0; i < n; i++) {
      const baseX = (i + 0.5) / n * W + Math.sin(t * CLK * 6 + i * 1.7) * 72;   // ondulacion de cortina en armonico de CLK
      const w = W * (0.20 + 0.06 * (((i * 31) % 5) / 5));
      const col = _hslToHex(hues[i % hues.length], 0.72, 0.56);
      const gl = ctx.createLinearGradient(baseX - w, 0, baseX + w, 0);
      gl.addColorStop(0, _rgba(col, 0)); gl.addColorStop(0.5, _rgba(col, 0.3)); gl.addColorStop(1, _rgba(col, 0));
      ctx.fillStyle = gl; ctx.fillRect(baseX - w, 0, w * 2, H);
    }
    // velo/arco horizontal en el tercio superior (la "cinta" que define la aurora boreal)
    const ry = H * (0.26 + Math.sin(t * CLK * 4) * 0.03), rcol = _hslToHex(aH.h + 145, 0.7, 0.6);   // velo en armonico de CLK
    const rg = ctx.createLinearGradient(0, ry - H * 0.12, 0, ry + H * 0.12);
    rg.addColorStop(0, _rgba(rcol, 0)); rg.addColorStop(0.5, _rgba(rcol, 0.16)); rg.addColorStop(1, _rgba(rcol, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, ry - H * 0.12, W, H * 0.24);
    ctx.restore();
  }
  // 'blueprint': plano tecnico -> grilla fina + lineas mayores + glow de acento. Lee "arquitectonico/serio".
  function _bgBlueprint(t, pal) {
    // PLANO TECNICO: substrato azul + grilla CYAN + cota de dimension con ticks. El "blueprint" es AZUL por
    // definicion -> antes la grilla heredaba el acento del rubro (gold/etc) y leia como cartel con grilla, no
    // como plano. El rubro sigue presente via el motivo contextual + un glow de acento chico.
    // source-over (no multiply): LAMINA navy translucida que RECOLOREA el base hacia azul (multiply solo
    // oscurecia y el calido seguia dominando -> seguia leyendo marron). Recubre ~75% -> azul dominante.
    // ALMA: el substrato y la grilla toman el HUE DE LA MARCA (antes navy/cyan fijos -> una marca de comida
    // leia como plano de ingenieria). Sigue siendo OSCURO (luminancia baja) para no romper el contraste del texto,
    // y la GRILLA mantiene la identidad "blueprint"; solo cambia el color al del rubro.
    const _bH = _hexToHsl(A1 || '#3aa0ff'), _bS = clamp((_bH.s || 0.5) * 0.7, 0.28, 0.6);
    ctx.save();
    const bw = ctx.createLinearGradient(0, 0, W * 0.35, H);
    bw.addColorStop(0, _rgba(_hslToHex(_bH.h, _bS, 0.17), 0.80)); bw.addColorStop(1, _rgba(_hslToHex(_bH.h, _bS, 0.08), 0.88));
    ctx.fillStyle = bw; ctx.fillRect(0, 0, W, H); ctx.restore();
    const CY = _hslToHex(_bH.h, clamp((_bH.s || 0.5), 0.45, 0.85), 0.66);   // lineas de la grilla en un tono claro del mismo hue
    ctx.save();
    ctx.strokeStyle = _rgba(CY, 0.1); ctx.lineWidth = 1;
    const step = 34, off = (t * 4) % step; ctx.beginPath();
    for (let gx = -off; gx < W; gx += step) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    for (let gy = -off; gy < H; gy += step) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();
    ctx.strokeStyle = _rgba(CY, 0.22); ctx.lineWidth = 1.4; ctx.beginPath();
    for (let gx = -off; gx < W; gx += step * 5) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    for (let gy = -off; gy < H; gy += step * 5) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();
    ctx.strokeStyle = _rgba(CY, 0.3); ctx.lineWidth = 1.2; const dy = H * 0.13; ctx.beginPath();
    ctx.moveTo(W * 0.12, dy); ctx.lineTo(W * 0.52, dy);
    ctx.moveTo(W * 0.12, dy - 6); ctx.lineTo(W * 0.12, dy + 6);
    ctx.moveTo(W * 0.52, dy - 6); ctx.lineTo(W * 0.52, dy + 6); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gx2 = W * 0.78, gy2 = H * 0.26, gl = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, H * 0.5);
    gl.addColorStop(0, _rgba(pal[0], 0.16)); gl.addColorStop(1, _rgba(pal[0], 0));
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // 'brutalist': grafico crudo -> grilla gruesa + franja de acento solida a un borde (sin glow). Alto contraste.
  function _bgBrutalist(t, pal) {
    ctx.save();
    ctx.strokeStyle = _rgba('#ffffff', TONE === 'light' ? 0.07 : 0.06); ctx.lineWidth = 2;
    const step = 60; ctx.beginPath();
    for (let gx = 0; gx <= W; gx += step) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    for (let gy = 0; gy <= H; gy += step) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();
    const sw = W * 0.18;   // slab MAS ancho (masa cruda brutalist) - antes 0.14 leia como SaaS minimal
    ctx.fillStyle = _rgba(pal[0], 0.95); ctx.fillRect(0, 0, sw, H);   // franja de acento solida al borde izq
    ctx.fillStyle = _rgba(pal[3], 0.92); ctx.fillRect(W - 14, 0, 14, H);
    ctx.fillStyle = _rgba(pal[3], 0.85); ctx.fillRect(W - W * 0.26, H - H * 0.09, W * 0.26, H * 0.09);   // bloque duro inf-der
    ctx.restore();
  }
  // 'sunburst': retro -> rayos radiales calidos que rotan lento desde un punto alto.
  function _bgSunburst(t, pal) {
    // abanico de rayos que DOMINA como un poster 70s. Antes alpha 0.085 (invisible) + centro bajo ->
    // el panel lo leia como "minimal oscuro generico". Ahora rayos gruesos, contraste alterno y centro alto.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const cx2 = W * 0.5, cy2 = H * 0.2, rays = 24, rot = t * 0.04;
    for (let i = 0; i < rays; i += 2) {
      const a = rot + i / rays * TAU;
      ctx.fillStyle = _rgba(pal[i % 2 ? 1 : 0], i % 4 ? 0.2 : 0.12);
      ctx.beginPath(); ctx.moveTo(cx2, cy2);
      ctx.lineTo(cx2 + Math.cos(a - 0.085) * H * 1.45, cy2 + Math.sin(a - 0.085) * H * 1.45);
      ctx.lineTo(cx2 + Math.cos(a + 0.085) * H * 1.45, cy2 + Math.sin(a + 0.085) * H * 1.45);
      ctx.closePath(); ctx.fill();
    }
    // halo calido en el punto de fuga -> remata el look solar 70s
    const hg = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, H * 0.3);
    hg.addColorStop(0, _rgba(_lighten(pal[0], 0.35), 0.3)); hg.addColorStop(1, _rgba(pal[0], 0));
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // 'speedlines': deporte/urgencia -> estelas diagonales que corren.
  function _bgSpeedlines(t, pal) {
    const rnd = mulberry32((SEED || 1) ^ 0x59ED);
    ctx.save(); ctx.lineCap = 'round'; const n = 28, ang = -0.34, span = H * 1.8;
    for (let i = 0; i < n; i++) {
      const base = rnd(), y = -H * 0.4 + ((base * span + t * 230) % span);   // mas rapido = mas velocidad
      const x = rnd() * W, len = lerp(90, 360, rnd());                        // estelas mas largas
      ctx.globalAlpha = 0.26 + 0.54 * rnd(); ctx.lineWidth = 2.5 + rnd() * 5;
      ctx.strokeStyle = _rgba(rnd() < 0.5 ? pal[0] : pal[3], 1);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
    }
    // 2 destellos de acento BRILLANTES que cruzan en parallax -> el golpe de velocidad (lee deportivo)
    for (let k = 0; k < 2; k++) {
      const fx = ((t * (150 + k * 80) + k * W * 0.55) % (W * 1.5)) - W * 0.25;
      const fy = H * (0.3 + k * 0.4) + Math.sin(t + k) * 20, len = 420 - k * 120;
      ctx.globalAlpha = 0.55; ctx.lineWidth = 8 - k * 3; ctx.strokeStyle = _rgba(_lighten(pal[0], 0.32), 1);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len); ctx.stroke();
    }
    ctx.restore();
  }
  // 'halftone': riso tactil -> campo de puntos cuyo radio varia por gradiente (foco alto-izq).
  function _bgHalftone(t, pal) {
    // riso DUOTONO con misregistro: 2 tintas de hue distinto, la 2da corrida ~5px -> firma de serigrafia.
    // antes: 1 tinta, puntos chicos (r<=3.1) y tenues -> el panel lo leia como "rosa lavado minimal".
    const step = 18, drift = (t * 5) % step, fx = W * 0.35, fy = H * 0.34;
    const pass = (col, ox, oy, mul) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col;
      for (let gy = -drift + oy; gy < H + step; gy += step) for (let gx = -drift + ox; gx < W + step; gx += step) {
        const d = Math.hypot(gx - fx, gy - fy) / H, r = clamp(6.4 * (1 - d) * mul, 0.5, 6.4);
        ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    };
    pass(_rgba(pal[0], 0.36), 0, 0, 1);
    pass(_rgba(pal[3], 0.32), 5, 5, 0.8);   // 2da tinta de otro hue, corrida = misregistro riso
  }
  // 'broadcast': noticiero -> lower-third deslizante + ticker en loop + bug EN VIVO pulsante. MOTION incorporado
  // (nunca frame muerto) -> ideal para ofertas/urgencia/lanzamientos.
  function _bgBroadcast(t, pal) {
    ctx.save();
    const slide = clamp((t - 0.2) * 0.6, 0, 1);
    ctx.fillStyle = _rgba(pal[0], 0.9); ctx.fillRect(0, H * 0.7, W * slide, 5);            // regla de lower-third
    ctx.fillStyle = _rgba(pal[0], 0.14); ctx.fillRect(0, H * 0.928, W, 24);                // banda del ticker
    ctx.save(); ctx.beginPath(); ctx.rect(0, H * 0.928, W, 24); ctx.clip();                // ticker en loop
    ctx.fillStyle = _rgba(_lighten(pal[0], 0.3), 0.5); const tx = (t * 130) % 70;
    for (let x = -tx; x < W + 70; x += 70) ctx.fillRect(x, H * 0.928 + 9, 42, 6);
    ctx.restore();
    const pulse = 0.5 + 0.5 * Math.sin(t * 4.2);                                           // bug EN VIVO arriba-derecha
    setShadow(_rgba('#ff3b3b', 0.5), 10, 0); ctx.fillStyle = _rgba('#ff3b3b', 0.55 + 0.45 * pulse);
    ctx.beginPath(); ctx.arc(W - 42, H * 0.062, 5 + pulse * 1.5, 0, TAU); ctx.fill(); noShadow();
    ctx.restore();
  }
  // 'cyber': grilla en perspectiva que fluye al horizonte + glow neon + scanlines. Tech/glitch.
  function _bgCyber(t, pal) {
    const horizon = H * 0.4, vp = W * 0.5, neon = _lighten(pal[0], 0.25);
    ctx.save();
    ctx.strokeStyle = _rgba(neon, 0.2); ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {                                   // lineas de piso que se acercan (flujo)
      const f = (i + (t * 0.5) % 1) / 18, y = horizon + Math.pow(f, 2.3) * (H - horizon);
      ctx.globalAlpha = 0.05 + 0.2 * f; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 0.16;
    for (let gx = -6; gx <= 6; gx++) { ctx.beginPath(); ctx.moveTo(vp + gx * 13, horizon); ctx.lineTo(vp + gx * 96, H); ctx.stroke(); }   // radiales desde el VP
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';            // glow neon en el horizonte
    const g = ctx.createLinearGradient(0, horizon - 90, 0, horizon + 50);
    g.addColorStop(0, _rgba(pal[0], 0)); g.addColorStop(0.5, _rgba(neon, 0.24)); g.addColorStop(1, _rgba(pal[0], 0));
    ctx.fillStyle = g; ctx.fillRect(0, horizon - 90, W, 140); ctx.restore();
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.1)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.4); ctx.restore();   // scanlines
  }
  // 'hud': dashboard de vigilancia -> grilla utilitaria + corner-brackets + scanline sweep + crosshair que ronda.
  function _bgHud(t, pal) {
    const neon = _lighten(pal[0], 0.28);
    ctx.save();
    ctx.strokeStyle = _rgba(pal[0], 0.1); ctx.lineWidth = 1; const step = 44; ctx.beginPath();
    for (let x = 0; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
    const m = 26, L = 34; ctx.strokeStyle = _rgba(neon, 0.6); ctx.lineWidth = 2.4;
    const corner = (cx, cy, sx, sy) => { ctx.beginPath(); ctx.moveTo(cx + sx * L, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * L); ctx.stroke(); };
    corner(m, m, 1, 1); corner(W - m, m, -1, 1); corner(m, H - m, 1, -1); corner(W - m, H - m, -1, -1);
    const sy = ((t * 0.16) % 1) * H; ctx.fillStyle = _rgba(neon, 0.1); ctx.fillRect(0, sy, W, 38);   // sweep
    const chx = W * (0.5 + Math.sin(t * 0.3) * 0.18), chy = H * (0.32 + Math.cos(t * 0.23) * 0.1);   // crosshair que ronda
    ctx.strokeStyle = _rgba('#ff5a4d', 0.45); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(chx - 13, chy); ctx.lineTo(chx + 13, chy); ctx.moveTo(chx, chy - 13); ctx.lineTo(chx, chy + 13); ctx.stroke();
    ctx.beginPath(); ctx.arc(chx, chy, 9, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // CAPA CONTEXTUAL: motivo vectorial TENUE que evoca el rubro del link (no un gradiente generico). Detras
  // del contenido, baja opacidad, determinista por SEED + t. Esto hace que el fondo "hable" del dominio.
  function _drawMotif(rubro, t, pal) {
    // mas presencia + CONTRASTE: el color del motivo se aclara sobre fondo oscuro y se oscurece sobre claro
    // (antes era el acento al mismo hue que el fondo -> invisible: verde/verde, rojo/rojo). Tiene que LEERSE.
    const _mc = _accentInk(_resolveColor('accent'), 0.42);
    const col = _rgba(_mc, TONE === 'light' ? 0.2 : 0.24);
    const col2 = _rgba(_mc, TONE === 'light' ? 0.1 : 0.12);
    ctx.save();
    if (rubro === 'inmobiliaria') {
      const rnd = mulberry32((SEED || 1) ^ 0x5417); const baseY = H * 0.99; let x = -24;
      while (x < W + 24) {
        const bw = 28 + rnd() * 46, bh = 80 + rnd() * 210;
        ctx.fillStyle = col; ctx.fillRect(x, baseY - bh, bw, bh);
        ctx.fillStyle = col2; for (let wy = baseY - bh + 14; wy < baseY - 14; wy += 22) for (let wx = x + 7; wx < x + bw - 9; wx += 15) ctx.fillRect(wx, wy, 6, 10);
        x += bw + 9;
      }
    } else if (rubro === 'finanzas' || rubro === 'tech') {
      const rnd = mulberry32((SEED || 1) ^ 0x5417); const n = 7, y0 = H * 0.72, pts = [];
      for (let i = 0; i < n; i++) pts.push([W * 0.1 + i * (W * 0.8 / (n - 1)), y0 - (i / (n - 1)) * H * 0.32 - rnd() * 36 + 18]);
      const dp = clamp((t - 0.3) * 0.45, 0, 1);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n; i++) { const f = clamp(dp * (n - 1) - (i - 1), 0, 1); if (f <= 0) break; ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); }
      ctx.stroke();
      ctx.fillStyle = col; for (let i = 0; i < n; i++) if (dp * (n - 1) >= i) { ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 4.5, 0, TAU); ctx.fill(); }
    } else if (rubro === 'fitness') {
      // pulso/heartbeat PERSISTENTE (antes se ciclaba a casi cero y no se veia) + blip que lo recorre
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const y = H * 0.72, seg = [[0, 0], [0.3, 0], [0.4, -10], [0.46, 72], [0.52, -104], [0.58, 22], [0.66, 0], [1, 0]];
      ctx.beginPath(); ctx.moveTo(0, y);
      for (const s of seg) ctx.lineTo(W * s[0], y + s[1]);
      ctx.stroke();
      const bx = ((t * 0.22) % 1) * W;   // blip de luz que viaja por el pulso
      let by = y; for (let k = 1; k < seg.length; k++) { if (W * seg[k][0] >= bx) { const f = (bx - W * seg[k - 1][0]) / Math.max(1, W * (seg[k][0] - seg[k - 1][0])); by = y + lerp(seg[k - 1][1], seg[k][1], f); break; } }
      ctx.save(); ctx.globalAlpha *= 0.9; setShadow(col, 12, 0); ctx.fillStyle = _accentInk(_resolveColor('accent'), 0.5); ctx.beginPath(); ctx.arc(bx, by, 5, 0, TAU); ctx.fill(); noShadow(); ctx.restore();
    } else if (rubro === 'gastronomia') {
      // PLATO + cubiertos + vapor que sube (LEE como comida). Anclado abajo, fuera de la columna de texto.
      const cx = W * 0.5, cyP = H * 0.9, rp = H * 0.13;
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.ellipse(cx, cyP, rp, rp * 0.34, 0, 0, TAU); ctx.stroke();                 // borde del plato
      ctx.beginPath(); ctx.ellipse(cx, cyP, rp * 0.6, rp * 0.2, 0, 0, TAU); ctx.stroke();             // aro interno
      ctx.beginPath(); ctx.moveTo(cx - rp - 18, cyP - 16); ctx.lineTo(cx - rp - 18, cyP + 16); ctx.stroke();   // cuchillo
      ctx.beginPath(); ctx.moveTo(cx + rp + 18, cyP - 16); ctx.lineTo(cx + rp + 18, cyP + 16);                  // tenedor (mango)
      for (let k = -1; k <= 1; k++) ctx.moveTo(cx + rp + 18 + k * 5, cyP - 16), ctx.lineTo(cx + rp + 18 + k * 5, cyP - 6); ctx.stroke();
      ctx.strokeStyle = col2; ctx.lineWidth = 3; ctx.lineCap = 'round';   // vapor que sube del plato
      for (let i = -1; i <= 1; i++) { const bx = cx + i * rp * 0.5; ctx.beginPath(); let first = true; for (let yy = cyP - rp * 0.4; yy > cyP - rp * 2.0; yy -= 7) { const xx = bx + Math.sin(yy * 0.05 + t * 1.0 + i * 1.7) * 10; first ? (ctx.moveTo(xx, yy), first = false) : ctx.lineTo(xx, yy); } ctx.stroke(); }
    } else if (rubro === 'belleza' || rubro === 'salud') {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const bx = W * 0.82, by = H * 0.95, topY = H * 0.5;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 30, (by + topY) / 2, bx - 10, topY); ctx.stroke();
      ctx.fillStyle = col; for (let k = 0; k < 5; k++) { const ly = lerp(by - 30, topY + 20, k / 4), lx = bx - lerp(6, 12, k / 4) - (k % 2 ? 0 : 24); ctx.save(); ctx.translate(lx, ly); ctx.rotate((k % 2 ? -0.6 : 0.6) + Math.sin(t * 0.6 + k) * 0.08); ctx.beginPath(); ctx.ellipse(0, 0, 22, 9, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    } else if (rubro === 'moda') {
      // pliegues de tela / hilos drapeados (textil) -> LEE como moda, no como scanlines genericas invisibles.
      // antes: col2 (el tono mas tenue) + lineas planas full-width de 1.5px -> casi invisible.
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const y = H * (0.15 + i * 0.13);
        const sag = 28 + Math.sin(t * 0.5 + i * 0.9) * 13;   // la caida del pliegue respira
        const drift = Math.sin(t * 0.3 + i * 1.4) * 18;
        ctx.strokeStyle = i % 2 ? col2 : col; ctx.lineWidth = i % 2 ? 1.6 : 2.6;
        ctx.beginPath(); ctx.moveTo(-12, y); ctx.quadraticCurveTo(W * 0.5 + drift, y + sag, W + 12, y); ctx.stroke();
      }
    } else if (rubro === 'educacion') {
      // BIRRETE (graduation cap) anclado abajo -> "aprender / subir de nivel". Determinista, fuera del texto.
      const cx = W * 0.8, cyP = H * 0.84, bw2 = 52, bh2 = 19;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cyP - bh2); ctx.lineTo(cx + bw2, cyP); ctx.lineTo(cx, cyP + bh2); ctx.lineTo(cx - bw2, cyP); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + bw2 * 0.5, cyP + bh2 * 0.5); ctx.lineTo(cx + bw2 * 0.5, cyP + bh2 + 18); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + bw2 * 0.5, cyP + bh2 + 22, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = col2; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cyP + bh2 + 12, bw2 * 0.5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    } else {
      // DEFAULT (rubro no mapeado): lineas de contorno topografico tenues abajo -> identidad editorial sin gritar rubro.
      ctx.strokeStyle = col2; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const baseY = H * (0.82 + k * 0.06); ctx.beginPath(); let first = true; for (let x = -10; x <= W + 10; x += 12) { const yy = baseY + Math.sin(x * 0.012 + t * CLK * 8 + k * 1.3) * 14; first ? (ctx.moveTo(x, yy), first = false) : ctx.lineTo(x, yy); } ctx.stroke(); }
    }
    ctx.restore();
  }
  // FLOTANTES AMBIENTALES: objetos vectoriales que DERIVAN por la periferia y rellenan los vacios (pedido del
  // usuario: "sin morph, rellenar con objetos/movimiento"). Deterministas (mulberry32 por SEED), contextuales
  // por rubro, baja opacidad y fuera de la columna central de texto -> dan vida sin pisar la legibilidad.
  function _floaterShape(id, sz, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.4, sz * 0.13);
    if (id === 1) { ctx.beginPath(); ctx.arc(0, 0, sz * 0.3, 0, TAU); ctx.fill(); }                                  // punto
    else if (id === 2) { const s = sz * 0.5; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke(); }  // cruz
    else if (id === 3) { const s = sz * 0.55; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.87, s * 0.5); ctx.lineTo(-s * 0.87, s * 0.5); ctx.closePath(); ctx.stroke(); }  // triangulo
    else if (id === 4) { const s = sz * 0.45; ctx.strokeRect(-s, -s, s * 2, s * 2); }                               // cuadrado (ventana)
    else if (id === 5) { const s = sz * 0.62; ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); } ctx.stroke(); }  // destello 4 puntas
    else if (id === 6) { const s = sz * 0.5; ctx.beginPath(); ctx.moveTo(-s, -s * 0.4); ctx.lineTo(0, s * 0.4); ctx.lineTo(s, -s * 0.4); ctx.stroke(); }  // chevron
    else if (id === 7) { const s = sz * 0.42; ctx.beginPath(); ctx.rect(-s, -s * 0.2, s * 2, s * 1.2); ctx.moveTo(-s * 1.18, -s * 0.2); ctx.lineTo(0, -s * 1.15); ctx.lineTo(s * 1.18, -s * 0.2); ctx.stroke(); }  // casita
    else if (id === 8) { ctx.beginPath(); ctx.arc(0, 0, sz * 0.42, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, sz * 0.12, 0, TAU); ctx.fill(); }  // anillo + punto
    else { ctx.beginPath(); ctx.arc(0, 0, sz * 0.42, 0, TAU); ctx.stroke(); }                                       // 0: anillo
  }
  function _floaterShapes(rubro) {
    if (rubro === 'inmobiliaria') return [7, 4, 0];
    if (rubro === 'finanzas' || rubro === 'tech' || rubro === 'educacion') return [1, 2, 8, 4];
    if (rubro === 'gastronomia') return [0, 1, 5];
    if (rubro === 'fitness') return [6, 2, 8];
    if (rubro === 'belleza' || rubro === 'salud') return [5, 1, 0];
    if (rubro === 'moda') return [0, 2, 8];
    return [0, 2, 3, 4];
  }
  function _drawFloaters(t) {
    const shapes = _floaterShapes(MOTIF);
    const rnd = mulberry32(((SEED || 1) ^ 0x710A7) >>> 0);
    const col = _accentInk(_resolveColor('accent'), 0.42);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 16; i++) {
      const side = rnd() < 0.5 ? rnd() * 0.27 : 0.73 + rnd() * 0.27;   // a los LADOS, no en la columna de texto
      const x0 = side * W, y0 = rnd() * (H + 60), sp = 4 + rnd() * 10, amp = 10 + rnd() * 20, ph = rnd() * TAU;
      const sz = 7 + rnd() * 15, a = (TONE === 'light' ? 0.07 : 0.09) + rnd() * 0.06;
      const sid = shapes[Math.floor(rnd() * shapes.length)], rs = (0.06 + rnd() * 0.18) * (i % 2 ? 1 : -1);
      const x = x0 + Math.sin(t * CLK * 4 + ph) * amp;   // vaiven horizontal del flotante en armonico de CLK
      const y = ((y0 - t * sp) % (H + 60) + (H + 60)) % (H + 60) - 30;   // deriva vertical lenta con wrap
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(t * rs + ph);
      _floaterShape(sid, sz, col); ctx.restore();
    }
    ctx.restore();
  }
  // GRANO DE FILM sobre TODO (animado y determinista por frame) -> mata el look "vector 2D limpio" y sube
  // la percepcion premium (textura analogica). Determinista: misma (seed, frame) => mismo grano.
  function _filmGrain(t) {
    const fr = mulberry32(((SEED || 1) ^ (Math.floor(t * 24) * 0x9E3779B1)) >>> 0);
    ctx.save(); ctx.globalAlpha = TONE === 'light' ? 0.06 : 0.052;
    for (let i = 0; i < 300; i++) { ctx.fillStyle = fr() < 0.5 ? '#fff' : '#000'; ctx.fillRect(fr() * W, fr() * H, 1.2, 1.2); }
    ctx.restore();
  }
  // SUSTRATO: trama de materia sobre todo el lienzo, alpha bajo, detras del contenido. Identidad de rubro +
  // unicidad por marca (sembrado). Determinista (SEED + CLK). scanlines (tech/CRT) | contour (topo/organico) | dotgrid.
  function _drawSubstrate(t) {
    if (!SUBSTRATE || SUBSTRATE === 'none') return;
    const ink = _accentInk(_resolveColor('accent'), 0.42), a = TONE === 'light' ? 0.05 : 0.06;
    ctx.save();
    if (SUBSTRATE === 'scanlines') {
      ctx.strokeStyle = _rgba(ink, a); ctx.lineWidth = 1; ctx.beginPath();
      for (let y = 0; y < H; y += 4) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    } else if (SUBSTRATE === 'contour') {
      const rnd = mulberry32(((SEED || 1) ^ 0x5B57A) >>> 0);
      ctx.strokeStyle = _rgba(ink, a * 1.3); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const baseY = H * (0.1 + k * 0.16), amp = 16 + rnd() * 20, fr = 0.006 + rnd() * 0.006, ph = rnd() * 6.28; ctx.beginPath(); let first = true; for (let x = -10; x <= W + 10; x += 12) { const yy = baseY + Math.sin(x * fr + t * CLK * 6 + ph) * amp; first ? (ctx.moveTo(x, yy), first = false) : ctx.lineTo(x, yy); } ctx.stroke(); }
    } else if (SUBSTRATE === 'dotgrid') {
      ctx.fillStyle = _rgba(ink, a * 1.7); const step = 30;
      for (let y = step; y < H; y += step) for (let x = step; x < W; x += step) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  // FONDO CLARO (editorial): crema con tinte del acento (multiply, no aditivo) + grano papel + viñeta sutil.
  // Mundo visual opuesto al oscuro -> mitad de las marcas se sienten de otra liga.
  function _bgLightFull(t) {
    if (!blobs.length) _buildBg();
    const pal = _meshPalette();
    const aH = _hexToHsl(A1 || '#3aa0ff');
    const c0 = _hslToHex(aH.h, 0.16, 0.955), c1 = _hslToHex(aH.h, 0.12, 0.90);
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    const spots = [[0.24, 0.28, pal[0], 0.20], [0.80, 0.70, pal[3], 0.14], [0.62, 0.16, pal[1], 0.11]];
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      const cx = W * s[0] + Math.sin(t * CLK * 3 + i) * 20, cy = H * s[1] + Math.cos(t * CLK * 2 + i) * 16;   // spots claros en armonicos de CLK
      const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.62);
      gl.addColorStop(0, _rgba(s[2], s[3])); gl.addColorStop(1, _rgba(s[2], 0));
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    // tratamiento estructural del ESTILO adaptado a tono CLARO (grilla / franja / rayos / lineas / puntos)
    // -> los estilos claros (swiss, handmade, brutalist-claro, etc.) dejan de compartir el mismo fondo.
    const aink = _accentInk(pal[0], 0.5);
    if (BG_STYLE === 'blueprint' || BG_STYLE === 'swiss') {
      ctx.save(); ctx.strokeStyle = 'rgba(20,16,12,0.07)'; ctx.lineWidth = 1;
      const step = 34, off = (t * 4) % step; ctx.beginPath();
      for (let gx = -off; gx < W; gx += step) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
      for (let gy = -off; gy < H; gy += step) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke();
      ctx.strokeStyle = _rgba(aink, 0.18); ctx.lineWidth = 1.4; ctx.beginPath();
      for (let gx = -off; gx < W; gx += step * 5) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
      for (let gy = -off; gy < H; gy += step * 5) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke(); ctx.restore();
    } else if (BG_STYLE === 'brutalist') {
      ctx.save(); ctx.fillStyle = _rgba(aink, 0.92); ctx.fillRect(0, 0, W * 0.13, H);
      ctx.strokeStyle = 'rgba(20,16,12,0.08)'; ctx.lineWidth = 2; const step = 60; ctx.beginPath();
      for (let gx = 0; gx <= W; gx += step) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
      for (let gy = 0; gy <= H; gy += step) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke(); ctx.restore();
    } else if (BG_STYLE === 'sunburst') {
      // RETRO 70s: substrato CALIDO (crema -> mostaza) + rayos burnt-orange/mostaza que DOMINAN, fijo e
      // independiente del acento del rubro. Sin esto el sunburst quedaba navy/frio y no leia 70s (panel 3.5).
      ctx.save(); const wb = ctx.createLinearGradient(0, 0, 0, H); wb.addColorStop(0, '#f0dcae'); wb.addColorStop(1, '#e6c184'); ctx.fillStyle = wb; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; const cx2 = W * 0.5, cy2 = H * 0.18, rays = 24, rot = t * 0.04, warm = ['#bb4d22', '#d6912a'];
      for (let i = 0; i < rays; i += 2) { const a = rot + i / rays * TAU; ctx.fillStyle = _rgba(i % 4 ? warm[0] : warm[1], i % 4 ? 0.22 : 0.14); ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(a - 0.085) * H * 1.45, cy2 + Math.sin(a - 0.085) * H * 1.45); ctx.lineTo(cx2 + Math.cos(a + 0.085) * H * 1.45, cy2 + Math.sin(a + 0.085) * H * 1.45); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    } else if (BG_STYLE === 'speedlines') {
      const rnd = mulberry32((SEED || 1) ^ 0x59ED); ctx.save(); ctx.lineCap = 'round'; const n = 16, ang = -0.34, span = H * 1.7;
      for (let i = 0; i < n; i++) { const base = rnd(), y = -H * 0.35 + ((base * span + t * 150) % span), x = rnd() * W, len = lerp(50, 260, rnd()); ctx.globalAlpha = 0.1 + 0.26 * rnd(); ctx.lineWidth = 2 + rnd() * 3; ctx.strokeStyle = aink; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke(); }
      ctx.restore();
    } else if (BG_STYLE === 'halftone') {
      // riso DUOTONO en claro: 2 tintas (multiply) de hue distinto, la 2da corrida = misregistro de serigrafia
      const step = 18, drift = (t * 5) % step, fx = W * 0.35, fy = H * 0.34;
      const pass = (col, ox, oy, mul) => { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col;
        for (let gy = -drift + oy; gy < H + step; gy += step) for (let gx = -drift + ox; gx < W + step; gx += step) { const d = Math.hypot(gx - fx, gy - fy) / H, r = clamp(6 * (1 - d) * mul, 0.5, 6); ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill(); } ctx.restore(); };
      pass(_rgba(pal[0], 0.34), 0, 0, 1); pass(_rgba(pal[3], 0.3), 5, 5, 0.8);
    } else if (BG_STYLE === 'mesh') {
      // meshflow CLARO: zonas de color que derivan y tintan la crema (multiply) -> flujo visible, no cream plano.
      // antes el tono claro caia al gradiente crema generico (sin rama mesh) -> el panel lo leia monocromo.
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      for (const b of blobs) {
        const cx = b.bx + Math.sin(t * b.fx * BG_ENERGY + b.px) * b.ax, cy = b.by + Math.cos(t * b.fy * BG_ENERGY + b.py) * b.ay;
        const col = pal[b.pi % pal.length], gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.rad);
        gl.addColorStop(0, _rgba(col, 0.34)); gl.addColorStop(0.5, _rgba(col, 0.15)); gl.addColorStop(1, _rgba(col, 0));
        ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    } else if (BG_STYLE === 'aurora') {
      // aurora CLARO: cortinas verticales multi-hue que tintan la crema (multiply)
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      const aH = _hexToHsl(A1 || '#3aa0ff'), hues = [aH.h, aH.h + 145, aH.h - 95, aH.h + 60, aH.h + 205], n = 5;
      for (let i = 0; i < n; i++) {
        const baseX = (i + 0.5) / n * W + Math.sin(t * CLK * 6 + i * 1.7) * 72, w = W * (0.2 + 0.06 * (((i * 31) % 5) / 5));   // aurora clara en armonico de CLK
        const col = _hslToHex(hues[i % hues.length], 0.6, 0.5), gl = ctx.createLinearGradient(baseX - w, 0, baseX + w, 0);
        gl.addColorStop(0, _rgba(col, 0)); gl.addColorStop(0.5, _rgba(col, 0.16)); gl.addColorStop(1, _rgba(col, 0));
        ctx.fillStyle = gl; ctx.fillRect(baseX - w, 0, w * 2, H);
      }
      ctx.restore();
    } else if (BG_STYLE === 'paper') {
      // HECHO A MANO: capa de papel -> fibra grumosa + manchas de tinta/acuarela + borde dibujado a mano.
      // antes handmade usaba 'field' y caia al crema generico -> el panel lo vio identico a swiss/typographic.
      const rnd = mulberry32((SEED || 1) ^ 0x9A7E);
      ctx.save();
      for (let i = 0; i < 520; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(120,95,70,0.05)' : 'rgba(255,255,255,0.06)'; const px = rnd() * W, py = rnd() * H, pr = 1 + rnd() * 2.4; ctx.fillRect(px, py, pr, pr); }
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      for (let k = 0; k < 3; k++) { const mx = W * (0.12 + 0.76 * rnd()), my = H * (0.1 + 0.8 * rnd()), mr = H * (0.12 + rnd() * 0.12), gl = ctx.createRadialGradient(mx, my, 0, mx, my, mr); gl.addColorStop(0, _rgba(_accentInk(pal[0], 0.3), 0.12)); gl.addColorStop(1, _rgba(pal[0], 0)); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
      ctx.save(); ctx.strokeStyle = _rgba(_accentInk(pal[0], 0.45), 0.5); ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      const m = 26, corners = [[m, m], [W - m, m], [W - m, H - m], [m, H - m], [m, m]]; ctx.beginPath();
      for (let c = 0; c < corners.length - 1; c++) { const x0 = corners[c][0], y0 = corners[c][1], x1 = corners[c + 1][0], y1 = corners[c + 1][1], seg = 12;
        for (let i = 0; i <= seg; i++) { const f = i / seg, x = lerp(x0, x1, f) + (rnd() - 0.5) * 5, y = lerp(y0, y1, f) + (rnd() - 0.5) * 5; (c === 0 && i === 0) ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } }
      ctx.stroke(); ctx.restore();
    } else if (BG_STYLE === 'editorial') {
      // EDITORIAL: hairlines de cabecera/pie (regla de revista) + wash duotono quieto en una esquina.
      ctx.save(); ctx.strokeStyle = _rgba(aink, 0.5); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.085); ctx.lineTo(W * 0.92, H * 0.085); ctx.moveTo(W * 0.08, H * 0.93); ctx.lineTo(W * 0.92, H * 0.93); ctx.stroke();
      ctx.globalCompositeOperation = 'multiply'; const eg = ctx.createRadialGradient(W * 0.85, H * 0.2, 0, W * 0.85, H * 0.2, H * 0.5);
      eg.addColorStop(0, _rgba(pal[0], 0.1)); eg.addColorStop(1, _rgba(pal[0], 0)); ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H); ctx.restore();
    } else if (BG_STYLE === 'corporate') {
      // CORPORATE: near-white + gradiente calmo en esquina + dot-grid UI muy tenue (look SaaS/B2B).
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; const cg = ctx.createRadialGradient(W * 0.9, H * 0.12, 0, W * 0.9, H * 0.12, H * 0.6);
      cg.addColorStop(0, _rgba(pal[0], 0.12)); cg.addColorStop(1, _rgba(pal[0], 0)); ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.fillStyle = _rgba(aink, 0.1); const cstep = 30, coff = (t * 3) % cstep;
      for (let gy = -coff; gy < H; gy += cstep) for (let gx = -coff; gx < W; gx += cstep) { ctx.beginPath(); ctx.arc(gx, gy, 1, 0, TAU); ctx.fill(); }
      ctx.restore();
    } else if (BG_STYLE === 'organic') {
      // ORGANIC: colinas/ondas organicas que ondulan lento (parallax) tintando el fondo terroso.
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; const ohues = [pal[0], pal[3], pal[1]];
      for (let i = 0; i < 3; i++) {
        const baseY = H * (0.56 + i * 0.16); ctx.fillStyle = _rgba(ohues[i % ohues.length], 0.15 - i * 0.03);
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 18) { const y = baseY + Math.sin(x * 0.012 + t * CLK * 16 + i * 1.3) * 22; ctx.lineTo(x, y); }   // ondas organicas en armonico de CLK
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    } else if (BG_STYLE === 'y2k') {
      // Y2K CHROME: degradado brillante aqua->lila (pisa la crema) + blobs cromados que orbitan + sparkles.
      ctx.save(); const yg = ctx.createLinearGradient(0, 0, W, H);
      yg.addColorStop(0, '#56e1ff'); yg.addColorStop(0.55, '#9b8cff'); yg.addColorStop(1, '#dca0ff');
      ctx.fillStyle = yg; ctx.fillRect(0, 0, W, H);
      const rnd = mulberry32((SEED || 1) ^ 0x42C);
      for (let i = 0; i < 4; i++) {                                  // blobs cromados (radial + highlight especular)
        const bx = W * (0.2 + 0.6 * rnd()) + Math.sin(t * CLK * 12 + i * 1.7) * 40, by = H * (0.2 + 0.6 * rnd()) + Math.cos(t * CLK * 10 + i) * 34, br = 50 + rnd() * 50;   // blobs cromados en armonicos de CLK
        const cg = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br);
        cg.addColorStop(0, 'rgba(255,255,255,0.85)'); cg.addColorStop(0.4, 'rgba(190,200,220,0.5)'); cg.addColorStop(0.7, 'rgba(120,130,160,0.35)'); cg.addColorStop(1, 'rgba(120,130,160,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 7; i++) {                                  // sparkles 4-puntas pulsando
        const sx = rnd() * W, sy = rnd() * H, sp = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3), s = (6 + rnd() * 8) * (0.5 + sp);
        ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * sp; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.translate(sx, sy);
        ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }
    ctx.save();
    for (const gp of grain) { ctx.globalAlpha = Math.min(0.05, (gp.a || 0.06) * 0.6); ctx.fillStyle = '#1c130c'; ctx.fillRect(gp.x, gp.y, gp.r || 1.3, gp.r || 1.3); }
    ctx.restore();
    if (MOTIF) _drawMotif(MOTIF, t, pal);   // motivo contextual tambien en tono claro
    if (BG_STYLE !== 'speedlines' && BG_STYLE !== 'brutalist' && BG_STYLE !== 'broadcast' && BG_STYLE !== 'cyber' && BG_STYLE !== 'hud') _drawFloaters(t);   // objetos flotantes que rellenan los vacios
    const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.32, W / 2, H * 0.5, H * 0.82);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,45,35,0.10)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    _drawSubstrate(t);
    _filmGrain(t);
  }
  // wrapper de CAMARA COMPARTIDA (parallax): el fondo se mueve con el MISMO vector que el contenido pero a
  // menos profundidad (camX/camY ~30%) + leve overscan (camZ ~1.045) para que el paneo no muestre bordes.
  // Asi fondo y texto se leen como UN plano filmado por la misma camara (mata la desincronizacion percibida).
  function drawBg(t, camX = 0, camY = 0, camZ = 1) {
    ctx.save();
    if (camZ !== 1 || camX || camY) { ctx.translate(W / 2, H / 2); ctx.scale(camZ, camZ); ctx.translate(-W / 2 + camX, -H / 2 + camY); }
    _drawBgInner(t);
    ctx.restore();
  }
  function _drawBgInner(t) {
    if (TONE === 'light') { _bgLightFull(t); return; }
    if (!blobs.length) _buildBg();
    // 1) base: gradiente radial del tema (oscuro, para que las zonas de color resalten)
    const g = ctx.createRadialGradient(W * 0.5, H * 0.36, 30, W * 0.5, H * 0.42, H * 0.95);
    g.addColorStop(0, BG[0]); g.addColorStop(0.5, BG[1]); g.addColorStop(1, BG[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 2) capa de COLOR segun el ESTILO de fondo de la marca -> cada video vive en un mundo visual distinto
    const pal = _meshPalette();
    if (BG_STYLE === 'field') _bgField(t, pal);
    else if (BG_STYLE === 'spotlight') _bgSpotlight(t, pal);
    else if (BG_STYLE === 'bands') _bgBands(t, pal);
    else if (BG_STYLE === 'aurora') _bgAurora(t, pal);
    else if (BG_STYLE === 'blueprint') _bgBlueprint(t, pal);
    else if (BG_STYLE === 'brutalist') _bgBrutalist(t, pal);
    else if (BG_STYLE === 'sunburst') _bgSunburst(t, pal);
    else if (BG_STYLE === 'speedlines') _bgSpeedlines(t, pal);
    else if (BG_STYLE === 'halftone') _bgHalftone(t, pal);
    else if (BG_STYLE === 'paper') _bgField(t, pal);   // handmade en oscuro (raro): cae a field suave
    else if (BG_STYLE === 'typo') _bgField(t, pal);    // typographic: base sobria + wordmark fantasma (en drawFrame)
    else if (BG_STYLE === 'broadcast') _bgBroadcast(t, pal);
    else if (BG_STYLE === 'cyber') _bgCyber(t, pal);
    else if (BG_STYLE === 'hud') _bgHud(t, pal);
    else if (BG_STYLE === 'editorial' || BG_STYLE === 'corporate' || BG_STYLE === 'organic') _bgField(t, pal);  // estos son tono claro; en oscuro (raro) caen a field
    else _bgMesh(t, pal);
    if (MOTIF) _drawMotif(MOTIF, t, pal);   // capa CONTEXTUAL: motivo del rubro (skyline, sparkline, etc.)
    if (BG_STYLE !== 'speedlines' && BG_STYLE !== 'brutalist' && BG_STYLE !== 'broadcast' && BG_STYLE !== 'cyber' && BG_STYLE !== 'hud') _drawFloaters(t);   // objetos flotantes que rellenan los vacios
    // 3) motes (polvo) con tinte del tema, deriva vertical sembrada
    ctx.save();
    for (const m of motes) {
      const y = (m.y - t * m.sp) % (H + 20); const yy = y < -10 ? y + H + 20 : y;
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.5 + m.ph));
      ctx.beginPath(); ctx.fillStyle = `rgba(${MOTE},${0.10 * tw})`;
      ctx.arc(m.x, yy, m.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // 3.5) TEXTURA por rubro: el fondo deja de ser un gradiente generico y aporta identidad.
    if (BG_TEX === 'grain' || BG_TEX === 'grain2') {
      ctx.save();
      const amp = BG_TEX === 'grain2' ? 1.7 : 1.15;
      for (const gp of grain) { ctx.globalAlpha = Math.min(0.26, gp.a * amp); ctx.fillStyle = `rgb(${MOTE})`; ctx.fillRect(gp.x, gp.y, gp.r || 1.5, gp.r || 1.5); }
      ctx.restore();
    } else if (BG_TEX === 'grid') {
      ctx.save(); ctx.strokeStyle = `rgba(${MOTE},0.12)`; ctx.lineWidth = 1;
      const step = 44, off = (t * 5) % step; ctx.beginPath();
      for (let gx = -off; gx < W; gx += step) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
      for (let gy = -off; gy < H; gy += step) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke(); ctx.restore();
    } else if (BG_TEX === 'lines') {
      ctx.save(); ctx.strokeStyle = `rgba(${MOTE},0.13)`; ctx.lineWidth = 1.2;
      const step = 24, off = (t * 4) % step; ctx.beginPath();
      for (let i = -H - off; i < W; i += step) { ctx.moveTo(i, 0); ctx.lineTo(i + H, H); }
      ctx.stroke(); ctx.restore();
    }
    // 4) scrim central TONE-AWARE: empuja el brillo del centro hacia el TONO (oscuro -> mas oscuro; claro -> mas
    // claro) para que el texto SIEMPRE contraste, sin importar el fondo. Antes era negro fijo -> en tono claro
    // grisaba el centro y el texto claro/cream sobre fondo claro NO se leia (bug del hero de WhatsApp).
    const sc = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.56);
    if (TONE === 'light') { sc.addColorStop(0, 'rgba(250,250,252,0.46)'); sc.addColorStop(0.6, 'rgba(250,250,252,0.18)'); sc.addColorStop(1, 'rgba(250,250,252,0)'); }
    else { sc.addColorStop(0, 'rgba(0,0,0,0.36)'); sc.addColorStop(0.6, 'rgba(0,0,0,0.14)'); sc.addColorStop(1, 'rgba(0,0,0,0)'); }
    ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H);
    // 5) viñeta (oscurece bordes -> foco)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.30, W / 2, H / 2, H * 0.74);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    _drawSubstrate(t);
    _filmGrain(t);
  }

  // ---------- iconos (paths vectoriales, dibujados al origen) ----------
  function drawBox(s, squash = 0) {
    // caja de producto, centrada en (0,0)
    ctx.save();
    ctx.scale(s * (1 + squash * 0.5), s * (1 - squash));
    const w = 88, h = 80, r = 16;
    setShadow(_rgba(A1, 0.45), 26, 8);
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
      ctx.strokeStyle = _rgba(A1, 0.35); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dir * 6, 0); ctx.quadraticCurveTo(dir * span * 0.5, -span * 0.35, dir * span * 0.8, -span * 0.12); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function drawCart(s, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(255,246,250,0.95)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    setShadow(_rgba(A1, 0.4), 18, 4);
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
    setShadow(_rgba(A1, 0.4), 18, 6);
    ctx.beginPath(); ctx.moveTo(-58, -4); ctx.lineTo(0, -56); ctx.lineTo(58, -4); ctx.closePath(); ctx.fill();
    noShadow();
    // puerta
    ctx.fillStyle = 'rgba(20,12,30,0.9)';
    ctx.roundRect(-14, 24, 28, 40, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.9)'; ctx.beginPath(); ctx.arc(7, 46, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // tamaño de fuente mas grande (<= base, >= min) con el que `str` entra en maxW (anti-recorte).
  // role: mide con la MISMA familia con la que se va a dibujar (display/text/accent) -> sin overflow al cambiar fuente.
  function fitFont(str, base, maxW, min = 14, weight = 700, role = 't') {
    let s = base;
    ctx.font = fontStr(weight, s, role);
    while (s > min && ctx.measureText(str).width > maxW) {
      s -= 1; ctx.font = fontStr(weight, s, role);
    }
    return s;
  }
  // texto con entrada suave (scale + fade, leve overshoot) + auto-ajuste de tamaño si se pasa maxW
  function fxText(str, x, y, size, p, weight = 700, col = INK, maxW = 0, role = 'd') {
    if (p <= 0) return;
    if (maxW > 0) size = fitFont(str, size, maxW, 14, weight, role);
    const sc = lerp(0.55, 1, eOutBack(clamp(p, 0, 1)));
    ctx.save();
    ctx.globalAlpha *= clamp(p * 1.4, 0, 1);
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.font = fontStr(weight, size, role);
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
      setShadow(_rgba(A1, 0.5), 30, 10);
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
        ctx.font = fontStr(700, 26, 'd');
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = INK;
        ctx.save(); ctx.translate(cx, cy + sink); ctx.scale(eOutBack(clamp(tin, 0, 1)) * 0.06 + 0.94, eOutBack(clamp(tin, 0, 1)) * 0.06 + 0.94);
        ctx.fillText(p.title || '', 0, 0); ctx.restore();
      }
      ctx.restore();
    }

    // ----- gota que cae y pinta -----
    const paintX = cx, paintY = H * 0.52;
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
      ctx.strokeStyle = _rgba(A1, 0.8); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(paintX, paintY, lerp(4, 60, eOutCubic(imp)), 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // ----- título grande "pintado" progresivamente -----
    const pp = inv(t, 4.3, 5.7);
    if (pp > 0) {
      const _ttl = p.title || '';
      const titleY = paintY, fontSize = fitFont(_ttl, 58, W * 0.86, 32, 800), half = fontSize * 0.62;
      const top = titleY - half, bot = titleY + half + 8;
      const front = lerp(top - 6, bot, eOutCubic(pp));
      ctx.save();
      // clip = de arriba al frente de pintura, con borde ondulado
      ctx.beginPath();
      ctx.moveTo(0, top - 30); ctx.lineTo(W, top - 30); ctx.lineTo(W, front);
      for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, front + Math.sin(x * 0.08 + t * 6) * 4);
      ctx.closePath(); ctx.clip();
      ctx.font = fontStr(800, fontSize, 'd');
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
    if (_subs[0]) fxText(_subs[0], cx, H * 0.63, 22, inv(t, 5.2, 5.8), 600, DIM, W * 0.82);
    if (_subs[1]) fxText(_subs[1], cx, H * 0.665, 22, inv(t, 5.45, 6.0), 600, DIM, W * 0.82);
  }

  // ---------- ESCENA 2: carrito → click → caja → alas → vuela → casa ----------
  function sceneCart(t, p = {}) {
    const cx = W / 2, cy = H * 0.44;
    const hx = W * 0.72, hy = H * 0.64;
    if (p.caption) fxText(p.caption, W / 2, H * 0.15, 23, inv(t, 0.3, 1.0), 600, INK, W * 0.86);

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
  // marcador de item del checklist segun listStyle, RE-TENIDO al acento de marca (rompe el "check
  // verde universal" que delataba el molde). Estilos: check / number / bar / dash -> distinto por rubro.
  function _listMarker(style, i, t, d) {
    // respiracion sutil del marcador circular durante el hold (idle-breath en la grilla de CLK, fase por fila
    // -> no laten al unisono): mata el "frame muerto" de la lista despues de que todas las filas aparecieron.
    const _bz = 1 + Math.sin(_holdT * CLK * 18 + i * 1.4) * 0.03;
    if (style === 'number') {
      setShadow(_rgba(A1, 0.4), 12, 3);
      ctx.fillStyle = A1; ctx.beginPath(); ctx.arc(0, 0, 15 * _bz, 0, TAU); ctx.fill(); noShadow();
      ctx.fillStyle = '#15100a'; ctx.font = fontStr(800, 17, 'a');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), 0, 1);
    } else if (style === 'bar') {
      ctx.fillStyle = accent(0, -15, 0, 15); ctx.beginPath(); ctx.roundRect(-3.5, -15, 7, 30, 3.5); ctx.fill();
    } else if (style === 'dash') {
      ctx.fillStyle = A1; ctx.beginPath(); ctx.roundRect(-14, -2.5, 28, 5, 2.5); ctx.fill();
    } else {
      setShadow(_rgba(A1, 0.45), 14, 4);
      ctx.fillStyle = A1; ctx.beginPath(); ctx.arc(0, 0, 15 * _bz, 0, TAU); ctx.fill(); noShadow();
      const ck = inv(t, d + 0.25, d + 0.6);
      ctx.strokeStyle = '#10100a'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); const pts = [[-6, 0], [-2, 5], [7, -6]]; ctx.moveTo(pts[0][0], pts[0][1]);
      if (ck > 0) {
        const s1 = clamp(ck / 0.45, 0, 1), s2 = clamp((ck - 0.45) / 0.55, 0, 1);
        ctx.lineTo(lerp(pts[0][0], pts[1][0], s1), lerp(pts[0][1], pts[1][1], s1));
        if (s2 > 0) ctx.lineTo(lerp(pts[1][0], pts[2][0], s2), lerp(pts[1][1], pts[2][1], s2));
        ctx.stroke();
      }
    }
  }
  // === 4 LAYOUTS de checklist (no solo el marcador) -> rompe de verdad el esqueleto compartido ===
  // card (boxed, gastronomia/salud), plain (tech, sin caja + linea fina), editorial (moda/inmob/educ,
  // numero grande), bar-bold (fitness/finanzas, barra de acento que se llena). Cada uno con su ritmo.
  function _rowCard(label, x, y, i, t, d) {
    ctx.fillStyle = _panelFill(); ctx.strokeStyle = _panelStroke(); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y - 24, 300, 48, 14); ctx.fill(); ctx.stroke();
    const ms = eOutBack(clamp(inv(t, d + 0.1, d + 0.5), 0, 1));
    ctx.save(); ctx.translate(x + 30, y); ctx.scale(ms, ms); _listMarker('check', i, t, d); ctx.restore();
    ctx.font = fontStr(600, fitFont(label, 21, 224, 13, 600, 't'), 't');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(label, x + 58, y);
  }
  function _rowPlain(label, x, y, i, t, d) {     // tech: sin caja, guion + linea fina (drawing/CAD)
    const ms = eOutBack(clamp(inv(t, d + 0.1, d + 0.5), 0, 1));
    ctx.save(); ctx.translate(x + 14, y); ctx.scale(ms, ms); ctx.fillStyle = A1; ctx.beginPath(); ctx.roundRect(-13, -2, 26, 4, 2); ctx.fill(); ctx.restore();
    ctx.font = fontStr(600, fitFont(label, 21, 240, 13, 600, 't'), 't');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; setShadow('rgba(0,0,0,0.5)', 5, 1); ctx.fillText(label, x + 44, y); noShadow();
    const lp = clamp(inv(t, d + 0.15, d + 0.7), 0, 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.11)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 44, y + 19); ctx.lineTo(x + 44 + 256 * lp, y + 19); ctx.stroke();
  }
  function _rowEditorial(label, x, y, i, t, d) { // moda/inmob: numero grande, sin caja, regla fina
    const np = clamp(inv(t, d + 0.05, d + 0.5), 0, 1);
    ctx.save(); ctx.globalAlpha *= np; ctx.font = fontStr(800, 33, 'a');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = A1; ctx.fillText(String(i + 1).padStart(2, '0'), x, y - 1); ctx.restore();
    ctx.font = fontStr(600, fitFont(label, 20, 206, 13, 600, 't'), 't');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; setShadow('rgba(0,0,0,0.5)', 5, 1); ctx.fillText(label, x + 56, y); noShadow();
    const lp = clamp(inv(t, d + 0.15, d + 0.7), 0, 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + 21); ctx.lineTo(x + 300 * lp, y + 21); ctx.stroke();
  }
  function _rowBar(label, x, y, i, t, d) {       // fitness/finanzas: barra de acento que se llena
    const fp = eOutCubic(clamp(inv(t, d, d + 0.5), 0, 1));
    ctx.fillStyle = _rgba(A1, 0.16); ctx.beginPath(); ctx.roundRect(x, y - 21, 300 * fp, 42, 9); ctx.fill();
    ctx.fillStyle = A1; ctx.beginPath(); ctx.roundRect(x, y - 21, 8 * fp, 42, 3); ctx.fill();
    ctx.font = fontStr(700, fitFont(label, 20, 250, 13, 700, 't'), 't');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.globalAlpha *= clamp(fp * 1.4, 0, 1); setShadow('rgba(0,0,0,0.45)', 4, 1); ctx.fillText(label, x + 24, y); noShadow();
  }
  // LAYOUT alternativo: grilla de 2 columnas (stat-cards) -> variedad estructural vs la lista vertical.
  function _listGrid(items, t, lanchor) {
    const cols = 2, cw = 158, ch = 84, gx = 12, gy = 14, rows = Math.ceil(items.length / cols);
    const gw = cols * cw + (cols - 1) * gx, x0 = lanchor ? 40 : (W - gw) / 2, y0 = H * 0.46 - (rows * (ch + gy) - gy) / 2;
    items.forEach((label, i) => {
      const d = 0.5 + i * 0.34, rin = inv(t, d, d + 0.5); if (rin <= 0) return;
      const r = Math.floor(i / cols), c = i % cols, x = x0 + c * (cw + gx), y = y0 + r * (ch + gy), pop = eOutBack(clamp(rin, 0, 1));
      ctx.save(); ctx.globalAlpha *= clamp(rin * 1.5, 0, 1);
      ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(pop, pop); ctx.translate(-(x + cw / 2), -(y + ch / 2));
      ctx.fillStyle = _panelFill(); ctx.strokeStyle = _panelStroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 12); ctx.fill(); ctx.stroke();
      setShadow(_rgba(A1, 0.4), 10, 2); ctx.fillStyle = A1; ctx.beginPath(); ctx.arc(x + 18, y + 20, 6, 0, TAU); ctx.fill(); noShadow();
      ctx.font = fontStr(700, fitFont(label, 19, cw - 22, 13, 700, 't'), 't'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; setShadow('rgba(0,0,0,0.5)', 4, 1);
      ctx.fillText(label, x + 14, y + ch - 26); noShadow();
      ctx.restore();
    });
  }
  // LAYOUT alternativo: CHIPS/tags -> items cortos como pildoras de acento agrupadas en filas centradas que
  // envuelven (look "catalogo/features"). Rompe de raiz la columna vertical (la queja: "la misma lista siempre").
  function _listChips(items, t) {
    const cx = W / 2, padX = 24, chH = 46, gap = 12, rowGap = 16, maxRowW = W * 0.86;
    ctx.font = fontStr(700, 22, 't');
    const chips = items.map(s => { const str = String(s); return { str, w: Math.min(maxRowW, ctx.measureText(str).width + padX * 2 + 14) }; });
    const rows = [[]]; let rw = 0;   // agrupar en filas que no excedan el ancho
    for (const c of chips) { if (rw + c.w > maxRowW && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push(c); rw += c.w + gap; }
    const totalH = rows.length * chH + (rows.length - 1) * rowGap;
    let y = H * 0.47 - totalH / 2 + chH / 2, idx = 0;
    for (const r of rows) {
      const rowW = r.reduce((a, c) => a + c.w, 0) + (r.length - 1) * gap;
      let x = cx - rowW / 2;
      for (const c of r) {
        const d = 0.42 + idx * 0.15, ap = eOutBack(clamp(inv(t, d, d + 0.5), 0, 1)); idx++;
        if (ap > 0) {
          const sc = lerp(0.72, 1, clamp(ap, 0, 1));
          ctx.save(); ctx.globalAlpha *= clamp(ap * 1.4, 0, 1); ctx.translate(x + c.w / 2, y); ctx.scale(sc, sc);
          ctx.fillStyle = _rgba(A1, TONE === 'light' ? 0.14 : 0.2); ctx.strokeStyle = _rgba(_accentInk(A1, 0.5), 0.5); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(-c.w / 2, -chH / 2, c.w, chH, chH / 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = _accentInk(A1, 0.5); ctx.beginPath(); ctx.arc(-c.w / 2 + 17, 0, 4, 0, TAU); ctx.fill();   // punto de acento
          ctx.font = fontStr(700, 22, 't'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
          setShadow('rgba(0,0,0,0.4)', 4, 1); ctx.fillText(c.str, -c.w / 2 + 30, 0); noShadow();
          ctx.restore();
        }
        x += c.w + gap;
      }
      y += chH + rowGap;
    }
  }
  function sceneList(t, p = {}) {
    const cx = W / 2, style = p.listStyle || 'check', lanchor = p.listAnchor === 'left';
    const rx = lanchor ? 53 : cx - 150, tp = inv(t, 0.1, 0.7);   // contrato sideLeft: MISMO margen izq
    // TITULO + regla alineados al MISMO eje izquierdo que los items (rx) -> titulo, regla y lista comparten
    // columna. Antes el modo no-lanchor dejaba el titulo CENTRADO sobre items a la izquierda = eje partido/descuidado.
    if (tp > 0) { ctx.save(); ctx.globalAlpha *= eOutCubic(clamp(tp, 0, 1)); ctx.font = fontStr(800, fitFont(p.title || '', (p.title || '').length > 18 ? 26 : 30, W * 0.8, 18, 800, 'd'), 'd'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; setShadow('rgba(0,0,0,0.4)', 5, 1); ctx.fillText(p.title || '', rx, H * 0.23); noShadow(); ctx.restore(); }
    // regla de acento bajo el titulo -> lo liga a la lista (proximidad Gestalt), no queda flotando aparte
    const ru = eOutCubic(inv(t, 0.3, 0.8));
    if (ru > 0) { const ry = H * 0.285, rxr = rx; ctx.save(); ctx.fillStyle = accent(rxr, ry, rxr + 52, ry); ctx.beginPath(); ctx.roundRect(rxr, ry, 52 * ru, 4, 2); ctx.fill(); ctx.restore(); }
    const items = (p.items || []).slice(0, 4);
    // LAYOUT del checklist: explicito (p.listLayout) o ELEGIDO POR SEMILLA de marca -> cada video recibe un layout
    // distinto (columna vertical / grilla de cards / chips) en vez de SIEMPRE la columna (la queja: "la misma lista").
    let _lay = (p.listLayout === 'rows' || p.listLayout === 'grid' || p.listLayout === 'chips') ? p.listLayout : '';
    if (!_lay) { const _lr = mulberry32(((SEED || 1) ^ 0x715709) >>> 0)(); _lay = _lr < 0.4 ? 'rows' : (_lr < 0.72 ? 'grid' : 'chips'); }
    if (_lay === 'grid') { _listGrid(items, t, lanchor); return; }
    if (_lay === 'chips') { _listChips(items, t); return; }
    const gap = (items.length >= 4 ? 58 : 70), startY = H * 0.46 - (items.length - 1) * gap / 2;
    const row = style === 'bar' ? _rowBar : style === 'number' ? _rowEditorial : style === 'dash' ? _rowPlain : _rowCard;
    items.forEach((label, i) => {
      const d = 0.5 + i * 0.42, rin = inv(t, d, d + 0.55);
      if (rin <= 0) return;
      const x = rx, y = startY + i * gap, slide = lerp(46, 0, eOutBack(rin));
      ctx.save(); ctx.globalAlpha *= clamp(rin * 1.5, 0, 1); ctx.translate(slide, 0);
      row(label, x, y, i, t, d);
      ctx.restore();
    });
  }

  // ---------- ESCENA 4: marca + CTA — 4 COMPOSICIONES (propagadas desde el hero) ----------
  // center (pildora centrada) · left (chip a la izquierda) · bar (barra full-width abajo) · bigtype
  // (el CTA como TIPOGRAFIA gigante). Asi el frame de cierre tambien cambia por marca.
  function sceneOutro(t, p = {}) {
    // COMPOSICION del cierre: explicita (p.outroComp) o ELEGIDA POR SEMILLA -> el end-card NO es siempre centrado
    // (antes default 'center'/'left' = casi todos los cierres iguales). 6 comps validas.
    const _ocV = ['center', 'left', 'bar', 'bigtype', 'diagonal', 'ctaOnly'];
    const comp = _ocV.indexOf(p.outroComp) >= 0 ? p.outroComp : _ocV[(mulberry32(((SEED || 1) ^ 0x0117C0) >>> 0)() * _ocV.length) | 0];
    const cx = W / 2, cy = H * 0.42;
    // LOGO de la marca arriba del cierre (si el renderer lo precargo). Aspect-ratio preservado, fade-in.
    if (LOGO) {
      const lp = eOutCubic(inv(t, 0.15, 0.9));
      if (lp > 0) {
        const lw0 = LOGO.width || LOGO.naturalWidth, lh0 = LOGO.height || LOGO.naturalHeight, ar = (lw0 && lh0) ? lw0 / lh0 : 1;
        const lh = 78, lw = Math.min(W * 0.62, lh * ar);
        ctx.save(); ctx.globalAlpha *= lp; ctx.translate(cx, cy - 104 - (1 - lp) * 10);
        ctx.drawImage(LOGO, -lw / 2, -lh / 2, lw, lh); ctx.restore();
      }
    }
    function wordmark(wx, wy, align, size) {
      const bn = eOutCubic(inv(t, 0.2, 1.0)); if (bn <= 0) return;
      const _bn = p.brand || '', fs = fitFont(_bn, size || 56, W * 0.82, 28, 800, 'd'), top = wy - fs * 0.62, bot = wy + fs * 0.62;
      ctx.save(); ctx.globalAlpha *= bn; ctx.font = fontStr(800, fs, 'd');
      ctx.textAlign = align; ctx.textBaseline = 'middle';
      const wg = ctx.createLinearGradient(wx - 130, top, wx + 130, bot); wg.addColorStop(0, _accentInk(A1, 0.62)); wg.addColorStop(1, _accentInk(A2, 0.5));
      ctx.fillStyle = wg; setShadow('rgba(0,0,0,0.5)', 8, 1);   // aclarado + sombra -> legible sobre el mismo color (Aura/Trama)
      ctx.fillText(_bn, wx, wy + (1 - bn) * 16); noShadow(); ctx.restore();
    }
    function accentBar(bx, byy, bw0, align) {
      const bar = inv(t, 0.9, 1.4); if (bar <= 0) return; const bw = bw0 * eOutCubic(bar);
      ctx.save(); ctx.fillStyle = accent(bx - 60, 0, bx + 60, 0); ctx.beginPath();
      ctx.roundRect(align === 'left' ? bx : bx - bw / 2, byy, bw, 5, 3); ctx.fill(); ctx.restore();
    }
    // CTA TIPOGRAFICO sin caja: texto en acento + subrayado que crece + chevron. Lee de cine, no de UI
    // (mata el tell "boton de landing"). Reemplaza la pildora en las composiciones center/left.
    function ctaButton(anchorX, py, align) {
      const cta = inv(t, 1.1, 1.6); if (cta <= 0) return;
      const ctaStr = (p.cta || 'Visita ahora');
      const fs = fitFont(ctaStr, 32, W * 0.74, 18, 800), isL = align === 'left', isR = align === 'right';
      const appear = eOutBack(clamp(cta, 0, 1));
      ctx.save();
      ctx.globalAlpha *= clamp(cta * 1.3, 0, 1);
      ctx.translate(0, (1 - appear) * 12);
      ctx.font = fontStr(800, fs, 'd');
      ctx.textAlign = isL ? 'left' : isR ? 'right' : 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = _accentInk(A1, 0.5);
      if (TONE !== 'light') setShadow('rgba(0,0,0,0.4)', 6, 1);
      ctx.fillText(ctaStr, anchorX, py); noShadow();
      const tw = Math.min(W * 0.74, ctx.measureText(ctaStr).width), ux = isL ? anchorX : isR ? anchorX - tw : anchorX - tw / 2;
      const up = eOutCubic(clamp(inv(t, 1.3, 1.85), 0, 1));
      ctx.fillStyle = _accentInk(A1, 0.5);   // subrayado tan brillante como el texto (legible en oscuro)
      ctx.beginPath(); ctx.roundRect(ux, py + fs * 0.62, tw * up, 5, 2.5); ctx.fill();
      const ar = inv(t, 1.6, 2.0);
      if (ar > 0) { ctx.save(); ctx.globalAlpha *= ar; ctx.strokeStyle = _accentInk(A1, 0.5); ctx.lineWidth = 4; ctx.lineCap = 'round'; const acx = isL ? ux + tw / 2 : isR ? anchorX - tw / 2 : anchorX, ay = py + fs * 0.62 + 22; ctx.beginPath(); ctx.moveTo(acx - 13, ay); ctx.lineTo(acx, ay + 11); ctx.lineTo(acx + 13, ay); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      const burst = inv(t, 1.1, 1.55);
      if (burst > 0 && burst < 1) {
        ctx.save(); ctx.translate(isL ? anchorX + 30 : isR ? anchorX - 30 : anchorX, py);
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, d = lerp(16, 78, eOutCubic(burst)); ctx.globalAlpha = (1 - burst) * 0.8; ctx.fillStyle = i % 2 ? A1 : A2; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2.6, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }
    if (comp === 'left') {
      const ax = W * 0.13; wordmark(ax, cy, 'left'); accentBar(ax, cy + 44, 120, 'left'); ctaButton(ax, cy + 110, 'left', true);
    } else if (comp === 'bar') {
      wordmark(cx, cy - 10, 'center', 50); accentBar(cx, cy + 36, 100, 'center');
      const br = eOutCubic(inv(t, 1.1, 1.7));
      if (br > 0) {
        const by = H * 0.80, bh = 70, bw = (W - 48) * br;
        ctx.save(); setShadow(_rgba(A1, 0.5), 26, 8);
        const g = ctx.createLinearGradient(24, by, 24 + bw, by); g.addColorStop(0, _lighten(A1, 0.5)); g.addColorStop(1, _lighten(A2, 0.36));
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(24, by - bh / 2, bw, bh, 14); ctx.fill(); noShadow();
        if (br > 0.55) { ctx.globalAlpha = clamp((br - 0.55) / 0.45, 0, 1); const _bs = fitFont((p.cta || 'Visita ahora'), 26, W - 92, 14, 800, 'd'); ctx.font = fontStr(800, _bs, 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = TONE === 'light' ? '#fff' : '#14090e'; ctx.fillText((p.cta || 'Visita ahora'), W / 2, by); }
        ctx.restore();
      }
    } else if (comp === 'bigtype') {
      wordmark(cx, cy - 88, 'center', 42);
      const tg = eOutBack(clamp(inv(t, 1.0, 1.6), 0, 1));
      if (tg > 0) {
        const cta = p.cta || 'Visita ahora', fs = fitFont(cta, 72, W * 0.86, 34, 800);
        ctx.save(); ctx.translate(cx, cy + 34); ctx.scale(0.92 + 0.08 * tg, 0.92 + 0.08 * tg);
        ctx.font = fontStr(800, fs, 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const _cg = ctx.createLinearGradient(-130, -fs * 0.6, 130, fs * 0.6); _cg.addColorStop(0, _accentInk(A1, 0.55)); _cg.addColorStop(1, _accentInk(A2, 0.42));
        setShadow('rgba(0,0,0,0.4)', 8, 2); _kineticDraw(cta, _cg, 'center', t, 1.0, -fs * 0.02); noShadow(); ctx.restore();
        const ar = inv(t, 1.5, 1.9);
        if (ar > 0) { ctx.save(); ctx.globalAlpha = ar; ctx.strokeStyle = _lighten(A1, 0.4); ctx.lineWidth = 4; ctx.lineCap = 'round'; const ay = cy + 34 + fs * 0.7 + 20; ctx.beginPath(); ctx.moveTo(cx - 16, ay); ctx.lineTo(cx, ay + 14); ctx.lineTo(cx + 16, ay); ctx.stroke(); ctx.restore(); }
      }
    } else if (comp === 'diagonal') {
      // end-card DIAGONAL: marca arriba-izquierda + CTA abajo-derecha (rompe el cierre centrado)
      wordmark(W * 0.1, H * 0.27, 'left', 48); accentBar(W * 0.1, H * 0.27 + 42, 96, 'left');
      ctaButton(W * 0.9, H * 0.7, 'right');
    } else if (comp === 'ctaOnly') {
      // end-card CTA-PROTAGONISTA: el CTA gigante es el cierre; la marca firma chica al pie (ya cerro antes)
      const tg = eOutBack(clamp(inv(t, 0.45, 1.15), 0, 1));
      if (tg > 0) {
        const cta = p.cta || 'Visita ahora', fs = fitFont(cta, 80, W * 0.88, 36, 800);
        ctx.save(); ctx.translate(cx, H * 0.45); ctx.scale(0.9 + 0.1 * tg, 0.9 + 0.1 * tg);
        ctx.font = fontStr(800, fs, 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const _cg = ctx.createLinearGradient(-130, -fs * 0.6, 130, fs * 0.6); _cg.addColorStop(0, _accentInk(A1, 0.55)); _cg.addColorStop(1, _accentInk(A2, 0.42));
        setShadow(TONE === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', 8, 2); _kineticDraw(cta, _cg, 'center', t, 0.5, -fs * 0.02); noShadow(); ctx.restore();
        const ar = inv(t, 1.0, 1.4);
        if (ar > 0) { ctx.save(); ctx.globalAlpha = ar; ctx.strokeStyle = _accentInk(A1, 0.5); ctx.lineWidth = 4; ctx.lineCap = 'round'; const ay = H * 0.45 + fs * 0.66 + 22; ctx.beginPath(); ctx.moveTo(cx - 15, ay); ctx.lineTo(cx, ay + 12); ctx.lineTo(cx + 15, ay); ctx.stroke(); ctx.restore(); }
      }
      const bn = clamp(inv(t, 1.1, 1.6), 0, 1);
      if (bn > 0) { ctx.save(); ctx.globalAlpha *= bn; const bfs = fitFont(p.brand || '', 24, W * 0.6, 14, 700, 'd'); ctx.font = fontStr(700, bfs, 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = DIM; ctx.fillText(p.brand || '', cx, H * 0.84); ctx.restore(); }
    } else {
      wordmark(cx, cy, 'center'); accentBar(cx, cy + 44, 120, 'center'); ctaButton(cx, cy + 110, 'center', false);
    }
  }

  // ---------- timeline / escenas ----------
  // ---------- timeline (DATOS) -> escenas ----------
  // Cada escena: { type, ...props, durationInFrames }. El motor mapea type -> dibujante y lo
  // renderiza con sus props. El contenido (texto / items / acento) viene de los DATOS, no horneado.
  // Asi la IA puede componer cualquier video escribiendo un timeline; el render es el mismo.
  // ESCENA: statement — una linea con gancho, revelado limpio (sin clipart). Las lineas suben/aparecen
  // escalonadas y un barrido de acento (mascara) subraya el bloque. Nativo de Canvas, premium, no generico.
  // ESTILO EDITORIAL: titular GRANDE a la izquierda, ragged, con la ULTIMA palabra en acento (pop de autor)
  // y reveal por MASCARA (un clip que crece de izquierda a derecha por linea) -> se siente "de revista", no
  // texto centrado generico. Es el momento tipografico protagonista que usan las marcas premium.
  function _stmtEditorial(t, text) {
    const ax = W * 0.09, efs = text.length > 44 ? 46 : (text.length > 28 ? 56 : 66);
    ctx.font = fontStr(800, efs, 'd'); ctx.textBaseline = 'alphabetic';
    const maxW = W * 0.86;
    const words = text.split(' '); const lines = []; let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
    if (cur) lines.push(cur);
    const lh = efs * 1.06, topY = H * 0.45 + efs * 0.36 - (lines.length - 1) * lh / 2;
    const mr = eOutCubic(clamp(inv(t, 0.05, 0.5), 0, 1));   // marca de acento sobre el titular (encuadre)
    if (mr > 0) { ctx.save(); ctx.fillStyle = _accentInk(A1, 0.5); ctx.beginPath(); ctx.roundRect(ax, topY - efs - 28, 66 * mr, 6, 3); ctx.fill(); ctx.restore(); }
    const lastIdx = lines.length - 1;
    lines.forEach((ln, i) => {
      const pr = eOutCubic(inv(t, 0.14 + i * 0.16, 0.14 + i * 0.16 + 0.5)); if (pr <= 0) return;
      const ly = topY + i * lh;
      ctx.save();
      ctx.beginPath(); ctx.rect(ax - 6, ly - efs, (maxW + 14) * pr, efs * 1.34); ctx.clip();   // reveal por mascara (wipe)
      ctx.font = fontStr(800, efs, 'd'); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      setShadow(TONE === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', 7, 2);   // halo del tono opuesto -> el titular se despega del fondo del mismo hue
      if (i === lastIdx) {
        const ws = ln.split(' '), last = ws.pop(), head = ws.join(' ') + (ws.length ? ' ' : '');
        ctx.fillStyle = INK; ctx.fillText(head, ax, ly);
        ctx.fillStyle = _accentInk(A1, 0.66); ctx.fillText(last, ax + ctx.measureText(head).width, ly);
      } else { ctx.fillStyle = INK; ctx.fillText(ln, ax, ly); }
      noShadow(); ctx.restore();
    });
  }
  function sceneStatement(t, p = {}) {
    const text = p.text || '';
    if (!text) return;
    // ESTILO del statement: explicito (p.stmtStyle) o ELEGIDO POR SEMILLA -> NO siempre 'centered' (antes el
    // default forzaba centrado en casi todos los videos). 5 estilos validos (editorial cae a _stmtEditorial).
    const _ssV = ['centered', 'left', 'quote', 'panel', 'editorial'];
    const style = _ssV.indexOf(p.stmtStyle) >= 0 ? p.stmtStyle : _ssV[(mulberry32(((SEED || 1) ^ 0x57A7E) >>> 0)() * _ssV.length) | 0];
    if (style === 'editorial') { _stmtEditorial(t, text); return; }
    const left = style === 'left';
    // statement = unico beat 100% tipografico -> agrandado (no timido) para que tenga presencia
    const fs = text.length > 34 ? 34 : (text.length > 22 ? 40 : (text.length > 12 ? 48 : 56));
    ctx.font = fontStr(800, fs, 'd'); ctx.textBaseline = 'middle';
    const maxW = left ? W * 0.74 : W * 0.82;
    const words = text.split(' '); const lines = []; let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
    if (cur) lines.push(cur);
    // anclar el centro de masa al TERCIO SUPERIOR (no al 50% matematico) -> intencionalidad, rule-of-thirds; sube
    // un poco el bloque para no dejar el tercio de arriba muerto (el eyebrow de marca termina de anclarlo).
    const anchorY = (style === 'quote' || style === 'panel') ? 0.46 : (left ? 0.42 : 0.40);
    const lh = fs * 1.18, topY = H * anchorY - (lines.length * lh) / 2 + lh / 2;
    // EYEBROW de marca arriba: ancla el tercio superior que quedaba vacio + sostiene identidad (la marca no
    // muere a mitad del reel). Solo en centered/left (quote/panel tienen su propio marco). Halo para contraste.
    if ((style === 'centered' || left) && _BRAND) {
      const ep = eOutCubic(clamp(inv(t, 0.02, 0.5), 0, 1));
      if (ep > 0) {
        const eax = left ? W * 0.13 : W / 2, ey = H * 0.255;
        ctx.save(); ctx.globalAlpha *= ep * 0.95;
        ctx.font = fontStr(700, 18, 'a'); ctx.textAlign = left ? 'left' : 'center'; ctx.textBaseline = 'middle';
        setShadow(TONE === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)', 6, 0);
        ctx.fillStyle = _accentInk(A1, 0.45); ctx.fillText(_BRAND.toUpperCase(), eax, ey); noShadow();
        ctx.restore();
      }
    }
    function drawLines(ox, align, riseX) {
      ctx.font = fontStr(800, fs, 'd'); ctx.textBaseline = 'middle'; ctx.textAlign = align;
      lines.forEach((ln, i) => {
        const pr = eOutCubic(inv(t, 0.16 + i * 0.24, 0.16 + i * 0.24 + 0.55)); if (pr <= 0) return;
        ctx.save(); ctx.globalAlpha *= pr; ctx.fillStyle = INK; setShadow('rgba(0,0,0,0.5)', 6, 2);   // sombra -> legible sobre fondos calidos/ocupados
        ctx.fillText(ln, ox + (riseX ? (1 - pr) * 18 : 0), topY + i * lh + (riseX ? 0 : (1 - pr) * 24)); noShadow(); ctx.restore();
      });
    }
    if (left) {
      const ax = W * 0.13, bh = lines.length * lh, rr = eOutCubic(clamp(inv(t, 0.05, 0.6), 0, 1));
      if (rr > 0) { ctx.save(); ctx.fillStyle = accent(0, topY - lh * 0.5, 0, topY - lh * 0.5 + bh); ctx.beginPath(); ctx.roundRect(ax - 20, topY - lh * 0.5, 5, bh * rr, 2.5); ctx.fill(); ctx.restore(); }
      drawLines(ax, 'left', true);
    } else if (style === 'quote') {
      const cx = W / 2, qp = eOutBack(clamp(inv(t, 0.05, 0.55), 0, 1));
      if (qp > 0) { ctx.save(); ctx.globalAlpha *= 0.85 * qp; ctx.font = fontStr(800, Math.round(86 * qp), 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = _lighten(A1, 0.5); setShadow('rgba(0,0,0,0.45)', 6, 1); ctx.fillText('“', cx, topY - lh * 0.18); noShadow(); ctx.restore(); }
      drawLines(cx, 'center', false);
      const qcp = eOutBack(clamp(inv(t, 0.55, 1.05), 0, 1));   // comilla de CIERRE espejada al final -> par completo, legible como la apertura
      if (qcp > 0) { const ly = topY + (lines.length - 1) * lh; ctx.save(); ctx.globalAlpha *= 0.85 * qcp; ctx.font = fontStr(800, Math.round(86 * qcp), 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = _lighten(A1, 0.5); setShadow('rgba(0,0,0,0.45)', 6, 1); ctx.fillText('”', cx, ly + lh * 0.7); noShadow(); ctx.restore(); }
    } else if (style === 'panel') {
      const cx = W / 2, longest = Math.max.apply(null, lines.map(l => ctx.measureText(l).width));
      const pw = Math.min(W * 0.86, longest + 56), ph = lines.length * lh + 40, py = topY - lh * 0.5 - 20;
      const pp = eOutCubic(clamp(inv(t, 0.05, 0.55), 0, 1));
      if (pp > 0) { ctx.save(); ctx.globalAlpha *= pp; ctx.fillStyle = _panelFill(); ctx.strokeStyle = _panelStroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, pw, ph, 18); ctx.fill(); ctx.stroke(); ctx.fillStyle = accent(0, py, 0, py + ph); ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, 6, ph, 3); ctx.fill(); ctx.restore(); }
      drawLines(cx, 'center', false);
    } else {
      const cx = W / 2, kr = eOutBack(clamp(inv(t, 0.05, 0.5), 0, 1));
      if (kr > 0) { ctx.save(); ctx.fillStyle = accent(cx - 30, 0, cx + 30, 0); ctx.beginPath(); ctx.roundRect(cx - 28 * kr, topY - lh * 0.5 - 30, 56 * kr, 5, 3); ctx.fill(); ctx.restore(); }
      drawLines(cx, 'center', false);
      const uStart = 0.16 + lines.length * 0.24 + 0.12, up = eInOutCubic(inv(t, uStart, uStart + 0.5));
      if (up > 0) {
        const uy = topY + (lines.length - 1) * lh + fs * 0.72, half = Math.min(maxW, ctx.measureText(lines[lines.length - 1]).width) / 2 + 6;
        ctx.save(); ctx.fillStyle = accent(cx - half, uy, cx + half, uy); ctx.beginPath(); ctx.roundRect(cx - half, uy, half * 2 * up, 5, 3); ctx.fill(); ctx.restore();
        if (up >= 0.99) {   // glint que recorre el subrayado durante la lectura -> el beat tipografico no queda inmovil
          const gx = cx - half + (Math.sin(_holdT * 1.05) * 0.5 + 0.5) * (half * 2 - 30);
          ctx.save(); ctx.globalAlpha *= 0.5; ctx.fillStyle = _rgba(_lighten(A1, 0.55), 0.7); ctx.beginPath(); ctx.roundRect(gx, uy, 30, 5, 3); ctx.fill(); ctx.restore();
        }
      }
    }
  }

  // ESCENA: bigStat — un numero que cuenta de 0 al valor + label debajo. El beat de "dato que impacta".
  // Solo con un numero REAL del sitio. Nativo de Canvas, limpio.
  function sceneBigStat(t, p = {}) {
    const cy = H * 0.44, al = _pickAlign(p), ax = al === 'left' ? W * 0.12 : W / 2;
    const value = Number(p.value) || 0;
    const prog = eOutCubic(inv(t, 0.2, 1.5));   // conteo mas agil (antes 1.7) -> menos hold muerto
    const shown = value * prog;
    const dec = (value % 1 !== 0) ? 1 : 0;
    const fmt = (v) => v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const full = (p.prefix || '') + fmt(value) + (p.suffix || '');
    const num = (p.prefix || '') + fmt(shown) + (p.suffix || '');
    const suf = p.suffix || '', pref = p.prefix || '';
    const isPct = /%/.test(suf), barFill = (isPct ? clamp(value / 100, 0, 1) : 1) * clamp(prog, 0, 1);
    // KICKER arriba (contexto) -> jerarquia, no un numero solo y centrado en el vacio.
    const kick = (p.kicker || (isPct ? 'EN RESULTADOS' : (/m2|m²/i.test(suf) ? 'SUPERFICIE' : (/[$]|USD|ARS/.test(pref + suf) ? 'DESDE' : '')))).toUpperCase();
    const kp = inv(t, 0.15, 0.55);
    const pop = lerp(0.74, 1, eOutCubic(inv(t, 0.1, 0.55))), pulse = 1 + Math.sin(_holdT * 2.1) * 0.012;
    // LAYOUT del bigStat (rompe "el mismo dato con barra siempre"): bar | ring (anillo, SOLO %) | plain (sin barra,
    // regla de acento). Explicito (p.statLayout) o por SEMILLA de marca. ring requiere %.
    const _blOpts = isPct ? ['bar', 'ring', 'plain'] : ['bar', 'plain', 'bar'];
    const layout = (['bar', 'ring', 'plain'].indexOf(p.statLayout) >= 0 && (p.statLayout !== 'ring' || isPct))
      ? p.statLayout : _blOpts[(mulberry32(((SEED || 1) ^ 0xB1A7E5) >>> 0)() * _blOpts.length) | 0];

    if (layout === 'ring') {
      // ANILLO de progreso: track + arco de acento que llena a value%; numero (mas chico) en el centro. Look "gauge".
      const R = 116, lw = 14, ccx = al === 'left' ? W * 0.34 : W / 2, ccy = cy;
      if (kick && kp > 0) { ctx.save(); ctx.globalAlpha = kp; ctx.font = fontStr(700, 18, 'a'); ctx.fillStyle = _accentInk(A1, 0.42); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(kick, ccx, ccy - R - 26); ctx.restore(); }
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = _rgba(INK, 0.13); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(ccx, ccy, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = _accentPop(A1); setShadow(_rgba(_accentPop(A1), 0.4), 16, 0); ctx.beginPath(); ctx.arc(ccx, ccy, R, -Math.PI / 2, -Math.PI / 2 + TAU * barFill); ctx.stroke(); noShadow();
      ctx.restore();
      const rfs = fitFont(full, 62, R * 1.7, 26, 800, 'd');
      ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.38); ctx.translate(ccx, ccy); ctx.scale(pop * pulse, pop * pulse);
      ctx.font = fontStr(800, rfs, 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = TONE === 'light' ? _accentInk(A1) : _accentPop(A1); ctx.fillText(num, 0, 0); ctx.restore();
      if (p.label) { const lp = inv(t, 1.0, 1.4); if (lp > 0) { ctx.save(); ctx.globalAlpha = clamp(lp * 1.4, 0, 1); ctx.font = fontStr(600, fitFont(p.label, 23, W * 0.82, 14, 600, 't'), 't'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = DIM; ctx.fillText(p.label, ccx, ccy + R + 32); ctx.restore(); } }
      return;
    }
    // bar / plain: numero grande (gradiente) + kicker arriba
    const fs = fitFont(full, 104, al === 'left' ? W * 0.78 : W * 0.86, 40, 800, 'd');
    if (kick && kp > 0) { ctx.save(); ctx.globalAlpha = kp; ctx.font = fontStr(700, 18, 'a'); ctx.fillStyle = _accentInk(A1, 0.42); ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.fillText(kick, ax, cy - fs * 0.6 - 16); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.38); ctx.translate(ax, cy); ctx.scale(pop * pulse, pop * pulse); ctx.translate(-ax, -cy);
    ctx.font = fontStr(800, fs, 'd'); ctx.textAlign = al; ctx.textBaseline = 'middle';
    const ng = ctx.createLinearGradient(ax - (al === 'left' ? 0 : 130), cy, ax + (al === 'left' ? 270 : 130), cy);
    ng.addColorStop(0, TONE === 'light' ? _accentInk(A1) : _accentPop(A1)); ng.addColorStop(1, TONE === 'light' ? _accentInk(A2) : _accentPop(A2));
    ctx.fillStyle = ng; setShadow(_rgba(_accentPop(A1), 0.35), 18, 2); ctx.fillText(num, ax, cy); noShadow();
    ctx.restore();
    const by = cy + fs * 0.5 + 28;
    if (layout === 'bar') {
      const bw = al === 'left' ? W * 0.5 : W * 0.58, bx = al === 'left' ? ax : W / 2 - bw / 2, bh = 9;
      ctx.save(); ctx.fillStyle = _rgba(INK, 0.13); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4.5); ctx.fill();
      ctx.fillStyle = _accentPop(A1); ctx.beginPath(); ctx.roundRect(bx, by, bw * barFill, bh, 4.5); ctx.fill(); ctx.restore();
    } else {   // plain: regla de acento corta (editorial, sin barra de progreso)
      const rw = al === 'left' ? 92 : 120, rx = al === 'left' ? ax : W / 2 - rw / 2, rp = eOutCubic(clamp(inv(t, 0.6, 1.1), 0, 1));
      ctx.save(); ctx.fillStyle = accent(rx, by, rx + rw, by); ctx.beginPath(); ctx.roundRect(rx, by, rw * rp, 5, 2.5); ctx.fill(); ctx.restore();
    }
    if (p.label) { const lp = inv(t, 1.0, 1.4); if (lp > 0) { ctx.save(); ctx.globalAlpha = clamp(lp * 1.4, 0, 1); ctx.font = fontStr(600, fitFont(p.label, 23, W * 0.82, 14, 600, 't'), 't'); ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.fillStyle = DIM; ctx.fillText(p.label, ax, by + 30); ctx.restore(); } }
  }

  // =========================================================================
  // MOTOR DECLARATIVO POR KEYFRAMES + MORPH (lo COMPONE la IA, no esta horneado).
  // Una escena { type:'scene', elements:[...] }. Cada elemento tiene una pista de
  // keyframes con props (x,y,w,h,r,rot,scale,opacity,fill,shape,...). El motor
  // interpola con easing POR TRAMO. Las FORMAS son parametricas: un "rounded box"
  // donde punto/circulo/pildora/barra/caja/linea son casos de (w,h,r) => el MORPH
  // entre formas = interpolar (w,h,r). Robusto: todo tiene default y guarda anti-NaN,
  // asi lo que componga la IA SIEMPRE renderiza algo coherente y fluido.
  // =========================================================================
  const _EASES = { linear: t => t, outCubic: eOutCubic, inCubic: eInCubic, inOutCubic: eInOutCubic, outBack: eOutBack, outElastic: eOutElastic, smooth };
  const _easeOf = n => _EASES[n] || eOutCubic;
  function _hex2rgb(h) {
    if (typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h)) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    return null;
  }
  // formas nombradas -> (w,h,r) base; la IA puede pisar w/h/r explicitos en cada keyframe
  const _SHAPES = {
    dot: { w: 14, h: 14, r: 7 }, circle: { w: 84, h: 84, r: 42 }, pill: { w: 240, h: 74, r: 37 },
    bar: { w: 240, h: 12, r: 6 }, box: { w: 150, h: 120, r: 18 }, card: { w: 300, h: 180, r: 22 },
    line: { w: 240, h: 4, r: 2 }, square: { w: 120, h: 120, r: 16 },
  };
  function _resolveColor(tok) {
    if (typeof tok === 'string') {
      if (tok === 'accent') return A1; if (tok === 'accent2') return A2;
      if (tok === 'ink' || tok === 'light') return INK; if (tok === 'dim') return DIM;
      if (tok === 'dark') return '#1c140a';
      if (tok === 'photoink') return '#f6f8fb'; if (tok === 'photodim') return '#c8d2de';   // texto claro SOBRE foto (scrim oscuro) -> legible sin importar el tono del video
      if (/^#[0-9a-fA-F]{6}$/.test(tok)) return tok;
    }
    return INK;
  }
  // interpola UNA prop numerica a lo largo de los keyframes en el tiempo tt (inherit + easing)
  function _num(keys, tt, prop, dflt) {
    let prev = null;
    for (const k of keys) {
      if (k[prop] === undefined || k[prop] === null) continue;
      if (k.t <= tt) { prev = k; continue; }
      if (prev === null) return Number(k[prop]);
      const span = (k.t - prev.t) || 1e-6;
      const u = _easeOf(k.ease)(clamp((tt - prev.t) / span, 0, 1));
      const v = Number(prev[prop]) + (Number(k[prop]) - Number(prev[prop])) * u;
      return Number.isFinite(v) ? v : dflt;
    }
    if (prev !== null) { const v = Number(prev[prop]); return Number.isFinite(v) ? v : dflt; }
    return dflt;
  }
  // w/h/r: si ningun keyframe las da explicitas, las deriva de los tokens 'shape' (que tambien morphean)
  function _shapeDim(keys, tt, prop, dflt) {
    if (keys.some(k => k[prop] !== undefined)) return _num(keys, tt, prop, dflt);
    let prev = null;
    for (const k of keys) {
      if (!k.shape || !_SHAPES[k.shape]) continue;
      if (k.t <= tt) { prev = k; continue; }
      if (prev === null) return _SHAPES[k.shape][prop];
      const span = (k.t - prev.t) || 1e-6;
      const u = _easeOf(k.ease)(clamp((tt - prev.t) / span, 0, 1));
      return _SHAPES[prev.shape][prop] + (_SHAPES[k.shape][prop] - _SHAPES[prev.shape][prop]) * u;
    }
    if (prev && _SHAPES[prev.shape]) return _SHAPES[prev.shape][prop];
    return dflt;
  }
  // interpola el color (fill) a lo largo de los keyframes; tokens -> hex -> lerp RGB
  function _colorAt(keys, tt, dflt) {
    let prev = null;
    for (const k of keys) {
      if (k.fill === undefined || k.fill === null) continue;
      if (k.t <= tt) { prev = k; continue; }
      const c1 = _hex2rgb(_resolveColor(k.fill));
      if (prev === null) return _resolveColor(k.fill);
      const c0 = _hex2rgb(_resolveColor(prev.fill));
      if (!c0 || !c1) return _resolveColor(k.fill);
      const span = (k.t - prev.t) || 1e-6;
      const u = _easeOf(k.ease)(clamp((tt - prev.t) / span, 0, 1));
      return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * u)},${Math.round(c0[1] + (c1[1] - c0[1]) * u)},${Math.round(c0[2] + (c1[2] - c0[2]) * u)})`;
    }
    if (prev) return _resolveColor(prev.fill);
    return dflt;
  }
  // posicion: bezier cuadratica si el keyframe trae ctrl [cx,cy] (curvas, arcos); si no, lerp recto
  function _pos(keys, tt) {
    let prev = null;
    for (const k of keys) {
      if (k.x === undefined && k.y === undefined) continue;
      if (k.t <= tt) { prev = k; continue; }
      const x1 = k.x !== undefined ? k.x : (prev && prev.x !== undefined ? prev.x : W / 2), y1 = k.y !== undefined ? k.y : (prev && prev.y !== undefined ? prev.y : H / 2);
      if (prev === null) return [x1, y1];
      const x0 = prev.x !== undefined ? prev.x : x1, y0 = prev.y !== undefined ? prev.y : y1;
      const span = (k.t - prev.t) || 1e-6;
      const u = _easeOf(k.ease)(clamp((tt - prev.t) / span, 0, 1));
      if (Array.isArray(k.ctrl) && k.ctrl.length === 2) {
        const mt = 1 - u;
        return [mt * mt * x0 + 2 * mt * u * k.ctrl[0] + u * u * x1, mt * mt * y0 + 2 * mt * u * k.ctrl[1] + u * u * y1];
      }
      return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
    }
    if (prev) return [prev.x !== undefined ? prev.x : W / 2, prev.y !== undefined ? prev.y : H / 2];
    return [W / 2, H / 2];
  }
  // forma "rounded box" parametrica: cubre punto/circulo/pildora/barra/caja/linea con un solo dibujo
  function _drawRoundedShape(x, y, w, h, r, rot, fill, glow) {
    w = Math.max(0, w); h = Math.max(0, h); r = clamp(r, 0, Math.min(w, h) / 2);
    if (w < 0.5 || h < 0.5) return;
    ctx.save();
    ctx.translate(x, y); if (rot) ctx.rotate(rot);
    if (glow) setShadow(_rgba(typeof fill === 'string' && fill[0] === '#' ? fill : A1, 0.45), 26, 8);
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.fill();
    if (glow) noShadow();
    ctx.restore();
  }
  // iconos componibles: reusa los objetos ROBUSTOS ya tuneados + algunos parametricos.
  // La IA los coloca y los mueve via keyframes (la caja voladora = icon 'flyingbox' + curva bezier).
  function _drawIcon(name, scale, alpha, tl) {
    const s = scale;
    if (name === 'box') return drawBox(s);
    if (name === 'flyingbox') return drawBox(s);  // sin alas: la caja voladora se dio de baja
    if (name === 'house') return drawHouse(s, alpha);
    if (name === 'cart') return drawCart(s, alpha);
    if (name === 'check') {
      ctx.fillStyle = '#37d39a'; setShadow(_rgba('#37d39a', 0.5), 14, 4); ctx.beginPath(); ctx.arc(0, 0, 16 * s, 0, TAU); ctx.fill(); noShadow();
      ctx.strokeStyle = '#0a2218'; ctx.lineWidth = 3.4 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-6 * s, 0); ctx.lineTo(-2 * s, 5 * s); ctx.lineTo(7 * s, -6 * s); ctx.stroke(); return;
    }
    if (name === 'star') {
      ctx.fillStyle = A1; setShadow(_rgba(A1, 0.4), 16, 4); ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 7 : 16) * s; if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); noShadow(); return;
    }
    if (name === 'leaf') {
      ctx.fillStyle = A1; ctx.beginPath(); ctx.moveTo(0, -18 * s); ctx.quadraticCurveTo(16 * s, -2 * s, 0, 18 * s); ctx.quadraticCurveTo(-16 * s, -2 * s, 0, -18 * s); ctx.fill();
      ctx.strokeStyle = _rgba('#ffffff', 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -15 * s); ctx.lineTo(0, 15 * s); ctx.stroke(); return;
    }
    ctx.fillStyle = A1; ctx.beginPath(); ctx.arc(0, 0, 8 * s, 0, TAU); ctx.fill();
  }
  // ---------- MORPH de formas: siluetas nombradas que se interpolan punto a punto ----------
  // La IA anima keyframes con 'form' (circle, star, blob, heart, leaf, triangle, hexagon, plus...)
  // y opcional 'r'; el motor re-muestrea cada silueta a N puntos y las funde => morph REAL.
  function _formPoints(form, r) {
    r = Math.max(1, r || 60);
    const poly = (n, rot0 = -Math.PI / 2) => { const a = []; for (let i = 0; i < n; i++) { const an = rot0 + i / n * TAU; a.push({ x: Math.cos(an) * r, y: Math.sin(an) * r }); } return a; };
    switch (form) {
      case 'circle': case 'ring': return poly(44);
      case 'square': return [{ x: -r, y: -r }, { x: r, y: -r }, { x: r, y: r }, { x: -r, y: r }];
      case 'diamond': return poly(4, -Math.PI / 2);
      case 'triangle': return poly(3, -Math.PI / 2);
      case 'pentagon': return poly(5, -Math.PI / 2);
      case 'hexagon': return poly(6, -Math.PI / 2);
      case 'star': { const a = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i / 10 * TAU; const rr = i % 2 ? r * 0.45 : r; a.push({ x: Math.cos(an) * rr, y: Math.sin(an) * rr }); } return a; }
      case 'plus': { const t = r * 0.38; return [{ x: -t, y: -r }, { x: t, y: -r }, { x: t, y: -t }, { x: r, y: -t }, { x: r, y: t }, { x: t, y: t }, { x: t, y: r }, { x: -t, y: r }, { x: -t, y: t }, { x: -r, y: t }, { x: -r, y: -t }, { x: -t, y: -t }]; }
      case 'heart': { const a = []; const N = 40; for (let i = 0; i < N; i++) { const tt = i / N * TAU; const x = 16 * Math.pow(Math.sin(tt), 3); const y = -(13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt)); a.push({ x: x / 17 * r, y: y / 17 * r }); } return a; }
      case 'leaf': { const a = []; const N = 26; for (let i = 0; i <= N; i++) { const tt = i / N; a.push({ x: Math.sin(tt * Math.PI) * r * 0.6, y: -r + tt * 2 * r }); } for (let i = 0; i <= N; i++) { const tt = i / N; a.push({ x: -Math.sin((1 - tt) * Math.PI) * r * 0.6, y: r - (1 - tt) * 2 * r }); } return a; }
      case 'drop': { const a = []; const N = 44, m = 2; for (let i = 0; i < N; i++) { const tt = i / N * TAU; const px = Math.cos(tt), py = Math.sin(tt) * Math.pow(Math.sin(tt / 2), m); a.push({ x: py * r, y: -px * r }); } return a; }
      case 'flower': { const a = []; const N = 60, pet = 5; for (let i = 0; i < N; i++) { const an = i / N * TAU; const rr = r * (0.45 + 0.55 * Math.abs(Math.cos(pet * an / 2))); a.push({ x: Math.cos(an) * rr, y: Math.sin(an) * rr }); } return a; }
      case 'shield': return [{ x: 0, y: -r }, { x: r * 0.82, y: -r * 0.66 }, { x: r * 0.82, y: r * 0.2 }, { x: 0, y: r }, { x: -r * 0.82, y: r * 0.2 }, { x: -r * 0.82, y: -r * 0.66 }];
      case 'blob': default: { const a = []; const M = 8; for (let i = 0; i < M; i++) { const an = i / M * TAU; const rr = r * (0.82 + 0.24 * Math.sin(i * 1.9 + 1)); a.push({ x: Math.cos(an) * rr, y: Math.sin(an) * rr }); } return a; }
    }
  }
  // re-muestrea un poligono cerrado a n puntos equiespaciados por longitud de arco (para morphear formas distintas)
  function _resample(pts, n) {
    if (!pts || pts.length < 2) return Array.from({ length: n }, () => ({ x: 0, y: 0 }));
    const segs = []; let total = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const d = Math.hypot(b.x - a.x, b.y - a.y); segs.push(d); total += d; }
    if (total < 1e-6) return Array.from({ length: n }, () => ({ x: pts[0].x, y: pts[0].y }));
    const out = []; const step = total / n; let si = 0, sacc = 0;
    for (let k = 0; k < n; k++) { const target = k * step; while (si < segs.length - 1 && sacc + segs[si] < target) { sacc += segs[si]; si++; } const a = pts[si], b = pts[(si + 1) % pts.length]; const f = clamp((target - sacc) / (segs[si] || 1), 0, 1); out.push({ x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) }); }
    return out;
  }
  // alinea la forma DESTINO con la de ORIGEN (rota el arreglo ciclicamente) para que el morph no se "tuerza".
  function _alignPts(from, to) {
    const n = to.length; if (n === 0 || from.length !== n) return to;
    let best = 0, bestD = Infinity;
    for (let r = 0; r < n; r++) {
      let d = 0;
      for (let i = 0; i < n; i++) { const a = from[i], b = to[(i + r) % n]; const dx = a.x - b.x, dy = a.y - b.y; d += dx * dx + dy * dy; if (d >= bestD) break; }
      if (d < bestD) { bestD = d; best = r; }
    }
    if (best === 0) return to;
    const out = new Array(n); for (let i = 0; i < n; i++) out[i] = to[(i + best) % n]; return out;
  }
  function _morphAt(keys, tt) {
    const FN = 48; let prev = null;
    const ptsOf = k => _resample(_formPoints(k.form, k.r), FN);
    for (const k of keys) {
      if (!k.form) continue;
      if (k.t <= tt) { prev = k; continue; }
      const cur = ptsOf(k);
      if (prev === null) return cur;
      const a = ptsOf(prev), cur2 = _alignPts(a, cur), span = (k.t - prev.t) || 1e-6, u = _easeOf(k.ease)(clamp((tt - prev.t) / span, 0, 1));
      const out = []; for (let i = 0; i < FN; i++) out.push({ x: lerp(a[i].x, cur2[i].x, u), y: lerp(a[i].y, cur2[i].y, u) });
      return out;
    }
    return prev ? ptsOf(prev) : null;
  }
  function _polyPath(pts) {
    if (!pts || pts.length < 3) return;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }
  // traza una curva CERRADA y SUAVE (Catmull-Rom -> bezier) por los puntos => siluetas organicas, no facetadas.
  function _smoothPath(pts) {
    const n = pts && pts.length; if (!n || n < 3) return _polyPath(pts);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
    }
    ctx.closePath();
  }
  // dibujante GENERICO de escena por keyframes (la IA arma la historia con esto)
  // ---------- ICONOS DE BIBLIOTECA (Iconify) en Canvas via Path2D ----------
  // El backend resuelve un CONCEPTO ("shopping cart") -> {body,width,height} de Iconify y lo embebe
  // en el elemento. Aca parseamos los <path> y los dibujamos escalados, centrados y coloreados.
  const _svgCache = new Map();
  function _parseSvgIcon(body) {
    if (_svgCache.has(body)) return _svgCache.get(body);
    const paths = []; const re = /<path[^>]*\bd="([^"]+)"/g; let m;
    while ((m = re.exec(body))) paths.push(m[1]);
    const stroked = /fill="none"/.test(body) || /\bstroke="(?!none)[^"]+"/.test(body);
    let sw = 2; const sm = body.match(/stroke-width="([\d.]+)"/); if (sm) sw = parseFloat(sm[1]);
    const parsed = { paths, stroked, sw };
    _svgCache.set(body, parsed);
    return parsed;
  }
  function _drawSvgIcon(svg, size, color) {
    if (!svg || !svg.body || typeof Path2D === 'undefined') return;
    const { paths, stroked, sw } = _parseSvgIcon(svg.body);
    if (!paths.length) return;
    const w = svg.width || svg.w || 24, h = svg.height || svg.h || 24;
    const k = (size || 56) / Math.max(w, h);
    ctx.save();
    ctx.translate(-w * k / 2, -h * k / 2); ctx.scale(k, k);
    ctx.fillStyle = color; ctx.strokeStyle = color;
    ctx.lineWidth = sw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    setShadow(_rgba(typeof color === 'string' && color[0] === '#' ? color : A1, 0.32), 16, 4);
    for (const d of paths) { const pp = new Path2D(d); if (stroked) ctx.stroke(pp); else ctx.fill(pp); }
    noShadow();
    ctx.restore();
  }
  // TIPOGRAFIA CINETICA: revela el texto LETRA POR LETRA con stagger (cada una entra desde abajo con un
  // leve overshoot). Asume ctx.font/translate ya seteados; dibuja alrededor del origen segun 'align'.
  function _kineticDraw(str, col, align, t, start, track = 0, weightWave = false) {
    const chars = str.split('');
    const widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + track * Math.max(0, chars.length - 1);   // tracking por rol
    let xoff = align === 'center' ? -total / 2 : align === 'right' ? -total : 0;
    const prevAlign = ctx.textAlign; ctx.textAlign = 'left'; ctx.fillStyle = col;
    const each = Math.min(0.04, 0.4 / Math.max(1, chars.length)), baseAlpha = ctx.globalAlpha;
    // WEIGHT-WAVE (tipografia "de peso variable" emulada): cada glifo nace GRUESO (strokeText del mismo color) y
    // adelgaza a su fill al asentarse -> firma de entrada distinta por marca. clamp(lp,0,1) -> nunca lineWidth<0.
    const maxLW = weightWave ? clamp((parseInt(ctx.font) || 40) * 0.045, 0.6, 3) : 0;
    if (weightWave) { ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
    for (let i = 0; i < chars.length; i++) {
      const lp = eOutBack(clamp((t - start - i * each) / 0.34, 0, 1));   // reveal mas rapido -> menos tiempo "medio tipeado"
      // rise mas corto (12) + curva de alpha mas agresiva (x1.6) -> menos "doble exposicion" en el frame intermedio
      if (lp > 0.001) {
        ctx.globalAlpha = baseAlpha * clamp(lp * 1.6, 0, 1);
        if (weightWave) { const lw = (1 - clamp(lp, 0, 1)) * maxLW; if (lw > 0.05) { ctx.lineWidth = lw; ctx.strokeText(chars[i], xoff, (1 - lp) * 12); } }
        ctx.fillText(chars[i], xoff, (1 - lp) * 12);
      }
      xoff += widths[i] + track;
    }
    ctx.globalAlpha = baseAlpha; ctx.textAlign = prevAlign;
  }
  function sceneSpec(t, p = {}) {
    let els = Array.isArray(p.elements) ? p.elements : [];
    // El usuario NO quiere los "blobs"/figuras geometricas (morph/shape) sobre los titulos -> son las "gotas" feas.
    // Si la escena tiene TEXTO (todo hero lo tiene), OMITIMOS morph/shape: el hero queda tipografico (palabra-heroe
    // + wordmark fantasma + foto si hay), que es justo lo que gusta. Si la escena es SOLO forma (sin texto), se deja
    // para no vaciarla. Cubre el camino de la IA y del mock en un solo lugar.
    if (els.some(e => e && e.kind === 'text')) els = els.filter(e => e && e.kind !== 'morph' && e.kind !== 'shape');
    for (const el of els) {
      const keys = (Array.isArray(el.keys) && el.keys.length) ? el.keys.slice().sort((a, b) => (a.t || 0) - (b.t || 0)) : [{ t: 0 }];
      const op = clamp(_num(keys, t, 'opacity', 1), 0, 1);
      if (op <= 0.001) continue;
      const pos = _pos(keys, t), x = pos[0], y = pos[1];
      const scale = Math.max(0, _num(keys, t, 'scale', 1));
      const rot = _num(keys, t, 'rot', 0) * Math.PI / 180;
      const kind = el.kind || 'shape';
      ctx.save();
      ctx.globalAlpha *= op;
      if (kind === 'photo') {
        // FOTO REAL del sitio (a sangre por defecto, o panel si trae w/h) + Ken Burns + scrim para legibilidad.
        // Sin foto en ese indice -> no dibuja nada (la escena cae a su contenido vectorial).
        const ow = el.w || W, oh = el.h || H, ox = el.w ? (x - ow / 2) : 0, oy = el.h ? (y - oh / 2) : 0;
        const drew = _drawPhoto(PHOTOS[(el.photoIdx || 0) % Math.max(1, PHOTOS.length)], ox, oy, ow, oh, t, (el.photoIdx || 0) * 7 + 1);
        if (drew && el.scrim !== false) {
          const g = ctx.createLinearGradient(0, oy, 0, oy + oh);
          g.addColorStop(0, 'rgba(8,10,16,0.30)'); g.addColorStop(0.42, 'rgba(8,10,16,0)'); g.addColorStop(1, 'rgba(8,10,16,0.92)');
          ctx.fillStyle = g; ctx.fillRect(ox, oy, ow, oh);
          if (el.accentEdge !== false) { ctx.fillStyle = _rgba(A1, 0.9); ctx.fillRect(ox, oy + oh - 4, ow, 4); }   // filo de acento abajo
        }
      } else if (kind === 'text') {
        const str = (el.text || '').toString();
        const size = _num(keys, t, 'size', el.size || 40), weight = el.weight || 800, maxW = el.maxW || W * 0.86;
        const fit = fitFont(str, size, maxW, 14, weight);
        ctx.translate(x, y); if (scale !== 1) ctx.scale(scale, scale); if (rot) ctx.rotate(rot);
        ctx.font = fontStr(weight, fit, 't');
        ctx.textAlign = el.align || 'center'; ctx.textBaseline = 'middle';
        const _tcol = _colorAt(keys, t, _resolveColor(el.fill || 'ink'));
        // tracking por rol: displays grandes apretados (-2%), kickers chicos abiertos (+6%) -> presencia de marca
        const _trk = el.track != null ? el.track : (fit > 44 ? Math.max(-1.2, -fit * 0.02) * (str.length > 8 ? 0.5 : 1) : (fit < 24 ? fit * 0.06 : 0));
        // weight-wave sembrado por marca (~40%) -> el hero tipografico tiene una firma de entrada distinta entre videos
        if (el.kinetic) _kineticDraw(str, _tcol, el.align || 'center', t, (keys[0] && keys[0].t) || 0, _trk, el.weightWave != null ? el.weightWave : (mulberry32(((SEED || 1) ^ 0x77317) >>> 0)() < 0.4));
        else { ctx.fillStyle = _tcol; if (el.fill === 'dim') setShadow(TONE === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)', 8, 0); ctx.fillText(str, 0, 0); if (el.fill === 'dim') noShadow(); }   // halo de contraste opuesto al tono -> el subtitulo 'dim' se lee sobre fondos/figuras (no toca el color, mantiene jerarquia)
      } else if (kind === 'icon') {
        if (el.blur) for (let b = 3; b >= 1; b--) { const tb = Math.max(0, t - b * 0.022); const pb = _pos(keys, tb); const sb = Math.max(0, _num(keys, tb, 'scale', scale)); ctx.save(); ctx.globalAlpha *= 0.1; ctx.translate(pb[0], pb[1]); _drawIcon(el.icon || 'dot', sb, op, tb); ctx.restore(); }
        ctx.translate(x, y); if (rot) ctx.rotate(rot);
        _drawIcon(el.icon || 'dot', scale, op, t);
      } else if (kind === 'svgicon') {
        ctx.translate(x, y); if (rot) ctx.rotate(rot);
        if (el.svg && el.svg.body) _drawSvgIcon(el.svg, (el.size || 56) * scale, _resolveColor(el.fill || 'accent'));
        else _drawIcon(el.icon || 'dot', scale, op, t);
      } else if (kind === 'particles') {
        const n = Math.max(1, el.count || 10), prog = clamp(_num(keys, t, 'burst', clamp(t, 0, 1)), 0, 1);
        ctx.translate(x, y);
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU + (el.phase || 0), d = lerp(10, el.spread || 90, eOutCubic(prog)) * (0.7 + 0.6 * ((i * 2654435761 % 97) / 97)); ctx.globalAlpha = op * (1 - prog) * 0.9; ctx.fillStyle = i % 2 ? A2 : A1; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, el.dotR || 3, 0, TAU); ctx.fill(); }
      } else if (kind === 'orbit') {
        // satelites que ORBITAN el centro (x,y) -> da complejidad y vida al hero. ry<1 = orbita eliptica.
        const n = Math.max(1, el.count || 3), rr = el.r || 120, sp = el.speed || 1.1, ph = el.phase || 0;
        const ry = (el.ry != null) ? el.ry : 1, col = _resolveColor(el.fill || 'accent2');
        const gcol = (typeof col === 'string' && col[0] === '#') ? col : A1;
        for (let i = 0; i < n; i++) {
          const a = t * sp + ph + i * TAU / n;
          ctx.save(); setShadow(_rgba(gcol, 0.5), 12, 0); ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * ry, el.dotR || 6, 0, TAU); ctx.fill(); noShadow(); ctx.restore();
        }
      } else if (kind === 'morph') {
        if (el.blur) for (let b = 3; b >= 1; b--) { const tb = Math.max(0, t - b * 0.022); const pb = _pos(keys, tb); const sb = Math.max(0, _num(keys, tb, 'scale', scale)); const gpts = _morphAt(keys, tb); if (gpts) { ctx.save(); ctx.globalAlpha *= 0.1; ctx.translate(pb[0], pb[1]); if (sb !== 1) ctx.scale(sb, sb); ctx.fillStyle = _colorAt(keys, tb, _resolveColor(el.fill || 'accent')); _smoothPath(gpts); ctx.fill(); ctx.restore(); } }
        const pts = _morphAt(keys, t);
        if (pts) {
          ctx.translate(x, y); if (scale !== 1) ctx.scale(scale, scale); if (rot) ctx.rotate(rot);
          const fill = _colorAt(keys, t, _resolveColor(el.fill || 'accent'));
          if (el.glow !== false) setShadow(_rgba(typeof fill === 'string' && fill[0] === '#' ? fill : A1, 0.4), 24, 6);
          // relleno con GRADIENTE (sheen arriba->base) en vez de color plano -> la forma tiene volumen, no "figurita de stock"
          if (typeof fill === 'string' && fill[0] === '#') {
            let mnY = 1e9, mxY = -1e9; for (const pp of pts) { if (pp.y < mnY) mnY = pp.y; if (pp.y > mxY) mxY = pp.y; }
            const fg = ctx.createLinearGradient(0, mnY, 0, mxY || mnY + 1);
            fg.addColorStop(0, _lighten(fill, 0.22)); fg.addColorStop(1, fill);
            ctx.fillStyle = fg;
          } else { ctx.fillStyle = fill; }
          _smoothPath(pts); ctx.fill();
          if (el.glow !== false) noShadow();
          if (el.stroke) { ctx.strokeStyle = _resolveColor(el.stroke); ctx.lineWidth = el.strokeW || 3; _smoothPath(pts); ctx.stroke(); }
        }
      } else {
        const w = _shapeDim(keys, t, 'w', 80) * scale, h = _shapeDim(keys, t, 'h', 80) * scale;
        const r = _shapeDim(keys, t, 'r', Math.min(w, h) / 2);
        _drawRoundedShape(x, y, w, h, r, rot, _colorAt(keys, t, _resolveColor(el.fill || 'accent')), el.glow !== false);
        if (el.label) {
          const lo = clamp(_num(keys, t, 'labelOpacity', 1), 0, 1);
          if (lo > 0.01) { ctx.globalAlpha *= lo; const fs = fitFont(el.label, el.labelSize || 26, Math.max(20, w * 0.82), 12, 700, 't'); ctx.font = fontStr(700, fs, 't'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = _resolveColor(el.labelFill || 'ink'); ctx.fillText(el.label, x, y); }
        }
      }
      ctx.restore();
    }
  }
  function _specAnimLen(sc) {
    let m = 0; for (const el of (sc.elements || [])) for (const k of (el.keys || [])) if ((k.t || 0) > m) m = k.t;
    return m > 0 ? m : ((sc.e - sc.s) || 3);
  }

  // ===== TIPOS DE ESCENA NUEVOS (vocabulario ampliado -> mas combinaciones -> menos "mismo molde") =====
  const _fmtN = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // ALIGN del contenido: explicito (p.align) o ELEGIDO POR SEMILLA de marca -> no SIEMPRE centrado cuando la IA no
  // lo fija (mismo patron anti-repeticion que checklist/statement/outro). Una sola eleccion por video (SEED) ->
  // consistente DENTRO del video, variada ENTRE videos. ~42% left.
  function _pickAlign(p) {
    if (p && (p.align === 'left' || p.align === 'center')) return p.align;
    return mulberry32(((SEED || 1) ^ 0xA11C0) >>> 0)() < 0.42 ? 'left' : 'center';
  }
  // ESTRELLA de 5 puntas VECTORIAL: el glifo ★ (U+2605) NO esta en las fuentes display -> se renderizaba como
  // "tofu"/caja vacia en el render headless (Skia). Se dibuja por path (geometria pura, determinista). Color dorado
  // por convencion de rating (legible y entendible en cualquier paleta). align ancla la FILA en (x,y).
  const _STAR_GOLD = '#f3b13a';
  function _starPath(cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 === 0 ? r : r * 0.42; const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    ctx.closePath();
  }
  function _drawStarRow(n, x, y, r, align = 'center') {
    n = Math.max(0, Math.min(5, Math.round(n))); if (!n) return;
    const gap = r * 2.5, total = (n - 1) * gap;
    let sx = align === 'left' ? x + r : align === 'right' ? x - total - r : x - total / 2;
    ctx.save(); ctx.fillStyle = _STAR_GOLD; setShadow('rgba(0,0,0,0.25)', 4, 0);
    for (let i = 0; i < n; i++) { _starPath(sx, y, r); ctx.fill(); sx += gap; }
    noShadow(); ctx.restore();
  }
  // REVEAL: gancho corto (1-4 palabras) a pantalla casi completa, apiladas y escalonadas, ultima en acento.
  function sceneReveal(t, p = {}) {
    const text = ((p.text || '').toString().trim()) || 'Mira esto';
    const words = text.split(/\s+/).slice(0, 4), n = words.length;
    const al = _pickAlign(p), ax = al === 'left' ? W * 0.1 : W / 2, baseY = al === 'left' ? H * 0.58 : H * 0.46;
    const fs = fitFont(text, al === 'left' ? 92 : 104, W * 0.82, 44, 800, 'd'), lh = fs * 1.04, startY = baseY - (n - 1) * lh / 2;
    const kick = (p.kicker || '').toUpperCase();
    if (kick) { const kp = inv(t, 0.1, 0.5); if (kp > 0) { ctx.save(); ctx.globalAlpha = kp; ctx.font = fontStr(700, 18, 'a'); ctx.fillStyle = _accentInk(A1, 0.42); ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.fillText(kick, ax, startY - fs * 0.74); ctx.restore(); } }
    ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.font = fontStr(800, fs, 'd');
    words.forEach((wd, i) => {
      const lp = eOutBack(clamp(inv(t, 0.22 + i * 0.13, 0.22 + i * 0.13 + 0.5), 0, 1)); if (lp <= 0) return;
      ctx.save(); ctx.globalAlpha = clamp(lp * 1.5, 0, 1); const yy = startY + i * lh + (1 - lp) * 24;
      ctx.fillStyle = (i === n - 1) ? (TONE === 'light' ? _accentInk(A1) : _accentPop(A1)) : INK;
      if (i === n - 1) setShadow(_rgba(_accentPop(A1), 0.32), 16, 2);
      ctx.fillText(wd, ax, yy); noShadow(); ctx.restore();
    });
    if (al === 'left') { const up = inv(t, 0.5, 0.95); if (up > 0) { ctx.save(); ctx.globalAlpha = up; ctx.fillStyle = _accentPop(A1); ctx.fillRect(ax, startY - fs * 0.55, 56 * eOutCubic(clamp(up, 0, 1)), 6); ctx.restore(); } }
  }
  // NUMBERSTACK: 2-3 numeros que cuentan, en cascada (vs bigStat que es UNO). Llena la pantalla con datos.
  function sceneNumberStack(t, p = {}) {
    const items = (p.items || []).slice(0, 3), n = items.length; if (!n) return;
    const al = _pickAlign(p), tx = al === 'left' ? W * 0.12 : W / 2;
    // PLAN FOCAL: un item DESTACADO (mas grande + acento + subrayado) y el resto subordinado (mas chico/tenue)
    // -> jerarquia clara (antes los 3 pesaban igual, sin foco). Default = el primero (suele ser el gancho, p.ej. $0);
    // el director puede mandar p.focal (indice). Determinista.
    const focal = (Number.isInteger(p.focal) && p.focal >= 0 && p.focal < n) ? p.focal : 0;
    const gap = H * (n === 3 ? 0.21 : 0.26), startY = H * 0.46 - (n - 1) * gap / 2;
    items.forEach((it, i) => {
      const isF = i === focal;
      const d = 0.18 + i * 0.42, ap = inv(t, d, d + 0.4); if (ap <= 0) return;
      const prog = eOutCubic(clamp(inv(t, d, d + 0.9), 0, 1)), y = startY + i * gap;
      const _suf = (it.suffix || ''), _isRating = /[★⭐]/.test(_suf), _sufC = _suf.replace(/[★⭐]/g, '');   // ★ -> estrella vectorial (no tofu)
      // decimales como bigStat: dec se deriva del valor COMPLETO (no del animado) -> sin parpadeo de decimales en el conteo.
      const _nv = Number(it.value) || 0, _dec = (_nv % 1 !== 0) ? 1 : 0;
      const val = (it.prefix || '') + (_nv * prog).toFixed(_dec).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + _sufC;
      const pop = lerp(0.8, 1, eOutBack(clamp(ap, 0, 1)));
      ctx.save(); ctx.globalAlpha = clamp(ap * 1.4, 0, 1) * (isF ? 1 : 0.78); ctx.translate(tx, y); ctx.scale(pop, pop);
      const nfs = fitFont(val, isF ? 80 : 54, W * 0.8, 30, 800, 'd');
      ctx.font = fontStr(800, nfs, 'd'); ctx.textAlign = al; ctx.textBaseline = 'middle';
      ctx.fillStyle = isF ? _accentPop(A1) : (TONE === 'light' ? _accentInk(A1) : _lighten(A1, 0.12));
      setShadow(_rgba(_accentPop(A1), isF ? 0.4 : 0.2), isF ? 18 : 12, 2); ctx.fillText(val, 0, -10); noShadow();
      if (_isRating) { ctx.font = fontStr(800, nfs, 'd'); const _w = ctx.measureText(val).width, _sx = (al === 'left' ? _w : _w / 2) + nfs * 0.44; _drawStarRow(1, _sx, -10, nfs * 0.34, 'left'); }   // estrella de rating al lado del numero
      if (isF) { const uw = nfs * 0.5, ux = al === 'left' ? 0 : -uw / 2; ctx.fillStyle = accent(ux, 0, ux + uw, 0); ctx.beginPath(); ctx.roundRect(ux, 20, uw * eOutCubic(clamp(ap, 0, 1)), 4, 2); ctx.fill(); }   // subrayado de acento bajo el plan focal (sin copy extra)
      if (it.label) { const _lb = String(it.label); ctx.font = fontStr(isF ? 700 : 600, fitFont(_lb, isF ? 20 : 18, W * 0.74, 13, isF ? 700 : 600, 't'), 't'); ctx.fillStyle = isF ? INK : DIM; setShadow(TONE === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)', 8, 0); ctx.fillText(_lb, 0, isF ? 40 : 30); noShadow(); }   // fitFont -> label entero; focal mas brillante/grande
      ctx.restore();
    });
  }
  // QUOTE: testimonio con comillas grandes + estrellas + autor (prueba social). Layout de "card", distinto.
  function sceneQuote(t, p = {}) {
    const text = ((p.text || '').toString()) || 'Lo recomiendo 100%', cy = H * 0.42;
    const al = _pickAlign(p), ax = al === 'left' ? W * 0.1 : W / 2, maxw = W * 0.8;
    const qp = eOutBack(clamp(inv(t, 0.05, 0.5), 0, 1));
    if (qp > 0) { ctx.save(); ctx.globalAlpha = 0.55 * qp; ctx.font = fontStr(800, Math.round(150 * qp), 'd'); ctx.textAlign = al; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = _lighten(A1, 0.4); ctx.fillText('“', ax, cy - 40); ctx.restore(); }
    const fit = fitFont(text, text.length > 38 ? 34 : 42, maxw, 24, 700, 't');
    ctx.font = fontStr(700, fit, 't'); ctx.textAlign = al; ctx.textBaseline = 'middle';
    const words = text.split(/\s+/), lines = []; let ln = '';
    for (const wd of words) { const tryl = ln ? ln + ' ' + wd : wd; if (ctx.measureText(tryl).width > maxw && ln) { lines.push(ln); ln = wd; } else ln = tryl; }
    if (ln) lines.push(ln);
    const lh = fit * 1.22, top = cy - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => { const lp = inv(t, 0.35 + i * 0.12, 0.35 + i * 0.12 + 0.5); if (lp <= 0) return; ctx.save(); ctx.globalAlpha = clamp(lp * 1.4, 0, 1); ctx.fillStyle = INK; ctx.fillText(l, ax, top + i * lh + (1 - eOutCubic(clamp(lp, 0, 1))) * 12); ctx.restore(); });
    const stars = Math.max(0, Math.min(5, p.stars || 0)), sy = top + lines.length * lh + 6, sp = inv(t, 0.9, 1.3);
    if (stars && sp > 0) { ctx.save(); ctx.globalAlpha = sp; _drawStarRow(stars, ax, sy + 18, 13, al); ctx.restore(); }   // estrellas VECTORIALES (antes el glifo ★ daba tofu)
    if (p.author) { const aap = inv(t, 1.1, 1.5); if (aap > 0) { ctx.save(); ctx.globalAlpha = clamp(aap * 1.4, 0, 1); ctx.font = fontStr(600, 21, 't'); ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.fillStyle = DIM; ctx.fillText('— ' + p.author, ax, sy + (stars ? 58 : 30)); ctx.restore(); } }
  }
  // SPLIT: pantalla partida -> FOTO real una mitad (wipe-open) + panel de color de marca con titular/CTA en la otra.
  function sceneSplit(t, p = {}) {
    const right = p.side === 'right', halfW = W * 0.52, fx = right ? W - halfW : 0, panelX = right ? 0 : halfW, panelW = W - halfW;
    const wp = eOutCubic(clamp(inv(t, 0.1, 0.75), 0, 1));
    ctx.save(); ctx.beginPath(); ctx.rect(right ? W - halfW * wp : 0, 0, halfW * wp, H); ctx.clip();   // wipe-open de la foto
    const drew = _drawPhoto(PHOTOS[(p.photoIdx || 0) % Math.max(1, PHOTOS.length)], fx, 0, halfW, H, t, 3);
    ctx.restore();
    if (!drew) { ctx.save(); ctx.fillStyle = _rgba(A1, 0.18); ctx.fillRect(fx, 0, halfW, H); ctx.restore(); }   // fallback: bloque de acento
    const aH = _hexToHsl(A1 || '#3aa0ff'), pg = ctx.createLinearGradient(panelX, 0, panelX, H);   // panel de marca (dark)
    pg.addColorStop(0, _hslToHex(aH.h, 0.5, 0.24)); pg.addColorStop(1, _hslToHex(aH.h, 0.55, 0.14));
    ctx.save(); ctx.fillStyle = pg; ctx.fillRect(panelX, 0, panelW, H); ctx.restore();
    const tcx = panelX + panelW / 2, ti = inv(t, 0.4, 0.9);
    if (ti > 0 && p.title) { ctx.save(); ctx.globalAlpha = clamp(ti * 1.4, 0, 1); ctx.font = fontStr(800, fitFont(p.title, 40, panelW - 28, 22, 800, 'd'), 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f6f8fb'; ctx.fillText(p.title, tcx, H * 0.42 + (1 - eOutBack(clamp(ti, 0, 1))) * 14); ctx.restore(); }
    if (p.sub) fxText(p.sub, tcx, H * 0.54, 20, inv(t, 0.8, 1.2), 600, '#c8d2de', panelW - 30, 't');
    if (p.cta) { const cp = inv(t, 1.0, 1.4); if (cp > 0) { ctx.save(); ctx.globalAlpha = cp; ctx.font = fontStr(800, 20, 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = _accentPop(A1); ctx.fillText(p.cta + '  ›', tcx, H * 0.66); ctx.restore(); } }
  }

  const DRAWERS = { paintTitle: sceneTitle, deliver: sceneCart, checklist: sceneList, outro: sceneOutro, statement: sceneStatement, bigStat: sceneBigStat, scene: sceneSpec, reveal: sceneReveal, numberStack: sceneNumberStack, quote: sceneQuote, split: sceneSplit };
  // Cuanto dura la COREOGRAFIA de cada escena (segundos). Pasado esto, el motor CONGELA el frame final
  // = tiempo de lectura. Asi: durationInFrames = animacion + lectura (mas largo = mas tiempo para leer).
  const ANIM_LEN = { paintTitle: 6.0, deliver: 6.4, checklist: 3.9, outro: 3.2, statement: 2.6, bigStat: 1.9, reveal: 1.8, numberStack: 2.4, quote: 2.6, split: 2.0 };
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

  // Semilla del fondo: la explicita del timeline, o una derivada ESTABLE de marca+tema+acento.
  function _seedFor(tl) {
    if (tl && typeof tl.seed === 'number' && isFinite(tl.seed)) return tl.seed >>> 0;
    return hashSeed((tl ? (tl.brand || '') + '|' + (tl.theme || '') + '|' + (tl.accent || '') : 'urvid'));
  }

  // API aislada para la seccion "Fondo" del sidebar (lab): dibuja SOLO el fondo fluido, sin escenas.
  function drawBackground(c, t, opts) {
    ctx = c;
    const o = opts || {};
    setAccent(o.accent);
    setTheme(o.theme);
    setSeed((typeof o.seed === 'number' && isFinite(o.seed)) ? (o.seed >>> 0) : hashSeed(o.seed));
    setTexture(o.texture);
    setBgStyle(o.bgStyle);
    setTone(o.tone);
    setShadowMode(o.shadowMode);
    setMotif(o.motif);
    setSubstrate(o.substrate);
    ctx.clearRect(0, 0, W, H);
    drawBg(t);
  }

  function drawFrame(c, t, timeline, opts) {
    ctx = c;
    const tl = pickTimeline(timeline);
    setAccent(tl.accent);
    setTheme(tl.theme);
    setSeed(_seedFor(tl));
    setTexture(tl.texture);
    setEnergy(tl.bgEnergy);
    setBgStyle(tl.bgStyle);
    setTone(tl.tone);
    setShadowMode(tl.shadowMode);
    setMotif(tl.motif);
    setSubstrate(tl.substrate);
    setFonts(tl);
    _BRAND = (tl.brand || '').toString();
    ctx.clearRect(0, 0, W, H);
    // CAMARA COMPARTIDA (parallax + reloj unico): un solo vector continuo (global t, armonicos ENTEROS de _PHI
    // -> sin "beating") que mueve fondo y contenido juntos. El fondo a ~32% de profundidad; el contenido al 100%.
    // la camara VARIA por marca (velocidad/amplitud/direccion/fase sembradas) -> el "feel" del movimiento no es
    // identico en todos los videos. Armonicos enteros (1,2) por dentro -> sigue sin beating. Constante por video (re-seed por frame).
    const _cr = mulberry32(((SEED || 1) ^ 0xCA3F1) >>> 0);
    const _PHI = _harm(_cr, 13, 20), _dir = _cr() < 0.5 ? -1 : 1, _ph = _cr() * 6.28;   // camara snapeada a la grilla de CLK -> no bate contra la deriva del fondo (mismos armonicos)
    const _camPanX = Math.sin(t * _PHI + _ph) * (8 + _cr() * 7) * _dir, _camPanY = Math.sin(t * _PHI * 2 + _ph) * (4 + _cr() * 4), _camBreath = 1 + Math.cos(t * _PHI) * 0.006;
    drawBg(t, _camPanX * 0.32, _camPanY * 0.32, 1.045 * _camBreath);   // el "breath" (respiracion) vive en el FONDO, no en el texto -> el fondo tiene vida y el texto queda clavado
    if (opts && opts.bgOnly) return;   // modo "solo fondo" (para la sonda de legibilidad: full vs bg -> mascara de contenido)
    const _scenes = layout(tl);
    const XF = 0.3; // cross-fade mas corto -> cortes mas agiles/punchy (menos "todo se funde lento")
    // FIRMA TYPOGRAPHIC: el wordmark de la marca GIGANTE y fantasma (sangra fuera de cuadro, 2 lineas que
    // derivan) ES el fondo -> hace el estilo inequivoco sin costo de legibilidad (alpha bajo, detras del texto).
    if (BG_STYLE === 'typo') {
      const _word = (tl.brand || '').trim().toUpperCase();
      if (_word) {
        ctx.save(); ctx.font = fontStr(900, 300, 'd');
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.globalAlpha = TONE === 'light' ? 0.06 : 0.075; ctx.fillStyle = INK;
        const _gd = (t * 8) % 380;
        ctx.fillText(_word, -_gd, H * 0.31); ctx.fillText(_word, -_gd + 64, H * 0.63);
        ctx.restore();
      }
    }
    // FIRMA AMBIENTAL: la forma firma de la marca persiste como marca de agua viva (a la deriva, en la
    // esquina OPUESTA al texto -> tambien hace contrapeso compositivo) durante el bloque de contenido
    // (statement/checklist). Asi la identidad NO se muere a mitad del reel. Se dibuja DETRAS del contenido.
    // En 'typo' se omite (el wordmark fantasma ya es la firma ambiental -> evita doble texto tenue).
    const _mono = BG_STYLE === 'typo' ? '' : (tl.brand || '').trim().charAt(0).toUpperCase();
    if (_mono) {
      const _wac = _accentInk(_resolveColor('accent'), 0.12);   // tone-aware: claro->oscurece, oscuro->aclara
      const _lAcc = _hexToHsl(_wac).l, _lBg = TONE === 'light' ? 0.92 : _hexToHsl((BG && BG[0]) ? BG[0] : '#223040').l;
      const _wAlpha = lerp(0.30, 0.17, clamp(Math.abs(_lAcc - _lBg) / 0.34, 0, 1));   // bajo contraste con el fondo -> mas alpha (legible sobre fondos claros / verde-sobre-verde)
      const _wph = ((tl.seed || 1) % 997) / 158;   // fase de deriva SEMBRADA por marca -> cada watermark tiene su gesto propio
      for (let si = 0; si < _scenes.length; si++) {
        const sc = _scenes[si];
        if (sc.type !== 'statement' && sc.type !== 'checklist') continue;
        if (t < sc.s || t >= sc.e) continue;
        const tail = (_scenes[si + 1] && _scenes[si + 1].type === 'outro') ? 0.9 : 0.5;   // si sigue el outro, fundir antes -> nunca comparte frame con el CTA
        const aa = clamp(Math.min(inv(t, sc.s, sc.s + 0.5), 1 - inv(t, sc.e - tail, sc.e)), 0, 1) * _wAlpha;
        if (aa <= 0) continue;
        const leftAnch = sc.listAnchor === 'left' || sc.stmtStyle === 'left';
        // en CHECKLIST el monograma va CHICO a la esquina superior-externa (fuera de las filas) -> no se come
        // la legibilidad de los items (era el bug del panel: la "A" gigante DETRAS de la lista). En statement
        // queda grande y a la deriva abajo, donde hay aire.
        const isChk = sc.type === 'checklist';
        const mx = leftAnch ? W - (isChk ? 56 : 76) : (isChk ? 56 : 76), my = isChk ? 90 : H - 138;
        const fs = isChk ? 84 : 122;   // statement: monograma MAS CHICO y a la esquina inferior -> textura, no "letra fantasma" que cruza el texto
        ctx.save(); ctx.globalAlpha = aa * (isChk ? 0.55 : 0.42);   // mucho mas tenue en statement (antes 1) -> deja de leerse como artefacto/glitch
        ctx.translate(mx + Math.sin(t * CLK * 16 + _wph) * 6, my + Math.cos(t * CLK * 13 + _wph) * 6); ctx.rotate(Math.sin(t * CLK * 10 + _wph) * 0.05);   // vaiven minimo en armonicos de CLK (la marca de agua co-aparece con texto+camara -> grilla compartida)
        ctx.font = fontStr(800, fs, 'd'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        setShadow(_rgba(_wac, 0.4), 14, 0); ctx.fillStyle = _wac; ctx.fillText(_mono, 0, 0); noShadow();   // MONOGRAMA: inicial de la marca como marca de agua (mas de marca que una figura)
        ctx.restore();
      }
    }
    _scenes.forEach((sc, i) => {
      const drawer = DRAWERS[sc.type];
      if (!drawer) return;
      const isLast = i === _scenes.length - 1;
      const dur = sc.e - sc.s;
      // la saliente (no la ultima) se funde DESPUES de su salida, solapando la entrada de la proxima.
      // la ultima se funde dentro de su tramo => el total NO cambia (no rompe el conteo de frames).
      const foStart = isLast ? sc.e - 0.5 : sc.e;
      const foDur = isLast ? 0.5 : XF;
      const renderEnd = isLast ? sc.e : sc.e + XF;
      if (t < sc.s || t >= renderEnd) return;
      // fade-in mas corto (~match del cross-fade saliente) -> entrante sube mientras la saliente baja
      // de forma casi complementaria: el cruce no deja "valle de brillo" (el fondo no se asoma a mitad).
      const fin = eInOutCubic(inv(t, sc.s, sc.s + (i === 0 ? 0.5 : XF + 0.06)));
      const fout = eInOutCubic(1 - inv(t, foStart, foStart + foDur));
      const a = clamp(Math.min(fin, fout), 0, 1);
      if (a <= 0) return;
      // tiempo de LECTURA: anima a velocidad natural hasta ANIM_LEN y despues congela el frame final.
      const local = t - sc.s;
      const animLen = sc.type === 'scene' ? _specAnimLen(sc) : (ANIM_LEN[sc.type] || dur);
      const tFed = Math.min(local, animLen);
      // CAMARA: push-in lento y CONTINUO durante toda la escena (Ken Burns) + paneo suave alterno por
      // escena -> cada beat se siente como un movimiento de camara, no un frame estatico que solo respira.
      // CAMARA C1-CONTINUA: entrada con push del 4% que ASIENTA a 1.0 via smootherstep (derivada 0 en ambos
      // extremos -> sin tiron en el corte); el resto del movimiento es la camara COMPARTIDA (pan/breath continuos,
      // sin reset ni flip por escena). Antes: Math.min(push,zout) = kink de velocidad + panX (i%2) = flip al cortar.
      const _smoother = (p) => { p = clamp(p, 0, 1); return p * p * p * (p * (p * 6 - 15) + 10); };
      // FLUIDEZ DEL TEXTO (causa raiz MEDIDA: el texto "crawleaba" sub-pixel -> sus bordes titilaban contra un
      // fondo suave = la falta de fluidez). El push de ENTRADA del 4% asienta a 1.0 (smootherstep, sin tiron) y el
      // contenido NO recibe el paneo de camara ni breath -> pasado el settle su transform es EXACTAMENTE identidad,
      // asi cada glifo se rasteriza IDENTICO frame a frame (cero crawl, cero saltos). El movimiento NO se pierde:
      // vive en el FONDO (drawBg panea + respira + deriva, a 32% parallax) y en las ENTRADAS (reveal/kinetic/
      // scale-in intactas). Resultado: texto NITIDO y clavado sobre un fondo VIVO (lo que se queria).
      const z = 1 + 0.04 * (1 - _smoother(inv(local, 0, Math.min(1.1, dur * 0.5))));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);   // sin paneo en el contenido (el paneo vive en el fondo)
      _holdT = local;   // expone el tiempo continuo de la escena (los drawers lo usan para latidos/shimmer durante el hold)
      drawer(tFed, sc);
      ctx.restore();
    });
    // BANCO DE TRANSICIONES: antes el corte era SIEMPRE el mismo wipe (un "tell" que hacia todo predecible).
    // Ahora cada corte elige (sembrado por SEED^i, sesgado por dureza del estilo) entre wipe/flash/blinds/curtain.
    const _transAt = (kind, wp) => {
      const fade = Math.sin(wp * Math.PI);
      if (kind === 'flash') { ctx.save(); ctx.fillStyle = _rgba(_lighten(A1, 0.55), 0.4 * fade); ctx.fillRect(0, 0, W, H); ctx.restore(); }
      else if (kind === 'blinds') {
        ctx.save(); const n = 7, bh = H / n, p = eInOutCubic(wp);
        for (let k = 0; k < n; k++) { const bw = W * clamp(p * 1.45 - k * 0.06, 0, 1); ctx.fillStyle = _rgba(k % 2 ? A2 : A1, 0.42 * fade); ctx.fillRect(k % 2 ? W - bw : 0, k * bh, bw, bh + 1); }
        ctx.restore();
      } else if (kind === 'curtain') {
        ctx.save(); const cw = W * 0.55 * eInOutCubic(wp); ctx.fillStyle = _rgba(A1, 0.42 * fade); ctx.fillRect(0, 0, cw, H); ctx.fillStyle = _rgba(A2, 0.42 * fade); ctx.fillRect(W - cw, 0, cw, H); ctx.restore();
      } else if (kind === 'glyphwipe') {
        // barrido "tipografico/pixelado": celdas que se llenan de izq a der al pasar el corte (look editorial/tech)
        ctx.save(); const cs = 26, p = eInOutCubic(wp);
        for (let gy = 0; gy < H; gy += cs) for (let gx = 0; gx < W; gx += cs) {
          const th = (gx / W) * 0.78 + (((gx * 31 + gy * 17) % 13) / 13) * 0.2;
          if (p * 1.2 > th) { ctx.fillStyle = _rgba((((gx + gy) / cs) | 0) % 2 ? A1 : A2, 0.5 * fade); ctx.fillRect(gx, gy, cs - 2, cs - 2); }
        }
        ctx.restore();
      } else if (kind === 'pushband') {
        // banda solida con 2 ecos (motion-smear falso) que cruza -> lee como empuje de camara, sin mover el contenido
        ctx.save(); const bw = W * 0.5, cxp = lerp(-bw, W + bw, eInOutCubic(wp));
        for (let e = 2; e >= 0; e--) { ctx.fillStyle = _rgba(e ? A2 : A1, (e ? 0.14 : 0.5) * fade); ctx.fillRect(cxp - bw - e * 28, 0, bw, H); }
        ctx.restore();
      } else {   // wipe (default): panel de acento que barre, con canto difuminado
        const pw = W * 0.4, cxp = lerp(-pw, W + pw, eInOutCubic(wp));
        ctx.save();
        const g = ctx.createLinearGradient(cxp - pw, 0, cxp + pw, 0);
        g.addColorStop(0, _rgba(A1, 0)); g.addColorStop(0.7, _rgba(A1, 0.34 * fade)); g.addColorStop(1, _rgba(A2, 0.44 * fade));
        ctx.fillStyle = g; ctx.fillRect(cxp - pw, 0, pw * 2, H);
        const eg = ctx.createLinearGradient(cxp + pw - 24, 0, cxp + pw + 6, 0);
        eg.addColorStop(0, _rgba(_lighten(A1, 0.5), 0)); eg.addColorStop(0.72, _rgba(_lighten(A1, 0.5), 0.32 * fade)); eg.addColorStop(1, _rgba(_lighten(A1, 0.5), 0));
        ctx.fillStyle = eg; ctx.fillRect(cxp + pw - 24, 0, 30, H);
        ctx.restore();
      }
    };
    const _TRANS = SHADOW_MODE === 'hard' ? ['flash', 'pushband', 'blinds', 'glyphwipe'] : ['wipe', 'curtain', 'glyphwipe', 'pushband'];
    for (let i = 0; i < _scenes.length - 1; i++) {
      const wp = inv(t, _scenes[i].e - 0.12, _scenes[i].e + 0.34);
      if (wp > 0 && wp < 1) _transAt(_TRANS[(mulberry32((SEED ^ (i * 0x2545F491)) >>> 0)() * _TRANS.length) | 0], wp);
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

export { drawFrame, beatAt, timelineDuration, setAccent, setTheme, setSeed, setLogo, setPhotos, drawBackground, DEMO_TIMELINE, THEME_NAMES };
