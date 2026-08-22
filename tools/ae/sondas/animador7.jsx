// ¿COMO SE SABE QUE PROPIEDADES DE UN ANIMADOR AGREGO EL AUTOR?
//
// EL PROBLEMA, medido: `ADBE Text Animator Properties` expone 103 propiedades SIEMPRE, existan o no en
// la interfaz. Recorrerlas todas y rechazar las que el motor no aplica produjo 96 lineas NOSOP falsas
// por animador — un exportador que grita sobre lo normal es tan inutil como uno mudo, porque se aprende
// a ignorar.
//
// LA PREGUNTA: cual atributo separa "el autor la agrego" de "existe porque AE la lista siempre".
// Candidatos: enabled, elided, active, isModified, canSetEnabled, propertyDepth, numKeys.
//
// EL EXPERIMENTO: un animador con EXACTAMENTE DOS propiedades agregadas (opacidad y posicion), y el
// volcado de los siete atributos para esas dos y para tres que NO se agregaron. El atributo que valga
// true en las dos y false en las tres es la respuesta; si ninguno separa, se dice y se busca otra via.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/animador7.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/animador7.jsx

var RUTA = "C:/ae-probe/animador7.txt";
function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (e) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("ANIM7");
var NOMBRE = "SONDA-ANIM7";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, 1920, 1080, 1, 2, 30);
var capa = comp.layers.addText("Hola");
var an = capa.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
var props = an.property("ADBE Text Animator Properties");

anotar("TOTAL_ANTES|" + props.numProperties);
props.addProperty("ADBE Text Opacity").setValue(0);
props.addProperty("ADBE Text Position 3D").setValue([0, -40, 0]);
anotar("TOTAL_DESPUES|" + props.numProperties);

// las dos agregadas y tres que no
var MIRAR = ";ADBE Text Opacity;ADBE Text Position 3D;ADBE Text Scale 3D;ADBE Text Blur;ADBE Text Rotation;";
function enLista(lista, que) {
  var partes = lista.split(";"), z;
  for (z = 0; z < partes.length; z++) { if (partes[z] === que) { return true; } }
  return false;
}
function attr(p, nombre) {
  try {
    var v = p[nombre];
    if (v === undefined) { return "undef"; }
    return texto(v);
  } catch (ex) { return "ERR"; }
}

var i;
for (i = 1; i <= props.numProperties; i++) {
  var P = props.property(i);
  if (!enLista(MIRAR, P.matchName)) { continue; }
  anotar("ATRIB|" + P.matchName +
         "|enabled=" + attr(P, "enabled") +
         "|elided=" + attr(P, "elided") +
         "|active=" + attr(P, "active") +
         "|isModified=" + attr(P, "isModified") +
         "|canSetEnabled=" + attr(P, "canSetEnabled") +
         "|numKeys=" + attr(P, "numKeys") +
         "|propertyIndex=" + attr(P, "propertyIndex") +
         "|valor=" + texto(P.value));
}

// Y LA VIA ALTERNATIVA, por si ningun atributo separa: recorrer al reves. Si `props` se puede iterar
// pidiendo solo las que estan en la interfaz por otro camino, aparece aca.
anotar("GRUPO|matchName=" + props.matchName + "|name=" + props.name +
       "|numProperties=" + props.numProperties);

// tercera via: agregar una tercera y ver si el ORDEN cambia (o sea, si las agregadas van primero)
props.addProperty("ADBE Text Rotation").setValue(15);
var primeros = "";
for (i = 1; i <= 8 && i <= props.numProperties; i++) {
  primeros = primeros + props.property(i).matchName + ";";
}
anotar("PRIMEROS_8|" + primeros);

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
