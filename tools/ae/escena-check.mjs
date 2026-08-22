// GESTOS QUE NADIE VE — sin renderizar un solo cuadro.
//
// ESTA COMPUERTA EXISTE PORQUE ME COSTO DOS RENDERS DESCUBRIR LO MISMO DOS VECES.
//
// El ritmo ya se mide sin renderizar (`ritmo.mjs`), y eso hizo que la PIEZA-C tuviera coreografia. Pero
// una pieza puede sacar siete de siete en ritmo y ser un cuadro casi vacio, porque el ritmo mide
// MOVIMIENTO y no mide si ese movimiento LLEGA A LA PANTALLA. Las dos veces que la rendericé, el render
// me enseño algo que era calculable en dos segundos:
//
//   1. La fila entera de tarjetas, el cursor y las dos cifras caian FUERA DEL CUADRO. Sus 144 cuadros
//      completos. Habia animado tres entradas escalonadas que no se veian.
//   2. La tapa del revelado del rotulo —un rectangulo del color del fondo, 2600 x 400— estaba 220
//      unidades delante de todo y TAPABA las tarjetas, sus cifras y el contador. Las capas proyectaban
//      donde correspondia, con opacidad 100: el pixel donde tenia que haber texto blanco hueso daba 28
//      sobre 255. Un defecto de oclusion no se parece a un defecto, se parece a "no lo puse".
//
// LA PREGUNTA QUE HACE, Y POR QUE ESA. La primera version preguntaba "¿esta tapada?" y "¿esta en
// cuadro?" por separado, y las dos se llenaban de falsos positivos: un texto escondido tras su tapa
// ANTES de su revelado esta tapado a proposito, y un fondo sobredimensionado esta fuera de cuadro a
// proposito. Los dos son correctos y los dos aparecian en rojo. Una compuerta que se pone roja por lo
// normal se aprende a ignorar.
//
// La pregunta correcta une las dos y elimina los falsos positivos de una: **¿hay alguna capa que se
// MUEVA mientras nadie la puede ver?** Un texto quieto detras de su tapa no gasta nada. Una nube de
// paneles que llega, hace una cascada y se adelanta DEBAJO de un rectangulo opaco es trabajo tirado, y
// se ve igual de vacio que si no lo hubiera hecho. Lo mismo una tarjeta que entra deslizandose fuera
// del encuadre.
//
// LO QUE NO PUEDE DECIR: si algo se ve BIEN. Contesta si el movimiento llega a la pantalla. El
// contraste, la composicion y el gusto no salen de aca — la tarjeta que medía 20,14,18 contra un fondo
// de 11,12,16 pasa esta compuerta y aun asi no se veia.
//
// USO
//   node tools/ae/escena-check.mjs [comp.json]

import { existsSync, readFileSync } from 'node:fs'
import { cinematica, rectanguloDe, propEn } from './cinematica.mjs'

const RUTA = process.argv[2] || 'C:/ae-probe/p3/motor/comp.json'
if (!existsSync(RUTA)) { console.error(`falta ${RUTA}`); process.exit(2) }
const doc = JSON.parse(readFileSync(RUTA, 'utf8'))
const K = cinematica(doc)
const { ancho, alto, fps } = K
const CUADROS = Math.round(doc.comp.duracion * fps)
const AREA = ancho * alto

const caja = (q) => ({
  x0: Math.min(q[0][0], q[1][0], q[2][0], q[3][0]),
  y0: Math.min(q[0][1], q[1][1], q[2][1], q[3][1]),
  x1: Math.max(q[0][0], q[1][0], q[2][0], q[3][0]),
  y1: Math.max(q[0][1], q[1][1], q[2][1], q[3][1]),
})
const areaCaja = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)
const cruce = (a, b) => areaCaja({
  x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0),
  x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1),
})

// el grano es textura de pantalla completa: no compite con nadie y no se le mide el encuadre
const dibujables = doc.capas.filter(c => c.tipo !== 'camara' && rectanguloDe(c) && !/^grano/i.test(c.nombre))
const CUADRO = { x0: 0, y0: 0, x1: ancho, y1: alto }
const estados = []

for (let f = 0; f < CUADROS; f++) {
  K.enCuadro(f)
  const t = f / fps
  const vivas = new Map()
  for (const c of dibujables) {
    if (!(t >= c.entra - 1e-9 && t < c.sale - 1e-9 && c.visible !== false)) continue
    const op = propEn(c.transformacion, 'opacidad', 0, t, 100)
    const q = K.esquinas(c, t)
    if (!q) continue
    const b = caja(q)
    if (areaCaja(b) < 1) continue
    vivas.set(c.indice, {
      c, b, op, prof: K.profundidad(c, t), area: areaCaja(b),
      cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2,
    })
  }
  // cuanto de cada capa llega efectivamente a la pantalla
  for (const v of vivas.values()) {
    // SE MIDE CONTRA LA MENOR DE LAS DOS AREAS. Un fondo sobredimensionado tiene el 38% de si mismo
    // dentro del cuadro por construccion, y eso no es estar fuera de cuadro: es cubrirlo entero. Con la
    // fraccion de la CAPA, el paralaje del fondo aparecia como setenta y cuatro cuadros de movimiento
    // desperdiciado.
    const enCuadro = cruce(v.b, CUADRO) / Math.min(v.area, AREA)
    let tapado = 0
    for (const o of vivas.values()) {
      // SOLO UN SOLIDO OPACO OCLUYE. Una imagen o un texto tienen alfa: tapan de a ratos y en formas
      // que una caja no describe. Se busca el rectangulo opaco puesto por error, no una estimacion fina.
      if (o === v || o.c.tipo !== 'solido' || o.op < 99) continue
      // UNA CAPA 3D NO PUEDE TAPAR A UNA 2D, por lejos que este. AE compone el mundo 3D primero y
      // despues encima las capas 2D que esten mas arriba en la pila; el motor hace lo mismo. Pero aca
      // la oclusion se decidia SOLO por profundidad, y una capa 2D no tiene profundidad propia: queda
      // en z=0, asi que cualquier solido 3D con z negativo la tapaba.
      //
      // No es teorico. En la PIEZA-J daba cinco barras "que se mueven sin verse" —los subrayados y la
      // barra de los treinta segundos— tapadas por la cara de una tarjeta que en pantalla esta DETRAS
      // de ellas. Cinco defectos inventados, del tipo peor: los que mandan a arreglar algo que anda.
      if (o.c.es3D && !v.c.es3D) continue
      // Y DOS PARTES DEL MISMO OBJETO TAMPOCO SE TAPAN "MAL": se tapan porque el objeto es solido.
      //
      // Una tarjeta con espesor son seis planos colgados de un nulo, y cuando muestra su cara, el
      // dorso y dos de los cantos estan atras. Contar eso como "gasta movimiento sin verse" daba siete
      // hallazgos en la PIEZA-J —el dorso 90 cuadros, un canto 109— por hacer exactamente lo que tiene
      // que hacer. Es la contracara de la capacidad nueva: el catalogo pide armar objetos con planos, y
      // la compuerta estaba escrita cuando todo era plano.
      //
      // El criterio es el padre comun: dos capas colgadas del mismo nulo son partes de un cuerpo
      // rigido, y su orden relativo lo fija la construccion, no el azar. Dos capas sueltas que se
      // tapan siguen contando, que es el defecto que esta compuerta nacio para cazar.
      if (o.c.padre != null && o.c.padre === v.c.padre) continue
      if (o.prof >= v.prof - 1e-6) continue
      tapado = Math.max(tapado, cruce(o.b, v.b) / v.area)
    }
    // Y LA OPACIDAD NO ENTRA EN LA CUENTA. Multiplicar por ella convertia el gesto de entrada mas comun
    // que existe —aparecer desvaneciendose— en "se mueve sin verse": la capa esta al 10% porque el autor
    // lo pidio, no porque algo se lo tape. Esta compuerta pregunta por ENCUADRE y OCLUSION, que son las
    // dos formas en que el movimiento se pierde sin que nadie lo haya pedido.
    v.visible = Math.max(0, enCuadro - tapado)
  }
  estados.push(vivas)
}

// EL MOVIMIENTO SE MIDE EN PANTALLA, no en las propiedades: una capa puede tener claves y no moverse un
// pixel (si su padre la compensa), y puede moverse sin claves propias (si la mueve la camara).
const gastados = new Map()
for (let f = 1; f < CUADROS; f++) {
  for (const [i, v] of estados[f]) {
    const a = estados[f - 1].get(i)
    if (!a) continue
    const dCentro = Math.hypot(v.cx - a.cx, v.cy - a.cy)
    const dArea = Math.abs(v.area - a.area) / AREA
    const seMueve = dCentro > 1.0 || dArea > 0.002
    if (!seMueve) continue
    if (v.visible > 0.25) continue
    if (v.op < 1) continue
    const k = v.c.nombre
    const g = gastados.get(k) || { n: 0, peor: 1, motivo: new Set() }
    g.n++
    g.peor = Math.min(g.peor, v.visible)
    const enCuadro = cruce(v.b, CUADRO) / v.area
    g.motivo.add(enCuadro < 0.5 ? 'fuera de cuadro' : v.op < 25 ? 'casi transparente' : 'tapada')
    gastados.set(k, g)
  }
}

// ---------------------------------------------------------------- CONTRASTE CONTRA LO DE ATRAS
//
// LA UNICA REGLA DE DIRECCION DE ARTE QUE ES MEDIBLE, y la que me faltaba.
//
// Las tarjetas de la PIEZA-C median 20,14,18 contra un fondo de 11,12,16: existian, estaban en cuadro,
// nada las tapaba, y no se veian. Las dos compuertas anteriores las daban por buenas porque las dos
// preguntan por geometria. Un panel oscuro sobre un fondo oscuro no es sobriedad: es una capa que no
// esta, y cuesta lo mismo que una que si.
//
// Se compara cada solido contra el solido que tiene INMEDIATAMENTE detras y con el que se pisa. La
// luminancia sale del HEX, nunca de los canales de un THREE.Color: con la gestion de color encendida
// esos vienen en LINEAL y aplicarles la conversion los convierte dos veces, comprime las diferencias y
// hunde todos los contrastes. Ese error ya publico una tabla al reves en este repo.
const luminancia = (hex) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contraste = (a, b) => {
  const la = luminancia(a), lb = luminancia(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const PISO_CONTRASTE = 1.8
const flojos = new Map()
for (let f = 0; f < CUADROS; f += 5) {          // cada 5 cuadros alcanza: el color no cambia
  const vivas = [...estados[f].values()].filter(v => v.c.tipo === 'solido' && v.c.solido && v.op > 50)
  for (const v of vivas) {
    if (/^tapa|^fondo|^placa/.test(v.c.nombre)) continue     // estructurales: su trabajo es no verse
    let atras = null
    for (const o of vivas) {
      if (o === v || o.prof <= v.prof) continue
      if (cruce(o.b, v.b) / v.area < 0.5) continue
      if (!atras || o.prof < atras.prof) atras = o           // el mas cercano de los que estan detras
    }
    if (!atras) continue
    const r = contraste(v.c.solido.color, atras.c.solido.color)
    if (r >= PISO_CONTRASTE) continue
    const k = `${v.c.nombre} (${v.c.solido.color}) sobre ${atras.c.nombre} (${atras.c.solido.color})`
    const g = flojos.get(k) || { n: 0, r }
    g.n++
    flojos.set(k, g)
  }
}

// Y LAS TAPAS QUE SOBREVIVEN A SU GESTO. Una tapa deja de ser una tapa y pasa a ser un rectangulo opaco
// en cuanto el texto que revelaba ya llego: desde ahi solo puede hacer daño, y el daño es silencioso.
const eternas = []
for (const c of dibujables) {
  if (c.tipo !== 'solido' || !/tapa/i.test(c.nombre)) continue
  if (Math.round(c.sale * fps) >= CUADROS - 1) eternas.push(c.nombre)
}

console.log(`ESCENA — "${doc.comp.nombre}" · ${CUADROS} cuadros · ${dibujables.length} capas dibujables`)
console.log('\n  GESTOS QUE NADIE VE (la capa se mueve con menos del 25% de si misma en pantalla)')
if (!gastados.size) console.log('    ninguno')
for (const [n, g] of [...gastados].sort((a, b) => b[1].n - a[1].n)) {
  if (g.n < 8) continue      // dos o tres cuadros al filo de una tapa son el borde del gesto, no un defecto
  console.log(`    ${String(g.n).padStart(4)} cuadros  ${(g.peor * 100).toFixed(0)}% visible  ${n}  (${[...g.motivo].join(', ')})`)
}
console.log(`\n  CONTRASTE FLOJO CONTRA LO QUE TIENEN DETRAS (piso ${PISO_CONTRASTE}:1)`)
if (!flojos.size) console.log('    ninguno')
for (const [n, g] of [...flojos].sort((a, b) => a[1].r - b[1].r)) console.log(`    ${g.r.toFixed(2)}:1   ${n}`)

console.log('\n  TAPAS QUE NUNCA SALEN DE ESCENA')
console.log(eternas.length ? eternas.map(n => `    ${n}`).join('\n') : '    ninguna')

console.log('')
console.log('='.repeat(72))
const mal = [...gastados.values()].filter(g => g.n >= 8).length + eternas.length + flojos.size
if (!mal) console.log('ESCENA OK — todo lo que se mueve llega a la pantalla y se distingue del fondo')
else console.log(`ESCENA NO PASA — ${[...gastados.values()].filter(g => g.n >= 8).length} capa(s) gastan movimiento sin verse · ${flojos.size} sin contraste · ${eternas.length} tapa(s) eterna(s)`)
process.exit(mal ? 1 : 0)
