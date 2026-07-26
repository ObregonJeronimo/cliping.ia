// GATE director-elementos — audita el camino de los ELEMENTOS REALES: los recortes PNG de los objetos
// de la pagina del usuario (su logo, sus tarjetas, su boton) que el motor anima en vez de dibujar
// figuras de catalogo.
//
// Los fixtures viven en tools/fixtures/director/elementos/ y traen los recortes EN DISCO, no URLs: los
// gates de este repo corren sin red por decision, y un gate que dependa del hosting falla el dia que
// se cae el hosting — que no es el dia en que el motor se rompio.
//
//   1. E-ELEM-DEFORMA   el objeto se dibuja con SU proporcion. Estirar el logo de una marca un 20% es
//                       el defecto que su dueño ve antes que cualquier otro, y ningun gate anterior
//                       podia verlo porque el motor no dibujaba objetos con proporcion propia.
//   2. E-ELEM-OOB       el objeto entra ENTERO en la caja que le cedio el compositor. Si se sale,
//                       pisa las safe areas y el resto de la escena se compuso contando con ese hueco.
//   3. E-ELEM-INVISIBLE ningun elemento con alfa entra si no contrasta contra el fondo del video. Un
//                       recorte trae los colores de SU pagina, y el look del video no es la pagina.
//   4. E-ELEM-FALTA     con las imagenes cargadas no falta ninguna; sin imagenes se reportan TODAS
//                       (el estudio espera ese reporte antes de exportar, si no el MP4 sale con huecos).
//   5. E-EMPTY-FRAME    con los elementos cargados, ningun frame se queda en casi solo fondo.
//   6. E-DET            el mismo seed da el mismo storyboard byte a byte.
//   7. ADITIVO          el MISMO fixture sin elementos sigue componiendo un video entero. Es la
//                       garantia de que esto es una mejora y no una dependencia: una pagina que
//                       bloquea al bot, o una captura sin credenciales de hosting, no dan recortes.
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, validatePageModel, validateStoryboard, formatErrors, CANVAS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook } from '../src/director/kit/look.js'
import { compile } from '../src/director/core/timeline.js'
import { drawFrame } from '../src/director/render/video.js'
import { drawScene, corpusHero } from '../src/director/render/draw.js'
import { contrast } from '../src/director/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

let fails = 0
const die = m => { if (fails < 25) console.error('FAIL  ' + m); fails++ }
const ok = (c, m) => { if (!c) die(m) }

const DIR = join(HERE, 'fixtures', 'director', 'elementos')
if (!existsSync(DIR)) {
  console.error(`FALTA ${DIR} — corre: python backend/cosecha_elementos.py && node tools/director-fixture-elementos.mjs`)
  process.exit(1)
}
const CASOS = readdirSync(DIR).filter(f => f.endsWith('.json'))
if (!CASOS.length) { console.error(`${DIR} sin fixtures`); process.exit(1) }

const SEEDS = 3
const ESC = 0.5, W = Math.round(CANVAS.W * ESC), H = Math.round(CANVAS.H * ESC)
const makeCanvas = (w, h) => createCanvas(w, h)

// ---------------------------------------------------------------- medicion
// El bounding box de lo que se PINTO. Se dibuja sobre un canvas transparente, asi que todo pixel con
// alfa es tinta del elemento. Los recortes vienen ya recortados contra su alfa (el extractor lo hace
// con getbbox), asi que este bbox es exactamente el rectangulo que ocupa el objeto — y su proporcion
// tiene que ser la del archivo. Es la unica forma de medir "no lo estiraron" sin instrumentar el ctx.
function bbox(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

let nEl = 0, nFrames = 0, nVid = 0, nLogos = 0, nPiezas = 0, nDesc = 0, nAudit = 0
const rolesVistos = new Set()

for (const f of CASOS) {
  const raw = JSON.parse(readFileSync(join(DIR, f), 'utf-8'))
  const nombre = f.replace('.json', '')

  // los recortes se cargan de disco UNA vez y se indexan por su `url` (que aca es el nombre del PNG)
  const imgs = new Map()
  for (const el of raw.assets.elementos) {
    try { imgs.set(el.url, await loadImage(join(DIR, el.url))) } catch (e) { die(`${nombre}: no carga ${el.url}`) }
  }

  const pm = normalizePageModel(raw)
  const ve = validatePageModel(pm)
  ok(ve.ok, `${nombre}: pagemodel invalido ${formatErrors(ve.errors)}`)
  ok(pm.assets.elementos.length > 0, `${nombre}: el fixture no conservo elementos tras normalizar`)
  const corpus = corpusHero(pm)

  for (let s = 1; s <= SEEDS; s++) {
    const seed = (s * 3266489917) >>> 0
    const look = deriveLook(pm, seed)
    const sb = composeStoryboard(pm, buildGuion(pm, seed), look, seed)
    const vs = validateStoryboard(sb)
    ok(vs.ok, `${nombre}#${s}: storyboard invalido ${formatErrors(vs.errors)}`)
    nVid++

    // ---- E-DET: mismo seed, mismo storyboard byte a byte
    const sb2 = composeStoryboard(pm, buildGuion(pm, seed), deriveLook(pm, seed), seed)
    ok(JSON.stringify(sb) === JSON.stringify(sb2), `E-DET ${nombre}#${s}: dos composiciones distintas con el mismo seed`)

    // ---- E-ELEM-ANCLA: el chip de marca esta PEGADO al borde superior, sea texto o logo recortado.
    // El chip es un ancla: el pase de aire recentra el bloque en el hueco que el chip deja, y no al
    // chip. Cuando el logo real reemplazo al texto, el chip dejo de reconocerse como ancla y el pase
    // lo arrastraba hasta un 14% del alto hacia abajo — y a distinta altura en cada escena, asi que
    // ademas SALTABA dentro del mismo video. Se verifica en las dos formas del chip a proposito: el
    // defecto era invisible mientras el chip fuera texto.
    // El chip se busca por ESTRUCTURA (id + alto de chip), no por `role`. Buscarlo por `l.role ===
    // 'mark'` — que es lo natural — hacia que la comprobacion se salteara sola justo cuando el defecto
    // estaba presente: sin `role` el `find` devolvia undefined y el gate pasaba en verde. Un gate no
    // puede depender del campo cuya perdida esta auditando.
    const esChip = l => l.id === 'brand' && l.box[3] <= 0.05   // un titular de marca nunca mide 3% de alto
    const ys = []
    for (const sc of sb.scenes) {
      const chip = sc.layers.find(esChip)
      if (!chip) continue
      ys.push(chip.box[1])
      ok(chip.role === 'mark',
        `E-ELEM-ANCLA ${nombre}#${s}/${sc.id}: el chip (${chip.kind}) perdio su role -> deja de ser ancla para el pase de aire`)
      ok(Math.abs(chip.box[1] - sb.grid.y0) < 0.002,
        `E-ELEM-ANCLA ${nombre}#${s}/${sc.id}: el chip (${chip.kind}) esta en y=${chip.box[1].toFixed(4)} y la reja empieza en ${sb.grid.y0.toFixed(4)}`)
    }
    if (ys.length > 1) {
      ok(Math.max(...ys) - Math.min(...ys) < 0.002,
        `E-ELEM-ANCLA ${nombre}#${s}: el chip de marca salta ${(Math.max(...ys) - Math.min(...ys)).toFixed(4)} entre escenas del mismo video`)
    }

    const porUrl = new Map(pm.assets.elementos.map(e => [e.url, e]))
    for (const sc of sb.scenes) {
      for (const l of sc.layers.filter(x => x.kind === 'elemento')) {
        nEl++
        rolesVistos.add(l.rol || '?')
        if (l.id === 'brand') nLogos++
        if (l.id === 'hero') nPiezas++
        const src = porUrl.get(l.url)
        ok(!!src, `${nombre}#${s}/${sc.id}: capa elemento con url que no esta en assets (${l.url})`)
        if (!src) continue

        // ---- E-ELEM-INVISIBLE
        if (src.alfa) {
          const c = contrast(src.color, look.bg0)
          ok(c >= 2.2, `E-ELEM-INVISIBLE ${nombre}#${s}/${sc.id}: ${src.rol} ${src.color} sobre bg0 ${look.bg0} contrasta ${c.toFixed(2)}`)
        }

        // ---- E-ELEM-DEFORMA + E-ELEM-OOB. Se dibuja la capa SOLA y se audita lo que el renderer
        // DECLARA haber pintado. La primera version media el bbox de los pixeles y acusaba de
        // deformacion hasta un 16% en objetos que estaban perfectos: un logo de 16px de alto tiene
        // mas error de redondeo que la tolerancia, y el antialias del borde entra o no segun el
        // umbral de alfa que uno elija. Los pixeles siguen mirandose, pero para lo que si saben
        // responder: que el objeto se pinto y que esta donde dice.
        const cv = createCanvas(W, H)
        const ctx = cv.getContext('2d')
        const rep = drawScene(ctx, { ...sc, layers: [l] }, look, W, H, { p: 1, images: imgs, makeCanvas, corpus, brand: pm.brand })
        const dib = (rep.elementos || []).find(e => e.id === l.id)
        ok(!!dib, `${nombre}#${s}/${sc.id}: el renderer no declaro haber pintado ${l.id}`)
        if (!dib) continue

        const natural = imgs.get(l.url)
        const arNat = natural.width / natural.height
        const arDib = dib.w / dib.h
        const desvio = Math.abs(arDib - arNat) / arNat
        ok(desvio <= 0.01, `E-ELEM-DEFORMA ${nombre}#${s}/${sc.id}: ${l.id} dibujado ${arDib.toFixed(3)} vs natural ${arNat.toFixed(3)} (${(desvio * 100).toFixed(1)}%)`)

        const bx = [l.box[0] * W, l.box[1] * H, l.box[2] * W, l.box[3] * H]
        ok(dib.x >= bx[0] - 0.5 && dib.y >= bx[1] - 0.5 && dib.x + dib.w <= bx[0] + bx[2] + 0.5 && dib.y + dib.h <= bx[1] + bx[3] + 0.5,
          `E-ELEM-OOB ${nombre}#${s}/${sc.id}: ${l.id} pinta [${[dib.x, dib.y, dib.w, dib.h].map(Math.round)}] fuera de [${bx.map(Math.round)}]`)

        const bb = bbox(ctx.getImageData(0, 0, W, H).data, W, H)
        ok(!!bb, `${nombre}#${s}/${sc.id}: ${l.id} declarado pero el cuadro salio en blanco`)
        if (bb) ok(bb.x1 >= dib.x - 2 && bb.x0 <= dib.x + dib.w + 2,
          `${nombre}#${s}/${sc.id}: ${l.id} declara pintar en x=${Math.round(dib.x)} pero la tinta esta en ${bb.x0}..${bb.x1}`)
      }
    }

    // ---- E-ELEM-FALTA + E-EMPTY-FRAME sobre el video compilado
    const tl = compile(sb, seed)
    const cv = createCanvas(W, H), ctx = cv.getContext('2d')
    const nF = Math.floor(tl.dur * tl.fps)
    for (let i = 0; i < nF; i += 4) {
      const t = i / tl.fps
      const rep = drawFrame(ctx, tl, t, { W, H, makeCanvas, brand: pm.brand, corpus, images: imgs })
      nFrames++
      // solo los faltantes que son ELEMENTOS: una foto externa del pagemodel (assets.images) apunta a
      // la URL original de la pagina y este gate corre sin red — no es su asunto ni su defecto
      const falt = ((rep && rep.faltantes) || []).filter(u => porUrl.has(u))
      ok(falt.length === 0, `E-ELEM-FALTA ${nombre}#${s}@${t.toFixed(2)}s: faltan ${falt.slice(0, 2).join(', ')}`)
      // frame casi vacio: se mide contra el fondo real del look, no contra negro
      const d = ctx.getImageData(0, 0, W, H).data
      let tinta = 0
      const bg = [parseInt(look.bg0.slice(1, 3), 16), parseInt(look.bg0.slice(3, 5), 16), parseInt(look.bg0.slice(5, 7), 16)]
      for (let p = 0; p < d.length; p += 4 * 37) {
        if (Math.abs(d[p] - bg[0]) + Math.abs(d[p + 1] - bg[1]) + Math.abs(d[p + 2] - bg[2]) > 40) tinta++
      }
      ok(tinta / (d.length / (4 * 37)) > 0.004, `E-EMPTY-FRAME ${nombre}#${s}@${t.toFixed(2)}s: cuadro casi vacio`)
    }

    // ---- SIN IMAGENES: no explota y REPORTA todo lo que falta. El estudio espera ese reporte antes
    // de exportar; si el renderer se comiera el faltante en silencio, el MP4 saldria con huecos.
    //
    // Se mide en VARIOS instantes y se lleva la cuenta de cuantos elementos vivos se auditaron. La
    // primera version miraba un solo momento — la mitad del video — y ahi casi nunca hay una capa de
    // elemento viva: la comprobacion era `0 >= 0` y pasaba siempre. Se descubrio borrando a proposito
    // el reporte del renderer para ver si el gate lo cazaba: seguia en verde. Un gate que no puede
    // fallar no es un gate, y `nAudit` de abajo existe para que no pueda volver a vaciarse en
    // silencio.
    for (const frac of [0.12, 0.3, 0.5, 0.7, 0.9]) {
      const t = tl.dur * frac
      const repVacio = drawFrame(ctx, tl, t, { W, H, makeCanvas, brand: pm.brand, corpus, images: new Map() })
      // la vida de una capa compilada esta en `life:[t0,t1]`. La primera version leia l.t0/l.t1, que
      // no existen: daba `undefined <= t` = false para todo y la lista de vivos era SIEMPRE vacia —
      // por eso la comprobacion pasaba con el reporte de faltantes borrado.
      const vivos = tl.layers.filter(l => l.kind === 'elemento' && l.life[0] <= t && l.life[1] >= t)
      const reportados = ((repVacio.faltantes || []).filter(u => porUrl.has(u))).length
      ok(reportados >= vivos.length,
        `E-ELEM-FALTA ${nombre}#${s}@${frac}: sin imagenes reporta ${reportados} de ${vivos.length} elementos vivos`)
      nAudit += vivos.length
    }

    // ---- ADITIVO: el MISMO pagemodel sin elementos compone igual de bien
    const pmSin = normalizePageModel({ ...raw, assets: { ...raw.assets, elementos: [] } })
    const sbSin = composeStoryboard(pmSin, buildGuion(pmSin, seed), deriveLook(pmSin, seed), seed)
    const vsSin = validateStoryboard(sbSin)
    ok(vsSin.ok, `ADITIVO ${nombre}#${s}: sin elementos el storyboard es invalido ${formatErrors(vsSin.errors)}`)
    ok(sbSin.scenes.length === sb.scenes.length, `ADITIVO ${nombre}#${s}: sin elementos cambia la cantidad de escenas (${sbSin.scenes.length} vs ${sb.scenes.length})`)
    ok(sbSin.scenes.every(sc => sc.layers.some(l => l.focal)), `ADITIVO ${nombre}#${s}: sin elementos alguna escena se quedo sin foco`)
    nDesc += pm.assets.elementos.length - new Set(sb.scenes.flatMap(sc => sc.layers.filter(l => l.kind === 'elemento').map(l => l.url))).size
  }
}

// Sin esto la comprobacion del faltante puede quedar VACIA sin que nadie se entere: si ningun
// instante muestreado tiene una capa de elemento viva, `0 >= 0` pasa y el gate aprueba un renderer
// que no reporta nada. Ya paso una vez.
if (!nAudit) { console.error('FAIL  el gate no audito NI UN elemento vivo sin imagenes: la comprobacion de faltantes quedo vacia'); fails++ }
if (fails) { console.error(`\nGATE ELEMENTOS: ${fails} FAIL`); process.exit(1) }
console.log(`GATE ELEMENTOS OK (${CASOS.length} paginas reales x ${SEEDS} seeds = ${nVid} videos / ${nEl} capas de elemento `
  + `(${[...rolesVistos].sort().join(', ')}) / ${nFrames} frames: proporcion propia, dentro de caja, contraste contra el fondo, `
  + `cero faltante con imagenes y ${nAudit} reportados sin ellas, y el mismo motor compone igual sin un solo recorte).`)
