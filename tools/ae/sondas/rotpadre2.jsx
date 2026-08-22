// BISECAR LA COMPOSICION PADRE-HIJO: ¿falla la traslacion del hijo o su rotacion?
//
// Medido: con el padre rotado solo en Y el hijo cae exacto (0,05%); con X entra el error, y con los
// tres ejes llega al 42%. Una capa SUELTA con las mismas rotaciones coincide al pixel, asi que el orden
// de rotaciones esta bien y el problema esta en como se compone la matriz del padre con la del hijo.
//
// Cuatro casos, el MISMO padre (x45 y45 z45) y un solo hijo cada uno:
//   A  hijo desplazado en X, SIN rotacion propia   -> prueba solo la traslacion a traves del padre
//   B  hijo desplazado en Z, SIN rotacion propia   -> lo mismo por el otro eje
//   C  hijo en el origen del padre, CON ry=45      -> prueba solo la rotacion a traves del padre
//   D  hijo desplazado Y rotado                    -> las dos juntas
//
// Si A y B coinciden y C no, el error esta en la rotacion compuesta. Si A ya falla, esta en la
// traslacion — o en el ancla del padre.
var RUTA="C:/ae-probe/rotpadre2.txt";
var ANCHO=1200, ALTO=800;
function texto(x){ if(x===null){return "null";} if(x===undefined){return "undefined";}
  try{return x.toString();}catch(e){return "<inconvertible>";} }
function anotar(t){ var a=new File(RUTA); a.encoding="UTF-8"; a.open("a");
  a.write(t+String.fromCharCode(10)); a.close(); }
var previo=new File(RUTA); if(previo.exists){previo.remove();}
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }
try {
app.beginUndoGroup("ROTPADRE2");
var NOMBRE="SONDA-ROTPADRE2";
var n=app.project.numItems;
while(n>0){ var it=app.project.item(n);
  if(it instanceof CompItem && it.name===NOMBRE){ it.remove(); } n=n-1; }
var comp=app.project.items.addComp(NOMBRE,ANCHO,ALTO,1,1,30);
comp.bgColor=[0,0,0];
function tr(c){ return c.property("ADBE Transform Group"); }
// [posicion del hijo, rotacion Y del hijo]
var CASOS=[[[120,0,0],0],[[0,0,-120],0],[[0,0,0],45],[[120,0,0],90]];
var i;
for(i=0;i<CASOS.length;i++){
  var col=i%2, fil=Math.floor(i/2);
  var cx=300+col*600, cy=200+fil*400;
  var nn=comp.layers.addNull();
  nn.name="p"+i; nn.threeDLayer=true;
  tr(nn).property("ADBE Position").setValue([cx,cy,0]);
  tr(nn).property("ADBE Rotate X").setValue(45);
  tr(nn).property("ADBE Rotate Y").setValue(45);
  tr(nn).property("ADBE Rotate Z").setValue(45);
  anotar("PADRE|"+i+"|pos="+cx+","+cy+"|ancla="+tr(nn).property("ADBE Anchor Point").value.join(";")+
         "|escala="+tr(nn).property("ADBE Scale").value.join(";"));
  var s=comp.layers.addSolid([0.36,0.66,1],"h"+i,140,100,1);
  s.threeDLayer=true;
  s.parent=nn;
  tr(s).property("ADBE Position").setValue(CASOS[i][0]);
  tr(s).property("ADBE Rotate Y").setValue(CASOS[i][1]);
  anotar("HIJO|"+i+"|pos="+CASOS[i][0].join(",")+"|ry="+CASOS[i][1]+
         "|ancla="+tr(s).property("ADBE Anchor Point").value.join(";"));
}
var cam=comp.layers.addCamera("camara",[ANCHO/2,ALTO/2]);
tr(cam).property("ADBE Position").setValue([ANCHO/2,ALTO/2,-2400]);
comp.openInViewer(); comp.time=0;
anotar("CAPAS|"+comp.numLayers);
anotar("--- fin ---");
app.endUndoGroup();
} catch(elFallo){
  anotar("FALLO|"+texto(elFallo && elFallo.message ? elFallo.message : elFallo));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
