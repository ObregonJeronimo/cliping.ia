// PIEZA-G — el estilo de la referencia: cinematica oscura con luz de borde, liderada por la CAMARA.
//
// ================================================================ LO QUE ESTA PIEZA ROMPE A PROPOSITO
//
// La compuerta M5 dice que la camara no puede aportar mas del 20% de la energia, y nacio de un
// diagnostico correcto: la PIEZA-B se sentia muerta porque yo habia animado la camara y nada mas.
//
// Pero el video de referencia esta MEDIDO y es exactamente eso: **un solo plano de 60 segundos, sin un
// corte duro, con la camara volando entre paneles**. Movimiento medio 14,1, pico 71,1. Si lo pasara por
// mi metrica, reprobaria M5.
//
// La diferencia no esta en el ritmo: esta en QUE HAY PARA MIRAR mientras la camara pasa. En la PIEZA-B
// la camara paseaba sobre rectangulos grises. Aca pasa sobre una interfaz real a escala enorme, con
// luz de borde, contornos encendidos y manchas de luz — cosas que valen la pena mirar quietas.
//
// Asi que esta pieza **falla M5 a proposito y lo declara**. Una compuerta que se rompe sin decirlo es
// una compuerta rota; una que se rompe con el motivo escrito es una decision.
//
// ================================================================ FICHA DE ARTE
// FAMILIA      cinematica oscura con luz de borde (la de la referencia)
// PALETA       fondo NEGRO PURO #000. chapa #141821 -> #0a0d14.
//              luz azul #4a9eff · violeta #a06bff · cian #3fd8ff — la luz ES el color de la pieza
//              tinta #e8ecf5 · suave #9aa4bb
// LUZ          cada panel EMITE por su canto: franja encendida + halo, horneados en el recurso. Y tres
//              manchas grandes de luz muy suave detras, que es lo que separa el negro puro de un negro
//              con aire adentro.
// FORMA        chasis con radio 26-30 y trazo de 3 px en degradado; pildoras con contorno encendido
// TIPOGRAFIA   CenturyGothic 96 para el titular, SegoeUI-Light 40 para la bajada, SegoeUI 28 etiqueta.
//              TITULAR DE DOS COLORES: la palabra que importa va en la luz, el resto en tinta. Es lo
//              que hace la referencia y cuesta una capa de texto mas.
// PROFUNDIDAD  cuatro planos reales, con los paneles MUY girados (30-45 grados en Y): el escorzo fuerte
//              es la mitad del estilo. Nada de frente.
// SIMBOLO      la pildora encendida: aparece, invita, y al final es lo unico que queda.
// CAMARA       un solo movimiento continuo con dos acentos. LIDERA, y esta declarado.
//
// USO
//   node tools/ae/recursos-gemini.mjs
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-g.jsx
//   node tools/ae/escena-check.mjs && node tools/ae/ritmo.mjs

var RUTA = "C:/ae-probe/pieza-g.txt";
var RECURSOS = "C:/ae-probe/recursos-g";

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

app.beginUndoGroup("PIEZA-G");

var NOMBRE = "PIEZA-G";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 600;
var DUR = CUADROS / FPS;

var TINTA = [0.910, 0.925, 0.961];
var SUAVE = [0.604, 0.643, 0.733];
var AZUL = [0.290, 0.620, 1.000];
var VIOLETA = [0.627, 0.420, 1.000];
var CIAN = [0.247, 0.847, 1.000];

var F_DISPLAY = "CenturyGothic";
var F_LECTURA = "SegoeUI-Light";
var F_ETIQUETA = "SegoeUI";

var CURVAS = {
  C1: [20, 85], C2: [10, 92], C3: [90, 15], C4: [85, 85],
  C6: [70, 70], C7: [0.1, 80], C8: [70, 20]
};

function tr(c) { return c.property("ADBE Transform Group"); }
function aplicarCurva(prop, k, k2, c) {
  var n = prop.keyOutTemporalEase(k).length;
  var sal = [], ent = [], q;
  for (q = 0; q < n; q++) { sal[q] = new KeyframeEase(0, c[0]); ent[q] = new KeyframeEase(0, c[1]); }
  prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.BEZIER);
  prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, prop.keyOutInterpolationType(k2));
  prop.setTemporalEaseAtKey(k, prop.keyInTemporalEase(k), sal);
  prop.setTemporalEaseAtKey(k2, ent, prop.keyOutTemporalEase(k2));
}
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
function ejes(capa) {
  tr(capa).property("ADBE Position").dimensionsSeparated = true;
  var e = { x: tr(capa).property("ADBE Position_0"), y: tr(capa).property("ADBE Position_1"), z: null };
  try { e.z = tr(capa).property("ADBE Position_2"); } catch (exZ) { e.z = null; }
  return e;
}
function acompana(prop, cuadro, dur, base, delta) {
  claves(prop, [[cuadro, base, "C1"], [cuadro + Math.round(dur * 0.45), base + delta, "C1"], [cuadro + dur, base, "C5"]]);
}

var MANIFIESTO = [];
function parametro(capa, prop, ruta, nombrePublico, tipo) {
  if (prop === null || prop === undefined) { return false; }
  var ok = false;
  try {
    if (typeof prop.addToMotionGraphicsTemplateAs === "function") {
      ok = prop.addToMotionGraphicsTemplateAs(comp, nombrePublico) ? true : false;
    }
  } catch (exPar) { ok = false; }
  if (!ok) { return false; }
  var idc = 0;
  try { idc = capa.id; } catch (exIdc) { idc = 0; }
  MANIFIESTO[MANIFIESTO.length] = "PARAM|" + idc + "|" + ruta + "|" + nombrePublico + "|" + tipo;
  return true;
}
function fuenteDe(capa) { return capa.property("ADBE Text Properties").property("ADBE Text Document"); }

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
comp.bgColor = [0, 0, 0];
comp.openInViewer();

var cache = {};
function recurso(archivo) {
  if (cache[archivo]) { return cache[archivo]; }
  var f = new File(RECURSOS + "/" + archivo + ".png");
  if (!f.exists) { throw new Error("falta el recurso " + archivo); }
  cache[archivo] = app.project.importFile(new ImportOptions(f));
  return cache[archivo];
}
function plano(capa, desde, hasta) { capa.inPoint = desde / FPS; capa.outPoint = hasta / FPS; return capa; }
// EL FONDO ES UN SOLIDO REAL. Es la LEY 4 de este repo y la violé yo: puse `comp.bgColor` en negro y di
// por hecho que alcanzaba. No alcanza — el fondo de una composicion NO EXISTE hasta la codificacion.
// El revisor independiente lo midio sobre el canal alfa: entre 9,5% y 18,8% de cada cuadro en alfa
// cero. Lo que yo lei como "fondo blanco" era el visor componiendo sobre blanco.
function solidoNegro() {
  var s = comp.layers.addSolid([0, 0, 0], "fondo-negro", 9000, 5200, 1);
  s.threeDLayer = true;
  s.motionBlur = false;
  tr(s).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, 3400]);
  return s;
}
function img(archivo, nombre, x, y, z, escala) {
  var c = comp.layers.add(recurso(archivo));
  c.name = nombre;
  c.threeDLayer = true;
  c.motionBlur = true;
  tr(c).property("ADBE Position").setValue([x, y, z]);
  if (escala !== undefined) { tr(c).property("ADBE Scale").setValue([escala, escala, escala]); }
  return c;
}
// LOS TITULARES SON CAPAS 2D, Y NO ES UN ATAJO.
//
// Puestos en 3D cerca de la camara —que ademas viaja y esta descentrada— caian todos fuera del cuadro:
// a z=-700 con la camara a -1750 la magnificacion es 2,5, asi que 210 px de mundo se proyectan a -1284
// de pantalla. La compuerta de escena lo dijo antes de renderizar: "152 cuadros, 0% visible, fuera de
// cuadro".
//
// Pero la correccion no es recalcular la posicion: es que un titular NO PERTENECE AL ESPACIO. En AE una
// capa 2D dentro de una composicion con camara la IGNORA y se queda pegada al cuadro, que es
// exactamente lo que hace un rotulo sobreimpreso — y es como esta hecho en la referencia. Con esto sus
// coordenadas SON coordenadas de pantalla y no hay nada que convertir.
function rotulo(cadena, tam, color, fuente, x, y, z, just, enEspacio) {
  var t = comp.layers.addText(ac(cadena));
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = tam; d.fillColor = color; d.applyFill = true;
  d.justification = just || ParagraphJustification.LEFT_JUSTIFY;
  try { d.font = fuente; } catch (exF) {}
  p.setValue(d);
  t.threeDLayer = enEspacio ? true : false;
  t.motionBlur = true;
  if (enEspacio) { tr(t).property("ADBE Position").setValue([x, y, z]); }
  else { tr(t).property("ADBE Position").setValue([x, y]); }
  return t;
}

// UN TITULAR DE DOS COLORES, medido y no estimado.
//
// La referencia escribe "Ask Gemini to leave feedback" con una palabra en la luz y el resto en tinta.
// Dos capas de texto puestas una al lado de la otra necesitan saber DONDE termina la primera, y eso se
// mide con sourceRectAtTime: el ancho de tinta de la primera mas el ancho del espacio. Estimarlo deja
// un hueco o un pisado, y las dos cosas se ven.
function titularDoble(uno, dos, tam, x, base, z, colorDos) {
  var a = rotulo(uno, tam, TINTA, F_DISPLAY, x, base, z);
  var caja = a.sourceRectAtTime(0, false);
  // el ancho del espacio se mide aparte porque un espacio no tiene tinta
  var medidor = comp.layers.addText("nn");
  var pm = medidor.property("ADBE Text Properties").property("ADBE Text Document");
  var dm = pm.value; dm.fontSize = tam; try { dm.font = F_DISPLAY; } catch (e1) {} pm.setValue(dm);
  var sinEsp = medidor.sourceRectAtTime(0, false).width;
  dm = pm.value; dm.text = "n n"; pm.setValue(dm);
  var anchoEsp = medidor.sourceRectAtTime(0, false).width - sinEsp;
  medidor.remove();
  var b = rotulo(dos, tam, colorDos, F_DISPLAY, x + caja.left + caja.width + anchoEsp, base, z - 2);
  anotar("TITULAR|" + uno + " / " + dos + "|ancho1=" + caja.width.toFixed(1) + "|espacio=" + anchoEsp.toFixed(1));
  return { uno: a, dos: b };
}

// ================================================================ EL ESPACIO
// Cuatro planos reales. Los paneles van MUY girados: el escorzo fuerte es la mitad del estilo, y de
// frente esto se ve como una presentacion.
//
//   2600  manchas de luz    1400 panel chat    600 panel codigo    -200 pildora    -700 titulares

var fondoNegro = solidoNegro();

// las tres manchas: sin blending, un radial con alfa sobre negro ya suma bien
var manchaA = img("mancha-azul", "mancha-azul", 520, 400, 2600, 120);
var manchaB = img("mancha-violeta", "mancha-violeta", 1520, 760, 2400, 110);
var manchaC = img("mancha-cian", "mancha-cian", 1100, 200, 2800, 100);
var ejMA = ejes(manchaA), ejMB = ejes(manchaB);

// ---------------------------------------------------------------- el panel de codigo
// El chasis y la pantalla son DOS capas: la pantalla es el contenido reemplazable de la plantilla, y
// el chasis es el objeto. Emparentada, la pantalla hereda el giro y el viaje sin repetir una clave.
var chasis1 = img("panel-codigo", "chasis-codigo", 980, 470, 600, 62);
tr(chasis1).property("ADBE Rotate Y").setValue(-34);
tr(chasis1).property("ADBE Rotate Z").setValue(-3);
var ejC1 = ejes(chasis1);
// LA PANTALLA YA VIENE COMPUESTA ADENTRO DEL CHASIS.
//
// Estaban como dos capas emparentadas, y dio dos defectos seguidos: AE preserva la transformacion de
// mundo al asignar un padre (la pantalla se quedo plana mientras el chasis giraba 34 grados, formando
// una X), y despues, corregido eso, la posicion del hijo no cayo donde la cuenta decia — medida, la
// pantalla proyectaba 1550 px donde la placa media 1358. Compuesta adentro del PNG no hay padre, no
// hay origen que interpretar, y no hay dos capas que se puedan desalinear.
//
// (bloque de emparentado eliminado)
//
// AE PRESERVA la transformacion de mundo al asignar un padre: le recalcula los valores al hijo para
// que no se mueva. Con eso, la pantalla se quedaba PLANA en 0 grados mientras el chasis estaba girado
// 34 — y las dos se cruzaban formando una X en el cuadro. Es lo que se ve en el video.
//
// Puesto el padre primero, la posicion y la rotacion del hijo ya se interpretan en el espacio del
// PADRE: [0,0,-2] es "el centro del chasis, dos unidades hacia la camara", y rotacion 0 es "la misma
// que el chasis". La escala 100 significa "la del padre", no "el tamaño original".

// ---------------------------------------------------------------- el panel de chat, mas atras
var chasis2 = img("panel-chat", "chasis-chat", 320, 620, 1400, 70);
tr(chasis2).property("ADBE Rotate Y").setValue(28);
tr(chasis2).property("ADBE Rotate Z").setValue(2);
var ejC2 = ejes(chasis2);

// ---------------------------------------------------------------- un tercer panel, chico y lejos
var chasis3 = img("panel-chico", "chasis-chico", 1620, 260, 1900, 64);
tr(chasis3).property("ADBE Rotate Y").setValue(-40);
var ejC3 = ejes(chasis3);

// ================================================================ LA COREOGRAFIA
// La camara lidera, pero NO esta sola: los paneles derivan en profundidad a distinto ritmo (paralaje
// real, no simulado) y cada momento tiene su gesto propio.

// 0 · los paneles ya estan: el plano abre EN el espacio, no lo arma. Es lo que hace la referencia.
// La deriva de cada panel es distinta: eso es lo que da la sensacion de volumen cuando la camara viaja.
claves(ejC1.z, [[0, 640, "C5"], [CUADROS - 1, 380, "C5"]]);
claves(ejC2.z, [[0, 1460, "C5"], [CUADROS - 1, 1180, "C5"]]);
claves(ejC3.z, [[0, 1960, "C5"], [CUADROS - 1, 1700, "C5"]]);
claves(ejMA.x, [[0, 460, "C5"], [CUADROS - 1, 700, "C5"]]);
claves(ejMB.y, [[0, 800, "C5"], [CUADROS - 1, 600, "C5"]]);

// 32 · el primer titular, dos colores, palabra por palabra
var t1 = titularDoble("Medido,", "no parecido", 96, 210, 880, -700, AZUL);
var ejT1a = ejes(t1.uno), ejT1b = ejes(t1.dos);
plano(t1.uno, 32, 240); plano(t1.dos, 40, 240);
claves(tr(t1.uno).property("ADBE Opacity"), [[32, 0, "C1"], [46, 100, "C1"], [228, 100, "C3"], [240, 0, "C5"]]);
claves(tr(t1.dos).property("ADBE Opacity"), [[40, 0, "C1"], [54, 100, "C1"], [228, 100, "C3"], [240, 0, "C5"]]);
claves(ejT1a.y, [[32, 880 + 34, "C1"], [46, 880, "C5"]]);
claves(ejT1b.y, [[40, 880 + 34, "C1"], [54, 880, "C5"]]);

// 96 · la pildora encendida entra: es el simbolo de la pieza
// la pildora SI pertenece al espacio (es parte de la interfaz), asi que su posicion se calcula: a
// z=-200 con la camara a -1750 la magnificacion es 1,72, y pantalla (1360,760) es mundo (1413,508)
// mas adentro: en el cuadro 224 salia cortada por el borde derecho
// mas adentro todavia: el revisor la midio cortada A FILO en f160 y f224, y entrando 8 px en f288
var pildora = plano(img("pildora-pedir", "pildora", 1180, 540, -200, 0), 96, CUADROS);
var ejP = ejes(pildora);
// escalas a la mitad: el recurso pasa a ser el doble de grande para no estirarse
claves(tr(pildora).property("ADBE Scale"), [[96, [36, 36, 100], "C1"], [112, [48, 48, 100], "C8"], [122, [45, 45, 100], "C5"]]);
claves(tr(pildora).property("ADBE Opacity"), [[96, 0, "C1"], [110, 100, "C5"]]);
acompana(ejC1.x, 96, 20, 980, -46);

// 160 · el panel de codigo acusa y se acerca un poco mas: el gesto del plano
acompana(ejC1.y, 160, 22, 470, -34);
acompana(ejP.y, 160, 22, 540, 22);

// 224 · el segundo titular, arriba a la derecha
var t2 = titularDoble("Autorado en", "After Effects", 74, 940, 250, -720, VIOLETA);
plano(t2.uno, 224, 430); plano(t2.dos, 232, 430);
var ejT2a = ejes(t2.uno), ejT2b = ejes(t2.dos);
claves(tr(t2.uno).property("ADBE Opacity"), [[224, 0, "C1"], [238, 100, "C1"], [418, 100, "C3"], [430, 0, "C5"]]);
claves(tr(t2.dos).property("ADBE Opacity"), [[232, 0, "C1"], [246, 100, "C1"], [418, 100, "C3"], [430, 0, "C5"]]);
claves(ejT2a.y, [[224, 250 + 28, "C1"], [238, 250, "C5"]]);
claves(ejT2b.y, [[232, 250 + 28, "C1"], [246, 250, "C5"]]);

// 288 · el panel de chat se adelanta y toma el cuadro
claves(ejC2.x, [[288, 320, "C1"], [316, 700, "C5"]]);
acompana(ejC3.y, 288, 24, 260, 40);

// 320 · la pildora de sugerencia se enciende: cierra el hueco de 67 cuadros
var pildora2 = plano(img("pildora-medir", "pildora-medir", 1180, 300, -160, 0), 320, 470);
claves(tr(pildora2).property("ADBE Scale"), [[320, [20, 20, 100], "C1"], [336, [28, 28, 100], "C8"], [346, [26, 26, 100], "C5"]]);
claves(tr(pildora2).property("ADBE Opacity"), [[320, 0, "C1"], [334, 100, "C1"], [458, 100, "C3"], [470, 0, "C5"]]);
acompana(ejC1.y, 320, 22, 470, -18);

// 352 · una etiqueta sobre el panel de chat
// SUBE Y APARECE, no se desliza de costado. Un rotulo que viaja lateralmente mientras todo lo demas
// flota en profundidad se lee como que se equivoco de pieza.
// 44 px y no 28: medida en pantalla daba 2,5% del alto de cuadro, por debajo del piso de apoyo
// (3%). Un texto que no llega al piso no es discreto, es ilegible — y el catalogo lo dice sin
// termino medio: o es decorativo declarado, o se lee.
var eti = plano(rotulo("el motor lo dibuja en el navegador", 44, SUAVE, F_ETIQUETA, 620, 980, -680), 352, 520);
var ejEti = ejes(eti);
claves(tr(eti).property("ADBE Opacity"), [[352, 0, "C1"], [366, 100, "C1"], [508, 100, "C3"], [520, 0, "C5"]]);
claves(ejEti.y, [[352, 980 + 22, "C1"], [366, 980, "C5"]]);

// 416 · la pildora pulsa: el simbolo vuelve
claves(tr(pildora).property("ADBE Scale"), [[416, [45, 45, 100], "C7"], [424, [52, 52, 100], "C8"], [440, [45, 45, 100], "C5"]]);
acompana(ejC1.y, 416, 24, 470, 26);

// 480 · el remate, dos colores y grande
var t3 = titularDoble("Sin After Effects", "en el render", 88, 260, 620, -740, CIAN);
plano(t3.uno, 480, CUADROS); plano(t3.dos, 488, CUADROS);
var ejT3a = ejes(t3.uno), ejT3b = ejes(t3.dos);
claves(tr(t3.uno).property("ADBE Opacity"), [[480, 0, "C1"], [496, 100, "C5"]]);
claves(tr(t3.dos).property("ADBE Opacity"), [[488, 0, "C1"], [504, 100, "C5"]]);
claves(ejT3a.y, [[480, 620 + 40, "C1"], [496, 620, "C5"]]);
claves(ejT3b.y, [[488, 620 + 40, "C1"], [504, 620, "C5"]]);
acompana(ejP.x, 480, 26, 1180, -40);

// 544 · el ultimo acento: la pildora se agranda y queda sola con el remate
claves(ejC1.x, [[544, 980 - 46, "C1"], [576, 400, "C5"]]);
claves(ejC2.x, [[544, 700, "C1"], [576, -300, "C5"]]);
acompana(ejP.y, 544, 26, 540, -30);

// ================================================================ LAS SUGERENCIAS
// Seis pastillas chicas que entran escalonadas y despues pulsan. Es lo que hace la referencia en el
// panel de chat, y es lo que le faltaba a esta pieza: sucesos. Con once gestos en veinte segundos
// habia huecos de mas de cuatro segundos sin que arrancara nada.
// el revisor encontro el mismo copy dos veces por cuadro: estas seis repetian las tres que ya vienen
// dibujadas adentro de la captura del chat. Ahora dicen otra cosa.
var CHIPS = ["geometria 0,014 px", "tipografia 0,94 %", "imagen 1:1", "forma 0,10", "camara 0,03", "47 de 47"];
var chips = [];
var ci;
for (ci = 0; ci < 6; ci++) {
  var cz = 0;
  // LA POSICION DE MUNDO SE CALCULA DESDE LA DE PANTALLA, no se escribe a ojo. A z=-120 con la camara
  // a -1750 la magnificacion es 1,64: una pastilla puesta en x=300 de mundo se proyecta a -263 de
  // pantalla, o sea afuera. Es el mismo error que ya me comio los titulares, y la compuerta de escena
  // lo volvio a cazar antes de renderizar.
  //   mundo = camara + (pantalla - centro) / magnificacion
  // LA PASTILLA Y SU TEXTO, EN EL MISMO ESPACIO. Estaban en dos: la pastilla en 3D a z=-120 y el texto
  // en 2D pegado al cuadro, asi que cada una aparecia en un lugar distinto — el revisor vio "capsulas
  // vacias" tapando el codigo y, aparte, texto blanco suelto sobre el vacio. Las dos en 2D quedan
  // alineadas por construccion y no hay coordenada que convertir.
  var chY = 300 + ci * 92;
  var ch = plano(img("pildora-chip", "chip-" + ci, 300, chY, cz, 0), 64 + ci * 24, 560);
  ch.threeDLayer = false;
  tr(ch).property("ADBE Position").setValue([300, chY]);
  var ejCh = ejes(ch);
  var aCh = 64 + ci * 24;
  claves(tr(ch).property("ADBE Scale"), [[aCh, [16, 16, 100], "C1"], [aCh + 12, [30, 30, 100], "C8"], [aCh + 18, [27, 27, 100], "C5"]]);
  claves(tr(ch).property("ADBE Opacity"), [[aCh, 0, "C1"], [aCh + 12, 100, "C1"], [548, 100, "C3"], [560, 0, "C5"]]);
  // y cada una vuelve a latir mas adelante: el segundo tiempo de la pieza
  var bCh = 288 + ci * 24;
  claves(ejCh.y, [[bCh, chY, "C7"], [bCh + 4, chY - 18, "C8"], [bCh + 16, chY, "C5"]]);
  // el texto va como capa 2D encima, con SU palabra: horneado adentro del PNG, las seis sugerencias
  // decian "Medilo" — la misma palabra seis veces en pantalla. Y asi cada una es un parametro.
  // 36 px y no 30: a 30 daban 2,8% del alto de cuadro, por debajo del piso de apoyo (3%). La compuerta
  // de lectura los conto a los seis.
  var chT = plano(rotulo(CHIPS[ci], 36, TINTA, F_ETIQUETA, 300, chY + 12, 0, ParagraphJustification.CENTER_JUSTIFY), aCh + 6, 556);
  claves(tr(chT).property("ADBE Opacity"), [[aCh + 6, 0, "C1"], [aCh + 16, 100, "C1"], [546, 100, "C3"], [556, 0, "C5"]]);
  parametro(chT, fuenteDe(chT), "ADBE Text Properties/ADBE Text Document", "Sugerencia " + (ci + 1), "texto");
  chips[ci] = { capa: ch, ejes: ejCh, texto: chT };
}

// UN PUNTO QUE RECORRE LAS SUGERENCIAS. Tres saltos, en los tres huecos que quedaban: 248, 424 y 520.
// Es un elemento chico con gestos propios, que es lo que un plano largo necesita para no tener cuatro
// segundos donde no arranca nada — y ademas se lee como que algo esta eligiendo.
var punto = plano(img("mancha-cian", "punto-foco", 780, 420, -150, 0), 240, 560);
var ejPu = ejes(punto);
claves(tr(punto).property("ADBE Opacity"), [[240, 0, "C1"], [252, 62, "C1"], [548, 62, "C3"], [560, 0, "C5"]]);
claves(tr(punto).property("ADBE Scale"), [[240, [4, 4, 100], "C1"], [252, [7, 7, 100], "C5"]]);
claves(ejPu.y, [[248, 392, "C1"], [264, 510, "C1"],
                [424, 510, "C1"], [440, 628, "C1"],
                [520, 628, "C1"], [536, 745, "C5"]]);
claves(ejPu.x, [[248, 780, "C1"], [264, 807, "C1"],
                [424, 807, "C1"], [440, 834, "C1"],
                [520, 834, "C1"], [536, 861, "C5"]]);

// 208 · el panel chico se adelanta; 448 · vuelve
// TODOS LOS TRAMOS DE LA MISMA FAMILIA: mezclar C5 (lineal) con C1 (bezier) deja la clave del medio
// con entrada lineal y salida bezier, y el exportador la rechaza con razon. Es la tercera vez que
// tropiezo con esto en esta sesion.
claves(ejC3.x, [[208, 1620, "C1"], [232, 1380, "C1"], [448, 1380, "C1"], [472, 1700, "C5"]]);

fondoNegro.moveToEnd();

// ================================================================ LA CAMARA — y aca esta la decision
// Un solo movimiento continuo, sin cortes, con dos acentos. LIDERA la pieza: va a fallar M5 y esta
// declarado arriba con el motivo. Es el estilo de la referencia, medido: un plano de 60 s sin un corte.
var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
camara.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
var trC = tr(camara);
trC.property("ADBE Position").dimensionsSeparated = true;
var cx = trC.property("ADBE Position_0"), cy = trC.property("ADBE Position_1"), cz = trC.property("ADBE Position_2");
claves(cx, [[0, 1180, "C6"], [200, 900, "C6"], [400, 1120, "C6"], [CUADROS - 1, 860, "C5"]]);
claves(cy, [[0, 380, "C6"], [200, 560, "C6"], [400, 420, "C6"], [CUADROS - 1, 600, "C5"]]);
claves(cz, [[0, -1750, "C6"], [200, -2050, "C6"], [400, -1850, "C6"], [CUADROS - 1, -2250, "C5"]]);
// el balanceo, muy leve: el horizonte inclinado es parte del estilo
claves(trC.property("ADBE Rotate Z"), [[0, -1.6, "C6"], [300, 1.2, "C6"], [CUADROS - 1, -0.8, "C5"]]);

// ================================================================ los parametros de la plantilla
parametro(t1.uno, fuenteDe(t1.uno), "ADBE Text Properties/ADBE Text Document", "Titular 1", "texto");
parametro(t1.dos, fuenteDe(t1.dos), "ADBE Text Properties/ADBE Text Document", "Titular 1 acento", "texto");
parametro(t2.uno, fuenteDe(t2.uno), "ADBE Text Properties/ADBE Text Document", "Titular 2", "texto");
parametro(t2.dos, fuenteDe(t2.dos), "ADBE Text Properties/ADBE Text Document", "Titular 2 acento", "texto");
parametro(t3.uno, fuenteDe(t3.uno), "ADBE Text Properties/ADBE Text Document", "Remate", "texto");
parametro(t3.dos, fuenteDe(t3.dos), "ADBE Text Properties/ADBE Text Document", "Remate acento", "texto");
parametro(eti, fuenteDe(eti), "ADBE Text Properties/ADBE Text Document", "Bajada", "texto");
comp.comment = MANIFIESTO.join(String.fromCharCode(10));

anotar("PARAMETROS|" + MANIFIESTO.length + " declarados");
anotar("PIEZA-G|" + comp.numLayers + " capas|" + DUR + " s|" + CUADROS + " cuadros");

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
