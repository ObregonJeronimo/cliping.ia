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

// ---------------------------------------------------------------- texto DENTRO del objeto heroe
// Los dibujantes de src/shared/objects.js escriben adentro del objeto: la marca en la tarjeta, y
// tambien etiquetas horneadas ("ADMIT ONE", "VOL. 7", "NUEVA TEMPORADA", "•••• •••• 4021") y CIFRAS
// derivadas del seed ("87%" en el anillo, "+58%" en el grafico). Ese archivo es COMPARTIDO byte a byte
// con urvid (hay un harness de hash que lo verifica), asi que no se toca: se le INYECTA a este motor
// un drawText propio. urvid sigue recibiendo el suyo, intacto.
//
// DOS REGLAS, y las dos vienen de defectos medidos:
//
// 1. ANTI-INVENCION. El gate E-DATO-FALSO audita el texto de las CAPAS, pero nunca miraba lo que el
//    dibujante pinta adentro del objeto. Resultado: 45% de los videos mostraban un porcentaje
//    fabricado como foco del cuadro — una tienda de ropa sin una sola estadistica en su pagina
//    publicando "87%", una parrilla con "ADMIT ONE". Es la mentira mas cara posible sobre la marca de
//    un cliente, y es exactamente lo que la regla anti-invencion existe para impedir. Aca solo se
//    dibuja lo que la pagina DIJO. Sin corpus, solo pasa la marca: el objeto es una ilustracion de la
//    marca, no un tablero de datos.
//
// 2. LA MARCA NO SE RECORTA. Un nombre propio no es una frase: "Straßenhandwerk" no puede salir
//    "STRASSENHAN…" ni "La Parrilla de Don Julio" quedar en "LA PARRILLA" mientras el chip de arriba
//    dice el nombre completo — el video se contradeciria a si mismo. Se achica hasta 6px antes de
//    tocar una sola palabra.
let _corpusHero = null                                   // set por capaObjeto durante el dibujo
const _normHero = t => String(t == null ? '' : t).toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')
function diceLaPagina(t) {
  const k = _normHero(t)
  if (!k) return true                                    // vacio: no dice nada, no miente
  if (!_corpusHero) return false                         // sin corpus, nada pasa salvo la marca (abajo)
  for (const c of _corpusHero) if (c === k || c.indexOf(k) >= 0) return true
  return false
}
function drawTextHero(ctx, str, x, y, opts = {}) {
  const t = String(str == null ? '' : str)
  if (!diceLaPagina(t)) return opts.size || 0            // la pagina no lo dijo: no se dibuja
  const { maxW = 0, size = 40, weight = 700, family = 'Inter', tracking = 0 } = opts
  if (maxW > 0 && t) {
    // piso 6px: preferimos la marca chiquita y ENTERA antes que recortada.
    let tr = tracking
    let s2 = fitFont(ctx, t, size, maxW, 6, weight, family, tr)
    // Si ni al piso entra, lo primero que se sacrifica es el TRACKING, que es decoracion del objeto:
    // "La Parrilla de Don Julio" son 24 glifos y 3px de tracking le suman 72px, mas que el propio
    // texto. El nombre del negocio no se negocia; el espaciado si.
    ctx.font = fontStr(weight, s2, family); ctx.letterSpacing = tr + 'px'
    if (tr !== 0 && ctx.measureText(t).width > maxW) { tr = 0; s2 = fitFont(ctx, t, size, maxW, 6, weight, family, 0) }
    ctx.letterSpacing = '0px'
    return drawText(ctx, t, x, y, { ...opts, size: s2, min: 6, tracking: tr })
  }
  return drawText(ctx, t, x, y, opts)
}
const HERO = createHeroObjects({ drawText: drawTextHero, lighten, darken, rgba })

// corpusHero(pm) -> Set normalizado con TODO lo que la pagina dijo. Lo arma el caller (estudio, gates)
// y viaja en opts.corpus. Es el mismo criterio que usa el gate de anti-invencion.
export function corpusHero(pm) {
  if (!pm) return null
  const s = pm.semantica || {}
  const partes = [pm.brand, s.queHace, s.cta,
    ...(s.features || []).flatMap(f => [f.titulo, f.detalle]),
    ...(s.comoFunciona || []),
    ...((s.pruebas && s.pruebas.stats) || []).flatMap(x => [x.valor, x.etiqueta]),
    ...((s.pruebas && s.pruebas.testimonios) || []).flatMap(x => [x.texto, x.firma]),
    (s.oferta && s.oferta.precio) || '', (s.oferta && s.oferta.promo) || '', (s.oferta && s.oferta.urgencia) || '',
  ]
  return new Set(partes.map(_normHero).filter(Boolean))
}

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

// en el browser no hace falta que el caller inyecte nada: si hay document, sabemos hacer un canvas
// offscreen. Sin esto, el estudio que se olvidara de pasar makeCanvas caia a la tabla NOMINAL y los
// objetos heroe salian con un tamano aproximado en vez del real.
const _autoCanvas = typeof document !== 'undefined'
  ? (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
  : null

function medirObjeto(name, hp, makeCanvas, look) {
  const key = name
  if (_bbox.has(key)) return _bbox.get(key)
  let out = NOMINAL[name] || [220, 200]
  makeCanvas = makeCanvas || _autoCanvas
  if (makeCanvas) {
    try {
      const S = 640, c = makeCanvas(S, S), cx = c.getContext('2d')
      cx.save(); cx.translate(S / 2, S / 2)
      HERO.byName[name](cx, 1, 1, '#ff0000', { display: 'Inter', support: 'Inter', num: 'Inter', accent: 'Inter' }, 'MARCA', [0.5, 0.5, 0.5, 0.5])
      cx.restore()
      const d = cx.getImageData(0, 0, S, S).data
      let x0 = S, y0 = S, x1 = -1, y1 = -1
      // Umbral 30. Con 8 la sombra difusa (que llega 60px afuera del cuerpo) inflaba el bbox y el heroe
      // se veia chico. Con 72 pasaba lo contrario: los trazos TENUES no contaban — el vapor de la taza
      // es un stroke claro y fino, asi que el objeto se escalaba como si no existiera y el vapor
      // terminaba atravesando el nombre de la marca. 30 deja afuera la sombra y adentro lo dibujado.
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (d[(y * S + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
      }
      // Ademas del TAMANO, el desplazamiento del centro visual respecto del origen de dibujo. Los
      // dibujantes centran su CUERPO en (0,0), pero lo que se ve incluye extremos asimetricos: el vapor
      // de la taza sube y no baja, la manija de la bolsa sobresale arriba. Sin compensarlo, el objeto
      // se posiciona por su origen y queda descentrado en su caja — visto: el vapor atravesaba el
      // nombre de la marca mientras abajo sobraba el 40% del cuadro.
      // Se centra por la EXTENSION (centro del bbox), no por el centroide de masa. Medido en la taza:
      // se extiende 123 unidades hacia arriba (el vapor) y 91 hacia abajo. Por centroide queda colgada
      // alta y deja el 45% del cuadro vacio abajo; por extension queda simetrica. El ojo perdona un
      // objeto cuya masa esta un poco baja, pero no un tercio de cuadro vacio de un solo lado.
      if (x1 > x0 && y1 > y0) out = [x1 - x0 + 2, y1 - y0 + 2, (x0 + x1) / 2 - S / 2, (y0 + y1) / 2 - S / 2]
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
  // PISO DEL FITTER: es un limite de LEGIBILIDAD, no una fraccion de la intencion. Cuando era
  // `size * 0.34`, pedir el doble de tamano tambien duplicaba el piso, y un titulo con `size: 2`
  // desde el editor ya no podia achicar lo suficiente para entrar en su caja: desbordaba.
  // Ahora el piso es el menor entre "un tercio de lo pedido" y "2% del alto del lienzo".
  const o = {
    size, maxW: w, min: Math.max(9, Math.min(size * 0.34, H * 0.020)), weight: peso(look, l), family: fam(look, l.family),
    color: col(look, l.color), align: l.align,
    // LOS NUMEROS NO LLEVAN TRACKING POSITIVO. El del look esta pensado para titulares y escala con el
    // tamano: sobre un dato de 112px daba 4.5px de espaciado y separaba el punto decimal — "3.8%" se
    // leia "3 . 8%". Una cifra quiere espaciado neutro o apretado, nunca suelto.
    tracking: l.tracking == null ? (l.family === 'num' ? Math.min(0, look.tracking) : look.tracking * (size / 60)) : l.tracking,
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
  const [nw, nh, ox = 0, oy = 0] = medirObjeto(l.obj, l.hp, opts.makeCanvas, look)
  const k = Math.min(w / nw, h / nh) * 1.06            // el heroe llena su caja; la sombra puede sangrar
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(k, k)
  ctx.translate(-ox, -oy)                              // el CENTRO VISUAL del objeto va al centro de la caja
  ctx.globalAlpha *= clamp(p * 1.2, 0, 1)
  const fonts = { display: look.fonts.display, support: look.fonts.support, num: look.fonts.num, accent: look.fonts.support }
  // la marca SIEMPRE puede escribirse adentro del objeto (es de la pagina por definicion); el resto
  // solo si esta en el corpus. Se restaura en finally: una excepcion de un dibujante no puede dejar
  // el corpus de un video pegado para el siguiente.
  const antes = _corpusHero
  const c = opts.corpus ? new Set(opts.corpus) : new Set()
  if (opts.brand) c.add(_normHero(opts.brand))
  _corpusHero = c
  try { fn(ctx, p, clamp(p * 1.35 - 0.2, 0, 1), col(look, l.tint), fonts, opts.brand || '', l.hp) }
  finally { _corpusHero = antes }
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
  // El badge es una sola linea: se achica y, si aun no entra, se recorta POR PALABRA. Antes caia en
  // el clip por defecto de drawText, que elide con puntos suspensivos — y un CTA cortado a la mitad
  // ("Probalo grat...") es exactamente el defecto que el motor promete no cometer.
  const s = fitFont(ctx, txt, size, w * 0.78, Math.max(9, size * 0.42), 700, fnt, 0)
  ctx.font = fontStr(700, s, fnt)
  txt = wordTrim(ctx, txt, w * 0.78, s, 700, fnt, 0)
  const tw = ctx.measureText(txt).width
  const pw = Math.min(w, tw + h * 1.15)
  // la pildora se ancla segun `align`: antes se centraba siempre dentro de su caja, asi que en un
  // encuadre a la izquierda quedaba flotando en el medio mientras el titulo iba al borde.
  const px0 = l.align === 'left' ? x : l.align === 'right' ? x + w - pw : x + (w - pw) / 2
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

// ---------------------------------------------------------------- capa suelta
// drawCapa dibuja UNA capa. Lo usan tanto drawScene (estatico, para el storyboard y sus gates) como
// render/video.js (animado, con la caja y el alpha que resolvio el evaluador de timeline).
export function drawCapa(ctx, l, look, W, H, p, opts = {}, rep = null) {
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
}

// ---------------------------------------------------------------- escena
export function drawScene(ctx, sc, look, W, H, opts = {}) {
  const rep = { faltantes: [], desbordes: [], capas: sc.layers.length }
  const P = opts.p == null ? 1 : clamp(opts.p, 0, 1)
  for (const l of sc.layers) {
    const pr = opts.props && opts.props[l.id]
    const p = pr && pr.reveal != null ? pr.reveal : P
    const a = pr && pr.alpha != null ? pr.alpha : 1
    if (a <= 0) continue
    ctx.save()
    ctx.globalAlpha *= a
    drawCapa(ctx, l, look, W, H, p, opts, rep)
    ctx.restore()
  }
  return rep
}

export { HERO }
