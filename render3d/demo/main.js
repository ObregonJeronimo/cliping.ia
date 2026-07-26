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
import { ESCENAS } from './escenas/index.js'

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

  _composer() {
    const rt = new THREE.WebGLRenderTarget(this.W, this.H, { type: THREE.HalfFloatType, colorSpace: THREE.SRGBColorSpace })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    // Umbral 0.62 con base negra: sólo florecen el acento y el blanco. Sobre negro el bloom es la
    // herramienta principal — es lo que hace que un color se lea como LUZ y no como pintura.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.W, this.H), 0.85, 0.62, 0.62)
    this.composer.addPass(this.bloom)
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
    const lista = this.spec.soloEscena
      ? ESCENAS.filter(m => m.meta.id === this.spec.soloEscena)
      : ESCENAS
    if (!lista.length) throw new Error('escena desconocida: ' + this.spec.soloEscena)
    for (const mod of lista) {
      const ctx = {
        THREE, gsap: g, look: LOOK, W: this.W, H: this.H,
        mundoW: this.mundoW, mundoH: this.mundoH,
        camera: this.camera, distBase: this.distBase, rnd: this.rnd,
        BEAT, b, fondo: this.fondo.material.uniforms, pelicula: this.pelicula.uniforms,
        bloom: this.bloom,
      }
      const r = await mod.build(ctx)
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
      this.escenas.push({ id: mod.meta.id, g: r.g, t0, t1: t0 + dur })
      beat += mod.meta.beats
    }
    this.dur = b(beat)

    // El grano y la grilla del fondo avanzan con el tiempo del video, atados a la maestra.
    this.tl.to(this.pelicula.uniforms.uT, { value: this.dur, duration: this.dur, ease: 'none' }, 0)
    this.tl.to(this.fondo.material.uniforms.uT, { value: this.dur, duration: this.dur, ease: 'none' }, 0)

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
    for (const e of this.escenas) e.g.visible = tt >= e.t0 - 0.02 && tt <= e.t1 + 0.02
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
      configurar(aire)
      spec.__aire = aire
    }
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
    const info = await a.construir()
    window.__esc = a
    spec.dur = a.dur
    return { capas: info.escenas.length, texturas: 0, faltan: [], escenas: info.escenas, dur: a.dur }
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
