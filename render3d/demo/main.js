// ANTHEM · secuenciador — arma la pieza de referencia y la maneja frame a frame desde afuera.
//
// Mismo contrato `window.URVID` que render3d/escena.js, así que backend/render3d.py la graba sin
// cambiar una línea: init(spec) -> grabarInicio -> grabarFrame(i) -> grabarFin.
//
// CÓMO SE ORDENA UNA PIEZA
// Cada escena es un módulo independiente que devuelve un grupo 3D y una timeline EN PAUSA de duración
// conocida. El secuenciador las cuelga de una timeline maestra en su beat de entrada y prende/apaga
// los grupos por ventana. Así una escena se puede reescribir entera sin tocar a las demás — y sobre
// todo, se puede MIRAR sola mientras se la afina.

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { BEAT, b, LOOK, hex, mulberry32, fondoVivo, configurar } from './kit.js'
import { configurarDatos } from './datos.js'
import { personalizar } from './adn.js'
import { ESCENAS } from './escenas/index.js'
import { guionDe, ajusteDe } from './guion.js'

// ---------------------------------------------------------------- pase final de película
// Grano + viñeta + aberración + un leve halo. El tiempo ENTRA como uniform: un pase con reloj propio
// da dos granos distintos para el mismo instante y rompe el determinismo.
const Pelicula = {
  uniforms: {
    tDiffuse: { value: null }, uT: { value: 0 }, uGrano: { value: 0.055 },
    uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 }, uFlash: { value: 0 },
    uRes: { value: new THREE.Vector2(1080, 1920) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uT, uGrano, uVinieta, uAberr, uFlash;
    uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r2 = dot(c,c);
      vec2 des = c * uAberr * r2 * 4.0;
      vec4 col;
      col.r = texture2D(tDiffuse, vUv + des).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - des).b;
      col.a = 1.0;
      col.rgb *= mix(1.0, smoothstep(0.95, 0.10, r2), uVinieta);
      col.rgb += (hash(vUv * uRes + vec2(uT*71.3, uT*37.7)) - 0.5) * uGrano;
      // FLASH: dos o tres frames de blanco sobre el corte. Es lo que hace que un corte seco se lea
      // como decisión de montaje en vez de como un salto.
      col.rgb = mix(col.rgb, vec3(1.0), uFlash);
      gl_FragColor = col;
    }`,
}

const MUNDO_H = 10

export class Anthem {
  constructor(spec, canvas) {
    this.spec = spec
    this.W = spec.W || 1080
    this.H = spec.H || 1920
    this.rnd = mulberry32((spec.seed || 7) >>> 0)
    this.mundoH = MUNDO_H
    this.mundoW = MUNDO_H * (this.W / this.H)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(this.W, this.H, false)
    this.renderer.toneMapping = THREE.NoToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = hex(LOOK.bg)
    this.fov = 30
    this.camera = new THREE.PerspectiveCamera(this.fov, this.W / this.H, 0.1, 400)
    this.distBase = (this.mundoH / 2) / Math.tan((this.fov * Math.PI / 180) / 2)
    this.camera.position.set(0, 0, this.distBase)

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5))
    const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(-4, 7, 9)
    this.scene.add(key)
    const rim = new THREE.PointLight(hex(LOOK.acento), 60, 40); rim.position.set(4, -3, 4)
    this.scene.add(rim)
    this.rim = rim
    this.scene.environment = this._estudio()

    this.fondo = fondoVivo(this.mundoW, this.mundoH)
    this.scene.add(this.fondo)

    this._composer()
    // EL TRATAMIENTO ES DEL AIRE, no del arnes. Un bloom calibrado sobre un acento azul revienta
    // sobre un amarillo fluor: el amarillo ya entra al pase con dos canales cerca de 1.0, asi que
    // con el mismo umbral florece TODO el glifo y el texto sale como una mancha blanca ilegible.
    // Cada aire trae su propia exposicion porque cada paleta pega distinto contra el mismo pase.
    const pel = (spec.__aire && spec.__aire.pelicula) || {}
    if (pel.bloom != null) this.bloom.strength = pel.bloom
    if (pel.umbral != null) this.bloom.threshold = pel.umbral
    if (pel.radio != null) this.bloom.radius = pel.radio
    const u = this.pelicula.uniforms
    if (pel.grano != null) u.uGrano.value = pel.grano
    if (pel.vinieta != null) u.uVinieta.value = pel.vinieta
    if (pel.aberr != null) u.uAberr.value = pel.aberr
    // La energia de camara tambien: una marca de lujo con la camara del aire deportivo se lee como
    // una plantilla mal elegida, por mas que la paleta sea correcta.
    this.camaraE = (spec.__aire && spec.__aire.camara) || { dolly: 1, orbita: 1 }
    this.tl = window.gsap.timeline({ paused: true })
    this.escenas = []
  }

  // ESTUDIO: el entorno que reflejan los metales.
  //
  // UN METAL NO TIENE COLOR DIFUSO. Con `metalness: 1` el material no responde a las luces
  // direccionales salvo por el punto especular: todo lo que se ve de un metal es el ENTORNO
  // reflejado. Sin `scene.environment`, el entorno es negro y el metal sale negro — que es
  // exactamente lo que pasaba: el chasis de titanio del telefono y el aluminio de la notebook
  // llegaban al video como dos siluetas oscuras, con tres luces encendidas en la escena. Cero
  // errores; el material estaba haciendo justo lo que dice la fisica.
  //
  // Se construye un entorno propio y no se usa RoomEnvironment porque un cuarto de muebles grises
  // deja el metal gris. Este es un degrade de los colores de LA MARCA con dos softboxes: el metal
  // refleja el acento de quien paga el video, que es la unica razon por la que hay un metal ahi.
  _estudio() {
    const est = new THREE.Scene()
    const cielo = new THREE.Mesh(
      new THREE.SphereGeometry(60, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        // EL ACENTO VA DESATURADO A LA MITAD. A saturacion plena el reflejo pinta el metal entero del
        // color de la marca y el titanio sale violeta plastico: un metal se reconoce porque refleja
        // un ENTORNO, no porque este teñido. Con la mezcla al 50% contra un gris de la misma
        // luminancia queda gris con el color de la marca corriendole por los cantos, que es lo que
        // hace un producto fotografiado en un set con geles de color.
        uniforms: {
          uA: { value: hex(LOOK.bg2) },
          uB: { value: hex(LOOK.acento).lerp(new THREE.Color(0.55, 0.57, 0.62), 0.5) },
          uC: { value: hex(LOOK.tinta) },
        },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: `uniform vec3 uA, uB, uC; varying vec3 vP;
          void main(){
            float y = vP.y * 0.5 + 0.5;
            vec3 c = mix(uA * 0.6, uB * 0.85, smoothstep(0.15, 0.62, y));
            c = mix(c, uC * 1.5, smoothstep(0.72, 1.0, y));   // el cenit, que es lo que da el filo
            gl_FragColor = vec4(c, 1.0);
          }`,
      }))
    est.add(cielo)
    // Dos softboxes. Sin ellas el reflejo es un degrade parejo y el metal se lee como plastico: lo
    // que dice "metal" es un borde DURO entre claro y oscuro corriendose sobre la superficie.
    const caja = (x, y, z, s, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s),
        new THREE.MeshBasicMaterial({ color: hex(LOOK.tinta).multiplyScalar(k) }))
      m.position.set(x, y, z); m.lookAt(0, 0, 0); est.add(m)
    }
    caja(-14, 16, 12, 22, 3.2)
    caja(12, -6, 14, 14, 1.1)
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const tex = pmrem.fromScene(est, 0.04).texture
    pmrem.dispose()
    cielo.geometry.dispose(); cielo.material.dispose()
    return tex
  }

  _composer() {
    const rt = new THREE.WebGLRenderTarget(this.W, this.H, { type: THREE.HalfFloatType, colorSpace: THREE.SRGBColorSpace })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    // Umbral 0.62 con base negra: sólo florecen el acento y el blanco. Sobre negro el bloom es la
    // herramienta principal — es lo que hace que un color se lea como LUZ y no como pintura.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.W, this.H), 0.85, 0.62, 0.62)
    this.composer.addPass(this.bloom)

    // ---- LOS RECORTES REALES VAN DESPUES DEL BLOOM, en una escena aparte.
    // Un recorte de una pagina es mayormente BLANCO: medido sobre los 52 recortes de los fixtures, el
    // 50.7% de sus pixeles opacos esta por encima del umbral de bloom, y hay tarjetas con el 99%.
    // Pasados por el pase, el logo y la tarjeta de la marca salen como UNA MANCHA que se come medio
    // cuadro. No es un caso raro: la web es blanca y el look de la pieza esta calibrado para geometria
    // oscura que brilla sobre negro.
    //
    // La solucion no es bajarles el brillo —eso cambia la marca— sino COMPONERLOS DESPUES: un segundo
    // RenderPass con clear apagado, colocado entre el bloom y el pase de pelicula. Asi los recortes no
    // florecen pero SI reciben grano, viñeta y aberracion, que es exactamente lo que los integra con
    // el resto de la pieza en vez de dejarlos pegados como una calcomania.
    this.escenaReal = new THREE.Scene()
    const paseReal = new RenderPass(this.escenaReal, this.camera)
    paseReal.clear = false
    paseReal.clearDepth = true
    this.composer.addPass(paseReal)

    this.pelicula = new ShaderPass(Pelicula)
    this.pelicula.uniforms.uRes.value.set(this.W, this.H)
    this.composer.addPass(this.pelicula)
    this.composer.addPass(new OutputPass())
  }

  async construir() {
    const g = window.gsap
    let beat = 0
    // `soloEscena` arma UNA sola escena y nada mas. Es lo que permite afinar una escena mirandola
    // sola, sin renderizar los 17 segundos enteros cada vez que se cambia un easing.
    // EL GUION DECIDE LA LISTA. Antes era la constante ESCENAS: las mismas seis, siempre, en el mismo
    // orden, 17.42 s fijos. Ahora el material que la pagina dio decide que se puede contar, la semilla
    // decide en que orden, y el objetivo en segundos decide cuanto entra. Ver render3d/demo/guion.js.
    const catalogo = new Map(ESCENAS.map(m => [m.meta.id, m.meta]))
    const porIdEsc = new Map(ESCENAS.map(m => [m.meta.id, m]))
    let lista
    if (this.spec.soloEscena) {
      lista = ESCENAS.filter(m => m.meta.id === this.spec.soloEscena)
      if (!lista.length) throw new Error('escena desconocida: ' + this.spec.soloEscena)
    } else {
      const plan = this.spec.guion || guionDe({
        escenas: catalogo,
        datos: this.spec.datos,
        seed: this.spec.seed || 7,
        beatSeg: BEAT,
        dur: this.spec.durObjetivo || null,
      })
      lista = plan.map(id => porIdEsc.get(id)).filter(Boolean)
      this.guionUsado = plan
      // Ver ajusteDe(): corre el tempo de la pieza entera hasta un 12% para clavar la duracion pedida.
      this.ajuste = ajusteDe(plan, catalogo, BEAT, this.spec.durObjetivo || null)
    }
    if (!lista.length) throw new Error('el guion quedo vacio')
    // Cuantas veces se construyo ya cada id. Una pieza de 30 s lleva tres escenas de hero, y sin este
    // numero las tres eligen el mismo objeto: el mismo telefono tres veces con otro corte en el medio,
    // que es peor que no repetir. Con el, cada una toma el siguiente hero elegible.
    const repeticiones = new Map()
    for (const mod of lista) {
      const ctx = {
        THREE, gsap: g, look: LOOK, W: this.W, H: this.H,
        mundoW: this.mundoW, mundoH: this.mundoH,
        camera: this.camera, distBase: this.distBase, rnd: this.rnd,
        BEAT, b, fondo: this.fondo.material.uniforms, pelicula: this.pelicula.uniforms,
        bloom: this.bloom,
        // Donde van los RECORTES REALES de la pagina. Es una escena aparte que se compone despues del
        // bloom: una escena que quiera mostrar el logo o una tarjeta del sitio mete su grupo aca en
        // vez de en `g`, y el recorte no se quema. Ver la nota en _composer().
        real: this.escenaReal,
        // El spec entero y las texturas cargadas: los HEROES los necesitan (la tira scrolleable de la
        // pagina, el hero que pidio el usuario) y una escena comun simplemente los ignora.
        spec: this.spec,
        texturas: this.texturas,
        datosEls: (this.spec.datos && this.spec.datos.elementos) || [],
        repeticion: repeticiones.get(mod.meta.id) || 0,
      }
      repeticiones.set(mod.meta.id, (repeticiones.get(mod.meta.id) || 0) + 1)
      const r = await mod.build(ctx)
      if (r.heroUsado) {
        this.heroUsado = r.heroUsado
        // TODOS los heroes usados, no solo el ultimo. Una pieza de 30 s trae tres escenas de hero con
        // tres objetos distintos, y con un solo campo el informe decia que la pieza uso uno.
        ;(this.heroesUsados || (this.heroesUsados = [])).push(r.heroUsado)
      }
      const t0 = b(beat)
      const dur = b(mod.meta.beats)
      r.g.visible = false
      this.scene.add(r.g)
      this.tl.add(r.tl, t0)
      // DESPAUSAR LA HIJA. El contrato le pide a cada escena que devuelva su timeline en pausa —
      // para que no empiece a correr sola mientras se construye la pieza. Pero en GSAP 3 una hija
      // pausada tiene _ts = 0 y el padre LA SALTEA al renderizar: la escena queda clavada en su
      // frame 0 y el cuadro sale vacio, sin ningun error. Es el defecto mas caro de este arnes
      // porque no falla, simplemente no se ve nada y parece un problema de la escena.
      r.tl.paused(false)
      // Una escena puede devolver `gr`: su grupo de recortes reales, que vive en la escena post-bloom.
      if (r.gr) { r.gr.visible = false; this.escenaReal.add(r.gr) }
      this.escenas.push({ id: mod.meta.id, g: r.g, gr: r.gr || null, t0, t1: t0 + dur })
      beat += mod.meta.beats
    }
    // AJUSTE DE TEMPO. La maestra corre hasta un 12% mas rapido o mas lento para clavar la duracion
    // pedida; `dur` es lo que dura el ARCHIVO, que es lo unico que ve el que lo publica. Va aca y no
    // en las escenas: escalando la maestra, TODO escala junto y la grilla de beats sigue coherente.
    // Ver ajusteDe() en guion.js.
    const esc = (this.ajuste && this.ajuste.escala) || 1
    this.tl.timeScale(esc)
    this.dur = b(beat) / esc
    // Los relojes del grano y de la grilla se declaran en el tiempo PROPIO de la maestra (sin escalar),
    // porque van colgados de ella y se escalan con todo lo demas. Usar this.dur aca los dejaria
    // corriendo a otra velocidad que la pieza, y el grano se leeria como un parpadeo.
    const durPropia = b(beat)

    // El grano y la grilla del fondo avanzan con el tiempo del video, atados a la maestra.
    this.tl.to(this.pelicula.uniforms.uT, { value: durPropia, duration: durPropia, ease: 'none' }, 0)
    this.tl.to(this.fondo.material.uniforms.uT, { value: durPropia, duration: durPropia, ease: 'none' }, 0)

    // FLASH EN CADA CORTE DE ESCENA, salvo el primero. Dos frames — más se lee como error, menos no
    // se ve. Va acá y no en cada escena para que ninguna se olvide y el ritmo quede parejo.
    const dosFrames = 2 / (this.spec.fps || 30)
    for (const e of this.escenas.slice(1)) {
      this.tl.set(this.pelicula.uniforms.uFlash, { value: 0.85 }, e.t0 - dosFrames * 0.5)
      this.tl.to(this.pelicula.uniforms.uFlash, { value: 0, duration: dosFrames, ease: 'power2.in' }, e.t0 - dosFrames * 0.5)
    }
    this.tl.pause(0)
    return { escenas: this.escenas.map(e => e.id), dur: this.dur }
  }

  seek(t) {
    const tt = Math.max(0, Math.min(this.dur, t))
    this.tl.time(tt, false)
    // Prender/apagar por ventana: una escena que sigue en la escena 3D consumiendo draw calls y
    // asomando un borde detrás de la siguiente es el defecto más difícil de encontrar mirando.
    for (const e of this.escenas) {
      const vivo = tt >= e.t0 - 0.02 && tt <= e.t1 + 0.02
      e.g.visible = vivo
      if (e.gr) e.gr.visible = vivo          // el grupo de recortes reales, en la escena post-bloom
    }
  }

  render() { this.composer.render() }

  // Desenfoque de movimiento por ángulo de obturador: varias muestras dentro del frame, promediadas.
  // Lo quieto queda nítido y lo que se mueve se arrastra según SU velocidad — que es lo que un blur
  // direccional no puede imitar, porque emborrona todo el cuadro por igual.
  frameCon(t, fps, angulo, muestras) {
    const acc = this.acc || (this.acc = document.getElementById('acc').getContext('2d'))
    if (muestras <= 1) {
      this.seek(t); this.render()
      acc.globalCompositeOperation = 'copy'; acc.globalAlpha = 1
      acc.drawImage(this.renderer.domElement, 0, 0)
      return
    }
    const vent = (angulo / 360) / fps
    acc.globalCompositeOperation = 'copy'; acc.globalAlpha = 1
    acc.fillStyle = '#000'; acc.fillRect(0, 0, this.W, this.H)
    acc.globalCompositeOperation = 'lighter'
    for (let k = 0; k < muestras; k++) {
      this.seek(Math.max(0, t + ((k + 0.5) / muestras - 0.5) * vent))
      this.render()
      acc.globalAlpha = 1 / muestras
      acc.drawImage(this.renderer.domElement, 0, 0)
    }
    acc.globalCompositeOperation = 'source-over'; acc.globalAlpha = 1
  }
}

// ---------------------------------------------------------------- contrato con el driver
window.URVID = {
  async init(spec) {
    // Sin esperar a las fuentes, el primer texto se mide y se dibuja con la de sistema y queda así
    // para siempre en la textura cacheada — un fallo que sólo se ve al final, en el video.
    // EL AIRE ANTES QUE NADA: define paleta, tipografia, ritmo y familia de gestos, y todo lo que se
    // construye despues lo lee. Configurarlo tarde deja medio arbol armado con los valores del aire
    // anterior — un defecto que sale en forma de una escena con la tipografia equivocada.
    let aire = null
    if (spec.aire) {
      const mod = await import(`./aires/${spec.aire}.js`)
      aire = mod.default || mod.aire
      // EL ADN DE LA PAGINA PISA EL HUE Y LA POLARIDAD DEL AIRE. Sin este paso el motor medía la
      // identidad de cada marca y despues la tiraba: cinco de siete paginas reales medidas son
      // CLARAS y salian todas en azul marino. Ver render3d/demo/adn.js para el reparto exacto.
      if (spec.dna) aire = personalizar(aire, spec.dna, mulberry32((spec.seed || 1) * 7919))
      configurar(aire)
      spec.__aire = aire
    }
    // Los DATOS antes de construir, por la misma razon que el aire: las escenas miden la tipografia
    // al construirse y cachean la textura. Configurarlos tarde deja media pieza diciendo otra cosa.
    if (spec.datos) configurarDatos(spec.datos)
    await document.fonts.ready
    // Las tipografias del aire se cargan por FontFace y no por @font-face en el CSS: el CSS tendria
    // que declarar las 72 de antemano y ninguna pieza usa mas de dos. Se espera a que esten ANTES de
    // rasterizar: el canvas mide con la que haya en ese momento, y como la textura queda cacheada,
    // una fuente que llega tarde no se ve mal — se ve con OTRA tipografia, para siempre.
    for (const nombre of Object.values((aire && aire.fuentes) || {})) {
      if (document.fonts.check(`400 100px "${nombre}"`)) continue
      try {
        const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
        await ff.load()
        document.fonts.add(ff)
      } catch (e) { console.error('fuente ' + nombre + ': ' + e.message) }
    }
    await Promise.all(['Anton', 'ArchivoBlack', 'BigShoulders', 'Bricolage', 'DMSans',
      ...Object.values((aire && aire.fuentes) || {})]
      .map(f => document.fonts.load(`400 200px "${f}"`).catch(() => {})))
    const canvas = document.getElementById('c')
    canvas.width = spec.W; canvas.height = spec.H
    const acc = document.getElementById('acc')
    acc.width = spec.W; acc.height = spec.H
    const a = new Anthem(spec, canvas)
    // TEXTURAS ANTES DE CONSTRUIR. El TextureLoader es asincronico: una escena que construye sin
    // esperar arma su plano con una textura vacia y sale negro, sin ningun error.
    a.texturas = new Map()
    const pedidos = []
    if (spec.tira) pedidos.push(['tira', spec.tira])
    for (const e of ((spec.datos && spec.datos.elementos) || [])) pedidos.push([e.url, e.url])
    if (pedidos.length) {
      const cargador = new THREE.TextureLoader()
      await Promise.all(pedidos.map(([clave, url]) => new Promise(res => {
        cargador.load(url, t => { a.texturas.set(clave, t); res() }, undefined, () => res())
      })))
    }
    const info = await a.construir()
    window.__esc = a
    spec.dur = a.dur
    // EL PLAN VIAJA DE VUELTA. Sin esto, para medir la pieza por escena habia que reconstruir a mano
    // que escenas eligio el guion y con que bpm — o sea correr el guionista dos veces, una en el
    // render y otra en el analisis, y confiar en que dieron lo mismo. La primera vez que no dieran lo
    // mismo, la tabla de metricas asignaria cada numero a la escena equivocada y nadie se enteraria.
    // Lo escribe quien lo sabe: el secuenciador.
    return {
      capas: info.escenas.length, texturas: 0, faltan: [], escenas: info.escenas, dur: a.dur,
      plan: (a.guionUsado || info.escenas.map(e => e.id)),
      beats: (a.guionUsado || []).map(id => {
        const m = ESCENAS.find(x => x.meta.id === id)
        return m ? m.meta.beats : 0
      }),
      bpm: Math.round(60 / BEAT),
      heroes: a.heroesUsados || [],
    }
  },
  duracion() { return window.__esc.dur },
  frame(t) {
    const e = window.__esc, s = e.spec
    e.frameCon(t, s.fps || 30, (s.obturador && s.obturador.angulo) || 190,
      (s.obturador && s.obturador.muestras) || 4)
  },
  async grabarInicio(bitrate) {
    const e = window.__esc, s = e.spec
    if (!self.VideoEncoder) throw new Error('sin WebCodecs')
    this._chunks = []
    this._enc = new VideoEncoder({
      output: (ch) => { const bts = new Uint8Array(ch.byteLength); ch.copyTo(bts); this._chunks.push({ b: bts, t: ch.timestamp, clave: ch.type === 'key' }) },
      error: (err) => { this._encErr = String(err) },
    })
    this._enc.configure({ codec: 'vp09.00.10.08', width: s.W, height: s.H, bitrate: bitrate || 16e6, framerate: s.fps || 30, latencyMode: 'quality' })
    return true
  },
  async grabarFrame(i) {
    const e = window.__esc, s = e.spec, fps = s.fps || 30
    e.frameCon(i / fps, fps, (s.obturador && s.obturador.angulo) || 190, (s.obturador && s.obturador.muestras) || 4)
    const vf = new VideoFrame(document.getElementById('acc'), { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) })
    this._enc.encode(vf, { keyFrame: i % (fps * 2) === 0 })
    vf.close()
    if (this._enc.encodeQueueSize > 12) await this._enc.flush()
    return this._chunks.length
  },
  async grabarFin() {
    await this._enc.flush(); this._enc.close()
    if (this._encErr) throw new Error(this._encErr)
    return { n: this._chunks.length, bytes: this._chunks.reduce((n, c) => n + c.b.length, 0), err: null }
  },
  tajada(desde, cuantos) {
    const cs = this._chunks.slice(desde, desde + cuantos)
    let bin = ''; const metas = []
    for (const c of cs) {
      metas.push({ n: c.b.length, t: c.t, k: c.clave })
      for (let i = 0; i < c.b.length; i += 8192) bin += String.fromCharCode.apply(null, c.b.subarray(i, i + 8192))
    }
    return { metas, b64: btoa(bin) }
  },
}
