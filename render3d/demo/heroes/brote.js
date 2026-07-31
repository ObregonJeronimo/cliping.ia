// HERO "brote" — vastagos que CRECEN desde la tierra, sacan hoja y se mecen con el viento.
//
// QUE REGISTRO LLENA, Y POR QUE NINGUNO DE LOS QUE HAY LO CUBRIA
// Los heroes de geometria pura dicen materia (prisma), orbita (toro), sistema (enjambre), gesto
// (cinta), peso (columnata) y cuerpo blando (gota). Los seis tienen algo en comun que recien se ve
// cuando estan todos juntos: NINGUNO CAMBIA DE TAMAÑO POR SU CUENTA. Llegan hechos. Un objeto que
// llega hecho puede decir muchas cosas, pero no puede decir la unica que le importa a una marca que
// cultiva, cocina, fermenta, cura o enseña: que algo TARDA y que el resultado es la consecuencia de
// haberlo esperado. Eso es crecimiento, y es un registro entero que estaba vacio.
//
// A una huerta, a una marca de te, a un vivero, a una escuela o a una linea de cosmetica natural se
// les venia dando un poliedro facetado con anillos, que es lenguaje de software. Thiago ya lo dijo
// sobre dos videos: "son formas para algo tecnologico, no para una marca de cafes".
//
// POR QUE CRECE CON `setDrawRange` Y NO CON UNA ESCALA
// Lo obvio seria armar el tallo entero y escalarlo en Y de 0 a 1. Se ve mal y se ve mal por una razon
// concreta: escalar en Y aplasta TAMBIEN el grosor del tallo en esa direccion, asi que el brote
// arranca como una arandela achatada y se estira hasta ser un fideo. Un tallo que crece no se estira:
// APARECE, con su grosor de siempre, desde la base hacia la punta.
//
// `TubeGeometry` genera sus indices anillo por anillo a lo largo del recorrido —el bucle de afuera es
// el que avanza por la curva—, asi que dibujar los primeros k anillos y ninguno mas es exactamente
// "el tallo llego hasta ahi". Un `setDrawRange` por cuadro y listo: cero geometria nueva, cero
// deformacion, y el grosor y la curvatura son los definitivos desde el primer milimetro.
//
// LA YEMA VA ADELANTE Y EL TALLO DETRAS
// Es al reves de como uno lo dibujaria —primero el tallo, la yema al final, arriba— y es como crece de
// verdad: el meristema es la punta, y el tallo es lo que la punta va dejando atras. Puesto asi, el ojo
// sigue UN objeto que sube en vez de mirar aparecer una linea, que es mucho mas facil de leer y ademas
// es la unica forma de que el gesto tenga sujeto.
//
// POR QUE ESTE HERO NO USA `escalera`
// La doctrina del obturador de este motor dice que lo que se mueve en continuo se difumina y lo que se
// detiene se lee, y por eso `telefono`, `mesa` y `columnata` reparten sus movimientos en peldaños. Esa
// regla nacio para el TEXTO: la cuenta que la justifica esta escrita en el kit y habla de pixeles de
// tipografia partidos en dos por las submuestras del obturador. Aca no hay una sola letra, y una
// planta que crece a los saltos se lee como un mecanismo. El borron de un tallo que sube es
// exactamente lo que corresponde ver.
//
// Lo que si se le debe al pulso es un evento contable, y ese lo pone el VIENTO: cada racha arranca en
// un beat entero. La escena respira en continuo y golpea en la grilla, que es lo que se queria.
//
// NO USA NADA DE LA PAGINA: se arma siempre, tambien cuando la captura fallo.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, nivel, CLARO, dolly } from '../kit.js'

export const meta = {
  id: 'brote',
  nombre: 'Brotes',
  necesita: ['nada'],
  beats: 8,
}

// Impar y no muy denso. Con cuatro o seis el grupo se lee como una cerca; con cinco hay un tallo en el
// eje del cuadro y dos pares que lo acompañan, que es la composicion de un ramo y no la de una fila.
const N = 5
const TUB = 40                       // anillos a lo largo del tallo: son los peldaños del crecimiento
const RAD = 7                        // caras alrededor: un tallo de 0.06 de radio no necesita mas

// ---------------------------------------------------------------- la hoja
// Una lente: dos curvas cuadraticas que se cierran. Extruida con un bisel minimo tiene canto, o sea
// que atrapa un reflejo del estudio y deja de ser un recorte de papel. La proporcion (ancho 0.30 del
// largo) es la de una hoja de laurel; mas ancha se lee como petalo y cambia lo que dice el objeto.
function hojaGeo(THREE, L) {
  const s = new THREE.Shape()
  const A = L * 0.30
  s.moveTo(0, 0)
  s.quadraticCurveTo(L * 0.42, A, L, 0)
  s.quadraticCurveTo(L * 0.42, -A, 0, 0)
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: L * 0.035, bevelEnabled: true, bevelThickness: L * 0.018, bevelSize: L * 0.018,
    bevelSegments: 2, curveSegments: 14,
  })
  // Centrada en el espesor: si no, la hoja queda pegada de un solo lado del tallo y al girar el grupo
  // se le ve el despegue.
  geo.translate(0, 0, -L * 0.0175)
  return geo
}

// ---------------------------------------------------------------- de tubo a TALLO
// `TubeGeometry` da un cilindro de radio constante, o sea un alambre. Un tallo es GRUESO ABAJO y fino
// arriba, y esa diferencia es la mitad de lo que lo hace leer como algo que crecio en vez de algo que
// alguien doblo.
//
// Se reescribe la geometria ya generada, igual que `acintar` en cinta.js, y por la misma razon: three
// calcula los marcos de Frenet y los indices, que es lo caro y lo facil de romper. El vertice se
// ubica por su `uv.x`, que en un tubo vale exactamente el indice del anillo dividido los segmentos —
// asi no hay que depender del orden en que three escupe los vertices, que cambia entre versiones.
//
// LAS NORMALES NO SE RECALCULAN, Y ES A PROPOSITO. Afinar de 1.0 a 0.34 a lo largo de siete unidades
// de mundo inclina la normal 0.33 grados: nada. `computeVertexNormals()` a cambio promedia caras, y
// los dos vertices de la costura del tubo (v = 0 y v = 2pi) estan en el mismo punto pero son
// distintos, asi que reciben normales distintas y aparece una linea de sombra a lo largo de todo el
// tallo. Es el mismo defecto que documenta cinta.js. Recalcular aca solo compraria la costura.
function afinar(THREE, geo, curva, segs, punta) {
  const centro = []
  for (let i = 0; i <= segs; i++) centro.push(curva.getPointAt(i / segs, new THREE.Vector3()))
  const pos = geo.attributes.position, uv = geo.attributes.uv
  const v = new THREE.Vector3()
  for (let k = 0; k < pos.count; k++) {
    const u = uv.getX(k)
    const P = centro[Math.round(u * segs)]
    const f = 1 - (1 - punta) * u
    v.fromBufferAttribute(pos, k)
    v.sub(P).multiplyScalar(f).add(P)
    pos.setXYZ(k, v.x, v.y, v.z)
  }
  pos.needsUpdate = true
  geo.computeBoundingSphere()
}

// La curva del crecimiento y SU INVERSA EXACTA.
//
// El crecimiento no puede ser lineal: un tallo arranca despacio, acelera y frena al llegar. Esa es una
// suavizada de manual (3u^2 - 2u^3) y se escribe a mano —no como ease de GSAP— porque lo que maneja no
// es una propiedad numerica sino `setDrawRange`, y ademas tiene que compartir reloj con la posicion de
// la yema: dos escritores del mismo gesto tienen que leer la misma cuenta.
//
// La inversa hace falta para las hojas. Una hoja aparece CUANDO EL TALLO LA PASA, y ese instante no se
// puede estimar a ojo: hay que preguntarle a la curva en que momento su altura fue u. La suavizada
// tiene inversa cerrada —1/2 - sen(asen(1-2k)/3)—, asi que el instante sale exacto y sigue siendo
// exacto si mañana se cambia la duracion del crecimiento.
const suave = u => u * u * (3 - 2 * u)
const cuando = k => 0.5 - Math.sin(Math.asin(1 - 2 * Math.min(1, Math.max(0, k))) / 3)

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // DOS GRUPOS ANIDADOS. `gRaiz` hace la salida con tweens; `gCampo`, hijo suyo, lleva la deriva del
  // viento escrita a mano. Separarlos es lo que evita que dos escrituras se peleen por la misma
  // propiedad, que es el defecto que ya costo cinco bugs en este motor.
  const gRaiz = new THREE.Group()
  const gCampo = new THREE.Group()
  gRaiz.add(gCampo)
  g.add(gRaiz)

  const Y0 = -mundoH * 0.40           // la linea de tierra
  const RADIO = mundoW * 0.0105
  const LARGO_HOJA = mundoW * 0.115

  // ---------------------------------------------------------------- materiales
  // COMPARTIDOS entre los cinco tallos: es el mismo material vegetal, y ademas cinco copias del mismo
  // MeshPhysical son cinco programas que el renderer tiene que compilar por nada.
  //
  // El color pasa por `nivel`, que interpola de FONDO a TINTA. Un valor fijo hace que el objeto
  // desaparezca en una de las dos polaridades y en este repo ya paso tres veces. En mundo claro hace
  // falta mas separacion porque ahi no hay bloom que ayude a recortar la silueta.
  const matTallo = new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.40 : 0.26)),
    roughness: 0.62, metalness: 0.0,
    // `sheen` es lo que separa lo vegetal de lo plastico: el borde encendido de una superficie con
    // pelusa. Sale por una fraccion de lo que costaria `transmission`, que pediria otra pasada.
    sheen: 0.8, sheenRoughness: 0.55, sheenColor: hex(LOOK.acento2),
    clearcoat: 0.22, clearcoatRoughness: 0.55,
  })
  // La hoja lleva un toque del acento de la marca (`nivel` con tinte), asi que el color de la marca
  // entra por la MATERIA y no como un filete pegado encima. Es la diferencia entre teñir y decorar.
  const matHoja = new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.44 : 0.32, 0.24)),
    roughness: 0.55, metalness: 0.0,
    sheen: 0.9, sheenRoughness: 0.45, sheenColor: hex(LOOK.acento),
    clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide,
  })
  const geoHoja = hojaGeo(THREE, LARGO_HOJA)

  // ---------------------------------------------------------------- los tallos
  // EL AZAR NO ARRANCA EN CERO. `rnd()` es un congruencial lineal y su primer tiro casi no depende de
  // la semilla —medido en cinta.js sobre diez semillas: 0.236, 0.237, 0.237, 0.238...—, asi que la
  // primera decision que se le pide sale casi siempre igual. Se gasta el primer tiro en una fase, que
  // es donde da exactamente lo mismo por donde empiece un seno.
  const faseCampo = rnd() * 6.283
  const tallos = []
  for (let i = 0; i < N; i++) {
    const fase = rnd() * 6.283
    // EL TECHO DE ESTE SORTEO NO ES LA PUNTA DEL TALLO: encima de la punta va la yema, y ABIERTA
    // sobresale RADIO*2.3*1.7*1.5 = 0.35 de mundo por arriba de ella. Con 0.26 el tubo entraba —peor
    // caso 0.975 en coordenadas de recorte, medido en los once aires— pero la yema, que es lo unico de
    // color puro del hero, salia MORDIDA: proyectada vertice a vertice a 30 fps llega a 1.088 en
    // jugueton y a 1.066 en bienestar, los dos extremos de camara de su registro, o sea 85 y 64 px
    // fuera del borde de arriba sobre 1920. Con la semilla 7 —la que usa el motor por defecto— eran 58
    // de los 107 cuadros anteriores a la salida. Y no lo empuja solo el alto: el viento tumba la punta
    // hasta 0.43 hacia la camara y ahi el semialto util se achica. Con 0.215 el peor sorteo posible
    // —alto, dz, curvatura y amplitud al maximo, barriendo la fase— queda en 0.988 en jugueton y en
    // 0.994 con el dolly de 1.55, que es el mas alto de los once.
    const alto = mundoH * (0.60 + rnd() * 0.215)
    const dz = (rnd() - 0.5) * mundoW * 0.28
    const x0 = (i / (N - 1) - 0.5) * mundoW * 0.56
    // CUANTO SE CURVA DEPENDE DE CUAN AFUERA ESTA, y esto salio de mirar los cuadros. Con una curvatura
    // sorteada igual para todos, los cinco tallos se cruzaban arriba y armaban una carpa: las yemas —que
    // son lo unico de color del hero— se juntaban en el vertice y dos de ellas se superponian, o sea que
    // dos flores se leian como una mancha. Atado al ancho que cada tallo tiene disponible hacia el eje,
    // ninguno llega a cruzarlo: el ramo se cierra en la punta sin volverse un unico punto.
    const cur = (0.10 + rnd() * 0.28) * (Math.abs(x0) + mundoW * 0.11)
    // Los de los costados se inclinan HACIA ADENTRO. No es solo composicion: un tallo que se abre
    // hacia afuera se sale del cuadro en los aires que mas acercan la camara, y ademas un ramo que se
    // abre se lee como que algo lo empujo. Los que buscan el eje se leen como que buscan la luz.
    // El del medio no tiene "adentro", asi que cae del lado que deja el ramo desbalanceado — un ramo
    // simetrico se lee como un logo.
    const dir = i < (N - 1) / 2 ? 1 : -1

    // 'centripetal' y no la Catmull-Rom por defecto: con puntos de espaciado irregular la uniforme se
    // pasa de largo y arma rulos en las curvas cerradas. La centripeta tiene demostrado que no forma
    // cuspides ni se cruza consigo misma.
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(dir * cur * 0.10, alto * 0.34, dz * 0.22),
      new THREE.Vector3(dir * cur * 0.54, alto * 0.71, dz * 0.72),
      new THREE.Vector3(dir * cur, alto, dz),
    ], false, 'centripetal')

    const geo = new THREE.TubeGeometry(curva, TUB, RADIO, RAD, false)
    afinar(THREE, geo, curva, TUB, 0.34)
    const tubo = new THREE.Mesh(geo, matTallo)
    // Arranca sin dibujar ni un anillo. Ojo: la malla sigue estando `visible`, asi que su caja entera
    // cuenta para la compuerta de encuadre — que es lo correcto, porque el tallo VA a ocupar ese
    // espacio y si no entrara ahi seria un defecto igual.
    geo.setDrawRange(0, 0)

    const tallo = new THREE.Group()
    tallo.position.set(x0, Y0, 0)
    tallo.add(tubo)

    // LA YEMA. Es lo unico de color puro del hero y va en `matAcento` —basico, sin tonemapear— porque
    // es lo que el bloom tiene que convertir en luz. Achatada en dos ejes y estirada en el tercero:
    // una esfera se lee como bolita y una yema es un huso.
    const geoY = new THREE.IcosahedronGeometry(RADIO * 2.3, 1)
    geoY.scale(0.8, 1.7, 0.8)
    const yema = new THREE.Mesh(geoY, matAcento(i % 2 ? LOOK.acento2 : LOOK.acento, 1.3))
    yema.scale.setScalar(0.001)
    tallo.add(yema)

    // DOS HOJAS por tallo, en alturas distintas y mirando a lados opuestos. El giro reparte tambien en
    // profundidad: con las cuatro hojas en el plano de la camara el conjunto se aplana y se lee como
    // una calcomania.
    const hojas = []
    for (let j = 0; j < 2; j++) {
      const uH = 0.30 + j * 0.26 + rnd() * 0.08
      const lado = j % 2 ? -1 : 1
      const h = new THREE.Mesh(geoHoja, matHoja)
      h.position.copy(curva.getPointAt(uH))
      // El orden de Euler por defecto ('XYZ') aplica primero la Z: la hoja se inclina hacia arriba y
      // recien despues gira alrededor del eje vertical, asi que sigue apuntando hacia arriba mire para
      // donde mire. Al reves, la que gira media vuelta termina cabeza abajo.
      h.rotation.set(0, lado > 0 ? 0.35 + rnd() * 0.5 : Math.PI - 0.35 - rnd() * 0.5, 0.30 + rnd() * 0.30)
      h.scale.setScalar(0.001)
      tallo.add(h)
      hojas.push({ h, uH })
    }

    gCampo.add(tallo)
    tallos.push({
      tallo, geo, curva, yema, hojas, fase,
      // Cada tallo se mece a su ritmo. Los periodos NO son multiplos entre si: si lo fueran, los cinco
      // volverian a alinearse cada tanto y el ramo latiria como una sola cosa, que se nota mucho mas
      // que la quietud.
      w: 0.62 + rnd() * 0.34,
      amp: 0.042 + rnd() * 0.030,
      punta: new THREE.Vector3(),
      t0: b(0.02 + i * 0.38),
      durC: b(1.55),
    })
  }

  // ---------------------------------------------------------------- la tierra
  // Un anillo casi horizontal, no un plano. Un plano de piso necesita luz propia para no salir como
  // una mancha gris; un anillo da el apoyo con un objeto y sin una sola cuenta de sombreado.
  // Cumple el mismo trabajo que la linea de horizonte de columnata y por eso tiene otra FORMA: una
  // columnata se apoya en una linea y un cantero es redondo. Sin esto los tallos flotan y el hero
  // pierde lo unico que vino a decir, que es que hay algo abajo de donde salieron.
  const cantero = new THREE.Mesh(
    new THREE.RingGeometry(mundoW * 0.355, mundoW * 0.38, 72),
    matAcento(LOOK.acento, 1.0))
  cantero.rotation.x = -Math.PI / 2.06
  cantero.position.set(0, Y0, 0)
  cantero.material.transparent = true
  cantero.material.opacity = 0
  gCampo.add(cantero)

  // ================================================================ TIEMPO

  // EL VIENTO SE APOYA EN LA GRILLA. `racha` es un escalar que los tweens mueven y que el onUpdate LEE:
  // asi el pulso entra en la escena sin que dos escritores toquen la misma rotacion. Cada racha
  // arranca en un beat entero, sube en un tercio de beat y afloja en dos tercios — que es como sopla
  // el viento y ademas es un evento tan contable como un corte.
  const racha = { v: 0.55 }
  for (let k = 3; k < meta.beats - 1; k++) {
    tl.to(racha, { v: 1.25, duration: b(0.30), ease: E.acelera(2) }, b(k))
    tl.to(racha, { v: 0.55, duration: b(0.70), ease: E.frena(3) }, b(k) + b(0.30))
  }

  tl.fromTo(cantero.material, { opacity: 0 },
    { opacity: 0.62, duration: b(1.0), ease: E.frena(2), immediateRender: false }, 0)

  for (const s of tallos) {
    // La yema empieza a hincharse con el tallo y ABRE cuando el tallo termino. Dos tweens sobre la
    // misma escala, pero uno detras del otro y sin solaparse: eso no es dos escritores, es una
    // secuencia — la regla prohibe que dos tweens se pisen en el MISMO instante.
    tl.fromTo(s.yema.scale, { x: 0.001, y: 0.001, z: 0.001 },
      { x: 1, y: 1, z: 1, duration: b(0.5), ease: E.frena(2), immediateRender: false }, s.t0)
    tl.to(s.yema.scale, { x: 1.5, y: 1.5, z: 1.5, duration: b(0.55), ease: E.llega(2.4) }, s.t0 + s.durC)

    for (const { h, uH } of s.hojas) {
      // El instante exacto en que el tallo pasa por la hoja, invertiendo la curva de crecimiento.
      // El sexto de beat de mas es para que la hoja salga DETRAS de la punta y no junto con ella:
      // si aparecen a la vez, el ojo no entiende que una la dejo la otra.
      const tH = s.t0 + s.durC * cuando(uH) + b(0.16)
      tl.fromTo(h.scale, { x: 0.001, y: 0.001, z: 0.001 },
        { x: 1, y: 1, z: 1, duration: b(0.5), ease: E.llega(2.0), immediateRender: false }, tH)
    }
  }

  // ---------------------------------------------------------------- lo continuo
  // UN SOLO ESCRITOR para todo lo que depende del reloj: el crecimiento (drawRange + la punta) y el
  // viento (las rotaciones).
  //
  // VA EN EL onUpdate DE LA TIMELINE Y NO EN UN `deriva`, Y ESTO LO CAZO LA COMPUERTA DE DETERMINISMO.
  // `deriva` cuelga un tween hijo puesto en 0, y GSAP renderiza sus hijos ORDENADOS POR TIEMPO DE
  // INICIO: cualquier tween que arranque despues —el de `racha`, que empieza en el beat 3— se renderiza
  // DESPUES. O sea que la funcion leia `racha.v` del cuadro ANTERIOR. Avanzando cuadro a cuadro el
  // error es de un frame y no se ve; se ve cuando la aguja SALTA EN FRIO, que es lo que hace un editor
  // al arrastrarla y lo que hace el verificador al construir dos veces y comparar. Es exactamente el
  // defecto que documenta telefono.js, cometido de nuevo en otro archivo.
  //
  // El onUpdate de la TIMELINE corre despues de todos sus hijos, que es la garantia que hace falta.
  // `main.js` avanza con `tl.time(t, false)` —sin suprimir eventos—, asi que dispara. Y hay que llamarlo
  // a mano una vez, porque GSAP no dispara onUpdate en el instante cero: sin eso el primer cuadro sale
  // sin escribir y la escena arranca con un salto.
  const animar = () => {
    const t = tl.time()
    for (const s of tallos) {
      const k = suave(Math.min(1, Math.max(0, (t - s.t0) / s.durC)))
      // `TubeGeometry` reparte sus anillos por LONGITUD DE ARCO (usa getPointAt), y la yema pregunta
      // por la curva con el mismo criterio: los dos hablan de la misma fraccion del recorrido, asi que
      // la punta nunca se despega del tallo mas de medio anillo.
      s.geo.setDrawRange(0, Math.round(k * TUB) * RAD * 6)
      s.curva.getPointAt(Math.min(1, Math.max(0.0001, k)), s.punta)
      s.yema.position.copy(s.punta)

      const a = Math.sin(t * s.w + s.fase) * s.amp * racha.v
      s.tallo.rotation.z = a
      // El segundo eje va a otra frecuencia y a la mitad de amplitud: un mecido en un solo plano se
      // lee como un limpiaparabrisas.
      s.tallo.rotation.x = Math.sin(t * s.w * 0.61 + s.fase * 1.7) * s.amp * 0.55 * racha.v
    }
    // El grupo entero deriva un pelo. Es lo que impide que el fondo del cuadro quede clavado en los
    // tramos en que todos los tallos estan quietos a la vez.
    gCampo.position.x = Math.sin(t * 0.33 + faseCampo) * mundoW * 0.014
  }
  tl.eventCallback('onUpdate', animar)
  animar()

  // ---------------------------------------------------------------- camara
  // Se acerca mientras los tallos suben y VUELVE a su marca antes del corte. El contrato del motor no
  // admite que una escena deje la camara donde termino: la siguiente arranca contando con
  // (0, 0, distBase). El acercamiento no es un adorno — sin paralaje contra el fondo, cinco tubos se
  // leen pegados a la imagen de atras.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.62) },
    { z: dolly(distBase, -0.45), duration: DUR * 0.82, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // ---------------------------------------------------------------- salida
  // SE VAN HACIA ARRIBA, acelerando: el brote no se guarda ni se apaga, sigue creciendo hasta salirse
  // del cuadro. Es la unica salida que no contradice lo que el objeto vino a decir, y ademas deja el
  // cuadro vacio desde abajo, que es por donde la escena siguiente suele entrar.
  const SAL = DUR - b(0.9)
  tl.to(gRaiz.position, { y: mundoH * 0.88, duration: b(0.85), ease: E.acelera(3) }, SAL)
  tl.to(cantero.material, { opacity: 0, duration: b(0.5), ease: E.acelera(2) }, SAL)

  return { g, tl }
}
