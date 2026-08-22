// LA INTERFAZ DE LA PIEZA-M: la web del cliente, y despues sus pedazos.
//
// QUE ES ESTO. La pieza cuenta que una pagina se PARTE en fragmentos que despues vuelan. Para eso
// hacen falta dos cosas que parecen una sola: la pagina entera, y cuatro recortes de esa MISMA pagina.
//
// Y ACA ESTA LA DECISION QUE ORDENA TODO EL ARCHIVO: los recortes NO se dibujan aparte. Hay UNA sola
// funcion `dibujarPagina()` en coordenadas de pagina, y un recorte es esa misma funcion sobre un lienzo
// chico con el origen corrido (`translate(-x0, -y0)`). O sea que el recorte no se PARECE a la pagina:
// ES la pagina, mirada por una ventana. Dibujar los pedazos a mano seria pedirle a mi disciplina que
// mantenga sincronizados cinco dibujos, y la consigna dice justo eso —misma tipografia, mismos grises,
// mismo naranja— que es lo primero que se desincroniza cuando alguien toca un numero en un solo lado.
//
// LA TRAMPA QUE TRAE ESA DECISION, Y QUE YA CASI ME COME. Si el sorteo del ruido (las variaciones de las
// miniaturas) se llamara ADENTRO del dibujo, cada una de las cinco pasadas consumiria el generador desde
// otro punto y la tarjeta del recorte NO seria la tarjeta de la pagina. Por eso el sorteo se hace UNA
// vez en `disponer()` y queda guardado en el plan; el dibujo solo lee. Determinismo no es solo "no usar
// Math.random": es que la misma coordenada de la pagina de siempre el mismo pixel, se dibuje cuando se
// dibuje.
//
// LAS TRES REGLAS DURAS, RESUELTAS CON CODIGO Y NO CON BUENA MEMORIA:
//   1. cero azar libre       -> `azar(SEMILLA)`, congruencial, semilla escrita abajo.
//   2. margen de las sombras -> `chequearMargenSombra()` TIRA si una sombra no tiene 3x su desenfoque
//                               de aire hasta el borde del lienzo. Y como `shadowBlur` no lo escala la
//                               matriz, el desenfoque se pide en NATIVOS (por k) y el margen se compara
//                               en logicas (dividido por k). Ver la nota larga en `sombraNativa()`.
//   3. el multiplicador k    -> `chequearK()` exige 2 <= k <= 4.
//
// USO
//   node tools/ae/recursos-m/interfaz.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_M || 'C:/ae-probe/recursos-m'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

// La semilla va ESCRITA, no sorteada ni tomada del reloj: es la fecha en que se armo la pieza. Cambiarla
// cambia las miniaturas; no cambiarla garantiza que dos corridas den PNG identicos byte a byte.
const SEMILLA = 20260821

// ---------------------------------------------------------------- la paleta, exacta
const P = {
  papel: '#FAFAF8',        // el suelo de la pieza: donde se APOYA la pagina, no la pagina
  papel2: '#F0EFEA',       // la variacion: miniaturas y panel del hero
  tinta: '#0E0E10',        // texto y sombras
  gris: '#6E7076',         // apoyo: menu y textos chicos
  grisClaro: '#C9CAC8',    // los rectangulos que hacen de parrafo
  naranja: '#FF4D1C',      // EL UNICO acento
  naranjaHondo: '#D93A0E',
  naranjaClaro: '#FF8A5C',
  // El blanco no es un acento nuevo ni una licencia: la consigna pide "fondo blanco" para la pagina.
  // La pagina es blanca; el papel de la pieza es #FAFAF8 y es otra cosa (el suelo debajo del recorte).
  blanco: '#FFFFFF',
}

const hechos = []
const notas = []

// ================================================================ andamio

const lienzo = (w, h, k) => {
  const cv = createCanvas(Math.round(w * k), Math.round(h * k))
  const g = cv.getContext('2d')
  g.scale(k, k)   // se dibuja SIEMPRE en coordenadas logicas; k solo multiplica pixeles
  return [cv, g]
}

const guardar = (n, cv, w, h, k) => {
  writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png'))
  const l = `${(n + '.png').padEnd(22)}${String(cv.width).padStart(5)}x${String(cv.height).toString().padEnd(5)} nativos` +
            `  (dibujo ${w}x${h}, k=${k})`
  hechos.push(l)
  return l
}

const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}

// Mezclar dos neutros de la paleta NO es agregar un color: es pedir un gris intermedio opaco. Hace falta
// porque el riel de la barra tiene que ser "gris muy claro" SIN depender de lo que tenga atras. Un
// rgba(grisClaro, 0.5) se ve claro sobre el papel y desaparece sobre cualquier otra cosa; un opaco no.
const mezcla = (a, b, t) => {
  const c = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [A, B] = [c(a), c(b)]
  return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// rectangulo redondeado a mano (arcTo), para poder repetir la MISMA ruta corrida hacia adentro cuando
// hace falta un borde de 2 px por dentro del relleno.
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

// generador congruencial. NADA de Math.random: dos corridas darian dos PNG distintos y la pieza dejaria
// de ser reproducible, que es exactamente lo que hace imposible auditar un cuadro contra otro.
function azar(semilla) {
  let s = semilla >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// ================================================================ la fuente, medida y no supuesta
//
// Skia falla en silencio: `g.font = '72px "NoExiste"'` no tira error, dibuja con la sustituta. Un PNG
// horneado con la sustituta y un titular vivo con la buena no se ven distintos en una tira reescalada:
// se ven distintos cuando el usuario abre el video. Asi que se mide.
//
// El control negativo es lo que hace valida la medicion: DOS nombres imposibles tienen que dar el MISMO
// ancho. Si dieran distinto, "existe" y "no existe" no se podrian separar y no habria nada que medir.
const _cvF = createCanvas(8, 8), _gF = _cvF.getContext('2d')
const _MUESTRA = 'Marcas que se recuerdan 0123'
const _anchoCon = (fam) => { _gF.font = `72px "${fam}"`; return _gF.measureText(_MUESTRA).width }
const _S1 = _anchoCon('NoExisteEstaFamiliaXQZ')
const _S2 = _anchoCon('TampocoExisteEstaOtraWKJ')
if (Math.abs(_S1 - _S2) > 0.01) {
  throw new Error(`el control negativo de la fuente no se cumple: dos familias inventadas miden ` +
                  `${_S1.toFixed(2)} y ${_S2.toFixed(2)}. Sin ese control la medicion no prueba nada.`)
}
const UI = 'Segoe UI'
{
  const a = _anchoCon(UI)
  if (Math.abs(a - _S1) <= 0.01) {
    throw new Error(`la familia "${UI}" NO existe en Skia: mide exactamente lo mismo que una inventada ` +
                    `(${a.toFixed(2)} px). Dibujaria con la sustituta y los PNG saldrian con otra ` +
                    `tipografia, sin aviso. Corre: node tools/ae/fuentes-skia.mjs`)
  }
  notas.push(`fuente "${UI}": ${a.toFixed(2)} px contra ${_S1.toFixed(2)} de la sustituta -> existe`)
}

// El peso va adelante y NO como familia: en Skia "Segoe UI Semibold" no es una familia (medido en
// tools/ae/fuentes-skia.mjs, cae a la sustituta). Se pide `600 34px "Segoe UI"`.
function texto(g, s, x, y, o) {
  o = o || {}
  g.font = `${o.peso ? o.peso + ' ' : ''}${o.tam || 30}px "${UI}"`
  g.fillStyle = o.color || P.tinta
  g.textAlign = o.alinear || 'left'
  g.textBaseline = o.base || 'alphabetic'
  if (o.espaciado) g.letterSpacing = `${o.espaciado}px`
  g.fillText(s, x, y)
  if (o.espaciado) g.letterSpacing = '0px'
}
function medir(s, tam, peso, espaciado) {
  _gF.font = `${peso ? peso + ' ' : ''}${tam}px "${UI}"`
  _gF.letterSpacing = espaciado ? `${espaciado}px` : '0px'
  const w = _gF.measureText(s).width
  _gF.letterSpacing = '0px'
  return w
}

// ================================================================ las dos compuertas de este archivo

// REGLA 3. El PNG tiene que tener entre 2x y 4x los pixeles con que se dibuja en pantalla. Como todo
// aca se dibuja en coordenadas logicas y k multiplica el bitmap, k ES esa relacion cuando el recurso se
// usa a tamano nominal. Se anota ademas hasta que ancho puede crecer antes de bajar de 2x, que es el
// dato que sirve cuando alguien decide acercar la camara.
function chequearK(nombre, w, h, k) {
  if (k < 2 || k > 4) {
    throw new Error(`${nombre}: k=${k} fuera de rango. A tamano nominal el PNG quedaria en ${k}x los ` +
                    `pixeles de pantalla, y la regla pide entre 2x y 4x.`)
  }
  notas.push(`${nombre}: ${w}x${h} a k=${k} -> ${w * k}x${h * k} nativos; aguanta hasta ` +
             `${Math.round(w * k / 2)} px de ancho en pantalla sin bajar de 2x`)
}

// REGLA 2, LAS DOS MITADES.
//
// (a) TODA SOMBRA NECESITA MARGEN = 3x SU DESENFOQUE. Con menos, la caida se corta contra el borde del
//     lienzo y queda un rectangulo visible alrededor del objeto — el defecto clasico de un PNG con
//     sombra horneada.
// (b) `shadowBlur` y `shadowOffsetY` NO los toca la matriz de transformacion: van en pixeles del BITMAP
//     mientras todo lo demas va en logicas. Con un lienzo multiplicado por k eso se paga DOS veces y en
//     direcciones opuestas: un desenfoque de 26 con k=3 rinde 8,7 logicas (sombra dura y corta), y un
//     margen calculado sobre 26 logicas reserva el triple de lo necesario.
//
// La forma correcta, que es la que usa `sombraNativa()`: el desenfoque se PIDE en logicas, se multiplica
// por k antes de asignarlo, y el margen se compara siempre en logicas (3 x logicas).
function sombraNativa(g, k, color, alfa, desenfoqueLogico, bajadaLogica) {
  g.shadowColor = rgba(color, alfa)
  g.shadowBlur = desenfoqueLogico * k      // <- NATIVOS: la escala no lo toca
  g.shadowOffsetY = bajadaLogica * k       // <- idem
}

// Comprueba (a) sobre un lienzo concreto. `ventana` es el rectangulo de pagina que ese lienzo muestra
// (la pagina entera, o el recorte). Si el halo de la sombra ni siquiera toca la ventana, no hay nada que
// comprobar y lo dice — que no es lo mismo que decir que esta bien.
function chequearMargenSombra(nombre, ventana, obj, desenfoque, bajada) {
  const m = desenfoque * 3
  const caja = { x0: obj.x, y0: obj.y + bajada, x1: obj.x + obj.w, y1: obj.y + obj.h + bajada }
  const halo = { x0: caja.x0 - m, y0: caja.y0 - m, x1: caja.x1 + m, y1: caja.y1 + m }
  const toca = !(halo.x1 <= ventana.x0 || halo.x0 >= ventana.x1 || halo.y1 <= ventana.y0 || halo.y0 >= ventana.y1)
  if (!toca) { notas.push(`sombra ${nombre}: fuera de ${ventana.nombre}, ni el halo la roza`); return }
  const d = {
    izq: caja.x0 - ventana.x0, der: ventana.x1 - caja.x1,
    arriba: caja.y0 - ventana.y0, abajo: ventana.y1 - caja.y1,
  }
  for (const [lado, v] of Object.entries(d)) {
    if (v < m) {
      throw new Error(`sombra ${nombre} en ${ventana.nombre}: quedan ${Math.round(v)} px logicos por ` +
                      `${lado} y hacen falta ${m} (3 x ${desenfoque} de desenfoque). Asi la caida se ` +
                      `corta contra el borde y se ve el rectangulo.`)
    }
  }
  notas.push(`sombra ${nombre} en ${ventana.nombre}: minimo ${Math.round(Math.min(...Object.values(d)))} ` +
             `px logicos de aire, hacen falta ${m}`)
}

// ================================================================ EL PLAN DE LA PAGINA
//
// Todo lo que se mide o se sortea pasa por aca UNA sola vez. El dibujo despues solo lee. Ver la nota de
// arriba: si el sorteo viviera adentro del dibujo, las cinco pasadas (pagina + 4 recortes) darian cinco
// paginas distintas y el gesto de "se parte" se convertiria en cinco cosas que no encajan.

const PAG = { W: 2400, H: 1500, M: 240, K: 2 }
// La sombra del boton: desenfoque 22 y bajada 18, no 26 y 12. Con la primera combinacion la caida salia
// casi igual arriba que abajo y el naranjaHondo al 0.32 la teñia de rosa: en el recorte del boton no se
// leia como sombra sino como un resplandor, que es un efecto que una web real no tiene. La bajada tiene
// que ser comparable al desenfoque para que la sombra se apoye en un lado.
const BOTON = { x: 240, y: 780, w: 372, h: 96, r: 16, desenfoque: 22, bajada: 18 }
const CHIP = { x: 1356, y: 768, w: 300, h: 82, r: 18, desenfoque: 18, bajada: 8 }

function disponer() {
  const dado = azar(SEMILLA)
  const derecha = PAG.W - PAG.M

  // el menu se arma de derecha a izquierda: se mide cada item y se lo apoya contra el anterior
  const items = ['Servicios', 'Trabajos', 'Contacto']
  const HUECO = 66
  const menu = []
  let borde = derecha
  for (let i = items.length - 1; i >= 0; i--) {
    menu.unshift({ s: items[i], derecha: borde })
    borde -= medir(items[i], 27) + HUECO
  }

  // las tres tarjetas: 3 x 560 + 2 x 120 = 1920, que es exactamente el ancho util (2400 - 2 x 240).
  // Las variaciones de la miniatura salen del dado UNA vez y quedan guardadas.
  const tarjetas = ['Identidad', 'Sitio web', 'Packaging'].map((t, i) => ({
    titulo: t,
    x: PAG.M + i * (560 + 120), y: 1010, w: 560, h: 340, r: 20, alto: 178,
    v: { f1: 0.30 + dado() * 0.42, f2: 0.34 + dado() * 0.40, f3: 0.58 + dado() * 0.28 },
    barras: [340 + Math.round(dado() * 90), 230 + Math.round(dado() * 70)],
  }))

  return {
    derecha,
    menu,
    marca: { x: PAG.M, y: 39, s: 46, r: 13, texto: 'NODO' },
    kicker: { punto: { x: 249, y: 250, r: 9 }, s: 'ESTUDIO DE DISEÑO', x: 276, y: 250 },
    titular: { tam: 132, l1: 'Marcas que', l2: 'se recuerdan.', base1: 400, base2: 556 },
    parrafo: [{ x: PAG.M, y: 648, w: 1010, h: 20 }, { x: PAG.M, y: 696, w: 764, h: 20 }],
    boton: { ...BOTON, s: 'Ver proyectos' },
    panel: { x: 1320, y: 300, w: 840, h: 586, r: 26, v: { f1: 0.42, f2: 0.60, f3: 0.72 } },
    chip: { ...CHIP, barras: [150, 96] },
    tarjetas,
  }
}

// ================================================================ el dibujo

// La miniatura: un "sol" naranja y dos colinas grises sobre papel2. No es decoracion — es lo que hace
// que una tarjeta recortada se lea como TARJETA (una foto arriba, texto abajo) y no como un rectangulo
// blanco. El que llama tiene que haber recortado (`clip`) antes: las colinas se salen a proposito.
function motivo(g, x, y, w, h, v) {
  const cielo = g.createLinearGradient(0, y, 0, y + h)
  cielo.addColorStop(0, mezcla(P.papel2, P.papel, 0.7))
  cielo.addColorStop(1, P.papel2)
  g.fillStyle = cielo; g.fillRect(x, y, w, h)

  const sol = Math.min(h * 0.13, 62)
  g.beginPath(); g.arc(x + w * v.f3, y + h * 0.30, sol, 0, Math.PI * 2)
  g.fillStyle = P.naranja; g.fill()

  const colina = (cx, top, R, color) => {
    g.beginPath(); g.arc(cx, top + R, R, 0, Math.PI * 2)
    g.fillStyle = color; g.fill()
  }
  colina(x + w * v.f1, y + h * 0.52, w * 0.62, mezcla(P.grisClaro, P.papel2, 0.55))
  colina(x + w * v.f2, y + h * 0.72, w * 0.50, P.grisClaro)
}

function barra(g, b, color, radio) {
  ruta(g, b.x, b.y, b.w, b.h, radio === undefined ? b.h / 2 : radio)
  g.fillStyle = color; g.fill()
}

function dibujarPagina(g, k, L) {
  // ---- el papel de la pagina. Blanco pleno, que es lo que pide la consigna.
  g.fillStyle = P.blanco
  g.fillRect(0, 0, PAG.W, PAG.H)

  // ---- barra superior
  // Va con una linea de 2 px y NO con sombra, y eso no es pereza: mas abajo el recorte de la tarjeta
  // deja 20 px logicos de aire, o sea que ahi solo entraria una sombra de desenfoque 6, que es nada.
  // Si una parte de la pagina lleva sombra y otra no, se nota; asi que en la pagina la unica sombra es
  // la del boton (que tiene lugar de sobra) y todo lo demas se separa con linea.
  g.fillStyle = rgba(P.tinta, 0.10)
  g.fillRect(0, 124, PAG.W, 2)

  const m = L.marca
  const gm = g.createLinearGradient(0, m.y, 0, m.y + m.s)
  gm.addColorStop(0, P.naranja); gm.addColorStop(1, P.naranjaHondo)
  ruta(g, m.x, m.y, m.s, m.s, m.r); g.fillStyle = gm; g.fill()
  g.beginPath()
  g.moveTo(m.x + 13, m.y + 33); g.lineTo(m.x + 13, m.y + 13)
  g.lineTo(m.x + 33, m.y + 33); g.lineTo(m.x + 33, m.y + 13)
  g.strokeStyle = P.blanco; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke()
  texto(g, m.texto, m.x + m.s + 22, 62, { tam: 34, peso: 'bold', espaciado: 4, base: 'middle' })

  for (const it of L.menu) {
    texto(g, it.s, it.derecha, 63, { tam: 27, color: P.gris, alinear: 'right', base: 'middle' })
  }

  // ---- el panel del hero
  // Existe porque a 2400 de ancho la mitad derecha quedaba vacia y una pagina real no se ve asi. Usa el
  // mismo motivo que las miniaturas: eso es lo que hace que el conjunto se lea como UN sitio y no como
  // piezas sueltas pegadas.
  const pn = L.panel
  g.save(); ruta(g, pn.x, pn.y, pn.w, pn.h, pn.r); g.clip()
  motivo(g, pn.x, pn.y, pn.w, pn.h, pn.v)
  g.restore()

  // el chip que flota sobre el panel: el detalle que termina de hacerlo creible como sitio
  const ch = L.chip
  g.save()
  sombraNativa(g, k, P.tinta, 0.16, ch.desenfoque, ch.bajada)
  g.fillStyle = rgba('#000000', 0.001)   // el relleno no se ve; lo que se ve es su sombra
  ruta(g, ch.x, ch.y, ch.w, ch.h, ch.r); g.fill()
  ruta(g, ch.x, ch.y, ch.w, ch.h, ch.r); g.fill()   // dos pasadas: una sola queda floja
  g.restore()
  ruta(g, ch.x, ch.y, ch.w, ch.h, ch.r); g.fillStyle = P.blanco; g.fill()
  g.beginPath(); g.arc(ch.x + 40, ch.y + ch.h / 2, 14, 0, Math.PI * 2)
  g.fillStyle = P.naranja; g.fill()
  barra(g, { x: ch.x + 70, y: ch.y + 26, w: ch.barras[0], h: 12 }, P.grisClaro)
  barra(g, { x: ch.x + 70, y: ch.y + 48, w: ch.barras[1], h: 12 }, mezcla(P.grisClaro, P.papel, 0.45))

  // ---- el kicker
  const kk = L.kicker
  g.beginPath(); g.arc(kk.punto.x, kk.punto.y, kk.punto.r, 0, Math.PI * 2)
  g.fillStyle = P.naranja; g.fill()
  texto(g, kk.s, kk.x, kk.y, { tam: 24, color: P.gris, espaciado: 3.5, base: 'middle' })

  // ---- el titular
  const t = L.titular
  texto(g, t.l1, PAG.M, t.base1, { tam: t.tam, peso: 'bold' })
  texto(g, t.l2, PAG.M, t.base2, { tam: t.tam, peso: 'bold' })

  // ---- el parrafo: dos rectangulos grises, que es como se dibuja "texto" a este tamano sin que el ojo
  // intente leerlo. El segundo mas corto, porque un parrafo real termina desparejo.
  for (const b of L.parrafo) barra(g, b, P.grisClaro, 10)

  // ---- el boton
  const bt = L.boton
  g.save()
  sombraNativa(g, k, P.naranjaHondo, 0.32, bt.desenfoque, bt.bajada)
  g.fillStyle = rgba('#000000', 0.001)
  ruta(g, bt.x, bt.y, bt.w, bt.h, bt.r); g.fill()
  ruta(g, bt.x, bt.y, bt.w, bt.h, bt.r); g.fill()
  g.restore()
  const gb = g.createLinearGradient(0, bt.y, 0, bt.y + bt.h)
  gb.addColorStop(0, P.naranja); gb.addColorStop(1, P.naranjaHondo)
  ruta(g, bt.x, bt.y, bt.w, bt.h, bt.r); g.fillStyle = gb; g.fill()
  // EL BRILLO DE ARRIBA ES UN DEGRADADO, NO UN TRAZO, y esto costo dos intentos mirando el PNG:
  //   · trazo dando toda la vuelta -> el boton queda con un contorno claro completo, que se lee como
  //     borde mal hecho y no como luz.
  //   · el mismo trazo recortado a la mitad superior -> peor: el filo se corta en seco a media altura y
  //     quedan dos muñones verticales claros en los costados. Un trazo recortado SIEMPRE deja el filo
  //     donde lo cortaste; es la misma familia que la sombra sin margen.
  // Un relleno que se desvanece no tiene ningun borde que cortar, asi que el recorte contra la ruta del
  // boton es lo unico que lo limita, y esa curva ya esta suavizada.
  g.save()
  ruta(g, bt.x, bt.y, bt.w, bt.h, bt.r); g.clip()
  const luz = g.createLinearGradient(0, bt.y, 0, bt.y + bt.h * 0.5)
  luz.addColorStop(0, rgba(P.naranjaClaro, 0.42)); luz.addColorStop(1, rgba(P.naranjaClaro, 0))
  g.fillStyle = luz; g.fillRect(bt.x, bt.y, bt.w, bt.h * 0.5)
  g.restore()

  const anchoRotulo = medir(bt.s, 31, 'bold', 0.5)
  const grupo = anchoRotulo + 16 + 12
  const x0 = bt.x + (bt.w - grupo) / 2
  const cy = bt.y + bt.h / 2
  texto(g, bt.s, x0, cy, { tam: 31, peso: 'bold', color: P.blanco, espaciado: 0.5, base: 'middle' })
  // la flechita a mano y no con el glifo ">" ni con una flecha unicode: Segoe UI no tiene garantizado el
  // caracter y Skia sustituiria en silencio, que es el mismo modo de fallo que la fuente.
  g.beginPath()
  g.moveTo(x0 + anchoRotulo + 16, cy - 9)
  g.lineTo(x0 + anchoRotulo + 26, cy)
  g.lineTo(x0 + anchoRotulo + 16, cy + 9)
  g.strokeStyle = P.blanco; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke()

  // ---- las tres tarjetas
  for (const c of L.tarjetas) {
    ruta(g, c.x, c.y, c.w, c.h, c.r); g.fillStyle = P.blanco; g.fill()
    g.save()
    ruta(g, c.x, c.y, c.w, c.h, c.r); g.clip()
    g.beginPath(); g.rect(c.x, c.y, c.w, c.alto); g.clip()
    motivo(g, c.x, c.y, c.w, c.alto, c.v)
    g.restore()
    g.fillStyle = rgba(P.tinta, 0.08)
    g.fillRect(c.x, c.y + c.alto, c.w, 2)
    ruta(g, c.x + 1, c.y + 1, c.w - 2, c.h - 2, c.r - 1)
    g.strokeStyle = rgba(P.tinta, 0.12); g.lineWidth = 2; g.stroke()
    texto(g, c.titulo, c.x + 34, c.y + 232, { tam: 30, peso: 'bold' })
    barra(g, { x: c.x + 34, y: c.y + 262, w: c.barras[0], h: 14 }, P.grisClaro)
    barra(g, { x: c.x + 34, y: c.y + 290, w: c.barras[1], h: 14 }, mezcla(P.grisClaro, P.papel, 0.40))
  }
}

// ================================================================ los ocho PNG

const L = disponer()

// ---------------------------------------------------------------- 1) la pagina entera
// k=2 y no 3: a pantalla completa en un cuadro de 1920 la pagina se dibuja 1920 px de ancho y el PNG
// tiene 4800, o sea 2,5x. Recien si la camara se acercara a mostrarla a 2400 de ancho bajaria a 2x, que
// sigue siendo el piso. Subir a k=3 daria 7200x4500 (48 MB de bitmap) para ganar nitidez que ningun
// encuadre de esta pieza va a pedir.
{
  chequearK('m-web', PAG.W, PAG.H, PAG.K)
  const ventana = { nombre: 'm-web', x0: 0, y0: 0, x1: PAG.W, y1: PAG.H }
  chequearMargenSombra('boton', ventana, BOTON, BOTON.desenfoque, BOTON.bajada)
  chequearMargenSombra('chip', ventana, CHIP, CHIP.desenfoque, CHIP.bajada)
  const [cv, g] = lienzo(PAG.W, PAG.H, PAG.K)
  dibujarPagina(g, PAG.K, L)
  guardar('m-web', cv, PAG.W, PAG.H, PAG.K)
}

// ---------------------------------------------------------------- 2) los cuatro recortes
// Cada uno es la MISMA `dibujarPagina()` con el origen corrido. Las coordenadas de abajo no son gusto:
// cada una esta elegida para que el pedazo se lea solo Y para que ninguna sombra quede cortada por el
// borde del recorte (`chequearMargenSombra` lo verifica ventana por ventana, y tira si no).
//
// El halo del boton llega hasta x=678 (612 del borde + 3 x 22 de margen), y por eso el recorte del
// parrafo empieza en 700 y no en 680 como estaba primero: con 680 el borde izquierdo del recorte habria
// partido la caida de la sombra de un boton que ni siquiera se ve en ese pedazo.
// k=4 y no 3: en la pieza estos recortes se dibujan a 1044 px, y con k=3 (1800 nativos) Q2 daba
// 1,72x. LA ESCALA DE LA CAPA SE DIVIDE POR EL MISMO FACTOR (58 -> 43.5 en pieza-m.jsx) o el
// recorte cambia de tamano en el cuadro.
const CORTE = { w: 600, h: 400, k: 4 }
const RECORTES = [
  { n: 'm-corte-1', x: 200, y: 180, que: 'el titular, con el kicker y su punto naranja' },
  { n: 'm-corte-2', x: 110, y: 620, que: 'el boton con su entorno (las colas del parrafo arriba)' },
  { n: 'm-corte-3', x: 900, y: 980, que: 'la tarjeta del medio, con aire blanco alrededor' },
  // y=470 y no 560, y esto lo corrigio MIRAR EL PNG, no la cuenta. Con 560 el recorte salia vacio: dos
  // barras grises flotando en blanco. Yo habia calculado que por arriba entrarian las patas del titular,
  // pero "se recuerdan." NO TIENE UNA SOLA LETRA CON DESCENDENTE — s, e, r, c, u, d, a, n: ninguna baja
  // de la linea de base, que esta en 556. O sea que abajo de 556 no habia nada que recortar. Un pedazo
  // puede pasar todas las comprobaciones (fuente, k, margenes) y no tener nada adentro.
  { n: 'm-corte-4', x: 700, y: 470, que: 'el parrafo: las dos lineas grises con su final desparejo, cortado arriba por el titular' },
]
for (const r of RECORTES) {
  chequearK(r.n, CORTE.w, CORTE.h, CORTE.k)
  const ventana = { nombre: r.n, x0: r.x, y0: r.y, x1: r.x + CORTE.w, y1: r.y + CORTE.h }
  chequearMargenSombra('boton', ventana, BOTON, BOTON.desenfoque, BOTON.bajada)
  chequearMargenSombra('chip', ventana, CHIP, CHIP.desenfoque, CHIP.bajada)
  const [cv, g] = lienzo(CORTE.w, CORTE.h, CORTE.k)
  g.save(); g.translate(-r.x, -r.y)
  dibujarPagina(g, CORTE.k, L)
  g.restore()

  // EL FILO DEL RECORTE, y no es decoracion: sin el, el pedazo no se ve.
  //
  // La pagina es blanca (#FFFFFF) y el papel de la pieza es #FAFAF8. Entre los dos hay un 2% de
  // diferencia, asi que un recorte apoyado sobre el papel NO TIENE BORDE: en el cuadro 300 se veian
  // fragmentos de tipografia flotando sin nada que los contuviera, y no se entendia que eran pedazos de
  // algo. Ninguna compuerta lo puede cazar — `escena-check` mide contraste contra el fondo y un recorte
  // que trae un titular negro adentro lo pasa de sobra; lo que no tiene contraste es su BORDE.
  //
  // Va una linea de 3 px por dentro del lienzo (no centrada en el borde, que se comeria la mitad) y en
  // el gris claro de la paleta, no en tinta: tiene que decir "esto termina aca", no dibujar un marco.
  g.strokeStyle = P.grisClaro
  g.lineWidth = 3
  g.strokeRect(1.5, 1.5, CORTE.w - 3, CORTE.h - 3)

  guardar(r.n, cv, CORTE.w, CORTE.h, CORTE.k)
}

// ---------------------------------------------------------------- 3) la barra de la cifra
// Dos PNG del MISMO lienzo y con las MISMAS coordenadas: el riel quieto y el relleno que se escala en X
// desde el ancla izquierda. Que compartan lienzo es lo que permite superponerlos sin calcular offsets.
const CIFRA = { w: 700, h: 90, k: 3 }
{
  chequearK('m-cifra-cama', CIFRA.w, CIFRA.h, CIFRA.k)
  const [cv, g] = lienzo(CIFRA.w, CIFRA.h, CIFRA.k)
  // "gris muy claro" OPACO, no un grisClaro con alfa: un riel translucido cambia de color segun lo que
  // tenga atras, y esta barra va a pasar por encima de la pagina blanca y del papel de la pieza.
  ruta(g, 0, 0, CIFRA.w, CIFRA.h, CIFRA.h / 2)
  g.fillStyle = mezcla(P.grisClaro, P.papel, 0.62); g.fill()
  guardar('m-cifra-cama', cv, CIFRA.w, CIFRA.h, CIFRA.k)
}
{
  chequearK('m-cifra-relleno', CIFRA.w, CIFRA.h, CIFRA.k)
  const [cv, g] = lienzo(CIFRA.w, CIFRA.h, CIFRA.k)
  // EL DEGRADADO VA VERTICAL, Y ES LA REGLA DE LOS EMPALMES APLICADA AL TIEMPO. Este relleno se dibuja
  // completo y despues se ESCALA EN X desde la izquierda. Un degradado horizontal viajaria con la
  // escala: al 20% se veria solo el arranque claro, al 100% la rampa entera, y el color de la barra
  // cambiaria mientras crece — o sea que el mismo objeto tendria dos colores segun el cuadro. Vertical
  // depende de Y, que la escala en X no toca, y el relleno se ve igual en todo el recorrido.
  const gr = g.createLinearGradient(0, 0, 0, CIFRA.h)
  gr.addColorStop(0, P.naranjaClaro); gr.addColorStop(0.45, P.naranja); gr.addColorStop(1, P.naranjaHondo)
  // Y va COMPLETO, de borde a borde: el que anima escala, no recorta. Se paga que al 30% la tapa
  // derecha queda achatada (el radio de 45 se comprime a 13,5), pero es el 6% del ancho y a este tamano
  // no se lee. La alternativa —dos tapas y una barra lisa, como la pildora de la PIEZA-L— es para
  // cuando la deformacion SI se ve; aca seria armar tres capas para nada.
  ruta(g, 0, 0, CIFRA.w, CIFRA.h, CIFRA.h / 2)
  g.fillStyle = gr; g.fill()
  guardar('m-cifra-relleno', cv, CIFRA.w, CIFRA.h, CIFRA.k)
}

// ---------------------------------------------------------------- 4) la barra del ecualizador
const EQ = { w: 60, h: 300, k: 3, r: 22 }
{
  chequearK('m-eq', EQ.w, EQ.h, EQ.k)
  const [cv, g] = lienzo(EQ.w, EQ.h, EQ.k)
  // ACA EL DEGRADADO VA HORIZONTAL, por la razon exactamente inversa a la del relleno de la cifra: esta
  // barra se reinstancia N veces y cada copia se escala en Y con su propia altura. Con un degradado
  // vertical, una copia al 30% mostraria solo el tramo claro y la de al lado al 90% la rampa casi
  // entera: dos barras vecinas del mismo objeto con colores distintos, que es el empalme visible de la
  // regla, movido del espacio al tiempo. Horizontal depende de X, que ninguna de las dos toca, y las N
  // copias se ven como N pedazos del mismo material.
  const gr = g.createLinearGradient(0, 0, EQ.w, 0)
  gr.addColorStop(0, P.naranjaClaro); gr.addColorStop(0.28, P.naranja); gr.addColorStop(1, P.naranjaHondo)
  // radio 22 y no 30 (la pildora entera): al escalarse en Y las tapas se achatan, y cuanto mas grande el
  // radio, mas se nota. Con 22 sobre 300, una copia al 20% (60 px de alto) queda con esquinas de 4,4 px
  // logicos, que sigue leyendose como barra redondeada y no como capsula aplastada.
  ruta(g, 0, 0, EQ.w, EQ.h, EQ.r)
  g.fillStyle = gr; g.fill()
  guardar('m-eq', cv, EQ.w, EQ.h, EQ.k)
}

// ================================================================ el informe

console.log(`\nrecursos-m / interfaz -> ${DESTINO}`)
console.log('\n  lo que se comprobo antes de dibujar:')
for (const n of notas) console.log('    - ' + n)
console.log('\n  lo que se escribio:')
for (const h of hechos) console.log('    ' + h)
console.log(`\n  ${hechos.length} recurso(s)\n`)
