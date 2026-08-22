// ABRIR UN PROYECTO AJENO Y VOLCAR COMO ESTA HECHO.
//
// POR QUE EXISTE. Todo lo que este repo sabe de After Effects salio de sondas que YO escribi: mido lo
// que se me ocurre medir, asi que mis puntos ciegos se propagan a las mediciones. Un proyecto hecho por
// otra persona es la unica fuente que puede contener una tecnica que no se me habria ocurrido buscar.
//
// LO QUE VUELCA, y por que cada cosa:
//   EXPRESION  lo mas importante. Una expresion es oficio condensado: dice como se consigue un rebote,
//              un escalonado o un seguimiento sin poner treinta claves a mano.
//   CLAVE      con sus influencias y velocidades: la FORMA de la curva, que es lo que separa "suave"
//              de "lineal con ease". Sin las influencias, una curva medida es una curva inventada.
//   EFECTO     con todos sus parametros. El nombre solo no alcanza: un desenfoque de 2 px y uno de 40
//              son dos decisiones distintas.
//   TEXTO      contenido, cuerpo, familia e interletra.
//   CAPA       tipo, 3D, fusion, padre, matte, obturador y tramo.
//
// NO GUARDA NADA. Abre para leer, con las alertas suprimidas, y descarta el proyecto anterior sin
// guardarlo. Un disector que modifica lo que disecciona no sirve para nada.
//
// USO
//   printf '<ruta al .aep>' > C:/ae-probe/disector-proyecto.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/disector.jsx

var RUTA = "C:/ae-probe/disector.txt";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
function limpio(s) {
  s = texto(s);
  s = s.replace(/\|/g, "/");
  s = s.replace(/[\r\n]+/g, " ~ ");
  return s;
}
function num(x) { try { return Math.round(x * 1000) / 1000; } catch (exNu) { return "?"; } }
function lista(v) {
  if (v === null || v === undefined) { return ""; }
  if (typeof v.length === "number" && typeof v !== "string") {
    var o = [], q;
    for (q = 0; q < v.length; q++) { o[o.length] = num(v[q]); }
    return o.join(";");
  }
  return texto(num(v));
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
var ped = new File("C:/ae-probe/disector-proyecto.txt");
ped.open("r"); var rutaProy = ped.read(); ped.close();

try { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); } catch (exCl) {}
var arch = new File(rutaProy);
if (!arch.exists) { throw new Error("no existe " + rutaProy); }
app.open(arch);

anotar("PROYECTO|" + limpio(rutaProy));
anotar("ITEMS|" + app.project.numItems);

// ---------------------------------------------------------------- recorrer una propiedad a fondo
//
// SE ACUMULA LA RUTA, NO SE USA EL NOMBRE DE LA PROPIEDAD. Una capa con cuatro deslizadores escribe
// cuatro veces "ADBE Slider Control-0001 (Deslizador)", porque el matchName es el del TIPO de control y
// no el de la instancia: el nombre que distingue ("Distance", "Opacity") vive en el efecto PADRE.
//
// Sin la ruta, las veinte claves de la capa maestra del tunel salen todas con la misma etiqueta y no
// hay forma de saber cual anima la profundidad, cual la rotacion y cual la escala. Es un dato falso con
// cara de medicion — y del lado de esta herramienta, no de AE. Un importador que mapee por ese nombre
// apila tres animaciones distintas en un solo control y la coreografia no se despliega, sin ningun
// error: solo un resultado quieto.
function verProp(pref, prop, hondo, ruta) {
  if (prop === null || prop === undefined || hondo > 6) { return; }
  var tipo = 0;
  try { tipo = prop.propertyType; } catch (exT) { return; }
  if (ruta === undefined) { ruta = ""; }

  if (tipo === PropertyType.PROPERTY) {
    var tieneExpr = false, nk = 0;
    try { tieneExpr = prop.expressionEnabled; } catch (exE) {}
    try { nk = prop.numKeys; } catch (exK) {}
    if (!tieneExpr && nk === 0) { return; }

    var nom = "?";
    try { nom = (ruta === "" ? "" : ruta + " > ") + prop.matchName + " (" + prop.name + ")"; } catch (exN) {}

    if (tieneExpr) {
      var cuerpo = "";
      try { cuerpo = prop.expression; } catch (exC) { cuerpo = "?"; }
      anotar("EXPRESION|" + pref + "|" + limpio(nom) + "|" + limpio(cuerpo));
    }
    if (nk > 0) {
      var kk;
      for (kk = 1; kk <= nk; kk++) {
        var ei = null, eo = null;
        try { ei = prop.keyInTemporalEase(kk); } catch (e1) {}
        try { eo = prop.keyOutTemporalEase(kk); } catch (e2) {}
        var infE = "", infS = "", qq;
        if (ei) { for (qq = 0; qq < ei.length; qq++) { infE += (qq ? "," : "") + num(ei[qq].influence) + "@" + num(ei[qq].speed); } }
        if (eo) { for (qq = 0; qq < eo.length; qq++) { infS += (qq ? "," : "") + num(eo[qq].influence) + "@" + num(eo[qq].speed); } }
        var ti = "?", to = "?";
        try { ti = prop.keyInInterpolationType(kk); } catch (e3) {}
        try { to = prop.keyOutInterpolationType(kk); } catch (e4) {}
        anotar("CLAVE|" + pref + "|" + limpio(nom) + "|" + kk + "|" + num(prop.keyTime(kk)) +
               "|" + lista(prop.keyValue(kk)) + "|ent " + ti + " " + infE + "|sal " + to + " " + infS);
      }
    }
    return;
  }

  var n = 0;
  try { n = prop.numProperties; } catch (exNP) { return; }
  // el nombre de la INSTANCIA del grupo (el efecto "Distance", el grupo "Circle") es lo que distingue;
  // el de la capa entera no aporta y se saltea para que la ruta no arranque repitiendo lo obvio
  var mio = "";
  try { if (hondo > 0) { mio = prop.name; } } catch (exNm) { mio = ""; }
  var sub = (mio === "" ? ruta : (ruta === "" ? mio : ruta + " > " + mio));
  var j;
  for (j = 1; j <= n; j++) {
    var hijo = null;
    try { hijo = prop.property(j); } catch (exH) { hijo = null; }
    verProp(pref, hijo, hondo + 1, sub);
  }
}

// ---------------------------------------------------------------- las composiciones
var ci, comps = 0;
for (ci = 1; ci <= app.project.numItems; ci++) {
  var itm = app.project.item(ci);
  if (!(itm instanceof CompItem)) { continue; }
  comps++;
  anotar("");
  anotar("COMP|" + limpio(itm.name) + "|" + itm.width + "x" + itm.height + "|" + num(itm.frameRate) +
         "fps|" + num(itm.duration) + "s|" + itm.numLayers + " capas|obturador " +
         num(itm.shutterAngle) + " grados fase " + num(itm.shutterPhase) + "|mb " + (itm.motionBlur ? 1 : 0));

  var li;
  for (li = 1; li <= itm.numLayers; li++) {
    var L = itm.layer(li);
    var clase = "?";
    try {
      if (L instanceof CameraLayer) { clase = "camara"; }
      else if (L instanceof LightLayer) { clase = "luz"; }
      else if (L instanceof TextLayer) { clase = "texto"; }
      else if (L instanceof ShapeLayer) { clase = "forma"; }
      else if (L.nullLayer) { clase = "nulo"; }
      else if (L.source && L.source instanceof CompItem) { clase = "precomp"; }
      else if (L.source) { clase = "metraje"; }
      else { clase = "av"; }
    } catch (exCl2) {}

    var padre = "";
    try { padre = L.parent ? L.parent.name : ""; } catch (exP) {}
    var fusion = "?", matte = "?", tresD = 0, mb = 0;
    try { fusion = L.blendingMode; } catch (e5) {}
    try { matte = L.trackMatteType; } catch (e6) {}
    try { tresD = L.threeDLayer ? 1 : 0; } catch (e7) {}
    try { mb = L.motionBlur ? 1 : 0; } catch (e8) {}

    anotar("CAPA|" + limpio(itm.name) + "|" + li + "|" + limpio(L.name) + "|" + clase +
           "|3d " + tresD + "|fusion " + fusion + "|matte " + matte + "|mb " + mb +
           "|padre " + limpio(padre) + "|" + num(L.inPoint) + "-" + num(L.outPoint));

    if (clase === "texto") {
      try {
        var td = L.property("ADBE Text Properties").property("ADBE Text Document").value;
        anotar("TEXTO|" + limpio(itm.name) + "|" + li + "|" + limpio(td.text) + "|" +
               num(td.fontSize) + "px|" + limpio(td.font) + "|track " + num(td.tracking));
      } catch (exTx) {}
    }

    try {
      var ef = L.property("ADBE Effect Parade");
      if (ef && ef.numProperties > 0) {
        var e1i;
        for (e1i = 1; e1i <= ef.numProperties; e1i++) {
          var E = ef.property(e1i);
          var pars = [], pi2;
          for (pi2 = 1; pi2 <= E.numProperties; pi2++) {
            try {
              var PP = E.property(pi2);
              if (PP.propertyType === PropertyType.PROPERTY) {
                pars[pars.length] = PP.name + "=" + lista(PP.value);
              }
            } catch (exPa) {}
          }
          anotar("EFECTO|" + limpio(itm.name) + "|" + li + "|" + limpio(E.matchName) +
                 "|" + limpio(E.name) + "|" + limpio(pars.join(" - ")));
        }
      }
    } catch (exEf) {}

    verProp(limpio(itm.name) + "|" + li + "|" + limpio(L.name), L, 0, "");
  }
}
anotar("");
anotar("COMPS|" + comps);
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
