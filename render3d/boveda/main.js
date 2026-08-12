// BOVEDA — runtime. Toma una PLANTILLA del catalogo y la graba.
//
// Mismo contrato `window.URVID` que `render3d/demo/main.js` y que `render3d/escena.js`, asi que
// `backend/render3d.py` la graba sin cambiar una linea: init(spec) -> grabarInicio -> grabarFrame(i)
// -> grabarFin. Esa fue la razon de elegir este punto de enchufe y no inventar otro: el arnes de
// grabacion ya esta probado en produccion, y lo unico nuevo acá es QUE se dibuja.
//
// LO QUE ESTE ARCHIVO NO HACE, y es lo que lo diferencia del otro motor: no elige escenas, no arma un
// guion y no reparte beats. Todo eso vive DENTRO de cada plantilla, porque una plantilla es una pieza
// terminada y no una receta. Este archivo prepara el mundo (aire, datos, texturas, rig) y le pide a la
// plantilla que se construya.

import * as THREE from 'three'
import { Rig } from './nucleo.js'
import { PLANTILLAS, porId } from './index.js'
import { recetasDe } from './recetas.js'
import { configurar, BEAT, b } from '../demo/kit.js'
import { configurarDatos, reiniciarReparto } from '../demo/datos.js'
import { personalizar } from '../demo/adn.js'
import { reiniciarRecortes } from '../demo/kit.js'

// El mismo PRNG que el resto del repo: determinista y sembrable, para que la misma semilla de siempre
// la misma pieza. Sin esto "otra version del mismo video" seria una loteria irreproducible.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

window.URVID = {
  async init(spec) {
    // EL AIRE ANTES QUE NADA. Define paleta, tipografia, ritmo y amplitud de camara, y todo lo que se
    // construye despues lo lee. Configurarlo tarde deja medio arbol armado con los valores del aire
    // anterior — un defecto que sale en forma de una pieza con la tipografia equivocada.
    let aire = null
    if (spec.aire) {
      const mod = await import('../demo/aires/' + spec.aire + '.js')
      aire = mod.default || mod.aire
      // EL ADN DE LA PAGINA PISA EL HUE Y LA POLARIDAD DEL AIRE. Sin esto el motor mide la identidad
      // de cada marca y despues la tira: cinco de siete paginas reales son CLARAS y saldrian todas en
      // azul marino. Y ademas `paletaDe` fuerza el contraste del acento contra los dos fondos, que es
      // lo que evita que un texto en acento quede a 1.5:1.
      if (spec.dna) aire = personalizar(aire, spec.dna, mulberry32((spec.seed || 1) * 7919))
      configurar(aire, spec.seed)
      spec.__aire = aire
    }
    if (spec.datos) configurarDatos(spec.datos)
    reiniciarReparto()
    reiniciarRecortes()

    // LAS FUENTES ANTES DE RASTERIZAR. El canvas mide con la que haya en ese momento y la textura queda
    // cacheada: una cara que llega tarde no se ve mal, se ve con OTRA tipografia, para siempre, y recien
    // en el video terminado.
    await document.fonts.ready
    const caras = ['Anton', 'ArchivoBlack', 'BigShoulders', 'Bricolage', 'DMSans']
      .concat(Object.values((aire && aire.fuentes) || {}))
    for (const nombre of Object.values((aire && aire.fuentes) || {})) {
      if (document.fonts.check('400 100px "' + nombre + '"')) continue
      try {
        const ff = new FontFace(nombre, 'url(/fonts/' + nombre + '.ttf)')
        await ff.load(); document.fonts.add(ff)
      } catch (e) { console.error('fuente ' + nombre + ': ' + e.message) }
    }
    await Promise.all(caras.map(f => document.fonts.load('400 200px "' + f + '"').catch(() => {})))

    const canvas = document.getElementById('c')
    canvas.width = spec.W; canvas.height = spec.H
    const acc = document.getElementById('acc')
    acc.width = spec.W; acc.height = spec.H

    const rig = new Rig(spec, canvas)

    // LAS TEXTURAS ANTES DE CONSTRUIR. El TextureLoader es asincronico: una plantilla que construye sin
    // esperar arma su plano con una textura vacia y sale NEGRO, sin un solo error en consola.
    const texturas = new Map()
    const faltan = []
    const pedidos = []
    if (spec.tira) pedidos.push(['tira', spec.tira])
    for (const e of ((spec.datos && spec.datos.elementos) || [])) pedidos.push([e.url, e.url])
    if (pedidos.length) {
      const cargador = new THREE.TextureLoader()
      await Promise.all(pedidos.map(([clave, url]) => new Promise(res => {
        cargador.load(url, t => { texturas.set(clave, t); res() },
          undefined, () => { faltan.push(clave); res() })
      })))
    }

    // LA PLANTILLA. Se valida contra el catalogo y nunca se interpola cruda: lo que no esta en el
    // registro no llega a un `import()`.
    const id = String(spec.plantilla || (PLANTILLAS[0] && PLANTILLAS[0].meta.id) || '')
    const P = porId(id)
    if (!P) throw new Error('plantilla desconocida: ' + JSON.stringify(id) + '. Hay: ' + PLANTILLAS.map(p => p.meta.id).join(', '))

    let semilla = (spec.seed || 1) * 2654435761 % 4294967296
    const rnd = mulberry32(semilla)

    const ctx = {
      THREE, gsap, rig,
      escena: rig.scene,              // lo que pasa por bloom
      pagina: rig.escenaPagina,       // los recortes de la pagina, DESPUES del bloom
      camara: rig.camera,
      tl: rig.tl,
      W: spec.W, H: spec.H,
      mundoW: rig.mundoW, mundoH: rig.mundoH, distBase: rig.distBase,
      BEAT, b, rnd, spec,
      texturas,
      datosEls: (spec.datos && spec.datos.elementos) || [],
      bloom: rig.bloom,
      pelicula: rig.uPelicula,
      // EL RETRATO DE LA PAGINA — lo que `backend/retrato.py` midio sobre la tira, el DOM y los
      // recortes. Es lo que hace que dos sitios distintos no produzcan el mismo espacio.
      //
      // Va por `recetasDe()` y NO crudo: una plantilla que lea `retrato.recetas.velocidadCamara` a
      // pelo se rompe el dia que falte el retrato, y va a faltar — una captura vieja no lo tiene, y la
      // sonda y la compuerta construyen sin el a proposito. `recetasDe` devuelve el mismo juego de
      // claves siempre, con valores NEUTROS cuando no hay medicion. Neutro no es inventado: es "no se
      // midio, compone como antes".
      retrato: spec.retrato || null,
      recetas: recetasDe(spec.retrato),
    }

    const r = (await P.build(ctx)) || {}
    // LA PLANTILLA MANDA EL LARGO. `meta.beats` es el contrato y la timeline tiene que durarlo: si la
    // plantilla devuelve menos, el video se corta antes de su propio cierre.
    rig.dur = r.dur || b(P.meta.beats)
    // Un gancho para lo que no se puede expresar como tween — orbitas continuas, ruido, `lookAt`.
    // Se llama en CADA submuestra del obturador, asi que el movimiento continuo tambien se barre.
    rig._alSeek = r.alSeek || null
    window.__boveda = { rig, plantilla: P, r }

    return {
      // `capas` y `bpm` los lee `backend/render3d.py` para su linea de informe y para el plan.json.
      // No son decorativos: sin `capas` el grabador tira KeyError antes de escribir un solo cuadro, y
      // sin `bpm` el plan queda sin la escala que relaciona beats con segundos.
      capas: 1,
      plantilla: P.meta.id,
      nombre: P.meta.nombre,
      dur: rig.dur,
      beats: P.meta.beats,
      bpm: Math.round(60 / BEAT),
      texturas: texturas.size,
      faltan,
      // Que datos uso de verdad. Es lo que permite decir "esta plantilla no mostro tus cifras porque
      // la pagina no dio ninguna" en vez de dejar un hueco mudo.
      uso: r.uso || {},
    }
  },

  duracion() { return window.__boveda.rig.dur },

  frame(t) {
    const { rig } = window.__boveda, s = rig.spec
    rig.frameCon(t, s.fps || 30, (s.obturador && s.obturador.angulo) || 190,
      (s.obturador && s.obturador.muestras) || 4)
  },

  async grabarInicio(bitrate) {
    const { rig } = window.__boveda, s = rig.spec
    if (!self.VideoEncoder) throw new Error('sin WebCodecs')
    this._chunks = []
    this._encErr = null
    this._enc = new VideoEncoder({
      output: (ch) => {
        const bts = new Uint8Array(ch.byteLength); ch.copyTo(bts)
        this._chunks.push({ b: bts, t: ch.timestamp, clave: ch.type === 'key' })
      },
      error: (err) => { this._encErr = String(err) },
    })
    // H.264 DIRECTO. Chromium codifica High (avc1.640033 / .640028) aunque rechace el Baseline, y eso
    // evita la segunda codificacion con perdida que costaba 112 MB en una pieza de 30 s. `annexb`
    // porque el flujo se guarda crudo y se REMUXEA con `-c copy`: lleva los SPS/PPS en cada keyframe.
    this._codec = 'vp09.00.10.08'
    for (const c of ['avc1.640033', 'avc1.640028']) {
      try {
        const sop = await VideoEncoder.isConfigSupported({
          codec: c, width: s.W, height: s.H, bitrate: bitrate || 12e6,
          framerate: s.fps || 30, avc: { format: 'annexb' },
        })
        if (sop && sop.supported) { this._codec = c; break }
      } catch (e) { /* el navegador no lo conoce: se sigue probando */ }
    }
    const cfg = {
      codec: this._codec, width: s.W, height: s.H,
      bitrate: bitrate || 12e6, framerate: s.fps || 30, latencyMode: 'quality',
    }
    if (this._codec.startsWith('avc1')) cfg.avc = { format: 'annexb' }
    this._enc.configure(cfg)
    return { codec: this._codec }
  },

  async grabarFrame(i) {
    const { rig } = window.__boveda, s = rig.spec, fps = s.fps || 30
    rig.frameCon(i / fps, fps, (s.obturador && s.obturador.angulo) || 190,
      (s.obturador && s.obturador.muestras) || 4)
    const vf = new VideoFrame(document.getElementById('acc'),
      { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) })
    this._enc.encode(vf, { keyFrame: i % (fps * 2) === 0 })
    vf.close()
    if (this._enc.encodeQueueSize > 12) await this._enc.flush()
    return this._chunks.length
  },

  async grabarFin() {
    await this._enc.flush(); this._enc.close()
    if (this._encErr) throw new Error(this._encErr)
    return {
      n: this._chunks.length,
      bytes: this._chunks.reduce((n, c) => n + c.b.length, 0),
      codec: this._codec, err: null,
    }
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
