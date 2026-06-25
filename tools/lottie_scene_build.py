"""
lottie_scene_build.py - toma las RECETAS disenadas (por el workflow) y las RENDERIZA con el toolkit (lottie_scene.py)
a Lotties propias, las gatea (sin expresiones/efectos, estructura valida), las self-hostea en public/lottie/urvid-scene/
y escribe el manifest (fuente "urvid-scene", 100% nuestras) + el registro de licencias.

Uso: python tools/lottie_scene_build.py <recipes.json>   (default: tools/scene_recipes.json)
Las recetas: [{concept, rubro, variants:[{archetype, motion, shapes}, ...]}]
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import lottie_scene as S

OUT = os.path.join(ROOT, "public", "lottie", "urvid-scene")
MANIFEST = os.path.join(ROOT, "src", "urvid", "lottie", "manifest.js")
LIC = os.path.join(ROOT, "tools", "lottie_licenses.json")
RECIPES = os.path.join(ROOT, "tools", "scene_recipes.json")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:48]


def load(path):
    raw = open(path, encoding="utf-8").read()
    try:
        d = json.loads(raw)
    except Exception:
        i, j = raw.find("["), raw.rfind("]")
        d = json.loads(raw[i:j + 1])
    if isinstance(d, dict):
        d = d.get("result") or d.get("variants") or d
    return d


def gate(j):
    blob = json.dumps(j, separators=(",", ":"))
    if '"x":"' in blob or '"ef":' in blob:
        return False, "expr/eff"
    if not (j.get("w") and j.get("h")):
        return False, "no-wh"
    layers = j.get("layers") or []
    if not layers or sum(len(L.get("shapes") or []) for L in layers) == 0:
        return False, "no-shapes"
    if not (1200 < len(blob) < 320_000):
        return False, "size"
    return True, "ok"


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else RECIPES
    data = load(src)
    # persistir las recetas crudas para regenerar
    with open(RECIPES, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.makedirs(OUT, exist_ok=True)
    # limpiar render previo de escenas (mantener idempotencia)
    for p in os.listdir(OUT):
        if p.startswith(("sc-", "test-", "scene-")):
            try:
                os.remove(os.path.join(OUT, p))
            except OSError:
                pass

    manifest, per, bad = [], {}, []
    present = set()
    for entry in data:
        if not entry:
            continue
        concept, rubro = entry.get("concept"), entry.get("rubro", "default")
        present.add(concept)
        for i, recipe in enumerate(entry.get("variants") or []):
            try:
                j = S.render_recipe(recipe)
            except Exception as e:
                bad.append((concept, i, "render:" + str(e)[:40]))
                continue
            ok, why = gate(j)
            if not ok:
                bad.append((concept, i, why))
                continue
            ident = "sc-" + slug(concept) + "-" + str(i + 1)
            with open(os.path.join(OUT, ident + ".json"), "w", encoding="utf-8") as f:
                f.write(json.dumps(j, separators=(",", ":")))
            manifest.append({
                "id": ident, "name": (recipe.get("label") or concept)[:60],
                "concept": concept, "rubro": rubro,
                "url": "/lottie/urvid-scene/" + ident + ".json",
                "source": "urvid-scene", "license": "urvid-own",
                "w": j["w"], "h": j["h"], "fps": j["fr"], "frames": j["op"] - j["ip"],
            })
            per[rubro] = per.get(rubro, 0) + 1

    # registro de licencias (100% nuestras)
    registry = {"generated_for": "urvid lottie library", "items": len(manifest), "sources": [{
        "source": "urvid-scene", "title": "urvid - animaciones propias",
        "license": "urvid-own (CC0 / dominio propio)", "spdx": "CC0-1.0", "redistributable": True,
        "attribution_per_render": False, "note": ("Motion-graphics disenadas y animadas POR urvid (shapes + keyframes, "
        "sin arte de terceros ni emoji). 100% propias, sin problemas de licencia."), "items": len(manifest)}]}
    with open(LIC, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
        f.write("\n")

    with open(MANIFEST, "w", encoding="utf-8") as f:
        f.write("// GENERADO por tools/lottie_scene_build.py - animaciones 100% PROPIAS (motion-graphics, sin emoji ni\n"
                "// arte de terceros). Recetas en tools/scene_recipes.json, render con tools/lottie_scene.py. No editar a mano.\n"
                "export default ")
        json.dump({"version": 5, "count": len(manifest), "items": manifest}, f, ensure_ascii=False)
        f.write("\n")

    missing = [c for c in present if True] and sorted(set(e.get("concept") for e in data if e) - present)
    print(f"conceptos presentes: {len(present)}/111")
    print(f"por rubro: {per}")
    print(f"TOTAL escenas: {len(manifest)}")
    print(f"descartadas (gate/render): {len(bad)}" + (f" -> {bad[:8]}" if bad else ""))
    print(f"-> {os.path.relpath(MANIFEST, ROOT)}")


if __name__ == "__main__":
    main()
