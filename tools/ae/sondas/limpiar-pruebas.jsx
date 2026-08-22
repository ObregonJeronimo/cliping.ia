// SACAR DEL PROYECTO LAS COMPOSICIONES DE SONDA Y DE PRUEBA.
//
// POR QUE HACE FALTA, Y NO ES ORDEN: LAS SONDAS DEJAN EXPRESIONES ROTAS A PROPOSITO.
//
// Varios controles negativos de la biblioteca comprueban que AE avisa de una expresion mal escrita, y
// para eso tienen que ESCRIBIR una expresion mal. `sondas/enlaces.jsx` deja dos: un enlace a una capa
// que no existe y una lectura de efecto por nombre en ingles (que en un AE en espanol falla, porque el
// deslizador se llama "Control del deslizador").
//
// Esas dos expresiones son correctas como prueba y son basura en el proyecto: AE las cuenta en la barra
// naranja de arriba —"Este proyecto contiene errores de expresion"— y quien abre el proyecto no tiene
// forma de saber que son de una prueba y no de su pieza. Peor: acostumbran a ignorar esa barra, que es
// justo la que tiene que avisar cuando algo se rompe de verdad.
//
// NO BORRA NADA QUE NO SEA SUYO. Solo composiciones cuyo nombre empieza con SONDA- o PRUEBA-, que es la
// convencion de este repo. Lo que borra lo dice por nombre, uno por uno.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/limpiar-pruebas.jsx
// SALIDA
//   C:/ae-probe/limpiar-pruebas.txt

var RUTA = "C:/ae-probe/limpiar-pruebas.txt";
var pv = new File(RUTA); if (pv.exists) { pv.remove(); }
function di(t) {
  var f = new File(RUTA);
  f.open("a"); f.encoding = "UTF-8"; f.writeln(t); f.close();
}

try {
app.beginUndoGroup("LIMPIAR-PRUEBAS");

var i, it, borradas = 0, quedan = [];

// SE RECORRE HACIA ATRAS porque `remove()` reindexa la lista de items: yendo hacia adelante se saltea
// uno cada vez que borra.
for (i = app.project.numItems; i >= 1; i--) {
  it = app.project.item(i);
  if (!(it instanceof CompItem)) { continue; }
  if (it.name.indexOf("SONDA-") === 0 || it.name.indexOf("PRUEBA-") === 0) {
    di("BORRO|" + it.name + "|" + it.numLayers + " capas");
    it.remove();
    borradas++;
  }
}

for (i = 1; i <= app.project.numItems; i++) {
  it = app.project.item(i);
  if (it instanceof CompItem) { quedan[quedan.length] = it.name; }
}

// Y SE VUELVE A CONTAR LO QUE QUEDA ROTO, para no tener que creerle a esta herramienta. Si despues de
// limpiar sigue habiendo errores, son de una pieza de verdad y hay que mirarlos.
var rotas = 0, prop, err, j, k, capa, comp2;
function revisarGrupo(grupo, comp3, capa2) {
  var q;
  for (q = 1; q <= grupo.numProperties; q++) {
    var pr = grupo.property(q);
    if (pr.numProperties !== undefined && pr.numProperties > 0 && !(pr.canSetExpression)) {
      revisarGrupo(pr, comp3, capa2);
      continue;
    }
    if (pr.canSetExpression && pr.expressionEnabled) {
      err = "";
      try { err = pr.expressionError; } catch (ex) { err = ""; }
      if (err !== "") {
        rotas++;
        di("SIGUE-ROTA|" + comp3.name + "|" + capa2.name + "|" + pr.name);
      }
    }
  }
}

for (i = 1; i <= app.project.numItems; i++) {
  comp2 = app.project.item(i);
  if (!(comp2 instanceof CompItem)) { continue; }
  for (j = 1; j <= comp2.numLayers; j++) {
    capa = comp2.layer(j);
    for (k = 1; k <= capa.numProperties; k++) {
      var g = capa.property(k);
      if (g.numProperties !== undefined && g.numProperties > 0) { revisarGrupo(g, comp2, capa); }
    }
  }
}

di("");
di("BORRADAS|" + borradas);
di("QUEDAN|" + quedan.length + "|" + quedan.join(", "));
di("EXPRESIONES-ROTAS|" + rotas);
di("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  di("ERROR|" + (elFallo.message ? elFallo.message : elFallo).toString() +
     "|linea " + (elFallo.line ? elFallo.line : "?"));
  di("--- fin ---");
}
