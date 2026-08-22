// LO MISMO, PERO COLGADO DE UN PADRE ROTADO.
//
// El orden de rotaciones ya se descarto: nueve combinaciones de una capa suelta coinciden pixel a pixel
// con AE. Lo unico que la RUEDA tiene y la caja no es la cadena padre-hijo con rotacion en varios ejes
// a la vez y los hijos lejos del origen del padre.
//
// Nueve casos: el mismo plano, siempre a la misma distancia del padre, y el PADRE con distintas
// rotaciones. Si el emparentado esta bien, coinciden como coincidieron los nueve anteriores.
var RUTA="C:/ae-probe/rotpadre.txt";
var ANCHO=1200, ALTO=800;
function texto(x){ if(x===null){return "null";} if(x===undefined){return "undefined";}
  try{return x.toString();}catch(e){return "<inconvertible>";} }
function anotar(t){ var a=new File(RUTA); a.encoding="UTF-8"; a.open("a");
  a.write(t+String.fromCharCode(10)); a.close(); }
var previo=new File(RUTA); if(previo.exists){previo.remove();}
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }
try {
app.beginUndoGroup("ROTPADRE");
var NOMBRE="SONDA-ROTPADRE";
var n=app.project.numItems;
while(n>0){ var it=app.project.item(n);
  if(it instanceof CompItem && it.name===NOMBRE){ it.remove(); } n=n-1; }
var comp=app.project.items.addComp(NOMBRE,ANCHO,ALTO,1,1,30);
comp.bgColor=[0,0,0];
function tr(c){ return c.property("ADBE Transform Group"); }
var CASOS=[[0,0,0],[-14,0,0],[0,45,0],[-14,45,0],[-22,60,0],[30,-40,20],[-14,120,0],[-14,225,0],[45,45,45]];
var i;
for(i=0;i<CASOS.length;i++){
  var col=i%3, fil=Math.floor(i/3);
  var nn=comp.layers.addNull();
  nn.name="padre-"+i; nn.threeDLayer=true;
  tr(nn).property("ADBE Position").setValue([200+col*400, 150+fil*250, 0]);
  tr(nn).property("ADBE Rotate X").setValue(CASOS[i][0]);
  tr(nn).property("ADBE Rotate Y").setValue(CASOS[i][1]);
  tr(nn).property("ADBE Rotate Z").setValue(CASOS[i][2]);
  // ANOTAR EL ANCLA DEL NULO: si AE la pone en el centro y el motor la lee distinto, los hijos se
  // corren y el padre solo no lo delata
  anotar("ANCLA|"+i+"|"+tr(nn).property("ADBE Anchor Point").value.join(";"));
  // dos hijos LEJOS del origen del padre y girados ellos tambien, como los paneles de la rueda
  var j;
  for(j=0;j<2;j++){
    var s=comp.layers.addSolid([0.36+0.3*j,0.66,1],"hijo-"+i+"-"+j,110,150,1);
    s.threeDLayer=true;
    s.parent=nn;                                   // EL PADRE PRIMERO
    var ang=j*90;
    var rad=ang*Math.PI/180;
    tr(s).property("ADBE Position").setValue([Math.sin(rad)*120, 0, -Math.cos(rad)*120]);
    tr(s).property("ADBE Rotate Y").setValue(ang);
  }
  anotar("CASO|"+i+"|padre x="+CASOS[i][0]+" y="+CASOS[i][1]+" z="+CASOS[i][2]);
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
