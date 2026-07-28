// HERO "vitrina" — el logo REAL de la marca sobre un pedestal de vidrio, girando lento.
//
// ES OTRO REGISTRO, NO OTRA GEOMETRÍA. Los heroes que ya estaban empujan: el teléfono llega girado,
// el mosaico arma una nube, el prisma se traga el cuadro. Todos dicen "mirá lo que pasa". Este dice
// lo contrario: acá no pasa nada, y por eso importa. Es la vitrina del museo, la mesa de producto de
// una joyería, la maqueta iluminada de un estudio de arquitectura — el gesto de poner UNA cosa sobre
// un pedestal y darle tiempo. Para las marcas que venden precio alto, el apuro es lo que las abarata.
//
// LO ÚNICO QUE SE MUESTRA ES LO QUE LA PÁGINA DIO. El sujeto es el recorte real del logo
// (backend/element_extract.py). Si la página no dejó ninguno, no hay pieza que exhibir y la vitrina
// no se arma: un pedestal iluminado y vacío se lee como un error de carga, no como una decisión.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, nivel, matAcento, planoRecorte, recortesDe, dolly, orbita } from '../kit.js'

export const meta = {
  id: 'vitrina',
  nombre: 'Logo en vitrina',
  necesita: ['elementos'],
  beats: 8,
}

// El logo primero porque es lo único que identifica a la marca sin leer nada. Después la tarjeta y la
// foto: son las piezas que una landing diseña con más cuidado y las únicas que aguantan estar solas
// sobre un pedestal. Un botón (`cta`) no — un rectángulo con "Empezar gratis" exhibido como una joya
// se lee a chiste, y esa es la razón por la que 'cta' NO está en esta lista aunque el mosaico lo use.
const ROLES = ['logo', 'tarjeta', 'foto']
// Se piden varios candidatos aunque se use uno solo: `texturas` puede no tener el archivo (el
// TextureLoader falla en silencio con un PNG roto) y en ese caso hay que pasar al siguiente en vez de
// declarar la escena vacía teniendo material.
const CANDIDATOS = 4

// Ocho caras, no un cilindro. UN CILINDRO QUE GIRA ES INVISIBLE: es simétrico respecto de su eje, así
// que su silueta y su sombreado son idénticos en cualquier ángulo y la rotación —que es el gesto
// central de esta escena— no llega al ojo. Con ocho caras planas hay aristas que entran y salen del
// reflejo, y el giro se lee sin acelerarlo.
const CARAS = 8
// Cuánto se achata el reflejo. Ver el comentario de `espejo` más abajo: no es una deformación, es el
// escorzo de una superficie casi horizontal.
const ESPEJO = 0.52

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, datosEls, claro } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()          // el recorte va post-bloom: trae los colores de la marca
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ------------------------------------------------------------------ la pieza que se exhibe
  let tex = null
  for (const e of recortesDe(datosEls || [], ROLES, CANDIDATOS)) {
    const t = texturas && texturas.get(e.url)
    if (t && t.image) { tex = t; break }
  }
  if (!tex) {
    tl.to({}, { duration: DUR }, 0)
    // `vacia` avisa que la escena se declaró vacía A PROPÓSITO. Sin la bandera, las dos compuertas que
    // existen para cazar justo esto —"el grupo esta vacio" y "nada descansa"— la acusan de rota
    // cuando hizo lo correcto. Misma respuesta que dan `columna`, `pantalla` y `tarjetas`.
    return { g, gr, tl, vacia: true }
  }

  // LA PROPORCIÓN NO SE NEGOCIA. Un logo apaisado de 4:1 metido en un hueco cuadrado sale estirado, y
  // deformar el logo de alguien es el único defecto que su dueño ve antes que ninguno — antes que el
  // ritmo, antes que la paleta, antes que el encuadre. Se elige el alto por el lado que LIMITA: si el
  // ancho es el que topa, el alto baja hasta que entre; el archivo manda su relación y nadie la toca.
  const ar = Math.max(0.05, tex.image.width / tex.image.height)
  const ANCHO_MAX = mundoW * 0.56
  const ALTO_MAX = mundoH * 0.21
  const altoLogo = Math.min(ALTO_MAX, ANCHO_MAX / ar)
  const anchoLogo = altoLogo * ar

  // El pedestal se dimensiona DESPUÉS del logo y a partir de él: una pieza que sobresale de su base se
  // lee como mal montada. El `max` con el alto es para el caso vertical —una foto 2:3 sobre una
  // columna finita parece a punto de caerse— y el `min` para que la base no toque los bordes del
  // cuadro, que la convertiría en un fondo en vez de un objeto.
  //
  // EL TOPE ES 0.33 Y NO 0.40 PORQUE LO QUE TOCA EL BORDE NO ES ESTE RADIO. El prisma se abre a 1.05
  // en el pie y el zócalo a 1.21, así que con 0.40 la base medía el 97% del ancho del cuadro: una losa
  // de punta a punta que se lee como fondo y no como objeto. Con 0.33 el zócalo queda en el 80% y el
  // logo más ancho posible (0.56) ocupa el 85% de la columna — apoyado, con aire, sin sobresalir.
  const RAD = Math.min(mundoW * 0.33, Math.max(anchoLogo * 0.62, altoLogo * 0.42))
  const ALTOP = mundoH * 0.28
  // La tapa NO va en el centro del cuadro. Con la vitrina entera colgando debajo, poner la superficie
  // en 0 dejaba el objeto en el tercio de abajo y el 40% de arriba vacío. En -0.05 el conjunto
  // —zócalo, columna, pieza— queda centrado sobre el eje del cuadro.
  const TAPA = -mundoH * 0.05           // la superficie donde se apoya todo, en el espacio de la vitrina
  const HUECO = altoLogo * 0.18         // el logo FLOTA: apoyado se lee como una calcomanía

  // ------------------------------------------------------------------ grupos
  // Cuatro niveles y ninguno es de más:
  //   gVit    la llegada y la salida de todo el conjunto
  //   gGiro   el giro continuo del vidrio — el pedestal gira, la base NO (es el montaje al piso)
  //   anclaLogo   la bajada de la pieza a su lugar y su salida
  //   gGiroLogo   el vaivén y la respiración de la pieza, que corren en el onUpdate
  // Están separados por la trampa que ya costó cinco bugs: dos tweens escribiendo la misma propiedad
  // se pisan sin avisar, y un onUpdate escribiendo lo que un tween anima gana o pierde según el orden.
  const gVit = new THREE.Group()
  g.add(gVit)
  const gGiro = new THREE.Group()
  gVit.add(gGiro)
  const anclaLogo = new THREE.Group()
  gVit.add(anclaLogo)
  const gGiroLogo = new THREE.Group()
  anclaLogo.add(gGiroLogo)
  const anclaEsp = new THREE.Group()    // dónde cae el reflejo; lo calcula el onUpdate, no un tween
  gVit.add(anclaEsp)

  // ------------------------------------------------------------------ el vidrio
  // Prisma octogonal. `toNonIndexed` + `computeVertexNormals` es lo que lo vuelve FACETADO: la
  // CylinderGeometry de three comparte los vértices entre caras vecinas y promedia las normales, o
  // sea que ocho caras planas se sombrean como un tubo liso y vuelve el problema del cilindro. Sin
  // índice cada cara tiene sus propios vértices y su propia normal, y ahí sí la luz salta de una a
  // otra cuando gira.
  const geoBase = new THREE.CylinderGeometry(RAD, RAD * 1.05, ALTOP, CARAS, 1, false)
  const geoVidrio = geoBase.toNonIndexed()
  geoVidrio.computeVertexNormals()

  const matVidrio = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      uA: { value: hex(LOOK.acento) }, uB: { value: hex(LOOK.acento2) },
      uTinta: { value: hex(LOOK.tinta) }, uAlto: { value: ALTOP },
      uProg: { value: 0 }, uClaro: { value: claro ? 1 : 0 },
      uBarrido: { value: -99 }, uFranja: { value: ALTOP * 0.34 },
    },
    vertexShader: `
      uniform float uAlto;
      varying vec3 vN; varying vec3 vV; varying float vH; varying float vWy;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        vH = clamp(position.y / uAlto + 0.5, 0.0, 1.0);
        // La pasada de luz se mide en MUNDO y no en vista a propósito: así es un plano de luz físico
        // que sube por la vitrina, y no una franja pegada a la lente que se corre cuando la cámara
        // baja. La cámara se mueve durante toda la escena, así que la diferencia se ve.
        vWy = (modelMatrix * vec4(position, 1.0)).y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uA, uB, uTinta; uniform float uProg, uClaro, uBarrido, uFranja;
      varying vec3 vN; varying vec3 vV; varying float vH; varying float vWy;
      void main(){
        vec3 N = normalize(vN);
        // El mismo Fresnel de prisma.js: 0 mirando la cara de frente, 1 en el filo. Es lo único que
        // hace falta para que un sólido se lea como vidrio, y acá además es lo que separa el pedestal
        // del fondo sin ponerle un contorno.
        float f = pow(1.0 - abs(dot(N, normalize(vV))), 2.2);
        vec3 col = mix(uA, uB, clamp(f * 1.3, 0.0, 1.0));
        col += uTinta * pow(f, 3.0) * 0.60;

        // LA LUZ ES FIJA Y EL PRISMA PASA POR DELANTE. Esto es lo que vuelve legible una rotación
        // lenta: no se ve girar el vidrio, se ven las caras ENCENDERSE una tras otra al cruzar el
        // reflejo del softbox. Un giro que hay que acelerar para que se note ya no es un giro lento.
        vec3 L = normalize(vec3(-0.52, 0.62, 0.58));
        float esp = pow(max(0.0, dot(N, L)), 30.0);
        col += uTinta * esp * 1.05;

        // El vidrio pesa abajo: el pie concentra el color y la tapa deja pasar. Sin esto la columna es
        // un tubo de densidad pareja, que es lo que delata al vidrio de videojuego.
        float dens = mix(1.0, 0.46, smoothstep(0.0, 1.0, vH));

        // PASADA DE LUZ: un plano horizontal que sube por la pieza. Es el gesto que hace cualquier
        // aviso de producto para decir "esto es material", y acá cumple otra función: es un EVENTO en
        // una escena que por definición no tiene ninguno.
        float band = smoothstep(uFranja, 0.0, abs(vWy - uBarrido));
        col += uTinta * band * 0.40;

        float a = (0.15 + f * 0.70) * dens + esp * 0.55 + band * 0.20;
        // En un mundo claro un vidrio que SUMA luz sobre blanco desaparece: lo que da volumen ahí es
        // que las caras de frente OSCUREZCAN, como un vidrio ahumado contra una ventana.
        col = mix(col, col * 0.48, uClaro * (1.0 - f));
        a = mix(a, (0.30 + f * 0.58) * dens + esp * 0.45 + band * 0.16, uClaro);
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uProg);
      }`,
  })
  const vidrio = new THREE.Mesh(geoVidrio, matVidrio)
  vidrio.position.y = TAPA - ALTOP / 2
  gGiro.add(vidrio)

  // Las ARISTAS del prisma, sólidas. El vidrio transparente pierde la silueta contra cualquier fondo;
  // el alambre se la devuelve y además da las ocho líneas verticales que el ojo persigue al girar. Se
  // sacan de la geometría CON índice: sobre la facetada, `EdgesGeometry` no encuentra vecinos y
  // devuelve los tres lados de cada triángulo, o sea el alambrado entero.
  //
  // PRESUPUESTO DE LUZ, y acá casi me lo como. Empezó en nivel(0.86): luminancia 0.651 contra un
  // umbral de bloom de 0.62, o sea que el alambre entero florecía TODO EL TIEMPO y la vitrina salía
  // envuelta en un halo blanco permanente — la definición de barato en una escena que vende caro.
  // nivel(0.78) da 0.526 y queda debajo con margen: la arista DIBUJA. Lo que florece es el destello
  // especular de cada cara al cruzar la luz, que sí está en uTinta y sí pasa el umbral — la luz
  // aparece cuando la pieza gira, que es cuando significa algo.
  const aristas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geoBase),
    new THREE.LineBasicMaterial({ color: hex(nivel(0.78)), transparent: true, opacity: 0, toneMapped: false }))
  aristas.position.y = vidrio.position.y
  gGiro.add(aristas)

  // El aro de la tapa, octogonal como el prisma. Es el filo de la superficie de exhibición: sin él, el
  // logo flota sobre un borde difuso y no se entiende sobre QUÉ está apoyado.
  const aroTapa = new THREE.Mesh(
    new THREE.TorusGeometry(RAD * 1.005, RAD * 0.016, 6, CARAS),
    matAcento(LOOK.acento2, 1.2))
  aroTapa.rotation.x = Math.PI / 2
  aroTapa.position.y = TAPA
  // `matAcento` no expone `transparent` y los dos aros tienen que poder encenderse desde cero: se
  // marcan acá, antes del primer render, que es cuando three arma la lista de transparentes.
  aroTapa.material.transparent = true
  aroTapa.material.opacity = 0
  gGiro.add(aroTapa)

  // ------------------------------------------------------------------ el montaje al piso
  // La base NO gira: es el anclaje. Que el vidrio gire SOBRE algo quieto es lo que lo convierte en una
  // vitrina giratoria en vez de en un objeto suelto dando vueltas en el aire.
  //
  // El color sale de `nivel()`, nunca de un gris escrito a mano: sobre una página blanca un pedestal
  // gris oscuro es un ladrillo plantado en el medio, y `nivel(0.13)` se da vuelta solo.
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(RAD * 1.13, RAD * 1.21, ALTOP * 0.085, CARAS * 2),
    new THREE.MeshPhysicalMaterial({
      color: hex(nivel(0.13, 0.35)), roughness: 0.30, metalness: 0.6,
      clearcoat: 0.7, clearcoatRoughness: 0.18,
    }))
  base.position.y = TAPA - ALTOP - ALTOP * 0.040
  gVit.add(base)

  // LOS DOS AROS NO PESAN LO MISMO, Y ESTÁ MEDIDO. El de la tapa va en `acento2` (luminancia 0.60,
  // por encima del umbral de bloom): florece, porque marca dónde está la pieza. El del pie va en
  // `acento` (0.20, muy por debajo): dibuja y no brilla. Así la luz de la escena está concentrada
  // arriba, donde el ojo tiene que ir, y el pie es lo que ancla. Los dos encendidos al mismo nivel
  // convertían la vitrina en dos anillos flotando sin jerarquía.
  const aroBase = new THREE.Mesh(
    new THREE.TorusGeometry(RAD * 1.22, RAD * 0.014, 6, 72),
    matAcento(LOOK.acento, 1.3))
  aroBase.rotation.x = Math.PI / 2
  aroBase.position.y = base.position.y
  aroBase.material.transparent = true
  aroBase.material.opacity = 0
  gVit.add(aroBase)

  // CHARCO DE LUZ en el piso. Un plano horizontal, no vertical: la cámara mira desde arriba del objeto
  // —está a la altura del cuadro y la vitrina vive en la mitad de abajo— así que un disco tendido se
  // ve en escorzo y se lee como la luz que cae alrededor del pedestal. Es lo que le da suelo a la
  // pieza; sin esto la vitrina flota en el vacío y vuelve a ser geometría en el aire.
  const radial = (color, f0) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uCol: { value: hex(color) }, uF: { value: f0 }, uClaro: { value: claro ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform vec3 uCol; uniform float uF, uClaro; varying vec2 vUv;
      void main(){
        float d = smoothstep(0.5, 0.03, distance(vUv, vec2(0.5)));
        // Sobre blanco el mismo halo tiene que OSCURECER hacia el acento: sumar luz sobre un fondo que
        // ya está en 1.0 no aclara, sólo desatura hasta el gris.
        gl_FragColor = vec4(mix(uCol, uCol * 0.42, uClaro), d * uF);
      }`,
  })
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(RAD * 7, RAD * 7), radial(LOOK.acento, 0))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = base.position.y - ALTOP * 0.05
  gVit.add(piso)

  // HALO detrás. Un objeto oscuro sobre un fondo oscuro no se separa por más filo que se le ponga:
  // hace falta que el FONDO se aclare donde el objeto está. Es la luz que un fotógrafo pone detrás del
  // producto, y en una escena tan quieta es además lo que respira.
  // Va detrás de la COLUMNA, no del cuadro: con el degradé más ancho que el encuadre la caída queda
  // fuera de plano y el halo se lee como un lavado plano de color, que es peor que no ponerlo.
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(RAD * 6.2, RAD * 6.2), radial(LOOK.acento, 0))
  halo.position.set(0, TAPA - ALTOP * 0.32, -RAD * 1.9)
  gVit.add(halo)

  // ------------------------------------------------------------------ el logo y su reflejo
  const logo = planoRecorte(tex, altoLogo)
  gr.add(logo)
  logo.material.opacity = 0

  // EL REFLEJO SÍ SE ACHATA, y no contradice la regla de arriba. La proporción del logo se respeta en
  // el logo; el reflejo es lo que se ve de él sobre una superficie casi horizontal, o sea escorzado.
  // Dibujarlo con la proporción del archivo lo delataría como una segunda copia pegada boca abajo,
  // que es exactamente lo que un reflejo no puede parecer.
  //
  // Va en `gr` con el logo aunque sea un "reflejo", y esto es deliberado: la regla del proyecto es que
  // TODA textura de la página real vive post-bloom. Un logo de marca es casi siempre claro y saturado;
  // pasado por el bloom se convierte en una mancha con la forma aproximada del logo, y una mancha con
  // la forma aproximada del logo de alguien es peor que ningún reflejo.
  const espejo = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoLogo, altoLogo * ESPEJO),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { map: { value: tex }, uProg: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform sampler2D map; uniform float uProg; varying vec2 vUv;
        void main(){
          // Un espejo horizontal invierte SÓLO la vertical. Invertir también la horizontal daría el
          // logo al revés, que es el error que delata a los reflejos falsos.
          vec4 t = texture2D(map, vec2(vUv.x, 1.0 - vUv.y));
          // Se apaga hacia abajo: el reflejo vive pegado a la superficie y se pierde en el vidrio.
          float cae = smoothstep(0.0, 0.92, vUv.y);
          gl_FragColor = vec4(t.rgb, t.a * cae * uProg);
          if (gl_FragColor.a < 0.004) discard;
        }`,
    }))
  gr.add(espejo)

  const yLogo = TAPA + HUECO + altoLogo / 2

  // ------------------------------------------------------------------ tiempo
  // El fondo CEDE mientras la vitrina es el sujeto: una grilla en fuga detrás de un objeto de vidrio
  // son dos tramas finas compitiendo por el mismo ojo. Vuelve antes del corte, porque la escena
  // siguiente cuenta con ella.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const baseG = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: baseG * 0.32, duration: b(1.2), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: baseG, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // LA VITRINA SUBE A CUADRO. No llega volando ni rebota: en este registro el overshoot es lo que
  // abarata. `frena` en vez de `llega` es una decisión, no un descuido — la pieza se POSA.
  gVit.position.y = -mundoH * 0.30
  gVit.scale.setScalar(0.86)
  tl.to(gVit.position, { y: 0, duration: b(1.6), ease: E.frena(3) }, 0)
  tl.to(gVit.scale, { x: 1, y: 1, z: 1, duration: b(1.7), ease: E.frena(3) }, 0)
  tl.to(matVidrio.uniforms.uProg, { value: 1, duration: b(1.3), ease: E.frena(2) }, 0)
  tl.to(aristas.material, { opacity: 0.52, duration: b(1.1), ease: E.frena(2) }, b(0.35))
  tl.to(aroBase.material, { opacity: 0.8, duration: b(0.6), ease: E.frena(2) }, b(0.6))
  tl.to(aroTapa.material, { opacity: 0.75, duration: b(0.6), ease: E.frena(2) }, b(0.9))
  tl.to(piso.material.uniforms.uF, { value: 0.30, duration: b(1.4), ease: E.frena(2) }, b(0.3))

  // LA PIEZA BAJA A SU LUGAR, tarde y despacio. Entra última porque es el sujeto: primero se arma la
  // vitrina, después se pone lo que se va a mirar. Y baja —no sube, no llega de costado— porque es el
  // gesto de montar una pieza, el mismo que hace la mano que la coloca.
  anclaLogo.position.y = yLogo + mundoH * 0.40
  tl.to(anclaLogo.position, { y: yLogo, duration: b(1.9), ease: E.frena(4) }, b(1.0))
  tl.to(logo.material, { opacity: 1, duration: b(0.9), ease: E.frena(2) }, b(1.0))
  tl.to(espejo.material.uniforms.uProg, { value: 0.34, duration: b(1.1), ease: E.frena(2) }, b(1.6))

  // DOS PASADAS DE LUZ, y son los únicos eventos duros de la escena. Una escena lenta sin un solo
  // acento se lee como una imagen fija con ruido; dos golpes de luz separados por dos beats le dan
  // pulso sin romper el registro. La primera arranca cuando la pieza ya está montada: durante la
  // bajada compite con el movimiento y no se lee.
  const Y0 = TAPA - ALTOP * 1.5
  const Y1 = TAPA + altoLogo + ALTOP * 0.6
  tl.fromTo(matVidrio.uniforms.uBarrido, { value: Y0 },
    { value: Y1, duration: b(1.5), ease: E.vaiven(2), immediateRender: false }, b(2.6))
  tl.fromTo(matVidrio.uniforms.uBarrido, { value: Y0 },
    { value: Y1, duration: b(1.5), ease: E.vaiven(2), immediateRender: false }, b(5.0))

  // El halo LATE, y late lento. Es lo que respira cuando ya no se mueve nada más.
  tl.to(halo.material.uniforms.uF, { value: 0.34, duration: b(1.5), ease: E.frena(2) }, b(0.4))
  tl.to(halo.material.uniforms.uF, { value: 0.19, duration: b(1.7), ease: E.vaiven() }, b(3.0))
  tl.to(halo.material.uniforms.uF, { value: 0.32, duration: b(1.7), ease: E.vaiven() }, b(4.9))

  // LA CÁMARA BAJA Y SE ACERCA: la grúa que desciende hasta la altura de la pieza mientras entra. Es
  // la toma de producto, y hace falta por una razón medible además de estética: sin paralaje contra el
  // fondo, un objeto quieto en el centro del cuadro se lee pegado a la imagen de atrás.
  // Vuelve exacta a (0, 0, distBase) con rotación cero antes del corte — es contrato de escena, y una
  // cámara que no vuelve arranca la escena siguiente desde otro punto de vista.
  tl.fromTo(camera.position, { y: mundoH * 0.075, z: dolly(distBase, 1.15) },
    { y: 0, z: dolly(distBase, -0.62), duration: DUR * 0.80, ease: 'none' }, 0)
  tl.fromTo(camera.rotation, { x: orbita(-0.048) }, { x: 0, duration: DUR * 0.80, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.20, ease: E.vaiven() }, DUR * 0.80)

  // SALIDA: se apaga la vitrina. La pieza se retira hacia arriba —se la llevan, no explota— el vidrio
  // pierde densidad y el charco de luz se cierra. El corte llega sobre negro y se siente ganado sin
  // haber levantado la voz, que es la única salida coherente con los siete beats anteriores.
  const SAL = DUR - b(0.95)
  tl.to(anclaLogo.position, { y: yLogo + mundoH * 0.55, duration: b(0.9), ease: E.acelera(2.4) }, SAL)
  tl.to(logo.material, { opacity: 0, duration: b(0.62), ease: E.acelera(2) }, SAL + b(0.14))
  tl.to(espejo.material.uniforms.uProg, { value: 0, duration: b(0.5), ease: E.acelera(2) }, SAL)
  tl.to(matVidrio.uniforms.uProg, { value: 0, duration: b(0.75), ease: E.acelera(2) }, SAL + b(0.1))
  tl.to(aristas.material, { opacity: 0, duration: b(0.7), ease: E.acelera(2) }, SAL + b(0.1))
  tl.to(aroTapa.material, { opacity: 0, duration: b(0.6), ease: E.acelera(2) }, SAL + b(0.1))
  tl.to(aroBase.material, { opacity: 0, duration: b(0.7), ease: E.acelera(2) }, SAL + b(0.15))
  tl.to(piso.material.uniforms.uF, { value: 0, duration: b(0.8), ease: E.acelera(2) }, SAL + b(0.1))
  tl.to(halo.material.uniforms.uF, { value: 0, duration: b(0.8), ease: E.acelera(2) }, SAL + b(0.1))
  tl.to(gVit.position, { y: -mundoH * 0.10, duration: b(0.9), ease: E.acelera(2) }, SAL)

  // ------------------------------------------------------------------ lo continuo
  // Tres fases con la semilla: dos períodos que fueran múltiplos entre sí volverían a alinearse cada
  // tanto y el conjunto latiría como una sola cosa, que se nota más que la quietud misma.
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28, f3 = rnd() * 6.28

  const mover = () => {
    const t = tl.time()
    // EL PEDESTAL GIRA SIN PARAR y a 0.42 rad/s: una vuelta cada quince segundos, o sea que en los
    // ocho beats de la escena da poco más de un cuarto. Es lento a propósito — la velocidad es la
    // mitad del precio que aparenta un objeto.
    gGiro.rotation.y = 0.18 + t * 0.42

    // EL LOGO NO GIRA CON EL PEDESTAL, y esto es la decisión de fondo de todo el hero.
    // Un recorte es un PLANO. Girándolo 360° pasa un cuarto del tiempo de canto —invisible— y otro
    // cuarto de espaldas, o sea con el logo espejado, que se lee como un error de render. La forma
    // honesta de girar algo plano es un vaivén corto: ±0.34 rad son 19°, suficiente para que la pieza
    // tenga volumen y para que su reflejo se corra, y nunca suficiente para que deje de leerse.
    // Lo que da el giro de museo es el PEDESTAL; la pieza sólo lo acompaña.
    const k = Math.min(1, Math.max(0, (t - b(2.0)) / b(1.4)))
    gGiroLogo.rotation.y = Math.sin(t * 0.30 + f1) * 0.34 * k
    gGiroLogo.rotation.z = Math.sin(t * 0.23 + f3) * 0.018 * k
    gGiroLogo.position.y = Math.sin(t * 0.44 + f2) * altoLogo * 0.035 * k

    // El reflejo se calcula, no se anima. Un punto a distancia d por encima de la tapa cae a k*d por
    // debajo, así que el centro del reflejo está en TAPA - ESPEJO*(yLogo - TAPA) y su alto ya viene
    // achatado en la geometría. Escrito así, el reflejo responde a la flotación y a la salida sin un
    // solo tween propio — y si no respondiera, el ojo lo caza enseguida: un reflejo que no sigue a su
    // objeto es lo que hace que una imagen se vea compuesta.
    const yl = anclaLogo.position.y + gGiroLogo.position.y
    anclaEsp.position.y = TAPA - ESPEJO * (yl - TAPA)
    anclaEsp.rotation.y = gGiroLogo.rotation.y
    anclaEsp.rotation.z = -gGiroLogo.rotation.z
  }

  // El logo y su reflejo viven en la OTRA escena (post-bloom), así que no pueden ser hijos de nada de
  // acá: se les copia la transformación MUNDIAL de su ancla en cada frame.
  const sincronizar = () => {
    g.updateWorldMatrix(true, true)
    gGiroLogo.matrixWorld.decompose(logo.position, logo.quaternion, logo.scale)
    anclaEsp.matrixWorld.decompose(espejo.position, espejo.quaternion, espejo.scale)
  }

  // EL ORDEN IMPORTA Y CUESTA CARO. Esto NO puede colgar de un tween hijo: GSAP renderiza sus hijos
  // ORDENADOS POR TIEMPO DE INICIO, así que un tween puesto en 0 lee las transformaciones de la
  // llegada y de la salida —que arrancan después— con un frame de atraso. En el render no se nota
  // porque se avanza cuadro a cuadro; se ve en un SALTO en frío, que es lo que hace un editor al
  // arrastrar la aguja. El onUpdate de la TIMELINE corre DESPUÉS de todos sus hijos, que es
  // exactamente la garantía que hace falta. Ver heroes/telefono.js.
  tl.eventCallback('onUpdate', () => { mover(); sincronizar() })
  mover()
  sincronizar()

  return { g, gr, tl }
}
