// director-loop.mjs — REPORTE DE CALIDAD del motor Director (F4 de docs/MOTOR-DIRECTOR.md).
//
// Los gates responden SI o NO: "¿hay un texto cortado?", "¿hay un frame vacio?". Son binarios y
// por eso no pueden ver el problema que mas caro sale en un motor generativo: la MONOTONIA. Un video
// puede pasar los 22 gates y aun asi ser indistinguible del anterior.
//
// Esto mide DISTRIBUCIONES sobre toda la matriz y escribe un reporte versionado en
// docs/director/LOOP-REPORT.md. Como esta commiteado, `git diff` sobre ese archivo muestra en una
// pantalla que le hizo un cambio del motor a la variedad de la salida — que es exactamente la
// pregunta que ningun assert contesta.
//
// Uso:  node tools/director-loop.mjs            -> escribe el reporte y lo imprime
//       node tools/director-loop.mjs 25         -> con 25 seeds por pagina (default 15)
//
// OJO con el destino: el reporte NO va a tools/out/ (esta gitignoreado, es salida descartable). Todo
// su valor es que este VERSIONADO, asi que vive en docs/director/ junto a las otras docs del motor.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, validateStoryboard, validateTimeline, CANVAS } from '../src/director/core/schema.js'
import { buildGuion, ESCENAS } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook, PLACAS } from '../src/director/kit/look.js'
import { compile } from '../src/director/core/timeline.js'
import { RECETAS } from '../src/director/core/linker.js'
import { drawFrame } from '../src/director/render/video.js'
import { corpusHero } from '../src/director/render/draw.js'
import { drawPlaca } from '../src/director/render/plate.js'
// Los pixeles se leen con este helper y no con getImageData: la version nativa de
// @napi-rs/canvas no libera nunca su buffer y un gate de miles de frames se come
// decenas de GB. Ver tools/lib/pixeles.mjs.
import { pixeles } from './lib/pixeles.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'docs', 'director')   // versionado: el reporte se diffea, no se descarta
mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

// ---------------------------------------------------------------- matriz
// Los mismos arquetipos que los gates + los pagemodels REALES de fixtures. Cambiar esta matriz cambia
// el reporte, asi que se toca lo menos posible: su valor es que las cifras sean comparables en el tiempo.
const ARQ = {
  saas: { brand: 'Urvid', url: 'https://urvid.app/', dna: { palette: { accent: '#6366f1' }, modernidad: ['bigtype', 'bento'], mood: { energia: 0.7 } }, semantica: { queHace: 'Convertí cualquier link en un reel listo para publicar', comoFunciona: ['Pegás el link de tu página', 'La IA analiza y escribe el guion', 'Descargás el video en 9:16'], tipoNegocio: 'saas', modeloUso: 'suscripcion', features: [{ titulo: 'Análisis automático' }, { titulo: 'Video en 30 segundos' }, { titulo: 'Sin editar nada' }, { titulo: 'Formato vertical' }], pruebas: { stats: [{ valor: '30s', etiqueta: 'por video' }], testimonios: [{ texto: 'Pasamos de tardar un día a tener el reel en un café', firma: 'Marina' }], logosClientes: true }, cta: 'Probalo gratis' } },
  resto: { brand: 'La Parrilla de Don Julio', url: 'https://parrilla.com.ar/', dna: { palette: { accent: '#e0762a' }, mood: { energia: 0.4, calidez: 0.8 } }, semantica: { queHace: 'La parrilla que todo el barrio recomienda desde 1987', tipoNegocio: 'servicio-local', modeloUso: 'reserva', features: [{ titulo: 'Cortes premium' }, { titulo: 'Vinos de autor' }, { titulo: 'Patio al aire libre' }], pruebas: { stats: [{ valor: '4.9', etiqueta: 'en reseñas de Google' }] }, cta: 'Reservá tu mesa' } },
  tienda: { brand: 'Atelier', url: 'https://atelier.store/', dna: { palette: { accent: '#b45309' }, modernidad: ['editorial-photo'] }, semantica: { queHace: 'Prendas de confección local en series cortas', tipoNegocio: 'ecommerce', modeloUso: 'compra', features: [{ titulo: 'Algodón orgánico' }, { titulo: 'Series de 30' }], oferta: { promo: '20% en la primera compra', urgencia: 'Solo esta semana', precio: '$39.900' }, pruebas: { testimonios: [{ texto: 'La calidad se nota apenas la tocás', firma: 'Ana' }] }, cta: 'Ver colección' }, assets: { images: [{ url: 'https://x/p.jpg', kind: 'producto' }] } },
  evento: { brand: 'Vértigo', url: 'https://vertigo.club/', dna: { palette: { accent: '#e11d74' }, modernidad: ['brutalist'], mood: { energia: 0.95 } }, semantica: { queHace: 'Line up internacional todos los sábados', tipoNegocio: 'evento', modeloUso: 'compra', features: [{ titulo: 'Barra premium' }, { titulo: 'Sonido Funktion-One' }], oferta: { urgencia: 'Últimas entradas' }, pruebas: { stats: [{ valor: '2500', etiqueta: 'personas por noche' }] }, cta: 'Conseguí tu entrada' } },
  educacion: { brand: 'Aula', url: 'https://aula.edu.ar/', dna: { palette: { accent: '#8b5cf6' } }, semantica: { queHace: 'Cursos cortos que sí terminás', comoFunciona: ['Elegís el curso', 'Cursás en vivo', 'Entregás el proyecto'], tipoNegocio: 'educacion', modeloUso: 'registro', features: [{ titulo: 'Clases en vivo' }, { titulo: 'Proyectos reales' }, { titulo: 'Certificado' }], pruebas: { stats: [{ valor: '+15k', etiqueta: 'egresados' }], testimonios: [{ texto: 'Cambió mi carrera', firma: 'Leo' }] }, cta: 'Empezá gratis' } },
  pobre: { brand: 'Kiosco', url: 'https://kiosco.com/' },
}
const FIXDIR = join(HERE, 'fixtures', 'director')
if (existsSync(FIXDIR)) for (const f of readdirSync(FIXDIR).filter(x => x.endsWith('.json'))) {
  try { ARQ['fix:' + f.replace('.json', '')] = JSON.parse(readFileSync(join(FIXDIR, f), 'utf-8')) } catch { /* fixture roto: se ignora */ }
}
const SEEDS = Math.max(3, Number(process.argv[2]) || 15)

// ---------------------------------------------------------------- utilidades
const ESC = 0.5, W = Math.round(CANVAS.W * ESC), H = Math.round(CANVAS.H * ESC)
const mk = (w, h) => createCanvas(w, h)
const cv = createCanvas(W, H), ctx = cv.getContext('2d')
const inc = (m, k) => m.set(k, (m.get(k) || 0) + 1)
const pct = (n, d) => (d ? (n / d * 100).toFixed(0) : '0') + '%'
const tabla = (m, total) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n} (${pct(n, total)})`).join(' · ')

// ---------------------------------------------------------------- recorrida
const recetas = new Map(), placas = new Map(), fuentes = new Map(), objetos = new Map()
const escenasUso = new Map(), aligns = new Map(), gramaticas = new Map(), cierres = new Map()
const durs = [], nEscenas = [], tintas = []
let nVid = 0, nEsc = 0, todoCentrado = 0, invalidos = 0
const porPagina = new Map()

for (const [nombre, raw] of Object.entries(ARQ)) {
  const pm = normalizePageModel(raw)
  const corpus = corpusHero(pm)
  const vistoPlaca = new Set(), vistoEstructura = new Set(), vistoFuente = new Set()
  for (let s = 1; s <= SEEDS; s++) {
    const seed = (s * 2654435761) >>> 0
    const look = deriveLook(pm, seed)
    const guion = buildGuion(pm, seed)
    const sb = composeStoryboard(pm, guion, look, seed)
    const tl = compile(sb, seed)
    nVid++
    if (!validateStoryboard(sb).ok || !validateTimeline(tl).ok) invalidos++

    inc(gramaticas, guion.gramatica)
    inc(placas, look.placa)
    inc(fuentes, look.fonts.display)
    for (const o of sb.rubro) inc(objetos, o)
    for (const l of tl.links) inc(recetas, l)
    if (tl.links.length) inc(cierres, tl.links[tl.links.length - 1])
    durs.push(tl.dur); nEscenas.push(sb.scenes.length)
    vistoPlaca.add(look.placa); vistoFuente.add(look.fonts.display)
    vistoEstructura.add(sb.scenes.map(x => x.escena).join('>'))

    let centrado = true
    for (const sc of sb.scenes) {
      nEsc++
      inc(escenasUso, sc.escena)
      const foc = sc.layers.find(l => l.focal)
      const al = (foc && foc.align) || 'center'
      inc(aligns, al)
      if (al !== 'center') centrado = false
    }
    if (centrado) todoCentrado++

    // TINTA MINIMA del video: el peor cuadro es el que define si la pieza se ve rota. Se muestrea
    // (1 de cada 4 frames) porque el reporte tiene que correr en segundos, no en minutos.
    const cb = createCanvas(W, H), cbx = cb.getContext('2d')
    drawPlaca(cbx, look, W, H, {})
    const fondo = pixeles(cbx)
    let peor = 1
    for (let i = 0; i < Math.round(tl.dur * tl.fps); i += 4) {
      drawFrame(ctx, tl, Math.min(tl.dur, (i + 0.5) / tl.fps), { W, H, makeCanvas: mk, brand: pm.brand, corpus, images: new Map() })
      const d = pixeles(ctx)
      let n = 0
      for (let j = 0; j < d.length; j += 4) {
        if (Math.abs(d[j] - fondo[j]) + Math.abs(d[j + 1] - fondo[j + 1]) + Math.abs(d[j + 2] - fondo[j + 2]) > 24) n++
      }
      peor = Math.min(peor, n / (W * H))
    }
    tintas.push(peor)
  }
  // TECHO DE VARIEDAD: una pagina sin material no puede dar muchas estructuras porque casi ninguna
  // escena del catalogo tiene su señal. Sin este dato, el reporte acusaria de "monotona" a una pagina
  // 404 por hacer exactamente lo unico honesto que puede hacer.
  const disponibles = ESCENAS.filter(e => { try { return e.requiere(pm) } catch { return false } }).length
  porPagina.set(nombre, { placas: vistoPlaca.size, fuentes: vistoFuente.size, estructuras: vistoEstructura.size, techo: disponibles })
}

// ---------------------------------------------------------------- reporte
const med = a => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1] }
const nuncaEscena = ESCENAS.filter(e => !escenasUso.has(e.id)).map(e => e.id)
const nuncaReceta = RECETAS.filter(r => !recetas.has(r.name)).map(r => r.name)
const nuncaPlaca = PLACAS.filter(p => !placas.has(p))
// monotona = poca variedad TENIENDO material con que variar. Un 404 con 4 escenas disponibles y 2
// estructuras esta en su techo; un saas con 15 disponibles y 2 estructuras es un defecto del motor.
const paginasMonotonas = [...porPagina].filter(([, v]) => (v.estructuras <= 2 && v.techo >= 8) || v.placas <= 1)
  .map(([k, v]) => `${k} (${v.estructuras} estructuras con ${v.techo} escenas disponibles, ${v.placas} placas)`)

const L = []
L.push('# Director · reporte de calidad')
L.push('')
L.push('Generado por `node tools/director-loop.mjs`. NO es un gate: mide DISTRIBUCIONES.')
L.push('Los gates contestan si un video esta roto; esto contesta si los videos se parecen entre si,')
L.push('que es el problema que un motor generativo tiene despues de dejar de estar roto.')
L.push('Esta commiteado a proposito: `git diff` sobre este archivo muestra que le hizo un cambio del')
L.push('motor a la variedad de la salida.')
L.push('')
L.push(`**Matriz**: ${Object.keys(ARQ).length} paginas x ${SEEDS} seeds = **${nVid} videos** / ${nEsc} escenas.`)
L.push(`**Contrato**: ${invalidos} storyboards o timelines invalidos.`)
L.push('')
L.push('## Montaje')
L.push(`- recetas de corte: ${tabla(recetas, [...recetas.values()].reduce((a, b) => a + b, 0))}`)
L.push(`- corte de CIERRE: ${tabla(cierres, nVid)}`)
L.push(`- recetas que NUNCA salen: ${nuncaReceta.length ? '**' + nuncaReceta.join(', ') + '**' : 'ninguna'}`)
L.push('')
L.push('## Guion')
L.push(`- gramaticas: ${tabla(gramaticas, nVid)}`)
L.push(`- escenas del catalogo en uso: ${escenasUso.size}/${ESCENAS.length}`)
L.push(`- escenas que NUNCA salen: ${nuncaEscena.length ? '**' + nuncaEscena.join(', ') + '**' : 'ninguna'}`)
L.push(`- duracion: mediana ${med(durs).toFixed(1)}s (min ${Math.min(...durs).toFixed(1)} · max ${Math.max(...durs).toFixed(1)})`)
L.push(`- escenas por video: mediana ${med(nEscenas)} (min ${Math.min(...nEscenas)} · max ${Math.max(...nEscenas)})`)
L.push('')
L.push('## Direccion de arte')
L.push(`- placas: ${tabla(placas, nVid)}`)
L.push(`- placas que NUNCA salen: ${nuncaPlaca.length ? '**' + nuncaPlaca.join(', ') + '**' : 'ninguna'}`)
L.push(`- tipografia display: ${tabla(fuentes, nVid)}`)
L.push(`- objetos heroe: ${tabla(objetos, [...objetos.values()].reduce((a, b) => a + b, 0))}`)
L.push('')
L.push('## Composicion')
L.push(`- eje del foco: ${tabla(aligns, nEsc)}`)
L.push(`- videos con TODAS las escenas centradas: **${todoCentrado}/${nVid} (${pct(todoCentrado, nVid)})** — "todo centrado siempre" es el delator numero uno de pieza hecha por una maquina`)
L.push(`- tinta del PEOR cuadro de cada video: mediana ${(med(tintas) * 100).toFixed(1)}% (min ${(Math.min(...tintas) * 100).toFixed(2)}%)`)
L.push('')
L.push('## Anti-huella por pagina')
L.push('Cuantas variantes distintas produce CADA pagina al mover el seed. Si una pagina da siempre la')
L.push('misma estructura o la misma placa, sus videos se van a parecer entre si aunque cada uno pase.')
L.push('')
L.push('| pagina | estructuras | escenas disponibles | placas | tipografias |')
L.push('|---|---|---|---|---|')
for (const [k, v] of porPagina) L.push(`| ${k} | ${v.estructuras}/${SEEDS} | ${v.techo}/${ESCENAS.length} | ${v.placas} | ${v.fuentes} |`)
L.push('')
L.push(paginasMonotonas.length ? `**Paginas monotonas**: ${paginasMonotonas.join(' · ')}` : '**Ninguna pagina monotona.**')
L.push('')

const md = L.join('\n')
writeFileSync(join(OUT, 'LOOP-REPORT.md'), md)
console.log(md)
console.log('-> docs/director/LOOP-REPORT.md')
