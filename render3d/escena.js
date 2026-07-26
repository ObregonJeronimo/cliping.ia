// render3d — la escena. Three.js + GSAP dentro de un Chrome headless, manejada frame a frame desde
// afuera. Es un BACKEND DE DIBUJO de la timeline del Director, no un motor nuevo: el qué y el cuándo
// siguen saliendo de src/director (medidos de la página del usuario, deterministas, editables); acá
// se decide solamente CÓMO se ve.
//
// POR QUÉ WEBGL Y NO CANVAS 2D
// Canvas 2D no tiene cámara. Puede escalar y trasladar una imagen, pero no puede moverse ALREDEDOR de
// ella: no hay paralaje real, no hay tarjeta que gire mostrando su canto, no hay profundidad de campo,
// no hay bloom sobre el acento de la marca ni desenfoque de movimiento. Eso es exactamente la
// distancia entre "una plantilla animada" y "una pieza de After Effects".
//
// DETERMINISMO — es invariante del repo, no una preferencia
//   · nada de requestAnimationFrame: el driver llama seek(t) y después render(). El reloj es de afuera.
//   · las timelines de GSAP nacen `paused:true` y se recorren con .time(t) — mismo t, mismo frame.
//   · nada de Math.random: PRNG con semilla, la misma familia mulberry32 que usa el Director.
//   · Chrome corre con SwiftShader (rasterizado por CPU) -> el mismo frame en cualquier máquina.
//
// El contrato con el driver es window.URVID: init(spec) -> seek(t) -> render(). Nada más.

// OJO: 'three' por especificador BARE, resuelto por el importmap del html — no './three.module.js'.
// Los pases de postprocesado importan 'three' a su vez, y si esto lo importara por ruta relativa
// habria DOS instancias del modulo en memoria: los instanceof fallan y el composer rechaza la escena
// con un error que no dice nada de la causa.
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// ---------------------------------------------------------------- azar con semilla
// Misma familia que src/director/core/prng.js: el grano y los micro-desvíos tienen que repetirse
// exactamente entre dos corridas, si no el "byte-idéntico" se pierde por la decoración.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------- grano + viñeta + aberración
// Un pase propio en vez de FilmPass: el de la librería anima el grano con su propio reloj interno
// (`time` que avanza solo), y eso rompe el determinismo — el mismo t daba dos granos distintos. Acá
// el tiempo ENTRA como uniform y lo pone el driver.
const ShaderPelicula = {
  uniforms: {
    tDiffuse: { value: null },
    uT: { value: 0 },
    uGrano: { value: 0.055 },
    uVinieta: { value: 0.85 },
    uAberr: { value: 0.0016 },
    uRes: { value: new THREE.Vector2(1080, 1920) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uT, uGrano, uVinieta, uAberr;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      // ABERRACION CROMATICA: crece hacia los bordes, como una lente de verdad. Constante en todo el
      // cuadro se ve como un error de render; radial se lee como vidrio.
      vec2 des = c * uAberr * r2 * 4.0;
      vec4 col;
      col.r = texture2D(tDiffuse, vUv + des).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - des).b;
      col.a = 1.0;
      // VIÑETA suave: baja el brillo en las esquinas y empuja la mirada al centro del cuadro.
      col.rgb *= mix(1.0, smoothstep(0.85, 0.15, r2), uVinieta);
      // GRANO: el tiempo entra como semilla para que se mueva, pero es el t del driver, no un reloj.
      float g = hash(vUv * uRes + vec2(uT * 71.3, uT * 37.7)) - 0.5;
      col.rgb += g * uGrano;
      gl_FragColor = col;
    }
  `,
}

// ---------------------------------------------------------------- utilidades de color / caja
const hex = h => new THREE.Color(h || '#000000')
// El Director trabaja en fracciones del cuadro (0..1, con el origen arriba a la izquierda) y three en
// unidades de mundo con el origen en el centro y la Y para arriba. Toda la conversión pasa por acá:
// tenerla en un solo lugar es lo que permite que una caja del storyboard y su plano en 3D no se
// separen nunca.
const MUNDO_H = 10                                  // alto del cuadro en unidades de mundo

export class Escena {
  constructor(spec, canvas) {
    this.spec = spec
    this.W = spec.W || 1080
    this.H = spec.H || 1920
    this.aspecto = this.W / this.H
    this.mundoH = MUNDO_H
    this.mundoW = MUNDO_H * this.aspecto
    this.rnd = mulberry32((spec.seed || 1) >>> 0)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(1)                  // 1 fijo: un devicePixelRatio distinto cambiaría el frame
    this.renderer.setSize(this.W, this.H, false)
    // Sin mapeo de tono salvo que el spec lo pida. La paleta viene MEDIDA de la pagina y ya es sRGB;
    // ACES la trata como si fuera HDR y levanta los claros, asi que el blanco de la marca dejaba de
    // ser su blanco y toda la pieza se veia lavada.
    this.renderer.toneMapping = spec.tono === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping
    this.renderer.toneMappingExposure = spec.exposicion == null ? 1.0 : spec.exposicion
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = hex(spec.look.bg0)

    // Cámara con perspectiva SUAVE (fov chico). Un fov ancho deforma las tarjetas en los bordes y las
    // hace ver como un videojuego; 28° da paralaje visible sin que nada se lea torcido.
    this.fov = spec.fov == null ? 28 : spec.fov
    this.camera = new THREE.PerspectiveCamera(this.fov, this.aspecto, 0.1, 200)
    this.distBase = (this.mundoH / 2) / Math.tan((this.fov * Math.PI / 180) / 2)
    this.camera.position.set(0, 0, this.distBase)
    this.camera.lookAt(0, 0, 0)

    this._luces()
    this._fondo()
    this.capas = []
    this._composer()
    this.tl = null
  }

  // ---- luces. Un plano con MeshBasicMaterial no necesita luz, pero las tarjetas usan material físico
  // para que el canto agarre un brillo cuando giran — que es la señal de que hay volumen y no un dibujo.
  _luces() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 2.2))
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(-3, 6, 8)
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(hex(this.spec.look.accent), 1.1)
    rim.position.set(5, -2, -4)
    this.scene.add(rim)
  }

  // ---- fondo: un plano grande MUY atrás con el degradé del look. Está en 3D a propósito — al moverse
  // la cámara se desplaza menos que las capas de adelante y eso ES el paralaje.
  _fondo() {
    const g = new THREE.PlaneGeometry(this.mundoW * 3.2, this.mundoH * 3.2)
    const m = new THREE.ShaderMaterial({
      uniforms: { c0: { value: hex(this.spec.look.bg0) }, c1: { value: hex(this.spec.look.bg1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 c0, c1; varying vec2 vUv;
        void main(){
          float d = distance(vUv, vec2(0.5, 0.62));
          gl_FragColor = vec4(mix(c1, c0, smoothstep(0.06, 0.75, d)), 1.0);
        }`,
      depthWrite: false,
    })
    const p = new THREE.Mesh(g, m)
    p.position.z = -26
    this.scene.add(p)
    this.fondo = p
  }

  _composer() {
    const rt = new THREE.WebGLRenderTarget(this.W, this.H, {
      type: THREE.HalfFloatType, colorSpace: THREE.SRGBColorSpace,
    })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    // BLOOM: es lo que hace que el acento de la marca "prenda". Umbral alto para que solo florezcan
    // las zonas realmente claras — bajarlo lava el cuadro entero y se pierde el negro.
    const b = this.spec.bloom || {}
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(this.W, this.H),
      b.fuerza == null ? 0.42 : b.fuerza,
      b.radio == null ? 0.45 : b.radio,
      b.umbral == null ? 0.82 : b.umbral)
    this.composer.addPass(this.bloom)
    this.pelicula = new ShaderPass(ShaderPelicula)
    this.pelicula.uniforms.uRes.value.set(this.W, this.H)
    const f = this.spec.pelicula || {}
    if (f.grano != null) this.pelicula.uniforms.uGrano.value = f.grano
    if (f.vinieta != null) this.pelicula.uniforms.uVinieta.value = f.vinieta
    if (f.aberr != null) this.pelicula.uniforms.uAberr.value = f.aberr
    this.composer.addPass(this.pelicula)
    this.composer.addPass(new OutputPass())
  }

  // ---- una capa del Director -> un objeto 3D.
  // Los PNG recortados de la página van como textura de un plano. El plano NO se estira: se le da la
  // proporción del archivo, igual que hace capaElemento en el render 2D — deformar el logo de una
  // marca es el defecto que su dueño ve antes que ninguno.
  async agregarCapa(capa, texturas) {
    const [bx, by, bw, bh] = capa.box
    let ancho = bw * this.mundoW
    let alto = bh * this.mundoH
    let mesh

    if (capa.kind === 'elemento' || capa.kind === 'photo') {
      const tex = texturas.get(capa.url)
      if (!tex) return null
      const ar = tex.image.width / tex.image.height
      if (capa.kind === 'elemento') {
        // contain: entra completo
        if (ancho / alto > ar) ancho = alto * ar; else alto = ancho / ar
      }
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      const mat = new THREE.MeshPhysicalMaterial({
        map: tex, transparent: true, roughness: 0.55, metalness: 0.0,
        clearcoat: capa.rol === 'tarjeta' ? 0.35 : 0.0,   // la tarjeta agarra un brillo al girar
        side: THREE.DoubleSide, depthWrite: false,
      })
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), mat)
    } else if (capa.kind === 'texto' || capa.kind === 'text') {
      // El texto llega YA RASTERIZADO desde el render 2D del Director (que sabe de fitters, viudas,
      // escrituras no latinas y APCA). Re-tipografiarlo acá sería reescribir mal media core/text.js.
      const tex = texturas.get(capa.url)
      if (!tex) return null
      tex.colorSpace = THREE.SRGBColorSpace
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), mat)
    } else {
      return null
    }

    // posición: fracción del cuadro -> mundo, con el ancla en el CENTRO de la caja
    mesh.position.x = (bx + bw / 2 - 0.5) * this.mundoW
    mesh.position.y = -(by + bh / 2 - 0.5) * this.mundoH
    // PROFUNDIDAD REAL a partir del z del storyboard. El z del Director era solo orden de pintado;
    // acá se convierte en distancia, y eso es lo que produce el paralaje cuando la cámara se mueve.
    //
    // La separación tiene que ser GRANDE o no existe. La primera versión repartía las capas en dos
    // unidades de mundo contra una cámara a veinte: el paralaje era de menos de un píxel y el render
    // 3D salía idéntico al 2D con una viñeta encima — todo el costo de WebGL y ninguna de sus ventajas.
    // Ahora el rango va de -4 (el fondo, que casi no se mueve) a +2.4 (el chip de marca, pegado al
    // lente), que sobre un dolly de una unidad da un desplazamiento relativo bien visible.
    mesh.position.z = ((capa.z || 10) - 26) * 0.30
    mesh.renderOrder = capa.z || 10
    mesh.userData = { capa, x0: mesh.position.x, y0: mesh.position.y, z0: mesh.position.z, w0: ancho, h0: alto }
    this.scene.add(mesh)
    this.capas.push(mesh)
    return mesh
  }

  // ---- las curvas del Director -> una timeline de GSAP en pausa.
  // Se traduce track por track en vez de re-animar: los tiempos, los valores y los easings ya los
  // decidió el compilador del Director a partir de la página, y son los mismos que el usuario puede
  // editar en el estudio. Acá solo se ejecutan.
  construirTimeline() {
    const g = window.gsap
    this.tl = g.timeline({ paused: true })
    for (const mesh of this.capas) {
      const { capa, x0, y0, z0, w0, h0 } = mesh.userData
      const tr = capa.tracks || {}
      const dst = { mesh, x0, y0, z0, w0, h0 }
      for (const [prop, keys] of Object.entries(tr)) {
        if (!keys || keys.length < 2) continue
        for (let i = 0; i < keys.length - 1; i++) {
          const a = keys[i], b = keys[i + 1]
          const dur = Math.max(0.0001, b.t - a.t)
          this.tl.to(dst, {
            duration: dur,
            ease: easeGsap(b.ease),
            onUpdate: null,
            [`_${prop}`]: b.v,
            onStart: () => { dst[`_${prop}`] = a.v },
          }, a.t)
        }
        dst[`_${prop}`] = keys[0].v
      }
      mesh.userData.dst = dst
    }
    // ---- GESTO 3D DE ENTRADA. Es lo que canvas 2D no puede hacer y la razón de que exista esta capa.
    // Mientras la capa aparece, además de su animación 2D (que decidió el Director y no se toca),
    // llega desde ATRÁS y girada sobre su eje vertical, y se resuelve en plano justo cuando termina de
    // entrar. En 2D un objeto que aparece solo puede crecer o deslizarse; acá LLEGA — se ve el canto,
    // la luz de recorte lo roza y el ojo lee volumen.
    //
    // El giro se toma del lado del cuadro donde vive la capa: una tarjeta a la izquierda gira desde la
    // izquierda. Girarlas todas para el mismo lado se lee como una plantilla.
    const g3 = this.spec.gesto || {}
    const giro = g3.giro == null ? 0.5 : g3.giro
    const fondo3d = g3.profundidad == null ? 2.4 : g3.profundidad
    for (const mesh of this.capas) {
      const { capa, x0, z0 } = mesh.userData
      const vida = capa.vida || [0, this.spec.dur]
      const dur = Math.min(0.5, Math.max(0.18, (vida[1] - vida[0]) * 0.28))
      if (dur <= 0.05) continue
      const lado = x0 === 0 ? (capa.z % 2 ? 1 : -1) : Math.sign(x0)
      // El chip de marca y el pie no giran: son anclas, su trabajo es estar quietos y pegados al borde.
      const ancla = capa.id.endsWith(':brand') || capa.id.endsWith(':pie')
      this.tl.fromTo(mesh.rotation,
        { y: ancla ? 0 : lado * giro },
        { y: 0, duration: dur, ease: 'power3.out' }, vida[0])
      this.tl.fromTo(mesh.position,
        { z: z0 - fondo3d },
        { z: z0, duration: dur * 1.15, ease: 'power3.out' }, vida[0])
    }

    // El grano avanza con el tiempo del video, no con el reloj: se ata a la misma timeline.
    this.tl.to(this.pelicula.uniforms.uT, { duration: this.spec.dur, value: this.spec.dur, ease: 'none' }, 0)
    // Movimiento de CAMARA: un dolly lento hacia adelante más una deriva lateral mínima. Es el gesto
    // que canvas 2D no puede imitar — no es un zoom sobre una imagen plana, es la cámara acercándose
    // a un espacio donde los objetos están a distintas distancias.
    const cam = this.spec.camara || {}
    const dz = cam.dolly == null ? 0.9 : cam.dolly
    const dx = cam.deriva == null ? 0.5 : cam.deriva
    this.tl.fromTo(this.camera.position,
      { z: this.distBase + dz * 0.6, x: -dx * 0.5 },
      { z: this.distBase - dz * 0.4, x: dx * 0.5, duration: this.spec.dur, ease: 'none' }, 0)
    return this.tl
  }

  seek(t) {
    this.tl.time(Math.max(0, Math.min(this.spec.dur, t)), false)
    // Los valores interpolados por GSAP se vuelcan al mesh acá y no en un onUpdate por tween: con un
    // onUpdate por tramo, dos tramos del mismo prop que se solapan se pisan en orden impredecible.
    for (const mesh of this.capas) {
      const d = mesh.userData.dst
      if (!d) continue
      const p = d._alpha == null ? 1 : d._alpha
      mesh.material.opacity = Math.max(0, Math.min(1, p))
      mesh.visible = p > 0.002
      const sx = d._scale == null ? 1 : d._scale
      mesh.scale.set(sx, sx, 1)
      if (d._x != null) mesh.position.x = (d._x - 0.5) * this.mundoW + (d.w0 / 2) * 0
      if (d._y != null) mesh.position.y = -((d._y - 0.5) * this.mundoH)
      if (d._rot != null) mesh.rotation.z = d._rot
      // GIRO 3D: mientras la capa entra, se acompaña con un giro en Y que se resuelve al llegar. Es
      // lo que hace que la tarjeta "llegue" en vez de aparecer, y solo existe porque hay perspectiva.
      if (d._rotY != null) mesh.rotation.y = d._rotY
    }
    this.camera.lookAt(0, 0, 0)
  }

  render() { this.composer.render() }

  // ---- DESENFOQUE DE MOVIMIENTO por ángulo de obturador.
  // Es la diferencia entre "filmico" y "a saltos", y no se puede fingir con un blur direccional: un
  // blur uniforme emborrona TODO el cuadro, y lo que hace una cámara real es integrar el movimiento
  // durante el tiempo que el obturador está abierto — lo quieto queda nítido y lo que se mueve se
  // arrastra, cada objeto según SU velocidad. Eso solo sale sacando varias muestras dentro del frame
  // y promediándolas, que es exactamente lo que se hace acá.
  //
  // 180° es el estándar de cine (el obturador abierto media exposición); 240° arrastra más y se usa
  // cuando el movimiento es rápido. Con `muestras: 1` se apaga y el render sale nítido y más rápido.
  frameCon(t, fps, obturador, muestras) {
    const acc = this.acc || (this.acc = document.getElementById('acc').getContext('2d', { willReadFrequently: false }))
    const W = this.W, H = this.H
    if (muestras <= 1) {
      this.seek(t); this.render()
      acc.globalAlpha = 1; acc.globalCompositeOperation = 'copy'
      acc.drawImage(this.renderer.domElement, 0, 0)
      return
    }
    // La ventana se centra en t: adelantada, el objeto parece llegar antes de tiempo; atrasada, tarde.
    const vent = (obturador / 360) / fps
    acc.globalCompositeOperation = 'copy'
    acc.globalAlpha = 1
    acc.fillStyle = '#000'
    acc.fillRect(0, 0, W, H)
    acc.globalCompositeOperation = 'lighter'
    for (let k = 0; k < muestras; k++) {
      const dt = ((k + 0.5) / muestras - 0.5) * vent
      this.seek(Math.max(0, t + dt))
      this.render()
      acc.globalAlpha = 1 / muestras
      acc.drawImage(this.renderer.domElement, 0, 0)
    }
    acc.globalCompositeOperation = 'source-over'
    acc.globalAlpha = 1
  }
}

// GSAP tiene su propio vocabulario de easings; el Director tiene el suyo. La tabla es explícita a
// propósito: un fallback silencioso a 'none' convertiría un spring en una rampa lineal y el
// movimiento perdería exactamente lo que lo hace ver hecho a mano.
function easeGsap(e) {
  if (!e || e === 'lin') return 'none'
  const t = {
    eo: 'power2.out', ei: 'power2.in', eio: 'power2.inOut',
    co: 'power3.out', ci: 'power3.in', cio: 'power3.inOut',
    qo: 'power4.out', back: 'back.out(1.7)', step: 'steps(1)',
  }
  if (t[e]) return t[e]
  const m = /^spring:([\d.]+),([\d.]+)$/.exec(e)
  if (m) {
    // GSAP no trae spring en el core. Se aproxima con elastic, que da el mismo rebote amortiguado:
    // amplitud 1 y período derivado de la rigidez, para que un spring rígido rebote más corto.
    const rig = parseFloat(m[2]) || 12
    return `elastic.out(1, ${(0.9 / Math.sqrt(rig / 10)).toFixed(3)})`
  }
  return 'power2.out'
}

// ---------------------------------------------------------------- contrato con el driver
window.URVID = {
  async init(spec) {
    const canvas = document.getElementById('c')
    canvas.width = spec.W; canvas.height = spec.H
    const acc = document.getElementById('acc')
    acc.width = spec.W; acc.height = spec.H
    const cargador = new THREE.TextureLoader()
    const texturas = new Map()
    const urls = [...new Set(spec.capas.map(c => c.url).filter(Boolean))]
    await Promise.all(urls.map(u => new Promise(res => {
      cargador.load(u, tex => { texturas.set(u, tex); res() }, undefined, () => res())
    })))
    const esc = new Escena(spec, canvas)
    for (const c of spec.capas) await esc.agregarCapa(c, texturas)
    esc.construirTimeline()
    window.__esc = esc
    return { capas: esc.capas.length, texturas: texturas.size, faltan: urls.filter(u => !texturas.has(u)) }
  },
  seek(t) { window.__esc.seek(t) },
  render() { window.__esc.render() },
  // Un solo llamado por frame: cruzar el puente entre Python y JS tres veces por frame es la mitad
  // del tiempo de render cuando son 400 frames.
  frame(t) {
    const e = window.__esc, s = e.spec
    e.frameCon(t, s.fps || 30, (s.obturador && s.obturador.angulo) || 180,
      (s.obturador && s.obturador.muestras) || 1)
  },

  // ---------------------------------------------------------------- codificar DENTRO del navegador
  // Medido: dibujar un frame cuesta 6 ms y sacarle un PNG por Playwright cuesta 530 ms. O sea que el
  // 99% del tiempo de render no era renderizar — era mover la imagen afuera. Con WebCodecs el frame
  // nunca sale del navegador: se codifica ahi mismo y al final viaja UN video de pocos MB.
  //
  // VP9 y no H.264: Chromium no trae encoder de H.264 (isConfigSupported dice false para avc1), pero
  // si trae libvpx. Los chunks salen en crudo y el driver los mete en un IVF, que ffmpeg lee sin
  // ambiguedad; despues transcodifica a H.264 para que el MP4 reproduzca donde tiene que reproducir.
  async grabarInicio(bitrate) {
    const e = window.__esc, s = e.spec
    if (!self.VideoEncoder) throw new Error('sin WebCodecs')
    this._chunks = []
    this._enc = new VideoEncoder({
      output: (chunk) => {
        const b = new Uint8Array(chunk.byteLength)
        chunk.copyTo(b)
        this._chunks.push({ b, t: chunk.timestamp, clave: chunk.type === 'key' })
      },
      error: (err) => { this._encErr = String(err) },
    })
    this._enc.configure({
      codec: 'vp09.00.10.08', width: s.W, height: s.H,
      bitrate: bitrate || 12e6, framerate: s.fps || 30,
      latencyMode: 'quality',
    })
    return true
  },
  async grabarFrame(i) {
    const e = window.__esc, s = e.spec
    const fps = s.fps || 30
    e.frameCon(i / fps, fps, (s.obturador && s.obturador.angulo) || 180,
      (s.obturador && s.obturador.muestras) || 1)
    const vf = new VideoFrame(document.getElementById('acc'), {
      timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps),
    })
    // una clave cada 2 s: sin keyframes intermedios el video no se puede scrubbear
    this._enc.encode(vf, { keyFrame: i % (fps * 2) === 0 })
    vf.close()
    // La cola del encoder crece mas rapido de lo que drena y se come la memoria del proceso en un
    // video largo. Se espera cuando se pasa de raya en vez de encolar sin limite.
    if (this._enc.encodeQueueSize > 12) await this._enc.flush()
    return this._chunks.length
  },
  async grabarFin() {
    await this._enc.flush()
    this._enc.close()
    if (this._encErr) throw new Error(this._encErr)
    const total = this._chunks.reduce((n, c) => n + c.b.length, 0)
    return { n: this._chunks.length, bytes: total, err: this._encErr || null }
  },
  // Se entrega por tajadas: un solo string base64 de un video entero pasa de los limites del puente
  // con Python y falla sin decir por que.
  tajada(desde, cuantos) {
    const cs = this._chunks.slice(desde, desde + cuantos)
    let bin = ''
    const metas = []
    for (const c of cs) {
      metas.push({ n: c.b.length, t: c.t, k: c.clave })
      const CH = 8192
      for (let i = 0; i < c.b.length; i += CH) bin += String.fromCharCode.apply(null, c.b.subarray(i, i + CH))
    }
    return { metas, b64: btoa(bin) }
  },
}
