// Exporta la timeline del Director al spec que consume render3d/escena.js.
//
// El Director sigue siendo el dueño del QUE y del CUANDO: mide la pagina, escribe el guion, compone
// las escenas y compila las curvas. Esto no re-decide nada — traduce.
//
// EL TEXTO SE RASTERIZA CON EL RENDER 2D PROPIO, no se re-tipografia en WebGL. core/text.js sabe de
// fitters que achican en vez de elidir, de viudas, de escrituras no latinas con su Noto, de tracking
// por tamaño y de contraste APCA. Volver a escribir todo eso contra una textura de three seria
// reescribirlo peor. Cada capa de texto sale como un PNG transparente de su propia caja y entra a la
// escena como un plano — que ademas es lo que permite que el texto tambien tenga profundidad y se
// mueva con la camara.
//
// Uso:  node tools/render3d-spec.mjs <fixture> [seed] [salida]
//       node tools/render3d-spec.mjs stripe-com 1
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, CANVAS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook } from '../src/director/kit/look.js'
import { compile } from '../src/director/core/timeline.js'
import { drawScene, corpusHero } from '../src/director/render/draw.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

const nombre = process.argv[2] || 'stripe-com'
const seedN = Number(process.argv[3] || 1)
const DIRFIX = join(HERE, 'fixtures', 'director', 'elementos')
const OUT = join(HERE, 'out', 'render3d')
const ASSETS = join(OUT, 'assets')
mkdirSync(ASSETS, { recursive: true })
for (const f of readdirSync(ASSETS)) rmSync(join(ASSETS, f))

const raw = JSON.parse(readFileSync(join(DIRFIX, `${nombre}.json`), 'utf8'))
const pm = normalizePageModel(raw)
const seed = (seedN * 3266489917) >>> 0
const look = deriveLook(pm, seed)
const sb = composeStoryboard(pm, buildGuion(pm, seed), look, seed)
const tl = compile(sb, seed)
const corpus = corpusHero(pm)

// Los recortes de la pagina se copian a assets/ con su nombre: el servidor del driver los sirve bajo
// /assets/ y la escena los pide por esa ruta.
const imgs = new Map()
for (const el of pm.assets.elementos) {
  const src = join(DIRFIX, el.url)
  if (!existsSync(src)) continue
  writeFileSync(join(ASSETS, el.url), readFileSync(src))
  imgs.set(el.url, await loadImage(src))
}

// SUPERMUESTREO del texto: la textura se dibuja al doble de su tamaño en pantalla y three la reduce
// con mipmaps. Sin esto, una capa que la camara acerca muestra los bordes de los glifos pixelados —
// y un titulo pixelado es lo primero que delata que el video se armo con imagenes y no con tipografia.
const SS = 2
const makeCanvas = (w, h) => createCanvas(w, h)
// RESOLUCION DE ENTREGA, no la de trabajo. CANVAS del Director es 405x720: una resolucion de trabajo
// comoda para los gates (que renderizan miles de frames) y correcta en proporcion, porque todas las
// cajas del storyboard son fracciones. Pero un reel se publica en 1080x1920, y ademas 405 es IMPAR —
// libx264 exige lados pares y rechazaba el video entero con un error que no menciona la causa.
// Se rasteriza el texto a esta resolucion: hacerlo a la de trabajo y estirar despues da titulares
// blandos, que es lo primero que delata un video armado con imagenes.
const W = 1080, H = 1920
void CANVAS

let nTexto = 0
function rasterizarTexto(sc, capa) {
  const [bx, by, bw, bh] = capa.box
  const w = Math.max(8, Math.round(bw * W * SS))
  const h = Math.max(8, Math.round(bh * H * SS))
  const cv = createCanvas(w, h)
  const ctx = cv.getContext('2d')
  // SE DIBUJA A TAMAÑO DE CUADRO COMPLETO Y SE RECORTA CON LA TRANSFORMACION, no se lleva la caja al
  // origen de un lienzo chico. Los tamaños de texto del Director son FRACCION DEL ALTO TOTAL
  // (`size * H`): pasandole como H el alto de la caja, un titular de 0.11 del cuadro se dibujaba a
  // 0.11 de su propia caja — el nombre de la marca salia como una nota al pie. Con el traslado, `H`
  // sigue siendo 1920 y solo cambia que parte del plano cae dentro del PNG.
  ctx.scale(SS, SS)
  ctx.translate(-bx * W, -by * H)
  const sola = { ...sc, layers: [capa] }
  drawScene(ctx, sola, look, W, H, { p: 1, images: imgs, makeCanvas, corpus, brand: pm.brand })
  const archivo = `txt_${nTexto++}_${capa.id.replace(/[^a-z0-9]/gi, '')}.png`
  writeFileSync(join(ASSETS, archivo), cv.toBuffer('image/png'))
  return archivo
}

// Las capas de la timeline compilada traen `base` (la capa del storyboard) y `life`. Las curvas viven
// en tl.tracks como { 'capaId|prop': [{t,v,ease}] }.
const tracksDe = (id) => {
  const out = {}
  for (const tr of tl.tracks) {
    if (tr.layer !== id) continue
    out[tr.prop] = tr.keys.map(k => ({ t: +k.t.toFixed(4), v: k.v, ease: k.ease || 'lin' }))
  }
  return out
}

const escenaDe = id => sb.scenes.find(s => id.startsWith(s.id + ':')) || sb.scenes[0]

const capas = []
for (const l of tl.layers) {
  const b = l.base || {}
  if (b.kind === 'plate' || !b.box) continue
  let url = null
  let kind = b.kind
  if (b.kind === 'elemento' || b.kind === 'photo') {
    url = b.url
    if (!imgs.has(url)) continue                    // sin textura no hay plano: no se inventa un hueco
  } else if (b.kind === 'text' || b.kind === 'badge' || b.kind === 'stepper' || b.kind === 'priceTag' || b.kind === 'shape' || b.kind === 'heroObj' || b.kind === 'logoRow') {
    // Todo lo que el render 2D sabe dibujar entra como textura. Incluye las figuras del catalogo: una
    // pagina que no dio recortes tiene que seguir dando un video, y en 3D esas figuras ganan paralaje.
    url = rasterizarTexto(escenaDe(l.id), b)
    kind = 'texto'
  } else {
    continue
  }
  // Las curvas x/y del compilador son el CENTRO normalizado de la caja; la escena las consume asi.
  const tracks = tracksDe(l.id)
  capas.push({
    id: l.id, kind, url: `assets/${url}`, rol: b.rol || '', z: b.z || 10,
    box: b.box, vida: l.life, tracks,
  })
}

// `oscuro` 0..1 a partir de la luminancia relativa del fondo medido. Es la perilla de la que cuelga
// todo el tratamiento de pelicula.
const lumRel = (h) => {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const oscuro = Math.max(0, Math.min(1, 1 - lumRel(look.bg0) * 2.6))
const energia = pm.dna.mood?.energia ?? 0.5

const spec = {
  W, H, fps: tl.fps, dur: tl.dur, seed,
  look: { bg0: look.bg0, bg1: look.bg1, ink: look.ink, accent: look.accent },
  // La camara se mueve MAS cuando la pagina es enérgica. Sale del mood medido, no de un gusto: una
  // marca formal con una camara que vuela se lee como una plantilla mal elegida.
  camara: { dolly: 0.6 + energia * 1.4, deriva: 0.25 + energia * 0.7 },
  // El gesto 3D tambien sale del mood: una marca formal recibe a sus objetos casi de frente, una
  // enérgica los deja llegar bien girados desde el fondo.
  gesto: { giro: 0.22 + energia * 0.55, profundidad: 1.4 + energia * 2.2 },
  // Obturador: 180 grados es el estandar de cine. Mas muestras = mas arrastre limpio y mas costo,
  // porque cada muestra es un render WebGL completo. 4 es donde deja de notarse el escalonado sin
  // cuadruplicar el tiempo del video entero.
  obturador: { angulo: 180 + energia * 60, muestras: 4 },
  // EL TRATAMIENTO DE PELICULA SIGUE A LA LUMINANCIA DEL FONDO, no es un preset.
  // Bloom, viñeta y grano son efectos pensados sobre negro. Aplicados con valores fijos a una pagina
  // de fondo casi blanco — que es la mitad de las landings — el resultado fue un cuadro entero lavado:
  // con umbral 0.82 TODO el fondo supera el umbral y florece, la viñeta se lee como suciedad en las
  // esquinas y el grano como ruido de escaneo. Sobre claro casi no se toca nada; sobre oscuro el
  // efecto entra completo, que es donde de verdad aporta.
  bloom: { fuerza: 0.10 + oscuro * (0.30 + energia * 0.30), radio: 0.45, umbral: 0.95 - oscuro * 0.22 },
  pelicula: { grano: 0.012 + oscuro * 0.045, vinieta: 0.10 + oscuro * 0.70, aberr: 0.0004 + oscuro * 0.0014 },
  // Sin mapeo de tono: la paleta esta MEDIDA de la pagina y ya es sRGB. ACES la reinterpreta como si
  // fuera HDR y sube los claros — el blanco de la marca dejaba de ser su blanco.
  tono: 'ninguno',
  capas,
}

const salida = process.argv[4] || join(OUT, `spec-${nombre}-${seedN}.json`)
writeFileSync(salida, JSON.stringify(spec, null, 1))
console.log(`${salida}\n  ${capas.length} capas (${capas.filter(c => c.kind !== 'texto').length} recortes reales, ${nTexto} rasterizadas) · ${spec.dur}s @ ${spec.fps}fps · assets en ${ASSETS}`)
