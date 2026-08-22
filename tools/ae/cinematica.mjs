// LA CINEMATICA DEL DOCUMENTO, SIN NAVEGADOR Y SIN PIXELES.
//
// Es la misma cadena que arma `comp3d.html` —evaluar la propiedad en un instante, componer la matriz
// de la capa, poner la camara, proyectar— pero devolviendo NUMEROS en vez de dibujar. Con eso se puede
// preguntar donde cae cada esquina de cada capa en cada cuadro sin abrir un navegador ni renderizar
// nada, que es lo que hace posible medir el ritmo de una pieza en milisegundos.
//
// POR QUE ESTA APARTE Y NO COPIADO ADENTRO DE LA METRICA. Dos implementaciones de la misma cuenta
// divergen, y divergen en silencio: la metrica mediria una pieza que no es la que se va a ver, y como
// las dos serian plausibles nadie se enteraria. Este repo ya pago esa factura mas de una vez. Aca la
// cuenta esta escrita UNA vez; y como ademas el reproductor expone `__esquinas`, la coincidencia entre
// los dos se puede MEDIR en vez de confiarse — es lo que hace `ritmo.mjs --contra`.
//
// Se importa `three` de verdad, no una reimplementacion de matrices de 4x4: las mismas clases que usa
// el reproductor, con los mismos redondeos.

import * as THREE from 'three'
import { evaluar } from './curvas.mjs'

const gr = Math.PI / 180
export const mRotX = (g) => new THREE.Matrix4().makeRotationX(g * gr)
export const mRotY = (g) => new THREE.Matrix4().makeRotationY(g * gr)
export const mRotZ = (g) => new THREE.Matrix4().makeRotationZ(g * gr)

export function evaluarPista(pista, t) {
  const tr = pista.tramos
  if (!tr.length) return null
  if (t <= tr[0].t1) return tr[0].v1
  const ult = tr[tr.length - 1]
  if (t >= ult.t2) return ult.v2
  let j = 0
  while (j < tr.length - 1 && t >= tr[j + 1].t1) j++
  const s = tr[j]
  if (s.tipo === 'rechazado') return s.v1
  if (s.tipo === 'hold') return s.v1
  const u = (t - s.t1) / (s.t2 - s.t1)
  if (s.tipo === 'lineal') return s.v1 + (s.v2 - s.v1) * u
  return s.v1 + (s.v2 - s.v1) * evaluar(s.bezier, u)
}

// UNA PISTA HORNEADA ES UNA MUESTRA POR CUADRO, y entre cuadros se interpola LINEAL. No es un atajo:
// el obturador pide instantes a mitad de cuadro y hay que contestarle algo. El error de esa
// interpolación está MEDIDO y viaja en el documento (`exprError`), así que no se supone: `expr-check`
// lo lee y reprueba si una expresión se muestreó demasiado grueso para su propia frecuencia.
function horneadoEn(h, t, fps, comp, porDefecto) {
  const f = t * fps
  const i0 = Math.floor(f)
  const a = h[Math.max(0, Math.min(h.length - 1, i0))]
  const b = h[Math.max(0, Math.min(h.length - 1, i0 + 1))]
  if (!a) return porDefecto
  const va = a[comp] ?? a[0] ?? porDefecto
  if (!b) return va
  const vb = b[comp] ?? b[0] ?? va
  const u = f - i0
  return va + (vb - va) * (u < 0 ? 0 : u > 1 ? 1 : u)
}

export const FPS_DOC = { v: 30 }

export function propEn(T, nombre, comp, t, porDefecto) {
  const p = T?.[nombre]
  if (!p) return porDefecto
  if (p.horneado) return horneadoEn(p.horneado, t, FPS_DOC.v, comp, porDefecto)
  if (p.estatico) return p.estatico[comp] ?? porDefecto
  const pista = p.pistas?.[comp]
  if (!pista) return p.base?.[comp] ?? porDefecto
  const v = evaluarPista(pista, t)
  return v === null ? porDefecto : v
}

// EL RECTANGULO DE LA CAPA EN SUS PROPIAS COORDENADAS.
//
// Cada tipo de capa lo obtiene de un lado distinto, y son exactamente los mismos lados de los que sale
// la geometria en el reproductor — un solido de su tamaño declarado, una forma de su caja rasterizada,
// un texto de la caja que midio AE. Devuelve null cuando la capa no dibuja nada (una camara, una capa
// sin contenido): esas no tienen peso visual y no participan de ninguna metrica.
export function rectanguloDe(capa) {
  if (capa.tipo === 'solido' && capa.solido) {
    return { x0: 0, y0: 0, x1: capa.solido.ancho, y1: capa.solido.alto }
  }
  if (capa.raster) {
    const x0 = capa.raster.caja.x - capa.raster.margen
    const y0 = capa.raster.caja.y - capa.raster.margen
    return { x0, y0, x1: x0 + capa.raster.ancho, y1: y0 + capa.raster.alto }
  }
  if (capa.tipo === 'av' && capa.origen?.copiado) {
    return { x0: 0, y0: 0, x1: capa.origen.ancho, y1: capa.origen.alto }
  }
  // EL TEXTO USA LA CAJA QUE MIDIO AE, no una estimacion nuestra. La metrica pregunta por el PESO
  // VISUAL, y para eso la caja de AE es mejor fuente que la del navegador: es la que corresponde a los
  // pixeles contra los que se compara todo lo demas.
  if (capa.tipo === 'texto' && capa.caja) {
    const c = capa.caja
    return { x0: c.x, y0: c.y, x1: c.x + c.ancho, y1: c.y + c.alto }
  }
  return null
}

// ---------------------------------------------------------------- el evaluador de una composicion
export function cinematica(doc) {
  const { ancho, alto, fps } = doc.comp
  FPS_DOC.v = fps   // `propEn` es una funcion suelta y no recibe el documento; la cadencia se fija aca
  const PHI = new THREE.Matrix4().set(
    1, 0, 0, -ancho / 2,
    0, -1, 0, alto / 2,
    0, 0, -1, 0,
    0, 0, 0, 1)

  const porIndice = new Map(doc.capas.map(c => [c.indice, c]))
  const camaraDoc = doc.capas.find(c => c.tipo === 'camara') || null

  const zoomPorDefecto = ancho * 50 / 36
  const camara = new THREE.PerspectiveCamera(1, ancho / alto, 1, 100000)
  camara.matrixAutoUpdate = false
  const camara2D = new THREE.OrthographicCamera(-ancho / 2, ancho / 2, alto / 2, -alto / 2, -10000, 10000)
  camara2D.position.z = 1000
  camara2D.updateMatrixWorld()

  function ponerCamara(t) {
    let zoom = zoomPorDefecto
    let pos = [ancho / 2, alto / 2, -zoom], poi = [ancho / 2, alto / 2, 0]
    let apunta = true, ori = [0, 0, 0], TC = {}
    if (camaraDoc) {
      const T = TC = camaraDoc.transformacion
      zoom = camaraDoc.camara?.zoom || zoomPorDefecto
      if (T.zoom) zoom = propEn(T, 'zoom', 0, t, zoom)
      // LA CAMARA TAMBIEN PUEDE TENER LAS DIMENSIONES SEPARADAS, y eso ya se contemplaba para las
      // capas y no para ella. Separar dimensiones es la forma limpia de evitar que AE le invente una
      // curvatura al camino (las tangentes espaciales, que no se pueden portar), asi que es lo que hace
      // toda camara autorada con cuidado — y era justo la que se leia como quieta. Sin error: el
      // documento traia posX/posY/posZ y aca se preguntaba por 'posicion', que no existia, asi que la
      // camara se quedaba en su valor por defecto los 450 cuadros.
      const ejeC = (n2D, n3D, comp2, def) => camaraDoc.separadas ? propEn(T, n3D, 0, t, def) : propEn(T, n2D, comp2, t, def)
      pos = [ejeC('posicion', 'posX', 0, pos[0]), ejeC('posicion', 'posY', 1, pos[1]), ejeC('posicion', 'posZ', 2, pos[2])]
      poi = [propEn(T, 'anclaje', 0, t, poi[0]), propEn(T, 'anclaje', 1, t, poi[1]), propEn(T, 'anclaje', 2, t, poi[2])]
      apunta = camaraDoc.camara?.apuntaAlPunto !== false
      ori = [propEn(T, 'orientacion', 0, t, 0), propEn(T, 'orientacion', 1, t, 0), propEn(T, 'orientacion', 2, t, 0)]
    }
    camara.fov = 2 * Math.atan(alto / (2 * zoom)) * 180 / Math.PI
    camara.updateProjectionMatrix()

    const B = new THREE.Matrix4()
    if (apunta) {
      const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n] }
      const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
      const ff = norm([poi[0] - pos[0], poi[1] - pos[1], poi[2] - pos[2]])
      const rr = norm(cruz(ff, [0, -1, 0]))
      const uu = cruz(ff, rr)
      B.set(rr[0], uu[0], ff[0], 0, rr[1], uu[1], ff[1], 0, rr[2], uu[2], ff[2], 0, 0, 0, 0, 1)
    }
    B.multiply(mRotX(propEn(TC, 'rotacionX', 0, t, 0)))
     .multiply(mRotY(propEn(TC, 'rotacionY', 0, t, 0)))
     .multiply(mRotZ(propEn(TC, 'rotacion', 0, t, 0)))
     .multiply(mRotX(ori[0])).multiply(mRotY(ori[1])).multiply(mRotZ(ori[2]))
    const e = B.elements
    const r = [e[0], e[1], e[2]], u = [e[4], e[5], e[6]], f = [e[8], e[9], e[10]]

    const A = (v) => [v[0], -v[1], -v[2]]
    const cx = A(r), cy = A(u).map(x => -x), cz = A(f).map(x => -x)
    const p = [pos[0] - ancho / 2, -(pos[1] - alto / 2), -pos[2]]
    camara.matrix.set(
      cx[0], cy[0], cz[0], p[0],
      cx[1], cy[1], cz[1], p[1],
      cx[2], cy[2], cz[2], p[2],
      0, 0, 0, 1)
    camara.matrixWorld.copy(camara.matrix)
    camara.matrixWorldInverse.copy(camara.matrix).invert()
  }

  const matrices = new Map()
  function matrizDe(indice, t) {
    if (matrices.has(indice)) return matrices.get(indice)
    const c = porIndice.get(indice)
    if (!c) return new THREE.Matrix4()
    const T = c.transformacion
    const ax = propEn(T, 'anclaje', 0, t, 0), ay = propEn(T, 'anclaje', 1, t, 0), az = propEn(T, 'anclaje', 2, t, 0)
    const px = c.separadas ? propEn(T, 'posX', 0, t, 0) : propEn(T, 'posicion', 0, t, 0)
    const py = c.separadas ? propEn(T, 'posY', 0, t, 0) : propEn(T, 'posicion', 1, t, 0)
    const pz = c.separadas ? propEn(T, 'posZ', 0, t, 0) : propEn(T, 'posicion', 2, t, 0)
    const sx = propEn(T, 'escala', 0, t, 100) / 100
    const sy = propEn(T, 'escala', 1, t, 100) / 100
    const sz = propEn(T, 'escala', 2, t, 100) / 100

    const M = new THREE.Matrix4().makeTranslation(px, py, pz)
    if (c.es3D) {
      M.multiply(mRotX(propEn(T, 'orientacion', 0, t, 0)))
      M.multiply(mRotY(propEn(T, 'orientacion', 1, t, 0)))
      M.multiply(mRotZ(propEn(T, 'orientacion', 2, t, 0)))
      M.multiply(mRotX(propEn(T, 'rotacionX', 0, t, 0)))
      M.multiply(mRotY(propEn(T, 'rotacionY', 0, t, 0)))
    }
    M.multiply(mRotZ(propEn(T, 'rotacion', 0, t, 0)))
    M.multiply(new THREE.Matrix4().makeScale(sx, sy, sz))
    M.multiply(new THREE.Matrix4().makeTranslation(-ax, -ay, -az))
    const total = c.padre ? matrizDe(c.padre, t).clone().multiply(M) : M
    matrices.set(indice, total)
    return total
  }

  const v3 = new THREE.Vector3()
  // LAS CUATRO ESQUINAS EN PIXELES DE PANTALLA, en el mismo orden que entrega `PlaneGeometry`
  // (arriba-izq, arriba-der, abajo-izq, abajo-der). El orden importa: el area del cuadrilatero se
  // calcula recorriendolo, y recorrer un rectangulo en zigzag da area cero.
  function esquinas(capa, t) {
    const R = rectanguloDe(capa)
    if (!R) return null
    const M = new THREE.Matrix4().copy(PHI).multiply(matrizDe(capa.indice, t))
    const enElMundo = capa.es3D || !camaraDoc
    const cam = enElMundo ? camara : camara2D
    const orden = [[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]]
    return orden.map(([x, y]) => {
      v3.set(x, y, 0).applyMatrix4(M).project(cam)
      return [(v3.x + 1) / 2 * ancho, (1 - v3.y) / 2 * alto]
    })
  }

  // el centro de la capa, proyectado. NO es la proyeccion del centro salvo en ortografica, asi que se
  // usa el centroide del cuadrilatero proyectado: la perspectiva no es afin y confundirlas ya costo un
  // diagnostico falso (cuaderno, seccion 58).
  const centroide = (q) => [
    (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4,
    (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4,
  ]

  const areaPoligono = (q) => {
    let a = 0
    for (let i = 0; i < q.length; i++) {
      const j = (i + 1) % q.length
      a += q[i][0] * q[j][1] - q[j][0] * q[i][1]
    }
    return Math.abs(a) / 2
  }

  // LA PROFUNDIDAD ES LA DEL EJE DE LA CAMARA, NO LA DISTANCIA AL OJO.
  //
  // Parecen lo mismo y no lo son, y la diferencia es visible: un rotulo puesto 6 unidades DELANTE de su
  // tarjeta, pero mas abajo en el cuadro, queda mas LEJOS del ojo que la tarjeta — y ordenando por
  // distancia euclidea el rotulo se dibuja detras de su propia tarjeta. Lo encontro la compuerta M7
  // sobre esta misma pieza: "capa 43 (texto '1:1 exacto') y capa 45 (tarjeta-2) a 0,08 de profundidad".
  // Con distancia al eje, una capa que esta delante lo esta siempre, mire la camara desde donde mire.
  //
  // Es ademas lo que significa el algoritmo del pintor y lo que hace el 3D Clasico de AE.
  function profundidad(capa, t) {
    const R = rectanguloDe(capa)
    if (!R) return null
    const M = new THREE.Matrix4().copy(PHI).multiply(matrizDe(capa.indice, t))
    v3.set((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, 0).applyMatrix4(M).applyMatrix4(camara.matrixWorldInverse)
    return -v3.z
  }

  function enCuadro(f) {
    matrices.clear()
    ponerCamara(f / fps)
  }

  // el desplazamiento aparente que la camara le impone a un punto fijo del centro, en pixeles
  function puntoFijo() {
    v3.set(0, 0, 0).project(camara)
    return [(v3.x + 1) / 2 * ancho, (1 - v3.y) / 2 * alto]
  }

  return { ancho, alto, fps, camaraDoc, enCuadro, esquinas, centroide, areaPoligono, profundidad, puntoFijo, matrizDe, PHI, camara }
}
