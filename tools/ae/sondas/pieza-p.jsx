// ================================================================================================
// PIEZA-P · recreacion 1:1 de una plantilla con licencia CC-BY · PLANOS 1 a 6 (la primera mitad)
// ================================================================================================
//
// EL ORIGINAL Y SU LICENCIA
//   "SaaS Product Promo After Effects Template | Premium Web & App Presentation 2026"
//   canal "AE Template & Premiere Pro Template" · https://www.youtube.com/watch?v=n8uq1ZOOQ6o
//   Creative Commons Attribution license (reuse allowed) — verificado leyendo los metadatos, no
//   confiando en lo que decia nadie.
//
//   La CC-BY habilita adaptar y redistribuir con atribucion. La atribucion NO va en un comentario:
//   va escrita en el plano 3, dentro de la pieza, que es donde la licencia la pide.
//
//   Lo unico que NO se copia son los nombres de productos de terceros que se leen en el tablero del
//   original. Una marca registrada ajena no es del autor de la plantilla, asi que su licencia no
//   puede cederla. Van nombres propios.
//
// ================================================================================================
// DE DONDE SALE CADA TIEMPO — medido, no estimado
// ================================================================================================
//
// Se bajo el video, se extrajeron los 3187 cuadros en gris y se midieron. Los cortes cayeron en los
// cuadros 139, 188, 767, 861, 964 y 1939 a 59,94 fps. Pasados a los 30 fps de esta pieza:
//
//   plano 1    0 - 70    2,33 s    tipografia cinetica, tres tiempos
//   plano 2   70 - 94    0,80 s    un golpe de una sola palabra
//   plano 3   94 - 384   9,67 s    el revelado de marca
//   plano 4  384 - 431   1,57 s    la malla clara
//   plano 5  431 - 482   1,70 s    los anillos y la cifra
//   plano 6  482 - 970  16,27 s    el tablero
//
// Y el resto de la medicion, que es lo que ordena las magnitudes:
//   16 cortes en 53 s = 0,30/s   · dentro de la banda del corpus (0,20 a 0,69)
//   entrada de rotulo x1,00      · p90 x2,00 — o sea que el gesto grande existe pero es la excepcion
//   quietud por rotulo 0,58 s    · exactamente la mediana del genero
//   silencio mas largo 5,84 s    · el genero va de 2,13 a 8,18
//
// A 30 fps Y NO A 60, que es lo que corre el original. Es una decision con costo y hay que decirlo:
// el original es mas fluido en los latigazos. Toda la biblioteca —la formula del sobrepaso, las ocho
// curvas, las bandas de duracion— esta medida y verificada a 30, y nunca corrio a 60. Cambiar el
// reloj para esta pieza seria estrenar el motor entero en el peor momento posible.
//
// ================================================================================================
// LA LEY QUE ORDENA TODA LA COREOGRAFIA DE ESTA PIEZA
// ================================================================================================
//
// Dicho por el usuario, y es la correccion mas util que recibi sobre este trabajo:
//
//   "una diferencia grande es poner un texto entero que dure 2 segundos que aparece de la nada, a
//    usar una animacion que muestra 'tu video' y luego otra animacion que se junta con 'tu video' y
//    queda el texto entero, eso si esta bien, POR BUENA COREOGRAFIA"
//
// Un rotulo que aparece completo no tiene coreografia: tiene una entrada, que dura doce cuadros, y
// despues nada. Un rotulo que SE ARMA tiene tantos tiempos como partes — y esos tiempos son los que
// llenan los segundos que de otro modo hay que rellenar con quietud.
//
// Por eso en esta pieza NINGUNA frase entra entera. Entran palabras. El logotipo entra letra por
// letra. El tablero entra en diecisiete piezas. Los recursos ya vienen partidos de fabrica
// (`recursos-p1.mjs` y `recursos-p2.mjs`) justamente para que armarlas de otro modo sea imposible.
//
// ================================================================================================
// FICHA DE ARTE
// ================================================================================================
// FAMILIA      producto nocturno con luz propia. Dos mundos: el negro con el suelo encendido (planos
//              1, 2, 3 y 6) y la malla lila clara (planos 4 y 5). El corte entre los dos ES el gesto.
// PALETA       negro #030308 · violeta #7C4DFF · violeta claro #B79BFF · naranja #EC6036
//              claro #EDEAFB · gris #8B85A8
// LUZ          NO es un degradado de arriba a abajo: es una fuente puntual BAJA. Esa diferencia es la
//              que hace que el negro de arriba se lea como profundidad y no como un fondo plano.
// FORMA        el rombo facetado del isotipo y el rectangulo de esquina muy redondeada del tablero.
// TIPOGRAFIA   Segoe UI 700 rellena con un degradado que corre a lo largo de la FRASE ENTERA, no de
//              cada palabra: cuando las palabras terminan de juntarse el degradado es continuo.
// PROFUNDIDAD  camara con perspectiva. El tablero vive en un plano inclinado que gira durante los
//              dieciseis segundos, y su canto lleva un filo de luz — que es lo que lo hace leer como
//              un objeto con espesor y no como una imagen deformada.
// SIMBOLO      la marca que se escribe sola, y despues el producto trabajando.
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

// EL PROYECTO ES PROPIO. `VideoUrvidPrueba.aep` queda intacto: pedido explicito del usuario, y sin
// esto la comp caeria adentro de ese archivo por el solo hecho de estar abierto.
G.iniciar({
  nombre: "PIEZA-P",
  cuadros: 970,
  fps: 30,
  recursos: "C:/ae-probe/recursos-p",
  proyecto: "C:/ae-probe/PIEZA-P.aep",
  informe: "C:/ae-probe/gesto-p.txt",
  fondo: [0.012, 0.012, 0.031]
});

G.camara({ distancia: 2400 });

// los seis cortes, en un solo lugar
var C = [0, 70, 94, 384, 431, 482, 970];

// ================================================================================================
// PLANO 1 · 0-70 · LA TIPOGRAFIA SE ARMA EN TRES TIEMPOS
// ================================================================================================
//
// "Construido para equipos" mide 3464 px a 300 de cuerpo y el cuadro tiene 1920: en una sola linea no
// entra ni queriendo. Va en dos lineas y en tres llegadas — "Construido" arriba, "para" abajo, y
// "equipos" sumandose a la derecha de "para". Cada llegada es un tiempo, asi que los 2,3 segundos
// tienen tres acentos en vez de uno.
//
// Las tres cuelgan de un NULO. Sin el, la deriva final y la salida serian nueve juegos de claves que
// hay que mantener sincronizados a mano; con el, es un solo juego y las tres lo obedecen. Es lo mismo
// que hace un enlace, resuelto con la herramienta mas barata que alcanza.
var suelo1 = G.img("p-suelo", "suelo-1", 960, 540, 600, 40);
G.plano(suelo1, 0, C[2]);
// vive hasta el plano 2 porque los dos comparten mundo: el corte del cuadro 70 es de CONTENIDO, no de
// fondo, y cambiar el fondo tambien lo volveria un corte de lugar.
G.claves(G.esc(suelo1), [[0, [40, 40, 100], "LINEAL"], [C[2], [43, 43, 100]]], "suelo-1-deriva");

var eje1 = G.nulo("eje-1", 960, 540, 0);

var k1 = G.img("p-k-1", "k-construido", 0, 0, 0, 50);
var k2 = G.img("p-k-2", "k-para", 0, 0, 0, 50);
var k3 = G.img("p-k-3", "k-equipos", 0, 0, 0, 50);

// las posiciones LOCALES, calculadas del ancho real que midio el generador
// linea 2 = "para" (563) + espacio (45) + "equipos" (1005) = 1613 px de tinta, centrada en el cuadro
// CADA PALABRA EN SU PROPIA Z, separadas 2 unidades. No es para que se note la profundidad —a esta
// distancia de camara 2 unidades cambian el tamano un 0,08%— sino porque dos capas EN LA MISMA Z no
// tienen un orden de dibujo definido: el motor ordena por profundidad y un empate lo resuelve como
// quiere, asi que la misma comp puede salir distinta en dos corridas. `ritmo.mjs` lo cuenta en M7.
G.colgar(k1, eje1, [0, -170, 0]);
G.colgar(k2, eje1, [-524, 170, 2]);
G.colgar(k3, eje1, [303, 170, 4]);

var e1 = G.ejes(k1), e2 = G.ejes(k2), e3 = G.ejes(k3);

// TIEMPO 1 — "Construido" llega desde la izquierda y se pasa 46 px antes de asentarse.
// Tres claves y no una curva: easeOutBack no existe en AE, la influencia vive en [0,100] y no puede
// producir y>1 ni por casualidad. El sobrepaso se escribe.
// ARRANCA EN -1300 Y NO EN -2300, y el que lo dijo fue `escena-check`: contaba 10 cuadros en los que
// la capa se movia con el 0% de si misma en pantalla. Un gesto que empieza fuera de cuadro no es una
// entrada mas amplia, es una entrada mas corta con cuadros gastados adelante. Desde -1300 la palabra
// ya asoma un 30% en el primer cuadro en que se enciende, y llega igual de rapido.
G.claves(e1.x, [[0, -1300, "C1"], [13, 46, "C8"], [20, 0]], "construido-x");
G.claves(G.op(k1), [[0, 0, "C6"], [6, 100]], "construido-op");

// TIEMPO 2 — "para" sube desde abajo, 14 cuadros despues. El retardo es lo que hace que se lea como
// una segunda llegada y no como parte de la primera.
G.claves(e2.y, [[14, 560, "C1"], [26, 138, "C8"], [33, 170]], "para-y");
G.claves(G.op(k2), [[14, 0, "C6"], [20, 100]], "para-op");

// TIEMPO 3 — "equipos" entra por la derecha y se PEGA a "para". Es el momento en que la frase existe.
G.claves(e3.x, [[27, 1200, "C1"], [39, 268, "C8"], [46, 303]], "equipos-x");
G.claves(G.op(k3), [[27, 0, "C6"], [33, 100]], "equipos-op");

// LA DERIVA, Y NINGUNA SALIDA: EL CORTE ES LA SALIDA.
//
// La primera version sacaba el bloque volando hacia la izquierda, y `escena-check` conto 9 cuadros en
// los que "para" se movia con el 0% de si misma en pantalla. Se puede acortar el viaje, pero la
// pregunta de atras es mejor: para que hay una salida.
//
// La medicion del original contesta que no la hay. Dieciseis cortes en 53 s, todos duros. Un bloque
// que se esta moviendo cuando llega el corte se lee mas rapido que uno que se va y deja el cuadro
// vacio — y el cuadro vacio es medio segundo que hay que pagar dos veces, en el que sale y en el que
// entra. El bloque deriva hasta el ultimo cuadro y el corte lo levanta en movimiento.
//
// La deriva va x1,00 a x1,05. La mediana del corpus para una ENTRADA de rotulo es x1,08, y esto es
// menos a proposito: no es una entrada, es un asentamiento que no tiene que competir con las tres
// llegadas que acaban de pasar.
var eE1 = G.ejes(eje1);
G.claves(eE1.x, [[46, 960, "C6"], [C[1], 902]], "eje1-deriva");
G.claves(G.esc(eje1), [[46, [100, 100, 100], "C6"], [C[1], [105, 105, 100]]], "eje1-escala");

G.plano(eje1, 0, C[1]); G.plano(k1, 0, C[1]); G.plano(k2, 14, C[1]); G.plano(k3, 27, C[1]);

// ================================================================================================
// PLANO 2 · 70-94 · UN SOLO GOLPE
// ================================================================================================
//
// 24 cuadros. Ocho de entrada, doce quieto, cuatro para irse. En 0,8 s no se lee una frase: se lee
// una palabra, y ponerle tres seria escribir para nadie.
//
// Entra en x1,18 y se asienta en x1,00. La banda del corpus para una entrada de rotulo es x1,00 a
// x1,30 con mediana x1,08; este es el unico rotulo de los seis planos que pasa de la mediana, porque
// es el unico cuyo trabajo es golpear.
var k2b = G.img("p-k2-1", "k2-veloces", 960, 540, 0, 39);
G.claves(G.esc(k2b), [[C[1], [39, 39, 100], "C1"], [C[1] + 8, [33, 33, 100]]], "veloces-esc");
G.claves(G.op(k2b), [[C[1], 0, "C6"], [C[1] + 4, 100, "C3"], [C[2] - 4, 100], [C[2] - 1, 0]], "veloces-op");
G.plano(k2b, C[1], C[2]);

// ================================================================================================
// PLANO 3 · 94-384 · LA MARCA SE ESCRIBE · 290 cuadros
// ================================================================================================
//
// Nueve segundos y medio con un logotipo es donde una pieza se muere. La medicion del original dice
// que este plano existe y dura eso, asi que la pregunta no es si acortarlo sino con que llenarlo.
//
// Se llena con OCHO tiempos: las letras fantasma del fondo, el isotipo llegando desde lejos, las
// cuatro letras del logotipo escribiendose de a una, la bajada en cinco palabras, la atribucion, un
// barrido de brillo sobre el isotipo, la deriva lenta del conjunto y la salida hacia la camara. El
// silencio mas largo que queda son 1,9 s, y el genero admite hasta 8,18.
var suelo3 = G.img("p-suelo", "suelo-3", 960, 540, 600, 43);
G.plano(suelo3, C[2], C[3]);
G.claves(G.esc(suelo3), [[C[2], [43, 43, 100], "LINEAL"], [C[3], [40, 40, 100]]], "suelo-3-deriva");

// las letras gigantes del fondo, al 3%: llenan el cuadro sin competir con nada
var fant = G.img("p-fantasma", "fantasma", 960, 540, 900, 40);
G.claves(G.op(fant), [[C[2], 0, "C6"], [C[2] + 24, 100, "C3"], [C[3] - 20, 100], [C[3] - 2, 0]], "fantasma-op");
G.claves(G.ejes(fant).x, [[C[2], 1010, "LINEAL"], [C[3], 890]], "fantasma-deriva");
G.plano(fant, C[2], C[3]);

// EL ISOTIPO llega desde lejos girando. z de 1700 a 0 en 26 cuadros, con sobrepaso en escala.
var iso = G.img("p-iso", "iso", 960, 330, 0, 30);
var eIso = G.ejes(iso);
G.claves(eIso.z, [[C[2] + 4, 1700, "C1"], [C[2] + 30, 0]], "iso-z");
G.claves(G.esc(iso), [[C[2] + 4, [12, 12, 12], "C1"], [C[2] + 30, [33, 33, 33], "C8"],
                      [C[2] + 38, [30, 30, 30]]], "iso-esc");
G.claves(G.rotZ(iso), [[C[2] + 4, -140, "C1"], [C[2] + 34, 0]], "iso-giro");
G.claves(G.op(iso), [[C[2] + 4, 0, "C6"], [C[2] + 14, 100]], "iso-op");
G.plano(iso, C[2] + 4, C[3]);

// EL LOGOTIPO, LETRA POR LETRA. Retardo de 7 cuadros: por debajo de 5 se lee como una sola entrada
// escalonada y por encima de 10 se lee como cuatro capas sueltas. Siete es el medio medido.
var LX = [778, 898, 1020, 1142];
var letras = [];
var iL;
for (iL = 0; iL < 4; iL++) {
  var lt = G.img("p-w-" + (iL + 1), "w-" + (iL + 1), LX[iL], 620, 2 + iL * 2, 33);
  var eL = G.ejes(lt);
  var t0 = C[2] + 54 + iL * 7;
  G.claves(eL.y, [[t0, 740, "C1"], [t0 + 11, 610, "C8"], [t0 + 17, 620]], "w" + (iL + 1) + "-y");
  G.claves(G.op(lt), [[t0, 0, "C6"], [t0 + 7, 100]], "w" + (iL + 1) + "-op");
  G.plano(lt, t0, C[3]);
  letras[letras.length] = lt;
}

// LA BAJADA, en cinco palabras con 4 cuadros de retardo. Va mas rapida que el logotipo porque es
// texto de lectura y no de marca: se tiene que terminar de armar antes de que el ojo la busque.
var BX = [745, 847, 958, 1017, 1121];
var iB;
for (iB = 0; iB < 5; iB++) {
  var bp = G.img("p-bajada-" + (iB + 1), "bajada-" + (iB + 1), BX[iB], 726, 12 + iB * 2, 50);
  var t0b = C[2] + 96 + iB * 4;
  G.claves(G.ejes(bp).y, [[t0b, 748, "C1"], [t0b + 10, 726]], "bajada" + (iB + 1) + "-y");
  G.claves(G.op(bp), [[t0b, 0, "C6"], [t0b + 8, 100]], "bajada" + (iB + 1) + "-op");
  G.plano(bp, t0b, C[3]);
}

// LA ATRIBUCION. La licencia CC-BY la exige y este es su lugar: dentro de la pieza, legible, sin
// competir. Entra 4,7 s despues del corte y se queda hasta el final del plano.
var cred = G.img("p-credito", "credito", 960, 980, 24, 33);
G.claves(G.op(cred), [[C[2] + 140, 0, "C6"], [C[2] + 156, 100, "C3"], [C[3] - 16, 100], [C[3] - 2, 0]], "credito-op");
G.plano(cred, C[2] + 140, C[3]);

// EL EVENTO DE LOS 6 SEGUNDOS, que corta el tramo mas largo sin nada: sin el, entre la atribucion y
// la salida quedaban 4,4 s de quietud.
//
// LO QUE NO PUDE USAR, y la biblioteca tuvo razon. El gesto obvio era `Gd.barridoDeBrillo` — la banda
// de luz que cruza el isotipo. No se puede: esa tecnica se hace con TAPAS del color del fondo que
// recortan la banda a la caja del objeto, y aca el fondo es una malla con degradado. La funcion exige
// `colorFondo` justamente por eso, y su mensaje lo dice entero: "si no podes nombrar el color del
// fondo es que el fondo no es plano, y la tecnica NO SE PUEDE HACER HOY". Una tapa de un color
// aproximado se veria como un rectangulo cruzando el cuadro.
//
// El reemplazo trabaja CON el fondo en vez de contra el: la fuente de luz de abajo late. El isotipo
// se lee cargandose, y no hay ninguna tapa que pueda delatarse.
var latido = G.img("p-suelo-cierre", "latido", 960, 540, 1200, 47);
G.claves(G.op(latido), [[C[2] + 186, 0, "C6"], [C[2] + 206, 82, "C8"], [C[2] + 240, 0]], "latido-op");
G.claves(G.esc(latido), [[C[2] + 186, [44, 44, 100], "C1"], [C[2] + 240, [50, 50, 100]]], "latido-esc");
G.plano(latido, C[2] + 186, C[2] + 241);

// LA SALIDA: todo el conjunto se va HACIA LA CAMARA. No es un fundido — es el gesto que justifica el
// corte al mundo claro, porque atravesar la lente deja el cuadro vacio un instante.
// EL CREDITO NO SALE CON EL GRUPO, por dos razones distintas y las dos medidas.
//
// La primera: ya tiene su propio fundido, y sumarle el del grupo le daba claves de opacidad de dos
// lugares que no se conocian entre si. Se interponian, el tramo quedaba lineal de un lado y bezier del
// otro, AE lo dibujaba sin quejarse y el documento salia INCOMPLETO al exportar.
//
// La segunda: el empuje hacia la camara lo sacaba del cuadro. A z=-1400 la magnificacion es 2,4x, y
// una linea que vive a 0,93 de alto se va por abajo — `escena-check` conto 14 cuadros moviendose con
// el 0% de si misma en pantalla. Se queda donde esta y se funde. Un credito no necesita gesto.
var salida = [iso];
var iS;
for (iS = 0; iS < letras.length; iS++) { salida[salida.length] = letras[iS]; }
for (iS = 0; iS < salida.length; iS++) {
  // ARRANCA DESDE LA Z QUE LA CAPA TIENE EN ESE CUADRO, y las dos mitades de esa frase costaron algo.
  //
  // Escribir 0 en la primera clave le daria un salto de hasta 8 unidades a las capas que viven
  // escalonadas en profundidad. Y leerla con `.value` es peor y no se ve: sobre una propiedad CON
  // CLAVES, `.value` devuelve el valor en el cuadro donde esta parado AE —el 0— y no el ultimo. El
  // isotipo tiene claves de z (1700 -> 0 en su entrada), asi que `.value` daba 1700 y la salida
  // empezaba mandandolo de golpe a mil setecientos de distancia. `valueAtTime` lee donde hay que leer.
  //
  // Y EL DESTINO CONSERVA LA SEPARACION en vez de ser el mismo para todos: partiendo de z distintas y
  // llegando todas a -1400, las cuatro letras CONVERGEN durante el viaje y se empatan en profundidad a
  // mitad de camino. Restando el mismo delta, la separacion se mantiene los veinte cuadros.
  var zBase = G.ejes(salida[iS]).z.valueAtTime((C[3] - 20) / G.fps(), false);
  G.claves(G.ejes(salida[iS]).z, [[C[3] - 20, zBase, "C1"], [C[3], zBase - 1408]], "salida-z-" + iS);
  G.claves(G.op(salida[iS]), [[C[3] - 20, 100, "C3"], [C[3] - 4, 0]], "salida-op-" + iS);
}

// ================================================================================================
// PLANO 4 · 384-431 · LA MALLA CLARA · 47 cuadros
// ================================================================================================
//
// El corte mas violento de la pieza: de negro con luz propia a lila claro, en un cuadro. Los 1,57 s
// alcanzan justo para armar tres palabras y dejarlas quietas medio segundo.
//
// LA FRASE NO TERMINA ACA. "Tu equipo entrega" cierra este plano y "10x mas rapido" abre el
// siguiente: el espectador completa la oracion por encima de un corte duro, y eso ata dos planos que
// de otro modo serian dos afirmaciones sueltas.
var malla4 = G.img("p-malla-clara", "malla-4", 960, 540, 600, 42);
G.plano(malla4, C[3], C[4]);
G.claves(G.esc(malla4), [[C[3], [42, 42, 100], "LINEAL"], [C[4], [40, 40, 100]]], "malla-4-deriva");

var CX = [534, 816, 1242];
var iC;
for (iC = 0; iC < 3; iC++) {
  var cw = G.img("p-claro-" + (iC + 1), "claro-" + (iC + 1), CX[iC], 540, iC * 2, 50);
  var t0c = C[3] + 2 + iC * 6;
  G.claves(G.ejes(cw).y, [[t0c, 592, "C1"], [t0c + 11, 534, "C8"], [t0c + 16, 540]], "claro" + (iC + 1) + "-y");
  G.claves(G.op(cw), [[t0c, 0, "C6"], [t0c + 7, 100, "C3"], [C[4] - 6, 100], [C[4] - 1, 0]], "claro" + (iC + 1) + "-op");
  G.plano(cw, t0c, C[4]);
}

// ================================================================================================
// PLANO 5 · 431-482 · LOS ANILLOS Y LA CIFRA · 51 cuadros
// ================================================================================================
//
// Los tres anillos salen de adentro hacia afuera con 6 cuadros de retardo. Van en CAPAS SEPARADAS y
// no horneados en una imagen: con los tres juntos el escalonado seria imposible, y el escalonado ES
// el gesto de este plano.
//
// Al 34% de opacidad, que no es timidez: la cifra vive encima y un anillo al 95% cruzandole las
// letras la vuelve ilegible justo en los cuadros en que el ojo la engancha.
var malla5 = G.img("p-malla-clara", "malla-5", 900, 560, 600, 47);
G.plano(malla5, C[4], C[5]);

var iA;
for (iA = 0; iA < 3; iA++) {
  var an = G.img("p-anillo-" + (iA + 1), "anillo-" + (iA + 1), 960, 540, 40 + iA * 2, 50);
  var t0a = C[4] + iA * 6;
  G.claves(G.esc(an), [[t0a, [30, 30, 100], "C1"], [t0a + 20, [50, 50, 100]]], "anillo" + (iA + 1) + "-esc");
  G.claves(G.op(an), [[t0a, 0, "C6"], [t0a + 12, 34, "C3"], [C[5] - 8, 34], [C[5] - 1, 0]], "anillo" + (iA + 1) + "-op");
  G.plano(an, t0a, C[5]);
}

// la cifra, en tres palabras. NO SOBREPASA: un numero que rebota se lee como que el dato es
// aproximado, y es una negativa que la biblioteca hace cumplir sola.
var FX = [673, 889, 1176];
var iF;
for (iF = 0; iF < 3; iF++) {
  var cf = G.img("p-cifra-" + (iF + 1), "cifra-" + (iF + 1), FX[iF], 540, iF * 2, 50);
  var t0f = C[4] + 6 + iF * 6;
  G.claves(G.ejes(cf).y, [[t0f, 566, "C1"], [t0f + 12, 540]], "cifra" + (iF + 1) + "-y");
  G.claves(G.op(cf), [[t0f, 0, "C6"], [t0f + 9, 100, "C3"], [C[5] - 6, 100], [C[5] - 1, 0]], "cifra" + (iF + 1) + "-op");
  G.plano(cf, t0f, C[5]);
}

// ================================================================================================
// PLANO 6 · 482-970 · EL TABLERO · 488 cuadros · 16,3 s
// ================================================================================================
//
// El plano mas largo de la pieza y el que decide si funciona. Dieciseis segundos de una interfaz
// quieta son dieciseis segundos de una foto, asi que lo que hay no es una imagen: son diecisiete
// piezas colgadas de un nulo que gira, y VEINTE eventos repartidos a lo largo del plano.
//
// El nulo es lo que hace posible el giro. Sin el, inclinar el tablero seria darle el mismo angulo a
// diecisiete capas y esperar que sus ejes coincidan — y no coinciden, porque cada una gira alrededor
// de SU centro. Colgadas, giran alrededor del centro del tablero, que es lo unico que se ve como un
// objeto solido.
var suelo6 = G.img("p-suelo", "suelo-6", 960, 540, 1400, 50);
G.plano(suelo6, C[5], C[6]);
G.claves(G.esc(suelo6), [[C[5], [50, 50, 100], "LINEAL"], [C[6], [47, 47, 100]]], "suelo-6-deriva");

// SON DOS NULOS Y NO UNO, y la razon es concreta: el nulo de afuera lleva el giro, la profundidad y
// la deriva —o sea, claves en rotY, posZ y posY—, y el micro-movimiento tambien escribe en posX y
// posY. Sobre la misma capa, las claves del micro pisarian las de la deriva sin dar ningun error: la
// deriva simplemente dejaria de existir. Separados, cada uno anima lo suyo y se componen solos.
var eje6 = G.nulo("eje-6", 960, 540, 0);
var eE6 = G.ejes(eje6);

var eje6b = G.nulo("eje-6b", 960, 540, 0);
G.colgar(eje6b, eje6, [0, 0, 0]);
G.plano(eje6b, C[5], C[6]);

// EL GIRO, que es la columna vertebral del plano: -52 grados al entrar, -22 mientras trabaja, y una
// deriva lenta hasta +13 en los ultimos cinco segundos. El tablero nunca esta quieto y nunca se mueve
// de golpe.
G.claves(G.rotY(eje6), [
  [C[5], -52, "C1"], [C[5] + 22, -22, "LINEAL"],
  [C[5] + 218, -22, "C6"], [C[5] + 378, 13, "LINEAL"], [C[6], 20]
], "tablero-giro");
G.claves(eE6.z, [
  [C[5], 1500, "C1"], [C[5] + 24, 0, "LINEAL"],
  [C[5] + 348, 0, "C6"], [C[6] - 20, 380, "C1"], [C[6], 1100]
], "tablero-z");
G.claves(eE6.y, [[C[5] + 24, 540, "C6"], [C[5] + 348, 512, "C6"], [C[6], 540]], "tablero-deriva-y");
G.plano(eje6, C[5], C[6]);

// --- el cuerpo del tablero
var panel = G.img("p-panel", "panel", 0, 0, 0, 50);
G.colgar(panel, eje6b, [0, 0, 0]);
G.claves(G.op(panel), [[C[5], 0, "C6"], [C[5] + 10, 100, "C3"], [C[6] - 12, 100], [C[6] - 2, 0]], "panel-op");
G.plano(panel, C[5], C[6]);

// --- el filo del canto. Lo que hace que un plano inclinado se lea como un objeto con espesor.
var filo = G.img("p-filo", "filo", 0, 0, 0, 33);
// LAS SEPARACIONES DEL TABLERO VAN DE 1,2 Y NO DE 2, y la razon es geometrica: estas capas cuelgan
// de un nulo que GIRA hasta 20 grados en Y, asi que un desplazamiento en z se convierte en uno
// horizontal de z*sen(20) = 0,34*z. Con 2 unidades por capa y quince capas, la ultima se correria 10
// px respecto del panel y la maqueta dejaria de estar alineada. Con 1,2 el corrimiento maximo es de 6
// px sobre el puntero, que flota, y de 6 sobre el filo, que es un degradado de 1180 px de ancho.
G.colgar(filo, eje6b, [0, 360, -18]);
G.claves(G.op(filo), [[C[5], 0, "C1"], [C[5] + 14, 100, "C3"], [C[5] + 30, 62, "C6"],
                      [C[6] - 12, 62], [C[6] - 2, 0]], "filo-op");
G.plano(filo, C[5], C[6]);

// --- LA LINEA DEL GRAFICO SE DIBUJA SOLA.
//
// La tapa es un solido del color EXACTO del campo (#151129) que arranca cubriendo el grafico entero y
// se corre a la derecha. Por eso el campo del panel se genero PLANO: con un degradado ahi, ningun
// color de tapa lo igualaria y se veria el borde de la tapa cruzando la pantalla.
var graf = G.img("p-grafico", "grafico", 0, 0, 0, 50);
G.colgar(graf, eje6b, [-30, -102, -2.4]);
G.plano(graf, C[5] + 20, C[6]);

var tapa = G.solido("tapa-grafico", [0.082, 0.067, 0.161], 640, 320, 0, 0, 0);
G.colgar(tapa, eje6b, [-30, -102, -3.6]);
G.anc(tapa).setValue([0, 160, 0]);   // el ancla en el borde IZQUIERDO: la tapa se corre desde ahi
var eT = G.ejes(tapa);
G.claves(eT.x, [[C[5] + 24, -350, "LINEAL"], [C[5] + 54, 310]], "tapa-corre");
G.plano(tapa, C[5] + 20, C[5] + 56);

// --- LAS TRES CIFRAS, escalonadas 12 cuadros. Cada una lleva su rotulo pegado: un numero sin sujeto
// no es un dato, es la forma de un dato.
var TX = [-242, -30, 182];
var tarjetas = [];
var iT;
for (iT = 0; iT < 3; iT++) {
  var tj = G.img("p-cifra-t" + (iT + 1), "tarjeta-" + (iT + 1), 0, 0, 0, 50);
  G.colgar(tj, eje6b, [TX[iT], 138, -6 - iT * 1.2]);
  var t0t = C[5] + 48 + iT * 12;
  G.claves(G.esc(tj), [[t0t, [30, 30, 100], "C1"], [t0t + 10, [54, 54, 100], "C8"],
                       [t0t + 17, [50, 50, 100]]], "tarjeta" + (iT + 1) + "-esc");
  G.claves(G.op(tj), [[t0t, 0, "C6"], [t0t + 7, 100, "C3"], [C[6] - 12, 100], [C[6] - 2, 0]], "tarjeta" + (iT + 1) + "-op");
  G.plano(tj, t0t, C[6]);
  tarjetas[tarjetas.length] = tj;
}

// --- LAS CINCO FILAS DE ACTIVIDAD, una cada 30 cuadros. Cinco segundos de plano sostenidos por una
// sola idea: que la lista se esta llenando mientras mirás.
var evs = [];
var iE;
for (iE = 0; iE < 5; iE++) {
  var ev = G.img("p-ev-" + (iE + 1), "ev-" + (iE + 1), 0, 0, 0, 50);
  G.colgar(ev, eje6b, [429, -184 + iE * 72, -9.6 - iE * 1.2]);
  var t0e = C[5] + 84 + iE * 30;
  G.claves(G.ejes(ev).x, [[t0e, 700, "C1"], [t0e + 12, 418, "C8"], [t0e + 18, 429]], "ev" + (iE + 1) + "-x");
  // LA PRIMERA FILA SE APAGA EN EL CUADRO 782, cuando el desplazamiento de mas abajo la saca por el
  // borde de arriba — y ESO VA ESCRITO ACA, en la misma llamada que su entrada.
  //
  // Escribirlo alla, junto al desplazamiento, es lo natural y es lo que hice primero: la biblioteca lo
  // rechazo. Esta capa ya tenia claves de opacidad del cuadro 566 al 968, y las nuevas caian justo en
  // el medio; AE habria mezclado los tipos de interpolacion en la union y el exportador habria
  // rechazado la capa, sin decir quien escribio el segundo juego.
  var vidaOp = (iE === 0)
    ? [[t0e, 0, "C6"], [t0e + 8, 100, "C3"], [770, 100], [782, 0]]
    : [[t0e, 0, "C6"], [t0e + 8, 100, "C3"], [C[6] - 12, 100], [C[6] - 2, 0]];
  G.claves(G.op(ev), vidaOp, "ev" + (iE + 1) + "-op");
  G.plano(ev, t0e, (iE === 0) ? 783 : C[6]);
  evs[evs.length] = ev;
}

// --- LA PASTILLA DEL MENU. Arranca sobre "Resumen" y el clic la baja a "Proyectos".
//
// Va en capa aparte y no horneada en el panel, y eso no es prolijidad: horneada, el item activo
// estaria decidido desde el primer cuadro y el puntero clickearia sin que nada cambie. Es el defecto
// exacto que tuvo el conmutador de la PIEZA-I.
var pastilla = G.img("p-pastilla", "pastilla", 0, 0, 0, 33);
G.colgar(pastilla, eje6b, [-497, -265, -1.2]);
G.claves(G.op(pastilla), [[C[5] + 6, 0, "C6"], [C[5] + 18, 100, "C3"], [C[6] - 12, 100], [C[6] - 2, 0]], "pastilla-op");
G.plano(pastilla, C[5] + 6, C[6]);

// --- EL PUNTERO. La punta del dibujo esta en (6,4) de un lienzo de 64x93, asi que el ANCLA va ahi:
// sin eso el puntero apunta con su centro y el clic cae 30 px abajo y a la derecha de donde parece.
var pt = G.img("p-puntero", "puntero", 0, 0, 0, 34);
G.anc(pt).setValue([6 * 4, 4 * 4, 0]);
G.colgar(pt, eje6b, [560, 420, -20.4]);
var ePt = G.ejes(pt);
var T_CLIC = C[5] + 250;
G.claves(ePt.x, [[T_CLIC - 40, 560, "C1"], [T_CLIC, -497]], "puntero-x");
G.claves(ePt.y, [[T_CLIC - 40, 420, "C1"], [T_CLIC, -213]], "puntero-y");
// el apoyo: baja y vuelve, con la vuelta tres veces mas lenta que la ida. La asimetria ES el gesto.
G.claves(G.esc(pt), [[T_CLIC, [34, 34, 100], "C7"], [T_CLIC + 3, [30, 30, 100], "C8"],
                     [T_CLIC + 12, [34, 34, 100]]], "puntero-aprieta");
G.claves(G.op(pt), [[T_CLIC - 40, 0, "C6"], [T_CLIC - 32, 100, "C3"],
                    [T_CLIC + 26, 100], [T_CLIC + 40, 0]], "puntero-op");
G.plano(pt, T_CLIC - 40, T_CLIC + 41);

// LO QUE EL CLIC PRODUCE, y sin esto el puntero seria decoracion: la pastilla baja al item de abajo,
// en el cuadro exacto en que el puntero apoya.
G.claves(G.ejes(pastilla).y, [[T_CLIC + 2, -265, "C1"], [T_CLIC + 12, -213]], "pastilla-baja");

// y el grafico se recarga: la tapa vuelve y se corre otra vez. Es lo que hace cualquier tablero
// cuando cambias de vista, y ocupa los 40 cuadros posteriores al clic.
var tapa2 = G.solido("tapa-recarga", [0.082, 0.067, 0.161], 640, 320, 0, 0, 0);
G.colgar(tapa2, eje6b, [-30, -102, -4.8]);
G.anc(tapa2).setValue([640, 160, 0]);   // ancla en el borde DERECHO: entra desde la derecha
var eT2 = G.ejes(tapa2);
G.claves(eT2.x, [[T_CLIC + 4, 990, "C1"], [T_CLIC + 16, 290, "C6"], [T_CLIC + 46, 990]], "tapa-recarga-corre");
G.plano(tapa2, T_CLIC + 4, T_CLIC + 48);

// las tres tarjetas acusan la recarga, escalonadas
for (iT = 0; iT < 3; iT++) {
  Gd.acuseDeGolpe({ capa: tarjetas[iT], cuadro: T_CLIC + 18 + iT * 5, eje: "y", ida: 2, vuelta: 9,
                    desplazamiento: 7 });
}

// ================================================================================================
// EL ULTIMO TERCIO DEL PLANO 6 · 758-946 · lo que llenaba un hueco de 6,3 segundos
// ================================================================================================
//
// `ritmo.mjs` marco un hueco de 188 cuadros entre el 758 y el 946 donde lo unico que pasaba era el
// giro lento del nulo. Es el mismo defecto que la PIEZA-M tuvo con un acto entero vacio, y lo mismo
// que aprendi de ella: un plano no se sostiene con una deriva, se sostiene con cosas que pasan.
//
// Cuatro tiempos nuevos, y ninguno es relleno: los cuatro son lo que hace un tablero de verdad
// mientras alguien lo mira.

// TIEMPO 1 (762) · LA LISTA SIGUE VIVIENDO. Las cinco filas se corren hacia arriba 72 px y la primera
// se va por el borde de arriba. El escalonado de 3 cuadros es lo que lo hace leer como un desplazamiento
// y no como cinco capas que se movieron juntas.
var iSc;
for (iSc = 0; iSc < 5; iSc++) {
  var t0s = 762 + iSc * 3;
  G.claves(G.ejes(evs[iSc]).y, [[t0s, -184 + iSc * 72, "C6"], [t0s + 16, -256 + iSc * 72]],
           "ev-sube-" + (iSc + 1));
}
// TIEMPO 2 (800 y 818) · ENTRAN DOS FILAS NUEVAS por abajo, con la misma entrada que tuvieron las
// cinco primeras. Son filas NUEVAS y no repeticiones: repetir una que ya salio se habria notado antes
// que el hueco que estoy tapando.
var iNv;
for (iNv = 0; iNv < 2; iNv++) {
  var nv = G.img("p-ev-" + (iNv + 6), "ev-" + (iNv + 6), 0, 0, 0, 50);
  G.colgar(nv, eje6b, [429, 176 + iNv * 72, -17.6 - iNv * 1.2]);
  var t0n = 800 + iNv * 18;
  G.claves(G.ejes(nv).x, [[t0n, 700, "C1"], [t0n + 12, 418, "C8"], [t0n + 18, 429]], "ev" + (iNv + 6) + "-x");
  G.claves(G.op(nv), [[t0n, 0, "C6"], [t0n + 8, 100, "C3"], [C[6] - 12, 100], [C[6] - 2, 0]], "ev" + (iNv + 6) + "-op");
  G.plano(nv, t0n, C[6]);
}

// TIEMPO 3 (838) · EL PUNTERO VUELVE Y SE PARA SOBRE EL ULTIMO DIA DEL GRAFICO, y ahi aparece el
// globo. Es la segunda aparicion del puntero y por eso es OTRA CAPA: la biblioteca cuenta los gestos
// por aparicion, y ademas una capa que ya se fue del cuadro no vuelve, entra una nueva.
var pt2 = G.img("p-puntero", "puntero-2", 0, 0, 0, 34);
G.anc(pt2).setValue([6 * 4, 4 * 4, 0]);
G.colgar(pt2, eje6b, [560, 300, -21.6]);
var ePt2 = G.ejes(pt2);
G.claves(ePt2.x, [[838, 560, "C1"], [856, 254]], "puntero2-x");
G.claves(ePt2.y, [[838, 300, "C1"], [856, -88]], "puntero2-y");
G.claves(G.op(pt2), [[838, 0, "C6"], [846, 100, "C3"], [916, 100], [928, 0]], "puntero2-op");
G.plano(pt2, 838, 929);

var globo = G.img("p-globo", "globo", 0, 0, 0, 33);
G.colgar(globo, eje6b, [254, -156, -19.2]);
G.anc(globo).setValue([228, 252, 0]);   // el ancla en la PUNTA: el globo crece desde el dato, no desde su centro
G.claves(G.esc(globo), [[858, [12, 12, 100], "C1"], [868, [36, 36, 100], "C8"], [874, [33, 33, 100]]], "globo-esc");
G.claves(G.op(globo), [[858, 0, "C6"], [866, 100, "C3"], [916, 100], [926, 0]], "globo-op");
G.plano(globo, 858, 927);

// TIEMPO 4 (880) · LA PROFUNDIDAD. Tres copias apagadas del tablero se abren en abanico por detras.
// Es lo que convierte el plano de "una pantalla inclinada" en "un espacio", y ocupa los ultimos
// segundos sin pedirle nada nuevo al espectador — que es justo lo que corresponde al final de un plano
// de dieciseis segundos.
var iFa;
for (iFa = 0; iFa < 3; iFa++) {
  var fa = G.img("p-panel", "fondo-" + (iFa + 1), 0, 0, 0, 50);
  G.colgar(fa, eje6b, [0, 0, 60 + iFa * 60]);
  var t0fa = 880 + iFa * 10;
  G.claves(G.ejes(fa).x, [[t0fa, 0, "C1"], [t0fa + 26, -170 - iFa * 150]], "fondo" + (iFa + 1) + "-x");
  G.claves(G.rotZ(fa), [[t0fa, 0, "C1"], [t0fa + 26, -3 - iFa * 2]], "fondo" + (iFa + 1) + "-giro");
  G.claves(G.op(fa), [[t0fa, 0, "C6"], [t0fa + 16, 34 - iFa * 8, "C3"], [C[6] - 12, 34 - iFa * 8],
                      [C[6] - 2, 0]], "fondo" + (iFa + 1) + "-op");
  G.plano(fa, t0fa, C[6]);
}

// --- MICRO-MOVIMIENTO sobre el nulo. Nada queda perfectamente quieto en dieciseis segundos: un
// objeto inmovil delata que es una imagen, y esto es lo que lo desmiente sin que se note.
Gd.microMovimiento({ capa: eje6b, desde: C[5] + 30, hasta: C[6] - 24, cada: 8,
                     propiedades: ["posx", "posy"], amplitudes: { posx: 3, posy: 3 },
                     donde: "tablero-respira" });

di("PIEZA-P planos 1-6 construida");
var cierre = G.cerrar();
di("capas: " + cierre.capas);
di("avisos: " + cierre.avisos.length);
var iAv;
for (iAv = 0; iAv < cierre.avisos.length; iAv++) { di("  aviso: " + cierre.avisos[iAv]); }

} catch (err) {
  di("ERROR: " + err.toString());
  if (err.line) { di("  linea " + err.line); }
}
