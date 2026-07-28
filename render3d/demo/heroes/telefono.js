// HERO "telefono" — un teléfono 3D flotando que muestra LA PÁGINA DEL USUARIO scrolleando.
//
// Es el hero que mejor cumple la promesa del proyecto: no es geometría genérica teñida con la paleta
// de la marca, es la página real, en el dispositivo donde la mayoría la va a ver, moviéndose.
//
// LA SILUETA IMPORTA MÁS QUE CUALQUIER OTRA COSA
// El ojo conoce esta forma mejor que ninguna otra pantalla, y por eso perdona cero. La primera versión
// era una `BoxGeometry`: un ladrillo de esquinas rectas que se leía como una maqueta de cartón. Un
// teléfono moderno tiene cuatro rasgos y los cuatro hacen falta:
//   · esquinas MUY redondeadas y continuas — radio ~0.13 del ancho, no un chaflán;
//   · un bisel FINO y PAREJO en los cuatro lados (los teléfonos viejos tenían el de abajo más grueso);
//   · el recorte en pastilla arriba del centro;
//   · un canto metálico que atrapa la luz cuando el aparato gira.
// Nada de marcas: la forma alcanza. Poner un logo sería además meter una marca ajena en el video de
// un cliente.
//
// CÓMO SE MUEVE LA PÁGINA
// La pantalla es un plano con la tira larga (backend/captura_hero.py) como textura. El scroll NO mueve
// el plano: mueve el `offset` de la textura. Por eso recorre ocho mil píxeles de página sin que la
// geometría se entere, y por eso es scrubbeable frame a frame — que es lo que un video incrustado no
// permitiría.
//
// CONTRATO DE UN HERO — render3d/demo/heroes/<id>.js
//     export const meta = { id, nombre, necesita: ['tira'|'elementos'|'nada'], beats }
//     export function build(ctx) -> { g, gr, tl }
//   `g`  va a la escena normal (recibe bloom).
//   `gr` va a la escena POST-BLOOM: ahí va la pantalla, porque una página es mayormente blanca y el
//        bloom la convierte en una mancha.

import { LOOK, b, E, hex, matAcento, dolly } from '../kit.js'

export const meta = {
  id: 'telefono',
  nombre: 'Teléfono flotando',
  necesita: ['tira'],
  beats: 8,
}

const AR = 9 / 19.5                 // proporción real; inventarla es lo primero que delata un mockup
const R_ESQ = 0.135                 // radio de esquina como fracción del ancho
const BISEL = 0.030                 // bisel, como fracción del ancho — fino y parejo en los 4 lados

// Rectángulo con esquinas redondeadas como `THREE.Shape`. Extruido con bisel da, de una sola vez, la
// esquina continua Y el canto metálico. Es la única forma barata de conseguir la silueta correcta sin
// traer RoundedBoxGeometry de los addons.
function formaRedonda(THREE, w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

export function build(ctx) {
  const { THREE, gsap, mundoH, camera, distBase, rnd, texturas, spec } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()      // lo que NO debe florecer: la pantalla
  const tl = gsap.timeline({ paused: true })

  const tira = texturas && texturas.get('tira')
  // CUANTA PAGINA SE VE, Y POR QUE NO ES "UNA PANTALLA ENTERA".
  // La tira se captura a 720 px de ancho (un viewport movil a 2x). La pantalla del telefono ocupa
  // unos 600 px del cuadro de 1080, asi que mostrar un viewport completo deja la tipografia de la
  // pagina en ~10 px de alto. A ese tamaño NINGUN filtro la salva: el aparato esta inclinado en 3D,
  // el muestreo nunca cae texel-a-pixel, y el texto sale con una franja mas clara cruzando cada
  // renglon —se veia como si estuviera tachado—. No es un problema de mipmaps: se probo sin ellos y
  // salio igual, y la tira ORIGINAL esta perfectamente nitida, asi que el ruido lo agrega el
  // remuestreo, no la captura.
  //
  // Por eso se muestra la MITAD de un viewport, al doble de tamaño. Es lo que hace cualquier mockup
  // de producto: nadie filma un telefono para que se lea la pagina entera, lo filma para que se lea
  // UNA cosa. Ademas el scroll sigue recorriendo la pagina, asi que no se pierde contenido: se
  // pierde simultaneidad, que es justo lo que sobraba.
  const ZOOM = 2
  const altoVP = ((spec && spec.tiraViewport) || 1560) / ZOOM
  const altoTira = tira && tira.image ? tira.image.height : altoVP

  // EL TAMAÑO DECIDE SI LA PÁGINA SE LEE O ES RUIDO. A 0.60 de alto de cuadro el teléfono entra
  // entero y elegante, y el texto de la página queda en seis píxeles: una textura gris que no dice
  // nada. Un reel de producto encuadra el aparato GRANDE, aunque se salga del cuadro — es lo que
  // hace cualquier anuncio de teléfono. A 0.86 el mismo texto mide un 43% más y ya se lee.
  const ALTO = mundoH * 0.86
  const ANCHO = ALTO * AR
  const GRUESO = ANCHO * 0.085
  const R = ANCHO * R_ESQ

  // DOS GRUPOS, Y NO ES UN CAPRICHO. `gTel` hace la LLEGADA y la SALIDA; `gFlota`, hijo suyo, hace el
  // vaivén continuo. Separarlos evita que dos tweens escriban la misma propiedad y se pisen.
  //
  // El primer intento tenía uno solo y resolvía el vaivén con `modifiers` de GSAP — y NUNCA CORRIÓ.
  // `modifiers` sólo se aplica a propiedades que están declaradas en `vars`, y ahí no había ninguna:
  // era un tween sin nada que animar con un modificador colgado. Cero errores, cero avisos, y el
  // teléfono llegaba y se quedaba clavado. En la lámina de contactos no se ve, porque entre cuadro y
  // cuadro la página scrollea y parece que algo pasa. Lo encontró la compuerta de "nada se mueve".
  const gTel = new THREE.Group()
  g.add(gTel)
  const gFlota = new THREE.Group()
  gTel.add(gFlota)

  // ---------------------------------------------------------------- cuerpo
  // El bisel de la extrusión ES el canto: un borde curvo que va del frente al lateral y devuelve un
  // reflejo cuando el aparato gira. Con `bevelSegments: 3` la curva se lee y no cuesta nada.
  const geoCuerpo = new THREE.ExtrudeGeometry(formaRedonda(THREE, ANCHO, ALTO, R), {
    depth: GRUESO, bevelEnabled: true,
    bevelThickness: GRUESO * 0.30, bevelSize: ANCHO * 0.012, bevelSegments: 3, curveSegments: 24,
  })
  geoCuerpo.center()
  const cuerpo = new THREE.Mesh(geoCuerpo, new THREE.MeshPhysicalMaterial({
    // Titanio, no plástico negro: `metalness` alto con `roughness` medio da el gris que refleja el
    // ambiente por los cantos en vez de tragarse la luz.
    color: hex('#7c828f'), roughness: 0.34, metalness: 1.0,
    clearcoat: 0.6, clearcoatRoughness: 0.25,
  }))
  gFlota.add(cuerpo)

  // Frente negro: el bisel del aparato. Va apenas por delante del cuerpo y apenas más chico, así que
  // deja ver el canto metálico alrededor — que es exactamente lo que se ve en un teléfono real.
  const geoFrente = new THREE.ExtrudeGeometry(
    formaRedonda(THREE, ANCHO * (1 - BISEL * 0.6), ALTO * (1 - BISEL * 0.6 * AR), R * 0.96),
    { depth: GRUESO * 0.10, bevelEnabled: false, curveSegments: 24 })
  geoFrente.center()
  const frente = new THREE.Mesh(geoFrente, new THREE.MeshPhysicalMaterial({
    color: hex('#07080c'), roughness: 0.22, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.06,
  }))
  frente.position.z = GRUESO * 0.52
  gFlota.add(frente)

  // Botones laterales. Son tres cilindros de dos milímetros que casi no se ven — y justamente por eso
  // hacen falta: un canto perfectamente liso se lee como un render, no como un objeto.
  const matBoton = new THREE.MeshPhysicalMaterial({ color: hex('#6d7381'), roughness: 0.3, metalness: 1 })
  const boton = (y, largo) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ANCHO * 0.012, largo, GRUESO * 0.55), matBoton)
    m.position.set(ANCHO / 2 + ANCHO * 0.004, y, 0)
    gFlota.add(m)
    return m
  }
  boton(ALTO * 0.20, ALTO * 0.075)                       // encendido
  const vol = new THREE.Mesh(new THREE.BoxGeometry(ANCHO * 0.012, ALTO * 0.055, GRUESO * 0.55), matBoton)
  vol.position.set(-ANCHO / 2 - ANCHO * 0.004, ALTO * 0.26, 0); gFlota.add(vol)
  const vol2 = vol.clone(); vol2.position.y = ALTO * 0.185; gFlota.add(vol2)

  // ---------------------------------------------------------------- pantalla
  // Va en `gr` (post-bloom) pero se mueve CON el teléfono, que vive en `g`: son dos escenas distintas,
  // así que no puede ser hijo — se le copia la transformación en cada frame.
  let pantalla = null
  if (tira) {
    tira.colorSpace = THREE.SRGBColorSpace
    tira.wrapS = tira.wrapT = THREE.ClampToEdgeWrapping
    tira.anisotropy = 8
    // SIN MIPMAPS, Y NO ES UN DESCUIDO. La pantalla del telefono mide ~1600 px en el cuadro y el
    // viewport de la tira son 1560 texels: es practicamente 1:1, el unico caso donde el mipmap
    // ESTORBA. Con la derivada rondando 1.0 el muestreo cae medio nivel abajo y devuelve la mitad de
    // la resolucion: en el video se veia una fila mas clara CRUZANDO cada renglon de texto, como un
    // tachado, sobre todo en la equis-altura. Con filtro lineal puro el texto de la pagina sale
    // nitido, que es la unica razon por la que esta escena existe.
    tira.generateMipmaps = false
    tira.minFilter = THREE.LinearFilter
    tira.needsUpdate = true
    const visible = altoVP / altoTira
    tira.repeat.set(1, visible)
    tira.offset.set(0, 1 - visible)                      // arranca ARRIBA de la página

    const pw = ANCHO * (1 - BISEL * 1.7)
    const ph = ALTO * (1 - BISEL * 1.7 * AR)
    // TODO LO QUE PASA SOBRE LA PANTALLA PASA EN ESTE SHADER, y por una razón concreta: cualquier cosa
    // que se dibuje como un plano aparte —un reflejo, la isla— es un rectángulo que asoma por fuera del
    // bisel curvo. El primer intento puso el reflejo en su propio plano y salió un rombo celeste
    // flotando por detrás del aparato, más grande que el teléfono. Acá el SDF recorta todo de una vez.
    const matP = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        map: { value: tira }, uR: { value: (R * 0.80) / pw }, uAR: { value: pw / ph },
        uBrillo: { value: 1.0 }, uBarrido: { value: 0.35 },
        // EL RECORTE DE LA TIRA VIAJA COMO UNIFORM, y no como `tira.repeat/offset`.
        // three aplica repeat/offset SOLO en los materiales que arman la UV con sus propios chunks
        // (`uvTransform`). Este shader esta escrito a mano y muestreaba `texture2D(map, vUv)` crudo,
        // asi que los dos renglones que preparaban el viewport no hacian absolutamente nada: la
        // pagina ENTERA —ocho mil pixeles— se aplastaba dentro de la pantalla del telefono y salia
        // como una textura de ruido gris donde no se leia una sola palabra. Y el scroll tampoco
        // existia: el tween movia `tira.offset`, que este shader nunca lee. O sea que la promesa del
        // hero (recorrer la pagina de verdad) estaba escrita en el comentario y no en la imagen.
        uRep: { value: new THREE.Vector2(1, visible) },
        uOff: { value: new THREE.Vector2(0, 1 - visible) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform sampler2D map; uniform float uR, uAR, uBrillo, uBarrido;
        uniform vec2 uRep, uOff; varying vec2 vUv;
        // rectángulo redondeado, medido en el espacio del ANCHO para que el radio no se deforme
        float rr(vec2 p, vec2 h, float r){ vec2 d = abs(p) - h + vec2(r); return length(max(d,0.0)) + min(max(d.x,d.y),0.0) - r; }
        void main(){
          vec2 p = vec2(vUv.x - 0.5, (vUv.y - 0.5) / uAR);
          float dist = rr(p, vec2(0.5, 0.5 / uAR), uR);
          float a = smoothstep(0.004, -0.002, dist);
          if (a < 0.004) discard;
          // La misma cuenta que hace three: uv' = uv * repeat + offset. Sin esto se ve la pagina entera.
          vec3 c = texture2D(map, vUv * uRep + uOff).rgb * uBrillo;

          // ISLA DINÁMICA. Va acá y no en su propia geometría porque así queda siempre POR ENCIMA de
          // la página pase lo que pase con el z-fighting, y porque sobre una página oscura sólo se
          // distingue por su borde: negro sobre negro es nada.
          // Proporciones reales: 32% del ancho, alto igual al diámetro de sus tapas, centro al 3.5% de
          // la altura desde arriba. Ojo con las unidades: p esta normalizado al ANCHO, asi que un
          // desplazamiento vertical se divide por uAR y uno horizontal no.
          float di = rr(p - vec2(0.0, 0.465 / uAR), vec2(0.159, 0.0475), 0.0475);
          c = mix(c, vec3(0.0), smoothstep(0.0015, -0.0008, di));
          c += vec3(0.30, 0.32, 0.38) * smoothstep(0.0, -0.0022, abs(di) - 0.0016);

          // REFLEJO DE VIDRIO: una banda diagonal ancha y clarísima que BARRE la pantalla. Es lo que
          // convierte "una imagen pegada" en "una superficie", y el barrido es el gesto que usa
          // cualquier anuncio de producto para decir vidrio. Recortada por el mismo SDF: no puede salirse.
          float band = smoothstep(0.40, 0.0, abs((vUv.x * 0.75 + vUv.y * 1.15) - uBarrido));
          c += vec3(0.55, 0.62, 0.78) * band * 0.055;

          // FILO INTERNO: la línea especular donde el vidrio muerde el bisel. Sin esto, con una página
          // de fondo oscuro, no se ve dónde termina el aparato y dónde empieza la pantalla.
          c += vec3(0.42, 0.46, 0.56) * smoothstep(-0.010, -0.001, dist) * 0.55;
          gl_FragColor = vec4(c, a);
        }`,
    })
    pantalla = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), matP)
    gr.add(pantalla)
  }

  // (isla dinámica, barrido de vidrio y filo interno viven dentro del shader de la pantalla, porque
  // sólo ahí quedan recortados por la misma silueta redondeada)

  // HALO detrás. Un objeto oscuro sobre un fondo oscuro no se separa por más canto que se le ponga:
  // hace falta que el FONDO se aclare donde el objeto está. Es la luz que un fotógrafo pone detrás del
  // producto, y sin esto —con una página oscura— el teléfono es una silueta invisible.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO * 3.2, ALTO * 1.7),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: hex(LOOK.acento) }, uF: { value: 0.34 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 uCol; uniform float uF; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(uCol, smoothstep(0.5, 0.04, distance(vUv, vec2(0.5))) * uF); }`,
    }))
  halo.position.z = -GRUESO * 2.4
  gFlota.add(halo)

  // ---------------------------------------------------------------- tiempo
  const DUR = b(meta.beats)

  // El fondo CEDE mientras el hero es el sujeto: la grilla en fuga y una página adentro de una pantalla
  // son dos tramas finas compitiendo por la misma atención. Vuelve antes del corte, porque la escena
  // siguiente cuenta con ella.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.28, duration: b(1.1), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // LLEGA girado y desde el fondo. Es el gesto que sólo existe porque hay perspectiva: en 2D un
  // teléfono únicamente puede crecer.
  gTel.position.set(0, -0.30, -6.5)
  gTel.rotation.set(0.26, -0.66, 0.09)
  tl.to(gTel.position, { z: 0, duration: b(1.15), ease: E.llega(1.6) }, 0)
  tl.to(gTel.rotation, { x: 0.05, y: -0.22, z: 0.015, duration: b(1.35), ease: E.llega(1.4) }, 0)

  // FLOTA: nunca queda quieto. Tres períodos que NO son múltiplos entre sí — si lo fueran, los ejes
  // volverían a alinearse cada tanto y el conjunto latiría como una sola cosa, que se nota más que la
  // quietud misma.
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28, f3 = rnd() * 6.28
  const flotar = () => {
    const t = tl.time()
    // Arranca en cero y crece: si el vaivén ya estuviera a plena amplitud durante la llegada, el
    // aparato entraría temblando en vez de llegar y asentarse.
    const k = Math.min(1, Math.max(0, (t - b(1.1)) / b(1.2)))
    gFlota.position.y = Math.sin(t * 0.74 + f1) * 0.15 * k
    gFlota.rotation.y = Math.sin(t * 0.53 + f2) * 0.14 * k
    gFlota.rotation.z = Math.sin(t * 0.41 + f3) * 0.03 * k
  }
  flotar()

  // EL SCROLL recorre como mucho el 68% de la tira: llegar al final delata que la página se acabó.
  // Se anima el UNIFORM y no `tira.offset`: este shader no lee repeat/offset de la textura (ver la
  // nota larga arriba). Mientras el tween apunto a `tira.offset`, el telefono no scrolleo NUNCA.
  if (tira && pantalla) {
    const visible = altoVP / altoTira
    const recorrido = Math.max(0, 1 - visible) * 0.68
    tl.fromTo(pantalla.material.uniforms.uOff.value, { y: 1 - visible },
      { y: 1 - visible - recorrido, duration: b(meta.beats - 1.6), ease: E.frena(3), immediateRender: false },
      b(0.9))
  }

  // El barrido del reflejo cruza una sola vez, empezando cuando el teléfono ya frenó: durante la
  // llegada compite con el movimiento y no se lee.
  if (pantalla) {
    tl.fromTo(pantalla.material.uniforms.uBarrido, { value: 0.25 },
      { value: 2.25, duration: b(3.2), ease: E.vaiven(2), immediateRender: false }, b(1.5))
  }

  // La cámara se acerca mientras el aparato se asienta, y vuelve. Sin esto no hay paralaje contra el
  // fondo y el objeto se lee pegado a la imagen de atrás.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.9) }, { z: dolly(distBase, -0.35), duration: DUR * 0.82, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // SALIDA acelerando: es lo que hace que el corte siguiente se sienta ganado y no impuesto.
  tl.to(gTel.position, { y: mundoH * 0.95, duration: b(0.85), ease: E.acelera(3) }, DUR - b(0.85))
  tl.to(gTel.rotation, { z: 0.32, x: -0.28, duration: b(0.85), ease: E.acelera(2) }, DUR - b(0.85))

  // La pantalla vive en la otra escena: copia la transformación del aparato en cada frame.
  // La pantalla vive en la OTRA escena, así que no puede ser hija: se le copia la transformación
  // MUNDIAL de gFlota, que ya combina la llegada de gTel con el vaivén. Copiar sólo gTel dejaba la
  // pantalla quieta mientras el aparato se movía — el vidrio flotando por su cuenta.
  const sincronizar = () => {
    if (!pantalla) return
    g.updateWorldMatrix(true, true)
    gFlota.matrixWorld.decompose(pantalla.position, pantalla.quaternion, pantalla.scale)
    pantalla.translateZ(GRUESO * 0.59)
  }
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
  tl.eventCallback('onUpdate', () => { flotar(); sincronizar() })
  sincronizar()

  return { g, gr, tl }
}
