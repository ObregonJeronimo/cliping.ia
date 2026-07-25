"""Tests del bloque 'semantica' del brief (pagemodel.v1 §1.3, contrato C2 de la fase F1). Mockea el cliente Anthropic
-> SIN red y SIN API key. Cubre las tres formas en que llega la respuesta del LLM: completa, basura, y ausente.
Ademas fija como REGRESION que el brief legacy (lo que consumen urvid IA / Advanced / kinetic / templates HOY) sale
igual con y sin el bloque nuevo: 'semantica' es ADITIVO o no sirve.
Corre con pytest O como script: python backend/test_perception_semantica.py"""
import asyncio
import copy
import json
import perception


class _Block:
    def __init__(self, text):
        self.type = "text"
        self.text = text


class _Usage:
    input_tokens = 10
    output_tokens = 20


class _Resp:
    def __init__(self, text):
        self.content = [_Block(text)]
        self.usage = _Usage()


def _mk_client(brief):
    """Cliente fake: siempre devuelve el mismo brief serializado (confidence alta -> sin re-escalado a Opus)."""
    class _Messages:
        async def create(self, **kw):
            return _Resp(json.dumps(brief))

    class _Client:
        messages = _Messages()

    return _Client()


# claves LEGACY del brief: las lee el motor hoy. Si alguna cambia por el agregado de 'semantica', se rompio algo.
LEGACY = ("brand", "rubro", "tone", "brandColor", "tagline", "claim", "cta", "bullets", "stats", "proof",
          "seriousness", "audience", "energyHint", "playbookKey", "themeHint")

BASE = {"brand": "Contabee", "rubro": "tech", "tone": "dark", "brandColor": "#3b82f6",
        "tagline": "Facturas sin dolor", "claim": "Emiti tus facturas en un minuto", "cta": "Probar gratis",
        "bullets": ["Facturacion automatica", "Reportes claros"],
        "stats": [{"value": "92%", "label": "menos tiempo administrativo"}],
        "proof": "4.8 en Google", "seriousness": 0.6, "confidence": 0.9,
        "audience": {"who": "duenos de PyMEs", "register": "casual", "awareness": "problem"}}

SITE = {"content": {"title": "Contabee", "lang": "es-AR", "bodyText": "texto real de la pagina",
                    "headings": ["Facturacion simple"]}, "screenshot": None}


def _run(brief, site=SITE):
    perception._client = _mk_client(brief)
    perception._shot_b64 = lambda shot: None   # sin screenshot -> nunca re-escala a Opus (camino de 1 sola llamada)
    return asyncio.run(perception.analyze_to_brief("https://contabee.com", site=site))


# ------------------------------------------------------------------ (a) respuesta COMPLETA
def test_semantica_completa_se_normaliza():
    b = copy.deepcopy(BASE)
    b["semantica"] = {
        "queHace": "Software de facturacion electronica para comercios y PyMEs de Argentina que necesitan emitir "
                   "comprobantes fiscales validos sin pelearse con la pagina de AFIP todos los meses del anio",
        "comoFunciona": ["Crea tu cuenta", "Conecta tu CUIT", "Emiti la factura", "Descarga el PDF",
                         "Compartila por WhatsApp", "Paso sexto", "Paso septimo"],
        "tipoNegocio": "saas", "modeloUso": "suscripcion",
        "features": [{"titulo": "Facturacion automatica en un solo click desde el celular", "detalle": "Emitis A, B y C"},
                     {"titulo": "Reportes", "detalle": "Ves tu facturacion mes a mes"},
                     "Integracion con AFIP",
                     {"titulo": "", "detalle": "esta se descarta: sin titulo"},
                     {"titulo": "F5"}, {"titulo": "F6"}, {"titulo": "F7"}, {"titulo": "F8"}],
        "pruebas": {"stats": [{"valor": "92%", "etiqueta": "menos tiempo en administracion contable"},
                              {"valor": "+1200", "etiqueta": "PyMEs"}, {"valor": "4.8", "etiqueta": "en Google"},
                              {"valor": "24h", "etiqueta": "soporte"}, {"valor": "5", "etiqueta": "sobra, cap 4"}],
                    "testimonios": [{"texto": "Nos ahorro dos dias por mes", "firma": "Ana, La Tiendita"},
                                    {"texto": "sin firma"}, {"firma": "sin texto: se descarta"},
                                    {"texto": "t3", "firma": "f3"}, {"texto": "t4", "firma": "sobra, cap 3"}],
                    "logosClientes": True},
        "oferta": {"precio": "$29/mes", "promo": "Primer mes gratis", "urgencia": "Solo hasta fin de mes"},
        "vozDeMarca": ["Tecnico", "Sobrio", "Directo", "sobra"],
        "idioma": "es",
    }
    s = _run(b)["semantica"]

    assert 10 <= len(s["queHace"]) <= 140, f"queHace fuera de 10..140: {len(s['queHace'])}"
    assert not s["queHace"].endswith(("de", "y", "del")), f"conector colgando: {s['queHace']!r}"
    assert len(s["comoFunciona"]) == 5, f"comoFunciona cap 5: {s['comoFunciona']}"
    assert all(len(x) <= 48 for x in s["comoFunciona"]), s["comoFunciona"]
    assert s["tipoNegocio"] == "saas" and s["modeloUso"] == "suscripcion"

    assert len(s["features"]) == 6, f"features cap 6: {len(s['features'])}"
    assert all(len(f["titulo"]) <= 28 and len(f["detalle"]) <= 90 for f in s["features"]), s["features"]
    assert all(f["titulo"] for f in s["features"]), "una feature sin titulo no deberia sobrevivir"
    assert s["features"][2] == {"titulo": "Integracion con AFIP", "detalle": ""}, s["features"][2]

    st = s["pruebas"]["stats"]
    assert len(st) == 4 and all(len(x["valor"]) <= 10 and len(x["etiqueta"]) <= 26 for x in st), st
    tm = s["pruebas"]["testimonios"]
    assert len(tm) == 3, f"testimonios cap 3: {tm}"
    assert all(x["texto"] for x in tm), "un testimonio sin texto no deberia sobrevivir"
    assert tm[1] == {"texto": "sin firma", "firma": ""}, tm[1]
    assert s["pruebas"]["logosClientes"] is True

    assert s["oferta"] == {"precio": "$29/mes", "promo": "Primer mes gratis", "urgencia": "Solo hasta fin de mes"}
    assert s["vozDeMarca"] == ["tecnico", "sobrio", "directo"], s["vozDeMarca"]
    assert s["idioma"] == "es"
    assert s["audiencia"]["awareness"] == "problem" and s["audiencia"]["register"] == "casual", s["audiencia"]


# ------------------------------------------------------------------ (b) respuesta con BASURA
def test_semantica_basura_cae_a_defaults():
    b = copy.deepcopy(BASE)
    b["semantica"] = {
        "queHace": "SaaS",                       # < 10 chars: no es una frase
        "comoFunciona": "no es una lista",
        "tipoNegocio": "restaurante",            # fuera del enum
        "modeloUso": "otro",                     # 'otro' NO esta en el enum de modeloUso (§1.3): -> desconocido
        "features": {"titulo": "no es una lista"},
        "pruebas": [1, 2, 3],                    # deberia ser objeto
        "oferta": "gratis",                      # deberia ser objeto
        "vozDeMarca": ["", None, 7],
        "idioma": "japones",                     # no es ISO 639-1
    }
    s = _run(b)["semantica"]
    assert s["queHace"] == "", f"una frase de 4 chars no sirve de ancla: {s['queHace']!r}"
    assert s["comoFunciona"] == [] and s["features"] == []
    assert s["tipoNegocio"] == "otro", s["tipoNegocio"]
    assert s["modeloUso"] == "desconocido", s["modeloUso"]
    assert s["pruebas"] == {"stats": [], "testimonios": [], "logosClientes": False}, s["pruebas"]
    assert s["oferta"] == {"precio": "", "promo": "", "urgencia": ""}, s["oferta"]
    assert s["vozDeMarca"] == ["claro", "directo", "actual"], s["vozDeMarca"]
    assert s["idioma"] == "es", s["idioma"]   # cae al lang de la pagina ('es-AR' -> 'es'), no al invento del LLM


def test_semantica_no_es_dict():
    """El LLM devolvio 'semantica' como string/lista: no debe romper ni ensuciar el bloque."""
    for basura in ("un texto", [1, 2], 42, None):
        b = copy.deepcopy(BASE)
        b["semantica"] = basura
        s = _run(b)["semantica"]
        assert s["tipoNegocio"] == "otro" and s["vozDeMarca"] == ["claro", "directo", "actual"], (basura, s)


# ------------------------------------------------------------------ (c) SIN el bloque
def test_sin_semantica_no_rompe():
    out = _run(copy.deepcopy(BASE))          # BASE no trae 'semantica'
    s = out["semantica"]
    assert set(s) == {"queHace", "comoFunciona", "tipoNegocio", "modeloUso", "features", "pruebas", "oferta",
                      "audiencia", "vozDeMarca", "idioma"}, sorted(s)
    assert s["queHace"] == "" and s["comoFunciona"] == [] and s["features"] == []
    assert s["tipoNegocio"] == "otro" and s["modeloUso"] == "desconocido"
    assert s["vozDeMarca"] == ["claro", "directo", "actual"]
    # audiencia sale del MISMO `audience` que contesto el LLM -> cuando el modelo responde (BASE lo hace) el brief
    # legacy y el pagemodel dicen lo mismo. Los DEFAULTS si difieren a proposito (test de abajo): §1.3 manda
    # 'problem' para el pagemodel y el brief legacy no se puede tocar ('solution', lo consumen los motores de hoy).
    assert s["audiencia"] == out["audience"], "con audience del LLM, audiencia y audience no pueden divergir"


def test_audiencia_usa_los_defaults_de_la_spec():
    """§1.3: who <=60, register 'casual', awareness 'problem' (es el valor del fixture de pagina vacia §1.7).
    El brief legacy sigue con su default historico 'solution' y su cap de 40: ADITIVO significa no tocarlo."""
    b = copy.deepcopy(BASE)
    b.pop("audience")                                  # el LLM omitio la audiencia
    out = _run(b)
    assert out["audience"]["awareness"] == "solution", "el default legacy del brief no se toca"
    assert out["semantica"]["audiencia"]["awareness"] == "problem", out["semantica"]["audiencia"]
    assert out["semantica"]["audiencia"]["register"] == "casual"

    largo = copy.deepcopy(BASE)                        # who: el cap del pagemodel es 60, el del brief 40
    largo["audience"] = {"who": "duenos de pequenas y medianas empresas del rubro gastronomico"}
    out2 = _run(largo)
    w = out2["semantica"]["audiencia"]["who"]
    assert len(w) <= 60 and len(w) > 40, f"who deberia usar el cap 60 de §1.3, no el 40 del brief: {w!r}"


def test_caps_duros_y_tipos_no_escalares():
    """Dos defectos que el motor DIBUJA si no se atajan aca:
    1) `_clip_words` devuelve la primera palabra ENTERA cuando ya excede el cap -> un precio sin espacios
       ('ARS$1.299.999,00/mes') rompia los 10 caps de §1.3 a la vez.
    2) un dict/lista del LLM se convertia en su repr de Python y se renderizaba tal cual ("{'amount': 29")."""
    b = copy.deepcopy(BASE)
    b["semantica"] = {
        "queHace": ["Software de facturacion", "para comercios"],       # lista donde va una frase
        "comoFunciona": ["P" * 90, {"paso": "Crea tu cuenta"}, True],
        "features": [{"titulo": "T" * 60, "detalle": {"x": 1}}],
        "pruebas": {"stats": [{"valor": "1.234.567.890", "etiqueta": "E" * 60},
                              {"valor": 500, "etiqueta": "numero: es texto valido"}],
                    "testimonios": [{"texto": "t" * 200, "firma": "F" * 60}],
                    "logosClientes": "false"},                          # el LLM manda la STRING "false"
        "oferta": {"precio": {"amount": 29}, "promo": "R" * 90, "urgencia": ["U"]},
        "tipoNegocio": "SaaS ", "modeloUso": " Suscripcion",            # enum con capitales/espacios
        "vozDeMarca": ["A" * 40, "b", "c"],
    }
    s = _run(b)["semantica"]
    assert s["queHace"] == "", f"un repr de lista NO puede llegar al video: {s['queHace']!r}"
    assert s["comoFunciona"] == ["P" * 48], s["comoFunciona"]
    assert s["features"] == [{"titulo": "T" * 28, "detalle": ""}], s["features"]
    st = s["pruebas"]["stats"]
    assert st[0]["valor"] == "1.234.567" and len(st[0]["etiqueta"]) == 26, st[0]
    assert st[1]["valor"] == "500", "un numero SI es texto valido para un stat"
    tm = s["pruebas"]["testimonios"][0]
    assert len(tm["texto"]) == 140 and len(tm["firma"]) == 28, tm
    assert s["pruebas"]["logosClientes"] is False, 'bool("false") es True: hay que parsear la string'
    assert s["oferta"] == {"precio": "", "promo": "R" * 40, "urgencia": ""}, s["oferta"]
    assert s["tipoNegocio"] == "saas" and s["modeloUso"] == "suscripcion", (s["tipoNegocio"], s["modeloUso"])
    assert s["vozDeMarca"] == ["a" * 14, "b", "c"], s["vozDeMarca"]


def test_todos_los_caps_de_la_spec_se_respetan():
    """Barrido: NINGUN campo de §1.3 puede exceder su cap, ni siquiera con un token unico sin espacios."""
    b = copy.deepcopy(BASE)
    X = "X" * 300
    b["semantica"] = {"queHace": X, "comoFunciona": [X] * 3, "features": [{"titulo": X, "detalle": X}],
                      "pruebas": {"stats": [{"valor": X, "etiqueta": X}], "testimonios": [{"texto": X, "firma": X}]},
                      "oferta": {"precio": X, "promo": X, "urgencia": X},
                      "vozDeMarca": [X, X + "y", X + "z"]}
    s = _run(b)["semantica"]
    malos = []
    if len(s["queHace"]) > 140: malos.append(("queHace", len(s["queHace"])))
    malos += [("paso", len(x)) for x in s["comoFunciona"] if len(x) > 48]
    malos += [("titulo", len(f["titulo"])) for f in s["features"] if len(f["titulo"]) > 28]
    malos += [("detalle", len(f["detalle"])) for f in s["features"] if len(f["detalle"]) > 90]
    malos += [("valor", len(x["valor"])) for x in s["pruebas"]["stats"] if len(x["valor"]) > 10]
    malos += [("etiqueta", len(x["etiqueta"])) for x in s["pruebas"]["stats"] if len(x["etiqueta"]) > 26]
    malos += [("texto", len(x["texto"])) for x in s["pruebas"]["testimonios"] if len(x["texto"]) > 140]
    malos += [("firma", len(x["firma"])) for x in s["pruebas"]["testimonios"] if len(x["firma"]) > 28]
    for k, cap in (("precio", 16), ("promo", 40), ("urgencia", 40)):
        if len(s["oferta"][k]) > cap: malos.append((k, len(s["oferta"][k])))
    malos += [("voz", len(v)) for v in s["vozDeMarca"] if len(v) > 14]
    assert not malos, f"caps de §1.3 violados: {malos}"


def test_determinismo_del_bloque():
    """Nada de random ni de timestamps: la MISMA respuesta del LLM produce el MISMO bloque, siempre."""
    b = copy.deepcopy(BASE)
    b["semantica"] = {"queHace": "Software de facturacion para PyMEs", "vozDeMarca": ["Tecnico", "sobrio", "tecnico"],
                      "pruebas": {"stats": [{"valor": "92%", "etiqueta": "menos tiempo"}]}}
    corridas = [json.dumps(_run(copy.deepcopy(b))["semantica"], sort_keys=True) for _ in range(3)]
    assert len(set(corridas)) == 1, corridas


# ------------------------------------------------------------------ ADITIVO: el brief legacy no se mueve
def test_brief_legacy_identico_con_y_sin_semantica():
    sin = _run(copy.deepcopy(BASE))
    con = copy.deepcopy(BASE)
    con["semantica"] = {"queHace": "Software de facturacion para PyMEs", "tipoNegocio": "saas",
                        "features": [{"titulo": "Reportes", "detalle": "mes a mes"}]}
    con = _run(con)
    for k in LEGACY:
        assert k in sin, f"desaparecio una clave legacy del brief: {k}"
        assert sin[k] == con[k], f"'semantica' movio la clave legacy {k}: {sin[k]!r} != {con[k]!r}"


# ------------------------------------------------------------------ cache: el skip por _low_confidence sigue vivo
def test_low_confidence_sigue_marcando_captura_pobre():
    """main.py solo cachea si `not _low_confidence`. Con el shape nuevo la señal tiene que seguir saliendo igual."""
    ok = _run(copy.deepcopy(BASE))
    assert ok["_low_confidence"] is False and ok["_parse_ok"] is True

    vacia = _run(copy.deepcopy(BASE), site={"content": {}, "screenshot": None})
    assert vacia["_low_confidence"] is True, "captura vacia deberia marcar baja confianza (no cachear)"

    muro = _run(copy.deepcopy(BASE), site={"content": {"title": "Just a moment...", "bodyText": "Checking your browser",
                                                       "headings": []}, "screenshot": None})
    assert muro["_low_confidence"] is True, "bot-wall deberia marcar baja confianza (no cachear)"
    assert "semantica" in muro, "hasta un bot-wall tiene que producir un bloque semantica valido"


if __name__ == "__main__":
    fns = [test_semantica_completa_se_normaliza, test_semantica_basura_cae_a_defaults, test_semantica_no_es_dict,
           test_sin_semantica_no_rompe, test_audiencia_usa_los_defaults_de_la_spec,
           test_caps_duros_y_tipos_no_escalares, test_todos_los_caps_de_la_spec_se_respetan,
           test_determinismo_del_bloque, test_brief_legacy_identico_con_y_sin_semantica,
           test_low_confidence_sigue_marcando_captura_pobre]
    p = f = 0
    for fn in fns:
        try:
            fn(); p += 1; print(f"PASS  {fn.__name__}")
        except AssertionError as e:
            f += 1; print(f"FAIL  {fn.__name__}: {e}")
        except Exception as e:
            f += 1; print(f"ERR   {fn.__name__}: {type(e).__name__}: {e}")
    print(f"\n{p} pass, {f} fail")
    raise SystemExit(1 if f else 0)
