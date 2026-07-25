// director · RENDER — dibuja una escena del storyboard. Es la contraparte del composer: el composer
// decide QUE y DONDE (cajas normalizadas), esto decide COMO se ve en pixeles.
//
// Contrato: drawScene(ctx, escena, look, W, H, opts) -> reporte
//   opts.p       progreso de revelado 0..1 (1 = escena completa; el timeline de F3 lo anima por capa)
//   opts.images  Map url -> imagen ya cargada (el renderer NO hace fetch: los gates corren sin red)
//   opts.makeCanvas(w,h) canvas offscreen para medir objetos heroe (node-canvas o el del browser)
// El reporte trae { faltantes[] } para que los gates puedan fallar si una foto no llego, en vez de
// que el video salga con un hueco gris y nadie se entere.
//
// TODO el texto pasa por core/text.js -> la garantia nunca-desborda vale tambien aca, y la telemetria
// deja auditar por codigo cada linea dibujada (el gate de texto cortado se apoya en eso).

import { drawText, drawWrapped, drawMaskLine, drawKineticLine, fitFont, fitBlock, wordTrim, fontStr } from '../core/text.js'
import { clamp, rgba, mixColor, lighten, darken, legibleOn } from '../core/util.js'
import { createHeroObjects } from '../../shared/objects.js'
import { drawPlaca, drawVidrio } from './plate.js'

const HERO = createHeroObjects({ drawText, lighten, darken, rgba })

// ---------------------------------------------------------------- tokens
// Las capas guardan TOKENS ('accent', 'ink', 'dim'...) y no hex: asi el mismo storyboard se puede
// re-teñir cambiando el look sin recomponer, que es lo que va a necesitar el editor (F3-E1).
export function col(look, token, fallback) {
  if (!token) return fallback || look.ink
  if (token[0] === '#') return token
  switch (token) {
    case 'ink': return look.ink
    case 'dim': return look.dim
    case 'accent': return look.accent
    case 'accentTxt': return look.accentTxt || look.accent
    case 'accent2': return look.accent2
    case 'onAccent': return look.onAccent
    case 'bg0': return look.bg0
    case 'bg1': return look.bg1
    case 'hairline': return rgba(look.ink, 0.16)
    default: return fallback || look.ink
  }
}
const fam = (look, token) => (token === 'display' ? look.fonts.display : token === 'num' ? look.fonts.num : look.fonts.support)
const peso = (look, l) => (l.weight != null ? l.weight : (l.family === 'display' ? look.fonts.dw : look.fonts.sw))

// ---------------------------------------------------------------- medicion de objetos heroe
// Los 16 dibujantes tienen tamanos naturales muy distintos (una taza mide 100 unidades y una tarjeta
// 260). En vez de una tabla que se desactualiza cada vez que alguien toca un dibujante, medimos el
// bounding box real UNA vez por objeto y cacheamos. Si no hay canvas offscreen, cae a la tabla.
const _bbox = new Map()
const NOMINAL = { card: [240, 150], window: [245, 165], plate: [245, 245], cup: [145, 130], bottle: [110, 230], ticket: [235, 110], dumbbell: [215, 90], ring: [200, 200], house: [205, 190], book: [190, 150], capsule: [175, 80], bag: [180, 190], tag: [210, 100], chart: [220, 220], shield: [200, 230], photo: [240, 240] }

function medirObjeto(name, hp, makeCanvas, look) {
  const key = name
  if (_bbox.has(key)) return _bbox.get(key)
  let out = NOMINAL[name] || [220, 200]
  if (makeCanvas) {
    try {
      const S = 640, c = makeCanvas(S, S), cx = c.getContext('2d')
      cx.save(); cx.translate(S / 2, S / 2)
      HERO.byName[name](cx, 1, 1, '#ff0000', { display: 'Inter', support: 'Inter', num: 'Inter', accent: 'Inter' }, 'MARCA', [0.5, 0.5, 0.5, 0.5])
      cx.restore()
      const d = cx.getImageData(0, 0, S, S).data
      let x0 = S, y0 = S, x1 = -1, y1 = -1
      // umbral 72 y no 8: la sombra difusa de los dibujantes deja alpha bajo hasta 60px afuera del
      // cuerpo. Midiendo con umbral bajo, el heroe entraba en su caja SOMBRA INCLUIDA y se veia chico.
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (d[(y * S + x) * 4 + 3] > 72) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
      }
      if (x1 > x0 && y1 > y0) out = [x1 - x0 + 2, y1 - y0 + 2]
    } catch { /* sin canvas offscreen -> tabla */ }
  }
  _bbox.set(key, out)
  return out
}

// ---------------------------------------------------------------- capas
function capaTexto(ctx, l, look, W, H, p, rep) {
  const [x, y, w, h] = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
  let txt = String(l.text || '')
  if (!txt) return
  if (l.upper) txt = txt.toUpperCase()
  const ax = l.align === 'left' ? x : l.align === 'right' ? x + w : x + w / 2
  const cy = y + h / 2
  const size = Math.max(9, l.size * H)
  const o = {
    size, maxW: w, min: Math.max(9, size * 0.34), weight: peso(look, l), family: fam(look, l.family),
    color: col(look, l.color), align: l.align, tracking: l.tracking == null ? look.tracking * (size / 60) : l.tracking,
    lh: l.lh, maxLines: l.lines,
  }
  // UNA SOLA medicion para todos los caminos de revelado: el texto ocupa lo mismo con p=0.3 que con
  // p=1, asi la animacion no "reacomoda" el bloque a mitad de camino (E-TXT-JUMP).
  let wf
  if (l.lines === 1) {
    // linea unica (marca, kicker, etiqueta): achica y, si aun no entra, recorta POR PALABRA.
    // Jamas a mitad de palabra: era el "Ejemplo Palabr" que se veia al final de los videos.
    const s = fitFont(ctx, txt, size, w, o.min, o.weight, o.family, o.tracking)
    wf = { size: s, lines: [wordTrim(ctx, txt, w, s, o.weight, o.family, o.tracking)], over: false }
  } else {
    wf = fitBlock(ctx, txt, w, h, size, o.min, o.weight, o.family, l.lh, o.tracking)
  }
  if (rep && wf.over) rep.desbordes.push({ id: l.id, text: txt })
  const lineH = wf.size * l.lh, total = (wf.lines.length - 1) * lineH
  const yDe = i => cy - total / 2 + i * lineH
  const base2 = { ...o, size: wf.size }

  if (p >= 1 || l.reveal === 'none' || l.reveal === 'fade') {
    const alpha = l.reveal === 'fade' && p < 1 ? clamp(p * 1.3, 0, 1) : 1
    wf.lines.forEach((ln, i) => drawText(ctx, ln, ax, yDe(i), { ...base2, alpha }))
    return
  }
  // mask / chars: se revelan LINEA POR LINEA con un stagger corto (el gesto de AE)
  const n = wf.lines.length
  wf.lines.forEach((ln, i) => {
    const d = 1 / (1 + (n - 1) * 0.45)
    const lp = clamp((p - i * d * 0.45) / d, 0, 1)
    if (lp <= 0) return
    if (l.reveal === 'chars') drawKineticLine(ctx, ln, ax, yDe(i), lp, { ...base2, dim: rgba(col(look, l.color), 0.28) })
    else drawMaskLine(ctx, ln, ax, yDe(i), lp, base2)
  })
}

function capaForma(ctx, l, look, W, H, p) {
  const [x, y, w, h] = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
  const f = l.fill ? col(look, l.fill) : null
  const rad = (l.radius == null ? look.radius / 405 : l.radius) * W
  ctx.save()
  ctx.globalAlpha *= clamp(l.alpha == null ? 1 : l.alpha, 0, 1)
  if (l.shape === 'line' || l.shape === 'bar') {
    // crece desde su origen: es la capa que mas se anima en el timeline
    const ww = l.shape === 'line' ? w * p : w, hh = l.shape === 'line' ? h : h * p
    ctx.fillStyle = f || look.accent
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x, y, Math.max(1, ww), Math.max(1, hh), Math.min(ww, hh) / 2); else ctx.rect(x, y, ww, hh)
    ctx.fill()
  } else if (l.shape === 'ring') {
    ctx.strokeStyle = f || look.accent
    ctx.lineWidth = Math.max(1, l.lw * W)
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h * (H / W)) / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke()
  } else if (l.shape === 'dot') {
    ctx.fillStyle = f || look.accent
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2 * p, 0, Math.PI * 2); ctx.fill()
  } else if (l.shape === 'quote') {
    // comilla tipografica gigante como ornamento (no es texto: no la audita el gate de texto)
    ctx.globalAlpha *= p
    ctx.fillStyle = f || look.accent
    ctx.font = fontStr(900, h * 2.1, look.fonts.display)
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillText('“', x, y + h * 1.35)
  } else {
    if (look.modernidad.indexOf('glass') >= 0 && l.fill === 'bg1') drawVidrio(ctx, x, y, w, h, rad, look)
    else if (f) { ctx.fillStyle = f; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad); else ctx.rect(x, y, w, h); ctx.fill() }
    if (l.stroke) {
      ctx.strokeStyle = col(look, l.stroke)
      ctx.lineWidth = Math.max(1, (look.borde === 'bold' ? 2.4 : 1) * (W / 405))
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad); else ctx.rect(x, y, w, h); ctx.stroke()
    }
  }
  ctx.restore()
}

function capaObjeto(ctx, l, look, W, H, p, opts) {
  const fn = HERO.byName[l.obj]
  if (!fn) return
  const [x, y, w, h] = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
  const [nw, nh] = medirObjeto(l.obj, l.hp, opts.makeCanvas, look)
  const k = Math.min(w / nw, h / nh) * 1.06            // el heroe llena su caja; la sombra puede sangrar
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(k, k)
  ctx.globalAlpha *= clamp(p * 1.2, 0, 1)
  const fonts = { display: look.fonts.display, support: look.fonts.support, num: look.fonts.num, accent: look.fonts.support }
  fn(ctx, p, clamp(p * 1.35 - 0.2, 0, 1), col(look, l.tint), fonts, opts.brand || '', l.hp)
  ctx.restore()
}

function capaFoto(ctx, l, look, W, H, p, opts, rep) {
  const [x, y, w, h] = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
  const img = opts.images && (opts.images.get ? opts.images.get(l.url) : opts.images[l.url])
  const rad = (l.radius == null ? look.radius / 405 : l.radius) * W
  ctx.save()
  ctx.globalAlpha *= clamp(p * 1.25, 0, 1)
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad); else ctx.rect(x, y, w, h)
  ctx.clip()
  if (img && img.width) {
    const ar = img.width / img.height, box = w / h
    let dw = w, dh = h
    if (l.fit === 'contain') { if (ar > box) dh = w / ar; else dw = h * ar } else { if (ar > box) dw = h * ar; else dh = w / ar }
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  } else {
    // sin imagen: bloque neutro (nunca un icono roto) + se reporta para que el gate lo vea
    const g = ctx.createLinearGradient(x, y, x + w, y + h)
    g.addColorStop(0, mixColor(look.bg1, look.ink, 0.10)); g.addColorStop(1, look.bg1)
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h)
    if (rep) rep.faltantes.push(l.url)
  }
  if (l.veil > 0) {
    const v = ctx.createLinearGradient(0, y, 0, y + h)
    v.addColorStop(0, rgba(look.bg0, l.veil * 0.35)); v.addColorStop(1, rgba(look.bg0, l.veil * 1.6))
    ctx.fillStyle = v; ctx.fillRect(x, y, w, h)
  }
  ctx.restore()
}

function capaBadge(ctx, l, look, W, H, p) {
  const [x, y, w, h] = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
  let txt = String(l.text || '')
  if (!txt) return
  if (l.upper) txt = txt.toUpperCase()
  const size = Math.max(9, l.size * H)
  const fnt = fam(look, 'support')
  // la pildora se AJUSTA al texto: un boton con aire de sobra a los lados grita plantilla
  const s = fitFont(ctx, txt, size, w * 0.78, size * 0.5, 700, fnt, 0)
  ctx.font = fontStr(700, s, fnt)
  const tw = ctx.measureText(txt).width
  const pw = Math.min(w, tw + h * 1.15), px0 = x + (w - pw) / 2
  ctx.save()
  ctx.globalAlpha *= clamp(p * 1.3, 0, 1)
  ctx.fillStyle = col(look, l.fill)
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(px0, y, pw, h, look.borde === 'bold' ? Math.min(6, h / 2) : h / 2); else ctx.rect(px0, y, pw, h)
  ctx.fill()
  if (look.sombra === 'hard') { ctx.fillStyle = rgba(look.ink, 0.9); ctx.fillRect(px0 + h * 0.12, y + h, pw, Math.max(2, h * 0.09)) }
  drawText(ctx, txt, px0 + pw / 2, y + h * 0.54, { size: s, weight: 700, family: fnt, align: 'center', maxW: pw - h * 0.7, color: col(look, l.color), tracking: 0.4 })
  ctx.restore()
}

function capaStepper(ctx, l, look, W, H, p) {
  const [x, y, w, h] = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
  const n = l.items.length
  if (!n) return
  const paso = h / n, r = Math.min(paso * 0.22, W * 0.045)
  const cxn = x + r
  const size = Math.max(10, l.size * H)
  ctx.save()
  // el riel que une los pasos: dibuja "proceso" mejor que cualquier icono
  ctx.strokeStyle = rgba(look.accent, 0.35)
  ctx.lineWidth = Math.max(1, W * 0.004)
  ctx.beginPath(); ctx.moveTo(cxn, y + paso * 0.5); ctx.lineTo(cxn, y + paso * (n - 0.5) * p + paso * 0.5 * (1 - p)); ctx.stroke()
  l.items.forEach((t, i) => {
    const d = 1 / (1 + (n - 1) * 0.5)
    const lp = clamp((p - i * d * 0.5) / d, 0, 1)
    if (lp <= 0) return
    const cy = y + paso * (i + 0.5)
    ctx.save()
    ctx.globalAlpha *= lp
    ctx.fillStyle = look.accent
    ctx.beginPath(); ctx.arc(cxn, cy, r * (0.6 + 0.4 * lp), 0, Math.PI * 2); ctx.fill()
    if (l.numerado) drawText(ctx, String(i + 1), cxn, cy + r * 0.04, { size: r * 1.05, weight: 800, family: look.fonts.num, align: 'center', maxW: r * 1.6, color: look.onAccent })
    const fb = fitBlock(ctx, t, w - r * 2.2, paso * 0.82, size, Math.max(9, size * 0.45), 600, look.fonts.support, 1.2, 0)
    fb.lines.forEach((ln, k) => drawText(ctx, ln, cxn + r * 1.9, cy - (fb.lines.length - 1) * fb.size * 0.6 + k * fb.size * 1.2, {
      size: fb.size, weight: 600, family: look.fonts.support, align: 'left', maxW: w - r * 2.2, color: look.ink,
    }))
    ctx.restore()
  })
  ctx.restore()
}

function capaPrecio(ctx, l, look, W, H, p) {
  const [x, y, w, h] = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
  ctx.save()
  ctx.globalAlpha *= clamp(p * 1.3, 0, 1)
  const size = h * 0.62
  drawText(ctx, l.valor, x + w / 2, y + h * 0.5, { size, weight: 800, family: look.fonts.num, align: 'center', maxW: w * 0.94, color: look.accent, tracking: -0.5 })
  if (l.tachado) {
    const s2 = size * 0.46
    const tx = x + w / 2
    drawText(ctx, l.tachado, tx, y + h * 0.98, { size: s2, weight: 500, family: look.fonts.num, align: 'center', maxW: w * 0.6, color: look.dim })
    ctx.strokeStyle = rgba(look.dim, 0.9); ctx.lineWidth = Math.max(1, W * 0.003)
    ctx.font = fontStr(500, s2, look.fonts.num)
    const tw = ctx.measureText(l.tachado).width
    ctx.beginPath(); ctx.moveTo(tx - tw / 2, y + h * 0.98); ctx.lineTo(tx + tw / 2, y + h * 0.98); ctx.stroke()
  }
  if (l.etiqueta) drawText(ctx, l.etiqueta.toUpperCase(), x + w / 2, y - h * 0.22, { size: h * 0.24, weight: 700, family: look.fonts.support, align: 'center', maxW: w, color: look.dim, tracking: 1.6 })
  ctx.restore()
}

// LOGOS ANONIMOS: pastillas neutras. Nunca texto — un nombre aca seria un cliente inventado.
function capaLogos(ctx, l, look, W, H, p) {
  const [x, y, w, h] = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
  const n = l.n, gap = w * 0.045
  const cw = (w - gap * (n - 1)) / n
  ctx.save()
  for (let i = 0; i < n; i++) {
    const d = 1 / (1 + (n - 1) * 0.4)
    const lp = clamp((p - i * d * 0.4) / d, 0, 1)
    if (lp <= 0) continue
    const bx = x + i * (cw + gap), bh = h * (0.34 + (i % 3) * 0.05)
    ctx.globalAlpha = 0.34 * lp
    ctx.fillStyle = look.ink
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(bx, y + (h - bh) / 2, cw, bh, bh / 2); else ctx.rect(bx, y + (h - bh) / 2, cw, bh)
    ctx.fill()
  }
  ctx.restore()
}

// ---------------------------------------------------------------- escena
export function drawScene(ctx, sc, look, W, H, opts = {}) {
  const rep = { faltantes: [], desbordes: [], capas: sc.layers.length }
  const P = opts.p == null ? 1 : clamp(opts.p, 0, 1)
  for (const l of sc.layers) {
    // p por capa: si el timeline mando props, manda el; si no, el progreso global de la escena
    const p = opts.props && opts.props[l.id] && opts.props[l.id].reveal != null ? opts.props[l.id].reveal : P
    const a = opts.props && opts.props[l.id] && opts.props[l.id].alpha != null ? opts.props[l.id].alpha : 1
    if (a <= 0) continue
    ctx.save()
    ctx.globalAlpha *= a
    switch (l.kind) {
      case 'plate': drawPlaca(ctx, look, W, H, l); break
      case 'text': capaTexto(ctx, l, look, W, H, p, rep); break
      case 'shape': capaForma(ctx, l, look, W, H, p); break
      case 'heroObj': capaObjeto(ctx, l, look, W, H, p, opts); break
      case 'photo': capaFoto(ctx, l, look, W, H, p, opts, rep); break
      case 'badge': capaBadge(ctx, l, look, W, H, p); break
      case 'stepper': capaStepper(ctx, l, look, W, H, p); break
      case 'priceTag': capaPrecio(ctx, l, look, W, H, p); break
      case 'logoRow': capaLogos(ctx, l, look, W, H, p); break
      default: break
    }
    ctx.restore()
  }
  return rep
}

export { HERO }
