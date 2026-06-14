"""Tests de style_engine (POC 3). Corre con pytest O como script: python backend/test_style_engine.py"""
import style_engine as se


def test_classify_basico():
    assert se.classify("restaurant de comida natural") == "gastronomia"
    assert se.classify("plataforma SaaS de automatizacion") == "tech"
    assert se.classify("clinica odontologica") == "salud"
    assert se.classify("marca de ropa urbana") == "moda"
    assert se.classify("gimnasio crossfit") == "fitness"
    assert se.classify("academia de cursos online") == "educacion"
    assert se.classify("algo totalmente generico sin rubro") == "default"


def test_classify_casos_ambiguos():
    # los dos bugs que se vieron en el CLI: NO deben caer en 'tech'
    assert se.classify("inmobiliaria premium") == "inmobiliaria"
    assert se.classify("fintech de inversiones") == "finanzas"
    assert se.classify("estudio de terapia psicologica") == "salud"   # 'terapia' no debe pegar 'api'


def test_determinismo():
    a = se.preset("gimnasio crossfit", "deportistas", "alto", 12345)
    b = se.preset("gimnasio crossfit", "deportistas", "alto", 12345)
    assert a == b, "misma entrada + misma semilla => preset identico"


def test_variedad_misma_marca_distinta_semilla():
    a = se.preset("restaurant", "", "medio", 1)
    b = se.preset("restaurant", "", "medio", 2)
    assert a["rubro"] == b["rubro"] == "gastronomia"
    # alguna dimension visual tiene que cambiar (acento/tema/formas/seed)
    assert (a["accent"], a["theme"], tuple(a["morphs"])) != (b["accent"], b["theme"], tuple(b["morphs"]))


def test_rubros_distintos_se_sienten_distintos():
    g = se.preset("restaurant", "", "medio", 7)
    t = se.preset("plataforma saas", "", "alto", 7)
    # familias de forma DISJUNTAS entre gastronomia y tech
    assert not (set(g["morphs"]) & set(t["morphs"])), "gastronomia y tech no comparten formas"
    assert g["accent"] != t["accent"]
    assert g["theme"] != t["theme"] or g["pacing"] != t["pacing"]


def test_accent_es_hex_valido():
    for ind in ["restaurant", "saas", "clinica", "ropa", "gym", "fintech"]:
        acc = se.preset(ind, "", "medio", 99)["accent"]
        assert len(acc) == 7 and acc[0] == "#" and all(c in "0123456789abcdef" for c in acc[1:])


def test_stable_seed_determinista():
    assert se.stable_seed("Marca", "url", 0) == se.stable_seed("Marca", "url", 0)
    assert se.stable_seed("Marca A", "url", 0) != se.stable_seed("Marca B", "url", 0)


def test_prompt_block_menciona_tokens():
    pre = se.preset("gimnasio crossfit", "", "alto", 5)
    blk = se.prompt_block(pre)
    assert pre["accent"] in blk and pre["theme"] in blk and pre["style_seed"] in blk


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    p = f = 0
    for fn in fns:
        try:
            fn(); p += 1; print(f"PASS  {fn.__name__}")
        except AssertionError as e:
            f += 1; print(f"FAIL  {fn.__name__}: {e}")
    print(f"\n{p} pass, {f} fail")
    raise SystemExit(1 if f else 0)
