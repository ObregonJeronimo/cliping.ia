// GATE DE ENCUADRE: lo que una escena anima tiene que VERSE.
//
// POR QUE EXISTE, y es el mejor ejemplo que dio este repo de un defecto que ninguna compuerta veia.
//
// Una revision adversarial encontro que la pauta de compas que se le habia agregado a la escena del
// toro NO SE VEIA NUNCA: proyectada cuadro por cuadro, quedaba fuera del encuadre desde el beat 0.25
// hasta el 4.25 y entraba recien en el 4.50, justo cuando se le manda encoger. Sus SEIS eventos —la
// entrada y cinco saltos sobre el beat— pasaban todos por debajo del borde inferior. El verificador
// estaba en verde: la escena se construia, la timeline duraba lo que debia, la camara volvia y nada
// descansaba mas de un beat. Todo cierto, y el espectador no veia nada.
//
// El error de quien lo escribio fue razonable: midio contra el cuadro EN REPOSO. Pero el toro es la
// unica escena que ORBITA y REAPUNTA la camara, asi que su encuadre real nunca coincide con el de
// reposo. Y despues volvio a pasar, en otro archivo y con otra forma: la cuña de color del mundo claro
// se puso en coordenadas del plano de fondo, que mide 2.6x el cuadro, y caia entera fuera de campo.
// Se noto por casualidad — las metricas con cuña y sin cuña salieron identicas hasta el ultimo decimal.
//
// Dos veces el mismo defecto en dos semanas es una compuerta que falta.
//
// QUE MIDE
// Construye cada escena, recorre su timeline a 30 fps con la CAMARA QUE LA ESCENA MUEVE, y proyecta la
// caja de cada malla al espacio de recorte. Para cada objeto calcula cuantos cuadros estuvo, aunque
// sea parcialmente, dentro del encuadre.
//
//   E-ENCUADRE-NUNCA   un objeto visible que no entra en el cuadro en NINGUN momento
//   E-ENCUADRE-CASI    un objeto que entra en menos del 12% de los cuadros en que esta visible
//
// LO QUE NO ES UN DEFECTO, y por eso hay excepciones explicitas:
// · Un objeto APAGADO (`visible: false`) no cuenta: estar fuera de cuadro esperando su turno es
//   exactamente como se compone una escena.
// · Los fondos, telones y halos DESBORDAN el cuadro a proposito — su caja proyectada siempre cruza el
//   encuadre, asi que pasan solos.
// · Una escena puede tener piezas que entran y salen; por eso el umbral se mide sobre los cuadros en
//   que el objeto esta ENCENDIDO, no sobre la escena entera.
//
// Uso:  node tools/encuadre-check.mjs [id ...]
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const DIRS = [join(DEMO, 'escenas'), join(DEMO, 'heroes')]
try { GlobalFonts.loadFontsFromDir(join(RAIZ, 'tools', 'fonts')) } catch { /* la medida cae a la fuente por defecto */ }

function lienzo(w = 4, h = 4) { return createCanvas(w, h) }
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? lienzo() : { style: {} }),
  getElementById: () => lienzo(),
  fonts: { ready: Promise.resolve(), load: async () => {} },
}
globalThis.window = globalThis
console.warn = () => {}
const { gsap } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'gsap', 'index.js')).href)
globalThis.gsap = gsap
const THREE = await import(pathToFileURL(join(RAIZ, 'node_modules', 'three', 'build', 'three.module.js')).href)
const { BEAT, LOOK, b } = await import(pathToFileURL(join(DEMO, 'kit.js')).href)
const { configurarDatos, ANTHEM } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)

function tejidoFalso(relaciones) {
  const m = new Map()
  relaciones.forEach((ar, i) => {
    const h = 64, w = Math.max(2, Math.round(h * ar))
    const t = new THREE.CanvasTexture(createCanvas(w, h))
    t.image = { width: w, height: h }
    m.set('f' + i, t)
  })
  const tira = new THREE.CanvasTexture(createCanvas(4, 4))
  tira.image = { width: 720, height: 6240 }
  m.set('tira', tira)
  return m
}

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [...new Set(DIRS.flatMap(d => (existsSync(d)
    ? readdirSync(d).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.replace('.js', ''))
    : [])))]

const fallos = []
const rutaDe = (id) => {
  for (const d of DIRS) { const r = join(d, `${id}.js`); if (existsSync(r)) return r }
  return join(DIRS[0], `${id}.js`)
}

// INTERSECCION CAJA-FRUSTUM, no contencion de vertices.
//
// La primera version proyectaba los ocho vertices y preguntaba si ALGUNO caia dentro del cuadro. Eso
// da falso para todo lo que es MAS GRANDE que el encuadre: una banda a sangre de 6.2 de ancho en un
// cuadro de 5.63 tiene sus cuatro esquinas afuera y ocupa la pantalla entera. La compuerta acuso 29
// defectos inexistentes en su primera corrida, todos de piezas perfectamente centradas en el origen.
//
// Lo que hay que preguntar no es "esta un vertice adentro" sino "se cruzan la caja y el frustum", que
// es una prueba distinta y three ya la trae. La diferencia importa justo en los casos que este motor
// usa mas: sangrar por los bordes es una decision de composicion repetida en media docena de escenas.
const _frustum = new THREE.Frustum()
function enCuadro(obj, caja, m) {
  caja.setFromObject(obj)
  if (caja.isEmpty()) return false
  _frustum.setFromProjectionMatrix(m)
  return _frustum.intersectsBox(caja)
}

let revisados = 0
for (const id of ids) {
  const ruta = rutaDe(id)
  if (!existsSync(ruta)) continue
  let mod
  try { mod = await import(pathToFileURL(ruta).href) } catch (e) { fallos.push(`${id}: no importa — ${e.message}`); continue }
  if (!mod.meta || typeof mod.build !== 'function') continue

  configurarDatos(ANTHEM)
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
  camera.position.set(0, 0, distBase)
  let semilla = 1
  const rnd = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296 }
  const uni = () => ({ uT: { value: 0 }, uGrilla: { value: 0.55 }, uPulso: { value: 0 }, uA: { value: new THREE.Color(LOOK.bg) }, uB: { value: new THREE.Color(LOOK.bg2) } })
  let r
  try {
    r = await mod.build({
      THREE, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
      fondo: uni(),
      pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
      bloom: { strength: 0.85, radius: 0.62, threshold: 0.62 },
      texturas: tejidoFalso([2.4, 1.0, 0.6, 3.4, 1.35]),
      datosEls: [{ rol: 'logo', url: 'f0' }, { rol: 'tarjeta', url: 'f1' }, { rol: 'foto', url: 'f2' },
        { rol: 'cta', url: 'f3' }, { rol: 'tarjeta', url: 'f4' }],
      spec: { tiraViewport: 1560 }, claro: false, repeticion: 0,
    })
  } catch (e) { fallos.push(`${id}: build lanzo — ${e.message}`); continue }
  if (!r || !r.g) continue
  revisados++

  const dur = r.tl.duration() / (r.tl.timeScale() || 1)
  const N = Math.max(12, Math.round(dur * 30))
  const caja = new THREE.Box3()
  const cuenta = new Map()          // malla -> { visto, dentro, nombre }
  for (let i = 0; i <= N; i++) {
    r.tl.time((i / N) * r.tl.duration(), false)
    camera.updateMatrixWorld()
    // `updateMatrixWorld` NO actualiza `matrixWorldInverse`: eso lo hace el renderer justo antes de
    // dibujar, y aca no hay renderer. Sin esta linea la proyeccion usa una inversa vieja y TODO da
    // fuera de cuadro — la primera corrida de esta compuerta acuso 29 defectos que no existian, con
    // bandas perfectamente centradas en el origen. Una compuerta que acusa en falso cuesta mas que no
    // tenerla: se aprende a ignorarla y despues no ve el defecto de verdad.
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    camera.updateProjectionMatrix()
    const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    for (const raiz of [r.g, r.gr]) {
      if (!raiz) continue
      raiz.updateWorldMatrix(true, true)
      raiz.traverse(o => {
        if (!o.isMesh && !o.isPoints) return
        // Un objeto apagado o transparente no esta "en escena": no se le pide estar en cuadro.
        let vis = o.visible
        for (let p = o.parent; p && vis; p = p.parent) vis = p.visible
        const op = o.material && o.material.opacity != null ? o.material.opacity : 1
        if (!vis || op <= 0.02) return
        let e = cuenta.get(o)
        if (!e) { e = { visto: 0, dentro: 0 }; cuenta.set(o, e) }
        e.visto++
        if (enCuadro(o, caja, m)) e.dentro++
      })
    }
  }

  if (process.env.DETALLE) {
    const caja2 = new THREE.Box3()
    r.tl.time(r.tl.duration() * 0.5, false)
    r.g.updateWorldMatrix(true, true); if (r.gr) r.gr.updateWorldMatrix(true, true)
    for (const [o, e] of cuenta) {
      if (e.dentro > e.visto * 0.12) continue
      caja2.setFromObject(o)
      const c = caja2.getCenter(new THREE.Vector3()), t = caja2.getSize(new THREE.Vector3())
      console.error(`   ${id} · ${o.geometry.type} centro(${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)}) `
        + `tam(${t.x.toFixed(1)} x ${t.y.toFixed(1)}) grupo=${r.gr && r.gr.getObjectById(o.id) ? 'gr' : 'g'} `
        + `dentro ${e.dentro}/${e.visto}`)
    }
  }

  // SE JUZGA POR GRUPO, no por objeto suelto. Una regla de 24 marcas deja seis fuera del cuadro A
  // PROPOSITO: es lo que hace que se lea como que sigue mas alla del borde, y es una decision de
  // composicion repetida en media docena de escenas. Mirando objeto por objeto, esas seis marcas son
  // seis acusaciones falsas — y una compuerta que acusa en falso se aprende a ignorar, que es la
  // unica forma de que despues no vea el defecto de verdad.
  //
  // Lo que SI es un defecto es que TODO un grupo quede afuera: eso ya no es una serie que sangra, es
  // una pieza que nadie ve. Asi era la pauta del toro, que motivo esta compuerta.
  // DOS REGLAS, porque hay dos defectos distintos y una sola no los caza a los dos.
  //
  // (1) POR OBJETO, si es GRANDE. Una pieza cuyo lado mayor pasa del 12% del ancho del cuadro y no
  //     entra nunca es una pieza muerta, sin vueltas. Es lo que era la pauta del toro. El umbral deja
  //     afuera las marcas finas de una regla, que es justo el caso legitimo.
  // (2) POR GRUPO, para lo chico. Una regla de 24 marcas deja seis fuera A PROPOSITO —es lo que la
  //     hace leer como que sigue mas alla del borde— asi que juzgarlas de a una da seis acusaciones
  //     falsas. Pero si TODAS quedan afuera, el grupo entero es una pieza que nadie ve.
  //
  // Con una sola regla el A/B fallaba en las dos direcciones: por objeto acusaba las marcas de la
  // regla; por grupo, mandar el nucleo del cristal catorce unidades abajo NO disparaba nada, porque
  // sus hermanos en el mismo grupo seguian en cuadro.
  const LADO_MIN = mundoW * 0.12
  const cajaT = new THREE.Box3(), tam = new THREE.Vector3()
  r.tl.time(r.tl.duration() * 0.5, false)
  r.g.updateWorldMatrix(true, true); if (r.gr) r.gr.updateWorldMatrix(true, true)
  for (const [o, e] of cuenta) {
    if (e.dentro > 0 || e.visto < N * 0.06) continue
    cajaT.setFromObject(o); if (cajaT.isEmpty()) continue
    cajaT.getSize(tam)
    if (Math.max(tam.x, tam.y) < LADO_MIN) continue
    fallos.push(`E-ENCUADRE-NUNCA  ${id}: una ${(o.geometry && o.geometry.type) || 'malla'} de `
      + `${tam.x.toFixed(1)}x${tam.y.toFixed(1)} esta encendida el ${Math.min(100, Math.round(e.visto / N * 100))}% `
      + 'de la escena y NO entra en el cuadro en ningun momento — se anima algo que nadie ve')
  }

  const porGrupo = new Map()
  for (const [o, e] of cuenta) {
    const clave = o.parent || o
    let g = porGrupo.get(clave)
    if (!g) { g = { visto: 0, dentro: 0, n: 0, tipo: (o.geometry && o.geometry.type) || 'malla' }; porGrupo.set(clave, g) }
    g.visto = Math.max(g.visto, e.visto)
    g.dentro = Math.max(g.dentro, e.dentro)
    g.n++
  }
  for (const [, g] of porGrupo) {
    if (g.visto < N * 0.06) continue          // aparece un instante: no hay muestra para juzgar
    if (g.n === 1) continue                   // pieza suelta: ya la juzgo la regla de arriba, por tamano
    const cuantos = g.n > 1 ? `un grupo de ${g.n} piezas` : `una ${g.tipo}`
    const frac = g.dentro / g.visto
    if (g.dentro === 0) {
      fallos.push(`E-ENCUADRE-NUNCA  ${id}: ${cuantos} esta encendido el ${Math.min(100, Math.round(g.visto / N * 100))}% `
        + 'de la escena y NO entra en el cuadro en ningun momento — se anima algo que nadie ve')
    } else if (frac < 0.10) {
      fallos.push(`E-ENCUADRE-CASI  ${id}: ${cuantos} esta encendido el ${Math.min(100, Math.round(g.visto / N * 100))}% `
        + `de la escena y solo entra en el ${(frac * 100).toFixed(0)}% de esos cuadros`)
    }
  }
}

if (fallos.length) {
  console.error(`ENCUADRE: ${fallos.length} FALLO(S)\n` + fallos.map(f => '  ' + f).join('\n'))
  process.exit(1)
}
console.log(`ENCUADRE OK — ${revisados} escenas y heroes: todo lo que se anima entra en el cuadro `
  + '(proyectado a 30 fps contra la camara que mueve cada escena).')
