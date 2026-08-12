// PLANTILLA "reticula" — la camara vuela DE COSTADO frente a un muro de baldosas de vidrio.
//
// EL GESTO
// Es la mas sobria de la boveda y la que mas se apoya en el TIPO. No hay objetos protagonicos: el
// volumen lo da un muro de baldosas que pasa de largo, y el movimiento lo da que la camara lo recorre
// LATERALMENTE en vez de acercarse. Cada bloque entra por un borde del cuadro y sale por el otro,
// arrastrado por el mismo desplazamiento que arrastra el muro.
//
// Existe porque no toda marca quiere un objeto. Un estudio de arquitectura, una consultora, un banco:
// para esos el poliedro giratorio es ruido, y lo que corresponde es tipografia grande sobre un plano.
//
// POR QUE SE REESCRIBIO ENTERA
// La primera version bajaba la camara despacio y prendia y apagaba los elementos por turnos. Eso es
// "escenas 3D con texto encima", no una template: sin nada que cruce el cuadro, una camara lenta se
// lee como una diapositiva por buena que sea la tipografia. El desliz lateral resuelve las tres reglas
// de una: la camara no para, todo cruza, y hay tres capas a velocidades distintas.
//
// EL DESLIZ ES EL VUELO QUE MEJOR APROVECHA EL FORMATO VERTICAL. En 1080x1920 el eje corto es el
// horizontal, asi que un objeto que lo cruza entra y sale rapido — y eso es exactamente lo que se
// quiere de un elemento que dura cuatro beats.
//
// LOS SEIS TIEMPOS (beats sobre 36)
//   0   ESPACIO   el muro pasando, el piso reflejando, el polvo a contraluz. Nada de texto.
//   4   MARCA     el nombre llega desde el frente y se planta mientras el muro sigue corriendo.
//   10  PROMESA   el claim entra desde arriba, en dos o tres renglones, sobre su cama.
//   16  PRUEBA    la pagina se levanta desde abajo como una lamina y gira al pasar.
//   24  RAZONES   las cifras cruzan en columna; las frases entran por el lado contrario.
//   30  PEDIDO    el desliz baja a velocidad de lectura y el CTA llega desde el fondo, latiendo.

import { THREE, vidrio, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloDesliz, entra, sale, acompanar, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'reticula',
  nombre: 'Retícula lateral',
  familia: 'arquitectura',
  necesita: ['nada'],
  beats: 36,
  tiempos: { espacio: 0, marca: 4, promesa: 10, prueba: 16, razones: 24, pedido: 30 },
  pitch: 'Vuelo lateral frente a un muro de baldosas de vidrio. Sobrio, tipográfico, de consultora.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  iluminar(escena, { key: 1.2, relleno: 0.42 })
  const uDomo = domo(escena, { fuerza: 0.22 })
  const motas = polvo(escena, 900, 34)

  // EL VUELO. `largo` es cuanto recorre la camara de punta a punta; el muro tiene que ser mas largo que
  // eso o se termina antes que la pieza — y un muro que se acaba deja ver el vacio detras.
  const LARGO = mundoW * 7.5
  const vuelo = vueloDesliz(camara, tl, { distBase, beats: meta.beats, largo: LARGO, dist: 0.98 })
  const xEn = vuelo.xEn
  // El desliz no deriva lateralmente como el avance —ya se mueve en ese eje— pero si oscila en `y` y en
  // `z`. Lo que se le come al ancho es el vaiven de `z`: 0.7 unidades de acercamiento.
  const UTIL = (k) => anchoConDeriva(mundoW, 0.35, k)

  // ---------------------------------------------------------------- el espacio: el muro
  //
  // TRES CAPAS Y NO UNA, que es lo unico que convierte un desliz en profundidad. La del medio es el
  // muro propiamente dicho; la de adelante son baldosas sueltas que pasan MUCHO mas rapido —cruzan el
  // cuadro en menos de un beat— y la de atras es una trama tenue que casi no se mueve.
  const T = mundoH * 0.42                       // lado de una baldosa
  const matBald = vidrio(LOOK.acento, { rug: 0.10, trans: 0.62, grosor: 1.8, opacidad: 0.9 })
  const matHueco = metal(nivel(0.10), 0.42)
  const baldosa = (esc, hueca) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(T * esc * 0.92, T * esc * 0.92, T * esc * 0.16),
      hueca ? matHueco : matBald)
    return m
  }
  const muro = new THREE.Group(), frente = new THREE.Group(), fondo = new THREE.Group()
  escena.add(muro); escena.add(frente); escena.add(fondo)
  // Semilla propia y determinista: `rnd` del ctx tambien la usan los bloques, y compartirla haria que
  // agregar un texto cambiara el dibujo del muro. Un muro que cambia porque la pagina trajo una frase
  // mas es un motor que no se puede depurar.
  let sem = 20240807
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }
  const COL = Math.ceil(LARGO / T) + 6
  for (let i = 0; i < COL; i++) {
    for (let j = -2; j <= 2; j++) {
      const r = az()
      if (r < 0.22) continue                    // huecos: un muro perfecto se lee como papel pintado
      const m = baldosa(1, r > 0.86)
      m.position.set(-LARGO / 2 - T * 3 + i * T, j * T, -T * (0.5 + az() * 0.9))
      muro.add(m)
    }
  }
  for (let i = 0; i < 26; i++) {
    const m = baldosa(0.55 + az() * 0.5, az() > 0.7)
    m.position.set(-LARGO / 2 + az() * LARGO * 1.4, (az() - 0.5) * mundoH * 1.6, distBase * (0.30 + az() * 0.22))
    frente.add(m)
  }
  for (let i = 0; i < 60; i++) {
    const m = baldosa(1.9, true)
    m.material = matHueco
    m.position.set(-LARGO / 2 + az() * LARGO * 1.2, (az() - 0.5) * mundoH * 3, -distBase * (0.6 + az() * 0.8))
    fondo.add(m)
  }

  // Un filete de luz corriendo a lo largo, a la altura del eje. Es lo que da la DIRECCION del vuelo:
  // sin una linea horizontal continua, un desliz lateral frente a un muro parece un temblor.
  const riel = barra(LARGO * 1.6, 0.05, LOOK.acento2 || LOOK.acento, 1.6)
  riel.position.set(0, -mundoH * 0.46, -T * 0.4)
  escena.add(riel)
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(LARGO * 2, 60), metal(nivel(0.05), 0.20))
  piso.rotation.x = -Math.PI / 2
  piso.position.set(0, -mundoH * 0.5, 8)
  escena.add(piso)

  // ---------------------------------------------------------------- los bloques
  const marca = bloqueMarca({ alto: 1.35, anchoMax: UTIL(0.9) * 0.92 })
  const promesa = bloquePromesa({ alto: 0.55, anchoMax: UTIL(0.95) * 0.90, maxLineas: 3 })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.54, ar: 1.55 })
  const cifras = bloquesCifra(3, { alto: 0.82, anchoMax: UTIL(0.9) * 0.55 })
  const frases = bloquesFrase(2, { alto: 0.30, anchoMax: UTIL(0.9) * 0.82 })
  const pedido = bloquePedido({ alto: 0.34, anchoMax: UTIL(0.9) * 0.66 })

  // TODO SE COLOCA CONTRA `xEn`, que es el equivalente de `zEn` en el vuelo de avance: donde tiene que
  // estar un objeto para que la camara lo tenga enfrente EN su beat. Elegir la x a ojo y el beat a ojo
  // es como se consigue una pieza en la que nada aparece cuando le toca.
  const enBeat = (g, beat, y, z) => { g.position.set(xEn(beat), y || 0, z || 0) }

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    enBeat(marca.g, 6.4, 0.55, distBase * 0.10)
    escena.add(marca.g)
    entra(marca.g, tl, 4, { desde: 'frente', dist: 5.5, dur: 1.7 })
    marca.escribir(tl, 4.4, 1.3)
    marca.borrar(tl, 8.6)
    sale(marca.g, tl, 8.8, { hacia: 'arriba', dist: 5.5, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    enBeat(promesa.g, 12.4, 0.1, distBase * 0.12)
    escena.add(promesa.g)
    entra(promesa.g, tl, 10, { desde: 'arriba', dist: 6.5, dur: 1.6 })
    promesa.escribir(tl, 10.4, 0.95)
    promesa.borrar(tl, 14.2)
    sale(promesa.g, tl, 14.4, { hacia: 'abajo', dist: 6.5, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // Se levanta desde abajo como una lamina y GIRA mientras la camara la pasa. En un desliz el giro no
  // es decorativo: es lo unico que impide que el plano se vea de canto justo cuando esta enfrente.
  if (prueba) {
    enBeat(prueba.g, 17.6, 0.1, distBase * 0.06)
    prueba.g.rotation.y = -0.45
    pagina.add(prueba.g)
    entra(prueba.g, tl, 16, { desde: 'abajo', dist: 8, dur: 2.0 })
    prueba.escribir(tl, 16.2, 1.1)
    prueba.recorrer(tl, 17, 5.6, 0.92)
    tl.to(prueba.g.rotation, { y: 0.42, duration: b(6.4), ease: 'none' }, b(16.8))
    // VIAJA CON LA CAMARA al 72%: sin esto se salia de cuadro en el beat 22, o sea a mitad de su
    // propio tiempo. Al 72% dura los ocho beats y ademas se sigue percibiendo que la camara la pasa.
    acompanar(prueba.g, tl, 17.6, 23.4, xEn, 0.72)
    sale(prueba.g, tl, 22.6, { hacia: 'arriba', dist: 8, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.10, giro: 0.025, fase: 0.6 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // Las cifras cruzan por arriba y las frases por abajo, cada familia hacia el lado contrario. Ese
  // cruce es lo que llena el tiempo mas largo de la pieza sin apilar dos cosas en el mismo sitio.
  cifras.forEach((c, i) => {
    const t0 = 24 + i * 2.2
    enBeat(c.g, t0 + 1.0, 1.15 - i * 0.15, distBase * 0.14)
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: 'der', dist: 6, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.75)
    sale(c.g, tl, t0 + 2.3, { hacia: 'izq', dist: 6.5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 24.8 + i * 2.6
    enBeat(f.g, t0 + 1.0, -1.55, distBase * 0.10)
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'izq', dist: 6, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.85)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: 'der', dist: 6.5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    // Plantado en el beat en que ENTRA, no en el ultimo: colocarlo en el 35 lo dejaba cuatro beats
    // fuera del cuadro esperando que la camara llegara. El bloque va donde la camara esta cuando el
    // bloque entra, y despues viaja.
    enBeat(pedido.g, 31.2, 0.15, distBase * 0.16)
    escena.add(pedido.g)
    entra(pedido.g, tl, 30, { desde: 'fondo', dist: 5.5, dur: 1.9 })
    // CLAVADO AL CUADRO (retraso 1.0). Es lo unico de la pieza que no se mueve respecto del ojo: el
    // ultimo bloque tiene que poder leerse y tipearse, y el muro corriendo detras alcanza y sobra para
    // que la camara siga sintiendose en movimiento.
    acompanar(pedido.g, tl, 31.2, meta.beats, xEn, 1.0)
    pedido.escribir(tl, 30.4, 0.9)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.6, duration: b(2.0), ease: E.frena(2) }, b(30))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // LAS CAPAS SE MUEVEN EN X, y `paralaje` mueve en Z — asi que aca no sirve y se escribe a mano. No es
  // una excepcion a la regla sino la misma regla en otro eje: lo cercano tiene que pasar mas rapido que
  // lo lejano, y en un desliz eso significa correr las capas contra el sentido de la camara.
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    frente.position.x = -t * 2.2
    fondo.position.x = t * 0.55
    riel.position.x = camara.position.x * 0.2
    motas.position.x = camara.position.x
    motas.rotation.z = t * 0.015
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
