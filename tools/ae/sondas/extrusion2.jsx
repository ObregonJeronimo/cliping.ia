// EL MISMO CUADRO CON LOS DOS MOTORES. Es la unica prueba que vale.
//
// `extrusion.jsx` midio la API y dijo que con el motor de Cinema 4D NO se apaga nada: fusion, mattes y
// mascaras siguen legibles y escribibles, y la extrusion se puede poner. Pero una funcion puede seguir
// DECLARADA y dejar de DIBUJARSE, y eso en los numeros no se ve.
//
// Con `saveFrameToPng` se ve: el mismo proyecto, dos cuadros, un motor cada uno.
var RUTA = "C:/ae-probe/extrusion2.txt";
function texto(x){ if(x===null){return "null";} if(x===undefined){return "undefined";}
  try{return x.toString();}catch(e){return "<inconvertible>";} }
function anotar(t){ var a=new File(RUTA); a.encoding="UTF-8"; a.open("a");
  a.write(t+String.fromCharCode(10)); a.close(); }
var previo=new File(RUTA); if(previo.exists){previo.remove();}
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }
try {
var comp=null, n=app.project.numItems;
while(n>0){ var it=app.project.item(n);
  if(it instanceof CompItem && it.name==="SONDA-EXTRUSION"){ comp=it; } n=n-1; }
if(comp===null){ throw new Error("corre antes extrusion.jsx"); }
var dir=new Folder("C:/ae-probe/ae-cuadros/MOTORES");
if(!dir.exists){ dir.create(); }
var pares=[["ADBE Advanced 3d","clasico"],["ADBE Ernst","c4d"]], i;
for(i=0;i<pares.length;i++){
  var f=new File("C:/ae-probe/ae-cuadros/MOTORES/"+pares[i][1]+".png");
  if(f.exists){ f.remove(); }
  var ok="si";
  try { comp.renderer=pares[i][0]; } catch(exR){ ok="FALLO "+texto(exR.message?exR.message:exR); }
  if(ok==="si"){
    try { comp.saveFrameToPng(0, f); } catch(exS){ ok="FALLO al guardar: "+texto(exS.message?exS.message:exS); }
  }
  anotar("PIDO|"+pares[i][1]+"|"+pares[i][0]+"|"+ok);
}
anotar("--- fin ---");
} catch(elFallo){
  anotar("FALLO|"+texto(elFallo && elFallo.message ? elFallo.message : elFallo));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
