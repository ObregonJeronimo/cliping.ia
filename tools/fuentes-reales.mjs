// Registra las tipografias de tools/fonts CON EL NOMBRE QUE EL MOTOR PIDE.
//
// EL DEFECTO QUE ESTO ARREGLA, MEDIDO. Las compuertas hacian
// `GlobalFonts.loadFontsFromDir('tools/fonts')`, que registra cada archivo bajo su nombre INTERNO de
// familia — "DM Sans" con espacio, "Playfair Display" con espacio— mientras el motor las pide por el
// nombre del ARCHIVO: 'DMSans', 'PlayfairDisplay-700', 'Archivo-900'. Ninguno matcheaba.
//
// Medido con measureText sobre "ANTHEM HAMBURGO" a 100 px:
//
//   Anton                  740.04
//   DMSans                1023.73
//   PlayfairDisplay-700   1023.73
//   Oswald-700            1023.73
//   Archivo-900           1023.73
//   inventadaXYZ          1023.73    <- una familia que NO EXISTE
//
// El mismo numero cinco veces, o sea la fuente de reserva. Solo `Anton` acertaba, y por casualidad:
// su familia interna se llama igual que su archivo. Consecuencia: toda compuerta que mide ancho de
// texto —encuadre, encaje, legibilidad— lo medía con una cara que no es la que se renderiza, en diez
// de los once aires. Un titular que en Oswald entra y en la de reserva no (o al reves) pasaba o
// fallaba por la razon equivocada.
//
// Las dos formas de alias importan:
//   · el stem completo ('PlayfairDisplay-700'), que es como lo piden los aires;
//   · el stem sin el peso ('DMSans'), que es como lo piden las escenas y el CSS de demo.html.
// Para el segundo gana el peso que declara demo.html, que es el que corre en el render de verdad.
import { GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export function registrarFuentes(raiz) {
  const dir = join(raiz, 'tools', 'fonts')
  if (!existsSync(dir)) return { registradas: 0, alias: 0 }
  const archivos = readdirSync(dir).filter(f => f.endsWith('.ttf') || f.endsWith('.otf'))

  // Que peso usa el CSS para cada familia pedida sin sufijo. Se lee de demo.html para que la medicion
  // y el render no puedan divergir: si alguien cambia el @font-face, esto lo sigue.
  const preferido = new Map()
  const html = join(raiz, 'render3d', 'demo', 'demo.html')
  if (existsSync(html)) {
    const css = readFileSync(html, 'utf8')
    for (const m of css.matchAll(/font-family:\s*"([^"]+)"[^;]*;\s*src:\s*url\("\/fonts\/([^"]+)\.ttf"\)/g)) {
      preferido.set(m[1], m[2])
    }
  }

  let registradas = 0, alias = 0
  // PRIMERO LOS NOMBRES DEL CSS, que son la fuente de verdad de como se llama cada cara EN EL RENDER.
  // Derivar el alias del nombre de archivo no alcanza: demo.html declara la familia "BigShoulders" y el
  // archivo se llama BigShouldersDisplay-900, asi que el alias derivado era "BigShouldersDisplay" y el
  // motor pedia "BigShoulders" — no matcheaba, y medía con la cara de reserva. Lo cazo E-FUENTE-RESUELVE.
  for (const [familia, archivo] of preferido) {
    const ruta = join(dir, archivo + '.ttf')
    if (!existsSync(ruta)) continue
    try { GlobalFonts.registerFromPath(ruta, familia); alias++ } catch { /* idem */ }
  }
  for (const f of archivos) {
    const stem = f.replace(/\.(ttf|otf)$/, '')
    const ruta = join(dir, f)
    try { GlobalFonts.registerFromPath(ruta, stem); registradas++; alias++ } catch { /* la cara no carga: la compuerta de fuentes lo caza */ }
    const base = stem.replace(/-\d+$/, '')
    if (base === stem) continue
    // El alias sin peso se da si el CSS eligio ESTE archivo, o si no hay preferencia declarada y es el
    // primero que aparece. Sin la primera condicion, DMSans-700 podia pisar al DMSans-500 del CSS.
    const elegido = preferido.get(base)
    if (elegido === stem || (!elegido && !GlobalFonts.has(base))) {
      try { GlobalFonts.registerFromPath(ruta, base); alias++ } catch { /* idem */ }
    }
  }
  return { registradas, alias }
}
