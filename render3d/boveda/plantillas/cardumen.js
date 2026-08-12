// PLANTILLA "cardumen" — cientos de piezas chicas moviendose juntas, y la camara atravesandolas.
//
// EL GESTO
// Cantidad. Donde `monolito` tiene un objeto, aca hay cuatrocientos, todos iguales y todos moviendose
// en formacion. La camara los atraviesa y el banco se ABRE a su paso, dejando un claro justo donde va
// el texto. Es el efecto mas caro de simular a mano y el mas barato de conseguir bien: la apertura no
// se anima, se calcula.
//
// Es la plantilla de escala numerica: una comunidad, una base de usuarios, un catalogo, una flota.
//
// COMO SE ABRE EL CARDUMEN, que es la unica idea tecnica de este archivo. Cada pieza mira en cada
// instante cuanto se acerco la camara a su eje; si esta cerca, se corre hacia afuera en proporcion
// inversa a la distancia. Con eso, un tunel limpio sigue a la camara sin que nadie lo haya animado, y
// el claro esta SIEMPRE donde hace falta aunque cambien los beats o la duracion.
//
// Va en `alSeek` y no en tweens por la razon de siempre y una mas: son cuatrocientas piezas, y
// cuatrocientos tweens es una linea de tiempo que tarda mas en construirse que la pieza en renderizar.
//
// LOS SEIS TIEMPOS (beats sobre 40)
//   0   ESPACIO   el banco entero moviendose, la camara entrando por un costado. Nada de texto.
//   5   MARCA     el banco se abre y el nombre queda en el claro.
//   12  PROMESA   el claim baja por el tunel que la camara viene abriendo.
//   18  PRUEBA    la pagina se forma en el centro y el banco la rodea.
//   27  RAZONES   las cifras salen disparadas del banco, una por costado.
//   34  PEDIDO    el banco se aquieta, se abre del todo y el CTA queda solo.

import { THREE, vidrio, metal, luz, iluminar, domo, polvo } from '../nucleo.js'
import { vueloAvance, entra, sale, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'cardumen',
  nombre: 'Cardumen',
  familia: 'multitud',
  necesita: ['nada'],
  beats: 40,
  tiempos: { espacio: 0, marca: 5, promesa: 12, prueba: 18, razones: 27, pedido: 34 },
  pitch: 'Cientos de piezas en formación que se abren al paso de la cámara. De comunidad, catálogo o flota.',
}

const N = 420

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  iluminar(escena, { key: 1.15, relleno: 0.7 })
  const uDomo = domo(escena, { fuerza: 0.26 })
  const motas = polvo(escena, 900, 26)

  const DERIVA = 0.5
  const LARGO = distBase * 5.0
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: LARGO, desde: 0.9, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el espacio: el banco
  //
  // UNA SOLA MALLA INSTANCIADA y no cuatrocientas mallas. La diferencia no es de estilo: cuatrocientos
  // objetos sueltos son cuatrocientas llamadas de dibujo por cuadro, y por cuatro submuestras de
  // obturador son mil seiscientas. Con instancias es UNA. Es lo que hace que esta plantilla cueste lo
  // mismo que las demas.
  const geo = new THREE.BoxGeometry(0.30, 0.30, 0.05)
  const mat = vidrio(LOOK.acento, { rug: 0.08, trans: 0.55, grosor: 0.8, opacidad: 0.95 })
  const banco = new THREE.InstancedMesh(geo, mat, N)
  banco.frustumCulled = false
  escena.add(banco)

  // Y una segunda capa, mas chica y mas lejos, en emisivo: son los "puntos" del fondo. Dan densidad sin
  // pedir transmision, que es lo caro del vidrio.
  const banco2 = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.14, 0.03), luz(LOOK.acento2 || LOOK.acento, 1.1), 260)
  banco2.frustumCulled = false
  escena.add(banco2)

  let sem = 9931
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }
  const piezas = []
  for (let i = 0; i < N; i++) {
    piezas.push({
      // Coordenadas cilindricas: el banco es un tubo hueco alrededor del eje de vuelo. Un bloque solido
      // taparia el cuadro; un tubo deja el corredor libre y ademas se abre mejor.
      ang: az() * Math.PI * 2,
      rad: mundoW * (0.42 + az() * 1.5),
      z: distBase * 0.8 - az() * LARGO * 1.15,
      f: az() * 6.28,
      v: 0.5 + az(),
    })
  }
  const piezas2 = []
  for (let i = 0; i < 260; i++) {
    piezas2.push({ ang: az() * Math.PI * 2, rad: mundoW * (1.2 + az() * 2.6), z: distBase * 0.8 - az() * LARGO * 1.4, f: az() * 6.28, v: 0.3 + az() * 0.6 })
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1)

  // ---------------------------------------------------------------- los bloques
  const marca = bloqueMarca({ alto: 1.3, anchoMax: UTIL(0.9) * 0.90 })
  const promesa = bloquePromesa({ alto: 0.54, anchoMax: UTIL(0.95) * 0.88 })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.5, ar: 1.6 })
  const cifras = bloquesCifra(3, { alto: 0.78, anchoMax: UTIL(0.85) * 0.46 })
  const frases = bloquesFrase(2, { alto: 0.29, anchoMax: UTIL(0.85) * 0.80 })
  const pedido = bloquePedido({ alto: 0.33, anchoMax: UTIL(0.85) * 0.62 })

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    marca.g.position.set(0, 0.35, zEn(6.6, distBase * 0.9))
    escena.add(marca.g)
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 7, dur: 1.9 })
    marca.escribir(tl, 5.4, 1.35)
    marca.borrar(tl, 10.2)
    sale(marca.g, tl, 10.4, { hacia: 'arriba', dist: 6, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    promesa.g.position.set(0, 0, zEn(13.6, distBase * 0.95))
    escena.add(promesa.g)
    entra(promesa.g, tl, 12, { desde: 'arriba', dist: 6.5, dur: 1.7 })
    promesa.escribir(tl, 12.4, 0.98)
    promesa.borrar(tl, 16.4)
    sale(promesa.g, tl, 16.6, { hacia: 'abajo', dist: 7, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  if (prueba) {
    prueba.g.position.set(0, 0, zEn(20.6, distBase * 1.0))
    prueba.g.rotation.y = -0.5
    pagina.add(prueba.g)
    entra(prueba.g, tl, 18, { desde: 'izq', dist: 7, dur: 2.2 })
    prueba.escribir(tl, 18.2, 1.2)
    prueba.recorrer(tl, 19, 6.2, 0.92)
    tl.to(prueba.g.rotation, { y: 0.34, duration: b(6.6), ease: 'none' }, b(18.8))
    sale(prueba.g, tl, 25.2, { hacia: 'der', dist: 7, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.12, giro: 0.026, fase: 0.8 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 27 + i * 2.2
    c.g.position.set(s * mundoW * 0.24, 0.9 - i * 0.85, zEn(t0 + 0.9, distBase * 0.92))
    c.g.rotation.y = s * 0.24
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.75)
    sale(c.g, tl, t0 + 2.2, { hacia: s < 0 ? 'izq' : 'der', dist: 5.5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 27.8 + i * 2.7
    f.g.position.set(0, -1.8, zEn(t0 + 0.9, distBase * 0.88))
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.82)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  const est = { apertura: 1 }
  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0.1, zEn(meta.beats - 1.0, distBase * 0.82))
    escena.add(pedido.g)
    entra(pedido.g, tl, 34, { desde: 'fondo', dist: 6, dur: 2.0 })
    pedido.escribir(tl, 34.4, 0.9)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // EL BANCO SE ABRE DEL TODO. `apertura` multiplica el empuje del claro, asi que subirlo a 2.4 no
    // dispara cuatrocientos tweens: cambia un numero que ya se estaba leyendo en cada submuestra.
    tl.to(est, { apertura: 2.4, duration: b(3.0), ease: E.frena(2.2) }, b(33.4))
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.7, duration: b(2.6), ease: E.frena(2) }, b(34))
  }

  // ---------------------------------------------------------------- lo continuo: el claro
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    const cz = camara.position.z
    const mover = (mesh, arr, radioMin, amp) => {
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i]
        // El nado: cada pieza deriva en su angulo y en su radio, con su propia velocidad y su fase.
        const ang = p.ang + Math.sin(t * 0.21 * p.v + p.f) * 0.14 + t * 0.012
        let rad = p.rad + Math.sin(t * 0.33 * p.v + p.f * 1.7) * amp
        // LA APERTURA. `d` es cuanto falta para que la camara llegue a esta pieza; cuando es chico, la
        // pieza se corre hacia afuera. El `+1` evita la division por cero cuando la camara la cruza.
        const d = Math.abs(p.z - cz)
        rad += (radioMin * 2.6 * est.apertura) / (1 + d * d * 0.09)
        _p.set(Math.cos(ang) * rad, Math.sin(ang) * rad, p.z)
        _e.set(t * 0.2 * p.v + p.f, ang, t * 0.13 * p.v)
        _q.setFromEuler(_e)
        _m.compose(_p, _q, _s)
        mesh.setMatrixAt(i, _m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    mover(banco, piezas, mundoW * 0.42, 0.22)
    mover(banco2, piezas2, mundoW * 0.9, 0.35)
    motas.position.z = cz
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
