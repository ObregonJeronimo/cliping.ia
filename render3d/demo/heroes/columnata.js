// HERO "columnata" — monolitos que se levantan a los costados y la camara entra entre ellos.
//
// QUE REGISTRO LLENA, Y POR QUE FALTABA
// Los heroes de geometria pura que ya habia dicen todos lo mismo: cosa suelta flotando. El cristal es
// materia, el toro es orbita, el enjambre es sistema, la cinta es gesto. Ninguno dice PESO, y ninguno
// dice ARQUITECTURA. Son los dos registros que piden `lujo`, `inmobiliario` y `corporativo` — una
// consultora, un estudio, un desarrollo— y hasta ahora esas piezas recibian un cristal girando, que
// vende precision pero no vende solidez. Un monolito no flota: esta apoyado, y eso es lo que se lee.
//
// POR QUE SE LEVANTAN Y NO APARECEN
// Un objeto que aparece se lee como un corte; uno que SUBE desde abajo del cuadro se lee como que algo
// lo puso ahi. Es la misma diferencia entre una lista que se escribe y una que ya estaba. Suben de a
// uno por medio beat, en peldaños duros: la doctrina del obturador de esta pieza dice que lo que se
// mueve en continuo se difumina y lo que se detiene se lee, y una columna que sube y FRENA da un
// evento contable donde una que sube parejo da un barrido.
//
// LA CAMARA ENTRA, PERO VUELVE
// El contrato del motor es que cada escena devuelve la camara a su marca. El acercamiento aca no es un
// adorno: es lo unico que convierte una fila de cajas en un espacio por el que se pasa. Sin el, los
// monolitos son siluetas recortadas contra el fondo; con el, tienen adelante y atras.
//
// NO USA NADA DE LA PAGINA. Es de los que siempre se pueden armar — cuando la captura fallo, cuando el
// sitio bloqueo al bot, cuando la pagina esta detras de un login. Ver el registro en heroes/index.js.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, nivel, CLARO, dolly, escalera, deslizFijo, pasosEnBeats } from '../kit.js'

export const meta = {
  id: 'columnata',
  nombre: 'Columnata',
  necesita: ['nada'],
  beats: 8,
}

// Impar, y no es un capricho: con un numero par de monolitos el hueco central queda partido por una
// columna justo en el eje del cuadro, que es donde vive el sujeto de casi todas las escenas vecinas.
const N = 7

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  const gC = new THREE.Group()
  g.add(gC)

  // ---------------------------------------------------------------- los monolitos
  // El ancho sale del cuadro y no de un numero suelto: si mañana cambia `mundoW`, la columnata sigue
  // ocupando la misma fraccion del encuadre en vez de descolocarse.
  const ANCHO = mundoW * 0.150
  const FONDO = mundoW * 0.150
  const CARRIL = mundoW * 0.300                 // cuanto se separan del eje

  const cols = []
  for (let i = 0; i < N; i++) {
    // Alternan lado y se van hacia el fondo. La profundidad la reparte el indice y no el azar: dos
    // monolitos a la misma z se tapan y el hueco central se cierra.
    const lado = i % 2 ? 1 : -1
    const z = -0.6 - i * 1.35
    // La altura varia, pero POCO. Con alturas muy distintas la fila deja de leerse como una serie y
    // pasa a ser un grafico de barras, que es exactamente la lectura equivocada.
    const alto = mundoH * (0.46 + rnd() * 0.20)

    const cuerpo = new THREE.Mesh(
      new THREE.BoxGeometry(ANCHO, alto, FONDO),
      new THREE.MeshPhysicalMaterial({
        // `nivel(x)` interpola de FONDO a TINTA, no de claro a oscuro. Un 0.16 fijo deja el monolito a
        // un 16% del fondo en las DOS polaridades: sobre negro queda oscuro y con el estudio encima se
        // despega, pero sobre blanco queda casi blanco y la columnata desaparece contra su propio
        // fondo. Es la misma trampa que costo el gancho ilegible de basecamp. En claro hace falta mas
        // separacion porque ahi no hay bloom que ayude a recortar la silueta.
        color: hex(nivel(CLARO ? 0.34 : 0.18)), roughness: 0.42, metalness: 0.22,
        // Sin `clearcoat` un prisma mate contra un fondo plano se lee como un rectangulo pintado: lo
        // que lo vuelve un objeto es el reflejo del estudio corriendo por su canto al girar la camara.
        clearcoat: 0.5, clearcoatRoughness: 0.35,
      }))
    // Anclado por la BASE y no por el centro: la columna crece hacia arriba desde el piso, que es como
    // se levanta algo apoyado. Con el pivote al medio sube y baja a la vez, y se lee como que flota.
    cuerpo.geometry.translate(0, alto / 2, 0)

    const col = new THREE.Group()
    col.position.set(lado * CARRIL, -mundoH * 0.42, z)
    col.add(cuerpo)

    // EL FILETE DE ACENTO VA EN LA CARA INTERIOR, la que mira al eje. Es lo unico de color del hero, y
    // puesto afuera no se veria nunca: la camara entra por el medio. Adentro hace de luz de pasillo y
    // ademas separa cada monolito del que tiene detras, que sin el se funden en una sola mancha.
    const filete = new THREE.Mesh(
      new THREE.PlaneGeometry(alto * 0.86, ANCHO * 0.20),
      matAcento(i % 3 === 1 ? LOOK.acento2 : LOOK.acento, 1.6))
    filete.rotation.z = Math.PI / 2
    filete.rotation.y = lado > 0 ? -Math.PI / 2 : Math.PI / 2
    filete.position.set(-lado * (ANCHO / 2 + 0.012), alto * 0.5, 0)
    filete.material.opacity = 0
    filete.material.transparent = true
    col.add(filete)

    gC.add(col)
    cols.push({ col, filete, alto, y0: -mundoH * 0.42, lado })
  }

  // ---------------------------------------------------------------- el piso
  // Una linea de horizonte, no un plano. Un plano de piso necesita luz e iluminacion propia para no
  // salir como una mancha gris; una linea da el apoyo con un objeto y sin ninguna cuenta de sombreado.
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 2.4, mundoH * 0.004),
    matAcento(LOOK.acento, 0.9))
  piso.position.set(0, -mundoH * 0.42, -5.0)
  piso.material.transparent = true
  piso.material.opacity = 0
  gC.add(piso)

  // ================================================================ TIEMPO
  // UNA COLUMNA POR MEDIO BEAT, en peldaños. `pasosEnBeats` obliga a que los tirones caigan en la
  // grilla y `deslizFijo` fija el tramo en movimiento en 0.18 s pase lo que pase con el tempo: es la
  // cuenta que aprendimos a los golpes en `telefono` — un desliz declarado como fraccion del paso dura
  // medio segundo a tempo lento y catorce cuadros salen barridos.
  const BEATS_SUBIDA = meta.beats - 3
  const PASOS = pasosEnBeats(BEATS_SUBIDA, N)
  const DESLIZ = deslizFijo(b(BEATS_SUBIDA), PASOS)

  cols.forEach((c, i) => {
    const t0 = b(0.20 + i * 0.42)
    // Sube y SE PASA un poco antes de asentarse: un monolito que llega exacto se lee como colocado a
    // mano, uno que rebota apenas se lee como que tiene masa.
    tl.fromTo(c.col.position, { y: c.y0 - c.alto * 1.05 },
      { y: c.y0, duration: b(0.62), ease: E.llega(1.6), immediateRender: false }, t0)
    tl.fromTo(c.filete.material, { opacity: 0 },
      { opacity: 0.92, duration: b(0.40), ease: E.frena(3), immediateRender: false }, t0 + b(0.22))
  })
  tl.fromTo(piso.material, { opacity: 0 }, { opacity: 0.7, duration: b(0.9), ease: E.frena(2), immediateRender: false }, 0)

  // ---------------------------------------------------------------- lo continuo
  // La compuerta pide que nada descanse mas de un beat, y ademas un cuadro donde todo esta clavado se
  // lee como una foto. El grupo entero deriva y gira apenas: es UN solo escritor sobre `gC`, que es la
  // regla que evita que dos tweens se peleen por el ultimo render.
  const fase = rnd() * 6.28
  const mover = () => {
    const t = tl.time()
    const u = Math.min(1, t / DUR)
    gC.position.x = Math.sin(t * 0.42 + fase) * mundoW * 0.012
    gC.position.y = Math.sin(t * 0.31) * mundoH * 0.006
    // El giro es CHICO y en escalones junto con la camara: una columnata que orbita se convierte en un
    // carrusel y pierde lo unico que vino a decir, que es que las cosas estan quietas y apoyadas.
    gC.rotation.y = (escalera(u, PASOS, DESLIZ) - 0.5) * 0.16
  }
  tl.to({}, { duration: DUR, ease: 'none', onUpdate: mover }, 0)
  mover()

  // ---------------------------------------------------------------- camara
  // Entra entre los monolitos y VUELVE a su marca antes del corte. El contrato del motor no admite que
  // una escena deje la camara donde termino: la siguiente arranca contando con (0,0,distBase).
  tl.fromTo(camera.position, { z: dolly(distBase, 0.55) },
    { z: dolly(distBase, -1.35), duration: DUR * 0.82, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // ---------------------------------------------------------------- salida
  // Se hunden en el orden inverso al que subieron. Que salga primero la que llego ultima deja el hueco
  // central abierto hasta el final, que es por donde la escena siguiente va a entrar.
  const SAL = DUR - b(1.0)
  cols.forEach((c, i) => {
    const k = cols.length - 1 - i
    tl.to(c.col.position, { y: c.y0 - c.alto * 1.05, duration: b(0.52), ease: E.acelera(2) }, SAL + k * b(0.06))
    tl.to(c.filete.material, { opacity: 0, duration: b(0.34), ease: E.acelera(2) }, SAL + k * b(0.06))
  })
  tl.to(piso.material, { opacity: 0, duration: b(0.5), ease: E.acelera(2) }, SAL + b(0.3))

  return { g, tl }
}
