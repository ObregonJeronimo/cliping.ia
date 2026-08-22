// LA PRUEBA DE INTEGRACION: las siete piezas juntas, adentro de AE.
//
// Cada familia se escribio por separado y se verifico contra un banco falso. Eso valida la aritmetica y
// NO valida nada de AE: ningun matchName, ninguna llamada real, ninguna interaccion entre modulos. Un
// matchName inventado no falla en un banco de pruebas — falla en AE, y `addProperty` con uno invalido
// MATA EL ARCHIVO ENTERO, no la linea.
//
// Esto corre de verdad: carga los siete objetos, cuenta lo que exponen, y CONSTRUYE una capa con una
// funcion representativa de cada familia. Lo que no se puede construir se informa con su mensaje.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/gesto/_prueba-integracion.jsx

#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/gesto.jsx"

var RUTA = "C:/ae-probe/prueba-integracion.txt";
var pv = new File(RUTA); if (pv.exists) { pv.remove(); }
function di(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}

var ok = 0, mal = 0;

function cuantas(obj) {
  var n = 0, k;
  for (k in obj) { if (typeof obj[k] === "function") { n++; } }
  return n;
}

function probar(nombre, fn) {
  try {
    var r = fn();
    ok++;
    di("ok  |" + nombre + "|" + (r === undefined ? "construyo" : "construyo · " + r));
  } catch (e) {
    mal++;
    di("MAL |" + nombre + "|" + (e.message ? e.message : e).toString().substring(0, 150));
  }
}

try {
app.beginUndoGroup("PRUEBA-INTEGRACION");

// ---------------------------------------------------------------- los siete objetos existen
var fam = [["G", G], ["Gt", Gt], ["Gf", Gf], ["Ge", Ge], ["Gx", Gx], ["Gc", Gc], ["Gd", Gd]];
var i, total = 0;
for (i = 0; i < fam.length; i++) {
  var o = fam[i][1];
  if (typeof o !== "object" || o === null) {
    mal++; di("MAL |objeto " + fam[i][0] + "| NO se cargo");
    continue;
  }
  var c = cuantas(o);
  total += c;
  ok++;
  di("ok  |objeto " + fam[i][0] + "|" + c + " funciones");
}
di("     total expuesto: " + total + " funciones");
di("");

G.iniciar({ nombre: "PRUEBA-INTEGRACION", cuadros: 180, recursos: "C:/ae-probe/recursos-l" });
var cam = G.camara({ distancia: 2400, profundidad: true, apertura: 12, foco: 0 });

var AZUL = [0.184, 0.420, 1.0];
var TINTA = [0.063, 0.071, 0.086];
var F = "CenturyGothic";

// ---------------------------------------------------------------- G · el nucleo
probar("G.solido + conRebote", function () {
  var s = G.solido("nucleo-caja", AZUL, 160, 160, 400, 300, 0);
  var e = G.ejes(s);
  G.conRebote(e.x, [[0, 200], [14, 700]], { donde: "nucleo-caja" });
  G.plano(s, 0, 180);
  return "con rebote";
});

// ---------------------------------------------------------------- Gt · texto
probar("Gt.partir", function () {
  var r = Gt.partir({ cadena: "Urvid", tam: 90, color: TINTA, fuente: F, x: 960, y: 240, z: 0 });
  return (r.capas ? r.capas.length : "?") + " capas de caracter";
});
probar("Gt.maquinaDeEscribir", function () {
  var r = Gt.maquinaDeEscribir({ cadena: "escribiendo", tam: 60, color: TINTA, fuente: F,
                                 x: 960, y: 380, z: 0, desde: 10, cadaCuadros: 2 });
  return "animador nativo";
});
probar("Gt.golpePorCaracter", function () {
  var r = Gt.golpePorCaracter({ cadena: "GOLPE", tam: 80, color: AZUL, fuente: F,
                                x: 960, y: 500, z: 0, desde: 20 });
  return "cascada de rebotes";
});

// ---------------------------------------------------------------- Gf · formas
probar("Gf.barraQueSeLlena", function () {
  Gf.barraQueSeLlena({ nombre: "barra", color: AZUL, largo: 500, grosor: 14,
                       x: 960, y: 640, z: 0, cuadro: 20, desde: 0, hasta: 1 });
  return "escala desde el ancla";
});
probar("Gf.aplastarYEstirar", function () {
  var s = G.solido("squash", AZUL, 120, 120, 300, 700, 0);
  Gf.aplastarYEstirar({ capa: s, cuadroImpacto: 40, magnitud: 0.18 });
  return "squash and stretch";
});

// ---------------------------------------------------------------- Ge · entradas
probar("Ge.entradaConSobrepaso", function () {
  var s = G.solido("entra", AZUL, 140, 140, 700, 800, 0);
  var ejE = G.ejes(s);
  Ge.entradaConSobrepaso({ capa: s, prop: ejE.y, cuadro: 30, dur: 14, desde: 1000, hasta: 800 });
  return "entrada";
});
probar("Ge.corteSeco", function () {
  var s = G.solido("corte", TINTA, 100, 100, 1200, 800, 0);
  Ge.corteSeco({ capa: s, prop: G.op(s), pasos: [[60, 100], [90, 0], [120, 100]] });
  return "HOLD";
});

// ---------------------------------------------------------------- Gx · transiciones
probar("Gx.destello", function () {
  Gx.destello({ pico: 90, color: [1, 1, 1], subida: 3, bajada: 9 });
  return "destello";
});

// ---------------------------------------------------------------- Gc · espacio
probar("Gc.empuje", function () {
  Gc.empuje({ cam: cam, desde: 20, hasta: 130, recorrido: 0.08 });
  return "push in";
});
probar("Gc.deriva", function () {
  Gc.deriva({ cam: cam, desde: 20, hasta: 130, unidades: 16 });
  return "deriva";
});

// ---------------------------------------------------------------- Gd · detalle
probar("Gd.acuseDeGolpe", function () {
  var s = G.solido("acusa", TINTA, 90, 90, 1500, 300, 0);
  Gd.acuseDeGolpe({ capa: s, cuadro: 50 });
  return "acuse";
});
probar("Gd.sombraDesfasada", function () {
  var s = G.solido("con-sombra", AZUL, 200, 120, 1500, 600, 0);
  Gd.sombraDesfasada({ capa: s, colorTinta: [0.14, 0.16, 0.22], dx: 6, dy: 6 });
  return "sombra dura";
});

var cerrado = G.cerrar();
di("");
di("CAPAS|" + cerrado.capas);
di("TOTAL|" + ok + " ok|" + mal + " mal");
di("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  di("EXPLOTO|" + (elFallo.message ? elFallo.message : elFallo) + "|linea " + (elFallo.line ? elFallo.line : "?"));
  di("--- fin ---");
}
