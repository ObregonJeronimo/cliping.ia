// PIEZA-L — ocho segundos, con todo lo que se aprendio leyendo seis proyectos de After Effects.
//
// ================================================================ POR QUE ES CORTA
//
// Las dos piezas anteriores se murieron de ambiciosas: 990 cuadros y 120 capas es una apuesta que no se
// termina, y una pieza a medias no se puede juzgar. Ocho segundos se autoran, se pulen, se miran cuadro
// por cuadro y se renderizan de una. El objetivo no es que tenga muchas partes: es que se vea bien.
//
// ================================================================ QUE PRUEBA, Y CONTRA QUE
//
// Es una version propia del gesto que el usuario hizo en su proyecto —un punto que se vuelve pildora y
// un texto que cae letra por letra rebotando— para que pueda comparar contra algo que ya conoce. Cada
// tecnica de aca sale de una medicion, no de un gusto:
//
//   REBOTE INERCIAL          la suavidad NO vive en la curva. Una Bezier termina con velocidad cero y
//                            no sobrepasa nunca; esto lee la velocidad de llegada y le suma un seno
//                            amortiguado, asi que un gesto rapido rebota mucho y uno lento casi nada.
//                            Verificado 0,000% contra AE.
//   CLAVES LIVIANAS          282 influencias medidas en seis proyectos: mediana 16,667 (lineal), 57,8%
//                            en ese defecto exacto, solo 11% por encima de 70. Las ocho curvas C1..C8
//                            de este repo viven TODAS entre 70 y 92, o sea que se venia aplicando a
//                            cada gesto lo que en la practica real aparece una de cada nueve veces.
//   OBTURADOR APAGADO        las 77 capas de los cuatro proyectos medidos traen el desenfoque de
//                            movimiento en 0. El 100%. El "180 grados fase -90" que declara toda comp
//                            es el DEFECTO de AE, no la decision de nadie: la nitidez del salto ES el
//                            efecto. Y ahorra cuatro renders por cuadro.
//   LA PILDORA POR GEOMETRIA un rectangulo redondeado escalado x4 aplasta sus esquinas y se ve al
//                            primer cuadro. Son DOS CIRCULOS que se separan y una barra lisa que crece
//                            entre ellos, con el radio intacto siempre. Y el rebote va sobre la
//                            SEPARACION, no sobre la escala del conjunto.
//   UNA CAPA POR CARACTER    un selector de rango da un BARRIDO; esto da una CASCADA de rebotes
//                            independientes, que es otra animacion. El selector de expresion de AE
//                            hace lo mismo pero todavia no viaja al motor, y este camino si.
//   LA PILA EMPIEZA EN CERO  en el cuadro 0 las copias estan superpuestas y se ve UN objeto; el
//                            despliegue ES la entrada. Cero claves de opacidad, cero mascara.
//   SOMBRA DURA EN CAPA      las sombras medidas tienen suavizado 0: son un desplazamiento, no un
//                            desenfoque. Copia oscura corrida, que ademas se mueve con el objeto.
//
// ================================================================ FICHA DE ARTE
// FAMILIA      producto, luminoso, minimo. Un objeto y una palabra por vez.
// PALETA       fondo frio #F6F7FA -> #E7EAF2 · tinta #101216 · UN acento azul #2F6BFF. Nada mas.
// LUZ          horneada y minima. El volumen sale del degradado corto del circulo y de una sombra dura.
// FORMA        el circulo y la pildora. Nada con esquina recta.
// TIPOGRAFIA   CenturyGothic (0,20% de desvio medido, la mejor de once).
// PROFUNDIDAD  camara con profundidad de campo suave, y la pila desplegandose en Z.
// SIMBOLO      EL PUNTO. Entra solo, se vuelve pildora, suelta la palabra y se queda. Es el mismo
//              objeto todo el tiempo: la tapa izquierda de la pildora ES el punto que entro.
//
// ================================================================ LOS SEIS TIEMPOS (240 cuadros)
//    A    0- 34  el punto entra de la nada y REBOTA al aterrizar
//    B   40- 76  se abre en pildora: las tapas se separan y la barra crece entre ellas
//    C   66-140  la palabra cae letra por letra, cada una con su propio rebote, escalonadas 3 cuadros
//    D  120-186  la pila se despliega en profundidad detras: estaban todas superpuestas
//    E  186-215  asentamiento
//    F  215-240  quieto. Un cuadro que se puede congelar.
//
// ================================================================ USO
//   node tools/ae/recursos-l.mjs
//   node tools/ae/es3-check.mjs tools/ae/sondas/pieza-l.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-l.jsx
//   printf 'PIEZA-L' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/pieza-l.json

var RUTA = "C:/ae-probe/pieza-l.txt";
var RECURSOS = "C:/ae-probe/recursos-l";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
// UN SALTO DE LINEA CRUDO DENTRO DE UNA CADENA DE ExtendScript ES UN ERROR DE ANALISIS: no falla la
// linea, no corre el archivo. Las expresiones son multilinea por naturaleza, asi que se arman uniendo.
var NL = String.fromCharCode(10);
function lineas(arr) { return arr.join(NL); }

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("PIEZA-L");

// LA PROFUNDIDAD DE COLOR SE FIJA, NO SE HEREDA. Una comp creada por script vive adentro del proyecto
// que este abierto y hereda su profundidad de bits. Con el proyecto ajeno que quedo abierto —en 32 bits
// flotantes— esta misma pieza rendereaba el fondo en (24,24,24) en vez de (246,247,250): casi negro.
//
// MEDIDO, no deducido: el mismo PNG solo en una comp limpia da (246,247,250); adentro de la pieza en 32
// bits da (24,24,24); poniendo 8 bits y reconstruyendo, (242,243,245). No tengo el mecanismo exacto y no
// lo voy a inventar — tengo el hecho, es reproducible, y el arreglo es una linea.
//
// No da error, no lo dice ninguna compuerta, y no se parece a un problema de color: se parece a "el
// fondo quedo raro".
app.project.bitsPerChannel = 8;

var NOMBRE = "PIEZA-L";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 240;

var TINTA = [0.063, 0.071, 0.086];
var AZUL = [0.184, 0.420, 1.000];

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, CUADROS / FPS, FPS);
comp.resolutionFactor = [1, 1];
// EL OBTURADOR VA APAGADO. No es un olvido: es la ley que salio de medir 77 capas de cuatro proyectos
// donde el 100% lo tiene en 0. La nitidez del salto ES el efecto, y ademas ahorra 4 renders por cuadro.
comp.motionBlur = false;
comp.bgColor = [0.965, 0.969, 0.980];
comp.openInViewer();

function tr(c) { return c.property("ADBE Transform Group"); }
function op(c) { return tr(c).property("ADBE Opacity"); }
function pos(c) { return tr(c).property("ADBE Position"); }
function esc(c) { return tr(c).property("ADBE Scale"); }
function fuenteDe(c) { return c.property("ADBE Text Properties").property("ADBE Text Document"); }

// ---------------------------------------------------------------- claves LIVIANAS
// Lineal por defecto. `suave` pone Easy Ease de verdad (33/33), que es el p75 de lo que hace la gente,
// no lo que esta skill prohibia. El caracter no lo pone la curva: lo pone la expresion.
function claves(prop, lista, suave) {
  var i;
  for (i = 1; i < lista.length; i++) {
    if (lista[i][0] <= lista[i - 1][0]) {
      throw new Error("claves fuera de orden: " + lista[i - 1][0] + " -> " + lista[i][0]);
    }
  }
  for (i = 0; i < lista.length; i++) { prop.setValueAtTime(lista[i][0] / FPS, lista[i][1]); }
  for (i = 1; i <= prop.numKeys; i++) {
    if (suave) {
      var nn = prop.keyOutTemporalEase(i).length;
      var ent = [], sal = [], q;
      for (q = 0; q < nn; q++) { ent[q] = new KeyframeEase(0, 33.33); sal[q] = new KeyframeEase(0, 33.33); }
      prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
      prop.setTemporalEaseAtKey(i, ent, sal);
    } else {
      prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    }
  }
}
function plano(capa, desde, hasta) {
  capa.inPoint = desde / FPS;
  capa.outPoint = Math.min(hasta, CUADROS) / FPS;
  return capa;
}

// ---------------------------------------------------------------- EL REBOTE
// amp NO es el sobrepaso: el pico cae en 1/(4*freq) y ahi el amortiguamiento ya se comio la mitad.
//   sobrepaso = v * amp * exp(-decay / (4*freq))
// Con 0,05 / 2,0 / 6 eso da v * 0,0236, o sea el 2,36% de la velocidad de llegada en unidades/segundo.
// `frameDuration/10` es el corrimiento SIN EL CUAL la velocidad se lee en la parada, vale 0, y el
// rebote no existe — sin ningun sintoma de error.
// LAS CLAVES QUE ALIMENTAN UN REBOTE TIENEN QUE SER LINEALES. NO ES UNA PREFERENCIA.
//
// El rebote lee `velocityAtTime` en la ultima clave. Una curva con ease de ENTRADA llega ahi con
// velocidad CERO, asi que multiplica por cero y el rebote no existe — sin ningun sintoma: la animacion
// se ve prolija y simplemente le falta el remate.
//
// Medido sobre el horneado de la primera version de esta pieza: sobrepaso de la pildora **0,11 px**.
// Le habia puesto Easy Ease a las mismas claves que necesitaban ser lineales, y encima despues de
// escribir la ley "claves livianas" en la skill.
//
// Y LA VELOCIDAD LA DA LA DISTANCIA SOBRE EL TIEMPO, asi que un gesto lento tampoco rebota aunque sea
// lineal. Calculado con sobrepaso = v * amp * exp(-decay/(4*freq)), para 320 px con amp 0,06:
//     36 cuadros ->  267 u/s ->  8,0 px      22 cuadros ->  436 u/s -> 13,1 px
//     14 cuadros ->  686 u/s -> 20,5 px
// Por eso los tramos de abajo se acortaron: no para que "vaya mas rapido" sino para que HAYA rebote.
function rebote(amp, freq, decay) {
  return lineas([
    "n = 0;",
    "if (numKeys > 0) {",
    "  n = nearestKey(time).index;",
    "  if (key(n).time > time) { n--; }",
    "}",
    "t = (n == 0) ? 0 : time - key(n).time;",
    "if (n > 0) {",
    "  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);",
    "  amp = " + amp + "; freq = " + freq + "; decay = " + decay + ";",
    "  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);",
    "} else { value; }"
  ]);
}

// ---------------------------------------------------------------- recursos
var cache = {};
function recurso(archivo) {
  if (cache[archivo]) { return cache[archivo]; }
  var f = new File(RECURSOS + "/" + archivo + ".png");
  if (!f.exists) { throw new Error("falta el recurso " + archivo + " en " + RECURSOS); }
  var itm = app.project.importFile(new ImportOptions(f));
  cache[archivo] = itm;
  return itm;
}
function img(archivo, nombre, x, y, z, escala) {
  var c = comp.layers.add(recurso(archivo));
  c.name = nombre;
  c.threeDLayer = true;
  pos(c).setValue([x, y, z]);
  esc(c).setValue([escala, escala, escala]);
  return c;
}

// ================================================================ LA CAMARA
var DIST = 2400;
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
pos(cam).setValue([ANCHO / 2, ALTO / 2, -DIST]);
cam.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
var opc = cam.property("ADBE Camera Options Group");
opc.property("ADBE Camera Zoom").setValue(DIST);
opc.property("ADBE Camera Depth of Field").setValue(1);
opc.property("ADBE Camera Focus Distance").setValue(DIST);
// APERTURA CHICA. El fondo esta a z=900, o sea a 3300 de la camara: con apertura 18 el circulo de
// confusion da 18*900/3300 = 4,9 px. Suficiente para que el fondo se sienta blando y muy por debajo de
// los 24 px que el motor dibuja liso.
opc.property("ADBE Camera Aperture").setValue(18);

// ================================================================ EL SUELO
// LA ESCALA SE CALCULA. A z=900 con la camara en -2400, el factor de proyeccion es 2400/3300 = 0,727:
// un PNG de 2600 al 90% se dibuja 1702 px en un cuadro de 1920 y se ve el borde. Hacen falta 102%; va
// 130 para que la profundidad de campo no deje un canto duro contra el borde del cuadro.
var fondo = img("fondo", "deco-fondo", 960, 540, 900, 130);
plano(fondo, 0, CUADROS);

var ig;
for (ig = 0; ig < 3; ig++) {
  var gr = comp.layers.add(recurso("grano-" + (ig + 1)));
  gr.name = "grano-" + ig;
  pos(gr).setValue([960, 540]);
  var lg = [], cu;
    // AL 100% ES RUIDO DE TELEVISION. El PNG ya trae alfa 26 (10%); encima al 100% de capa el grano se
  // ve como textura y no como grano. A 34 queda por debajo del umbral de "lo noto" y sigue haciendo su
  // trabajo, que es disolver el bandeado del degradado de fondo.
  for (cu = 0; cu < CUADROS; cu += 2) { lg.push([cu, (cu / 2) % 3 === ig ? 34 : 0]); }
  var pg = op(gr);
  var q2;
  for (q2 = 0; q2 < lg.length; q2++) { pg.setValueAtTime(lg[q2][0] / FPS, lg[q2][1]); }
  for (q2 = 1; q2 <= pg.numKeys; q2++) {
    pg.setInterpolationTypeAtKey(q2, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
  }
  plano(gr, 0, CUADROS);
}

// ================================================================ D · LA PILA
//
// EMPIEZA EN CERO: en el cuadro 0 las seis placas estan superpuestas y se ve UNA. El despliegue ES la
// entrada — no hay una sola clave de opacidad ni una mascara de aparicion. Es la ley que mas cambia la
// narrativa: en vez de "entran seis placas", la pieza dice "una placa se abre y resultan ser seis".
// SE ABRE EN ABANICO, NO HACIA EL FONDO. La primera version mandaba las copias en Z puro y no se veia
// ninguna: al alejarse se achican (a z=1050 el factor cae de 1,00 a 0,70) y quedan enteras detras de la
// mas cercana, que mide 645 px contra 449. Un despliegue solo se lee si cada copia ASOMA — hace falta
// desplazamiento lateral mayor que la mitad de lo que se achico, y una rotacion chica que le da al
// abanico su eje.
var NP = 6, PASO_Z = 150, ip;
// LAS PLACAS NO APARECEN: YA ESTABAN. El usuario lo dijo asi — "esos cuadrados que aparecen al fondo
// son raros, no salen de algun lado, simplemente aparecen". Y tenia razon: entraban en el cuadro 118,
// o sea que seis capas se prendian de la nada y recien despues se abrian.
//
// La ley "el gesto empieza en cero" solo funciona si el objeto YA ESTA EN ESCENA antes de moverse. Se
// adelanta la entrada al cuadro 56 —cuando la pildora ya se abrio— con las seis exactamente
// superpuestas: como la de adelante es opaca y esta arriba, no se ve NINGUNA de las otras cinco. En el
// 120 se abren y parecen salir de abajo de la que ya estaba, que es de donde salen de verdad.
//
// LA DE ADELANTE VA AL CENTRO Y LAS DEMAS SE ABREN ALTERNANDO detras. Hacer el abanico simetrico
// repartiendo el indice de 0 a N mandaba la placa 0 —la opaca, la que sostiene la palabra— a un extremo,
// y la del medio quedaba siendo una lavada del fondo. El indice de PROFUNDIDAD y el de POSICION en el
// abanico son dos cosas distintas y hay que separarlas: `paso` dice cuanto se abre y `lado` para donde.
function lado(i) { return i === 0 ? 0 : (i % 2 === 1 ? -1 : 1); }
function paso(i) { return i === 0 ? 0 : Math.ceil(i / 2); }
for (ip = NP - 1; ip >= 0; ip--) {
  var pl = img("placa", "placa-" + ip, 960, 600, 0, 62);
  var epl = pos(pl);
  epl.dimensionsSeparated = true;
  var pz = tr(pl).property("ADBE Position_2");
  var px = tr(pl).property("ADBE Position_0");
  var py = tr(pl).property("ADBE Position_1");
  claves(pz, [[120, 0], [152, paso(ip) * PASO_Z]]);
  pz.expression = rebote(0.05, 2.0, 6);
  // EL REBOTE VA DONDE ESTA EL GESTO. El abanico se abre en X, asi que sin expresion en X las placas
  // llegan en seco por mas que la Z y la rotacion reboten. Y lineal, o la velocidad de llegada es cero.
  claves(px, [[120, 960], [152, 960 + lado(ip) * paso(ip) * 132]]);
  px.expression = rebote(0.05, 2.0, 6);
  claves(py, [[120, 600], [152, 600 + paso(ip) * 26]]);
  // las de atras se apagan un poco: es lo que da la sensacion de profundidad sin una sola luz
  var rz = tr(pl).property("ADBE Rotate Z");
  claves(rz, [[120, 0], [152, lado(ip) * paso(ip) * 3.6]]);
  rz.expression = rebote(0.05, 2.0, 6);
  op(pl).setValue(ip === 0 ? 100 : Math.round(100 - ip * 9));
  plano(pl, 56, CUADROS);
}

// ================================================================ A y B · EL PUNTO Y LA PILDORA
//
// El punto que entra ES la tapa izquierda. Cuando `sep` pasa de 0 a 320, las dos tapas se separan y la
// barra crece entre ellas: el radio nunca se deforma porque nunca se escala una esquina.
var SEP = 320, ESC_P = 30;

function sombraDe(archivo, nombre, x, y, escala) {
  var c = img(archivo, nombre, x + 7, y + 7, 6, escala);
  op(c).setValue(16);
  return c;
}

// la barra del centro: su ancho es 2*sep. A sep=0 mide 0 y no se ve — la pildora arranca siendo un punto
var barraS = sombraDe("centro-sombra", "sombra-centro", 960, 380, ESC_P);
var barra = img("centro", "pildora-centro", 960, 380, 0, ESC_P);
// EL ANCHO SE DESPEJA DEL NATIVO, no se deja como constante magica. El PNG de la barra mide 1380 px
// nativos y hay que dibujarlo 2*sep: escalaX = 200*sep/1380. Escrito asi, cambiar el tamano del recurso
// no rompe la pildora en silencio.
var BARRA_NATIVA = 1380;
function anchoDe(sep) { return [sep * 200 / BARRA_NATIVA, ESC_P, 100]; }
var ib;
for (ib = 0; ib < 2; ib++) {
  var cual = ib === 0 ? barra : barraS;
  var e = esc(cual);
  claves(e, [[40, anchoDe(0)], [54, anchoDe(SEP)]]);
  plano(cual, 40, CUADROS);
}

// las dos tapas
var tapaIzqS = sombraDe("punto-sombra", "sombra-tapa-izq", 960, 380, ESC_P);
var tapaIzq = img("punto", "punto", 960, 380, 0, ESC_P);
var tapaDerS = sombraDe("punto-sombra", "sombra-tapa-der", 960, 380, ESC_P);
var tapaDer = img("punto", "pildora-tapa-der", 960, 380, 0, ESC_P);

var it2;
for (it2 = 0; it2 < 4; it2++) {
  var T = [tapaIzq, tapaIzqS, tapaDer, tapaDerS][it2];
  var esD = (it2 >= 2);
  var dx = (it2 === 1 || it2 === 3) ? 7 : 0;
  var dy = dx;
  var ep = pos(T);
  ep.dimensionsSeparated = true;
  var tx = tr(T).property("ADBE Position_0");
  var ty = tr(T).property("ADBE Position_1");
  var tz = tr(T).property("ADBE Position_2");
  tz.setValue((it2 === 1 || it2 === 3) ? 6 : 0);
  ty.setValue(380 + dy);
  // LA SEPARACION LLEVA EL REBOTE, no la escala del conjunto: si rebotara la escala, el radio se
  // deformaria en el sobrepaso y volveriamos al defecto que esta construccion existe para evitar.
  claves(tx, [[40, 960 + dx], [54, 960 + dx + (esD ? SEP : -SEP)]]);
  tx.expression = rebote(0.05, 2.0, 6);
  plano(T, esD ? 40 : 12, CUADROS);
}

// A · LA ENTRADA DEL PUNTO. Escala de 0 a 100 con rebote: aterriza y sobrepasa, no frena en seco.
var ie;
for (ie = 0; ie < 2; ie++) {
  var E = ie === 0 ? tapaIzq : tapaIzqS;
  var pe = esc(E);
  claves(pe, [[12, [0, 0, 0]], [26, [ESC_P, ESC_P, ESC_P]]]);
  pe.expression = rebote(0.05, 2.0, 6);
}

// ================================================================ C · LA PALABRA, LETRA POR LETRA
//
// UNA CAPA POR CARACTER. Un selector de rango daria un barrido; esto da una CASCADA de rebotes
// independientes que conviven — a 3 cuadros de escalonado y con la cola del rebote durando ~23, hay
// siete letras oscilando a la vez, y eso es lo que hace que la palabra se sienta viva.
//
// La convencion `letra-<i>-<c>` es la que hace que `colision-check` entienda que estas capas se estan
// CRUZANDO y no pisando: dos letras de una palabra que se desarma no son un defecto.
var PALABRA = "Urvid";
var TAM = 190;

// `sourceRectAtTime` DEVUELVE LA CAJA DE TINTA, NO EL AVANCE. Son cosas distintas: la tinta de una "r"
// termina donde termina su trazo, y el avance incluye el espacio a la derecha que la separa de la letra
// siguiente. Midiendo tinta, la "r" quedaba pegada a la "U" y sobraba un hueco antes de la "v" — se ve
// en el cuadro 230 y no lo dice ninguna compuerta.
//
// EL TRUCO ES MEDIR CON UNA LETRA SONDA PEGADA AL FINAL. Con "Ul" y "l", la diferencia de tinta es el
// AVANCE de la "U", porque la sonda arranca justo donde el avance la deja. Es la forma estandar de
// sacar avances de una API que solo expone cajas.
function medir(cad) {
  var t = comp.layers.addText(cad);
  var d = fuenteDe(t).value;
  d.fontSize = TAM; d.tracking = 0;
  try { d.font = "CenturyGothic"; } catch (exF) {}
  fuenteDe(t).setValue(d);
  var r = t.sourceRectAtTime(0, false);
  t.remove();
  return r.width;
}
var SONDA = "l";
var anchoSonda = medir(SONDA);
function avance(prefijo) { return medir(prefijo + SONDA) - anchoSonda; }

var anchos = [], total = 0, ic;
for (ic = 0; ic < PALABRA.length; ic++) {
  var w = avance(PALABRA.substring(0, ic + 1)) - avance(PALABRA.substring(0, ic));
  anchos[ic] = w;
  total += w;
}
var x0 = 960 - total / 2;
var acum = 0;
for (ic = 0; ic < PALABRA.length; ic++) {
  var ch = PALABRA.charAt(ic);
  var L = comp.layers.addText(ch);
  L.name = "letra-" + ic + "-" + ch;
  var dd = fuenteDe(L).value;
  dd.fontSize = TAM; dd.fillColor = TINTA; dd.applyFill = true;
  dd.tracking = 0;
  dd.justification = ParagraphJustification.LEFT_JUSTIFY;
  try { dd.font = "CenturyGothic"; } catch (exF2) {}
  fuenteDe(L).setValue(dd);
  L.threeDLayer = true;

  var c0 = 66 + ic * 3;
  var ep2 = pos(L);
  ep2.dimensionsSeparated = true;
  tr(L).property("ADBE Position_0").setValue(x0 + acum);
  tr(L).property("ADBE Position_2").setValue(0);
  var ly = tr(L).property("ADBE Position_1");
  claves(ly, [[c0, 560], [c0 + 10, 700]]);
  ly.expression = rebote(0.05, 2.0, 6);
  claves(op(L), [[c0, 0], [c0 + 6, 100]], false);
  plano(L, c0 - 1, CUADROS);
  acum += anchos[ic];
}

comp.time = 0;
anotar("PIEZA|" + NOMBRE + "|" + ANCHO + "x" + ALTO + "|" + FPS + "fps|" + CUADROS + " cuadros");
anotar("CAPAS|" + comp.numLayers);
anotar("OBTURADOR|apagado a proposito");
anotar("EXPRESIONES|rebote inercial en: escala del punto, separacion de las tapas, Y de cada letra, Z de cada placa");
anotar("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
