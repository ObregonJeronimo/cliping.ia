// GATE quality-budget (item L717): el "presupuesto adaptativo de draws" escala el conteo de particulas de los substrates
// pesados (grano/fibra/polvo: cientos-miles de fillRect por frame) por env.quality. Tres invariantes:
//   (A) DEFAULT = FULL: drawFrame SIN opts === drawFrame({quality:1}) -> BYTE-IDENTICO. Asi el export (exportVideo.js, sin
//       opts), los gates y cualquier caller viejo renderizan EXACTO como antes (Math.round(N*1)=N en los 11 modulos).
//   (B) EL PRESUPUESTO ACTUA: quality<1 produce MENOS draws -> frame DISTINTO (no vacio) -> el preview realmente aligera.
//   (C) DETERMINISTA a cualquier quality (mismo q -> mismo frame).
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'
import { W, H } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fonts opcionales para este gate */ }
setScratchFactory((w, h) => createCanvas(w, h))   // buffer offscreen (browser usa OffscreenCanvas; en Node lo inyectamos)

let fails = 0
const die = (m) => { console.error('FAIL  ' + m); fails++ }

// video con un substrate PESADO forzado (sub.grain.film = 1400 particulas) para que el quality tenga efecto MEDIBLE en pixeles.
const brief = { brand: 'Acme', rubro: 'tech', tone: 'dark', brandColor: '#5b8cff', content: { tagline: 'Automatiza lo aburrido', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis' }, lockRecipe: { sub: 'sub.grain.film' } }
const video = makeVideo(brief)
if (video.subId !== 'sub.grain.film') die(`no se pudo forzar el substrate pesado (subId=${video.subId}) -> el gate no probaria nada`)

const buf = (t, opts) => { const cv = createCanvas(W, H), ctx = cv.getContext('2d'); drawFrame(ctx, t, video, opts); return cv.toBuffer('image/png') }
const T = 2.0

// (A) DEFAULT = FULL: sin opts === {quality:1} -> byte-identico (el export/gates no cambian).
const dflt = buf(T, undefined), full = buf(T, { quality: 1 })
if (!dflt.equals(full)) die('drawFrame SIN opts NO es identico a {quality:1} (el default deberia ser full)')

// (B) EL PRESUPUESTO ACTUA: quality<1 cambia el frame (menos particulas) sin romperlo (no vacio).
const half = buf(T, { quality: 0.5 }), low = buf(T, { quality: 0.2 })
if (dflt.equals(half)) die('{quality:0.5} NO cambio el frame (el presupuesto no esta reduciendo draws)')
if (dflt.equals(low)) die('{quality:0.2} NO cambio el frame')
if (!half.length || !low.length) die('un frame de baja calidad salio vacio')

// (C) DETERMINISTA a cualquier quality (mismo q -> mismo frame).
if (!buf(T, { quality: 0.5 }).equals(half)) die('quality 0.5 no es determinista (mismo q -> frame distinto)')

if (fails) { console.error(`\nGATE QUALITY FALLO (${fails} casos).`); process.exit(1) }
console.log('GATE QUALITY OK (default=full byte-identico; quality<1 reduce draws de forma determinista -> el preview aligera sin tocar el export).')
