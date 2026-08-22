// ¿AE SABE HACER OBJETOS 3D DE VERDAD, Y SE PUEDEN LEER POR SCRIPT?
//
// El supuesto que quiero verificar: "el 3D de AE son planos en el espacio, y eso ya lo reproducimos".
// Puede estar mal, porque AE trae el motor CINEMA 4D, que SI da geometria: extrusion y bisel sobre
// capas de texto y de forma. Si eso es alcanzable por script Y legible, entonces "objetos 3D" deja de
// ser una idea vaga y pasa a ser una capacidad concreta con un camino.
var RUTA = "C:/ae-probe/render3d-prueba.txt";
function texto(x){ if(x===null){return "null";} if(x===undefined){return "undefined";}
  try{return x.toString();}catch(e){return "<inconvertible>";} }
function anotar(t){ var a=new File(RUTA); a.encoding="UTF-8"; a.open("a");
  a.write(t+String.fromCharCode(10)); a.close(); }
var previo=new File(RUTA); if(previo.exists){previo.remove();}
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }
try {
app.beginUndoGroup("RENDER3D-PRUEBA");
var NOMBRE="RENDER3D-PRUEBA";
var n=app.project.numItems;
while(n>0){ var it=app.project.item(n);
  if(it instanceof CompItem && it.name===NOMBRE){ it.remove(); } n=n-1; }
var comp=app.project.items.addComp(NOMBRE,1920,1080,1,2,30);

anotar("VERSION|" + texto(app.version));

// 1 · que motores de render 3D ofrece esta instalacion
var mot = comp.renderer;
anotar("MOTOR_ACTUAL|" + texto(mot));
var lista = "";
try { var i, ms = comp.renderers; for(i=0;i<ms.length;i++){ lista = lista + ms[i] + ";"; } }
catch(e1){ lista = "<no se pudo leer comp.renderers: " + texto(e1) + ">"; }
anotar("MOTORES|" + lista);

// 2 · ¿se puede cambiar al de Cinema 4D por script?
var puesto = "no";
try { comp.renderer = "ADBE Ernst"; puesto = comp.renderer; }
catch(e2){ puesto = "FALLO: " + texto(e2); }
anotar("PONER_C4D|" + texto(puesto));

// 3 · con ese motor, ¿una capa de texto expone geometria (extrusion, bisel)?
var t1 = comp.layers.addText("Hola");
t1.threeDLayer = true;
var geo = t1.property("ADBE Extrsn Options Group");
if (geo === null || geo === undefined) { anotar("GEOMETRIA|no existe el grupo"); }
else {
  var k, nombres = "";
  for (k = 1; k <= geo.numProperties; k++) {
    var pr = geo.property(k);
    var val = "?";
    try { val = texto(pr.value); } catch(e3){ val = "<sin valor>"; }
    nombres = nombres + pr.matchName + "=" + val + ";";
  }
  anotar("GEOMETRIA|" + nombres);
}

// 4 · y los MATERIALES, que es lo que decide si un objeto 3D se ve como objeto
var mat = t1.property("ADBE Material Options Group");
if (mat === null || mat === undefined) { anotar("MATERIAL|no existe"); }
else {
  var m, nm = "";
  for (m = 1; m <= mat.numProperties; m++) { nm = nm + mat.property(m).matchName + ";"; }
  anotar("MATERIAL|" + nm);
}

// 5 · LOS ANIMADORES DE TEXTO: lo que el exportador rechaza entero hoy. ¿Que se puede LEER de uno?
var anims = t1.property("ADBE Text Properties").property("ADBE Text Animators");
var an = anims.addProperty("ADBE Text Animator");
var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
var props = an.property("ADBE Text Animator Properties");
var pos = props.addProperty("ADBE Text Position 3D");
pos.setValue([0, -60, 0]);
anotar("ANIM_SELECTOR|" + texto(sel.matchName));
var s, ss = "";
for (s = 1; s <= sel.numProperties; s++) {
  var sp = sel.property(s);
  var sv = "?";
  try { sv = texto(sp.value); } catch(e4){ sv = "<sin valor>"; }
  ss = ss + sp.matchName + "=" + sv + ";";
}
anotar("SELECTOR_PROPS|" + ss);
var q, qq = "";
for (q = 1; q <= props.numProperties; q++) { qq = qq + props.property(q).matchName + ";"; }
anotar("ANIM_PROPS|" + qq);

// 6 · ¿AE puede decirme donde queda CADA caracter con el animador aplicado?
// Si esto existe, el motor no necesita entender animadores: le alcanza con recibir las posiciones.
var tienePorCaracter = "no";
try {
  var doc = t1.property("ADBE Text Properties").property("ADBE Text Document");
  tienePorCaracter = texto(typeof doc.value.boxText);
} catch(e5){ tienePorCaracter = "FALLO " + texto(e5); }
anotar("CAJA_POR_CARACTER|" + tienePorCaracter);
anotar("SOURCERECT_CON_ANIM|" + texto(t1.sourceRectAtTime(0, false).width));

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
