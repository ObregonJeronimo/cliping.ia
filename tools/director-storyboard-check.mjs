// GATE director-storyboard — audita las ESCENAS ESTATICAS, que es donde se decide si el video va a
// ser bueno: el linker y el timeline (F3) solo interpolan entre ellas. Una escena mal compuesta no se
// arregla con animacion.
//
// Corre la matriz completa (pagemodels reales de tools/fixtures/director + arquetipos) x seeds y
// asserta, RENDERIZANDO de verdad con las fuentes reales:
//   1. contrato        validateStoryboard + determinismo byte a byte
//   2. E-FOCUS         exactamente UN foco por escena (C1)
//   3. E-SAFE-AREA     ninguna capa legible pisa la UI de la plataforma (C2)
//   4. E-TXT-OVERFLOW  ningun bloque de texto se recorta (fitBlock nunca devuelve over)
//   5. E-TXT-MIDWORD   ninguna linea dibujada termina con "…" que el texto original no tenia
//   6. E-EMPTY-FRAME   ninguna escena es (casi) solo fondo
//   7. E-CONTRAST      todo texto legible sobre su placa (APCA, umbral por tamano)
//   8. E-DATO-FALSO    ningun texto en pantalla que no este en el pagemodel  <- la regla mas dura
//   9. E-MONOTONIA     dos escenas seguidas nunca muestran el mismo conjunto de textos
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, validateStoryboard, formatErrors, CANVAS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook } from '../src/director/kit/look.js'
import { drawScene, col, corpusHero } from '../src/director/render/draw.js'
import { drawPlaca } from '../src/director/render/plate.js'
import { SAFE_TOP, SAFE_BOT } from '../src/director/kit/grid.js'
import { telStart, telStop } from '../src/director/core/text.js'
import { apcaLc } from '../src/director/core/util.js'

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
const SEEDS = 12

// ---------------------------------------------------------------- corpus del pagemodel (anti-invencion)
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')
function corpusDe(pm) {
  const s = pm.semantica
  const partes = [pm.brand, s.queHace, s.cta, s.oferta.precio, s.oferta.promo, s.oferta.urgencia,
    ...(s.features || []).flatMap(f => [f.titulo, f.detalle]),
    ...(s.comoFunciona || []),
    ...(s.pruebas.stats || []).flatMap(x => [x.valor, x.etiqueta]),
    ...(s.pruebas.testimonios || []).flatMap(x => [x.texto, x.firma]),
  ]
  try { partes.push(new URL(pm.url).hostname.replace(/^www\./, '')) } catch {}
  return new Set(partes.map(norm).filter(Boolean))
}
// un texto de pantalla es LEGITIMO si su forma normalizada esta en el corpus (o es un fragmento de el:
// el composer puede acortar, nunca agregar). '— Ana' se normaliza a 'ana' y matchea la firma.
function esReal(txt, corpus) {
  const t = norm(txt)
  if (!t) return true
  for (const c of corpus) if (c === t || c.indexOf(t) >= 0) return true
  return false
}

// ---------------------------------------------------------------- render de auditoria
const ESC = 0.75, W = Math.round(CANVAS.W * ESC), H = Math.round(CANVAS.H * ESC)
const makeCanvas = (w, h) => createCanvas(w, h)
function pixelesDeContenido(sc, look, corpus, brand) {
  const a = createCanvas(W, H), ca = a.getContext('2d')
  drawPlaca(ca, look, W, H, {})
  const b = createCanvas(W, H), cb = b.getContext('2d')
  const rep = drawScene(cb, sc, look, W, H, { p: 1, makeCanvas, brand: brand || '', corpus, images: new Map() })
  const da = ca.getImageData(0, 0, W, H).data, db = cb.getImageData(0, 0, W, H).data
  let n = 0
  for (let i = 0; i < da.length; i += 4) {
    if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24) n++
  }
  return { frac: n / (W * H), rep }
}

// ---------------------------------------------------------------- deteccion de tofu
// dibuja el caracter y U+FFFF (inexistente en toda fuente) y compara los bitmaps.
const _tofu = new Map()
function tofuEn(str, family) {
  for (const ch of Array.from(String(str))) {
    if (ch.charCodeAt(0) < 128 || ch === ' ') continue
    const k = ch + '|' + family
    let t = _tofu.get(k)
    if (t === undefined) {
      const S = 40
      const pinta = c => {
        const cv = createCanvas(S, S), cx = cv.getContext('2d')
        cx.font = `700 28px "${family}", sans-serif`
        cx.textBaseline = 'middle'; cx.fillStyle = '#fff'
        cx.fillText(c, 4, S / 2)
        return cv.getContext('2d').getImageData(0, 0, S, S).data
      }
      const a = pinta(ch), b = pinta('￿')
      let dif = 0
      for (let i = 3; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 16) dif++
      t = dif < 6                                     // mismo bitmap que .notdef -> tofu
      _tofu.set(k, t)
    }
    if (t) return true
  }
  return false
}

// ---------------------------------------------------------------- corrida
let nEsc = 0, nVid = 0
for (const [nombre, raw] of Object.entries(ARQ)) {
  const pm = normalizePageModel(raw)
  const corpus = corpusDe(pm)
  const corpusH = corpusHero(pm)          // el que puede escribir el objeto heroe adentro suyo
  for (let s = 1; s <= SEEDS; s++) {
    const seed = (s * 2246822519) >>> 0
    const guion = buildGuion(pm, seed)
    const look = deriveLook(pm, seed)
    const sb = composeStoryboard(pm, guion, look, seed)
    nVid++

    // 1. contrato + determinismo
    const v = validateStoryboard(sb)
    ok(v.ok, `${nombre}#${s}: storyboard invalido\n${v.ok ? '' : formatErrors(v.errors)}`)
    const sb2 = composeStoryboard(pm, buildGuion(pm, seed), deriveLook(pm, seed), seed)
    ok(JSON.stringify(sb) === JSON.stringify(sb2), `${nombre}#${s}: el storyboard NO es determinista`)

    let previo = null
    for (const sc of sb.scenes) {
      nEsc++
      const P = `${nombre}#${s}/${sc.escena}`

      // 2. E-FOCUS
      const focos = sc.layers.filter(l => l.focal)
      ok(focos.length === 1, `${P}: ${focos.length} focos (C1 exige exactamente 1)`)

      // 3. E-SAFE-AREA
      for (const l of sc.layers) {
        if (l.sangra || l.kind === 'plate') continue
        const [x, y, w, h] = l.box
        ok(y >= SAFE_TOP - 1e-6 && y + h <= 1 - SAFE_BOT + 1e-6 && x >= -1e-6 && x + w <= 1 + 1e-6,
          `${P}/${l.id}: pisa safe area o se sale [${l.box.map(n => n.toFixed(3))}]`)
      }

      // 4/5/6/7 requieren dibujar
      const tel = telStart()
      const { frac, rep } = pixelesDeContenido(sc, look, corpusH, pm.brand)
      telStop()

      ok(rep.desbordes.length === 0, `${P}: texto recortado en ${rep.desbordes.map(d => `${d.id}="${d.text.slice(0, 40)}"`).join(', ')}`)
      const cortadas = tel.filter(t => t.ellip)
      ok(cortadas.length === 0, `${P}: ${cortadas.length} lineas elididas (${cortadas.slice(0, 2).map(t => '"' + t.str + '"').join(', ')})`)
      for (const t of tel) ok(t.w <= t.maxW + 1.5 || !(t.maxW > 0), `${P}: "${t.str}" mide ${t.w.toFixed(0)}px en un maxW de ${t.maxW.toFixed(0)}px`)

      // 6. E-EMPTY-FRAME: una escena tiene que APORTAR imagen sobre el fondo
      ok(frac > 0.008, `${P}: escena casi vacia (solo ${(frac * 100).toFixed(2)}% de pixeles sobre el fondo)`)

      // 7. E-CONTRAST (APCA con umbral por tamano: texto grande tolera menos Lc)
      // el fondo de un texto NO siempre es la placa: dentro de un bento la celda tiene relleno propio.
      // Medir siempre contra bg0 daba falsos positivos (onAccent sobre accent leia como Lc 0).
      const fondoDe = l => {
        const cx = l.box[0] + l.box[2] / 2, cy = l.box[1] + l.box[3] / 2
        let bgl = null
        for (const o of sc.layers) {
          if (o === l || o.z >= l.z || !o.fill || o.kind !== 'shape' || o.shape === 'line' || o.shape === 'bar') continue
          if (cx >= o.box[0] && cx <= o.box[0] + o.box[2] && cy >= o.box[1] && cy <= o.box[1] + o.box[3]) bgl = o
        }
        return bgl ? col(look, bgl.fill) : look.bg0
      }
      const conFoto = sc.layers.some(l => l.kind === 'photo' && l.sangra)
      if (!conFoto) for (const l of sc.layers.filter(l => l.kind === 'text')) {
        const bg = fondoDe(l)
        const lc = Math.abs(apcaLc(col(look, l.color), bg))
        const px = l.size * CANVAS.H
        const umbral = px >= 42 ? 40 : px >= 24 ? 52 : 62
        ok(lc >= umbral, `${P}/${l.id}: contraste APCA ${lc.toFixed(0)} < ${umbral} (${l.color} sobre ${bg}, ${px.toFixed(0)}px)`)
      }

      // 7b. E-TXT-TOFU — que la fuente TENGA los glifos. Un video lleno de cuadritos pasa todos los
      // demas chequeos (mide, no elide, contrasta) y es 100% inutilizable. Se compara el dibujo del
      // caracter contra el dibujo de un codepoint que no existe en ninguna fuente: si son el mismo
      // bitmap, lo que se ve es .notdef.
      for (const l of sc.layers.filter(l => l.kind === 'text' && l.text)) {
        const f = l.family === 'display' ? look.fonts.display : l.family === 'num' ? look.fonts.num : look.fonts.support
        const malo = tofuEn(l.text, f)
        // escritura no latina: nuestras webfonts no la cubren y el look ya pide la Noto correspondiente,
        // que este Node no tiene instalada. Lo que SI se exige por codigo es que el look la haya pedido.
        if (look.fonts.escritura && look.fonts.escritura !== 'latin' && look.fonts.escritura !== 'cyrillic' && look.fonts.escritura !== 'greek') {
          ok(/^Noto /.test(f), `${P}/${l.id}: escritura ${look.fonts.escritura} tipografiada con "${f}" (fuente latina -> tofu)`)
        } else {
          ok(!malo, `${P}/${l.id}: TOFU con "${f}" en "${String(l.text).slice(0, 30)}"`)
        }
      }

      // 8. E-DATO-FALSO — ni una palabra en pantalla que la pagina no haya dicho
      for (const l of sc.layers) {
        const cand = l.kind === 'text' ? [l.text] : l.kind === 'badge' ? [l.text]
          : l.kind === 'stepper' ? l.items : l.kind === 'priceTag' ? [l.valor, l.etiqueta, l.tachado] : []
        for (const t of cand) ok(esReal(t, corpus), `${P}/${l.id}: TEXTO INVENTADO "${t}" (no esta en el pagemodel)`)
        // los logos son anonimos por diseño: un nombre ahi seria un cliente fabricado
        ok(!(l.kind === 'logoRow' && l.text), `${P}/${l.id}: logoRow con texto = cliente inventado`)
      }
      // E-DATO-FALSO tambien ADENTRO del objeto heroe: los dibujantes de src/shared/objects.js
      // escriben etiquetas horneadas ("ADMIT ONE", "VOL. 7") y cifras derivadas del seed ("87%",
      // "+58%"). Era el unico texto del video que nadie auditaba, y salia en el 45% de los videos como
      // foco del cuadro. La telemetria de core/text.js registra CADA linea dibujada, incluida esa.
      if (sc.layers.some(l => l.kind === 'heroObj')) {
        for (const t of tel) {
          ok(esReal(t.str, corpus), `${P}: el objeto heroe escribio "${t.str}" y la pagina no lo dice`)
        }
      }

      // 9. E-MONOTONIA: dos escenas seguidas con el mismo contenido textual
      const textos = sc.layers.flatMap(l => (l.kind === 'stepper' ? l.items : [l.text, l.valor])).map(norm).filter(Boolean).sort().join('|')
      ok(!(previo && textos && previo === textos), `${P}: repite el mismo texto que la escena anterior`)
      previo = textos
    }
  }
}

if (fails) { console.error(`\nGATE STORYBOARD FALLO (${fails} casos).`); process.exit(1) }
console.log(`GATE STORYBOARD OK (${Object.keys(ARQ).length} paginas x ${SEEDS} seeds = ${nVid} videos / ${nEsc} escenas renderizadas: 1 foco, safe areas, cero texto recortado, cero escena vacia, APCA por tamano, anti-invencion y sin repeticion).`)
