// director · UTIL — matematica y COLOR del motor. Copia PROPIA (no se importa de otro motor: la regla
// de independencia lo prohibe y el gate director-independence-check lo verifica). Los algoritmos son
// estandares publicos (OKLab de Bjorn Ottosson, WCAG 2.1, APCA 0.98G-4g), no codigo de terceros.
// Todo es PURO y determinista: mismo input -> mismo output, sin estado ni azar.

export const TAU = Math.PI * 2
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
export const lerp = (a, b, t) => a + (b - a) * t
export const inv = (t, a, b) => clamp01((t - a) / (b - a || 1e-6))
export const round = (v, dec = 3) => { const k = Math.pow(10, dec); return Math.round(v * k) / k }

// ---------------------------------------------------------------- hex basico
const _hx = hex => { let h = String(hex || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return h.slice(0, 6).padEnd(6, '0') }
export function hexToRgb(hex) { const h = _hx(hex); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) } }
export function rgbToHex(r, g, b) { const c = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); return '#' + c(r) + c(g) + c(b) }
export function rgba(hex, alpha) { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${clamp01(alpha)})` }
export const isHex = v => typeof v === 'string' && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v)

// ---------------------------------------------------------------- HSL (para logica de HUE)
export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min
  let h = 0
  if (d > 0) {
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
  }
  const l = (max + min) / 2
  return { h, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l }
}
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp01(s); l = clamp01(l)
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
// distancia circular de hue en grados (0..180)
export const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

// ---------------------------------------------------------------- OKLCH (aclarar/oscurecer SIN desaturar)
// En HSL el chroma colapsa cerca de blanco/negro (c = (1-|2l-1|)*s) -> lighten() lava el color. OKLab es
// perceptualmente uniforme: movemos la L conservando C y hue. Clamp de gamut por BISECCION de 18 pasos
// FIJOS (determinista: mismo input -> mismo hex, siempre dentro de sRGB).
const _srgbToLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const _linToByte = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(clamp01(v) * 255) }
export function hexToOklch(hex) {
  const { r: R, g: G, b: B0 } = hexToRgb(hex)
  const r = _srgbToLin(R), g = _srgbToLin(G), b = _srgbToLin(B0)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) }   // h en RADIANES
}
function _oklchToLinRgb(L, C, h) {
  const A = C * Math.cos(h), B = C * Math.sin(h)
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B
  const s_ = L - 0.0894841775 * A - 1.2914855480 * B
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
}
export function oklchToHex(L, C, h) {
  L = clamp01(L)
  const inG = c => c[0] >= -1e-4 && c[0] <= 1.0001 && c[1] >= -1e-4 && c[1] <= 1.0001 && c[2] >= -1e-4 && c[2] <= 1.0001
  let C2 = C
  if (!inG(_oklchToLinRgb(L, C, h))) {
    let lo = 0, hi = C
    for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (inG(_oklchToLinRgb(L, mid, h))) lo = mid; else hi = mid }
    C2 = lo
  }
  const c = _oklchToLinRgb(L, C2, h), hx = v => _linToByte(v).toString(16).padStart(2, '0')
  return '#' + hx(c[0]) + hx(c[1]) + hx(c[2])
}
export function lighten(hex, amt) { const c = hexToOklch(hex); return oklchToHex(clamp01(c.L + (1 - c.L) * amt), c.C, c.h) }
export function darken(hex, amt) { const c = hexToOklch(hex); return oklchToHex(clamp01(c.L * (1 - amt)), c.C, c.h) }
// chroma perceptual 0..~0.4 (util para decidir si una marca es ACROMATICA: chroma < 0.12)
export const chroma = hex => hexToOklch(hex).C

// ---------------------------------------------------------------- CONTRASTE (WCAG 2.1 + APCA)
const _lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
export function luminance(hex) { const { r, g, b } = hexToRgb(hex); return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b) }
export function contrast(a, b) { const la = luminance(a), lb = luminance(b); const hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05) }
// APCA 0.98G-4g: contraste PERCEPTUAL firmado (~[-108..106]). Mas fiel que WCAG2 en modo oscuro.
// |Lc| >= 75 muy fuerte · >= 60 titulos · >= 45 cuerpo · >= 30 texto grande (umbrales del proyecto).
function _apcaY(hex) {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126729 * Math.pow(r / 255, 2.4) + 0.7151522 * Math.pow(g / 255, 2.4) + 0.0721750 * Math.pow(b / 255, 2.4)
}
export function apcaLc(textHex, bgHex) {
  let Yt = _apcaY(textHex), Yb = _apcaY(bgHex)
  const th = 0.022, cl = 1.414
  Yt = Yt > th ? Yt : Yt + Math.pow(th - Yt, cl)
  Yb = Yb > th ? Yb : Yb + Math.pow(th - Yb, cl)
  if (Math.abs(Yb - Yt) < 0.0005) return 0
  let Lc
  if (Yb > Yt) { const s = (Math.pow(Yb, 0.56) - Math.pow(Yt, 0.57)) * 1.14; Lc = s < 0.1 ? 0 : s - 0.027 }
  else { const s = (Math.pow(Yb, 0.65) - Math.pow(Yt, 0.62)) * 1.14; Lc = s > -0.1 ? 0 : s + 0.027 }
  return Lc * 100
}
// elige entre 2 candidatos el texto MAS legible sobre bg: maximiza |APCA| exigiendo un piso WCAG.
export function legibleOn(bg, light = '#f2f0ea', dark = '#121016', minW = 3) {
  let best = null, bestA = -1
  for (const c of [light, dark]) { if (contrast(c, bg) < minW) continue; const a = Math.abs(apcaLc(c, bg)); if (a > bestA) { bestA = a; best = c } }
  return best || (contrast(light, bg) >= contrast(dark, bg) ? light : dark)
}
// sube/baja la L (OKLCH) del color hasta alcanzar el contraste WCAG pedido contra bg. Determinista
// (32 pasos fijos); si no se alcanza, devuelve el mejor encontrado. Es el guard de legibilidad del motor.
export function ensureContrast(hex, bg, target = 4.5, maxSteps = 32) {
  if (contrast(hex, bg) >= target) return hex
  const c = hexToOklch(hex), bgL = luminance(bg)
  const up = bgL < 0.18                                     // fondo oscuro -> aclarar la tinta; claro -> oscurecer
  let best = hex, bestC = contrast(hex, bg)
  for (let i = 1; i <= maxSteps; i++) {
    const L = clamp01(up ? c.L + (1 - c.L) * (i / maxSteps) : c.L * (1 - i / maxSteps))
    const cand = oklchToHex(L, c.C, c.h)
    const ct = contrast(cand, bg)
    if (ct > bestC) { bestC = ct; best = cand }
    if (ct >= target) return cand
  }
  return best
}
// interpolacion de color en luz LINEAL (el punto medio en sRGB directo sale barroso/gris)
export function mixColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b), k = clamp01(t)
  const m = (x, y) => _linToByte(lerp(_srgbToLin(x), _srgbToLin(y), k))
  return rgbToHex(m(A.r, B.r), m(A.g, B.g), m(A.b, B.b))
}
