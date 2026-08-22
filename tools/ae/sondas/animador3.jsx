// LO QUE QUEDO SIN RESOLVER DEL SELECTOR, medido con resolucion suficiente para AJUSTAR una funcion.
//
// LO YA RESUELTO (animador2.jsx), verificado al cuarto decimal:
//   · el caracter k se muestrea en su CENTRO: p = (k + 0,5) / N
//   · cuadrada = 1 dentro del rango; rampa arriba = (p-ini)/(fin-ini) con 1 PASANDO EL FINAL y 0 antes
//     del inicio; rampa abajo = su espejo; triangulo = 1 - |2u - 1|
//   · el desplazamiento corre inicio y fin en off/100
//   · la cantidad maxima es un multiplicador lineal (50 -> 0,5; -50 -> -0,5)
//   · el ease es una bezier cubica con P1 = (easeBajo/100, 0) y P2 = (1 - easeAlto/100, 1)
//
// LO QUE FALTA, y por que hace falta esta sonda:
//   A  las formas REDONDA (5) y SUAVE (6). Con diez caracteres hay diez muestras de la curva y eso no
//      alcanza para distinguir entre candidatas parecidas: probe circulo, seno, smoothstep y
//      smootherstep contra la forma 6 y las cuatro fallan en el tercer decimal. Con cuarenta muestras
//      se puede ajustar de verdad, o al menos guardar la curva medida.
//   B  el EASE NEGATIVO. La bezier que explica el ease positivo predice 0,5502 donde AE mide 0,6464,
//      asi que la extension a valores negativos NO es "el mismo punto de control mas alla de 1". Se
//      barre en pasos de 25 para ver la familia entera en vez de dos puntos sueltos.
//   C  el ORDEN ALEATORIO. En la sonda anterior `ADBE Text Randomize Order` fallo con "la propiedad o
//      una propiedad primaria esta oculta". Aca se lista el grupo entero antes de tocar nada, para ver
//      de que depende su visibilidad en vez de adivinarlo.
//
// LO QUE NO SE RESUELVA ACA SE RECHAZA EN EL EXPORTADOR, con nombre y motivo. Es la regla que este
// repo aprendio a los golpes: una limitacion que no es un rechazo de maquina no existe.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/animador3.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/animador3.jsx

var RUTA = "C:/ae-probe/animador3.txt";
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
app.beginUndoGroup("ANIMADOR3");
var NOMBRE = "SONDA-ANIMADOR3", N = 40, INTER = 100;
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
d.fontSize = 20;
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

uni(1, 2); forma(1, 1);
var pesos = [], c;
for (c = 0; c < N; c++) { indice(1, c, c + 1, 0); pesos[c] = ancho(); }
anotar("PESOS|primero=" + pesos[0].toFixed(2) + "|medio=" + pesos[Math.floor(N/2)].toFixed(2) +
       "|ultimo=" + pesos[N-1].toFixed(2));

indice(1, 0, N, 0);
sels.addProperty("ADBE Text Selector");
uni(2, 2); forma(2, 1); modo(2, 3);          // 3 = interseccion, medido en animador2
function factores() {
  var i, s = "";
  for (i = 0; i < N; i++) {
    indice(2, i, i + 1, 0);
    s = s + (ancho() / pesos[i]).toFixed(5) + ";";
  }
  return s;
}

// ---------------------------------------------------------------- A · las formas, con 40 muestras
uni(1, 1);
porciento(1, 0, 100, 0);
alto(1, 0); bajo(1, 0);
var f;
for (f = 1; f <= 6; f++) {
  var ok = "si";
  try { forma(1, f); } catch (eS) { ok = "FALLO"; }
  anotar("FORMA" + f + "|" + (ok === "si" ? factores() : "FALLO"));
}

// ---------------------------------------------------------------- B · el ease, barrido completo
forma(1, 2);
porciento(1, 0, 100, 0);
var vals = [-100, -75, -50, -25, 0, 25, 50, 75, 100], vi;
for (vi = 0; vi < vals.length; vi++) {
  alto(1, vals[vi]); bajo(1, 0);
  anotar("EASE_ALTO|" + vals[vi] + "|" + factores());
}
alto(1, 0);
for (vi = 0; vi < vals.length; vi++) {
  bajo(1, vals[vi]);
  anotar("EASE_BAJO|" + vals[vi] + "|" + factores());
}
alto(1, 0); bajo(1, 0);

// ---------------------------------------------------------------- C · el orden aleatorio
// se lista el grupo ENTERO con su visibilidad antes de tocar nada
var av = avDe(1), k, listado = "";
for (k = 1; k <= av.numProperties; k++) {
  var pr = av.property(k);
  var vv = "?", oculta = "?";
  try { vv = texto(pr.value); } catch (e1) { vv = "<grupo>"; }
  try { oculta = texto(pr.canSetExpression) + "/" + texto(pr.elided); } catch (e2) { oculta = "?"; }
  listado = listado + pr.matchName + "=" + vv + "(" + oculta + ");";
}
anotar("GRUPO|" + listado);

// probar a encenderlo con cada juego de unidades, para ver de que depende
var uu;
for (uu = 1; uu <= 2; uu++) {
  uni(1, uu);
  var res = "si";
  try { avDe(1).property("ADBE Text Randomize Order").setValue(1); }
  catch (e3) { res = "FALLO: " + texto(e3.message ? e3.message : e3); }
  anotar("ALEATORIO_UNIDADES|" + uu + "|" + res);
  if (res === "si") {
    var sem;
    for (sem = 0; sem <= 2; sem++) {
      avDe(1).property("ADBE Text Random Seed").setValue(sem);
      if (uu === 1) { porciento(1, 0, 25, 0); } else { indice(1, 0, Math.round(N / 4), 0); }
      forma(1, 1);
      anotar("ALEATORIO|unidades=" + uu + "|semilla=" + sem + "|" + factores());
    }
    try { avDe(1).property("ADBE Text Randomize Order").setValue(0); } catch (e4) {}
  }
}

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
