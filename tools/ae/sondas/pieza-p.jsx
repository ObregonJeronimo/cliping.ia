// ================================================================================================
// PIEZA-P · recreacion de una plantilla con licencia CC-BY · PLANOS 1 a 10 (0 a 17 s)
// ================================================================================================
//
// EL ORIGINAL Y SU LICENCIA
//   "SaaS Product Promo After Effects Template | Premium Web & App Presentation 2026"
//   canal "AE Template & Premiere Pro Template" · https://www.youtube.com/watch?v=n8uq1ZOOQ6o
//   Creative Commons Attribution license (reuse allowed) — verificado leyendo los metadatos.
//   La atribucion va escrita DENTRO de la pieza, en el plano de marca, que es donde la licencia la pide.
//   Se reemplaza el nombre y el simbolo de la marca (va ARCO): la CC-BY cubre el diseno de la
//   plantilla, no la marca registrada de nadie.
//
// ================================================================================================
// POR QUE ESTA PIEZA SE REESCRIBIO ENTERA
// ================================================================================================
//
// La version anterior no era una recreacion: era una pieza propia montada sobre el esqueleto de
// tiempos del original. Thiago: "la recreacion la verdad no se acerca mucho, cumpli por favor".
//
// Y debajo habia un error concreto, no una diferencia de criterio: LEI MAL LOS PLANOS. Arme el mapa
// desde una hoja de contacto a 320 px en gris, y a esa resolucion llame "revelado de marca" a un plano
// de 9,7 s que en realidad son cuatro cosas encadenadas — una barra de busqueda que se dibuja sola, se
// escribe, se aleja de camara y recibe un clic. Una barra alejandose y un logotipo quieto se ven
// iguales a 320 px.
//
// Vuelto a medir sobre cuadros EN COLOR a 640 px: tres hojas a 0,5 s y dos de detalle a 0,13 s.
//
// ================================================================================================
// LA GRAMATICA DEL ORIGINAL, que es UNA sola y se repite cuatro veces
// ================================================================================================
//
//   1. una palabra GIGANTE cruza el cuadro CON ESTELA (mas alta que medio cuadro)
//   2. un zoom-out violento de ~10 cuadros la deja chica, y ahi ya es la FRASE ENTERA
//   3. las palabras de la frase SE ENFOCAN DE A UNA, de izquierda a derecha
//   4. la frase se sigue alejando despacio hasta que la levanta el latigazo siguiente
//
// Pasa con "Build SaaS Promo", con "Engineered for Scale", con "Give your team" y con "Growth". Es
// tambien la respuesta a lo que Thiago viene pidiendo hace tres piezas: el texto no aparece, LLEGA —
// y aca llega desenfocado y frena, que es un tiempo mas que cualquier entrada por posicion.
//
// ================================================================================================
// LOS DIEZ PLANOS · 30 fps · los cuadros del original estan a 59,94 y van divididos por dos
// ================================================================================================
//   1   0- 40   "Build" gigante con estela, derivando
//   2  40- 70   zoom-out -> "Build SaaS Promo" chico, las tres palabras se enfocan de a una
//   3  70- 96   "Engineered" gigante cruzando
//   4  96-127   -> "Engineered for Scale" chico
//   5 127-217   LA BARRA: filo, cuerpo, tecleo con cursor, alejamiento, lupa, puntero y clic
//   6 217-275   LA MARCA: isotipo, logotipo letra por letra, letras fantasma, particulas
//   7 275-390   EL TABLERO entra inclinado y se llena mientras la camara panea
//   8 390-420   corte a BLANCO: "Give" gigante -> "Give your team"
//   9 420-480   el odometro 2x -> 9x -> 10x, con los anillos creciendo con el numero
//  10 480-510   "Growth" gigante sobre oscuro
//
// ================================================================================================
// USO
//   node tools/ae/recursos-p1.mjs && node tools/ae/recursos-p2.mjs
//   node tools/ae/es3-check.mjs tools/ae/sondas/pieza-p.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-p.jsx
//   printf 'PIEZA-P' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/pieza-p.json
// ================================================================================================

#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/gesto.jsx"

var RUTA = "C:/ae-probe/pieza-p.txt";
var pvv = new File(RUTA); if (pvv.exists) { pvv.remove(); }
function di(t) {
  var f = new File(RUTA);
  f.open("a"); f.encoding = "UTF-8"; f.writeln(t); f.close();
}

try {

G.iniciar({
  nombre: "PIEZA-P",
  cuadros: 510,
  fps: 30,
  recursos: "C:/ae-probe/recursos-p",
  proyecto: "C:/ae-probe/PIEZA-P.aep",
  informe: "C:/ae-probe/gesto-p.txt",
  fondo: [0.012, 0.012, 0.031]
});

G.camara({ distancia: 2400 });

// SANGRAR NO ES UN DEFECTO CUANDO ES LA IDEA, PERO HAY QUE DECIRLO.
//
// `marco-check` marca toda capa quieta que el borde corta, y tiene razon en el caso que le importa: un
// panel de contenido cortado por el marco es un defecto. Un fondo que NO sangrara dejaria una franja
// negra alrededor, y una palabra de 2600 px de tinta sobre un cuadro de 1920 es exactamente el gesto
// del original — "Engineered" no entra y se ve pasar su medio, y eso ES lo que se lee como velocidad.
//
// La compuerta ya tiene la puerta: exime las capas cuyo comentario contiene SANGRA. Se declaran de a
// una y con su motivo, que es lo contrario de bajarle el umbral.
function sangra(capa, motivo) { capa.comment = "SANGRA · " + motivo; return capa; }

var C = [0, 40, 70, 96, 127, 217, 275, 390, 420, 480, 510];

// ================================================================================================
// EL SUELO · cuatro luces sueltas que se cruzan
// ================================================================================================
//
// En el original la luz de abajo CAMBIA DE COLOR: violeta al principio, magenta mientras la barra se
// escribe, NARANJA mientras la barra se aleja, y azul cerrado en el revelado de marca. Con un solo PNG
// eso seria imposible (L23: un PNG plano tiene un estado), asi que son cuatro capas cruzandose.
// LA ESCALA DE UN FONDO SE DIVIDE POR SU MAGNIFICACION, Y ESTE ERROR LO COMETI DOS VECES SEGUIDAS.
//
// Primero baje los fondos de 4800 a 2880 px —para que AE no tardara seis minutos en construir la
// comp— y no toque la escala: a 46 un archivo de 2880 dibuja 1325 px sobre un cuadro de 1920.
//
// Despues la subi a 68 haciendo la cuenta 1920/2880... y seguia sin cubrir, porque estas capas viven
// en z=1600 y la camara esta a 2400: la magnificacion es 2400/(2400+1600) = 0,60, asi que lo que se
// dibuja no es 1958 px sino 1175. LA ESCALA QUE COMPENSA ES 1920/2880/0,60 = 111. Va 118 para tener
// margen, y las luces —que estan en z=1400, magnificacion 0,632— van 112.
//
// La leccion es la general de este motor: una escala en una capa 3D no dice cuanto se dibuja. Lo dice
// la escala DIVIDIDA por la profundidad, y si no se hace la cuenta se ve en el primer cuadro.
var negro = sangra(G.img("p-negro", "negro", 960, 540, 1600, 118), "fondo a sangre");
G.plano(negro, 0, C[7]);

// CADA LUZ EN SU PROPIA Z. Cuatro capas a la misma profundidad no tienen orden de dibujo definido:
// el motor ordena por profundidad y resuelve el empate como quiere, asi que la misma comp puede
// salir distinta en dos corridas.
var zLuz = 1400;
function luz(archivo, nombre, lista) {
  zLuz = zLuz + 4;
  var L = sangra(G.img(archivo, nombre, 960, 540, zLuz, 112), "luz de fondo a sangre");
  G.claves(G.op(L), lista, nombre + "-op");
  G.plano(L, lista[0][0], lista[lista.length - 1][0] + 1);
  return L;
}
luz("p-luz-violeta", "luz-violeta", [[0, 92, "C3"], [C[4] + 30, 92, "C6"], [C[5] - 20, 24, "C6"],
                                     [C[6] + 20, 70, "C3"], [C[7] - 6, 70], [C[7], 0]]);
luz("p-luz-magenta", "luz-magenta", [[C[4], 0, "C6"], [C[4] + 26, 66, "C6"], [C[5] - 40, 20], [C[5] - 6, 0]]);
luz("p-luz-naranja", "luz-naranja", [[C[4] + 34, 0, "C6"], [C[4] + 74, 78, "C3"], [C[5] - 10, 40, "C6"],
                                     [C[6] + 40, 30, "C6"], [C[7] - 6, 46], [C[7], 0]]);
luz("p-luz-azul", "luz-azul", [[C[5] - 4, 0, "C6"], [C[5] + 22, 84, "C3"], [C[6] - 10, 60], [C[6] + 8, 0]]);

// ================================================================================================
// EL AYUDANTE QUE HACE TODA LA TIPOGRAFIA DE ESTA PIEZA
// ================================================================================================
//
// Una palabra LLEGA DESENFOCADA Y SE ENFOCA. Son dos capas exactamente en el mismo lugar —la de estela
// y la nitida— cruzandose. No es un fundido entre dos imagenes distintas: es la MISMA palabra con dos
// cantidades de movimiento, que es lo que se ve de verdad cuando algo que venia rapido frena.
//
// Los dos PNG comparten lienzo y centro (los genera la misma funcion), asi que en el cuadro del cruce
// la palabra no se corre un solo pixel. Si tuvieran anclas distintas pegaria un salto justo en el
// cuadro que el ojo esta mirando.
function seEnfoca(base, nombre, x, y, z, esc, tLlega, tEnfoca, tSale, padre) {
  var borrosa = G.img(base + "-e", nombre + "-e", x, y, z, esc);
  var nitida = G.img(base, nombre, x, y, z + 1, esc);
  if (padre) { G.colgar(borrosa, padre); G.colgar(nitida, padre); }
  // la borrosa vive del cuadro en que llega hasta que la nitida la reemplaza
  G.claves(G.op(borrosa), [[tLlega, 0, "C6"], [tLlega + 3, 100, "C3"],
                           [tEnfoca, 100, "C6"], [tEnfoca + 5, 0]], nombre + "-borrosa");
  G.plano(borrosa, tLlega, tEnfoca + 6);
  // y la nitida arranca EN EL CUADRO EXACTO en que la otra empieza a irse
  G.claves(G.op(nitida), [[tEnfoca, 0, "C6"], [tEnfoca + 5, 100, "C3"],
                          [tSale - 4, 100], [tSale, 0]], nombre + "-nitida");
  G.plano(nitida, tEnfoca, tSale + 1);
  return { borrosa: borrosa, nitida: nitida };
}

// ================================================================================================
// PLANOS 1-2 · 0-70 · "Build" gigante -> "Build SaaS Promo"
// ================================================================================================
//
// EL PLANO 1 NO TIENE ENTRADA: la palabra YA ESTA en el cuadro 0, gigante y con estela, derivando a la
// derecha. Es lo que hace el original y es lo que le da el arranque — un video que empieza con algo ya
// en movimiento se lee mas rapido que uno que empieza con algo apareciendo.
var bigE = sangra(G.img("p-build-g-e", "build-gigante-e", 960, 470, -40, 50), "tipografia de despliegue mas ancha que el cuadro");
var bigN = sangra(G.img("p-build-g", "build-gigante", 960, 470, -38, 50), "tipografia de despliegue mas ancha que el cuadro");

// LA DERIVA Y EL ZOOM-OUT SON UNA SOLA CURVA en dos claves: derivan juntas hasta el cuadro 40 y ahi
// se desploman a escala 9 en diez cuadros. Ese desplome ES el corte — el original no corta, se va.
var eBE = G.ejes(bigE), eBN = G.ejes(bigN);
G.claves(eBE.x, [[0, 900, "C6"], [C[1], 1044, "C1"], [C[1] + 10, 960]], "build-g-e-x");
G.claves(eBN.x, [[0, 900, "C6"], [C[1], 1044, "C1"], [C[1] + 10, 960]], "build-g-x");
G.claves(G.esc(bigE), [[0, [50, 50, 100], "C6"], [C[1], [53, 53, 100], "C1"], [C[1] + 10, [9, 9, 100]]], "build-g-e-esc");
G.claves(G.esc(bigN), [[0, [50, 50, 100], "C6"], [C[1], [53, 53, 100], "C1"], [C[1] + 10, [9, 9, 100]]], "build-g-esc");
// la nitida manda mientras deriva; la de estela vuelve a aparecer EN el zoom-out, que es cuando la
// palabra vuelve a moverse rapido
G.claves(G.op(bigN), [[0, 100, "C3"], [C[1] + 1, 100, "C6"], [C[1] + 5, 0]], "build-g-op");
G.claves(G.op(bigE), [[0, 34, "C6"], [10, 0, "C6"], [C[1], 0, "C1"], [C[1] + 4, 100, "C3"],
                      [C[1] + 9, 100], [C[1] + 12, 0]], "build-g-e-op");
G.plano(bigN, 0, C[1] + 6); G.plano(bigE, 0, C[1] + 13);

// LA FRASE CHICA, en un nulo para que las tres se alejen juntas
var ejeF1 = G.nulo("eje-f1", 960, 540, 0);
G.claves(G.esc(ejeF1), [[C[1] + 8, [128, 128, 100], "C3"], [C[1] + 16, [100, 100, 100], "C6"],
                        [C[2], [88, 88, 100]]], "f1-se-aleja");
G.claves(G.ejes(ejeF1).y, [[C[1] + 8, 556, "C3"], [C[1] + 16, 540]], "f1-asienta");
G.plano(ejeF1, C[1] + 8, C[2]);

var F1X = [-274, -33, 241];
var iW;
for (iW = 0; iW < 3; iW++) {
  // el escalonado del enfoque es lo que hace que la frase SE ARME: 3 cuadros entre palabra y palabra.
  // Con las tres enfocando en el mismo cuadro seria una sola imagen que se aclara.
  seEnfoca("p-f1-" + (iW + 1), "f1-" + (iW + 1), 960 + F1X[iW], 540, iW * 2, 33,
           C[1] + 8, C[1] + 12 + iW * 3, C[2], ejeF1);
}

// ================================================================================================
// PLANOS 3-4 · 70-127 · "Engineered for Scale"
// ================================================================================================
//
// "Engineered" mide 2599 px de tinta contra los 1920 del cuadro: NO ENTRA, y no tiene que entrar. En
// el original se ve pasar el medio de la palabra —"ered f"— y esa es la mitad del efecto: una palabra
// mas grande que la pantalla se lee como velocidad, no como un error de encuadre.
var engE = sangra(G.img("p-eng-g-e", "eng-gigante-e", 960, 500, -44, 50), "2600 px de tinta sobre un cuadro de 1920: el gesto ES que no entre");
var engN = sangra(G.img("p-eng-g", "eng-gigante", 960, 500, -42, 50), "2600 px de tinta sobre un cuadro de 1920: el gesto ES que no entre");
var eEE = G.ejes(engE), eEN = G.ejes(engN);
G.claves(eEE.x, [[C[2], 1560, "C6"], [C[3] - 8, 700, "C1"], [C[3], 960]], "eng-g-e-x");
G.claves(eEN.x, [[C[2], 1560, "C6"], [C[3] - 8, 700, "C1"], [C[3], 960]], "eng-g-x");
G.claves(G.esc(engE), [[C[2], [50, 50, 100], "C6"], [C[3] - 8, [50, 50, 100], "C1"], [C[3], [8, 8, 100]]], "eng-g-e-esc");
G.claves(G.esc(engN), [[C[2], [50, 50, 100], "C6"], [C[3] - 8, [50, 50, 100], "C1"], [C[3], [8, 8, 100]]], "eng-g-esc");
G.claves(G.op(engE), [[C[2], 100, "C3"], [C[2] + 8, 30, "C6"], [C[3] - 10, 26, "C1"],
                      [C[3] - 4, 100, "C3"], [C[3], 100], [C[3] + 3, 0]], "eng-g-e-op");
G.claves(G.op(engN), [[C[2], 60, "C1"], [C[2] + 8, 100, "C3"], [C[3] - 8, 100, "C6"], [C[3] - 3, 0]], "eng-g-op");
G.plano(engE, C[2], C[3] + 4); G.plano(engN, C[2], C[3]);

var ejeF2 = G.nulo("eje-f2", 960, 540, 0);
G.claves(G.esc(ejeF2), [[C[3] - 2, [128, 128, 100], "C3"], [C[3] + 6, [100, 100, 100], "C6"],
                        [C[4], [88, 88, 100]]], "f2-se-aleja");
G.claves(G.ejes(ejeF2).y, [[C[3] - 2, 556, "C3"], [C[3] + 6, 540]], "f2-asienta");
G.plano(ejeF2, C[3] - 2, C[4]);

var F2X = [-204, 128, 332];
for (iW = 0; iW < 3; iW++) {
  seEnfoca("p-f2-" + (iW + 1), "f2-" + (iW + 1), 960 + F2X[iW], 540, iW * 2, 33,
           C[3] - 2, C[3] + 2 + iW * 3, C[4], ejeF2);
}

// ================================================================================================
// PLANO 5 · 127-217 · LA BARRA · 90 cuadros · el plano con mas mecanica de la pieza
// ================================================================================================
//
// Seis tiempos encadenados, y este es el plano que yo directamente no habia visto:
//
//   127  aparece SOLO el cursor
//   131  entra el FILO de luz de arriba, barriendo de izquierda a derecha
//   137  se completa el cuerpo de la barra con su halo
//   142  empieza el tecleo, un caracter por cuadro
//   166  aparece la lupa a la derecha
//   170  llega el puntero desde abajo a la derecha y clickea en el 182
//
// Y ATRAVESANDO LOS SEIS: la barra SE ALEJA DE CAMARA todo el tiempo, sin parar, desde que aparece
// hasta que se apaga. Ese alejamiento continuo es lo que sostiene noventa cuadros — no hay ningun
// tramo quieto porque nunca deja de moverse.
//
// TODO CUELGA DE UN NULO, y eso no es comodidad: el tecleo escribe claves de posicion en el cursor
// (una por caracter). Alejar cada pieza por separado obligaria a sincronizar esas 24 claves con las
// del cuerpo y las de la lupa. Colgadas, el alejamiento es UNA animacion y las cinco lo obedecen.
//
// Y EL NULO SE CUELGA ANTES DE ANIMARSE. Al emparentar, AE reescribe la posicion del hijo para
// conservar su lugar en el mundo, y con el padre ya animado esa compensacion vale para UN cuadro: la
// capa queda en su sitio en el cuadro actual y corrida en todos los demas, sin ningun error.
var ejeB = G.nulo("eje-barra", 960, 540, 0);

var filo = G.img("p-barra-filo", "barra-filo", 960, 452, 2, 33);
var barra = G.img("p-barra", "barra", 960, 540, 4, 50);
var lupa = G.img("p-lupa", "lupa", 1660, 540, 0, 25);

// LA FUENTE SE ESCRIBE CON SU NOMBRE POSTSCRIPT — "SegoeUI", sin espacio.
//
// Con "Segoe UI" AE la sustituyo en silencio por Century Gothic. Lo dijo una sonda que le pregunto a
// AE por `doc.font`, no un cuadro: en pantalla las dos son geometricas y a simple vista pasa. Es
// exactamente el fallo que la biblioteca ya vigila en Skia, y del lado de AE se cuela porque
// `TextDocument.font` no espera el nombre de familia sino el POSTSCRIPT.
var tec = Gt.maquinaDeEscribir({
  cadena: "The smartest way to ship",
  tam: 96, x: 300, y: 566, z: 1, centrado: false,
  desde: C[4] + 15, porCaracter: 1, parpadeo: 12,
  cursorDesde: C[4], hasta: C[5] - 24,
  color: [0.96, 0.95, 1], colorCursor: [0.68, 0.55, 1],
  fuente: "SegoeUI", nombre: "tecleo"
});

G.colgar(filo, ejeB); G.colgar(barra, ejeB); G.colgar(lupa, ejeB);
G.colgar(tec.capa, ejeB);
if (tec.cursor) { G.colgar(tec.cursor, ejeB); }

// LA CAPA DEL TECLEO VIVIA DESDE EL CUADRO 0, y no por un descuido mio: `Gt.maquinaDeEscribir` hace
// `G.plano(capa, Math.min(0, o.desde), o.hasta)`, y con `desde` positivo ese minimo da 0. La capa
// queda viva y con opacidad cero desde el arranque de la pieza — invisible, pero presente, y por eso
// `ritmo` la contaba empatada en profundidad con la tipografia del plano 1 durante 130 cuadros.
G.plano(tec.capa, C[4] + 12, C[5]);

// Y EL ARREGLO DE ESE EMPATE ROMPIO EL PLANO ENTERO, que es el defecto mas caro de esta pieza.
//
// Le puse z=6 a la capa del texto para desempatarla. La barra vive en z=4, y en este motor una z mayor
// esta MAS LEJOS de la camara: el texto quedo DETRAS del cuerpo opaco de la barra. En pantalla se veia
// la barra vacia con el cursor moviendose solo —el cursor es otra capa y habia quedado en z=0, o sea
// delante—, o sea exactamente "ni se muestra como si estuviera escribiendo".
//
// Ninguna compuerta lo vio: la capa esta viva, visible segun su opacidad, dentro de cuadro y sin
// chocar con nada. Lo tapa otra capa, que es una pregunta que ninguna de las seis hace.
//
// El apilado del plano, de adelante hacia atras: lupa 0, texto 1, filo 2, cursor 3, barra 4.
if (tec.cursor) { G.ejes(tec.cursor).z.setValue(3); }

// EL ALEJAMIENTO. De escala 132 a 26 en noventa cuadros, con la curva casi lineal: en el original no
// frena ni acelera, es una deriva pareja. Y sube un poco, porque la camara no baja con ella.
G.claves(G.esc(ejeB), [[C[4], [132, 132, 100], "C6"], [C[4] + 30, [104, 104, 100], "LINEAL"],
                       [C[5] - 24, [40, 40, 100], "C6"], [C[5], [26, 26, 100]]], "barra-se-aleja");
G.claves(G.ejes(ejeB).y, [[C[4], 560, "C6"], [C[5], 476]], "barra-sube");
G.plano(ejeB, C[4], C[5]);

// el filo de arriba: barre de izquierda a derecha ANTES que exista el cuerpo
G.claves(G.esc(filo), [[C[4] + 4, [4, 33, 100], "C1"], [C[4] + 12, [33, 33, 100]]], "filo-barre");
G.claves(G.op(filo), [[C[4] + 4, 0, "C6"], [C[4] + 8, 100, "C3"], [C[4] + 30, 62, "C6"],
                      [C[5] - 20, 40], [C[5] - 2, 0]], "filo-op");
G.plano(filo, C[4] + 4, C[5]);

// el cuerpo llega despues, creciendo desde el filo
// LA ESCALA DE LA BARRA SE ESCRIBE UNA SOLA VEZ, con el crecimiento Y el acuse del clic en la misma
// lista. Dos llamadas se pisarian y la biblioteca las rechaza: AE mezclaria los tipos de interpolacion
// en la union y el tramo quedaria lineal de un lado y bezier del otro, sin dar ningun sintoma en AE.
G.claves(G.esc(barra), [[C[4] + 10, [50, 6, 100], "C1"], [C[4] + 18, [50, 54, 100], "C8"],
                        [C[4] + 24, [50, 50, 100], "C3"],
                        [T_CLIC + 3, [50, 50, 100], "C7"], [T_CLIC + 6, [48.5, 48.5, 100], "C8"],
                        [T_CLIC + 15, [50, 50, 100]]], "barra-crece-y-acusa");
G.claves(G.op(barra), [[C[4] + 10, 0, "C6"], [C[4] + 16, 100, "C3"], [C[5] - 14, 100], [C[5] - 2, 0]], "barra-op");
G.plano(barra, C[4] + 10, C[5]);

// la lupa, cuando el texto ya casi termino
G.claves(G.esc(lupa), [[C[4] + 39, [8, 8, 100], "C1"], [C[4] + 46, [27, 27, 100], "C8"],
                       [C[4] + 52, [25, 25, 100]]], "lupa-esc");
G.claves(G.op(lupa), [[C[4] + 39, 0, "C6"], [C[4] + 45, 100, "C3"], [C[5] - 14, 100], [C[5] - 2, 0]], "lupa-op");
G.plano(lupa, C[4] + 39, C[5]);

// EL PUNTERO SIGUE A LA LUPA CON UN ENLACE, Y ESA ES LA UNICA FORMA DE QUE NO CLICKEE AL VACIO.
//
// La primera version le puso al puntero un destino FIJO: (1338, 600). Pero la lupa cuelga de un nulo
// que se achica de 132% a 26% mientras se aleja, asi que su posicion en pantalla cambia todos los
// cuadros. En el cuadro del clic la lupa estaba en (1380, 509) y el puntero apoyaba en (1338, 600):
// 42 px a la izquierda y 91 px abajo. Thiago: "el mouse clickea en cualquier lado".
//
// No hay forma de acertarle con un numero escrito a mano — habria que recalcularlo cada vez que se
// toca el alejamiento. `G.enlazar` lee la posicion de la lupa EN EL MUNDO (con `toWorld`, que es lo
// que compone la cadena de padres) y se la da al nulo del puntero. El puntero pasa a apuntar donde
// esta la lupa, y va a seguir apuntando ahi aunque manana cambie el alejamiento entero.
//
// Y el nulo NO se escala: el puntero se queda del lado de aca del vidrio, del tamano de un cursor,
// mientras la interfaz se aleja. Es lo que hace el original.
var T_CLIC = C[4] + 55;
var ejeP = G.nulo("eje-puntero", 960, 540, 0);
var eEP = G.ejes(ejeP);
G.enlazar({ capa: ejeP, prop: eEP.x, a: lupa, deQue: "posX", offset: 0, retardo: 0, donde: "puntero-sigue-lupa-x" });
G.enlazar({ capa: ejeP, prop: eEP.y, a: lupa, deQue: "posY", offset: 0, retardo: 0, donde: "puntero-sigue-lupa-y" });
G.plano(ejeP, T_CLIC - 14, C[5]);

var pt = G.img("p-puntero", "puntero", 0, 0, 0, 16);
G.anc(pt).setValue([6 * 5, 4 * 5, 0]);
G.colgar(pt, ejeP, [0, 0, -60]);
var ePt = G.ejes(pt);
// la aproximacion es LOCAL: viene de abajo a la derecha y termina en (0,0), o sea exactamente sobre la
// lupa, sin que haga falta saber donde va a estar la lupa en ese cuadro
G.claves(ePt.x, [[T_CLIC - 12, 420, "C1"], [T_CLIC, 0]], "puntero-x");
G.claves(ePt.y, [[T_CLIC - 12, 330, "C1"], [T_CLIC, 0]], "puntero-y");
G.claves(G.esc(pt), [[T_CLIC, [16, 16, 100], "C7"], [T_CLIC + 3, [13, 13, 100], "C8"],
                     [T_CLIC + 12, [16, 16, 100], "C6"], [C[5] - 10, [11, 11, 100]]], "puntero-aprieta");
G.claves(G.op(pt), [[T_CLIC - 12, 0, "C6"], [T_CLIC - 6, 100, "C3"], [C[5] - 12, 100], [C[5] - 2, 0]], "puntero-op");
G.plano(pt, T_CLIC - 12, C[5]);

// y el clic produce algo: la barra acusa el golpe en el cuadro exacto en que el puntero apoya
// el anillo del clic cuelga del mismo nulo, asi que nace exactamente donde el puntero apoya
var anillo = G.img("p-clic", "clic", 0, 0, 0, 6);
G.colgar(anillo, ejeP, [0, 0, -50]);
G.claves(G.esc(anillo), [[T_CLIC + 2, [6, 6, 100], "C3"], [T_CLIC + 16, [30, 30, 100]]], "clic-esc");
G.claves(G.op(anillo), [[T_CLIC + 2, 90, "C3"], [T_CLIC + 16, 0]], "clic-op");
G.plano(anillo, T_CLIC + 2, T_CLIC + 17);

// ================================================================================================
// PLANO 6 · 217-275 · LA MARCA · 58 cuadros
// ================================================================================================
//
// 1,9 s Y NO 9,7. Thiago sobre la version anterior: "el plano que revela la marca es demasiado lento,
// y no es tanto como el original". Tenia razon y el original lo confirma: el revelado de marca dura
// menos de dos segundos. Lo que yo habia estirado a nueve segundos era este plano MAS la barra, que no
// habia visto que existiera.
var fant = sangra(G.img("p-fantasma", "fantasma", 960, 500, 900, 92), "letras fantasma de fondo, a sangre");
// AL 46 Y NO AL 100. Un fondo que se puede LEER deja de ser fondo: al 100 las letras gigantes
// competian con el logotipo que tenian que sostener, y en el cuadro se veian como un texto gris
// enorme con un simbolo encima.
G.claves(G.op(fant), [[C[5], 0, "C6"], [C[5] + 12, 46, "C3"], [C[6] - 14, 46], [C[6] - 2, 0]], "fantasma-op");
G.claves(G.esc(fant), [[C[5], [100, 100, 100], "C6"], [C[6], [92, 92, 100]]], "fantasma-deriva");
G.plano(fant, C[5], C[6]);

var ejeM = G.nulo("eje-marca", 960, 528, 0);
G.claves(G.esc(ejeM), [[C[5], [116, 116, 100], "C3"], [C[5] + 14, [100, 100, 100], "C6"],
                       [C[6] - 10, [96, 96, 100], "C1"], [C[6], [128, 128, 100]]], "marca-asienta");
G.plano(ejeM, C[5], C[6]);

// EL ISOTIPO A 620 Y EL LOGOTIPO A 1120: a 700 y 1060 el arco se metia 170 px adentro de la caja de
// la "A". No lo caza ninguna compuerta —dos imagenes superpuestas no son texto que choque con
// texto— y en el cuadro se ve al instante.
var iso = G.img("p-iso", "iso", 620, 528, 0, 33);
G.colgar(iso, ejeM);
G.claves(G.esc(iso), [[C[5] + 2, [10, 10, 100], "C1"], [C[5] + 14, [36, 36, 100], "C8"],
                      [C[5] + 21, [33, 33, 100]]], "iso-esc");
G.claves(G.rotZ(iso), [[C[5] + 2, -95, "C1"], [C[5] + 18, 0]], "iso-giro");
G.claves(G.op(iso), [[C[5] + 2, 0, "C6"], [C[5] + 10, 100, "C3"], [C[6] - 12, 100], [C[6] - 2, 0]], "iso-op");
G.plano(iso, C[5] + 2, C[6]);

// EL LOGOTIPO SE ESCRIBE, LETRA POR LETRA, con 3 cuadros de retardo. Es la coreografia que Thiago
// viene pidiendo: cuatro llegadas en vez de una aparicion.
var LX = [-144, -40, 44, 151];
var iL;
for (iL = 0; iL < 4; iL++) {
  var lt = G.img("p-w-" + (iL + 1), "w-" + (iL + 1), 1120 + LX[iL], 528, 2 + iL * 2, 33);
  G.colgar(lt, ejeM);
  // LAS CLAVES VAN EN COORDENADAS LOCALES, Y ESTE ERROR PUSO EL LOGOTIPO 528 PX MAS ABAJO.
  //
  // Al colgar de un nulo, AE reescribe la posicion del hijo para que no se mueva: la letra pasa de
  // estar en y=528 del mundo a estar en y=0 del nulo. Si despues le escribo claves con los valores
  // ABSOLUTOS (566, 521, 528) le estoy pidiendo que se vaya 528 px por debajo del nulo — o sea fuera
  // del cuadro. Y no da ningun error: la capa esta viva, visible, simplemente donde no va.
  //
  // El nulo esta en y=528, asi que los tres valores se restan de ahi: 566->38, 521->-7, 528->0.
  var t0 = C[5] + 16 + iL * 3;
  G.claves(G.ejes(lt).y, [[t0, 38, "C1"], [t0 + 8, -7, "C8"], [t0 + 13, 0]], "w" + (iL + 1) + "-y");
  G.claves(G.op(lt), [[t0, 0, "C6"], [t0 + 6, 100, "C3"], [C[6] - 12, 100], [C[6] - 2, 0]], "w" + (iL + 1) + "-op");
  G.plano(lt, t0, C[6]);
}

// las particulas que suben debajo de la marca
var part = G.img("p-particulas", "particulas", 960, 760, 20, 50);
G.claves(G.ejes(part).y, [[C[5] + 14, 820, "C6"], [C[6], 690]], "particulas-suben");
G.claves(G.op(part), [[C[5] + 14, 0, "C6"], [C[5] + 26, 82, "C3"], [C[6] - 12, 60], [C[6] - 2, 0]], "particulas-op");
G.plano(part, C[5] + 14, C[6]);

// LA ATRIBUCION. La licencia CC-BY la exige y este es su lugar: dentro de la pieza, legible, sin
// competir con nada.
var cred = G.img("p-credito", "credito", 960, 936, 0, 33);
G.claves(G.op(cred), [[C[5] + 30, 0, "C6"], [C[5] + 42, 100, "C3"], [C[6] - 12, 100], [C[6] - 2, 0]], "credito-op");
G.plano(cred, C[5] + 30, C[6]);

// ================================================================================================
// PLANO 7 · 275-390 · EL TABLERO · 115 cuadros
// ================================================================================================
//
// El plano que Thiago rescato de la version anterior — "la interfaz esa que hiciste de verdad tiene
// animaciones internas y estan buenas" — reconstruido con el reparto que tiene el original: cuatro
// tarjetas de cifra en fila arriba y un panel de grafico grande abajo.
//
// EL GIRO NUNCA CRUZA EL FRENTE, y eso es geometria y no gusto: en un plano girado la profundidad de
// un hijo la da z*cos(t) + x*sen(t), asi que una tarjeta 6 unidades delante del panel pero 300 a un
// costado tiene la MISMA profundidad a -1,1 grados — y ahi el motor puede dibujarla detras del panel.
// La tarjeta se apagaria sola a mitad del plano, sin ningun error.
var ejeD = G.nulo("eje-tablero", 960, 540, 0);
var ejeDb = G.nulo("eje-tablero-b", 960, 540, 0);
G.colgar(ejeDb, ejeD);
G.plano(ejeDb, C[6], C[7]);

G.claves(G.rotY(ejeD), [[C[6], -46, "C1"], [C[6] + 20, -26, "LINEAL"],
                        [C[6] + 78, -20, "C6"], [C[7], -8]], "tablero-giro");
G.claves(G.ejes(ejeD).z, [[C[6], 1500, "C1"], [C[6] + 22, 60, "LINEAL"],
                          [C[6] + 96, -180, "C1"], [C[7], 900]], "tablero-z");
G.claves(G.ejes(ejeD).x, [[C[6] + 22, 1080, "C6"], [C[7], 880]], "tablero-panea");
G.plano(ejeD, C[6], C[7]);

var marco = G.img("p-d-marco", "d-marco", 0, 0, 0, 50);
G.colgar(marco, ejeDb, [0, 0, 0]);
G.claves(G.op(marco), [[C[6], 0, "C6"], [C[6] + 10, 100, "C3"], [C[7] - 10, 100], [C[7] - 2, 0]], "d-marco-op");
G.plano(marco, C[6], C[7]);

var dfilo = G.img("p-d-filo", "d-filo", 0, 0, 0, 33);
G.colgar(dfilo, ejeDb, [0, 430, -18]);
G.claves(G.op(dfilo), [[C[6], 0, "C1"], [C[6] + 14, 100, "C3"], [C[6] + 30, 66, "C6"],
                       [C[7] - 10, 66], [C[7] - 2, 0]], "d-filo-op");
G.plano(dfilo, C[6], C[7]);

// EL TITULO SE ESCRIBE, con una tapa del color exacto del panel que se corre a la derecha. A este
// cuerpo (26 px en el panel) un tecleo con animador y una tapa se ven identicos, y la tapa cuelga del
// nulo como todo lo demas — un animador de texto habria pedido su propio emparentado y sus claves de
// posicion propias, dentro de un plano que gira.
var titulo = G.img("p-d-titulo", "d-titulo", 0, 0, 0, 33);
G.colgar(titulo, ejeDb, [-160, -298, -2.4]);
{
  // 620 DE ANCHO Y NO 580: el titulo va de -437 a 117 en coordenadas del panel, y una tapa de 580 con
  // el ancla en su borde derecho puesto en 150 solo llega hasta -430. Los siete pixeles que quedaban
  // afuera son la primera letra asomando desde el cuadro cero, que es justo lo que un revelado no
  // puede permitirse.
  var tapaT = G.solido("d-titulo-tapa", [0.027, 0.024, 0.059], 620, 44, 0, 0, 0);
  G.colgar(tapaT, ejeDb, [160, -298, -3.6]);
  G.anc(tapaT).setValue([620, 22, 0]);
  G.claves(G.esc(tapaT), [[C[6] + 18, [100, 100, 100], "LINEAL"], [C[6] + 40, [0.5, 100, 100]]], "d-titulo-tapa");
  G.plano(tapaT, C[6] + 14, C[6] + 42);
}
G.claves(G.op(titulo), [[C[6] + 14, 0, "C6"], [C[6] + 18, 100, "C3"], [C[7] - 10, 100], [C[7] - 2, 0]], "d-titulo-op");
G.plano(titulo, C[6] + 14, C[7]);

var baj = G.img("p-d-bajada", "d-bajada", 0, 0, 0, 33);
G.colgar(baj, ejeDb, [-160, -262, -2.4]);
G.claves(G.op(baj), [[C[6] + 36, 0, "C6"], [C[6] + 44, 100, "C3"], [C[7] - 10, 100], [C[7] - 2, 0]], "d-bajada-op");
G.plano(baj, C[6] + 36, C[7]);

// las cuatro tarjetas, escalonadas 5 cuadros. Cada una lleva su rotulo pegado: un numero sin sujeto no
// es un dato, es la forma de un dato.
var TX = [-314, -32, 250, 532];
// LAS TENDENCIAS ARRANCAN 30 PX ADENTRO DE SU TARJETA, no 62: con el ancla en el borde izquierdo,
// una linea de 96 px que empieza en TX+62 termina 32 px afuera del panel al que pertenece.
var SX = [-284, -2, 280, 562];
var iT;
for (iT = 0; iT < 4; iT++) {
  var tj = G.img("p-d-t" + (iT + 1), "d-t" + (iT + 1), 0, 0, 0, 33);
  G.colgar(tj, ejeDb, [TX[iT], -146, -6 - iT * 1.2]);
  var t0t = C[6] + 30 + iT * 5;
  G.claves(G.esc(tj), [[t0t, [20, 20, 100], "C1"], [t0t + 8, [36, 36, 100], "C8"],
                       [t0t + 14, [33, 33, 100]]], "d-t" + (iT + 1) + "-esc");
  G.claves(G.op(tj), [[t0t, 0, "C6"], [t0t + 6, 100, "C3"], [C[7] - 10, 100], [C[7] - 2, 0]], "d-t" + (iT + 1) + "-op");
  G.plano(tj, t0t, C[7]);

  // la tendencia se DIBUJA: crece en x desde su borde izquierdo
  var sp = G.img("p-d-s" + (iT + 1), "d-s" + (iT + 1), 0, 0, 0, 25);
  G.colgar(sp, ejeDb, [SX[iT], -104, -11 - iT * 1.2]);
  G.anc(sp).setValue([0, 80, 0]);
  var t0s = t0t + 10;
  G.claves(G.esc(sp), [[t0s, [0.5, 25, 100], "C1"], [t0s + 16, [25, 25, 100]]], "d-s" + (iT + 1) + "-crece");
  G.claves(G.op(sp), [[t0s, 0, "C6"], [t0s + 4, 100, "C3"], [C[7] - 10, 100], [C[7] - 2, 0]], "d-s" + (iT + 1) + "-op");
  G.plano(sp, t0s, C[7]);
}

// el panel del grafico y su linea, que se dibuja con una tapa que SE ENCOGE desde el borde derecho.
// Encogerla y no correrla es lo que garantiza que no pise un solo pixel de fuera del campo.
var gpanel = G.img("p-d-grafico", "d-grafico", 0, 0, 0, 50);
G.colgar(gpanel, ejeDb, [116, 120, -3]);
G.claves(G.esc(gpanel), [[C[6] + 50, [50, 14, 100], "C1"], [C[6] + 62, [50, 54, 100], "C8"],
                         [C[6] + 68, [50, 50, 100]]], "d-grafico-crece");
G.claves(G.op(gpanel), [[C[6] + 50, 0, "C6"], [C[6] + 56, 100, "C3"], [C[7] - 10, 100], [C[7] - 2, 0]], "d-grafico-op");
G.plano(gpanel, C[6] + 50, C[7]);

var glinea = G.img("p-d-linea", "d-linea", 0, 0, 0, 50);
G.colgar(glinea, ejeDb, [116, 138, -5]);
G.claves(G.op(glinea), [[C[6] + 66, 100, "C3"], [C[7] - 10, 100], [C[7] - 2, 0]], "d-linea-op");
G.plano(glinea, C[6] + 66, C[7]);
{
  var tapaG = G.solido("d-linea-tapa", [0.063, 0.063, 0.125], 1068, 224, 0, 0, 0);
  G.colgar(tapaG, ejeDb, [650, 138, -6.2]);
  G.anc(tapaG).setValue([1068, 112, 0]);
  G.claves(G.esc(tapaG), [[C[6] + 66, [100, 100, 100], "LINEAL"], [C[6] + 94, [0.5, 100, 100]]], "d-linea-tapa");
  G.plano(tapaG, C[6] + 66, C[6] + 96);
}

var boton = G.img("p-d-boton", "d-boton", 0, 0, 0, 25);
G.colgar(boton, ejeDb, [601, -387, -8]);
G.claves(G.esc(boton), [[C[6] + 84, [16, 16, 100], "C1"], [C[6] + 92, [27, 27, 100], "C8"],
                        [C[6] + 98, [25, 25, 100]]], "d-boton-esc");
G.claves(G.op(boton), [[C[6] + 84, 0, "C6"], [C[6] + 90, 100, "C3"], [C[7] - 10, 100], [C[7] - 2, 0]], "d-boton-op");
G.plano(boton, C[6] + 84, C[7]);

Gd.microMovimiento({ capa: ejeDb, desde: C[6] + 24, hasta: C[7] - 6, cada: 8,
                     propiedades: ["posx", "posy"], amplitudes: { posx: 3, posy: 3 },
                     donde: "tablero-respira" });

// ================================================================================================
// PLANO 8 · 390-420 · CORTE A BLANCO · "Give your team"
// ================================================================================================
//
// El corte mas violento de la pieza y esta en el original: de negro con luz propia a blanco, en un
// cuadro. Mismo patron de tipografia que los planos 1 y 3 — palabra gigante, zoom-out, y las tres
// palabras enfocandose de a una.
var blanco = sangra(G.img("p-blanco", "blanco", 960, 540, 1400, 112), "fondo a sangre");
G.plano(blanco, C[7], C[9]);
G.claves(G.esc(blanco), [[C[7], [118, 118, 100], "LINEAL"], [C[9], [112, 112, 100]]], "blanco-deriva");

var giveE = sangra(G.img("p-give-g-e", "give-gigante-e", 960, 470, -48, 50), "tipografia de despliegue");
var giveN = sangra(G.img("p-give-g", "give-gigante", 960, 470, -46, 50), "tipografia de despliegue");
G.claves(G.ejes(giveE).x, [[C[7], 820, "C6"], [C[7] + 10, 960]], "give-e-x");
G.claves(G.ejes(giveN).x, [[C[7], 820, "C6"], [C[7] + 10, 960]], "give-x");
G.claves(G.esc(giveE), [[C[7], [50, 50, 100], "C6"], [C[7] + 10, [11, 11, 100]]], "give-e-esc");
G.claves(G.esc(giveN), [[C[7], [50, 50, 100], "C6"], [C[7] + 10, [11, 11, 100]]], "give-esc");
G.claves(G.op(giveE), [[C[7], 100, "C3"], [C[7] + 9, 100], [C[7] + 12, 0]], "give-e-op");
G.claves(G.op(giveN), [[C[7], 70, "C6"], [C[7] + 4, 0]], "give-op");
G.plano(giveE, C[7], C[7] + 13); G.plano(giveN, C[7], C[7] + 5);

var ejeF3 = G.nulo("eje-f3", 960, 540, 0);
G.claves(G.esc(ejeF3), [[C[7] + 8, [126, 126, 100], "C3"], [C[7] + 16, [100, 100, 100], "C6"],
                        [C[8], [90, 90, 100]]], "f3-se-aleja");
G.plano(ejeF3, C[7] + 8, C[8]);

var F3X = [-237, -14, 223];
for (iW = 0; iW < 3; iW++) {
  seEnfoca("p-f3-" + (iW + 1), "f3-" + (iW + 1), 960 + F3X[iW], 540, iW * 2, 33,
           C[7] + 8, C[7] + 12 + iW * 3, C[8], ejeF3);
}

// ================================================================================================
// PLANO 9 · 420-480 · EL ODOMETRO · 2x -> 9x -> 10x
// ================================================================================================
//
// Los cuatro anillos crecen A LA PAR DEL NUMERO: cada salto de la cifra suma un anillo. Esa es la
// mecanica del original y es lo que la vuelve una escena en vez de un rotulo — el numero y la forma
// dicen lo mismo al mismo tiempo.
//
// Y SON TRES CAPAS Y NO UN CONTADOR: en el original el numero SALTA de 2 a 9 a 10, no cuenta. Un
// contador continuo diria otra cosa (que el proceso es gradual) y ademas ninguna de las tres cifras se
// podria leer.
var ejeO = G.nulo("eje-odo", 960, 540, 0);
G.claves(G.ejes(ejeO).x, [[C[8], 960, "C6"], [C[9] - 22, 900, "C1"], [C[9], 300]], "odo-sale");
G.claves(G.esc(ejeO), [[C[8], [84, 84, 100], "C3"], [C[8] + 16, [100, 100, 100], "C6"],
                       [C[9], [112, 112, 100]]], "odo-crece");
G.plano(ejeO, C[8], C[9]);

var iA;
for (iA = 0; iA < 4; iA++) {
  var aro = sangra(G.img("p-aro-" + (iA + 1), "aro-" + (iA + 1), 960, 540, 30 + iA * 2, 68),
                   "los anillos exteriores salen del cuadro, como en el original");
  G.colgar(aro, ejeO);
  var t0a = C[8] + 2 + iA * 12;
  G.claves(G.esc(aro), [[t0a, [30, 30, 100], "C1"], [t0a + 14, [73, 73, 100], "C8"],
                        [t0a + 20, [68, 68, 100]]], "aro" + (iA + 1) + "-esc");
  G.claves(G.op(aro), [[t0a, 0, "C6"], [t0a + 8, 100, "C3"], [C[9] - 8, 100], [C[9] - 1, 0]], "aro" + (iA + 1) + "-op");
  G.plano(aro, t0a, C[9]);
}

var ODOT = [C[8] + 2, C[8] + 18, C[8] + 34];
var iO;
for (iO = 0; iO < 3; iO++) {
  var od = G.img("p-odo-" + (iO + 1), "odo-" + (iO + 1), 960, 540, 0, 40);
  G.colgar(od, ejeO);
  var fin = (iO === 2) ? C[9] - 1 : ODOT[iO + 1];
  // NO SOBREPASA: un numero que rebota se lee como que el dato es aproximado. La biblioteca lo hace
  // cumplir sola, pero conviene que este escrito donde alguien lo vaya a leer.
  G.claves(G.esc(od), [[ODOT[iO], [34, 34, 100], "C1"], [ODOT[iO] + 6, [40, 40, 100]]], "odo" + (iO + 1) + "-esc");
  G.claves(G.op(od), [[ODOT[iO], 0, "C6"], [ODOT[iO] + 4, 100, "C3"], [fin - 3, 100], [fin, 0]], "odo" + (iO + 1) + "-op");
  G.plano(od, ODOT[iO], fin + 1);
}

// ================================================================================================
// PLANO 10 · 480-510 · "Growth"
// ================================================================================================
var negro2 = sangra(G.img("p-negro", "negro-2", 960, 540, 1600, 118), "fondo a sangre");
G.plano(negro2, C[9], C[10]);
var luzG = sangra(G.img("p-luz-violeta", "luz-growth", 960, 540, 1400, 112), "luz de fondo a sangre");
G.claves(G.op(luzG), [[C[9], 0, "C6"], [C[9] + 10, 80, "C3"], [C[10] - 4, 80], [C[10] - 1, 0]], "luz-growth-op");
G.plano(luzG, C[9], C[10]);

var grE = sangra(G.img("p-growth-g-e", "growth-e", 960, 520, -52, 50), "tipografia de despliegue");
var grN = sangra(G.img("p-growth-g", "growth", 960, 520, -50, 50), "tipografia de despliegue");
G.claves(G.ejes(grE).x, [[C[9], 1420, "C1"], [C[9] + 12, 960, "C6"], [C[10], 880]], "growth-e-x");
G.claves(G.ejes(grN).x, [[C[9], 1420, "C1"], [C[9] + 12, 960, "C6"], [C[10], 880]], "growth-x");
G.claves(G.op(grE), [[C[9], 100, "C3"], [C[9] + 10, 100, "C6"], [C[9] + 16, 0]], "growth-e-op");
G.claves(G.op(grN), [[C[9] + 10, 0, "C6"], [C[9] + 16, 100, "C3"], [C[10] - 4, 100], [C[10] - 1, 0]], "growth-op");
G.plano(grE, C[9], C[9] + 17); G.plano(grN, C[9] + 10, C[10]);

di("PIEZA-P planos 1-10 construida");
var cierre = G.cerrar();
di("capas: " + cierre.capas);
di("avisos: " + cierre.avisos.length);
var iAv;
for (iAv = 0; iAv < cierre.avisos.length; iAv++) { di("  aviso: " + cierre.avisos[iAv]); }

} catch (err) {
  di("ERROR: " + err.toString());
  if (err.line) { di("  linea " + err.line); }
}
