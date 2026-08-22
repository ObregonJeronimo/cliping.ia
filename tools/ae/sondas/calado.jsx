// EL CALADO DE UNA MASCARA: ¿que perfil de alfa dibuja AE, y con que ancho?
//
// POR QUE. El motor calaba con un desenfoque de Canvas2D y un radio elegido a ojo (`calado * esc / 2`).
// Con calado 26 la rampa de AE mide 15 px de 5% a 95% y la del motor 20: el borde sale mas blando. El
// cruce del 50% coincide exacto, asi que la geometria esta bien y lo unico mal es el radio.
//
// Ajustar contra UN punto es como no medir. Aca hay seis calados sobre la misma figura, sin expansion
// para que no se mezclen dos cosas, y con el borde bien lejos de las esquinas: el ancho de la rampa en
// funcion del calado sale de ahi, y con eso el motor deja de adivinar.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/calado.jsx
//   node tools/ae/cuadro-ae.mjs SONDA-CALADO 0
var RUTA = "C:/ae-probe/calado.txt";
function texto(x){ if(x===null){return "null";} if(x===undefined){return "undefined";}
  try{return x.toString();}catch(e){return "<inconvertible>";} }
function anotar(t){ var a=new File(RUTA); a.encoding="UTF-8"; a.open("a");
  a.write(t+String.fromCharCode(10)); a.close(); }
var previo=new File(RUTA); if(previo.exists){previo.remove();}
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }
try {
app.beginUndoGroup("CALADO");
var NOMBRE="SONDA-CALADO", ANCHO=1000, ALTO=760;
var n=app.project.numItems;
while(n>0){ var it=app.project.item(n);
  if(it instanceof CompItem && it.name===NOMBRE){ it.remove(); } n=n-1; }
var comp=app.project.items.addComp(NOMBRE,ANCHO,ALTO,1,1,30);
comp.bgColor=[0,0,0];
var CAL=[0,8,16,26,40,64], W=760, H=90, i;
for(i=0;i<CAL.length;i++){
  var s=comp.layers.addSolid([1,1,1],"cal-"+CAL[i],W,H,1);
  s.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO/2, 70+i*120]);
  var m=s.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
  var sh=new Shape();
  // un rectangulo bien adentro de la capa: el borde derecho queda a 260 px del borde de la capa, asi
  // que ni el calado de 64 llega a tocarlo y la rampa se mide limpia
  sh.vertices=[[100,-40],[500,-40],[500,H+40],[100,H+40]];
  sh.inTangents=[[0,0],[0,0],[0,0],[0,0]];
  sh.outTangents=[[0,0],[0,0],[0,0],[0,0]];
  sh.closed=true;
  m.property("ADBE Mask Shape").setValue(sh);
  if(CAL[i]>0){ m.property("ADBE Mask Feather").setValue([CAL[i],CAL[i]]); }
  anotar("CAL|"+CAL[i]+"|fila="+i+"|centroY="+(70+i*120)+"|bordeX="+(ANCHO/2-W/2+500));
}
var cam=comp.layers.addCamera("camara",[ANCHO/2,ALTO/2]);
cam.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO/2,ALTO/2,-1900]);
comp.openInViewer(); comp.time=0;
anotar("CAPAS|"+comp.numLayers);
anotar("--- fin ---");
app.endUndoGroup();
} catch(elFallo){
  anotar("FALLO|"+texto(elFallo && elFallo.message ? elFallo.message : elFallo));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
