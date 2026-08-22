// EL TECLEO: la forma cuadrada con rangos FRACCIONARIOS, y la suavidad.
//
// POR QUE ESTA SONDA EXISTE. Todas las mediciones anteriores usaron rangos que caen en bordes enteros
// de caracter (0-30 y 30-60 sobre diez caracteres son exactamente 0-3 y 3-6). En esos puntos DOS
// modelos distintos dan el mismo numero:
//
//   · muestreo del CENTRO   f = 1 si el centro del caracter cae dentro del rango
//   · cobertura de CELDA    f = cuanto del intervalo [i, i+1] esta cubierto por el rango
//
// Y la diferencia no es academica: es EXACTAMENTE el caso de uso principal. Un tecleo se anima moviendo
// el final del rango de 0 a 100 con el tiempo, o sea pasando por todos los valores fraccionarios. Con
// muestreo del centro cada letra aparece de golpe; con cobertura de celda cada letra se DESVANECE a lo
// largo de un paso entero. Uno es un tecleo y el otro es una cortina.
//
// Y HAY UN TERCER PARAMETRO QUE NADIE MIDIO: `ADBE Text Selector Smoothness`, que vale 100 por defecto.
// Si a 100 la forma cuadrada mezcla a lo largo de un paso, entonces el corte seco del tecleo NO es lo
// que sale por defecto y hay que ponerlo en 0 a mano. Eso cambia como se autora la pieza.
//
// Se barre el final del rango en pasos de un cuarto de caracter y se lee el factor de cada uno.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/animador5.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/animador5.jsx

var RUTA = "C:/ae-probe/animador5.txt";
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
app.beginUndoGroup("ANIMADOR5");
var NOMBRE = "SONDA-ANIMADOR5", N = 8, INTER = 100;
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, 1920, 1080, 1, 2, 30);

var cadena = "", q;
for (q = 0; q < N; q++) { cadena = cadena + "H"; }
var capa = comp.layers.addText(cadena);
var td = capa.property("ADBE Text Properties").property("ADBE Text Document");
var d = td.value;
d.fontSize = 40;
try { d.font = "SegoeUI"; } catch (eF) {}
td.setValue(d);
var BASE = capa.sourceRectAtTime(0, false).width;
function ancho() { return capa.sourceRectAtTime(0, false).width - BASE; }

var anims = capa.property("ADBE Text Properties").property("ADBE Text Animators");
var an = anims.addProperty("ADBE Text Animator");
var sels = an.property("ADBE Text Selectors");
sels.addProperty("ADBE Text Selector");
an.property("ADBE Text Animator Properties").addProperty("ADBE Text Tracking Amount").setValue(INTER);

function selDe(i) { return sels.property(i); }
function avDe(i) { return selDe(i).property("ADBE Text Range Advanced"); }
function uni(i, v) { avDe(i).property("ADBE Text Range Units").setValue(v); }
function forma(i, v) { avDe(i).property("ADBE Text Range Shape").setValue(v); }
function modo(i, v) { avDe(i).property("ADBE Text Selector Mode").setValue(v); }
function suave(i, v) { avDe(i).property("ADBE Text Selector Smoothness").setValue(v); }
function porciento(i, a, b, off) {
  selDe(i).property("ADBE Text Percent Start").setValue(a);
  selDe(i).property("ADBE Text Percent End").setValue(b);
  selDe(i).property("ADBE Text Percent Offset").setValue(off);
}
function indice(i, a, b, off) {
  selDe(i).property("ADBE Text Index Start").setValue(a);
  selDe(i).property("ADBE Text Index End").setValue(b);
  selDe(i).property("ADBE Text Index Offset").setValue(off);
}

uni(1, 2); forma(1, 1);
var pesos = [], c;
for (c = 0; c < N; c++) { indice(1, c, c + 1, 0); pesos[c] = ancho(); }
indice(1, 0, N, 0);
sels.addProperty("ADBE Text Selector");
uni(2, 2); forma(2, 1); modo(2, 3);
function factores() {
  var i, s = "";
  for (i = 0; i < N; i++) {
    indice(2, i, i + 1, 0);
    s = s + (ancho() / pesos[i]).toFixed(5) + ";";
  }
  return s;
}

anotar("SUAVIDAD_POR_DEFECTO|" + texto(avDe(1).property("ADBE Text Selector Smoothness").value));

// EL BARRIDO DEL TECLEO: el final del rango va de 0 a 100 en pasos de un cuarto de caracter.
// Con ocho caracteres, un caracter son 12,5 puntos porcentuales, asi que el paso es 3,125.
uni(1, 1);
forma(1, 1);
var suavidades = [100, 50, 0], sv;
for (sv = 0; sv < suavidades.length; sv++) {
  var puesto = "si";
  try { suave(1, suavidades[sv]); } catch (eSm) { puesto = "FALLO " + texto(eSm.message ? eSm.message : eSm); }
  if (puesto !== "si") { anotar("SUAVIDAD|" + suavidades[sv] + "|" + puesto); continue; }
  // PASOS DE UN CUARTO DE CARACTER. Con medio caracter la cobertura solo tomaba los valores 0, 0,5 y
  // 1, y a esos tres la formula de suavidad 50 y la de 100 dan LO MISMO: el barrido no discriminaba
  // entre las dos justo donde habia que distinguirlas. Con un cuarto aparecen 0,25 y 0,75, que es
  // donde las dos se separan.
  var paso;
  for (paso = 0; paso <= 8; paso++) {
    var fin = paso * 100 / 32;          // un cuarto de caracter por paso
    porciento(1, 0, fin, 0);
    anotar("TECLEO|suavidad=" + suavidades[sv] + "|fin=" + fin.toFixed(4) + "|" + factores());
  }
}

// y lo mismo con la RAMPA, para ver si la suavidad la toca o es solo de la cuadrada
suave(1, 100);
forma(1, 2);
var paso2;
for (paso2 = 0; paso2 <= 8; paso2 += 2) {
  porciento(1, 0, paso2 * 100 / 16, 0);
  anotar("RAMPA_SUAVE100|fin=" + (paso2 * 100 / 16).toFixed(3) + "|" + factores());
}
suave(1, 0);
for (paso2 = 0; paso2 <= 8; paso2 += 2) {
  porciento(1, 0, paso2 * 100 / 16, 0);
  anotar("RAMPA_SUAVE0|fin=" + (paso2 * 100 / 16).toFixed(3) + "|" + factores());
}

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
