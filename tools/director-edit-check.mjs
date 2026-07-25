// GATE director-edit — audita el OVERLAY DE EDICION (src/director/core/edits.js), que es la pieza que
// le da al usuario poder sobre el video SIN poder romperlo. La promesa del overlay es fuerte: el video
// se re-genera desde (pagemodel, seed, edits), asi que una edicion tiene que ser pura, determinista y
// SIEMPRE producir un storyboard que el resto del motor pueda compilar y dibujar.
//
// Corre la matriz (pagemodels reales de tools/fixtures/director + arquetipos) x seeds x sets de edits
// generados DETERMINISTAMENTE (seedFor/pick, cero Math.random) y asserta:
//   1. E-DET          applyEdits dos veces da el MISMO json
//   2. E-PURA         applyEdits NO toca el storyboard de entrada
//   3. contrato       el storyboard editado sigue pasando validateStoryboard
//   4. E-FOCUS        exactamente UNA capa focal por escena despues de editar
//   5. E-TIEMPOS      t0 consecutivos y dur total = suma de las escenas
//   6. E-EDIT-VACIA   ocultar todo se IGNORA (la escena conserva contenido) y validateEdits lo reporta
//   7. E-CONTRAST     re-teñir mantiene la legibilidad (|APCA(accentTxt, bg0)| >= 60)
//   8. E-TXT-OVERFLOW un texto editado de 200 caracteres NO desborda (se compila y se RENDERIZA)
//   9. E-ORDEN        orden con ids basura / repetidos / vacio no rompe ni pierde escenas
//  10. E-NOOP         un overlay vacio devuelve el mismo video byte a byte
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, validateStoryboard, formatErrors, CANVAS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook, PLACAS } from '../src/director/kit/look.js'
import { compile } from '../src/director/core/timeline.js'
import { drawFrame } from '../src/director/render/video.js'
import { corpusHero } from '../src/director/render/draw.js'
import { drawPlaca } from '../src/director/render/plate.js'
import { telStart, telStop } from '../src/director/core/text.js'
import { emptyEdits, applyEdits, validateEdits, contarEdits, EDITS_V, DUR_MIN, DUR_MAX } from '../src/director/core/edits.js'
import { seedFor, pick, shuffled } from '../src/director/core/prng.js'
import { apcaLc } from '../src/director/core/util.js'
import { NOMBRES } from '../src/director/kit/objetos.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

let fails = 0
const die = m => { if (fails < 25) console.error('FAIL  ' + m); fails++ }
const ok = (c, m) => { if (!c) die(m) }

// ---------------------------------------------------------------- matriz
const ARQ = {
  saas: { brand: 'Urvid', url: 'https://urvid.app/', dna: { palette: { accent: '#6366f1' }, modernidad: ['bigtype', 'bento'], mood: { energia: 0.7 } }, semantica: { queHace: 'Convertí cualquier link en un reel listo para publicar', comoFunciona: ['Pegás el link de tu página', 'La IA analiza y escribe el guion', 'Descargás el video en 9:16'], tipoNegocio: 'saas', modeloUso: 'suscripcion', features: [{ titulo: 'Análisis automático' }, { titulo: 'Video en 30 segundos' }, { titulo: 'Sin editar nada' }, { titulo: 'Formato vertical' }], pruebas: { stats: [{ valor: '30s', etiqueta: 'por video' }], testimonios: [{ texto: 'Pasamos de tardar un día a tener el reel en un café', firma: 'Marina' }], logosClientes: true }, cta: 'Probalo gratis' } },
  resto: { brand: 'La Parrilla de Don Julio', url: 'https://parrilla.com.ar/', dna: { palette: { accent: '#e0762a' }, mood: { energia: 0.4, calidez: 0.8 } }, semantica: { queHace: 'La parrilla que todo el barrio recomienda desde 1987', tipoNegocio: 'servicio-local', modeloUso: 'reserva', features: [{ titulo: 'Cortes premium' }, { titulo: 'Vinos de autor' }, { titulo: 'Patio al aire libre' }], pruebas: { stats: [{ valor: '4.9', etiqueta: 'en reseñas de Google' }] }, cta: 'Reservá tu mesa' } },
  tienda: { brand: 'Atelier', url: 'https://atelier.store/', dna: { palette: { accent: '#b45309' }, modernidad: ['editorial-photo'] }, semantica: { queHace: 'Prendas de confección local en series cortas', tipoNegocio: 'ecommerce', modeloUso: 'compra', features: [{ titulo: 'Algodón orgánico' }, { titulo: 'Series de 30' }], oferta: { promo: '20% en la primera compra', urgencia: 'Solo esta semana', precio: '$39.900' }, pruebas: { testimonios: [{ texto: 'La calidad se nota apenas la tocás', firma: 'Ana' }] }, cta: 'Ver colección' }, assets: { images: [{ url: 'https://x/p.jpg', kind: 'producto' }] } },
  evento: { brand: 'Vértigo', url: 'https://vertigo.club/', dna: { palette: { accent: '#e11d74' }, modernidad: ['brutalist'], mood: { energia: 0.95 } }, semantica: { queHace: 'Line up internacional todos los sábados', tipoNegocio: 'evento', modeloUso: 'compra', features: [{ titulo: 'Barra premium' }, { titulo: 'Sonido Funktion-One' }], oferta: { urgencia: 'Últimas entradas' }, pruebas: { stats: [{ valor: '2500', etiqueta: 'personas por noche' }] }, cta: 'Conseguí tu entrada' } },
  pobre: { brand: 'Kiosco', url: 'https://kiosco.com/' },
}
const FIXDIR = join(HERE, 'fixtures', 'director')
if (existsSync(FIXDIR)) for (const f of readdirSync(FIXDIR).filter(x => x.endsWith('.json'))) {
  try { ARQ['fix:' + f.replace('.json', '')] = JSON.parse(readFileSync(join(FIXDIR, f), 'utf-8')) } catch {}
}
const SEEDS = 4

// texto ADVERSARIAL: 200+ caracteres reales (acentos, ñ, puntuacion, palabras largas) pegados de un
// tiron en una caja que el composer dimensiono para una frase corta. Es el caso que rompe cualquier
// editor que confie en que el texto "va a entrar".
const LARGO = 'Este es un texto deliberadamente larguísimo que un usuario pega sin pensar en el encuadre, con acentuación, eñes y puntuación variada: comas, guiones y paréntesis, para ver si el bloque se derrama fuera de su caja.'
const ACENTOS = ['#e11d48', '#0ea5e9', '#facc15', '#111827', '#f5f5f4', '#16a34a']

// ---------------------------------------------------------------- sets de edits (deterministas)
// Cada generador recibe (sb, seed) y devuelve un overlay. Todo lo aleatorio sale de seedFor/pick: dos
// corridas del gate prueban EXACTAMENTE los mismos casos (si algo falla, se puede reproducir).
const capasDe = sc => sc.layers.filter(l => l.kind !== 'plate')
const textosDe = sc => sc.layers.filter(l => l.kind === 'text')

const SETS = [
  ['vacio', () => emptyEdits()],

  ['duraciones', (sb, seed) => {
    const r = seedFor(seed, 'gate.edits.dur')
    const e = emptyEdits()
    // valores dentro y FUERA de rango a proposito: fuera de rango se clampea, nunca se descarta
    for (const sc of sb.scenes) e.escenas[sc.id] = { dur: pick(r, [1.4, 2.2, 3.7, 5.9, 0.2, 99]) }
    return e
  }],

  ['textos', (sb, seed) => {
    const r = seedFor(seed, 'gate.edits.txt')
    const e = emptyEdits()
    // el texto largo va a TODA capa de texto del video: si una sola caja no lo aguanta, el gate la marca
    for (const sc of sb.scenes) for (const l of textosDe(sc)) e.capas[`${sc.id}:${l.id}`] = { text: LARGO }
    // y una capa cualquiera queda vacia: tiene que desaparecer, no dibujarse muda
    const sc0 = pick(r, sb.scenes)
    const cs = capasDe(sc0)
    if (cs.length > 1) e.capas[`${sc0.id}:${cs[0].id}`] = { text: '' }
    return e
  }],

  ['estilo', (sb, seed) => {
    const r = seedFor(seed, 'gate.edits.estilo')
    const e = emptyEdits()
    e.look = { accent: pick(r, ACENTOS), placa: pick(r, PLACAS) }
    for (const sc of sb.scenes) {
      const l = pick(r, capasDe(sc))
      if (!l) continue
      const ed = { color: pick(r, ['ink', 'dim', 'accent', 'accentTxt', 'onAccent', '#00e5ff']) }
      if (typeof l.size === 'number') ed.size = pick(r, [0.5, 0.8, 1.6, 2])
      if (l.kind === 'heroObj') ed.obj = pick(r, NOMBRES)
      e.capas[`${sc.id}:${l.id}`] = ed
    }
    return e
  }],

  ['orden', (sb, seed) => {
    const r = seedFor(seed, 'gate.edits.orden')
    const e = emptyEdits()
    const ids = sb.scenes.map(s => s.id)
    // permutacion real + ids basura + un id repetido + un no-string: nada de eso puede perder escenas
    e.orden = shuffled(r, ids).slice(0, Math.max(1, ids.length - 1))
    e.orden.push('no-existe-esta-escena', e.orden[0], 42)
    return e
  }],

  ['orden-vacio', () => ({ ...emptyEdits(), orden: [] })],

  ['ocultar-todo', (sb, seed) => {
    const r = seedFor(seed, 'gate.edits.ocultar')
    const e = emptyEdits()
    // una escena entera oculta (incluida la placa, que es ilegal) + otra a medias
    const sc0 = pick(r, sb.scenes)
    for (const l of sc0.layers) e.capas[`${sc0.id}:${l.id}`] = { oculta: true }
    const sc1 = sb.scenes[(sb.scenes.indexOf(sc0) + 1) % sb.scenes.length]
    if (sc1 !== sc0) { const cs = capasDe(sc1); if (cs.length > 1) e.capas[`${sc1.id}:${cs[0].id}`] = { oculta: true } }
    return e
  }],

  ['basura', (sb, seed) => {
    const r = seedFor(seed, 'gate.edits.basura')
    const sc = pick(r, sb.scenes)
    const l = pick(r, capasDe(sc)) || sc.layers[0]
    return {
      v: 99,                                                   // version equivocada
      escenas: { 'escena-que-no-existe': { dur: 3 }, [sc.id]: { dur: 'tres' } },
      capas: {
        'clave-sin-dos-puntos': { text: 'x' },
        [`${sc.id}:capa-fantasma`]: { text: 'x' },
        [`${sc.id}:${l.id}`]: { color: 'violeta-flu', size: 'grande', obj: 'nave-espacial', oculta: 'si' },
      },
      look: { accent: 'rojo', placa: 'marmol', tipografia: 'Comic Sans' },
      orden: ['nada', 'de', 'esto', 'existe'],
    }
  }],

  ['mix', (sb, seed) => {
    const r = seedFor(seed, 'gate.edits.mix')
    const e = emptyEdits()
    e.look = { accent: pick(r, ACENTOS) }
    e.orden = shuffled(r, sb.scenes.map(s => s.id))
    for (const sc of sb.scenes) {
      e.escenas[sc.id] = { dur: pick(r, [1.6, 2.4, 4.5]) }
      const ls = capasDe(sc)
      const t = textosDe(sc)[0]
      if (t) e.capas[`${sc.id}:${t.id}`] = { text: LARGO.slice(0, 120), size: pick(r, [0.7, 1.5]) }
      if (ls.length > 2) e.capas[`${sc.id}:${ls[ls.length - 1].id}`] = { oculta: true }
    }
    return e
  }],
]

// ---------------------------------------------------------------- render de auditoria
// A TAMANO NOMINAL (405x720, el del export): el piso de 9px del renderer es relativo al lienzo, asi
// que medir desbordes en un canvas mas chico mentiria en el sentido pesimista.
const W = CANVAS.W, H = CANVAS.H
const makeCanvas = (w, h) => createCanvas(w, h)
const cv = createCanvas(W, H), ctx = cv.getContext('2d')
// fondo de referencia por look, para medir cuanta imagen aporta el cuadro por encima de la placa
const _fondos = new Map()
function fondoDe(look) {
  const k = look.bg0 + '|' + look.bg1 + '|' + look.orn + '|' + look.grano + '|' + look.luzAng
  let d = _fondos.get(k)
  if (!d) { const c = createCanvas(W, H), cx = c.getContext('2d'); drawPlaca(cx, look, W, H, {}); d = cx.getImageData(0, 0, W, H).data; _fondos.set(k, d) }
  return d
}
// AUDITORIA COMPLETA de un storyboard editado. Antes esto solo corria para 2 de los 9 sets y solo
// miraba desbordes: por eso pasaban desapercibidos el `size: 2` que derrama, el CTA elidido con
// puntos suspensivos, y el ocultado que dejaba la escena en 0.42% de tinta. Ahora corre para TODOS
// los sets y mide las tres cosas que un cuadro puede tener mal: texto que se sale, texto cortado con
// "..." y cuadro sin imagen.
function auditar(sb, seed, brand, corpus) {
  const tl = compile(sb, seed)
  const fondo = fondoDe(tl.look)
  const out = { desbordes: [], elididos: [], tinta: new Map(), frames: 0 }
  for (const e of tl.escenas) {
    const t = Math.min(tl.dur - 0.001, e.t0 + e.dur * 0.62)   // ya revelado, todavia sin salir
    const tel = telStart()
    const rep = drawFrame(ctx, tl, t, { W, H, makeCanvas, brand, corpus, images: new Map() })
    telStop()
    out.frames++
    // el mensaje trae la GEOMETRIA: sin ella, un desborde obliga a reproducir el caso a mano para
    // saber si la culpa es de la caja, del tope de lineas o del largo del texto.
    const scE = sb.scenes.find(x => x.id === e.id) || { layers: [] }
    for (const d of rep.desbordes) {
      const l = scE.layers.find(x => x.id === d.id) || {}
      const geo = l.box ? `caja ${Math.round(l.box[2] * W)}x${Math.round(l.box[3] * H)}px size ${(l.size * H).toFixed(1)}px lines=${l.lines} upper=${!!l.upper} len=${String(l.text || "").length}` : ""
      out.desbordes.push(`${e.escena}/${d.id} [${geo}]`)
    }
    for (const x of tel) if (x.ellip) out.elididos.push(`${e.escena}:"${x.str}"`)
    const d = ctx.getImageData(0, 0, W, H).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - fondo[i]) + Math.abs(d[i + 1] - fondo[i + 1]) + Math.abs(d[i + 2] - fondo[i + 2]) > 24) n++
    }
    out.tinta.set(e.escena, n / (W * H))
  }
  return out
}

// ---------------------------------------------------------------- corrida
let nCasos = 0, nEsc = 0, nFrames = 0, nRecortes = 0, nVacias = 0
ok(LARGO.length >= 200, `el texto adversarial mide ${LARGO.length} caracteres (deberia ser >= 200)`)

for (const [nombre, raw] of Object.entries(ARQ)) {
  const pm = normalizePageModel(raw)
  const corpusH = corpusHero(pm)
  for (let s = 1; s <= SEEDS; s++) {
    const seed = (s * 2654435761) >>> 0
    const sb = composeStoryboard(pm, buildGuion(pm, seed), deriveLook(pm, seed), seed)
    const antes = JSON.stringify(sb)

    // linea base de tinta por escena: el MISMO video sin ninguna edicion. Es la referencia contra la
    // que se juzga si una edicion derrumbo el cuadro.
    const tintaBase = auditar(sb, seed, pm.brand, corpusH).tinta

    for (const [set, gen] of SETS) {
      const P = `${nombre}#${s}/${set}`
      const edits = gen(sb, seed)
      const editsJson = JSON.stringify(edits)
      const a = applyEdits(sb, edits)
      nCasos++

      // 1. DETERMINISMO
      const b = applyEdits(sb, edits)
      ok(JSON.stringify(a) === JSON.stringify(b), `${P}: applyEdits NO es determinista`)

      // 2. PUREZA: ni el storyboard ni el overlay se tocan
      ok(JSON.stringify(sb) === antes, `${P}: applyEdits MUTO el storyboard de entrada`)
      ok(JSON.stringify(edits) === editsJson, `${P}: applyEdits MUTO el overlay de edits`)

      // 3. contrato
      const v = validateStoryboard(a)
      ok(v.ok, `${P}: el storyboard editado es invalido\n${v.ok ? '' : formatErrors(v.errors)}`)
      ok(a.scenes.length === sb.scenes.length, `${P}: ${sb.scenes.length} escenas -> ${a.scenes.length} (se perdieron o duplicaron)`)
      ok(new Set(a.scenes.map(x => x.id)).size === a.scenes.length, `${P}: ids de escena duplicados despues de editar`)

      for (const sc of a.scenes) {
        nEsc++
        // 4. E-FOCUS
        const focos = sc.layers.filter(l => l.focal)
        ok(focos.length === 1, `${P}/${sc.id}: ${focos.length} focos (C1 exige exactamente 1)`)
        ok(focos.length !== 1 || focos[0].kind !== 'plate', `${P}/${sc.id}: el foco quedo en la placa`)
        // la placa nunca se va y la escena nunca queda en solo-fondo
        ok(sc.layers.some(l => l.kind === 'plate'), `${P}/${sc.id}: se quedo sin placa`)
        ok(sc.layers.some(l => l.kind !== 'plate'), `${P}/${sc.id}: escena vacia (solo la placa)`)
        ok(sc.dur >= DUR_MIN - 1e-9 && sc.dur <= DUR_MAX + 1e-9, `${P}/${sc.id}: dura ${sc.dur}s (fuera de [${DUR_MIN},${DUR_MAX}])`)
        // ningun texto puede quedar en blanco: se oculta la capa, no se dibuja una caja muda
        for (const l of sc.layers) ok(!(l.kind === 'text' && !String(l.text).trim()), `${P}/${sc.id}/${l.id}: capa de texto vacia`)
        if (sc.layers.some(l => l.recortado)) nRecortes++
      }

      // 5. E-TIEMPOS
      let t = 0
      for (const sc of a.scenes) { ok(Math.abs(sc.t0 - t) < 0.02, `${P}/${sc.id}: t0 ${sc.t0} deberia ser ${t.toFixed(2)}`); t += sc.dur }
      ok(Math.abs(a.dur - t) < 0.02, `${P}: dur total ${a.dur} != suma de escenas ${t.toFixed(2)}`)

      // ---- asserts propios de cada set ----
      if (set === 'vacio') {
        // 10. E-NOOP: "sin ediciones" no puede significar "otro video"
        ok(JSON.stringify(a) === antes, `${P}: un overlay vacio cambio el storyboard`)
        ok(contarEdits(edits) === 0, `${P}: contarEdits deberia dar 0 y dio ${contarEdits(edits)}`)
        ok(validateEdits(edits, sb).ok, `${P}: emptyEdits() no valida`)
      }

      if (set === 'duraciones') {
        for (const sc of a.scenes) {
          const ped = edits.escenas[sc.id].dur
          const esp = Math.round(Math.min(DUR_MAX, Math.max(DUR_MIN, ped)) * 100) / 100
          ok(Math.abs(sc.dur - esp) < 1e-9, `${P}/${sc.id}: pedi ${ped}s y quedo ${sc.dur}s (esperaba ${esp}s)`)
        }
      }

      // 8. Se COMPILA y se DIBUJA de verdad, con las fuentes reales, para CADA set: ninguna edicion
      // puede producir un cuadro con texto derramado, texto elidido o sin imagen.
      {
        const au = auditar(a, seed, pm.brand, corpusH)
        nFrames += au.frames
        ok(au.desbordes.length === 0, `${P}: texto derramado fuera de su caja en ${au.desbordes.slice(0, 3).join(', ')}`)
        ok(au.elididos.length === 0, `${P}: texto cortado con puntos suspensivos en ${au.elididos.slice(0, 3).join(', ')}`)
        // TINTA: lo que este gate tiene que probar es que la EDICION no derrumbe el cuadro, no que el
        // cuadro supere un piso absoluto — de eso ya se ocupan director-storyboard-check y
        // director-timeline-check sobre el video SIN editar. Medir contra un piso fijo daba falsos
        // positivos en dos casos legitimos: una placa de titulo minima (una marca corta y una barra) y
        // la pagina japonesa, que en Node se dibuja con .notdef (cuadritos huecos, casi sin tinta)
        // porque no hay fuente CJK instalada. Se compara contra la MISMA escena sin editar: una caida
        // por debajo del 55% es un derrumbe; quedarse cerca del original no lo es.
        const colapsos = []
        for (const [esc, frac] of au.tinta) {
          const base0 = tintaBase.get(esc)
          if (base0 == null) continue
          if (frac < 0.008 && frac < base0 * 0.55) colapsos.push(`${esc} ${(frac * 100).toFixed(2)}% (era ${(base0 * 100).toFixed(2)}%)`)
        }
        ok(colapsos.length === 0, `${P}: la edicion derrumbo la imagen de la escena -> ${colapsos.slice(0, 3).join(', ')}`)
      }

      if (set === 'textos') {
        // el texto editado esta puesto (entero o recortado por capacidad, nunca ajeno)
        for (const sc of a.scenes) for (const l of sc.layers) {
          if (l.kind !== 'text') continue
          // el recorte por caja corta por PALABRA y limpia la puntuacion final, asi que el resultado
          // es un prefijo del pedido salvo por ese saneo: se compara sobre el texto normalizado.
          const limpio = String(l.text).replace(/[\s,;:.\u2013\u2014-]+$/, '')
          ok(limpio === '' || LARGO.indexOf(limpio) === 0, `${P}/${sc.id}/${l.id}: el texto editado no es prefijo del pedido ("${String(l.text).slice(0, 30)}")`)
        }
      }

      if (set === 'estilo') {
        // 7. E-CONTRAST: re-teñir no puede dejar el texto de acento ilegible sobre su placa
        const lcTxt = Math.abs(apcaLc(a.look.accentTxt, a.look.bg0))
        ok(lcTxt >= 60, `${P}: accentTxt ${a.look.accentTxt} sobre bg0 ${a.look.bg0} da APCA ${lcTxt.toFixed(0)} (< 60)`)
        const lcOn = Math.abs(apcaLc(a.look.onAccent, a.look.accent))
        ok(lcOn >= 60, `${P}: onAccent ${a.look.onAccent} sobre accent ${a.look.accent} da APCA ${lcOn.toFixed(0)} (< 60)`)
        ok(a.look.placa === edits.look.placa, `${P}: la placa no cambio a '${edits.look.placa}'`)
        ok(PLACAS.indexOf(a.look.placa) >= 0, `${P}: familia de placa invalida`)
      }

      if (set === 'orden') {
        // 9. E-ORDEN: mismas escenas, y el prefijo pedido se respeta
        ok(new Set(a.scenes.map(x => x.id)).size === new Set(sb.scenes.map(x => x.id)).size, `${P}: cambio el conjunto de escenas`)
        const pedidos = edits.orden.filter(x => typeof x === 'string' && sb.scenes.some(s => s.id === x))
        const unicos = pedidos.filter((x, i) => pedidos.indexOf(x) === i)
        unicos.forEach((id, i) => ok(a.scenes[i] && a.scenes[i].id === id, `${P}: la escena ${i} deberia ser ${id} y es ${a.scenes[i] && a.scenes[i].id}`))
      }

      if (set === 'orden-vacio' || set === 'basura') {
        // un orden imposible se descarta ENTERO: queda el original, nunca un video sin escenas
        ok(a.scenes.map(x => x.id).join('>') === sb.scenes.map(x => x.id).join('>'), `${P}: un orden invalido reordeno el video`)
        const ve = validateEdits(edits, sb)
        if (set === 'basura') {
          ok(!ve.ok, `${P}: validateEdits no reporto NADA sobre un overlay lleno de basura`)
          const cods = new Set(ve.errors.map(e => e.code))
          for (const c of ['E-EDIT-VERSION', 'E-EDIT-DUR', 'E-EDIT-ESCENA', 'E-EDIT-CLAVE', 'E-EDIT-CAPA', 'E-EDIT-COLOR', 'E-EDIT-SIZE', 'E-EDIT-OBJ', 'E-EDIT-ACCENT', 'E-EDIT-PLACA', 'E-EDIT-ORDEN']) {
            ok(cods.has(c), `${P}: validateEdits no reporto ${c} (reporto: ${[...cods].join(', ')})`)
          }
          for (const e of ve.errors) ok(/^E-EDIT-/.test(e.code) && typeof e.path === 'string' && typeof e.msg === 'string', `${P}: error mal formado ${JSON.stringify(e)}`)
        }
      }

      if (set === 'ocultar-todo') {
        // 6. E-EDIT-VACIA — la escena vaciada conserva contenido Y el motor lo reporta
        const ve = validateEdits(edits, sb)
        const vacias = ve.errors.filter(e => e.code === 'E-EDIT-VACIA')
        ok(vacias.length >= 1, `${P}: ocultar una escena entera no genero E-EDIT-VACIA`)
        nVacias += vacias.length
        ok(ve.errors.some(e => e.code === 'E-EDIT-PLATE'), `${P}: ocultar la placa no genero E-EDIT-PLATE`)
        // y la escena atacada sigue mostrando algo (ya cubierto arriba para todas las escenas)
        const sid = vacias[0] ? vacias[0].path.split('.')[1].split(':')[0] : null
        const sc = sid ? a.scenes.find(x => x.id === sid) : null
        ok(!sc || sc.layers.filter(l => l.kind !== 'plate').length >= 1, `${P}/${sid}: quedo sin contenido`)
      }

      // validateEdits nunca puede explotar ni devolver una forma rara
      const ve = validateEdits(edits, sb)
      ok(typeof ve.ok === 'boolean' && Array.isArray(ve.errors), `${P}: validateEdits devolvio una forma invalida`)
      ok(validateEdits(edits).errors.length <= ve.errors.length, `${P}: validar SIN storyboard reporto mas errores que con storyboard`)
      ok(contarEdits(edits) >= 0, `${P}: contarEdits negativo`)
    }
  }
}

// el contador de la UI tiene que contar propiedades, no objetos
{
  const e = emptyEdits()
  e.escenas.a = { dur: 2 }
  e.capas['a:b'] = { text: 'x', color: 'ink' }
  e.look.accent = '#ff0000'
  e.orden = ['a']
  ok(contarEdits(e) === 5, `contarEdits deberia dar 5 y dio ${contarEdits(e)}`)
  ok(EDITS_V === 1, 'EDITS_V cambio sin bump del contrato')
  ok(applyEdits(null, e) === null, 'applyEdits con storyboard nulo deberia devolverlo tal cual')
}

if (fails) { console.error(`\nGATE EDIT FALLO (${fails} casos).`); process.exit(1) }
console.log(`GATE EDIT OK (${Object.keys(ARQ).length} paginas x ${SEEDS} seeds x ${SETS.length} sets = ${nCasos} overlays / ${nEsc} escenas editadas / ${nFrames} frames renderizados: determinismo, pureza, contrato, 1 foco, tiempos, ${nVacias} anti-vacio reportados, ${nRecortes} textos recortados por caja, re-teñido legible y orden a prueba de basura).`)
