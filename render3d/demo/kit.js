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

// ---------------------------------------------------------------- deriva continua
// EL MOVIMIENTO LENTO QUE NO PARA: la escena respira, se acerca, se corre un pelo hacia el margen.
// No se escribe con tweens sobre las propiedades, y hay dos razones, las dos pagadas caro:
//
//   1. La trampa de `modifiers` sin la propiedad declarada en `vars` costo cuatro bugs en este repo.
//      Aca `t` SI esta en vars, asi que el tween corre de verdad, y las propiedades se escriben a mano.
//   2. UNA PROPIEDAD, UN SOLO ESCRITOR. Deriva, entrada y golpe queriendo la misma `position.x` como
//      tweens separados se pisan, y el resultado deja de ser determinista: `partida` salio con dos
//      escritores sobre `fondo.position.x` y el render no repetia dos veces igual.
//
// El molde estaba copiado en siete escenas y escondia un tercer filo: la llamada a mano ANTES del
// tween. Sin ella el cuadro 0 queda sin escribir —GSAP no dispara onUpdate en el instante cero— y la
// escena arranca con un salto de un frame. Es invisible leyendo y se ve mirando, que es la peor
// combinacion. Metido aca adentro, ya no hay como olvidarselo.
//
// `paso` recibe (u, t): u normalizado 0..1 para las escenas que respiran, t en segundos para las que
// cuentan beats (columna reparte por beat y necesita el crudo).
export function deriva(tl, dur, paso) {
  const reloj = { t: 0 }
  const correr = () => paso(reloj.t / dur, reloj.t)
  correr()
  tl.to(reloj, { t: dur, duration: dur, ease: 'none', onUpdate: correr }, 0)
  return reloj
}

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

// EL MOBILIARIO DEL CUADRO — lo que faltaba para que dos videos no se parezcan.
//
// Un aire declaraba paleta, tipografia, ritmo, gestos, camara y pelicula, y con eso dos piezas de
// rubros opuestos SEGUIAN VIENDOSE IGUAL: cambiaba el color y la letra, y el MUEBLE era el mismo —
// la misma grilla en fuga, los mismos corchetes de encuadre, los mismos rotulos tecnicos. Una
// panaderia recibia el HUD de una herramienta de ingenieria con otra tipografia.
//
// El mueble es la mitad de la identidad de una pieza y estaba horneado en las escenas. Ahora lo
// pide el aire, y la escena pregunta en vez de imponer.
//
//   fondo     'fuga'    la grilla en perspectiva de ANTHEM: espacio, tecnologia, velocidad
//             'puntos'  una reticula de puntos: papel, editorial, artesanal
//             'ondas'   curvas suaves que respiran: bienestar, gastronomia, cuidado
//             'rayas'   diagonales duras en movimiento: deporte, urgencia
//             'bloques' celdas grandes que se encienden en el beat: jugueton, ecommerce
//             'nada'    solo el degrade: lujo, arquitectura, todo lo que necesita AIRE
//   esquinas  los corchetes de encuadre. Dicen 'camara', 'tecnico', 'capturado'.
//   hud       los rotulos chicos de formato y dominio. Dicen 'ficha tecnica'.
//
// El orden de PATRONES importa: es el indice que viaja al shader como uPatron.
export const PATRONES = ['fuga', 'puntos', 'ondas', 'rayas', 'bloques', 'nada']
const MOBILIARIO_BASE = { fondo: 'fuga', esquinas: true, hud: true }
export let MOB = MOBILIARIO_BASE
// ¿El mundo es claro? Lo decide el ADN de la página, no el aire. Las escenas lo consultan para elegir
// entre sumar luz y restarla: la misma escena que sobre negro dibuja un halo, sobre blanco tiene que
// dibujar una sombra, o desaparece.
export let CLARO = false

// configurar(aire) — se llama UNA vez antes de construir la pieza. Todo lo que no venga en el aire
// se queda con el valor de ANTHEM.
export function configurar(aire) {
  if (!aire) return
  AIRE = aire
  CLARO = !!aire.claro
  MOB = { ...MOBILIARIO_BASE, ...(aire.mobiliario || {}) }
  if (aire.bpm) { BPM = aire.bpm; BEAT = 60 / BPM }
  if (aire.paleta) LOOK = { ...LOOK, ...aire.paleta }
  if (aire.gesto) E = { ...GESTO_BASE, ...aire.gesto }
  _cacheTexto.clear()                                // el cache guarda color y fuente: hay que soltarlo
}

// El cache de texturas guarda color, fuente y tracking dentro de su clave, asi que sobrevive a un
// cambio de DATOS pero no deberia sobrevivir a uno de AIRE — `configurar` ya lo suelta. Se exporta
// para que un arnes pueda forzar el rasterizado y auditar QUE se dibuja: con el cache caliente, un
// glifo que ya se rasterizo no vuelve a pasar por fillText y parece que la escena no lo dibujo.
export function limpiarCache() { _cacheTexto.clear() }

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
//
// EL REVELADO NO TERMINA EN 1, TERMINA EN 1 + uSuave. El shader hace smoothstep(uProg, uProg-uSuave, e):
// con uProg en 1 la banda blanda queda PISANDO el borde derecho y la ultima letra sale lavada. Hay que
// pasarse el ancho de la banda para que el degrade salga del plano.
//
// Ese numero estaba escrito a mano —`1.06`, `1 + 0.06`, `1.06 // 1 + uSuave`— en seis escenas, cada una
// con su propio comentario reexplicando la misma trampa. El problema no era la repeticion: era que el
// numero DEPENDE de `SUAVE` y nadie los ataba. Cambiar el 0.06 de aca abajo dejaba las seis mal, sin
// romper ninguna compuerta y sin que nada lo dijera: la ultima letra de seis escenas se lavaba y habia
// que volver a descubrirlo mirando. Ahora se deriva, y quien tenga un uSuave propio pide finMascara(suyo)
// —pantalla.js usa 0.11 porque su barrido es mucho mas ancho—.
export const SUAVE = 0.06
export const finMascara = (suave = SUAVE) => 1 + suave

export function materialMascara(map, color = null) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      map: { value: map }, uProg: { value: 0 }, uDir: { value: 0 },
      // uTinte SIEMPRE es un Color, nunca null: three sube los uniforms sin preguntar y un vec3 en
      // null revienta el shader con un error que no menciona el uniform. Cuando no hay tinte se
      // manda negro y `uUsaTinte` en 0 lo ignora.
      uSuave: { value: SUAVE }, uTinte: { value: hex(color || '#000000') }, uUsaTinte: { value: color ? 1 : 0 },
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
      uAcento: { value: hex(LOOK.acento) }, uAcento2: { value: hex(LOOK.acento2) },
      uGrilla: { value: 0.55 }, uPulso: { value: 0 },
      // El beat, para que el fondo pueda caer en la grilla del montaje. Sin esto lo unico que podia
      // hacer una masa de fondo era DERIVAR, y lo suave no cuenta: ni para el ojo ni para la medicion.
      uBeat: { value: BEAT },
      // Que patron dibuja el fondo. Ver MOBILIARIO_BASE arriba: es lo que hace que una pieza de
      // lujo no tenga la misma grilla de ingenieria que una de software.
      uPatron: { value: Math.max(0, PATRONES.indexOf(MOB.fondo)) },
      // 1 = mundo claro. La grilla y el pulso son ADITIVOS, que es lo correcto sobre negro y un
      // desastre sobre blanco: sumar sobre un fondo que ya está en 1.0 no aclara nada, sólo desatura
      // hasta el gris. En claro las mismas dos cosas tienen que OSCURECER hacia el acento.
      uClaro: { value: CLARO ? 1 : 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform float uT, uGrilla, uPulso, uClaro, uBeat, uPatron; uniform vec3 uA, uB, uAcento, uAcento2;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        vec3 col = mix(uA, uB, smoothstep(0.95, 0.05, distance(uv, vec2(0.5, 0.58))));
        // EL PATRON DEL FONDO LO PIDE EL AIRE. Seis, y ninguno es decorado: cada uno dice de que
        // clase de negocio es la pieza antes de que se lea una palabra. La grilla en fuga —la de
        // ANTHEM— dice espacio y tecnologia, y sobre una panaderia dice 'software de panaderia'.
        vec2 g = uv - vec2(0.5, 0.52);
        float linea = 0.0;
        if (uPatron < 0.5) {
          // FUGA: las lineas se juntan hacia el horizonte y se desplazan. Espacio sin geometria.
          float persp = 1.0 / max(0.06, abs(g.y) * 2.4);
          float lx = abs(fract(g.x * persp * 5.0 + 0.5) - 0.5);
          float ly = abs(fract(g.y * 9.0 - uT * 0.18 + 0.5) - 0.5);
          linea = smoothstep(0.055, 0.0, lx) + smoothstep(0.05, 0.0, ly);
          linea *= smoothstep(0.62, 0.06, abs(g.y));
        } else if (uPatron < 1.5) {
          // PUNTOS: una reticula regular que deriva despacio. Es el papel milimetrado de un
          // cuaderno de diseno, y no tiene fuga: no promete profundidad, promete superficie.
          vec2 q = fract((g + vec2(uT * 0.006, -uT * 0.012)) * 26.0) - 0.5;
          linea = smoothstep(0.30, 0.06, length(q)) * 0.9;
        } else if (uPatron < 2.5) {
          // ONDAS: tres senos de periodos no multiplos entre si, o volverian a alinearse. Respira,
          // y nada tiene esquinas.
          float w = sin(g.x * 7.0 + uT * 0.30) * 0.055
                  + sin(g.x * 11.3 - uT * 0.21) * 0.035
                  + sin(g.x * 4.1 + uT * 0.13) * 0.045;
          float d = abs(fract((g.y - w) * 5.0 + 0.5) - 0.5);
          linea = smoothstep(0.09, 0.0, d) * 0.75;
        } else if (uPatron < 3.5) {
          // RAYAS: diagonales duras corriendo. Es la unica que NO se desvanece hacia los bordes,
          // porque su gracia es no dejar respirar.
          float d = abs(fract((g.x * 1.5 + g.y * 2.2) * 6.0 - uT * 0.55 + 0.5) - 0.5);
          linea = smoothstep(0.16, 0.05, d) * 0.8;
        } else if (uPatron < 4.5) {
          // BLOQUES: una cuadricula grande donde algunas celdas se encienden EN EL BEAT. Es el
          // unico patron con eventos propios, y por eso es el de las piezas que quieren gritar.
          vec2 celda = floor((g + vec2(0.5)) * vec2(3.0, 5.0));
          float paso = floor(uT / max(0.05, uBeat));
          float h = fract(sin(dot(celda, vec2(12.9898, 78.233)) + paso * 3.7) * 43758.5453);
          vec2 dentro = fract((g + vec2(0.5)) * vec2(3.0, 5.0));
          float borde = min(min(dentro.x, 1.0 - dentro.x), min(dentro.y, 1.0 - dentro.y));
          linea = step(0.78, h) * smoothstep(0.0, 0.04, borde) * 0.55;
        }
        // 'nada' (uPatron >= 4.5) deja el degrade solo: es lo que necesita una pieza que vende aire.
        linea *= uGrilla;
        // En oscuro la línea SUMA luz; en claro TIÑE hacia el acento. Es la misma grilla y en los dos
        // casos aparece por delante del fondo, que es lo único que importa.
        // En claro hace falta MAS peso, no menos: sobre negro una linea de acento al 16% ya destaca
        // porque suma luz donde no habia, y sobre blanco la misma linea tiñe apenas un blanco que ya
        // estaba lleno. Con 0.26 la grilla en fuga quedaba de fantasma y los cuadros sin protagonista
        // salian en blanco liso.
        col = mix(col + uAcento * linea * 0.16, mix(col, uAcento * 0.58, linea * 0.52), uClaro);
        // PULSO: un halo que late con el beat. Se maneja desde la timeline, no con un reloj propio.
        float halo = uPulso * smoothstep(0.75, 0.0, distance(uv, vec2(0.5, 0.5)));
        col = mix(col + uAcento * halo * 0.5, mix(col, uAcento, halo * 0.32), uClaro);
        // ---------------------------------------------------------------- campos de color (mundo claro)
        // UN MUNDO CLARO NO PUEDE BRILLAR, Y ESE ERA TODO EL PROBLEMA.
        //
        // Medido: la MISMA pieza, los MISMOS datos, cambiando sólo la polaridad, pasa de 0.104 a 0.215
        // de píxeles en movimiento y de 0.075 a 0.134 de ocupación de cuadro. El doble, las dos. No es
        // el grano —a umbral 60, donde el grano no llega, la brecha es de 6×— ni el largo de las
        // frases: es que la mitad del "movimiento" de una pieza oscura la pone el GLOW. Un halo de
        // bloom desplazándose mueve cientos de píxeles alrededor de cada objeto, y la grilla aditiva
        // ilumina donde antes no había nada. Sobre blanco, sumar luz no hace nada.
        //
        // Lo que sí tiene una pieza clara es el CAMPO DE COLOR: manchas grandes y suaves del color de
        // la marca que se desplazan por debajo de todo. Es el vocabulario de las landings claras de
        // hoy y no es un truco para la métrica — es lo que hace que un cuadro blanco con una frase
        // encima se lea como diseñado en vez de como vacío. Y como son grandes y se mueven, aportan
        // exactamente lo que faltaba: área que cambia.
        //
        // Los períodos no son múltiplos entre sí: si lo fueran, las dos manchas volverían a alinearse
        // cada tanto y el fondo latiría como una sola cosa.
        // COORDENADAS DE CUADRO, no del plano. El plano del fondo mide 2.6x el cuadro y vive en
        // z=-14, asi que lo que la camara ve es apenas su parte central: uv 0..1 recorre mucho mas que
        // la pantalla. La primera version puso las manchas en uv (0.26, 0.30) y la cuña en la esquina
        // (1, 0) — TODO fuera de campo. Se noto porque las metricas no se movieron ni un digito entre
        // la version con cuña y la version sin cuña: identicas, hasta el ultimo decimal.
        vec2 f = (uv - 0.5) * 1.49 + 0.5;
        vec2 c1 = vec2(0.26 + sin(uT * 0.131) * 0.13, 0.30 + cos(uT * 0.107) * 0.10);
        vec2 c2 = vec2(0.76 + cos(uT * 0.091) * 0.11, 0.71 + sin(uT * 0.118) * 0.12);
        float m1 = smoothstep(0.62, 0.0, distance(f, c1));
        float m2 = smoothstep(0.54, 0.0, distance(f, c2));
        // El centro del cuadro cede: ahí vive la tipografía, y un campo fuerte detrás de una frase le
        // roba el contraste que la hace legible. La máscara se abre hacia los bordes.
        float borde = smoothstep(0.10, 0.42, distance(f, vec2(0.5, 0.52)));
        vec3 campos = mix(col, uAcento, m1 * 0.34);
        campos = mix(campos, uAcento2, m2 * 0.24);
        col = mix(col, mix(col, campos, 0.35 + 0.65 * borde), uClaro);

        // Y UNA CUÑA DE BORDE DURO. Los campos suaves de arriba subieron el movimiento un 19% y la
        // OCUPACIÓN NO SE MOVIÓ (0.075 -> 0.072), y eso no es un defecto de la métrica: la ocupación
        // toma la mediana del cuadro como fondo y cuenta lo que se aleja de ella, así que un degradé
        // grande y suave corre la propia mediana y no cuenta nunca. Un mundo claro sólo puede ocupar
        // el cuadro con MASA DE BORDE DURO, que además es lo que usa el diseño editorial claro: el
        // bloque de color plano, no la nube.
        //
        // Va en la esquina inferior derecha y con la diagonal corrida, o sea lejos del centro óptico
        // donde vive la tipografía: un bloque sólido detrás de una frase le come el contraste que la
        // hace legible, y la legibilidad no se negocia por una métrica.
        // El factor 1.49 vale a la distancia de reposo; cuando la camara hace dolly, la porcion del
        // plano que entra en cuadro cambia y el mapeo se corre. Por eso la cuña es GRANDE y su umbral
        // esta lejos del borde: con 1.02 desaparecia entera en los cuadros en que la camara se acerca
        // — que es exactamente el mismo error que dejo la pauta del toro fuera de campo cuatro beats.
        // Una masa que depende de un mapeo aproximado tiene que tener margen, o no depender de el.
        // LA DIAGONAL VA POR DEBAJO DE LA BANDA DE TIPOGRAFIA, y eso fija los coeficientes.
        // Con (0.62, 0.88) la cuña subia hasta el medio del cuadro y el titular la cruzaba: tinta
        // oscura sobre un violeta saturado pierde el contraste que la hace legible. La ocupacion daba
        // 0.391 —por encima de la referencia— y la pieza era peor. Con mas peso en Y (1.15) el borde
        // se aplana y queda entre el 9% y el 39% del alto, o sea debajo del renglon del titular.
        // LA CUÑA SALTA EN EL BEAT, no deriva. Derivando con un seno lentisimo era una masa enorme que
        // cambiaba tres pixeles por cuadro: la version anterior subio la ocupacion y NO subio el
        // movimiento, que es la misma leccion que dio el mosaico con el paralaje y el hero con el
        // polvo. Lo que el ojo registra —y lo que la medicion cuenta— es que algo CAMBIE DE GOLPE.
        //
        // Cada dos beats toma una posicion nueva de una lista de cuatro. Dos beats y no uno porque a
        // un beat el fondo compite con los cortes de la pieza; a dos, acompaña. Y son posiciones
        // discretas y no un valor al azar para que el salto se lea como una DECISION repetida, que es
        // lo que hace un diseño editorial, y no como un temblor.
        float paso = floor(uT / max(0.05, uBeat * 2.0));
        float sel = fract(sin(paso * 12.9898) * 43758.5453);
        float donde = 1.05 + floor(sel * 4.0) * 0.055 - 0.08;
        float dg = (f.x * 0.35 + (1.0 - f.y) * 1.15) - donde;
        float cuna = smoothstep(0.0, 0.006, dg);
        // SOLO EN CLARO, y no por falta de ganas. Probada tambien en el mundo oscuro, la cuña sube la
        // ocupacion de 0.28 a 0.61 —muy por encima de la referencia— y la pieza queda PEOR: el azul
        // profundo con las lineas de neon encima se convierte en un diagonal celeste apagado, y el
        // contraste baja de 0.177 a 0.171. Un mundo oscuro ya tiene cuerpo: se lo da el glow, que es
        // justo lo que un mundo claro no puede tener. Es la segunda vez en esta sesion que una version
        // gana la metrica y hay que tirarla; el 11% de ocupacion que le falta al mundo oscuro contra la
        // referencia es una diferencia de estetica, no un defecto, y cerrarla cuesta mas de lo que vale.
        col = mix(col, mix(col, uAcento, 0.86), cuna * uClaro);

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
// ---------------------------------------------------------------- la escala fondo → tinta
// nivel(k) — el color que está al k del camino que va del FONDO a la TINTA. k=0 es el fondo, k=1 es
// la tinta, 0.5 es el gris del medio.
//
// POR QUÉ EXISTE. Las escenas tenían la escala de grises escrita a mano: '#c3cbdb' para el titular,
// '#8c95ab' para la jerarquía alta, '#7d879e' para la baja. Son valores buenos, y están calibrados
// contra un fondo negro. En un mundo claro —cinco de cada siete páginas reales— el titular gris claro
// sobre blanco es un fantasma, y la tarjeta '#0c1124' es un rectángulo azul marino plantado en el medio
// de una pieza blanca. La misma jerarquía escrita como `nivel(0.78)` da gris claro sobre negro y gris
// oscuro sobre blanco, sin que la escena tenga que saber en qué mundo está.
//
// Y ARREGLA LA INVERSIÓN GRATIS. La escena de destello es una hoja de papel BLANCA con tipografía
// NEGRA, dentro de un mundo oscuro: una inversión deliberada. Escrita como nivel(1) para la hoja y
// nivel(0) para la letra, en un mundo claro se da vuelta sola —hoja oscura, letra clara— y sigue
// siendo la misma idea: el plano que se opone al fondo.
//
// OJO: se evalúa cuando se llama, NUNCA a nivel de módulo. LOOK cambia en `configurar()`, que corre
// después de que los módulos se importan; un `const C = nivel(0.7)` arriba de un archivo se queda con
// la paleta de ANTHEM para siempre y no falla — miente en silencio.
// SE MEZCLA EN sRGB, NO EN LINEAL, y la diferencia no es academica: es la que decide si el texto se
// lee o sale reventado.
//
// `THREE.Color.lerp` trabaja en el espacio LINEAL de trabajo, asi que `nivel(0.78)` entre #05060a y
// #f2f4f8 devolvia #d9dbde — luminancia 0.707. El umbral del bloom del aire tecnico es 0.62, o sea que
// TODA la tipografia de display quedaba por encima y florecia entera: en un mundo oscuro el titular
// salia como un ladrillo blanco sin contraformas, ilegible. El gris escrito a mano que reemplace
// (#c3cbdb) tenia luminancia 0.594, elegido a proposito para pasar JUSTO por debajo — el
// "presupuesto de luz" que documenta toro.js. Mezclando los mismos extremos en sRGB da #bec0c4,
// luminancia 0.526: debajo del umbral, con margen.
//
// Lo delato un render en vivo de tailwindcss.com, no una compuerta. Por eso hay una compuerta ahora.
const _canal = (h) => {
  const t = String(h).replace('#', '')
  const n = t.length === 3 ? t.split('').map(c => c + c).join('') : t
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) || 0)
}
const _hex = (v) => '#' + v.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
export function nivel(k, tinte = 0) {
  const a = _canal(LOOK.bg), b = _canal(LOOK.tinta)
  const t = Math.min(1, Math.max(0, k))
  let v = a.map((x, i) => x + (b[i] - x) * t)
  if (tinte > 0) {
    const c = _canal(LOOK.acento)
    v = v.map((x, i) => x + (c[i] - x) * tinte)
  }
  return _hex(v)
}

export const matTarjeta = (color = null) => new THREE.MeshPhysicalMaterial({
  color: hex(color || nivel(0.10, 0.35)), roughness: 0.42, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.25,
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


// ---------------------------------------------------------------- recortes REALES de la pagina
// Un recorte no es una foto: es un OBJETO de la marca — su logo, su tarjeta de precio, su boton. Se
// dibuja con SU proporcion y sin recortar. Estirar el logo de una marca un 20% es el defecto que su
// dueño ve antes que ninguno, y recortarlo lo rompe igual.
//
// `alto` es el alto en unidades de mundo; el ancho sale de la proporcion del archivo. Devuelve null
// si no hay textura: una escena que no puede mostrar el objeto se compone sin el, nunca con un hueco
// gris que se lee como un error de carga.
export function planoRecorte(tex, alto, o = {}) {
  if (!tex || !tex.image) return null
  const ar = tex.image.width / tex.image.height
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    // toneMapped false y sin multiplicar: el recorte YA trae los colores de la marca y cualquier
    // ganancia los falsea. Su integracion con la pieza la da el grano y la viñeta del pase final,
    // que se aplican despues porque el recorte vive en la escena post-bloom.
    toneMapped: false, opacity: o.opacidad == null ? 1 : o.opacidad,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * ar, alto), mat)
  m.userData.ar = ar
  return m
}

// Carga los recortes que declara D.elementos. Devuelve un Map url -> textura. El TextureLoader de
// three es asincronico: si una escena no espera, construye con texturas vacias y el plano sale negro.
export function cargarRecortes(elementos) {
  const cargador = new THREE.TextureLoader()
  const urls = [...new Set((elementos || []).map(e => e.url).filter(Boolean))]
  const mapa = new Map()
  return Promise.all(urls.map(u => new Promise(res => {
    cargador.load(u, t => { mapa.set(u, t); res() }, undefined, () => res())
  }))).then(() => mapa)
}

// Elige recortes por ROL, en el orden en que sirven para una escena. Nunca inventa: si la pagina no
// dio ninguno del rol pedido, devuelve una lista mas corta o vacia, y la escena se compone sin ellos.
export function recortesDe(elementos, roles, n = 3) {
  const out = []
  for (const rol of [].concat(roles)) {
    for (const e of (elementos || [])) {
      if (e.rol === rol && !out.includes(e)) out.push(e)
      if (out.length >= n) return out
    }
  }
  return out
}
