// NUCLEO DE BOVEDA — el rig de render y los materiales que comparten todas las plantillas.
//
// QUE ES BOVEDA Y EN QUE SE DIFERENCIA DEL MOTOR DE ESCENAS
//
// El motor de `render3d/demo` COMPONE: tiene veinte escenas y un guionista que elige cuales entran, en
// que orden y cuanto dura cada una. Dos videos de la misma pagina se parecen porque comparten el
// vocabulario y se diferencian en el sorteo.
//
// Boveda hace lo contrario. Cada PLANTILLA es una pieza entera escrita de punta a punta: su propio
// espacio 3D, su propio vuelo de camara, sus propios beats y su propia manera de acomodar los datos.
// No hay guionista y no hay escenas intercambiables. Elegis `atrio` y sale una pieza; elegis `deriva`
// y sale OTRA, con los mismos datos y sin un solo plano en comun.
//
// Es una decision de producto, no de arquitectura: el usuario no quiere "un video armado con piezas",
// quiere elegir entre videos terminados.
//
// LO QUE SI SE COMPARTE, Y POR QUE NO CONTRADICE LO ANTERIOR
// Se comparte lo que NO es composicion: el rasterizado de texto, las paletas, el forzado de contraste,
// la carga de recortes y este rig. Reescribir eso seria reescribir los errores que el otro motor ya
// pago —la doble conversion de color, la fuente que llega tarde, el recorte que no carga en silencio—
// y ninguno de esos aprendizajes es sobre composicion.

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { LOOK, hex, nivel, nivelTexto, texto, materialMascara, CLARO, b } from '../demo/kit.js'

export { THREE }

// ---------------------------------------------------------------- el pase de pelicula
// Grano, viñeta y una aberracion cromatica minima. Es lo que separa "un render de three.js" de "una
// pieza": sin esto los degradados salen en bandas y los cantos salen de vidrio digital.
const PELICULA = {
  uniforms: {
    tDiffuse: { value: null }, uT: { value: 0 }, uGrano: { value: 0.055 },
    uVinieta: { value: 0.92 }, uAberr: { value: 0.0022 }, uFlash: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform float uT, uGrano, uVinieta, uAberr, uFlash;',
    'varying vec2 vUv;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'void main(){',
    '  vec2 d = vUv - 0.5;',
    // La aberracion crece hacia los bordes: en el centro no existe, que es donde vive el texto.
    '  float r2 = dot(d, d);',
    '  vec2 off = d * uAberr * r2 * 4.0;',
    '  vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);',
    '  c += uFlash;',
    // Viñeta suave. `uVinieta` es cuanto QUEDA en la esquina, no cuanto se quita.
    '  float v = mix(1.0, smoothstep(0.95, 0.25, length(d) * 1.35), 1.0 - uVinieta);',
    '  c *= v;',
    '  c += (hash(vUv * 1400.0 + uT * 13.0) - 0.5) * uGrano;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}',
  ].join('\n'),
}

// ---------------------------------------------------------------- el rig
//
// SUPERMUESTREO x2 Y OBTURADOR POR ACUMULACION. Los dos existen por razones distintas y se notan en
// cosas distintas: el supermuestreo arregla el canto de una arista fina, el obturador arregla que un
// objeto rapido salga DUPLICADO en vez de barrido. Este motor mueve la camara todo el tiempo, asi que
// sin obturador cada pieza parece grabada con una camara de seguridad.
export class Rig {
  constructor(spec, canvas) {
    this.spec = spec
    this.W = spec.W; this.H = spec.H
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(this.W, this.H, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(spec.fov || 32, this.W / this.H, 0.1, 600)
    // `distBase` es la distancia a la que el mundo mide `mundoH` de alto. Todas las plantillas componen
    // en esas unidades, asi que una medida significa lo mismo en las doce.
    this.mundoH = 10
    this.mundoW = this.mundoH * (this.W / this.H)
    this.distBase = (this.mundoH / 2) / Math.tan(((spec.fov || 32) / 2) * Math.PI / 180)
    this.camera.position.set(0, 0, this.distBase)

    const SS = 2
    const rt = new THREE.WebGLRenderTarget(this.W * SS, this.H * SS,
      { type: THREE.HalfFloatType, colorSpace: THREE.SRGBColorSpace })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    // El bloom se arma con el tamaño de PANTALLA y no con el supermuestreado, a proposito: sus cinco
    // mips usan un nucleo fijo en pixeles, asi que pasarle el buffer grande cerraria el halo a la mitad
    // y recalibraria el tratamiento de luz de todas las plantillas de un plumazo.
    // EL BLOOM Y EL GRANO LOS PIDE EL AIRE, NO ESTA CLASE. Y esto costo las tres primeras piezas.
    //
    // Tenia 0.55 de fuerza con umbral 0.80 escritos aca. En un mundo OSCURO eso se ve bien; en uno
    // CLARO el fondo entero esta por encima del umbral, asi que florece TODO y la pieza sale como una
    // pantalla blanca con el panel de la pagina flotando. El sintoma era brutal y mudo a la vez: las
    // mallas de texto existian, estaban encendidas y dentro del cuadro —la sonda lo confirmo tres
    // veces— y no se veia una sola letra.
    //
    // Los once aires ya traen su calibracion y difieren en un orden de magnitud: `editorial` pide
    // bloom 0.14 con umbral 0.95, `nocturno` pide 1.15 con 0.58. Un solo numero no puede servirle a los
    // dos, y elegirlo aca era decidir por el aire desde el unico lugar que no sabe de que aire se trata.
    const pel = (spec.__aire && spec.__aire.pelicula) || {}
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.W, this.H),
      pel.bloom != null ? pel.bloom : 0.55,
      pel.radio != null ? pel.radio : 0.7,
      pel.umbral != null ? pel.umbral : 0.80)
    this.composer.addPass(this.bloom)

    // LOS RECORTES DE LA PAGINA VAN DESPUES DEL BLOOM, en una escena aparte. Un recorte de una web es
    // mayormente BLANCO: pasado por el bloom se convierte en una mancha que se come el cuadro. Puestos
    // aca no florecen, pero SI reciben grano y viñeta, que es lo que los integra en vez de dejarlos
    // pegados como una calcomania. El otro motor pago este mismo error y lo dejo escrito.
    this.escenaPagina = new THREE.Scene()
    const pasePagina = new RenderPass(this.escenaPagina, this.camera)
    pasePagina.clear = false
    this.composer.addPass(pasePagina)

    this.pelicula = new ShaderPass(PELICULA)
    this.composer.addPass(this.pelicula)
    this.uPelicula = this.pelicula.uniforms
    // El grano, la viñeta y la aberracion tambien son del aire, por la misma razon: son la mitad de lo
    // que hace que `editorial` se sienta papel y `nocturno` se sienta club.
    if (pel.grano != null) this.uPelicula.uGrano.value = pel.grano
    if (pel.vinieta != null) this.uPelicula.uVinieta.value = 1 - pel.vinieta
    if (pel.aberr != null) this.uPelicula.uAberr.value = pel.aberr

    // Y EL TONEMAP QUEDA EN NINGUNO, como en el motor de escenas. ACES comprime los altos, que es
    // correcto para una escena con luces fisicas y equivocado para una paleta ya elegida: apaga los
    // acentos y le saca al mundo claro justamente el blanco que lo define.
    this.renderer.toneMapping = THREE.NoToneMapping

    this.tl = gsap.timeline({ paused: true })
    this.dur = 0
    this._acc = null
    this._alSeek = null
  }

  // ---- el obturador, por acumulacion de submuestras
  //
  // 190 grados sobre 4 muestras. Con dos, las submuestras caen a 8.8 ms una de otra y lo que se mueve
  // rapido sale como DOS COPIAS en vez de un barrido: el ojo lee un error de render, no velocidad.
  frameCon(t, fps, angulo, muestras) {
    const acc = this._acc || (this._acc = document.getElementById('acc').getContext('2d'))
    const n = Math.max(1, muestras | 0)
    if (n === 1) {
      this.seek(t); this.render()
      acc.globalCompositeOperation = 'copy'; acc.globalAlpha = 1
      acc.drawImage(this.renderer.domElement, 0, 0, this.W, this.H)
      return
    }
    const ventana = (angulo / 360) / fps
    for (let i = 0; i < n; i++) {
      this.seek(t + (i / n) * ventana)
      this.render()
      if (i === 0) {
        // La primera se copia entera y se baja a 1/n con un multiply: `copy` no respeta alpha, y un
        // canvas intermedio para promediar costaria una copia mas por submuestra.
        acc.globalCompositeOperation = 'copy'; acc.globalAlpha = 1
        acc.drawImage(this.renderer.domElement, 0, 0, this.W, this.H)
        const k = Math.round(255 / n)
        acc.globalCompositeOperation = 'multiply'
        acc.fillStyle = 'rgb(' + k + ',' + k + ',' + k + ')'
        acc.fillRect(0, 0, this.W, this.H)
      } else {
        acc.globalCompositeOperation = 'lighter'; acc.globalAlpha = 1 / n
        acc.drawImage(this.renderer.domElement, 0, 0, this.W, this.H)
      }
    }
    acc.globalCompositeOperation = 'source-over'; acc.globalAlpha = 1
  }

  seek(t) {
    this.uPelicula.uT.value = t
    this.tl.time(Math.min(t, this.dur), false)
    if (this._alSeek) this._alSeek(t)
  }

  render() { this.composer.render() }
}

// ---------------------------------------------------------------- primitivas de composicion
//
// Son las piezas con las que una plantilla escribe su pieza. NO son escenas: no traen composicion ni
// tiempo, solo objetos. Donde va cada cosa y cuando se mueve lo decide la plantilla.

// Un plano con texto rasterizado, por mascara: se ESCRIBE moviendo `uProg` de 0 a 1.
// PASAR `undefined` NO ES LO MISMO QUE NO PASAR NADA, y esta distincion costo todas las piezas de la
// primera tanda de Boveda.
//
// `texto()` define sus defaults con un spread: `{ peso: 400, ..., ...opciones }`. Un `peso: undefined`
// explicito PISA el 400 y deja `undefined`, asi que arma `font = "undefined 200px Anton"`. Eso no es un
// font valido: el canvas lo descarta y vuelve a su 10px sans-serif por defecto. El texto no falla —se
// MIDE MAL—, la proporcion sale invertida (el nombre de la marca dio 0.62 x 1.5 en vez de 5.06 x 1.11)
// y todas las piezas salieron con letras de seis pixeles adentro de camas enormes.
//
// Lo peor fue el diagnostico: la sonda en Node medía bien porque llamaba a `texto()` sin `peso`, y el
// navegador medía mal porque `letras()` se lo pasaba en `undefined`. Dos instrumentos sobre el mismo
// dato dando cosas distintas, y ninguno de los dos mentia.
//
// Se arma el objeto sin las claves vacias. Un default solo funciona si no lo pisan.
function opsTexto(op) {
  const o = {
    fuente: op.fuente || 'Anton',
    size: op.size || 200,
    tracking: op.tracking || 0,
    upper: op.upper !== false,
  }
  if (op.peso != null) o.peso = op.peso
  if (op.alineado != null) o.alineado = op.alineado
  if (op.linea != null) o.linea = op.linea
  return o
}

export function letras(str, altoMundo, color, op) {
  op = op || {}
  const t = texto(String(str || ''), opsTexto(op))
  const alto = (op.anchoMax && t.ar > 0.01) ? Math.min(altoMundo, op.anchoMax / t.ar) : altoMundo
  const mat = materialMascara(t.tex, color || nivelTexto(0.86))
  mat.uniforms.uSuave.value = op.suave != null ? op.suave : 0.045
  mat.uniforms.uDir.value = op.dir != null ? op.dir : 0
  const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * t.ar, alto), mat)
  m.userData.u = mat.uniforms
  m.userData.ar = t.ar
  m.userData.ancho = alto * t.ar
  m.userData.alto = alto
  return m
}

// Una CAMA detras de un texto. Existe por el mismo defecto que el otro motor documenta tres veces: un
// fondo con masa de color puede dejar un renglon en 1.0:1, y GARANTIZAR el fondo sale mas barato y mas
// confiable que medirlo caso por caso.
export function cama(anchoTexto, altoTexto, op) {
  op = op || {}
  const hx = op.holgX != null ? op.holgX : altoTexto * 0.32
  const hy = op.holgY != null ? op.holgY : altoTexto * 0.34
  const w = anchoTexto + hx * 2, h = altoTexto + hy * 2
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      color: hex(op.color || nivel(0.0)), transparent: true,
      opacity: op.opacidad != null ? op.opacidad : 0.94, depthWrite: false, toneMapped: false,
    }))
  // EL ORDEN DE DIBUJO, NO EL Z: cama y texto son transparentes con `depthWrite:false`, asi que three
  // los pinta en el orden en que se agregaron. Sin esto la cama TAPA el texto, y lo peor es que la
  // medicion de contraste MEJORA mientras la palabra desaparece. Pasa de verdad; esta documentado.
  m.renderOrder = -1
  m.userData.ancho = w
  m.userData.alto = h
  return m
}

// Vidrio tintado. Es el caballo de batalla del genero: da profundidad sin costar una textura y
// reacciona a la luz, que es lo que hace que un objeto se lea como VOLUMEN y no como una silueta.
export function vidrio(color, op) {
  op = op || {}
  return new THREE.MeshPhysicalMaterial({
    color: hex(color), metalness: op.metal != null ? op.metal : 0.0,
    roughness: op.rug != null ? op.rug : 0.12,
    transmission: op.trans != null ? op.trans : 0.85,
    thickness: op.grosor != null ? op.grosor : 1.2,
    ior: 1.45, clearcoat: 1.0, clearcoatRoughness: 0.08,
    transparent: true, opacity: op.opacidad != null ? op.opacidad : 1.0,
  })
}

// Metal anodizado. Con roughness bajo se vuelve un espejo que refleja una escena vacia y sale NEGRO;
// con roughness alto se vuelve plastico. 0.34 es la banda donde se lee como aluminio.
export function metal(color, rug) {
  return new THREE.MeshPhysicalMaterial({
    color: hex(color), metalness: 1.0, roughness: rug != null ? rug : 0.34,
    clearcoat: 0.45, clearcoatRoughness: 0.3,
  })
}

// Emisivo puro: lo unico que el bloom convierte en LUZ.
export function luz(color, intensidad) {
  return new THREE.MeshBasicMaterial({ color: hex(color).multiplyScalar(intensidad != null ? intensidad : 1), toneMapped: false })
}

// Un filete. La pieza mas barata que existe para dar direccion y ritmo a un cuadro.
export function barra(largo, grosor, color, intensidad) {
  return new THREE.Mesh(new THREE.PlaneGeometry(largo, grosor), luz(color, intensidad))
}

// ---------------------------------------------------------------- luces
// UN SOLO SITIO PARA LAS LUCES, y no es pereza: la iluminacion es lo que hace que doce plantillas se
// sientan del mismo estudio. Lo que las diferencia es la composicion, no el tratamiento.
export function iluminar(escena, op) {
  op = op || {}
  const amb = new THREE.HemisphereLight(hex(LOOK.bg2 || LOOK.bg), hex(LOOK.bg), CLARO ? 1.15 : 0.55)
  escena.add(amb)
  const key = new THREE.DirectionalLight(0xffffff, op.key != null ? op.key : (CLARO ? 1.4 : 2.1))
  key.position.set(-4, 7, 8)
  escena.add(key)
  const relleno = new THREE.DirectionalLight(hex(LOOK.acento), op.relleno != null ? op.relleno : 0.9)
  relleno.position.set(6, -3, 4)
  escena.add(relleno)
  return { amb, key, relleno }
}

// ---------------------------------------------------------------- el fondo del mundo
// Un domo con degrade, para que la camara pueda mirar a cualquier lado sin encontrar el vacio. Es la
// diferencia entre "un objeto flotando en negro" y "un objeto en un LUGAR", y en un motor cuyo recurso
// central es mover la camara, esa diferencia es la mitad del efecto.
export function domo(escena, op) {
  op = op || {}
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      uA: { value: hex(LOOK.bg) }, uB: { value: hex(LOOK.bg2 || LOOK.bg) },
      uAc: { value: hex(LOOK.acento) }, uT: { value: 0 },
      uFuerza: { value: op.fuerza != null ? op.fuerza : 0.22 },
      // Cuanto queda del color al ras del suelo. En claro hace falta bajar bastante —0.62— para que un
      // texto oscuro tenga contra que recortarse; en oscuro casi no, porque ya hay rango de sobra.
      uPiso: { value: op.piso != null ? op.piso : (CLARO ? 0.62 : 0.88) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: [
      'uniform vec3 uA, uB, uAc; uniform float uT, uFuerza, uPiso; varying vec3 vP;',
      'void main(){',
      '  vec3 d = normalize(vP);',
      '  float h = d.y * 0.5 + 0.5;',
      '  vec3 c = mix(uA, uB, smoothstep(0.0, 1.0, h));',
      // EL SUELO SE OSCURECE, Y ESTO ES LO QUE SALVA AL MUNDO CLARO.
      //
      // Con un degrade parejo, en una paleta clara el domo entero queda casi blanco: los objetos no
      // tienen contra que recortarse y la pieza se lee como cosas flotando en la nada. Un cielo real
      // tampoco es parejo — el horizonte es mas oscuro que el cenit, y esa sola diferencia es la que
      // hace que el ojo entienda que hay un SUELO y un ARRIBA.
      '  float suelo = smoothstep(0.52, -0.25, d.y);',
      '  c *= mix(1.0, uPiso, suelo);',
      // Una veladura de acento que gira lentisimo: le da DIRECCION al espacio sin dibujar nada.
      '  float g = smoothstep(0.2, 1.0, dot(d, normalize(vec3(cos(uT * 0.07), 0.35, sin(uT * 0.07)))));',
      '  c = mix(c, uAc, g * uFuerza);',
      '  gl_FragColor = vec4(c, 1.0);',
      '}',
    ].join('\n'),
  })
  const m = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 24), mat)
  m.frustumCulled = false
  // SE PINTA PRIMERO, SIEMPRE, Y ESTO COSTO LAS DOS PRIMERAS PIEZAS ENTERAS.
  //
  // El domo es una esfera CENTRADA EN EL ORIGEN. three ordena los objetos transparentes por la
  // distancia de su ORIGEN a la camara, no por su superficie — y el origen del domo esta a un par de
  // unidades, o sea mas cerca que casi todo lo demas. Resultado: el domo se dibujaba AL FINAL, encima
  // de la escena entera. En un mundo claro eso es una pantalla blanca.
  //
  // El sintoma no ayudaba nada: las piezas salian con el panel de la pagina visible y NADA mas, porque
  // ese panel vive en otra escena que se renderiza en un pase posterior y por eso sobrevivia. Las 13
  // mallas de texto estaban construidas, encendidas y dentro del cuadro —la sonda lo confirmo— y aun
  // asi no habia una sola letra.
  //
  // `renderOrder = -1000` lo saca del orden por distancia y lo manda al fondo, que es lo unico que un
  // fondo tiene que hacer.
  m.renderOrder = -1000
  escena.add(m)
  return mat.uniforms
}

// ---------------------------------------------------------------- polvo suspendido
// Particulas finisimas que existen solo para que el ESPACIO se lea. Sin algo suspendido en el aire, un
// vuelo de camara por un espacio vacio no se percibe como movimiento: no hay contra que medirlo.
export function polvo(escena, n, radio, color) {
  n = n || 900; radio = radio || 34
  const g = new THREE.BufferGeometry()
  const p = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = radio * Math.cbrt(Math.random())
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
    p[i * 3] = r * Math.sin(ph) * Math.cos(th)
    p[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
    p[i * 3 + 2] = r * Math.cos(ph)
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3))
  const m = new THREE.Points(g, new THREE.PointsMaterial({
    color: hex(color || LOOK.acento), size: 0.035, sizeAttenuation: true,
    transparent: true, opacity: 0.55, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  }))
  m.frustumCulled = false
  escena.add(m)
  return m
}

// ---------------------------------------------------------------- un plano con la pagina del cliente
// La tira es la captura scrolleable del sitio. Se muestra una VENTANA de ella, nunca entera y nunca
// estirada: la proporcion de la pagina se respeta o el dueño de la marca lo ve antes que nadie.
export function panelPagina(tex, ancho, alto, op) {
  op = op || {}
  if (!tex || !tex.image) return null
  const anchoTira = tex.image.width || 720, altoTira = tex.image.height || 6240
  // Misma cuenta que usan `pantalla`, `ventana` y `portatil` en el otro motor, y por la misma razon:
  // pedir que la densidad de pixeles de pagina por unidad de mundo sea la misma en los dos ejes.
  const visible = Math.min(1, (anchoTira * alto) / (altoTira * ancho))
  const t = tex.clone()
  t.needsUpdate = true
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  t.anisotropy = 8
  t.repeat.set(1, visible)
  t.offset.set(0, op.desde != null ? op.desde : (1 - visible) * 0.5)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto),
    new THREE.MeshBasicMaterial({ map: t, toneMapped: false }))
  m.userData.tipoImagen = 'recorte'
  m.userData.tex = t
  m.userData.visible01 = visible
  return m
}

// ---------------------------------------------------------------- un PARRAFO, en varios renglones
//
// LA PRIMITIVA QUE FALTABA, Y SU AUSENCIA COSTO LAS PRIMERAS PIEZAS.
//
// `letras()` con `anchoMax` acota el ANCHO bajando el ALTO, que es correcto para un rotulo de dos
// palabras y desastroso para una frase: el claim de basecamp salio de 5.06 unidades de ancho —el 92%
// del cuadro, perfecto— y **3% de alto**. Entraba, se medía bien, y no se leia. Es el mismo defecto
// que `cita` documenta en el otro motor con otras palabras: "E-ENCAJE queda verde con el texto ya
// ilegible", porque achicar es justamente como se consigue que entre.
//
// Una frase larga no se achica: SE PARTE. Y partirla bien es lo que decide si una pieza se ve
// profesional — un renglon huerfano de dos letras arruina una composicion que por lo demas esta bien.
//
// COMO SE ELIGE EL CORTE. `porLinea` sale de la geometria y no de un numero a ojo: se estima cuantos
// caracteres entran en `anchoMax` a la altura pedida, usando la proporcion REAL que devuelve `texto()`
// para una muestra. Asi el corte sigue siendo correcto cuando cambia la tipografia del aire, que es
// justo cuando un numero calibrado dejaria de servir.
export function parrafo(str, altoPedido, color, op) {
  op = op || {}
  const txt = String(str || '').replace(/\s+/g, ' ').trim()
  if (!txt) return null
  const maxLineas = op.maxLineas || 3
  const anchoMax = op.anchoMax || 5
  const interlinea = op.interlinea != null ? op.interlinea : 1.22
  // LA ALTURA MINIMA LEGIBLE, y es la invariante de esta funcion.
  //
  // 0.34 unidades de mundo sobre un alto de 10 son el 3.4% del cuadro: 65 px en 1920. Por debajo de
  // eso un glifo con grano encima deja de ser texto y pasa a ser textura.
  const minAlto = op.minAlto != null ? op.minAlto : 0.34

  const opTexto = opsTexto(op)
  const arDe = (t) => texto(t, opTexto).ar

  const cortar = (n) => {
    // Un token mas largo que el renglon se parte igual — una URL o un handle, si no, se lleva puesto el
    // renglon entero. Misma decision que toma `cita` en el otro motor, por la misma razon.
    const palabras = txt.split(' ').filter(Boolean)
      .flatMap(p => (p.length <= n ? p : (p.match(new RegExp('.{1,' + n + '}', 'gu')) || [p])))
    const out = []
    let act = ''
    for (const p of palabras) {
      if (!act) { act = p; continue }
      if ((act + ' ' + p).length <= n) act += ' ' + p
      else { out.push(act); act = p }
    }
    if (act) out.push(act)
    return out
  }

  // PRIMERO SE ELIGE LA ALTURA, DESPUES CUANTO TEXTO ENTRA. Al reves —que fue la primera version— para
  // meter un claim largo en tres renglones el corte se ensanchaba hasta 144 caracteres, y la altura
  // comun caia a 0.13: el 1.3% del cuadro. El texto entraba, se medía bien y era ilegible. Es el mismo
  // defecto que `cita` documenta en el otro motor: achicar es como se consigue que entre.
  let alto = altoPedido
  let lineas = []
  for (let intento = 0; intento < 12; intento++) {
    // Cuantos caracteres entran en un renglon A ESTA ALTURA, medido sobre el texto real.
    const arMuestra = arDe(txt.slice(0, 44) || 'M')
    const anchoChar = (arMuestra * alto) / Math.max(1, Math.min(44, txt.length))
    const porLinea = Math.max(8, Math.floor(anchoMax / Math.max(0.001, anchoChar)))
    lineas = cortar(porLinea)
    if (lineas.length <= maxLineas) break
    // No entra: se baja la altura un escalon y se vuelve a cortar. Bajar la altura mete MAS texto por
    // renglon, asi que converge — y para en `minAlto`, que es el piso que no se cruza.
    if (alto <= minAlto) break
    alto = Math.max(minAlto, alto * 0.88)
  }

  // Y SI NI ASI ENTRA, SE CORTA EL TEXTO — no se achica mas. Un claim de 200 caracteres no es un
  // titular y no hay composicion que lo salve; mostrar las primeras lineas y cerrar con puntos
  // suspensivos es honesto y legible. Lo que no se hace es dejarlo ilegible entero.
  let recortado = false
  if (lineas.length > maxLineas) {
    lineas = lineas.slice(0, maxLineas)
    lineas[maxLineas - 1] = lineas[maxLineas - 1].replace(/[\s.,;:]+$/, '') + '...'
    recortado = true
  }

  // La altura definitiva sale del renglon MAS ANCHO ya cortado, y es COMUN a todos. Dandole `anchoMax`
  // a cada `letras` por separado, el que se pasa se achica solo y el parrafo sale con un renglon
  // diminuto entre dos normales — peor que cualquiera de las dos cosas.
  const arMax = Math.max(0.01, ...lineas.map(arDe))
  const altoReal = Math.min(alto, anchoMax / arMax)

  const g = new THREE.Group()
  const hechas = []
  let anchoMayor = 0
  lineas.forEach((l, i) => {
    const m = letras(l, altoReal, color, Object.assign({}, op, { anchoMax: 0 }))
    m.position.y = -i * altoReal * interlinea
    g.add(m)
    hechas.push(m)
    anchoMayor = Math.max(anchoMayor, m.userData.ancho)
  })
  const altoTotal = (lineas.length - 1) * altoReal * interlinea + altoReal
  // El bloque se centra en su propio alto: colocarlo en `y` significa "su centro va aca".
  g.position.y = altoTotal / 2 - altoReal / 2
  g.userData.lineas = hechas
  g.userData.ancho = anchoMayor
  g.userData.alto = altoTotal
  g.userData.altoLinea = altoReal
  g.userData.recortado = recortado
  // Escribir el parrafo es escribir sus renglones EN ORDEN, con desfase: leer no es instantaneo, y un
  // bloque que aparece de golpe se percibe como una imagen, no como una frase.
  g.userData.escribir = (tl, t0, dur, paso) => {
    hechas.forEach((m, i) => {
      m.userData.u.uProg.value = 0
      tl.to(m.userData.u.uProg, { value: 1.04, duration: b(dur) },
        b(t0 + i * (paso != null ? paso : 0.32)))
    })
  }
  g.userData.borrar = (tl, t0) => {
    hechas.forEach((m, i) => {
      tl.set(m.userData.u.uDir, { value: 1 }, b(t0 + i * 0.08))
      tl.to(m.userData.u.uProg, { value: 0, duration: b(0.5) }, b(t0 + i * 0.08))
    })
  }
  return g
}
