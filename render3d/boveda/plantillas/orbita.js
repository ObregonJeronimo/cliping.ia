// PLANTILLA "orbita" — una orbita rasante sobre un cuerpo que no entra en el cuadro.
//
// EL GESTO
// Hay UNA superficie y esta debajo, pero no es un piso: es un cuerpo de 118 unidades de radio con la
// camara a 12 sobre el, dando la vuelta. El horizonte es curvo, cruza la pantalla en diagonal y se va
// enderezando durante la pieza. Nunca se ve el objeto entero, y esa es toda la idea: lo que transmite
// escala no es ver un planeta, es ver que el suelo se CIERRA antes de llegar al borde del cuadro.
// Marca global — logistica, infraestructura, energia, un operador de red.
//
// EN QUE SE DIFERENCIA DE LAS DIECIOCHO
//   `nucleo`    tambien orbita, y es el contraste exacto: alli el sistema es PEQUENO, entra entero en
//               el cuadro y la camara se mete adentro. Aca la camara nunca se aleja lo suficiente para
//               ver el cuerpo, y acercarse no revelaria nada — solo mas superficie.
//   `monolito`  rodea un objeto solido de tamano humano; el objeto es el protagonista y la camara lo
//               mira. Aca el "objeto" es el suelo y la camara mira ADELANTE, no al centro.
//   `tectonica` y `torre` son las otras dos de familia `escala`: una cruza dos masas de costado y la
//               otra sube en espiral por una pila. Ninguna de las dos tiene HORIZONTE, que es lo unico
//               que esta pieza tiene para contar de que tamano es lo que estas mirando.
//   `marea`     vuela al ras de una superficie, si — pero de una superficie PLANA y con niebla para
//               tapar su borde. Aca el borde no se tapa: el borde es el tema.
//
// LA CUENTA DEL HORIZONTE, ESCRITA, PORQUE DECIDE TODOS LOS DEMAS NUMEROS
// Con radio RP=118 y la camara a ALT=12, el horizonte cae a `acos(RP/RO)` = 24.9 grados por debajo de
// la horizontal local, a `sqrt(RO^2-RP^2)` = 54.6 unidades del lente. El picado se elige para dejarlo
// al 12% por encima del centro del cuadro, o sea 26.85 grados de morro abajo. De ahi salen las dos
// cosas que hay que saber para componer:
//   · el suelo visible va de 16.2 a 54.6 unidades — a 54.6 el cuadro mide 17.6 de ancho, y esa
//     diferencia contra los 5.6 de `mundoW` es literalmente la sensacion de escala;
//   · el cielo ocupa el 44% de arriba del cuadro, asi que hay sitio para texto sobre fondo limpio.
//
// Y UNA HONESTIDAD SOBRE LA CURVATURA, porque el numero es peor de lo que uno espera. Proyectando el
// limbo en un cuadro 9:16 —18.3 grados de campo horizontal contra 32 de vertical— la comba del
// horizonte mide 2.1% de la semialtura: 20 px sobre 1920. Es poco. Lo que la hace legible es el
// ALABEO: con la camara ladeada 49 grados el horizonte cruza en diagonal, la cuerda visible se alarga
// 1/cos(49) y la comba crece con el cuadrado de la cuerda — 47 px al principio, 24 al final, cuando ya
// se enderezo a 17 grados. O sea: lo que se ve como esfera es el ladeo girando y los carriles
// convergiendo, no la comba del limbo. Decirlo al reves seria vender un efecto que no esta.
//
// EL TEXTO NO SE LADEA. Cada bloque se planta con la orientacion EXACTA de la camara en su beat, asi
// que sale a plomo en pantalla mientras el mundo esta a 49 grados. Es la imagen de una cupula de
// estacion espacial y es lo que separa esta plantilla de "una escena inclinada".
//
// LAS TRES REGLAS
//   1. La camara no para: recorre `distBase * 4.2 * velocidad` de arco y en el PEDIDO baja a 0.34 de
//      su velocidad, nunca a cero. Ademas el alabeo sigue girando cuando el arco ya casi no avanza.
//   2. Nada aparece por encendido: todo entra con `entra()` y sale con `sale()`.
//   3. Cuatro capas a velocidades distintas, y son ORBITAS: la superficie, los correos bajos (rapidos),
//      el convoy lejano (lento) y el anillo (lentisimo). Cuantas hay lo decide la pagina.
//
// LOS BLOQUES VIAJAN EN LA MISMA ORBITA, y sin eso la pieza no existe. A 1.83 unidades por beat, un
// bloque plantado en un punto fijo pasa de 17 a 8 unidades del lente en cinco beats: entra bien medido
// y sale cortado por los dos lados. Aca cada bloque cuelga de un pivote centrado en el cuerpo que gira
// con la camara —`retraso` 1.0 lo clava al cuadro, 0.88 lo deja quedarse atras despacio— y el suelo
// sigue corriendo debajo, que es de donde viene la velocidad. Es `acompanar()` de `movimiento.js`
// traducido a una orbita, y tiene un regalo: como el pivote gira sobre el MISMO eje que la camara, el
// bloque tambien conserva su encare sin que nadie lo recalcule.
//
// LOS SEIS TIEMPOS (beats sobre 40)
//   0   ESPACIO   el cuerpo pasando debajo, los carriles convergiendo, los correos cruzando. Sin texto.
//   6   MARCA     el nombre llega desde el fondo sobre el cielo y se va hacia arriba, fuera del planeta.
//   12  PROMESA   el claim entra por la izquierda por debajo del horizonte y cruza.
//   18  PRUEBA    la pagina SUBE desde la superficie, gira mientras la camara la pasa, y sale por el lente.
//   27  RAZONES   las cifras ESCALAN: cada una se planta mas alto que la anterior. Las frases, abajo.
//   34  PEDIDO    la camara frena, el morro se levanta, el horizonte se endereza y el CTA queda clavado.
//
// SIN MATERIAL: sin tira, PRUEBA usa el recorte mas grande; sin recortes, ese tiempo se compone vacio y
// queda la orbita sola. Lo que no hay, no se anuncia.

import { THREE, vidrio, metal, luz, cama, iluminar, domo, polvo, prismaDe } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso, aclarar } from '../recetas.js'
import { LOOK, hex, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'orbita',
  nombre: 'Órbita',
  familia: 'escala',
  necesita: ['nada'],
  beats: 40,
  tiempos: { espacio: 0, marca: 6, promesa: 12, prueba: 18, razones: 27, pedido: 34 },
  pitch: 'Órbita rasante sobre un cuerpo que nunca entra entero en el cuadro. De logística, infraestructura o energía.',
}

// El radio del cuerpo y la altura de vuelo. Los dos juntos deciden el horizonte, y el horizonte decide
// la pieza — ver la cuenta de la cabecera. Subir ALT aleja el horizonte y convierte la orbita en una
// foto de satelite; bajarlo lo trae encima y el cuerpo pasa a leerse como un asteroide.
const RP = 118
const ALT = 12
const RO = RP + ALT

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes: no hay una
  // rama distinta ni un caso especial. Lo que se modula es el GRADO, nunca la idea — `orbita` siempre
  // es una orbita rasante.
  //
  // Las siete que esta plantilla lee, y que cambia cada una EN EL VIDEO:
  //   R.velocidad   cuanto arco recorre la camara en los mismos 40 beats. Un sitio de 0.7 da media
  //                 vuelta de 23 grados y uno de 1.45 da 47: el suelo pasa al doble de rapido.
  //   R.capas       cuantas orbitas ademas de la superficie. 2 = solo los correos bajos; 3 suma el
  //                 convoy lejano contra el limbo; 4 suma el anillo cruzando el cielo.
  //   R.dureza      LA SECCION de todo lo construido: las torres del suelo, los correos y los modulos
  //                 del convoy pasan por `prismaDe`, o sea de caja a cilindro segun redondee la marca.
  //   R.margen      va a los seis bloques y decide cuanto ancho puede ocupar cada texto.
  //   R.cifras      cuantas cifras se piden — y aca ademas cuantos escalones tiene la escalera del
  //                 tiempo de RAZONES, porque cada cifra se planta mas alto que la anterior.
  //   R.frases      cuantas frases se piden.
  //   R.acentoMasa  si el CUERPO se construye en el color de marca o va gris con el acento en los
  //                 carriles. Es la decision mas visible de todas: el cuerpo ocupa medio cuadro.
  //   R.vacio       cuanto aire respira la pagina, y aca cuanta superficie queda VACIA: decide la
  //                 separacion entre torres, de una cada 0.020 rad a una cada 0.040.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido

  const BEATS = meta.beats
  const DUR = b(BEATS)

  // ---------------------------------------------------------------- la geometria de la orbita
  //
  // El plano de vuelo es el YZ, asi que el eje de la orbita es X. El centro del cuerpo se pone a -RO en
  // Y para que la camara ARRANQUE en el origen: asi el domo —que es una esfera centrada en el origen—
  // ve su degrade desde donde tiene que verlo, y no desde 130 unidades afuera.
  const EJE = new THREE.Vector3(1, 0, 0)
  const ARR_LOCAL = new THREE.Vector3(0, 1, 0)
  const C = new THREE.Vector3(0, -RO, 0)
  const DIP = Math.acos(RP / RO)                  // 0.4342 rad = 24.88 grados
  const HORIZONTE = Math.sqrt(RO * RO - RP * RP)  // 54.55 unidades
  // La tangente del semiangulo vertical, sacada del propio ctx y no de un 16 escrito a mano: es la
  // definicion de `distBase` despejada, asi que si el fov cambia esto sigue valiendo.
  const TAN_V = (mundoH / 2) / distBase           // 0.2867
  // El horizonte al 12% por encima del centro. Mas arriba y el cielo desaparece; mas abajo y el suelo
  // deja de ser el tema.
  const PICADO = DIP + Math.atan(0.12 * TAN_V)    // 0.4686 rad = 26.85 grados
  // Cuanto se levanta el morro en el PEDIDO. Baja el horizonte hacia el centro: el ojo lo lee como que
  // la nave se acomoda, y cuesta un termino en la misma funcion que ya calcula el picado.
  const LEVANTA = 0.055
  // El alabeo. Arranca en 49 grados —el horizonte cruza en diagonal— y se endereza a 17. Es lo unico
  // de la pieza que sigue moviendose cuando el arco ya casi no avanza.
  const ROLL0 = 0.86, ROLL1 = 0.30
  // El temblor de actitud vale 0.34 de lado mas 0.012 rad de guinada, que a 15 unidades son otras 0.18.
  // Todo bloque se mide contra esto y no contra el cuadro en reposo.
  const DERIVA = 0.55

  // EL ARCO SALE DE LA ENERGIA MEDIDA. Mismo tiempo, mas o menos camino: eso es la velocidad. A 1.0 son
  // 0.563 rad = 32 grados de vuelta, 66.5 unidades de huella sobre el suelo y 1.83 por beat.
  const ARCO = (distBase * 4.2 * R.velocidad) / RO

  // El perfil de velocidad, escrito entero por la misma razon que lo escribe `marea`: la regla 1 pide
  // FRENAR para el pedido y una interpolacion lineal no puede, y meterle un segundo tween encima deja
  // dos tweens peleando la misma propiedad. Velocidad 1 hasta el beat del pedido y de ahi recta hasta
  // V_MIN; el arco recorrido es la integral, que sale exacta porque el perfil es una recta.
  const U_FRENO = meta.tiempos.pedido / BEATS
  const V_MIN = 0.34
  const S = (u) => {
    if (u <= U_FRENO) return u
    const d = u - U_FRENO, r = 1 - U_FRENO
    return U_FRENO + d - (1 - V_MIN) * d * d / (2 * r)
  }
  const S1 = S(1)
  const clamp01 = (x) => Math.min(1, Math.max(0, x))
  const suave01 = (x) => { const k = clamp01(x); return k * k * (3 - 2 * k) }
  // El angulo de la camara. `puntoEn`, `distEn`, los pivotes de los bloques y las cuatro capas salen
  // TODOS de aca: es la misma trampa que documenta `movimiento.js` para los tres vuelos de la casa, y
  // se resuelve igual — una sola funcion, o la posicion y el tiempo dejan de coincidir.
  const angDe = (u) => ARCO * S(clamp01(u)) / S1

  // ---------------------------------------------------------------- la pose, fuente unica
  //
  // Devuelve donde esta la camara y como mira en un instante. La usan la camara en `alSeek` y el
  // colocador de bloques en el build, y por eso no pueden desincronizarse: escribir el picado dos veces
  // —una para mirar y otra para colocar— es como se consigue un claim plantado medio cuadro por encima
  // del sitio donde la camara lo va a buscar.
  //
  // Objetos reutilizados: esto corre una vez por submuestra del obturador.
  const _r = new THREE.Vector3(), _t = new THREE.Vector3()
  const _f = new THREE.Vector3(), _a = new THREE.Vector3(), _d = new THREE.Vector3()
  const _z = new THREE.Vector3(), _m = new THREE.Matrix4()
  const POSE = {
    pos: new THREE.Vector3(), quat: new THREE.Quaternion(),
    fre: new THREE.Vector3(), arr: new THREE.Vector3(), der: new THREE.Vector3(), ang: 0,
  }
  function pose(u) {
    const a = angDe(u)
    const roll = ROLL0 + (ROLL1 - ROLL0) * clamp01(u)
    const pic = PICADO - LEVANTA * suave01((u - U_FRENO) / (1 - U_FRENO))
    // El radial es el "arriba" local y la tangente el "adelante" local. Con el centro en -RO, en u=0
    // el radial es +Y y la tangente -Z: la camara arranca mirando como mira toda la casa.
    _r.set(0, Math.cos(a), -Math.sin(a))
    _t.set(0, -Math.sin(a), -Math.cos(a))
    POSE.pos.copy(C).addScaledVector(_r, RO)
    const cp = Math.cos(pic), sp = Math.sin(pic)
    _f.copy(_t).multiplyScalar(cp).addScaledVector(_r, -sp)
    _a.copy(_r).multiplyScalar(cp).addScaledVector(_t, sp)
    // La derecha de la camara es `frente x arriba`: con frente (0,0,-1) y arriba (0,1,0) da (1,0,0),
    // que es la X de una camara de three. Sacarla al reves deja la base zurda y el mundo espejado.
    _d.crossVectors(_f, _a)
    const cr = Math.cos(roll), sr = Math.sin(roll)
    POSE.arr.copy(_a).multiplyScalar(cr).addScaledVector(_d, sr)
    POSE.der.copy(_d).multiplyScalar(cr).addScaledVector(_a, -sr)
    POSE.fre.copy(_f)
    POSE.quat.setFromRotationMatrix(_m.makeBasis(POSE.der, POSE.arr, _z.copy(_f).negate()))
    POSE.ang = a
    return POSE
  }

  // DONDE PLANTAR UN BLOQUE PARA QUE LA CAMARA LO LEA EN SU BEAT — y ademas con que encare.
  //
  // Se coloca EN EL SISTEMA DE LA CAMARA y no en el del cuerpo, a proposito: con el mundo ladeado 49
  // grados, "dos unidades a la izquierda" del cuerpo no es "dos unidades a la izquierda" del cuadro, y
  // el aviso del motor es que el bloque protagonico tiene que ENTRAR EN EL CUADRO. Asi `sx` y `sy` son
  // pantalla, medidos en unidades de mundo a esa distancia: la semialtura util a `dist` es
  // `dist * TAN_V` y la semianchura `dist * TAN_V * mundoW / mundoH`.
  //
  // `alto` es de regalo pero no es decorativo: es a cuanto queda el bloque SOBRE LA SUPERFICIE, que es
  // lo unico que dice si de verdad estan flotando a alturas distintas. Con dist 16 y el alabeo a 0.7,
  // sy=+2.5 da 7.4 y sy=-2.5 da 3.8 — la camara va a 12.
  function puntoEn(beat, dist, sx, sy) {
    const P = pose(beat / BEATS)
    const p = P.pos.clone().addScaledVector(P.fre, dist).addScaledVector(P.der, sx).addScaledVector(P.arr, sy)
    return { pos: p, quat: P.quat.clone(), ang: P.ang, alto: p.distanceTo(C) - RP }
  }

  // A QUE DISTANCIA DEL LENTE QUEDA ESE PUNTO EN OTRO BEAT, contando que el bloque VIAJA.
  //
  // Es la funcion que decide todos los anchos. Medir un bloque contra la distancia de su beat de
  // LECTURA es medirlo contra el cuadro mas ancho que va a tener: cuatro beats despues esta mas cerca,
  // el cuadro es mas angosto y el texto sale cortado por los dos lados sin que nada avise.
  function distEn(beat, p, retraso) {
    const P = pose(beat / BEATS)
    const giro = (P.ang - p.ang) * retraso
    // Rotar `-giro` alrededor del eje lleva un punto de angulo `x` al angulo `x + giro`: es la misma
    // convencion con la que se orientan los pivotes mas abajo, y mezclarlas manda los bloques a
    // buscarse contra la camara en vez de adelante.
    const q = p.pos.clone().sub(C).applyAxisAngle(EJE, -giro).add(C)
    return q.distanceTo(P.pos)
  }
  const anchoDe = (p, tFin, retraso, k) =>
    anchoADistancia(mundoW, distBase, distEn(tFin, p, retraso), DERIVA) * k

  // COLGAR UN BLOQUE DE LA ORBITA. El pivote esta centrado en el cuerpo y gira sobre el eje de la
  // orbita, asi que girarlo mueve al bloque POR SU ORBITA y no en linea recta. Como es el mismo eje
  // sobre el que gira la camara, el encare se conserva solo mientras `retraso` sea 1; con 0.88 se
  // desfasa 0.8 grados en cinco beats, que es menos que el temblor y se lee como vida.
  const orbitantes = []
  function plantar(blk, p, retraso, padre) {
    const pivote = new THREE.Group()
    pivote.position.copy(C)
    pivote.rotation.x = -p.ang
    ;(padre || escena).add(pivote)
    // El pivote gira `-ang`, asi que para pasar del mundo a su interior hay que deshacerlo: `+ang`.
    const qPiv = new THREE.Quaternion().setFromAxisAngle(EJE, p.ang)
    const soporte = new THREE.Group()
    soporte.position.copy(p.pos).sub(C).applyQuaternion(qPiv)
    soporte.quaternion.copy(qPiv).multiply(p.quat)
    pivote.add(soporte)
    soporte.add(blk.g)
    orbitantes.push({ pivote, a0: p.ang, retraso })
    return soporte
  }

  // ---------------------------------------------------------------- luz
  //
  // LA LUZ SE ORIENTA CONTRA EL ARCO, y esto no es un lujo: es un defecto sin error que estaba servido.
  // `iluminar` deja la key apuntando desde (-4,7,8) hacia el origen, o sea fija en el mundo — pero la
  // NORMAL de la superficie gira con la orbita. Con velocidad 1.45 el radial rota 47 grados, y el coseno
  // contra esa luz cae de 0.62 a 0.03: la ultima cuarta parte de la pieza sale con el cuerpo negro y el
  // sintoma parece una escena mal iluminada, que es exactamente el diagnostico falso que ya costo tres
  // arreglos con `metalness` en este motor.
  //
  // Se apunta al MEDIO del arco, ladeada 40 grados: asi el coseno va de 0.70 en las puntas a 0.77 en el
  // medio y el cuerpo esta parejo de punta a punta. El relleno entra casi rasante desde el otro lado,
  // que es lo que le da canto a las torres.
  const luces = iluminar(escena, { key: 1.15, relleno: 0.55 })
  const rMedio = new THREE.Vector3(0, Math.cos(ARCO * 0.5), -Math.sin(ARCO * 0.5))
  const dirKey = rMedio.clone().multiplyScalar(Math.cos(0.70)).addScaledVector(EJE, Math.sin(0.70))
  const dirRell = rMedio.clone().multiplyScalar(Math.cos(1.25)).addScaledVector(EJE, -Math.sin(1.25))
  luces.key.position.copy(C).addScaledVector(dirKey, 420)
  luces.key.target.position.copy(C)
  escena.add(luces.key.target)
  luces.relleno.position.copy(C).addScaledVector(dirRell, 380)
  luces.relleno.target.position.copy(C)
  escena.add(luces.relleno.target)

  const uDomo = domo(escena, { fuerza: 0.28 })
  const motas = polvo(escena, 900, 26)

  // ---------------------------------------------------------------- el cuerpo
  //
  // LA LUMINANCIA SE MIDE SOBRE LA CADENA HEX, NUNCA sobre `.r/.g/.b` de un `THREE.Color`. Con
  // `ColorManagement` encendido —por defecto desde r152, y aca corre three 184— esos canales salen en
  // LINEAL: el `.r` de '#808080' vale 0.2159 y no 0.502. Aplicarles la conversion los convierte dos
  // veces y hunde todas las cuentas; ya publico una tabla de contrastes al reves en este repo.
  const lumHex = (h) => {
    const s = String(h || '').replace('#', '')
    if (s.length !== 6) return 0.5
    const v = [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255)
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
  }
  // EL COLOR DEL CUERPO SALE DE LOS PIXELES. `colorDePeso` devuelve la primera masa cromatica de la
  // paleta medida sobre la tira, que no es lo mismo que `LOOK.acento`: el acento es el color de los
  // BOTONES y aca hace falta el que de verdad ocupa superficie. Y solo se usa como masa si la marca lo
  // usa como masa: por debajo del 3% de la tira, `acentoMasa` es falso y construir medio cuadro con ese
  // color miente sobre como se ve ese sitio.
  let colCuerpo = R.acentoMasa ? colorDePeso(R, LOOK.acento, 0.20) : grisDePeso(R, nivel(0.30))
  // Y SI ESE COLOR ES MUY OSCURO SE LEVANTA. No es un capricho de gusto: el cuerpo ocupa medio cuadro
  // todo el tiempo, y una superficie oscura con una sola direccional encima renderiza casi negra —el
  // mismo agujero que documenta `nucleo.js:metal` para los pisos, con otro nombre. Levantarlo no
  // inventa un color: elige a que luminancia mostrar el de la marca, que es lo que hace cualquier
  // identidad al llevar su color a un fondo oscuro.
  const lumC = lumHex(colCuerpo)
  if (lumC < 0.14) colCuerpo = aclarar(colCuerpo, 0.14 / Math.max(0.02, lumC))
  // 192 gajos y no 96: el limbo es una silueta contra el cielo y con 96 cada faceta mide 7.7 unidades,
  // que a 54 del lente son ~10 px de escalon sobre una curva que la pieza pide mirar. Con 192 baja a 4.
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(RP, 192, 96), metal(colCuerpo, 0.62))
  cuerpo.position.copy(C)
  escena.add(cuerpo)

  // LA ATMOSFERA: dos cascaras apenas mas grandes, dibujadas por su cara INTERIOR. Con la camara afuera,
  // lo unico que sobrevive de una cascara BackSide es el creciente que asoma por fuera del limbo —el
  // resto queda tapado por el cuerpo, que es opaco y se dibuja antes—, o sea justo el halo que hace
  // falta. Dos radios con opacidad decreciente en vez de un shader: el degrade sale de la suma, y son
  // 0.6 y 1.9 grados de banda, unos 110 px.
  //
  // MEZCLA NORMAL Y NO ADITIVA, y la leccion es de `marea`: en un aire CLARO el cielo ya esta arriba del
  // umbral y sumarle acento lo revienta a blanco. Una veladura translucida se ve en los once aires.
  const halos = [[1.006, 0.26], [1.016, 0.15]].map(([k, op]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(RP * k, 160, 60),
      new THREE.MeshBasicMaterial({
        color: hex(LOOK.acento), transparent: true, opacity: op,
        side: THREE.BackSide, depthWrite: false, toneMapped: false,
      }))
    m.position.copy(C)
    escena.add(m)
    return m
  })

  // ---------------------------------------------------------------- los carriles
  //
  // Corren PARALELOS a la trayectoria: son circulos de radio `sqrt(RP^2 - x^2)` centrados en el eje de
  // la orbita. Convergiendo hacia el horizonte son lo que hace legible la curvatura — mucho mas que la
  // comba del limbo, que son 20 px.
  //
  // Se dibujan como toros PARCIALES, solo el tramo que la pieza va a sobrevolar: un toro entero de radio
  // 118 gasta cuatro quintos de sus triangulos del otro lado del planeta. `TorusGeometry` nace en el
  // plano XY girando sobre Z, asi que `rotateY(PI/2)` le pone el eje en X; despues de eso su angulo cero
  // cae en `a = PI/2`, y el `rotateX` de abajo corre el tramo a donde de verdad se vuela.
  const A_ALTO = ARCO + DIP + 0.10
  const ARCO_CARRIL = ARCO + DIP + 0.30
  const matCarril = luz(LOOK.acento, 1.05)
  const gCarriles = new THREE.Group()
  gCarriles.position.copy(C)
  escena.add(gCarriles)
  for (const xi of [0, 5.6, -5.6, 13.5, -13.5, 24, -24, 38, -38]) {
    const rc = Math.sqrt(RP * RP - xi * xi) + 0.04
    const g = new THREE.TorusGeometry(rc, 0.075, 6, 128, ARCO_CARRIL)
    g.rotateY(Math.PI / 2)
    g.rotateX(Math.PI / 2 - A_ALTO)
    g.translate(xi, 0, 0)
    gCarriles.add(new THREE.Mesh(g, matCarril))
  }

  // ---------------------------------------------------------------- las torres
  //
  // La capa mas cercana y la que da la velocidad: son lo unico de tamano conocido apoyado en el suelo.
  // CUANTAS HAY LO DECIDE EL AIRE DE LA PAGINA — una cada 0.020 rad en un sitio denso, una cada 0.040 en
  // uno que respira. La superficie vacia no es un descuido: es la pagina.
  let sem = 20260812
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }
  const SEP_TORRE = 0.020 + 0.020 * (R.vacio != null ? R.vacio : 0.5)
  const N_TORRE = Math.min(90, Math.max(10, Math.round((ARCO + DIP + 0.26) / SEP_TORRE)))
  // Un nivel MEDIO de la rampa. Es lo unico que se recorta contra un cuerpo que puede haber quedado casi
  // en el fondo o casi en la tinta segun que gris midio la pagina.
  const matTorre = metal(nivel(0.52), 0.42)
  const matRemate = luz(LOOK.acento2 || LOOK.acento, 1.6)
  const geoRemate = new THREE.SphereGeometry(0.10, 8, 6)
  const gTorres = new THREE.Group()
  escena.add(gTorres)
  for (let i = 0; i < N_TORRE; i++) {
    // El desvio lateral se acota en 0.105 rad = 12.4 unidades de suelo: a la altura del horizonte el
    // cuadro mide 17.6 de ancho, asi que tres de cada cuatro caen adentro. Mas abierto seria construir
    // torres que no se ven nunca.
    const a = -0.10 + (ARCO + DIP + 0.26) * (i + az() * 0.6) / N_TORRE
    const lam = (az() - 0.5) * 0.21
    const lado = 0.5 + az() * 1.1
    const alto = 1.4 + az() * 3.1
    const n = new THREE.Vector3(0, Math.cos(a), -Math.sin(a))
      .multiplyScalar(Math.cos(lam)).addScaledVector(EJE, Math.sin(lam))
    const g = new THREE.Group()
    g.position.copy(C).addScaledVector(n, RP + alto / 2)
    g.quaternion.setFromUnitVectors(ARR_LOCAL, n)
    // LA SECCION LA DECIDE LA MARCA: cuadrada si redondea poco, cilindrica si redondea mucho. Es la
    // traduccion mas directa del retrato que hay en toda la pieza y se ve en sesenta objetos a la vez.
    g.add(prismaDe(lado, alto, R.dureza, matTorre))
    const rem = new THREE.Mesh(geoRemate, matRemate)
    rem.position.y = alto / 2 + 0.10
    g.add(rem)
    gTorres.add(g)
  }

  // ---------------------------------------------------------------- las otras orbitas
  //
  // Regla 3: capas a velocidades distintas. Aca son ORBITAS de verdad, cada una en su grupo girando
  // sobre el eje del cuerpo, y por eso la profundidad se lee sola.
  //
  // UNA HONESTIDAD SOBRE LOS FACTORES: no son la razon orbital real. A 122 contra 130 de radio la
  // diferencia fisica es del 3% y no se veria. `k` es una licencia para que cada capa tenga velocidad
  // PROPIA, que es lo que la regla pide; el que quiera mecanica celeste tiene que cambiar los radios,
  // no los factores.
  const capasOrbita = []
  const nuevaCapa = (k, inclinacion) => {
    const plano = new THREE.Group()
    plano.position.copy(C)
    if (inclinacion) plano.rotation.z = inclinacion
    escena.add(plano)
    const giro = new THREE.Group()
    plano.add(giro)
    capasOrbita.push({ g: giro, k })
    return giro
  }

  // CAPA 2 · LOS CORREOS BAJOS. Van 8 unidades por debajo de la orbita de la camara, o sea a 4 del
  // suelo, y cruzan el cuadro contra el cielo justo por encima del limbo. Son la capa rapida.
  const correos = nuevaCapa(2.0, 0)
  const matCorreo = metal(nivel(0.58), 0.34)
  for (let i = 0; i < 9; i++) {
    const th = -0.35 + 0.10 * i
    const lam = (az() - 0.5) * 0.12
    const n = new THREE.Vector3(0, Math.cos(th), -Math.sin(th))
      .multiplyScalar(Math.cos(lam)).addScaledVector(EJE, Math.sin(lam))
    const g = new THREE.Group()
    g.position.copy(n).multiplyScalar(RP + 4)
    // El cuerpo se acuesta sobre la tangente: un modulo apuntando al cielo se lee como una torre
    // flotando, no como algo que viaja.
    g.quaternion.setFromUnitVectors(ARR_LOCAL, new THREE.Vector3(0, -Math.sin(th), -Math.cos(th)))
    g.add(prismaDe(0.42, 1.9, R.dureza, matCorreo))
    const luzC = new THREE.Mesh(geoRemate, matRemate)
    luzC.position.y = -1.05
    g.add(luzC)
    correos.add(g)
  }

  // CAPA 3 · EL CONVOY LEJANO. Modulos grandes 22 unidades mas arriba y casi un radian por delante: a
  // esa distancia caen POR ENCIMA del limbo y se ven como siluetas contra el cielo. Van mas lentos que
  // la camara, asi que la pieza los va alcanzando.
  let convoy = null
  if (R.capas >= 3) {
    convoy = nuevaCapa(0.78, 0.06)
    const matMod = vidrio(colorDePeso(R, LOOK.acento, 0.20), { rug: 0.08, trans: 0.72, grosor: 1.8, opacidad: 0.9 })
    for (let i = 0; i < 6; i++) {
      const th = 0.85 + 0.14 * i + az() * 0.05
      const g = new THREE.Group()
      g.position.set(0, Math.cos(th), -Math.sin(th)).multiplyScalar(RO + 22)
      g.quaternion.setFromUnitVectors(ARR_LOCAL, new THREE.Vector3(0, -Math.sin(th), -Math.cos(th)))
      g.add(prismaDe(1.6 + az() * 0.9, 4.2 + az() * 2.4, R.dureza, matMod))
      const rem = new THREE.Mesh(geoRemate, matRemate)
      rem.scale.setScalar(2.4)
      rem.position.y = 2.6
      g.add(rem)
      convoy.add(g)
    }
  }

  // CAPA 4 · EL ANILLO. Una banda a 183 del centro inclinada 24 grados contra el plano de vuelo: la
  // camara esta ADENTRO de su radio, asi que el anillo no se ve como un disco sino como un arco que
  // cruza el cielo. Es la capa mas lenta y la unica que no comparte plano con nada.
  let anillo = null
  if (R.capas >= 4) {
    anillo = nuevaCapa(0.30, 0.42)
    const geoPlaca = new THREE.BoxGeometry(2.4, 0.3, 1.2)
    const matPlaca = metal(grisDePeso(R, nivel(0.46)), 0.5)
    const matPlacaLuz = luz(LOOK.acento, 0.9)
    for (let i = 0; i < 80; i++) {
      const th = az() * Math.PI * 2
      const rr = 183 + (az() - 0.5) * 18
      const m = new THREE.Mesh(geoPlaca, i % 7 === 0 ? matPlacaLuz : matPlaca)
      m.position.set((az() - 0.5) * 3, Math.cos(th) * rr, -Math.sin(th) * rr)
      m.rotation.set(az() * 3, az() * 3, az() * 3)
      anillo.add(m)
    }
  }
  uso.capas = 2 + (convoy ? 1 : 0) + (anillo ? 1 : 0)

  // ---------------------------------------------------------------- los puntos, antes que los bloques
  //
  // El orden importa: primero DONDE va cada bloque, despues a que distancia queda cuando esta mas cerca,
  // y recien entonces de que ancho se pide. Al reves habria que medir el ancho contra el cuadro del beat
  // de lectura, que es el mas ancho que ese bloque va a ver.
  const P_MARCA = puntoEn(7.8, 17.0, 0, 1.7)
  const P_PROM = puntoEn(13.6, 16.0, 0, -1.5)
  const P_PRUEBA = puntoEn(20.6, 15.0, 0, 0.7)
  const P_PEDIDO = puntoEn(39.0, 15.5, 0, 0.4)

  const marca = bloqueMarca({
    alto: 1.5, anchoMax: anchoDe(P_MARCA, 11.6, 0.92, 0.93), margen: R.margen,
    // CAMA EN LA MARCA, y por geometria: el nombre se planta al 35% por encima del centro, que con el
    // horizonte al 12% cae sobre el cielo — pero el alabeo lo va girando y a mitad de su lectura tiene
    // el limbo cruzandole por detras. `nivelTexto` garantiza contraste contra la PALETA, no contra lo
    // que esta plantilla resulto poner atras.
    cama: true, camaOpacidad: 0.84,
  })
  const promesa = bloquePromesa({ alto: 0.58, anchoMax: anchoDe(P_PROM, 17.0, 0.88, 0.92), margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: anchoDe(P_PRUEBA, 25.2, 0.90, 0.70), ar: 1.55 })
  const pedido = bloquePedido({ alto: 0.34, anchoMax: anchoDe(P_PEDIDO, 39.0, 1.0, 0.66), margen: R.margen })

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    plantar(marca, P_MARCA, 0.92)
    entra(marca.g, tl, 6, { desde: 'fondo', dist: 8, dur: 2.0 })
    marca.escribir(tl, 6.5, 1.3)
    marca.borrar(tl, 11.2)
    // Se va HACIA ARRIBA, o sea hacia afuera del cuerpo. En una orbita esa es la unica direccion que
    // significa algo: cualquier otra lo mete de vuelta en el suelo.
    sale(marca.g, tl, 11.4, { hacia: 'arriba', dist: 7, dur: 1.1 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Va por DEBAJO del horizonte y cruza el cuadro. El claim es lo unico de la pieza que se lee contra
  // el suelo, y por eso lleva su cama de fabrica.
  if (promesa) {
    plantar(promesa, P_PROM, 0.88)
    entra(promesa.g, tl, 12, { desde: 'izq', dist: 8, dur: 1.8 })
    promesa.escribir(tl, 12.4, 1.0)
    promesa.borrar(tl, 16.8)
    sale(promesa.g, tl, 17.0, { hacia: 'der', dist: 8.5, dur: 1.2 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // SUBE DESDE LA SUPERFICIE y sale POR EL LENTE. Es el unico objeto de la pieza que hace las dos cosas,
  // y las dos dicen lo mismo: la pagina del cliente sale de ese mundo, no esta pegada encima.
  if (prueba) {
    plantar(prueba, P_PRUEBA, 0.90, pagina)
    entra(prueba.g, tl, 18, { desde: 'abajo', dist: 7.5, dur: 2.2 })
    prueba.escribir(tl, 18.3, 1.2)
    prueba.recorrer(tl, 19.2, 5.6, 0.94)
    // El giro arranca en 20.8 y no antes: `entra` tuenea los tres ejes de rotacion durante 2.53 beats
    // —tambien el que no mueve— y dos tweens sobre la misma clave se pelean. Esperar a que termine
    // cuesta dos decimas y saca la pelea de raiz.
    tl.fromTo(prueba.g.rotation, { y: 0.34 },
      { y: -0.30, duration: b(5.6), ease: 'none', immediateRender: false }, b(20.8))
    sale(prueba.g, tl, 25.2, { hacia: 'frente', dist: 6, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.11, giro: 0.025, fase: 1.3 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // LAS CIFRAS ESCALAN. Cada una se planta 1.5 unidades mas arriba que la anterior, o sea medio cuadro
  // de subida entre la primera y la cuarta, y cada una queda mas lejos del suelo: 3.4, 4.3, 5.2, 6.1
  // sobre la superficie. En una plantilla de familia `escala` eso es el argumento entero, y cuesta un
  // termino en `sy`.
  const cifras = bloquesCifra(R.cifras, {
    alto: 0.95,
    anchoMax: anchoADistancia(mundoW, distBase, 14.0, DERIVA) * 0.40,
    margen: R.margen,
  })
  cifras.forEach((c, i) => {
    const t0 = 27 + i * 2.0
    const s = i % 2 === 0 ? -1 : 1
    const p = puntoEn(t0 + 1.2, 14.6, s * 0.85, -1.5 + i * 1.5)
    // UNA CAMA PUESTA POR LA PLANTILLA, porque `bloquesCifra` no ofrece ninguna y aca hace falta: la
    // escalera cruza el horizonte —la primera cifra cae sobre el suelo y la ultima sobre el cielo—, asi
    // que el fondo de una cifra cambia entre una y otra y ademas mientras se lee. Va sin `borrar`: si se
    // apagara el texto antes de que `sale()` la saque del cuadro quedaria una placa vacia flotando, que
    // es el defecto que `bloques.js` documenta para las camas de los otros bloques.
    const cm = cama(c.ancho, c.alto * 2.0, {
      opacidad: 0.80, color: nivel(0.03), holgX: c.alto * 0.28, holgY: 0,
    })
    cm.position.y = -c.alto * 0.35
    c.g.add(cm)
    plantar(c, p, 0.86)
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 6, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.8)
    sale(c.g, tl, t0 + 2.4, { hacia: s < 0 ? 'izq' : 'der', dist: 6.5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  const frases = bloquesFrase(R.frases, {
    alto: 0.30,
    anchoMax: anchoADistancia(mundoW, distBase, 14.9, DERIVA) * 0.82,
    margen: R.margen,
  })
  frases.forEach((f, i) => {
    const t0 = 28.2 + i * 2.9
    // Abajo del todo y sobre el suelo, en la banda que la escalera de cifras deja libre.
    const p = puntoEn(t0 + 1.2, 15.6, 0, -3.1 - i * 0.35)
    plantar(f, p, 0.86)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 5.5, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.85)
    f.borrar(tl, t0 + 2.4)
    sale(f.g, tl, t0 + 2.6, { hacia: 'abajo', dist: 6, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // `retraso` 1.0: el CTA queda CLAVADO al cuadro mientras el suelo sigue corriendo debajo. Es lo que
  // `movimiento.js:acompanar` documenta para el ultimo bloque de una pieza — lo unico que tiene que
  // quedarse quieto respecto del ojo es aquello que hay que poder leer hasta el final.
  //
  // Y la camara no se detiene: baja a 0.34 de su velocidad, el morro se levanta 3 grados y el horizonte
  // se termina de enderezar. Tres gestos que dicen lo mismo y ninguno cuesta una malla.
  let latido = null
  if (pedido) {
    plantar(pedido, P_PEDIDO, 1.0)
    entra(pedido.g, tl, 34, { desde: 'fondo', dist: 7, dur: 2.0 })
    pedido.escribir(tl, 34.5, 0.9)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    // La atmosfera se enciende con el CTA: es el unico sitio de la pieza donde sube la luz, y sube en el
    // borde del mundo, no en el texto. `opacity` no es x/y/z, asi que no pelea con nada continuo.
    halos.forEach((h, i) => {
      tl.to(h.material, { opacity: h.material.opacity * 1.8, duration: b(2.6), ease: E.frena(2) }, b(33.6 + i * 0.2))
    })
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.7, duration: b(2.6), ease: E.frena(2) }, b(34))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // Va aca y no en tweens porque tiene que evaluarse en CADA submuestra del obturador: un movimiento
  // continuo escrito como tween se muestrea una vez por cuadro y sale a saltos justo donde el obturador
  // deberia barrerlo.
  //
  // Y todo lo de abajo ASIGNA sobre una base, no suma. La regla del motor no es "sumar siempre": es
  // SUMAR si la linea de tiempo escribe esa misma clave —el tween la restablece en cada seek y la suma
  // la desplaza, que es lo que hacen las respiraciones— y ASIGNAR si no la escribe nadie. Ni los
  // pivotes ni las capas ni el polvo son objetivo de ningun tween, asi que sumarles acumularia en cada
  // submuestra y el motor dejaria de ser determinista.
  const _eu = new THREE.Euler()
  const _qj = new THREE.Quaternion()
  const alSeek = juntar(latido, (t) => {
    const u = clamp01(t / DUR)
    uDomo.uT.value = t

    // 1 · la camara. Es la unica excepcion a lo anterior: los vuelos de la casa escriben sus ejes
    // secundarios aca a proposito, y eso es la deriva — lo que impide que un vuelo se lea como un riel.
    const P = pose(u)
    camara.position.copy(P.pos)
    camara.quaternion.copy(P.quat)
    // Temblor de actitud con tres periodos que no son multiplos entre si: no vuelven a alinearse nunca,
    // asi que el vuelo no se siente en bucle. Se post-multiplica para que sea cabeceo/guinada/alabeo de
    // la camara y no un giro del mundo.
    camara.quaternion.multiply(_qj.setFromEuler(_eu.set(
      Math.sin(t * 0.13) * 0.0105, Math.sin(t * 0.23 + 1.7) * 0.0120, Math.sin(t * 0.17 + 0.4) * 0.0090)))
    camara.position.addScaledVector(P.arr, Math.sin(t * 0.19) * 0.30)
    camara.position.addScaledVector(P.der, Math.sin(t * 0.27 + 2.2) * 0.34)

    // 2 · los bloques, cada uno por su orbita. En su beat de lectura el giro vale cero y el pivote queda
    // exactamente donde lo dejo el build.
    const a = P.ang
    for (let i = 0; i < orbitantes.length; i++) {
      const o = orbitantes[i]
      o.pivote.rotation.x = -(o.a0 + (a - o.a0) * o.retraso)
    }

    // 3 · las otras orbitas, cada una a su factor.
    for (let i = 0; i < capasOrbita.length; i++) {
      capasOrbita[i].g.rotation.x = -a * capasOrbita[i].k
    }

    // 4 · el polvo viaja con la camara: es lo unico suspendido cerca del lente, y sin algo cerca la
    // unica referencia de movimiento seria un suelo que esta a veinte unidades.
    motas.position.copy(camara.position)
    motas.rotation.y = t * 0.016
  }, ...respiraciones)

  return { dur: b(BEATS), alSeek, uso }
}
