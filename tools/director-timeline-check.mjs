// GATE director-timeline — audita el VIDEO, no las laminas. Compila la timeline de cada caso y la
// recorre frame a frame midiendo pixeles reales.
//
//   1. contrato       validateTimeline + un solo track por (capa, prop) + keys dentro de la vida
//   2. E-DET          compilar dos veces da el MISMO json byte a byte
//   3. E-SEEK         saltar a t da el mismo pixel que llegar reproduciendo (scrub que no miente)
//   4. E-EMPTY-FRAME  ningun frame del video se queda en (casi) solo fondo  <- el defecto que mas se ve
//   5. E-DEADAIR      ninguna ventana larga con la imagen congelada (el "beat de una palabra 4s")
//   6. E-OBJ-JUMP     ninguna capa visible teletransporta entre frames contiguos
//   7. E-TL-LIFE      ninguna capa vive menos que un parpadeo (salvo el flash, que es 5 frames a proposito)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, validateTimeline, formatErrors, CANVAS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook } from '../src/director/kit/look.js'
import { compile, propsAt } from '../src/director/core/timeline.js'
import { drawFrame } from '../src/director/render/video.js'
import { corpusHero } from '../src/director/render/draw.js'
import { drawPlaca } from '../src/director/render/plate.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

let fails = 0
const die = m => { if (fails < 20) console.error('FAIL  ' + m); fails++ }
const ok = (c, m) => { if (!c) die(m) }

const ARQ = {
  saas: { brand: 'Urvid', url: 'https://urvid.app/', dna: { palette: { accent: '#6366f1' }, modernidad: ['bigtype', 'bento'], mood: { energia: 0.7 } }, semantica: { queHace: 'Convertí cualquier link en un reel listo para publicar', comoFunciona: ['Pegás el link de tu página', 'La IA analiza y escribe el guion', 'Descargás el video en 9:16'], tipoNegocio: 'saas', modeloUso: 'suscripcion', features: [{ titulo: 'Análisis automático' }, { titulo: 'Video en 30 segundos' }, { titulo: 'Sin editar nada' }, { titulo: 'Formato vertical' }], pruebas: { stats: [{ valor: '30s', etiqueta: 'por video' }], testimonios: [{ texto: 'Pasamos de tardar un día a tener el reel en un café', firma: 'Marina' }], logosClientes: true }, cta: 'Probalo gratis' } },
  resto: { brand: 'La Parrilla de Don Julio', url: 'https://parrilla.com.ar/', dna: { palette: { accent: '#e0762a' }, mood: { energia: 0.4, calidez: 0.8 } }, semantica: { queHace: 'La parrilla que todo el barrio recomienda desde 1987', tipoNegocio: 'servicio-local', modeloUso: 'reserva', features: [{ titulo: 'Cortes premium' }, { titulo: 'Vinos de autor' }, { titulo: 'Patio al aire libre' }], pruebas: { stats: [{ valor: '4.9', etiqueta: 'en reseñas de Google' }] }, cta: 'Reservá tu mesa' } },
  evento: { brand: 'Vértigo', url: 'https://vertigo.club/', dna: { palette: { accent: '#e11d74' }, modernidad: ['brutalist'], mood: { energia: 0.95 } }, semantica: { queHace: 'Line up internacional todos los sábados', tipoNegocio: 'evento', modeloUso: 'compra', features: [{ titulo: 'Barra premium' }, { titulo: 'Sonido Funktion-One' }], oferta: { urgencia: 'Últimas entradas' }, pruebas: { stats: [{ valor: '2500', etiqueta: 'personas por noche' }] }, cta: 'Conseguí tu entrada' } },
  pobre: { brand: 'Kiosco', url: 'https://kiosco.com/' },
}
const FIXDIR = join(HERE, 'fixtures', 'director')
if (existsSync(FIXDIR)) for (const f of readdirSync(FIXDIR).filter(x => x.endsWith('.json'))) {
  try { ARQ['fix:' + f.replace('.json', '')] = JSON.parse(readFileSync(join(FIXDIR, f), 'utf-8')) } catch {}
}
const SEEDS = 3
const PASO = 3                                          // 1 de cada 3 frames = 10fps de muestreo

const ESC = 0.5, W = Math.round(CANVAS.W * ESC), H = Math.round(CANVAS.H * ESC)
const makeCanvas = (w, h) => createCanvas(w, h)
const cvA = createCanvas(W, H), ctxA = cvA.getContext('2d')

function pinta(tl, t, brand) {
  drawFrame(ctxA, tl, t, { W, H, makeCanvas, brand, images: new Map() })
  return ctxA.getImageData(0, 0, W, H).data
}
const hash = d => { let h = 2166136261 >>> 0; for (let i = 0; i < d.length; i += 61) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0 } return h }

let nFrames = 0, nVid = 0
for (const [nombre, raw] of Object.entries(ARQ)) {
  const pm = normalizePageModel(raw)
  for (let s = 1; s <= SEEDS; s++) {
    const seed = (s * 3266489917) >>> 0
    const sb = composeStoryboard(pm, buildGuion(pm, seed), deriveLook(pm, seed), seed)
    const tl = compile(sb, seed)
    nVid++
    const P = `${nombre}#${s}`

    // 1. contrato
    const v = validateTimeline(tl)
    ok(v.ok, `${P}: timeline invalida\n${v.ok ? '' : formatErrors(v.errors)}`)
    const vistos = new Set()
    for (const tr of tl.tracks) {
      const k = tr.layer + '|' + tr.prop
      ok(!vistos.has(k), `${P}: dos tracks para ${k} (el editor mostraria dos curvas del mismo prop)`)
      vistos.add(k)
      const capa = tl.layers.find(l => l.id === tr.layer)
      if (capa) for (const key of tr.keys) {
        ok(key.t >= capa.life[0] - 0.06 && key.t <= capa.life[1] + 0.06,
          `${P}: key en ${key.t}s de ${k} fuera de la vida [${capa.life}] (key muerta)`)
      }
    }
    // 7. vidas minimas (el flash dura 0.16s a proposito)
    for (const l of tl.layers) {
      const d = l.life[1] - l.life[0]
      ok(d >= (l.id.startsWith('flash:') ? 0.1 : 0.3) - 1e-6, `${P}: capa ${l.id} vive ${d.toFixed(2)}s (parpadeo)`)
    }

    // 2. determinismo
    const tl2 = compile(composeStoryboard(pm, buildGuion(pm, seed), deriveLook(pm, seed), seed), seed)
    ok(JSON.stringify(tl) === JSON.stringify(tl2), `${P}: la timeline NO es determinista`)

    // fondo de referencia para medir tinta
    const cb = createCanvas(W, H), cbx = cb.getContext('2d')
    drawPlaca(cbx, tl.look, W, H, {})
    const fondo = cbx.getImageData(0, 0, W, H).data

    // 3/4/5/6 — recorrido frame a frame
    const total = Math.round(tl.dur * tl.fps)
    let prevHash = null, prevProps = null, congelados = 0, peorTinta = 1, tPeor = 0
    for (let i = 0; i < total; i += PASO) {
      const t = Math.min(tl.dur, (i + 0.5) / tl.fps)
      const d = pinta(tl, t, pm.brand)
      nFrames++

      // 4. E-EMPTY-FRAME
      let n = 0
      for (let j = 0; j < d.length; j += 4) {
        if (Math.abs(d[j] - fondo[j]) + Math.abs(d[j + 1] - fondo[j + 1]) + Math.abs(d[j + 2] - fondo[j + 2]) > 24) n++
      }
      const frac = n / (W * H)
      if (frac < peorTinta) { peorTinta = frac; tPeor = t }

      // 5. E-DEADAIR: frames identicos consecutivos
      const h = hash(d)
      if (prevHash === h) congelados++
      else congelados = 0
      // la ultima placa sostenida es un recurso de cierre valido (el espectador lee la marca y el CTA);
      // el aire muerto que importa es el del MEDIO del video, donde la pieza se cae.
      const limite = t > tl.dur - 2.6 ? 3.0 : 2.0
      ok(congelados * PASO / tl.fps < limite, `${P}: imagen congelada ${(congelados * PASO / tl.fps).toFixed(1)}s en t=${t.toFixed(2)}s`)
      prevHash = h

      prevProps = null
    }
    ok(peorTinta > 0.008, `${P}: frame casi vacio (${(peorTinta * 100).toFixed(2)}% de tinta en t=${tPeor.toFixed(2)}s)`)

    // 6. E-OBJ-JUMP — sobre frames REALMENTE contiguos (1/fps). Muestreando 1 de cada 3 no se puede
    // distinguir un teletransporte de un spring rapido, y el umbral quedaba mintiendo en los dos
    // sentidos. propsAt no dibuja, asi que recorrer todos los frames sale gratis.
    let ant = null
    for (let i = 0; i <= total; i++) {
      const t = Math.min(tl.dur, i / tl.fps)
      const pr = propsAt(tl, t)
      if (ant) for (const [id, p] of pr) {
        const q = ant.get(id)
        if (!q || p.alpha < 0.5 || q.alpha < 0.5) continue
        const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y), ds = Math.abs(p.scale - q.scale)
        ok(dx < 0.10 && dy < 0.10 && ds < 0.14,
          `${P}: ${id} teletransporta en t=${t.toFixed(2)}s (dx ${dx.toFixed(3)} dy ${dy.toFixed(3)} ds ${ds.toFixed(3)})`)
      }
      ant = pr
    }

    // 3. E-SEEK — el mismo t desde cero y despues de saltar por todos lados da el MISMO pixel
    const tm = tl.dur * 0.5
    const h1 = hash(pinta(tl, tm, pm.brand))
    pinta(tl, tl.dur * 0.9, pm.brand); pinta(tl, 0.2, pm.brand); pinta(tl, tl.dur * 0.33, pm.brand)
    const h2 = hash(pinta(tl, tm, pm.brand))
    ok(h1 === h2, `${P}: NO es seek-safe (el frame en ${tm.toFixed(2)}s cambia segun por donde se paso)`)
  }
}

if (fails) { console.error(`\nGATE TIMELINE FALLO (${fails} casos).`); process.exit(1) }
console.log(`GATE TIMELINE OK (${Object.keys(ARQ).length} paginas x ${SEEDS} seeds = ${nVid} videos / ${nFrames} frames medidos: contrato, determinismo, seek-safe, cero frame vacio, cero aire muerto, cero salto de capa).`)
