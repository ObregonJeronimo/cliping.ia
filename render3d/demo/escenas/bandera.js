// ESCENA "bandera" — la marca CALADA sobre un campo de color a sangre.
//
// POR QUE EXISTE. Medido sobre 240 guiones, `apertura` salia en el 100% de las piezas. Se la hizo
// opcional y bajo al 74%, pero ese 74% seguia siendo LA MISMA IMAGEN: marco, rotulo, contadores, HUD,
// el nombre al centro. Una segunda apertura no agrega una escena mas al catalogo — parte en dos el
// unico cuadro que todo video del motor tenia garantizado.
//
// Y ES DELIBERADAMENTE LO CONTRARIO. `apertura` es un panel de instrumentos: mide el cuadro, lo acota,
// lo numera. Esta no mide nada. Un campo de color liso ocupando el cuadro entero, el nombre calado
// adentro, una banda del segundo acento y el dominio. Sin marco, sin HUD, sin contador. Si la
// alternativa se pareciera, no habria alternativa.
//
// EL COLOR ES EL DE LA MARCA, y esa es la otra razon de la escena. El motor ya extrae la paleta del
// sitio; hasta ahora el acento aparecia en filetes, halos y detalles. Aca es el cuadro entero durante
// seis beats, que es lo mas parecido a un logo animado que esta pieza puede dar sin inventar nada.
//
// CONTRATO: ver escenas/apertura.js

import { anchoUtil, LOOK, b, E, texto, nivel, hex, materialMascara, matAcento, CLARO, finMascara, deriva, encaje, dolly } from '../kit.js'
import { D } from '../datos.js'

export const meta = { id: 'bandera', beats: 6 }

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  const marca = String(D.marca || '').trim().toUpperCase()
  if (!marca) {
    tl.to({}, { duration: DUR }, 0)
    return { g, tl, vacia: true }
  }

  // ---------------------------------------------------------------- el campo de color
  // A SANGRE POR LOS CUATRO LADOS, con holgura para el empuje de camara: 1.25 de ancho aguanta el
  // acercamiento sin descubrir el fondo por un canto.
  //
  // EL BRILLO SE BAJA, Y NO ES UN GUSTO. Este plano ocupa el cuadro ENTERO durante seis beats. El
  // bloom de esta pieza no atenua —o el pixel pasa el umbral y florece entero, o no florece— asi que
  // un acento saturado a pleno convierte la escena en una mancha con halo, y ademas se lleva puesto el
  // presupuesto de luz que las escenas vecinas calibraron. A 0.78 el color sigue siendo el de la marca
  // y queda debajo del umbral. Es la misma cuenta que documenta `toro`.
  const campo = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 1.25, mundoH * 1.25),
    new THREE.MeshBasicMaterial({ color: hex(LOOK.acento).multiplyScalar(0.78), toneMapped: false }))
  campo.position.z = -0.5
  // Entra desde abajo tapando: un campo que aparece es un corte, uno que SUBE es un gesto.
  campo.position.y = -mundoH * 1.30
  g.add(campo)

  // ---------------------------------------------------------------- la marca, calada
  // El nombre va del color del FONDO, no de la tinta: sobre un campo de color, un texto oscuro es un
  // texto encima y un texto del color del fondo es un hueco RECORTADO en el campo. Es la diferencia
  // entre poner el nombre y estamparlo.
  const COLOR_CALADO = nivel(0)
  // El ancho util sigue al margen que declara el aire, en vez de ignorarlo. Con el margen por
  // defecto da EXACTAMENTE el mismo numero que antes —cero cambio visible— y el dia que un aire
  // declare un margen mas apretado, el contenido se acomoda igual que el marco. Ver `anchoUtil`.
  const ANCHO_UTIL = anchoUtil(mundoW, 0.84)
  const t = texto(marca, { fuente: 'Anton', peso: 400, size: 210, tracking: -0.004, upper: true })
  const ALTO = encaje(mundoH * 0.155, t.ar, ANCHO_UTIL)
  const mat = materialMascara(t.tex, COLOR_CALADO)
  const nombre = new THREE.Mesh(new THREE.PlaneGeometry(ALTO * t.ar, ALTO), mat)
  nombre.position.set(0, mundoH * 0.045, 0.2)
  nombre.userData.encaja = true            // el nombre de la marca no se corta nunca
  g.add(nombre)
  const FIN = finMascara()

  // ---------------------------------------------------------------- la banda del segundo acento
  // Cruza por debajo del nombre. Es lo unico que se mueve despues de que el cuadro se asento, y lo que
  // impide que seis beats de color liso se lean como una imagen fija.
  const banda = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 1.25, mundoH * 0.022),
    matAcento(LOOK.acento2, 1.35))
  banda.position.set(0, -mundoH * 0.055, 0.25)
  banda.scale.x = 0.0001
  g.add(banda)

  // ---------------------------------------------------------------- el dominio
  const dom = String(D.dominio || '').trim().toUpperCase()
  let pie = null
  if (dom) {
    const td = texto(dom, { fuente: 'DMSans', peso: 500, size: 74, tracking: 0.30, upper: true })
    const ALTO_D = mundoH * 0.017
    const md = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_D * td.ar, ALTO_D), materialMascara(td.tex, COLOR_CALADO))
    md.position.set(0, -mundoH * 0.105, 0.3)
    md.userData.encaja = true
    g.add(md)
    pie = md
  }

  // ================================================================ TIEMPO
  // El campo sube en un beat y frena. Un solo gesto duro: es la escena de marca, no la de movimiento.
  tl.fromTo(campo.position, { y: -mundoH * 1.30 }, { y: 0, duration: b(0.85), ease: E.llega(1.5), immediateRender: false }, 0)
  // El nombre se escribe apenas el campo llego. Antes no: caladas sobre un campo que todavia no esta,
  // las letras se leen contra el fondo de la escena anterior y el calado no se entiende.
  tl.fromTo(mat.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.62), ease: E.frena(3), immediateRender: false }, b(0.80))
  tl.fromTo(banda.scale, { x: 0.0001 }, { x: 1, duration: b(0.52), ease: E.frena(4), immediateRender: false }, b(1.15))
  if (pie) tl.fromTo(pie.material.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.44), ease: E.frena(2), immediateRender: false }, b(1.45))

  // LATE EN LOS BEATS. Sin esto la escena queda clavada desde el beat 2 hasta el 5 — la compuerta de
  // "nada descansa mas de un beat" en rojo, y peor, un cuadro que se lee como una foto puesta en medio
  // de una pieza que se mueve. El latido es de ESCALA y muy chico: sobre un campo liso, un 1.5% se ve.
  for (let k = 2; k < meta.beats - 1; k++) {
    tl.to(banda.scale, { y: 1.9, duration: b(0.10), ease: E.acelera(2) }, b(k))
    tl.to(banda.scale, { y: 1, duration: b(0.32), ease: E.llega(2.2) }, b(k) + b(0.10))
  }

  // Deriva minima del grupo: lo continuo que sostiene la compuerta entre latido y latido.
  deriva(tl, DUR, (u) => {
    g.position.x = Math.sin(u * Math.PI * 1.25 + rnd() * 0) * mundoW * 0.006
    g.position.y = -u * mundoH * 0.008
  })

  // ---------------------------------------------------------------- camara
  tl.fromTo(camera.position, { z: dolly(distBase, 0.42) },
    { z: dolly(distBase, -0.30), duration: DUR * 0.84, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.16, ease: E.vaiven() }, DUR * 0.84)

  // ---------------------------------------------------------------- salida
  // El campo se va HACIA ARRIBA, o sea sigue el mismo sentido con el que entro. Bajando otra vez, el
  // gesto se lee como que la escena se arrepintio.
  const SAL = DUR - b(0.70)
  tl.to(mat.uniforms.uProg, { value: 0, duration: b(0.34), ease: E.acelera(2) }, SAL)
  if (pie) tl.to(pie.material.uniforms.uProg, { value: 0, duration: b(0.28), ease: E.acelera(2) }, SAL)
  tl.to(banda.scale, { x: 0.0001, duration: b(0.30), ease: E.acelera(3) }, SAL + b(0.08))
  tl.to(campo.position, { y: mundoH * 1.30, duration: b(0.62), ease: E.acelera(3) }, SAL + b(0.08))

  return { g, tl }
}
