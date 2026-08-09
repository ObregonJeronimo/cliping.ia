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
//
//   71 -> 66   los pies y rotulos de texto: `cita` (la firma), `marquesina` (el rotulo), `sello` y
//              `titular` (el dominio del cliente — un dominio cortado no se puede tipear, mismo
//              criterio que ya arreglo `pantalla`), y el espejo de `vitrina`.
//
//              EL ESPEJO SE PROBO AL REVES PRIMERO: se declaro `encaja` razonando que mide lo mismo
//              que el logo, y E-ENCAJE-REAL lo refuto —se sale en 5 de 165 cuadros con
//              bienestar/basecamp, hasta 1.115—. Va mas abajo que el logo y la vitrina se mueve: mismo
//              ancho no es misma trayectoria. Queda `sangra`, que ademas es lo correcto: el reflejo se
//              desvanece hacia abajo por diseño, asi que su borde no es un borde que alguien lea.
//   66 -> 64   el helper `chico()` de `mesa`, que declara en un solo lugar para sus dos llamadas.
//
//              EN LA MISMA TANDA SE PROBARON CINCO MAS Y LAS CINCO SE RECHAZARON, con su medicion
//              anotada en cada archivo para no volver a intentarlo a ciegas:
//                telefono  3.122 del cuadro (6 de 117)  · portatil 1.963 (71 de 117)
//                ventana   1.999 (98 de 117)            · columna  1.015 (3 de 88)
//              Los tres aparatos no desbordan: ENTRAN VOLANDO desde cerca de la camara, que es el
//              gesto. Ahi no va `sangra` —la pagina si tiene que entrar entera cuando toca leerla—
//              sino `encaja` + `encajaEntre` con la ventana DERIVADA del tween de entrada. `columna`
//              es otra cosa: 1,5% de exceso, y sus rotulos estan anclados contra el cuadro EN REPOSO
//              mientras la escena acerca la camara — si es eso, el arreglo es `cuadroMasAngosto`.
//   64 -> 63   el eco de `tarjetas` (sangra: su propia nota ya decia que lo que pase de 1.0 "es el
//              empuje de camara y no el contenido, y no se persigue" — faltaba decirlo en la malla).
//
// ACA SE FRENA, Y CON UNA RAZON MEDIDA. Se probo declarar `encaja` en los helpers de texto de las tres
// escenas mas grandes del atraso —`tarjetas` (21), `cierre` (5), `tipografia` (5)— y las tres lo
// rechazaron. Las mediciones:
//
//   tarjetas    hasta 2.065 del cuadro, cinco mallas
//   tipografia  1.512 y 1.055, dos de cinco
//   cierre      1.179, una de cinco
//
// LAS TRES POR LA MISMA CAUSA, Y NO ES EL DIMENSIONADO. Las mallas de `tipografia` ya se dimensionan
// con `medida()` contra un ancho maximo explicito; el contador de `tarjetas` ya se acota a `CW * 0.92`,
// o sea al ancho de SU TARJETA, y dentro de la tarjeta entra perfecto. Lo que las saca del cuadro es
// que el cuadro contra el que se dimensionaron es el de REPOSO y la camara se acerca. `tarjetas` ya lo
// tenia escrito para su titulo: su empuje "a su maximo agranda el cuadro cerca del doble" — y 2.065 es
// exactamente el doble.
//
// O sea que lo que queda del atraso no son 63 arreglos: es UNA pregunta que aparece 63 veces, y ya
// esta planteada y reservada en docs/AUDITORIA-MOTOR.md desde el caso del titulo. Achicar todas las
// composiciones para que la compuerta calle seria "cambiar el producto para satisfacer a la
// herramienta". Lo que corresponde tecnicamente es `encaja` + `encajaEntre` con la ventana en la que
// la camara ya volvio, DERIVADA del tween y no calibrada a ojo — y eso se hace escena por escena, con
// el video delante, no de corrido.
//   63 -> 55   `pantalla`, sus ocho de una: las SIETE BANDAS sangran —se dimensionan con
//              `mundoW * 1.06`, o sea que la imagen llega al borde a proposito, y el propio arreglo del
//              texto cortado de esa escena lo dice: "a sangre quiere decir que la imagen llega al
//              borde, no que las palabras se corten"— y el pie con el dominio encaja, mismo criterio
//              que `sello`, `titular` y `columna`. Las ocho declaran ademas `tipoImagen: 'recorte'`.
//
//              Es la unica escena grande del atraso que salio limpia de una, y por una razon que vale
//              anotar: su decision ya estaba tomada y escrita en el archivo. No hubo que juzgar nada,
//              solo traducirla a la malla.
//   55 -> 53   `columna`, sus dos rotulos de la calle izquierda — y este no se declaro, se ARREGLO.
//
//              Estaban anclados a `-mundoW * 0.5 + 0.20`, o sea contra el cuadro EN REPOSO, y se
//              salian: 1.034 el indice y 1.027 el pie, en `deportivo` y `jugueton`. Identificados con
//              `ENCUADRE_ORIGEN=1`, que para esto se hizo — antes la compuerta decia "una malla" y no
//              habia forma de saber cual de las dos.
//
//              Son DOS efectos que se suman y ninguno se ve desde el reposo: la camara se ACERCA
//              (angosta el cuadro, lo cubre `cuadroMasAngosto`) y ademas se CORRE de costado hasta
//              `orbita(0.12)` (eso hay que sumarlo aparte). El ancla nueva se deriva de esos dos
//              numeros en vez de elegir un margen que funcione: calibrarlo volveria a estar mal apenas
//              alguien toque el dolly, la orbita o agregue un aire.
//   53 -> 52   `ventana`: su carcasa SANGRA, y lo dice la propia escena — `ANCHO = mundoW * 1.02`,
//              "a 1.02 del ancho de cuadro la ventana LO LLENA DE PUNTA A PUNTA". Una ventana
//              dimensionada al 102% del cuadro no puede entrar entera: excederlo ES la composicion.
//              Se probo igual con `encajaEntre` antes de aceptarlo: llega a 1.125 tambien asentada, o
//              sea que no es el gesto de entrada sino el encuadre. Coherente con el 1.02 declarado.
const TRINQUETE = 52

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
