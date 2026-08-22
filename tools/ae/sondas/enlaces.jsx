// SONDA · QUE SE PUEDE ENLAZAR DE VERDAD, Y COMO SE LEE SIN QUE EL IDIOMA LO ROMPA.
//
// Antes de construir la familia de enlaces hay que contestar cinco preguntas contra AE, no contra la
// documentacion. Las cinco tienen una respuesta que, si se asume mal, produce un defecto sin sintoma:
//
//   1. Se puede leer un deslizador POR INDICE (`effect(1)(1)`)? Es la unica forma seguraque no depende
//      del idioma. Este repo ya se comio 41 errores de expresion en un proyecto ajeno porque la
//      propiedad se llama "Slider" en ingles y "Deslizador" en espanol.
//   2. Se puede enlazar una propiedad de OTRA capa, y ese enlace se evalua bien?
//   3. Funciona `valueAtTime(time - retardo)` sobre otra capa? Es el seguidor con arrastre.
//   4. `expressionError` avisa de verdad cuando la expresion esta rota? (control negativo: si no
//      avisa, cualquier guarda que escriba encima es decorativa)
//   5. Que pasa si la expresion tiene una REFERENCIA CIRCULAR? Hay que saber si AE lo detecta o si
//      cuelga, porque de eso depende si la guarda tiene que impedirlo antes.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/enlaces.jsx
// SALIDA
//   C:/ae-probe/enlaces.txt

var RUTA = "C:/ae-probe/enlaces.txt";
var pv = new File(RUTA); if (pv.exists) { pv.remove(); }
function di(t) {
  var f = new File(RUTA);
  f.open("a"); f.encoding = "UTF-8"; f.writeln(t); f.close();
}

function leerError(prop) {
  var e = "";
  try { e = prop.expressionError; } catch (ex) { e = "<no se pudo leer>"; }
  return e === "" ? "(sin error)" : e;
}

try {
app.beginUndoGroup("SONDA-ENLACES");
app.project.bitsPerChannel = 8;

// borrar la comp anterior si quedo
var i, it;
for (i = app.project.numItems; i >= 1; i--) {
  it = app.project.item(i);
  if (it instanceof CompItem && it.name === "SONDA-ENLACES") { it.remove(); }
}

var comp = app.project.items.addComp("SONDA-ENLACES", 400, 300, 1, 2, 30);

// ------------------------------------------------------------------ el nulo de control
var ctrl = comp.layers.addNull(2);
ctrl.name = "control";
var fx = ctrl.property("ADBE Effect Parade");
fx.addProperty("ADBE Slider Control");
fx.addProperty("ADBE Slider Control");
// LA REFERENCIA QUE DEVUELVE addProperty SE INVALIDA AL AGREGAR EL SIGUIENTE EFECTO. Guardarla y
// usarla despues da "El objeto no es valido". Se vuelven a pedir por indice, ya con todos puestos.
var s1 = fx.property(1);
var s2 = fx.property(2);
di("EFECTOS|" + fx.numProperties);
di("NOMBRE-1|" + s1.name);                       // localizado: "Slider" o "Deslizador"
di("MATCH-1|" + s1.matchName);
s1.property(1).setValue(7);
s2.property(1).setValue(120);
di("VALOR-1|" + s1.property(1).value);
di("VALOR-2|" + s2.property(1).value);

// ------------------------------------------------------------------ el lider, con claves
var lider = comp.layers.addSolid([1, 0, 0], "lider", 50, 50, 1);
var pl = lider.property("ADBE Transform Group").property("ADBE Position");
pl.setValueAtTime(0, [50, 150]);
pl.setValueAtTime(1, [350, 150]);

// ------------------------------------------------------------------ 1 · leer el deslizador POR INDICE
var a = comp.layers.addSolid([0, 1, 0], "lee-slider", 30, 30, 1);
var pa = a.property("ADBE Transform Group").property("ADBE Position");
pa.expression = 'x = thisComp.layer("control").effect(1)(1);\n' +
                'y = thisComp.layer("control").effect(2)(1);\n' +
                '[x * 10, y];';
di("T1-ERROR|" + leerError(pa));
di("T1-VALOR|" + pa.valueAtTime(0, false).toString() + "|esperado 70,120");

// ------------------------------------------------------------------ 2 · enlazar con otra capa
var b = comp.layers.addSolid([0, 0, 1], "sigue-directo", 30, 30, 1);
var pb = b.property("ADBE Transform Group").property("ADBE Position");
pb.expression = 'p = thisComp.layer("lider").transform.position;\n[p[0], p[1] + 60];';
di("T2-ERROR|" + leerError(pb));
di("T2-EN-0|" + pb.valueAtTime(0, false).toString() + "|esperado 50,210");
di("T2-EN-05|" + pb.valueAtTime(0.5, false).toString() + "|esperado 200,210");

// ------------------------------------------------------------------ 3 · el seguidor con RETARDO
var c = comp.layers.addSolid([1, 1, 0], "sigue-con-retardo", 30, 30, 1);
var pc = c.property("ADBE Transform Group").property("ADBE Position");
pc.expression = 'p = thisComp.layer("lider").transform.position.valueAtTime(time - 0.2);\n' +
                '[p[0], p[1] + 120];';
di("T3-ERROR|" + leerError(pc));
di("T3-EN-05|" + pc.valueAtTime(0.5, false).toString() + "|esperado 140,270 (el lider en t=0.3)");

// ------------------------------------------------------------------ 4 · CONTROL NEGATIVO: rota
var d = comp.layers.addSolid([1, 0, 1], "rota", 30, 30, 1);
var pd = d.property("ADBE Transform Group").property("ADBE Position");
pd.expression = 'thisComp.layer("no-existe-esta-capa").transform.position;';
di("T4-ERROR|" + leerError(pd));
di("T4-VALOR|" + pd.valueAtTime(0, false).toString());

// ------------------------------------------------------------------ 5 · el nombre localizado, ROTO a proposito
var e = comp.layers.addSolid([0, 1, 1], "por-nombre", 30, 30, 1);
var pe = e.property("ADBE Transform Group").property("ADBE Position");
pe.expression = 'v = thisComp.layer("control").effect("Slider")("Slider");\n[v, v];';
di("T5-ERROR|" + leerError(pe));
di("T5-VALOR|" + pe.valueAtTime(0, false).toString());

// ------------------------------------------------------------------ 6 · referencia circular
var f1 = comp.layers.addSolid([1, 1, 1], "circ-a", 30, 30, 1);
var f2 = comp.layers.addSolid([1, 1, 1], "circ-b", 30, 30, 1);
var pf1 = f1.property("ADBE Transform Group").property("ADBE Opacity");
var pf2 = f2.property("ADBE Transform Group").property("ADBE Opacity");
pf1.expression = 'thisComp.layer("circ-b").transform.opacity;';
pf2.expression = 'thisComp.layer("circ-a").transform.opacity;';
di("T6-ERROR-A|" + leerError(pf1));
di("T6-ERROR-B|" + leerError(pf2));
var vc = "?";
try { vc = pf1.valueAtTime(0, false).toString(); } catch (exC) { vc = "TIRO: " + exC.toString(); }
di("T6-VALOR|" + vc);

// ------------------------------------------------------------------ 7 · expresion SOBRE claves propias
var g = comp.layers.addSolid([0.5, 0.5, 0.5], "sobre-claves", 30, 30, 1);
var pg = g.property("ADBE Transform Group").property("ADBE Opacity");
pg.setValueAtTime(0, 20);
pg.setValueAtTime(1, 80);
pg.expression = 'value + thisComp.layer("control").effect(1)(1);';
di("T7-ERROR|" + leerError(pg));
di("T7-EN-0|" + pg.valueAtTime(0, false) + "|esperado 27 (20 + 7)");
di("T7-EN-1|" + pg.valueAtTime(1, false) + "|esperado 87 (80 + 7)");

di("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  di("ERROR|" + (elFallo.message ? elFallo.message : elFallo).toString() +
     "|linea " + (elFallo.line ? elFallo.line : "?"));
  di("--- fin ---");
}
