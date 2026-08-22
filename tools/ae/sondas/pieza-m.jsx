// ================================================================================================
// PIEZA-M · 20 segundos, beat de 12 cuadros, autorada con la biblioteca `gesto`
// ================================================================================================
//
// LO QUE LA SEPARA DE LAS ANTERIORES
//
// La PIEZA-L probo que el vocabulario funciona: ocho segundos, un objeto, una palabra. Esta prueba que
// SIRVE — 600 cuadros, ocho tiempos, unas cuarenta acciones, y CERO claves puestas a mano. Todo lo que
// se mueve pasa por una funcion de la biblioteca, o sea por una compuerta.
//
// Y es la primera pieza que se autora sin poder desobedecer las leyes por distraccion. Cada una de las
// que costaron caro esta adentro de `gesto` como un valor por defecto, un paso obligatorio o un throw
// con el numero medido: el rebote sobre claves con ease, la clave a mitad de cuadro, la orientacion que
// AE reescribe al emparentar, la familia que no existe, la capa que pasa detras de la camara.
//
// ================================================================================================
// FICHA DE ARTE
// ================================================================================================
// FAMILIA      producto en blanco, ALTO CONTRASTE y staccato. No es "suave y elegante": es rapida y con
//              filo. Las dos piezas anteriores eran azules y suaves; esta es lo otro a proposito.
// PALETA       papel #FAFAF8 -> #F0EFEA · tinta #0E0E10 · UN acento NARANJA ELECTRICO #FF4D1C
//              gris de apoyo #6E7076. Un solo acento, que es lo que hacen 7 de los 8 avisos medidos.
// LUZ          horneada, y las sombras son DURAS y desplazadas. Las sombras medidas en los proyectos
//              reales tienen suavizado 0: son un desplazamiento, no un desenfoque.
// FORMA        el rectangulo de esquina muy redondeada, y la pildora. Nada con esquina recta.
// TIPOGRAFIA   CenturyGothic para lo que grita, SegoeUI adentro de las capturas de interfaz.
// PROFUNDIDAD  camara con profundidad de campo suave y escalonado en Z. La apertura se ANIMA: con la
//              camara metida entre objetos, una apertura de tipografia pide 200+ px de circulo de
//              confusion y el motor dibuja liso hasta 24.
// SIMBOLO      EL RECTANGULO. Empieza siendo una web, se parte en pedazos, los pedazos se apilan, la
//              pila se vuelve profundidad, y la profundidad se cierra en la marca. Es el mismo objeto
//              cambiando de rol siete veces — nunca aparece nada de la nada.
// BEAT         12 cuadros (150 bpm). Un gesto cada 8-16, ningun hueco de mas de 20.
//
// ================================================================================================
// LOS OCHO TIEMPOS (600 cuadros)
// ================================================================================================
//  A    0- 72  LA MARCA: el punto entra rebotando, se abre en pildora, y "Urvid" cae por caracter
//  B   76-166  LA PROMESA: cinco palabras, una por beat, y una regla que crece y se retrae
//  C  168-252  LA WEB: entra, se aleja en Z, se inclina, y DOS bandas se la llevan cruzando el cuadro
//  D  245-360  LOS PEDAZOS: se destapan EN VUELO, se juntan en pila, la pila voltea y colapsa
//  E  360-434  LOS DATOS: ecualizador, barra que se llena y cifra con acuse
//  F  436-528  EL VIDEO: entra una tarjeta, se revela como pila de seis y se abre en Z con la camara
//  G  528-576  DESTELLO Y CIERRE: el fogonazo se lleva la pila y entra la marca
//  H  576-600  reposo. Un cuadro que se puede congelar.
//
// ================================================================================================
// USO
//   node tools/ae/recursos-m/suelo.mjs && node tools/ae/recursos-m/objetos.mjs && node tools/ae/recursos-m/interfaz.mjs
//   node tools/ae/es3-check.mjs tools/ae/sondas/pieza-m.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-m.jsx
//   printf 'PIEZA-M' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/pieza-m.json
//   for f in marco foco gesto escena lectura colision; do node tools/ae/$f-check.mjs C:/ae-probe/pieza-m.json; done
//   node tools/ae/ritmo.mjs C:/ae-probe/pieza-m.json
//   node tools/ae/cuadro-ae.mjs PIEZA-M 20,50,140,180,272,300,400,440,500,570   # AE escribe los cuadros
// ================================================================================================

#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/gesto.jsx"

var RUTA = "C:/ae-probe/pieza-m.txt";
var pv = new File(RUTA); if (pv.exists) { pv.remove(); }
function di(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("PIEZA-M");

// ------------------------------------------------------------------ paleta y tipografia
var PAPEL   = [0.980, 0.980, 0.972];
var TINTA   = [0.055, 0.055, 0.063];
var GRIS    = [0.431, 0.439, 0.463];
var NARANJA = [1.000, 0.302, 0.110];
var DISPLAY = "CenturyGothic";

var BEAT = 12;
function beat(n) { return Math.round(n * BEAT); }

G.iniciar({
  nombre: "PIEZA-M", ancho: 1920, alto: 1080, fps: 30, cuadros: 600,
  recursos: "C:/ae-probe/recursos-m",
  fondo: PAPEL,
  informe: RUTA
});

// ------------------------------------------------------------------ la camara
// La apertura arranca chica: casi toda la pieza vive cerca del plano de foco y lo unico que necesita
// desenfoque es el fondo. Sube en el tiempo F, donde la camara se mete entre las placas.
var cam = G.camara({ distancia: 2400, profundidad: true, apertura: 11, foco: 0 });

// LOS ARRANQUES DE LOS ELEMENTOS, DECLARADOS. `Gc` los necesita para comprobar una regla que no se
// puede verificar de otra forma: LA CAMARA NO ARRANCA NI FRENA JUNTO CON UN ELEMENTO, se desfasa 4-8
// cuadros. Cuando coinciden, el ojo lee un solo bloque que se mueve y se congela de golpe, y la pieza
// pierde la sensacion de que hay un mundo y alguien mirandolo.
Gc.eventos([beat(0), beat(1), beat(2), beat(6), beat(14), beat(16), beat(18), beat(20), 246,
            beat(11) + 4, beat(13), beat(24), beat(27), beat(29), beat(30), beat(31), beat(33), beat(36) + 4, beat(38), beat(39), beat(41), beat(44),
            beat(45), beat(47)]);

// ================================================================================================
// EL SUELO — tres capas a distinta Z. Nunca un solido plano.
// ================================================================================================
var zFondo = 1000;
var fondo = G.img("m-fondo", "deco-fondo", 960, 540, zFondo,
                  G.escalaParaCubrir(3000, 1900, zFondo, 1.18));
G.plano(fondo, 0, 600);
var ejFondo = G.ejes(fondo);
// EL FONDO NO SOLO DERIVA: ACUSA LOS DOS MOMENTOS GRANDES. Contra un elemento de pantalla completa
// —la web que se aleja, la banda que cruza— el unico acompanamiento posible es el PARALAJE, porque
// cualquier otra capa que se mueva encima compite en vez de acompanar. Los dos tirones van del 192 al
// 206 (la web se va al fondo) y del 240 al 252 (la banda cruza), con 90-120 px, que contra los 345 de
// margen que deja `escalaParaCubrir` al 1,18 no descubre ningun borde.
G.claves(ejFondo.x, [[0, 900, "LINEAL"], [192, 940, "C6"], [206, 1090, "LINEAL"],
                     [240, 1096, "C6"], [252, 1130, "LINEAL"], [420, 1010, "LINEAL"], [600, 900]]);
G.claves(ejFondo.y, [[0, 500, "LINEAL"], [192, 528, "C6"], [206, 588, "LINEAL"],
                     [240, 596, "C6"], [252, 640, "LINEAL"], [420, 560, "LINEAL"], [600, 500]]);
G.claves(ejFondo.z, [[0, zFondo], [600, zFondo]]);

var zRet = 520;
var reticula = G.img("m-reticula", "deco-reticula", 960, 540, zRet,
                     G.escalaParaCubrir(3000, 1900, zRet, 1.30));
G.op(reticula).setValue(52);
G.plano(reticula, 0, 600);
var ejRet = G.ejes(reticula);
// la reticula tira PARA EL OTRO LADO y mas fuerte: vive a la mitad de la profundidad del fondo, asi
// que su paralaje tiene que ser mayor o los dos planos se leen pegados.
G.claves(ejRet.x, [[0, 1060, "LINEAL"], [192, 1020, "C6"], [206, 820, "LINEAL"],
                   [240, 812, "C6"], [252, 730, "LINEAL"], [420, 900, "LINEAL"], [600, 1060]]);
G.claves(ejRet.y, [[0, 470, "LINEAL"], [192, 496, "C6"], [206, 580, "LINEAL"],
                   [240, 588, "C6"], [252, 648, "LINEAL"], [420, 570, "LINEAL"], [600, 470]]);
G.claves(ejRet.z, [[0, zRet], [600, zRet]]);

// z=860 y no 300: la pila del acto F se abre entre 140 y 790, asi que a 300 la mancha quedaba justo en
// el medio del recorrido y una placa la cruzaba (empate en el cuadro 467). Detras de las 790 no la toca
// nadie. La escala sube de 110 a 133 para compensar el alejamiento y que se vea igual de grande: a 300
// el factor de perspectiva es 2400/2700 = 0,889 y a 860 es 2400/3260 = 0,736.
var mancha = G.img("m-mancha-naranja", "deco-mancha", 500, 820, 860, 133);
mancha.blendingMode = BlendingMode.ADD;
G.claves(G.op(mancha), [[0, 0], [36, 70], [520, 70], [560, 0]]);
G.plano(mancha, 0, 600);

G.grano(["m-grano-1", "m-grano-2", "m-grano-3"], 30, 2);

// ================================================================================================
// A · 0-72 — LA MARCA
// El punto entra rebotando, se abre en pildora, y la palabra cae por caracter sobre ella.
// ================================================================================================
// LA ESCALA DE LA PILDORA SALE DE UNA VENTANA, NO DE UN GUSTO. El generador de objetos dejo escrito
// que m-punto "se dibuja a 220-440 px": es la ventana de 2x-4x sobre sus 880 nativos. Al 62% se
// dibujaba a 546 y Q2 daba 1,61x. Al 48% da 422 px, o sea 2,08x, y entra.
var Y_MARCA = 470, SEP = 250, ESC_PT = 48;

// las dos tapas y la barra: la pildora es GEOMETRIA, no un plano estirado. Un rectangulo redondeado
// escalado x3 aplasta sus esquinas y se ve al primer cuadro.
// LAS SEIS PARTES LLEVAN Z DISTINTA AUNQUE LA PILDORA SEA PLANA, y no es una concesion a la compuerta.
//
// Estaban las tres en z=0 y las tres sombras en z=12, o sea empatadas. AE las compone por orden de
// capa; el motor web las ordena POR PROFUNDIDAD, y con profundidades iguales el desempate lo decide
// cada uno por su cuenta. Eso no da error: da un video que no es igual al preview, en un cuadro
// cualquiera, sin nada que señalar.
//
// La separacion es de 2 unidades, que es el valor que usa la propia biblioteca para el espesor de una
// pila de naipes ("rompe el empate —el umbral es 1— y no se ve"). Con 0,4 no alcanzaba: quedaba por
// debajo del umbral y M7 seguia contandolas. A 2400 de la camara son 8 diezmilesimas de escala.
var barraS = G.img("m-barra-tinta", "sombra-barra", 968, Y_MARCA + 8, 16, ESC_PT);
// opacidad 100: el gris de la sombra viene HORNEADO en el PNG (`SOMBRA_DURA`). Con las capas al
// 14% las tres se superponian y el alfa se acumulaba a 0,26 en las juntas — dos escalones
// visibles en el borde de abajo, que se vieron abriendo el cuadro 50 y no los cazo ninguna
// compuerta. Opaco sobre opaco del mismo color da ese color, se pisen las capas que se pisen.
G.op(barraS).setValue(100);
var barra = G.img("m-barra", "pildora-barra", 960, Y_MARCA, 4, ESC_PT);

var tapaIzqS = G.img("m-punto-tinta", "sombra-tapa-izq", 968, Y_MARCA + 8, 14, ESC_PT);
G.op(tapaIzqS).setValue(100);
var tapaIzq = G.img("m-punto", "punto", 960, Y_MARCA, 2, ESC_PT);
var tapaDerS = G.img("m-punto-tinta", "sombra-tapa-der", 968, Y_MARCA + 8, 12, ESC_PT);
G.op(tapaDerS).setValue(100);
var tapaDer = G.img("m-punto", "pildora-tapa-der", 960, Y_MARCA, 0, ESC_PT);

// A1 · el punto entra: escala de 0 a ESC_PT en 10 cuadros. Rapido a proposito — el rebote sale de la
// VELOCIDAD de llegada, y un gesto lento no rebota por mas lineal que sea.
var iA;
for (iA = 0; iA < 2; iA++) {
  var cual = iA === 0 ? tapaIzq : tapaIzqS;
  G.conRebote(G.esc(cual), [[beat(0), [0, 0, 0]], [beat(0) + 10, [ESC_PT, ESC_PT, ESC_PT]]],
              { donde: "punto-entra-" + iA, piso: 2 });
  G.plano(cual, 0, 600);
}

// A2 · se abre en pildora. El rebote va sobre la SEPARACION de las tapas, no sobre la escala del
// conjunto: si rebotara la escala, el radio se deformaria en el sobrepaso.
var BARRA_NATIVA = 2080;   // 520 logicos x k=4
function anchoBarra(sep) { return [sep * 200 / BARRA_NATIVA, ESC_PT, 100]; }
var iB;
for (iB = 0; iB < 2; iB++) {
  var cb = iB === 0 ? barra : barraS;
  G.claves(G.esc(cb), [[beat(1), anchoBarra(0)], [beat(1) + 12, anchoBarra(SEP)]]);
  G.plano(cb, beat(1), 600);
}
var iC;
for (iC = 0; iC < 4; iC++) {
  var T = [tapaIzq, tapaIzqS, tapaDer, tapaDerS][iC];
  var esDer = (iC >= 2);
  var dx = (iC === 1 || iC === 3) ? 8 : 0;
  var eT = G.ejes(T);
  eT.y.setValue(Y_MARCA + dx);
  eT.z.setValue([2, 14, 0, 12][iC]);
  G.conRebote(eT.x, [[beat(1), 960 + dx], [beat(1) + 12, 960 + dx + (esDer ? SEP : -SEP)]],
              { donde: "pildora-tapa-" + iC, piso: 5 });
  if (esDer) { G.plano(T, beat(1), 600); }
}

// A3 · la palabra cae letra por letra, cada una con su propio rebote. Un selector de rango daria un
// BARRIDO; esto da una CASCADA de rebotes independientes, que es otra animacion.
// `hasta` NO ES OPCIONAL AUNQUE TENGA VALOR POR DEFECTO. Por defecto vale "el final de la comp", que
// esta bien para la marca de cierre y esta MAL para esta: yo meti las seis capas de la pildora en el
// corte seco de A5 y me olvide de las cinco letras, asi que "Urvid" se quedaba en pantalla arriba de la
// promesa 22 cuadros. No lo caza mirando cuadros —las dos capas se leen perfecto por separado— lo cazo
// `colision-check`, que es la unica que mira pares.
//
// Y el `nombre` distingue esta marca de la del cierre: las dos parten "Urvid" en caracteres y las dos
// nombraban sus capas T-1..T-5, asi que el informe hablaba de diez capas con cinco nombres.
var marcaTexto = Gt.golpePorCaracter({
  cadena: "Urvid", tam: 132, color: TINTA, fuente: DISPLAY, nombre: "marca",
  x: 960, y: Y_MARCA + 46, z: -40, desde: beat(2) + 4, retardo: 2, hasta: beat(6)
});

// A4 · acuse: la pildora acusa el golpe de la ultima letra
Gd.acuseDeGolpe({ capa: barra, cuadro: beat(4) + 6, eje: "y", ida: 2, vuelta: 8, desplazamiento: 10 });

// A5 · corte seco: todo el bloque de marca se va de una. Un corte es una tecnica, no una ausencia.
var capasA = [barra, barraS, tapaIzq, tapaIzqS, tapaDer, tapaDerS];
var iD;
for (iD = 0; iD < capasA.length; iD++) { G.plano(capasA[iD], capasA[iD].inPoint * 30, beat(6)); }

// ================================================================================================
// B · 72-168 — LA PROMESA
// Palabra por beat. Puro staccato: la nitidez del salto ES el efecto.
// ================================================================================================
// DOS COSAS QUE ESTABAN MAL Y UNA SOLA SE VEIA.
//
// La que se veia: "otra cosa" se quedaba quieta 8 cuadros y son 9 caracteres. La regla es 1 segundo
// cada 13 caracteres — pide 21. Un remate que no se alcanza a leer no es un remate. Va con `beats: 2`.
//
// La que NO se veia: `acento` en esta funcion NO es un color, es el MULTIPLICADOR DE CUERPO de las
// palabras de mas de un beat (por defecto 1.25). Yo le estaba pasando "#FF4D1C". Mientras las tres
// palabras fueron cadenas sueltas esa rama no se ejecutaba nunca; al darle dos beats a la ultima,
// `Math.round(116 * "#FF4D1C")` habria devuelto NaN y el cuerpo del remate se rompia. Por eso el
// remate lleva `tam` explicito ademas del `acento` correcto: el numero elegido, no uno deducido.
// CINCO PALABRAS Y NO TRES, Y LA RAZON ES UNA MEDICION. Con tres, la frase terminaba en el cuadro 124
// y la web no entraba hasta el 192: un hueco de 92 cuadros sin que arranque nada, que es el defecto que
// mato a la PIEZA-A y a la PIEZA-B ("muerta, sin beat, muy lenta"). M6 lo nombro con el numero exacto.
//
// Y LA LONGITUD DE CADA PALABRA NO ES LIBRE. T13 exige un segundo de quietud cada 13 caracteres, asi
// que una palabra de 9 letras necesita 21 cuadros quietos y un beat solo da 9. Por eso la frase esta
// escrita con palabras de 6 letras o menos —que quedan exentas— y el remate, que es el unico que puede
// quedarse, se lleva dos beats. La restriccion no es un estorbo: es la que hace que se lea.
Gt.palabraPorBeat({
  palabras: ["Tu web", "ya es", "un", "video", { cadena: "ahora", beats: 3 }],
  bpm: 150, desde: beat(6) + 4, duracionEntrada: 3,
  tam: 116, color: TINTA, acento: 1.19, fuente: DISPLAY,
  x: 960, y: 560, z: 0, nombre: "promesa"
});

// B2 · UNA REGLA NARANJA DEBAJO DEL REMATE: crece, se queda, y se retrae. Tres gestos por el precio de
// una capa, y tapa el hueco de 44 cuadros que M6 encontro entre la ultima palabra y la web.
//
// Se retrae por el MISMO borde por el que crecio. Retraerse por el otro lado se lee como que la regla
// se fue de viaje; por el mismo, se lee como que se deshace lo que se hizo.
var regla = G.solido("regla", NARANJA, 420, 8, 960, 636, 0);
G.anc(regla).setValue([0, 4]);
G.pos(regla).setValue([750, 636, 0]);
Gf.crecerDesdeElBorde({ capa: regla, borde: "izquierda", cuadro: beat(11) + 4, dur: 12,
                        desde: 0, hasta: 1, curva: "C1", donde: "regla-crece" });
Gf.crecerDesdeElBorde({ capa: regla, borde: "izquierda", cuadro: beat(13), dur: 10,
                        desde: 1, hasta: 0, curva: "C3", donde: "regla-se-va" });
G.plano(regla, beat(11) + 4, beat(13) + 10);

// ================================================================================================
// C · 168-252 — LA WEB
// Entra la pagina del cliente. Una banda naranja la cruza y atras ya cambio todo.
// ================================================================================================
var Z_WEB = -60;
// LA WEB NO REBOTA, Y NO ES UNA ELECCION MIA. `entradaConSobrepaso` se nego: ocupa el 80% del cuadro y
// por encima del 40% un sobrepaso deja de leerse como vida y se lee como gelatina — una masa grande
// tiene inercia y la inercia no rebota. Ademas el sobrepaso daba 47,9 px contra un techo de 14, que es
// otra cosa: eso ya seria un rebote (E04) y se calibra distinto.
//
// Entra deslizandose con fundido, que es lo que le corresponde a su masa.
var web = G.img("m-web", "web", 960, 540, Z_WEB, 34);
Ge.deslizarConFundido({ capa: web, cuadro: beat(14), dur: 12, dy: 130, curva: "C1",
                        donde: "web-entra" });

// C1b · LA WEB SE VA HACIA ATRAS, no hacia arriba. Mide 1632x1020 dibujada a z=-60, o sea que ocupa el
// cuadro entero: cualquier desplazamiento vertical la corta por un borde y `marco-check` lo reprueba
// (bien reprobado: una web cortada por arriba se lee como un error de encuadre, no como un scroll).
// En Z hay lugar de sobra, y ademas dice lo que la pieza quiere decir — la pagina se aleja justo antes
// de que la banda se la lleve.
// EL RECORRIDO EN Z ES GRANDE A PROPOSITO Y ESO SALIO DE UNA MEDICION, no de querer exagerar.
//
// Con Z de -60 a 240 en 14 cuadros el gesto EXISTIA y `ritmo` no lo veia, y tenia razon en no verlo: el
// arranque se cuenta cuando una capa supera el 25% de SU PROPIO pico, y el pico de la web es su entrada
// con fundido (la opacidad sola da 0,083 por cuadro). Contra eso, un cambio de huella de 13 px por
// cuadro no llega ni a la quinta parte. No era un problema del instrumento: era un gesto chico al lado
// de lo mas grande que hace esa misma capa, o sea que en pantalla tampoco se leia.
//
// De -60 a 700 en 10 cuadros la huella pasa de 1674 a 1264 px: 41 px por cuadro, tres veces el umbral.
G.claves(G.ejes(web).z, [[beat(16), Z_WEB, "C6"], [beat(16) + 10, 700]], "web-se-aleja");

// C1c · Y SE INCLINA, como si la estuvieran acostando para desarmarla. Girar en X ACHICA la altura
// proyectada, asi que es el unico gesto grande que esta capa admite sin salirse del cuadro.
//
// AQUI IBA UN BARRIDO DE LUZ y la biblioteca lo desaconsejo con un dato: las tapas del brillo cubren un
// anillo de 46 px arriba y abajo y 250 a los costados de la caja, y como una tapa oculta TODO lo que
// tenga debajo en el apilado, la reticula del fondo habria desaparecido de las franjas de los bordes
// durante nueve cuadros. Sobre un objeto que ocupa el cuadro entero esa tecnica no entra. El brillo se
// mudo al cierre (acto G), donde la marca es chica y esta sobre papel liso — que es donde se luce.
G.claves(G.rotX(web), [[beat(18), 0, "C8"], [beat(18) + 12, -34]], "web-se-inclina");

// C1e · Y LA BANDA SE LA LLEVA. Once cuadros de la pieza tenian a `banda-naranja` moviendose SOLA
// (M3 lo conto uno por uno). Una banda que cruza un cuadro donde no pasa nada mas es una cortinilla;
// una banda que EMPUJA algo es una transicion. La web sale de cuadro por la izquierda mientras la
// banda la barre, y muere en el 246, tapada.
G.claves(G.ejes(web).x, [[beat(20), 960, "C7"], [246, 300]], "banda-se-lleva-la-web");


// la web muere DEBAJO de la banda, en el cuadro 246, que es el centro de la ventana en que la banda
// tapa el cuadro entero. Si muriera antes o despues se veria desaparecer.
G.plano(web, beat(14), 246);

// LA SOMBRA DE LA WEB ES DE CONTACTO, NO DESFASADA, y lo decidio una negativa: `sombraDesfasada`
// necesita una SILUETA horneada del objeto en tinta, porque el motor no tiene efectos y los solidos de
// AE comparten el item de metraje —tenirle el color a una copia se lo cambia al original—. No tengo esa
// silueta para la web, y la propia funcion nombra la alternativa: C14, la sombra de contacto.
var sombraWeb = Gc.sombraDeContacto({ objeto: web, recurso: "m-sombra-contacto", anchoObjeto: 1632, x: 960, ySuelo: 1080, z: Z_WEB + 40, donde: "sombra-web" });

// LA FUNCION TIENE UNA RAMA QUE LIGA LA SOMBRA A LA ALTURA DEL OBJETO Y ESTA PIEZA NO LA USA, a
// proposito: esa rama lee las claves de posicion en Y, y aca la web se aleja en Z. Por eso la sombra
// tomo la rama estatica y el acompanamiento va escrito abajo, a mano y con el motivo dicho.
// C1d · Y LA SOMBRA ACOMPANA. No es decoracion: es lo que M3 llama acompanamiento y lo que la fisica
// llama sombra. Un objeto que se aleja del suelo deja una mancha MAS GRANDE, MAS DIFUSA y MAS CLARA —
// y la pieza tenia la web alejandose 760 unidades con su sombra clavada, que es la marca de que las dos
// capas no saben una de la otra.
//
// Va al 20-40% de la magnitud del gesto principal y REPARTIDO A LO LARGO DE TODO EL GESTO, no agotado
// en tres cuadros: eso ultimo seria un acuse, que es otra tecnica y sirve para otra cosa.
var eSom = sombraWeb.escalaBase;
G.claves(G.esc(sombraWeb.sombra),
         [[beat(16), [eSom, eSom, 100], "C6"], [beat(16) + 10, [eSom * 1.22, eSom * 1.22, 100]],
          [beat(18), [eSom * 1.22, eSom * 1.22, 100], "C8"], [beat(18) + 12, [eSom * 1.34, eSom * 0.72, 100]]],
         "sombra-acompana");
G.claves(G.op(sombraWeb.sombra),
         [[beat(16), 100, "C6"], [beat(16) + 10, 62], [beat(18), 62, "C8"], [beat(18) + 12, 38]],
         "sombra-se-abre");

// C2 · LA BANDA CRUZA Y SIGUE DE LARGO, Y ESO NO ES UN DETALLE DE ESTILO.
//
// Estaba usando X01 `barridoPorTapa`, que por definicion ENTRA Y SE QUEDA TAPANDO. La banda terminaba
// clavada a un 36% adentro del cuadro durante 347 cuadros y `marco-check` la reprobo: "quieta, visible
// y cortada por el borde". La propia funcion nombraba la alternativa en su mensaje de error.
//
// X03 es otra cosa: el objeto cruza entero y se va, y ademas CALCULA cuantos cuadros tapa el cuadro de
// verdad. Con L=1920, un cruce de 12 cuadros y 3 de cobertura pedida, la banda tiene que medir
// 1920*(12+3)/(12-3) = 3200 px. Un objeto "mas ancho que la comp" no garantiza nada: a 2200 px este
// mismo cruce taparia 0,68 cuadros y el cambio de atras se veria ocurrir.
//
// Y eso habilita el idioma que hace que esto se lea como produccion y no como una cortinilla: LO QUE SE
// DESTAPA YA ESTA EN MOVIMIENTO. Los recortes arrancan su entrada DEBAJO de la banda, asi que cuando la
// banda los descubre ya vienen viajando. La transicion no presenta un cuadro nuevo: presenta un cuadro
// nuevo que ya empezo sin nosotros.
//
// Se construyen antes que la banda a proposito: `cubre` necesita las capas para verificar el apilado y
// calcular la Z de la tapa, y ademas asi la banda queda ARRIBA de todas en la pila de AE.

// ================================================================================================
// D · 246-360 — LOS PEDAZOS
// Los cuatro recortes de la MISMA pagina se destapan en vuelo y se juntan en una pila que voltea.
// ================================================================================================
var CAMBIO = 246;          // el centro de la ventana en que la banda tapa todo (245-247)
// 440: con recortes de 480 px, los cuatro centros caen en 300, 740, 1180 y 1620, y cada uno ocupa de
// 60 a 540, de 500 a 980, y asi. Se tocan sin taparse — que es lo que hace que se lean como cuatro
// pedazos de lo mismo y no como una pila desordenada. El de afuera aterriza en 1620 y su borde derecho
// queda en 1860: 60 px de margen, suficientes para que el sobrepaso del rebote entre entero.
var SPREAD = 440;

// ESCALA 20 Y NO 38, Y ESTO LO DECIDIO MIRAR EL CUADRO 300 — no una compuerta.
//
// A 38 cada recorte mide 912 px de ancho. Cuatro de esos, aunque esten repartidos, se superponen tanto
// que en pantalla no hay cuatro pedazos: hay UNA MASA BLANCA con fragmentos de tipografia asomando por
// los bordes. Se ve exactamente asi en el cuadro 300 y es incomprensible. Y al juntarse en pila con 26
// px de separacion sobre 912 de ancho, la pila tampoco se lee como pila: se lee como una sola tarjeta.
//
// Ninguna compuerta puede cazar esto. Las cuatro capas estan en cuadro, se mueven, se ven, tienen
// contraste, no chocan con ningun texto y no empatan en profundidad. Todo correcto y el cuadro no se
// entiende. Es la misma leccion que la PIEZA-C: "7/7 en ritmo y una decepcion total".
//
// A 20 miden 480x320, entran los cuatro uno al lado del otro en 1920, y cada uno se lee como lo que es
// —un pedazo de la pagina—. Q2 queda en 2400/480 = 5x, holgadisimo.
var ESC_CORTE = 20;
var cortes = [], iE;
for (iE = 0; iE < 4; iE++) {
  var c = G.img("m-corte-" + (iE + 1), "corte-" + iE, 960, 560, 0, ESC_CORTE);
  var ec = G.ejes(c);
  var destX = 960 + (iE - 1.5) * SPREAD;
  // UNA CASCADA DE VERDAD: CADA RECORTE ARRANCA 6 CUADROS DESPUES DEL ANTERIOR.
  //
  // Antes arrancaban los cuatro en el 245 con duraciones distintas (13, 15, 17, 19). Se veia bien y
  // estaba mal medido: con los cuatro en el aire al mismo tiempo, ninguno manda. M3 lo llama PAPILLA y
  // marco 23 cuadros — 251-261 y 276-287, que son exactamente la llegada y la juntada. La dominancia de
  // cuatro capas parejas es 0,28 contra un piso de 0,45, y no hay forma de arreglarlo cambiando
  // velocidades: hay que hacer que no esten todos moviendose a la vez.
  //
  // Y EL PLANO ARRANCA CON EL MOVIMIENTO, NO ANTES. Es la unica forma de escalonar el arranque sin
  // dejar capas QUIETAS fuera de cuadro esperando turno, que es lo que `marco-check` reprobo la vez
  // pasada. Una capa que nace ya viajando y nace fuera del cuadro no se ve nacer.
  var arranque = 245 + iE * 6;
  G.conRebote(ec.x, [[arranque, destX + (iE % 2 ? 620 : -620)], [arranque + 14, destX]],
              { donde: "corte-entra-" + iE, piso: 6 });
  ec.y.setValue(560);
  // -30 Y NO -4 POR CAPA. Con 4 unidades de separacion, el volteo escalonado de D3 —que mueve cada
  // carta a -iG*34 con 2 cuadros de retardo— hacia que la 2 y la 3 se cruzaran: en el cuadro 309
  // quedaban a 0,77 de profundidad, o sea empatadas, y ahi el orden de dibujo es ambiguo. La cuenta
  // esta escrita en C13: dos capas se cruzan si |z_i - z_j| < recorrido * retardo/duracion, que aca da
  // 34 * 2/14 = 4,9. Con 30 de separacion inicial no hay forma de que se toquen.
  ec.z.setValue(-iE * 30);
  G.plano(c, arranque, beat(30));
  cortes[iE] = c;
}

// DOS BANDAS Y NO UNA, Y NO ES ADORNO: ES LA UNICA FORMA DE QUE LA GRANDE NO CRUCE SOLA.
//
// M3 conto 10 cuadros con `banda-naranja` moviendose sola en pantalla (dominancia > 0,85). Contra un
// objeto de 3201 px que cruza el cuadro en 12, no hay acompanamiento posible con capas normales: la
// banda recorre 427 px por cuadro y cualquier otra cosa que se mueva al lado aporta menos del 5%. Lo
// unico que pesa parecido es OTRA BANDA.
//
// Y ademas es lo que hace el genero. Una cortinilla de un solo color plano se lee como una plantilla;
// dos bandas desfasadas dos cuadros, una de tinta y una de acento, se leen como una transicion hecha.
// La de tinta va DELANTE y mas baja (400 px contra los 1160 de la naranja) para que se lea como el
// filo de la otra y no como dos cosas distintas.
Gx.objetoQueBarre({
  desde: beat(20) - 2, hasta: beat(20) + 10, cobertura: 2, hacia: "izquierda",
  // LA Z VA EXPLICITA PORQUE LAS DOS BANDAS TAPAN LO MISMO. `zDeTapa` la calcula a partir de la lista
  // `cubre`, y como las dos reciben la misma lista, las dos salian en la misma profundidad: empate
  // perfecto en los cuatro cuadros en que se superponen.
  //
  // Y LA DE TINTA VA ADELANTE, no atras. Primero la puse detras —la naranja es la protagonista— y
  // `escena-check` la reprobo: 11 cuadros moviendose con el 0% en pantalla, "fuera de cuadro, tapada".
  // Claro: la naranja mide 1160 px de alto y la de tinta 400, asi que puesta detras desaparecia entera.
  // Delante se lee como lo que tiene que ser, una franja de tinta cruzando la banda de acento. El
  // gesto era correcto y el apilado lo hacia invisible, que es el defecto que esa compuerta existe
  // para cazar. Los recortes llegan hasta -90, asi que -142 y -140 quedan delante de todo.
  color: TINTA, alto: 400, z: -142, cubre: [web].concat(cortes),
  nombre: "banda-tinta", donde: "barre-la-web-filo"
});
Gx.objetoQueBarre({
  desde: beat(20), hasta: beat(20) + 12, cobertura: 3, hacia: "izquierda",
  color: NARANJA, z: -140, cubre: [web].concat(cortes),
  nombre: "banda-naranja", donde: "barre-la-web"
});

// D2 · se juntan en pila: los cuatro convergen al centro, escalonados
var iF;
for (iF = 0; iF < 4; iF++) {
  var cc = cortes[iF];
  var ecc = G.ejes(cc);
  // LA PILA SE OFRECE EN X Y EN Y, no solo en X. Con 26 px de separacion los cuatro quedaban
  // practicamente superpuestos y la pila se leia como una tarjeta sola. 62 en X y 34 en Y sobre
  // recortes de 480x320 dan una baraja apoyada, que es lo que la escena quiere decir.
  G.conRebote(ecc.x, [[beat(24) + iF * 5, 960 + (iF - 1.5) * SPREAD], [beat(24) + iF * 5 + 12, 960 + (iF - 1.5) * 62]],
              { donde: "corte-junta-" + iF, piso: 5 });
  G.claves(ecc.y, [[beat(24) + iF * 5, 560, "C8"], [beat(24) + iF * 5 + 12, 560 + (iF - 1.5) * 34]],
           "corte-junta-y-" + iF);
}

// D3 · Y LA PILA VOLTEA. Estaba prometido en la ficha de arte ("se juntan en una pila y la pila
// voltea") y no estaba construido: la ficha describia una pieza que no existia, que es la forma mas
// barata de mentir en este repo. Ademas tapa el hueco de 60 cuadros que quedaba entre la pila y los
// datos.
//
// Gira cada carta por separado en vez de colgarlas de un nulo: con las cuatro a 26 px de separacion, el
// mismo angulo en las cuatro se lee como UN volumen girando, y sin nulo no hay una cadena de
// emparentado que reescriba orientaciones (que ya costo la PIEZA-I entera).
var iG;
for (iG = 0; iG < 4; iG++) {
  G.claves(G.rotY(cortes[iG]),
           [[beat(27) + iG * 2, 0, "C8"], [beat(27) + iG * 2 + 14, -24]],
           "pila-voltea-" + iG);
  G.claves(G.ejes(cortes[iG]).z,
           [[beat(27) + iG * 2, -iG * 30, "C8"], [beat(27) + iG * 2 + 14, -iG * 62]],
           "pila-abre-" + iG);
}

// D4 · Y LA PILA SE VA HACIA LA CAMARA. Un acto no termina porque se acaben sus cuadros: termina con un
// gesto. Sin esto quedaban 44 cuadros muertos entre el volteo y los datos, y los cuatro recortes
// desaparecian por corte de plano — o sea, sin que nadie los sacara.
// COLAPSA, NO SE VIENE ENCIMA, Y LA DIFERENCIA LA DECIDIO UNA MEDICION QUE SALIO MAL.
//
// Primero escribi la salida a mano llevando las cartas a z=-2100 con la camara en -2400: 8x de tamano.
// El resultado no fue "un gesto grande", fue que el factor de cresta de la pieza paso de 149 a 8869 y
// TODO LO DEMAS dejo de contar como gesto — el umbral de deteccion es el 25% del pico, y el pico ahora
// era esto. M6 empeoro de 48 a 96 cuadros de hueco sin que yo hubiera sacado nada.
//
// Despues probe `Ge.salidaHaciaLaCamara`, que es la funcion correcta para ese gesto, y calcula lo mismo
// peor: con su margen de oficio (200) la capa termina 12x mas grande. La tecnica no esta mal; esta mal
// para este momento, que es una entrega tranquila a los datos y no un remate.
//
// El colapso esta acotado por construccion —la capa se va a cero— asi que no puede aplastar la escala
// de la pieza. Y ademas dice lo que corresponde: la pila se recoge para dejar lugar.
var iI;
for (iI = 0; iI < 4; iI++) {
  Ge.salidaPorColapso({ capa: cortes[iI], cuadro: beat(29) + iI * 2, dur: 11,
                        donde: "pila-colapsa-" + iI });
}

// ================================================================================================
// E · 360-456 — LOS DATOS
// Ecualizador, barra que se llena y una cifra con acuse. Es el tiempo mas denso de la pieza.
// ================================================================================================
Gf.ecualizador({
  n: 9, x: 960, y: 668, z: 0, altoMax: 190, grosor: 26, hueco: 20, color: NARANJA,
  cuadro: beat(30) + 2, cuadros: beat(6), paso: BEAT, archivo: "m-eq",
  ataque: 2, caida: 9, semilla: 4177, nombre: "eq"
});

Gf.barraQueSeLlena({
  nombre: "barra-datos", archivo: "m-cifra-relleno", cama: "m-cifra-cama",
  color: NARANJA, largo: 620, grosor: 22, puntaPng: "m-punto",
  // x = 650 Y NO 960, PORQUE EN ESTA FUNCION `x` ES EL BORDE IZQUIERDO, no el centro. Esta escrito en
  // su firma —"borde IZQUIERDO de la barra"— y aun asi le pase 960: la barra arrancaba en el centro del
  // cuadro y se iba entera para la derecha, desalineada de la cifra que tiene arriba y del ecualizador
  // que tiene abajo, los dos si centrados en 960. Con 650 ocupa de 650 a 1270 y los tres comparten eje.
  //
  // No lo caza ninguna compuerta: una barra a la derecha esta en cuadro, se ve, tiene contraste y no
  // choca con nada. Se vio abriendo el cuadro 400.
  x: 650, y: 430, z: 0, cuadro: beat(31), desde: 0, hasta: 1, dur: 22,
  // `salida` en cuadros; `hasta` es la FRACCION de llenado. Sin salida la barra se quedaba en
  // pantalla durante la profundidad y el cierre.
  salida: beat(36) + 2
});

var cifra = G.rotulo({ cadena: "100%", tam: 104, color: NARANJA, fuente: DISPLAY,
                       x: 960, y: 360, z: 0, nombre: "cifra" });
// `beat: 12` NO ES OPCIONAL: por defecto la funcion asume 15 y con eso el cuadro 396 le caia a 6
// del beat. Un corte a uno o dos cuadros del beat se siente mal y nadie sabe por que.
// LAS DOS CLAVES CAEN EN EL BEAT, Y NO HACE FALTA QUE SEAN VECINAS. `corteSeco` escribe claves HOLD:
// el valor se sostiene y salta EN el cuadro de la clave siguiente. Yo le habia escrito un fundido de un
// cuadro (396 -> 397), que con HOLD hace exactamente lo mismo pero deja la segunda clave fuera del beat.
// Con 384 y 396 la cifra aparece clavada en el 396 y las dos claves caen donde tienen que caer.
Ge.corteSeco({ capa: cifra, prop: G.op(cifra), beat: 12,
               pasos: [[beat(32), 0], [beat(33), 100]] });
// 3 px y no 9: sobre TIPOGRAFIA el acuse va 2-4 px. Mas que eso deja de leerse como un acuse y se
// lee como que el renglon salto de lugar. Sobre la barra (que es una forma) 10 px estan bien.
Gd.acuseDeGolpe({ capa: cifra, cuadro: beat(34) + 2, eje: "y", ida: 2, vuelta: 8, desplazamiento: 3 });
G.plano(cifra, beat(33), beat(36) + 2);

// ================================================================================================
// F · 456-528 — LA PROFUNDIDAD
// La pila se abre en Z mientras la camara empuja. El gesto empieza en CERO: las copias ya estaban
// superpuestas, asi que el despliegue ES la entrada.
// ================================================================================================
// LA PILA NACE EN z=140, DETRAS DE LOS DATOS, y eso resuelve dos cosas con un numero.
//
// El mazo tiene que estar vivo y visible 6 cuadros antes de abrirse (`pila` lo exige, y tiene razon:
// si entra junto con el gesto se lee como que aparecio de la nada). O sea que por fuerza convive un
// rato con el ecualizador y la cifra del acto E. En z=0 convivia EMPATADO con ellos —M7 lo marco en el
// cuadro 433— y ahi el orden de dibujo es ambiguo.
//
// Corrida a 140 no empata con nada, y ademas compone mejor: la placa aparece DETRAS de los datos, y
// cuando los datos se van, la camara se encuentra con ella. La transicion deja de ser un corte.
// LOS DOS ACTOS SE RELEVAN, NO SE SUPERPONEN, y esto lo decidio abrir el cuadro 432.
//
// La pila tenia que estar viva antes de abrirse —`pila` lo exige y tiene razon: un gesto que empieza en
// cero solo funciona si lo que se mueve YA ESTABA— asi que la puse en el 432. Y en el 432 el acto E
// todavia estaba entero: en pantalla habia una tarjeta de video CON el "100%", la barra de datos y el
// ecualizador encima, y las barras del ecualizador quedaban partidas por el titulo de la tarjeta. Tres
// cosas sin relacion ocupando el mismo lugar.
//
// Ninguna compuerta puede decir esto. Las tres capas estan en cuadro, se ven, tienen contraste y
// `colision-check` no dispara porque la tarjeta es lisa donde cae el texto. Es un problema de MONTAJE:
// dos actos que se pisan.
//
// Ahora los datos se van en el 434 y la pila entra en el 436 desde abajo del cuadro. Entra viajando, no
// aparece; y llega al 450, seis cuadros antes de abrirse, que es justo lo que la funcion pide.
var placas = [], iG;
for (iG = 5; iG >= 0; iG--) {
  var pl = G.img("m-placa", "placa-" + iG, 960, 540, 140, 50);
  G.op(pl).setValue(iG === 0 ? 100 : Math.round(100 - iG * 9));
  G.plano(pl, beat(36) + 4, beat(44) + 5 * 2 + 14);
  // LA ENTRADA VA POR ESCALA Y NO POR POSICION, y eso lo decidio un error de la biblioteca, no el gusto.
  //
  // Primero la hice deslizando en Y desde abajo del cuadro, y `pila` exploto: "no se puede llamar a
  // setValue() en una propiedad con fotogramas clave". Esta escrito en su propio codigo — "LA POSICION
  // SE ESCRIBE ANTES DE SEPARAR LOS EJES" — porque necesita fijar la posicion de cada copia antes de
  // animar su Z. Con claves de Y puestas de antemano, esa llamada ya no puede escribir.
  //
  // La escala no la toca nadie mas, y ademas es el mismo gesto con el que entran el punto del principio
  // y la marca del final: la pieza tiene un solo idioma para "esto llega".
  G.conRebote(G.esc(pl), [[beat(36) + 4, [0, 0, 0]], [beat(36) + 16, [50, 50, 50]]],
              { donde: "pila-entra-" + iG, piso: 2 });
  placas[iG] = pl;
}
// MODO "pila" Y NO "ola", Y LA DIFERENCIA ES QUE EL ACTO HAGA LO QUE SE LLAMA.
//
// Yo habia escrito "el gesto EMPIEZA EN CERO: las copias ya estaban superpuestas, asi que el despliegue
// ES la entrada" —que es la definicion textual de `pila`— y despues le pase `modo: "ola"`. La "ola"
// hace lo contrario: trae cada capa DESDE su z + offset HASTA su z final, que en las seis era 0. O sea
// que las seis llegaban y se APLANABAN. El acto se llama LA PROFUNDIDAD y terminaba con todo en un
// plano.
//
// No lo caza ningun cuadro suelto (seis copias del mismo PNG superpuestas se ven como una placa, que es
// una imagen perfectamente correcta) y las compuertas de encuadre, lectura y colision pasan todas. Lo
// unico que lo delato fue M7: 168 cuadros de empate por par, que son EXACTAMENTE los 168 que las placas
// estan vivas. El empate no era el defecto — era el sintoma de que nunca se separaban.
//
// Y con el modo correcto desaparece `aceptoElEmpate`: `pila` le da 2 unidades de espesor a cada copia
// por su cuenta, porque "un mazo de naipes tiene espesor". Aceptar el empate era aceptar un defecto que
// la funcion correcta no tiene.
Gc.escalonadoEnProfundidad({
  capas: placas, cam: cam, desde: beat(38), duracion: 16,
  // GROSOR 16 Y NO 2, Y EL NUMERO SALE DE LA CUENTA QUE C13 DEJA ESCRITA.
  //
  // Con grosor 2 las copias se cruzaban al abrirse (M7: placa-1 con placa-3 en el 460, placa-4 con
  // placa-5 en el 477). No es raro ni es un defecto de la funcion: mientras una copia ya arranco y su
  // vecina todavia no, la que salio primero recorre `(apertura - grosor) * retardo/duracion` y se le
  // pasa por encima. Para que no se toquen hace falta
  //
  //     grosor > (apertura - grosor) * retardo / duracion
  //
  // que con apertura 130, retardo 2 y duracion 16 da grosor > 14,4.
  //
  // Y 16 unidades de espesor inicial no es una concesion: un mazo de naipes TIENE espesor. Seis copias
  // repartidas en 80 unidades a 2400 de la camara dan un 3% de diferencia de tamano entre la primera y
  // la ultima — se lee como una pila, que es lo que es, en vez de como una sola placa.
  modo: "pila", apertura: 130, grosor: 16, retardo: 2, dx: 34, donde: "la-pila"
});
// EL EMPUJE NO ARRANCA EN EL BEAT: arranca 6 cuadros DESPUES. La pila de placas empieza a armarse en
// beat(30) y la marca cierra en beat(44); si la camara se moviera en esos mismos cuadros, el ojo leeria
// un solo bloque que se mueve y se congela de golpe, en vez de un mundo con alguien mirandolo.
Gc.empuje({ cam: cam, desde: beat(30) + 6, hasta: beat(44) + 6, recorrido: 0.10 });

// F2 · LA PILA GIRA. Es el hueco que M6 nombro con el numero exacto: 456-525, o sea 69 cuadros en los
// que el escalonado ya habia terminado y todavia no habia pasado el destello. Un hueco de 69 cuadros en
// una pieza de 600 es el 11% del video sin que arranque nada.
//
// Y no es relleno: RIMA con el volteo de la pila de recortes del acto D. El mismo gesto sobre otro
// objeto es lo que hace que una pieza se lea como una pieza y no como ocho clips pegados.
var iH;
for (iH = 0; iH < 6; iH++) {
  G.claves(G.rotY(placas[iH]),
           [[beat(41) + iH * 2, 0, "C8"], [beat(41) + iH * 2 + 12, -42]],
           "placas-giran-" + iH);
}

// F3 · Y LA CAMARA ACUSA EL GIRO. Es el unico movimiento de camara de la pieza aparte del empuje, y
// entra porque M5 mide 0% de cuota: habia margen de sobra y la pieza no lo estaba usando. Va 6 cuadros
// despues del giro, que es la separacion que exige la no-coincidencia con los eventos de elemento.
Gc.contragolpe({ cam: cam, cuadro: beat(41) + 6, eje: "z", magnitud: 13, ida: 2, vuelta: 10,
                 donde: "camara-acusa-el-giro" });

// la apertura sube: con la camara metida entre las placas, el fondo tiene que ablandarse
G.claves(G.opcCamara().property("ADBE Camera Aperture"),
         [[0, 11], [beat(37), 11], [beat(40), 26], [beat(45), 26], [beat(46), 11], [600, 11]]);

// ================================================================================================
// G · 528-576 — DESTELLO Y CIERRE
// ================================================================================================
Gx.destello({ pico: beat(44), color: [1, 1, 1], subida: 3, bajada: 10, opacidad: 82, donde: "cierre" });

// G1b · Y EL DESTELLO SE LLEVA LA PILA. Cinco cuadros de la pieza tenian al destello solo (M3), que es
// lo que pasa siempre con un fogonazo de pantalla completa. La respuesta correcta no es bajarle la
// opacidad: es que el fogonazo TENGA CONSECUENCIA. Las seis placas retroceden y se apagan con el, asi
// que cuando la luz baja ya no estan — el cierre no las tapa, las reemplaza.
var iK;
for (iK = 0; iK < 6; iK++) {
  // ESCALONADAS DE A DOS CUADROS. Saliendo las seis exactamente juntas ninguna manda y M3 lo llama
  // papilla — conto 8 cuadros asi (534-541). Con 2 de retardo la de adelante lleva la voz y las otras
  // la siguen, que ademas es como se lee un mazo que se deshace.
  // SE VAN HACIA LA CAMARA Y NO HACIA EL FONDO. Yendo al fondo, placa-4 pasaba por z=1000 —donde vive
  // `deco-fondo`— y empataba con el en el cuadro 539. Corregir eso alejando el fondo lo habria dejado
  // dibujandose un 26% mas grande que sus pixeles, o sea cambiar un empate de un cuadro por una textura
  // blanda en los 600. Hacia adelante no hay nada en el camino, y encima es lo que corresponde: el
  // fogonazo EMPUJA, no aspira.
  // EL RECORRIDO ES UNIFORME Y CORTO, Y LAS DOS COSAS SALIERON DE MEDIR.
  //
  // Uniforme porque con destinos distintos (-480 - i*60) el orden de las seis SE INVERTIA: la de mas
  // atras terminaba siendo la de mas adelante, asi que se cruzaban entre si por construccion (M7 marco
  // placa-2 con placa-4 en el 544). Restandole lo mismo a todas, el orden se conserva y con 2 cuadros
  // de retardo la de adelante recorre 300*2/13 = 46 unidades antes de que arranque su vecina, que estan
  // a 130: no se alcanzan.
  //
  // Y corto porque con 620 este gesto se comia la pieza: era tan grande comparado con la apertura de la
  // pila que la apertura dejaba de contar como arranque (M6 paso de 32 a 65 cuadros de hueco sin que yo
  // hubiera sacado nada del acto F). El umbral de deteccion es el 25% del pico de CADA capa, asi que
  // un gesto enorme al final vuelve invisible al gesto mediano de antes — en la metrica y en el ojo.
  G.claves(G.ejes(placas[iK]).z,
           [[beat(44) + iK * 2, 140 + iK * 130, "C7"], [beat(44) + iK * 2 + 13, 140 + iK * 130 - 300]],
           "placas-se-van-" + iK);
  G.claves(G.op(placas[iK]),
           [[beat(44) + iK * 2, Math.round(100 - iK * 9), "C3"], [beat(44) + iK * 2 + 13, 0]],
           "placas-se-apagan-" + iK);
}

// z=30 y no 0: las cinco letras del cierre viven entre 0 y 8 (`partir` las separa de a 2), y con la
// marca tambien en 0 empataba con la primera. Detras de las letras el orden queda definido y la marca
// se ve un 1,25% mas chica, que sobre una escala de 46 son tres decimas de pixel.
// EL BLOQUE DE CIERRE, ACOMODADO CON LA CUENTA HECHA. Estaba mal y se veia al primer golpe de vista:
// la marca mide 1040 px de nativo dibujada al 46%, o sea 478 px, y centrada en 452 ocupa de 213 a 691.
// El nombre estaba en y=640 — ADENTRO del cuadrado naranja. "Urvid" en tinta sobre el acento se lee
// (5,9:1 de contraste, por eso `escena-check` no dijo nada) pero es el logotipo escrito encima del
// isotipo, que no es un problema de legibilidad sino de composicion.
//
// Con la marca en 430 ocupa de 191 a 669, el nombre centrado en 768 va de 716 a 820, y la url en 856
// de 834 a 878. El bloque entero cae entre 191 y 878, o sea centrado en 534 contra los 540 del cuadro.
var marca = G.img("m-marca", "marca", 960, 430, 30, 46);
G.conRebote(G.esc(marca), [[beat(44), [0, 0, 0]], [beat(44) + 10, [46, 46, 46]]],
            { donde: "marca-final", piso: 2 });
G.plano(marca, beat(44), 600);

// AQUI NO VA UN BARRIDO DE LUZ, Y ESO LO DECIDIO UNA PRECONDICION ESCRITA, NO EL GUSTO.
//
// `barridoDeBrillo` dice de si misma: "si no podes nombrar el color del fondo es que el fondo no es
// plano, y la tecnica NO SE PUEDE HACER HOY". El fondo de esta pieza tiene textura de papel, una
// reticula al 52% y una mancha naranja en modo ADD — o sea que NO es plano. Las tapas que la tecnica
// necesita para esconder el sobrante de la banda habrian pintado papel liso sobre un anillo de 140 px
// a cada lado de la marca, y la reticula habria desaparecido de ahi durante nueve cuadros.
//
// Lo intente primero sobre la web (anillo de 250 px) y despues sobre la marca (140). El numero bajo y
// el defecto no: en las dos el fondo se comia un pedazo. La tecnica es correcta y la pieza es la que no
// le sirve. Queda anotado para la proxima, que probablemente tenga un fondo plano.

var nombre = Gt.golpePorCaracter({
  cadena: "Urvid", tam: 104, color: TINTA, fuente: DISPLAY, nombre: "cierre",
  x: 960, y: 768, z: 0, desde: beat(45) + 2, retardo: 2
});

var url = G.rotulo({ cadena: "urvid.ia", tam: 44, color: GRIS, fuente: DISPLAY,
                     x: 960, y: 856, z: -20, nombre: "url" });
// LA URL NO REBOTA: 40 px en 10 cuadros dan 3,6 de sobrepaso contra un piso de 8, y la funcion se
// niega. Tiene razon — un desplazamiento de 40 px es un ASENTAMIENTO, no un golpe. Forzarlo a 4 cuadros
// para que "entre en el piso" seria acomodar el gesto a la compuerta en vez de elegir el gesto correcto.
Ge.deslizarConFundido({ capa: url, cuadro: beat(47), dur: 10, dy: 40, curva: "C1", donde: "url" });
G.plano(url, beat(47), 600);

// ================================================================================================
var cerrado = G.cerrar();
di("");
di("PIEZA|PIEZA-M|1920x1080|30fps|600 cuadros|beat " + BEAT);
di("CAPAS|" + cerrado.capas);
di("AVISOS|" + cerrado.avisos.length);
di("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  di("EXPLOTO|" + (elFallo.message ? elFallo.message : elFallo).toString() +
     "|linea " + (elFallo.line ? elFallo.line : "?"));
  di("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
