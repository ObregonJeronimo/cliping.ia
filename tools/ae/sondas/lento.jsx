// SONDA 2 - sincronia. Duerme 3 segundos ADENTRO de AE y despues escribe.
// Si el lanzador vuelve en ~1 s, `-r` es asincrono y hace falta el buzon.
// Si vuelve en ~4 s, es sincrono y el buzon podria simplificarse.
var f = new File("C:/ae-probe/lento.txt");
f.encoding = "UTF-8";
f.open("w");
f.write("empezo=" + (new Date()).getTime() + "\n");
f.close();
$.sleep(3000);
var g = new File("C:/ae-probe/lento.txt");
g.encoding = "UTF-8";
g.open("a");
g.write("termino=" + (new Date()).getTime() + "\n");
g.close();
