// ================================================================================================
// PIEZA-N · 21 segundos · URVID — estructura propia, ritmo del corpus
// ================================================================================================
//
// DE DONDE SALE CADA DECISION
//
// El RITMO sale del corpus de nueve avisos del genero (`reference/gramatica-del-genero.md`), no de una
// sola referencia: con una muestra, "asi se hace en el genero" y "asi lo hizo este aviso" dan el mismo
// dato, y eso ya costo la PIEZA-H entera.
//
//   · cambios abruptos     0,20 a 0,69 /s           esta pieza: 6 en 21 s = 0,29
//   · entrada de rotulo    x1,00 a x1,30            esta pieza: x1,22 y el resto en x1,00
//   · gesto grande         3x a 25x, 1-3 por pieza  esta pieza: UNO, x3,8, sobre el remate
//   · silencio mas largo   2,13 a 8,18 s            esta pieza: 2,4 s
//
// El CONTENIDO es Urvid, y no hay una sola cifra inventada — que es lo que se aprendio de la PIEZA-M
// ("aparece un texto que dice 100% sin ningun sentido"). Lo unico que la pieza afirma, "cuatro piezas
// de una sola pagina", se verifica mirandola: los cuatro paneles del cierre son cuatro recortes de una
// misma captura.
//
// ================================================================================================
// LAS TRES TECNICAS QUE ANTES NO ESTABAN, y que son la diferencia real
// ================================================================================================
//
//   1. ALGO SE ESCRIBE SOLO. Es una ley del motor: "lo que representa contenido GENERADO tiene que
//      verse generarse". Una pieza que dice "pedile algo" y muestra el pedido ya escrito ensena el
//      DESPUES sin el DURANTE y se contradice sola. Va con `Gt.maquinaDeEscribir`, que usa un animador
//      de texto: UNA capa, no 28.
//
//   2. HAY ESTADOS QUE SE COMPLETAN. Tres filas que terminan de a una, cada una encendiendo su tilde,
//      con un aro girando en la que esta en curso. El tilde va en CAPA APARTE — ley L23: un PNG plano
//      tiene UN estado, y horneado dentro de la fila ninguna animacion podria encenderlo.
//
//   3. LOS FONDOS SON MALLAS. Un degradado lineal siempre tiene una direccion y se lee como una
//      direccion; la malla son manchas radiales grandes superpuestas, no tiene direccion, y por eso se
//      lee como luz.
//
// ================================================================================================
// FICHA DE ARTE
// ================================================================================================
// FAMILIA      producto luminoso, tres mundos: malla calida donde se pide, claro donde se trabaja,
//              degradado a sangre donde se muestra el resultado.
// PALETA       papel #FBFCFE · tinta #0B0B0F · gris #6B7280
//              y UN DEGRADADO como acento, no un color: #3B7BF7 -> #B24BE0 -> #E0409A
// LUZ          plana en los actos de trabajo; sombra horneada bajo cada panel en el cierre, que es lo
//              unico que los despega del degradado.
// FORMA        el rectangulo de esquina muy redondeada: es caja, es fila, es panel y es isotipo.
// TIPOGRAFIA   Segoe UI 600 rellena con el degradado, horneada en PNG porque AE no rellena texto con
//              degradado y el motor no tiene efectos. El cuerpo se DESPEJA de la tinta objetivo.
// PROFUNDIDAD  camara con perspectiva; los paneles del cierre viven en Z distintos y girados.
// SIMBOLO      la pagina que se convierte. Se pide, se procesa, y se muestra hecha cuatro piezas.
//
// ================================================================================================
// LOS SIETE PLANOS
// ================================================================================================
//  1    0- 70   "tu web" entra x1,22 sobre la malla calida
//  2   70-150   la caja aparece y el pedido SE ESCRIBE SOLO
//  3  150-210   el boton entra y acusa el golpe cuando el pedido termina
//  4  210-330   tres estados se completan de a uno, con su tilde y su aro girando
//  5  330-400   EL GESTO GRANDE: el remate entra x3,8 sobre el tejido
//  6  400-520   los cuatro paneles salen en abanico
//  7  520-630   la marca
//
// ================================================================================================
// USO
//   node tools/ae/recursos-n.mjs && node tools/ae/recursos-n2.mjs
//   node tools/ae/es3-check.mjs tools/ae/sondas/pieza-n.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-n.jsx
//   printf 'PIEZA-N' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/pieza-n.json
// ================================================================================================

#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/gesto.jsx"

var RUTA = "C:/ae-probe/pieza-n.txt";
var pv = new File(RUTA); if (pv.exists) { pv.remove(); }
function di(t) {
  var f = new File(RUTA);
  f.open("a"); f.encoding = "UTF-8"; f.writeln(t); f.close();
}

try {
G.iniciar({ nombre: "PIEZA-N", cuadros: 630, ancho: 1920, alto: 1080, fps: 30,
            recursos: "C:/ae-probe/recursos-n", fondo: [0.984, 0.988, 0.996] });

var TINTA  = [0.043, 0.043, 0.059];
var ACENTO = [0.700, 0.294, 0.878];

// LOS SIETE PLANOS. 6 cortes en 21 s = 0,29/s, adentro de la banda 0,20-0,69 del corpus.
// EL BEAT SE ACORTO Y EL PRIMER PLANO ES EL QUE MAS. Dicho por el usuario: "el primer texto de 'tu
// web' se queda ahi por 2 segundos enteros antes de pasar a lo siguiente". Tenia razon y el numero lo
// confirma: la quietud medida en el corpus es de 0,30 a 0,70 s por rotulo, y yo le habia dado 1,8.
// Ahora el plano 1 dura 48 cuadros (1,6 s) con 0,63 s de quietud, que es la mediana del genero.
var C = [0, 48, 128, 196, 322, 396, 516, 630];

var cam = G.camara({ distancia: 2200, profundidad: true, apertura: 9, foco: 0 });

// los arranques declarados, para que se pueda comprobar que la camara no coincide con ninguno
Gc.eventos([4, 48, 66, 128, 154, 206, 240, 274, 324, 396, 426, 516, 538, 558]);

var mando = G.control({
  nombre: "mando",
  valores: { entradaChica: 1.22, entradaGrande: 3.8, retardoFila: 34 }
});

// ================================================================================================
// LOS TRES MUNDOS
// ================================================================================================
var malla = G.img("n-malla-a", "deco-malla", 960, 540, 900,
                  G.escalaParaCubrir(1920, 1080, 900, 1.08));
G.plano(malla, 0, C[3] + 4);

var claro = G.img("n-fondo", "deco-claro", 960, 540, 900,
                  G.escalaParaCubrir(1920, 1080, 900, 1.08));
G.op(claro).setValue(0);
G.plano(claro, C[3] - 2, C[5] + 4);

var grad = G.img("n-grad", "deco-grad", 960, 540, 900,
                 G.escalaParaCubrir(1920, 1080, 900, 1.08));
G.op(grad).setValue(0);
G.plano(grad, C[5] - 2, 630);

// EL RELEVO ENTRE MUNDOS VA EN CORTE SECO Y DEBAJO DE LA BANDA. Un fundido entre dos fondos de pantalla
// completa se lee como un error de render; un corte tapado por algo que cruza se lee como un cambio de
// plano, que es lo que es.
G.claves(G.op(claro), [[C[3], 0, "HOLD"], [C[3] + 2, 100, "HOLD"], [C[5], 100, "HOLD"], [C[5] + 2, 0]], "claro-relevo");
G.claves(G.op(grad),  [[C[5], 0, "HOLD"], [C[5] + 2, 100]], "grad-relevo");

// el tejido de palabra repetida: la superficie del acto grande
var tejido = G.img("n-tejido", "deco-tejido", 960, 540, 620,
                   G.escalaParaCubrir(3840, 2160, 620, 1.06));
G.op(tejido).setValue(0);
G.claves(G.op(tejido), [[C[4] - 8, 0, "C1"], [C[4] + 8, 100, "C6"], [C[5] - 14, 100, "C3"], [C[5] - 2, 0]], "tejido-op");
var ejTej = G.ejes(tejido);
G.claves(ejTej.x, [[C[4] - 8, 900, "LINEAL"], [C[5], 1030]], "tejido-deriva-x");
G.claves(ejTej.y, [[C[4] - 8, 520, "LINEAL"], [C[5], 566]], "tejido-deriva-y");
G.plano(tejido, C[4] - 8, C[5]);

G.grano(["m-grano-1", "m-grano-2", "m-grano-3"], 22, 2);

// ================================================================================================
// PLANO 1 · 0-70 — "tu web"
// ================================================================================================
//
// x1,22 y no mas. La mediana del corpus es x1,08 y el techo x1,30; el gesto grande de esta pieza es UNO
// y va en el plano 5. En la PIEZA-H se le puso a los once titulares y el usuario lo llamo un salto.
// ENTRA POR TRASLACION, NO POR ESCALA, y me lo dijo la biblioteca antes que el corpus.
//
// `conRebote` se nego: de x1,22 sobre una escala de 30 el recorrido son 6,6 unidades en 9 cuadros, o
// sea 22 u/s, y con eso el sobrepaso da 0,66 contra un piso de 2. No hay rebote posible en un gesto de
// escala tan chico — y forzarlo a 3 cuadros para que "entre en el piso" seria acomodar el gesto a la
// compuerta en vez de elegir el gesto correcto.
//
// El corpus ya tenia la respuesta: la entrada tipica del genero NO es una escala. Es una TRASLACION
// CORTA —una interlinea, ~11% del alto— con fundido. La escala es el recurso menos usado de los cuatro.
// Aca son 118 px, que sobre 1080 es exactamente ese 11%.
var ESC_T1 = 30;
var t1 = G.img("n-t1", "kicker", 960, 540, 0, ESC_T1);
G.claves(G.ejes(t1).y, [[4, 658, "C1"], [4 + 13, 540]], "kicker-entra");
// entra en 4, esta quieto de 17 a 36 (0,63 s = la mediana del corpus) y se va en 46
G.claves(G.op(t1), [[4, 0, "C1"], [4 + 8, 100, "C6"], [36, 100, "C3"], [46, 0]], "kicker-op");
G.plano(t1, 4, C[1]);

// ================================================================================================
// PLANO 2 · 70-150 — EL PEDIDO SE ESCRIBE SOLO
// ================================================================================================
var caja = G.img("n-caja", "caja", 960, 470, 60, 34);
Ge.deslizarConFundido({ capa: caja, cuadro: C[1], dur: 12, dy: 56, curva: "C1", donde: "caja" });
// LA CAJA MUERE EN EL CORTE. La dejaba viva hasta el plano 5 y el pedido escrito se solapaba 77
// cuadros con las filas de estado — `colision-check` lo marco como "titular sobre contenido, 45%".
// El mundo cambia en C[3]: lo que pertenecia al mundo anterior se va con el.
G.plano(caja, C[1], C[3] + 2);

// UNA CAPA, NO VEINTIOCHO. `maquinaDeEscribir` usa un animador de texto con un selector que descubre de
// a un caracter; la alternativa era un rotulo por letra, y ese costo es la razon de fondo por la que
// las piezas anteriores salian ralas: mientras cada gesto cuesta una capa, nadie escribe denso.
var pedido = Gt.maquinaDeEscribir({
  cadena: "Convertí mi web en un video.",
  desde: C[1] + 18, porCaracter: 2, cursor: true, parpadeo: 15,
  tam: 44, color: TINTA, fuente: "Segoe UI", centrado: false,
  // LA X SALE DE LA CAJA, NO DE MI OJO. El PNG mide 2680 px con 90 de margen por lado para la sombra,
  // asi que al 34% la caja BLANCA va de 566 a 1354 — no de 504 a 1415, que es lo que mide el lienzo
  // entero. Con x=520 el texto arrancaba 46 px A LA IZQUIERDA de la caja, flotando sobre el fondo.
  // 614 es el borde interno mas 48 de aire.
  x: 614, y: 402, z: 40, hasta: C[3] + 2, nombre: "pedido"
});

// mismo caso: el chip mide 257 px dibujado, asi que su centro va en 614 + 128 = 742
var chip = G.img("n-chip", "chip", 742, 528, 40, 26);
G.claves(G.op(chip), [[C[1] + 8, 0, "C1"], [C[1] + 16, 100, "C6"], [C[3] - 8, 100, "C3"], [C[3] - 1, 0]], "chip-op");
G.plano(chip, C[1] + 8, C[3]);

// ================================================================================================
// PLANO 3 · 150-210 — el boton, y el acuse cuando el pedido termina de escribirse
// ================================================================================================
var boton = G.img("n-boton", "boton", 960, 704, 40, 26);
G.conRebote(G.esc(boton), [[C[2], [0, 0, 0]], [C[2] + 7, [26, 26, 26]]],
            { donde: "boton-entra", piso: 2 });
G.claves(G.op(boton), [[C[2], 0, "C1"], [C[2] + 5, 100, "C6"], [C[3] - 8, 100, "C3"], [C[3] - 1, 0]], "boton-op");
// D01 · el acuse va 2-4 px sobre tipografia y hasta 10 sobre una forma. Un boton es una forma.
// el boton acusa EN EL CUADRO EN QUE EL PUNTERO APOYA, no en uno cualquiera: si el acuse no cae
// donde cae el click, el boton se mueve solo y el puntero pasa a ser decoracion.
Gd.acuseDeGolpe({ capa: boton, cuadro: C[2] + 28, eje: "y", ida: 2, vuelta: 9, desplazamiento: 9 });
G.plano(boton, C[2], C[3]);

// EL PUNTERO, QUE FALTABA Y NO ES UN ADORNO.
//
// Dicho por el usuario: "no aparece ningun mouse que clickee lo de Generar". Un boton que se enciende
// solo no cuenta que alguien pidio algo — cuenta que algo paso. Y el motor tiene una compuerta
// dedicada (`gesto-check`) justamente porque un puntero que acciona algo que despues no cambia es un
// defecto declarado del catalogo.
//
// La punta del puntero esta en (6,4) del lienzo de 64x93, asi que el ANCLA va ahi: sin eso, el puntero
// apunta con su centro y el click cae 30 px abajo y a la derecha de donde parece.
var puntero = G.img("n-puntero", "puntero", 1320, 940, -60, 34);
G.anc(puntero).setValue([6 * 4, 4 * 4, 0]);
G.claves(G.ejes(puntero).x, [[C[2] + 8, 1320, "C1"], [C[2] + 26, 984]], "puntero-x");
G.claves(G.ejes(puntero).y, [[C[2] + 8, 940, "C1"], [C[2] + 26, 726]], "puntero-y");
// el apoyo: baja 8 px y vuelve. Es lo mismo que un acuse y por eso va con la misma banda 2-4 cuadros
// de ida contra 8-12 de vuelta — la asimetria ES el gesto.
G.claves(G.esc(puntero), [[C[2] + 26, [34, 34, 34], "C7"], [C[2] + 29, [30, 30, 30], "C8"],
                          [C[2] + 38, [34, 34, 34]]], "puntero-aprieta");
G.claves(G.op(puntero), [[C[2] + 8, 0, "C1"], [C[2] + 14, 100, "C6"], [C[3] - 10, 100, "C3"], [C[3] - 2, 0]], "puntero-op");
G.plano(puntero, C[2] + 8, C[3]);

// el anillo del click, en el cuadro exacto en que el puntero apoya
var anillo = G.img("n-click", "click", 960, 704, -50, 4);
G.claves(G.esc(anillo), [[C[2] + 28, [4, 4, 4], "C3"], [C[2] + 42, [26, 26, 26]]], "click-esc");
G.claves(G.op(anillo), [[C[2] + 28, 90, "C3"], [C[2] + 42, 0]], "click-op");
G.plano(anillo, C[2] + 28, C[2] + 43);

Gx.objetoQueBarre({
  desde: C[3] - 6, hasta: C[3] + 6, cobertura: 3, hacia: "derecha",
  color: ACENTO, alto: 1180, cubre: [caja, boton, malla], nombre: "banda-1", donde: "corte-claro"
});

// ================================================================================================
// PLANO 4 · 210-330 — TRES ESTADOS QUE SE COMPLETAN
// ================================================================================================
//
// Cada fila entra, corre con su aro girando, y termina encendiendo su tilde. El tilde esta en CAPA
// APARTE justamente para poder encenderlo: horneado dentro de la fila, el estado final existiria desde
// el primer cuadro y ninguna animacion podria cambiarlo — es lo que rompio el conmutador de la PIEZA-I.
//
// El aro gira con una EXPRESION de fase lineal, no con claves: un giro perpetuo con claves necesita una
// clave por vuelta y ademas nunca cierra exacto. El 360 no se toca, que es lo que garantiza el ciclo;
// el periodo es el unico mando.
var FILAS_Y = [372, 540, 708];
var iF;
for (iF = 0; iF < 3; iF++) {
  // 28 DE RETARDO Y 32 DE DURACION, y los dos numeros salen de una cuenta, no del gusto: la tercera
  // fila tiene que TERMINAR antes de que el acto empiece a fundirse. Con 34 y 40 terminaba en el 328 y
  // el fundido arranca en el 316 — claves fuera de orden, que AE pisa en silencio y el gesto
  // desaparece sin error. Ahora la ultima cierra en 308, con 8 cuadros de aire.
  var t0 = C[3] + 10 + iF * 28;
  var tFin = t0 + 32;

  var fila = G.img("n-fila-" + (iF + 1), "fila-" + iF, 960, FILAS_Y[iF], 40, 26);
  G.conRebote(G.ejes(fila).x, [[t0, 1580], [t0 + 13, 960]], { donde: "fila-entra-" + iF, piso: 5 });
  G.claves(G.op(fila), [[t0, 0, "C1"], [t0 + 7, 100, "C6"], [C[4] - 14, 100, "C3"], [C[4] - 4, 0]], "fila-op-" + iF);
  G.plano(fila, t0, C[4] - 3);

  // LA X DEL ICONO SE DERIVA DEL PNG, NO SE ESTIMA. La fila mide 2940 px con 40 de margen por lado; al
  // 26% se dibuja 764 de ancho con el borde izquierdo en 578. Adentro del PNG el texto arranca en el
  // 19,4% del ancho, o sea en 726 de pantalla — y el hueco del icono es el 9,7%, que cae en 652. Con
  // x=700 el icono se comia la primera letra y la fila se leia "rmando el backend".
  // EL ICONO VA ENLAZADO A SU FILA, Y ESTE ES EL DEFECTO QUE MAS ME MEREZCO.
  //
  // Dicho por el usuario: "cuando van cargando, el circulo esta fuera del cuadrado cuando se van
  // moviendo, PARA ESO SIRVEN LOS ENLACES, te dije que los uses y ni bola me diste". Exacto: la fila
  // entra con un rebote desde x=1580 y yo le puse al icono una x FIJA, asi que durante toda la entrada
  // el icono se quedaba plantado en el medio del cuadro mientras su fila viajaba.
  //
  // `G.enlazar` con retardo 0 lo clava a la fila: la x del icono ES la de la fila menos 308. No hay
  // claves que sincronizar, y si manana cambia el rebote de la fila el icono lo sigue solo.
  var X_ICONO = 652;
  var DESDE_CENTRO = X_ICONO - 960;
  var aro = G.img("n-cargando", "aro-" + iF, X_ICONO, FILAS_Y[iF], 30, 26);
  G.enlazar({ capa: aro, prop: G.ejes(aro).x, a: fila, deQue: "posX",
              offset: DESDE_CENTRO, retardo: 0, donde: "aro-sigue-fila-" + iF });
  G.expresion(G.rotZ(aro), G.lineas(["per = 1.1;", "time * 360 / per;"]), "aro-gira-" + iF);
  G.claves(G.op(aro), [[t0 + 4, 0, "C1"], [t0 + 10, 100, "HOLD"], [tFin, 0]], "aro-op-" + iF);
  G.plano(aro, t0 + 4, tFin + 1);

  var tilde = G.img("n-check", "tilde-" + iF, X_ICONO, FILAS_Y[iF], 28, 26);
  G.enlazar({ capa: tilde, prop: G.ejes(tilde).x, a: fila, deQue: "posX",
              offset: DESDE_CENTRO, retardo: 0, donde: "tilde-sigue-fila-" + iF });
  G.conRebote(G.esc(tilde), [[tFin, [0, 0, 0]], [tFin + 7, [26, 26, 26]]], { donde: "tilde-" + iF, piso: 2 });
  G.claves(G.op(tilde), [[tFin, 100, "HOLD"], [C[4] - 14, 100, "C3"], [C[4] - 4, 0]], "tilde-op-" + iF);
  G.plano(tilde, tFin, C[4] - 3);

  Gd.acuseDeGolpe({ capa: fila, cuadro: tFin + 2, eje: "y", ida: 2, vuelta: 9, desplazamiento: 7 });
}

// ================================================================================================
// PLANO 5 · 330-400 — EL GESTO GRANDE, uno solo en toda la pieza
// ================================================================================================
var ESC_T4 = 17;
var t4 = G.img("n-t4", "hero", 960, 540, -40, ESC_T4);
G.conRebote(G.esc(t4),
            [[C[4] + 2, [ESC_T4 * 3.8, ESC_T4 * 3.8, ESC_T4 * 3.8]], [C[4] + 11, [ESC_T4, ESC_T4, ESC_T4]]],
            { donde: "hero-entra", piso: 4 });
G.claves(G.op(t4), [[C[4] + 2, 0, "C1"], [C[4] + 9, 100, "C6"], [C[5] - 14, 100, "C3"], [C[5] - 2, 0]], "hero-op");
G.plano(t4, C[4] + 2, C[5] - 1);

Gx.objetoQueBarre({
  desde: C[5] - 6, hasta: C[5] + 6, cobertura: 3, hacia: "izquierda",
  color: ACENTO, alto: 1180, cubre: [tejido, claro, t4], nombre: "banda-2", donde: "corte-mundo"
});

// ================================================================================================
// PLANO 6 · 400-520 — los cuatro paneles en abanico
// ================================================================================================
//
// CUATRO ELEMENTOS Y UNO SOLO LEGIBLE. Los de atras van girados y a otra profundidad: ocupan el cuadro,
// que es todo su trabajo. Es la respuesta directa al "esta como muy vacio el video" de la PIEZA-J.
//
// Y entran en CASCADA con `G.seguir`, que es un ENLACE: los tres de atras copian al de adelante con
// 4-6 cuadros de retardo. Cambiar el escalonado es UN numero, no cuatro juegos de claves.
var lider = G.img("n-panel-1", "panel-lider", 960, 560, -120, 38);
G.conRebote(G.ejes(lider).y, [[C[5] + 4, 1520], [C[5] + 22, 560]], { donde: "panel-lider", piso: 8 });
G.plano(lider, C[5] + 4, 630);

var paneles = [], iP;
var COLOC = [
  { x: 306,  z: 240, ry:  26, esc: 32 },
  { x: 1614, z: 300, ry: -28, esc: 31 },
  { x: 1180, z: 520, ry: -14, esc: 28 }
];
for (iP = 0; iP < 3; iP++) {
  var cc = COLOC[iP];
  var p = G.img("n-panel-" + (iP + 2), "panel-" + iP, cc.x, 560, cc.z, cc.esc);
  G.rotY(p).setValue(cc.ry);
  G.seguir({ capa: p, lider: lider, retardo: 4 + iP, ejes: ["y"], donde: "panel-sigue-" + iP });
  G.plano(p, C[5] + 8 + iP, 630);
  paneles[iP] = p;
}

// EL HOOK, QUE FALTABA. Dicho por el usuario sobre este plano: "se ve esas imagenes y que? No explican
// nada, ningun texto de hook para decir 'mira todo esto'". Tenia razon — cuatro paneles sin una linea
// que los nombre son cuatro imagenes, no una escena.
//
// VA EN BLANCO Y NO CON EL DEGRADADO DE LA PIEZA: el titular con degradado azul-a-magenta sobre un
// fondo que TAMBIEN va de azul a magenta no tiene contraste en ningun punto, porque en cada columna el
// texto y el fondo son el mismo color. Sobre color saturado el unico tono que funciona siempre es el
// blanco.
var ESC_HOOK = 20;
var hook = G.img("n-hook", "hook", 960, 218, -240, ESC_HOOK);
G.claves(G.ejes(hook).y, [[C[5] + 16, 262, "C1"], [C[5] + 28, 218]], "hook-y");
G.claves(G.op(hook), [[C[5] + 16, 0, "C1"], [C[5] + 26, 100, "C6"], [C[6] - 12, 100, "C3"], [C[6] - 2, 0]], "hook-op");
G.plano(hook, C[5] + 16, C[6] - 1);

var ESC_T5 = 22;
var t5 = G.img("n-t5", "remate", 960, 962, -200, ESC_T5);
G.claves(G.ejes(t5).y, [[C[5] + 34, 1002, "C1"], [C[5] + 45, 962]], "remate-y");
G.claves(G.op(t5), [[C[5] + 34, 0, "C1"], [C[5] + 43, 100, "C6"], [C[6] - 10, 100, "C3"], [C[6] - 2, 0]], "remate-op");
G.plano(t5, C[5] + 34, C[6] - 1);

// ================================================================================================
// PLANO 7 · 520-630 — la marca
// ================================================================================================
//
// LOS PANELES SE APAGAN Y RETROCEDEN. Sin esto la marca cae encima de cuatro pantallas cargadas y no se
// lee — el mismo defecto que el logotipo sobre el isotipo de la PIEZA-M. Y `colision-check` NO LO VE,
// porque los titulares de esta pieza son PNG con degradado y no capas de texto: la compuerta que existe
// justo para eso no los mira.
//
// Apagar sin alejar deja el mismo tamano con menos tinta, que se lee como un error de opacidad. Las dos
// cosas juntas los convierten en textura, que es lo que tienen que ser cuando el sujeto es la marca.
var iAp, TODOS = [lider].concat(paneles), Z0 = [-120, 240, 300, 520];
for (iAp = 0; iAp < TODOS.length; iAp++) {
  // AL 6% Y NO AL 13%. En el cierre el usuario vio que "casi que no se notan los textos": los
  // paneles seguian teniendo demasiada presencia detras de la marca. Al 6 quedan como una trama
  // apenas insinuada, que es lo que tiene que ser el fondo de un cierre.
  G.claves(G.op(TODOS[iAp]), [[C[6] - 4, 100, "C3"], [C[6] + 14, 6]], "panel-apaga-" + iAp);
  G.claves(G.ejes(TODOS[iAp]).z, [[C[6] - 4, Z0[iAp], "C3"], [C[6] + 14, Z0[iAp] + 540]], "panel-atras-" + iAp);
}

var iso = G.img("n-iso", "iso", 960, 402, -260, 15);
G.conRebote(G.esc(iso), [[C[6] + 8, [0, 0, 0]], [C[6] + 14, [15, 15, 15]]], { donde: "iso-entra", piso: 2 });
G.plano(iso, C[6] + 8, 630);

// la marca y la url van BLANCAS sobre el degradado, por lo mismo que el hook
var marcaTxt = G.img("n-marca-blanca", "marca-texto", 960, 620, -260, 13);
G.claves(G.ejes(marcaTxt).y, [[C[6] + 22, 654, "C1"], [C[6] + 32, 620]], "marca-texto-y");
G.claves(G.op(marcaTxt), [[C[6] + 22, 0, "C1"], [C[6] + 31, 100]], "marca-texto-op");
G.plano(marcaTxt, C[6] + 22, 630);

var url = G.img("n-url-blanca", "url", 960, 742, -260, 22);
G.claves(G.ejes(url).y, [[C[6] + 34, 768, "C1"], [C[6] + 44, 742]], "url-y");
G.claves(G.op(url), [[C[6] + 34, 0, "C1"], [C[6] + 43, 100]], "url-op");
G.plano(url, C[6] + 34, 630);

// C01 · la camara aporta poco: la cuota del genero es <=20% de la energia, y va desfasada del corte.
Gc.empuje({ cam: cam, desde: C[6] + 6, hasta: 626, recorrido: 0.06 });

// ================================================================================================
var cerrado = G.cerrar();
di("");
di("PIEZA|PIEZA-N|1920x1080|30fps|630 cuadros|7 planos");
di("CAPAS|" + cerrado.capas);
di("AVISOS|" + cerrado.avisos.length);
var iAv;
for (iAv = 0; iAv < cerrado.avisos.length; iAv++) { di("AVISO|" + cerrado.avisos[iAv]); }
di("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  di("EXPLOTO|" + (elFallo.message ? elFallo.message : elFallo).toString() +
     "|linea " + (elFallo.line ? elFallo.line : "?"));
  di("--- fin ---");
}
