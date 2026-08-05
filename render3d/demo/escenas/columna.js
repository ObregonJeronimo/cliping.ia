// ESCENA "columna" — un feed que sube. La pagina de verdad, apilada, avanzando a tirones como un pulgar.
//
// POR QUE EXISTE, CON EL NUMERO AL LADO
// El gate del guion reporta que 72 de 324 guiones quedan cortos porque SE ACABO EL CATALOGO: ocho
// escenas no llenan treinta segundos a tempo alto. Y el motor mide 0.118 de movimiento contra 0.226 de
// la pieza hecha a mano. Las dos brechas piden lo mismo — material nuevo, y del que NO descansa.
//
// Esta escena es la version mas barata de "no descansar": una sola idea y cuatro tirones en seis beats.
// No hay entrada ni salida de la composicion; cuando la escena empieza la columna YA venia subiendo y
// cuando termina sigue. Eso es lo que la separa de las otras siete, que arman un cuadro, lo sostienen y
// lo desarman. Lo que SI descansa, y a proposito, es la pieza entre tiron y tiron: ahi se la lee.
//
// POR QUE UN FEED Y NO UNA GRILLA
// El mosaico ya existe y muestra la pagina de una vez, como un poster. Una columna la muestra COMO SE
// LA MIRA: de a una pieza, en orden, con el pulgar. Es el unico encuadre en el que un recorte real no
// compite con nada y se lee entero, y de paso es el gesto que cualquiera reconoce sin que se lo
// expliquen. Por eso los recortes van GRANDES y con aire entre ellos: si entraran cuatro por pantalla
// esto seria una grilla vertical, no un feed.
//
// LA REPETICION ESTA PERMITIDA ACA, Y SOLO ACA
// Con dos recortes la columna repite esos dos hasta llenar las ocho ranuras. En cualquier otra escena
// eso seria rellenar —el defecto que la regla anti-invencion existe para impedir—, pero un feed que
// vuelve a pasar por lo mismo se lee como CONTINUIDAD, no como material inventado: no aparece ni una
// pieza que la pagina no haya dado. Lo que si cambia entre repeticiones es el tamaño y el corrimiento
// lateral, con azar de semilla, para que dos apariciones del mismo recorte no se lean como un calco.
//
// SIN RECORTES NO HAY ESCENA. La columna no tiene otro sujeto: si la pagina no dio ni un elemento,
// devuelve el grupo vacio y ocupa su lugar en silencio. El guionista es quien no deberia elegirla.

import { anchoUtil, LOOK, b, E, texto, planoRecorte, recortesDe, nivel, nivelTexto, matAcento, materialMascara, deriva, dolly, orbita, escalera, topeNitido, deslizFijo } from '../kit.js'
import { marca, sello } from '../datos.js'

export const meta = { id: 'columna', beats: 6 }

// Ocho ranuras: es la pila mas corta que, con el paso elegido, deja la costura del bucle FUERA del
// cuadro. Con seis la pieza que se recicla reaparecia por abajo estando todavia visible por arriba.
const RANURAS = 8
// SIN 'cta', por lo mismo que rafaga: un boton fuera de su fila no aporta. En el render de linear
// pasaron "Contact sales" y "Listen" entre las tarjetas, y un feed de botones no es un feed.
const ROLES = ['tarjeta', 'foto', 'logo']

// Cuanto crece una pieza al cruzar el centro, y cuan angosta es esa zona de foco. Es el unico efecto
// "de camara" de la escena: no hay profundidad de campo, hay un tamaño que delata donde mirar.
const FOCO = 0.15
const SIGMA = 1.55

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, datosEls } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()         // los recortes van post-bloom: traen los colores de la marca
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)
  const UNBEAT = b(1)

  // ---- el material que hay
  const fuentes = []
  for (const e of recortesDe(datosEls || [], ROLES, RANURAS)) {
    const tex = texturas && texturas.get(e.url)
    if (tex && tex.image) fuentes.push(tex)
  }
  if (!fuentes.length) {
    tl.to({}, { duration: DUR }, 0)
    // `vacia` no es decorativo: es como esta escena AVISA que se declaro vacia a proposito. Sin la
    // bandera, la escena sigue ocupando sus seis beats con un grupo sin un solo objeto y las dos
    // compuertas que existen para cazar justo eso —"el grupo esta vacio" y "nada descansa"— la acusan
    // de rota, cuando lo que hizo fue lo correcto. Es la misma respuesta que dan `pantalla`, `tarjetas`
    // y `hero` cuando les falta su sujeto.
    return { g, gr, tl, vacia: true }
  }

  // ---- geometria del cuadro
  // La columna NO esta centrada: se corre a la derecha para dejar una calle libre a la izquierda donde
  // viven el riel, el indice y el pie. Centrada, el indice quedaba tapado por cada pieza ancha que
  // pasaba —los recortes van en la escena post-bloom y se dibujan SIEMPRE por encima de `g`, asi que
  // ningun z los manda atras—.
  const COLX = mundoW * 0.085
  // TAMAÑO DE FEED, Y ESTO ES LA MITAD DEL ARREGLO. Con 0.62 de ancho y 0.74 del paso, la tarjeta de
  // testimonio de linear.app —1400x845 px de archivo— salia en 548 px de cuadro: escala 0.39, o sea la
  // cita a 19 px y el pie de autoria a 10. En pantalla eso es un bloque de color con una mancha gris
  // arriba, que es literalmente lo que Thiago describio como "imagenes sin sentido". No era un problema
  // de QUE se elegia: era que lo elegido no se podia leer.
  //
  // Una tarjeta de un feed real va casi de borde a borde, y hay que decirlo en los dos ejes o el otro
  // tope sigue apretando: con 0.90 de ancho y el paso a 0.44 la misma tarjeta mide 972 px, escala 0.69, la
  // cita a 33 px y la autoria a 18. Las dos cosas se leen.
  // 0.75 Y NO 0.90. Con 0.90 la tarjeta se cortaba contra el costado derecho: proyectada cuadro a cuadro
  // con la camara que mueve la propia escena, en los ONCE aires, el |x| peor en coordenadas de recorte
  // iba de 1.180 a 1.196 —el limite es 1.0— o sea entre 97 y 106 px afuera. El 0.90 estaba medido contra
  // el cuadro EN REPOSO y esta escena tiene foco y deriva, asi que su encuadre real nunca es el de reposo:
  // es el mismo error que documenta encuadre-check.mjs en su cabecera sobre el toro.
  // 0.90 / 1.196 = 0.752, y se redondea para abajo.
  const ANCHO_MAX = mundoW * 0.75
  const PASO = mundoH * 0.44
  const ALTO_MAX = PASO * 0.82
  const SPAN = RANURAS * PASO
  // EL FEED AVANZA A TIRONES, COMO UN PULGAR. La escena decia arriba que muestra la pagina "de a una
  // pieza, en orden, con el pulgar" — y despues la movia a velocidad CONSTANTE, que es la unica cosa que
  // un pulgar no hace nunca. Un pulgar tira, suelta, y el feed frena; ahi se lee.
  //
  // Ademas de fidelidad, es legibilidad: a 635 px/s el obturador dibujaba cada glifo dos veces, 5.6 px de
  // separacion sobre 22 px de altura de letra. Con cuatro tirones —uno cada beat y medio— el 70% de los
  // cuadros tiene la columna QUIETA y ahi el texto sale limpio. La cuenta completa esta en el kit.
  const PASOS_C = 4
  const DESLIZ_C = deslizFijo(DUR, PASOS_C)
  const avance = (t) => PASOS_C * PASO * escalera(t / DUR, PASOS_C, DESLIZ_C)

  // El bucle. Cada pieza que sale por arriba vuelve a entrar por abajo. La costura cae en ±SPAN/2, o
  // sea a 12.8 del centro en un cuadro que llega a 5: el salto ocurre fuera de pantalla y no se ve.
  const env = (y) => { const m = ((y + SPAN / 2) % SPAN + SPAN) % SPAN; return m - SPAN / 2 }

  // Desvanecido en los bordes del cuadro. Sin esto una tarjeta se corta con filo contra el borde
  // superior y el feed parece una ventana con recorte duro; con esto entra y sale del encuadre.
  const borde = (y) => {
    const d = (mundoH * 0.5 + 0.6 - Math.abs(y)) / 1.6
    return d < 0 ? 0 : d > 1 ? 1 : d
  }

  // Las dos curvas del beat, escritas a mano. NO son eases de GSAP porque tienen que convivir con el
  // foco del centro DENTRO del mismo write de `scale`: tres tweens sobre la misma propiedad se pisan y
  // gana el ultimo que se agrego, que es como se pierde en silencio la mitad de un efecto.
  //   golpe(u) — sube en el 16% inicial del beat y cae. Es el acento.
  //   abre(u)  — sube y SE QUEDA. Es lo que se enciende y no se apaga hasta el beat siguiente.
  const golpe = (u) => (u <= 0 || u >= 1 ? 0 : u < 0.16 ? u / 0.16 : Math.pow(1 - (u - 0.16) / 0.84, 2.2))
  const abre = (u) => (u <= 0 ? 0 : u >= 0.20 ? 1 : 1 - Math.pow(1 - u / 0.20, 3))

  // ---- la pila
  // Cada ranura toma el recorte que le toca por rotacion. El tamaño sale de la PROPORCION del archivo,
  // nunca de un recorte ni de un estirado: el ancho maximo y el alto maximo son dos topes y gana el que
  // limita primero, asi un logo apaisado llena de lado a lado y una foto vertical llena de alto.
  const piezas = []
  for (let i = 0; i < RANURAS; i++) {
    const tex = fuentes[i % fuentes.length]
    const ar = tex.image.width / tex.image.height
    // El mismo recorte repetido no puede salir identico dos veces o la pila se lee como un empapelado.
    // Se cambia el TAMAÑO y el corrimiento, nunca la proporcion.
    const enc = 0.86 + rnd() * 0.14
    // El ancho tiene DOS topes y no uno: el del cuadro y el de la propia resolucion del recorte. Sin el
    // segundo, el logo de 176 px de linear.app salia ocupando 624 px —tres veces y media— y era lo mas
    // grande y lo mas sucio del cuadro a la vez. Ver `topeNitido` en el kit.
    const anchoTope = Math.min(ANCHO_MAX, topeNitido(tex.image, ctx.W || 1080, mundoW))
    const alto = Math.min(ALTO_MAX, anchoTope / Math.max(0.08, ar)) * enc
    const m = planoRecorte(tex, alto)
    // `planoRecorte` devuelve null sin imagen y `fuentes` ya filtro por eso. Si igual pasara, la ranura
    // se saltea: el destaque busca la pieza mas cercana al centro, no un indice fijo, asi que una pila
    // con un hueco sigue cayendo en el beat.
    if (!m) continue
    const jx = (rnd() - 0.5) * 0.22
    const giro = (rnd() - 0.5) * 0.018        // apenas fuera de eje: un feed no esta perfectamente recto
    m.rotation.z = giro
    m.position.set(COLX + jx, 0, 0.02 * i)
    gr.add(m)

    // El filete que separa una pieza de la siguiente, en `g` para que reciba bloom. Vive en el hueco de
    // abajo y viaja con la pieza: es lo que convierte una fila de imagenes sueltas en una tira.
    const sep = new THREE.Mesh(new THREE.PlaneGeometry(alto * ar * 0.62, 0.018), matAcento(LOOK.acento, 0.9))
    sep.material.transparent = true
    g.add(sep)

    piezas.push({ m, sep, alto, ancho: alto * ar, jx, orden: i, base: i * PASO - SPAN / 2 })
  }

  // A quien le toca el destaque en cada beat: la pieza MAS CERCA del centro en ese instante. Sale de la
  // misma cuenta que mueve la columna, no de una lista escrita a mano — asi el golpe sigue cayendo
  // donde corresponde aunque cambie el paso, la cantidad de ranuras o el tempo.
  const destPorBeat = []
  for (let k = 0; k < meta.beats; k++) {
    const off = avance(b(k))
    let mejor = piezas[0], dmin = Infinity
    for (const p of piezas) {
      const d = Math.abs(env(p.base + off))
      if (d < dmin) { dmin = d; mejor = p }
    }
    destPorBeat.push(mejor)
  }

  // ---- el riel: la calle de la izquierda
  // Un feed sin barra de desplazamiento es una tira de imagenes. Con barra es una PANTALLA, y eso es lo
  // que hace que el espectador entienda de una que esta viendo su propia pagina y no una plantilla.
  const RIEL_X = -mundoW * 0.465
  const RIEL_Y0 = -mundoH * 0.44, RIEL_Y1 = mundoH * 0.36
  const RIEL_H = RIEL_Y1 - RIEL_Y0
  const riel = new THREE.Mesh(new THREE.PlaneGeometry(0.014, RIEL_H), matAcento(nivel(0.30), 1))
  riel.position.set(RIEL_X, (RIEL_Y0 + RIEL_Y1) / 2, 0.5)
  riel.scale.y = 0.001
  g.add(riel)

  const PULGAR_H = RIEL_H * 0.16
  const pulgar = new THREE.Mesh(new THREE.PlaneGeometry(0.05, PULGAR_H), matAcento(LOOK.acento2, 1.15))
  pulgar.position.set(RIEL_X, RIEL_Y1 - PULGAR_H / 2, 0.52)
  g.add(pulgar)

  // Seis muescas, una por beat. Cada una PEGA UN SALTO en su beat: son la unica cosa del cuadro que
  // marca el compas sin moverse todo el tiempo, y por eso el ojo las lee como golpes y no como deriva.
  //
  // EL SALTO ES DE GROSOR Y NO DE ANCHO, Y ESO NO ES UN GUSTO. Antes la muesca entraba al triple de
  // ancho y se recogia. Como crece desde su centro, a escala 3 su borde izquierdo se iba a -2.726 —
  // medido contra el frustum real, el cuadro en ese instante empieza en -2.687, o sea que la muesca
  // salia 0.039 de mundo (unos 8 px) POR FUERA DE PANTALLA. Y no salia en cualquier momento: salia en
  // los beats en que la camara ya se acerco, que es cuando el cuadro es mas angosto. La pieza que
  // existe para SOSTENER el compas se cortaba contra el borde justo en el pulso. Engordando en vez de
  // ensanchar, el gesto es el mismo golpe y el ancho no depende del recorrido de la camara: si mañana
  // alguien empuja la camara mas fuerte, esto no se rompe en silencio.
  const MUESCA_ANCHO = 0.16
  const muescas = []
  for (let k = 0; k < meta.beats; k++) {
    const mu = new THREE.Mesh(new THREE.PlaneGeometry(MUESCA_ANCHO, 0.018), matAcento(LOOK.acento, 1))
    mu.position.set(RIEL_X + 0.13, RIEL_Y1 - RIEL_H * (k + 0.5) / meta.beats, 0.52)
    g.add(mu)
    muescas.push(mu)
  }
  // Hasta aca llega el chrome. Lo que baja de la columna tiene que frenar antes: ver el clamp del
  // filete de acento en el bloque de TIEMPO.
  const CALLE_DER = RIEL_X + 0.13 + MUESCA_ANCHO / 2

  // ---- el filete de acento que ENCIENDE a la destacada
  // Va al lado de la pieza, del lado de la calle libre, y sigue su altura cuadro a cuadro. Se apaga y
  // se vuelve a abrir en cada beat: ese apagon de un cuadro es el corte, y es lo que hace que seis
  // destaques se lean como seis eventos y no como una luz que se arrastra.
  const acento = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 1), matAcento(LOOK.acento2, 1.15))
  acento.position.z = 0.7
  g.add(acento)

  // ---- indice, pie y progreso
  // Seis texturas precalculadas y un cambio duro por beat. `marca` da un indice de puros numeros: no
  // afirma nada del negocio, que es la unica forma de escribir un rotulo sin delatar la plantilla.
  const idxTex = []
  for (let k = 0; k < meta.beats; k++) {
    idxTex.push(texto(marca(k + 1, meta.beats), { fuente: 'DMSans', peso: 500, size: 90, tracking: 0.3 }))
  }
  const AR_IDX = idxTex[0].ar
  // El alto sale de un tope de ANCHO, no al reves: con otra fuente de apoyo el mismo "01 / 06" puede
  // medir un tercio mas y meterse en la columna.
  const ALTO_IDX = Math.min(0.26, 0.78 / Math.max(0.08, AR_IDX))
  const matIdx = materialMascara(idxTex[0].tex, nivelTexto(0.62))
  const mIdx = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_IDX * AR_IDX, ALTO_IDX), matIdx)
  // Anclado por su borde IZQUIERDO contra el margen: centrado, un rotulo mas largo se mete en la
  // columna y queda tapado por la primera pieza ancha que pasa.
  mIdx.position.set(-mundoW * 0.5 + 0.20 + (ALTO_IDX * AR_IDX) / 2, mundoH * 0.435, 0.6)
  g.add(mIdx)

  // El pie real de la pagina. Puede no existir —`sello` devuelve cadena vacia— y en ese caso no se
  // crea nada: un tween contra un objeto que no se construyo es un aviso de GSAP y un hueco en el video.
  const pieTxt = sello(0)
  let mPie = null, matPie = null
  if (pieTxt) {
    const tp = texto(pieTxt, { fuente: 'DMSans', peso: 500, size: 72, tracking: 0.24 })
    // El tope es de ANCHO y no de alto: un dominio largo mide el triple que "1080X1920" y, fijado por
    // el alto, se metia debajo de la columna. Achicandolo sigue siendo legible y sigue en su calle.
    const altoPie = Math.min(0.15, 0.88 / Math.max(0.08, tp.ar))
    matPie = materialMascara(tp.tex, nivelTexto(0.48))
    mPie = new THREE.Mesh(new THREE.PlaneGeometry(altoPie * tp.ar, altoPie), matPie)
    mPie.position.set(-mundoW * 0.5 + 0.20 + (altoPie * tp.ar) / 2, -mundoH * 0.472, 0.6)
    g.add(mPie)
  }

  // El ancho util sigue al margen que declara el aire, en vez de ignorarlo. Con el margen por
  // defecto da EXACTAMENTE el mismo numero que antes —cero cambio visible— y el dia que un aire
  // declare un margen mas apretado, el contenido se acomoda igual que el marco. Ver `anchoUtil`.
  const ANCHO_BARRA = anchoUtil(mundoW, 0.88)
  const geoBarra = new THREE.PlaneGeometry(ANCHO_BARRA, 0.026)
  geoBarra.translate(ANCHO_BARRA / 2, 0, 0)              // crece desde su borde izquierdo
  const barra = new THREE.Mesh(geoBarra, matAcento(LOOK.acento, 1.15))
  barra.position.set(-ANCHO_BARRA / 2, -mundoH * 0.492, 0.5)
  barra.scale.x = 0.001
  g.add(barra)
  const pista = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_BARRA, 0.012), matAcento(nivel(0.24), 1))
  pista.position.set(0, -mundoH * 0.492, 0.48)
  pista.scale.x = 0.001
  g.add(pista)

  // ================================================================ TIEMPO
  // TODO el movimiento continuo se escribe a mano en un solo onUpdate. La trampa de GSAP que ya costo
  // cuatro bugs en este repo es la de `modifiers` sin la propiedad declarada en vars; la version segura
  // es un tween sobre un reloj —`t` SI esta en vars, asi que el tween corre— y las propiedades escritas
  // a mano adentro. Ademas resuelve el problema de fondo: desplazamiento, foco y golpe escriben los
  // TRES sobre la misma `scale`, y como tweens separados se pisarian.
  // El `u` normalizado no sirve aca: esta escena reparte POR BEAT y necesita el crudo en segundos,
  // ademas de su propio `u` local dentro del beat. Por eso toma el segundo parametro y descarta el
  // primero. La llamada obligatoria en t=0 —sin ella la pila entera arranca apilada en y=0— ahora la
  // hace `deriva`; el porque esta en kit.js.
  deriva(tl, DUR, (_u, t) => {
    const off = avance(t)
    const k = Math.min(meta.beats - 1, Math.floor(t / UNBEAT))
    const u = (t - k * UNBEAT) / UNBEAT
    const gp = golpe(u)
    const dest = destPorBeat[k]

    for (const p of piezas) {
      const y = env(p.base + off)
      const foco = 1 + FOCO * Math.exp(-(y * y) / (2 * SIGMA * SIGMA))
      const es = p === dest
      const s = foco
      const cx = COLX + p.jx
      p.m.position.set(cx, y, 0.02 * p.orden)
      p.m.scale.set(s, s, 1)
      // EL DESTAQUE NO MUEVE LA PIEZA, LA ENCIENDE. Antes la destacada crecia un 20% y se corria al centro
      // en 77 ms: 830 px/s medidos, o sea 7 px de separacion entre las dos submuestras del obturador sobre
      // un texto de 22 px. El unico instante en que la escena señala algo era tambien el unico en que ese
      // algo salia escrito dos veces — visible en el render, "Faster app launch" duplicado entero.
      //
      // Y ademas ya no cabia: con las tarjetas a 0.90 del ancho del cuadro, cualquier crecimiento las
      // manda afuera, asi que el correctivo de centrado tenia que crecer hasta deformar la columna.
      //
      // La emfasis pasa a ser por LUZ, que no mueve nada: la destacada queda a plena opacidad y el resto
      // baja a 0.86. Sumado al filete que se abre a su lado, a la muesca del riel y al pulso del fondo, el
      // beat sigue teniendo cuatro marcas — tres de ellas en piezas sin texto, donde el borron es gratis.
      const op = borde(y) * (es ? 1 : 0.86)
      p.m.material.opacity = op
      // El filete separador viaja Y CRECE con su pieza: quieto en la columna mientras la de arriba se
      // corre, se leia como que la tira se habia partido en dos.
      p.sep.position.set(cx - p.ancho * s * 0.19, y - PASO * 0.5, 0.3)
      p.sep.scale.x = s
      p.sep.material.opacity = op * 0.85
      // Se anota lo que REALMENTE quedo, para que el filete de acento lea la caja de la pieza en vez de
      // volver a calcularla. Recalculandola, el foco quedaba fijo en su maximo mientras la pieza ya se
      // habia ido del centro y el filete se despegaba del borde justo al final de cada beat.
      p.x = cx; p.y = y; p.s = s
    }

    // El filete va PEGADO al borde izquierdo de la destacada, y ahi esta la trampa: ese borde no esta
    // quieto. Con un recorte ancho —un boton, una tira de precio— la destacada crece y ademas se corre
    // al centro, asi que su borde izquierdo bajaba hasta -2.18 y el filete, que va 0.18 mas
    // a la izquierda y ademas se ensancha 3.4 veces, aterrizaba ENCIMA de las muescas: 0.045 de solape
    // medido en el pico del beat. Dos cosas de acento, las dos con bloom, fundidas en un borron justo
    // en el instante en que la escena señala algo. El filete frena en la calle del chrome: cuando no
    // hay lugar se queda al ras de la muesca en vez de treparse encima, que es la unica de las dos
    // piezas que puede ceder sin perder su trabajo.
    // 0.9 y no 2.4. El filete engordaba 3.4 veces en el pulso, y eso estaba calibrado para competir con
    // una tarjeta que ADEMAS saltaba. Sin el salto es lo mas fuerte del cuadro: 36 px de verde con bloom
    // pegados al borde izquierdo, que en el render se leian como dos tubos de neon flotando sin relacion
    // con nada. Un filete que se enciende tiene que seguir siendo un filete.
    const escAc = 1 + 0.9 * gp
    const topeAc = CALLE_DER + 0.04 + 0.055 * escAc * 0.5
    acento.position.set(Math.max(topeAc, dest.x - dest.ancho * dest.s * 0.5 - 0.18), dest.y, 0.7)
    acento.scale.set(escAc, dest.alto * dest.s * 0.66 * abre(u), 1)

    pulgar.position.y = (RIEL_Y1 - PULGAR_H / 2) - (RIEL_H - PULGAR_H) * (t / DUR)

    // El indice se REEMPLAZA, no se interpola. El ancho del plano se fija con el del primer rotulo y se
    // compensa con scale.x, asi el numero mantiene su tamaño aunque cambien los glifos.
    const ix = idxTex[k]
    // Y SE REAPUNTAN uRep/uOff CON EL. `materialMascara` (kit.js:997) los cuelga de los Vector2 de la
    // textura con la que NACE el material, asi que cambiar solo `map` deja al shader muestreando con la
    // matriz de la textura vieja. Hoy no mueve un pixel —medido: los seis indices son texturas de
    // texto(), las once corridas de aire dan |uRep - map.repeat| = 0— pero es la linea que evita que el
    // dia que aca entre una textura con repeat se repita el defecto que costo la escena `pantalla`.
    if (matIdx.uniforms.map.value !== ix.tex) {
      matIdx.uniforms.map.value = ix.tex
      matIdx.uniforms.uRep.value = ix.tex.repeat
      matIdx.uniforms.uOff.value = ix.tex.offset
    }
    mIdx.scale.x = ix.ar / AR_IDX
  })

  // ---------------------------------------------------------------- los seis golpes
  for (let k = 0; k < meta.beats; k++) {
    // La muesca del riel: entra GRUESA y se afina. Es el evento mas barato del cuadro y el unico que
    // cae SIEMPRE en el pulso exacto, asi que es el que sostiene el compas cuando la pieza destacada
    // resulta ser una foto oscura que no se ve saltar. Engorda y no se ensancha por la razon medida
    // arriba, donde se crean: creciendo a lo ancho se salia del cuadro en el pulso.
    tl.fromTo(muescas[k].scale, { y: 3.4 }, { y: 1, duration: b(0.44), ease: E.frena(3), immediateRender: false }, b(k))
    // El indice se reescribe con la mascara en vez de fundirse: un fundido de indice es lo que hace
    // una presentacion, un barrido es lo que hace un reel.
    tl.fromTo(matIdx.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.34), ease: E.frena(2), immediateRender: false }, b(k))
    // El fondo late con el beat y vuelve a cero antes del siguiente: sin esto los seis destaques
    // ocurren solo en la columna y el resto del cuadro no se entera de que hay musica.
    if (ctx.fondo && ctx.fondo.uPulso) {
      tl.fromTo(ctx.fondo.uPulso, { value: 0.24 }, { value: 0, duration: b(0.62), ease: E.frena(2), immediateRender: false }, b(k))
    }
  }

  // ---------------------------------------------------------------- riel y progreso
  tl.fromTo(riel.scale, { y: 0.001 }, { y: 1, duration: b(0.55), ease: E.frena(3), immediateRender: false }, 0)
  tl.fromTo(pista.scale, { x: 0.001 }, { x: 1, duration: b(0.60), ease: E.frena(3), immediateRender: false }, b(0.10))
  tl.fromTo(barra.scale, { x: 0.001 }, { x: 1, duration: DUR, ease: 'none', immediateRender: false }, 0)
  if (mPie) {
    tl.fromTo(matPie.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.55), ease: E.frena(2), immediateRender: false }, b(0.28))
    tl.to(matPie.uniforms.uProg, { value: 0, duration: b(0.35), ease: E.acelera(2) }, DUR - b(0.35))
  }
  // El cierre desarma SOLO el marco, nunca la columna: la escena tiene que entregarse a la siguiente
  // todavia en movimiento, que es lo unico que la distingue de las otras siete.
  tl.to(riel.scale, { y: 0.001, duration: b(0.32), ease: E.acelera(3) }, DUR - b(0.32))
  tl.to(pulgar.scale, { y: 0.001, duration: b(0.32), ease: E.acelera(3) }, DUR - b(0.32))
  tl.to(matIdx.uniforms.uProg, { value: 0, duration: b(0.30), ease: E.acelera(2) }, DUR - b(0.30))

  // ---------------------------------------------------------------- camara
  // Un empuje parejo que se devuelve. La columna ya sube sola: si la camara ademas viajara, los dos
  // movimientos se cancelarian y el feed quedaria clavado. Lo unico que hace es acercarse —o sea,
  // aumentar el ritmo aparente— y volver, porque devolverla es contrato.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.50) }, { z: dolly(distBase, -0.26), duration: DUR * 0.78, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.22, ease: E.vaiven() }, DUR * 0.78)
  tl.fromTo(camera.position, { x: orbita(-0.14) }, { x: orbita(0.12), duration: DUR * 0.56, ease: E.vaiven(), immediateRender: false }, 0)
  tl.to(camera.position, { x: 0, duration: DUR * 0.44, ease: E.vaiven() }, DUR * 0.56)

  return { g, gr, tl }
}
