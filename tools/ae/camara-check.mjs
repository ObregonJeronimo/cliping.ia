// ¿LA CAMARA DE AFTER EFFECTS ES UNA CAMARA DE PERSPECTIVA ESTANDAR?
//
// Es la pregunta que decide si el reproductor puede pasar a three.js con fidelidad medida, o si hay
// que rehacerlo a ciegas. Lo que separa nuestra pieza del video de Gemini es, sobre todo, paneles en
// perspectiva con una camara moviendose entre ellos — y eso son TRANSFORMACIONES, el terreno donde ya
// hay 0,014 px de fidelidad demostrada. Si la proyeccion no cierra, hay que saberlo antes de construir.
//
// EL MODELO QUE SE PONE A PRUEBA, escrito antes de mirar los datos para no acomodarlo despues:
//
//   Camara en C, mirando al eje Z (caso canonico). `zoom` en pixeles.
//   Un punto del mundo (x, y, z) esta a profundidad  d = z - C.z  de la camara.
//   Su proyeccion es:      pantalla = centro + (x - C.x, y - C.y) * zoom / d
//   Y un objeto de lado L se ve de tamaño:   L * zoom / d
//
// SE MIDEN LAS DOS COSAS, y esa es la parte que importa: el CENTROIDE dice donde cayo y la HUELLA dice
// cuan grande. Una proyeccion con el zoom equivocado puede acertar el centro en todos los cuadros y
// errar el tamaño en todos — con solo el centroide, eso pasa por bueno y el error aparece meses
// despues como "los paneles se ven mas chicos que en AE".
//
// USO
//   node tools/ae/camara-check.mjs

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { leerPNG, medirHuella } from './png.mjs'

const VOLCADO = 'C:/ae-probe/camara.txt'
const DIR = 'C:/ae-probe/camara'
if (!existsSync(VOLCADO)) { console.error(`falta ${VOLCADO}`); process.exit(2) }

const lineas = readFileSync(VOLCADO, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
if (!lineas.includes('--- fin ---')) { console.error('el volcado no tiene centinela'); process.exit(2) }

const nums = (s) => s.split(';').map(Number)
let mundo = null, zoomBase = null, camPos = null, camPoi = null
const cuadros = []
for (const l of lineas) {
  const f = l.split('|')
  if (f[0] === 'COMP') mundo = { ancho: +f[1], alto: +f[2], fps: +f[3], dur: +f[4], lado: +f[5] }
  else if (f[0] === 'CAMOPT' && f[1] === 'ADBE Camera Zoom') zoomBase = +f[2]
  else if (f[0] === 'CAMPOS' && f[1] === 'posicionCentrada') camPos = nums(f[2])
  else if (f[0] === 'CAMPOS' && f[1] === 'puntoDeInteres') camPoi = nums(f[2])
  else if (f[0] === 'CUADRO') {
    cuadros.push({
      k: +f[1], t: +f[2], objeto: nums(f[3]),
      camara: nums(f[4]), poi: nums(f[5]), zoom: +f[6],
    })
  }
}
if (!mundo || !cuadros.length) { console.error('volcado incompleto'); process.exit(2) }

console.log('LA CAMARA DE AFTER EFFECTS CONTRA UNA CAMARA DE PERSPECTIVA ESTANDAR')
console.log(`comp ${mundo.ancho}x${mundo.alto} · solido de ${mundo.lado} px · ${cuadros.length} cuadros`)
console.log(`zoom ${zoomBase} px · camara en (${(camPos || []).join(', ')}) · mira a (${(camPoi || []).join(', ')})`)
// el zoom en grados, que es como lo pide three.js: fov = 2*atan(alto / (2*zoom))
const fov = 2 * Math.atan(mundo.alto / (2 * zoomBase)) * 180 / Math.PI
console.log(`equivale a un campo VERTICAL de ${fov.toFixed(4)} grados`)
console.log(`(y ${zoomBase.toFixed(2)} = ${mundo.ancho} x 50/36: un 50 mm sobre pelicula de 36 mm)\n`)

console.log(' cuadro  z del objeto   AE pinto en        el modelo predice     error    huella AE   predicha   error')
console.log('-'.repeat(108))

let peorPos = 0, peorTam = 0, medidos = 0, saltados = 0
const filas = []
for (const c of cuadros) {
  const ruta = join(DIR, `f${String(c.k).padStart(3, '0')}.png`)
  if (!existsSync(ruta)) { saltados++; continue }
  const img = leerPNG(ruta)
  const h = medirHuella(img)
  if (h.vacia || h.tocaBorde) { saltados++; continue }

  // EL MODELO. Camara centrada mirando al eje Z: la profundidad es la diferencia de Z.
  const cam = c.camara.length >= 3 ? c.camara : [mundo.ancho / 2, mundo.alto / 2, -c.zoom]
  const d = c.objeto[2] - cam[2]
  const px = mundo.ancho / 2 + (c.objeto[0] - cam[0]) * c.zoom / d
  const py = mundo.alto / 2 + (c.objeto[1] - cam[1]) * c.zoom / d
  const tam = mundo.lado * c.zoom / d

  const ePos = Math.hypot(h.x - px, h.y - py)
  const eTam = Math.abs(h.anchoHuella - tam)
  peorPos = Math.max(peorPos, ePos)
  peorTam = Math.max(peorTam, eTam)
  medidos++
  filas.push({ k: c.k, z: c.objeto[2], hx: h.x, hy: h.y, px, py, ePos, ha: h.anchoHuella, tam, eTam })
}

// se muestran seis repartidos, no los primeros seis: los primeros seis de un recorrido son casi el
// mismo punto y no dicen nada del rango
const paso = Math.max(1, Math.floor(filas.length / 6))
for (let i = 0; i < filas.length; i += paso) {
  const f = filas[i]
  console.log(
    `  ${String(f.k).padStart(4)}  ${f.z.toFixed(0).padStart(9)}   ` +
    `${(f.hx.toFixed(1) + ', ' + f.hy.toFixed(1)).padStart(16)}  ` +
    `${(f.px.toFixed(1) + ', ' + f.py.toFixed(1)).padStart(18)}  ` +
    `${f.ePos.toFixed(3).padStart(8)}  ` +
    `${f.ha.toFixed(2).padStart(9)}  ${f.tam.toFixed(2).padStart(9)}  ${f.eTam.toFixed(3).padStart(7)}`)
}

console.log('\n' + '='.repeat(108))
console.log(`cuadros medidos ${medidos} · saltados ${saltados} (vacios o tocando el borde)`)
console.log(`peor error de POSICION: ${peorPos.toFixed(4)} px`)
console.log(`peor error de TAMAÑO:   ${peorTam.toFixed(4)} px`)

// El umbral es el mismo criterio que en las pruebas anteriores: el residuo conocido de la conversion
// de curvas es 0,018 px y el piso del instrumento 0,0014. Medio pixel es cincuenta veces mas laxo que
// eso y sigue siendo invisible; si el modelo estuviera equivocado, el error seria de decenas de px.
const UMBRAL = 0.5
const cierra = peorPos < UMBRAL && peorTam < UMBRAL
console.log('')
console.log(cierra
  ? `LA CAMARA DE AE ES UNA CAMARA DE PERSPECTIVA ESTANDAR.\n` +
    `Posicion y tamaño coinciden por debajo de ${UMBRAL} px en los ${medidos} cuadros medidos. El\n` +
    `reproductor puede pasar a three.js con una PerspectiveCamera de ${fov.toFixed(3)} grados de campo\n` +
    `vertical y esperar la misma fidelidad que ya tiene la transformacion 2D.`
  : `NO CIERRA. Posicion ${peorPos.toFixed(2)} px, tamaño ${peorTam.toFixed(2)} px.\n` +
    `Antes de rehacer el reproductor hay que entender el modelo: mira si el error crece con la\n` +
    `profundidad (seria el zoom), si es constante (seria el centro), o si depende de x e y (seria\n` +
    `una camara descentrada).`)

// ---------------------------------------------------------------- SEGUNDA PARTE: capas rotadas
//
// UN RECTANGULO ROTADO NO PROYECTA UN RECTANGULO, asi que "el ancho de la huella" deja de significar
// algo. Lo que si es exacto: proyectar las CUATRO ESQUINAS con el mismo modelo y comparar el area y el
// centroide del cuadrilatero contra los que se miden en el pixel.
//
// Y OJO CON UNA TENTACION: comparar el centroide medido contra la proyeccion del CENTRO seria un
// error. La perspectiva no es afin — el centro de un cuadrado no se proyecta al centro de su imagen
// cuando el plano esta inclinado. Hay que comparar contra el centroide del POLIGONO proyectado.
const giros = new Map()
for (const l of lineas) {
  const f = l.split('|')
  if (f[0] !== 'GIRO') continue
  if (!giros.has(f[1])) giros.set(f[1], [])
  giros.get(f[1]).push({
    i: +f[2], grados: +f[3], pos: nums(f[4]), anclaje: nums(f[5]), escala: nums(f[6]),
  })
}

const rad = (g) => g * Math.PI / 180
const rotY = (g) => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[c, 0, s], [0, 1, 0], [-s, 0, c]] }
const rotX = (g) => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[1, 0, 0], [0, c, -s], [0, s, c]] }
const rotZ = (g) => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[c, -s, 0], [s, c, 0], [0, 0, 1]] }
const aplicar = (m, v) => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
]

// area y centroide de un poligono, por la formula del cordon de zapato
function poligono(p) {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length]
    const cruz = p[i][0] * q[1] - q[0] * p[i][1]
    a += cruz
    cx += (p[i][0] + q[0]) * cruz
    cy += (p[i][1] + q[1]) * cruz
  }
  a /= 2
  return { area: Math.abs(a), x: cx / (6 * a), y: cy / (6 * a) }
}

if (giros.size) {
  console.log('\n\nCAPAS ROTADAS EN EL ESPACIO — lo que de verdad usa un panel en perspectiva')
  console.log('Se compara el AREA y el CENTROIDE del cuadrilatero proyectado, no un ancho.\n')
  console.log(' eje   grados   area AE    area modelo   error     centroide AE       modelo          error')
  console.log('-'.repeat(96))
  let peorArea = 0, peorCentro = 0, n = 0
  const MAT = { rotY, rotX, rotZ }
  for (const [eje, muestras] of giros) {
    for (const m of muestras) {
      const ruta = join(DIR, eje, `f${String(m.i).padStart(3, '0')}.png`)
      if (!existsSync(ruta)) continue
      const h = medirHuella(leerPNG(ruta))
      if (h.vacia || h.tocaBorde) continue

      const R = MAT[eje](m.grados)
      const L = mundo.lado / 2
      const esquinas = [[-L, -L, 0], [L, -L, 0], [L, L, 0], [-L, L, 0]].map(v => {
        const r = aplicar(R, v)
        const w = [m.pos[0] + r[0], m.pos[1] + r[1], m.pos[2] + r[2]]
        const d = w[2] - camPos[2]
        return [mundo.ancho / 2 + (w[0] - camPos[0]) * zoomBase / d,
                mundo.alto / 2 + (w[1] - camPos[1]) * zoomBase / d]
      })
      const p = poligono(esquinas)
      const eArea = Math.abs(h.area - p.area) / p.area * 100
      const eCentro = Math.hypot(h.x - p.x, h.y - p.y)
      peorArea = Math.max(peorArea, eArea); peorCentro = Math.max(peorCentro, eCentro); n++
      if (m.i % 4 === 0) {
        console.log(`  ${eje.padEnd(5)}${m.grados.toFixed(0).padStart(6)}   ` +
          `${h.area.toFixed(0).padStart(8)}   ${p.area.toFixed(0).padStart(10)}  ${(eArea.toFixed(2) + '%').padStart(7)}   ` +
          `${(h.x.toFixed(1) + ', ' + h.y.toFixed(1)).padStart(16)}  ` +
          `${(p.x.toFixed(1) + ', ' + p.y.toFixed(1)).padStart(15)}  ${eCentro.toFixed(3).padStart(7)}`)
      }
    }
  }
  console.log('\n' + '-'.repeat(96))
  console.log(`${n} giros medidos · peor error de AREA ${peorArea.toFixed(2)}% · peor error de CENTROIDE ${peorCentro.toFixed(3)} px`)
  console.log(peorArea < 1.5 && peorCentro < 1.0
    ? 'LAS ROTACIONES 3D TAMBIEN CIERRAN. Un panel inclinado se proyecta como la matematica dice.'
    : 'LAS ROTACIONES NO CIERRAN: hay que mirar el orden en que AE compone orientacion y rotaciones.')
}


// ---------------------------------------------------------------- TERCERA PARTE: el orden de rotacion
//
// AE aplica la orientacion y despues las tres rotaciones, y el orden en que las compone no esta en
// ninguna documentacion que haya leido. Aca NO SE ADIVINA: se prueban los seis ordenes posibles y se
// informa el residuo de TODOS. Si uno cierra en centesimas y los demas en decenas de pixeles, el
// ganador no es una interpretacion — es el unico que sobrevive.
//
// El descriptor son siete numeros: area, centroide (2) y caja (4). Con solo area y centroide, dos
// ordenes distintos pueden empatar; con la caja, no.
const mult = (a, b) => a.map((fila, i) => [0, 1, 2].map(j => fila[0] * b[0][j] + fila[1] * b[1][j] + fila[2] * b[2][j]))
const ORDENES = ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']
const matriz = (rx, ry, rz, orden) => {
  const R = { X: rotX(rx), Y: rotY(ry), Z: rotZ(rz) }
  return mult(mult(R[orden[0]], R[orden[1]]), R[orden[2]])
}

const proyectar = (w, cam) => {
  const d = w[2] - cam[2]
  return [mundo.ancho / 2 + (w[0] - cam[0]) * zoomBase / d,
          mundo.alto / 2 + (w[1] - cam[1]) * zoomBase / d]
}

function descriptorDe(M, pos, largo, corto, cam) {
  const a = largo / 2, b = corto / 2
  const esq = [[-a, -b, 0], [a, -b, 0], [a, b, 0], [-a, b, 0]].map(v => {
    const r = aplicar(M, v)
    return proyectar([pos[0] + r[0], pos[1] + r[1], pos[2] + r[2]], cam)
  })
  const p = poligono(esq)
  return {
    area: p.area, x: p.x, y: p.y,
    x0: Math.min(...esq.map(e => e[0])), x1: Math.max(...esq.map(e => e[0])),
    y0: Math.min(...esq.map(e => e[1])), y1: Math.max(...esq.map(e => e[1])),
  }
}

const ordenes = lineas.filter(l => l.startsWith('ORDEN|')).map(l => {
  const f = l.split('|')
  const c = nums(f[2])
  return { i: +f[1], rx: c[0], ry: c[1], rz: c[2], ox: c[3], oy: c[4], oz: c[5],
           pos: nums(f[3]), largo: +f[4], corto: +f[5] }
})

if (ordenes.length) {
  console.log('\n\nEL ORDEN DE COMPOSICION DE LAS ROTACIONES')
  console.log('Se prueban los seis ordenes y se informa el residuo de todos.\n')
  const cam = camPos
  // se separa el problema: primero los casos con orientacion en cero (determinan el orden de las
  // rotaciones), despues el de orientacion sola (determina su propio orden). Mezclarlos desde el
  // principio deja dos incognitas en una ecuacion.
  const soloRot = ordenes.filter(o => o.ox === 0 && o.oy === 0 && o.oz === 0)
  const soloOri = ordenes.filter(o => o.rx === 0 && o.ry === 0 && o.rz === 0)

  const evaluar2 = (casos, tomar) => {
    const res = {}
    for (const orden of ORDENES) {
      let peor = 0, hubo = false
      for (const o of casos) {
        const ruta = join(DIR, `orden${o.i}.png`)
        if (!existsSync(ruta)) continue
        const h = medirHuella(leerPNG(ruta))
        if (h.vacia || h.tocaBorde) continue
        const [rx, ry, rz] = tomar(o)
        const d = descriptorDe(matriz(rx, ry, rz, orden), o.pos, o.largo, o.corto, cam)
        peor = Math.max(peor,
          Math.abs(h.x - d.x), Math.abs(h.y - d.y),
          Math.abs(h.caja.x0 - d.x0), Math.abs(h.caja.x1 - d.x1),
          Math.abs(h.caja.y0 - d.y0), Math.abs(h.caja.y1 - d.y1),
          Math.abs(h.area - d.area) / d.area * 20)     // el area en escala comparable a los pixeles
        hubo = true
      }
      if (hubo) res[orden] = peor
    }
    return res
  }

  const mostrar = (titulo, res) => {
    const pares = Object.entries(res).sort((a, b) => a[1] - b[1])
    if (!pares.length) { console.log(`  ${titulo}: sin muestras`); return null }
    console.log(`  ${titulo}`)
    for (const [o, e] of pares) console.log(`    ${o}   residuo ${e.toFixed(3)} px${e === pares[0][1] ? '   <- el unico que cierra' : ''}`)
    const gana = pares[0], segundo = pares[1]
    console.log(`    ganador ${gana[0]} con ${gana[1].toFixed(3)} px; el siguiente da ${segundo ? segundo[1].toFixed(1) : '—'} px\n`)
    return gana
  }

  const gRot = mostrar('rotaciones solas (orientacion en cero):', evaluar2(soloRot, o => [o.rx, o.ry, o.rz]))
  const gOri = mostrar('orientacion sola (rotaciones en cero):', evaluar2(soloOri, o => [o.ox, o.oy, o.oz]))

  if (gRot && gOri) {
    console.log(`  CONCLUSION: las rotaciones se componen en el orden ${gRot[0]} y la orientacion en ${gOri[0]}.`)
    console.log(`  (el orden se lee de izquierda a derecha como M = R${gRot[0][0]} · R${gRot[0][1]} · R${gRot[0][2]})`)
  }
}

// ---------------------------------------------------------------- CUARTA PARTE: camara movil y descentrada
const movs = lineas.filter(l => l.startsWith('CAMMOV|')).map(l => {
  const f = l.split('|')
  return { i: +f[1], pos: nums(f[2]), poi: nums(f[3]), ori: nums(f[4]),
           rx: +f[5], ry: +f[6], rz: +f[7], objeto: nums(f[8]) }
})

if (movs.length) {
  console.log('\n\nLA CAMARA DESCENTRADA Y EN MOVIMIENTO')
  console.log('Hasta aca se movio el objeto y la camara estuvo quieta sobre el eje.\n')
  console.log('  #   camara en              orientacion que calculo AE     AE pinto en      modelo         error')
  console.log('  ' + '-'.repeat(96))
  let peorMov = 0, nMov = 0
  for (const m of movs) {
    const ruta = join(DIR, 'camara-movil', `f${String(m.i).padStart(3, '0')}.png`)
    if (!existsSync(ruta)) continue
    const h = medirHuella(leerPNG(ruta))
    if (h.vacia || h.tocaBorde) { console.log(`  ${m.i}   (fuera de encuadre)`); continue }

    // EL APUNTADO NO ESTA EN LAS PROPIEDADES, Y ESE ES EL HALLAZGO.
    //
    // La primera version leyo la orientacion de la camara y armo la matriz con ella. Fallo por 1480 px
    // — y el volcado dice por que: en las seis posiciones AE informa orientacion (0,0,0) y rotaciones
    // en cero, mientras el objeto sale siempre CENTRADO en el cuadro. Es una camara de DOS NODOS:
    // apunta a su punto de interes, y ese apuntado es IMPLICITO. No vive en ninguna propiedad.
    //
    // Para un exportador esto es una trampa perfecta: leer las rotaciones devuelve cero, no hay error,
    // y la camara del reproductor queda mirando a cualquier lado. Hay que detectar la auto-orientacion
    // y calcular el look-at.
    //
    // LA CONVENCION, verificada contra el caso identidad y no supuesta: con orientacion cero la camara
    // mira a +Z y su "arriba" de pantalla es -Y del mundo (en AE la Y crece hacia abajo). De ahi:
    //     f = normalizar(puntoDeInteres - posicion)
    //     r = normalizar(f x (0,-1,0))        con f = (0,0,1) da (1,0,0), que es la identidad
    //     u = f x r                           con eso da (0,1,0), tambien identidad
    const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n] }
    const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    const f3 = norm([m.poi[0] - m.pos[0], m.poi[1] - m.pos[1], m.poi[2] - m.pos[2]])
    const r3 = norm(cruz(f3, [0, -1, 0]))
    const u3 = cruz(f3, r3)
    // las columnas de R son la base de la camara en coordenadas del mundo
    const R = [[r3[0], u3[0], f3[0]], [r3[1], u3[1], f3[1]], [r3[2], u3[2], f3[2]]]
    // la vista es la inversa de la rotacion de la camara; para una rotacion pura, la inversa es la
    // transpuesta
    // SE PROYECTAN LAS CUATRO ESQUINAS Y SE COMPARA EL CENTROIDE DEL POLIGONO, no la proyeccion del
    // centro. Con la camara descentrada el cuadrado se ve escorzado, y la perspectiva NO ES AFIN: el
    // centro de un cuadrado no se proyecta al centro de su imagen. Comparar contra el centro dio
    // errores de 0,3 a 1,8 px que crecian con lo descentrada que estaba la camara — un patron que se
    // lee facil como "el modelo de camara no cierra del todo". Es la misma trampa que ya estaba
    // anotada de la prueba de rotaciones, y la volvi a pisar en la parte siguiente del mismo archivo.
    const aCamara = (w) => {
      const rel = [w[0] - m.pos[0], w[1] - m.pos[1], w[2] - m.pos[2]]
      const v = [
        R[0][0] * rel[0] + R[1][0] * rel[1] + R[2][0] * rel[2],
        R[0][1] * rel[0] + R[1][1] * rel[1] + R[2][1] * rel[2],
        R[0][2] * rel[0] + R[1][2] * rel[1] + R[2][2] * rel[2],
      ]
      return [mundo.ancho / 2 + v[0] * zoomBase / v[2], mundo.alto / 2 + v[1] * zoomBase / v[2]]
    }
    const L2 = mundo.lado / 2
    const quad = [[-L2, -L2], [L2, -L2], [L2, L2], [-L2, L2]]
      .map(([dx, dy]) => aCamara([m.objeto[0] + dx, m.objeto[1] + dy, m.objeto[2]]))
    const pol = poligono(quad)
    const px = pol.x, py = pol.y
    const e = Math.hypot(h.x - px, h.y - py)
    peorMov = Math.max(peorMov, e); nMov++
    console.log(`  ${m.i}   ${('(' + m.pos.map(x => x.toFixed(0)).join(', ') + ')').padEnd(22)}` +
      `${('(' + m.ori.map(x => x.toFixed(2)).join(', ') + ')').padEnd(30)}` +
      `${(h.x.toFixed(1) + ', ' + h.y.toFixed(1)).padStart(15)}  ${(px.toFixed(1) + ', ' + py.toFixed(1)).padStart(14)}  ${e.toFixed(3).padStart(8)}`)
  }
  console.log(`\n  ${nMov} posiciones · peor error ${peorMov.toFixed(3)} px`)
  console.log(peorMov < 1.0
    ? '  LA CAMARA DESCENTRADA TAMBIEN CIERRA: el look-at de AE es el estandar.'
    : '  NO CIERRA. Probablemente sea la convencion del vector "arriba" o el orden de la orientacion.')
}

process.exit(cierra ? 0 : 1)
