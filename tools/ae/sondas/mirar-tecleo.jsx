// QUE ESTA PASANDO CON LA CAPA DEL TECLEO. Se le pregunta a AE en vez de deducirlo de un cuadro.
var R = "C:/ae-probe/mirar-tecleo.txt";
var pv = new File(R); if (pv.exists) { pv.remove(); }
function di(t) { var f = new File(R); f.open("a"); f.encoding = "UTF-8"; f.writeln(t); f.close(); }

try {
  var comp = null, i;
  for (i = 1; i <= app.project.numItems; i++) {
    if (app.project.item(i) instanceof CompItem && app.project.item(i).name === "PIEZA-P") {
      comp = app.project.item(i);
    }
  }
  if (comp === null) { di("no hay PIEZA-P"); } else {
    for (i = 1; i <= comp.numLayers; i++) {
      var L = comp.layer(i);
      if (L.name !== "tecleo" && L.name !== "tecleo-cursor") { continue; }
      di("=== " + L.name + " (indice " + i + ")");
      di("  3D: " + L.threeDLayer + "  in " + Math.round(L.inPoint * 30) + "  out " + Math.round(L.outPoint * 30));
      di("  padre: " + (L.parent ? L.parent.name : "ninguno"));
      var tr = L.property("ADBE Transform Group");
      di("  opacidad: " + tr.property("ADBE Opacity").value);
      di("  posicion separada: " + tr.property("ADBE Position").dimensionsSeparated);
      var f;
      for (f = 140; f <= 200; f += 10) {
        var t = f / 30;
        var px, py;
        try { px = tr.property("ADBE Position_0").valueAtTime(t, false); } catch (e1) {
          px = tr.property("ADBE Position").valueAtTime(t, false)[0];
        }
        try { py = tr.property("ADBE Position_1").valueAtTime(t, false); } catch (e2) {
          py = tr.property("ADBE Position").valueAtTime(t, false)[1];
        }
        var esc = tr.property("ADBE Scale").valueAtTime(t, false);
        di("  c" + f + "  pos local (" + Math.round(px) + "," + Math.round(py) + ")  esc " + Math.round(esc[0]));
      }
      if (L.property("ADBE Text Properties")) {
        var doc = L.property("ADBE Text Properties").property("ADBE Text Document").value;
        di("  cadena: [" + doc.text + "]");
        di("  fuente: " + doc.font + "  tam " + doc.fontSize);
        di("  color: " + doc.fillColor[0].toFixed(2) + "," + doc.fillColor[1].toFixed(2) + "," + doc.fillColor[2].toFixed(2));
        di("  justificacion: " + doc.justification);
        var ans = L.property("ADBE Text Properties").property("ADBE Text Animators");
        di("  animadores: " + ans.numProperties);
        var a;
        for (a = 1; a <= ans.numProperties; a++) {
          var an = ans.property(a);
          var sel = an.property("ADBE Text Selectors").property(1);
          var ini = sel.property("ADBE Text Index Start");
          var fin2 = sel.property("ADBE Text Index End");
          di("    [" + an.name + "] claves inicio: " + ini.numKeys +
             "  end=" + fin2.value);
          var k;
          for (k = 1; k <= ini.numKeys; k++) {
            di("      clave " + k + ": c" + Math.round(ini.keyTime(k) * 30) + " -> " + ini.keyValue(k));
          }
          var pr = an.property("ADBE Text Animator Properties");
          var q;
          for (q = 1; q <= pr.numProperties; q++) {
            var vv = "?";
            try { vv = pr.property(q).value.toString(); } catch (exV) { vv = "(no se pudo leer)"; }
            di("      propiedad animada: " + pr.property(q).name + " = " + vv);
          }
          var adv = sel.property("ADBE Text Range Advanced");
          var nm;
          for (nm = 1; nm <= adv.numProperties; nm++) {
            var v2 = "?";
            try { v2 = adv.property(nm).value.toString(); } catch (exW) { v2 = "(no se pudo leer)"; }
            di("      avanzado: " + adv.property(nm).matchName + " = " + v2);
          }
          var s2;
          for (s2 = 1; s2 <= sel.numProperties; s2++) {
            var v3 = "?";
            try { v3 = sel.property(s2).valueAtTime(150 / 30, false).toString(); } catch (exX) { v3 = "(n/a)"; }
            di("      selector c150: " + sel.property(s2).matchName + " = " + v3);
          }
        }
      } else { di("  no es capa de texto"); }
    }
  }
} catch (err) { di("ERROR: " + err.toString() + (err.line ? " linea " + err.line : "")); }
