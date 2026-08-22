// PIEZA-B — las cuatro capacidades juntas: 3D con camara, imagenes, formas y resplandor.
//
// La PIEZA-A se hizo con la restriccion de solo texto, solidos y transformaciones, para averiguar
// cuanta calidad se conseguia con eso. La respuesta fue: ritmo correcto y composicion timida. Faltaba
// justo lo que esta pieza usa.
//
// LO QUE CADA CAPACIDAD APORTA, y por que ninguna sobra:
//   3D + camara   la profundidad de verdad. El paralaje de la PIEZA-A fingia distancia moviendo capas
//                 a distintas velocidades; aca los paneles ESTAN a distintas distancias y se escorzan
//                 al pasar. Es el 80% de lo que separa una pieza de la de Gemini.
//   imagenes      contenido adentro de los paneles. Sin esto un panel es un rectangulo en perspectiva.
//   formas        esquinas redondeadas y contornos. Un solido tiene esquinas vivas, y una interfaz con
//                 esquinas vivas no se lee como una interfaz.
//   resplandor    lo que hace que un acento se lea como encendido y no como pintado.
//
// EL RITMO SIGUE LA MISMA REGLA MEDIDA: cero cortes, un viaje grande, y silencios explicitos. Las
// referencias miden 14 (Gemini) a 28 (FireFit) de movimiento medio; nuestro motor viejo media 45 y se
// ve barato.

var RUTA = "C:/ae-probe/pieza-b.txt";
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

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("pieza B");

var NOMBRE = "PIEZA-B";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 12;

var FONDO  = [0.039, 0.039, 0.055];   // #0A0A0E
var PANEL  = [0.071, 0.078, 0.110];   // #12141C
var BORDE  = [0.137, 0.153, 0.204];   // #232734
var ACENTO = [0.949, 0.251, 0.149];   // #F24026
var CIAN   = [0.149, 0.741, 0.949];   // #26BDF2
var HUESO  = [0.949, 0.945, 0.925];
var GRIS   = [0.486, 0.518, 0.588];

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

// ---------------------------------------------------------------- curvas
var VIAJE_S = { v: 0, i: 74 }, VIAJE_E = { v: 0, i: 92 };
var ENTRA_S = { v: 0, i: 20 }, ENTRA_E = { v: 0, i: 90 };
var SUAVE   = { v: 0, i: 33.333333 };

function terna(prop, e) {
  var cuantos = prop.keyOutTemporalEase(1).length;
  var a = [], j;
  for (j = 0; j < cuantos; j++) { a[a.length] = new KeyframeEase(e.v, e.i); }
  return a;
}
function clave(prop, tiempos, valores, eases) {
  var k;
  for (k = 0; k < tiempos.length; k++) { prop.setValueAtTime(tiempos[k], valores[k]); }
  for (k = 1; k <= prop.numKeys; k++) {
    prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
  }
  for (k = 0; k < tiempos.length; k++) {
    var idx = prop.nearestKeyIndex(tiempos[k]);
    prop.setTemporalEaseAtKey(idx, terna(prop, eases[k]), terna(prop, eases[k]));
  }
}
function tr(c) { return c.property("ADBE Transform Group"); }

// ---------------------------------------------------------------- importar las pantallas
function importar(nombre) {
  var f = new File(RECURSOS + "/" + nombre);
  if (!f.exists) { throw new Error("falta " + f.fsName + " — corre node tools/ae/pantallas.mjs"); }
  var q;
  for (q = 1; q <= app.project.numItems; q++) {
    var itm = app.project.item(q);
    if (itm instanceof FootageItem && itm.file && itm.file.fsName === f.fsName) { return itm; }
  }
  return app.project.importFile(new ImportOptions(f));
}
var PANTALLAS = [importar("pantalla-1.png"), importar("pantalla-2.png"), importar("pantalla-3.png")];

// ---------------------------------------------------------------- un panel = marco de forma + pantalla
// EL MARCO ES UNA FORMA porque un solido tiene esquinas vivas, y una interfaz con esquinas vivas no se
// lee como una interfaz. La pantalla es una IMAGEN emparentada al marco: asi las dos viajan juntas con
// una sola transformacion, y mover el panel es mover una capa.
function panel(nombre, metraje, x, y, z, rotY, rotX) {
  var marco = comp.layers.addShape();
  marco.name = nombre + "-marco";
  var raiz = marco.property("ADBE Root Vectors Group");
  var grupo = raiz.addProperty("ADBE Vector Group");
  var v = grupo.property("ADBE Vectors Group");
  var rect = v.addProperty("ADBE Vector Shape - Rect");
  rect.property("ADBE Vector Rect Size").setValue([960, 620]);
  rect.property("ADBE Vector Rect Roundness").setValue(26);
  var relleno = v.addProperty("ADBE Vector Graphic - Fill");
  relleno.property("ADBE Vector Fill Color").setValue(PANEL);
  var trazo = v.addProperty("ADBE Vector Graphic - Stroke");
  trazo.property("ADBE Vector Stroke Color").setValue(BORDE);
  trazo.property("ADBE Vector Stroke Width").setValue(3);
  marco.threeDLayer = true;
  tr(marco).property("ADBE Position").setValue([x, y, z]);
  tr(marco).property("ADBE Rotate Y").setValue(rotY);
  if (rotX) { tr(marco).property("ADBE Rotate X").setValue(rotX); }

  var pantalla = comp.layers.add(metraje);
  pantalla.name = nombre + "-pantalla";
  pantalla.threeDLayer = true;
  pantalla.parent = marco;
  // en coordenadas del padre: centrada, apenas adelante para que no pelee con el marco en el mismo plano
  tr(pantalla).property("ADBE Position").setValue([0, 0, -1]);
  return { marco: marco, pantalla: pantalla };
}

// se crean del fondo hacia el frente: cada capa nueva entra arriba, asi que el orden de creacion es el
// del apilado invertido
var p3 = panel("p3", PANTALLAS[2], 1180, 430, 1500, 10, -6);
var p2 = panel("p2", PANTALLAS[1], 1560, 660, 780, -26, 0);
var p1 = panel("p1", PANTALLAS[0], 520, 560, 220, 18, 0);

// ---------------------------------------------------------------- acentos que brillan
function barra(nombre, ancho, color, x, y, z, rotY, decl) {
  var b = comp.layers.addShape();
  b.name = nombre;
  var v = b.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
  var rect = v.addProperty("ADBE Vector Shape - Rect");
  rect.property("ADBE Vector Rect Size").setValue([ancho, 14]);
  rect.property("ADBE Vector Rect Roundness").setValue(7);
  var relleno = v.addProperty("ADBE Vector Graphic - Fill");
  relleno.property("ADBE Vector Fill Color").setValue(color);
  b.threeDLayer = true;
  tr(b).property("ADBE Position").setValue([x, y, z]);
  tr(b).property("ADBE Rotate Y").setValue(rotY);
  b.comment = decl;
  return b;
}
// EL UMBRAL SE COMPARA CONTRA LA LUMINANCIA EN LINEAL. El rojo #F24026 da 0,226 y el cian #26BDF2
// da 0,417: con un umbral de 0,35 el rojo NO desbordaria y saldria plano. Por eso van distintos.
var b1 = barra("barra-1", 520, ACENTO, 520, 200, 220, 18, "brillo 1.5 0.75 0.14");
var b2 = barra("barra-2", 420, CIAN, 1560, 300, 780, -26, "brillo 0.9 0.50 0.34");

// ---------------------------------------------------------------- la tipografia, pegada al frente
function poner(cadena, tam, color, y, fuente) {
  var t = comp.layers.addText(cadena);
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = tam;
  d.fillColor = color;
  d.applyFill = true;
  d.justification = ParagraphJustification.CENTER_JUSTIFY;
  try { d.font = fuente; } catch (exF) {}
  p.setValue(d);
  // NO ES 3D A PROPOSITO. Una capa 2D en una composicion con camara IGNORA la camara y se queda
  // pegada al cuadro — es como se hace un titulo o un rotulo. Puesta en 3D a z=0 flota en el MUNDO, y
  // la camara la pasa de largo: el titulo se desliza y se corta contra el borde mientras viaja, que se
  // lee como un error de layout y es un error de a que espacio pertenece la capa.
  tr(t).property("ADBE Position").setValue([ANCHO / 2, y]);
  return t;
}
// EL REVELADO POR TAPA, con el orden de apilado que lo hace funcionar. Cada tapa tiene que estar
// ARRIBA del texto que oculta y ABAJO del que no, y como en AE cada capa nueva entra en el indice 1,
// el orden de CREACION es el del apilado invertido. La primera version creo bajada, titulo y una sola
// tapa: la tapa quedaba arriba de las dos y no cubria a ninguna del todo — el titulo asomaba desde el
// cuadro 0. El apilado no es un detalle: ES el efecto.
//
// La cuenta, contra la TINTA y no contra el cuerpo (Arial Black ocupa ~0,72 del cuerpo sobre la linea
// de base):
//   titulo  128 px, base final 918  -> tinta 826..928.  Su tapa cubre de 935 para abajo.
//   bajada   40 px, base final 990  -> tinta 961..1000. Su tapa cubre de 1012 para abajo.
var titulo = poner("SIN AFTER EFFECTS", 128, HUESO, 918, "Arial-Black");
var tapaTitulo = comp.layers.addSolid(FONDO, "tapa-titulo", ANCHO + 200, 460, 1);
tr(tapaTitulo).property("ADBE Position").setValue([ANCHO / 2, 935 + 230]);

var bajada = poner("after effects no participa del render", 40, GRIS, 990, "ArialMT");
var tapaBajada = comp.layers.addSolid(FONDO, "tapa-bajada", ANCHO + 200, 460, 1);
tr(tapaBajada).property("ADBE Position").setValue([ANCHO / 2, 1012 + 230]);

clave(tr(titulo).property("ADBE Position"),
      [1.20, 2.10], [[ANCHO / 2, 1120], [ANCHO / 2, 918]], [ENTRA_S, ENTRA_E]);
clave(tr(bajada).property("ADBE Position"),
      [1.55, 2.45], [[ANCHO / 2, 1105], [ANCHO / 2, 990]], [ENTRA_S, ENTRA_E]);

// ---------------------------------------------------------------- LA CAMARA: el viaje
// EL MAPA DE TIEMPO
//   0,0–0,7   la camara ARRANCA PEGADA al primer panel y se abre: el cuadro 0 no esta vacio, esta
//             lleno de interfaz. Es lo que el 2D no podia hacer.
//   0,7–1,2   quieto
//   1,2–2,45  la tipografia sube detras de su tapa, escalonada
//   2,45–3,3  quieto (25 c) — el silencio antes del viaje
//   3,3–5,4   EL VIAJE: la camara cruza al segundo panel. Los paneles se escorzan al pasar.
//   5,4–6,4   quieto (30 c)
//   6,4–8,3   segundo tramo: al panel del fondo
//   8,3–9,4   quieto (33 c)
//   9,4–12,0  retroceso lento que abre el plano y muestra los tres a la vez. Nada queda quieto.
var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var ZOOM = 2666.6666666;
try { ZOOM = camara.property("ADBE Camera Options Group").property("ADBE Camera Zoom").value; } catch (exZ) {}
anotar("ZOOM|" + ZOOM);

var pc = tr(camara).property("ADBE Position");
var poi = tr(camara).property("ADBE Anchor Point");

clave(pc,
  [0.00, 0.70, 3.30, 5.40, 6.40, 8.30, 12.00],
  [[470, 590, -1180],
   [520, 585, -1500],
   [520, 585, -1500],
   [1480, 690, -1180],
   [1480, 690, -1180],
   [1210, 470, -640],
   [980, 560, -2350]],
  [SUAVE, ENTRA_E, VIAJE_S, VIAJE_E, VIAJE_S, VIAJE_E, SUAVE]);

// EL PUNTO DE INTERES TAMBIEN VIAJA, y es lo que hace que la camara MIRE algo en vez de trasladarse.
// Sin esto el recorrido se siente como un travelling de grua sin intencion.
clave(poi,
  [0.00, 3.30, 5.40, 6.40, 8.30, 12.00],
  [[520, 560, 220], [520, 560, 220], [1560, 660, 780], [1560, 660, 780], [1180, 430, 1500], [1060, 540, 700]],
  [SUAVE, VIAJE_S, VIAJE_E, VIAJE_S, VIAJE_E, SUAVE]);

// ---------------------------------------------------------------- el obturador, en TODAS
// En AE el interruptor es por capa Y por composicion, y no se hereda: una capa quieta emparentada a
// otra que se mueve tambien se desenfoca, y sin el interruptor queda con los bordes duros.
var w;
for (w = 1; w <= comp.numLayers; w++) {
  try { comp.layer(w).motionBlur = true; } catch (exMB) {}
}

anotar("PIEZA-B|" + comp.numLayers + " capas|" + DUR + " s|0 cortes");
app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
