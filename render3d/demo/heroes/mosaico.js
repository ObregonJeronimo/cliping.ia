// HERO "mosaico" — los pedazos REALES de la página vuelan y se arman en formación.
//
// ES EL HERO QUE MÁS IMPORTA, Y ES EL QUE FALTABA.
// El motor extrae de cada página sus objetos de verdad como PNG con transparencia: el logo, los
// botones, las tarjetas, las fotos (backend/element_extract.py). De Stripe salen doce. De otras,
// cincuenta. Y no aparecían en NINGUNA escena: se medían, se recortaban, se guardaban y se tiraban.
//
// La diferencia entre este hero y todos los demás es lo que el espectador entiende. Un toro de geometría
// pura con la paleta de la marca dice "alguien hizo un video". Las tarjetas reales de su propia home
// girando en el aire dicen "esto es MI página" — y eso no lo puede fingir ninguna plantilla, porque el
// material no existía hasta que se midió esa página.
//
// LA COMPOSICIÓN SE ADAPTA A CUÁNTOS HAY, Y ESO NO ES UN DETALLE
// Una página puede dar dos recortes o dieciséis. Con una grilla fija, dos recortes dejan catorce
// agujeros y dieciséis se pisan. Acá el número de columnas sale de la cantidad, y los tamaños de la
// relación de aspecto real de cada pieza — un botón ancho y una foto cuadrada no pueden ocupar la misma
// celda sin deformarse, y deformar el logo de alguien es peor que no mostrarlo.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, planoRecorte, recortesDe, dolly, topeNitido} from '../kit.js'

export const meta = {
  id: 'mosaico',
  nombre: 'Mosaico de la página',
  necesita: ['elementos'],
  beats: 8,
}

// Orden de preferencia. El logo primero porque es lo único que identifica a la marca de un vistazo;
// después las tarjetas, que son las piezas más "diseñadas" de una landing; después fotos y botones.
const ROLES = ['logo', 'tarjeta', 'foto', 'cta']
// CINCO Y NO NUEVE. Medido sobre un video real, esta era la escena mas floja de toda la pieza: 0.069
// de movimiento y 0.093 de ocupacion, contra 0.226 y 0.317 de la referencia. 0.093 quiere decir que
// los recortes de la pagina cubren menos del 10% del cuadro — nueve estampillas flotando en el medio
// de la pantalla. La escena que MAS deberia mostrar la pagina del usuario era la que menos la mostraba.
//
// La aritmetica lo explica sola: nueve piezas en tres columnas dan celdas de 1.6 de ancho, y un
// recorte apaisado —que es la forma de casi toda tarjeta de landing— queda limitado por el ancho y
// sale de 0.46 de alto en un cuadro de 10. Menos piezas y mas grandes muestran MAS pagina, no menos.
const MAX = 5

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, datosEls } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()          // los recortes van post-bloom: traen los colores de la marca
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // Se piden mas recortes de los que entran en el cuadro. Los que sobran no se descartan: son los
  // RELEVOS, y son lo que convierte al mosaico de una foto de familia en algo que pasa.
  const elegidos = recortesDe(datosEls || [], ROLES, MAX + 4)
  const piezas = []
  for (const e of elegidos) {
    const tex = texturas && texturas.get(e.url)
    if (!tex || !tex.image) continue
    piezas.push({ e, tex, ar: tex.image.width / tex.image.height })
  }

  // Los primeros MAX arman la formacion; el resto espera turno.
  const relevos = piezas.slice(MAX)
  piezas.length = Math.min(piezas.length, MAX)

  // Sin material no hay mosaico. Devolver un grupo vacío es correcto y es lo que manda la regla: el
  // registro de heroes no debería haber ofrecido este hero para esta página, y si igual llegó acá, una
  // escena vacía es honesta — inventar rectángulos de relleno con la paleta no lo sería.
  if (!piezas.length) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl }
  }

  // COLUMNAS SEGÚN CUÁNTOS HAY. Con 1 o 2 piezas una grilla es un chiste: van grandes y centradas.
  const n = piezas.length
  // BENTO, no grilla pareja. La primera pieza —el logo, o la tarjeta mejor puntuada— ocupa una banda
  // ANCHA sola, y el resto se reparte en dos columnas debajo. Es la unica forma de que un recorte
  // apaisado llegue a medir algo en un cuadro vertical: cruzando el ancho entero.
  //
  // Y SANGRA. Una tarjeta ancha cortada por los dos bordes se lee mejor que una entera y chiquita, y
  // ademas dice "hay mas pagina que la que entra", que es cierto. Es la misma decision que ya estaba
  // tomada y documentada en la escena de rafaga.
  // 1.06 y no 1.16, por la misma razon que en la rafaga: un recorte de pagina lleva su contenido
  // adentro y sangrarlo se lo come. Ver el comentario largo alla.
  const ANCHO_UTIL = mundoW * 1.0
  const ALTO_UTIL = mundoH * 0.80
  const AIRE = 0.95
  const destacada = n >= 3                       // con una o dos piezas no hay jerarquia que armar
  const resto = destacada ? n - 1 : n
  const cols = resto <= 1 ? 1 : 2
  const filas = Math.max(1, Math.ceil(resto / cols))
  // LA BANDA MIDE LO QUE MIDE SU PIEZA, no un porcentaje fijo.
  //
  // Con 42% del alto reservado siempre, un logo de relacion 7.92 —que es lo que devuelve la extraccion
  // en muchas paginas, porque un logotipo es una tira— ocupa 0.78 de alto y deja 2.6 unidades de
  // cuadro RESERVADAS Y VACIAS. Medido: la misma escena da 0.518 de ocupacion sobre una pagina de
  // tarjetas anchas (Stripe) y 0.158 sobre una de logo-tira y fotos cuadradas (Tailwind). No es que
  // una pagina tenga menos material: es que el reparto no miraba QUE material tiene.
  //
  // Ahora la banda pide exactamente el alto que su pieza puede llenar cruzando el ancho, con un tope
  // por si la pieza es cuadrada (una foto de relacion 1 se comeria el cuadro entero), y todo lo que no
  // usa vuelve a la grilla de abajo.
  const arBanda = destacada ? Math.max(0.05, piezas[0].ar) : 1
  const altoBanda = destacada
    ? Math.min(ALTO_UTIL * 0.46, (ANCHO_UTIL * AIRE) / arBanda)
    : 0
  const celdaW = ANCHO_UTIL / cols
  const celdaH = (ALTO_UTIL - altoBanda) / filas

  const gM = new THREE.Group()
  g.add(gM)
  // LOS RECORTES TIENEN QUE BARRER CON EL CONJUNTO, Y NO COLGABAN DE NADA QUE BARRA. El barrido de
  // gM (0.20 rad, mas abajo) no los tocaba: viven en gr, la escena post-bloom, asi que copiarle la
  // rotacion los hacia girar sobre su PROPIO centro y quedarse clavados. Medido apagando el barrido
  // en su pico, con el tiempo y la camara congelados: las cinco piezas daban |Delta mundo| = 0.000000
  // y 0.0 px de paralaje, contra 0.079 que si se movia el filete —el unico hijo real de gM—.
  // Colgando los recortes de un grupo que copia esa rotacion, la pieza de adelante (z=0.55) corre
  // +21.5 px y la de atras (z=-1.10) -47.1 px: 68.6 px de diferencial, que es el paralaje que el
  // comentario del barrido dice que el 0.20 hace visible.
  const gRe = new THREE.Group()
  gr.add(gRe)

  const mallas = []
  piezas.forEach((p, i) => {
    // La destacada es la pieza 0 y vive en su propia banda; el resto se indexa desplazado.
    const esBanda = destacada && i === 0
    const j = destacada ? i - 1 : i
    const col = esBanda ? 0 : j % cols
    const fila = esBanda ? -1 : Math.floor(j / cols)
    // La pieza entra en su celda por el lado que la limita, nunca estirada. Un logo apaisado en una
    // celda cuadrada tiene que sobrar por arriba y por abajo, no achatarse.
    const anchoCelda = esBanda ? ANCHO_UTIL : celdaW
    const altoCelda = esBanda ? altoBanda : celdaH
    const hPorAlto = altoCelda * AIRE
    const hPorAncho = (anchoCelda * AIRE) / Math.max(0.05, p.ar)
    // TERCER LIMITE: LA RESOLUCION DEL ARCHIVO. La banda ancha de arriba —`piezas[0]`— toma el ancho
    // util entero, y ROLES pone 'logo' primero, asi que en toda pagina que de logo el caso por defecto
    // era estirar un PNG de 120x50 a 975 px de cuadro: 8.1 veces su resolucion, cruzando la parte
    // superior durante seis beats. Con linear da 5.5x y con tailwind 3.1x.
    //
    // El tope se aplica al ALTO porque es la variable con la que se compone aca, convirtiendo el ancho
    // maximo nitido a su alto equivalente. Una pieza de poca resolucion ocupa menos celda y deja aire
    // alrededor, que es preferible a llenarla con una version deshecha de si misma.
    const hPorNitidez = topeNitido(p.tex && p.tex.image, 1080, mundoW, 1.4) / Math.max(0.05, p.ar)
    const alto = Math.min(hPorAlto, hPorAncho, hPorNitidez)
    const m = planoRecorte(p.tex, alto)
    if (!m) return
    // La última fila puede estar incompleta: se centra sola en vez de quedar pegada a la izquierda.
    const enFila = esBanda ? 1 : Math.min(cols, resto - fila * cols)
    const x = esBanda ? 0 : (col - (enFila - 1) / 2) * celdaW
    // La banda va arriba de todo; las filas cuelgan debajo de ella.
    const y0 = ALTO_UTIL / 2 - altoBanda / 2
    const y = esBanda ? y0 : (y0 - altoBanda / 2) - celdaH * (fila + 0.5)
    // CADA PIEZA A SU PROPIA PROFUNDIDAD. Con todas en z=0 el mosaico es una lamina pegada: la camara
    // hace dolly durante toda la escena y no pasa nada, porque un plano frontal se acerca igual que
    // otro. Repartidas en una franja de profundidad, el mismo dolly produce PARALAJE — las de adelante
    // barren mas rapido que las de atras— y eso es movimiento de verdad, no un tween mas.
    //
    // Medido: con todas en cero, la escena daba 0.078 de pixeles en movimiento con la ocupacion ya
    // arreglada. Era la escena mas floja de la pieza y lo seguia siendo despues de llenarla.
    const z = esBanda ? 0.55 : ((j % 2 ? -0.75 : 0.35) + (fila % 2 ? -0.35 : 0.2))
    m.userData.destino = new THREE.Vector3(x, y, z)
    m.userData.rol = p.e.rol
    gRe.add(m)
    mallas.push(m)
  })

  // El fondo cede mientras el mosaico es el sujeto: doce recortes con su propia tipografía adentro y
  // una grilla en fuga son dos tramas finas peleando por el mismo ojo.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.30, duration: b(1), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // ------------------------------------------------------------------ tiempo
  // LLEGAN DESDE EL FONDO Y DESDE AFUERA, en desorden, y frenan en formación. El desorden es con la
  // semilla, así que dos renders del mismo video dan exactamente el mismo desorden.
  mallas.forEach((m, i) => {
    const ang = rnd() * Math.PI * 2
    const lejos = 3.4 + rnd() * 3.2
    m.position.set(
      m.userData.destino.x + Math.cos(ang) * lejos,
      m.userData.destino.y + Math.sin(ang) * lejos * 0.7,
      -5.5 - rnd() * 5)
    m.rotation.set((rnd() - 0.5) * 0.9, (rnd() - 0.5) * 1.5, (rnd() - 0.5) * 0.7)
    m.material.opacity = 0

    // El stagger va por DISTANCIA A LA CÁMARA y no por índice: las de atrás salen primero, así que el
    // grupo se lee como una nube que se ordena y no como una lista que se enumera.
    const t0 = b(0.15) + (i / Math.max(1, mallas.length)) * b(1.9)
    tl.to(m.material, { opacity: 1, duration: b(0.42), ease: E.frena(2) }, t0)
    tl.to(m.position, { x: m.userData.destino.x, y: m.userData.destino.y, z: m.userData.destino.z,
      duration: b(1.5), ease: E.llega(1.5) }, t0)
    tl.to(m.rotation, { x: 0, y: 0, z: 0, duration: b(1.7), ease: E.frena(3) }, t0)

    // NADA QUEDA QUIETO. Cada pieza respira con su propio período: si compartieran uno, el mosaico
    // entero latiría como una sola cosa, que se nota más que la quietud.
    // El respiro va en userData y lo aplica UN solo onUpdate al final, no un tween con `modifiers`:
    // eso sólo corre para propiedades declaradas en `vars` y acá no había ninguna. Ver telefono.js.
    m.userData.osc = { f: rnd() * 6.28, vel: 0.5 + rnd() * 0.5, amp: 0.05 + rnd() * 0.05, desde: t0 + b(1.5) }
  })

  // ---------------------------------------------------------------- RELEVOS
  // EL MOSAICO SE ACTUALIZA, como un panel en vivo. Es lo que arregla el ultimo numero que quedaba
  // mal: con la formacion ya llena y grande, la escena daba 0.518 de ocupacion —la mas alta de la
  // pieza— y 0.080 de pixeles en movimiento, la mas baja. Las dos cosas a la vez tienen una sola
  // explicacion: una tarjeta GRANDE deslizandose cambia solo sus BORDES, y el interior queda igual
  // cuadro a cuadro. Le puse profundidades distintas para que el dolly hiciera paralaje y subio dos
  // milesimas: el paralaje es suave y lo suave no cuenta, ni para la metrica ni para el ojo.
  //
  // Lo que si cuenta es que una pieza DEJE DE ESTAR y otra ocupe su lugar. Cada relevo cambia de golpe
  // un rectangulo entero del cuadro, que es exactamente lo que el ojo registra como corte. Y no es un
  // truco para el numero: un mosaico que se actualiza muestra MAS pagina del usuario en los mismos
  // seis beats.
  //
  // El relevo NUNCA toca la banda destacada (el logo): esa es el ancla de la composicion y la unica
  // pieza que identifica la marca. Lo que rota son las celdas de abajo.
  const cambios = []
  relevos.forEach((p, k) => {
    const destinoIdx = (destacada ? 1 : 0) + (k % Math.max(1, mallas.length - (destacada ? 1 : 0)))
    const base = mallas[destinoIdx]
    if (!base) return
    const alto = base.geometry.parameters.height
    const anchoCelda = ANCHO_UTIL / cols
    const h = Math.min(alto, (anchoCelda * AIRE) / Math.max(0.05, p.ar))
    const m = planoRecorte(p.tex, h)
    if (!m) return
    m.position.copy(base.userData.destino)
    m.visible = false
    m.material.opacity = 1
    // El relevo va al MISMO grupo que la pieza que reemplaza: si se quedara colgado de gr, ocuparia
    // la celda sin barrer y quedaria hasta 47 px corrido de la formacion que vino a completar.
    gRe.add(m)
    // Los relevos caen en beats enteros y escalonados: 3, 4, 5. Antes del 3 la formacion todavia se
    // esta armando y un cambio ahi se lee como un error de carga.
    const t = b(3 + k)
    if (t > DUR - b(1.2)) return                    // no tan cerca del final: no se llegaria a ver
    cambios.push({ base, m, t })
  })
  for (const c of cambios) {
    // Reemplazo DURO, como en la rafaga: un fundido de medio beat deja las dos piezas encima y se lee
    // como un error de superposicion, no como un cambio.
    tl.set(c.base, { visible: false }, c.t)
    tl.set(c.m, { visible: true }, c.t)
    tl.fromTo(c.m.scale, { x: 0.82, y: 0.82 }, { x: 1, y: 1, duration: b(0.3), ease: E.llega(2.6), immediateRender: false }, c.t)
  }

  // EL ACENTO SEPARA. Un mosaico de recortes con fondo propio es una pared de rectángulos; un filete
  // que barre por detrás le da un plano y una dirección.
  const filete = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_UTIL * 1.25, 0.055),
    new THREE.MeshBasicMaterial({ color: hex(LOOK.acento), toneMapped: false }))
  filete.position.set(0, -ALTO_UTIL * 0.5 - 0.35, -0.4)
  filete.scale.x = 0.0001
  gM.add(filete)
  tl.to(filete.scale, { x: 1, duration: b(0.7), ease: E.frena(4) }, b(2.1))

  // LA CÁMARA respira sobre el conjunto: sin paralaje, nueve planos a z=0 se leen como una sola imagen
  // pegada. Vuelve a distBase antes del corte — es contrato de escena.
  tl.fromTo(camera.position, { z: dolly(distBase, 1.5) }, { z: dolly(distBase, -0.5), duration: DUR * 0.8, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.2, ease: E.vaiven() }, DUR * 0.8)
  // El conjunto BARRE, no solo respira: un giro de 0.09 rad sobre nueve planos no mueve casi nada.
  // Con 0.20 y un desplazamiento lateral, el paralaje de las profundidades se hace visible.
  tl.to(gM.rotation, { y: 0.20, duration: DUR * 0.55, ease: E.vaiven() }, 0)
  tl.to(gM.rotation, { y: -0.06, duration: DUR * 0.45, ease: E.vaiven() }, DUR * 0.55)
  // gM mueve el filete; gRe le pasa esa misma rotacion a los recortes, que viven en la otra escena.
  // Acá también respira cada pieza: entre que llegó a su celda y que empieza a salir.
  // EL ORDEN IMPORTA Y CUESTA CARO. Esto colgaba de un tween hijo puesto en 0 con duracion DUR, y
  // GSAP renderiza sus hijos ORDENADOS POR TIEMPO DE INICIO: cualquier tween que arranque despues de 0
  // —la llegada, el vaiven, la salida— se renderiza DESPUES, o sea que la sincronizacion leia
  // transformaciones de un frame viejo. En el render no se notaba porque se avanza cuadro a cuadro y
  // el error de un frame es invisible; se veia recien en un SALTO en frio, que es lo que hace un
  // editor al arrastrar la aguja. Lo encontro la compuerta de determinismo el dia que empezo a mirar
  // tambien el grupo post-bloom.
  //
  // El onUpdate de la TIMELINE corre despues de todos sus hijos, que es exactamente la garantia que
  // hace falta. `main.js` avanza con `tl.time(t, false)`, o sea sin suprimir eventos, asi que dispara.
  tl.eventCallback('onUpdate', () => {
    const t = tl.time()
    gRe.rotation.y = gM.rotation.y
    for (const m of mallas) {
      // La y de la malla se anula porque gRe ya la lleva. No es una linea muerta: la entrada declara
      // un tumbo en y de hasta 0.75 rad (linea 174) que la copia anterior venia pisando cuadro a
      // cuadro. Sacarla le devuelve ese tumbo a la entrada —medido: 34.5 grados de diferencia en la
      // pieza 4— y eso es otro cambio, no este.
      m.rotation.y = 0
      const o = m.userData.osc
      if (o && t > o.desde && t < DUR - b(1.1)) {
        m.position.y = m.userData.destino.y + Math.sin(t * o.vel + o.f) * o.amp
      }
    }
  })

  // DESTAQUE POR BEAT: en cada beat, UNA pieza se adelanta y vuelve.
  //
  // Sin esto, una vez que las nueve llegaron a su celda el cuadro es una grilla que respira — bonita y
  // quieta. Medido sobre los heroes: el que sólo llegaba y flotaba daba 0.072 de movimiento y 61% de
  // frames casi quietos. Un adelanto de medio beat es un EVENTO duro, dirige el ojo a una pieza
  // concreta —que es lo que hace un editor con un corte— y cuesta un tween.
  //
  // El paso es 3 y no 1 para que la pieza destacada SALTE por la grilla en vez de recorrerla en orden:
  // recorrerla en orden se lee como un barrido automático, saltar se lee como una decisión.
  if (mallas.length > 1) {
    for (let i = 2; i < meta.beats - 1; i++) {
      // EL ACENTO TIENE QUE CAER SOBRE LA PIEZA QUE SE VE. La celda que le toca puede estar ya
      // relevada, y entonces esa malla quedo en visible:false. Medido a 30 fps sobre 88 cruces (11
      // aires x 4 semillas x 2 fixtures): 2 de los 5 acentos —los de los beats 4 y 6— escalaban 8
      // cuadros una malla apagada, y el destaque terminaba tocando 3 piezas visibles y no 5. Se
      // sigue el relevo mas reciente de esa celda; sin relevos el bucle no hace nada.
      const base = mallas[(i * 3) % mallas.length]
      let m = base
      for (const c of cambios) if (c.base === base && c.t <= b(i)) m = c.m
      // El destaque es de ESCALA y no de z: con la banda destacada delante, un adelanto en z de una
      // pieza chica no se lee. Un salto de escala si, y ademas no pelea con el paralaje.
      tl.to(m.scale, { x: 1.13, y: 1.13, duration: b(0.20), ease: E.llega(2.4) }, b(i))
      tl.to(m.scale, { x: 1, y: 1, duration: b(0.5), ease: E.frena(3) }, b(i + 0.24))
    }
  }

  // SALEN HACIA LA CÁMARA, escalonadas. El corte siguiente se siente ganado.
  // Salen TODAS, las de la formacion y las que las relevaron: una pieza que se quedo escondida y no
  // recibe la salida reaparece en el ultimo cuadro cuando el grupo se apaga.
  const salientes = [...mallas, ...cambios.map(c => c.m)]
  salientes.forEach((m, i) => {
    const t = DUR - b(0.95) + (i / Math.max(1, salientes.length)) * b(0.3)
    tl.to(m.position, { z: 5.5, duration: b(0.6), ease: E.acelera(3) }, t)
    tl.to(m.material, { opacity: 0, duration: b(0.45), ease: E.acelera(2) }, t + b(0.12))
  })

  return { g, gr, tl }
}
