// HERO "telar" — una tela que SE TEJE: la urdimbre se monta, la lanzadera cruza, y el paño ondula.
//
// QUE REGISTRO LLENA
// Contando columnata y gota, los heroes de geometria pura dicen materia, orbita, sistema, gesto, peso
// y cuerpo blando. Falta TEXTURA, que no es lo mismo que materia: materia es de que esta hecho algo,
// textura es que alguien lo hizo pasando una cosa entre otras. Es el registro de la moda, del textil,
// de la ceramica, de la panaderia de masa madre y de cualquier marca cuyo argumento sea el oficio. A
// todas ellas se les venia ofreciendo un cristal facetado, que vende precision de fabrica —
// exactamente lo contrario de lo que esas marcas cobran.
//
// Y ademas es el unico hero del registro blando que dice ESTRUCTURA. La gota respira y el brote crece,
// los dos son organismos; una tela es una decision repetida. Un aire editorial o de lujo necesita eso.
//
// EL ENTRAMADO NO ESTA DIBUJADO: ESTA EN LA GEOMETRIA
// Un tejido de verdad se reconoce porque cada hilo pasa POR ARRIBA de uno y POR ABAJO del siguiente, y
// esa alternancia es lo unico que separa una tela de una grilla. Fingirlo con una textura no funciona
// en 3D: apenas la camara se corre, el dibujo se queda plano y la mentira se ve.
//
// La cuenta que lo resuelve entera cabe en un renglon. En el cruce (i, j) el hilo vertical va adelante
// si i+j es par y atras si es impar; el horizontal, al reves. Un coseno de periodo dos celdas con la
// fase corrida por el indice del hilo da exactamente eso, y como se evalua en TODO el recorrido —no
// solo en los cruces— el hilo sube y baja en curva, que es como se ve un hilo tensado. Los dos hilos
// llevan la misma cuenta con el signo cambiado: por eso encajan y por eso nunca se atraviesan.
//
// LA LANZADERA VA Y VUELVE
// Cada trama se dibuja con `setDrawRange` avanzando desde una punta, y las impares se construyen al
// reves para que se dibujen desde la otra. Es como trabaja una lanzadera y se lee de inmediato: sin
// eso, once pasadas iguales en la misma direccion se leen como una animacion de carga.
//
// EL PULSO ENTRA POR EL PEINE. Cada pasada cae en un medio beat exacto y ademas SACUDE la tela — el
// peine que empuja la trama contra las anteriores. Es un evento contable por medio compas sin que la
// escena tenga que cortar nada.
//
// NADA DE COMILLAS INVERTIDAS EN EL SHADER de mas abajo, ni siquiera dentro de un comentario de GLSL:
// cierran el template literal de JavaScript y el archivo deja de parsear con un error que no menciona
// ni el shader ni la linea. En este repo ya rompio el build siete veces. Por eso el shader de aca abajo
// se arma concatenando cadenas de comillas simples.
//
// NO USA NADA DE LA PAGINA: se arma siempre, tambien cuando la captura fallo.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, nivel, CLARO, dolly, deslizFijo } from '../kit.js'

export const meta = {
  id: 'telar',
  nombre: 'Telar',
  necesita: ['nada'],
  beats: 8,
}

// LA URDIMBRE ES MAS DENSA QUE LA TRAMA, y no es un descuido de las cuentas: en un tejido real los
// hilos que van a lo largo del telar estan mas juntos que los que cruzan, porque son los que sostienen
// la tension. Con la celda perfectamente cuadrada la tela se lee como un papel cuadriculado.
const NU = 9                          // hilos de urdimbre (verticales)
const NT = 11                         // pasadas de trama (horizontales) — once medios beats
const MU = 6                          // muestras por celda: con menos, la ondulacion sale poligonal

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // DOS GRUPOS ANIDADOS. `gTela` hace la salida con tweens; `gOnda`, hijo suyo, lleva el balanceo
  // continuo escrito a mano. Dos tweens sobre la misma rotacion rompen el determinismo, y es el
  // defecto que este motor ya pago cinco veces.
  const gTela = new THREE.Group()
  const gOnda = new THREE.Group()
  gTela.add(gOnda)
  g.add(gTela)

  const ANCHO = mundoW * 0.68
  const ALTO = mundoH * 0.58
  const PX = ANCHO / (NU - 1)         // separacion de la urdimbre
  const PY = ALTO / (NT - 1)          // separacion de la trama
  const X0 = -ANCHO / 2, Y0 = -ALTO / 2
  const RADIO = PX * 0.22
  // La amplitud del cruce es un radio y monedas: justo lo necesario para que los dos hilos se rocen
  // sin atravesarse. Mas alto y la tela se convierte en una malla de alambre con relieve de reja.
  const A = RADIO * 1.05
  // Los hilos SOBRAN por los cuatro lados. Una tela que termina exactamente en el ultimo cruce se lee
  // como un recorte de Photoshop; un orillo deshilachado se lee como un pedazo de tela.
  const EX = PX * 0.6, EY = PY * 0.6

  // ---------------------------------------------------------------- el shader de la ondulacion
  // POR QUE VA EN EL VERTEX SHADER Y NO EN JS. Son veintiun tubos de casi seiscientos vertices cada
  // uno: mover doce mil vertices por cuadro desde JavaScript es trabajo que la GPU hace gratis. Y por
  // que se INYECTA en el material fisico en vez de escribir un ShaderMaterial propio: el motor monta
  // un estudio de iluminacion con PMREMGenerator, y los heroes que se ven caros son los que lo
  // aprovechan. Un shader propio significa renunciar a esa luz y reimplementarla peor — y en una tela,
  // donde todo el efecto es como corre el brillo por encima del hilo, eso seria tirar el hero.
  //
  // LA NORMAL SE REHACE, y aca se puede hacer EXACTO en vez de a fuerza de vecinos como en gota.js.
  // El desplazamiento va siempre sobre un eje fijo (z) con magnitud D(x, y), asi que el jacobiano es
  // I + ez (x) grad(D) y su inversa traspuesta —que es lo que transforma normales— sale cerrada:
  //     n' = n - vec3(dD/dx, dD/dy, 0) * n.z
  // Un seno tiene derivada conocida, o sea que no hay que muestrear nada. Dos lineas y ningun error de
  // diferencias finitas. En los costados del tubo, donde n.z vale cero, la normal no se toca — que es
  // justo lo correcto: la pared del hilo sigue mirando para el costado.
  //
  // La misma funcion para los tres materiales: three usa `onBeforeCompile.toString()` como clave de
  // cache del programa, asi que compartir la referencia es tambien compartir el shader compilado.
  const uT = { value: 0 }
  const uAmp = { value: 0 }
  const ondular = (sh) => {
    sh.uniforms.uT = uT
    sh.uniforms.uAmp = uAmp
    sh.vertexShader = 'uniform float uT; uniform float uAmp;\n' + sh.vertexShader
    // LA ONDA TIENE QUE ENTRAR MAS DE UNA VEZ EN EL PAÑO. Con la frecuencia en 1.30 el largo de onda
    // daba 4.8 y la tela mide 3.8 de ancho: menos de un ciclo, o sea que toda la tela se inclinaba junta
    // y no se distinguia del giro del grupo — en el render se veia PLANA, que es exactamente lo que
    // este hero no puede permitirse. Con 2.10 entra una onda y media a lo ancho y una a lo alto, asi que
    // hay cresta y valle en el mismo cuadro, que es lo unico que se lee como tela.
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>',
      'float ang = position.x * 2.10 + position.y * 1.15 - uT * 1.75;\n' +
      'float dpx = 2.10 * cos(ang) * uAmp;\n' +
      'float dpy = 1.15 * cos(ang) * uAmp;\n' +
      'vec3 objectNormal = normalize(normal - vec3(dpx, dpy, 0.0) * normal.z);')
    // `ang` se declaro arriba y sigue en alcance: en el vertex shader de three
    // `beginnormal_vertex` va antes que `begin_vertex`, dentro del mismo main.
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>',
      'vec3 transformed = position + vec3(0.0, 0.0, sin(ang) * uAmp);')
  }

  // ---------------------------------------------------------------- materiales
  // Tres colores y no uno. Una tela de un solo tono es una malla; lo que la vuelve TELA es que se vea
  // cual hilo va a lo largo y cual cruza. La trama ademas lleva el acento de la marca mezclado en el
  // color —`nivel` con tinte—, o sea que el color de la marca entra TEJIDO y no pegado encima.
  //
  // El color pasa por `nivel`, que interpola de FONDO a TINTA: un valor fijo hace que el objeto
  // desaparezca en una de las dos polaridades, y en este repo ya paso tres veces. En mundo claro hace
  // falta mas separacion, porque ahi no hay bloom que ayude a recortar la silueta.
  const hilar = (color) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: hex(color), roughness: 0.68, metalness: 0.0,
      // `sheen` ES el hero. Es el borde encendido de una fibra con pelusa, y es lo unico que separa un
      // hilo de un fideo de plastico. Sale por una fraccion de lo que costaria `transmission`.
      sheen: 1.0, sheenRoughness: 0.45, sheenColor: hex(LOOK.acento),
      clearcoat: 0.16, clearcoatRoughness: 0.7,
    })
    m.onBeforeCompile = ondular
    return m
  }
  const matUrd = hilar(nivel(CLARO ? 0.40 : 0.28))
  const matTra = hilar(nivel(CLARO ? 0.46 : 0.36, 0.30))
  // DOS PASADAS DE COLOR PLENO, y es lo que convierte una tela en la tela DE ALGUIEN. Una franja tejida
  // es la marca mas vieja que existe en textil. Va en `acento2` y sin pasar por `nivel` a proposito:
  // los acentos del aire estan elegidos para funcionar en las dos polaridades, que es justo lo que
  // `nivel` sale a resolver para los grises.
  const matFra = hilar(LOOK.acento2)

  // ---------------------------------------------------------------- los hilos
  // El azar se gasta primero en una fase, que es donde da exactamente lo mismo por donde empiece un
  // seno: `rnd()` es un congruencial lineal y su primer tiro casi no depende de la semilla (medido en
  // cinta.js sobre diez semillas: 0.236, 0.237, 0.237, 0.238...). La primera decision que se le pide
  // sale casi siempre igual.
  const fase = rnd() * 6.283
  const fase2 = rnd() * 6.283

  // LA PUNTA DEL HILO SE CIERRA, Y ESTO SE VIO MIRANDO UN RECORTE A ESCALA 1:1 — en la tira reducida
  // no estaba. `TubeGeometry` deja los dos extremos ABIERTOS: son anillos sin tapa. Con el material a
  // una sola cara, la cara interna se descarta y por el agujero se ve directamente el fondo, asi que
  // cada orillo terminaba en una MUESCA NEGRA con forma de cuña. A tamaño de tira parecia un remate; a
  // resolucion real es un hilo hueco.
  //
  // La solucion no agrega geometria: se colapsa el ultimo anillo de cada punta contra el centro de la
  // curva, o sea que el tubo cierra en cono. Un hilo cortado termina en punta, no en caño, asi que la
  // forma correcta y la que tapa el agujero son la misma. Los vertices se ubican por su `uv.x` —que en
  // un tubo vale el indice del anillo sobre los segmentos—, el mismo truco que usa `acintar` en
  // cinta.js para no depender del orden en que three escupe los vertices.
  //
  // EL LARGO DEL CONO ES UN SEGMENTO Y NO DOS, y esto tambien salio de mirar. Repartido en dos anillos
  // —0.58 y 0—, el remate medía casi el doble del diametro del hilo y los orillos salieron como
  // ESTACAS AFILADAS: la tela de arriba parecia una empalizada. En un solo segmento el cono queda a
  // casi cincuenta grados, o sea romo, que es lo que se ve cuando se corta un hilo con tijera. El
  // hombro en 0.85 saca la arista que dejaria el corte seco.
  const rematar = (geo, curva, segs) => {
    const pos = geo.attributes.position, uv = geo.attributes.uv
    const v = new THREE.Vector3(), P = new THREE.Vector3()
    for (let k = 0; k < pos.count; k++) {
      const j = Math.round(uv.getX(k) * segs)
      const d = Math.min(j, segs - j)
      if (d > 1) continue
      curva.getPointAt(j / segs, P)
      v.fromBufferAttribute(pos, k)
      v.sub(P).multiplyScalar(d === 0 ? 0 : 0.85).add(P)
      pos.setXYZ(k, v.x, v.y, v.z)
    }
    pos.needsUpdate = true
    geo.computeBoundingSphere()
  }

  const tejer = (pts, mat) => {
    const curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
    const geo = new THREE.TubeGeometry(curva, pts.length - 1, RADIO, 8, false)
    rematar(geo, curva, pts.length - 1)
    geo.setDrawRange(0, 0)
    const m = new THREE.Mesh(geo, mat)
    gOnda.add(m)
    // `TubeGeometry` genera sus indices anillo por anillo AVANZANDO POR LA CURVA —el bucle de afuera es
    // el que recorre el camino—, asi que dibujar los primeros k anillos es exactamente "el hilo llego
    // hasta ahi". No hace falta ninguna geometria nueva ni ninguna deformacion: seis indices por
    // segmento y el hilo aparece con su grosor definitivo desde el primer milimetro.
    return { geo, anillos: pts.length - 1 }
  }

  // URDIMBRE: verticales. Se montan primero porque es lo que se hace primero en un telar.
  const urdimbre = []
  {
    const yA = Y0 - EY, yB = Y0 + ALTO + EY
    const nS = Math.max(8, Math.round(((yB - yA) / PY) * MU))
    for (let i = 0; i < NU; i++) {
      const x = X0 + i * PX
      const pts = []
      for (let s = 0; s <= nS; s++) {
        const y = yA + (yB - yA) * (s / nS)
        pts.push(new THREE.Vector3(x, y, A * Math.cos(Math.PI * ((y - Y0) / PY + i))))
      }
      urdimbre.push(tejer(pts, matUrd))
    }
  }

  // TRAMA: horizontales, y cada una empieza del lado contrario a la anterior. La lanzadera va y vuelve.
  const trama = []
  {
    const xA = X0 - EX, xB = X0 + ANCHO + EX
    const nS = Math.max(8, Math.round(((xB - xA) / PX) * MU))
    // Las dos franjas no van pegadas ni simetricas: dos rayas juntas se leen como un error de tejido y
    // dos simetricas como un marco. Separadas por tres pasadas, se leen como un patron.
    const franjas = new Set([3, 7])
    for (let j = 0; j < NT; j++) {
      const y = Y0 + j * PY
      const pts = []
      for (let s = 0; s <= nS; s++) {
        // Las impares se CONSTRUYEN al reves, que es lo que hace que `setDrawRange` las dibuje desde la
        // derecha: la direccion del tejido vive en el orden de los puntos, no en una bandera aparte.
        const k = j % 2 ? nS - s : s
        const x = xA + (xB - xA) * (k / nS)
        pts.push(new THREE.Vector3(x, y, -A * Math.cos(Math.PI * ((x - X0) / PX + j))))
      }
      trama.push(tejer(pts, franjas.has(j) ? matFra : matTra))
    }
  }

  // ================================================================ TIEMPO

  // MONTAR LA URDIMBRE: nueve hilos que se tienden de abajo hacia arriba en el primer beat. Son rapidos
  // y escalonados porque no son el sujeto: son la preparacion, y una preparacion que dura mucho se lee
  // como que la escena todavia no empezo.
  const urd = urdimbre.map((h, i) => ({ h, t0: b(0.02 + i * 0.075), dur: b(0.34) }))

  // LA LANZADERA CAE EN MEDIOS BEATS EXACTOS. `pasosEnBeats` —que es lo que usan `telefono` y
  // `columnata` para lo mismo— no sirve aca: esa funcion existe para repartir UN objeto entre N
  // paradas y tiene el tope en ocho, y aca hay once objetos distintos, uno por pasada. Lo que la regla
  // pide de verdad es que cada evento caiga en el pulso, y once pasadas separadas por medio beat lo
  // cumplen por construccion.
  const T0 = b(1.0), PASO = b(0.5)
  // CUANTO DURA LA PASADA: TIEMPO FIJO, NO UNA FRACCION DEL COMPAS. Es la leccion que costo un render
  // entero en `mesa`: un gesto declarado como fraccion del paso dura medio segundo a tempo lento —
  // catorce cuadros arrastrados— y dos cuadros a tempo rapido. Un tiro de lanzadera dura lo que dura.
  // `deslizFijo` devuelve esa fraccion ya calculada contra el tempo vigente y con su tope.
  const PASE = deslizFijo(NT * PASO, NT) * PASO

  // EL PEINE. Cada pasada termina con el golpe que empuja la trama contra las anteriores; `golpe` es un
  // escalar que los tweens mueven y que el onUpdate LEE, asi que el sacudon entra en la tela sin que
  // dos escritores toquen la misma amplitud.
  const golpe = { v: 0 }
  const amp = { v: 0 }

  const tra = trama.map((h, j) => ({ h, t0: T0 + j * PASO }))
  for (const p of tra) {
    tl.to(golpe, { v: 1, duration: b(0.05), ease: E.acelera(2) }, p.t0 + PASE)
    tl.to(golpe, { v: 0, duration: b(0.36), ease: E.frena(3) }, p.t0 + PASE + b(0.05))
  }

  // La ondulacion entra cuando ya hay PAÑO. Con dos pasadas puestas, una onda no se lee como tela
  // moviendose: se lee como que los hilos vibran sueltos, que es lo contrario de lo que el objeto dice.
  tl.fromTo(amp, { v: 0 }, { v: RADIO * 3.2, duration: b(1.7), ease: E.frena(2), immediateRender: false }, b(2.2))

  // ---------------------------------------------------------------- lo continuo
  // UN SOLO ESCRITOR para todo lo que depende del reloj: el tejido (drawRange), la ondulacion (los dos
  // uniforms) y el balanceo.
  //
  // VA EN EL onUpdate DE LA TIMELINE Y NO EN UN `deriva`, Y ESTO LO CAZO LA COMPUERTA DE DETERMINISMO.
  // `deriva` cuelga un tween hijo puesto en 0, y GSAP renderiza sus hijos ORDENADOS POR TIEMPO DE
  // INICIO: los tweens de `golpe` y de `amp` arrancan mas tarde, asi que se renderizan DESPUES y esta
  // funcion leia sus valores del cuadro ANTERIOR. Avanzando cuadro a cuadro el error es de un frame y
  // no se ve; se ve cuando la aguja SALTA EN FRIO, que es lo que hace un editor al arrastrarla y lo que
  // hace el verificador al construir dos veces y comparar. Es el defecto que documenta telefono.js.
  //
  // El onUpdate de la TIMELINE corre despues de todos sus hijos, que es la garantia que hace falta.
  // `main.js` avanza con `tl.time(t, false)` —sin suprimir eventos—, asi que dispara. Y hay que
  // llamarlo a mano una vez, porque GSAP no dispara onUpdate en el instante cero.
  const dibujar = (h, k) => h.geo.setDrawRange(0, Math.round(Math.min(1, Math.max(0, k)) * h.anillos) * 8 * 6)
  const animar = () => {
    const t = tl.time()
    for (const p of urd) dibujar(p.h, (t - p.t0) / p.dur)
    for (const p of tra) dibujar(p.h, (t - p.t0) / PASE)

    uT.value = t
    // El golpe del peine no mueve la tela: le SUBE la onda. Un sacudon de posicion se leeria como que
    // alguien golpeo la camara; una onda que crece de golpe y se apaga es lo que hace un paño tensado
    // cuando lo empujan desde un borde.
    uAmp.value = amp.v * (1 + golpe.v * 0.55)

    // El paño gira despacio sobre su eje vertical: es lo unico que demuestra que el entramado es
    // GEOMETRIA y no un dibujo. Una tela quieta de frente y una textura de tela son el mismo cuadro.
    gOnda.rotation.y = Math.sin(t * 0.37 + fase) * 0.13
    gOnda.rotation.x = Math.sin(t * 0.29 + fase2) * 0.05
    gOnda.position.y = Math.sin(t * 0.24 + fase2) * mundoH * 0.008
  }
  tl.eventCallback('onUpdate', animar)
  animar()

  // ---------------------------------------------------------------- camara
  // Se acerca mientras la tela se teje y VUELVE a su marca antes del corte: la escena siguiente arranca
  // contando con (0, 0, distBase). El acercamiento tampoco es adorno — sin paralaje, un entramado
  // plano se lee pegado a la imagen de atras, que es exactamente el error que este hero viene a evitar.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.55) },
    { z: dolly(distBase, -0.50), duration: DUR * 0.82, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // ---------------------------------------------------------------- salida
  // La tela GIRA hasta ponerse de canto mientras se va de lado. Es la salida que respeta lo que el
  // objeto es: un paño no se achica ni se apaga, se retira — y al ponerse de canto desaparece por su
  // propio grosor, que ademas deja ver por ultima vez que tiene relieve.
  const SAL = DUR - b(0.9)
  tl.to(gTela.rotation, { y: -1.25, duration: b(0.85), ease: E.acelera(2) }, SAL)
  tl.to(gTela.position, { x: -mundoW * 0.75, duration: b(0.85), ease: E.acelera(3) }, SAL)

  return { g, tl }
}
