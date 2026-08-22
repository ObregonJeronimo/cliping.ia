// PIEZA-A v2 — la composicion, despues de un panel de diseño.
//
// LA RESTRICCION SIGUE SIENDO LA MISMA Y ES A PROPOSITO: solo texto, solidos, las seis propiedades de
// transformacion, emparentado, orden de apilado y obturador. Nada de formas, efectos, mascaras,
// expresiones, 3D ni degradados. La pregunta es cuanta calidad se consigue con eso solo.
//
// LA v1 MEDIA BIEN Y SE VEIA TIMIDA. Ritmo 15,6 de movimiento medio y cero cortes — o sea dentro de la
// banda de las referencias (Gemini 14,1 · FireFit 28,6) — y sin embargo parecia un esquema: abria en
// negro, casi todo el cuadro vacio casi todo el tiempo, un solo gesto grande y despues nada, y un
// bloque de color que llegaba sin hacer nada. Las metricas de ritmo no miden diseño.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// LOS CUATRO PRINCIPIOS QUE ORDENAN ESTA VERSION
//
//   1. EL CUADRO 0 ES 100% ROJO, y el primer evento es una RESTA. El titulo esta CALADO en el rojo
//      —texto del color del fondo pintado encima del solido— y el rojo se va de un latigazo llevandose
//      su calado, dejando debajo el mismo titulo en hueso. Es un revelado de verdad con dos capas de
//      texto y un emparentado. Y el rojo no desaparece: se retira convertido en una banda de 56 px
//      pegada al cuadro. LLEGA SIENDO TODO Y SE QUEDA SIENDO ESTRUCTURA.
//
//   2. EL APILADO ES LA MASCARA, A DOS ESCALAS. Una tapa de 300 px revela una linea; una de 1920
//      revela la pieza entera. Es el MISMO recurso en dos tamaños, y esa repeticion es lo que da
//      unidad — no hace falta inventar un segundo mecanismo.
//
//   3. PARALAJE CON VELOCIDAD 0 EN TODAS LAS MANIJAS. Los tres nulos llevan keyframes en los MISMOS
//      tiempos con las MISMAS influencias y velocidad 0. Con velocidad 0, `y1 = velocidad*(dt/dv)*x1`
//      colapsa a 0 sin importar dt ni dv, asi que el avance normalizado es identico en los tres y la
//      proporcion 45 / 100 / 165 se cumple EN CADA CUADRO, no solo en los extremos. Si alguna manija
//      llevara velocidad distinta de cero habria que escalarla, y la desincronizacion no se veria ni
//      en el primer cuadro ni en el ultimo: se veria justo en el medio, donde nadie mira.
//      (Es el mismo hallazgo del factor dt de la Prueba 3, dado vuelta y usado como tecnica.)
//
//   4. SILENCIOS MEDIDOS. La v1 tenia un gesto grande y despues nada. Esta tiene siete eventos de
//      cuatro escalas distintas separados por silencios explicitos, el mas largo de 60 cuadros. El
//      silencio antes del golpe es parte del golpe.
// ─────────────────────────────────────────────────────────────────────────────────────────────

var RUTA = "C:/ae-probe/pieza-a.txt";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}

function anotar(t) {
  var a = new File(RUTA);
  a.encoding = "UTF-8";
  a.open("a");
  a.write(t + "\n");
  a.close();
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("pieza A v2");

var NOMBRE = "PIEZA-A";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 10;

// LA PALETA, cinco valores y ni uno mas. La escalera de valor ES la profundidad: lo de cerca mas
// OSCURO que el fondo (silueta), lo del fondo apenas mas claro (aire). Perspectiva aerea con solidos
// planos y cero efectos.
var FONDO  = [0.055, 0.055, 0.071];   // #0E0E12
var ROJO   = [0.949, 0.251, 0.149];   // #F24026
var HUESO  = [0.949, 0.945, 0.925];   // #F2F1EC — blanco calido, no puro
var GRIS   = [0.545, 0.565, 0.627];   // #8B90A0
var MURO   = [0.098, 0.106, 0.141];   // #191B24 — apenas sobre el fondo: aire
var ROTULO = [0.137, 0.153, 0.204];   // #232734 — sobre el muro, apenas: un letrero fantasma
var CERCA  = [0.031, 0.031, 0.039];   // #08080A — mas oscuro que el fondo: silueta

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}

var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
comp.bgColor = FONDO;
comp.resolutionFactor = [1, 1];
comp.openInViewer();
comp.motionBlur = true;
comp.shutterAngle = 180;
comp.shutterPhase = -90;
comp.motionBlurSamplesPerFrame = 16;

// ---------------------------------------------------------------- vocabulario de curvas
var LATIGO_S = { v: 0, i: 78 }, LATIGO_E = { v: 0, i: 90 };   // cruza rapido y estaciona
var ENTRA_S  = { v: 0, i: 20 }, ENTRA_E  = { v: 0, i: 90 };   // sale enseguida y se posa
var SUAVE_S  = { v: 0, i: 33.333333 }, SUAVE_E = { v: 0, i: 33.333333 };
var SECO_S   = { v: 0, i: 25 }, SECO_E = { v: 0, i: 8 };      // frena en seco: entrada baja

function terna(prop, e) {
  var cuantos = prop.keyOutTemporalEase(1).length;
  var a = [], j;
  for (j = 0; j < cuantos; j++) { a[a.length] = new KeyframeEase(e.v, e.i); }
  return a;
}
function bezierTodo(prop) {
  var k;
  for (k = 1; k <= prop.numKeys; k++) {
    prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
  }
}
function animar(prop, t1, v1, t2, v2, eS, eE) {
  prop.setValueAtTime(t1, v1);
  prop.setValueAtTime(t2, v2);
  bezierTodo(prop);
  prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t1), terna(prop, eS), terna(prop, eS));
  prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t2), terna(prop, eE), terna(prop, eE));
}
// EL ASENTAMIENTO: se pasa del destino y vuelve. Sobre una posicion 2D el sobrepaso NO se puede hacer
// con la curva —el ease gobierna el avance por largo de arco, que no puede exceder el segmento— asi
// que se hace con TRES keyframes: pasa de largo y regresa. Es lo que separa "llego" de "aterrizo".
function asentar(prop, t1, v1, t2, v2, t3, v3) {
  prop.setValueAtTime(t1, v1);
  prop.setValueAtTime(t2, v2);
  prop.setValueAtTime(t3, v3);
  bezierTodo(prop);
  prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t1), terna(prop, ENTRA_S), terna(prop, ENTRA_S));
  prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t2), terna(prop, SUAVE_S), terna(prop, SUAVE_S));
  prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t3), terna(prop, ENTRA_E), terna(prop, ENTRA_E));
}

function tr(c) { return c.property("ADBE Transform Group"); }
function pos(c) { return tr(c).property("ADBE Position"); }
function esc(c) { return tr(c).property("ADBE Scale"); }
function opa(c) { return tr(c).property("ADBE Opacity"); }
function anc(c) { return tr(c).property("ADBE Anchor Point"); }

function ponerTexto(cadena, tam, color, fuente) {
  var capa = comp.layers.addText(cadena);
  var p = capa.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = tam;
  d.fillColor = color;
  d.applyFill = true;
  d.justification = ParagraphJustification.LEFT_JUSTIFY;
  try { d.font = fuente; } catch (exF) {}
  p.setValue(d);
  return capa;
}

var NEGRA = "Arial-Black", BOLD = "Arial-BoldMT", REGULAR = "ArialMT";

// ---------------------------------------------------------------- EL MAPA DE TIEMPO
//   0,00–0,20  quieto · cuadro 100% ROJO con MOTION calado
//   0,20–0,62  la tapa sube 1220 px llevandose su calado          [cuadro completo]
//   0,62–1,10  quieto (14 c)
//   1,10–1,58  la bajada sube detras de su tapa                    [minimo]
//   1,58–2,00  quieto (13 c)
//   2,00–2,66  tres reglas se dibujan escalonadas                  [chico x3]
//   2,66–3,30  quieto (19 c) — el silencio antes del viaje
//   3,30–4,66  EL VIAJE: -1920 en el plano medio                   [cuadro completo]
//   4,66–5,20  quieto (16 c)
//   5,20–6,26  tres cifras suben como MASA, escalonadas, y asientan [medio x3]
//   6,26–7,10  quieto (25 c)
//   7,10–7,86  EL CAMPO sube llevando su texto                     [cuadro completo]
//   7,86–10,00 quieto (64 c) — el aterrizaje. Solo la deriva del lente.
// ---------------------------------------------------------------- LOS NULOS
var lente = comp.layers.addNull();  lente.name = "lente";
var mundo = comp.layers.addNull();  mundo.name = "mundo";
var fondo = comp.layers.addNull();  fondo.name = "plano-fondo";
var cerca = comp.layers.addNull();  cerca.name = "plano-cerca";

var nulos = [lente, mundo, fondo, cerca];
var u;
for (u = 0; u < nulos.length; u++) {
  anc(nulos[u]).setValue([0, 0, 0]);
  pos(nulos[u]).setValue([0, 0]);
}
mundo.parent = lente;
fondo.parent = lente;
cerca.parent = lente;

// el empuje del lente: 4% repartido en 3,5 s. Nunca hay un cuadro completamente quieto, y como su
// anclaje no se mueve el empuje es hacia el centro y no una deriva lateral.
anc(lente).setValue([ANCHO / 2, ALTO / 2, 0]);
pos(lente).setValue([ANCHO / 2, ALTO / 2]);
animar(esc(lente), 6.5, [100, 100, 100], 10.0, [104, 104, 100], SUAVE_S, SUAVE_E);

// EL VIAJE, y las dos velocidades que lo acompañan. Mismos tiempos, mismas influencias, velocidad 0.
var VIAJE1 = 3.30, VIAJE2 = 4.66, RECORRIDO = 1920;
animar(pos(mundo), VIAJE1, [0, 0], VIAJE2, [-RECORRIDO, 0], LATIGO_S, LATIGO_E);
animar(pos(fondo), VIAJE1, [0, 0], VIAJE2, [-RECORRIDO * 0.45, 0], LATIGO_S, LATIGO_E);
animar(pos(cerca), VIAJE1, [0, 0], VIAJE2, [-RECORRIDO * 1.65, 0], LATIGO_S, LATIGO_E);
anotar("paralaje 45 / 100 / 165 con velocidad 0 en las seis manijas");

// ---------------------------------------------------------------- EL PLATO (sin claves: ya esta ahi)
// plano del fondo: un muro apenas mas claro que el fondo, con un rotulo fantasma y tres nervios.
// El muro TERMINA en x=2600 del mundo: cuando la camara viaja, ese borde entra en cuadro y el vacio
// que queda es vacio REAL, no negro decorativo. Un hueco en la pared cuesta cero capas y lee como
// profundidad.
var muro = comp.layers.addSolid(MURO, "muro", 2600, 1500, 1);
muro.parent = fondo;
anc(muro).setValue([0, 0, 0]);
pos(muro).setValue([-200, -120]);

// EL LETRERO FANTASMA VIVE EN LA ESTACION B, y eso resuelve un defecto que solo se ve mirando:
// despues del viaje habia un cuadro entero vacio esperando a que llegaran las cifras. Llegar a un
// lugar donde no hay nada todavia se lee como "no hay nada", no como silencio. Con el letrero, la
// estacion B ya EXISTE antes de que pase algo en ella.
//
// La cuenta de donde ponerlo, que es la unica parte fea del paralaje: este plano se mueve al 0,45 del
// medio, asi que recorre 864 px mientras el mundo recorre 1920. Para que caiga en pantalla DESPUES del
// viaje hay que ubicarlo en x + 864 de donde se lo quiere ver.
var fantasma = ponerTexto("02", 620, ROTULO, NEGRA);
fantasma.name = "fantasma";
fantasma.parent = fondo;
pos(fantasma).setValue([864 + 1180, 1010]);   // cae en x=1180 despues del viaje

var nervios = [];
var nv;
for (nv = 0; nv < 3; nv++) {
  var nervio = comp.layers.addSolid(CERCA, "nervio" + (nv + 1), 7, 1500, 1);
  nervio.parent = fondo;
  anc(nervio).setValue([0, 0, 0]);
  pos(nervio).setValue([260 + nv * 520, -120]);
  opa(nervio).setValue(55);
  nervios[nv] = nervio;
}

// plano de cerca: dos siluetas mas oscuras que el fondo. Cruzan el cuadro a 1,65 y son lo que hace
// que el viaje se SIENTA rapido sin que el plano medio se mueva de mas.
var columna = comp.layers.addSolid(CERCA, "columna-cerca", 300, 1700, 1);
columna.parent = cerca;
anc(columna).setValue([0, 0, 0]);
pos(columna).setValue([1560, -200]);

var piso = comp.layers.addSolid(CERCA, "piso-cerca", 2800, 210, 1);
piso.parent = cerca;
anc(piso).setValue([0, 0, 0]);
pos(piso).setValue([-400, 1010]);

// ---------------------------------------------------------------- ESTACION A (mundo x 0..1920)
var X_A = 160;

var titulo = ponerTexto("MOTION", 200, HUESO, NEGRA);
titulo.name = "titulo";
titulo.parent = mundo;
pos(titulo).setValue([X_A, 560]);

var tapaTitulo = comp.layers.addSolid(FONDO, "tapa-titulo", 1500, 700, 1);
tapaTitulo.parent = mundo;
anc(tapaTitulo).setValue([0, 0, 0]);
pos(tapaTitulo).setValue([80, 592]);         // cubre de y=592 para abajo

var bajada = ponerTexto("texto y solidos. nada mas.", 46, GRIS, REGULAR);
bajada.name = "bajada";
bajada.parent = mundo;
animar(pos(bajada), 1.10, [X_A, 740], 1.58, [X_A, 648], ENTRA_S, ENTRA_E);

var tapaBajada = comp.layers.addSolid(FONDO, "tapa-bajada", 1500, 700, 1);
tapaBajada.parent = mundo;
anc(tapaBajada).setValue([0, 0, 0]);
pos(tapaBajada).setValue([80, 672]);

// tres reglas que se dibujan desde su extremo izquierdo, escalonadas 5 cuadros. El escalonado es lo
// que hace que tres cosas iguales se lean como una decision y no como una repeticion.
// LARGOS QUE BAJAN CON RITMO, no al azar: 640 / 400 / 250 es casi la misma razon entre uno y el
// siguiente (0,63 y 0,63). La primera version usaba 520/340/190 y la tercera se leia como un muñon
// —una barra tan corta parece un error, no una decision. Y 14 px de alto en vez de 10: a 1:3 en la
// tira, una barra de 10 px es un pelo y no registra.
var reglas = [];
var LARGOS = [640, 400, 250];
var rg;
for (rg = 0; rg < 3; rg++) {
  var regla = comp.layers.addSolid(ROJO, "regla" + (rg + 1), LARGOS[rg], 14, 1);
  regla.parent = mundo;
  anc(regla).setValue([0, 7, 0]);
  pos(regla).setValue([X_A, 762 + rg * 46]);
  animar(esc(regla), 2.00 + rg * 0.166, [0, 100, 100], 2.50 + rg * 0.166, [100, 100, 100], LATIGO_S, ENTRA_E);
  reglas[rg] = regla;
}

// ---------------------------------------------------------------- ESTACION B (mundo x 1920..3840)
// EL DATO COMO MASA: cifras en 240 px, no lineas grises de 46. La v1 puso el dato como pie de pagina;
// aca el dato ES el cuadro.
var X_B = 1920 + 170;
var CIFRAS = ["0,017", "1015", "10"];
var ROTULOS = ["PIXELES DE ERROR", "MS POR LLAMADA", "CAPAS"];
// LA CUENTA DEL INTERLINEADO, que la primera version no hizo y se noto enseguida: una cifra de 210 px
// en Arial Black ocupa unos 150 px de tinta POR ENCIMA de su linea de base. Con las lineas separadas
// 210 px y el rotulo 52 px debajo de cada una, el rotulo caia dentro de la tinta de la cifra
// siguiente. Se ven las dos cosas encimadas y parece un defecto de exportacion, no de layout.
// Con 240 de separacion y el rotulo a 55: rotulo 1 en y=385, tinta de la cifra 2 desde y=420. Entra.
var cifras = [], rotulos = [], tapasCifra = [];
var cf;
for (cf = 0; cf < 3; cf++) {
  var yBase = 330 + cf * 240;
  var cuando = 4.95 + cf * 0.20;

  var cifra = ponerTexto(CIFRAS[cf], 210, HUESO, NEGRA);
  cifra.name = "cifra" + (cf + 1);
  cifra.parent = mundo;
  // sube desde atras de su tapa, se pasa 16 px y asienta
  asentar(pos(cifra), cuando, [X_B, yBase + 230], cuando + 0.52, [X_B, yBase - 16], cuando + 0.86, [X_B, yBase]);
  cifras[cf] = cifra;

  var tapa = comp.layers.addSolid(FONDO, "tapa-cifra" + (cf + 1), 1500, 260, 1);
  tapa.parent = mundo;
  anc(tapa).setValue([0, 0, 0]);
  pos(tapa).setValue([1920 + 80, yBase + 22]);
  tapasCifra[cf] = tapa;

  var rot = ponerTexto(ROTULOS[cf], 30, GRIS, BOLD);
  rot.name = "rotulo" + (cf + 1);
  rot.parent = mundo;
  pos(rot).setValue([X_B + 6, yBase + 55]);
  animar(opa(rot), cuando + 0.30, 0, cuando + 0.70, 100, SUAVE_S, SUAVE_E);
  rotulos[cf] = rot;
}

// ---------------------------------------------------------------- EL CAMPO, que llega y HACE algo
// La v1 tenia un rectangulo que subia y se quedaba. Este llega con su texto encima —emparentado, asi
// que viaja sin claves propias— y frena en seco. El bloque no es el evento: el bloque TRAE el evento.
// EL CAMPO SE DETIENE MAS ABAJO QUE EN LA PRIMERA VERSION (170 px visibles en vez de 250), y no es
// gusto: con 250 tapaba la ultima cifra y su rotulo. Una banda que se come el dato que acaba de
// entrar no es una decision de composicion, es una colision.
var campo = comp.layers.addSolid(ROJO, "campo", 2400, 300, 1);
campo.parent = mundo;
anc(campo).setValue([0, 0, 0]);
animar(pos(campo), 7.10, [1920 - 240, ALTO + 40], 7.86, [1920 - 240, ALTO - 170], LATIGO_S, SECO_E);

// El texto en coordenadas del BLOQUE, no de la pantalla, porque es su hijo. En x=420 cae a 180 px del
// borde despues del viaje; con 250 arrancaba a 10 px y la primera palabra quedaba pegada al canto.
var campoTexto = ponerTexto("SIN EFECTOS. SIN MASCARAS.", 62, FONDO, NEGRA);
campoTexto.name = "campo-texto";
campoTexto.parent = campo;                    // viaja con el bloque, sin claves propias
pos(campoTexto).setValue([420, 115]);

// ---------------------------------------------------------------- LA BANDA y LA TAPA DE APERTURA
// La banda queda PEGADA AL CUADRO (sin padre): es la unica referencia fija, y es lo que vuelve
// legible el paralaje. Sin nada quieto, tres velocidades se leen como una sola.
var banda = comp.layers.addSolid(ROJO, "banda", ANCHO, 56, 1);
anc(banda).setValue([0, 0, 0]);
pos(banda).setValue([0, 0]);

// LA APERTURA. El cuadro 0 es 100% rojo. El calado es texto del color del FONDO pintado encima del
// solido, emparentado a el: sube con la tapa y deja debajo el mismo titulo en hueso, en el mismo
// lugar. Es un revelado real con dos capas de texto y un emparentado.
var tapaApertura = comp.layers.addSolid(ROJO, "tapa-apertura", 2200, 1300, 1);
anc(tapaApertura).setValue([0, 0, 0]);
animar(pos(tapaApertura), 0.20, [-140, -60], 0.62, [-140, -1280], LATIGO_S, LATIGO_E);
tapaApertura.outPoint = 0.80;

var calado = ponerTexto("MOTION", 200, FONDO, NEGRA);
calado.name = "calado";
calado.parent = tapaApertura;
pos(calado).setValue([X_A + 140, 620]);       // en coordenadas de la tapa: cae sobre el titulo real
calado.outPoint = 0.80;

// ---------------------------------------------------------------- ORDEN DE APILADO
// ES LA PIEZA, no un detalle. Cada tapa tiene que estar ARRIBA del texto que oculta y ABAJO del que
// no. Se ordena explicitamente en vez de depender del orden de creacion, que es al reves y se presta
// a equivocarse en una linea sin que nada avise.
function subirATope(capa) { capa.moveToBeginning(); }
var ORDEN = [                                  // del FONDO hacia el FRENTE
  muro, fantasma, nervios[0], nervios[1], nervios[2],
  titulo, tapaTitulo, bajada, tapaBajada, reglas[0], reglas[1], reglas[2],
  cifras[0], tapasCifra[0], cifras[1], tapasCifra[1], cifras[2], tapasCifra[2],
  rotulos[0], rotulos[1], rotulos[2],
  columna, piso,
  campo, campoTexto,
  banda,
  tapaApertura, calado,
  lente, mundo, fondo, cerca
];
var o;
for (o = 0; o < ORDEN.length; o++) { subirATope(ORDEN[o]); }

// EL OBTURADOR SE PRENDE EN TODAS. En AE el interruptor es por capa Y por composicion, y no se hereda
// del padre: una capa quieta emparentada a un nulo que se mueve TAMBIEN se desenfoca, y si no tiene el
// interruptor queda con los bordes duros contra todo lo demas.
var todas = comp.layers;
var w;
for (w = 1; w <= todas.length; w++) {
  try { todas[w].motionBlur = true; } catch (exMB) {}
}

anotar("PIEZA-A v2: " + comp.numLayers + " capas, " + DUR + " s, 0 cortes");
anotar("fuente del titulo: " + titulo.property("ADBE Text Properties").property("ADBE Text Document").value.font);
app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
