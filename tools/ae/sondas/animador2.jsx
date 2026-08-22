// EL SELECTOR DEL ANIMADOR DE TEXTO, CARACTER POR CARACTER Y EXACTO.
//
// QUE LE FALTABA A LA SONDA ANTERIOR. `animador.jsx` mide el ACUMULADO: barre el final del rango y lee
// la suma de los factores. Con eso se ve la forma de la curva pero no se puede leer el factor de UN
// caracter dentro de UNA configuracion fija, porque mover el rango cambia la funcion que se mide. Y el
// factor por caracter es exactamente lo que el motor va a tener que calcular.
//
// LA IDEA QUE LO RESUELVE: DOS SELECTORES. El primero es el que se estudia (rango y forma fijos). El
// segundo es un selector por INDICE que aisla un solo caracter, compuesto en modo INTERSECCION. El
// resultado es f1(k) para el caracter k y cero para los demas, asi que el ancho lo entrega directo.
//
// MEDIDO YA, y por eso esta escrito aca en vez de adivinado:
//   · el enum de modos es 1=suma 2=resta 3=INTERSECCION 4=minimo 5=maximo 6=diferencia
//   · el peso de cada caracter NO es uniforme: la interletra se reparte entre los HUECOS (N-1), mitad
//     antes y mitad despues de cada caracter, asi que el primero y el ultimo pesan 50 y el resto 100
//
// Y UNA TRAMPA DE AE QUE COSTO UNA CORRIDA: CAMBIAR LAS UNIDADES INVALIDA LAS REFERENCIAS DE PROPIEDAD
// QUE YA TENIAS. Las propiedades de porcentaje y las de indice son excluyentes y solo un juego esta
// visible por vez; al hacer `unidades.setValue(1)` AE rehace el grupo y toda referencia guardada muere
// con "El objeto no es valido" — treinta lineas mas abajo del cambio que lo causo. Por eso aca NO SE
// CACHEA NINGUNA PROPIEDAD: cada acceso vuelve a buscarla por matchName.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/animador2.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/animador2.jsx

var RUTA = "C:/ae-probe/animador2.txt";
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
app.beginUndoGroup("ANIMADOR2");
var NOMBRE = "SONDA-ANIMADOR2", N = 10, INTER = 100;
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
d.fontSize = 80;
try { d.font = "SegoeUI"; } catch (eF) {}
td.setValue(d);
var BASE = capa.sourceRectAtTime(0, false).width;
function ancho() { return capa.sourceRectAtTime(0, false).width - BASE; }

var anims = capa.property("ADBE Text Properties").property("ADBE Text Animators");
var an = anims.addProperty("ADBE Text Animator");
var sels = an.property("ADBE Text Selectors");
var s1 = sels.addProperty("ADBE Text Selector");
an.property("ADBE Text Animator Properties").addProperty("ADBE Text Tracking Amount").setValue(INTER);

// NADA CACHEADO: cada una vuelve a buscar
function selDe(i) { return sels.property(i); }
function avDe(i) { return selDe(i).property("ADBE Text Range Advanced"); }
function uni(i, v) { avDe(i).property("ADBE Text Range Units").setValue(v); }
function forma(i, v) { avDe(i).property("ADBE Text Range Shape").setValue(v); }
function modo(i, v) { avDe(i).property("ADBE Text Selector Mode").setValue(v); }
function alto(i, v) { avDe(i).property("ADBE Text Levels Max Ease").setValue(v); }
function bajo(i, v) { avDe(i).property("ADBE Text Levels Min Ease").setValue(v); }
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

// ---------------------------------------------------------------- 0 · el peso de cada caracter
uni(1, 2);
forma(1, 1);
var pesos = [], c, lp = "";
for (c = 0; c < N; c++) {
  indice(1, c, c + 1, 0);
  pesos[c] = ancho();
  lp = lp + pesos[c].toFixed(2) + ";";
}
anotar("PESOS|" + lp);

// ---------------------------------------------------------------- 1 · el segundo selector, aislador
indice(1, 0, N, 0);
sels.addProperty("ADBE Text Selector");
uni(2, 2);
forma(2, 1);
indice(2, 3, 4, 0);
var m, huellas = "";
for (m = 1; m <= 6; m++) {
  var ok = "si";
  try { modo(2, m); } catch (eM) { ok = "x"; }
  huellas = huellas + m + "=" + (ok === "si" ? ancho().toFixed(2) : "FALLO") + ";";
}
anotar("MODOS|s1=todo, s2=solo el caracter 3|" + huellas);
var MODO_INTER = 0;
for (m = 1; m <= 6; m++) {
  try {
    modo(2, m);
    if (Math.abs(ancho() - pesos[3]) < 0.5) { MODO_INTER = m; break; }
  } catch (eM2) {}
}
anotar("MODO_INTERSECCION|" + MODO_INTER);

// lee el factor de cada caracter para la configuracion que tenga s1 en ese momento
function factores() {
  var i, s = "";
  for (i = 0; i < N; i++) {
    indice(2, i, i + 1, 0);
    s = s + (ancho() / pesos[i]).toFixed(4) + ";";
  }
  return s;
}

if (MODO_INTER === 0) { anotar("SIN_MODO|no se encontro un modo que aisle"); }
else {
  modo(2, MODO_INTER);

  // -------------------------------------------------------------- 2 · las seis formas, rango entero
  uni(1, 1);
  porciento(1, 0, 100, 0);
  alto(1, 0); bajo(1, 0);
  var f;
  for (f = 1; f <= 6; f++) {
    var puesto = "si";
    try { forma(1, f); } catch (eS) { puesto = "FALLO"; }
    anotar("FACTOR_FORMA|" + f + "|" + (puesto === "si" ? factores() : "FALLO"));
  }

  // -------------------------------------------------------------- 3 · rangos parciales, cuadrada
  // aca se ve que les pasa a los caracteres que caen FUERA del rango, que es el detalle que cambia todo
  var rangos = [[0, 30], [30, 60], [20, 50], [0, 100]], r;
  forma(1, 1);
  for (r = 0; r < rangos.length; r++) {
    porciento(1, rangos[r][0], rangos[r][1], 0);
    anotar("RANGO_CUADRADA|" + rangos[r][0] + "-" + rangos[r][1] + "|" + factores());
  }

  // -------------------------------------------------------------- 4 · rangos parciales, rampa arriba
  forma(1, 2);
  for (r = 0; r < rangos.length; r++) {
    porciento(1, rangos[r][0], rangos[r][1], 0);
    anotar("RANGO_RAMPA|" + rangos[r][0] + "-" + rangos[r][1] + "|" + factores());
  }

  // -------------------------------------------------------------- 5 · el desplazamiento
  var offs = [-50, -25, 0, 25, 50], o;
  forma(1, 2);
  for (o = 0; o < offs.length; o++) {
    porciento(1, 0, 50, offs[o]);
    anotar("DESPLAZ|rampa 0-50 off=" + offs[o] + "|" + factores());
  }

  // -------------------------------------------------------------- 6 · ease alto y bajo
  porciento(1, 0, 100, 0);
  forma(1, 2);
  var pares = [[0, 0], [100, 0], [0, 100], [100, 100], [-100, 0], [0, -100]], pi;
  for (pi = 0; pi < pares.length; pi++) {
    alto(1, pares[pi][0]);
    bajo(1, pares[pi][1]);
    anotar("EASE|alto=" + pares[pi][0] + "|bajo=" + pares[pi][1] + "|" + factores());
  }
  alto(1, 0); bajo(1, 0);

  // -------------------------------------------------------------- 7 · cantidad maxima
  forma(1, 1);
  porciento(1, 0, 100, 0);
  var amts = [100, 50, 0, -50], am, fa = "";
  for (am = 0; am < amts.length; am++) {
    avDe(1).property("ADBE Text Selector Max Amount").setValue(amts[am]);
    indice(2, 3, 4, 0);
    fa = fa + amts[am] + "=>" + (ancho() / pesos[3]).toFixed(4) + ";";
  }
  avDe(1).property("ADBE Text Selector Max Amount").setValue(100);
  anotar("MAX_AMOUNT|" + fa);

  // -------------------------------------------------------------- 8 · el orden aleatorio
  forma(1, 1);
  porciento(1, 0, 30, 0);
  var sem, fs = "";
  for (sem = 0; sem <= 3; sem++) {
    avDe(1).property("ADBE Text Randomize Order").setValue(sem === 0 ? 0 : 1);
    avDe(1).property("ADBE Text Random Seed").setValue(sem);
    fs = fs + "semilla" + sem + "[" + factores() + "] ";
  }
  avDe(1).property("ADBE Text Randomize Order").setValue(0);
  anotar("ALEATORIO|rango 0-30|" + fs);
}

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
