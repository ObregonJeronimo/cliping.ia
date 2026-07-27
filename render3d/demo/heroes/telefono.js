// HERO "telefono" — un teléfono 3D flotando que muestra LA PÁGINA DEL USUARIO scrolleando.
//
// Es el hero que mejor cumple la promesa del proyecto: no es geometría genérica teñida con la paleta
// de la marca, es la página real, en el dispositivo donde la mayoría la va a ver, moviéndose.
//
// CÓMO SE MUEVE LA PÁGINA
// La pantalla es un plano con la tira larga (backend/captura_hero.py) como textura. El scroll NO es
// mover el plano: es mover el `offset` de la textura. Por eso puede recorrer ocho mil píxeles de
// página sin que la geometría se entere, y por eso es scrubbeable frame a frame — que es lo que un
// video no permitiría.
//
// EL SCROLL ES LENTO Y CONTINUO, con una desaceleración al final. Un scroll parejo se lee a máquina;
// uno que arranca, toma velocidad y se posa se lee como una mano. Y nunca llega al fondo de la tira:
// terminar justo donde se acaba la captura delata que hay una captura.
//
// CONTRATO DE UN HERO — render3d/demo/heroes/<id>.js
//     export const meta = { id, necesita: ['tira'|'elementos'|'nada'], beats: <N> }
//     export function build(ctx) -> { g, gr, tl, camara? }
//   `g`  va a la escena normal (recibe bloom).
//   `gr` va a la escena POST-BLOOM: ahí van los recortes reales y la pantalla del teléfono, porque un
//        recorte de página es mayormente blanco y el bloom lo convierte en una mancha.
//   `necesita` lo usa el selector: un hero que pide 'tira' no se ofrece si la página no se pudo
//        capturar, en vez de dibujar un teléfono con la pantalla negra.

import { LOOK, b, E, hex, matAcento } from '../kit.js'

export const meta = {
  id: 'telefono',
  nombre: 'Teléfono flotando',
  necesita: ['tira'],
  beats: 8,
}

// Proporción real de un teléfono moderno: 19.5:9. Inventarla es lo primero que hace que un mockup se
// vea falso — el ojo conoce esta forma mejor que cualquier otra pantalla.
const AR = 9 / 19.5
const RADIO = 0.085                 // esquinas, como fracción del ancho

export function build(ctx) {
  const { THREE, gsap, mundoH, camera, distBase, rnd, texturas, spec } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()      // lo que NO debe florecer: la pantalla
  const tl = gsap.timeline({ paused: true })

  const tira = texturas && texturas.get('tira')
  const altoVP = (spec && spec.tiraViewport) || 1560
  const altoTira = tira && tira.image ? tira.image.height : altoVP

  // ---------------------------------------------------------------- el cuerpo
  const ALTO = mundoH * 0.62
  const ANCHO = ALTO * AR
  const GRUESO = ANCHO * 0.09

  const gTel = new THREE.Group()
  g.add(gTel)

  // Chasis: una caja con los cantos suavizados por un segundo plano apenas mayor detrás. Un
  // RoundedBoxGeometry sería más fiel pero vive en los addons y agrega una dependencia por un canto
  // que en un reel vertical se ve dos píxeles.
  const chasis = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO + GRUESO * 0.5, ALTO + GRUESO * 0.5, GRUESO),
    new THREE.MeshPhysicalMaterial({
      color: hex('#0a0c12'), roughness: 0.28, metalness: 0.85,
      clearcoat: 1.0, clearcoatRoughness: 0.12,
    }))
  gTel.add(chasis)

  // Filo de acento en el canto: es lo que hace que el objeto tenga BORDE contra un fondo oscuro. Sin
  // esto el teléfono negro sobre fondo negro es una silueta que sólo se distingue por la pantalla —
  // y con una página oscura, como la de Linear, directamente no se distingue.
  const filo = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO + GRUESO * 0.9, ALTO + GRUESO * 0.62, GRUESO * 0.5),
    matAcento(LOOK.acento, 1.9))
  filo.position.z = -GRUESO * 0.30
  gTel.add(filo)

  // HALO detrás del teléfono. Un objeto oscuro sobre un fondo oscuro no se separa por más filo que se
  // le ponga: hace falta que el FONDO se aclare donde el objeto está. Es un plano con un degradé
  // radial que sale del centro del aparato — el mismo recurso con el que un fotógrafo pone una luz
  // detrás del producto.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO * 3.4, ALTO * 1.9),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: hex(LOOK.acento) }, uF: { value: 0.42 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 uCol; uniform float uF; varying vec2 vUv;
        void main(){
          float d = distance(vUv, vec2(0.5));
          gl_FragColor = vec4(uCol, smoothstep(0.5, 0.03, d) * uF);
        }`,
    }))
  halo.position.z = -GRUESO * 2.2
  gTel.add(halo)

  // ---------------------------------------------------------------- la pantalla
  // Va en `gr` (post-bloom) pero tiene que MOVERSE CON el teléfono, que vive en `g`. Se resuelve
  // copiando la transformación del grupo en cada seek: son dos escenas distintas, no puede ser hijo.
  let pantalla = null
  if (tira) {
    tira.colorSpace = THREE.SRGBColorSpace
    tira.wrapS = THREE.ClampToEdgeWrapping
    tira.wrapT = THREE.ClampToEdgeWrapping
    tira.anisotropy = 8
    // La ventana de la textura es UN viewport de alto sobre una tira mucho más larga.
    tira.repeat.set(1, altoVP / altoTira)
    tira.offset.set(0, 1 - altoVP / altoTira)          // arranca ARRIBA de la página
    const matP = new THREE.MeshBasicMaterial({ map: tira, toneMapped: false })
    pantalla = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 0.955, ALTO * 0.972), matP)
    gr.add(pantalla)
  }

  // Reflejo de vidrio: una banda diagonal clarísima que cruza la pantalla. Es el detalle que convierte
  // un plano con una imagen en un objeto con superficie — y va en `g`, no en `gr`, porque ESTE sí
  // tiene que florecer un poco.
  const vidrio = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO * 1.5, ALTO * 0.30),
    new THREE.MeshBasicMaterial({
      color: hex('#ffffff'), transparent: true, opacity: 0.055, depthWrite: false, toneMapped: false,
    }))
  vidrio.rotation.z = -0.62
  vidrio.position.z = GRUESO * 0.52
  gTel.add(vidrio)

  // ---------------------------------------------------------------- entrada, flotación y salida
  const DUR = b(meta.beats)

  // El fondo BAJA mientras el hero es el sujeto. La grilla en fuga y un teléfono con la página adentro
  // son dos tramas finas compitiendo por la misma atención: juntas aplanan el cuadro y ninguna de las
  // dos se lee. Vuelve a su valor antes de que termine la escena, porque la siguiente cuenta con ella.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.30, duration: b(1.1), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // LLEGA girado y desde el fondo, y se resuelve. Es el gesto que sólo existe porque hay perspectiva:
  // en 2D un teléfono sólo puede crecer.
  gTel.position.set(0, -0.35, -6)
  gTel.rotation.set(0.28, -0.62, 0.10)
  tl.to(gTel.position, { z: 0, duration: b(1.15), ease: E.llega(1.6) }, 0)
  tl.to(gTel.rotation, { x: 0.06, y: -0.20, z: 0.02, duration: b(1.35), ease: E.llega(1.4) }, 0)

  // FLOTA: nunca queda quieto. Tres períodos que no son múltiplos entre sí — si lo fueran, los tres
  // ejes volverían a alinearse cada tanto y el conjunto latiría como una sola cosa, que se nota más
  // que la quietud.
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28, f3 = rnd() * 6.28
  tl.to(gTel.position, { y: '+=0.16', duration: DUR, ease: 'none',
    modifiers: { y: () => -0.35 + Math.sin(tl.time() * 0.74 + f1) * 0.16 } }, 0)
  tl.to(gTel.rotation, { duration: DUR, ease: 'none',
    modifiers: {
      y: () => -0.20 + Math.sin(tl.time() * 0.53 + f2) * 0.13,
      z: () => 0.02 + Math.sin(tl.time() * 0.41 + f3) * 0.035,
    } }, b(1.35))

  // EL SCROLL. Recorre como mucho el 68% de la tira: llegar al final delata que la página se acabó.
  if (tira) {
    const visible = altoVP / altoTira
    const recorrido = Math.max(0, 1 - visible) * 0.68
    tl.fromTo(tira.offset,
      { y: 1 - visible },
      { y: 1 - visible - recorrido, duration: b(meta.beats - 1.6), ease: E.frena(3), immediateRender: false },
      b(0.9))
  }

  // LA CÁMARA se acerca apenas mientras el teléfono se asienta, y vuelve. Sin esto el paralaje entre
  // el teléfono y el fondo no existe y el objeto se lee pegado a la imagen de atrás.
  tl.fromTo(camera.position, { z: distBase + 0.9 }, { z: distBase - 0.35, duration: DUR * 0.82, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // SALIDA: se va hacia arriba acelerando y girando. Acelerar en la salida es lo que hace que el corte
  // siguiente se sienta ganado y no impuesto.
  tl.to(gTel.position, { y: mundoH * 0.95, duration: b(0.85), ease: E.acelera(3) }, DUR - b(0.85))
  tl.to(gTel.rotation, { z: 0.34, x: -0.3, duration: b(0.85), ease: E.acelera(2) }, DUR - b(0.85))

  // La pantalla vive en otra escena: copia la transformación del teléfono en cada frame.
  const sincronizar = () => {
    if (!pantalla) return
    pantalla.position.copy(gTel.position)
    pantalla.rotation.copy(gTel.rotation)
    pantalla.scale.copy(gTel.scale)
    // 0.53 del grueso: por delante del chasis pero por detrás del reflejo de vidrio
    pantalla.translateZ(GRUESO * 0.51)
  }
  tl.to({}, { duration: DUR, ease: 'none', onUpdate: sincronizar }, 0)
  sincronizar()

  return { g, gr, tl }
}
