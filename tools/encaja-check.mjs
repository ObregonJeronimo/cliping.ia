// COMPUERTA E-ENCAJE-CLASIFICADO — toda malla que muestra una imagen dice si tiene que entrar entera.
//
// POR QUE ES UN TRINQUETE Y NO UNA EXIGENCIA. `encuadre-check` ya comprueba que una malla marcada
// `userData.encaja` no se salga del cuadro. El problema no es esa comprobacion: es que hoy la declaran
// 12 de 71 mallas, y las otras 59 no es que esten AUTORIZADAS a sangrar — es que nadie decidio. La
// compuerta se pone entonces sobre la DECISION y no sobre la geometria, que es la unica manera de
// convertir un juicio de composicion caso por caso en una tarea revisable archivo por archivo.
//
// El camino lo propuso un critico adversario y es mejor que la alternativa que estaba escrita
// (exigir contencion universal): esa habria acusado a los ornamentos, las cintas y los fondos, que
// sangran a proposito, y una compuerta que acusa en falso se aprende a ignorar.
//
// EL NUMERO ARRANCA EN LO QUE HAY Y SOLO PUEDE BAJAR. Poner el trinquete en 0 hoy dejaria la cadena en
// rojo con 59 casos y nadie podria pushear nada hasta terminar la clasificacion entera. Poner el
// trinquete en lo medido deja el trabajo empezado, medido y protegido: no se puede sumar una malla sin
// clasificar, y cada tanda que se clasifica baja el numero. Es el mismo patron que `eco-check`.
//
// COMO SE CLASIFICA UNA MALLA. En la escena, sobre la malla:
//   userData.encaja = true   -> tiene que entrar ENTERA en el cuadro. `encuadre-check` la va a exigir.
//   userData.sangra = true   -> puede cruzar el borde a proposito (cintas, ornamentos, fondos).
//   userData.relleno = true  -> ya existia y significa lo mismo que `sangra` para este censo.
//
// Uso:  node tools/encaja-check.mjs
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')

// EL CENSO CORRE EN SU PROPIO PROCESO. Construye 37 escenas x 8 juegos de datos y cada `texto()`
// compromete memoria que la libreria nativa de canvas no devuelve — es la familia de fugas que colgo
// la maquina seis veces. En un proceso aparte, el sistema la recupera entera al terminar.
const r = spawnSync(process.execPath, [join(HERE, 'encaja-inventario.mjs'), '--json'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: RAIZ })

if (r.status !== 0) {
  console.log('GATE ENCAJE FAIL: el censo no pudo correr (exit %s)', r.status)
  console.log((r.stderr || '').trim().split('\n').slice(-8).join('\n'))
  process.exit(1)
}

let censo
try {
  censo = JSON.parse(r.stdout)
} catch (e) {
  console.log('GATE ENCAJE FAIL: el censo no devolvio JSON legible — ' + e.message)
  process.exit(1)
}

// EL TRINQUETE. Medido el 2026-08-06 sobre 37 escenas/heroes x 8 juegos, aire artesanal, guardando el
// peor juego de cada escena. Arranco en 59 sin clasificar de 71. Cuando bajes este numero, bajalo al
// medido — no a uno redondo.
//
//   59 -> 40   marquesina (10, sangra: su cinta es un bucle) y mosaico (9, la banda sangra, la grilla encaja)
//   40 -> 32   columna (8, encaja de ancho y sangra de alto: es un feed que sube)
//   32 -> 28   mesa y titular (sangran, y su propio ancho ya lo declaraba: 1.06 y 1.02 del cuadro),
//              contraste (encaja: se dimensiona con el helper `encaje`) y vitrina (encaja: es el logo)
//   28 -> 21   rafaga (7): sus recortes sangran ("el borde toca los dos lados del cuadro", declarado
//              en el archivo) y su tipografia encaja ("una palabra cortada por el borde no se lee")
//   21 -> 15   apertura, solo el contador (6)
//   15 ->  7   apertura, sus 8 letras, despues de arreglar el dimensionado que destaparon
//    7 ->  0   tipografia, malla por malla. CERRADO: las 71 declaran que hacen.
//
// EN CERO YA NO ES UN TRINQUETE, ES LA REGLA. De aca en adelante ninguna malla que muestre una imagen
// puede entrar al motor sin decir si tiene que entrar entera o si sangra a proposito. Eso era el punto
// del pendiente: convertir un juicio de composicion caso por caso en algo que se declara al escribir
// la escena y se revisa archivo por archivo.
//
//    0 -> 71   EL CERO ERA FALSO, Y NO PORQUE ALGUIEN HAYA HECHO TRAMPA: EL CENSO ESTABA CIEGO.
//
// `encaja-inventario` decidia "esta malla muestra una imagen" preguntando por `material.map`, y 19 de
// las 20 escenas dibujan su texto con `materialMascara` —o con el `matWipe` de `tipografia`—, que son
// ShaderMaterial escritos a mano y llevan la textura en `uniforms.map.value`. Lo mismo la tira en
// `telefono`, `ventana` y `portatil`. Todas esas quedaban fuera del censo, y el JSON que lee esta
// compuerta sale FILTRADO por ese mismo criterio (`filas: conImagen`).
//
// O sea: una compuerta cuyo trabajo entero es cazar mallas sin declarar estaba ciega justo a 71 de
// ellas, y su cero se leia como "esta todo clasificado". El cero tranquilizador otra vez, esta vez en
// la compuerta que lo persigue.
//
// LO CONFIRMA UN NUMERO QUE ESTE REPO YA HABIA DADO POR IRREPRODUCIBLE. `docs/ENCAJE-ESTADO.md` dice:
// "El pendiente decia 'hoy solo 16 de 161 mallas con textura declaran si tienen que entrar enteras'.
// Ese 161 no se pudo reproducir con ningun metodo. El censo propio da 71 mallas con imagen". Con el
// censo arreglado da **161 exacto**. El numero del pendiente era correcto desde el principio y lo que
// fallaba era el instrumento — que es la misma leccion que el resto de esta sesion, tres veces.
//
// EL TRINQUETE VUELVE A 71 Y NO ES UN RETROCESO DEL MOTOR: no se rompio ni una escena. Es el numero
// verdadero, medido, sustituyendo a uno que era mentira. Las 71 estan en 17 archivos —tarjetas 21,
// pantalla 8, toro 7, apertura 6, destello 6, cierre 5, tipografia 5, y diez mas con 1 o 2— y se bajan
// como se bajaron las otras: archivo por archivo, leyendo que quiso hacer cada escena.
const TRINQUETE = 71

const sinClasificar = censo.filas.filter(f => f.clase === 'SIN CLASIFICAR')
const n = sinClasificar.length
const total = censo.total

// SI EL CENSO VUELVE VACIO, ES UN DEFECTO DEL CENSO Y NO UN LOGRO. Un cero aca se leeria como "esta
// todo clasificado" y significaria que ninguna escena se pudo construir — el arnes mudo de siempre.
if (!total) {
  console.log('GATE ENCAJE FAIL: el censo no encontro UNA SOLA malla con imagen en 37 escenas.')
  console.log('  Eso no es que este todo clasificado: es que el arnes no construyo nada (fuentes,')
  console.log('  texturas o datos). Ver la cabecera de tools/encaja-inventario.mjs.')
  process.exit(1)
}

const porEscena = new Map()
for (const f of sinClasificar) porEscena.set(f.escena, (porEscena.get(f.escena) || 0) + 1)

if (n > TRINQUETE) {
  console.log(`GATE ENCAJE FAIL: ${n} mallas con imagen sin clasificar, y el trinquete esta en ${TRINQUETE}.`)
  console.log('  Alguna malla nueva no dice si tiene que entrar entera. En la escena, sobre la malla:')
  console.log('    userData.encaja = true   (tiene que entrar entera)')
  console.log('    userData.sangra = true   (puede cruzar el borde a proposito)')
  for (const [e, c] of [...porEscena].sort((a, b) => b[1] - a[1])) console.log(`    ${e.padEnd(18)} ${c}`)
  process.exit(1)
}

const porTipo = {}
for (const f of censo.filas) porTipo[f.tipo] = (porTipo[f.tipo] || 0) + 1

// "OK (" Y NO "OK —": el guard cuenta las compuertas con /OK \(|OK:/ (gates-guard.mjs:209), asi que
// una compuerta que saluda con raya pasa pero no suma. Paso con esta y le pasa tambien a `encuadre` y
// a `adn`, o sea que el total que informa el guard viene subestimado desde antes.
console.log(`GATE ENCAJE OK (${total} mallas muestran una imagen; ${total - n} clasificadas, ${n} sin clasificar, trinquete ${TRINQUETE}).`)
console.log(`  por tipo: ${Object.entries(porTipo).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
if (n < TRINQUETE) {
  console.log(`  BAJO EL NUMERO: quedan ${n} y el trinquete dice ${TRINQUETE}. Bajalo a ${n} en tools/encaja-check.mjs`)
  console.log('  para que lo clasificado no se pueda perder sin que esta compuerta lo acuse.')
}
if (porEscena.size) {
  console.log(`  falta clasificar en ${porEscena.size} archivos: ` +
    [...porEscena].sort((a, b) => b[1] - a[1]).map(([e, c]) => `${e} ${c}`).join(' · '))
}
