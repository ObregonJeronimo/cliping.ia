// EL VOCABULARIO DE COMPOSICION DE BOVEDA — los seis tiempos, ya armados.
//
// POR QUE EXISTE, Y ES LA DECISION QUE HACE POSIBLE LLEGAR A CIENTAS
//
// `atrio` salio bien y costo caro: casi todo su archivo no es su idea —la columnata, el vuelo frontal—
// sino el trabajo de siempre. Medir el nombre contra el cuadro util, ponerle un filete, garantizarle
// una cama al claim porque atras pasan columnas iluminadas, elegir el recorte mas grande cuando no hay
// tira, quedarse con dos cifras y no con cinco. Nada de eso es de `atrio`: es de BOVEDA.
//
// Si la plantilla trece vuelve a resolver todo eso, cuesta lo mismo que la primera y nunca hay trece.
// Peor: cada una lo resolveria un poco distinto, y doce piezas de la misma marca dirian doce cosas.
//
// Asi que la division es esta, y es la que ordena el motor entero:
//
//     nucleo.js       COMO SE DIBUJA     texto, vidrio, luz, camas, el panel de la pagina
//     bloques.js      QUE SE CUENTA      los seis tiempos, compuestos y medidos            <- este
//     movimiento.js   COMO SE MUEVE      vuelos, entradas, salidas, paralaje, respiracion
//     plantillas/*    DONDE PASA         el espacio, los materiales, el ritmo — LA IDEA
//
// Una plantilla nueva es: inventar un espacio, elegir un vuelo, y COLOCAR estos bloques. Eso es un
// archivo de cien lineas con una idea adentro, no de trescientas con la misma cocina de siempre.
//
// ---------------------------------------------------------------- el contrato de un bloque
//
// Todo bloque devuelve `null` cuando la pagina no dio con que armarlo. NUNCA un placeholder, nunca un
// texto inventado: un hueco se compone, un dato falso firmado por la marca del cliente no se arregla.
//
// Cuando existe, devuelve:
//   `g`        un Group centrado en su propio contenido. Colocarlo en `y` significa "su centro va aca",
//              asi la plantilla nunca tiene que saber como esta armado por dentro.
//   `ancho`    `alto`   lo que ocupa, en unidades de mundo, YA MEDIDO. Para que la plantilla decida
//              distancias sin volver a medir.
//   `escribir(tl, t0, dur)`  el gesto de aparicion del TEXTO —la mascara que lo barre— separado de la
//              entrada del bloque. Los dos se componen: la palabra se escribe mientras el bloque
//              todavia esta llegando, que es exactamente como se ve caro.
//
// La ENTRADA y la SALIDA no son de aca sino de `movimiento.js`, y esto es a proposito: como se compone
// el nombre de una marca es igual en las doce, pero de donde entra volando es justamente lo que las
// diferencia.

import { THREE, letras, parrafo, cama, barra, panelPagina } from './nucleo.js'
import { LOOK, hex, nivel, nivelTexto, recortesDe, topeNitido, b } from '../demo/kit.js'

// EL MARGEN DE LA PAGINA, aplicado en UN solo sitio.
//
// `retrato.py` mide cuanto aire respira el diseno del cliente y lo devuelve como `margen`: 0.78 para un
// sitio apretado, 0.86 para uno que compone con mucho blanco. Replicar ese aire es la mitad de que la
// pieza se sienta de esa marca — y la otra mitad es no tener que acordarse de aplicarlo.
//
// Se resuelve aca y no en cada plantilla por la misma razon que `recetas.js` existe: dieciocho archivos
// multiplicando su propio `anchoMax` por su propia interpretacion del margen es como se consigue que
// dieciocho piezas de la misma marca dejen de parecer del mismo estudio.
//
// El valor NEUTRO es 0.88, que es con el que se compusieron las plantillas antes de que el retrato
// existiera: sin `margen`, todo queda exactamente como estaba.
const conMargen = (anchoMax, margen) =>
  (anchoMax == null || margen == null) ? anchoMax : anchoMax * (margen / 0.88)
import { D, sello, repartirFrases } from '../demo/datos.js'

// Escribir una malla de `letras`: la mascara la barre en vez de encenderla. `1.04` y no `1.0` porque el
// borde suave de la mascara se come el ultimo glifo si se para justo en el final.
const escribirUna = (m, tl, t0, dur) => {
  m.userData.u.uProg.value = 0
  tl.to(m.userData.u.uProg, { value: 1.04, duration: b(dur != null ? dur : 0.9), ease: 'power2.out' }, b(t0))
  return m
}
const borrarUna = (m, tl, t0, dur) =>
  tl.to(m.userData.u.uProg, { value: 0, duration: b(dur != null ? dur : 0.5), ease: 'power2.in' }, b(t0))

// LA CAMA SE VA CON EL TEXTO, y no despues.
//
// `borrar` apagaba el texto y dejaba la cama encendida hasta que `sale()` terminara de sacar el bloque
// del cuadro. Entre las dos cosas hay entre medio beat y un beat, y en ese hueco lo que se ve es UNA
// PLACA BLANCA VACIA en medio de la pieza. Aparecio en las fotos de `marea` y de `archivo`, y no es un
// defecto de esas dos: la cama la pone `bloques.js`, asi que el hueco existe en las dieciocho cada vez
// que un bloque con cama se borra antes de salir.
//
// Se apaga un pelin ANTES que el texto (0.1 beats) y mas rapido: una cama que se va despues de su
// texto deja el mismo hueco, solo que mas corto.
const irseLaCama = (cm, tl, t0) => {
  if (!cm) return
  tl.to(cm.material, { opacity: 0, duration: b(0.45), ease: 'power2.in' }, b(t0 - 0.1))
}
// Y VUELVE con el texto, por si el bloque se escribe mas de una vez. Sin esto, un bloque reescrito
// despues de borrarse sale sin fondo — que es peor que el hueco, porque ahi el texto compite con lo
// que la plantilla resulto poner detras.
const volverLaCama = (cm, tl, t0, op0) => {
  if (!cm) return
  tl.set(cm.material, { opacity: op0 }, b(t0))
}

// ---------------------------------------------------------------- 2 · MARCA
//
// El nombre grande y solo, con un filete que se abre debajo y —si la pagina dio rubro— una bajada.
//
// EL FILETE NO ES DECORACION: es lo que le da al nombre un gesto propio. Un texto que solo se escribe
// se lee como un subtitulo; un texto con una linea que se abre debajo se lee como una identidad. Cuesta
// una malla.
// ---------------------------------------------------------------- TINTA PROPIA: `op.tinta`
//
// Todo el texto de Boveda se pinta con `nivelTexto(k)`, que camina la rampa entre `bg` y `tinta` hasta
// pasar el piso de contraste CONTRA EL FONDO DEL MUNDO. Es la garantia que hace que treinta plantillas
// se lean sin medir cada una.
//
// La garantia tiene un limite y hasta ahora ninguna plantilla lo habia tocado: vale contra `bg` y
// `bg2`. Una plantilla que construye SU PROPIO SUELO —un campo que ocupa el cuadro entero y no es el
// fondo del mundo— cae afuera. `vortice` es la primera: su remolino es oscuro y saturado siempre,
// tambien cuando la pagina del cliente es blanca, porque eso es lo que se midio del genero que
// replica. En un mundo claro `nivelTexto` devuelve tinta OSCURA, y esa tinta sobre ese campo no se ve.
//
// `op.tinta` es la salida: la plantilla que se hace cargo del suelo se hace cargo tambien de la tinta.
// Por omision no cambia nada —sigue mandando `nivelTexto`— asi que las veintinueve anteriores no se
// enteran. Quien la usa asume la responsabilidad de medir su propio contraste, y por eso no es un
// atajo: es un traspaso explicito.
const conTinta = (op, k) => (op && op.tinta) || nivelTexto(k)

export function bloqueMarca(op) {
  op = op || {}
  const nombre = String(op.texto || D.marca || '').trim()
  if (!nombre) return null
  const g = new THREE.Group()
  const AM = conMargen(op.anchoMax, op.margen)
  let camaM = null
  const m = letras(nombre, op.alto != null ? op.alto : 1.5, conTinta(op, 0.94),
    { fuente: op.fuente || 'Anton', tracking: op.tracking != null ? op.tracking : 0.02, anchoMax: AM })
  // CAMA OPCIONAL, y apagada por defecto — al reves que en el claim.
  //
  // El nombre de la marca es lo unico de la pieza que tiene que verse como parte del espacio y no como
  // un cartel apoyado encima; una cama detras lo convierte en subtitulo. Pero hay plantillas donde el
  // fondo que le toca es claro y variable —`atrio` lo planta en un corredor con columnas de vidrio
  // iluminadas pasando por detras— y ahi `nivelTexto` no alcanza: garantiza contraste contra la paleta,
  // no contra lo que la plantilla resulto poner atras.
  //
  // La decision es de la plantilla porque solo ella sabe que hay detras. Se pide con `cama: true`.
  if (op.cama === true) {
    camaM = cama(m.userData.ancho, m.userData.alto, {
      opacidad: op.camaOpacidad != null ? op.camaOpacidad : 0.88,
      color: op.camaColor || nivel(0.03),
      holgX: m.userData.alto * 0.22, holgY: m.userData.alto * 0.20,
    })
    g.add(camaM)
  }
  g.add(m)

  let fil = null
  if (op.filete !== false) {
    fil = barra(m.userData.ancho, Math.max(0.02, m.userData.alto * 0.024), LOOK.acento, 1.5)
    fil.position.y = -m.userData.alto * 0.78
    fil.scale.x = 0.0001
    g.add(fil)
  }

  // El rotulo sale de `D.rotulo` o del primer sello. Si no hay ninguno, no hay bajada — y no pasa nada:
  // el nombre solo es una composicion valida, y es mejor que una bajada inventada.
  let rot = null
  const txtRot = op.rotulo === false ? '' : String(op.rotulo != null ? op.rotulo : (D.rotulo || sello(0) || '')).trim()
  if (txtRot) {
    rot = letras(txtRot, m.userData.alto * 0.135, conTinta(op, 0.70),
      { fuente: 'DMSans', tracking: 0.30, anchoMax: AM ? AM * 0.8 : undefined })
    rot.position.y = -m.userData.alto * 1.15
    g.add(rot)
  }

  return {
    g, malla: m, filete: fil, rotulo: rot,
    ancho: m.userData.ancho, alto: m.userData.alto * (rot ? 1.5 : 1.0),
    escribir(tl, t0, dur) {
      volverLaCama(camaM, tl, t0 - 0.15, op.camaOpacidad != null ? op.camaOpacidad : 0.88)
      escribirUna(m, tl, t0, dur != null ? dur : 1.1)
      if (fil) tl.to(fil.scale, { x: 1, duration: b(0.85), ease: 'power3.out' }, b(t0 + 0.55))
      if (rot) escribirUna(rot, tl, t0 + 0.75, 0.7)
    },
    borrar(tl, t0) {
      irseLaCama(camaM, tl, t0)
      borrarUna(m, tl, t0)
      if (fil) tl.to(fil.scale, { x: 0.0001, duration: b(0.4), ease: 'power2.in' }, b(t0))
      if (rot) borrarUna(rot, tl, t0)
    },
  }
}

// ---------------------------------------------------------------- 3 · PROMESA
//
// El claim de la pagina, partido en renglones. `cama` por defecto en `true` y no por medicion: en un
// espacio 3D el fondo del texto CAMBIA mientras se lee —pasa una columna, entra una luz—, asi que
// garantizar el fondo sale mas barato y mas confiable que medir el contraste caso por caso.
export function bloquePromesa(op) {
  op = op || {}
  const txt = String(op.texto || D.claim || '').trim()
  if (!txt) return null
  const p = parrafo(txt, op.alto != null ? op.alto : 0.60, conTinta(op, 0.93), {
    fuente: op.fuente || 'Bricolage', anchoMax: conMargen(op.anchoMax, op.margen) || 4.6,
    upper: op.upper === true, maxLineas: op.maxLineas || 3,
  })
  if (!p) return null
  const g = new THREE.Group()
  const OPC = op.camaOpacidad != null ? op.camaOpacidad : 0.91
  let cm = null
  if (op.cama !== false) {
    cm = cama(p.userData.ancho, p.userData.alto, { opacidad: OPC, color: op.camaColor || nivel(0.02) })
    g.add(cm)
  }
  g.add(p)
  return {
    g, parrafo: p, ancho: p.userData.ancho, alto: p.userData.alto,
    lineas: p.userData.lineas.length, recortado: p.userData.recortado,
    escribir(tl, t0, dur) {
      volverLaCama(cm, tl, t0 - 0.15, OPC)
      p.userData.escribir(tl, t0, dur != null ? dur : 0.9, op.paso != null ? op.paso : 0.3)
    },
    borrar(tl, t0) { irseLaCama(cm, tl, t0); p.userData.borrar(tl, t0) },
  }
}

// ---------------------------------------------------------------- 4 · PRUEBA
//
// LA PAGINA DEL CLIENTE COMO OBJETO. Es lo unico que ninguna plantilla generica puede fingir, y por eso
// ninguna de las doce se lo saltea.
//
// Tres calidades, en orden, y la plantilla no elige: usa la mejor que haya.
//   1. la TIRA — la captura scrolleable entera. Se ve la pagina de verdad, y se puede recorrer.
//   2. el RECORTE mas grande — una tarjeta, una foto. Sigue siendo la pagina, en un pedazo.
//   3. nada — y entonces devuelve `null`, y la plantilla compone sin este tiempo.
//
// `topeNitido` en la rama 2 no es un adorno: un recorte de 120 px dibujado a 900 sale pixelado, y eso
// se caza al construir por dos pesos en vez de mirando cuadros.
export function bloquePrueba(ctx, op) {
  op = op || {}
  const { texturas, datosEls, mundoW, W } = ctx
  const ancho = op.ancho || mundoW * 0.58
  const alto = op.alto || ancho * (op.ar != null ? op.ar : 1.6)

  const panel = panelPagina(texturas.get('tira'), ancho, alto, { desde: op.desde })
  if (panel) return marcoDe(panel, ancho, alto, 'tira', op)

  for (const e of recortesDe(datosEls, op.roles || ['foto', 'tarjeta', 'logo'], 1)) {
    const t = texturas.get(e.url)
    if (!t || !t.image) continue
    const ar = (t.image.width || 1) / (t.image.height || 1)
    const w = Math.min(ancho, topeNitido(t.image, W, mundoW, op.mag != null ? op.mag : 1.4))
    const h = w / Math.max(0.05, ar)
    const tt = t.clone(); tt.needsUpdate = true; tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = 8
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tt, toneMapped: false }))
    m.userData.tipoImagen = 'recorte'
    return marcoDe(m, w, h, 'recorte', op)
  }
  return null
}

// El marco de la pagina: cuatro filetes emisivos. Sin ellos, un plano con una captura flotando en un
// espacio 3D se lee como una textura pegada; con ellos, se lee como una PANTALLA.
function marcoDe(malla, ancho, alto, fuente, op) {
  // DOS GRUPOS Y NO UNO, y la razon es una colision que no da sintomas hasta el render.
  //
  // `entra(..., {desde:'fondo'})` escribe la ESCALA del grupo que le pasan, y el gesto de aparicion de
  // la pagina TAMBIEN es una escala. Con un solo grupo, la plantilla que quiera las dos cosas obtiene
  // una pagina que no se ve nunca: el `set` de `entra` en t=0 y el `fromTo` de `escribir` pelean por la
  // misma propiedad y gana el ultimo que corra.
  //
  //   `g`  el de afuera — lo mueve la PLANTILLA (entra, sale, respira).
  //   `gi` el de adentro — lo escala el BLOQUE. Nadie mas lo toca.
  const g = new THREE.Group()
  const gi = new THREE.Group()
  g.add(gi)
  gi.add(malla)
  if (op.marco !== false) {
    const gr = Math.max(0.02, alto * 0.008)
    const lados = [[ancho + gr * 2, gr, 0, alto / 2], [ancho + gr * 2, gr, 0, -alto / 2],
      [gr, alto, -ancho / 2, 0], [gr, alto, ancho / 2, 0]]
    for (const l of lados) {
      const bm = barra(l[0], l[1], LOOK.acento, 1.35)
      bm.position.set(l[2], l[3], 0.012)
      gi.add(bm)
    }
  }
  return {
    g, malla, ancho, alto, fuente,
    // La pagina no "se escribe": aparece por escala desde su propio centro, que en 3D se lee como que
    // la pantalla se enciende. Arranca en 0.0001 y no en 0 porque una escala exacta de cero deja la
    // matriz sin inversa y three tira un warning por cuadro.
    escribir(tl, t0, dur) {
      tl.fromTo(gi.scale, { x: 0.0001, y: 0.0001, z: 1 },
        { x: 1, y: 1, z: 1, duration: b(dur != null ? dur : 1.0), ease: 'power3.out', immediateRender: false }, b(t0))
    },
    // RECORRER LA PAGINA. Solo tiene sentido con la tira: es lo que demuestra que es una pagina de
    // verdad y no una foto. Con un recorte no hay nada que recorrer y devuelve sin hacer nada.
    recorrer(tl, t0, dur, cuanto) {
      const u = malla.userData
      if (fuente !== 'tira' || !u.tex) return
      const margen = 1 - (u.visible01 || 1)
      if (margen <= 0.001) return
      tl.fromTo(u.tex.offset, { y: margen * 0.5 },
        { y: margen * (cuanto != null ? cuanto : 0.98), duration: b(dur != null ? dur : 6), ease: 'none', immediateRender: false }, b(t0))
    },
  }
}

// ---------------------------------------------------------------- 5 · RAZONES
//
// Las cifras y las frases. LA PLANTILLA PIDE CUANTAS QUIERE Y RECIBE LAS QUE HAY: pedir tres y recibir
// una es normal, y la plantilla tiene que componer igual. Pedir tres y recibir tres inventadas seria
// otra cosa.
export function bloquesCifra(n, op) {
  op = op || {}
  const AM = conMargen(op.anchoMax, op.margen)
  const cifras = (D.datos || []).filter(d => d && d.valor).slice(0, n || 2)
  return cifras.map((c, i) => {
    const g = new THREE.Group()
    const v = letras(String(c.valor), op.alto != null ? op.alto : 1.15, conTinta(op, 0.95),
      { fuente: op.fuente || 'Anton', tracking: 0.01, anchoMax: AM })
    g.add(v)
    let et = null
    const txt = String(c.etiqueta || '').trim()
    if (txt) {
      et = letras(txt, v.userData.alto * 0.17, conTinta(op, 0.72),
        { fuente: 'DMSans', tracking: 0.16, anchoMax: AM })
      et.position.y = -v.userData.alto * 0.72
      g.add(et)
    }
    const anchoMayor = Math.max(v.userData.ancho, et ? et.userData.ancho : 0)
    const fil = barra(anchoMayor * 0.9, 0.028, LOOK.acento2 || LOOK.acento, 1.4)
    fil.position.y = -v.userData.alto * 0.52
    fil.scale.x = 0.0001
    g.add(fil)
    return {
      g, indice: i, valor: c.valor, etiqueta: txt,
      ancho: anchoMayor, alto: v.userData.alto * (et ? 1.0 : 0.8),
      escribir(tl, t0, dur) {
        escribirUna(v, tl, t0, dur != null ? dur : 0.75)
        tl.to(fil.scale, { x: 1, duration: b(0.6), ease: 'power3.out' }, b(t0 + 0.3))
        if (et) escribirUna(et, tl, t0 + 0.42, 0.6)
      },
      borrar(tl, t0) { borrarUna(v, tl, t0); if (et) borrarUna(et, tl, t0 + 0.08) },
    }
  })
}

// Las frases del sitio. Van por `repartirFrases`, que es el mismo mostrador que usa el otro motor: no
// se repite una frase que ya salio en otra parte de la pieza.
//
// EL SEGUNDO PARAMETRO ES UN BOOLEANO, `soloUnaLinea` — no un largo maximo. La primera version le
// pasaba `op.largoMax || 150`, o sea `true` siempre, y el mostrador devolvia CERO frases porque casi
// ninguna entra en un renglon. `atrio` perdio su bloque de frases y nada fallo: no hubo excepcion, no
// hubo aviso, simplemente cuatro beats sin nada. Lo caza la sonda contando mallas de texto, no la
// lectura del codigo — que es por lo que existe la sonda.
export function bloquesFrase(n, op) {
  op = op || {}
  const fs = repartirFrases(n || 2, op.unaLinea === true) || []
  return fs.filter(Boolean).map((f, i) => {
    const p = parrafo(String(f), op.alto != null ? op.alto : 0.34, conTinta(op, 0.90), {
      fuente: op.fuente || 'DMSans', anchoMax: conMargen(op.anchoMax, op.margen) || 3.4, upper: false,
      maxLineas: op.maxLineas || 2,
    })
    if (!p) return null
    const g = new THREE.Group()
    const OPF = op.camaOpacidad != null ? op.camaOpacidad : 0.90
    let cm = null
    if (op.cama !== false) {
      cm = cama(p.userData.ancho, p.userData.alto, { opacidad: OPF, color: op.camaColor || nivel(0.03) })
      g.add(cm)
    }
    g.add(p)
    return {
      g, indice: i, ancho: p.userData.ancho, alto: p.userData.alto,
      escribir(tl, t0, dur) {
        volverLaCama(cm, tl, t0 - 0.15, OPF)
        p.userData.escribir(tl, t0, dur != null ? dur : 0.8, 0.28)
      },
      borrar(tl, t0) { irseLaCama(cm, tl, t0); p.userData.borrar(tl, t0) },
    }
  }).filter(Boolean)
}

// ---------------------------------------------------------------- 6 · PEDIDO
//
// El CTA y el dominio. SI LA PAGINA NO DIO CTA, VA EL DOMINIO SOLO — nunca un "Conoce mas" inventado.
// Es la regla mas importante del motor y la mas facil de romper sin darse cuenta, porque un boton vacio
// se ve peor que uno con cualquier cosa escrita.
export function bloquePedido(op) {
  op = op || {}
  const cta = String(op.cta != null ? op.cta : (D.cta || '')).trim()
  const dom = String(op.dominio != null ? op.dominio : (D.dominio || '')).trim()
  if (!cta && !dom) return null
  const g = new THREE.Group()
  const altoT = op.alto != null ? op.alto : 0.44
  const AM = conMargen(op.anchoMax, op.margen)

  let pastilla = null, mCta = null
  if (cta) {
    mCta = letras(cta, altoT, conTinta(op, 0.97), { fuente: op.fuente || 'DMSans', tracking: 0.10, anchoMax: AM })
    // LA PASTILLA VA EN ACENTO PLENO Y EL TEXTO ENCIMA, no al reves. Un CTA es lo unico de la pieza que
    // tiene que pedir el click, asi que es el unico sitio donde el acento se usa como masa y no como
    // filete. El contraste lo garantiza `nivelTexto`, que camina la rampa hasta pasar el piso.
    pastilla = new THREE.Mesh(
      new THREE.PlaneGeometry(mCta.userData.ancho + altoT * 1.5, altoT * 2.2),
      new THREE.MeshBasicMaterial({ color: hex(LOOK.acento), transparent: true, opacity: 0.97, toneMapped: false, depthWrite: false }))
    pastilla.renderOrder = -1
    g.add(pastilla)
    g.add(mCta)
  }

  let mDom = null
  if (dom) {
    mDom = letras(dom, altoT * 0.62, conTinta(op, 0.80), { fuente: 'DMSans', tracking: 0.22, anchoMax: AM })
    mDom.position.y = cta ? -altoT * 2.1 : 0
    g.add(mDom)
  }

  const ancho = Math.max(pastilla ? pastilla.geometry.parameters.width : 0, mDom ? mDom.userData.ancho : 0)
  return {
    g, pastilla, ancho, alto: altoT * (cta && dom ? 4.4 : 2.2), tieneCta: !!cta,
    escribir(tl, t0, dur) {
      if (pastilla) {
        tl.fromTo(pastilla.scale, { x: 0.0001, y: 1, z: 1 },
          { x: 1, y: 1, z: 1, duration: b(dur != null ? dur : 0.7), ease: 'power3.out', immediateRender: false }, b(t0))
      }
      if (mCta) escribirUna(mCta, tl, t0 + 0.25, 0.6)
      if (mDom) escribirUna(mDom, tl, t0 + (mCta ? 0.75 : 0.1), 0.7)
    },
    // EL LATIDO. El CTA es lo ultimo que se ve y lo unico que tiene que quedar; un pulso lento en la
    // pastilla lo separa del resto sin agregar una sola malla. Va en `alSeek`, como todo lo continuo:
    // en un tween se evaluaria una vez por cuadro y el obturador lo barreria a saltos.
    latir(amp) {
      if (!pastilla) return null
      const a = amp != null ? amp : 0.035
      // MULTIPLICA, NO ASIGNA — y asignar era un defecto que se comia el gesto de apertura del CTA en
      // las DIECIOCHO plantillas.
      //
      // `escribir` abre la pastilla con un tween sobre `scale.x` de 0.0001 a 1. `seek()` corre la linea
      // de tiempo primero y `alSeek` despues, asi que este latido, asignando, pisaba ese tween entero:
      // durante los 0.7 beats de la apertura la pastilla ya valia ~1, o sea que el CTA aparecia a ancho
      // completo de golpe en vez de abrirse. Sin error y sin nada raro en el cuadro.
      //
      // Multiplicar compone: el tween pone el valor y el latido lo modula. Y multiplicar es seguro
      // —no acumula— justamente porque hay un tween que lo restablece en cada submuestra, que es la
      // otra mitad de la regla que documenta `movimiento.js:respirar`.
      return (t) => {
        pastilla.scale.y *= 1 + Math.sin(t * 3.1) * a
        pastilla.scale.x *= 1 + Math.sin(t * 3.1) * a * 0.45
      }
    },
  }
}
