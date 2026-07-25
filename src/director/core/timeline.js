// director · TIMELINE — compilador (storyboard + linker -> timeline.v1) y evaluador (t -> props).
// Es el formato que el editor va a manipular en F5, asi que todo lo que el motor hace tiene que
// quedar expresado como KEYFRAMES editables. Nada de animacion escondida en el renderer: si algo se
// mueve, hay una key que lo dice, y el usuario puede moverla.
//
// MODELO (docs/MOTOR-DIRECTOR.md §6):
//   layers: [{ id, kind, life:[t0,t1], base }]        base = la capa del storyboard (texto, color...)
//   tracks: [{ layer, prop, keys:[{t,v,ease}] }]      solo los props que REALMENTE se animan
//   markers:[{ t, label }]                            inicios de escena y nombre de cada corte
// x,y son el CENTRO de la caja y w,h su tamano (coherente con PROP_DEFAULT del schema): asi escalar
// desde el centro es cambiar w/h o scale, sin recalcular la esquina.
//
// SEEK-SAFE: propsAt(t) no depende del frame anterior. Se puede saltar a cualquier t y da lo mismo
// que reproduciendo desde 0 — condicion para que el editor pueda hacer scrub.

import { TL_V, CANVAS, PROP_DEFAULT } from './schema.js'
import { parseEase } from './ease.js'
import { link, gestoEntrada, gestoSalida } from './linker.js'
import { matchesEntre } from './composer.js'
import { clamp } from './util.js'

const R3 = v => Math.round(v * 1000) / 1000
const R4 = v => Math.round(v * 10000) / 10000

// ---------------------------------------------------------------- compilador
export function compile(sb, seed) {
  const look = sb.look
  const fps = CANVAS.FPS
  const dur = R3(sb.dur)

  // 1) todos los enlaces primero: una escena necesita saber como sale ANTES de emitir sus keys
  const estado = {}
  const links = []
  for (let i = 1; i < sb.scenes.length; i++) {
    links[i] = link(sb.scenes[i - 1], sb.scenes[i], matchesEntre(sb.scenes[i - 1], sb.scenes[i]), seed, look, estado)
  }

  const layers = [], markers = []
  // ACUMULADOR: un (capa, prop) tiene UN solo track. Emitir entrada y salida como tracks separados
  // funcionaba de casualidad (rangos disjuntos) hasta que dos de ellos se pisaron en el mismo instante
  // y la deriva del foco le gano a la salida. Con un track por prop eso no puede volver a pasar, y
  // ademas es lo que el editor de F5 necesita: una curva por propiedad, no varias superpuestas.
  const acc = new Map()
  const push = (layer, prop, keys) => {
    if (!keys || keys.length < 2) return
    const k = layer + '|' + prop
    const prev = acc.get(k)
    acc.set(k, prev ? prev.concat(keys) : keys.slice())
  }

  // 2) la PLACA es una sola capa para todo el video (cada escena trae la suya, identica): asi el fondo
  //    no parpadea en los cortes y el editor ve UNA capa de fondo, no una por escena.
  layers.push({ id: 'plate', kind: 'plate', life: [0, dur], z: 0, base: sb.scenes[0].layers.find(l => l.kind === 'plate') || { kind: 'plate' }, ...cajaProps([0, 0, 1, 1]) })
  // FONDO VIVO: la luz de la placa recorre lentamente el cuadro durante todo el video. Sin esto, una
  // escena de cierre sostenida rasterizaba identica frame tras frame (medido: 2s de imagen congelada)
  // y ademas el fondo se leia como un PNG. Es una sola key: barato y editable como cualquier otra.
  push('plate', 'x', [{ t: 0, v: 0.5 }, { t: dur, v: 0.5 + (sb.scenes.length % 2 ? 0.16 : -0.16), ease: 'lin' }])

  const vivos = new Map()                                // matchKey -> { id, box, base, hasta }
  // Una capa solo se ACARREA si las dos son la misma cosa visualmente. El FLIP anima la CAJA, no la
  // tipografia: acarrear el chip de marca (14px, gris, izquierda) hacia el titulo del cierre (72px,
  // tinta, centrado) dibujaba el cierre con la tipografia del chip estirada en una caja grande — el
  // cierre se veia vacio. Si no son compatibles, no hay match-cut: sale una y entra la otra.
  const compatible = (a, b) => {
    if (!a || !b || a.kind !== b.kind) return false
    if (a.kind !== 'text') return true
    if ((a.role || '') !== (b.role || '')) return false
    const sa = a.size || 1, sb = b.size || 1
    return Math.max(sa, sb) / Math.max(1e-6, Math.min(sa, sb)) < 1.6
  }
  sb.scenes.forEach((sc, i) => {
    const t0 = R3(sc.t0), t1 = R3(sc.t0 + sc.dur)
    const lIn = links[i], lOut = links[i + 1]
    const dIn = lIn ? lIn.dur : 0.45, dOut = lOut ? lOut.dur : 0.5
    // ventana CENTRADA en el corte: B entra mientras A sale -> nunca hay un frame de solo fondo
    const entra0 = i === 0 ? 0 : R3(t0 - dIn * 0.5 + (lIn.jitter || 0))
    const entra1 = R3(entra0 + (i === 0 ? 0.55 : dIn))
    const sale0 = R3(t1 - dOut * 0.5), sale1 = R3(Math.min(dur, t1 + dOut * 0.5))
    markers.push({ t: t0, label: sc.escena })
    if (lIn) markers.push({ t: t0, label: '↦ ' + lIn.name })
    // FLASH real: 3-4 frames de placa a pleno sobre el corte. Es lo que hace que un corte seco se lea
    // como decision de montaje; sin el, flash-cut era solo un corte duro con un hueco en el medio.
    if (lIn && lIn.entrada === 'expande') {
      // EL PUNTO. Es lo que el ojo sigue mientras una escena se va y la otra llega, y sin el la
      // transicion es un hueco. Nace donde estaba el foco de A y muere donde nace el de B.
      const pid = `punto:${sc.id}`, a = R3(t0 - dIn * 0.5), b = R3(t0 + dIn * 0.5)
      // DONDE COLAPSO A, no en el centro del cuadro. Clavarlo en 0.5/0.5 lo ponia justo donde vive
      // cualquier titular centrado: medido, se solapaba con un texto visible en el 86% de los cortes
      // con punto. El punto es lo que QUEDA de la escena que se fue, asi que nace donde estaba su foco.
      const focoA = (sb.scenes[i - 1].layers.find(x => x.focal) || {}).box
      const px = focoA ? focoA[0] + focoA[2] / 2 : 0.5
      const py = focoA ? focoA[1] + focoA[3] / 2 : 0.5
      // El punto tiene que SOSTENER el cuadro mientras las dos escenas son chicas, no solo insinuarse:
      // con 0.052 aportaba 0.15% de tinta y en una pagina pobre (404, botwall) el medio de la
      // transicion quedaba por debajo del umbral de frame vacio. Es el unico elemento en pantalla en
      // ese instante: merece el tamano de un elemento.
      const d = 0.105
      // z BAJA: el punto va DETRAS del contenido. Cuando importa (el medio de la transicion) no hay nada
      // que lo tape, y cuando la escena entrante ya esta puesta no tiene que atravesarle una letra.
      layers.push({ id: pid, kind: 'shape', life: [a, b], z: 15, base: { id: pid, kind: 'shape', shape: 'dot', fill: 'accent', box: cajaPunto(px, py, d) }, ...cajaProps(cajaPunto(px, py, d)) })
      push(pid, 'alpha', [{ t: a, v: 0 }, { t: R3(t0 - dIn * 0.20), v: 1, ease: 'co' }, { t: R3(t0 + dIn * 0.06), v: 1 }, { t: R3(t0 + dIn * 0.34), v: 0, ease: 'ci' }])   // se va apenas la escena entrante puede sostener el cuadro sola
      // el punto NO se infla: su trabajo es ser el ancla que el ojo sigue, no un efecto. Inflarlo de
      // 1 a 2.6 en cuatro frames daba 0.4 de escala por cuadro, que es un parpadeo, no un movimiento.
      push(pid, 'scale', [{ t: a, v: 0.55 }, { t: t0, v: 1 }, { t: b, v: 1.25, ease: 'cio' }])
    }
    if (lIn && lIn.entrada === 'flash') {
      const fid = `flash:${sc.id}`, a = R3(t0 - 0.075), b = R3(t0 + 0.085)
      // SIEMPRE el ACENTO, nunca la tinta. Con `ink` sobre placa oscura el flash era blanco casi puro a
      // pantalla completa: un estroboscopio de 5 frames que ademas es un riesgo para gente fotosensible.
      // El acento da el mismo golpe de montaje y ademas TIÑE la pieza con el color de la marca.
      layers.push({ id: fid, kind: 'shape', life: [a, b], z: 900, base: { id: fid, kind: 'shape', shape: 'rect', fill: 'accent', radius: 0, box: [0, 0, 1, 1], sangra: true }, ...cajaProps([0, 0, 1, 1]) })
      push(fid, 'alpha', [{ t: a, v: 0 }, { t: R3(t0 - 0.01), v: 0.62, ease: 'qo' }, { t: b, v: 0, ease: 'ci' }])   // 0.62 y no 0.88: se lee el corte sin tapar del todo el cuadro
    }

    const propios = sc.layers.filter(l => l.kind !== 'plate')
    const orden = propios.slice().sort((a, b) => a.z - b.z)
    // ORDEN DE ENTRADA != orden de dibujo. El stagger iba por z ascendente, y la capa FOCAL suele ser
    // la de mayor z: entraba ULTIMA. Resultado medido: 0.18% de tinta en el corte, porque durante
    // ~0.2s lo unico puesto eran el chip de marca y tres filetes de 3px mientras el heroe todavia no
    // habia empezado. El cuadro lo sostiene el foco: entra PRIMERO y los detalles lo siguen. Ademas es
    // mejor montaje — el ojo aterriza en el sujeto y despues aparecen los accesorios.
    const pesoEnt = l => (l.focal ? 1e6 : 0) + (l.box[2] || 0) * (l.box[3] || 0)
    const ordenEntrada = new Map(propios.slice().sort((a, b) => pesoEnt(b) - pesoEnt(a) || a.z - b.z).map((l, i) => [l.id, i]))
    orden.forEach((l, k) => {
      const box = l.box
      const cae = cajaProps(box)
      const cand = l.matchKey && lIn && lIn.carries.indexOf(l.matchKey) >= 0 ? vivos.get(l.matchKey) : null
      const heredado = cand && compatible(cand.base, l) ? cand : null
      const seguira = l.matchKey && lOut && lOut.carries.indexOf(l.matchKey) >= 0

      if (heredado) {
        // --- FLIP: la capa VIAJA. No nace una nueva; se le agregan keys a la que ya existe.
        const prev = heredado
        const tl = layers.find(x => x.id === prev.id)
        tl.life[1] = seguira ? t1 : sale1
        // La distancia manda: un viaje de media pantalla resuelto en 0.5s con spring arranca moviendo
        // ~115px en un solo frame y se lee como salto, no como match-cut. Ventana proporcional y, en
        // viajes largos, cubica en vez de spring (el overshoot a esa velocidad marea).
        const dist = Math.hypot((prev.box.x - cae.x) * 1.78, prev.box.y - cae.y)
        const e = dist > 0.22 ? 'cio' : 'spring:0.78,13'
        const flip1 = R3(Math.min(t1 - 0.1, entra0 + Math.max(dIn, 0.5 + dist * 0.9)))
        for (const p of ['x', 'y', 'w', 'h']) {
          if (Math.abs(prev.box[p] - cae[p]) > 1e-5) push(prev.id, p, [{ t: entra0, v: R4(prev.box[p]) }, { t: flip1, v: R4(cae[p]), ease: e }])
        }
        vivos.set(l.matchKey, { id: prev.id, box: cae, base: l, hasta: tl.life[1] })
        if (!seguira) cierre(prev.id, sale0, sale1, l, lOut, look, push, cae)
        return
      }

      // --- capa nueva ---
      const id = `${sc.id}:${l.id}`
      // un corte SECO (step) es simultaneo por definicion. Con stagger, A desaparecia de golpe y B
      // entraba escalonado: hasta 0.22s de pantalla casi vacia. Medido en la rejilla: 0.1% de tinta.
      const seco = lIn && (lIn.entrada === 'flash' || lIn.salida === 'corte')
      // el stagger se cuenta en el orden de ENTRADA (foco primero) y nunca puede pasar de la mitad de
      // la ventana del corte: si no, la escena entrante llega tarde a su propio corte.
      const kEnt = ordenEntrada.get(l.id) || 0
      const stag = (seco || i === 0) ? 0 : Math.min(0.055 * kEnt, 0.18, dIn * 0.45)
      const e0 = R3(entra0 + stag), e1 = R3(entra1 + stag)
      // PRIMER FRAME: el video arranca CON LA IMAGEN PUESTA y hace un push-in. Nada de fundido desde
      // el fondo: en un reel los primeros 300ms son los unicos que se miran seguro, y gastarlos en un
      // fade es tirarlos. Medido antes de esto: 0.00% de tinta en t=0.02s (arrancaba en negro).
      const gi = i === 0 ? { from: { scale: 0.985 }, ease: 'eo' } : gestoEntrada(lIn.entrada, l, k, look)
      const hasta = seguira ? t1 : sale1
      layers.push({ id, kind: l.kind, life: [Math.max(0, e0), Math.min(dur, hasta)], z: l.z, base: l, ...cae })

      const f = gi.from
      if (f.alpha != null) push(id, 'alpha', [{ t: e0, v: f.alpha }, { t: e1, v: 1, ease: gi.ease }])
      if (f.reveal != null) push(id, 'reveal', [{ t: e0, v: f.reveal }, { t: e1, v: 1, ease: gi.ease }])
      if (f.dy != null) push(id, 'y', [{ t: e0, v: R4(cae.y + f.dy) }, { t: e1, v: R4(cae.y), ease: gi.ease }])
      if (f.dx != null) push(id, 'x', [{ t: e0, v: R4(cae.x + f.dx) }, { t: e1, v: R4(cae.x), ease: gi.ease }])

      // SCALE en UN SOLO track: entrada + deriva + salida. Emitirlos por separado dejaba dos tracks
      // del mismo prop con keys en el mismo instante, y la deriva le ganaba a la salida.
      const goOut = !seguira && lOut ? gestoSalida(lOut.salida, l, 0, look) : null
      const ks = []
      if (f.scale != null) ks.push({ t: e0, v: f.scale }, { t: e1, v: 1, ease: gi.ease })
      // DERIVA DEL FOCO: sin esto la escena se arma y se queda congelada mas de un segundo (medido en
      // la rejilla: 8 frames identicos seguidos). Un movimiento lentisimo y continuo en la capa focal
      // alcanza para que la pieza se lea como video y no como una imagen fija con cortes.
      const finDeriva = lOut ? sale0 : dur                // la ultima escena deriva hasta el final
      // NUNCA sobre glifos. La deriva la aplica el renderer con ctx.scale(), y escalar texto a una
      // fraccion de pixel distinta en cada frame lo re-rasteriza distinto: el titular HIERVE mientras
      // se lee. Medido con la metrica de MOTION-PRINCIPLES §5: 0.62 contra un umbral de 0.05, en el
      // 37% de las escenas — y §5 lo prohibe literalmente. El aire muerto lo cubre el fondo vivo (la
      // luz de la placa recorre el cuadro), que no tiene glifos que hervir.
      const conGlifos = l.kind === 'text' || l.kind === 'badge' || l.kind === 'stepper' || l.kind === 'priceTag'
      const derivar = l.focal && !conGlifos && (!goOut || goOut.to.scale == null) && finDeriva - e1 > 0.6
      if (derivar) {
        if (!ks.length) ks.push({ t: e1, v: 1 })
        // amplitud suficiente para que el movimiento EXISTA en pixeles: con 1.8% sobre un elemento
        // chico, dos frames contiguos rasterizaban identico y la imagen se leia congelada.
        ks.push({ t: finDeriva, v: +(1 + (look.energia > 0.6 ? 0.055 : 0.038)).toFixed(4), ease: 'lin' })
      }
      if (goOut && goOut.to.scale != null) {
        const ult = ks.length ? ks[ks.length - 1] : null
        if (!ult) ks.push({ t: sale0, v: 1 })
        else if (ult.t < sale0 - 1e-9) ks.push({ t: sale0, v: ult.v })
        ks.push({ t: sale1, v: goOut.to.scale, ease: goOut.ease })
      }
      push(id, 'scale', ks)

      if (seguira) vivos.set(l.matchKey, { id, box: cae, base: l, hasta: t1 })
      else cierre(id, sale0, sale1, l, lOut, look, push, cae, true)
    })

    // las matchKeys que no siguieron dejan de estar vivas
    for (const [k, v] of Array.from(vivos)) if (v.hasta <= t1 - 1e-6) vivos.delete(k)
  })

  // ordena por t y resuelve empates quedandose con la ultima key escrita (la mas especifica)
  const tracks = []
  for (const [k, keys] of acc) {
    const [layer, prop] = k.split('|')
    const ord = keys.map((x, i) => ({ ...x, __i: i })).sort((a, b) => a.t - b.t || a.__i - b.__i)
    const out = []
    for (const key of ord) {
      if (out.length && Math.abs(out[out.length - 1].t - key.t) < 1e-9) out[out.length - 1] = key
      else out.push(key)
    }
    out.forEach(x => delete x.__i)
    if (out.length > 1) tracks.push({ layer, prop, keys: out })
  }
  tracks.sort((a, b) => a.layer.localeCompare(b.layer) || a.prop.localeCompare(b.prop))

  return { v: TL_V, seed: sb.seed, fps, dur, canvas: { ...sb.canvas }, look, layers, tracks, markers, guion: sb.guion, escenas: sb.scenes.map(s => ({ id: s.id, escena: s.escena, t0: s.t0, dur: s.dur })), links: links.filter(Boolean).map(l => l.name) }
}

// las keys de salida de una capa (la ultima escena no tiene salida: el video termina con la imagen puesta)
function cierre(id, s0, s1, l, lOut, look, push, cae, yaScale) {
  if (!lOut) return
  const go = gestoSalida(lOut.salida, l, 0, look)
  const t = go.to
  // LA OPACIDAD NO SIGUE LA CURVA DEL GESTO. Los gestos de salida usan curvas *in* (ei, ci, step),
  // que a mitad de la ventana todavia estan al 97%: la capa que se va y la que entra se cruzaban las
  // dos en su meseta, y durante medio segundo se leian DOS mensajes superpuestos a opacidad plena.
  // Se lee como un error de render, no como una transicion. La POSICION si puede solaparse (eso es lo
  // que da continuidad); la opacidad se va rapido y termina en la primera parte de la ventana.
  if (t.alpha != null) push(id, 'alpha', [{ t: s0, v: 1 }, { t: R3(s0 + (s1 - s0) * 0.62), v: t.alpha, ease: 'co' }])
  if (t.scale != null && !yaScale) push(id, 'scale', [{ t: s0, v: 1 }, { t: s1, v: t.scale, ease: go.ease }])
  if (t.dy != null) push(id, 'y', [{ t: s0, v: R4(cae.y) }, { t: s1, v: R4(cae.y + t.dy), ease: go.ease }])
  if (t.dx != null) push(id, 'x', [{ t: s0, v: R4(cae.x) }, { t: s1, v: R4(cae.x + t.dx), ease: go.ease }])
  if (t.hacia === 'centro') {
    push(id, 'x', [{ t: s0, v: R4(cae.x) }, { t: s1, v: R4(cae.x + (0.5 - cae.x) * 0.45), ease: go.ease }])
    push(id, 'y', [{ t: s0, v: R4(cae.y) }, { t: s1, v: R4(cae.y + (0.5 - cae.y) * 0.45), ease: go.ease }])
  }
}

const cajaProps = b => ({ x: R4(b[0] + b[2] / 2), y: R4(b[1] + b[3] / 2), w: R4(b[2]), h: R4(b[3]) })
// caja cuadrada EN PIXELES centrada en (cx, cy) normalizados
const cajaPunto = (cx, cy, d) => [cx - d / 2, cy - d * (CANVAS.W / CANVAS.H) / 2, d, d * (CANVAS.W / CANVAS.H)]

// ---------------------------------------------------------------- evaluador
// indice perezoso layer -> prop -> keys (se cachea en el objeto timeline, no se serializa)
function indice(tl) {
  if (tl.__ix) return tl.__ix
  const ix = new Map()
  for (const tr of tl.tracks) {
    let m = ix.get(tr.layer)
    if (!m) { m = new Map(); ix.set(tr.layer, m) }
    m.set(tr.prop, tr.keys)                              // el compilador garantiza un track por (capa, prop)
  }
  Object.defineProperty(tl, '__ix', { value: ix, enumerable: false, configurable: true })
  return ix
}

// evalKeys(keys, t) — busqueda binaria + ease de la key A LA QUE se entra (no de la que se sale)
export function evalKeys(keys, t) {
  const n = keys.length
  if (!n) return 0
  if (t <= keys[0].t) return keys[0].v
  if (t >= keys[n - 1].t) return keys[n - 1].v
  let lo = 0, hi = n - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (keys[m].t <= t) lo = m; else hi = m }
  const a = keys[lo], b = keys[hi]
  const span = b.t - a.t
  if (span <= 1e-9) return b.v
  const p = parseEase(b.ease || 'eo')((t - a.t) / span)
  return a.v + (b.v - a.v) * p
}

// propsAt(tl, t) -> Map layerId -> props resueltos (solo capas VIVAS)
export function propsAt(tl, t) {
  const ix = indice(tl)
  const out = new Map()
  for (const l of tl.layers) {
    if (t < l.life[0] - 1e-6 || t > l.life[1] + 1e-6) continue
    const m = ix.get(l.id)
    const p = {
      x: l.x == null ? PROP_DEFAULT.x : l.x, y: l.y == null ? PROP_DEFAULT.y : l.y,
      w: l.w == null ? PROP_DEFAULT.w : l.w, h: l.h == null ? PROP_DEFAULT.h : l.h,
      scale: 1, rot: 0, alpha: 1, reveal: 1, sweep: 0,
    }
    if (m) for (const [prop, keys] of m) p[prop] = evalKeys(keys, t)
    if (p.alpha <= 0.002) continue                       // invisible: no se dibuja ni se reporta
    out.set(l.id, p)
  }
  return out
}

// capas vivas ordenadas para dibujar (z y despues id: orden estable)
export function layersAt(tl, t) {
  const p = propsAt(tl, t)
  return tl.layers.filter(l => p.has(l.id)).sort((a, b) => a.z - b.z || a.id.localeCompare(b.id)).map(l => ({ l, p: p.get(l.id) }))
}

// caja en pixeles a partir de los props (x,y = centro)
export const boxDe = (p, W, H) => [(p.x - p.w / 2) * W, (p.y - p.h / 2) * H, p.w * W, p.h * H]

// util para la UI y los gates: en que escena cae un tiempo
export function escenaEn(tl, t) {
  let out = tl.escenas[0]
  for (const e of tl.escenas) if (t >= e.t0 - 1e-6) out = e
  return out
}
