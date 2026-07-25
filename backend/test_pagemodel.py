# TEST + GENERADOR DE FIXTURES del ensamblador pagemodel.v1 — SIN RED y SIN BROWSER.
#   python backend/test_pagemodel.py           -> corre los asserts (los de docs/director/DNA-SPEC.md §7)
#   python backend/test_pagemodel.py --write   -> ademas reescribe tools/fixtures/director/*.json
#
# Los 5 CASOS ADVERSARIALES (§5) se escriben aca como la salida SINTETICA del extractor (lo que §5.7
# dice que _JS_DNA + _JS_EXTRACT devuelven en cada uno) y se pasan por build_pagemodel: asi el fixture
# no es un JSON a mano que se desincroniza del codigo, sino la SALIDA REAL del ensamblador para una
# entrada fija. El gate tools/director-pagemodel-check.mjs los valida del lado JS.
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pagemodel as pm

FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools", "fixtures", "director")

fails = []


def ok(cond, msg):
    if not cond:
        fails.append(msg)


def near(a, b, eps=0.005):
    return abs(a - b) <= eps


# ---------------------------------------------------------------- los 5 casos adversariales (§5)
# vacia: 200, <body> con 3 palabras, sin CSS. bg del body es la unica senal aprovechable.
CASO_VACIA = dict(
    url="https://ejemplo.com",
    site={"screenshot": None, "images": [],
          "captura": {"url": "https://ejemplo.com", "urlFinal": "https://ejemplo.com", "httpStatus": 200,
                      "estado": "ok", "ts": "2026-07-25T12:00:00Z", "viewport": [1280, 900]},
          "content": {"title": "ejemplo", "bodyText": "Hola mundo test", "lang": "es", "logo": "",
                      "themeColor": "", "accentCss": ""},
          "dna": {"palette": {"bg": "#ffffff"},
                  "signals": {"muestras": {"botones": 0, "cards": 0, "texto": 2, "imagenes": 0}, "accentScore": 0, "chromaMax": 0}}},
    brief={"brand": "", "rubro": "default", "claim": "", "tagline": "", "cta": "", "bullets": [], "stats": []},
)

# botwall: Cloudflare. El dna MEDIDO es el del muro (gris, Inter, radius 8) -> se descarta entero.
CASO_BOTWALL = dict(
    url="https://protegida.com",
    site={"screenshot": None, "images": ["https://protegida.com/cf-logo.png"],
          "captura": {"url": "https://protegida.com", "urlFinal": "https://protegida.com", "httpStatus": 403,
                      "estado": "botwall", "ts": "2026-07-25T12:00:00Z", "viewport": [1280, 900],
                      "notas": ["botwall: 403 de Cloudflare"]},
          "content": {"title": "Just a moment...", "bodyText": "Checking your browser before accessing protegida.com",
                      "lang": "en", "logo": "https://protegida.com/favicon.ico", "themeColor": "#e2231a"},
          "dna": {"palette": {"accent": "#3b7ddd", "bg": "#f4f4f4", "inkOnBg": "#313131"},
                  "typography": {"displayHint": "grotesk", "h1Ratio": 0.028},
                  "shape": {"radius": 8, "borderStyle": "hairline"},
                  "density": {"score": 0.08, "fill": 0.05, "nodos": 4},
                  "modernidad": ["glass"], "modernidadScores": {"glass": 0.7},
                  "signals": {"muestras": {"botones": 1, "cards": 1, "texto": 3, "imagenes": 0},
                              "accentScore": 0.4, "chromaMax": 0.55}}},
    brief={"brand": "Protegida", "rubro": "default", "claim": "Verifica que eres humano",
           "bullets": ["Checking your browser"], "stats": []},
)

# no latina: japones. El dna es COMPLETO y valido (color/forma/densidad son agnosticos del idioma);
# solo se fuerzan caseHint, displayHint y textDir (§5.3).
CASO_NOLATINA = dict(
    url="https://例え.jp",
    site={"screenshot": "tools/out/e2e_jp.png",
          "images": [{"url": "https://例え.jp/product.jpg", "kind": "producto", "rank": 9.0, "ar": 0.8},
                     {"url": "https://例え.jp/team.jpg", "kind": "persona", "rank": 4.0, "ar": 1.0}],
          "captura": {"url": "https://例え.jp", "urlFinal": "https://例え.jp", "httpStatus": 200,
                      "estado": "ok", "ts": "2026-07-25T12:00:00Z", "viewport": [1280, 900]},
          "content": {"title": "スタジオ", "bodyText": "私たちはデザインスタジオです。" * 20, "lang": "ja",
                      "logo": "https://例え.jp/logo.png", "themeColor": "#d64545", "ogImage": "https://例え.jp/og.jpg"},
          "dna": {"palette": {"accent": "#d64545", "accent2": "#2f6f4f", "bg": "#faf7f2", "inkOnBg": "#1a1714"},
                  # el extractor mide 'upper' y 'serif' (la cascada esta calibrada para latinas):
                  # la normalizacion DEBE pisarlos por §5.3, y ese es justamente el assert del gate.
                  "typography": {"displayHint": "serif", "bodyHint": "serif", "caseHint": "upper",
                                 "script": "cjk", "textDir": "ltr", "h1Ratio": 0.047, "widthRatio": 0.71},
                  "shape": {"radius": 4, "radiusRatio": 0.015, "pill": False, "borderStyle": "hairline",
                            "borderWidth": 1.0, "shadowStyle": "flat"},
                  "density": {"score": 0.44, "fill": 0.41, "nodos": 62},
                  "mood": {"calidez": 0.71, "formalidad": 0.63, "energia": 0.42},
                  "modernidad": ["bigtype", "editorial-photo"],
                  "modernidadScores": {"bigtype": 0.80, "editorial-photo": 0.62},
                  "signals": {"muestras": {"botones": 6, "cards": 9, "texto": 84, "imagenes": 7},
                              "accentScore": 2.4, "chromaMax": 0.58, "blurBackdrop": 0, "gridCards": 3,
                              "areaImgVsTexto": 1.4, "gradStops": 0}}},
    brief={"brand": "スタジオ", "rubro": "tech", "cta": "詳しく見る",
           "semantica": {"queHace": "デザインとブランディングの小さなスタジオです",
                         "comoFunciona": ["相談", "設計", "納品"], "tipoNegocio": "servicio-local",
                         "modeloUso": "contacto",
                         "features": [{"titulo": "ブランド設計", "detalle": "ロゴから体験まで"}],
                         "pruebas": {"stats": [{"valor": "120", "etiqueta": "案件"}], "testimonios": [], "logosClientes": True},
                         "oferta": {"precio": "", "promo": "", "urgencia": ""},
                         "audiencia": {"who": "中小企業", "register": "formal", "awareness": "solution"},
                         "vozDeMarca": ["静か", "丁寧", "現代的"], "idioma": "ja"}},
)

# spa sin html: #root vacio tras networkidle + reintento. Solo sobrevive lo que si se pinto.
CASO_SPA = dict(
    url="https://app-spa.io",
    site={"screenshot": None, "images": [],
          "captura": {"url": "https://app-spa.io", "urlFinal": "https://app-spa.io", "httpStatus": 200,
                      "estado": "spa-vacia", "ts": "2026-07-25T12:00:00Z", "viewport": [1280, 900],
                      "notas": ["spa: 2.o intento sin contenido"]},
          "content": {"title": "App", "bodyText": "", "lang": "en", "spaVacia": True,
                      "logo": "https://app-spa.io/favicon.png", "themeColor": "#0f9d58"},
          "dna": {"palette": {"bg": "#0b0b0f"},
                  "signals": {"muestras": {"botones": 0, "cards": 0, "texto": 0, "imagenes": 0}, "accentScore": 0, "chromaMax": 0}}},
    brief={"brand": "App", "rubro": "tech", "claim": "", "bullets": []},
)

# 404 con la raiz TAMBIEN rota (la fila opuesta de §5.7: si la raiz sirve, esto es un 'ok' normal).
CASO_404 = dict(
    url="https://sitio.com/pagina-vieja",
    site={"screenshot": None, "images": [],
          "captura": {"url": "https://sitio.com/pagina-vieja", "urlFinal": "https://sitio.com/",
                      "httpStatus": 404, "estado": "404", "ts": "2026-07-25T12:00:00Z",
                      "viewport": [1280, 900], "notas": ["404: la raiz tampoco respondio"]},
          "content": {"title": "404 Not Found", "bodyText": "Not Found. The requested URL was not found.",
                      "lang": "en", "logo": "", "themeColor": ""},
          "dna": {"palette": {"accent": "#0066cc", "bg": "#ffffff", "inkOnBg": "#000000"},
                  "signals": {"muestras": {"botones": 0, "cards": 0, "texto": 3, "imagenes": 0},
                              "accentScore": 0.2, "chromaMax": 0.8}}},
    brief={"brand": "Sitio", "rubro": "default", "claim": "404 Not Found"},
)

CASOS = [("vacia", CASO_VACIA), ("botwall", CASO_BOTWALL), ("no-latina", CASO_NOLATINA),
         ("spa-sin-html", CASO_SPA), ("404", CASO_404)]


def build(caso):
    return pm.build_pagemodel(caso["url"], caso["site"], caso["brief"])


# ---------------------------------------------------------------- asserts de la matriz §5.7
def test_matriz():
    m = {k: build(c) for k, c in CASOS}

    v = m["vacia"]
    ok(v["captura"]["estado"] == "ok", "vacia: estado debe ser 'ok'")
    ok(v["captura"]["confianza"] == 0.30, f"vacia: confianza debe ser EXACTAMENTE 0.30 (dio {v['captura']['confianza']})")
    ok(v["dna"]["palette"]["accent"] == "#5b8cff" and v["dna"]["palette"]["accent2"] is None, "vacia: accent por defecto")
    ok(v["dna"]["palette"]["acromatica"] is False, "vacia: acromatica FALSE (chromaMax 0 = no medido, no 'sin color')")
    ok(v["dna"]["palette"]["bgLum"] == 1.0 and v["dna"]["signals"]["contrasteBgInk"] == 21.0, "vacia: bgLum/contraste por defecto")
    ok(pm._contrast(v["dna"]["palette"]["accentText"], "#ffffff") >= 4.5, "vacia: accentText debe ser legible sobre bg")
    ok(pm._hex_to_hsl(v["dna"]["palette"]["accentText"])[1] >= 0.99, "vacia: accentText NO puede lavar la saturacion")
    ok(v["dna"]["modernidad"] == [] and v["semantica"]["queHace"] == "", "vacia: modernidad [] y queHace vacio")
    ok(v["dna"]["density"] == {"nivel": "medio", "score": 0.35, "fill": 0.0, "nodos": 0}, "vacia: density por defecto")

    b = m["botwall"]
    ok(b["captura"]["estado"] == "botwall" and b["captura"]["confianza"] <= 0.15, "botwall: estado/confianza")
    ok(b["dna"]["shape"]["radius"] == 12 and b["dna"]["shape"]["borderStyle"] == "none", "botwall: shape del muro descartada")
    ok(b["dna"]["modernidad"] == [] and b["dna"]["density"]["score"] == 0.35, "botwall: modernidad/densidad del muro descartadas")
    ok(b["dna"]["palette"]["bg"] == "#ffffff", "botwall: el bg del muro NO se conserva")
    ok(b["dna"]["palette"]["accent"] == "#e2231a", "botwall: el theme-color del HTML original SI sobrevive")
    ok(b["assets"]["logo"] and b["assets"]["images"] == [], "botwall: logo si, imagenes del muro no")
    ok(b["semantica"]["features"] == [] and b["semantica"]["pruebas"]["stats"] == [], "botwall: semantica del muro descartada")

    n = m["no-latina"]
    ok(n["captura"]["estado"] == "ok" and n["captura"]["confianza"] >= 0.35, f"no-latina: confianza normal (dio {n['captura']['confianza']})")
    ok(n["dna"]["typography"]["caseHint"] == "sentence", "no-latina: caseHint FORZADO a sentence")
    ok(n["dna"]["typography"]["displayHint"] == "grotesk", "no-latina: displayHint forzado a grotesk en cjk")
    ok(n["dna"]["typography"]["script"] == "cjk" and n["dna"]["typography"]["textDir"] == "ltr", "no-latina: script/textDir")
    ok(n["dna"]["modernidad"] == ["bigtype", "editorial-photo"], "no-latina: modernidad completa y ordenada por score")
    ok(n["dna"]["density"]["nivel"] == "medio" and n["dna"]["mood"]["calidez"] == 0.71, "no-latina: dna medido COMPLETO")
    ok(n["semantica"]["idioma"] == "ja" and len(n["semantica"]["vozDeMarca"]) == 3, "no-latina: idioma real + voz de marca")
    ok(n["assets"]["images"][0]["kind"] == "producto", "no-latina: kind de imagenes preservado")

    s = m["spa-sin-html"]
    ok(s["captura"]["estado"] == "spa-vacia" and s["captura"]["confianza"] <= 0.30, "spa: estado/confianza")
    ok(s["dna"]["palette"]["bg"] == "#0b0b0f", "spa: el bg pintado SI se conserva")
    ok(s["dna"]["palette"]["inkOnBg"] == "#f4f1ea", "spa: bg oscuro -> tinta clara (pivote 0.18)")
    ok(s["dna"]["palette"]["accent"] == "#0f9d58", "spa: theme-color como accent")
    ok(s["dna"]["density"]["nivel"] == "aireado", "spa: densidad aireada (es lo que se ve)")
    ok(s["dna"]["modernidad"] == [], "spa: modernidad vacia")

    e = m["404"]
    ok(e["captura"]["estado"] == "404" and e["captura"]["confianza"] <= 0.10, "404: estado/confianza")
    ok(e["dna"]["palette"]["accent"] == "#5b8cff" and e["dna"]["modernidad"] == [], "404: dna descartado")
    ok(e["semantica"]["features"] == [] and e["semantica"]["pruebas"]["testimonios"] == [], "404: semantica vacia")
    ok(e["captura"]["urlFinal"] == "https://sitio.com/", "404: urlFinal es la raiz que se intento")
    return m


# ---------------------------------------------------------------- asserts unitarios de §3 (§7 de la DNA-SPEC)
def test_normalizacion():
    # pivote 0.18 (NO 0.5): #8a8a8a tiene bgLum 0.25 -> tinta OSCURA (contraste 5.9), no clara (2.8)
    p = pm._norm_palette({"bg": "#8a8a8a"}, pm._norm_signals({"chromaMax": 0.5}), [], [])
    ok(p["inkOnBg"] == pm.DEF_INK_SANE or pm._rellum(p["inkOnBg"]) < 0.18,
       f"pivote 0.18: bg #8a8a8a debe recibir tinta oscura (dio {p['inkOnBg']})")
    ok(pm._contrast(p["inkOnBg"], "#8a8a8a") >= 4.5, "pivote 0.18: la tinta saneada debe alcanzar 4.5")
    ok(near(pm._rellum("#808080"), 0.216, 0.002), "relLum no es lightness: #808080 vale 0.216")

    # accentText converge con la saturacion INTACTA (bug historico del "acento lavado")
    p2 = pm._norm_palette({"accent": "#5b8cff", "bg": "#ffffff"}, pm._norm_signals({"chromaMax": 0.64}), [], [])
    ok(pm._contrast(p2["accentText"], "#ffffff") >= 4.5, "accentText: debe alcanzar 4.5 sobre blanco")
    ok(p2["accent"] == "#5b8cff", "accentText: el accent NO se toca")
    h0, s0, _ = pm._hex_to_hsl("#5b8cff")
    h1, s1, _ = pm._hex_to_hsl(p2["accentText"])
    ok(abs(s1 - s0) < 0.02 and pm._hue_dist(h0, h1) < 3, f"accentText: saturacion/hue intactos (dio {p2['accentText']})")

    # acromatica: negro sobre blanco -> True y el accent NO se va al azul del default
    p3 = pm._norm_palette({"accent": "#1d1d1f", "bg": "#ffffff"}, pm._norm_signals({"chromaMax": 0.03}), [], [])
    ok(p3["acromatica"] is True and p3["accent"] == "#1d1d1f", "acromatica: True y accent medido (fallback 2.5)")
    ok(p3["accent2"] is None, "acromatica: accent2 debe quedar null (no inventar un 2.o color de marca)")

    # el "acento" que en realidad era el fondo o la tinta -> siguiente candidato del ranking (§3.5)
    p4 = pm._norm_palette({"accent": "#ffffff", "bg": "#ffffff", "accentRanking": ["#ffffff", "#ff6a00"]},
                          pm._norm_signals({"chromaMax": 0.9}), [], [])
    ok(p4["accent"] == "#ff6a00", f"accent==bg debe pasar al siguiente candidato (dio {p4['accent']})")

    # accent2 con el MISMO hue no es un segundo color de marca, es una sombra
    p5 = pm._norm_palette({"accent": "#2b6cff", "accent2": "#0a3fbb", "bg": "#ffffff"},
                          pm._norm_signals({"chromaMax": 0.8}), [], [])
    ok(p5["accent2"] is None, "accent2: mismo hue con otra luminosidad debe descartarse")

    # §3.5: radius absurdo -> pastilla; borderWidth y fill clampeados; modernidad cortada a 3
    sh = pm._norm_shape({"radius": 99, "borderWidth": 40}, [])
    ok(sh["pill"] is True and sh["radius"] == 32 and sh["borderWidth"] == 12.0, "§3.5: radius/borderWidth absurdos")
    d = pm._norm_density({"fill": 3.4, "nodos": 9999, "score": 0.9})
    ok(d["fill"] == 1.0 and d["nodos"] == 400 and d["nivel"] == "denso", "§3.5: fill/nodos clampeados, nivel derivado del score")
    mod, sc = pm._norm_modernidad(["bento", "glass", "bigtype", "brutalist", "inventado"],
                                  {"bento": 0.9, "glass": 0.6, "bigtype": 0.8, "brutalist": 0.55})
    ok(mod == ["bento", "bigtype", "glass"], f"§3.5: max 3 por score y sin valores fuera del enum (dio {mod})")
    ok("brutalist" not in mod, "brutalist y glass son antagonicos: gana el de mayor score")
    ok(set(sc) == set(mod), "modernidadScores debe quedar alineado con modernidad")

    # accent2 derivado SOLO cuando la direccion de arte lo pide (mesh/glass), nunca porque si
    dna = pm._norm_dna({"palette": {"accent": "#ff6a00", "bg": "#ffffff"}, "modernidad": ["bigtype"],
                        "signals": {"chromaMax": 0.9}}, [], [])
    pm._derivar_accent2(dna)
    ok(dna["palette"]["accent2"] is None, "accent2: sin mesh/glass NO se deriva")
    dna2 = pm._norm_dna({"palette": {"accent": "#ff6a00", "bg": "#ffffff"}, "modernidad": ["gradient-mesh"],
                         "modernidadScores": {"gradient-mesh": 0.9}, "signals": {"chromaMax": 0.9}}, [], [])
    pm._derivar_accent2(dna2)
    a2 = dna2["palette"]["accent2"]
    ok(a2 is not None and pm._hue_dist(pm._hex_to_hsl(a2)[0], pm._hex_to_hsl("#ff6a00")[0]) > 100,
       f"accent2: con mesh se deriva con salto real de hue (dio {a2})")

    # acromatica ajusta el mood (§3.2)
    dna3 = pm._norm_dna({"palette": {"accent": "#1d1d1f", "bg": "#ffffff"},
                         "mood": {"calidez": 0.5, "formalidad": 0.5, "energia": 0.5},
                         "signals": {"chromaMax": 0.02}}, [], [])
    ok(dna3["mood"]["energia"] == 0.40 and dna3["mood"]["formalidad"] == 0.60, "acromatica: -0.10 energia / +0.10 formalidad")

    # NUNCA lanza: basura total y None deben producir un modelo valido igual
    for basura in [None, {}, {"dna": "no-es-dict", "content": 7}, {"dna": {"palette": {"accent": "rojo", "bg": 42}}}]:
        try:
            got = pm.build_pagemodel("https://x.com", basura, {"brand": "X"})
            ok(got["v"] == 1 and got["dna"]["palette"]["accent"].startswith("#"), "basura: modelo valido igual")
        except Exception as ex:
            fails.append(f"build_pagemodel LANZO con basura ({basura}): {ex}")
    try:
        got = pm.build_pagemodel(None, None, None)
        ok(got["captura"]["estado"] == "bloqueada" and got["captura"]["confianza"] == 0.0,
           "url invalida -> 'bloqueada' con confianza 0 (barrera SSRF: nunca se abre el browser)")
    except Exception as ex:
        fails.append(f"build_pagemodel LANZO sin argumentos: {ex}")

    # DETERMINISMO: dos ensambladas del mismo input deben dar el MISMO json byte a byte
    a = json.dumps(build(CASO_NOLATINA), sort_keys=True, ensure_ascii=False)
    b = json.dumps(build(CASO_NOLATINA), sort_keys=True, ensure_ascii=False)
    ok(a == b, "determinismo: dos ensambladas del mismo input deben ser identicas")


def escribir(modelos):
    os.makedirs(FIX, exist_ok=True)
    for nombre, model in modelos.items():
        path = os.path.join(FIX, f"{nombre}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(model, f, ensure_ascii=False, indent=2, sort_keys=True)
            f.write("\n")
        print(f"  fixture -> tools/fixtures/director/{nombre}.json")


if __name__ == "__main__":
    modelos = test_matriz()
    test_normalizacion()
    if "--write" in sys.argv:
        escribir(modelos)
    if fails:
        print(f"\nTEST PAGEMODEL FALLO ({len(fails)} casos):")
        for f_ in fails:
            print("  FAIL  " + f_)
        sys.exit(1)
    print("TEST PAGEMODEL OK (matriz §5.7 de los 5 adversariales · pivote 0.18 · accentText sin lavar · "
          "acromatica · §3.5 valores absurdos · nunca lanza · determinista).")
