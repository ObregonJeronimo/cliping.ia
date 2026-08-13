// Codigo como lo escribiria un modelo por defecto. TODO esto revienta en AE.
const comp = app.project.items.addComp("Hero", 1920, 1080, 1, 5, 30);
let capas = comp.layers;
const nombres = ["uno", "dos"].map(n => n.trim());
const datos = JSON.stringify({ a: 1, b: 2, });
for (const n of nombres) { capas.addText(`hola ${n}`); }
Object.keys({x:1}).forEach(k => $.writeln(k));
