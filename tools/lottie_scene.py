"""
lottie_scene.py - autoria de Lotties de DISENO (motion graphics), SIN emoji ni arte ajeno. La animacion y las formas
son 100% nuestras: shapes (rect/elipse/path) + keyframes deterministas -> Lottie JSON que pasa el gate y rendea con
lottie-web (goToAndStop(t)). Esto es lo que reemplaza al pool de LottieFiles: animaciones propias, a color, con
movimiento de verdad, sin licencia de terceros.

Ejemplo: build_growth_chart() = barras que crecen escalonadas + linea de tendencia que se dibuja + punto que viaja.
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "lottie", "urvid-scene")
CANVAS, FPS = 512, 60

# easing in/out (1D y 2D) -> sin esto lottie-web calcula NaN y oculta la capa
I1, O1 = {"x": [0.4], "y": [1]}, {"x": [0.4], "y": [0]}
I2, O2 = {"x": [0.4, 0.4], "y": [1, 1]}, {"x": [0.4, 0.4], "y": [0, 0]}


def rgba(hex6):
    h = hex6.lstrip("#")
    return [int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, 1]


def _tr():
    return {"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]},
            "s": {"a": 0, "k": [100, 100]}, "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}


def _stroke(color, w):
    return {"ty": "st", "c": {"a": 0, "k": color}, "o": {"a": 0, "k": 100}, "w": {"a": 0, "k": w}, "lc": 2, "lj": 2, "ml": 4}


def _fill(color):
    return {"ty": "fl", "c": {"a": 0, "k": color}, "o": {"a": 0, "k": 100}, "r": 1}


def _layer(ind, shapes, ks, op):
    base = {"o": {"a": 0, "k": 100}, "r": {"a": 0, "k": 0}, "p": {"a": 0, "k": [0, 0, 0]},
            "a": {"a": 0, "k": [0, 0, 0]}, "s": {"a": 0, "k": [100, 100, 100]}}
    base.update(ks)
    return {"ddd": 0, "ind": ind, "ty": 4, "nm": "L%d" % ind, "sr": 1, "ks": base, "ao": 0,
            "shapes": shapes, "ip": 0, "op": op, "st": 0, "bm": 0}


def build_growth_chart():
    op = 150
    teal, coral, gray, white = rgba("1D9E75"), rgba("F0997B"), rgba("9C9A92"), rgba("FFFFFF")
    baseline = 410
    heights = [100, 150, 120, 200, 268]
    xs = [116 + i * 70 for i in range(5)]
    tops = [baseline - h for h in heights]
    bw = 46
    layers = []
    ind = 1

    # punto que viaja por la linea (capa de adelante)
    dot_p = {"a": 1, "k": (
        [{"t": 36, "s": [xs[0], tops[0]], "i": I2, "o": O2}] +
        [{"t": 36 + (j) * 9, "s": [xs[j], tops[j]], "i": I2, "o": O2} for j in range(1, 5)] +
        [{"t": 72, "s": [xs[4], tops[4]]}])}
    dot_o = {"a": 1, "k": [{"t": 32, "s": [0], "i": I1, "o": O1}, {"t": 40, "s": [100]}]}
    dot_shapes = [{"ty": "gr", "it": [
        {"ty": "el", "d": 1, "s": {"a": 0, "k": [26, 26]}, "p": {"a": 0, "k": [0, 0]}},
        _fill(white), _stroke(coral, 8), _tr()]}]
    layers.append(_layer(ind, dot_shapes, {"p": dot_p, "o": dot_o}, op)); ind += 1

    # linea de tendencia (trim draw-on)
    line_v = [[xs[i], tops[i]] for i in range(5)]
    line = {"ty": "gr", "it": [
        {"ty": "sh", "ks": {"a": 0, "k": {"i": [[0, 0]] * 5, "o": [[0, 0]] * 5, "v": line_v, "c": False}}},
        _stroke(coral, 11),
        {"ty": "tm", "s": {"a": 0, "k": 0},
         "e": {"a": 1, "k": [{"t": 34, "s": [0], "i": I1, "o": O1}, {"t": 72, "s": [100]}]}, "o": {"a": 0, "k": 0}, "m": 1},
        _tr()]}
    layers.append(_layer(ind, [line], {}, op)); ind += 1

    # barras que crecen escalonadas (con overshoot)
    for i in range(5):
        h = heights[i]
        rect = {"ty": "gr", "it": [
            {"ty": "rc", "d": 1, "s": {"a": 0, "k": [bw, h]}, "p": {"a": 0, "k": [xs[i], baseline - h / 2]}, "r": {"a": 0, "k": 8}},
            _fill(teal), _tr()]}
        st = i * 7
        sc = {"a": 1, "k": [
            {"t": st, "s": [100, 0, 100], "i": I2, "o": O2},
            {"t": st + 14, "s": [100, 109, 100], "i": I2, "o": O2},
            {"t": st + 22, "s": [100, 100, 100]}]}
        ks = {"a": {"a": 0, "k": [xs[i], baseline, 0]}, "p": {"a": 0, "k": [xs[i], baseline, 0]}, "s": sc}
        layers.append(_layer(ind, [rect], ks, op)); ind += 1

    # eje (L) tenue, atras
    axis = {"ty": "gr", "it": [
        {"ty": "sh", "ks": {"a": 0, "k": {"i": [[0, 0]] * 3, "o": [[0, 0]] * 3,
         "v": [[80, 120], [80, baseline], [440, baseline]], "c": False}}},
        _stroke(gray, 6), _tr()]}
    layers.append(_layer(ind, [axis], {}, op)); ind += 1

    return {"v": "5.7.4", "fr": FPS, "ip": 0, "op": op, "w": CANVAS, "h": CANVAS,
            "nm": "growth-chart", "ddd": 0, "assets": [], "layers": layers}


def _el(d, color_fill=None, color_stroke=None, w=0):
    it = [{"ty": "el", "d": 1, "s": {"a": 0, "k": [d, d]}, "p": {"a": 0, "k": [0, 0]}}]
    if color_fill:
        it.append(_fill(color_fill))
    if color_stroke:
        it.append(_stroke(color_stroke, w))
    it.append(_tr())
    return {"ty": "gr", "it": it}


def _star_v(ro, ri, pts=5, rot=-90):
    v = []
    for k in range(pts * 2):
        ang = math.radians(rot + k * 180.0 / pts)
        r = ro if k % 2 == 0 else ri
        v.append([round(r * math.cos(ang), 2), round(r * math.sin(ang), 2)])
    return v


def build_check_burst():
    """EXITO: circulo que aparece con pop + tilde que se dibuja + rafaga de rayos. (rubro: default/check)"""
    op, cx = 120, 256
    teal, white, coral = rgba("1D9E75"), rgba("FFFFFF"), rgba("F0997B")
    layers = []
    # rayos (rafaga) - atras-adelante, aparecen al confirmarse
    rays = []
    for k in range(8):
        a = math.radians(k * 45)
        x1, y1 = 150 * math.cos(a), 150 * math.sin(a)
        x2, y2 = 196 * math.cos(a), 196 * math.sin(a)
        rays.append({"ty": "sh", "ks": {"a": 0, "k": {"i": [[0, 0], [0, 0]], "o": [[0, 0], [0, 0]],
                     "v": [[round(x1, 1), round(y1, 1)], [round(x2, 1), round(y2, 1)]], "c": False}}})
    ray_grp = {"ty": "gr", "it": rays + [_stroke(coral, 9), _tr()]}
    ray_ks = {"p": {"a": 0, "k": [cx, cx, 0]}, "a": {"a": 0, "k": [0, 0, 0]},
              "o": {"a": 1, "k": [{"t": 24, "s": [0], "i": I1, "o": O1}, {"t": 30, "s": [100], "i": I1, "o": O1}, {"t": 46, "s": [0]}]},
              "s": {"a": 1, "k": [{"t": 24, "s": [40, 40, 100], "i": I2, "o": O2}, {"t": 46, "s": [115, 115, 100]}]}}
    # tilde
    check = {"ty": "gr", "it": [
        {"ty": "sh", "ks": {"a": 0, "k": {"i": [[0, 0], [0, 0], [0, 0]], "o": [[0, 0], [0, 0], [0, 0]],
         "v": [[206, 258], [242, 296], [312, 220]], "c": False}}},
        _stroke(white, 20),
        {"ty": "tm", "s": {"a": 0, "k": 0}, "e": {"a": 1, "k": [{"t": 14, "s": [0], "i": I1, "o": O1}, {"t": 30, "s": [100]}]}, "o": {"a": 0, "k": 0}, "m": 1},
        _tr()]}
    # circulo con pop (anchor en el CENTRO de la elipse = [0,0]; la posicion lo centra en el lienzo)
    circ_ks = {"p": {"a": 0, "k": [cx, cx, 0]}, "a": {"a": 0, "k": [0, 0, 0]},
               "s": {"a": 1, "k": [{"t": 0, "s": [0, 0, 100], "i": I2, "o": O2}, {"t": 12, "s": [110, 110, 100], "i": I2, "o": O2}, {"t": 20, "s": [100, 100, 100]}]}}
    layers.append(_layer(1, [check], {}, op))
    layers.append(_layer(2, [ray_grp], ray_ks, op))
    layers.append(_layer(3, [_el(220, color_fill=teal)], circ_ks, op))
    return {"v": "5.7.4", "fr": FPS, "ip": 0, "op": op, "w": CANVAS, "h": CANVAS, "nm": "check-burst", "ddd": 0, "assets": [], "layers": layers}


def build_rating_stars():
    """RATING: 5 estrellas que aparecen con pop escalonado (de gris a dorado). (rubro: default/rating)"""
    op, gold, gray = 120, rgba("F2C94C"), rgba("3A3A3A")
    layers, ind = [], 1
    xs = [96 + i * 80 for i in range(5)]
    for i in range(5):
        star = {"ty": "gr", "it": [
            {"ty": "sh", "ks": {"a": 0, "k": {"i": [[0, 0]] * 10, "o": [[0, 0]] * 10, "v": _star_v(42, 18), "c": True}}},
            _fill(gold), _tr()]}
        st = i * 8
        ks = {"p": {"a": 0, "k": [xs[i], 256, 0]}, "a": {"a": 0, "k": [0, 0, 0]},
              "o": {"a": 1, "k": [{"t": st, "s": [0], "i": I1, "o": O1}, {"t": st + 6, "s": [100]}]},
              "s": {"a": 1, "k": [{"t": st, "s": [10, 10, 100], "i": I2, "o": O2}, {"t": st + 12, "s": [118, 118, 100], "i": I2, "o": O2}, {"t": st + 20, "s": [100, 100, 100]}]}}
        layers.append(_layer(ind, [star], ks, op)); ind += 1
    return {"v": "5.7.4", "fr": FPS, "ip": 0, "op": op, "w": CANVAS, "h": CANVAS, "nm": "rating-stars", "ddd": 0, "assets": [], "layers": layers}


def build_spinner():
    """LOADING: anillo con arco que gira en loop continuo. (rubro: default/loading)"""
    op, cx = 90, 256
    teal, track = rgba("1D9E75"), rgba("2A3142")
    layers = []
    # pista (anillo tenue completo)
    layers.append(_layer(2, [_el(200, color_stroke=track, w=22)], {"p": {"a": 0, "k": [cx, cx, 0]}}, op))
    # arco que gira (trim ~28%..92%)
    arc = {"ty": "gr", "it": [
        {"ty": "el", "d": 1, "s": {"a": 0, "k": [200, 200]}, "p": {"a": 0, "k": [0, 0]}},
        _stroke(teal, 22),
        {"ty": "tm", "s": {"a": 0, "k": 25}, "e": {"a": 0, "k": 90}, "o": {"a": 0, "k": 0}, "m": 1},
        _tr()]}
    spin_ks = {"p": {"a": 0, "k": [cx, cx, 0]}, "a": {"a": 0, "k": [0, 0, 0]},
               "r": {"a": 1, "k": [{"t": 0, "s": [0], "i": {"x": [0.4], "y": [0.4]}, "o": {"x": [0.6], "y": [0.6]}}, {"t": op, "s": [360]}]}}
    layers.insert(0, _layer(1, [arc], spin_ks, op))
    return {"v": "5.7.4", "fr": FPS, "ip": 0, "op": op, "w": CANVAS, "h": CANVAS, "nm": "spinner", "ddd": 0, "assets": [], "layers": layers}


SCENES = {
    "scene-growth-chart": build_growth_chart,
    "scene-check-burst": build_check_burst,
    "scene-rating-stars": build_rating_stars,
    "scene-spinner": build_spinner,
}


# ================================================================== TOOLKIT DE RECETAS (lo que usa el workflow)
# Una RECETA es JSON compacto: {archetype, palette, motion, shapes:[...]}. render_recipe la convierte en Lottie
# deterministica (sin expresiones, easing correcto, centrado). Asi los agentes DISENAN (eligen formas/colores/motion)
# y la generacion la hace este codigo confiable. Coords en lienzo 512, el icono se centra y el motion pivota al centro.
I1b, O1b = {"x": [0.4], "y": [0.4]}, {"x": [0.6], "y": [0.6]}


def _shape_group(s):
    k = s.get("kind"); col = rgba(s.get("color", "888888"))
    stroke = bool(s.get("stroke")); sw = s.get("sw", 12)
    if k == "rrect" or k == "rect":
        shp = {"ty": "rc", "d": 1, "s": {"a": 0, "k": [s["w"], s["h"]]}, "p": {"a": 0, "k": [s["x"], s["y"]]}, "r": {"a": 0, "k": s.get("r", 0)}}
        return {"ty": "gr", "it": [shp, (_stroke(col, sw) if stroke else _fill(col)), _tr()]}
    if k in ("circle", "ellipse"):
        w = s.get("d", s.get("w", 80)); h = s.get("d", s.get("h", 80))
        shp = {"ty": "el", "d": 1, "s": {"a": 0, "k": [w, h]}, "p": {"a": 0, "k": [s["x"], s["y"]]}}
        return {"ty": "gr", "it": [shp, (_stroke(col, sw) if stroke else _fill(col)), _tr()]}
    if k == "ring":
        shp = {"ty": "el", "d": 1, "s": {"a": 0, "k": [s["d"], s["d"]]}, "p": {"a": 0, "k": [s["x"], s["y"]]}}
        return {"ty": "gr", "it": [shp, _stroke(col, s.get("sw", 18)), _tr()]}
    if k == "line":
        sh = {"ty": "sh", "ks": {"a": 0, "k": {"i": [[0, 0], [0, 0]], "o": [[0, 0], [0, 0]], "v": [[s["x1"], s["y1"]], [s["x2"], s["y2"]]], "c": False}}}
        return {"ty": "gr", "it": [sh, _stroke(col, s.get("sw", 14)), _tr()]}
    if k == "star":
        base = _star_v(s.get("ro", 42), s.get("ri", 18), s.get("points", 5))
        v = [[round(s["x"] + vx, 2), round(s["y"] + vy, 2)] for vx, vy in base]
        sh = {"ty": "sh", "ks": {"a": 0, "k": {"i": [[0, 0]] * len(v), "o": [[0, 0]] * len(v), "v": v, "c": True}}}
        return {"ty": "gr", "it": [sh, _fill(col), _tr()]}
    if k in ("polygon", "path"):
        v = [[round(p[0], 2), round(p[1], 2)] for p in s["points"]]
        closed = s.get("closed", True)
        sh = {"ty": "sh", "ks": {"a": 0, "k": {"i": [[0, 0]] * len(v), "o": [[0, 0]] * len(v), "v": v, "c": closed}}}
        return {"ty": "gr", "it": [sh, (_stroke(col, sw) if stroke else _fill(col)), _tr()]}
    return {"ty": "gr", "it": [{"ty": "el", "d": 1, "s": {"a": 0, "k": [60, 60]}, "p": {"a": 0, "k": [256, 256]}}, _fill(col), _tr()]}


def _motion_ks(motion, op):
    a = {"a": 0, "k": [256, 256, 0]}
    intro = {"a": 1, "k": [{"t": 0, "s": [0], "i": I1, "o": O1}, {"t": 12, "s": [100]}]}
    if motion == "float":
        h = op // 2
        return {"a": a, "o": intro,
                "p": {"a": 1, "k": [{"t": 0, "s": [256, 266, 0], "i": I2, "o": O2}, {"t": h, "s": [256, 246, 0], "i": I2, "o": O2}, {"t": op, "s": [256, 266, 0]}]},
                "s": {"a": 1, "k": [{"t": 0, "s": [99, 99, 100], "i": I2, "o": O2}, {"t": h, "s": [104, 104, 100], "i": I2, "o": O2}, {"t": op, "s": [99, 99, 100]}]}}
    if motion == "spin":
        return {"a": a, "p": {"a": 0, "k": [256, 256, 0]}, "o": intro,
                "r": {"a": 1, "k": [{"t": 0, "s": [0], "i": I1b, "o": O1b}, {"t": op, "s": [360]}]}}
    if motion == "beat":
        q = op // 4
        return {"a": a, "p": {"a": 0, "k": [256, 256, 0]}, "o": intro,
                "s": {"a": 1, "k": [{"t": 0, "s": [100, 100, 100], "i": I2, "o": O2}, {"t": q, "s": [114, 114, 100], "i": I2, "o": O2}, {"t": 2 * q, "s": [100, 100, 100], "i": I2, "o": O2}, {"t": op, "s": [100, 100, 100]}]}}
    # pop (default)
    return {"a": a, "p": {"a": 0, "k": [256, 256, 0]}, "o": intro,
            "s": {"a": 1, "k": [{"t": 0, "s": [0, 0, 100], "i": I2, "o": O2}, {"t": 14, "s": [110, 110, 100], "i": I2, "o": O2}, {"t": 22, "s": [100, 100, 100]}]}}


def compose_icon(shapes, motion="pop", op=120):
    groups = [_shape_group(s) for s in shapes]
    groups.reverse()                         # primer shape del recipe = abajo (Lottie pinta el primero arriba)
    return {"v": "5.7.4", "fr": FPS, "ip": 0, "op": op, "w": CANVAS, "h": CANVAS, "nm": "icon", "ddd": 0,
            "assets": [], "layers": [_layer(1, groups, _motion_ks(motion, op), op)]}


ARCHETYPES = {
    "bar_chart": lambda r: build_growth_chart(),
    "check": lambda r: build_check_burst(),
    "stars": lambda r: build_rating_stars(),
    "ring_loader": lambda r: build_spinner(),
}


def render_recipe(r):
    """Receta -> Lottie. archetype 'icon' = compone desde primitivas; otros = arquetipos de accion fijos."""
    a = r.get("archetype", "icon")
    if a in ARCHETYPES:
        return ARCHETYPES[a](r)
    return compose_icon(r.get("shapes", []), r.get("motion", "pop"), r.get("op", 120))

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SCENES.items():
        j = fn()
        blob = json.dumps(j, separators=(",", ":"))
        with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
            f.write(blob)
        print(f"{name}: {len(blob)}B layers={len(j['layers'])} expr={chr(34)+'x'+chr(34)+':'+chr(34) in blob} eff={chr(34)+'ef'+chr(34)+':' in blob}")
    print("->", os.path.relpath(OUT, ROOT))
