// EL ORDEN EN QUE AE APLICA LAS TRES ROTACIONES.
//
// POR QUE. Con planos armados en el espacio, la caja y la tarjeta coinciden con AE al 0,3%, pero la
// RUEDA se desvia hasta 7,2% y su caja se corre 12 px. Lo unico que la rueda tiene y las otras no es
// rotacion en varios ejes combinada entre padre e hijo.
//
// `cinematica.mjs` aplica X, despues Y, despues Z. Si AE lo hace en otro orden, un plano con dos
// rotaciones distintas de cero cae en otro lado — y con una sola rotacion los dos ordenes coinciden,
// que es exactamente por que la caja no lo delata.
//
// Nueve planos, cada uno con una combinacion, bien separados para medir cada uno en su franja.
var RUTA = "C:/ae-probe/rotorden.txt";
var ANCHO=1200, ALTO=800;
function texto(x){ if(x===null){return "null";} if(x===undefined){return "undefined";}
  try{return x.toString();}catch(e){return "<inconvertible>";} }
function anotar(t){ var a=new File(RUTA); a.encoding="UTF-8"; a.open("a");
  a.write(t+String.fromCharCode(10)); a.close(); }
var previo=new File(RUTA); if(previo.exists){previo.remove();}
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }
try {
app.beginUndoGroup("ROTORDEN");
var NOMBRE="SONDA-ROTORDEN";
var n=app.project.numItems;
while(n>0){ var it=app.project.item(n);
  if(it instanceof CompItem && it.name===NOMBRE){ it.remove(); } n=n-1; }
var comp=app.project.items.addComp(NOMBRE,ANCHO,ALTO,1,1,30);
comp.bgColor=[0,0,0];
function tr(c){ return c.property("ADBE Transform Group"); }
// nueve combinaciones: una sola rotacion (donde el orden NO importa) y de a dos y tres (donde SI)
var CASOS=[[0,0,0],[40,0,0],[0,40,0],[0,0,40],
           [40,50,0],[40,0,50],[0,40,50],[40,50,60],[-35,55,-25]];
var i;
for(i=0;i<CASOS.length;i++){
  var col=i%3, fil=Math.floor(i/3);
  var s=comp.layers.addSolid([0.36,0.66,1],"rot-"+i,220,140,1);
  s.threeDLayer=true;
  tr(s).property("ADBE Position").setValue([200+col*400, 150+fil*250, 0]);
  tr(s).property("ADBE Rotate X").setValue(CASOS[i][0]);
  tr(s).property("ADBE Rotate Y").setValue(CASOS[i][1]);
  tr(s).property("ADBE Rotate Z").setValue(CASOS[i][2]);
  anotar("CASO|"+i+"|x="+CASOS[i][0]+" y="+CASOS[i][1]+" z="+CASOS[i][2]+
         "|centro="+(200+col*400)+","+(150+fil*250));
}
var cam=comp.layers.addCamera("camara",[ANCHO/2,ALTO/2]);
tr(cam).property("ADBE Position").setValue([ANCHO/2,ALTO/2,-2200]);
comp.openInViewer(); comp.time=0;
anotar("CAPAS|"+comp.numLayers);
anotar("--- fin ---");
app.endUndoGroup();
} catch(elFallo){
  anotar("FALLO|"+texto(elFallo && elFallo.message ? elFallo.message : elFallo));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
