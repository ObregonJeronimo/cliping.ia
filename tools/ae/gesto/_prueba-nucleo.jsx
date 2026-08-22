// EL CONTROL NEGATIVO DEL NUCLEO: cada negativa tiene que DISPARARSE cuando corresponde.
//
// Una biblioteca cuyas compuertas no saltan es peor que no tener biblioteca: da una sensacion de
// seguridad que no existe. Es la misma idea que el control negativo de `fuentes-skia.mjs` — si el
// instrumento no puede fallar, pasar la prueba no significa nada.
//
// Cada caso construye a proposito el defecto que la ley prohibe y exige que el nucleo TIRE. Y despues
// hay casos POSITIVOS, porque una biblioteca que tira siempre tampoco sirve.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/gesto/_prueba-nucleo.jsx

#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/nucleo.jsx"

var RUTA = "C:/ae-probe/prueba-nucleo.txt";
var pv = new File(RUTA); if (pv.exists) { pv.remove(); }
function di(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}

var ok = 0, mal = 0;

// espera que `fn` TIRE, y que el mensaje contenga `pista`
function debeTirar(nombre, pista, fn) {
  var tiro = false, msg = "";
  try { fn(); } catch (e) { tiro = true; msg = e.message ? e.message : String(e); }
  if (!tiro) { mal++; di("MAL |" + nombre + "| NO tiro, y tenia que tirar"); return; }
  if (pista && msg.indexOf(pista) < 0) {
    mal++; di("MAL |" + nombre + "| tiro pero el mensaje no menciona '" + pista + "': " + msg.substring(0, 110));
    return;
  }
  ok++; di("ok  |" + nombre + "| " + msg.substring(0, 96));
}
function debeAndar(nombre, fn) {
  try { fn(); ok++; di("ok  |" + nombre + "| construyo sin tirar"); }
  catch (e) { mal++; di("MAL |" + nombre + "| tiro y NO tenia que tirar: " + (e.message ? e.message : e)); }
}

try {
app.beginUndoGroup("PRUEBA-NUCLEO");

G.iniciar({ nombre: "PRUEBA-NUCLEO", cuadros: 120, recursos: "C:/ae-probe/recursos-l" });

var s = G.solido("sujeto", [0.2, 0.5, 1], 200, 200, 960, 540, 0);
var ej = G.ejes(s);

// ---------------------------------------------------------------- claves
debeTirar("clave a mitad de cuadro", "cuadro entero", function () {
  G.claves(G.op(s), [[0, 0], [10.5, 100]]);
});
debeTirar("claves fuera de orden", "fuera de orden", function () {
  G.claves(G.op(s), [[20, 0], [10, 100]]);
});
debeTirar("curva inventada", "curva desconocida", function () {
  G.claves(G.op(s), [[0, 0, "C9"], [10, 100]]);
});
debeAndar("claves lineales normales", function () {
  G.claves(G.op(s), [[0, 0], [10, 100], [110, 100]]);
});

// ---------------------------------------------------------------- el rebote
debeTirar("rebote con una sola clave", "dos claves", function () {
  G.conRebote(ej.x, [[0, 960]], { donde: "una-sola" });
});
debeTirar("rebote con curva SUAVE", "van LINEALES", function () {
  G.conRebote(ej.x, [[0, 500], [30, 960, "SUAVE"]], { donde: "con-ease" });
});
// 60 px en 60 cuadros = 30 u/s -> sobrepaso 0,9 con los numeros por defecto: por debajo del piso de 4
debeTirar("rebote demasiado lento", "demasiado LENTO", function () {
  G.conRebote(ej.y, [[0, 500], [60, 560]], { donde: "lento" });
});
// 400 px en 14 cuadros = 857 u/s -> sobrepaso 25,7: entra holgado
debeAndar("rebote con velocidad suficiente", function () {
  G.conRebote(ej.x, [[0, 560], [14, 960]], { donde: "rapido" });
});

// ---------------------------------------------------------------- tipografia
debeTirar("familia inexistente", "NO existe", function () {
  G.rotulo({ cadena: "hola", fuente: "FuenteQueNoExisteZZZ", tam: 60, x: 960, y: 300 });
});
debeAndar("familia que si esta", function () {
  G.rotulo({ cadena: "hola", fuente: "CenturyGothic", tam: 60, x: 960, y: 300, nombre: "rotulo-ok" });
});

// ---------------------------------------------------------------- recursos
debeTirar("recurso que no esta", "falta el recurso", function () {
  G.img("no-existe-este-png", "x", 960, 540, 0, 50);
});

// ---------------------------------------------------------------- camara y foco
G.camara({ distancia: 2400, profundidad: true, apertura: 60, foco: 0 });
debeTirar("capa detras de la camara", "DETRAS de la camara", function () {
  G.revisarFoco(-2500, 60, 0, "muy-cerca");
});
debeAndar("foco dentro del limite", function () {
  var coc = G.revisarFoco(300, 12, 0, "cerca");
  if (coc > 24) { throw new Error("deberia estar por debajo de 24 y dio " + coc); }
});

// ---------------------------------------------------------------- el obturador es opt-in
debeTirar("obturador sin motivo escrito", "motivoObturador", function () {
  G.iniciar({ nombre: "PRUEBA-OBT", cuadros: 30, obturador: true });
});

// ---------------------------------------------------------------- utilidades que tienen que dar bien
debeAndar("avances de caracter", function () {
  var a = G.avances("Urvid", 120, "CenturyGothic");
  if (a.anchos.length !== 5) { throw new Error("esperaba 5 anchos y dio " + a.anchos.length); }
  if (a.total < 100) { throw new Error("el total da muy chico: " + a.total); }
  di("     avances: " + a.anchos.join(", ") + " · total " + Math.round(a.total));
});
debeAndar("escala para cubrir el cuadro", function () {
  var e = G.escalaParaCubrir(2600, 1600, 900, 1.25);
  if (e < 100 || e > 400) { throw new Error("escala rara: " + e); }
  di("     un PNG de 2600x1600 a z=900 necesita " + e + "% para cubrir");
});
debeAndar("la formula del sobrepaso", function () {
  var v = G.sobrepasoDe(1416.9, 0.06, 1.8, 5);
  if (Math.abs(v - 42.4) > 1.5) { throw new Error("esperaba ~42,4 y dio " + v); }
  di("     v=1416,9 u/s con 0,06/1,8/5 -> sobrepaso " + (Math.round(v * 10) / 10) + " px (medido en el proyecto del usuario: 42,4)");
});

// ---------------------------------------------------------------- tramos con tipos mezclados
//
// CONTROL NEGATIVO DE LA COMPUERTA DE TRAMOS. Sin esto no probe nada: una comprobacion que nunca vi
// fallar es una comprobacion que creo que anda. El defecto se FABRICA — se escriben las claves bien y
// despues se pisa un tipo a mano, que es exactamente lo que hacia la rama LINEAL de `claves()`.
debeTirar("tramo mezclado fabricado a mano", "tipos mezclados", function () {
  G.iniciar({ nombre: "PRUEBA-MEZCLA", cuadros: 60 });
  var cp = G.solido("mezcla", [1, 0, 0], 100, 100, 960, 540, 0);
  var pr = G.ejes(cp).y;
  var li = [[0, 540, "C1"], [12, 700, "C1"], [24, 540, "C1"]];
  G.claves(pr, li, "mezcla");
  // se ensucia el lado ENTRANTE de la clave del medio: el tramo 0->12 queda bezier contra lineal.
  // Y SE COMPRUEBA CON `revisarTramos`, NO llamando a `claves()` de nuevo: `claves()` reescribe todos
  // los tipos antes de mirarlos, asi que repararia el defecto y la prueba pasaria sin probar nada.
  // Es el error que esta version corrige — la anterior daba "NO tiro, y tenia que tirar".
  pr.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR,
                               pr.keyOutInterpolationType(2));
  G.revisarTramos(pr, li, "mezcla");
});

// y el caso legitimo que NO tiene que tirar: lineal y bezier ALTERNADOS, cada tramo entero de un tipo.
// Es la forma del ecualizador (ataque con curva, caida lineal) y es la que el arreglo del nucleo salvo.
debeAndar("lineal y bezier alternados, cada tramo entero", function () {
  G.iniciar({ nombre: "PRUEBA-ALTERNA", cuadros: 60 });
  var cp2 = G.solido("alterna", [0, 1, 0], 100, 100, 960, 540, 0);
  G.claves(G.ejes(cp2).y,
           [[0, 540, "C7"], [6, 300, "C1"], [12, 540, "LINEAL"],
            [18, 540, "C7"], [24, 300, "C1"], [30, 540, "LINEAL"], [36, 540]], "alterna");
});

// ---------------------------------------------------------------- EXPRESIONES Y ENLACES
//
// Los cuatro controles negativos de abajo existen porque AE NO AVISA de ninguno de los cuatro casos.
// Una expresion rota la deshabilita y devuelve el valor de abajo; un ciclo devuelve un valor por
// defecto sin error. Si estas guardas no estuvieran, los dos defectos se descubririan mirando el video.

debeAndar("control con deslizadores, leidos por indice", function () {
  G.iniciar({ nombre: "PRUEBA-CTRL", cuadros: 60 });
  var c = G.control({ nombre: "mando", valores: { beat: 12, energia: 0.8 } });
  if (c.indice("beat") !== 1) { throw new Error("beat deberia ser el indice 1 y dio " + c.indice("beat")); }
  if (c.indice("energia") !== 2) { throw new Error("energia deberia ser 2 y dio " + c.indice("energia")); }
  // la lectura es POR INDICE: en un AE en espanol el deslizador se llama "Control del deslizador",
  // asi que leerlo por nombre romperia al cambiar de idioma
  if (c.leer("beat").indexOf("effect(1)(1)") < 0) {
    throw new Error("la lectura tendria que ser por indice y dio: " + c.leer("beat"));
  }
  var s = G.solido("usa-el-mando", [1, 0, 0], 40, 40, 200, 150, 0);
  G.expresion(G.op(s), "value * 0 + " + c.leer("beat") + " * 5;", "usa-el-mando");
  var v = G.op(s).valueAtTime(0, false);
  if (Math.abs(v - 60) > 0.01) { throw new Error("esperaba 60 (12 * 5) y dio " + v); }
  di("     el deslizador 'beat' vale 12 y la capa leyo " + v + " (12 x 5)");
});

debeAndar("enlazar una capa con otra", function () {
  G.iniciar({ nombre: "PRUEBA-ENL", cuadros: 60 });
  var lider = G.solido("lider", [1, 0, 0], 40, 40, 100, 150, 0);
  G.claves(G.ejes(lider).x, [[0, 100], [30, 400]], "lider");
  var sigue = G.solido("sigue", [0, 1, 0], 40, 40, 100, 220, 0);
  G.enlazar({ capa: sigue, prop: G.ejes(sigue).x, a: lider, deQue: "posX", offset: 50, donde: "prueba" });
  var v0 = G.ejes(sigue).x.valueAtTime(0, false);
  var v1 = G.ejes(sigue).x.valueAtTime(1, false);
  if (Math.abs(v0 - 150) > 1) { throw new Error("en t=0 esperaba 150 y dio " + v0); }
  if (Math.abs(v1 - 450) > 1) { throw new Error("en t=1 esperaba 450 y dio " + v1); }
  di("     el lider va de 100 a 400 y el enlazado (offset 50) dio " + Math.round(v0) + " -> " + Math.round(v1));
});

debeAndar("seguidor con retardo", function () {
  G.iniciar({ nombre: "PRUEBA-SEG", cuadros: 60 });
  var lider = G.solido("jefe", [1, 0, 0], 40, 40, 100, 150, 0);
  G.claves(G.ejes(lider).x, [[0, 0], [30, 300]], "jefe");
  var atras = G.solido("atras", [0, 0, 1], 40, 40, 100, 220, 0);
  G.seguir({ capa: atras, lider: lider, retardo: 6, ejes: ["x"], donde: "prueba" });
  // en el cuadro 30 el lider esta en 300; el seguidor con 6 de retardo tiene que estar donde el lider
  // estaba en el cuadro 24, que con claves por defecto no es 240 exacto pero si claramente menor
  var vs = G.ejes(atras).x.valueAtTime(1, false);
  var vl = G.ejes(lider).x.valueAtTime(1, false);
  if (!(vs < vl - 10)) { throw new Error("el seguidor deberia ir DETRAS: lider " + vl + ", seguidor " + vs); }
  di("     en t=1 el lider esta en " + Math.round(vl) + " y el seguidor en " + Math.round(vs));
});

debeTirar("expresion rota", "expresion rota", function () {
  G.iniciar({ nombre: "PRUEBA-EXPR-MALA", cuadros: 30 });
  var s = G.solido("mala", [1, 0, 0], 40, 40, 200, 150, 0);
  G.expresion(G.op(s), 'thisComp.layer("no-existe-esta-capa").transform.opacity;', "mala");
});

debeTirar("enlace circular", "circular", function () {
  G.iniciar({ nombre: "PRUEBA-CICLO", cuadros: 30 });
  var a1 = G.solido("ca", [1, 0, 0], 40, 40, 100, 150, 0);
  var b1 = G.solido("cb", [0, 1, 0], 40, 40, 200, 150, 0);
  G.enlazar({ capa: a1, prop: G.ejes(a1).y, a: b1, deQue: "posY", donde: "ida" });
  G.enlazar({ capa: b1, prop: G.ejes(b1).y, a: a1, deQue: "posY", donde: "vuelta" });
});

debeTirar("retardo fuera de la banda", "2-8", function () {
  G.iniciar({ nombre: "PRUEBA-RET", cuadros: 30 });
  var l2 = G.solido("l2", [1, 0, 0], 40, 40, 100, 150, 0);
  var s2 = G.solido("s2", [0, 1, 0], 40, 40, 200, 150, 0);
  G.seguir({ capa: s2, lider: l2, retardo: 20, ejes: ["x"], donde: "prueba" });
});

debeTirar("deslizador que no existe", "no tiene", function () {
  G.iniciar({ nombre: "PRUEBA-CTRL2", cuadros: 30 });
  var c2 = G.control({ nombre: "mando2", valores: { beat: 12 } });
  c2.leer("energia");
});

di("");
di("TOTAL|" + ok + " ok|" + mal + " mal");
di("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  di("EXPLOTO|" + (elFallo.message ? elFallo.message : elFallo) + "|linea " + (elFallo.line ? elFallo.line : "?"));
  di("--- fin ---");
}
