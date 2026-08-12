// PLANTILLA "telar" — una trama de cables tensos, atravesada de punta a punta, que se abre al pasar.
//
// EL GESTO
//
// ESTRUCTURA. Donde `cardumen` tiene cuatrocientas piezas sueltas que nadan en formacion, aca hay UNA
// SOLA COSA continua y tensa: cables amarrados de un extremo al otro que vibran sin soltarse nunca. La
// diferencia se ve hasta en un cuadro quieto — a un banco de piezas le sacas cien y sigue siendo el
// mismo banco; a una trama le sacas un cable y deja de estar tensa.
//
// Es la plantilla textil y de manufactura, y le sirve igual a una red o a una infraestructura: todo lo
// que se vende diciendo "esto esta TEJIDO, no apilado".
//
// EL ESPACIO SON DOS FAMILIAS DE CABLES Y NO UNA, que es justamente lo que lo vuelve un telar
//
//   URDIMBRE   cables largos EN EL EJE DEL VUELO, repartidos alrededor del corredor. Son los que dan
//              velocidad: entran por el fondo y pasan de largo por los costados. Ninguno cruza el
//              centro del cuadro — el radio mas chico es `mundoW * 0.58` y la camara deriva 0.42.
//   TRAMA      cinco BASTIDORES —marco rigido y cables tensos adentro— plantados a lo largo del
//              recorrido. La camara los atraviesa de a uno.
//
// Y LA IDEA QUE ORDENA LA PIEZA ENTERA: UN BASTIDOR POR TIEMPO. Cada uno se ABRE durante los ocho
// beats en que su tiempo esta en pantalla, y se cruza exactamente en el corte al siguiente. El PEDIDO
// es el unico sin bastidor, y por eso el ultimo tercio se despeja solo: la camara no frena —la regla 1
// no lo permite— pero deja de haber cosas que pasen al lado, y eso se percibe como frenar. Es la unica
// forma honesta de "bajar a velocidad de lectura" con un vuelo lineal, que es el que `zEn` sabe medir.
//
// LOS SEIS TIEMPOS (beats sobre 38) — al lado, el bastidor que se abre mientras tanto
//   0   ESPACIO   la trama cerrada llenando el cuadro, abriendose encima del lente.   cruza en 5.6
//   5   MARCA     el nombre llega desde el fondo por el corredor ya abierto.          cruza en 11.8
//   11  PROMESA   el claim sube desde abajo, como una pieza saliendo del telar.       cruza en 18.2
//   17  PRUEBA    la pagina entra girada, amarrada por cuatro tensores.               cruza en 25.4
//   25  RAZONES   las cifras entran por su costado; las frases suben.                 cruza en 31.2
//   32  PEDIDO    no queda un solo bastidor por delante: el CTA se lee en el vacio.   —
//
// SIN MATERIAL: sin tira, PRUEBA usa el recorte mas grande; sin recortes, ese tiempo se compone vacio
// y el telar se queda solo. Lo que no hay, no se anuncia.

import { THREE, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloAvance, entra, sale, paralaje, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'telar',
  nombre: 'Telar',
  familia: 'trama',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 25, pedido: 32 },
  pitch: 'Una trama de cables tensos que se abre al paso de la cámara. Textil, de manufactura, de red.',
}

// EN QUE BEAT CRUZA LA CAMARA CADA BASTIDOR. No son cinco numeros a ojo: cada uno cae en el corte
// entre dos tiempos, y como la apertura empieza a notarse a unos ocho beats de distancia, cada
// bastidor se abre durante el tiempo que lo precede. El sexto no existe a proposito (ver cabecera).
const CRUCES = [5.6, 11.8, 18.2, 25.4, 31.2]

// LA APERTURA. `ABRE` es cuanto se dilata un bastidor cuando la camara lo alcanza y `CERCA` a que
// distancia empieza: con 0.035, a 20 unidades la dilatacion es 1.23 y a 5 es 3.2. Las dos juntas
// garantizan lo unico que no puede fallar — que ningun cable pase por el lente. El cable mas interior
// de un bastidor cerrado esta a 0.79 del eje y con la camara encima se abre a 0.79 * 5.2 = 4.1, contra
// una deriva maxima de 0.42.
const ABRE = 4.2
const CERCA = 0.035

// ---------------------------------------------------------------- el telar, en dos funciones
//
// UN TEJIDO ES UNA SOLA MALLA, y esa es la unica decision tecnica de este archivo. Un bastidor tiene
// catorce cables y hay ocho tejidos en la pieza: como mallas sueltas serian ciento doce llamadas de
// dibujo por cuadro, y por cuatro submuestras de obturador, cuatrocientas cuarenta y ocho. Cosidos en
// un BufferGeometry por tejido son ocho.
//
// El precio es que la vibracion no se puede animar con tweens ni con `position` de un grupo: hay que
// reescribir los vertices. Sale mas barato de lo que parece —seis mil vertices, tres floats cada uno—
// y ademas es lo correcto, porque un movimiento continuo escrito como tween se muestrea una vez por
// cuadro y sale a saltos justo donde el obturador deberia barrerlo.
//
// LA LINEA CENTRAL Y EL ANCHO VAN SEPARADOS, y no es prolijidad. La trama se abre multiplicando la
// linea central por un factor; si el ancho estuviera sumado ahi, los cables engordarian al abrirse y
// lo que pasa al lado del lente no seria un hilo sino una viga.

// Los seis vertices de un tramo, sin indice: (u0,-1) (u0,+1) (u1,-1) · (u1,-1) (u0,+1) (u1,+1).
const US = [0, 0, 1, 1, 0, 1]
const KS = [-1, 1, -1, -1, 1, 1]

function tejido(specs, material) {
  const cen = [], off = [], perf = []
  const cables = []
  for (const s of specs) {
    const i0 = perf.length
    const seg = s.seg || 8
    const w2 = s.ancho * 0.5
    for (let j = 0; j < seg; j++) {
      for (let v = 0; v < 6; v++) {
        const u = (j + US[v]) / seg
        cen.push(s.ax + (s.bx - s.ax) * u, s.ay + (s.by - s.ay) * u, s.az + (s.bz - s.az) * u)
        // La punta se afina en el primer y el ultimo decimo. Solo la piden los cables que terminan en
        // el aire —los de la urdimbre—: un canto recto apareciendo a treinta unidades se ve como un
        // corte, y afinado no se ve aparecer.
        const t = s.punta ? Math.min(1, Math.sin(Math.PI * u) * 3.2) : 1
        off.push(s.wx * w2 * t * KS[v], s.wy * w2 * t * KS[v], 0)
        // EL PERFIL DE UNA CUERDA TENSA: cero en los dos amarres, maximo en los vientres. Es lo que la
        // hace leerse como un cable con tension y no como una tira suelta agitandose entera.
        perf.push(Math.sin(Math.PI * s.nodos * u))
      }
    }
    cables.push({ i0, i1: perf.length, dx: s.dx, dy: s.dy, dz: s.dz, amp: s.amp, w: s.w, f: s.f })
  }
  const geo = new THREE.BufferGeometry()
  const attr = new THREE.BufferAttribute(new Float32Array(cen), 3)
  attr.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', attr)
  const malla = new THREE.Mesh(geo, material)
  // Su esfera de recorte se calcula UNA vez, con los cables en reposo y sin abrir; los cables se mueven
  // en cada submuestra. Sin esto three descarta el tejido entero justo cuando mas ocupa el cuadro.
  malla.frustumCulled = false
  return { malla, cen: new Float32Array(cen), off: new Float32Array(off), perf: new Float32Array(perf), cables }
}

// Reescribe los vertices de un tejido: `abre` dilata la linea central, `foco` multiplica la amplitud.
function tensar(tej, t, abre, foco) {
  const pos = tej.malla.geometry.attributes.position.array
  const cen = tej.cen, off = tej.off, perf = tej.perf, cables = tej.cables
  for (let c = 0; c < cables.length; c++) {
    const q = cables[c]
    // DOS SENOS DE PERIODOS QUE NO SON MULTIPLOS. Con `0.618` la figura combinada recien se repite a
    // los quinientos ciclos de la onda base —unos veinte minutos—, o sea nunca dentro de la pieza. Con
    // un multiplo simple (0.5) volveria cada dos ciclos y la trama entera latiria a compas, que es
    // exactamente lo que delata que hay una sola formula debajo de cien cables.
    const onda = Math.sin(t * q.w + q.f) * 0.72 + Math.sin(t * q.w * 0.618 + q.f * 1.7) * 0.42
    const a = q.amp * foco * onda
    for (let i = q.i0; i < q.i1; i++) {
      const k = i * 3
      const d = perf[i] * a
      pos[k] = cen[k] * abre + off[k] + q.dx * d
      pos[k + 1] = cen[k + 1] * abre + off[k + 1] + q.dy * d
      pos[k + 2] = cen[k + 2] + q.dz * d
    }
  }
  tej.malla.geometry.attributes.position.needsUpdate = true
}

// ---------------------------------------------------------------- los cables de un bastidor
//
// EL HUECO DEL MEDIO ES LO QUE PROTEGE AL TEXTO, y sale de una cuenta y no del gusto. Un bloque de
// texto a `L` del lente ocupa `semiancho / L` de angulo; el hueco de un bastidor a `d` ocupa
// `hueco * abre(d) / d`. Con `hueco = mundoW * 0.52` y los bloques compuestos contra `UTIL`, el hueco
// gana para todo bastidor que este DELANTE del texto, que son los unicos que podrian taparlo. Los que
// quedan detras se ven a traves de la cama del bloque, y por eso la marca la lleva.
//
// El primero es la excepcion y va CERRADO: se cruza en el beat 5.6, o sea que su unica aparicion es el
// tiempo de ESPACIO, que va sin texto a proposito. Empezar la pieza atravesando una trama cerrada es
// lo que establece de una que hay una ESTRUCTURA y no un decorado. Sus cables van en `(i + 0.5) * paso`
// para que el eje del vuelo caiga en un hueco entre dos y no encima de uno.
function cablesBastidor(az, mundoW, mundoH, hueco) {
  const specs = []
  const ANCHO = mundoW * 2.2, ALTO = mundoH * 1.9
  const pasoX = mundoW * 0.28, pasoY = mundoH * 0.19
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 5; i++) {
      const x = s * (hueco > 0 ? hueco + i * pasoX : (i + 0.5) * pasoX)
      if (Math.abs(x) > ANCHO / 2) continue
      // Un cable alterna delante y detras de los que cruza: es lo unico que separa un TEJIDO de una
      // grilla, y cuesta siete centesimas de unidad en z.
      const z = i % 2 ? 0.07 : -0.07
      specs.push({
        ax: x, ay: -ALTO / 2, az: z, bx: x, by: ALTO / 2, bz: z,
        wx: 1, wy: 0, dx: 0.86, dy: 0, dz: 0.5,
        ancho: 0.034 + az() * 0.016, seg: 9, nodos: 2 + (i % 2),
        amp: 0.05 + az() * 0.05, w: 5.4 + az() * 4.6, f: az() * 6.283,
      })
    }
    for (let j = 0; j < 6; j++) {
      const y = s * (hueco > 0 ? hueco + j * pasoY : (j + 0.5) * pasoY)
      if (Math.abs(y) > ALTO / 2) continue
      const z = j % 2 ? -0.07 : 0.07
      specs.push({
        ax: -ANCHO / 2, ay: y, az: z, bx: ANCHO / 2, by: y, bz: z,
        wx: 0, wy: 1, dx: 0, dy: 0.86, dz: 0.5,
        ancho: 0.030 + az() * 0.014, seg: 9, nodos: 2 + (j % 3),
        amp: 0.045 + az() * 0.045, w: 6.1 + az() * 4.2, f: az() * 6.283,
      })
    }
  }
  return specs
}

// El marco rigido del bastidor. Va aparte del tejido porque se comporta al reves: cuando el bastidor
// se abre, el marco escala ENTERO —un travesaño que se acerca tambien engorda— y los cables no.
function marcoRigido(mundoW, mundoH, mat) {
  const g = new THREE.Group()
  const ancho = mundoW * 2.2, alto = mundoH * 1.9, gr = mundoW * 0.05
  const lados = [[ancho + gr * 2, gr, 0, alto / 2], [ancho + gr * 2, gr, 0, -alto / 2],
    [gr, alto, -ancho / 2, 0], [gr, alto, ancho / 2, 0]]
  for (const l of lados) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(l[0], l[1], gr), mat)
    m.position.set(l[2], l[3], 0)
    g.add(m)
  }
  return g
}

// ---------------------------------------------------------------- la urdimbre
//
// LOS ANGULOS SALEN DEL ANGULO DE ORO Y NO DE LA SEMILLA, y esto es lo que hace que el corredor se vea
// parejo. Los cables se escalonan en z por indice, asi que los que estan a la vista al mismo tiempo son
// indices CONSECUTIVOS: sorteando el angulo, siete consecutivos se apelotonan de un lado la mitad de
// las veces. Con 2.39996 rad cualquier tramo consecutivo queda repartido alrededor del eje.
//
// Y CADA CABLE MIDE LO QUE MIDE, no el recorrido entero. Cien cables llegando todos al mismo punto de
// fuga arman un nucleo brillante en el centro del cuadro, que es donde vive el texto.
function cablesUrdimbre(az, mundoW, zIni, largoTotal, n) {
  const specs = []
  const paso = largoTotal / n
  for (let i = 0; i < n; i++) {
    const ang = i * 2.39996
    const co = Math.cos(ang), si = Math.sin(ang)
    const r = mundoW * (0.58 + (i % 3) * 0.40 + az() * 0.45)
    const z0 = zIni - i * paso
    const largo = 24 + az() * 18
    specs.push({
      ax: co * r, ay: si * r, az: z0, bx: co * r, by: si * r, bz: z0 - largo,
      // La cinta se orienta con su ancho en la TANGENTE: asi su cara apunta al eje, que es donde esta
      // la camara, y el cable se ve de frente en vez de verse de canto.
      wx: -si, wy: co,
      // Vibra sobre todo de costado —que es lo que se ve— y un poco en radio, que es lo que le da
      // volumen al corredor.
      dx: -si * 0.85 + co * 0.5, dy: co * 0.85 + si * 0.5, dz: 0,
      ancho: 0.045 + az() * 0.03, seg: 14, nodos: 2 + (i % 3), punta: true,
      // Un cable largo oscila mas lento y mas amplio que uno corto. No es licencia: es la unica manera
      // de que las dos familias no se lean como el mismo objeto repetido.
      amp: 0.10 + az() * 0.10, w: 2.2 + az() * 2.2, f: az() * 6.283,
    })
  }
  return specs
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  // Semilla propia y determinista. Dos renders de la misma pagina tienen que dar el mismo video, y
  // `Math.random` lo rompe sin dar un solo sintoma hasta que alguien compara dos corridas. Vive DENTRO
  // de `build` para que la compuerta, que construye la misma plantilla varias veces en un proceso,
  // reciba la misma trama cada vez.
  let sem = 4517
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  iluminar(escena, { key: 1.0, relleno: 0.6 })
  const uDomo = domo(escena, { fuerza: 0.24 })
  const motas = polvo(escena, 1100, 30)

  // EL VUELO PRIMERO: en una pieza que avanza, donde va un objeto no es una decision de composicion
  // sino la consecuencia de en que beat tiene que leerse.
  const DERIVA = 0.42
  const LARGO = distBase * 4.6
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: LARGO, desde: 0.92, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)
  // La tension del telar. Un solo numero que leen los ocho tejidos en cada submuestra, asi que subirlo
  // en el pedido no dispara cien tweens: cambia algo que ya se estaba leyendo.
  const est = { tension: 1 }

  // ---------------------------------------------------------------- el espacio · la urdimbre
  const urd = tejido(cablesUrdimbre(az, mundoW, distBase * 1.05, LARGO * 1.45, 26),
    (() => {
      const m = luz(LOOK.acento, 1.15)
      m.transparent = true; m.opacity = 0.82; m.depthWrite = false
      // Los dos lados: una cinta armada a mano se puede coser con el giro al reves, y entonces no se ve
      // NADA y no hay error. Cuesta cero y saca de la mesa una familia entera de defectos mudos.
      m.side = THREE.DoubleSide
      return m
    })())
  escena.add(urd.malla)

  // ---------------------------------------------------------------- el espacio · los bastidores
  const HUECO = mundoW * 0.52
  const matMarco = metal(nivel(0.22), 0.30)
  const planos = CRUCES.map((beat, i) => {
    const g = new THREE.Group()
    // `zEn(beat, 0)` es donde ESTA la camara en ese beat: plantar el bastidor ahi es lo que hace que
    // cruzarlo sea el corte entre dos tiempos y no un accidente.
    g.position.z = zEn(beat, 0)
    // Cada bastidor con su propio giro. Es de donde sale que la trama se lea CRUZADA: cinco rejillas
    // paralelas se ven como una sola: cinco a distintos angulos se ven como un tejido de verdad.
    g.rotation.z = (i - 2) * 0.42 + (az() - 0.5) * 0.22
    escena.add(g)
    const mat = luz(i % 2 ? (LOOK.acento2 || LOOK.acento) : LOOK.acento, 1.2)
    mat.transparent = true; mat.opacity = 0.9; mat.depthWrite = false; mat.side = THREE.DoubleSide
    const tej = tejido(cablesBastidor(az, mundoW, mundoH, i === 0 ? 0 : HUECO), mat)
    g.add(tej.malla)
    const marco = marcoRigido(mundoW, mundoH, matMarco)
    g.add(marco)
    return { z: g.position.z, tej, marco, mat }
  })

  // ---------------------------------------------------------------- el espacio · la capa lenta
  //
  // TRES BASTIDORES ENORMES AL FONDO, y se alejan despacio mientras la camara avanza. El signo importa
  // mas que el numero: si la capa lejana se acercara, se cruzaria mas rapido que el mundo y el ojo
  // leeria que esta MAS CERCA. Yendose a 0.55 u/s contra los 4.2 de la camara, se percibe a un octavo
  // de la velocidad de lo que pasa al lado, que es de donde sale la profundidad.
  //
  // Y no llega a envolverse ni una vez: 19 segundos por 0.55 son 10 unidades contra un largo declarado
  // de 190, asi que el salto de `paralaje` no ocurre y no hay costura que disimular.
  const gLejos = new THREE.Group()
  escena.add(gLejos)
  const matLejos = luz(LOOK.acento2 || LOOK.acento, 0.6)
  matLejos.transparent = true; matLejos.opacity = 0.30; matLejos.depthWrite = false; matLejos.side = THREE.DoubleSide
  const specsLejos = []
  for (let i = 0; i < 3; i++) {
    const zf = -LARGO * (1.15 + i * 0.55)
    for (const s of cablesBastidor(az, mundoW * 2.3, mundoH * 2.3, HUECO * 2.4)) {
      s.az += zf; s.bz += zf
      s.amp *= 0.5; s.w *= 0.45
      specsLejos.push(s)
    }
  }
  const lejos = tejido(specsLejos, matLejos)
  gLejos.add(lejos.malla)

  // ---------------------------------------------------------------- los bloques, pedidos y colocados
  //
  // CAMA EN LA MARCA: detras del nombre convergen las puntas de la urdimbre y, mas lejos, la trama de
  // los bastidores que todavia no se abrieron. `nivelTexto` garantiza contraste contra la PALETA, no
  // contra lo que esta plantilla resulto poner atras — y lo que puso atras son filamentos emisivos.
  const marca = bloqueMarca({ alto: 1.45, anchoMax: UTIL(0.90) * 0.92, cama: true, camaOpacidad: 0.85 })
  const promesa = bloquePromesa({ alto: 0.58, anchoMax: UTIL(0.95) * 0.90 })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.56, ar: 1.58 })
  const cifras = bloquesCifra(3, { alto: 0.88, anchoMax: UTIL(0.78) * 0.42 })
  const frases = bloquesFrase(2, { alto: 0.30, anchoMax: UTIL(0.80) * 0.84 })
  const pedido = bloquePedido({ alto: 0.34, anchoMax: UTIL(0.85) * 0.64 })

  // ---------------------------------------------------------------- 2 · MARCA
  // Llega desde el fondo por el corredor recien abierto y se va hacia arriba ANTES de que la camara la
  // alcance. Esa ultima parte no es estetica: en un vuelo, lo que se queda te lo comes.
  if (marca) {
    marca.g.position.set(0, 0.30, zEn(6.8, distBase * 0.90))
    escena.add(marca.g)
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 7, dur: 1.9 })
    marca.escribir(tl, 5.4, 1.45)
    marca.borrar(tl, 9.8)
    sale(marca.g, tl, 10.0, { hacia: 'arriba', dist: 6, dur: 1.1 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Sube y sigue subiendo: entra por abajo y sale por arriba, como una pieza que el telar termina y
  // suelta. Es el unico bloque de la pieza que atraviesa el cuadro entero en un solo sentido.
  if (promesa) {
    promesa.g.position.set(0, 0, zEn(12.8, distBase * 0.93))
    escena.add(promesa.g)
    entra(promesa.g, tl, 11, { desde: 'abajo', dist: 6.5, dur: 1.8 })
    promesa.escribir(tl, 11.5, 1.0)
    promesa.borrar(tl, 15.6)
    sale(promesa.g, tl, 15.8, { hacia: 'arriba', dist: 7.5, dur: 1.2 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // Entra girada y la camara la rodea al pasar: un plano de frente con una captura encima es una
  // textura pegada; el mismo plano girando es una pantalla en un espacio.
  if (prueba) {
    prueba.g.position.set(0, 0, zEn(19.6, distBase * 0.98))
    prueba.g.rotation.y = -0.55
    // CUATRO TENSORES DESDE LAS ESQUINAS. La pagina no flota: esta AMARRADA al telar, que es lo que la
    // ata a este espacio — la misma funcion que en `atrio` cumple el marco metalico.
    //
    // Van en emisivo y NO en metal, y no es estetica: viven en la escena de la pagina, que no tiene una
    // sola luz. Un material fisico ahi renderiza negro, que es exactamente la trampa que `nucleo.js`
    // documenta en `metal()`.
    const largoT = prueba.ancho * 0.85
    const k = 0.7071
    for (const s of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const tns = barra(largoT, 0.024, LOOK.acento, 1.3)
      tns.position.set(s[0] * (prueba.ancho / 2 + k * largoT / 2), s[1] * (prueba.alto / 2 + k * largoT / 2), -0.04)
      tns.rotation.z = Math.atan2(s[1], s[0])
      // Al grupo de AFUERA y no al de adentro: los tensores llegan enteros con la entrada y la pagina
      // se enciende por escala entre ellos, que se lee como que el telar la estira hasta existir.
      prueba.g.add(tns)
    }
    pagina.add(prueba.g)
    entra(prueba.g, tl, 17, { desde: 'der', dist: 7, dur: 2.2 })
    prueba.escribir(tl, 17.3, 1.2)
    prueba.recorrer(tl, 18.2, 6.0, 0.94)
    tl.to(prueba.g.rotation, { y: 0.30, duration: b(7.0), ease: 'none' }, b(17.8))
    sale(prueba.g, tl, 24.0, { hacia: 'izq', dist: 7, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.12, giro: 0.025, fase: 1.4 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // Cada cifra entra por SU borde, el mismo al que esta pegada; las frases suben desde abajo. Las dos
  // familias se cruzan a proposito: razones es el unico tiempo que puede tener dos cosas a la vez.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 25 + i * 2.0
    // 0.22 del semiancho y no 0.30: la cifra mide `UTIL(0.78) * 0.42 = 1.54`, o sea 0.77 de semiancho,
    // y el cuadro util a `0.94 * distBase` mide 2.22 de semiancho. A 0.30 el ultimo digito quedaba
    // afuera cuando la deriva llegaba a su pico.
    c.g.position.set(s * mundoW * 0.22, 0.75 - i * 0.75, zEn(t0 + 1.0, distBase * 0.94))
    c.g.rotation.y = s * 0.30
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5.4, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.78)
    sale(c.g, tl, t0 + 2.2, { hacia: s < 0 ? 'izq' : 'der', dist: 5.8, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 25.8 + i * 2.6
    f.g.position.set(0, -1.9, zEn(t0 + 1.0, distBase * 0.88))
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.82)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL TELAR SE ABRE DEL TODO Y NO QUEDA NADA POR DELANTE. La tension sube medio beat antes de que
  // entre el CTA, asi que el ultimo bastidor —que la camara ya cruzo en 31.2— termina de irse justo
  // cuando el pedido llega. La camara sigue a la misma velocidad; lo que baja es cuanto pasa al lado.
  tl.to(est, { tension: 2.6, duration: b(3.4), ease: E.frena(2.2) }, b(31.4))
  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0.15, zEn(meta.beats - 1.0, distBase * 0.80))
    escena.add(pedido.g)
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 6, dur: 2.0 })
    pedido.escribir(tl, 32.5, 0.9)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // El unico sitio de la pieza donde la luz sube. El ojo lo lee como que algo se resolvio, y cuesta
    // un tween.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.7, duration: b(2.4), ease: E.frena(2) }, b(32))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // Todo el telar vive aca y no en tweens, y por dos razones. La de siempre: se evalua en CADA
  // submuestra del obturador, y un movimiento continuo escrito como tween se muestrea una vez por
  // cuadro y sale a saltos. Y una propia: la apertura no se anima, SE CALCULA contra donde esta la
  // camara — asi sigue siendo correcta aunque se muevan los beats, la duracion o el largo del vuelo.
  const capas = paralaje([{ grupo: gLejos, vel: -0.55, largo: 190, z0: 0 }])
  const alSeek = juntar(vuelo.alSeek, capas, latido, (t) => {
    uDomo.uT.value = t
    const cz = camara.position.z
    for (let i = 0; i < planos.length; i++) {
      const p = planos[i]
      const d = Math.abs(p.z - cz)
      const abre = 1 + (ABRE * est.tension) / (1 + d * d * CERCA)
      // Y VIBRA MAS FUERTE CUANTO MAS CERCA PASA LA CAMARA. Un telar que se cruza se sacude; sin esto
      // la apertura se ve como una escala y no como una estructura cediendo.
      tensar(p.tej, t, abre, 1 + 2.4 / (1 + d * d * 0.02))
      p.marco.scale.set(abre, abre, 1)
      // El desvanecido por distancia es la niebla de esta plantilla, y va como un numero por bastidor en
      // vez de `escena.fog`: la niebla teñiria tambien el polvo y los tensores de la pagina, y el color
      // no coincidiria con el domo, que tiene degrade.
      p.mat.opacity = Math.max(0.10, Math.min(0.90, 1.22 - d * 0.016))
    }
    // La urdimbre no se abre —es el corredor, y abrirlo seria sacarlo del cuadro—: solo respira con la
    // tension, y en el pedido eso despeja los costados.
    tensar(urd, t, 1 + (est.tension - 1) * 0.35, 1)
    tensar(lejos, t, 1, 1)
    motas.position.z = cz
    motas.rotation.z = t * 0.015
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
