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
import { BEAT, b, LOOK, CLARO, AIRE, hex, mulberry32, fondoVivo, configurar, MONTAJES, reiniciarRecortes } from './kit.js'
import { configurarDatos, reiniciarReparto } from './datos.js'
import { personalizar } from './adn.js'
import { ESCENAS } from './escenas/index.js'
import { guionDe, ajusteDe, DUENO } from './guion.js'

// ---------------------------------------------------------------- pase final de película
// Grano + viñeta + aberración + un leve halo. El tiempo ENTRA como uniform: un pase con reloj propio
// da dos granos distintos para el mismo instante y rompe el determinismo.
const Pelicula = {
  uniforms: {
    tDiffuse: { value: null }, uT: { value: 0 }, uGrano: { value: 0.055 },
    uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 }, uFlash: { value: 0 },
    // LA FORMA DE LA VIÑETA, no solo su intensidad. Estaba horneada —`smoothstep(0.95, 0.10, r2)` con
    // r2 en espacio UV— y era byte a byte la misma en los once aires: solo cambiaba cuanto oscurece.
    // Calculado sobre esa curva, la esquina baja al 54% y el borde medio al 92%, siempre con el mismo
    // aro. Once personalidades declaraban su exposicion y todas recibian el mismo recorte de luz.
    //   uVinForma  0 = ovalo (distancia euclidiana), 1 = RECTANGULAR (norma del maximo). No es el
    //              mismo efecto con otro numero: un ovalo oscurece las esquinas y deja los lados; un
    //              rectangulo apaga los cuatro lados parejo y se lee como una caja de luz.
    //   uVinCentro donde esta la fuente. Corrido hacia arriba se lee como luz cenital, que es lo que
    //              pide una vidriera; centrado se lee como foco de estudio.
    //   uVinAsp    correccion de aspecto. En 1 el aro es un circulo en UV —o sea un ovalo alto en el
    //              cuadro—, que es lo que hay hoy y queda como default.
    uVinForma: { value: 0 }, uVinCentro: { value: new THREE.Vector2(0.5, 0.5) }, uVinAsp: { value: 1 },
    uRes: { value: new THREE.Vector2(1080, 1920) },
    // TRANSICIONES, en el pase de post y no en la escena 3D. Ver la nota larga donde se programan.
    //   uEmpuje  desplaza el cuadro entero en X (en UV). La saliente se va y la entrante llega.
    //   uEmpujeY lo mismo en Y. Es el eje que pide un cuadro de 1080x1920: el gesto vertical es el
    //            nativo del formato —asi se mira un feed— y el motor solo tenia el horizontal.
    //   uBarrido 0..1: la posicion de una banda solida que cruza el cuadro y tapa el corte.
    //   uTinteTr el color de esas dos cosas — sale del acento del aire, nunca de un gris fijo.
    //   uGolpe   escala el cuadro entero alrededor de su centro. Es el punch-in: el gesto de montaje
    //            mas usado del formato vertical y el unico que no mueve nada de lado, asi que sirve
    //            donde un empuje se leeria como que la pieza se fue de eje.
    //   uPersiana 0..1: cuantas lamas horizontales tapan el cuadro. Cierra antes del corte y abre
    //            despues, asi que el salto ocurre detras de ellas — igual que el barrido, pero
    //            partido en seis y en el eje que el formato pide.
    uEmpuje: { value: 0 }, uEmpujeY: { value: 0 }, uBarrido: { value: 0 }, uAnchoBar: { value: 0.16 },
    //   uEstela  0..1: desenfoque RADIAL. Seis muestras sobre la recta que va del centro al pixel, asi
    //            que es un zoom-blur y no un desenfoque parejo: arrastra hacia afuera y deja el centro
    //            nitido. Es el efecto que convierte un punch en un GOLPE — sin el, un zoom rapido se
    //            lee como que la camara se movio; con el, como que algo estallo.
    uGolpe: { value: 0 }, uPersiana: { value: 0 }, uEstela: { value: 0 },
    uIris: { value: 0 }, uTajo: { value: 0 },
    uTinteTr: { value: new THREE.Color('#5b6cff') },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uT, uGrano, uVinieta, uAberr, uFlash;
    uniform float uEmpuje, uEmpujeY, uBarrido, uAnchoBar, uGolpe, uPersiana, uEstela, uIris, uTajo; uniform vec3 uTinteTr;
    uniform float uVinForma, uVinAsp; uniform vec2 uVinCentro;
    uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      // EMPUJE: el cuadro entero se corre. Lo que queda del otro lado NO se estira (una muestra
      // clampeada se lee como un manchon barato): se pinta con el color de la transicion, que es el
      // acento del aire. Asi el empuje se lee como una carta que entra, con su propio borde.
      // GOLPE: se escala la UV alrededor del centro ANTES de muestrear, asi que es un zoom optico y
      // no un escalado del resultado — no hay doble remuestreo ni bordes blandos. Va junto al empuje
      // porque los dos son el mismo remapeo y compartir la muestra los hace gratis.
      // TAJO: el cuadro se parte por una diagonal y las dos mitades se van para lados opuestos. Va
      // DENTRO de este remapeo y no en un paso aparte: sumado aca comparte la unica muestra que hace el
      // pase, y resuelto despues costaria un segundo muestreo del cuadro entero para el mismo dibujo.
      // La diagonal no es a 45 grados —seria la del cuadrado, y este cuadro es 9:16— sino inclinada un
      // 35%, que es lo que hace que el corte cruce la altura util y no una esquina.
      float ladoTajo = step(0.0, vUv.y - (0.5 + (vUv.x - 0.5) * 0.35));
      vec2 uvp = (vUv - 0.5) / max(0.05, 1.0 + uGolpe) + 0.5
               - vec2(uEmpuje, uEmpujeY)
               + vec2((ladoTajo > 0.5 ? 1.0 : -1.0) * uTajo, 0.0);
      bool fueraEmp = uvp.x < 0.0 || uvp.x > 1.0 || uvp.y < 0.0 || uvp.y > 1.0;
      vec2 uvs = clamp(uvp, 0.0, 1.0);
      vec2 c = uvs - 0.5; float r2 = dot(c,c);
      vec2 des = c * uAberr * r2 * 4.0;
      vec4 col;
      col.r = texture2D(tDiffuse, uvs + des).r;
      col.g = texture2D(tDiffuse, uvs).g;
      col.b = texture2D(tDiffuse, uvs - des).b;
      col.a = 1.0;
      if (fueraEmp) col.rgb = uTinteTr;
      // La aberracion sigue usando el r2 crudo de arriba: es una propiedad de la LENTE, no de la
      // exposicion, y moverla con la viñeta habria cambiado el color de los bordes en los once aires.
      // (Sin comillas invertidas en este comentario: esta DENTRO del template literal del shader y una
      // sola lo cierra. Costo una tanda de renders con la pagina sin cargar y sin mensaje util.)
      // LAS DOS NORMAS TIENEN QUE LLEGAR AL MISMO MAXIMO o la forma no hace nada. El ovalo es dot(dv,dv)
      // y toca 0.50 en la esquina; la norma del maximo al cuadrado toca 0.25 en el borde, o sea la
      // MITAD, asi que con los mismos umbrales la caja apenas oscurecia y forma 0.90 se veia igual que
      // forma 0. Se vio restando dos renders del mismo aire: la diferencia era plana. El x2 las pone en
      // la misma escala — la caja llega a 0.50 en los cuatro lados, que es justo lo que se busca.
      vec2 dv = (uvs - uVinCentro) * vec2(uVinAsp, 1.0);
      float ovalo = dot(dv, dv);
      float caja = max(abs(dv.x), abs(dv.y));
      col.rgb *= mix(1.0, smoothstep(0.95, 0.10, mix(ovalo, 2.0 * caja * caja, uVinForma)), uVinieta);
      // GRANO DE EMULSION, no ruido plano. Este pase corre ANTES del OutputPass, o sea en luz LINEAL,
      // y sumar una amplitud FIJA ahi es lo que le comia el negro a los nueve aires oscuros: sobre un
      // fondo de 0.0007 lineal, un ±0.0275 se convierte despues de la curva sRGB en ±46/255, y encima
      // la mitad negativa se recorta en cero, lo que SUBE la media. Medido antes de esto: nocturno
      // declara un negro de 2/255 y entregaba 19; tecnico 6 -> 22; artesanal 11 -> 29. Los nueve
      // terminaban en el mismo gris ruidoso, o sea que el negro que cada aire eligio no llegaba nunca.
      //
      // Una emulsion real no granula asi. El grano son cristales de plata REVELADOS: donde no llego luz
      // no hay nada que revelar y donde se saturo esta todo revelado — el ruido vive en los MEDIOS. El
      // peso se calcula en espacio perceptual (la raiz de gamma) porque "medio tono" es una nocion del
      // ojo, no del sensor: en lineal, 0.5 ya es un gris clarisimo.
      float lumG = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
      float lumP = pow(clamp(lumG, 0.0, 1.0), 0.4545);
      float pesoG = 4.0 * lumP * (1.0 - lumP);            // 0 en negro y en blanco, 1 en el medio
      // PENDIENTE DE MIRAR EN UNA PAGINA OSCURA. El grano tambien hace de dither, asi que quitarlo del
      // negro podria dejar ver bandas en un degradado muy oscuro. Medido sobre la unica captura en
      // cache —una pagina de mundo CLARO— no aparece: 94 niveles distintos en la zona contra 96 antes.
      // El caso de negro grande no se pudo probar todavia; si aparece bandeo, el arreglo es un piso
      // chico en pesoG (sin comillas invertidas en este comentario: esta dentro del shader), no
      // volver al ruido plano.
      col.rgb += (hash(vUv * uRes + vec2(uT*71.3, uT*37.7)) - 0.5) * uGrano * pesoG;
      // BARRIDO: una banda solida cruza el cuadro y TAPA el corte. El cambio de escena ocurre cuando
      // la banda esta encima, asi que el espectador nunca ve el salto — ve pasar una cosa. En 9:16 va
      // en diagonal: una banda vertical en un cuadro tan alto se lee como una persiana.
      if (uBarrido > 0.0001) {
        float d = abs((vUv.x + (vUv.y - 0.5) * 0.35) - uBarrido);
        if (d < uAnchoBar) col.rgb = mix(col.rgb, uTinteTr, smoothstep(uAnchoBar, uAnchoBar * 0.55, d));
      }
      // ESTELA: desenfoque radial de seis muestras. Se hace DESPUES de la aberracion y antes de la
      // vinieta, o sea sobre la imagen ya compuesta, porque lo que arrastra es el CUADRO y no una capa.
      // El centro queda intacto por construccion —la distancia al centro escala el paso— y eso es lo que
      // lo hace un golpe y no una borrosidad: el ojo sigue teniendo donde apoyarse.
      if (uEstela > 0.0001) {
        vec2 dir = (uvs - 0.5) * uEstela * 0.14;
        vec3 acc = col.rgb;
        for (int k = 1; k < 6; k++) {
          acc += texture2D(tDiffuse, uvs - dir * (float(k) / 5.0)).rgb;
        }
        col.rgb = acc / 6.0;
      }
      // PERSIANA: seis lamas horizontales que crecen desde su propio eje hasta juntarse. Con uPersiana
      // en 1 el cuadro esta tapado entero y ahi ocurre el corte. Es el gesto vertical equivalente al
      // barrido, y en 9:16 el eje horizontal es el que el formato tiene de sobra.
      if (uPersiana > 0.0001) {
        float lama = abs(fract(vUv.y * 6.0) - 0.5) * 2.0;
        col.rgb = mix(col.rgb, uTinteTr, step(lama, uPersiana));
      }
      // IRIS: un obturador circular que se cierra desde el borde hacia el centro. Es el unico corte
      // RADIAL del grupo —barrido, persiana y tajo son todos rectos— y por eso es el que sirve cuando la
      // escena que sale compone al centro: el cuadro se cierra sobre el sujeto en vez de cruzarlo.
      // El radio se mide contra la ESQUINA y no contra el borde: medido contra el borde, el circulo
      // toca los cuatro lados con uIris en 1 pero las cuatro esquinas siguen mostrando imagen, y el
      // corte ocurre con el cuadro a medio tapar.
      if (uIris > 0.0001) {
        float rEsq = length(vec2(0.5, 0.5) * vec2(uRes.x / max(1.0, uRes.y), 1.0));
        float d = length((vUv - 0.5) * vec2(uRes.x / max(1.0, uRes.y), 1.0));
        // SE TIÑE DE AFUERA HACIA ADENTRO, y el sentido del smoothstep es todo el efecto. Escrito al
        // reves —tiñendo lo que queda DENTRO del radio— con uIris en 0 el radio vale el de la esquina y
        // la mascara cubre el cuadro entero: el primer render salio con un ovalo de acento tapando todo
        // antes de que la transicion empezara. Un obturador que se cierra pinta el BORDE y deja ver el
        // centro hasta el ultimo instante.
        // Borde blando de un pelo: a canto duro el circulo escalona sobre un cuadro de 1080 de ancho.
        float rIris = rEsq * (1.0 - uIris);
        col.rgb = mix(col.rgb, uTinteTr, smoothstep(rIris - 0.004, rIris + 0.004, d));
      }
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
    // SIN CURVA DE TONO, Y ESTA VEZ ESTA MEDIDO. Probar ACES Filmic era una de las tres palancas de
    // calidad de imagen que se evaluaron; se rechazo con dos cuadros del mismo spec, uno por polaridad:
    //   - Mundo CLARO (apertura): la saturacion media cayo de 50.4 a 33.9, un 33% menos. El azul de la
    //     marca —que en basecamp es #2377d2 y sale del sitio, no de un gusto— se lava hasta casi gris.
    //   - Mundo OSCURO (sello): el blanco puro dejo de ser blanco. El circulo y las barras salieron
    //     GRISES, y la luma media bajo de 106.3 a 94.3.
    // ACES existe para comprimir altas luces de una escena con luz FISICA. Acá el blanco no es una alta
    // luz: es una decision grafica, y el acento no es un color iluminado sino la marca del cliente. Una
    // curva que los reinterpreta esta corrigiendo algo que nadie rompio. La pieza se autoriza en sRGB y
    // se entrega en sRGB; el unico tratamiento de luz que corresponde es el bloom, que ya esta
    // calibrado aire por aire.
    this.renderer.toneMapping = THREE.NoToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = hex(LOOK.bg)
    this.fov = 30
    this.camera = new THREE.PerspectiveCamera(this.fov, this.W / this.H, 0.1, 400)
    this.distBase = (this.mundoH / 2) / Math.tan((this.fov * Math.PI / 180) / 2)
    this.camera.position.set(0, 0, this.distBase)

    // ---------------------------------------------------------------- NIEBLA DE PROFUNDIDAD
    //
    // Lo que separa un cuadro 3D de un collage es que lo lejano se DESVANEZCA hacia el fondo. Hasta
    // aca todos los objetos llegaban con el mismo contraste estuvieran donde estuvieran, asi que la
    // columnata —siete monolitos que se van hasta z -8.7— se leia como siete rectangulos recortados y
    // pegados, no como una fila que se aleja.
    //
    // Y HAY UN DETALLE TECNICO QUE LA VUELVE MEJOR DE LO QUE SUENA. `THREE.Fog` la aplican los
    // materiales de three; los 25 ShaderMaterial escritos a mano de este motor —el fondo, todas las
    // mascaras de texto— la ignoran, porque nadie les escribio la niebla. Eso que parece una
    // inconsistencia es exactamente lo deseable: el TEXTO queda nitido pase lo que pase, el FONDO
    // queda como lo autorizo el aire, y solo la geometria gana profundidad. Una niebla que empañara
    // la tipografia seria un defecto, no un efecto.
    //
    // EL RANGO ARRANCA DETRAS DEL PLANO DE COMPOSICION, y esto es lo unico delicado. La camara esta a
    // `distBase` del centro del mundo, que es donde componen casi todas las escenas: si la niebla
    // empezara antes, TODO se empañaria y la pieza saldria lavada. Empieza un 6% mas lejos que ese
    // plano, asi que lo que compone en el eje no se toca y solo se desvanece lo que de verdad esta
    // atras. El color es el del fondo: desvanecer hacia otro color no es distancia, es un velo.
    const niebla = (spec.__aire && spec.__aire.pelicula && spec.__aire.pelicula.niebla)
    if (niebla !== 0) {
      const k = niebla == null ? 1 : niebla          // 1 = el rango de referencia; mas alto, mas cerrada
      this.scene.fog = new THREE.Fog(hex(LOOK.bg), this.distBase * 1.06,
                                     this.distBase * (1.06 + 0.72 / Math.max(0.25, k)))
    }

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
    // ---------------------------------------------------------------- HALACION
    // El halo CALIDO alrededor de las altas luces. En pelicula quimica la luz fuerte atraviesa la
    // emulsion, rebota contra el soporte y vuelve a exponerla desde atras — y como la capa roja es la
    // ultima, lo que vuelve viene teñido. Por eso un neon blanco en film tiene un aura naranja y en
    // digital no tiene ninguna.
    //
    // UnrealBloomPass compone CINCO mips y expone `bloomTintColors`, uno por mip. El mip 0 es el halo
    // pegado al objeto y el 4 el mas ancho: la halacion vive en los ANCHOS, porque es luz que viajo.
    // Teñir los cinco pintaria el borde del objeto y eso ya no es halacion, es un filtro de color.
    //
    // Sin declararlo los cinco quedan en blanco, que es el estado de siempre: ningun aire existente
    // cambia sin que alguien lo decida.
    if (pel.halacion && pel.halacion.color) {
      const c = hex(pel.halacion.color)
      const f = pel.halacion.fuerza == null ? 0.5 : pel.halacion.fuerza
      // mip 3 a media fuerza y mip 4 entero: el tinte crece con el ancho del halo, igual que la luz
      // que mas lejos viajo es la que mas capas atraveso.
      for (const [i, k] of [[2, 0.25], [3, 0.6], [4, 1.0]]) {
        const v = this.bloom.bloomTintColors[i]
        v.set(1 + (c.r - 1) * f * k, 1 + (c.g - 1) * f * k, 1 + (c.b - 1) * f * k)
      }
    }
    const u = this.pelicula.uniforms
    if (pel.grano != null) u.uGrano.value = pel.grano
    if (pel.vinieta != null) u.uVinieta.value = pel.vinieta
    if (pel.aberr != null) u.uAberr.value = pel.aberr
    if (pel.vinietaForma != null) u.uVinForma.value = pel.vinietaForma
    if (pel.vinietaCentro) u.uVinCentro.value.set(pel.vinietaCentro[0], pel.vinietaCentro[1])
    if (pel.vinietaAsp != null) u.uVinAsp.value = pel.vinietaAsp
    // La energia de camara la aplica `configurar()` en el kit, que expone CAM y los verbos dolly() y
    // orbita(). Aca vivia `this.camaraE`, un campo que se asignaba y no leia NADIE en todo el motor:
    // los once aires declaraban su camara y las once piezas la movian igual.
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
    // SUPERMUESTREO. EL `antialias: true` DEL RENDERER NO HACIA NADA.
    //
    // Ese flag solo antialiasa el backbuffer del canvas, y por acá no pasa un solo triangulo: TODA la
    // escena se dibuja dentro del composer, en render targets propios. Un render target sin `samples`
    // no tiene multimuestreo. O sea que el motor venia rasterizando sin antialiasing DE NINGUN TIPO —
    // de ahi el borde escalonado en la geometria y el hormigueo de los filetes finos entre cuadros.
    //
    // POR QUE SUPERMUESTREO Y NO MSAA. El MSAA arregla el borde del TRIANGULO y nada mas. Acá el
    // contenido dominante es tipografia rasterizada en canvas 2D y pegada como TEXTURA sobre un plano:
    // para el MSAA ese plano es un rectangulo con dos bordes limpios, y el filo de cada letra —que es
    // interior a la textura— le resulta invisible. Dibujar todo al doble y promediar de a cuatro si lo
    // toma, porque promedia PIXELES, no siluetas.
    //
    // EL CANVAS SIGUE EN 1080x1920. Solo crecen los buffers internos. El OutputPass, que es el ultimo y
    // va a pantalla, estira la textura del doble sobre el viewport del canvas: cada pixel de salida cae
    // exactamente en la esquina de cuatro texels, asi que el bilineal da el promedio exacto de 2x2. Es
    // una caja perfecta, no una interpolacion aproximada. Y tiene que seguir en 1x porque `frameCon`
    // acumula las muestras del obturador copiando ESTE canvas a uno 2D del tamaño final.
    const SS = 2
    const rt = new THREE.WebGLRenderTarget(this.W * SS, this.H * SS, { type: THREE.HalfFloatType, colorSpace: THREE.SRGBColorSpace })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    // Umbral 0.62 con base negra: sólo florecen el acento y el blanco. Sobre negro el bloom es la
    // herramienta principal — es lo que hace que un color se lea como LUZ y no como pintura.
    // LA RESOLUCION DEL BLOOM QUEDA EN 1x A PROPOSITO, aunque los buffers ahora vayan al doble.
    // UnrealBloomPass arma cinco mips a partir de ESTE numero y desenfoca cada uno con un nucleo fijo
    // en pixeles. Si se le pasara el tamaño supermuestreado, cada mip cubriria la mitad del cuadro y el
    // halo se cerraria a la mitad: el supermuestreo, que es una decision de nitidez, terminaria
    // recalibrando el tratamiento de luz de los once aires de un plumazo. Leyendo del buffer grande y
    // resolviendo en mips chicos, el halo mide lo mismo que siempre. El bloom es borroso por
    // definicion: que su fuente sea de mayor resolucion no le agrega nada.
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
        // LA TIRA VIAJA EN EL SPEC, NO EN LOS DATOS, y `pantalla` la pedia como `d.tira`. Como el guion
        // recibe solo `spec.datos`, ese campo era SIEMPRE undefined y la escena no se podia elegir
        // jamas: medido sobre 200 guiones, 0%. No es que perdiera contra `mesa` —que es lo que supuse
        // y escribi en el informe— es que su requisito leia de un objeto donde el dato no vive. La
        // escena estaba escrita, verde en las compuertas y muerta en produccion.
        datos: { ...this.spec.datos, tira: !!this.spec.tira },
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
    // EL MOSTRADOR ARRANCA EN CERO EN CADA PIEZA. Sin esto, un proceso que arma dos videos seguidos
    // —el arnes de las compuertas hace exactamente eso— reparte a la segunda pieza las frases que
    // sobraron de la primera, y el render deja de ser reproducible desde el spec.
    reiniciarReparto()
    reiniciarRecortes()
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
        // ¿EL MUNDO ES CLARO? Estaba en el arnes de pruebas y NO estaba aca, asi que en el render de
        // verdad `ctx.claro` llegaba undefined y toda escena que lo consulta creia estar siempre en un
        // mundo oscuro. Los heroes que mezclan aditivo —el enjambre, el cristal, la cinta— sumaban luz
        // sobre blanco: el enjambre salia COMPLETAMENTE INVISIBLE en las paginas claras, que son cinco
        // de cada siete. En oscuro andaban perfecto, asi que el defecto no aparecia nunca mirando la
        // demo. Un contrato que solo se cumple en el arnes es un contrato que no existe.
        claro: CLARO,
        // LA TIRA TIENE DUENO CUANDO DOS ESCENAS LA QUIEREN. Ver la nota larga en guion.js sobre
        // DUENO: `pantalla` ES la tira y `mesa` tiene con que sustituirla, asi que cuando las dos
        // entran en la misma pieza la tira es de `pantalla` y `mesa` baja a su recorte.
        //
        // Se resuelve MIRANDO EL PLAN ENTERO y no acumulando lo que ya se uso, y esa diferencia es la
        // que hace que no dependa del orden: con un acumulador, `mesa` antes que `pantalla` se
        // quedaba con la tira y dejaba a `pantalla` sin nada que mostrar, que es peor que el defecto
        // que se estaba arreglando.
        sinTira: mod.meta.id !== DUENO.tira && (this.guionUsado || []).includes(DUENO.tira),
      }
      repeticiones.set(mod.meta.id, (repeticiones.get(mod.meta.id) || 0) + 1)
      const r = await mod.build(ctx)
      if (r.heroUsado) {
        this.heroUsado = r.heroUsado
        // TODOS los heroes usados, no solo el ultimo. Una pieza de 30 s trae tres escenas de hero con
        // tres objetos distintos, y con un solo campo el informe decia que la pieza uso uno.
        ;(this.heroesUsados || (this.heroesUsados = [])).push(r.heroUsado)
      }
      // UNA ESCENA QUE SE DECLARA VACIA NO SE CUELGA.
      //
      // El contrato dice que una escena sin material devuelve `vacia: true` y un grupo vacio con la
      // duracion correcta — "la pieza no se descoloca y el hueco se ve, que es lo que hay que poder
      // ver", dice `pantalla`. Pero ESTE lado del contrato no existia: main.js nunca leyo el campo y
      // colgaba la escena igual. El resultado no es un hueco que se ve: son los beats enteros de esa
      // escena con el fondo pelado. Medido en `marquesina`: 2.9 a 4.2 segundos de nada.
      //
      // Se saltea Y NO SE AVANZA EL BEAT, que es lo que lo vuelve honesto: las escenas siguientes se
      // corren hacia adelante y `this.dur` —que sale del total de beats— se achica solo. La pieza
      // queda mas corta en vez de tener un agujero. Una pieza de 22 s que dice algo todo el tiempo es
      // mejor que una de 25 con tres segundos muertos.
      //
      // Esto ademas cierra la FAMILIA y no un caso: hoy se declaran vacias `titular` (cuando su
      // textura no sobrevive al veto de laminas), `pantalla` (sin tira), `bandera` y `gancho` (sin
      // marca o sin claim) y `marquesina`. Arreglar solo el requisito de marquesina tapaba uno.
      if (r.vacia) {
        if (r.tl) r.tl.kill()
        continue
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

    // ---------------------------------------------------------------- TRANSICIONES
    // ANTES: TODO corte era duro + un flash de dos frames, SIEMPRE. Con doce escenas en el catalogo,
    // una pieza de treinta segundos daba diez cortes idénticos: el montaje era la única dimensión del
    // motor que no variaba nunca, ni entre piezas ni dentro de la misma.
    //
    // POR QUE VAN EN EL PASE DE POST Y NO EN LA ESCENA 3D. Un barrido o un empuje "de verdad" pide
    // las DOS escenas visibles a la vez, y `seek()` prende una sola por ventana a proposito. Peor: en
    // el solape las dos animarian la MISMA camara —cada escena la mueve y tiene que devolverla— y
    // ganaria la que corre ultima por start-time, o sea que el corte dependeria del orden de creacion
    // de los tweens. Hechas sobre el cuadro ya compuesto no tocan nada de eso: el cambio de escena
    // sigue siendo instantaneo y lo que viaja es la imagen.
    //
    // EL AIRE OPINA. Una pieza de lujo no corta como una de deporte: `transiciones` en el aire declara
    // con que reparte. Sin declararlo, el reparto por defecto es el de ANTHEM (mayoria de cortes duros
    // y algun flash), asi que ningun aire existente cambia de comportamiento sin que alguien lo decida.
    const fps = this.spec.fps || 30
    const dosFrames = 2 / fps
    const REPARTO_BASE = ['corte', 'corte', 'flash', 'barrido', 'empuje', 'corte']
    // Se FILTRA contra el vocabulario: un aire que escriba 'persiana' por error caeria en un `else`
    // silencioso y sus cortes saldrian todos duros sin que nada lo diga. Filtrado, el gesto invalido
    // desaparece del reparto y adn-check lo caza antes de que llegue a un video.
    const declarado = (AIRE && Array.isArray(AIRE.transiciones))
      ? AIRE.transiciones.filter(x => MONTAJES.includes(x)) : []
    const reparto = declarado.length ? declarado : REPARTO_BASE
    this.pelicula.uniforms.uTinteTr.value = hex(LOOK.acento)

    const montaje = []
    for (let i = 1; i < this.escenas.length; i++) {
      const e = this.escenas[i]
      // La eleccion sale del PRNG sembrado de la pieza: misma semilla, mismo montaje. Y NUNCA dos
      // cortes iguales seguidos — que es lo que convertia el flash en un tic en vez de un acento.
      let tipo = reparto[Math.floor(this.rnd() * reparto.length) % reparto.length]
      // NUNCA DOS GESTOS IGUALES SEGUIDOS — eso es lo que convertia el flash en un tic en vez de un
      // acento. Pero la version anterior caia SIEMPRE en 'corte', y eso le comia el caracter justo a
      // los aires que mas lo declaran: `jugueton` tiene cinco de seis gestos con movimiento y medido
      // en un render de 15 s, la mitad de sus cortes salian secos. Un aire que dijo "yo casi no corto
      // duro" terminaba cortando duro por una regla de desempate.
      //
      // Ahora cae al PRIMER gesto distinto del reparto, y eso le da un significado declarable a la
      // primera posicion: es el gesto por defecto del aire. Los repartos que arrancan con 'corte'
      // —nueve de once, incluido tecnico— se comportan exactamente igual que antes.
      if (tipo === this._ultimaTr && tipo !== 'corte') tipo = reparto.find(x => x !== tipo) || 'corte'
      this._ultimaTr = tipo
      // Queda ANOTADO en el plan. Sin esto, para saber que gesto le toco a cada corte habia que
      // mirar el video cuadro por cuadro y adivinar — y adivinar es como se dan por buenas cosas que
      // no pasaron. El montaje es la dimension mas dificil de ver en un still, asi que se escribe.
      montaje.push(tipo)

      if (tipo === 'flash') {
        this.tl.set(this.pelicula.uniforms.uFlash, { value: 0.85 }, e.t0 - dosFrames * 0.5)
        this.tl.to(this.pelicula.uniforms.uFlash, { value: 0, duration: dosFrames, ease: 'power2.in' }, e.t0 - dosFrames * 0.5)
      } else if (tipo === 'barrido') {
        // La banda TAPA el corte: entra antes del cambio de escena y sale despues, asi que el salto
        // ocurre debajo de ella. Medio beat en total — mas y se lee como una escena propia.
        const d = b(0.5)
        // immediateRender:false o el fromTo escribe su valor inicial AL CREARSE y la banda queda
        // plantada en el cuadro desde el segundo cero. Es la misma disciplina que siguen todas las
        // escenas y aca me la saltee: se vio en el video como una franja de acento permanente.
        this.tl.fromTo(this.pelicula.uniforms.uBarrido, { value: -0.25 }, { value: 1.25, duration: d, ease: 'power2.inOut', immediateRender: false }, e.t0 - d / 2)
        this.tl.set(this.pelicula.uniforms.uBarrido, { value: 0 }, e.t0 + d / 2)
      } else if (tipo === 'empujeV') {
        // EL EJE DEL FORMATO. En 9:16 el desplazamiento vertical es el gesto que el ojo ya tiene
        // aprendido de mirar feeds, asi que se lee como avance y no como efecto. Va MAS CORTO que el
        // horizontal —0.30 de UV contra 0.42— porque el cuadro es casi el doble de alto: el mismo
        // valor de UV recorre el doble de pixeles y el empuje se leia como un salto de pagina.
        const dirV = (i % 2 === 0) ? 1 : -1
        const dv = b(0.34)
        this.tl.fromTo(this.pelicula.uniforms.uEmpujeY, { value: 0 }, { value: 0.30 * dirV, duration: dv, ease: 'power3.in', immediateRender: false }, e.t0 - dv)
        this.tl.fromTo(this.pelicula.uniforms.uEmpujeY, { value: -0.30 * dirV }, { value: 0, duration: dv, ease: 'power3.out', immediateRender: false }, e.t0)
      } else if (tipo === 'golpe') {
        // PUNCH-IN. Se acerca de golpe ANTES del corte y vuelve despues: el cuadro saliente se va
        // creciendo y el entrante llega asentandose. 0.18 de escala son un 18% y es mucho — a menos
        // no se lee como gesto, y a mas la pieza pierde el encuadre que cada escena calibro.
        const dg = b(0.30)
        this.tl.fromTo(this.pelicula.uniforms.uGolpe, { value: 0 }, { value: 0.18, duration: dg, ease: 'power3.in', immediateRender: false }, e.t0 - dg)
        this.tl.fromTo(this.pelicula.uniforms.uGolpe, { value: -0.12 }, { value: 0, duration: dg * 1.2, ease: 'power3.out', immediateRender: false }, e.t0)
        // La estela acompaña al punch y se apaga MAS RAPIDO que el: un zoom que ya freno y sigue
        // arrastrando se lee como un cuadro fuera de foco, que es lo contrario de un acento.
        this.tl.fromTo(this.pelicula.uniforms.uEstela, { value: 0 }, { value: 1, duration: dg, ease: 'power3.in', immediateRender: false }, e.t0 - dg)
        this.tl.to(this.pelicula.uniforms.uEstela, { value: 0, duration: dg * 0.7, ease: 'power2.out' }, e.t0)
      } else if (tipo === 'persiana') {
        // Cierra en un tercio de beat y abre en otro. El corte cae con las lamas cerradas, asi que el
        // salto no se ve; lo que se ve es el mecanismo. Va mas rapido que el barrido porque son seis
        // eventos simultaneos y el ojo los integra: medio beat cerrando se leia como una pausa.
        const dp = b(0.30)
        this.tl.fromTo(this.pelicula.uniforms.uPersiana, { value: 0 }, { value: 1, duration: dp, ease: 'power2.in', immediateRender: false }, e.t0 - dp)
        this.tl.fromTo(this.pelicula.uniforms.uPersiana, { value: 1 }, { value: 0, duration: dp, ease: 'power2.out', immediateRender: false }, e.t0)
      } else if (tipo === 'atraviesa') {
        // ZOOM-THROUGH, Y NO ES UN GOLPE MAS GRANDE.
        //
        // El gesto pedido es que la camara atraviese la geometria de la escena que sale y salga del
        // otro lado en la que entra, para que la pieza se lea como un plano secuencia. Hecho con
        // camaras de verdad exige que una escena TERMINE con la camara adentro del objeto y que la
        // siguiente ARRANQUE ahi: acopla dos escenas que hoy son independientes y rompe el contrato
        // que verifica la compuerta en las 31 —cada escena devuelve la camara a su marca—. Ese
        // invariante es lo que permite reescribir una escena sin tocar ninguna otra, y no se cambia
        // por una transicion.
        //
        // Se resuelve entero en el pase de post, que es donde ya viven las otras ocho. La saliente se
        // agranda hasta tragarse el cuadro y la entrante NACE agrandada y se acomoda: el ojo lee un
        // solo movimiento continuo que cruza el corte. La estela radial es lo que lo vuelve un
        // atravesar en vez de dos zooms pegados — sin ella se ven las dos escalas por separado.
        //
        // Es el corte mas largo del repertorio (0.44 de beat contra 0.26 del tajo) porque es el unico
        // que tiene que leerse como CONTINUO: un gesto continuo necesita tiempo para que el ojo lo
        // integre, al reves que un golpe, que necesita no tenerlo.
        const da = b(0.44)
        this.tl.fromTo(this.pelicula.uniforms.uGolpe, { value: 0 }, { value: 1.75, duration: da, ease: 'power4.in', immediateRender: false }, e.t0 - da)
        this.tl.fromTo(this.pelicula.uniforms.uGolpe, { value: 1.75 }, { value: 0, duration: da * 1.15, ease: 'power3.out', immediateRender: false }, e.t0)
        this.tl.fromTo(this.pelicula.uniforms.uEstela, { value: 0 }, { value: 1, duration: da, ease: 'power3.in', immediateRender: false }, e.t0 - da)
        this.tl.to(this.pelicula.uniforms.uEstela, { value: 0, duration: da * 0.8, ease: 'power2.out' }, e.t0)
      } else if (tipo === 'iris') {
        // OBTURADOR CIRCULAR. Cierra sobre el centro y abre en el cuadro siguiente. Va un pelo mas
        // lento que la persiana —0.34 contra 0.30— porque un circulo que se cierra recorre mas camino
        // visible que seis lamas: al mismo tiempo se lee como un parpadeo y pierde el gesto.
        const di = b(0.34)
        this.tl.fromTo(this.pelicula.uniforms.uIris, { value: 0 }, { value: 1, duration: di, ease: 'power2.in', immediateRender: false }, e.t0 - di)
        this.tl.fromTo(this.pelicula.uniforms.uIris, { value: 1 }, { value: 0, duration: di, ease: 'power2.out', immediateRender: false }, e.t0)
      } else if (tipo === 'tajo') {
        // EL CUADRO SE PARTE EN DOS Y CADA MITAD SE VA PARA SU LADO. Es el corte mas violento del
        // repertorio, asi que va CORTO: en 0.26 de beat entra y sale, y lo que queda es la sensacion de
        // que algo lo abrio, no un efecto que se mira.
        //
        // El signo alterna por corte igual que el empuje: dos tajos seguidos hacia el mismo lado se
        // leen como una vibracion. La mitad de la separacion en cada lado —0.55 de UV— alcanza para que
        // ninguna de las dos mitades siga mostrando el centro del cuadro, que es donde estaba el sujeto.
        const dt = b(0.26)
        const dirT = (i % 2 === 0) ? 1 : -1
        this.tl.fromTo(this.pelicula.uniforms.uTajo, { value: 0 }, { value: 0.55 * dirT, duration: dt, ease: 'power3.in', immediateRender: false }, e.t0 - dt)
        this.tl.fromTo(this.pelicula.uniforms.uTajo, { value: -0.55 * dirT }, { value: 0, duration: dt, ease: 'power3.out', immediateRender: false }, e.t0)
      } else if (tipo === 'empuje') {
        // La saliente se va y la entrante llega DESDE EL OTRO LADO. El signo alterna por corte: dos
        // empujes seguidos en la misma direccion se leen como un scroll, no como un montaje.
        const dir = (i % 2 === 0) ? 1 : -1
        const d = b(0.34)
        // immediateRender:false en los DOS: sin eso, el ultimo fromTo creado deja el cuadro corrido
        // 0.42 de UV desde el arranque de la pieza y el video entero sale con una franja de acento
        // pegada a un costado. Lo delato mirar una tira de cuadros, no la compuerta.
        this.tl.fromTo(this.pelicula.uniforms.uEmpuje, { value: 0 }, { value: 0.42 * dir, duration: d, ease: 'power3.in', immediateRender: false }, e.t0 - d)
        this.tl.fromTo(this.pelicula.uniforms.uEmpuje, { value: -0.42 * dir }, { value: 0, duration: d, ease: 'power3.out', immediateRender: false }, e.t0)
      }
      // 'corte' no hace nada, y esa es exactamente su gracia: el corte duro sigue siendo la mayoria.
    }
    this.tl.pause(0)
    return { escenas: this.escenas.map(e => e.id), dur: this.dur, montaje }
  }

  // seek(t) — `t` es tiempo de ARCHIVO (lo que ve el que mira el video); la timeline corre en su
  // tiempo PROPIO, que no es el mismo cuando hay ajuste de tempo.
  //
  // `timeScale` cambia a que velocidad AVANZA una timeline, no como se la BUSCA: `tl.time(x)` pone su
  // tiempo local en x, sin escalar. Con el ajuste puesto —28 beats estirados a 30 segundos— buscar el
  // segundo 29 ponia la timeline en su local 29, dos segundos DESPUES de su duracion propia de 28: la
  // pieza quedaba congelada en su ultimo cuadro durante los dos segundos finales.
  //
  // No fallaba nada. El video duraba exactamente los 30 segundos pedidos, el guion decia lo correcto y
  // el ultimo cuadro era el cuadro correcto. Lo delato una sola metrica: quietud maxima 1.97 s, con el
  // desglose por escena mostrando 0.33 s como peor caso — o sea que la ventana quieta caia FUERA de
  // toda escena, que es justo lo que pasa cuando la pieza se acabo antes que el archivo.
  seek(t) {
    const esc = (this.ajuste && this.ajuste.escala) || 1
    const tt = Math.max(0, Math.min(this.dur, t)) * esc
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
      // La semilla viaja para que el fondo pueda variar dentro del aire (ver `configurar` en el kit).
      configurar(aire, spec.seed)
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
      montaje: info.montaje || [],
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
    // H.264 DIRECTO SI SE PUEDE, y se puede.
    //
    // Hasta ahora esto codificaba VP9 y despues backend/render3d.py lo TRANSCODIFICABA a H.264 con
    // libx264, porque VP9 en MP4 casi no se reproduce fuera de Chrome e Instagram lo rechaza. O sea
    // DOS codificaciones con perdida encadenadas: la segunda gastaba bits carisimos en preservar los
    // artefactos de la primera. Con grano de pelicula —que es ruido, o sea incompresible— una pieza de
    // 30 s terminaba pesando 112 MB.
    //
    // Chromium SI puede codificar H.264 High: probado con isConfigSupported, avc1.640028 (nivel 4.0) y
    // avc1.640033 (nivel 5.1) responden que si; el Baseline avc1.42E01F que se habia probado antes
    // responde que no, y de ahi venia la creencia de que no habia H.264. Una sola codificacion, sin
    // transcode, y el bitrate se controla de verdad en vez de pelearlo con un CRF.
    //
    // `format: 'annexb'` porque el flujo se guarda crudo y se REMUXEA con `-c copy`: annexb lleva los
    // SPS/PPS adentro de cada keyframe, asi que ffmpeg lo lee sin extradata. Con el formato `avc` por
    // defecto los chunks vienen con prefijo de longitud y sin cabecera, y hay que armar el avcC a mano.
    const codec = { W: s.W, H: s.H }
    this._codec = 'vp09.00.10.08'
    for (const c of ['avc1.640033', 'avc1.640028']) {
      try {
        const sop = await VideoEncoder.isConfigSupported({
          codec: c, width: s.W, height: s.H, bitrate: bitrate || 12e6, framerate: s.fps || 30,
          avc: { format: 'annexb' },
        })
        if (sop && sop.supported) { this._codec = c; break }
      } catch (e) { /* el navegador no lo conoce: se sigue probando */ }
    }
    void codec
    const cfg = {
      codec: this._codec, width: s.W, height: s.H,
      bitrate: bitrate || 12e6, framerate: s.fps || 30, latencyMode: 'quality',
    }
    if (this._codec.startsWith('avc1')) cfg.avc = { format: 'annexb' }
    this._enc.configure(cfg)
    return { codec: this._codec }
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
    return { n: this._chunks.length, bytes: this._chunks.reduce((n, c) => n + c.b.length, 0),
      codec: this._codec, err: null }
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
