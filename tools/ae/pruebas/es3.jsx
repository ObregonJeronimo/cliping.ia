// El mismo trabajo, en ES3 valido. Ojo: menciona let, const y map DENTRO de cadenas y comentarios
// a proposito, para probar que el escaner no acusa en falso.
var comp = app.project.items.addComp("Hero", 1920, 1080, 1, 5, 30);
var capas = comp.layers;
var nombres = ["uno", "dos"];
var msg = "no uses const ni let, y evita .map( aca adentro";
for (var i = 0; i < nombres.length; i++) {
  var t = capas.addText("hola " + nombres[i]);
  t.property("ADBE Transform Group").property("ADBE Position").setValueAtTime(0, [960, 540]);
}
