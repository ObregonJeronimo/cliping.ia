// QUE PROPIEDADES SE PUEDEN DECLARAR EDITABLES, Y COMO SE LEEN DE VUELTA.
//
// POR QUE ESTO ES EL FRENTE GRANDE Y NO UN DETALLE.
//
// Hasta ahora exporto una PIEZA: una composicion cerrada que se reproduce igual siempre. La tesis del
// proyecto es otra — plantillas autoradas una vez, que despues un usuario rellena desde la web con su
// texto, sus colores y sus imagenes. Entre una cosa y la otra falta exactamente un dato: **cuales de
// las mil propiedades de la composicion son las que se pueden cambiar**.
//
// Y AE ya tiene ese mecanismo, nativo y pensado para esto: el panel de Graficos Esenciales. Una
// propiedad se declara editable con `addToMotionGraphicsTemplateAs(comp, nombre)` y queda en una lista
// con su nombre publico. No hace falta inventar una convencion propia ni marcar capas con comentarios:
// es el vocabulario que la aplicacion ya habla, y ademas sobrevive si alguien abre el proyecto a mano.
//
// LO QUE ESTA SONDA AVERIGUA, preguntando en vez de suponiendo:
//   1. Que tipos de propiedad ACEPTA la lista (texto, color, numero, casilla, punto, medio).
//   2. Como se ENUMERA esa lista desde un script, para que el exportador la pueda volcar.
//   3. Si existe una identidad de capa ESTABLE (`layer.id`), porque el indice se corre al agregar una
//      capa y una plantilla que se rellena no puede referirse a sus partes por posicion.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/parametros.jsx

var RUTA = "C:/ae-probe/parametros.txt";

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
function lista(v) {
  if (v === null || v === undefined) { return ""; }
  if (typeof v.length === "number" && typeof v !== "string") { return v.join(";"); }
  return "" + v;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("parametros");

var NOMBRE = "PARAM-PRUEBA";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, 1920, 1080, 1, 2, 30);

// ---------------------------------------------------------------- 1. las capas de prueba
var solido = comp.layers.addSolid([0.2, 0.4, 0.9], "un-solido", 400, 200, 1);
var txt = comp.layers.addText("TEXTO DE PRUEBA");
var nulo = comp.layers.addNull();
nulo.name = "controlador";

// un control de expresion, que es como se declara un numero editable que no es una propiedad de capa
var ctrl = null;
try {
  ctrl = nulo.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
  ctrl.name = "velocidad";
} catch (exC) { anotar("NOTA|0|no se pudo agregar un control deslizante|" + texto(exC)); }

// ---------------------------------------------------------------- 2. la IDENTIDAD ESTABLE
// El indice de capa de AE es POSICIONAL: agregar una capa corre todos los de abajo. Un documento que
// referencia a sus partes por indice —como el mio referencia al padre— se rompe en cuanto alguien toca
// la composicion. Lottie resuelve esto con un `ind` propio; AE tiene `layer.id` desde la 16.
var idS = "no existe", idT = "no existe";
try { idS = texto(solido.id); } catch (e1) {}
try { idT = texto(txt.id); } catch (e2) {}
anotar("IDENTIDAD|solido idx=" + solido.index + " id=" + idS + "|texto idx=" + txt.index + " id=" + idT);
// y que el id NO cambie al reordenar, que es lo unico que importa
try {
  txt.moveToBeginning();
  anotar("IDENTIDAD_TRAS_REORDENAR|texto idx=" + txt.index + " id=" + texto(txt.id) +
         "|solido idx=" + solido.index + " id=" + texto(solido.id));
} catch (e3) { anotar("NOTA|0|no se pudo reordenar|" + texto(e3)); }

// ---------------------------------------------------------------- 3. que se puede declarar editable
// Se prueba una propiedad de cada familia y se anota si AE la acepta. `canAddToMotionGraphicsTemplate`
// contesta ANTES de intentarlo, que es lo que le permite al exportador explicar por que algo no entra
// en vez de fallar.
function probar(etiqueta, prop, nombrePublico) {
  if (prop === null || prop === undefined) { anotar("PARAM|" + etiqueta + "|no existe|-|-"); return; }
  var puede = "?";
  try { puede = prop.canAddToMotionGraphicsTemplate(comp) ? "si" : "no"; } catch (eA) { puede = "sin metodo"; }
  var agregado = "?";
  try {
    if (typeof prop.addToMotionGraphicsTemplateAs === "function") {
      agregado = prop.addToMotionGraphicsTemplateAs(comp, nombrePublico) ? "si" : "no";
    } else if (typeof prop.addToMotionGraphicsTemplate === "function") {
      agregado = prop.addToMotionGraphicsTemplate(comp) ? "si (sin nombre)" : "no";
    } else {
      agregado = "sin metodo";
    }
  } catch (eB) { agregado = "ERROR " + texto(eB); }
  anotar("PARAM|" + etiqueta + "|puede=" + puede + "|agregado=" + agregado + "|" + nombrePublico);
}

var trT = txt.property("ADBE Transform Group");
probar("texto.origen", txt.property("ADBE Text Properties").property("ADBE Text Document"), "Titular");
probar("solido.color", solido.property("ADBE Effect Parade") ? null : null, "Color");
probar("texto.posicion", trT.property("ADBE Position"), "Posicion del titular");
probar("texto.opacidad", trT.property("ADBE Opacity"), "Opacidad");
probar("texto.escala", trT.property("ADBE Scale"), "Escala");
if (ctrl !== null) { probar("control.deslizante", ctrl.property("ADBE Slider Control-0001"), "Velocidad"); }

// el color de un solido no es una propiedad animable: para exponerlo hace falta un control de color
var ctrlColor = null;
try {
  ctrlColor = nulo.property("ADBE Effect Parade").addProperty("ADBE Color Control");
  ctrlColor.name = "marca";
  probar("control.color", ctrlColor.property("ADBE Color Control-0001"), "Color de marca");
} catch (exCC) { anotar("NOTA|0|no se pudo agregar un control de color|" + texto(exCC)); }

// ---------------------------------------------------------------- 4. como se LEE la lista de vuelta
// Sin esto el mecanismo no sirve para nada: el exportador tiene que poder enumerar lo declarado.
var cuantos = "no existe";
try { cuantos = texto(comp.motionGraphicsTemplateControllerCount); } catch (e4) {}
anotar("LISTA|cantidad=" + cuantos);
if (cuantos !== "no existe" && cuantos !== "undefined") {
  var k;
  for (k = 0; k < comp.motionGraphicsTemplateControllerCount; k++) {
    var nom = "?";
    try { nom = comp.getMotionGraphicsTemplateControllerName(k); } catch (e5) { nom = "ERROR " + texto(e5); }
    anotar("CONTROL|" + k + "|" + nom);
  }
}
var nombrePlantilla = "no existe";
try { nombrePlantilla = texto(comp.motionGraphicsTemplateName); } catch (e6) {}
anotar("PLANTILLA|nombre=" + nombrePlantilla);

// que mas tiene la composicion sobre este tema: se le pregunta al objeto en vez de adivinar
try {
  var refl = comp.reflect.properties, rs = "", rr;
  for (rr = 0; rr < refl.length; rr++) {
    var nm = texto(refl[rr].name);
    var bajo = nm.toLowerCase();
    if (bajo.substring(0, 14) === "motiongraphics" || bajo.substring(0, 9) === "essential") {
      rs = rs + (rs ? "," : "") + nm;
    }
  }
  anotar("REFLEXION_COMP|" + (rs || "ninguna propiedad con ese nombre"));
} catch (exR) { anotar("REFLEXION_COMP|no se pudo|" + texto(exR)); }

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
