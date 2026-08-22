// RECURSOS DE LA PIEZA-N — el estudio de movimiento contra una referencia medida.
//
// LO QUE ORDENA ESTE ARCHIVO: cada tamaño sale de `C:/ae-probe/ref-n/medida.json`, no de mi gusto.
// La referencia se midió entera (630 cuadros, 8 planos, 6 tramos de titular) y de ahí salen:
//
//   · la TINTA de cada titular — 0,9 % a 6,7 % del cuadro, salvo UNO que ocupa el 28,5 %
//   · la magnitud de entrada — cinco entran entre x1,00 y x1,13, uno entra x3,43
//   · la duración de cada tramo y cuánto se queda quieto (0,30 a 0,70 s)
//
// El cuerpo de cada titular se DESPEJA de su tinta objetivo en vez de elegirse: se mide el ancho real
// con Skia, se calcula la cobertura y se ajusta hasta caer en la banda. Un titular que "se ve bien"
// pero ocupa el 12 % donde la referencia pone 4 % rompe el ritmo de toda la pieza, y eso no se ve en
// un cuadro suelto — se ve en el conjunto.
//
// LA TIPOGRAFÍA VA CON DEGRADADO Y POR ESO ES UN PNG. AE no rellena texto con degradado y el motor web
// no tiene efectos: el degradado se hornea. Es el mismo camino que ya usa la píldora de la PIEZA-M.
//
// Y SE MIDE LA FUENTE CONTRA LA SUSTITUTA ANTES DE DIBUJAR. Skia acepta cualquier cadena en `g.font` y
// dibuja con la sustituta sin decir nada: medido en esta máquina, "Helvetica" NO existe y devuelve
// exactamente el mismo ancho que una familia inventada. Un PNG horneado con la sustituta al lado de un
// rótulo vivo con la buena no se distingue en una tira reescalada — se distingue en el video.
//
// USO
//   node tools/ae/recursos-n.mjs

import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { createCanvas, loadImage } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_N || 'C:/ae-probe/recursos-n'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

const W = 1920, H = 1080
const AREA = W * H

// ---------------------------------------------------------------- la paleta
//
// Clara y saturada, que es lo que el género hace: los actos de texto van sobre casi-blanco y el acto de
// producto sobre un degradado a sangre. El acento es un degradado de dos puntas, no un color: la
// tipografía del género se rellena con él y es la mitad de su identidad.
const P = {
  papel: '#FBFCFE',
  papel2: '#F1F4F9',
  tinta: '#0B0B0F',
  gris: '#6B7280',
  a1: '#3B7BF7',   // azul
  a2: '#B24BE0',   // violeta, el punto medio del degradado
  a3: '#E0409A',   // magenta
}
const FUENTE = 'Segoe UI'

// ---------------------------------------------------------------- utilidades
const lienzo = (w, h, k = 1) => {
  const cv = createCanvas(Math.round(w * k), Math.round(h * k))
  const g = cv.getContext('2d')
  g.scale(k, k)
  return [cv, g]
}
const hechos = []
function guardar (n, cv, nota) {
  writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png'))
  hechos.push(`${n.padEnd(20)} ${String(cv.width).padStart(5)}x${String(cv.height).padEnd(5)} ${nota}`)
  return cv
}

// LA FUENTE SE COMPRUEBA, NO SE CONFÍA. Si `FUENTE` no existe, Skia dibuja con la sustituta y el PNG
// sale con otra tipografía sin un solo error. Se mide contra una familia imposible: si dan lo mismo,
// no está.
{
  const g = createCanvas(10, 10).getContext('2d')
  const ancho = (f, p = '') => { g.font = `${p}100px "${f}"`; return g.measureText('Handgloves 123').width }
  const sustituta = ancho('__familia-que-no-existe__')
  const real = ancho(FUENTE)
  if (Math.abs(real - sustituta) < 0.01) {
    throw new Error(`la familia "${FUENTE}" NO existe en Skia: mide exactamente lo mismo que una ` +
                    `inventada (${sustituta.toFixed(2)}). Los PNG saldrían con la sustituta y nada avisaría.`)
  }
  const semi = ancho(FUENTE, '600 ')
  if (Math.abs(semi - real) < 0.01) {
    console.log(`  aviso: el peso 600 de ${FUENTE} mide igual que el regular — puede no estar resolviendo`)
  }
}

// ---------------------------------------------------------------- el degradado de la tipografía
//
// Horizontal y sobre el ANCHO DEL TEXTO, no sobre el lienzo: si se hiciera sobre el lienzo, dos
// titulares de largos distintos tendrían el corte de color en lugares distintos de la palabra y no se
// leerían como la misma familia. Es el mismo error que ya costó la píldora de la PIEZA-M, donde el
// degradado iba por la caja de cada parte en vez de por el conjunto.
function degradadoTexto (g, x0, x1, y) {
  const d = g.createLinearGradient(x0, y, x1, y)
  d.addColorStop(0.00, P.a1)
  d.addColorStop(0.52, P.a2)
  d.addColorStop(1.00, P.a3)
  return d
}

// ---------------------------------------------------------------- un titular, despejado de su tinta
//
// `tintaObjetivo` es la fracción del CUADRO que la referencia mide para ese tramo. Se busca el cuerpo
// que la produce en vez de elegirlo: se dibuja, se cuentan los píxeles con tinta, y se corrige. Tres
// iteraciones alcanzan porque la cobertura es casi lineal en el cuerpo.
function titular (nombre, texto, tintaObjetivo, opciones = {}) {
  const peso = opciones.peso || '600 '
  const k = opciones.k || 2
  let cuerpo = opciones.cuerpoInicial || 150

  const medir = (c) => {
    const g0 = createCanvas(10, 10).getContext('2d')
    g0.font = `${peso}${c}px "${FUENTE}"`
    const m = g0.measureText(texto)
    return { ancho: m.width, alto: c * 1.35 }
  }

  const cobertura = (c) => {
    const { ancho, alto } = medir(c)
    const [cv, g] = lienzo(Math.ceil(ancho) + 40, Math.ceil(alto) + 20, 1)
    g.font = `${peso}${c}px "${FUENTE}"`
    g.textBaseline = 'alphabetic'
    g.fillStyle = '#000'
    g.fillText(texto, 20, c)
    const d = g.getImageData(0, 0, cv.width, cv.height).data
    let tinta = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) tinta++
    return tinta / AREA
  }

  for (let it = 0; it < 4; it++) {
    const cob = cobertura(cuerpo)
    if (cob <= 0) break
    const factor = Math.sqrt(tintaObjetivo / cob)
    if (Math.abs(factor - 1) < 0.02) break
    cuerpo = Math.max(24, Math.min(560, cuerpo * factor))
  }
  cuerpo = Math.round(cuerpo)

  const { ancho, alto } = medir(cuerpo)
  const margen = Math.ceil(cuerpo * 0.22)
  const [cv, g] = lienzo(Math.ceil(ancho) + margen * 2, Math.ceil(alto) + margen * 2, k)
  const cw = cv.width / k, ch = cv.height / k
  g.font = `${peso}${cuerpo}px "${FUENTE}"`
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.fillStyle = opciones.plano ? (opciones.color || P.tinta)
                               : degradadoTexto(g, margen, margen + ancho, ch / 2)
  g.fillText(texto, margen, ch / 2)

  const real = cobertura(cuerpo)
  guardar(nombre, cv, `"${texto}" · ${cuerpo}px · tinta ${(real * 100).toFixed(1)}% (objetivo ${(tintaObjetivo * 100).toFixed(1)}%)`)
  return { cuerpo, ancho, alto: ch }
}

// ================================================================ 1 · los fondos
//
// El fondo NUNCA es neutro: o es un degradado a sangre, o es una superficie con textura. Un color plano
// con tres líneas es "un vacío teñido", que es literalmente lo que el usuario reprochó de la PIEZA-J.
{
  const [cv, g] = lienzo(W, H, 1)
  const d = g.createLinearGradient(0, 0, W * 0.3, H)
  d.addColorStop(0, '#FFFFFF')
  d.addColorStop(1, P.papel2)
  g.fillStyle = d; g.fillRect(0, 0, W, H)
  guardar('n-fondo', cv, 'el casi-blanco de los actos de texto')
}

{
  // EL DEGRADADO DEL ACTO DE PRODUCTO. Va a sangre y saturado, y es lo que separa ese acto del resto:
  // el género cambia el mundo entero cuando llega el producto, no sólo lo que hay encima.
  const [cv, g] = lienzo(W, H, 1)
  const d = g.createLinearGradient(0, H, W, 0)
  d.addColorStop(0.00, '#2B5FD9')
  d.addColorStop(0.42, '#8B3FD4')
  d.addColorStop(0.72, '#D8377F')
  d.addColorStop(1.00, '#F0533F')
  g.fillStyle = d; g.fillRect(0, 0, W, H)
  guardar('n-grad', cv, 'el degradado a sangre del acto de producto')
}

// ================================================================ 2 · el tejido de palabra repetida
//
// EL RECURSO MÁS BARATO DEL GÉNERO Y EL QUE MÁS CAMBIA. Una sola capa de texto repetido, casi del color
// del fondo, convierte una pantalla vacía en una superficie. Medido en la referencia: el cuadro del
// gesto grande tiene el titular al frente y detrás una grilla de la misma palabra a muy bajo contraste.
//
// El contraste es ~4 %: tiene que LLENAR sin competir. Subirlo un poco lo convierte en ruido que pelea
// con el titular; bajarlo, en nada.
{
  const k = 2
  const [cv, g] = lienzo(W, H, k)
  g.fillStyle = P.papel; g.fillRect(0, 0, W, H)
  const cuerpo = 132
  g.font = `600 ${cuerpo}px "${FUENTE}"`
  g.fillStyle = 'rgba(11,11,15,0.045)'
  g.textBaseline = 'middle'
  const palabra = 'automático'
  const anchoP = g.measureText(palabra).width
  const pasoY = cuerpo * 1.62
  const pasoX = anchoP + cuerpo * 0.55
  // se corre media palabra en las filas impares: una grilla perfecta se lee como una grilla, y lo que
  // se busca es superficie, no patrón
  for (let fila = 0, y = -pasoY * 0.4; y < H + pasoY; y += pasoY, fila++) {
    const x0 = -pasoX * (fila % 2 ? 0.5 : 0.05)
    for (let x = x0; x < W + pasoX; x += pasoX) g.fillText(palabra, x, y)
  }
  guardar('n-tejido', cv, 'palabra repetida al 4,5% — llena sin competir')
}

// ================================================================ 3 · los titulares
//
// Las tintas objetivo son las MEDIDAS en la referencia, tramo por tramo:
//   tramo 1  2,7 %   ·  tramo 2  4,0 %  ·  tramo 3  6,7 %
//   tramo 4  28,5 %  <- el gesto grande, x3,43
//   tramo 5  1,3 %   ·  tramo 6  0,9 %
// EL COPY NO INVENTA NINGUN DATO, que es la regla que la PIEZA-M rompio con su "100%" sin sujeto.
// Todo lo que se afirma aca es verificable mirando la propia pieza: cuatro piezas salen de una pagina
// porque los cuatro paneles del cierre son cuatro recortes de una misma captura.
titular('n-t1', 'tu web', 0.027, { peso: '600 ' })
titular('n-t2', 'ya es un video', 0.040)
titular('n-t3', 'sin editarlo', 0.067)
titular('n-t4', 'listo para publicar', 0.150, { peso: '600 ' })
titular('n-t5', 'cuatro piezas de una sola página', 0.013, { plano: true, color: P.gris })
titular('n-t6', 'urvid.ia', 0.009, { plano: true, color: P.gris })
titular('n-marca-texto', 'Urvid', 0.020, { peso: '600 ' })

// LOS TEXTOS QUE VAN SOBRE EL DEGRADADO VAN EN BLANCO, y no es una preferencia.
//
// El usuario lo vio en el cierre: "casi que no se notan los textos". Un titular con degradado azul a
// magenta sobre un fondo que TAMBIEN va de azul a magenta no tiene contraste en ningun punto — el color
// del texto y el del fondo son literalmente el mismo en cada columna. Sobre color saturado el unico
// tono que funciona siempre es el blanco.
titular('n-hook', 'ya es un video', 0.040, { plano: true, color: '#FFFFFF' })
titular('n-marca-blanca', 'Urvid', 0.020, { plano: true, color: '#FFFFFF' })
titular('n-url-blanca', 'urvid.ia', 0.009, { plano: true, color: 'rgba(255,255,255,0.82)' })

// ================================================================ 4 · la marca
//
// Un cuadrado de esquina muy redondeada con un triángulo — la forma que el género usa para un producto
// de software. Las puntas van redondeadas: a 60 px de pantalla un vértice vivo se ensucia con el
// suavizado y queda una punta sucia.
{
  const L = 260, k = 4
  const [cv, g] = lienzo(L, L, k)
  const r = L * 0.235
  const ruta = () => {
    g.beginPath()
    g.moveTo(r, 0)
    g.lineTo(L - r, 0); g.arcTo(L, 0, L, r, r)
    g.lineTo(L, L - r); g.arcTo(L, L, L - r, L, r)
    g.lineTo(r, L); g.arcTo(0, L, 0, L - r, r)
    g.lineTo(0, r); g.arcTo(0, 0, r, 0, r)
    g.closePath()
  }
  ruta()
  const d = g.createLinearGradient(0, 0, L, L)
  d.addColorStop(0, P.a1); d.addColorStop(0.55, P.a2); d.addColorStop(1, P.a3)
  g.fillStyle = d; g.fill()

  const cx = L * 0.53, cy = L / 2, R = L * 0.20
  const pts = [[cx - R * 0.5, cy - R * 0.68], [cx + R * 0.72, cy], [cx - R * 0.5, cy + R * 0.68]]
  const rr = L * 0.022
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], c = pts[(i + 2) % pts.length]
    g.arcTo(b[0], b[1], c[0], c[1], rr)
  }
  g.closePath()
  g.fillStyle = '#FFFFFF'; g.fill()
  guardar('n-marca', cv, 'el isotipo: cuadrado redondeado + triángulo de puntas redondeadas')
}

// ================================================================ 5 · los paneles del usuario
//
// LAS CUATRO IMÁGENES DE URVID, preparadas como paneles de interfaz. NO se redimensionan a un tamaño
// inventado: se llevan a 2400 px de ancho, que es el doble de los ~1100 con que se van a dibujar en
// perspectiva. El piso del oficio es 2x y por debajo se ve el escalón.
//
// Y VAN CON UNA SOMBRA HORNEADA, porque en el acto de producto flotan sobre un degradado saturado: sin
// sombra un panel blanco sobre color se lee pegado al fondo, no delante.
{
  const ESC = 'C:/Users/Thiago/Desktop'
  const anchoPanel = 2400
  for (let i = 1; i <= 4; i++) {
    const src = `${ESC}/urvidImagen${i}.png`
    if (!existsSync(src)) { hechos.push(`n-panel-${i}      FALTA ${src}`); continue }
    const im = await loadImage(src)
    const esc = anchoPanel / im.width
    const w = Math.round(im.width * esc), h = Math.round(im.height * esc)
    const m = Math.round(w * 0.06)                       // margen para que la sombra no se corte
    const [cv, g] = lienzo(w + m * 2, h + m * 2, 1)
    const rad = Math.round(w * 0.022)
    g.save()
    g.shadowColor = 'rgba(10,12,30,0.30)'
    g.shadowBlur = Math.round(m * 0.75)
    g.shadowOffsetY = Math.round(m * 0.28)
    g.beginPath()
    const x0 = m, y0 = m
    g.moveTo(x0 + rad, y0)
    g.lineTo(x0 + w - rad, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + rad, rad)
    g.lineTo(x0 + w, y0 + h - rad); g.arcTo(x0 + w, y0 + h, x0 + w - rad, y0 + h, rad)
    g.lineTo(x0 + rad, y0 + h); g.arcTo(x0, y0 + h, x0, y0 + h - rad, rad)
    g.lineTo(x0, y0 + rad); g.arcTo(x0, y0, x0 + rad, y0, rad)
    g.closePath()
    g.fillStyle = '#FFFFFF'; g.fill()
    g.restore()
    // el contenido, recortado contra la misma ruta para que respete la esquina redondeada
    g.save()
    g.beginPath()
    g.moveTo(x0 + rad, y0)
    g.lineTo(x0 + w - rad, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + rad, rad)
    g.lineTo(x0 + w, y0 + h - rad); g.arcTo(x0 + w, y0 + h, x0 + w - rad, y0 + h, rad)
    g.lineTo(x0 + rad, y0 + h); g.arcTo(x0, y0 + h, x0, y0 + h - rad, rad)
    g.lineTo(x0, y0 + rad); g.arcTo(x0, y0, x0 + rad, y0, rad)
    g.closePath(); g.clip()
    g.drawImage(im, x0, y0, w, h)
    g.restore()
    guardar(`n-panel-${i}`, cv, `urvidImagen${i} · ${im.width}x${im.height} -> panel con sombra`)
  }
}

console.log(`\nrecursos-n -> ${DESTINO}\n`)
for (const h of hechos) console.log('  ' + h)
console.log(`\n  ${hechos.length} recursos`)
