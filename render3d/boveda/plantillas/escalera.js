// PLANTILLA "escalera" — una escalinata monumental que sube y se pierde, y la camara ascendiendo en
// diagonal junto a ella.
//
// EL GESTO
// El eje dominante es VERTICAL, y eso es lo unico que hay que retener para no confundirla con las otras
// dos de su familia. `atrio` y `pasillo` tambien avanzan sin frenos, pero alli el movimiento es
// PENETRACION: se entra en un espacio que se abre por delante y el ojo se va al fondo. Aca se SUBE. La
// camara gana altura en cada beat, mira un poco mas arriba de donde esta, y lo que cierra el cuadro no
// es un fondo sino el escalon siguiente. Un espacio que obliga a levantar la vista se lee como
// institucion antes de que se escriba una palabra: universidad, museo, fundacion, colegio, teatro.
//
// EL VUELO ES PROPIO. Los tres de `movimiento.js` van en linea, en circulo y de costado, y ninguno gana
// altura. Este sube y avanza a la vez, sobre la pendiente de la escalera misma, y cumple las mismas
// reglas: no se detiene nunca —baja al 45% para el pedido, nunca a cero— y su deriva sale de senos de
// periodos que no son multiplos entre si, asi que no vuelve a alinearse.
//
// LA ESCALERA Y LA CAMARA SALEN DEL MISMO PERFIL, y ese es el unico truco del archivo. Se construye una
// sola vez una lista de pisadas —huella, contrahuella, rellano— y de ella salen las tres cosas: la
// geometria que se dibuja, la altura a la que vuela la camara sobre cada z, y donde se apoya cada
// bloque. Componer la escalera por un lado y colocar los textos "a la altura que queda bien" por otro
// es como se consigue una pieza en la que el texto flota AL LADO de la arquitectura en vez de estar
// SOBRE ella — y ademas se rompe entera en cuanto se corre un beat.
//
// Y LOS RELLANOS NO ESTAN DONDE QUEDAN BIEN: estan donde la camara va a estar leyendo. Primero se
// decide en que beat se lee cada bloque, de ahi sale el punto del eje que la camara mira en ese
// instante, y ahi se pone el rellano. Al reves —rellanos regulares y cada bloque buscando el mas
// cercano— el bloque cae hasta media huella fuera de su tiempo, que en un vuelo que no para es la
// diferencia entre leerlo y verlo pasar. Es la misma trampa que documenta `zEn` en `vueloAvance`: la
// posicion y el tiempo son la MISMA variable, y elegirlas por separado garantiza que no coincidan.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   la escalinata subiendo y perdiendose, los faroles pasando, la luz trepando. Sin texto.
//   5   MARCA     el nombre llega desde el fondo y se planta en el primer rellano.
//   11  PROMESA   el claim sube desde abajo, como si viniera subiendo los escalones.
//   17  PRUEBA    la pagina se planta en un rellano como una estela y la camara la pasa girando.
//   25  RAZONES   las cifras cruzan por los flancos; las frases suben desde los peldanos.
//   32  PEDIDO    la subida baja al 45%, el CTA se apoya en el ultimo rellano y late.
//
// SIN MATERIAL: los cuatro rellanos se construyen igual, haya o no bloque que apoyar. Un rellano vacio
// es arquitectura; un espacio que cambia de forma segun lo que la pagina dio es un espacio que hay que
// volver a mirar entero cada vez que cambia el cliente.

import { THREE, metal, luz, barra, iluminar, domo, polvo, prismaDe } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'escalera',
  nombre: 'Escalera',
  familia: 'arquitectura',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 25, pedido: 32 },
  pitch: 'Una escalinata monumental que sube y se pierde, con la cámara ascendiendo en diagonal. Institucional, educativa, cultural.',
}

// LA PISADA, QUE ES DE DONDE SALE TODO LO DEMAS.
// 0.52 sobre 1.05 es una pendiente de 26.4 grados —atan(0.52/1.05)—, la de una escalinata ceremonial y
// no la de una escalera de servicio: se sube mirando al frente. Cada peldano avanza
// hypot(1.05, 0.52) = 1.172 unidades de diagonal, y de esa relacion salen la velocidad del vuelo y la
// conversion entre "distancia al lente" y "avance en z".
const PROF = 1.05
const ALZ = 0.52
const RELL = PROF * 3.6   // el rellano: casi cuatro huellas de descanso, y sin subir

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
  const BEATS = meta.beats

  iluminar(escena, { key: 1.15, relleno: 0.5 })
  const uDomo = domo(escena, { fuerza: 0.24 })
  const motas = polvo(escena, 1100, 32)

  // Semilla propia y fija. `Math.random` no falla nunca y por eso es peor: el video de mañana no seria
  // el de hoy, con los mismos datos y la misma plantilla, y nadie sabria por que.
  let sem = 90731
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  // ---------------------------------------------------------------- el vuelo, antes que el espacio
  //
  // La velocidad baja al 45% para el pedido, y esa rampa esta INTEGRADA a mano en vez de puesta como un
  // ease: `sEn` devuelve cuanto se avanzo hasta un beat, asi que sirve tambien para colocar los
  // bloques. Con un ease de gsap la posicion de la camara y la de los bloques saldrian de dos curvas
  // distintas, y el pedido —que es justo donde la curva deja de ser recta— caeria fuera de su sitio.
  //
  //   v(x) = 1 - (1-FRENO)·x/W        s(x) = x - (1-FRENO)·x²/(2W)
  //
  // En x=W la velocidad vale FRENO y no cero, que es la regla 1 del motor escrita como formula.
  const AVZ = 1.85          // unidades de z por beat a velocidad plena -> 2.07 de diagonal, 1.76 peldanos
  const FRENO = 0.45
  const T_FRENO = meta.tiempos.pedido - 1
  const sEn = (beat) => {
    const t = Math.min(beat, BEATS)
    if (t <= T_FRENO) return t
    const W = BEATS - T_FRENO
    const x = Math.min(t - T_FRENO, W)
    return T_FRENO + x - (1 - FRENO) * x * x / (2 * W)
  }
  const Z_CAM0 = distBase * 0.55
  const zCam = (beat) => Z_CAM0 - AVZ * sEn(beat)

  // Cuanto de z hay en una unidad de diagonal: 1.05/1.172 = 0.896. De un bloque se conoce a que
  // DISTANCIA del lente tiene que leerse; lo que hace falta para colocarlo es su z.
  const COS = PROF / Math.hypot(PROF, ALZ)
  const LECTURA = distBase * 0.95
  const zEn = (beat, lectura) => zCam(beat) - (lectura != null ? lectura : LECTURA) * COS

  const OJO = 1.5              // a que altura vuela la camara sobre la escalera
  const DELANTE = distBase * 0.9
  const ALZAR = 0.8            // "un poco mas arriba de donde esta", medido sobre el punto que mira
  const DERIVA = 0.5
  const LADO = -mundoW * 0.42  // el vuelo va JUNTO a la escalera, no por su eje: 8 grados de oblicuidad

  // A QUE ALTURA SOBRE LA ESCALERA CAE EL CENTRO DEL CUADRO. Esta cuenta decide donde va cada bloque.
  //
  // La camara mira al punto del eje que esta a DELANTE en z y ALZAR por encima de la linea de la
  // escalera. Un bloque que se lee a LECTURA esta a LECTURA·COS = 14.8 de los 15.7 de ese adelanto, o
  // sea al 94% del camino, asi que la linea de mira le pasa por encima a OJO + 0.94·ALZAR = 2.26
  // unidades de la escalera. Un bloque centrado ahi queda centrado en el cuadro; uno que se APOYA en el
  // rellano queda mas abajo, que es exactamente lo que tiene que verse.
  const MIRAY = OJO + ALZAR * (LECTURA * COS / DELANTE)

  // EL ANCHO UTIL, medido a la distancia REAL y no contra `mundoW` a secas. A 16.5 del lente el cuadro
  // mide 5.625·16.5/17.4 = 5.34, menos la deriva por los dos lados: 4.34. (El corrimiento lateral de la
  // camara no entra en la cuenta: mira siempre al eje, asi que el eje esta siempre centrado.)
  const UTIL = anchoADistancia(mundoW, distBase, LECTURA, DERIVA)

  // ---------------------------------------------------------------- el perfil de la escalera
  //
  // Los rellanos van donde la camara va a leer, no cada N peldanos. Estos cuatro beats son los unicos
  // numeros "de composicion" del archivo: todo lo demas se deduce de ellos.
  const LEE = { marca: 6.8, promesa: 12.8, prueba: 19.2, pedido: 34.0 }
  const APOYOS = [zEn(LEE.marca), zEn(LEE.promesa), zEn(LEE.prueba), zEn(LEE.pedido)]

  const ANCHO = mundoW * 1.9   // 10.7: casi el doble del cuadro, asi los bordes no se ven de cerca
  const Z_TOPE = Z_CAM0 + 8    // ocho unidades de escalera POR DETRAS: la camara ya viene subiendo
  // La escalera termina mas alla de donde la niebla la borra, y no es exageracion: la camara mira A LO
  // LARGO de la pendiente, asi que el final de la escalinata cae en el CENTRO del cuadro y no arriba,
  // como pasaria con el ojo horizontal. Sin ese margen se ve el canto donde se acaba el mundo.
  const Z_FIN = -195

  const perfil = []
  {
    let z = Z_TOPE, y = 0, r = 0
    while (z > Z_FIN) {
      const zc = APOYOS[r]
      if (zc != null && z <= zc + RELL / 2) {
        // El rellano no sube: el descanso es lo que lo vuelve rellano. Su borde cae dentro de una huella
        // del punto pedido, y el bloque se planta en el punto PEDIDO —no en el centro real del
        // rellano— para no correrle el beat de lectura. Con 3.78 de fondo, entra igual.
        perfil.push({ z, prof: RELL, y, rellano: true })
        z -= RELL
        r++
      } else {
        perfil.push({ z, prof: PROF, y, rellano: false })
        z -= PROF
        y += ALZ
      }
    }
  }
  // Los centros de cada pisada, que es contra lo que se interpola la altura.
  const centros = perfil.map(p => ({ z: p.z - p.prof / 2, y: p.y }))

  // LA ALTURA DE LA LINEA DE LA ESCALERA EN CUALQUIER z. Interpola entre centros de pisada en vez de
  // devolver el escalon: asi la camara sube por una recta continua y no a los saltos de la escalera
  // —que se veria como una camara en mano— y ademas se APLANA sola al cruzar un rellano, que es justo
  // el beat en que hay algo apoyado ahi para leer.
  const alturaEn = (z) => {
    if (z >= centros[0].z) return centros[0].y
    const ult = centros[centros.length - 1]
    if (z <= ult.z) return ult.y
    let lo = 0, hi = centros.length - 1
    while (hi - lo > 1) { const md = (lo + hi) >> 1; if (centros[md].z >= z) lo = md; else hi = md }
    const a = centros[lo], c = centros[hi]
    return a.y + (c.y - a.y) * (a.z - z) / (a.z - c.z)
  }

  // ---------------------------------------------------------------- la escalinata, dibujada
  //
  // Instanciada por lo mismo que `cardumen` y `bandada`: doscientas mallas sueltas son doscientas
  // llamadas de dibujo por submuestra de obturador, o sea ochocientas por cuadro.
  //
  // `frustumCulled = false` NO es precaucion. Three culea una malla instanciada por la esfera
  // envolvente de su GEOMETRIA BASE movida por la matriz del objeto, que aca es el origen; con las
  // instancias repartidas sobre doscientas unidades, la escalera entera desaparece en cuanto el origen
  // sale de cuadro — o sea, casi siempre.
  const nPel = perfil.filter(p => !p.rellano).length
  const ESP = 3.2   // espesor del bloque de cada peldano: seis contrahuellas, asi se solapan entre si y
                    // la escalera se lee como UNA MASA de piedra y no como laminas flotando
  // El nivel va bajo —o sea CERCA DEL FONDO DEL MUNDO, no cerca de la tinta— por lo que ya costo el
  // piso de `pasillo`: una masa de metal oscuro sin nada que la ilumine desde arriba sale negra pura y
  // se come el tercio de abajo del cuadro. Aca esa masa es media pieza.
  const peldanos = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), metal(nivel(0.18), 0.42), nPel)
  const descansos = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), metal(nivel(0.27), 0.34), perfil.length - nPel)
  // El filo de cada contrahuella en emisivo puro, que es lo unico que el bloom convierte en luz. Es lo
  // que hace que doscientos escalones se lean como escalones y no como una rampa estriada.
  const filos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), luz(LOOK.acento, 0.65), perfil.length)
  for (const m of [peldanos, descansos, filos]) { m.frustumCulled = false; escena.add(m) }

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3()
  let ip = 0, ir = 0
  perfil.forEach((p, i) => {
    _q.identity()
    if (p.rellano) {
      _p.set(0, p.y - ESP * 0.575, p.z - p.prof / 2)
      _s.set(ANCHO * 1.16, ESP * 1.15, p.prof)
      _m.compose(_p, _q, _s); descansos.setMatrixAt(ir++, _m)
    } else {
      _p.set(0, p.y - ESP / 2, p.z - p.prof / 2)
      _s.set(ANCHO, ESP, p.prof)
      _m.compose(_p, _q, _s); peldanos.setMatrixAt(ip++, _m)
    }
    _p.set(0, p.y - 0.035, p.z + 0.012)
    _s.set(ANCHO * (p.rellano ? 1.15 : 0.97), 0.055, 1)
    _m.compose(_p, _q, _s); filos.setMatrixAt(i, _m)
  })

  // Un zocalo de piedra sobre cada rellano. Marca el sitio ANTES de que llegue el bloque —el espectador
  // ve que ahi va a pasar algo dos o tres beats antes de que pase— y despues lo sostiene.
  for (const zr of APOYOS) {
    const zoc = new THREE.Mesh(new THREE.BoxGeometry(ANCHO * 0.52, 0.42, RELL * 0.62), metal(nivel(0.31), 0.30))
    zoc.position.set(0, alturaEn(zr) + 0.21, zr)
    escena.add(zoc)
  }

  // ---------------------------------------------------------------- la balaustrada: lo que pasa cerca
  // Cada siete peldanos y no en cada uno: lo que da ritmo es el intervalo, y un poste por escalon a esta
  // velocidad se convierte en un parpadeo. Es la capa RAPIDA — esta quieta en el mundo, asi que pasa a
  // la velocidad entera de la camara.
  const postes = perfil.filter((p, i) => !p.rellano && i % 7 === 0)
  const pilares = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), metal(nivel(0.24), 0.38), postes.length * 2)
  const faroles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), luz(LOOK.acento2 || LOOK.acento, 1.0), postes.length * 2)
  for (const m of [pilares, faroles]) { m.frustumCulled = false; escena.add(m) }
  let ib = 0
  for (const p of postes) {
    for (const sx of [-1, 1]) {
      _q.identity()
      _p.set(sx * (ANCHO / 2 + 0.55), p.y + 0.68, p.z - 0.3)
      _s.set(0.34, 1.36, 0.34)
      _m.compose(_p, _q, _s); pilares.setMatrixAt(ib, _m)
      _p.set(sx * (ANCHO / 2 + 0.55), p.y + 1.46, p.z - 0.3)
      _s.set(0.46, 0.14, 0.46)
      _m.compose(_p, _q, _s); faroles.setMatrixAt(ib, _m)
      ib++
    }
  }

  // ---------------------------------------------------------------- las torres: lo que pasa lejos
  // La capa LENTA. Acompanan a la camara al 55% en z y al 70% en altura, asi que se corren la mitad que
  // la balaustrada y una fraccion de lo que sube el ojo. Sin dos velocidades distintas, subir por un
  // espacio vacio es indistinguible de un zoom: no hay contra que medir el ascenso.
  //
  // No hace falta reciclarlas por modulo —que es lo que hace `paralaje`— porque la capa es mas larga
  // que todo el recorrido: 20 torres cada 13 unidades son 260, y la camara recorre 67. Un modulo de mas
  // es un salto de mas donde no hacia falta ninguno.
  const lejos = new THREE.Group()
  escena.add(lejos)
  const matTorre = metal(nivel(0.12), 0.40)
  const matCanto = luz(LOOK.acento, 0.5)
  for (let i = 0; i < 20; i++) {
    for (const sx of [-1, 1]) {
      const w = mundoW * (0.30 + az() * 0.55)
      const x = sx * (mundoW * 1.55 + az() * mundoW * 1.9)
      const z = Z_CAM0 - i * 13 - az() * 4
      // LAS TORRES DEL FONDO TOMAN LA FORMA DE LA MARCA. Es la capa mas grande de la pieza y la que el
      // ojo lee como "que clase de ciudad es esta": cuadradas para una identidad angulosa, cilindricas
      // para una redondeada. La escalinata en si NO cambia de forma, y es a proposito — un peldano
      // redondeado deja de ser un peldano, o sea que ahi la receta cambiaria la idea y no el grado.
      const t = prismaDe(w, mundoH * 9, R.dureza, matTorre)
      t.position.set(x, 0, z)
      lejos.add(t)
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.07, mundoH * 8.4), matCanto)
      c.position.set(x - sx * w * 0.52, 0, z + w * 0.36)
      lejos.add(c)
    }
  }

  // LA ESCALERA SE PIERDE, y eso es niebla y no una decision de encuadre. La camara mira a lo largo de
  // la pendiente, asi que el final de la escalinata queda en el medio del cuadro: sin niebla se ve
  // exactamente donde se termina de construir el mundo. El color es `bg2` —la mitad ALTA del domo— y no
  // `bg`, porque lo que hay detras del punto de fuga es cielo y no suelo.
  // Las motas viven en un radio de 32 alrededor de la camara y la niebla arranca en 46: no las toca.
  escena.fog = new THREE.Fog(LOOK.bg2 || LOOK.bg, 46, 132)

  // ---------------------------------------------------------------- los bloques, pedidos y colocados
  //
  // CAMA EN LA MARCA por lo que esta plantilla puso detras y no por costumbre: el fondo del nombre son
  // los filos emisivos de veinte contrahuellas trepando, o sea lo mas claro y lo mas variable de la
  // pieza. `nivelTexto` garantiza contraste contra la PALETA, no contra eso.
  const marca = bloqueMarca({ alto: 1.35, anchoMax: UTIL * 0.88, cama: true, camaOpacidad: 0.82 , margen: R.margen })
  // 0.78 Y NO 0.90, Y EL QUE SE PASABA DEL CUADRO NO ERA EL TEXTO SINO SU CAMA.
  //
  // `cama()` (nucleo.js:236) deja de holgura horizontal el 32% del ALTO DEL PARRAFO ENTERO, no el del
  // renglon. Un claim de tres renglones a 0.56 mide 1.93 de alto, asi que la cama se lleva
  // 2 x 0.32 x 1.93 = 1.23 de ancho que el `anchoMax` no sabe que existen. Con 0.90 el bloque medía
  // 5.14 contra un cuadro de 5.34 a la distancia de lectura —el 96%— y con `R.margen` en su techo de
  // 0.95 medía 5.45, o sea el 102%. Proyectado: en el beat 12.8, que es EXACTAMENTE el que la
  // plantilla eligio para leerlo, la cama ya salia de cuadro por los dos lados, y en el 15.3 tapaba el
  // 116% del ancho con el 87% del bloque adentro. Con 0.78 queda en 86% con el margen neutro y 92% en
  // el peor caso, que es lo que hay que reservar para un bloque que ademas dura hasta el beat 15.4.
  const promesa = bloquePromesa({ alto: 0.56, anchoMax: UTIL * 0.78 , margen: R.margen })
  // 2.93 de ancho por 4.39 de alto: a 16.5 del lente el cuadro mide 5.34 x 9.50, asi que la pagina ocupa
  // el 55% del ancho y el 46% del alto. Centrada en MIRAY + 0.35, su borde de abajo cae a 0.41 sobre el
  // rellano — o sea, sobre el zocalo. Se apoya, no flota.
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.52, ar: 1.5 })
  // Las cifras van a los flancos, a mundoW·0.21 = 1.18 del eje. El semiancho util es 4.34/2 = 2.17, asi
  // que lo que le queda a la cifra es 2·(2.17 - 1.18) = 1.98 y pide 1.74. A 0.26 del cuadro —que fue el
  // primer numero— pedia mas de lo que quedaba, que es como `atrio` se comio el primer digito de `10X`.
  const cifras = bloquesCifra(R.cifras, { alto: 0.82, anchoMax: UTIL * 0.40 , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.29, anchoMax: UTIL * 0.80 , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.33, anchoMax: UTIL * 0.62 , margen: R.margen })

  // APOYAR ALGO EN LA ESCALERA. La altura sale de la linea de la escalera EN ESE z, nunca de un numero
  // absoluto: cada rellano esta varias unidades mas arriba que el anterior.
  const plantar = (g, beat, sobre, x, lectura) => {
    const z = zEn(beat, lectura)
    g.position.set(x || 0, alturaEn(z) + sobre, z)
    return g
  }
  // ACOMPANAR A LA CAMARA, en diagonal. Es `acompanar` de `movimiento.js` para un vuelo que ademas
  // sube: un bloque quieto en un vuelo que no para dura lo que tarda la camara en pasarlo, y aca son
  // unos seis beats. PRUEBA vive siete y PEDIDO seis, asi que los dos tienen que viajar o se apagan a
  // mitad de su propio tiempo. `retraso` 1 los clava al cuadro; 0.7 deja que la camara los alcance
  // despacio, que es lo que hace que se lean como objetos del espacio y no como calcomanias.
  const subirCon = (g, t0, t1, retraso) => {
    const r = retraso != null ? retraso : 1
    const z0 = zCam(t0), z1 = zCam(t1)
    const dy = (alturaEn(z1) - alturaEn(z0)) * r
    const dz = (z1 - z0) * r
    tl.to(g.position, {
      y: g.position.y + dy,
      z: g.position.z + dz,
      duration: b(t1 - t0), ease: 'none',
    }, b(t0))
    // Y EL VIAJE SE ANOTA EN `g.position`. No es contabilidad: es el arreglo de un defecto medido.
    //
    // `sale` (movimiento.js:232) calcula su destino leyendo `g.position` EN EL MOMENTO DE LA LLAMADA, y
    // un tween solo se REGISTRA: al construir, la posicion sigue siendo la plantada. Sin esta linea la
    // salida no empuja al bloque hacia afuera sino de vuelta al punto de partida — o sea HACIA EL
    // LENTE, la direccion contraria. Medido sobre la pagina: `sale` la devolvia de z -46.0 a -40.77,
    // 5.2 unidades, y la distancia al lente se derrumbaba de 13.3 a 4.0 en 1.3 beats. Un objeto que
    // triplica su tamano aparente mientras "se va" no se lee como una salida sino como que se viene
    // encima, y con el obturador a 190 grados sale como un manchon. La marca se volvia 2.5 y el claim
    // 2.7.
    //
    // No pisa nada de lo ya animado: `entra` capturo su destino antes, y la linea de tiempo escribe
    // las tres coordenadas en cada seek. Esto corrige solo la BASE que leen las llamadas posteriores.
    g.position.y += dy
    g.position.z += dz
    return g
  }
  // Todo lo que se apoya se inclina hacia atras, como un atril. La camara mira 26 grados hacia arriba y
  // un plano vertical visto desde ahi se acorta en alto un 10%, ademas de leerse como pegado en el
  // aire. Reclinado se lee como una placa puesta para el que sube, que es el gesto de la plantilla.
  const ATRIL = 0.30

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    plantar(marca.g, LEE.marca, MIRAY - 0.2)
    marca.g.rotation.x = ATRIL
    escena.add(marca.g)
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 7.5, dur: 1.9 })
    marca.escribir(tl, 5.4, 1.4)
    subirCon(marca.g, 7.0, 9.5, 0.55)
    marca.borrar(tl, 9.3)
    sale(marca.g, tl, 9.6, { hacia: 'arriba', dist: 6, dur: 1.1 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Entra desde abajo: es el unico bloque que llega por donde se vino, o sea subiendo los escalones.
  if (promesa) {
    plantar(promesa.g, LEE.promesa, MIRAY - 0.1)
    promesa.g.rotation.x = ATRIL
    escena.add(promesa.g)
    entra(promesa.g, tl, 11, { desde: 'abajo', dist: 6.5, dur: 1.7 })
    promesa.escribir(tl, 11.5, 1.0)
    subirCon(promesa.g, 12.9, 15.3, 0.6)
    promesa.borrar(tl, 15.1)
    sale(promesa.g, tl, 15.4, { hacia: 'der', dist: 7, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // La pagina se planta en el rellano como una ESTELA y la camara la pasa girando. El giro es lo que la
  // vuelve objeto: un plano de frente con una captura encima es una textura pegada.
  //
  // El zocalo que la sostiene esta en `escena` y no dentro del bloque, y no es una cuestion de orden:
  // `pagina` es OTRA escena —se renderiza en un pase posterior, despues del bloom— y no tiene luces,
  // porque `iluminar` se las agrega a `escena`. Un material PBR metido ahi sale negro.
  if (prueba) {
    plantar(prueba.g, LEE.prueba, MIRAY + 0.35)
    prueba.g.rotation.y = 0.42
    pagina.add(prueba.g)
    entra(prueba.g, tl, 17, { desde: 'fondo', dist: 8, dur: 2.2 })
    prueba.escribir(tl, 17.3, 1.2)
    prueba.recorrer(tl, 18, 6.0, 0.94)
    tl.to(prueba.g.rotation, { y: -0.22, duration: b(6.2), ease: 'none' }, b(18.4))
    subirCon(prueba.g, 19.4, 23.4, 0.7)
    sale(prueba.g, tl, 23.6, { hacia: 'izq', dist: 7, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.10, giro: 0.026, fase: 1.6 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // LAS RAZONES NO SE APOYAN EN NINGUN RELLANO, y es la unica excepcion del archivo. Son hasta cinco
  // bloques en siete beats: darle un rellano a cada uno convertiria la escalinata en una terraza —cada
  // rellano se come casi cuatro huellas— y se perderia justo lo que la plantilla vende, que es subir.
  // Cruzan por los flancos, a la altura del centro del cuadro, y lo que sostiene la composicion sigue
  // siendo la escalera pasando por detras.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 25 + i * 2.0
    plantar(c.g, t0 + 1.2, MIRAY, s * mundoW * 0.21)
    c.g.rotation.set(ATRIL * 0.6, s * -0.26, 0)
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.75)
    sale(c.g, tl, t0 + 2.2, { hacia: s < 0 ? 'izq' : 'der', dist: 5.5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 25.8 + i * 2.4
    plantar(f.g, t0 + 1.1, MIRAY - 1.5)
    f.g.rotation.x = ATRIL * 0.7
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.2, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.85)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  // Se apoya en el ultimo rellano y viaja con la camara al 75%: en los cuatro beats que quedan la
  // camara avanza 4.5 unidades de z, asi que el CTA se queda 1.1 atras — sigue sobre su rellano, que
  // tiene 3.78 de fondo, y a la vez la camara se le sigue acercando. Ni clavado ni perdido.
  let latido = null
  if (pedido) {
    plantar(pedido.g, LEE.pedido, MIRAY - 0.15)
    pedido.g.rotation.x = ATRIL
    escena.add(pedido.g)
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 6.5, dur: 2.0 })
    pedido.escribir(tl, 32.5, 0.9)
    subirCon(pedido.g, 34.1, BEATS, 0.75)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // El unico sitio de la pieza donde la luz sube. El ojo lo lee como que algo se resolvio.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.75, duration: b(2.4), ease: E.frena(2) }, b(32))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // Va aca y no en tweens porque se evalua en CADA submuestra del obturador: un movimiento continuo
  // escrito como tween se muestrea una vez por cuadro y sale a saltos justo donde el obturador deberia
  // barrerlo — y en esta plantilla eso es la camara entera.
  const est = { beat: 0 }
  tl.fromTo(est, { beat: 0 }, { beat: BEATS, duration: b(BEATS), ease: 'none' }, 0)

  // FILOS DE LUZ QUE SUBEN LA ESCALERA MAS RAPIDO QUE LA CAMARA. Es la tercera velocidad de la pieza y
  // su gesto de firma: la luz trepa, adelanta al que sube y se pierde arriba. Nacen seis unidades
  // DETRAS de la camara, o sea fuera de cuadro, asi que el nacimiento no se ve nunca.
  //
  // SEIS Y NO TRES, Y EL RECORRIDO EL DOBLE — por donde MUEREN, no por cuantos hacen falta. Con un
  // recorrido de 66 el filo se apagaba a 60 de z por delante de la camara, o sea a 67 del lente: ahi
  // la niebla (46..132) recien va por el 24%, asi que una barra emisiva de medio cuadro de ancho
  // desaparecia de golpe a plena vista. Con 132 muere a 140 del lente, pasada la niebla entera. Y con
  // seis en vez de tres la separacion en el campo cercano queda igual que antes: uno cada 22 unidades.
  const pulsos = []
  for (let i = 0; i < 6; i++) {
    const q = barra(ANCHO * 0.99, 0.30, LOOK.acento2 || LOOK.acento, 0.9)
    q.material.transparent = true
    q.material.opacity = 0.42
    q.material.depthWrite = false
    escena.add(q)
    pulsos.push(q)
  }
  const LARGO_P = 132, VEL_P = 7.2

  const _mira = new THREE.Vector3()
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const zc = zCam(est.beat)
    const yc = alturaEn(zc) + OJO
    // LA CAMARA SUBE Y AVANZA A LA VEZ porque las dos coordenadas salen del mismo perfil: la z la pone
    // el vuelo y la y la pone la escalera que hay debajo de esa z. Por eso no se despega nunca.
    // El corrimiento lateral oscila lentisimo y no cruza el eje: la oblicuidad es la que hace que se
    // vea una escalera SUBIENDO y no un tunel de escalones.
    camara.position.set(
      LADO * (0.72 + Math.sin(t * 0.11) * 0.28) + Math.sin(t * 0.37) * DERIVA,
      yc + Math.sin(t * 0.23 + 1.7) * DERIVA * 0.5,
      zc)
    const zm = zc - DELANTE
    _mira.set(0, alturaEn(zm) + OJO + ALZAR, zm)
    camara.lookAt(_mira)
    // El balanceo va DESPUES del lookAt: es lo que separa "una camara" de "un trackeo por software".
    camara.rotation.z += Math.sin(t * 0.19 + 0.4) * 0.013
    for (let i = 0; i < pulsos.length; i++) {
      const zp = zc + 6 - ((t * VEL_P + i * (LARGO_P / pulsos.length)) % LARGO_P)
      // +0.52 Y NO -0.16, QUE ES LO QUE TENIA ENTERRADO EL GESTO DE FIRMA DE LA PLANTILLA.
      //
      // `alturaEn` es la recta que pasa por los CENTROS de las pisadas, no el techo de la piedra: entre
      // un centro y el siguiente el escalon de arriba ya subio, asi que la recta corre hasta 0.26 POR
      // DEBAJO de la superficie solida. Un filo de 0.30 de alto centrado 0.16 mas abajo todavia queda
      // entero dentro del bloque, y el bloque tiene 3.2 de espesor. Medido barriendo 80 unidades de
      // escalera: solo el 41% de las posiciones mostraba algo, y en promedio se veia el 17% del filo.
      // Eso no es una luz que trepa: a 4.3 unidades por beat sobre huellas de 1.05 son cuatro
      // destellos por beat, o sea un parpadeo que a 30 cuadros se lee como un defecto de render.
      // Con +0.52 —una contrahuella— el filo va entero al aire en el 100% del recorrido.
      pulsos[i].position.set(0, alturaEn(zp) + 0.52, zp + 0.03)
    }
    lejos.position.set(0, yc * 0.7, -(Z_CAM0 - zc) * 0.55)
    motas.position.copy(camara.position)
    motas.rotation.y = t * 0.02
  }, ...respiraciones)

  return { dur: b(BEATS), alSeek, uso }
}
