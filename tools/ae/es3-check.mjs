// COMPUERTA ES3 — caza el JavaScript moderno ANTES de mandarlo a After Effects.
//
// POR QUE EXISTE, que es lo importante.
//
// ExtendScript, el lenguaje de scripting de After Effects, es ES3: JavaScript de 1999. No tiene `let`
// ni `const`, ni funciones flecha, ni template literals, ni `map`/`filter`/`forEach`, ni `JSON`. Y el
// modelo que va a generar ese codigo —yo— escribe ES2020 por defecto, porque es lo que escribe todo el
// mundo hace quince años.
//
// El problema no es que falle: es COMO falla. El canal hacia AE es un buzon de archivos y un timbre
// que no devuelve nada. Un error de sintaxis adentro de AE no vuelve como "linea 12: const inesperado":
// vuelve como que el archivo de respuesta nunca aparece, o sea EXACTAMENTE IGUAL que AE cerrado, que
// un dialogo modal abierto, que la preferencia de escritura apagada o que AE renderizando.
//
// O sea que sin esta compuerta, la clase de error MAS FRECUENTE (codigo generado por un modelo) se
// disfraza de la clase de error mas dificil de diagnosticar. Cazarlo al construir sale ordenes de
// magnitud mas barato que verlo como un timeout mudo — que es la misma tesis que sostiene las 28
// compuertas del motor.
//
// LO QUE ESTO ES Y LO QUE NO ES. Es un ESCANER, no un parser. Saca cadenas, comentarios y literales de
// expresion regular, y despues busca construcciones prohibidas con expresiones regulares sobre lo que
// queda. Un parser de verdad (acorn con ecmaVersion 3) seria estrictamente mejor y hay que cambiarlo
// por eso el dia que se pueda instalar; no se hizo asi porque no hay acorn en el repo y no se quiso
// agregar una dependencia.
//
// Lo que el escaner NO puede ver, dicho para que nadie confie de mas:
//   · sintaxis rota que no este en la lista (un parser lo cazaria todo)
//   · un metodo de ES5 llamado a traves de una variable: `var f = 'map'; arr[f](...)`
//   · destructuring en la firma de una funcion escrito de formas raras
// Si pasa esta compuerta el codigo NO esta garantizado como ES3 valido: esta libre de los quince
// errores que un modelo comete de verdad, que es otra cosa y es la que paga.
//
// USO
//   node tools/ae/es3-check.mjs archivo.jsx [otro.jsx ...]
//   import { revisarES3 } from './es3-check.mjs'   -> { ok, problemas: [{linea, col, que, porque}] }

const PROHIBIDO = [
  // --- declaraciones y funciones
  { re: /\b(let|const)\s+[A-Za-z_$]/g, que: 'let / const',
    porque: 'ES3 solo tiene var. Es el error numero uno del codigo generado.' },
  { re: /=>/g, que: 'funcion flecha',
    porque: 'ES3 no las tiene. Usar function(){}. Ojo tambien con el this, que cambia.' },
  { re: /\bclass\s+[A-Za-z_$]/g, que: 'class',
    porque: 'ES3 no tiene clases. Usar funcion constructora y prototype.' },
  { re: /\b(async|await)\b/g, que: 'async / await',
    porque: 'ES3 no lo tiene. Y ExtendScript es sincrono: no hace falta.' },
  { re: /\bfor\s*\(\s*(var|let|const)?\s*[A-Za-z_$][\w$]*\s+of\s/g, que: 'for...of',
    porque: 'ES3 solo tiene for clasico y for...in.' },
  { re: /\.\.\./g, que: 'spread / rest',
    porque: 'ES3 no lo tiene. Para argumentos variables, arguments; para copiar, un bucle.' },

  // --- literales
  { re: /`/g, que: 'template literal',
    porque: 'ES3 no los tiene. Concatenar con +.' },
  { re: /\bfunction\s*\([^)]*=[^)]*\)/g, que: 'parametro con valor por defecto',
    porque: 'ES3 no lo tiene. Adentro: if (x === undefined) x = ...' },
  { re: /(^|[^\w$.])\{\s*\[/g, que: 'nombre de propiedad computado',
    porque: 'ES3 no lo tiene. Crear el objeto y despues obj[clave] = valor.' },
  { re: /,\s*[}\]]/g, que: 'coma final (trailing comma)',
    porque: 'ES3 la rechaza en objetos y arreglos. Es un error de sintaxis, no un aviso.' },

  // --- metodos que no existen en ES3
  { re: /\.(map|filter|forEach|reduce|reduceRight|some|every|indexOf|lastIndexOf)\s*\(/g,
    que: 'metodo de arreglo de ES5',
    porque: 'ES3 no los tiene. Escribir el bucle for a mano.' },
  { re: /\.(trim|trimStart|trimEnd|startsWith|endsWith|includes|repeat|padStart|padEnd)\s*\(/g,
    que: 'metodo de cadena de ES5+',
    porque: 'ES3 no los tiene. trim se hace con replace y una expresion regular.' },
  { re: /\bObject\s*\.\s*(keys|values|entries|assign|freeze|create)\s*\(/g,
    que: 'metodo de Object de ES5+',
    porque: 'ES3 no los tiene. Recorrer con for...in y hasOwnProperty.' },
  { re: /\bArray\s*\.\s*(from|of|isArray)\s*\(/g, que: 'metodo estatico de Array de ES5+',
    porque: 'ES3 no los tiene.' },
  { re: /\bJSON\s*\.\s*(parse|stringify)\s*\(/g, que: 'JSON',
    porque: 'ExtendScript NO TRAE JSON. Hay que incluir un json2.js propio, o serializar a mano.' },
  { re: /\b(Promise|Symbol|Map|Set|WeakMap|WeakSet|Proxy|Reflect)\b/g, que: 'tipo de ES6',
    porque: 'ES3 no lo tiene.' },
]

// SACAR CADENAS, COMENTARIOS Y EXPRESIONES REGULARES antes de buscar. Sin esto, un `const` adentro de
// un mensaje de error o de un comentario se reporta como defecto — y una compuerta que acusa en falso
// se aprende a ignorar, que es peor que no tenerla.
function limpiar(src) {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i], d = src[i + 1]
    if (c === '/' && d === '/') {                       // comentario de linea
      while (i < n && src[i] !== '\n') { out += ' '; i++ }
      continue
    }
    if (c === '/' && d === '*') {                       // comentario de bloque
      out += '  '; i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++ }
      out += '  '; i += 2
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      // EL CONTENIDO SE REEMPLAZA POR x, NO POR ESPACIOS, y no es un detalle de estilo. La primera
      // version lo llenaba de espacios, y entonces ["uno", "dos"] quedaba como [     ,      ] — que
      // dispara la regla de coma final. O sea que la compuerta acusaba en falso a codigo ES3
      // perfectamente valido. Una compuerta que acusa en falso se aprende a ignorar, y despues no ve
      // el defecto de verdad: es la misma leccion que dejo escrita encuadre-check en su cabecera.
      //
      // Con x se conserva la ESTRUCTURA y se pierde el CONTENIDO, que es justo lo que hace falta.
      // Las comillas quedan tal cual, y el backtick tambien a proposito: ese ES el defecto.
      out += c; i++
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') { out += 'xx'; i += 2; continue }
        out += src[i] === '\n' ? '\n' : 'x'
        i++
      }
      out += (i < n ? src[i] : ''); i++
      continue
    }
    out += c; i++
  }
  return out
}

const posicion = (src, idx) => {
  const antes = src.slice(0, idx)
  const linea = antes.split('\n').length
  return { linea, col: idx - antes.lastIndexOf('\n') }
}

export function revisarES3(src) {
  const limpio = limpiar(src)
  const problemas = []
  for (const p of PROHIBIDO) {
    p.re.lastIndex = 0
    let m
    while ((m = p.re.exec(limpio)) !== null) {
      const { linea, col } = posicion(limpio, m.index)
      problemas.push({ linea, col, que: p.que, porque: p.porque, texto: m[0].trim() })
    }
  }
  problemas.sort((a, b) => a.linea - b.linea || a.col - b.col)
  return { ok: problemas.length === 0, problemas }
}

// ---------------------------------------------------------------- linea de comandos
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
    process.argv[1]?.endsWith('es3-check.mjs')) {
  const { readFileSync } = await import('node:fs')
  const archivos = process.argv.slice(2)
  if (!archivos.length) {
    console.log('uso: node tools/ae/es3-check.mjs archivo.jsx [...]')
    process.exit(2)
  }
  let fallos = 0
  for (const f of archivos) {
    const r = revisarES3(readFileSync(f, 'utf8'))
    if (r.ok) { console.log(`ES3 OK  ${f}`); continue }
    fallos += r.problemas.length
    console.log(`ES3 FAIL  ${f}  (${r.problemas.length})`)
    for (const p of r.problemas) {
      console.log(`  ${String(p.linea).padStart(4)}:${String(p.col).padEnd(3)} ${p.que}  ->  ${p.texto}`)
      console.log(`       ${p.porque}`)
    }
  }
  process.exit(fallos ? 1 : 0)
}
