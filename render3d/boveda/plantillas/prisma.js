// PLANTILLA "prisma" — un haz que entra, choca contra un prisma y sale abierto en bandas de color.
//
// EL GESTO
// La luz no se tapa: se DESCOMPONE. Un haz blanco cruza el vacio, golpea un prisma de vidrio y sale
// del otro lado convertido en un abanico de bandas que se van separando mientras se alejan. Cada
// bloque de texto va montado EN una banda, apoyado encima de ella como sobre un renglon de luz, y la
// banda que le toca es la que lo subraya durante todo su tiempo.
//
// EN QUE SE DIFERENCIA DE `eclipse`, que es la otra plantilla que se juega a una sola idea grafica de
// luz: alli la fuente esta TAPADA —un disco mate con un halo— y todo el texto vive contra esa masa
// oscura, que ademas le hace de cama. Aca la fuente esta ABIERTA: no hay masa donde apoyarse, hay
// siete colores separandose y el texto se para sobre ellos. Una habla de misterio, la otra de
// despliegue.
//
// Es la plantilla de marca creativa: diseno, educacion, musica, cultura, una agencia, un estudio. La
// forma dice "de una sola cosa salen muchas" antes de que se lea una palabra, y eso es lo que esas
// marcas venden.
//
// EL VUELO ES PROPIO, y son dos movimientos encadenados sin juntura: la camara ORBITA el prisma
// mientras el haz llega y el abanico se abre, y despues SALE con las bandas, siguiendolas hacia
// afuera. Ninguno de los tres de `movimiento.js` alcanza —orbita y avance son dos vuelos distintos y
// aca hacen falta los dos, uno detras del otro— y lo que no se podia era que la camara se detuviera
// en el empalme. Se resuelve con UNA sola formula continua: una orbita cuyo CENTRO se desliza.
// Mientras el centro esta quieto es una orbita; cuando el centro sale por el eje del abanico, la
// orbita sale con el. No hay dos curvas que empalmar, asi que no hay un beat sin velocidad.
//
// LAS CUENTAS QUE MANDAN (fov 32, mundoW 5.625, mundoH 10, distBase 17.4)
//   · A distancia d el cuadro mide 5.625·d/17.4 de ancho y 10·d/17.4 de alto. La orbita cierra hasta
//     0.80·distBase = 13.9, donde el cuadro mide 4.49 x 7.99: el prisma (2.6 de ancho en su vista mas
//     ancha, 3.6 de alto) entra con margen en los dos ejes en el momento mas cerrado. EL OBJETO
//     PROTAGONICO TIENE QUE ENTRAR EN EL CUADRO, y aca eso se comprueba antes de elegir el tamano.
//   · EL ABANICO SE ABRE Y LA CAMARA SE ALEJA A LA VEZ, y esa es la unica manera de que quepa. La
//     banda mas desviada esta a y = x·tan(0.20) = 0.203·x; en el ultimo punto de lectura (x = 26.6)
//     eso da 5.39, y el semicuadro a la distancia de ahi (24.9) mide 7.16. Entra al 75%. Con la camara
//     a distancia fija, el abanico se habria ido de cuadro alrededor del beat 20.
//   · Por lo mismo, un `alto` fijo en unidades de mundo NO SIRVE en esta plantilla: entre el primer
//     bloque (d 14.3) y el ultimo (d 23.5) la distancia crece 1.6 veces. Todos los tamanos se piden en
//     fraccion de cuadro y se traducen con la distancia REAL de cada bloque.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   el prisma girando en el vacio; el haz llega desde la izquierda, golpea, y el abanico
//                 se abre banda por banda desde el centro. Nada de texto.
//   5   MARCA     el nombre se planta sobre el prisma, de cara a la camara que lo esta rodeando.
//   11  PROMESA   la camara ya salio con las bandas: el claim va montado sobre la banda del nucleo.
//   17  PRUEBA    la pagina se monta sobre el nucleo y la camara la va pasando de largo.
//   25  RAZONES   una cifra por banda, cada una en la suya, separandose entre si porque el abanico se
//                 abre. Las frases van en las dos bandas de al lado del nucleo.
//   32  PEDIDO    la camara baja a velocidad de lectura sin frenar, el espectro entero sube de brillo
//                 y el CTA queda clavado al cuadro sobre el nucleo.
//
// SIN MATERIAL: sin tira, PRUEBA usa el recorte mas grande; sin cifras ni frases, RAZONES se compone
// vacio y por el abanico no pasa mas que luz. Lo que no hay, no se anuncia.

import { THREE, vidrio, luz, iluminar, domo, polvo } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'prisma',
  nombre: 'Prisma',
  familia: 'luz',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 25, pedido: 32 },
  pitch: 'Un haz que se abre en bandas de color y cada bloque montado en la suya. De marca creativa, de diseño, de música.',
}

// ---------------------------------------------------------------- helpers puros (no tocan la paleta)

const suave = (x) => { const s = Math.max(0, Math.min(1, x)); return s * s * (3 - 2 * s) }

// EL AVANCE SE DECLARA COMO VELOCIDAD Y SE INTEGRA, no al reves — y esto es lo que hace que la regla 1
// se cumpla por construccion en vez de por casualidad.
//
// La regla habla de VELOCIDAD ("puede bajar para el pedido, nunca llega a cero"), y una curva de
// POSICION la cumple o no de rebote: un `smoothstep`, que es lo natural para entrar y salir suave,
// tiene velocidad CERO en los dos extremos — o sea camara quieta justo en el pedido, que es el tramo
// donde el defecto se ve entero. Asi que se escribe la velocidad, que es lo que la regla pide: arranca
// en cero porque la camara viene de la orbita y un tiron ahi se nota, sube a crucero, y baja al 45%
// para el pedido. Despues del arranque no vuelve a tocar el cero.
//
// La posicion es su integral y se resuelve una sola vez al cargar el archivo: 512 muestras por punto
// medio. Sobre una curva tan mansa el error de la suma es de milesimas de unidad de mundo.
const VEL = (u) => suave(u / 0.24) * (1 - 0.55 * suave((u - 0.72) / 0.28))
const avance01 = (() => {
  const N = 512
  const tabla = new Float64Array(N + 1)
  for (let i = 1; i <= N; i++) tabla[i] = tabla[i - 1] + VEL((i - 0.5) / N)
  const total = tabla[N] || 1
  for (let i = 0; i <= N; i++) tabla[i] /= total
  return (u) => {
    const x = Math.max(0, Math.min(1, u)) * N
    const i = Math.min(N - 1, Math.floor(x))
    return tabla[i] + (tabla[i + 1] - tabla[i]) * (x - i)
  }
})()

// MEZCLAR COLORES SOBRE LA CADENA HEX, NUNCA SOBRE `.r/.g/.b` DE UN `THREE.Color`.
//
// Con `ColorManagement` encendido —por defecto desde r152, y aca corre three 184— los canales de un
// `THREE.Color` salen en LINEAL: `new THREE.Color('#808080').r` no vale 0.502 sino 0.2159. Interpolar
// ahi comprime las diferencias del medio, y el abanico saldria con cuatro tonos casi iguales entre el
// calido y el frio. `kit.js:nivel` mezcla sobre el hex y `_lum` tambien parte del hex; se copia eso.
const canal = (h) => {
  const t = String(h).replace('#', '')
  const n = t.length === 3 ? t.split('').map(c => c + c).join('') : t
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) || 0)
}
const aHex = (v) => '#' + v.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
const mezcla = (ha, hb, t) => { const a = canal(ha), c = canal(hb); return aHex(a.map((x, i) => x + (c[i] - x) * t)) }

// Una BANDA no es un rectangulo: sale angosta del prisma y se abre. Un rectangulo se lee como una
// varilla; la cuña se lee como luz abriendose, que es lo unico que hace un prisma. Sin normales
// aposta: todo lo que la usa es `MeshBasicMaterial`, que no las mira.
const cuna = (largo, w0, w1) => {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, -w0 / 2, 0, largo, -w1 / 2, 0, largo, w1 / 2, 0,
    0, -w0 / 2, 0, largo, w1 / 2, 0, 0, w0 / 2, 0,
  ]), 3))
  return g
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, distBase } = ctx
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
  const BEATS = meta.beats

  // LA DISPERSION TIENE QUE SER DETERMINISTA. Con `Math.random` cada corrida daria otro dibujo y dos
  // renders de la misma pagina dejarian de ser el mismo video. Semilla fija en el archivo.
  let sem = 20260812 >>> 0
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  iluminar(escena, { key: 0.95, relleno: 0.6 })
  const uDomo = domo(escena, { fuerza: 0.22 })
  const motas = polvo(escena, 1200, 26)

  // NIVEL BAJO PARA UNA LAMPARA, y el numero va cerca de CERO aunque el instinto pida lo contrario.
  // `nivel(0)` es el CLARO y `nivel(1)` la TINTA: pedir `nivel(0.95)` para "casi blanco" devuelve
  // #1f1c17, o sea una lampara negra. Ya paso dos veces en este motor y esta anotado en `tectonica` y
  // en `vitral`.
  const NUCLEO = nivel(0.04)

  // ---------------------------------------------------------------- el vuelo propio
  const KO = 11 / BEATS          // hasta aca manda la forma de la orbita (radio, altura, angulo)
  const KA = 7 / BEATS           // desde aca empieza a ceder el paso la salida
  const A0 = -2.42, A1 = 0.14    // el barrido: 147 grados, entrando por detras y por el lado del haz
  const GIRO = 0.22              // y sigue girando lentisimo durante toda la salida: nunca se clava
  const R0 = distBase * 1.30, R1 = distBase * 0.80, R2 = distBase * 1.38
  const Y0 = 3.8, Y1 = 0.6, Y2 = 1.3
  const YM = 0.1                 // la altura del punto que se mira, constante: el abanico es simetrico
  const LREC = 22                // cuanto se corre el centro de la orbita por el eje del abanico
  const ADEL = 4.6               // cuanto por delante del centro mira la camara mientras sale
  const DERIVA = 0.35

  // La camara en el instante `k` (0..1). ES UNA SOLA FUNCION Y LA USAN LAS DOS COSAS: el movimiento en
  // `alSeek` y la colocacion de los bloques. Con dos formulas se separan en cuanto se toca un numero y
  // los bloques quedan detras del lente — el defecto que `cinta` documenta con la sonda dando 80% de
  // beats mudos. `_pos` y `_obj` son borradores: se leen inmediatamente despues de llamar.
  const _pos = new THREE.Vector3()
  const _obj = new THREE.Vector3()
  const camaraEn = (k) => {
    const av = avance01((k - KA) / (1 - KA))
    const orb = suave(k / KO)
    const ang = A0 + (A1 - A0) * orb - GIRO * av
    const r = R0 + (R1 - R0) * orb + (R2 - R1) * av
    _pos.set(LREC * av + Math.sin(ang) * r, Y0 + (Y1 - Y0) * orb + (Y2 - Y1) * av, Math.cos(ang) * r)
    // EL PUNTO QUE SE ESTA LEYENDO viaja por el eje del abanico. Es el `zEn` de esta plantilla: en un
    // vuelo continuo la POSICION y el TIEMPO son la misma variable, y elegirlas por separado garantiza
    // que no coincidan.
    _obj.set((LREC + ADEL) * av, YM, 0)
    return av
  }
  const kDe = (beat) => Math.min(1, Math.max(0, beat / BEATS))

  // ---------------------------------------------------------------- el espacio: el prisma
  const R_P = 1.5, ALTO_P = 3.6
  const gPrisma = new THREE.Group()
  escena.add(gPrisma)
  // Tres lados: un cilindro de 3 segmentos ES un prisma triangular, y sale mas barato que una malla.
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(R_P, R_P, ALTO_P, 3),
    vidrio(colorDePeso(R, LOOK.acento, 0.20), { rug: 0.04, trans: 0.90, grosor: 2.8, opacidad: 0.92 }))
  gPrisma.add(cuerpo)
  // Los tres cantos verticales en emisivo: son lo que se lee como VOLUMEN cuando el objeto gira. Un
  // prisma sin aristas marcadas es una silueta plana en cada instante.
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, ALTO_P * 1.01, 0.05), luz(LOOK.acento, 1.4))
    c.position.set(Math.sin(a) * R_P, 0, Math.cos(a) * R_P)
    gPrisma.add(c)
  }
  const ROT0 = -Math.PI / 2   // deja una cara enfrentada al haz, que llega por -X

  // ---------------------------------------------------------------- el haz que llega
  //
  // UN TUBO Y NO UN PLANO, y no es un lujo. La orbita pasa exactamente por el eje del haz (beat 4.3,
  // la camara en -X): un plano visto de canto no es nada, asi que el haz habria desaparecido en el
  // mismo beat en que golpea, que es su unico momento importante.
  const LARGO_HAZ = 62
  const gHaz = new THREE.Group()
  // El origen del grupo va en la punta LEJANA. Al escalar en x, la punta viaja HACIA el prisma en vez
  // de crecer para los dos lados: el haz LLEGA, no aparece.
  gHaz.position.set(-(LARGO_HAZ + R_P * 0.8), 0, 0)
  escena.add(gHaz)
  const tubo = (radio, intens, opac) => {
    const g = new THREE.CylinderGeometry(radio, radio, LARGO_HAZ, 10, 1, true)
    g.rotateZ(-Math.PI / 2)
    g.translate(LARGO_HAZ / 2, 0, 0)
    const m = new THREE.Mesh(g, luz(NUCLEO, intens))
    m.material.transparent = true
    m.material.opacity = opac
    m.material.depthWrite = false
    m.material.side = THREE.DoubleSide
    return m
  }
  const haz = tubo(0.075, 1.6, 0.95)
  const haloHaz = tubo(0.42, 1.1, 0.18)
  gHaz.add(haz); gHaz.add(haloHaz)
  tl.set(gHaz.scale, { x: 0.0001 }, 0)
  tl.to(gHaz.scale, { x: 1, duration: b(3.2), ease: E.acelera(2) }, 0)

  // ---------------------------------------------------------------- el espacio: el abanico
  const NB = 7, NUC = 3
  const ANG_MAX = 0.20
  const PASO = ANG_MAX / NUC
  const LARGO_B = 150
  // EL ESPECTRO ES LA PALETA DE LA MARCA, no un arcoiris. Un prisma de verdad devuelve seis colores que
  // la marca no eligio, y una pieza firmada por ella con un arcoiris adentro deja de ser suya. La rampa
  // va calido -> acento2 -> acento, que es el mismo recorrido caliente-a-frio de un espectro hecho con
  // los tres colores que el aire SI eligio.
  const CAL = LOOK.calido || LOOK.acento
  const MED = LOOK.acento2 || LOOK.acento
  const colorDe = (i) => {
    const t = i / (NB - 1)
    return t < 0.5 ? mezcla(CAL, MED, t * 2) : mezcla(MED, LOOK.acento, (t - 0.5) * 2)
  }
  const gAbanico = new THREE.Group()
  escena.add(gAbanico)
  const geoChispa = new THREE.OctahedronGeometry(0.16, 0)
  geoChispa.scale(4.0, 0.55, 0.55)   // esquirla estirada: se lee como estela y se ve desde cualquier lado
  const bandas = []
  const chispas = []
  for (let i = 0; i < NB; i++) {
    const ang = (i - NUC) * PASO
    const z = (i - NUC) * 0.28       // cada banda a su profundidad: paralaje gratis, y evita el z-fighting
    const col = colorDe(i)
    const g = new THREE.Group()
    g.rotation.z = ang
    g.position.z = z
    gAbanico.add(g)
    const mat = luz(col, 1.05)
    mat.transparent = true; mat.opacity = 0.52; mat.depthWrite = false; mat.side = THREE.DoubleSide
    const w0 = 0.10, w1 = 1.05
    // DOS CUÑAS CRUZADAS y no una, por la misma razon que el haz: durante la orbita la camara pasa por
    // el plano del abanico, y ahi una banda plana es invisible justo cuando se esta abriendo. Cruzadas,
    // ademas, se leen como volumen de luz — que es lo que son.
    g.add(new THREE.Mesh(cuna(LARGO_B, w0, w1), mat))
    const canto = new THREE.Mesh(cuna(LARGO_B, w0, w1), mat)
    canto.rotation.x = Math.PI / 2
    g.add(canto)
    const matHalo = luz(col, 0.7)
    matHalo.transparent = true; matHalo.opacity = 0.14; matHalo.depthWrite = false; matHalo.side = THREE.DoubleSide
    g.add(new THREE.Mesh(cuna(LARGO_B, w0 * 3, w1 * 2.6), matHalo))
    // El nucleo blanco viaja sobre la banda del medio: es el resto del haz que sigue derecho. Los tres
    // bloques que SIEMPRE tienen que leerse —claim, pagina y CTA— se montan ahi, asi su contraste no
    // depende de que color le toco a la banda.
    if (i === NUC) {
      const matN = luz(NUCLEO, 1.5)
      matN.transparent = true; matN.opacity = 0.85; matN.depthWrite = false; matN.side = THREE.DoubleSide
      const n = new THREE.Mesh(cuna(LARGO_B, w0 * 0.6, w1 * 0.30), matN)
      n.position.z = 0.14
      g.add(n)
    }
    tl.set(g.scale, { x: 0.0001 }, 0)
    // Se abren desde el centro hacia afuera: el orden importa, porque un abanico que se despliega
    // arrancando por un extremo se lee como una persiana.
    tl.to(g.scale, { x: 1, duration: b(1.7), ease: E.frena(3) }, b(3.15 + Math.abs(i - NUC) * 0.30))
    // Las chispas que corren por la banda. Es lo que separa "una cinta de color" de "luz corriendo", y
    // ademas es otra capa de velocidad: la banda que mas se desvia es la que mas se frena — un guino a
    // lo que hace el vidrio de verdad, y cuatro velocidades distintas dentro del mismo plano.
    const matCh = luz(col, 2.3)
    matCh.transparent = true; matCh.opacity = 0.8; matCh.depthWrite = false
    const vel = 0.062 - Math.abs(i - NUC) * 0.006
    for (let j = 0; j < 24; j++) {
      const m = new THREE.Mesh(geoChispa, matCh)
      g.add(m)
      chispas.push({ m, s0: (j + az() * 0.7) / 24, vel })
    }
    bandas.push({ g, mat, ang, z })
  }

  // ---------------------------------------------------------------- las dos capas de fondo
  //
  // SIN PISO, y es una decision con razon doble. Un prisma en un haz de luz no esta apoyado en nada; y
  // un piso de metal oscuro sin nada que lo ilumine desde arriba renderiza NEGRO PURO y se come medio
  // cuadro — el mismo defecto que `pasillo` y `monolito` pagaron y corrigieron subiendo el nivel. Aca
  // la profundidad la dan dos capas suspendidas a distinta velocidad, que es lo que pide la regla 3.
  const gEsq = new THREE.Group()
  escena.add(gEsq)
  const matEsq = vidrio(MED, { rug: 0.10, trans: 0.75, grosor: 0.6, opacidad: 0.85 })
  for (let i = 0; i < 70; i++) {
    const s = 0.12 + az() * 0.34
    const e = new THREE.Mesh(new THREE.BoxGeometry(s, s * (1.4 + az()), s * 0.35), matEsq)
    // z entre -4 y 8: por delante y por detras del plano del abanico, pero nunca a menos de seis
    // unidades del lente, que es donde una esquirla dejaria de ser polvo y seria una mancha.
    e.position.set(-14 + az() * 66, -9 + az() * 18, -4 + az() * 12)
    e.rotation.set(az() * 3, az() * 3, az() * 3)
    gEsq.add(e)
  }
  const gLejos = new THREE.Group()
  escena.add(gLejos)
  for (let i = 0; i < 22; i++) {
    const m = luz(colorDe(Math.floor(az() * NB)), 0.8)
    m.transparent = true; m.opacity = 0.10 + az() * 0.16; m.depthWrite = false
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.05 + az() * 0.09, 14 + az() * 18), m)
    f.position.set(-30 + az() * 120, -3 + az() * 8, -42 - az() * 30)
    gLejos.add(f)
  }

  // ---------------------------------------------------------------- montaje: los bloques en las bandas
  const SEPARA = 0.55            // cuanto se despega el bloque del plano de su banda, hacia el lente
  const viajeros = []
  // DONDE SE PLANTA LA MARCA, y el numero sale de dos cuentas que se aprietan por arriba y por abajo.
  // Por abajo: el prisma llega hasta y = ALTO_P/2 = 1.8, y el bloque cuelga su rotulo hasta 1.3 veces
  // el alto del nombre por debajo de su centro. Por arriba: en el beat 10 la camara esta a 14.3 y el
  // semicuadro mide 5·14.3/17.4 = 4.11, asi que el borde superior del bloque no puede pasar de ahi —
  // y a 2.9 lo pasaba con un nombre corto, que es justo el caso en que el bloque queda mas alto.
  const P_MARCA = new THREE.Vector3(0, 2.1, 0)

  // El cuadro util y la unidad de mundo A LA DISTANCIA DEL BLOQUE. Las dos hacen falta: la primera para
  // que el texto no salga cortado, la segunda para que ocupe la misma fraccion de pantalla al principio
  // y al final aunque la camara se haya alejado 1.6 veces.
  const cuadro = (d) => anchoADistancia(mundoW, distBase, d, DERIVA)
  const esc = (d) => d / distBase
  const distEn = (banda, beat) => {
    camaraEn(kDe(beat))
    const x = _obj.x
    const bd = bandas[banda]
    return Math.hypot(x - _pos.x, Math.tan(bd.ang) * x - _pos.y, bd.z + SEPARA - _pos.z)
  }
  const distFijo = (p, beat) => { camaraEn(kDe(beat)); return _pos.distanceTo(p) }

  const ubicar = (v, lect, ojo) => {
    if (v.fijo) v.g.position.copy(v.fijo)
    else {
      // EL BLOQUE VIAJA POR SU BANDA. Un objeto clavado en un punto dura `ancho de cuadro / velocidad`
      // beats y ni uno mas: aca son 5.6, y PRUEBA dura 7.7. `retraso` 1 lo deja clavado al cuadro y
      // menos de 1 lo deja quedarse atras despacio, que es como se percibe que la camara lo esta
      // pasando. La altura sale de la banda, asi que los bloques se separan entre si solos mientras el
      // abanico se abre — no hay que repartirlos a mano.
      const x = v.x0 + (lect - v.l0) * v.retraso
      v.g.position.set(x, Math.tan(v.ban.ang) * x, v.ban.z + SEPARA)
    }
    v.g.lookAt(ojo)
    v.g.translateX(v.lado)
    v.g.translateY(v.alto)
  }

  // DOS GRUPOS Y NO UNO, por lo que documenta `vitral`: el externo lo maneja `alSeek` —posicion sobre
  // la banda y cara al lente— y el interno lo maneja `entra`/`sale`. Con uno solo se pelean por
  // `position` y gana el ultimo que corra.
  const montar = (blk, op) => {
    const g = new THREE.Group()
    g.add(blk.g)
    ;(op.padre || escena).add(g)
    camaraEn(kDe(op.beat))
    const v = {
      g, ban: bandas[op.banda != null ? op.banda : NUC], fijo: op.fijo || null,
      l0: _obj.x, x0: _obj.x + (op.adelanto || 0),
      retraso: op.retraso != null ? op.retraso : 1,
      // LA BANDA CORRE POR DEBAJO DEL BLOQUE, no por detras. Detras seria una cinta de color pasando
      // sobre la cama del texto: una cama se dibuja con `renderOrder -1`, o sea ANTES, asi que la banda
      // le pintaria encima y le levantaria el fondo justo donde `nivelTexto` habia garantizado el
      // contraste. Debajo, ademas, se lee como un subrayado de luz — que es la idea de la plantilla.
      alto: (op.alto != null ? op.alto : 0) + blk.alto * 0.5 + 0.30,
      lado: op.lado || 0,
    }
    viajeros.push(v)
    ubicar(v, _obj.x, _pos)   // se coloca YA para su beat: `entra` lee la posicion de partida al armarse
    return v
  }

  // ---------------------------------------------------------------- los bloques, medidos y pedidos
  //
  // Cada uno se mide en el momento MAS CERRADO de su vida, no en el de su entrada. Durante la orbita la
  // camara se acerca (el cuadro se angosta) y durante la salida se aleja (se ensancha), asi que para la
  // marca ese momento es su ultimo beat y para todos los demas el primero.
  const D_MARCA = distFijo(P_MARCA, 10.4)
  const D_PROM = distEn(NUC, 11.6)
  const D_PRUE = distEn(NUC, 17.8)
  const D_CIF = distEn(5, 25.4)
  const D_FRA = distEn(2, 26.0)
  const D_PED = distEn(NUC, 32.6)

  // CAMA EN LA MARCA, y por lo que hay detras: en el beat 6 la camara mira al prisma desde el lado del
  // haz, o sea CONTRA el abanico, que en pantalla converge justo detras del nombre. `nivelTexto`
  // garantiza contraste contra la PALETA, no contra siete bandas emisivas que esta plantilla resolvio
  // poner ahi. Es la misma decision que tomo `atrio` con su columnata, por la misma razon.
  const marca = bloqueMarca({
    alto: 1.25 * esc(D_MARCA), anchoMax: cuadro(D_MARCA) * 0.86, cama: true, camaOpacidad: 0.82,
    margen: R.margen,
  })
  const promesa = bloquePromesa({ alto: 0.52 * esc(D_PROM), anchoMax: cuadro(D_PROM) * 0.88 , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: cuadro(D_PRUE) * 0.58, ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.80 * esc(D_CIF), anchoMax: cuadro(D_CIF) * 0.40 , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.36 * esc(D_FRA), anchoMax: cuadro(D_FRA) * 0.76 , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.32 * esc(D_PED), anchoMax: cuadro(D_PED) * 0.60 , margen: R.margen })

  // ---------------------------------------------------------------- 2 · MARCA
  // El unico bloque que NO viaja: se queda plantado sobre el prisma mientras la camara lo rodea. Ahi el
  // movimiento ya lo pone la orbita, y hacerlo viajar ademas seria moverlo dos veces.
  if (marca) {
    montar(marca, { beat: 6.6, fijo: P_MARCA, retraso: 0 })
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 6, dur: 1.9 })
    marca.escribir(tl, 5.4, 1.3)
    marca.borrar(tl, 9.8)
    sale(marca.g, tl, 10.0, { hacia: 'arriba', dist: 7, dur: 1.1 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Cruza el cuadro: entra por la izquierda y sale por la derecha, montado sobre el nucleo.
  if (promesa) {
    montar(promesa, { beat: 12.6, banda: NUC, retraso: 1 })
    entra(promesa.g, tl, 11, { desde: 'izq', dist: 6.5, dur: 1.8 })
    promesa.escribir(tl, 11.5, 0.95)
    promesa.borrar(tl, 15.4)
    sale(promesa.g, tl, 15.6, { hacia: 'der', dist: 7, dur: 1.2 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // `retraso` 0.78 y no 1: la pagina se queda atras despacio y la camara la va pasando. Dura sus 7.7
  // beats enteros —clavada duraria los 5.6 del cuadro— y ademas se percibe como un objeto del espacio y
  // no como una calcomania pegada al lente. El giro es lo que la vuelve OBJETO: un plano de frente con
  // una captura encima es una textura pegada; el mismo plano girando es una pantalla.
  if (prueba) {
    montar(prueba, { beat: 19.4, banda: NUC, retraso: 0.78, padre: pagina })
    prueba.g.rotation.y = 0.46
    entra(prueba.g, tl, 17, { desde: 'fondo', dist: 6.5, dur: 2.1 })
    prueba.escribir(tl, 17.2, 1.2)
    prueba.recorrer(tl, 18, 5.8, 0.92)
    tl.to(prueba.g.rotation, { y: -0.22, duration: b(6.6), ease: 'none' }, b(17.6))
    sale(prueba.g, tl, 23.6, { hacia: 'izq', dist: 7.5, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.10, giro: 0.024, fase: 1.4 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // UNA CIFRA POR BANDA, y es el pago de la idea: no hay que repartirlas ni cuidar que no se pisen,
  // porque el abanico las separa solo — cuanto mas lejos del prisma, mas lejos entre si. Cada una entra
  // por el borde hacia el que se desvia su banda.
  const B_CIFRA = [5, 1, 6]
  cifras.forEach((c, i) => {
    const t0 = 25 + i * 1.9
    const bd = B_CIFRA[i % B_CIFRA.length]
    const arriba = bd > NUC
    montar(c, { beat: t0 + 1.0, banda: bd, retraso: 0.72 })
    entra(c.g, tl, t0, { desde: arriba ? 'arriba' : 'abajo', dist: 7, dur: 1.2 })
    c.escribir(tl, t0 + 0.3, 0.72)
    sale(c.g, tl, t0 + 2.1, { hacia: arriba ? 'arriba' : 'abajo', dist: 7, dur: 1.0 })
  })
  uso.cifras = cifras.length

  // Las frases van en las dos bandas de al lado del nucleo: son las que menos se desvian, o sea las que
  // dejan el bloque mas cerca del centro del cuadro — que es donde tiene que estar algo que se LEE. La
  // banda 0 queda libre a proposito: en los ultimos beats cae al 75% del semicuadro, y un bloque ahi
  // quedaria pegado al borde.
  const B_FRASE = [4, 2]
  frases.forEach((f, i) => {
    const t0 = 25.6 + i * 2.6
    const bd = B_FRASE[i % B_FRASE.length]
    montar(f, { beat: t0 + 1.0, banda: bd, retraso: 0.8 })
    entra(f.g, tl, t0, { desde: bd > NUC ? 'der' : 'izq', dist: 6, dur: 1.3 })
    f.escribir(tl, t0 + 0.35, 0.8)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: bd > NUC ? 'der' : 'izq', dist: 6.5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // Clavado al cuadro (`retraso` 1): el ultimo bloque de una pieza tiene que quedarse quieto respecto
  // del ojo aunque el mundo siga corriendo. Y el mundo sigue: la camara baja al 45% de su velocidad de
  // crucero, que es lo que la regla 1 llama frenar sin llegar a cero.
  let latido = null
  if (pedido) {
    montar(pedido, { beat: 34.5, banda: NUC, retraso: 1 })
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 6, dur: 2.0 })
    pedido.escribir(tl, 32.5, 0.95)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // EL ESPECTRO SUBE DE BRILLO, y es el unico gesto del abanico en toda la pieza: guardado para el
    // final a proposito, porque una forma que hace cosas todo el tiempo no tiene con que rematar. Sube
    // la opacidad y no la escala — escalar el abanico moveria las bandas y dejaria los bloques, que
    // estan montados sobre ellas por geometria, colgando en el aire.
    for (const bd of bandas) tl.to(bd.mat, { opacity: 0.86, duration: b(2.4), ease: E.frena(2) }, b(31.6))
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.8, duration: b(2.4), ease: E.frena(2) }, b(31.6))
  }

  // El golpe del haz contra el prisma, en el beat 3: un destello corto. Va sobre `uFlash`, que tiene
  // `.value` — el mismo detalle que `deriva` pago escribiendo `tl.to(uDomo, ...)` en vez de
  // `uDomo.uFuerza.value`: compila, corre y no hace nada.
  if (ctx.pelicula && ctx.pelicula.uFlash) {
    tl.to(ctx.pelicula.uFlash, { value: 0.15, duration: b(0.25), ease: E.acelera(2) }, b(3.0))
    tl.to(ctx.pelicula.uFlash, { value: 0, duration: b(1.4), ease: E.frena(3) }, b(3.25))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // Todo lo de aca tiene que evaluarse en CADA submuestra del obturador: un movimiento continuo escrito
  // como tween se muestrea una vez por cuadro y sale a saltos justo donde el obturador deberia barrerlo.
  const K = { k: 0 }
  tl.fromTo(K, { k: 0 }, { k: 1, duration: b(BEATS), ease: 'none' }, 0)
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    // 1 · LA CAMARA, de la misma funcion con que se colocaron los bloques. La deriva son tres senos de
    //     periodos que no son multiplos entre si: no vuelven a alinearse nunca, asi que el movimiento
    //     no se siente en bucle. Un vuelo en linea perfecta se lee como un riel de tren.
    camaraEn(K.k)
    camara.position.set(
      _pos.x + Math.sin(t * 0.31) * DERIVA,
      _pos.y + Math.sin(t * 0.23 + 1.7) * DERIVA * 0.7,
      _pos.z + Math.sin(t * 0.17 + 0.4) * DERIVA * 0.5)
    camara.lookAt(_obj)
    camara.rotation.z += Math.sin(t * 0.19 + 0.4) * 0.013
    // 2 · LOS BLOQUES, DESPUES de la camara y no antes: se orientan contra la posicion REAL del lente,
    //     la que ya tiene la deriva sumada, y no contra la teorica.
    for (const v of viajeros) ubicar(v, _obj.x, camara.position)
    // 3 · las chispas corriendo por sus bandas, cada familia a su velocidad
    for (const ch of chispas) ch.m.position.x = ((ch.s0 + t * ch.vel) % 1) * LARGO_B
    // 4 · el prisma VAIVEN y no vuelta entera: girandolo del todo, el abanico —que esta anclado al
    //     mundo— dejaria de salir de sus caras y la mentira se veria.
    gPrisma.rotation.y = ROT0 + Math.sin(t * 0.24) * 0.16
    gPrisma.rotation.z = Math.sin(t * 0.17) * 0.02
    haloHaz.material.opacity = 0.18 + Math.sin(t * 1.1) * 0.05
    // 5 · las capas. La suspendida deriva contra el avance y la lejana casi no se mueve: la diferencia
    //     entre las dos es lo unico contra lo que el ojo puede medir que la camara esta avanzando.
    gEsq.position.x = -t * 0.20
    gEsq.rotation.z = Math.sin(t * 0.11) * 0.04
    gLejos.position.x = t * 0.10
    // El polvo acompana al lente al 72%: pegado al 100% quedaria congelado —no habria movimiento
    // relativo— y quieto del todo se acabaria a los cinco beats de vuelo.
    motas.position.set(camara.position.x * 0.72, 0, camara.position.z * 0.72)
    motas.rotation.y = t * 0.02
  }, ...respiraciones)

  return { dur: b(BEATS), alSeek, uso }
}
