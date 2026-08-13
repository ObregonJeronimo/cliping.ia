// SONDA 1 - el timbre. ES3 puro: sin let, sin const, sin flechas, sin JSON.
// Escribe un archivo con la version de AE y la hora exacta en que el script CORRIO adentro de AE.
// Comparando esa hora contra la de afuera sale la latencia real del canal.
var f = new File("C:/ae-probe/pong.txt");
f.encoding = "UTF-8";
f.open("w");
f.write("version=" + app.version + "\n");
f.write("proyecto=" + (app.project.file ? app.project.file.name : "sin guardar") + "\n");
f.write("puede_escribir=" + app.preferences.getPrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY") + "\n");
f.write("comps=" + app.project.numItems + "\n");
f.write("ms_adentro=" + (new Date()).getTime() + "\n");
f.close();
