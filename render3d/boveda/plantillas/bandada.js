// PLANTILLA "bandada" — laminas cayendo en cascada, y la camara subiendo contra la caida.
//
// EL GESTO
// Todo baja y la camara sube. Es la unica plantilla del catalogo con movimiento CONTRARIO al del
// espectador, y esa contradiccion es todo su efecto: la velocidad relativa se duplica sin que la
// camara vaya mas rapido, y cada lamina que pasa lo hace en un tercio del tiempo que tardaria si
// fueran en el mismo sentido.
//
// Es la plantilla de energia: deporte, musica, gaming, bebidas, cualquier marca que quiera leerse
// rapida. Y es la que peor le sienta a un banco, que es exactamente el punto de tener doce.
//
// EL VUELO ES VERTICAL, y ninguno de los tres de `movimiento.js` lo es — son en linea, en circulo y de
// costado. Se escribe aca. Cumple las mismas reglas: no se detiene nunca, y la deriva sale de dos senos
// de periodos inconmensurables para que no vuelva a alinearse.
//
// LOS SEIS TIEMPOS (beats sobre 34)
//   0   ESPACIO   la cascada cayendo, la camara subiendo contra ella. Nada de texto.
//   4   MARCA     el nombre sube CON la camara mientras todo lo demas baja.
//   9   PROMESA   el claim entra desde abajo, que es de donde no viene nada.
//   15  PRUEBA    la pagina sube desde abajo y la cascada se abre a su alrededor.
//   22  RAZONES   las cifras caen con la cascada, a distinta velocidad que las laminas.
//   28  PEDIDO    la caida se frena, la camara sube mas despacio y el CTA queda al frente.

import { THREE, vidrio, metal, luz, iluminar, domo, polvo, prismaDe } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'bandada',
  nombre: 'Bandada',
  familia: 'energia',
  necesita: ['nada'],
  beats: 34,
  tiempos: { espacio: 0, marca: 4, promesa: 9, prueba: 15, razones: 22, pedido: 28 },
  pitch: 'Una cascada de láminas cayendo y la cámara subiendo contra ella. Rápido, de deporte y música.',
}

const N = 300

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes: no hay una
  // rama distinta ni un caso especial. Lo que se modula es el GRADO, nunca la idea.
  //
  // La explicacion larga de cada receta esta en `render3d/boveda/recetas.js`, y la de por que existe
  // este mecanismo, en `atrio.js`.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const respiraciones = []

  iluminar(escena, { key: 1.3, relleno: 0.85 })
  const uDomo = domo(escena, { fuerza: 0.30 })
  const motas = polvo(escena, 1200, 28)

  // ---------------------------------------------------------------- el vuelo vertical
  const SUBIDA = mundoH * 4.2
  const DERIVA = 0.55
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(meta.beats), ease: 'none' }, 0)
  const yEn = (beat) => -SUBIDA * 0.35 + SUBIDA * (Math.min(beat, meta.beats) / meta.beats)
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el espacio: la cascada
  //
  // Instanciada, por lo mismo que `cardumen`: trescientas mallas sueltas son trescientas llamadas de
  // dibujo por submuestra de obturador, o sea mil doscientas por cuadro.
  const cascada = new THREE.InstancedMesh(
    // La lamina de la cascada tambien sigue la forma de la marca; se toma la geometria porque
    // `InstancedMesh` no acepta una malla.
    prismaDe(0.42, 0.05, R.dureza, null).geometry,
    vidrio(colorDePeso(R, LOOK.acento, 0.20), { rug: 0.09, trans: 0.60, grosor: 0.9, opacidad: 0.93 }), N)
  cascada.frustumCulled = false
  escena.add(cascada)
  const chispas = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.10, 0.30, 0.02), luz(LOOK.acento2 || LOOK.acento, 1.4), 220)
  chispas.frustumCulled = false
  escena.add(chispas)

  let sem = 4471
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }
  const hacer = (n, radMin, radMax) => {
    const out = []
    for (let i = 0; i < n; i++) {
      out.push({
        x: (az() - 0.5) * mundoW * 3.4,
        // ALTO REPARTIDO EN UN TRAMO MAS LARGO QUE LA SUBIDA: la cascada se recicla por modulo, asi que
        // el tramo tiene que cubrir todo lo que la camara va a recorrer o se ven los saltos del ciclo.
        y0: az() * SUBIDA * 2.2,
        z: -distBase * (radMin + az() * (radMax - radMin)),
        v: 0.55 + az() * 1.5,
        g: az() * 6.28,
      })
    }
    return out
  }
  const laminas = hacer(N, 0.05, 1.1)
  const chispitas = hacer(220, 0.5, 2.2)
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1)

  // Dos paredes lejanas que suben en sentido contrario a la cascada: son la referencia fija que hace
  // que la caida se lea como caida. Sin nada quieto, todo lo que se mueve junto se ve inmovil.
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, SUBIDA * 3, 0.5), metal(nivel(0.12), 0.36))
    p.position.set(sx * mundoW * 1.5, 0, -distBase * 1.5)
    escena.add(p)
  }

  // ---------------------------------------------------------------- los bloques
  const marca = bloqueMarca({ alto: 1.25, anchoMax: UTIL(0.9) * 0.90 , margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.50, anchoMax: UTIL(0.95) * 0.88, maxLineas: 3 , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.48, ar: 1.55 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.74, anchoMax: UTIL(0.85) * 0.46 , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.28, anchoMax: UTIL(0.85) * 0.78 , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.31, anchoMax: UTIL(0.85) * 0.60 , margen: R.margen })

  // Los bloques se plantan a la altura del beat en que se leen, igual que `zEn` en un avance. Y como la
  // camara SUBE, un bloque quieto sale del cuadro por abajo: los que duran mucho suben con ella.
  const enBeat = (g, beat, x, z) => { g.position.set(x || 0, yEn(beat), z || 0) }
  const subirCon = (g, t0, t1, retraso) => {
    tl.to(g.position, { y: g.position.y + (yEn(t1) - yEn(t0)) * (retraso != null ? retraso : 1), duration: b(t1 - t0), ease: 'none' }, b(t0))
  }

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    enBeat(marca.g, 5.6, 0, distBase * 0.06)
    escena.add(marca.g)
    entra(marca.g, tl, 4, { desde: 'abajo', dist: 5, dur: 1.5 })
    subirCon(marca.g, 5.6, 8.6, 0.95)
    marca.escribir(tl, 4.4, 1.25)
    marca.borrar(tl, 8.0)
    sale(marca.g, tl, 8.2, { hacia: 'frente', dist: 5, dur: 0.9 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    enBeat(promesa.g, 10.6, 0, distBase * 0.08)
    escena.add(promesa.g)
    entra(promesa.g, tl, 9, { desde: 'abajo', dist: 6, dur: 1.5 })
    subirCon(promesa.g, 10.6, 13.8, 0.95)
    promesa.escribir(tl, 9.4, 0.9)
    promesa.borrar(tl, 13.0)
    sale(promesa.g, tl, 13.2, { hacia: 'arriba', dist: 6, dur: 1.0 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  if (prueba) {
    enBeat(prueba.g, 17.0, 0, distBase * 0.10)
    prueba.g.rotation.y = 0.5
    pagina.add(prueba.g)
    entra(prueba.g, tl, 15, { desde: 'abajo', dist: 8, dur: 2.0 })
    subirCon(prueba.g, 17.0, 21.4, 0.92)
    prueba.escribir(tl, 15.2, 1.1)
    prueba.recorrer(tl, 16, 5.2, 0.92)
    tl.to(prueba.g.rotation, { y: -0.36, duration: b(5.6), ease: 'none' }, b(15.8))
    sale(prueba.g, tl, 20.8, { hacia: 'frente', dist: 6, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.10, giro: 0.024, fase: 2.4 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // LAS CIFRAS CAEN CON LA CASCADA, no suben con la camara: son lo unico de la pieza que se comporta
  // como el espacio y no como el espectador, y por eso pasan rapidisimo. Es a proposito — una cifra es
  // un golpe, no una lectura.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 22 + i * 1.8
    enBeat(c.g, t0 + 1.4, s * mundoW * 0.24, distBase * 0.10)
    c.g.rotation.y = s * 0.22
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: 'arriba', dist: 5, dur: 1.2 })
    c.escribir(tl, t0 + 0.25, 0.7)
    sale(c.g, tl, t0 + 1.9, { hacia: 'abajo', dist: 5.5, dur: 0.9 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 22.6 + i * 2.4
    enBeat(f.g, t0 + 1.0, 0, distBase * 0.08)
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'izq', dist: 5, dur: 1.3 })
    subirCon(f.g, t0 + 1.0, t0 + 2.4, 0.9)
    f.escribir(tl, t0 + 0.35, 0.78)
    f.borrar(tl, t0 + 2.0)
    sale(f.g, tl, t0 + 2.2, { hacia: 'der', dist: 5, dur: 0.9 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  const freno = { k: 1 }
  let latido = null
  if (pedido) {
    enBeat(pedido.g, 29.4, 0, distBase * 0.12)
    escena.add(pedido.g)
    entra(pedido.g, tl, 28, { desde: 'abajo', dist: 5, dur: 1.7 })
    subirCon(pedido.g, 29.4, meta.beats, 1.0)
    pedido.escribir(tl, 28.4, 0.88)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    // LA CASCADA FRENA AL 22%, NO A CERO. Frenarla del todo dejaria la pieza congelada justo donde
    // hace falta leer — que es el problema opuesto y no mejor. Baja lo suficiente para que el CTA gane
    // el cuadro, y sigue corriendo.
    tl.to(freno, { k: 0.22, duration: b(2.6), ease: E.frena(2.2) }, b(27.4))
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.8, duration: b(2.6), ease: E.frena(2) }, b(27.6))
  }

  // ---------------------------------------------------------------- lo continuo
  const TRAMO = SUBIDA * 2.2
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const kk = est.k
    camara.position.set(
      Math.sin(t * 0.31) * DERIVA,
      -SUBIDA * 0.35 + SUBIDA * kk + Math.sin(t * 0.23 + 1.1) * DERIVA * 0.5,
      distBase * 0.92)
    camara.rotation.set(0, 0, Math.sin(t * 0.17 + 0.4) * 0.014)
    const caida = t * 2.6 * freno.k
    const mover = (mesh, arr, giro) => {
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i]
        // El modulo es lo que hace infinita a la cascada: una lamina que sale por abajo vuelve arriba.
        const y = ((p.y0 - caida * p.v) % TRAMO + TRAMO) % TRAMO - TRAMO * 0.35
        _p.set(p.x + Math.sin(t * 0.4 + p.g) * 0.18, y, p.z)
        _e.set(0, p.g + t * 0.1 * p.v, Math.sin(t * 0.5 + p.g) * giro)
        _q.setFromEuler(_e)
        _m.compose(_p, _q, _s)
        mesh.setMatrixAt(i, _m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    mover(cascada, laminas, 0.22)
    mover(chispas, chispitas, 0.5)
    motas.position.y = camara.position.y
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
