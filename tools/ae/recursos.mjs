// LOS RECURSOS DE UNA PIEZA — degradados, paneles redondeados, aros, halos y grano.
//
// POR QUE ESTO ES EL DESBLOQUEO Y NO UN ATAJO.
//
// La PIEZA-C estaba hecha de `addSolid`: treinta rectangulos de esquina dura, gris sobre negro. El
// usuario la vio y dijo "una decepcion total", y tenia razon. Yo habia dado por hecho que para tener
// esquinas redondeadas, degradados y halos habia que pelearse con las capas de forma de After Effects.
//
// Es al reves. El catalogo de formas lo dice en cada receta: "PNG de aro", "PNG circular del diametro
// del trazo", "PNG semicirculares del color del fondo", "tres copias rasterizadas". **El camino
// previsto es generar el recurso.** Y ademas es el camino MAS fiel que existe en este motor: las
// imagenes viajan BIT A BIT a 1:1 — es la unica categoria que da coincidencia exacta contra AE,
// mejor que la tipografia (0,94%) y que la geometria (0,014 px).
//
// Lo que esto pone al alcance hoy, sin construir nada del motor:
//   · degradados de verdad, con vi\u00f1eta horneada
//   · paneles con radio, borde de 1,5 px y luz superior
//   · sombras de contacto (C14) horneadas en vez de calculadas
//   · halos y destellos con caida suave, que es lo que el resplandor del motor no puede dar solo
//   · GRANO: tres cuadros alternados con claves HOLD. Es la receta F11 aplicada a la textura, y el
//     propio catalogo aclara que no es una aproximacion sino como se hace de verdad en animacion 2D.
//
// LO QUE SIGUE SIN ESTAR: el desenfoque POR CAPA (profundidad de campo real). Se puede hornear un
// halo suave, pero no desenfocar una capa en movimiento. Eso es B1 y no esta construido.
//
// USO
//   node tools/ae/recursos.mjs [carpeta]

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'

const DESTINO = process.argv[2] || 'C:/ae-probe/recursos'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })
const { createCanvas } = await import('@napi-rs/canvas')

// ---------------------------------------------------------------- la paleta, en un solo lugar
// Los valores salen de la ficha de arte de la pieza y estan verificados por contraste: un panel de
// #2c3c66 sobre un fondo de #05070f da 1,86:1, por encima del piso de 1,8 que pide la compuerta. La
// version anterior daba 1,31:1 — las tarjetas existian y no se veian.
export const P = {
  fondo0: '#05070f', fondo1: '#0d1730', fondo2: '#152244',
  panel0: '#2c3c66', panel1: '#1d2a4c',
  borde: '#4a5f96', bordeAlto: '#7d93cf',
  tinta: '#f2f5ff', segunda: '#93a4cc',
  acento: '#ff6b2c', acento2: '#ffa049',
  apoyo: '#35e0ff', apoyo2: '#8af0ff',
  verde: '#4de3a0',
}

const guardar = (nombre, cv) => {
  writeFileSync(`${DESTINO}/${nombre}.png`, cv.toBuffer('image/png'))
  return nombre
}
const lienzo = (w, h) => { const cv = createCanvas(w, h); return [cv, cv.getContext('2d')] }

// UN RECTANGULO REDONDEADO A MANO. `roundRect` existe en canvas moderno, pero dibujarlo asi deja el
// radio bajo control cuando hay que repetirlo para el borde interior.
function ruta(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.lineTo(x + w - rr, y); g.arcTo(x + w, y, x + w, y + rr, rr)
  g.lineTo(x + w, y + h - rr); g.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  g.lineTo(x + rr, y + h); g.arcTo(x, y + h, x, y + h - rr, rr)
  g.lineTo(x, y + rr); g.arcTo(x, y, x + rr, y, rr)
  g.closePath()
}

// ---------------------------------------------------------------- 1. el fondo
// UN FONDO LISO ES LO QUE HACE QUE TODO LO DEMAS SE VEA PEGADO. Este trae tres cosas horneadas que el
// motor no puede dar por si solo: el degradado diagonal, un foco arriba-izquierda coherente con la
// direccion de luz declarada, y la vi\u00f1eta. Va sobredimensionado porque la camara viaja.
{
  const W = 4200, H = 2600
  const [cv, g] = lienzo(W, H)
  const d = g.createLinearGradient(0, 0, W * 0.75, H)
  d.addColorStop(0, P.fondo2); d.addColorStop(0.45, P.fondo1); d.addColorStop(1, P.fondo0)
  g.fillStyle = d; g.fillRect(0, 0, W, H)

  // el foco: un halo muy abierto desde arriba-izquierda
  const foco = g.createRadialGradient(W * 0.3, H * 0.18, 0, W * 0.3, H * 0.18, W * 0.62)
  foco.addColorStop(0, 'rgba(120,170,255,0.20)')
  foco.addColorStop(0.5, 'rgba(80,120,220,0.07)')
  foco.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = foco; g.fillRect(0, 0, W, H)

  // la vi\u00f1eta, que es lo que hace que el centro del cuadro pese
  const vi = g.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.95)
  vi.addColorStop(0, 'rgba(0,0,0,0)'); vi.addColorStop(1, 'rgba(0,0,0,0.62)')
  g.fillStyle = vi; g.fillRect(0, 0, W, H)
  guardar('fondo', cv)
}

// ---------------------------------------------------------------- 2. paneles redondeados
// Con radio, borde de 1,5 px y una luz superior de un pixel: los tres detalles que separan "un panel"
// de "un rectangulo". F14 (nine-slice) hace falta SOLO si el panel cambia de tamaño; estos se generan
// a su tamaño final, asi que una capa alcanza.
function panel(nombre, w, h, opciones) {
  const o = opciones || {}
  const r = o.radio === undefined ? 22 : o.radio
  const M = 3                                     // margen para que el borde no se corte
  const [cv, g] = lienzo(w + M * 2, h + M * 2)
  const x = M, y = M

  const relleno = g.createLinearGradient(0, y, 0, y + h)
  relleno.addColorStop(0, o.claro || P.panel0)
  relleno.addColorStop(1, o.oscuro || P.panel1)
  ruta(g, x, y, w, h, r); g.fillStyle = relleno; g.fill()

  // borde
  ruta(g, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r - 0.75)
  g.strokeStyle = o.borde || P.borde; g.lineWidth = 1.5; g.stroke()

  // la luz de arriba: un solo pixel mas claro sobre el borde superior. Cuesta nada y es la diferencia
  // entre "tiene volumen" y "es plano".
  g.save()
  ruta(g, x, y, w, h, r); g.clip()
  const luz = g.createLinearGradient(0, y, 0, y + Math.min(h * 0.5, 90))
  luz.addColorStop(0, 'rgba(255,255,255,0.16)'); luz.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = luz; g.fillRect(x, y, w, Math.min(h * 0.5, 90))
  g.restore()
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- 3. sombra de contacto (C14)
// Sin ella, dos planos a distinta profundidad se ven como dos rectangulos pegados. Se hornea con un
// degradado radial aplastado en vez de con un desenfoque, que no tenemos.
function sombra(nombre, w, h) {
  const W = Math.round(w * 1.6), H = Math.round(h * 1.9)
  const [cv, g] = lienzo(W, H)
  const cx = W / 2, cy = H / 2
  const s = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) / 2)
  s.addColorStop(0, 'rgba(0,0,0,0.55)')
  s.addColorStop(0.45, 'rgba(0,0,0,0.28)')
  s.addColorStop(1, 'rgba(0,0,0,0)')
  g.save(); g.translate(cx, cy); g.scale(1, H / W); g.translate(-cx, -cy)
  g.fillStyle = s; g.fillRect(0, 0, W, W)
  g.restore()
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- 4. aros, halos, rayos, puntas
function aro(nombre, diam, grosor, color) {
  const M = grosor + 4
  const [cv, g] = lienzo(diam + M * 2, diam + M * 2)
  g.beginPath(); g.arc(diam / 2 + M, diam / 2 + M, diam / 2, 0, Math.PI * 2)
  g.strokeStyle = color; g.lineWidth = grosor; g.stroke()
  return guardar(nombre, cv)
}
function halo(nombre, diam, color, fuerza) {
  const [cv, g] = lienzo(diam, diam)
  const s = g.createRadialGradient(diam / 2, diam / 2, 0, diam / 2, diam / 2, diam / 2)
  const [r, v, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
  s.addColorStop(0, `rgba(${r},${v},${b},${fuerza})`)
  s.addColorStop(0.32, `rgba(${r},${v},${b},${fuerza * 0.35})`)
  s.addColorStop(1, `rgba(${r},${v},${b},0)`)
  g.fillStyle = s; g.fillRect(0, 0, diam, diam)
  return guardar(nombre, cv)
}
function pastilla(nombre, w, h, color) {
  const M = 3
  const [cv, g] = lienzo(w + M * 2, h + M * 2)
  ruta(g, M, M, w, h, h / 2); g.fillStyle = color; g.fill()
  return guardar(nombre, cv)
}
function rayo(nombre, largo, ancho, color) {
  const [cv, g] = lienzo(largo, ancho)
  const d = g.createLinearGradient(0, 0, largo, 0)
  d.addColorStop(0, color); d.addColorStop(1, 'rgba(255,255,255,0)')
  ruta(g, 0, 0, largo, ancho, ancho / 2); g.fillStyle = d; g.fill()
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- 5. EL SIMBOLO
// La pieza necesita algo que se recuerde y que vuelva. Es una RETICULA de medicion: un aro con cuatro
// marcas y una cruz fina. Aparece al principio, mide en el medio y se cierra en el remate — es el
// argumento de la pieza dibujado.
{
  const D = 460, M = 24
  const [cv, g] = lienzo(D + M * 2, D + M * 2)
  const c = D / 2 + M
  g.strokeStyle = P.acento; g.lineWidth = 5
  g.beginPath(); g.arc(c, c, D / 2, 0, Math.PI * 2); g.stroke()
  g.strokeStyle = P.apoyo; g.lineWidth = 2.5
  g.beginPath(); g.arc(c, c, D / 2 - 26, -0.5, 1.35); g.stroke()
  g.beginPath(); g.arc(c, c, D / 2 - 26, Math.PI - 0.5, Math.PI + 1.35); g.stroke()
  // las cuatro marcas
  g.strokeStyle = P.tinta; g.lineWidth = 4
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2
    g.beginPath()
    g.moveTo(c + Math.cos(a) * (D / 2 - 46), c + Math.sin(a) * (D / 2 - 46))
    g.lineTo(c + Math.cos(a) * (D / 2 - 16), c + Math.sin(a) * (D / 2 - 16))
    g.stroke()
  }
  // la cruz del centro
  g.strokeStyle = 'rgba(242,245,255,0.5)'; g.lineWidth = 1.5
  g.beginPath(); g.moveTo(c - 28, c); g.lineTo(c + 28, c)
  g.moveTo(c, c - 28); g.lineTo(c, c + 28); g.stroke()
  guardar('reticula', cv)
}

// ---------------------------------------------------------------- 6. GRANO (F11 aplicado a textura)
// Tres cuadros que se alternan con claves HOLD cada 2-3 cuadros. Un grano quieto se lee como suciedad
// de la pantalla; alternado se lee como pelicula. El catalogo lo dice de la tecnica hermana: no es una
// aproximacion, es como se hace de verdad.
//
// El ruido se genera con una secuencia propia y una semilla escrita, no con Math.random: el motor tiene
// que ser determinista y una textura distinta en cada corrida rompe la comparacion contra AE.
{
  let semilla = 20260814
  const azar = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff }
  for (let k = 0; k < 3; k++) {
    const W = 1920, H = 1080
    const [cv, g] = lienzo(W, H)
    const img = g.createImageData(W, H)
    for (let i = 0; i < W * H; i++) {
      const v = azar()
      const n = v < 0.5 ? 0 : 255
      img.data[i * 4] = n; img.data[i * 4 + 1] = n; img.data[i * 4 + 2] = n
      img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 46)
    }
    g.putImageData(img, 0, 0)
    guardar(`grano-${k}`, cv)
  }
}

// un bloque de color plano con el mismo radio que los paneles: es de la misma familia visual
function bloque(nombre, w, h, color) {
  const M = 2
  const [cv, g] = lienzo(w + M * 2, h + M * 2)
  ruta(g, M, M, w, h, 14)
  const d = g.createLinearGradient(0, M, 0, M + h)
  d.addColorStop(0, color); d.addColorStop(1, color)
  g.fillStyle = d; g.fill()
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- el juego completo
const hechos = ['fondo', 'reticula', 'grano-0', 'grano-1', 'grano-2']
hechos.push(panel('panel-heroe', 1100, 660, { radio: 26 }))
hechos.push(panel('panel-tarjeta', 460, 250, { radio: 20 }))
hechos.push(panel('panel-tarjeta-acento', 460, 250, { radio: 20, claro: '#4a2a20', oscuro: '#2e1a14', borde: P.acento }))
hechos.push(panel('panel-nube', 340, 210, { radio: 16 }))
hechos.push(panel('panel-cifra', 700, 300, { radio: 24 }))
hechos.push(sombra('sombra-heroe', 1100, 90))
hechos.push(sombra('sombra-tarjeta', 460, 50))
hechos.push(aro('aro-fino', 300, 3, P.apoyo))
hechos.push(aro('aro-medio', 220, 6, P.acento))
hechos.push(halo('halo-calido', 640, P.acento, 0.55))
hechos.push(halo('halo-frio', 640, P.apoyo, 0.45))
hechos.push(pastilla('chip', 300, 56, '#1b2745'))
hechos.push(pastilla('barra-acento', 620, 14, P.acento))
hechos.push(pastilla('barra-apoyo', 620, 14, P.apoyo))
hechos.push(pastilla('barra-eq', 34, 200, P.apoyo))
hechos.push(rayo('rayo', 260, 10, P.acento))

// BLOQUES DE COLOR PARA EL REVELADO VISIBLE (X02).
//
// El revelado por tapa invisible esconde el texto tras un rectangulo DEL COLOR DEL FONDO, y eso vale
// mientras el fondo sea plano. En cuanto el fondo pasa a ser un degradado con foco y viñeta —o sea, en
// cuanto el arte mejora— ese rectangulo plano deja de coincidir con nada y se ve como lo que es: un
// recuadro que aparece y se va. El catalogo lo tiene escrito como limite de la familia.
//
// La salida no es esconder mejor: es dejar de esconder. Un bloque de color de marca que se retrae y va
// destapando el texto se VE a proposito, funciona sobre cualquier fondo, y ademas se lee mas caro.
hechos.push(bloque('bloque-titulo', 760, 190, P.acento))
hechos.push(bloque('bloque-remate', 1280, 190, P.acento))
hechos.push(bloque('bloque-bajada', 600, 96, P.apoyo))

console.log(`${hechos.length} recursos -> ${DESTINO}`)
console.log(hechos.join(' · '))
