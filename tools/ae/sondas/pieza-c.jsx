// PIEZA-C — la primera pieza autorada CON EL CATALOGO EN LA MANO.
//
// La PIEZA-B se midio bien y estaba muerta. El diagnostico del usuario fue exacto y mi metrica de
// entonces no vio nada de eso, porque medía el PROMEDIO de movimiento: "muy lento", "no tiene beat",
// "el video esta como muerto". Con la metrica nueva esa pieza da 0,08 gestos por segundo (uno en doce
// segundos), 48 cuadros seguidos sin que arranque nada, y 61% de la energia en la camara en su peor
// ventana. O sea: yo anime la camara y nada mas.
//
// ESTA PIEZA SE AUTORA CONTRA ESOS NUMEROS, no contra el gusto:
//
//   RITMO      un gesto cada 8 a 16 cuadros, NUNCA un hueco de mas de 20. Beat de 15 cuadros a 120
//              bpm y grilla fina de 8. Los gestos que mandan caen en multiplos de 120, que es donde
//              las dos grillas coinciden.
//   CAMARA     tres planos con CORTE, deriva lenta entre cortes, un solo contragolpe. La camara
//              aporta 2-3 px por cuadro contra 25-30 del elemento mas rapido: factor diez.
//   DURACION   gesto estandar 10-14 cuadros. La SALIDA dura el 60% de la entrada — invertirlo es la
//              causa mas comun de que una pieza se sienta lenta.
//   SILENCIO   despues de cada gesto, quietud real. Sin silencio no hay golpe.
//   CURVAS     las ocho del catalogo por su id. NUNCA Easy Ease (33/33).
//
// Y LAS LEYES DEL REPRODUCTOR, que no son estilo sino fidelidad:
//   LEY 1  la profundidad la decide el EJE de la camara (medido contra AE: una capa que esta delante
//          lo esta siempre, aunque este mas lejos del ojo). Nadie cruza a nadie y nadie queda a menos
//          de 1 unidad de otro con el que se pise.
//   LEY 2  las capas se reparten por PLANO con punto de entrada y de salida, no con opacidad. Un
//          corte es un limite, no un gesto — y contado como gesto se lleva puesta toda la escala.
//   LEY 4  el fondo es un SOLIDO real, y como la pieza usa resplandor va en 3D y lejos.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-c.jsx
//   node tools/ae/ritmo.mjs
//   node tools/ae/pieza.mjs PIEZA-C --rapido --tira

var RUTA = "C:/ae-probe/pieza-c.txt";
var RECURSOS = "C:/ae-probe/recursos";

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
// LOS ACENTOS VAN POR CODIGO. El .jsx se guarda en UTF-8 y ExtendScript no garantiza leerlo asi: una
// "I" con tilde puede llegar como dos caracteres basura y el defecto aparece recien en el video.
function ac(s) {
  s = s.replace(/\{A\}/g, String.fromCharCode(193));
  s = s.replace(/\{E\}/g, String.fromCharCode(201));
  s = s.replace(/\{I\}/g, String.fromCharCode(205));
  s = s.replace(/\{O\}/g, String.fromCharCode(211));
  s = s.replace(/\{U\}/g, String.fromCharCode(218));
  s = s.replace(/\{N\}/g, String.fromCharCode(209));
  return s;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("PIEZA-C");

var NOMBRE = "PIEZA-C";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 450;
var DUR = CUADROS / FPS;
var CORTE1 = 144, CORTE2 = 288;

var FONDO = [0.043, 0.047, 0.063];
var HUESO = [0.949, 0.945, 0.925];
var GRIS  = [0.486, 0.518, 0.588];
var ACENTO = [0.949, 0.251, 0.149];
var CIAN  = [0.149, 0.741, 0.949];
var VERDE = [0.290, 0.800, 0.420];
// LA TARJETA MEDIA 20,14,18 CONTRA UN FONDO DE 11,12,16: existia y no se veia. Un panel oscuro sobre
// un fondo oscuro no es sobriedad, es una capa que no esta.
var PANEL = [0.137, 0.153, 0.196];

// ---------------------------------------------------------------- las ocho curvas, por su id
// influencia de SALIDA de la clave que abre el tramo / influencia de ENTRADA de la que lo cierra.
// AE no acepta influencia 0 (pide 0,1), asi que C7 arranca en 0,1: a efectos practicos es velocidad
// maxima desde el primer cuadro, que es lo que un acuse necesita.
var CURVAS = {
  C1: [20, 85],    // ENTRADA — el 60% de todo. Entra rapido, aterriza.
  C2: [10, 92],    // PESADA — paneles grandes, cosas con masa.
  C3: [90, 15],    // SALIDA — arranca lento, se dispara. Todo lo que se va.
  C4: [85, 85],    // LATIGAZO — transitos que cruzan el cuadro.
  C6: [70, 70],    // TRASLADO — A a B con reposo en los dos extremos.
  C7: [0.1, 80],   // GOLPE — acuses, impactos.
  C8: [70, 20]     // ASENTAMIENTO — el tramo de vuelta de un sobrepaso.
};

function tr(c) { return c.property("ADBE Transform Group"); }

function aplicarCurva(prop, k, k2, c) {
  var n = prop.keyOutTemporalEase(k).length;
  var sal = [], ent = [], q;
  for (q = 0; q < n; q++) {
    sal[q] = new KeyframeEase(0, c[0]);
    ent[q] = new KeyframeEase(0, c[1]);
  }
  prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.BEZIER);
  prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, prop.keyOutInterpolationType(k2));
  prop.setTemporalEaseAtKey(k, prop.keyInTemporalEase(k), sal);
  prop.setTemporalEaseAtKey(k2, ent, prop.keyOutTemporalEase(k2));
}

// EL INDICE DE CADA CLAVE SE PREGUNTA POR TIEMPO, NO SE DEDUCE DE LA POSICION EN LA LISTA.
//
// AE numera las claves por orden de tiempo sobre TODA la propiedad. Suponer que la clave i de esta
// lista es la clave i+1 de la propiedad vale solo la primera vez: en cuanto una segunda llamada le
// agrega claves anteriores —dos acuses sobre la misma Y, que es lo normal— los indices se corren y las
// curvas se aplican sobre las claves EQUIVOCADAS. No falla ruidosamente: deja unos tramos con la curva
// de otro y otros con los tipos mezclados. Asi salio el unico rechazo del exportador en la primera
// corrida ("capa 31 posY: tipos mezclados"), que es la unica razon por la que me entere.
function claves(prop, lista) {
  var i;
  for (i = 0; i < lista.length; i++) { prop.setValueAtTime(lista[i][0] / FPS, lista[i][1]); }
  for (i = 0; i < lista.length - 1; i++) {
    var c = lista[i][2];
    var k = prop.nearestKeyIndex(lista[i][0] / FPS);
    var k2 = prop.nearestKeyIndex(lista[i + 1][0] / FPS);
    if (c === "HOLD") {
      prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.HOLD);
    } else if (c === "C5") {
      prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.LINEAR);
      prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.LINEAR, prop.keyOutInterpolationType(k2));
    } else {
      aplicarCurva(prop, k, k2, CURVAS[c]);
    }
  }
}

// LAS DIMENSIONES SEPARADAS NO SON UNA COMODIDAD: son lo que evita las tangentes espaciales. Una
// posicion 3D con curva bezier hace que AE le invente al camino una curvatura suave, y una trayectoria
// curva NO se puede portar — el exportador la rechaza con motivo. Separadas, cada eje es un escalar y
// no hay camino que curvar. De paso permite lo que esta pieza usa todo el tiempo: acusar en Y sin
// tocar X ni Z.
function ejes(capa) {
  tr(capa).property("ADBE Position").dimensionsSeparated = true;
  return {
    x: tr(capa).property("ADBE Position_0"),
    y: tr(capa).property("ADBE Position_1"),
    z: tr(capa).property("ADBE Position_2")
  };
}

// D01 — EL ACUSE. Un desplazamiento chico y un regreso: es lo que hace que un elemento RECIBA la
// llegada de otro en vez de quedarse indiferente. Golpe a la ida (C7), asentamiento a la vuelta (C8),
// y la vuelta dura mas que la ida.
function acuse(prop, cuadro, base, delta) {
  claves(prop, [[cuadro, base, "C7"], [cuadro + 3, base + delta, "C8"], [cuadro + 11, base, "C5"]]);
}

// ACOMPAÑAR NO ES ACUSAR, Y LA DIFERENCIA ES LA FORMA DE LA ENERGIA.
//
// Un acuse concentra todo en tres cuadros y despues vuelve despacio: sirve para REACCIONAR a algo que
// acaba de pasar. Pero el gesto al que acompaña dura doce o dieciseis cuadros, asi que a partir del
// cuarto el gesto vuelve a estar solo en pantalla — y eso es exactamente lo que mide la dominancia.
// Medido: con acuses, 58 de 133 cuadros con una sola cosa moviendose.
//
// Un acompañamiento reparte su recorrido a lo largo de TODA la duracion del gesto: sale en el 45% y
// vuelve en el 55%, las dos mitades con curva de entrada. Se mueve menos por cuadro y esta presente
// todo el tiempo, que es lo que hace que una escena se lea como coreografia y no como una lista.
function acompana(prop, cuadro, dur, base, delta) {
  var medio = Math.round(dur * 0.45);
  claves(prop, [[cuadro, base, "C1"], [cuadro + medio, base + delta, "C1"], [cuadro + dur, base, "C5"]]);
}

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
comp.resolutionFactor = [1, 1];
comp.motionBlur = true;
comp.shutterAngle = 180;
comp.shutterPhase = -90;
comp.motionBlurSamplesPerFrame = 16;
comp.bgColor = FONDO;
comp.openInViewer();

function importar(archivo) {
  var f = new File(RECURSOS + "/" + archivo);
  if (!f.exists) { throw new Error("falta el recurso " + archivo); }
  return app.project.importFile(new ImportOptions(f));
}
var imgHeroe = importar("pantalla-1.png");
var imgLista = importar("pantalla-2.png");

// EL PLANO AL QUE PERTENECE CADA CAPA SE DECLARA CON ENTRADA Y SALIDA. Ver LEY 2 arriba.
function plano(capa, desde, hasta) {
  capa.inPoint = desde / FPS;
  capa.outPoint = hasta / FPS;
  return capa;
}

function solido(nombre, color, w, h, z, comentario) {
  var s = comp.layers.addSolid(color, nombre, w, h, 1);
  s.threeDLayer = true;
  s.motionBlur = true;
  tr(s).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, z]);
  if (comentario) { s.comment = comentario; }
  return s;
}
function imagen(item, nombre, x, y, z, escala) {
  var c = comp.layers.add(item);
  c.name = nombre;
  c.threeDLayer = true;
  c.motionBlur = true;
  tr(c).property("ADBE Position").setValue([x, y, z]);
  tr(c).property("ADBE Scale").setValue([escala, escala, escala]);
  return c;
}
function rotulo(cadena, tam, color, fuente, x, y, z, just) {
  var t = comp.layers.addText(ac(cadena));
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = tam;
  d.fillColor = color;
  d.applyFill = true;
  d.justification = just || ParagraphJustification.CENTER_JUSTIFY;
  try { d.font = fuente; } catch (exF) {}
  p.setValue(d);
  t.threeDLayer = true;
  t.motionBlur = true;
  tr(t).property("ADBE Position").setValue([x, y, z]);
  return t;
}
// una barra que crece desde su borde izquierdo: el anclaje va AL BORDE, si no se abre desde el medio
// como un acordeon, que es el error clasico de F01
function barra(nombre, largo, alto, color, x, y, z, decl) {
  var b = solido(nombre, color, largo, alto, z, decl);
  tr(b).property("ADBE Anchor Point").setValue([0, alto / 2, 0]);
  tr(b).property("ADBE Position").setValue([x, y, z]);
  return b;
}

// EL TEXTO LETRA POR LETRA, CON EL KERNING DEL TIPOGRAFO INTACTO.
//
// Animar una palabra caracter por caracter exige una capa por caracter, y ahi se pierde el kerning:
// puestas una al lado de la otra por su ancho propio, "AV" queda separado y se ve amateur. La salida no
// es estimar: es MEDIR PREFIJOS ACUMULADOS. Se pone "M" y se mide; se pone "MI" y se mide; la
// diferencia es el avance de la "I" CON su par de kerning ya aplicado, porque lo calculo AE sobre la
// cadena entera. Una sola capa temporal y tantas mediciones como letras.
function porCaracter(cadena, tam, color, fuente, x0, base, z) {
  cadena = ac(cadena);
  var medidor = comp.layers.addText(cadena);
  var pm = medidor.property("ADBE Text Properties").property("ADBE Text Document");
  var dm = pm.value;
  dm.fontSize = tam; dm.fillColor = color; dm.applyFill = true;
  dm.justification = ParagraphJustification.LEFT_JUSTIFY;
  try { dm.font = fuente; } catch (exF2) {}
  pm.setValue(dm);

  var bordes = [0], i;
  for (i = 1; i <= cadena.length; i++) {
    var d2 = pm.value;
    d2.text = cadena.substring(0, i);
    pm.setValue(d2);
    var caja = medidor.sourceRectAtTime(0, false);
    bordes[i] = caja.left + caja.width;
  }
  // EL ESPACIO NO TIENE TINTA, Y sourceRectAtTime MIDE TINTA.
  //
  // El borde derecho de "MISMO " es identico al de "MISMO", asi que la "C" caia pegada a la "O" y el
  // hueco del espacio aparecia despues, entre la "C" y la "U": el remate se leia "MISMOC UADRO". Se ve
  // en el primer render y es de los defectos que no perdona nadie.
  //
  // El ancho del espacio se mide aparte, con la diferencia entre dos cadenas que solo difieren en el,
  // asi no hace falta adivinarlo ni sacarlo del cuerpo de la fuente. Y se suma UNICAMENTE al caracter
  // que va inmediatamente despues: del siguiente en adelante, la medicion del prefijo ya lo incluye.
  var d3 = pm.value; d3.text = "nn"; pm.setValue(d3);
  var sinEsp = medidor.sourceRectAtTime(0, false).width;
  d3 = pm.value; d3.text = "n n"; pm.setValue(d3);
  var anchoEspacio = medidor.sourceRectAtTime(0, false).width - sinEsp;

  var donde = [0];
  for (i = 1; i <= cadena.length; i++) {
    donde[i] = (cadena.charAt(i - 1) === " ") ? donde[i - 1] + anchoEspacio : bordes[i];
  }
  var anchoTotal = donde[cadena.length];
  medidor.remove();

  var letras = [];
  for (i = 0; i < cadena.length; i++) {
    var ch = cadena.charAt(i);
    if (ch === " ") { continue; }
    var t = comp.layers.addText(ch);
    var p = t.property("ADBE Text Properties").property("ADBE Text Document");
    var d = p.value;
    d.fontSize = tam; d.fillColor = color; d.applyFill = true;
    d.justification = ParagraphJustification.LEFT_JUSTIFY;
    try { d.font = fuente; } catch (exF3) {}
    p.setValue(d);
    t.threeDLayer = true;
    t.motionBlur = true;
    t.name = "letra-" + i;
    tr(t).property("ADBE Position").setValue([x0 - anchoTotal / 2 + donde[i], base, z]);
    letras[letras.length] = t;
  }
  anotar("LETRAS|" + cadena + "|" + letras.length + " capas|ancho=" + anchoTotal.toFixed(1) + "|espacio=" + anchoEspacio.toFixed(1));
  return letras;
}

// ================================================================ EL ESPACIO
//   3200 fondo · 900.. nube · 520..140 heroe · 420..300 lista
//   70..20 tarjetas · 110/100 barras · -40 cursor · -100.. llamados · -500.. remate
var ZOOM = 2666.6666666;
var fondo = solido("fondo", FONDO, 6400, 3800, 3200);

// EL PARALAJE DEL FONDO — y no es decoracion, es lo que hace que un gesto grande no este solo.
//
// Cuando una imagen de pantalla completa se desplaza, cualquier cosa chica que la acompañe pesa el 4%
// de lo que pesa ella: la dominancia se va por encima de 0,85 y la escena se lee, con razon, como una
// sola cosa moviendose. La medicion lo decia sin ambiguedad — 58 de 133 cuadros asi — y el diagnostico
// era correcto, no un defecto de la metrica.
//
// El fondo es la unica capa que puede contestarle a una imagen grande, porque OCUPA TODO: se mueve
// tres o cuatro pixeles por cuadro, cosa que nadie percibe como movimiento del fondo, y con eso el
// cuadro entero deja de estar quieto detras del gesto. Es paralaje, que es lo que un fondo hace en
// cualquier pieza cara, y ademas cuesta una capa que ya existe. Con 1211 px de holgura proyectada,
// desplazamientos de 120 no descubren el borde.
var ejF = ejes(fondo);
var BASEFX = ANCHO / 2, BASEFY = ALTO / 2;

// ================================================================ PLANO 1 · el panel y sus datos
var heroe = plano(imagen(imgHeroe, "panel-heroe", 900, 330, 520, 88), 0, CORTE1);
var ejH = ejes(heroe);
// 0 · MACRO — el panel llega desde el fondo con su opacidad. 18 cuadros: es el limite alto del gesto
// estandar, y le corresponde por tamaño.
// TERMINA EN EL 16, no en el 18: su acuse del cuadro 24 necesita seis cuadros de quietud antes para
// leerse como una reaccion y no como la continuacion del mismo movimiento. Con 18 quedaban cinco.
claves(ejH.z, [[0, 520, "C1"], [16, 140, "C5"]]);
claves(tr(heroe).property("ADBE Opacity"), [[0, 0, "C1"], [13, 100, "C5"]]);

// el rotulo, revelado tras tapa (T03). La tapa va 20 unidades MAS CERCA que el texto: la profundidad
// la decide el eje de la camara, asi que mas cerca es arriba.
// UNA TAPA DE REVELADO TIENE QUE ESTAR DELANTE DE SU TEXTO Y DETRAS DE TODO LO DEMAS.
//
// Es la trampa mas cara del revelado por tapa, y no da ningun sintoma propio: la tapa aparece donde
// tiene que aparecer, el texto se revela como corresponde, y lo que se rompe es OTRA COSA. Aca el
// rotulo estaba en z=-200 —o sea adelante de todo— asi que su tapa tenia que estar mas adelante
// todavia, en -220: un rectangulo de 2600 x 400 del color del fondo, delante de las tres tarjetas, de
// sus cifras y del contador. Los tapaba a todos.
//
// Medido antes de mirar ningun pixel: las capas proyectaban donde correspondia, con opacidad 100 y
// area correcta, y el pixel donde tendria que estar "0,014 px" en blanco hueso daba 28 sobre 255. Las
// barras eran lo unico visible ahi abajo, y solo porque su resplandor se dibuja despues del compuesto.
//
// La salida es acomodar la profundidad, no achicar la tapa: el rotulo se va ATRAS de las tarjetas
// (z=200) y su tapa a 180, con lo cual todo lo que esta a z<180 le queda delante. Y ademas la tapa
// SALE DE ESCENA en cuanto termina el revelado: una tapa que sobrevive a su gesto es un rectangulo
// opaco esperando a tapar algo.
var rot1 = plano(rotulo("MEDIDO CONTRA AFTER EFFECTS", 60, HUESO, "Arial-Black", 900, 700, 200), 0, CORTE1);
var ejR1 = ejes(rot1);
var tapaR1 = plano(solido("tapa-rotulo", FONDO, 2200, 240, 180), 0, 32);
// LA TAPA ARRANCA DIEZ PIXELES DEBAJO DE LA LINEA DE BASE, no veinticuatro. Con veinticuatro, la
// tinta del texto escondido asomaba once pixeles por encima del borde de la tapa desde el cuadro 0
// — se ve en la tira. La cuenta va contra la TINTA, no contra el cuerpo de la fuente.
tr(tapaR1).property("ADBE Position").setValue([900, 700 + 10 + 120, 180]);
claves(ejR1.y, [[16, 700 + 70, "C1"], [28, 700, "C5"]]);

// 24 · una regla fina crece bajo el rotulo (F01) — y el panel ACUSA la llegada del rotulo
var reglaR1 = plano(barra("regla-rotulo", 520, 5, ACENTO, 640, 736, 160, "brillo 1.3 0.60 0.16"), 0, CORTE1);
claves(tr(reglaR1).property("ADBE Scale"), [[24, [0, 100, 100], "C1"], [34, [100, 100, 100], "C5"]]);

// 24 · el panel ACUSA la llegada del rotulo, dos cuadros despues de que termino de subir. Nunca a la
// vez: a la vez las dos cosas se leen como una sola.
acompana(ejH.y, 24, 12, 330, 12);

// ---------------------------------------------------------------- las tres tarjetas (E01)
// Desliz de 60 px desde la izquierda con desvanecido, escalonadas de a 8 cuadros. Cada tarjeta con su
// etiqueta 10 unidades adelante y su cifra 20: separadas de sobra para que el orden de dibujo no
// dependa de ningun desempate.
var CIFRAS = [["GEOMETR{I}A", "0,014 px", CIAN], ["TIPOGRAF{I}A", "0,94 %", VERDE], ["IMAGEN", "1:1 exacto", ACENTO]];
var tarjetas = [];
var ti;
for (ti = 2; ti >= 0; ti--) {
  var C = CIFRAS[ti];
  var xT = 420 + ti * 500;
  var zT = 70 - ti * 15;
  var tj = plano(solido("tarjeta-" + ti, PANEL, 420, 190, zT), 0, CORTE1);
  tr(tj).property("ADBE Position").setValue([xT, 940, zT]);
  var ejT = ejes(tj);
  var a = 40 + (2 - ti) * 8;
  claves(ejT.x, [[a, xT - 60, "C1"], [a + 14, xT, "C5"]]);
  claves(tr(tj).property("ADBE Opacity"), [[a, 0, "C1"], [a + 9, 100, "C5"]]);

  var et = plano(rotulo(C[0], 28, GRIS, "ArialMT", xT, 902, zT - 10), 0, CORTE1);
  var cf = plano(rotulo(C[1], 56, HUESO, "Arial-Black", xT, 988, zT - 20), 0, CORTE1);
  // EMPARENTADAS A SU TARJETA. Sin esto la tarjeta que se acerca al hacer clic ATRAVIESA su propia
  // etiqueta —lo caza M7: "TIPOGRAFIA y tarjeta-1 a 0,11 de profundidad" en el cuadro 139— y en ese
  // cruce el orden de dibujo lo decide un desempate que no tiene por que coincidir con el de AE.
  // Emparentadas mantienen su distancia: lo que esta delante sigue delante.
  et.parent = tj;
  cf.parent = tj;
  // LA ETIQUETA Y LA CIFRA APARECEN EN EL MISMO CUADRO QUE SU TARJETA, con duraciones distintas para
  // que tengan textura. Escalonarlas cuatro y seis cuadros parecia mas fino y hacia otra cosa: los
  // arranques de una tarjeta quedaban a cuatro cuadros de los de la siguiente, encadenaban, y las tres
  // tarjetas —que estan a ocho cuadros, o sea en el beat— se contaban como UN gesto. Tres tiempos que
  // el espectador oye por separado no pueden medirse como uno.
  claves(tr(et).property("ADBE Opacity"), [[a, 0, "C1"], [a + 10, 100, "C5"]]);
  claves(tr(cf).property("ADBE Opacity"), [[a, 0, "C1"], [a + 14, 100, "C5"]]);
  tarjetas[ti] = { capa: tj, ejes: ejT, et: et, cf: cf, x: xT, z: zT };
}

// 72 y 88 · dos barras que se llenan (F01). Las dos con resplandor declarado: el umbral se compara
// contra la luminancia en lineal, y el rojo y el cian no dan lo mismo — por eso llevan distinto.
var barA = plano(barra("barra-a", 760, 14, CIAN, 420, 800, 110, "brillo 1.1 0.55 0.30"), 0, CORTE1);
var barB = plano(barra("barra-b", 760, 14, ACENTO, 420, 836, 100, "brillo 1.4 0.70 0.16"), 0, CORTE1);
claves(tr(barA).property("ADBE Scale"), [[72, [0, 100, 100], "C1"], [84, [92, 100, 100], "C5"]]);
claves(tr(barB).property("ADBE Scale"), [[88, [0, 100, 100], "C1"], [100, [64, 100, 100], "C5"]]);

// 104 · la cifra entra de golpe (C7) y el panel lo acusa
var cifraP1 = plano(rotulo("47 de 47", 42, HUESO, "Arial-Black", 1500, 818, 90), 0, CORTE1);
claves(tr(cifraP1).property("ADBE Opacity"), [[104, 0, "C7"], [110, 100, "C5"]]);
acuse(ejH.y, 104, 330, -5);

// ---------------------------------------------------------------- los acompañamientos
// UN GESTO SOLO ES UNA COSA QUE SE MUEVE; DOS O TRES SON UNA COREOGRAFIA. La compuerta de dominancia
// mide exactamente eso: por encima de 0,85 hay una sola cosa moviendose y nada que la acompañe, que es
// como se ve una plantilla. Estos acuses no agregan arranques nuevos —caen en el mismo cuadro que el
// gesto al que acompañan, asi que se agrupan con el— y sin embargo cambian por completo como se lee.
acompana(ejH.y, 40, 14, 330, 15);
acompana(ejH.y, 48, 14, 330, -15);
acompana(ejH.y, 56, 14, 330, 15);
acompana(tarjetas[0].ejes.y, 72, 12, 940, -16);
acompana(tarjetas[1].ejes.y, 72, 12, 940, 10);
acompana(tarjetas[2].ejes.y, 72, 12, 940, 16);
acompana(tarjetas[1].ejes.y, 88, 12, 940, -16);
acompana(tarjetas[0].ejes.y, 88, 12, 940, 10);
acompana(ejR1.y, 88, 12, 700, 9);
acompana(tarjetas[2].ejes.y, 104, 12, 940, -16);
acompana(ejR1.y, 104, 12, 700, 8);

// 120 · MACRO — el panel se corre y achica para dejarle el cuadro a las tarjetas, y el cursor entra.
// U01: el cursor DESACELERA A CERO sobre la tarjeta. A velocidad constante se lee como un objeto que
// pasa, no como una intencion.
claves(ejH.x, [[120, 900, "C1"], [134, 540, "C5"]]);
claves(tr(heroe).property("ADBE Scale"), [[120, [88, 88, 88], "C1"], [134, [58, 58, 58], "C5"]]);
var cursor = plano(solido("cursor", HUESO, 26, 26, -40), 118, CORTE1);
tr(cursor).property("ADBE Rotate Z").setValue(45);
var ejCur = ejes(cursor);
claves(ejCur.x, [[120, 2260, "C1"], [130, 920, "C5"]]);
claves(ejCur.y, [[120, 620, "C1"], [130, 940, "C5"]]);

// 128 · el aro del clic: crece y se desvanece
// ANTES DE SU PRIMERA CLAVE, UNA PROPIEDAD VALE LO QUE DIGA ESA CLAVE. El aro arranca en escala 8 y
// opacidad 85, asi que sin punto de entrada se veia como un cuadradito blanco de 13 px en el medio del
// cuadro durante los primeros 128 cuadros. Es la misma familia que la LEY 7 de las formas: lo que no
// tiene que verse todavia se saca de escena, no se confia en que su animacion lo esconda.
var aro = plano(solido("aro-clic", HUESO, 160, 160, -60, "brillo 0.8 0.45 0.40"), 126, CORTE1);
tr(aro).property("ADBE Position").setValue([920, 940, -60]);
claves(tr(aro).property("ADBE Scale"), [[128, [8, 8, 100], "C1"], [140, [200, 200, 100], "C5"]]);
claves(tr(aro).property("ADBE Opacity"), [[128, 85, "C5"], [140, 0, "C5"]]);

// 136 · la tarjeta clickeada crece y se acerca; las otras dos colapsan.
// LA SALIDA DURA EL 60% DE LA ENTRADA: 8 cuadros contra 14.
acompana(tarjetas[1].ejes.y, 130, 10, 940, 10);
claves(tr(tarjetas[1].capa).property("ADBE Scale"), [[136, [100, 100, 100], "C1"], [150, [116, 116, 100], "C5"]]);
claves(tarjetas[1].ejes.z, [[136, 55, "C1"], [150, 30, "C5"]]);
var tk;
for (tk = 0; tk < 3; tk = tk + 2) {
  claves(tr(tarjetas[tk].capa).property("ADBE Scale"), [[136, [100, 100, 100], "C3"], [144, [0, 0, 100], "C5"]]);
  claves(tr(tarjetas[tk].et).property("ADBE Opacity"), [[136, 100, "C3"], [144, 0, "C5"]]);
  claves(tr(tarjetas[tk].cf).property("ADBE Opacity"), [[136, 100, "C3"], [144, 0, "C5"]]);
}

// ================================================================ PLANO 2 · la lista y los llamados
var lista = plano(imagen(imgLista, "pantalla-lista", 960, 560, 420, 150), CORTE1, CORTE2);
var ejL = ejes(lista);
// LO QUE ENTRA EN UN CORTE NO SE DESVANECE: YA ESTA AHI. Un plano nuevo cuyo contenido aparece
// gradualmente no se lee como un corte, se lee como una transicion floja — y ademas, medido, ese
// desvanecido era el gesto MAS GRANDE de toda la pieza: una capa de pantalla completa pasando de 0 a
// 100 en ocho cuadros pesa mas que cualquier movimiento. Con eso, el gesto que mandaba caia en el
// cuadro 144, que no esta en el beat. Sacarlo es a la vez mejor cine y mejor numero.
// 160 y 240 · dos tramos de scroll (U02). Curva C1 en los dos: un scroll lineal se lee como cinta
// transportadora y con Easy Ease se lee como plantilla.
// CON RECORRIDO DE VERDAD. Con 310 px en 20 cuadros el scroll quedaba por debajo del umbral de
// deteccion contra la propia entrada de la capa: medible, pero no un gesto. Un scroll que no se
// lee como gesto es exactamente el defecto que hace que una pieza se sienta plana.
claves(ejL.y, [[160, 520, "C1"], [176, 350, "C5"], [240, 350, "C1"], [256, -80, "C5"]]);

// los dos llamados (U04): punto, linea, etiqueta. La etiqueta arranca DESPUES de que la linea llego,
// nunca a la vez.
function llamado(nombre, x, y, z, arranque, largo, cadena) {
  var punto = plano(solido(nombre + "-punto", ACENTO, 18, 18, z, "brillo 1.2 0.35 0.18"), CORTE1, CORTE2);
  tr(punto).property("ADBE Position").setValue([x, y, z]);
  claves(tr(punto).property("ADBE Scale"), [[arranque, [0, 0, 100], "C1"], [arranque + 6, [100, 100, 100], "C5"]]);

  var linea = plano(barra(nombre + "-linea", largo, 3, ACENTO, x, y, z - 10), CORTE1, CORTE2);
  claves(tr(linea).property("ADBE Scale"), [[arranque + 8, [0, 100, 100], "C1"], [arranque + 16, [100, 100, 100], "C5"]]);

  var et = plano(rotulo(cadena, 32, HUESO, "ArialMT", x + largo + 130, y + 11, z - 20,
                        ParagraphJustification.LEFT_JUSTIFY), CORTE1, CORTE2);
  var ejE = ejes(et);
  claves(ejE.x, [[arranque + 24, x + largo + 60, "C1"], [arranque + 34, x + largo + 24, "C5"]]);
  claves(tr(et).property("ADBE Opacity"), [[arranque + 24, 0, "C1"], [arranque + 32, 100, "C5"]]);
  return { punto: punto, linea: linea, et: et, ejE: ejE, y: y };
}
// UN ROTULO SOBRE UNA CAPTURA NECESITA SU PLACA. Sin ella el texto cae encima de las filas de la
// lista y se lee como un choque, no como una sobreimpresion: es de las cosas que separan "hecho" de
// "terminado". La placa va detras del texto y delante de la lista, y entra con el.
var rotP2 = plano(rotulo("LO QUE VIAJA", 34, HUESO, "Arial-Black", 420, 300, -240,
                         ParagraphJustification.LEFT_JUSTIFY), CORTE1, CORTE2);
// LA PLACA SE MIDE CONTRA EL TEXTO, no se estima. sourceRectAtTime da la caja de tinta real, asi que
// el margen es un margen y no una apuesta: con un ancho fijo, cambiar una palabra deja el rotulo
// asomando o la placa enorme, y las dos cosas se ven.
var cajaP2 = rotP2.sourceRectAtTime(CORTE1 / FPS, false);
var MARGEN = 26;
var placaP2 = plano(solido("placa-rotulo", [0.20, 0.22, 0.28], Math.round(cajaP2.width + MARGEN * 2),
                           Math.round(cajaP2.height + MARGEN * 1.4), -230), CORTE1, CORTE2);
tr(placaP2).property("ADBE Position").setValue(
  [420 + cajaP2.left + cajaP2.width / 2, 300 + cajaP2.top + cajaP2.height / 2, -230]);
placaP2.parent = rotP2;
var ejRP2 = ejes(rotP2);
claves(ejRP2.x, [[152, 360, "C1"], [164, 420, "C5"]]);
claves(tr(rotP2).property("ADBE Opacity"), [[152, 0, "C1"], [162, 100, "C5"]]);
claves(tr(placaP2).property("ADBE Opacity"), [[152, 0, "C1"], [160, 100, "C5"]]);

var ll1 = llamado("llamado-1", 660, 400, -100, 176, 210, "una imagen viaja bit a bit");
var ll2 = llamado("llamado-2", 740, 700, -160, 216, 260, "una forma se rasteriza y viaja");

// 256 · una cifra entra de golpe; 264 · los dos llamados la acusan
var cifraP2 = plano(rotulo("0,03 de 255", 44, VERDE, "Arial-Black", 1380, 840, -220), CORTE1, CORTE2);
claves(tr(cifraP2).property("ADBE Opacity"), [[256, 0, "C7"], [262, 100, "C5"]]);
acuse(ll1.ejE.x, 264, 660 + 210 + 24, 12);
acuse(ll2.ejE.x, 264, 740 + 260 + 24, 12);
// y los acompañamientos del plano: cuando aparece cada pieza del llamado, la otra acusa
acuse(ll1.ejE.x, 216, 660 + 210 + 24, -8);
acuse(ll2.ejE.x, 200, 740 + 260 + 24, -8);

// 272 · una regla crece bajo la cifra. Tiene que ser un GESTO y no un acuse: un acuse es chico por
// definicion —acompaña, no manda— y por lo tanto no supera el umbral de deteccion de su propia capa.
// Para cerrar un hueco hace falta que pase algo, no que algo tiemble.
var reglaCifra = plano(barra("regla-cifra", 300, 5, VERDE, 1230, 880, -230, "brillo 1.2 0.55 0.24"), CORTE1, CORTE2);
claves(tr(reglaCifra).property("ADBE Scale"), [[272, [0, 100, 100], "C1"], [282, [100, 100, 100], "C5"]]);
acuse(ejRP2.x, 272, 420, 16);

// 280 · los llamados se van (C3, la curva de todo lo que se va)
claves(tr(ll1.et).property("ADBE Opacity"), [[280, 100, "C3"], [288, 0, "C5"]]);
claves(tr(ll2.et).property("ADBE Opacity"), [[280, 100, "C3"], [288, 0, "C5"]]);
claves(tr(ll1.linea).property("ADBE Scale"), [[280, [100, 100, 100], "C3"], [288, [0, 100, 100], "C5"]]);
claves(tr(ll2.linea).property("ADBE Scale"), [[280, [100, 100, 100], "C3"], [288, [0, 100, 100], "C5"]]);

// LOS ACOMPAÑAMIENTOS DEL PLANO 2. Sin esto, catorce de los gestos de la pieza son una sola capa
// moviendose sola: la dominancia se va por encima de 0,85 y se lee como plantilla, que es exactamente
// lo que mide M3. Van en el MISMO cuadro que el gesto al que acompañan para no inventar arranques.
acompana(ejRP2.x, 160, 16, 420, -26);
acompana(ejL.y, 176, 14, 350, 15);
acompana(ejRP2.x, 184, 16, 420, 22);
acompana(ejL.y, 200, 16, 350, -15);
acompana(ejRP2.x, 216, 14, 420, -22);
acompana(ejL.y, 224, 16, 350, 15);
acompana(ejRP2.x, 256, 16, 420, 26);

// ================================================================ PLANO 3 · la nube y el remate
// 288 · ocho paneles llegan desde el fondo, escalonados de a 3 cuadros. Un escalonado es UN gesto con
// textura adentro, no ocho gestos — la metrica agrupa lo que cae a menos de 6 cuadros.
var nube = [];
var ni;
for (ni = 0; ni < 8; ni++) {
  var ang = ni * Math.PI * 2 / 8 + 0.39;
  // EL RADIO VERTICAL DEJA LIBRE LA FRANJA DEL REMATE. Con 340, los cuatro paneles mas cercanos a la
  // horizontal caian justo donde despues aparece la tapa del remate, y hacian su retroceso debajo de
  // ella. Con 620, el mas cercano queda a 783 y la tapa llega hasta 742.
  var rx = 960 + Math.cos(ang) * 700;
  // y ninguno se acerca a la franja central: los que caen cerca de la horizontal se empujan afuera. Un
  // anillo perfecto es mas prolijo de escribir y deja dos paneles justo detras del remate.
  var sn = Math.sin(ang);
  var sep = Math.abs(sn) < 0.62 ? (sn < 0 ? -0.62 : 0.62) : sn;
  var ry = 540 + sep * 620;
  var zB = 900 + ni * 9;
  var pn = plano(solido("nube-" + ni, PANEL, 300, 190, zB), CORTE2, CUADROS);
  tr(pn).property("ADBE Position").setValue([rx, ry, zB]);
  var ejN = ejes(pn);
  var aN = 288 + ni * 3;
  claves(ejN.z, [[aN, zB + 700, "C1"], [aN + 14, zB, "C5"]]);
  claves(tr(pn).property("ADBE Opacity"), [[aN, 0, "C1"], [aN + 10, 100, "C5"]]);
  nube[ni] = { capa: pn, ejes: ejN, y: ry, z: zB };
}
// 304 · la nube acusa en cascada desde el centro
var nk;
for (nk = 0; nk < 8; nk++) { acuse(nube[nk].ejes.y, 304 + (nk % 4) * 2, nube[nk].y, (nk < 4 ? -10 : 10)); }
// 320 · uno de los paneles se adelanta, y en 336 vuelve mientras se adelanta otro
// EN 328 Y 344, no en 320 y 336: la cascada de acuses del 304 sigue viva hasta el 319, y un gesto
// que arranca sin quietud previa no se lee como un gesto nuevo — se lee como que lo anterior no
// termino. Es la misma regla que el silencio antes del golpe.
claves(nube[2].ejes.z, [[328, nube[2].z, "C1"], [340, 380, "C3"], [350, nube[2].z, "C5"]]);
claves(tr(nube[2].capa).property("ADBE Scale"), [[328, [100, 100, 100], "C1"], [340, [152, 152, 100], "C3"], [350, [100, 100, 100], "C5"]]);
claves(nube[6].ejes.z, [[344, nube[6].z, "C1"], [356, 380, "C3"], [366, nube[6].z, "C5"]]);
claves(tr(nube[6].capa).property("ADBE Scale"), [[344, [100, 100, 100], "C1"], [356, [152, 152, 100], "C3"], [366, [100, 100, 100], "C5"]]);

// y los del plano 3: cuando un panel se adelanta, sus dos vecinos ceden
acompana(nube[1].ejes.y, 328, 20, nube[1].y, -22);
acompana(nube[3].ejes.y, 328, 20, nube[3].y, 22);
acompana(nube[5].ejes.y, 344, 20, nube[5].y, -22);
acompana(nube[7].ejes.y, 344, 20, nube[7].y, 22);
var na;
for (na = 0; na < 8; na = na + 2) { acompana(nube[na].ejes.y, 352, 12, nube[na].y, na < 4 ? -18 : 18); }

// 352 · la regla de acento destella arriba del remate
var acento = plano(barra("acento", 600, 10, ACENTO, 660, 392, -500, "brillo 1.6 0.80 0.14"), CORTE2, CUADROS);
claves(tr(acento).property("ADBE Scale"), [[352, [0, 100, 100], "C1"], [362, [100, 100, 100], "C5"]]);

// 360 · MACRO — la nube se va al fondo para dejarle el cuadro al remate, y el remate sube letra por
// letra tras su tapa (T02). Multiplo de 8 Y de 15 a la vez: donde coinciden las dos grillas es donde
// tiene que caer un gesto que manda.
for (nk = 0; nk < 8; nk++) {
  claves(nube[nk].ejes.z, [[360, nube[nk].z, "C2"], [380, nube[nk].z + 620, "C5"]]);
}
var letras = porCaracter("MISMO CUADRO", 128, HUESO, "Arial-Black", 960, 560, -520);
// tinta del remate: linea de base 560 y altura de mayuscula ~95, o sea 465..560. La tapa arranca en
// 572 y las letras se esconden 130 mas abajo (tinta 595..690), bien adentro de la tapa.
// angosta y con fecha de vencimiento: 2600 de ancho hasta el final del video le comia una franja
// entera a la nube de paneles, que vive detras
// LA TAPA VIVE LO QUE DURA EL REVELADO, Y LAS LETRAS TAMBIEN.
// Antes la tapa existia desde el corte para esconder unas letras que ya estaban en escena esperando su
// turno — y durante esos setenta cuadros la nube de paneles hacia su llegada, su cascada y su adelanto
// DEBAJO de un rectangulo opaco. Cuatro capas gastando cuarenta cuadros de movimiento cada una que
// nadie podia ver. La salida es no tener nada que esconder: las letras entran cuando les toca.
var tapaL = plano(solido("tapa-remate", FONDO, 1400, 170, -540), 356, 394);
// alto 170 y no 320: la tinta escondida ocupa 595..690, o sea 95 unidades. Una tapa mas alta que su
// trabajo es un rectangulo opaco de mas, y lo de mas cae sobre la nube que vive detras.
tr(tapaL).property("ADBE Position").setValue([960, 572 + 85, -540]);
var li;
for (li = 0; li < letras.length; li++) {
  plano(letras[li], 356, CUADROS);
  var ejLetra = ejes(letras[li]);
  var arr = 360 + li * 2;
  claves(ejLetra.y, [[arr, 560 + 130, "C1"], [arr + 12, 560, "C5"]]);
}

// 392 · una segunda regla, mas corta y de otro color: acento, no cascada
var acento2 = plano(barra("acento-2", 380, 6, CIAN, 660, 350, -560, "brillo 1.0 0.50 0.34"), CORTE2, CUADROS);
claves(tr(acento2).property("ADBE Scale"), [[392, [0, 100, 100], "C1"], [402, [100, 100, 100], "C5"]]);

// acompañamientos del remate: cuando entra la segunda regla y cuando entra la bajada, las letras ceden
var lq;
for (lq = 1; lq < 11; lq = lq + 3) { acompana(ejes(letras[lq]).y, 392, 12, 560, -11); }
for (lq = 0; lq < 11; lq = lq + 3) { acompana(ejes(letras[lq]).y, 400, 14, 560, -9); }
acompana(tr(acento).property("ADBE Rotate Z"), 400, 14, 0, 0.9);
acompana(tr(acento2).property("ADBE Rotate Z"), 400, 14, 0, -0.9);

// 400 · la bajada, revelado por tapa entero (T03), un beat despues del remate
var rot2 = plano(rotulo("no parecido: medido", 46, GRIS, "ArialMT", 960, 900, -580), 396, CUADROS);
var ejR2 = ejes(rot2);
var tapaR2 = plano(solido("tapa-bajada", FONDO, 1400, 140, -600), 396, 418);
tr(tapaR2).property("ADBE Position").setValue([960, 908 + 70, -600]);
claves(ejR2.y, [[400, 900 + 60, "C1"], [412, 900, "C5"]]);

// 416 · el ultimo acuse, y despues resolucion: 34 cuadros de quietud, que es lo que hace que lo
// anterior se lea como que termino y no como que se corto
acuse(ejR2.y, 416, 900, -4);
acuse(tr(acento).property("ADBE Rotate Z"), 416, 0, -0.7);
var lz;
for (lz = 0; lz < letras.length; lz = lz + 2) { acuse(ejes(letras[lz]).y, 416, 560, -9); }

// ================================================================ LA CAMARA
// Un solo nodo: sin auto-orientacion mira por su +Z y las rotaciones mandan. Tres planos con CORTE
// (clave HOLD), deriva lenta entre cortes, un contragolpe. Y BALANCEO, que hasta hoy no viajaba: la
// capa de camara no tiene `threeDLayer` y el exportador la trataba como 2D, asi que sus rotaciones
// nunca se volcaban — una inclinacion de horizonte se reproducia perfectamente horizontal.
var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
camara.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
var trC = tr(camara);
trC.property("ADBE Position").dimensionsSeparated = true;
var cx = trC.property("ADBE Position_0"), cy = trC.property("ADBE Position_1"), cz = trC.property("ADBE Position_2");

claves(cx, [[0, 900, "C5"], [143, 918, "HOLD"], [144, 1000, "C5"], [287, 978, "HOLD"], [288, 946, "C5"], [449, 966, "C5"]]);
// LA BANDA VISIBLE SE CALCULA, NO SE SUPONE: a z=44 con zoom 2666 y la camara a -2320, el alto
// visible es 540*(2320+44)/2666 = 479 unidades a cada lado de donde mira la camara. Con la camara
// mirando a 700, todo lo que estuviera debajo de 1179 quedaba afuera del cuadro. Ahi tenia las tres
// tarjetas, el cursor, el aro y las dos cifras: 144 cuadros cada una, o sea el plano entero,
// invisibles. La compuerta de ritmo no puede ver esto —mide movimiento, no encuadre— y la tira de
// contacto tampoco lo grita: simplemente no estan.
claves(cy, [[0, 560, "C5"], [143, 548, "HOLD"], [144, 520, "C5"], [287, 534, "HOLD"], [288, 610, "C5"], [449, 600, "C5"]]);
claves(cz, [[0, -2320, "C5"], [143, -2356, "HOLD"],
            [144, -2160, "C7"], [152, -2172, "C8"], [163, -2160, "C5"], [287, -2196, "HOLD"],
            [288, -2440, "C5"], [449, -2476, "C5"]]);
claves(trC.property("ADBE Rotate Z"), [[0, 0, "HOLD"], [143, 0, "HOLD"], [144, -2.2, "C5"],
                                       [287, -1.7, "HOLD"], [288, 1.1, "C5"], [449, 0.3, "C5"]]);

// los paralajes, uno por gesto grande. Van al final para que `acompana` ya exista.
acompana(ejF.y, 0, 16, BASEFY, 120);
acompana(ejF.x, 120, 14, BASEFX, -110);
acompana(ejF.x, 160, 16, BASEFX, 120);
acompana(ejF.y, 176, 14, BASEFY, -90);
acompana(ejF.x, 200, 16, BASEFX, -100);
acompana(ejF.y, 224, 16, BASEFY, 90);
acompana(ejF.x, 240, 16, BASEFX, 130);
acompana(ejF.y, 288, 20, BASEFY, -120);
acompana(ejF.x, 328, 20, BASEFX, 100);
acompana(ejF.y, 344, 20, BASEFY, 100);
acompana(ejF.x, 360, 20, BASEFX, -120);
acompana(ejF.y, 400, 14, BASEFY, 80);

fondo.moveToEnd();

anotar("PIEZA-C|" + comp.numLayers + " capas|" + DUR + " s|" + CUADROS + " cuadros");
anotar("OBTURADOR|" + comp.shutterAngle + "|" + comp.shutterPhase + "|" + comp.motionBlurSamplesPerFrame);

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
