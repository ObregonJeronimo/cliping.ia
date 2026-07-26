// ANTHEM · kit — el vocabulario compartido de la pieza de referencia.
//
// QUE ES ESTA PIEZA
// Un reel de motion graphics hecho A MANO, con el vocabulario que se usa hoy, para tener un OBJETIVO
// MEDIBLE en vez de una opinión. El motor generativo (src/director + render3d) produce piezas limpias
// y correctas — y aburridas. Esto existe para poner sobre la mesa qué hay que alcanzar: se mide con
// las mismas métricas que el video generado y la diferencia deja de ser "no me gusta" y pasa a ser un
// número.
//
// LAS SIETE COSAS QUE HACEN QUE UNA PIEZA SE LEA COMO AFTER EFFECTS
//   1. RITMO. Los cortes caen sobre una grilla de beats, no cada "2.3 segundos". 120 BPM = 0.5 s.
//   2. NADA DESCANSA. Siempre hay algo moviéndose; el reposo total lee como una diapositiva.
//   3. OVERSHOOT. Lo que llega se pasa y vuelve. Una interpolación que sólo desacelera se lee a máquina.
//   4. STAGGER. Los elementos nunca llegan juntos: 40–80 ms de diferencia y el ojo lee intención.
//   5. REVELADO POR MÁSCARA, no por opacidad. Un fundido es la transición por defecto de quien no eligió.
//   6. EL CUADRO ESTÁ LLENO. Fondo con textura + medio + tipografía a varias escalas.
//   7. TRATAMIENTO. Bloom sobre el acento, grano, aberración, viñeta y desenfoque de movimiento.

import * as THREE from 'three'

// ---------------------------------------------------------------- ritmo
// Todo el tiempo de la pieza se expresa en BEATS y se convierte acá. Es la diferencia entre un video
// que "va" y uno que arrastra: los cortes caen donde el ojo ya los espera.
// Todo lo que define la PERSONALIDAD de la pieza vive en un AIRE y entra por `configurar()`. Se
// exporta con `let` a proposito: los modulos ES exportan BINDINGS VIVOS, asi que reasignar aca cambia
// el valor que ven las seis escenas sin que ninguna tenga que enterarse. Eso es lo que permite que un
// asador, un estudio juridico y una marca de zapatillas usen las MISMAS escenas y salgan tres piezas
// que no se parecen en nada.
export let BPM = 124
export let BEAT = 60 / BPM
export const b = n => n * BEAT                     // lee el BEAT vigente, no una copia

// ---------------------------------------------------------------- paleta
// Base oscura + UN acento saturado + blanco. Es la fórmula del 90% de los reels de marca que
// funcionan: el negro deja respirar al bloom y el acento no compite con nada.
const _cacheTexto = new Map()

export let LOOK = {
  tinta: '#f2f4f8',
  bg: '#05060a',
  bg2: '#0b1020',
  acento: '#5b6cff',
  acento2: '#00e5c0',
  calido: '#ff5a3c',
}

// ---------------------------------------------------------------- GESTO
// La familia de curvas. Es la mitad de la personalidad de una pieza y casi nadie la mira: el MISMO
// movimiento con `back.out` se lee decidido, con `elastic.out` juguetón, con `power4.out` costoso y
// con `steps` artesanal. Las escenas piden un GESTO ("llega", "sale", "frena") y el aire decide con
// que curva se resuelve, asi que cambiar de aire cambia como se mueve todo sin tocar una escena.
//
// El aire por defecto devuelve exactamente las curvas con las que se compuso ANTHEM: cambiar de
// familia tiene que ser una decision, no un efecto secundario de haber refactorizado.
const GESTO_BASE = {
  llega: (n = 2.2) => `back.out(${n})`,             // entra y se pasa: lo que hace que algo "llegue"
  frena: (n = 2) => (n >= 5 ? 'expo.out' : `power${n}.out`),
  acelera: (n = 2) => `power${n}.in`,
  vaiven: (n = 0) => (n ? `power${n}.inOut` : 'sine.inOut'),
}
export let E = GESTO_BASE

export let AIRE = null

// configurar(aire) — se llama UNA vez antes de construir la pieza. Todo lo que no venga en el aire
// se queda con el valor de ANTHEM.
export function configurar(aire) {
  if (!aire) return
  AIRE = aire
  if (aire.bpm) { BPM = aire.bpm; BEAT = 60 / BPM }
  if (aire.paleta) LOOK = { ...LOOK, ...aire.paleta }
  if (aire.gesto) E = { ...GESTO_BASE, ...aire.gesto }
  _cacheTexto.clear()                                // el cache guarda color y fuente: hay que soltarlo
}

// Las escenas piden fuentes por nombre concreto ('Anton', 'DMSans'). El aire las REMAPEA por rol:
// asi una escena escrita con una grotesca de display sale en serif editorial o en condensada
// deportiva sin que la escena sepa que existe el concepto de aire.
const ROL_DISPLAY = new Set(['Anton', 'ArchivoBlack', 'BigShoulders', 'Bricolage'])
function resolverFuente(f) {
  const fu = AIRE && AIRE.fuentes
  if (!fu) return f
  if (ROL_DISPLAY.has(f)) return fu.display || f
  return fu.apoyo || f
}

export const hex = h => new THREE.Color(h)

// ---------------------------------------------------------------- azar con semilla
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------- tipografía a textura
// El texto se dibuja en un canvas 2D y entra como textura. En una pieza así la tipografía es el
// material principal, no un subtítulo: se supermuestrea x3 porque la cámara la acerca y un glifo
// pixelado delata todo el truco.
export function texto(str, opciones = {}) {
  const o = {
    fuente: 'Anton', peso: 400, size: 200, color: LOOK.tinta, tracking: 0,
    upper: true, linea: 0.92, alineado: 'center', ...opciones,
  }
  o.fuente = resolverFuente(o.fuente)
  const clave = JSON.stringify([str, o])
  if (_cacheTexto.has(clave)) return _cacheTexto.get(clave)

  const SS = 3
  const lineas = String(str).split('\n').map(l => (o.upper ? l.toUpperCase() : l))
  const med = document.createElement('canvas').getContext('2d')
  med.font = `${o.peso} ${o.size * SS}px "${o.fuente}"`
  med.letterSpacing = `${o.tracking * o.size * SS}px`
  const anchos = lineas.map(l => med.measureText(l).width)
  const w = Math.ceil(Math.max(...anchos)) + o.size * SS * 0.3
  const h = Math.ceil(o.size * SS * o.linea * lineas.length + o.size * SS * 0.42)

  const cv = document.createElement('canvas')
  cv.width = Math.max(2, w); cv.height = Math.max(2, h)
  const c = cv.getContext('2d')
  c.font = med.font
  c.letterSpacing = med.letterSpacing
  c.textBaseline = 'middle'
  c.fillStyle = o.color
  const y0 = h / 2 - (lineas.length - 1) * o.size * SS * o.linea / 2
  for (let i = 0; i < lineas.length; i++) {
    const x = o.alineado === 'left' ? o.size * SS * 0.15
      : o.alineado === 'right' ? w - anchos[i] - o.size * SS * 0.15
        : (w - anchos[i]) / 2
    c.fillText(lineas[i], x, y0 + i * o.size * SS * o.linea)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  const r = { tex, ar: cv.width / cv.height, w: cv.width, h: cv.height }
  _cacheTexto.set(clave, r)
  return r
}

// Un plano con esa textura, dimensionado por ALTO en unidades de mundo (el alto es lo que uno
// controla al componer tipografía; el ancho sale de la proporción).
export function planoTexto(str, altoMundo, opciones = {}) {
  const t = texto(str, opciones)
  const mat = new THREE.MeshBasicMaterial({
    map: t.tex, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(altoMundo * t.ar, altoMundo), mat)
  m.userData.ar = t.ar
  return m
}

// ---------------------------------------------------------------- revelado por MÁSCARA
// Una barra que descubre en vez de un fundido. El shader recorta por UV, así que el texto aparece
// "escrito" y no "encendido" — y esa es la diferencia entre un reel y una presentación.
export function materialMascara(map, color = null) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      map: { value: map }, uProg: { value: 0 }, uDir: { value: 0 },
      // uTinte SIEMPRE es un Color, nunca null: three sube los uniforms sin preguntar y un vec3 en
      // null revienta el shader con un error que no menciona el uniform. Cuando no hay tinte se
      // manda negro y `uUsaTinte` en 0 lo ignora.
      uSuave: { value: 0.06 }, uTinte: { value: hex(color || '#000000') }, uUsaTinte: { value: color ? 1 : 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D map; uniform float uProg, uDir, uSuave, uUsaTinte; uniform vec3 uTinte;
      varying vec2 vUv;
      void main(){
        vec4 t = texture2D(map, vUv);
        // uDir: 0 izq->der, 1 der->izq, 2 abajo->arriba, 3 arriba->abajo
        float e = uDir < 0.5 ? vUv.x : uDir < 1.5 ? 1.0 - vUv.x : uDir < 2.5 ? vUv.y : 1.0 - vUv.y;
        float m = smoothstep(uProg, uProg - uSuave, e);
        if (uUsaTinte > 0.5) t.rgb = uTinte;
        gl_FragColor = vec4(t.rgb, t.a * m);
        if (gl_FragColor.a < 0.003) discard;
      }`,
  })
}

// ---------------------------------------------------------------- fondo vivo
// Grilla en perspectiva + ruido + degradé. Existe para que el cuadro NUNCA esté vacío: un fondo plano
// convierte cualquier pieza en una diapositiva, por buena que sea la tipografía de adelante.
export function fondoVivo(mundoW, mundoH) {
  const mat = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uT: { value: 0 }, uA: { value: hex(LOOK.bg) }, uB: { value: hex(LOOK.bg2) },
      uAcento: { value: hex(LOOK.acento) }, uGrilla: { value: 0.55 }, uPulso: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform float uT, uGrilla, uPulso; uniform vec3 uA, uB, uAcento;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        vec3 col = mix(uA, uB, smoothstep(0.95, 0.05, distance(uv, vec2(0.5, 0.58))));
        // GRILLA EN FUGA: las líneas se juntan hacia el horizonte y se desplazan con el tiempo. Da
        // sensación de espacio sin costar geometría.
        vec2 g = uv - vec2(0.5, 0.52);
        float persp = 1.0 / max(0.06, abs(g.y) * 2.4);
        float lx = abs(fract(g.x * persp * 5.0 + 0.5) - 0.5);
        float ly = abs(fract(g.y * 9.0 - uT * 0.18 + 0.5) - 0.5);
        float linea = smoothstep(0.055, 0.0, lx) + smoothstep(0.05, 0.0, ly);
        linea *= smoothstep(0.62, 0.06, abs(g.y)) * uGrilla;
        col += uAcento * linea * 0.16;
        // PULSO: un halo que late con el beat. Se maneja desde la timeline, no con un reloj propio.
        col += uAcento * uPulso * 0.5 * smoothstep(0.75, 0.0, distance(uv, vec2(0.5, 0.5)));
        // grano fino, para que el degradé no muestre bandas
        col += (hash(uv * 1400.0 + uT * 13.0) - 0.5) * 0.016;
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 2.6, mundoH * 2.6), mat)
  m.position.z = -14
  m.renderOrder = -100
  return m
}

// ---------------------------------------------------------------- materiales de uso frecuente
// OJO CON LA INTENSIDAD. LOOK.acento (#5b6cff) ya tiene el canal azul en 1.0: multiplicarlo por 2.4
// lo lleva a (0.85, 1.06, 2.4), se satura y sale BLANCO. Con el default viejo el anillo, la pildora y
// la tipografia salian todos blanco-lavanda y el titulo era un ladrillo ilegible. Un color que ya
// tiene un canal al tope no se "enciende" multiplicandolo — se enciende con el BLOOM, que es lo que
// convierte un color en luz. 1.15 deja margen para que el bloom haga su trabajo sin reventar el tono.
export const matAcento = (color = LOOK.acento, intensidad = 1.15) => new THREE.MeshBasicMaterial({
  color: hex(color).multiplyScalar(intensidad), toneMapped: false,
})
export const matTarjeta = (color = '#101528') => new THREE.MeshPhysicalMaterial({
  color: hex(color), roughness: 0.42, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.25,
})

// ---------------------------------------------------------------- helpers de composición
// Un filete de acento: el elemento más barato que existe para dar dirección y ritmo a un cuadro.
export function filete(largo, grosor = 0.05, color = LOOK.acento) {
  return new THREE.Mesh(new THREE.PlaneGeometry(largo, grosor), matAcento(color, 1.45))
}

// Reparte n elementos en un arco mirando a la cámara: es la disposición que hace que un grupo de
// tarjetas se lea como una sola pieza y no como una lista.
export function enArco(objs, radio, aperturaRad) {
  const n = objs.length
  objs.forEach((o, i) => {
    const t = n === 1 ? 0 : (i / (n - 1) - 0.5)
    const a = t * aperturaRad
    o.position.x = Math.sin(a) * radio
    o.position.z = -radio + Math.cos(a) * radio
    o.rotation.y = -a
  })
}
