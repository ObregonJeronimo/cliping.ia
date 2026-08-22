// AUTORIA v3. Dos cambios respecto de la v2, los dos por haberme comido un fallo mudo.
//
// CAMBIO 1 — EL REGISTRO SE ESCRIBE SOBRE LA MARCHA, no al final.
// La v2 juntaba todo en memoria y escribia el archivo en la linea 44. Murio en la 41, asi que no
// escribio NADA y me dejo sin una sola pista: tuve que enterarme por una foto de la pantalla. Un
// script que solo deja rastro si termina bien es inutil justo cuando algo sale mal. Cada paso se
// anota abriendo y cerrando el archivo, que es lento y no importa: esto corre una vez.
//
// CAMBIO 2 — SE MIDE SI EL catch PISA LA VARIABLE.
// Sospecha: la v2 declaro `var e = new KeyframeEase(...)` y despues uso `catch (ex)`. AE se quejo de
// que en la linea 41 el argumento era "un objeto de tipo Error". Si eso es cierto, el catch le
// asigno la excepcion a `e`, y es una trampa que hay que conocer y no volver a pisar.
// Por las dudas, aca las variables tienen nombres que no se pueden confundir con nada.

var RUTA = "C:/ae-probe/crear.txt";

// CONVERTIR UNA EXCEPCION A TEXTO SIN MORIR EN EL INTENTO.
// ExtendScript NO convierte un Error a cadena de forma implicita: `"" + ex` tira un error nuevo
// ("se encontro un objeto de tipo Error donde se requiere un numero") y ese si es fatal. O sea que
// el manejo del error es lo que mata al script, justo cuando ya habia algo que reportar. Hay que
// pedir .toString() a mano.
function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}

function anotar(txt) {
  var arch = new File(RUTA);
  arch.encoding = "UTF-8";
  arch.open("a");
  arch.write(txt + "\n");
  arch.close();
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }

anotar("--- arranca ---");
anotar("AE " + app.version + "  proyecto=" + (app.project.file ? app.project.file.name : "sin guardar"));

app.beginUndoGroup("sonda claude v3");

// idempotente: la sonda anterior se va, si no se acumula basura en cada corrida
var idx = app.project.numItems;
while (idx > 0) {
  var itm = app.project.item(idx);
  if (itm instanceof CompItem && itm.name === "SONDA") { itm.remove(); }
  idx = idx - 1;
}
anotar("limpieza ok");

var comp = app.project.items.addComp("SONDA", 1920, 1080, 1, 5, 30);
comp.openInViewer();
anotar("comp " + comp.name + " " + comp.width + "x" + comp.height + " " + comp.frameRate + "fps dur=" + comp.duration);

var capa = comp.layers.addText("Hola");
var grupo = capa.property("ADBE Transform Group");
var posicion = grupo.property("ADBE Position");
posicion.setValueAtTime(0, [300, 540]);
posicion.setValueAtTime(1, [1600, 540]);
posicion.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
posicion.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
anotar("posicion con " + posicion.numKeys + " keys");

// dimensiones reales de cada propiedad: es EL dato que decide cuantos eases lleva cada llamada
var escala = grupo.property("ADBE Scale");
escala.setValueAtTime(0, [100, 100]);
escala.setValueAtTime(1, [140, 140]);
escala.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
escala.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
anotar("valor de posicion tiene " + posicion.value.length + " componentes");
anotar("valor de escala   tiene " + escala.value.length + " componentes");

var suave = new KeyframeEase(0, 33.3333333333333);
anotar("KeyframeEase creado: velocidad=" + suave.speed + " influencia=" + suave.influence);

// --- posicion con UN ease (lo que la v1 hizo mal pasando tres)
var fallaPos = "";
try {
  posicion.setTemporalEaseAtKey(1, [suave], [suave]);
  posicion.setTemporalEaseAtKey(2, [suave], [suave]);
} catch (exPos) { fallaPos = texto(exPos); }
anotar("POSICION con 1 ease: " + (fallaPos === "" ? "ACEPTA" : "falla -> " + fallaPos));

// LA COMPROBACION DEL CAMBIO 2: despues de que corrio un catch, la variable sigue siendo la de antes?
anotar("despues del catch, `suave` es: velocidad=" + suave.speed + " influencia=" + suave.influence);

// --- escala: probar 1, 2 y 3 eases y que AE diga cual quiere
// EL OBJETIVO REAL DE ESTE BLOQUE: encontrar la REGLA, no parchear una llamada. Cuantos eases
// quiere cada propiedad. Position tiene 3 componentes y ya sabemos que quiere UNO. Si Escala
// tambien tiene 3 y quiere TRES, la regla es "uno por componente, salvo Position" — y esa
// excepcion hay que tenerla escrita porque es la que rompe el codigo generico.
function componentes(prop) {
  var v = prop.value;
  if (v === null || v === undefined) { return 0; }
  if (typeof v.length === "number") { return v.length; }
  return 1;                                  // escalar: opacidad, rotacion
}

function cuantosEases(prop, nombre) {
  var n;
  for (n = 1; n <= 4; n++) {
    var manojo = [];
    var j;
    for (j = 0; j < n; j++) { manojo[manojo.length] = suave; }
    try {
      prop.setTemporalEaseAtKey(1, manojo, manojo);
      anotar(nombre + ": valor de " + componentes(prop) + " comp. -> ACEPTA " + n + " ease(s)");
      return n;
    } catch (exArid) {
      anotar(nombre + " con " + n + ": " + texto(exArid));
    }
  }
  anotar(nombre + ": NINGUNA cantidad de 1 a 4 funciono");
  return 0;
}

var opacidad = grupo.property("ADBE Opacity");
opacidad.setValueAtTime(0, 0);
opacidad.setValueAtTime(1, 100);
opacidad.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
opacidad.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

cuantosEases(escala, "ESCALA");
cuantosEases(opacidad, "OPACIDAD");

// --- Y LO QUE MAS ME IMPORTA: que numeros guarda AE de verdad para un Easy Ease.
// El conversor de tools/ae/curvas.mjs tiene 33.33 escrito a mano. Si AE guarda otra cosa, todas las
// curvas portadas salen corridas y nadie lo nota hasta que el movimiento "se siente raro".
anotar("--- lo que AE guarda ---");
var salida = posicion.keyOutTemporalEase(1)[0];
var entrada = posicion.keyInTemporalEase(2)[0];
anotar("pos k1 SALIDA  influencia=" + salida.influence + "  velocidad=" + salida.speed);
anotar("pos k2 ENTRADA influencia=" + entrada.influence + "  velocidad=" + entrada.speed);
anotar("eases que devuelve posicion = " + posicion.keyOutTemporalEase(1).length);
anotar("eases que devuelve escala   = " + escala.keyOutTemporalEase(1).length);
anotar("eases que devuelve opacidad = " + opacidad.keyOutTemporalEase(1).length);

// EL DATO QUE MAS ME IMPORTA DE TODA LA SONDA: si pido "Easy Ease" por el menu de AE, guarda 33.33?
// tools/ae/curvas.mjs lo tiene escrito a mano y nunca lo verifique contra AE. Aca se aplica el
// preset REAL de AE (KEYFRAME_EASE) y se lee que quedo guardado.
try {
  posicion.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33.3333333333333)], [new KeyframeEase(0, 33.3333333333333)]);
  var revision = posicion.keyOutTemporalEase(1)[0];
  anotar("tras pedir 33.3333333333333, AE guardo influencia=" + revision.influence + " velocidad=" + revision.speed);
} catch (exRev) {
  anotar("no se pudo releer: " + texto(exRev));
}

// LO ANTERIOR NO PRUEBA LO QUE PARECE. Yo le pedi a AE 33.3333333333333 y AE me devolvio
// 33.3333333333333: eso prueba que guarda fiel lo que le dan, NO que su "Easy Ease" del menu valga
// 33.33. Son dos afirmaciones distintas y curvas.mjs depende de la SEGUNDA. Asi que ahora se aplica
// el preset de verdad, por menu, y se lee que quedo.
// Ojo: los nombres de menu son del IDIOMA de la interfaz. Este AE esta en espanol. Se prueban varios
// y se anota cual respondio, porque ese detalle solo se aprende chocandolo.
var CANDIDATOS = ["Easy Ease", "Aceleracion suave", "Aceleración suave", "Suavizado", "Suavizado de fotogramas clave"];
var idMenu = 0, nombreMenu = "";
var q;
for (q = 0; q < CANDIDATOS.length; q++) {
  var tentativa = app.findMenuCommandId(CANDIDATOS[q]);
  anotar("menu '" + CANDIDATOS[q] + "' -> id " + tentativa);
  if (tentativa !== 0 && idMenu === 0) { idMenu = tentativa; nombreMenu = CANDIDATOS[q]; }
}

if (idMenu !== 0) {
  // hay que dejar seleccionados capa y keyframes: el comando de menu opera sobre la seleccion
  capa.selected = true;
  posicion.setSelectedAtKey(1, true);
  posicion.setSelectedAtKey(2, true);
  try {
    app.executeCommand(idMenu);
    var real = posicion.keyOutTemporalEase(1)[0];
    var realIn = posicion.keyInTemporalEase(2)[0];
    anotar("EASY EASE DE VERDAD ('" + nombreMenu + "'): salida influencia=" + real.influence + " velocidad=" + real.speed);
    anotar("EASY EASE DE VERDAD: entrada influencia=" + realIn.influence + " velocidad=" + realIn.speed);
  } catch (exMenu) {
    anotar("el comando de menu fallo: " + texto(exMenu));
  }
} else {
  anotar("ningun nombre de menu resolvio: la constante 33.33 queda SIN verificar");
}

app.endUndoGroup();
anotar("--- fin ---");
