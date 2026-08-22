// EXPORTADOR GENERICO: leer UNA composicion cualquiera y volcarla entera.
//
// Este es el paso 2 del proyecto, el que decide si esto existe. Todo lo anterior fue plomeria (el
// canal, la defensa contra carteles, la conversion de curvas medida). Esto es lo primero que lee una
// composicion que no escribi yo mismo para una prueba.
//
// LA REGLA QUE GOBIERNA TODO EL DISEÑO: INVENTARIO EXPLICITO DE LO QUE NO PUDO EXPORTAR.
//
// Un exportador que se saltea lo que no entiende no falla ruidosamente: produce un documento que se
// reproduce y sale PARECIDO. Y "parecido" no se puede señalar con el dedo, ni discutir con un cliente,
// ni encontrar en una tabla de errores — es exactamente el modo de falla que este proyecto viene
// esquivando desde el primer dia. Por eso cada capa emite lineas NOSOP con lo que quedo afuera:
// efectos, mascaras, expresiones, contenido de formas, matte de pista, modos de fusion. El lector del
// otro lado se pone en ROJO si hay alguna, en vez de reproducir a medias.
//
// COMO SE ELIGE LA COMPOSICION, y por que asi: `AfterFX.exe -r` no acepta argumentos. Ninguno. Asi que
// los parametros llegan por archivo — si existe C:/ae-probe/exportar-comp.txt, se usa el nombre que
// diga; si no, la composicion activa; si no hay, la primera del proyecto. Es feo y es el unico camino.
//
// LO QUE YA SE APRENDIO Y ESTA APLICADO: supresion de dialogos + try/catch envolvente (un error deja
// de ser una ventana modal y pasa a ser una linea del buzon), registro paso a paso, centinela al
// final tambien cuando hubo error, y nunca `"" + excepcion`.

var RUTA = "C:/ae-probe/exportar.txt";
var PEDIDO = "C:/ae-probe/exportar-comp.txt";
var DIR_MEDIOS = "C:/ae-probe/medios";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}

function anotar(t) {
  var a = new File(RUTA);
  a.encoding = "UTF-8";
  a.open("a");
  a.write(t + "\n");
  a.close();
}

function comoLista(v) {
  if (v === null || v === undefined) { return ""; }
  if (typeof v.length === "number" && typeof v !== "string") { return v.join(";"); }
  return "" + v;
}

// Las barras verticales separan campos, asi que un nombre de capa con una barra rompe el formato.
// Tambien los saltos de linea, que romperian el formato de una linea por registro.
function limpio(s) {
  var t = "" + s;
  var salida = "", i;
  for (i = 0; i < t.length; i++) {
    var c = t.charAt(i);
    if (c === "|") { salida += "/"; }
    else if (c === "\n" || c === "\r") { salida += " "; }
    else { salida += c; }
  }
  return salida;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
anotar("VERSION|AE " + app.version);
// LOS ENUMS SE PREGUNTAN, NO SE ESCRIBEN A MANO. Que "7415 es centrado" hoy sea cierto no lo hace un
// hecho: es un numero de una version. Escrito a mano en el lector, el dia que cambie no falla — alinea
// mal y nadie sabe por que. Preguntarlo cuesta una linea.
anotar("ENUM|LINEAL|" + KeyframeInterpolationType.LINEAR +
       "|BEZIER|" + KeyframeInterpolationType.BEZIER +
       "|HOLD|" + KeyframeInterpolationType.HOLD +
       "|IZQ|" + ParagraphJustification.LEFT_JUSTIFY +
       "|DER|" + ParagraphJustification.RIGHT_JUSTIFY +
       "|CENTRO|" + ParagraphJustification.CENTER_JUSTIFY +
       "|NORMAL|" + BlendingMode.NORMAL +
       "|SUMA|" + BlendingMode.ADD);

if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

// ---------------------------------------------------------------- elegir la composicion
var comp = null;
var pedido = new File(PEDIDO);
if (pedido.exists) {
  pedido.open("r");
  var nombre = "" + pedido.read();
  pedido.close();
  // se limpian saltos y espacios a mano: ES3 no tiene String.trim
  nombre = nombre.replace(/^[\s]+/, "").replace(/[\s]+$/, "");
  var q;
  for (q = 1; q <= app.project.numItems; q++) {
    var it = app.project.item(q);
    if (it instanceof CompItem && it.name === nombre) { comp = it; break; }
  }
  if (comp === null) { anotar("NOSOP|-|composicion pedida no existe|" + limpio(nombre)); }
}
if (comp === null && app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
if (comp === null) {
  var r;
  for (r = 1; r <= app.project.numItems; r++) {
    if (app.project.item(r) instanceof CompItem) { comp = app.project.item(r); break; }
  }
}
if (comp === null) { throw new Error("el proyecto no tiene ninguna composicion"); }

var totalCuadros = Math.round(comp.duration * comp.frameRate);
anotar("COMP|" + limpio(comp.name) + "|" + comp.width + "|" + comp.height + "|" + comp.frameRate +
       "|" + comp.duration + "|" + comoLista(comp.bgColor) + "|" + comp.numLayers +
       "|" + comp.pixelAspect + "|" + comp.displayStartTime);

// EL OBTURADOR. Es lo que mas separa "se ve hecho" de "se ve caro", y no es un efecto: es como se
// integra el movimiento DENTRO de cada cuadro. Un cuadro no es un instante — es lo que entro por el
// obturador mientras estuvo abierto.
//
//   angulo  360 = obturador abierto todo el cuadro. 180 (el de cine, y el que AE trae) = medio cuadro.
//   fase    donde empieza a abrirse respecto del tiempo del cuadro. -90 con angulo 180 centra la
//           ventana EN el cuadro, que es lo que hace que el objeto no se vea corrido.
//
// Sin estos dos numeros el reproductor puede promediar sub-cuadros y aun asi dar una imagen corrida
// medio cuadro: el desenfoque estaria, y la posicion no. Se preguntan, no se asumen.
var angulo = 180, fase = -90, muestras = 16, limite = 128, activo = false;
try { activo = comp.motionBlur ? true : false; } catch (e01) {}
try { angulo = comp.shutterAngle; } catch (e02) {}
try { fase = comp.shutterPhase; } catch (e03) {}
try { muestras = comp.motionBlurSamplesPerFrame; } catch (e04) {}
try { limite = comp.motionBlurAdaptiveSampleLimit; } catch (e05) {}
anotar("OBTURADOR|" + (activo ? 1 : 0) + "|" + angulo + "|" + fase + "|" + muestras + "|" + limite);

// ================================================================ LOS PARAMETROS EDITABLES
//
// Lo que separa una PIEZA de una PLANTILLA es un solo dato: cuales de las mil propiedades de la
// composicion puede cambiar el usuario. AE ya tiene el mecanismo —el panel de Graficos Esenciales— y
// se maneja por script con `addToMotionGraphicsTemplateAs`.
//
// PERO HAY UN HUECO QUE OBLIGA A GUARDAR LA DECLARACION APARTE, y esta medido: **una propiedad NO sabe
// que fue declarada**. Se le pueden preguntar treinta y seis cosas (`canSetExpression`, `isEffect`,
// `essentialPropertySource`...) y ninguna dice si esta en la lista. Desde la composicion se pueden leer
// los NOMBRES publicos, pero no a que propiedad corresponde cada uno. O sea que recorrer el proyecto
// para descubrir los parametros es imposible: hay que anotarlos al declararlos.
//
// El manifiesto vive en el COMENTARIO DE LA COMPOSICION, que es un campo real de AE y sobrevive al
// guardado. La lista de Graficos Esenciales sigue existiendo para que un humano la vea y para que el
// proyecto sea valido; el comentario es la version que puede leer una maquina. Y como son dos fuentes,
// se vuelcan las dos y `comp.mjs` COMPARA: si no coinciden, alguien toco una y no la otra.
var manifiesto = "";
try { manifiesto = comp.comment || ""; } catch (exMan) { manifiesto = ""; }
if (manifiesto !== "") {
  // por codigo y no por escape: un "\n" escrito en este archivo lo puede convertir en un salto de
  // linea real cualquier herramienta que lo edite, y un salto real dentro de una cadena de
  // ExtendScript es un error de parseo que no corre nada y sale como cartel modal
  var lineasMan = manifiesto.split(String.fromCharCode(10)), lm;
  for (lm = 0; lm < lineasMan.length; lm++) {
    var linMan = lineasMan[lm];
    if (linMan.substring(0, 6) === "PARAM|") { anotar("PARAMETRO|" + linMan.substring(6)); }
  }
}

// Y LA LISTA DE AE, con sus dos trampas anotadas: es de BASE 1 —el indice 0 devuelve undefined— y
// viene en ORDEN INVERSO al de declaracion. Las dos estan medidas, no supuestas.
var cuantosCtrl = 0;
try { cuantosCtrl = comp.motionGraphicsTemplateControllerCount || 0; } catch (exCC) { cuantosCtrl = 0; }
anotar("CONTROLES|" + cuantosCtrl);
var ic;
for (ic = 1; ic <= cuantosCtrl; ic++) {
  var nomCtrl = "?";
  try { nomCtrl = texto(comp.getMotionGraphicsTemplateControllerName(ic)); } catch (exNC) { nomCtrl = "?"; }
  anotar("CONTROL|" + (cuantosCtrl - ic) + "|" + nomCtrl);
}

// Y UNA VENTANA DESCENTRADA NO SE VE COMO UN ERROR: se ve como que el objeto va adelantado o atrasado.
// Con fase = -angulo/2 la ventana del obturador queda centrada en el instante del cuadro, que es como
// AE viene de fabrica y lo que el reproductor promedia. Con cualquier otra fase las dos mitades siguen
// desenfocando igual y la POSICION queda corrida — el defecto no tiene sintoma propio, se disfraza de
// desincronizacion con el audio o de "la animacion arranca tarde". Se avisa antes de renderizar.
if (Math.abs(fase - (-angulo / 2)) > 0.001) {
  anotar("NOTA|0|obturador descentrado: fase " + fase + " con angulo " + angulo +
         " (centrada seria " + (-angulo / 2) + "); la posicion queda corrida|-");
}

// ---------------------------------------------------------------- volcar una propiedad
// Sirve igual para una propiedad quieta y para una animada, de una o de tres dimensiones. La ARIDAD
// de los eases se LEE de keyOutTemporalEase().length en vez de deducirse de una tabla: Posicion tiene
// tres componentes y lleva UN ease, Escala tiene tres y lleva TRES. La excepcion existe y una tabla
// escrita a mano se vuelve falsa en la primera propiedad que nadie probo.
function volcarProp(idx, etiqueta, prop) {
  if (prop === null || prop === undefined) { return; }
  var expr = "no";
  try { if (prop.expressionEnabled) { expr = "SI"; } } catch (exE) { expr = "?"; }
  var dims = 1;
  try { var v = prop.value; if (v !== null && typeof v.length === "number") { dims = v.length; } } catch (exV) { dims = 0; }

  anotar("PROP|" + idx + "|" + etiqueta + "|" + (prop.numKeys > 0 ? 1 : 0) + "|" + dims +
         "|" + comoLista(prop.value) + "|" + expr);

  // UNA EXPRESION NO ES UN DATO, ES UN PROGRAMA — y por eso SE HORNEA, que es lo que este mismo archivo
  // decia que habia que hacer y no hacia. Antes se informaba NOSOP y el documento salia incompleto, o
  // sea que la mitad del oficio de After Effects no llegaba al motor.
  //
  // NO SE REESCRIBE LA EXPRESION: SE MUESTREA. Es exactamente lo que ya se hace con los trazados de
  // mascara y por el mismo motivo — `valueAtTime` devuelve el valor YA EVALUADO en cualquier instante,
  // asi que el motor no necesita saber nada de `nearestKey`, `velocityAtTime`, `textIndex` ni del resto
  // del lenguaje. Exacto por construccion, y sin implementar un interprete de ExtendScript en el
  // navegador, que es un proyecto entero y una fuente de divergencia silenciosa.
  //
  // Y SE MIDE EL ERROR DE MUESTREO, porque una muestra por cuadro no siempre alcanza. Una expresion es
  // una funcion continua: un rebote de frecuencia 1,8 tiene periodo de 16,7 cuadros y se describe bien
  // con 30 muestras por segundo, pero un `wiggle` rapido alias. Se compara el valor REAL a mitad de
  // cuadro contra la interpolacion lineal entre las dos muestras vecinas, y se informa el peor caso: si
  // es grande, el motor va a dibujar otra curva que AE y hay que saberlo antes de mirar el video.
  if (expr === "SI") {
    var cuerpo = "";
    try { cuerpo = prop.expression; } catch (exC) { cuerpo = "?"; }
    anotar("EXPR|" + idx + "|" + etiqueta + "|" + limpio(cuerpo));

    var muestras = [], cc, roto = false;
    for (cc = 0; cc <= totalCuadros; cc++) {
      var vv = null;
      try { vv = prop.valueAtTime(cc / comp.frameRate, false); } catch (exVA) { vv = null; }
      if (vv === null) { roto = true; break; }
      muestras[cc] = vv;
      anotar("HORNEADO|" + idx + "|" + etiqueta + "|" + cc + "|" + comoLista(vv));
    }
    if (roto) {
      anotar("NOSOP|" + idx + "|no se pudo muestrear la expresion de " + etiqueta);
    } else {
      // el control de resolucion, en unidades de la propiedad
      var peor = 0, peorEn = -1, cm2;
      for (cm2 = 1; cm2 <= totalCuadros; cm2++) {
        var vmed = null;
        try { vmed = prop.valueAtTime((cm2 - 0.5) / comp.frameRate, false); } catch (exVM) { vmed = null; }
        if (vmed === null) { continue; }
        var A = muestras[cm2 - 1], B = muestras[cm2];
        var d = 0, q2;
        if (typeof vmed.length === "number") {
          for (q2 = 0; q2 < vmed.length; q2++) { d = Math.max(d, Math.abs(vmed[q2] - (A[q2] + B[q2]) / 2)); }
        } else {
          d = Math.abs(vmed - (A + B) / 2);
        }
        if (d > peor) { peor = d; peorEn = cm2; }
      }
      anotar("EXPRERROR|" + idx + "|" + etiqueta + "|" + peor + "|" + peorEn);
    }
  }

  var k;
  for (k = 1; k <= prop.numKeys; k++) {
    var ein = prop.keyInTemporalEase(k);
    var eout = prop.keyOutTemporalEase(k);
    var partes = ["KEY", idx, etiqueta, k, prop.keyTime(k), comoLista(prop.keyValue(k)), ein.length];
    var j;
    for (j = 0; j < ein.length; j++) { partes[partes.length] = ein[j].speed + ";" + ein[j].influence; }
    for (j = 0; j < eout.length; j++) { partes[partes.length] = eout[j].speed + ";" + eout[j].influence; }
    anotar(partes.join("|"));

    var tin = "?", tout = "?", rov = "na", cont = "na", auto = "na";
    try { tin = prop.keyInInterpolationType(k); } catch (e1) { tin = "err"; }
    try { tout = prop.keyOutInterpolationType(k); } catch (e2) { tout = "err"; }
    try { rov = prop.keyRoving(k) ? "SI" : "no"; } catch (e3) { rov = "na"; }
    try { cont = prop.keyTemporalContinuous(k) ? "SI" : "no"; } catch (e4) { cont = "na"; }
    try { auto = prop.keyTemporalAutoBezier(k) ? "SI" : "no"; } catch (e5) { auto = "na"; }
    anotar("TIPO|" + idx + "|" + etiqueta + "|" + k + "|" + tin + "|" + tout + "|" + rov + "|" + cont + "|" + auto);

    // TANGENTES ESPACIALES: sin esto, una trayectoria curva se convierte en una recta "parecida".
    var sin = "na", sout = "na", sauto = "na";
    try { sin = comoLista(prop.keyInSpatialTangent(k)); } catch (e6) { sin = "na"; }
    try { sout = comoLista(prop.keyOutSpatialTangent(k)); } catch (e7) { sout = "na"; }
    try { sauto = prop.keySpatialAutoBezier(k) ? "SI" : "no"; } catch (e8) { sauto = "na"; }
    anotar("ESPACIAL|" + idx + "|" + etiqueta + "|" + k + "|" + sin + "|" + sout + "|" + sauto);
  }
}

function tal(grupo, matchName) {
  try { return grupo.property(matchName); } catch (exP) { return null; }
}

// EL VALOR DE UNA PROPIEDAD, O UN DEFECTO. Se declara aca arriba y no adentro del bucle del selector:
// una funcion declarada dentro de un bloque es legal en ExtendScript y es una trampa igual, porque se
// iza al tope de la funcion contenedora y captura la variable del bucle por referencia.
// ¿ESTA `que` EN LA LISTA `lista`, separada por punto y coma? Escrito a mano por dos motivos: ES3 no
// tiene Array.indexOf, y la compuerta de ES3 no puede distinguir el indexOf de String del de Array por
// el nombre, asi que usarlo aca la haria ponerse roja sobre algo correcto — y una compuerta que se pone
// roja sobre lo normal se aprende a ignorar.
function enLista(lista, que) {
  var partes = lista.split(";"), z;
  for (z = 0; z < partes.length; z++) { if (partes[z] === que) { return true; } }
  return false;
}

// UNA LISTA DE PUNTOS, compacta. Los vertices y las tangentes de un trazado vienen como pares.
function puntos(arr) {
  if (!arr) { return ""; }
  var s = "", z;
  for (z = 0; z < arr.length; z++) {
    if (z > 0) { s = s + ";"; }
    s = s + arr[z][0].toFixed(3) + "," + arr[z][1].toFixed(3);
  }
  return s;
}

function valorDe(grupo, matchName, porDefecto) {
  var p = tal(grupo, matchName);
  if (p === null) { return porDefecto; }
  try { return p.value; } catch (exVd) { return porDefecto; }
}

// ¿HAY ALGUNA CLAVE EN ALGUN LUGAR DE ESTE ARBOL?
//
// El arbol de una capa de forma es profundo y con nombres que cambian entre versiones: grupos dentro
// de grupos, trazados, rellenos, trazos, repetidores. Buscar propiedades concretas por nombre seria
// otra vez la trampa de los nombres traducidos. Lo unico que hace falta saber es si ALGO ahi adentro
// esta animado, porque una rasterizacion lo congela — asi que se recorre a ciegas y se pregunta lo
// unico que es universal: numKeys.
//
// El limite de profundidad no es paranoia: un repetidor con grupos anidados puede ser muy hondo, y una
// recursion sin techo en ExtendScript no da un error legible, da una sesion colgada.
// BUSCAR UNA PROPIEDAD POR SU matchName EN TODO EL ARBOL. Los nombres visibles estan traducidos y
// cambian entre versiones; el matchName no. Es la misma razon por la que todo este exportador usa
// matchName y nunca `property("Contents")`.
function buscarPorMatch(propiedad, mn, hondo) {
  if (propiedad === null || propiedad === undefined || hondo > 8) { return null; }
  try { if (propiedad.matchName === mn) { return propiedad; } } catch (exMN) {}
  var n = 0;
  try { n = propiedad.numProperties; } catch (exNP) { return null; }
  var j;
  for (j = 1; j <= n; j++) {
    var hijo = null;
    try { hijo = propiedad.property(j); } catch (exH) { hijo = null; }
    var r = buscarPorMatch(hijo, mn, hondo + 1);
    if (r !== null) { return r; }
  }
  return null;
}

function tieneClaves(propiedad, hondo) {
  if (propiedad === null || propiedad === undefined || hondo > 8) { return false; }
  try {
    if (propiedad.numKeys > 0) { return true; }
  } catch (exNK) { /* los grupos no tienen numKeys */ }
  try {
    if (propiedad.expressionEnabled) { return true; }
  } catch (exEx) {}
  var n = 0;
  try { n = propiedad.numProperties; } catch (exNP) { return false; }
  var j;
  for (j = 1; j <= n; j++) {
    var hijo = null;
    try { hijo = propiedad.property(j); } catch (exH) { hijo = null; }
    if (tieneClaves(hijo, hondo + 1)) { return true; }
  }
  return false;
}

// ---------------------------------------------------------------- las capas
var i;
for (i = 1; i <= comp.numLayers; i++) {
  var capa = comp.layer(i);

  // UNA CAPA GUIA NO SE EXPORTA, Y NO ES UN RECHAZO: ES QUE NO SE DIBUJA.
  //
  // AE excluye las capas guia del render por definicion — son andamio de autoria. El caso concreto que
  // trajo esto es el nulo de control de `G.control`: lleva deslizadores de los que cuelgan las
  // expresiones de la pieza, y todo efecto se informa NOSOP (linea ~422), asi que tres deslizadores
  // dejaban el documento INCOMPLETO.
  //
  // Y son un NOSOP falso: las expresiones que leen esos deslizadores YA ESTAN HORNEADAS cuadro a
  // cuadro, o sea que el valor del deslizador viaja adentro de las muestras. Informar que "no viaja"
  // algo cuyo efecto si viaja es peor que no informar nada — entrena a ignorar la lista.
  //
  // Se anota igual, con su propia etiqueta, para que quede dicho cuales se saltearon y por que.
  var esGuia = false;
  try { esGuia = capa.guideLayer === true; } catch (exG) { esGuia = false; }
  if (esGuia) {
    anotar("GUIA|" + i + "|" + limpio(capa.name) + "|no se dibuja: andamio de autoria");
    continue;
  }

  var tipo = "av";
  if (capa instanceof TextLayer) { tipo = "texto"; }
  else if (capa instanceof ShapeLayer) { tipo = "forma"; }
  else if (capa instanceof CameraLayer) { tipo = "camara"; }
  else if (capa instanceof LightLayer) { tipo = "luz"; }
  else if (capa.nullLayer) { tipo = "nula"; }
  // `capa.source` de un solido NO es un SolidSource: es un FootageItem cuyo `mainSource` lo es. La
  // primera version comparaba contra `capa.source` y nunca daba verdadero, asi que TODOS los solidos
  // salian como "av" y su COLOR no se exportaba. No fallaba: exportaba una capa sin color, que el
  // reproductor iba a dibujar de algun color por defecto. Otra vez lo mismo — no rompe, sale parecido.
  else if (capa.source && capa.source.mainSource && capa.source.mainSource instanceof SolidSource) { tipo = "solido"; }

  var padre = capa.parent ? capa.parent.index : 0;
  // una camara no tiene modo de fusion: sin el guard se emitia la cadena "undefined" y `+f[10]` daba
  // NaN, con lo que toda camara salia del documento con la fusion en "otra"
  var fusion = "na";
  try { if (typeof capa.blendingMode === "number") { fusion = capa.blendingMode; } } catch (exB) { fusion = "na"; }
  // UNA CAMARA NO TIENE `threeDLayer`. Vive en el espacio 3D por definicion, asi que AE no le pone la
  // propiedad — y leerla devuelve `undefined`, sin error. El exportador la marcaba como capa 2D y por
  // eso NUNCA volcaba `orientacion`, `rotacionX` ni `rotacionY` de la camara: un balanceo (dutch) o una
  // inclinacion se exportaban como una camara quieta. No fallaba nada, no avisaba nadie, y el
  // reproductor pintaba una toma distinta a la de AE. Es la misma familia de defecto que el color de
  // los solidos de mas arriba: leer una propiedad que no existe y aceptar el cero como dato.
  var es3D = false;
  try { es3D = (tipo === "camara") || (capa.threeDLayer ? true : false); } catch (exD) { es3D = (tipo === "camara"); }

  // LA IDENTIDAD ESTABLE, ADEMAS DEL INDICE.
  //
  // El indice de capa de AE es POSICIONAL: agregar o reordenar una capa corre todos los de abajo. Un
  // documento que referencia sus partes por indice —como este referencia al padre— describe bien una
  // foto y mal una plantilla, porque una plantilla se vuelve a exportar despues de que alguien la
  // toco. Lottie resuelve lo mismo con un `ind` propio; AE tiene `layer.id`, y esta medido que
  // sobrevive al reordenamiento (el texto paso del indice 2 al 1 y su id siguio siendo 743).
  var idEstable = 0;
  try { idEstable = capa.id; } catch (exId) { idEstable = 0; }

  anotar("CAPA|" + i + "|" + limpio(capa.name) + "|" + tipo + "|" + (capa.enabled ? 1 : 0) +
         "|" + capa.inPoint + "|" + capa.outPoint + "|" + capa.startTime + "|" + capa.stretch +
         "|" + padre + "|" + fusion + "|" + (es3D ? 1 : 0) + "|" + idEstable);

  // EL COMENTARIO DE LA CAPA ES DONDE SE DECLARA LO QUE AE NO PUEDE REPRESENTAR.
  //
  // El resplandor es el caso: los efectos de AE se calculan sobre el raster 2D de la capa ANTES de la
  // transformacion 3D, y el bloom de un motor web es post-proceso en espacio de pantalla. Son dos
  // lugares distintos del pipeline, asi que PORTAR el efecto es perseguir una fidelidad que no existe.
  // Lo que viaja es la INTENCION: "esta capa brilla asi de fuerte", y el reproductor la resuelve con
  // la mejor herramienta que tenga.
  //
  // Y se usa el comentario y NO los parametros del efecto Glow por una razon medida: los nombres de
  // las propiedades de efecto estan TRADUCIDOS, igual que los de menu — donde `findMenuCommandId
  // ("Easy Ease")` devolvia 0 y el que existia era "Aceleracion suave". Un exportador que busque
  // "Glow Intensity" anda en ingles y falla mudo en español. El comentario es texto que escribe el
  // autor: no depende del idioma de la interfaz.
  //
  // Sintaxis:  brillo <fuerza> <radio> <umbral>      por ejemplo:  brillo 1.4 0.7 0.55
  var comentario = "";
  try { comentario = capa.comment || ""; } catch (exCom) { comentario = ""; }
  if (comentario !== "") { anotar("COMENTARIO|" + i + "|" + limpio(comentario)); }

  // --- inventario de lo que NO va a viajar. Cada linea de estas pone el veredicto en rojo.
  var efectos = tal(capa, "ADBE Effect Parade");
  if (efectos !== null && efectos.numProperties > 0) {
    var e;
    for (e = 1; e <= efectos.numProperties; e++) {
      anotar("NOSOP|" + i + "|efecto|" + limpio(efectos.property(e).name));
    }
  }
  // ================================================================ LAS MASCARAS
  //
  // Hasta hoy esto era un NOSOP entero. Sin mascaras el motor solo sabia revelar con un RECTANGULO
  // coplanar, y la gramatica del genero —medida sobre ocho avisos— dice que la transicion es SIEMPRE un
  // objeto que ya estaba en escena y que 0 de 8 usan cortinilla generica. Sin forma no hay transicion.
  //
  // TODO MEDIDO EN `sondas/mascara.jsx`, nada de memoria:
  //   · el atomo tiene EXACTAMENTE cuatro hijas: trazado, calado, opacidad y expansion
  //   · el MODO y la INVERSION son atributos del objeto, no propiedades: no se animan
  //   · los vertices vienen en COORDENADAS DE CAPA y las tangentes son RELATIVAS al vertice
  //   · el enum de modos va de 6812 (ninguno) a 6818 (diferencia)
  //
  // Y LA DECISION QUE MAS IMPORTA: UN TRAZADO ANIMADO SE MANDA MUESTREADO, UN CUADRO POR VEZ.
  //
  // AE NO interpola trazados de forma reproducible. Medido: entre un triangulo de 3 vertices y un
  // cuadrado de 4, en el medio devuelve CUATRO vertices — le inserto uno al triangulo, y no en el punto
  // medio del lado sino en el 42% de el. Con 4 contra 6 vertices devuelve seis. O sea que hay una
  // heuristica de emparejamiento que no esta documentada y que reproducir a ojo daria un morphing
  // parecido, que es la palabra que este proyecto no acepta.
  //
  // `valueAtTime` SI devuelve el trazado ya interpolado en cualquier instante. Asi que el exportador no
  // reproduce la interpolacion: la MUESTREA. Exacto por construccion, y el motor no necesita saber nada
  // de como AE emparejo los vertices.
  var mascaras = tal(capa, "ADBE Mask Parade");
  if (mascaras !== null && mascaras.numProperties > 0) {
    var mi;
    for (mi = 1; mi <= mascaras.numProperties; mi++) {
      var M = mascaras.property(mi);
      var trazadoM = tal(M, "ADBE Mask Shape");
      if (trazadoM === null) { anotar("NOSOP|" + i + "|mascara sin trazado|" + mi); continue; }

      var rotoB = false;
      try { rotoB = M.rotoBezier ? true : false; } catch (exRB) { rotoB = false; }
      if (rotoB) {
        // el rotobezier calcula las tangentes solo, con otra curva: los valores que devuelve el trazado
        // no describen la forma que se ve
        anotar("NOSOP|" + i + "|mascara con rotobezier (las tangentes no viajan)|" + mi);
        continue;
      }

      // el CALADO VARIABLE vive en campos aparte del Shape y es otra familia entera
      var v0 = null;
      try { v0 = trazadoM.valueAtTime(0, false); } catch (exV0) { v0 = null; }
      if (v0 !== null && v0.featherRadii && v0.featherRadii.length > 0) {
        anotar("NOSOP|" + i + "|mascara con calado variable por vertice|" + v0.featherRadii.length);
        continue;
      }

      var modoM = 6813, invM = false, nomM = "";
      try { modoM = M.maskMode; } catch (exMo) {}
      try { invM = M.inverted ? 1 : 0; } catch (exIn) { invM = 0; }
      try { nomM = M.name; } catch (exNo) { nomM = ""; }
      anotar("MASCARA|" + i + "|" + mi + "|" + modoM + "|" + invM + "|" + limpio(nomM) +
             "|" + (trazadoM.numKeys > 0 ? 1 : 0));

      // el trazado: una linea si es fijo, una por cuadro si esta animado
      var cuadrosM = [];
      if (trazadoM.numKeys > 0) {
        var cm;
        for (cm = 0; cm <= totalCuadros; cm++) { cuadrosM[cuadrosM.length] = cm; }
      } else {
        cuadrosM = [-1];        // -1 = vale para toda la pieza
      }
      var cj;
      for (cj = 0; cj < cuadrosM.length; cj++) {
        var tm = cuadrosM[cj] < 0 ? 0 : cuadrosM[cj] / comp.frameRate;
        var sh = null;
        try { sh = trazadoM.valueAtTime(tm, false); } catch (exSh) { sh = null; }
        if (sh === null) { anotar("NOSOP|" + i + "|no se pudo leer el trazado de la mascara|" + mi); break; }
        anotar("MASCARAV|" + i + "|" + mi + "|" + cuadrosM[cj] + "|" + (sh.closed ? 1 : 0) +
               "|" + sh.vertices.length +
               "|" + puntos(sh.vertices) + "|" + puntos(sh.inTangents) + "|" + puntos(sh.outTangents));
      }

      // las tres que SI se animan
      volcarProp(i, "mascara" + mi + ".calado", tal(M, "ADBE Mask Feather"));
      volcarProp(i, "mascara" + mi + ".opacidad", tal(M, "ADBE Mask Opacity"));
      volcarProp(i, "mascara" + mi + ".expansion", tal(M, "ADBE Mask Offset"));
    }
  }
  // ---------------------------------------------------------------- FORMAS: se RASTERIZAN
  //
  // Portar el arbol de formas de AE —trazados, rellenos, trazos, grupos anidados, repetidores— es el
  // build mas grande de todo el exportador. Y casi ninguna forma necesita ser EDITABLE en la web: lo
  // editable de una plantilla es el texto, los colores y las imagenes. Una esquina redondeada o un
  // marco son decoracion.
  //
  // Asi que se rasteriza: se renderiza la forma sola a un PNG y se trata como una imagen. Se pierde la
  // editabilidad de la forma y se conserva el ASPECTO EXACTO — que es el intercambio correcto, porque
  // el aspecto es lo que no se puede aproximar y la editabilidad de un rectangulo redondeado no le
  // hace falta a nadie.
  //
  // NO SE TOCA LA CAPA ORIGINAL. Lo directo seria neutralizar su transformacion, renderizar y
  // restaurarla — y ahi se pierde trabajo del usuario: si la transformacion tiene keyframes hay que
  // borrarlos y reponerlos, y cualquier corte en el medio (un error, un cartel, un corte de luz) deja
  // la capa rota. Se copia a una composicion temporal, se neutraliza LA COPIA, y la temporal se borra.
  if (tipo === "forma") {
    var caja = null;
    try { caja = capa.sourceRectAtTime(capa.inPoint, true); } catch (exCaja) { caja = null; }

    // EL CONTENIDO ANIMADO NO SOBREVIVE A UNA RASTERIZACION, y hay que decirlo: un trazado que se
    // deforma con el tiempo sale congelado en el instante que se rindio. Si no se avisara, la pieza
    // saldria "parecida" — con la forma quieta donde deberia moverse.
    var raizForma = tal(capa, "ADBE Root Vectors Group");

    // ================================================================ EL TRAZO QUE SE DIBUJA
    //
    // Segundo caso de forma que viaja VECTORIAL en vez de rasterizada, y este si generaliza: un
    // trazado libre con trazo y/o relleno, y opcionalmente "recortar trazados". Es la figura del
    // subrayado que crece, la flecha que se dibuja, el contorno que aparece y el morphing.
    //
    // SE RECONOCE POR ESTRUCTURA Y SE ACOTA A PROPOSITO. Un grupo, y adentro solo trazados libres,
    // trazo, relleno y recorte. Cualquier otra cosa —repetidores, fusionar trazados, degradados,
    // grupos anidados, formas parametricas— sigue rasterizandose como hasta hoy. Aprobar un arbol que
    // el motor no sabe dibujar daria una forma PARECIDA, que es la palabra que este proyecto no acepta.
    //
    // LA SEMANTICA DEL RECORTE, MEDIDA con `sondas/trazo.jsx` y cuadros de AE (no leida):
    //   · inicio y fin son POR CIENTO DE LA LONGITUD DE ARCO. Una recta de 300 px al 50% dibuja 150.
    //     Una ELE de 300+100 al 50% dibuja 200 px del tramo horizontal y nada del vertical: la
    //     longitud corre sobre el trazado ENTERO, no por segmento.
    //   · EL DESFASE ESTA EN GRADOS, no en por ciento. Con desfase 25 la ventana corrio 28 px sobre un
    //     trazado de 400, y 25/360 x 400 = 27,8. Es la trampa de esta funcion.
    //   · con varios subtrazados y el tipo en 1, se recorta CADA UNO POR SU LADO: dos tramos de 140 al
    //     50% dan 0..69 y 180..249, no 0..140 y nada.
    var vectorial = 0;
    var raizV = raizForma;
    if (raizV !== null && raizV.numProperties === 1) {
      var gr1 = raizV.property(1);
      var cont1 = null;
      try { cont1 = gr1.property("ADBE Vectors Group"); } catch (exG1) { cont1 = null; }
      if (cont1 !== null) {
        var soportadas = ";ADBE Vector Shape - Group;ADBE Vector Graphic - Stroke;" +
                         "ADBE Vector Graphic - Fill;ADBE Vector Filter - Trim;";
        var todoOk = true, gk;
        for (gk = 1; gk <= cont1.numProperties; gk++) {
          if (enLista(soportadas, cont1.property(gk).matchName) === false) { todoOk = false; }
        }
        // la transformacion propia del grupo tiene que estar en su valor neutro: aplicarla seria otro
        // nivel de anidamiento y el motor dibuja el contenido tal cual
        var trG = null;
        try { trG = gr1.property("ADBE Vector Transform Group"); } catch (exTG) { trG = null; }
        var neutro = true;
        if (trG !== null) {
          var esc1 = valorDe(trG, "ADBE Vector Scale", [100, 100]);
          var pos1 = valorDe(trG, "ADBE Vector Position", [0, 0]);
          var rot1 = valorDe(trG, "ADBE Vector Rotation", 0);
          if (esc1[0] !== 100 || esc1[1] !== 100 || pos1[0] !== 0 || pos1[1] !== 0 || rot1 !== 0) {
            neutro = false;
          }
        }
        if (todoOk && neutro) {
          vectorial = 1;
          anotar("FORMAV|" + i + "|" + cont1.numProperties);
          var vk;
          for (vk = 1; vk <= cont1.numProperties; vk++) {
            var el = cont1.property(vk);
            var mn = el.matchName;
            if (mn === "ADBE Vector Shape - Group") {
              var pTz = el.property("ADBE Vector Shape");
              var animTz = pTz.numKeys > 0;
              anotar("FORMATZ|" + i + "|" + vk + "|" + (animTz ? 1 : 0));
              // MUESTREADO SI ESTA ANIMADO, por el mismo motivo que las mascaras: AE no interpola
              // trazados de forma reproducible, pero `valueAtTime` los entrega ya interpolados.
              var listaC = animTz ? null : [-1];
              if (listaC === null) {
                listaC = [];
                var cc;
                for (cc = 0; cc <= totalCuadros; cc++) { listaC[listaC.length] = cc; }
              }
              var ci2;
              for (ci2 = 0; ci2 < listaC.length; ci2++) {
                var tv = listaC[ci2] < 0 ? 0 : listaC[ci2] / comp.frameRate;
                var shv = null;
                try { shv = pTz.valueAtTime(tv, false); } catch (exSv) { shv = null; }
                if (shv === null) { break; }
                anotar("FORMAV_TZ|" + i + "|" + vk + "|" + listaC[ci2] + "|" + (shv.closed ? 1 : 0) +
                       "|" + puntos(shv.vertices) + "|" + puntos(shv.inTangents) + "|" + puntos(shv.outTangents));
              }
            } else if (mn === "ADBE Vector Graphic - Stroke") {
              anotar("FORMATRAZO|" + i + "|" + vk +
                     "|" + comoLista(valorDe(el, "ADBE Vector Stroke Color", [1, 1, 1, 1])) +
                     "|" + valorDe(el, "ADBE Vector Stroke Line Cap", 1) +
                     "|" + valorDe(el, "ADBE Vector Stroke Line Join", 1) +
                     "|" + valorDe(el, "ADBE Vector Stroke Miter Limit", 4));
              volcarProp(i, "forma" + vk + ".grosor", tal(el, "ADBE Vector Stroke Width"));
              volcarProp(i, "forma" + vk + ".opacidadTrazo", tal(el, "ADBE Vector Stroke Opacity"));
              // LOS GUIONES: el grupo expone SUS SIETE PROPIEDADES SIEMPRE, se usen o no — la misma
              // trampa que el animador de texto con sus 103. Contarlas dio cinco rechazos falsos de
              // cinco capas, o sea el 100%. Se filtra por `isModified`, igual que alla.
              var dsh = tal(el, "ADBE Vector Stroke Dashes");
              if (dsh !== null) {
                var hayGuion = false, dk;
                for (dk = 1; dk <= dsh.numProperties; dk++) {
                  var dp = dsh.property(dk);
                  try { if (dp.isModified === true || dp.numKeys > 0) { hayGuion = true; } } catch (exDk) {}
                }
                if (hayGuion) { anotar("NOSOP|" + i + "|trazo con guiones|" + dsh.numProperties); }
              }
            } else if (mn === "ADBE Vector Graphic - Fill") {
              anotar("FORMARELLENO|" + i + "|" + vk +
                     "|" + comoLista(valorDe(el, "ADBE Vector Fill Color", [1, 1, 1, 1])) +
                     "|" + valorDe(el, "ADBE Vector Fill Rule", 1));
              volcarProp(i, "forma" + vk + ".opacidadRelleno", tal(el, "ADBE Vector Fill Opacity"));
            } else if (mn === "ADBE Vector Filter - Trim") {
              anotar("FORMARECORTE|" + i + "|" + vk + "|" + valorDe(el, "ADBE Vector Trim Type", 1));
              volcarProp(i, "forma" + vk + ".recorteIni", tal(el, "ADBE Vector Trim Start"));
              volcarProp(i, "forma" + vk + ".recorteFin", tal(el, "ADBE Vector Trim End"));
              volcarProp(i, "forma" + vk + ".recorteDesf", tal(el, "ADBE Vector Trim Offset"));
            }
          }
        } else if (!neutro) {
          anotar("NOSOP|" + i + "|el grupo de la forma tiene transformacion propia|-");
        }
      }
    }

    // EL ARCO QUE CRECE — el unico contenido de forma animado que SI viaja, y viaja exacto.
    //
    // Es una elipse con trazo y un "recortar trazados": AE lo previsualiza perfecto y el motor lo dibuja
    // con un anillo y un descarte por angulo, sin rasterizar nada. Lo que se manda son los numeros —
    // radio, grosor, color— y el recorrido del recorte como propiedad animable.
    //
    // SE RECONOCE POR ESTRUCTURA, no por el nombre de la capa: tiene que haber una elipse, un trazo y
    // un recorte. Cualquier otra forma animada sigue rechazandose, porque el motor sabe dibujar ESTE
    // caso y no los demas — y aprobar una forma cualquiera dando un anillo seria peor que rechazarla.
    var esArco = 0;
    if (raizForma !== null) {
      var elip = buscarPorMatch(raizForma, "ADBE Vector Shape - Ellipse", 0);
      var traz = buscarPorMatch(raizForma, "ADBE Vector Graphic - Stroke", 0);
      var reco = buscarPorMatch(raizForma, "ADBE Vector Filter - Trim", 0);
      if (elip !== null && traz !== null && reco !== null) {
        var tam = elip.property("ADBE Vector Ellipse Size").value;
        var grosor = traz.property("ADBE Vector Stroke Width").value;
        var col = traz.property("ADBE Vector Stroke Color").value;
        anotar("ARCO|" + i + "|" + tam[0] + "|" + tam[1] + "|" + grosor +
               "|" + col[0] + ";" + col[1] + ";" + col[2]);
        volcarProp(i, "arcoDesde", tal(reco, "ADBE Vector Trim Start"));
        volcarProp(i, "arcoHasta", tal(reco, "ADBE Vector Trim End"));
        volcarProp(i, "arcoDesfase", tal(reco, "ADBE Vector Trim Offset"));
        esArco = 1;
      }
    }

    if (!esArco && raizForma !== null && tieneClaves(raizForma, 0)) {
      anotar("NOSOP|" + i + "|el CONTENIDO de la forma esta animado y la rasterizacion lo congela|-");
    }

    if (caja === null || caja.width < 1 || caja.height < 1) {
      anotar("NOSOP|" + i + "|capa de forma sin extension medible|-");
    } else {
      var MARGEN = 6;                       // para que el suavizado del borde no quede recortado
      var anchoR = Math.ceil(caja.width) + MARGEN * 2;
      var altoR = Math.ceil(caja.height) + MARGEN * 2;
      var temporal = null;
      try {
        var medios2 = new Folder(DIR_MEDIOS);
        if (!medios2.exists) { medios2.create(); }
        temporal = app.project.items.addComp("__raster_tmp", anchoR, altoR, 1, 1, comp.frameRate);
        temporal.resolutionFactor = [1, 1];
        capa.copyToComp(temporal);
        var copia = temporal.layer(1);
        copia.threeDLayer = false;
        var trCopia = copia.property("ADBE Transform Group");
        var CLAVES = ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Opacity"];
        var cc;
        for (cc = 0; cc < CLAVES.length; cc++) {
          var pr = trCopia.property(CLAVES[cc]);
          try { pr.expression = ""; } catch (exE2) {}
          while (pr.numKeys > 0) { pr.removeKey(1); }
        }
        // el anclaje al centro de la caja medida, y la capa al centro de la comp temporal
        trCopia.property("ADBE Anchor Point").setValue([caja.left + caja.width / 2, caja.top + caja.height / 2, 0]);
        trCopia.property("ADBE Position").setValue([anchoR / 2, altoR / 2]);
        trCopia.property("ADBE Scale").setValue([100, 100]);
        trCopia.property("ADBE Rotate Z").setValue(0);
        trCopia.property("ADBE Opacity").setValue(100);

        var nombreR = "forma-" + i + ".png";
        temporal.saveFrameToPng(0, new File(DIR_MEDIOS + "/" + nombreR));
        anotar("RASTER|" + i + "|" + nombreR + "|" + caja.left + "|" + caja.top +
               "|" + caja.width + "|" + caja.height + "|" + MARGEN + "|" + anchoR + "|" + altoR);
      } catch (exRas) {
        anotar("NOSOP|" + i + "|no se pudo rasterizar la forma|" + texto(exRas));
      }
      // la temporal se borra SIEMPRE, tambien si algo fallo: si no, cada corrida deja una comp basura
      // en el proyecto y a la decima el panel es ilegible
      if (temporal !== null) { try { temporal.remove(); } catch (exBorrar) {} }
    }
  }
  if (tipo === "luz") { anotar("NOSOP|" + i + "|capa de luz|-"); }

  // LAS CAPAS 3D Y LAS CAMARAS YA VIAJAN. Estaba medido antes de habilitarlas: la proyeccion de AE es
  // una camara de perspectiva estandar (0,043 px de posicion, 0,00% de area en capas rotadas), las
  // rotaciones se componen en XYZ, y el look-at de una camara de dos nodos es el estandar (0,028 px).
  // Ver el cuaderno, partes X y secciones 59-60.
  if (tipo === "camara") {
    var opc = tal(capa, "ADBE Camera Options Group");
    var zoom = "?", enfoque = "?", apertura = "?";
    try { zoom = opc.property("ADBE Camera Zoom").value; } catch (e21) {}
    try { enfoque = opc.property("ADBE Camera Focus Distance").value; } catch (e22) {}
    try { apertura = opc.property("ADBE Camera Aperture").value; } catch (e23) {}
    // SI LA PROFUNDIDAD DE CAMPO ESTA ENCENDIDA O NO. Sin este dato, enfoque y apertura son dos numeros
    // que siempre estan y no significan nada: AE los guarda igual con la profundidad apagada, asi que
    // el motor no puede distinguir "enfocado a 2666" de "no hay profundidad de campo".
    var conProf = 0;
    try { conProf = opc.property("ADBE Camera Depth of Field").value ? 1 : 0; } catch (e25) { conProf = 0; }
    var difusion = 0;
    try { difusion = opc.property("ADBE Camera Blur Level").value; } catch (e26) { difusion = 100; }
    var ao = "?";
    try { ao = capa.autoOrient; } catch (e24) {}
    anotar("CAMARA|" + i + "|" + zoom + "|" + enfoque + "|" + apertura + "|" + ao +
           "|" + AutoOrientType.CAMERA_OR_POINT_OF_INTEREST + "|" + AutoOrientType.NO_AUTO_ORIENT +
           "|" + conProf + "|" + difusion);
    // EL ENFOQUE Y LA APERTURA TAMBIEN SE ANIMAN — es el cambio de foco, uno de los cuatro modos de
    // entrada que midio el barrido. Sin volcarlos, un rack focus autorado con cuidado llega al motor
    // como un foco fijo y nadie avisa.
    if (opc !== null) {
      volcarProp(i, "enfoque", tal(opc, "ADBE Camera Focus Distance"));
      volcarProp(i, "apertura", tal(opc, "ADBE Camera Aperture"));
    }
    // EL ZOOM PUEDE ESTAR ANIMADO, y si no se vuelca, un travelling de lente pasa a ser una camara
    // quieta sin que nada avise.
    if (opc !== null) { volcarProp(i, "zoom", tal(opc, "ADBE Camera Zoom")); }

    // Y ACA VA LA TRAMPA QUE MAS CUESTA: una camara de DOS NODOS no guarda su apuntado en ninguna
    // propiedad. Sus rotaciones informan CERO y aun asi mira al punto de interes. Un exportador que
    // lea las rotaciones obtiene cero, no da ningun error, y la camara del reproductor queda mirando
    // a cualquier lado. Por eso se vuelca `autoOrient` y el punto de interes: el reproductor tiene
    // que CALCULAR el look-at cuando corresponda, no leerlo.
    // Se informa como INFO y no como NOTA: `NOTA` significa "algo no salio como se pidio" y pone el
    // veredicto en rojo. Una camara de dos nodos es lo NORMAL —es lo que crea AE por defecto—, asi que
    // marcarla como problema haria fallar toda composicion con camara. La distincion importa: una
    // compuerta que se pone roja por lo normal se aprende a ignorar.
    if (ao === AutoOrientType.CAMERA_OR_POINT_OF_INTEREST) {
      anotar("INFO|" + i + "|camara de dos nodos: el apuntado se calcula del punto de interes|-");
    }
  }
  // EL MATTE DE PISTA RECTANGULAR SI VIAJA, y se hace con matte de AE a proposito en vez de con una
  // capa apagada que el reproductor use como recorte.
  //
  // La alternativa tentadora era declarar la recortadora con el ojo cerrado y que solo el motor la
  // mirara. Se rompe sola: AE tampoco la dibuja, asi que en la PREVISUALIZACION el texto se veria SIN
  // recortar y en el render recortado. La premisa entera de este arreglo es que AE es la regla; una
  // regla que muestra otra cosa que el resultado no sirve para nada.
  //
  // SOLO EL CASO RECTANGULAR. Un matte de alfa puede tener cualquier forma, y el motor lo resuelve con
  // cuatro planos de recorte — que son exactamente un rectangulo. Si la capa que hace de matte es un
  // solido, el rectangulo es exacto; cualquier otra cosa (un texto, una imagen con alfa) tendria una
  // forma que los planos no pueden representar, y ahi se sigue rechazando. Aprobar en silencio un matte
  // con forma dando un rectangulo seria peor que rechazarlo.
  try {
    if (capa.trackMatteType !== undefined && capa.trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
      var laMatte = null;
      try { laMatte = capa.trackMatteLayer; } catch (exTL) { laMatte = null; }
      if (laMatte === null && i > 1) { laMatte = comp.layer(i - 1); }
      var esSolido = false, idxMatte = 0;
      try {
        idxMatte = laMatte ? laMatte.index : 0;
        // UNA CAPA NULA TAMBIEN ES UN SOLIDO para `instanceof`, y el volcado la tipa "nula" y nunca
        // emite su tamano: llegaba al reproductor sin rectangulo y el recorte fallaba ABIERTO.
        esSolido = laMatte && laMatte.source && (laMatte.source.mainSource instanceof SolidSource) &&
                   !laMatte.nullLayer;
      } catch (exSS) { esSolido = false; }
      // Y SOLO EL CASO COPLANAR Y SIN GIRAR — el resto se rechaza.
      //
      // El matte de pista de AE es alfa de PANTALLA: lo que vale es el cuadrilatero PROYECTADO de la
      // matte. El motor lo resuelve con cuatro planos de recorte, y eso equivale a la proyeccion solo
      // si la matte y la capa recortada estan en el mismo plano y la matte no esta girada. Con la matte
      // girada 42 grados y la capa a otra Z, medido, el recorte sale angosto y la capa casi desaparece.
      //
      // Intente la version general —una piramide desde el ojo— y los cuatro planos dieron residuo cero
      // contra el ojo (o sea: geometricamente bien) y el recorte igual salio mal, porque el ojo y las
      // esquinas no terminan en el mismo espacio. Eso hay que medirlo, no adivinarlo, y hasta entonces
      // prometer el caso general seria vender algo que no anda.
      //
      // Asi que se rechaza con nombre y motivo. Una funcion acotada que dice donde termina es util; una
      // que anda en la sonda y falla en la pieza no.
      var giroM = 0, difZ = 0;
      try {
        var trM = laMatte.property("ADBE Transform Group");
        giroM = Math.abs(trM.property("ADBE Rotate X").value) + Math.abs(trM.property("ADBE Rotate Y").value);
        var zM = trM.property("ADBE Position").value[2] || 0;
        var zC = capa.property("ADBE Transform Group").property("ADBE Position").value[2] || 0;
        difZ = Math.abs(zM - zC);
      } catch (exG) { giroM = 0; difZ = 0; }
      if (esSolido && capa.trackMatteType === TrackMatteType.ALPHA && giroM > 0.5) {
        anotar("NOSOP|" + i + "|el matte esta girado en X o Y y el motor solo sabe el caso coplanar|" + giroM.toFixed(1));
      } else if (esSolido && capa.trackMatteType === TrackMatteType.ALPHA && difZ > 0.5) {
        anotar("NOSOP|" + i + "|el matte y la capa estan a distinta profundidad|" + difZ.toFixed(0));
      } else if (esSolido && capa.trackMatteType === TrackMatteType.ALPHA) {
        anotar("MATTE|" + i + "|" + idxMatte + "|alfa");
      } else {
        anotar("NOSOP|" + i + "|matte de pista no rectangular o no alfa|" + capa.trackMatteType);
      }
    }
  } catch (exT) { /* la capa no admite matte */ }
  // SE COMPRUEBA QUE EXISTA ANTES DE COMPARARLO. Una capa de camara no TIENE modo de fusion: devuelve
  // undefined, y `undefined !== NORMAL` es verdadero, asi que la comparacion directa marcaba toda
  // camara como "modo de fusion distinto de normal" y ponia el documento en incompleto. Un falso
  // positivo sobre lo mas normal del mundo — y una compuerta que se pone roja por lo normal se aprende
  // a ignorar, que es peor que no tenerla.
  try {
    // TRES MODOS DE FUSION SI VIAJAN, y no es una concesion: son la familia de la LUZ. Un cometa de
    // escritura, un destello, un halo o un reflejo SUMAN luz — dibujados en modo normal se leen como
    // pintura blanca, que es exactamente el defecto que se veia en la PIEZA-H. Los tres se mapean a la
    // fusion aditiva de three, que ya estaba armada en el reproductor para el resplandor.
    // El resto sigue siendo NOSOP: multiplicar, superponer y los veinte que faltan no tienen equivalente
    // y aprobarlos en silencio seria peor que rechazarlos.
    // SOLO ANADIR. Yo habia aprobado tambien Pantalla y Aclarar, y las tres se colapsaban en el mismo
    // nombre para dibujarse como suma — despues de escribir tres parrafos arriba diciendo que aprobar
    // algo en silencio dando otra operacion es peor que rechazarlo.
    //
    // No son la misma cuenta: Pantalla es 1-(1-a)(1-b) y Aclarar es max(a,b). Medido: sobre un fondo de
    // 217 con una capa de 77, AE en Aclarar dibuja 217 —o sea la capa es INVISIBLE— y el motor daba 255.
    // Treinta y ocho de 255 de diferencia donde AE no dibuja nada, sin un solo aviso.
    if (typeof capa.blendingMode === "number" &&
        capa.blendingMode !== BlendingMode.NORMAL &&
        capa.blendingMode !== BlendingMode.ADD) {
      anotar("NOSOP|" + i + "|modo de fusion sin equivalente en el motor|" + capa.blendingMode);
    }
  } catch (exF) { /* algunas capas no lo tienen */ }
  try { if (capa.adjustmentLayer) { anotar("NOSOP|" + i + "|capa de ajuste|-"); } } catch (exA) {}
  try { if (capa.timeRemapEnabled) { anotar("NOSOP|" + i + "|remapeo de tiempo|-"); } } catch (exR) {}

  // LA ORIENTACION AUTOMATICA DE UNA CAPA COMUN ERA UN HUECO MUDO. Se controlaba solo en la camara.
  // Una capa 3D con "orientar hacia la camara" o "orientar sobre la trayectoria" NO guarda el giro
  // resultante en ninguna propiedad —igual que la camara de dos nodos—, asi que el exportador leia
  // rotaciones en cero, no daba ningun error, y el reproductor pintaba la capa de frente cuando AE la
  // pintaba girada. Es exactamente el defecto que ya estaba documentado para la camara, sin la
  // salvedad de que ahi es lo normal: en una capa AV esto se pide a proposito y es raro.
  if (tipo !== "camara" && tipo !== "luz") {
    var aoCapa = null;
    try { aoCapa = capa.autoOrient; } catch (exAO) { aoCapa = null; }
    if (aoCapa !== null && aoCapa !== undefined && aoCapa !== AutoOrientType.NO_AUTO_ORIENT) {
      var comoAO = (aoCapa === AutoOrientType.ALONG_PATH) ? "sobre la trayectoria" : "hacia la camara";
      anotar("NOSOP|" + i + "|orientacion automatica (" + comoAO + "): el giro no vive en ninguna propiedad|" + aoCapa);
    }
  }
  // EL DESENFOQUE DE MOVIMIENTO YA NO ES "NO VIAJA": el reproductor lo hace promediando sub-cuadros
  // dentro de la ventana del obturador, que es lo mismo que hace AE. Se vuelca por capa porque en AE
  // se activa por capa Y por composicion: hace falta que las dos esten prendidas.
  try { anotar("MOVBLUR|" + i + "|" + (capa.motionBlur ? 1 : 0)); } catch (exM) {}
  try { if (capa.stretch !== 100) { anotar("NOSOP|" + i + "|estiramiento de tiempo|" + capa.stretch); } } catch (exS) {}

  // --- lo especifico del tipo
  if (tipo === "solido") {
    anotar("SOLIDO|" + i + "|" + comoLista(capa.source.mainSource.color) +
           "|" + capa.source.width + "|" + capa.source.height);
  } else if (tipo === "av" && capa.source) {
    var archivo = "", copiado = "";
    try { if (capa.source.file) { archivo = capa.source.file.fsName; } } catch (exArch) { archivo = "?"; }

    // LA IMAGEN SE COPIA AL LADO DEL DOCUMENTO, no se referencia donde este.
    //
    // Un documento que apunta a `C:/Users/Thiago/Desktop/logo.png` no es un documento: es un documento
    // MAS esa maquina. Se rompe al mandarlo, al mover la carpeta y al abrirlo desde el servidor, y no
    // se rompe ruidosamente — se rompe con una capa que no aparece.
    //
    // Copiando, el documento y sus medios son una sola cosa que se puede mover entera. Es lo mismo que
    // hace un `.aep` cuando se recopilan archivos, y es lo que va a necesitar la web igual.
    if (archivo !== "" && archivo !== "?") {
      try {
        var medios = new Folder(DIR_MEDIOS);
        if (!medios.exists) { medios.create(); }
        var origen = new File(archivo);
        var nombreArch = origen.name;
        var destino = new File(DIR_MEDIOS + "/" + nombreArch);
        // no se re-copia si ya esta: una comp con veinte capas de la misma imagen copiaria veinte veces
        if (!destino.exists || destino.length !== origen.length) { origen.copy(destino.fsName); }
        copiado = nombreArch;
      } catch (exCopia) {
        anotar("NOSOP|" + i + "|no se pudo copiar el medio|" + texto(exCopia));
      }
    } else if (tipo === "av") {
      anotar("NOSOP|" + i + "|capa de metraje sin archivo en disco|" + limpio(capa.source.name));
    }

    anotar("ORIGEN|" + i + "|" + limpio(capa.source.name) + "|" + limpio(archivo) +
           "|" + capa.source.width + "|" + capa.source.height + "|" + limpio(copiado));

    // EL MODO DE ALFA IMPORTA Y NO SE ADIVINA. Una imagen con alfa PREMULTIPLICADO contra blanco y una
    // con alfa directo se ven identicas sobre fondo oscuro y distintas sobre claro: el borde queda con
    // orla. Si el reproductor asume el modo equivocado, el defecto aparece solo en algunas piezas.
    try {
      anotar("ALFA|" + i + "|" + capa.source.mainSource.alphaMode +
             "|" + AlphaMode.STRAIGHT + "|" + AlphaMode.PREMULTIPLIED + "|" + AlphaMode.IGNORE);
    } catch (exAl) { /* algunos origenes no lo exponen */ }
  } else if (tipo === "texto") {
    var td = null;
    var propTexto = null;
    try {
      propTexto = capa.property("ADBE Text Properties").property("ADBE Text Document");
      td = propTexto.value;
    } catch (exTD) { anotar("NOSOP|" + i + "|no se pudo leer el documento de texto|" + texto(exTD)); }
    if (td !== null) {
      // CADA CAMPO EN SU PROPIO try: en un TextDocument, pedir un atributo que no aplica TIRA. Con un
      // solo try alrededor de todos, el primero que falla se lleva puestos los que venian despues, y
      // el texto sale exportado a medias sin que nadie se entere.
      var cont = "", fuente = "", tam = "", relleno = "", hayRelleno = "", trazo = "", hayTrazo = "";
      var interletra = "", alineacion = "", interlinea = "", falso = "";
      try { cont = td.text; } catch (x1) { cont = "?"; }
      try { fuente = td.font; } catch (x2) { fuente = "?"; }
      try { tam = td.fontSize; } catch (x3) { tam = "?"; }
      try { hayRelleno = td.applyFill ? 1 : 0; } catch (x4) { hayRelleno = "?"; }
      try { relleno = comoLista(td.fillColor); } catch (x5) { relleno = "?"; }
      try { hayTrazo = td.applyStroke ? 1 : 0; } catch (x6) { hayTrazo = "?"; }
      try { trazo = comoLista(td.strokeColor); } catch (x7) { trazo = "?"; }
      try { interletra = td.tracking; } catch (x8) { interletra = "?"; }
      try { alineacion = td.justification; } catch (x9) { alineacion = "?"; }
      try { interlinea = td.leading; } catch (xA) { interlinea = "?"; }
      try { falso = (td.fauxBold ? "B" : "") + (td.fauxItalic ? "I" : ""); } catch (xB) { falso = "?"; }
      anotar("TEXTO|" + i + "|" + limpio(cont) + "|" + limpio(fuente) + "|" + tam +
             "|" + hayRelleno + "|" + relleno + "|" + hayTrazo + "|" + trazo +
             "|" + interletra + "|" + alineacion + "|" + interlinea + "|" + falso);

      // LA CAJA MEDIDA DEL TEXTO. Es el primitivo que resuelve el problema del texto que cambia de
      // ancho: la plantilla se diseña con "ACME" y el cliente pone "Construcciones del Sur
      // Patagonico". Sin esta medida, el documento no puede declarar cuanto texto aguanta un hueco.
      try {
        var caja = capa.sourceRectAtTime(capa.inPoint, false);
        anotar("CAJA|" + i + "|" + caja.left + "|" + caja.top + "|" + caja.width + "|" + caja.height);
      } catch (exCaja) { anotar("NOSOP|" + i + "|no se pudo medir la caja del texto|" + texto(exCaja)); }
    }
    if (propTexto !== null && propTexto.numKeys > 0) {
      anotar("NOSOP|" + i + "|el TEXTO esta animado (" + propTexto.numKeys + " keyframes)|-");
    }
    // ---------------------------------------------------------------- LOS ANIMADORES DE TEXTO
    //
    // Hasta hoy esto era un NOSOP entero: "animadores de texto|N". La escritura por caracter aparece en
    // 8 de 8 referencias del genero, asi que rechazarlo obligaba a falsearla con UNA CAPA POR CARACTER
    // —quince capas a mano para una frase— y esa es la razon de fondo por la que las piezas salian
    // ralas: mientras cada gesto cuesta una capa, nadie escribe piezas densas.
    //
    // Ahora viaja. La cuenta del selector esta medida contra AE y verificada en 88 configuraciones
    // (`tools/ae/selector.mjs` + `selector-check.mjs`); la especificacion esta en
    // `.claude/skills/pieza-ae/reference/animador-de-texto.md`.
    //
    // LO QUE SE RECHAZA, CON NOMBRE. Un animador que use algo de esto no viaja a medias: se declara.
    //   · orden aleatorio  — es el PRNG propio de AE y no se reprodujo
    //   · selector de expresion — otra familia entera
    //   · base distinta de "caracteres" — palabras y lineas no se midieron
    //   · cualquier propiedad animable fuera de la lista que el motor sabe aplicar
    var propsMotor = ";ADBE Text Position 3D;ADBE Text Scale 3D;ADBE Text Rotation;" +
                     "ADBE Text Opacity;ADBE Text Fill Color;ADBE Text Tracking Amount;" +
                     "ADBE Text Anchor Point 3D;";
    var animadores = tal(capa, "ADBE Text Properties");
    var anim = animadores === null ? null : tal(animadores, "ADBE Text Animators");
    if (anim !== null && anim.numProperties > 0) {
      var a;
      for (a = 1; a <= anim.numProperties; a++) {
        var A = anim.property(a);
        var sels = tal(A, "ADBE Text Selectors");
        var pr = tal(A, "ADBE Text Animator Properties");
        var nSel = sels === null ? 0 : sels.numProperties;
        var nPr = pr === null ? 0 : pr.numProperties;
        anotar("ANIMADOR|" + i + "|" + a + "|" + limpio(A.name) + "|" + nSel + "|" + nPr);

        var s;
        for (s = 1; s <= nSel; s++) {
          var S = sels.property(s);
          if (S.matchName !== "ADBE Text Selector") {
            anotar("NOSOP|" + i + "|selector de texto no soportado|" + S.matchName);
            continue;
          }
          var av = tal(S, "ADBE Text Range Advanced");
          if (av === null) { anotar("NOSOP|" + i + "|selector sin grupo avanzado|-"); continue; }

          var unidades = valorDe(av, "ADBE Text Range Units", 1);
          var base = valorDe(av, "ADBE Text Range Type2", 1);
          var aleatorio = valorDe(av, "ADBE Text Randomize Order", 0);

          if (aleatorio) {
            anotar("NOSOP|" + i + "|orden aleatorio del selector (PRNG de AE, no reproducido)|semilla " +
                   valorDe(av, "ADBE Text Random Seed", 0));
          }
          if (base !== 1) {
            anotar("NOSOP|" + i + "|base del selector distinta de caracteres (no se midio)|" + base);
          }

          anotar("ANIMSEL|" + i + "|" + a + "|" + s +
                 "|" + unidades +
                 "|" + valorDe(av, "ADBE Text Range Shape", 1) +
                 "|" + valorDe(av, "ADBE Text Selector Mode", 1) +
                 "|" + base +
                 "|" + valorDe(av, "ADBE Text Selector Smoothness", 100) +
                 "|" + aleatorio);

          // LAS TRES DEL RANGO VIAJAN CON NOMBRE NEUTRO, elegidas por las unidades. Los dos juegos son
          // EXCLUYENTES en AE —con unidades en indice las de porcentaje quedan ocultas— asi que mandar
          // los seis numeros seria mandar tres que no significan nada.
          var tres = unidades === 2
            ? ["ADBE Text Index Start", "ADBE Text Index End", "ADBE Text Index Offset"]
            : ["ADBE Text Percent Start", "ADBE Text Percent End", "ADBE Text Percent Offset"];
          var etiq = ["inicio", "fin", "desplazamiento"];
          var t3;
          for (t3 = 0; t3 < 3; t3++) {
            volcarProp(i, "anim" + a + "sel" + s + "." + etiq[t3], tal(S, tres[t3]));
          }
          // y las cuatro del grupo avanzado que SI se animan
          var avAnim = ["ADBE Text Selector Max Amount", "ADBE Text Levels Max Ease",
                        "ADBE Text Levels Min Ease", "ADBE Text Selector Smoothness"];
          var avEtiq = ["cantidadMaxima", "easeAlto", "easeBajo", "suavidad"];
          var t4;
          for (t4 = 0; t4 < 4; t4++) {
            volcarProp(i, "anim" + a + "sel" + s + "." + avEtiq[t4], tal(av, avAnim[t4]));
          }
        }

        // ================================================================ SOLO LAS QUE EL AUTOR AGREGO
        //
        // `ADBE Text Animator Properties` expone SIEMPRE las 103 propiedades posibles, existan o no en
        // la interfaz — medido en `sondas/animador7.jsx`. La primera version recorria las 103 y emitia
        // un NOSOP por cada una que el motor no aplica: 96 lineas de rechazo FALSO por animador. Un
        // exportador que grita sobre lo normal se aprende a ignorar, que es la misma muerte que uno
        // mudo.
        //
        // EL DISCRIMINADOR ES `isModified`, medido: las dos que se agregaron dan true y las tres que no
        // dan false. Pero significa "difiere de su valor por defecto", no "el autor la agrego", asi que
        // se le suma `numKeys > 0`: una propiedad animada que arranca justo en su default sigue siendo
        // una propiedad del autor. Y una agregada y dejada en su default no se pierde por descartarla:
        // no tiene efecto visual ninguno.
        var p2;
        for (p2 = 1; p2 <= nPr; p2++) {
          var P = pr.property(p2);
          var puesta = false;
          try { puesta = (P.isModified === true) || (P.numKeys > 0); } catch (exPu) { puesta = false; }
          if (puesta === false) { continue; }
          // `Array.prototype.indexOf` no existe en ES3 — y `propsMotor` es una CADENA, asi que el
          // indexOf que se usa es el de String, que si existe. La compuerta de ES3 no puede distinguir
          // los dos por su nombre, asi que se busca a mano y queda dicho por que.
          if (enLista(propsMotor, P.matchName) === false) {
            anotar("NOSOP|" + i + "|propiedad de animador que el motor no aplica|" + P.matchName);
            continue;
          }
          var dims2 = 1;
          try { var vv2 = P.value; if (vv2 !== null && typeof vv2.length === "number") { dims2 = vv2.length; } }
          catch (exD2) { dims2 = 0; }
          anotar("ANIMPROP|" + i + "|" + a + "|" + P.matchName + "|" + dims2);
          volcarProp(i, "anim" + a + ".val." + P.matchName, P);
        }
      }
    }
  }

  // --- transformacion: las seis propiedades, mas las de 3D si corresponde
  var tr = tal(capa, "ADBE Transform Group");
  if (tr !== null) {
    volcarProp(i, "anclaje", tal(tr, "ADBE Anchor Point"));

    var pos = tal(tr, "ADBE Position");
    var separadas = false;
    try { separadas = pos.dimensionsSeparated ? true : false; } catch (exSep) { separadas = false; }
    anotar("SEPARADAS|" + i + "|" + (separadas ? 1 : 0));
    if (separadas) {
      volcarProp(i, "posX", tal(tr, "ADBE Position_0"));
      volcarProp(i, "posY", tal(tr, "ADBE Position_1"));
      volcarProp(i, "posZ", tal(tr, "ADBE Position_2"));
    } else {
      volcarProp(i, "posicion", pos);
    }

    volcarProp(i, "escala", tal(tr, "ADBE Scale"));
    volcarProp(i, "rotacion", tal(tr, "ADBE Rotate Z"));
    volcarProp(i, "opacidad", tal(tr, "ADBE Opacity"));
    if (es3D) {
      volcarProp(i, "orientacion", tal(tr, "ADBE Orientation"));
      volcarProp(i, "rotacionX", tal(tr, "ADBE Rotate X"));
      volcarProp(i, "rotacionY", tal(tr, "ADBE Rotate Y"));
    }
  }

  anotar("FIN_CAPA|" + i);
}

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  // EL CENTINELA SE ESCRIBE SIEMPRE, tambien cuando hubo error: si no, el que espera del otro lado no
  // puede distinguir "fallo" de "todavia esta trabajando" y agota el tiempo maximo por nada.
  anotar("--- fin ---");
}
