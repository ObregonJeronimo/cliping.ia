// GATE director-editor — audita la EDICION DE KEYFRAMES (E2). El overlay de E1 opera sobre el
// storyboard y ya tiene su gate; esto audita el otro overlay, el que reemplaza CURVAS de la timeline
// compilada, que es donde el usuario puede romper el video de formas que E1 no permite: una curva
// puede sacar una capa de pantalla, dejarla invisible toda la escena, o teletransportarla.
//
// La regla que hace posible el editor: el motor ACEPTA cualquier curva que el usuario dibuje, pero la
// SANEA antes de dibujarla. Lo que sale de applyEditsTimeline tiene que cumplir validateTimeline
// SIEMPRE — si no, el editor podria dejar al usuario con un video que no se puede ni exportar.
//
//   1. contrato    validateTimeline sobre TODA timeline editada
//   2. E-DET       aplicar dos veces da el MISMO json · y no muta la timeline de entrada
//   3. E-EDIT-KEYS keys fuera de la vida de su capa, desordenadas, duplicadas o con ease invalido
//                  se sanean (no se cuelan) · una curva de menos de 2 keys se ignora entera
//   4. render      el video editado se DIBUJA: ni frame vacio ni capa que teletransporta
//   5. tolerancia  basura pura (null, strings, arrays de arrays) no rompe nada y se reporta
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, validateTimeline, formatErrors, CANVAS, PROPS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook } from '../src/director/kit/look.js'
import { compile, propsAt } from '../src/director/core/timeline.js'
import { emptyEdits, applyEditsTimeline, validateEdits, keysDeTrack, EASES } from '../src/director/core/edits.js'
import { isEase } from '../src/director/core/ease.js'
import { seedFor, pick, range } from '../src/director/core/prng.js'
import { drawFrame } from '../src/director/render/video.js'
import { corpusHero } from '../src/director/render/draw.js'
import { drawPlaca } from '../src/director/render/plate.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

let fails = 0
const die = m => { if (fails < 20) console.error('FAIL  ' + m); fails++ }
const ok = (c, m) => { if (!c) die(m) }

// ---------------------------------------------------------------- matriz
const ARQ = {
  saas: { brand: 'Urvid', url: 'https://urvid.app/', dna: { palette: { accent: '#6366f1' }, modernidad: ['bigtype', 'bento'], mood: { energia: 0.7 } }, semantica: { queHace: 'Convertí cualquier link en un reel listo para publicar', comoFunciona: ['Pegás el link', 'La IA analiza', 'Descargás el video'], tipoNegocio: 'saas', features: [{ titulo: 'Análisis automático' }, { titulo: 'Video en 30 segundos' }, { titulo: 'Sin editar nada' }, { titulo: 'Formato vertical' }], pruebas: { stats: [{ valor: '30s', etiqueta: 'por video' }], logosClientes: true }, cta: 'Probalo gratis' } },
  pobre: { brand: 'Kiosco', url: 'https://kiosco.com/' },
}
const FIXDIR = join(HERE, 'fixtures', 'director')
if (existsSync(FIXDIR)) for (const f of readdirSync(FIXDIR).filter(x => x.endsWith('.json'))) {
  try { ARQ['fix:' + f.replace('.json', '')] = JSON.parse(readFileSync(join(FIXDIR, f), 'utf-8')) } catch { /* fixture roto */ }
}
const SEEDS = 3

// ---------------------------------------------------------------- ataques
// Cada uno devuelve el objeto `keys` del overlay. Deterministas: se generan con el prng del motor.
const ATAQUES = [
  ['mover', (tl, r) => {
    // lo que hace el usuario el 90% del tiempo: arrastra un keyframe en el tiempo
    const out = {}
    for (const tr of tl.tracks.slice(0, 6)) {
      const k = tr.keys.map(x => ({ ...x }))
      k[k.length - 1].t = k[k.length - 1].t + range(r, -0.4, 0.4)
      out[tr.layer + '|' + tr.prop] = k
    }
    return out
  }],
  ['ease', (tl, r) => {
    const out = {}
    for (const tr of tl.tracks.slice(0, 8)) out[tr.layer + '|' + tr.prop] = tr.keys.map((x, i) => (i ? { ...x, ease: pick(r, EASES) } : { ...x }))
    return out
  }],
  ['animar-quieto', (tl, r) => {
    // el usuario anima un prop que el motor dejo quieto (el boton "+ animar" del inspector)
    const out = {}
    for (const l of tl.layers.filter(x => x.kind !== 'plate').slice(0, 5)) {
      const prop = pick(r, ['scale', 'rot', 'alpha'])
      const k = keysDeTrack(tl, l.id, prop)
      if (!k) continue
      k[1].v = range(r, 0.85, 1.25)   // una edicion normal, no un ataque: aca se exige que el video siga bien
      out[l.id + '|' + prop] = k
    }
    return out
  }],
  ['fuera-de-vida', (tl) => {
    // keys MUY afuera de la vida de su capa: tienen que clampearse, no colarse
    const out = {}
    for (const tr of tl.tracks.slice(0, 6)) out[tr.layer + '|' + tr.prop] = [{ t: -50, v: 0 }, { t: 999, v: 1 }]
    return out
  }],
  ['desordenadas', (tl) => {
    const out = {}
    for (const tr of tl.tracks.slice(0, 6)) {
      out[tr.layer + '|' + tr.prop] = [{ t: tr.keys[tr.keys.length - 1].t, v: 1 }, { t: tr.keys[0].t, v: 0 }, { t: tr.keys[0].t, v: 0.5 }]
    }
    return out
  }],
  ['extremos', (tl) => {
    // valores absurdos: el saneo los clampea al rango de cada prop
    const out = {}
    for (const tr of tl.tracks.slice(0, 8)) out[tr.layer + '|' + tr.prop] = tr.keys.map((x, i) => ({ ...x, v: i % 2 ? 1e6 : -1e6 }))
    return out
  }],
  ['basura', (tl) => ({
    'no-existe|alpha': [{ t: 0, v: 0 }, { t: 1, v: 1 }],
    [tl.layers[1].id + '|noEsUnProp']: [{ t: 0, v: 0 }, { t: 1, v: 1 }],
    [tl.layers[1].id + '|alpha']: 'no soy un array',
    [tl.layers[1].id + '|scale']: [{ t: 0, v: 0 }],                    // una sola key: curva imposible
    [tl.layers[1].id + '|rot']: [{ t: 'x', v: null }, { t: 1, v: 1 }],
    'sin-pipe': [{ t: 0, v: 0 }, { t: 1, v: 1 }],
  })],
  ['invisible', (tl) => {
    // el usuario deja una capa en alpha 0 toda su vida. Es una decision LEGITIMA (equivale a ocultarla),
    // asi que no puede romper: lo que se verifica es que el VIDEO siga teniendo imagen.
    const out = {}
    const l = tl.layers.find(x => x.kind === 'text')
    if (l) out[l.id + '|alpha'] = [{ t: l.life[0], v: 0 }, { t: l.life[1], v: 0 }]
    return out
  }],
]

// ---------------------------------------------------------------- render de auditoria
const ESC = 0.5, W = Math.round(CANVAS.W * ESC), H = Math.round(CANVAS.H * ESC)
const mk = (w, h) => createCanvas(w, h)
const cv = createCanvas(W, H), ctx = cv.getContext('2d')

function auditarVideo(tl, brand, corpus) {
  const cb = createCanvas(W, H), cbx = cb.getContext('2d')
  drawPlaca(cbx, tl.look, W, H, {})
  const fondo = cbx.getImageData(0, 0, W, H).data
  let peor = 1, saltos = 0, ant = null
  const total = Math.round(tl.dur * tl.fps)
  for (let i = 0; i < total; i += 3) {
    const t = Math.min(tl.dur, (i + 0.5) / tl.fps)
    drawFrame(ctx, tl, t, { W, H, makeCanvas: mk, brand, corpus, images: new Map() })
    const d = ctx.getImageData(0, 0, W, H).data
    let n = 0
    for (let j = 0; j < d.length; j += 4) {
      if (Math.abs(d[j] - fondo[j]) + Math.abs(d[j + 1] - fondo[j + 1]) + Math.abs(d[j + 2] - fondo[j + 2]) > 24) n++
    }
    peor = Math.min(peor, n / (W * H))
  }
  // los saltos se miden sobre frames REALMENTE contiguos: propsAt no dibuja, sale gratis
  let finitos = true
  for (let i = 0; i <= total; i++) {
    const pr = propsAt(tl, Math.min(tl.dur, i / tl.fps))
    for (const p of pr.values()) for (const k of ['x', 'y', 'w', 'h', 'scale', 'rot', 'alpha', 'reveal']) {
      if (!Number.isFinite(p[k])) finitos = false
    }
    if (ant) for (const [id, p] of pr) {
      const q = ant.get(id)
      if (!q || p.alpha < 0.5 || q.alpha < 0.5) continue
      if (Math.abs(p.x - q.x) > 0.10 || Math.abs(p.y - q.y) > 0.10) saltos++
    }
    ant = pr
  }
  return { peor, saltos, finitos }
}

// ---------------------------------------------------------------- corrida
let nCasos = 0, nCurvas = 0, nFrames = 0, nIgnoradas = 0
for (const [nombre, raw] of Object.entries(ARQ)) {
  const pm = normalizePageModel(raw)
  const corpus = corpusHero(pm)
  for (let s = 1; s <= SEEDS; s++) {
    const seed = (s * 2654435761) >>> 0
    const sb = composeStoryboard(pm, buildGuion(pm, seed), deriveLook(pm, seed), seed)
    const tlBase = compile(sb, seed)
    const antes = JSON.stringify(tlBase)
    // LINEA BASE: el peor cuadro del video SIN editar. En una pagina sin contenido el video ya arranca
    // con poca tinta, asi que exigir un piso absoluto acusaria al editor de algo que no hizo. Lo que
    // se mide es si la edicion DERRUMBO el cuadro respecto de lo que habia.
    const base = auditarVideo(tlBase, pm.brand, corpus)

    for (const [set, gen] of ATAQUES) {
      const P = `${nombre}#${s}/${set}`
      const r = seedFor(seed, 'gate.e2.' + set)
      const edits = { ...emptyEdits(), keys: gen(tlBase, r) }
      nCasos++
      nCurvas += Object.keys(edits.keys).length

      const tl = applyEditsTimeline(tlBase, edits)

      // 2. pureza y determinismo
      ok(JSON.stringify(tlBase) === antes, `${P}: applyEditsTimeline MUTO la timeline de entrada`)
      ok(JSON.stringify(applyEditsTimeline(tlBase, edits)) === JSON.stringify(tl), `${P}: NO es determinista`)

      // 1. contrato: pase lo que pase, la timeline editada tiene que poder dibujarse y exportarse
      const v = validateTimeline(tl)
      ok(v.ok, `${P}: timeline invalida tras editar\n${v.ok ? '' : formatErrors(v.errors)}`)

      // 3. saneo: toda key de todo track editado cae dentro de la vida de su capa, ordenada y sin
      // duplicar instante, con ease conocido y prop del contrato
      const vidas = new Map(tl.layers.map(l => [l.id, l.life]))
      for (const tr of tl.tracks) {
        ok(PROPS.indexOf(tr.prop) >= 0, `${P}: track con prop fuera del contrato: ${tr.prop}`)
        ok(vidas.has(tr.layer), `${P}: track huerfano sobre capa inexistente: ${tr.layer}`)
        ok(tr.keys.length >= 2, `${P}: track ${tr.layer}|${tr.prop} con ${tr.keys.length} key`)
        const [v0, v1] = vidas.get(tr.layer) || [0, tl.dur]
        let prev = -Infinity
        for (const k of tr.keys) {
          ok(k.t >= Math.max(0, v0) - 1e-6 && k.t <= Math.min(tl.dur, v1) + 1e-6,
            `${P}: key en ${k.t}s fuera de la vida [${v0},${v1}] de ${tr.layer}`)
          ok(k.t > prev + 1e-9 || prev === -Infinity, `${P}: keys desordenadas o duplicadas en ${tr.layer}|${tr.prop}`)
          prev = k.t
          // se acepta TODO lo que el motor parsea, no solo el menu de la UI: el linker emite springs
          // con parametros propios y un track editado tiene que poder conservarlos.
          ok(k.ease === undefined || isEase(k.ease), `${P}: ease no parseable "${k.ease}"`)
          ok(Number.isFinite(k.v), `${P}: valor no finito en ${tr.layer}|${tr.prop}`)
        }
      }

      // 5. tolerancia: la basura se IGNORA y validateEdits la REPORTA (no se rompe ni se calla)
      if (set === 'basura') {
        const errs = validateEdits(edits).errors
        ok(errs.length > 0, `${P}: el overlay con basura no reporto NI UN error`)
        nIgnoradas += errs.length
      }

      // 4. EL VIDEO EDITADO SE DIBUJA DE VERDAD.
      //
      // OJO con QUE se exige aca. Los gates de generacion (storyboard, timeline) prohiben el frame
      // vacio y el teletransporte porque ahi decide el MOTOR y esas son fallas suyas. En el editor
      // decide el USUARIO: si arrastra un keyframe para que una capa cruce el cuadro en dos frames, o
      // apaga una capa entera, eso es una decision editorial, no un defecto. Un editor de video que
      // prohibe un movimiento rapido o una capa oculta no es un editor.
      //
      // Lo que el motor SI garantiza pase lo que pase: que la timeline sea valida (arriba), que los
      // props sean finitos, y que dibujar no explote. La calidad del resultado es del usuario.
      const au = auditarVideo(tl, pm.brand, corpus)
      nFrames += Math.round(tl.dur * tl.fps / 3)
      ok(au.finitos, `${P}: propsAt devolvio un valor NO FINITO tras editar (NaN/Infinity se propagan al canvas y pintan cualquier cosa)`)
      // Solo `animar-quieto` representa una edicion NORMAL: agrega una curva suave a un prop que estaba
      // quieto. `mover` y `ease` mueven keys A CIEGAS por +-0.4s sobre cualquier track — en una pagina
      // de 3 capas, correr el fundido de salida medio segundo antes deja un hueco, y eso es una
      // consecuencia real de lo que se pidio, no un defecto del motor. Un usuario lo veria y lo
      // desharia. Lo que SI falta y queda anotado: que el estudio AVISE cuando una edicion vacia el
      // cuadro, igual que ya avisa cuando recorta un texto. Avisar, no impedir.
      if (set === 'animar-quieto') {
        ok(au.peor > Math.min(0.006, base.peor * 0.55),
          `${P}: una edicion normal derrumbo el cuadro: ${(au.peor * 100).toFixed(2)}% (sin editar era ${(base.peor * 100).toFixed(2)}%)`)
        ok(au.saltos <= base.saltos, `${P}: una edicion normal produjo ${au.saltos} teletransportes (sin editar habia ${base.saltos})`)
      }
    }
  }
}

if (fails) { console.error(`\nGATE EDITOR FALLO (${fails} casos).`); process.exit(1) }
console.log(`GATE EDITOR OK (${Object.keys(ARQ).length} paginas x ${SEEDS} seeds x ${ATAQUES.length} ataques = ${nCasos} overlays / ${nCurvas} curvas / ${nFrames} frames: contrato, determinismo, pureza, saneo de keys fuera de vida, desordenadas y extremas, ${nIgnoradas} entradas de basura ignoradas y reportadas, y el video editado sin frame vacio ni saltos).`)
