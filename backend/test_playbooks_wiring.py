"""Tests del cableado PLAYBOOK -> brief del motor (item L142/L849). Cubre:
(1) playbooks.pick resuelve cada rubro canonico de perception a su clave y expone energy/theme_hint accionables;
(2) perception.analyze_to_brief adjunta energyHint/playbookKey/themeHint al brief (mockea Anthropic -> sin API key).
Corre con pytest O como script: python backend/test_playbooks_wiring.py"""
import asyncio
import json
import perception
import playbooks


# ---- (1) playbooks.pick: mapeo rubro-canonico -> clave + campos accionables ----

# rubro canonico de perception (RUBROS) -> clave de playbook esperada
_EXPECTED_KEY = {
    "tech": "saas", "finanzas": "fintech", "gastronomia": "restaurante", "moda": "ecommerce",
    "eventos": "evento", "salud": "salud", "belleza": "belleza", "fitness": "fitness",
    "inmobiliaria": "inmobiliaria", "educacion": "educacion",
}
_VALID_ENERGY = {"alto", "medio", "bajo"}


def test_cada_rubro_activa_su_playbook():
    for rubro, key in _EXPECTED_KEY.items():
        pb = playbooks.pick(rubro)
        assert pb["key"] == key, f"rubro '{rubro}' deberia mapear a '{key}', dio '{pb['key']}'"
        assert pb["energy"] in _VALID_ENERGY, f"energy invalida para {rubro}: {pb['energy']}"
        assert isinstance(pb["theme_hint"], str), f"theme_hint no-str para {rubro}"


def test_energias_de_marketing_clave():
    # las conductas titulares del cableado: fitness/evento aceleran, salud/inmobiliaria calman, saas neutro.
    assert playbooks.pick("fitness")["energy"] == "alto"
    assert playbooks.pick("eventos")["energy"] == "alto"
    assert playbooks.pick("salud")["energy"] == "bajo"
    assert playbooks.pick("inmobiliaria")["energy"] == "bajo"
    assert playbooks.pick("tech")["energy"] == "medio"


def test_rubro_desconocido_cae_a_generico_sin_romper():
    for bad in ["default", "", "   ", "zzz-nada-que-ver", None]:
        pb = playbooks.pick(bad)                     # no debe lanzar
        assert pb["key"] == "generico", f"'{bad}' deberia caer a 'generico', dio '{pb['key']}'"
        assert pb["energy"] in _VALID_ENERGY
        assert pb["theme_hint"] == "", f"generico no deberia tener theme_hint, dio '{pb['theme_hint']}'"


def test_texto_libre_sigue_matcheando_por_substring():
    # los callers legacy (template_director) pasan industria de TEXTO LIBRE -> el scoring por substring sigue vivo
    # (el mapa rubro->clave es un atajo ADICIONAL, no reemplaza el matcher).
    assert playbooks.pick("plataforma saas b2b")["key"] == "saas"


# ---- (2) perception adjunta los campos del playbook al brief ----

class _Block:
    def __init__(self, text):
        self.type = "text"; self.text = text


class _Usage:
    input_tokens = 10; output_tokens = 20


class _Resp:
    def __init__(self, text):
        self.content = [_Block(text)]; self.usage = _Usage()


def _mk_client(rubro):
    class _Messages:
        async def create(self, **kw):
            brief = {"brand": "Marca", "rubro": rubro, "tone": "dark", "brandColor": "#3b82f6",
                     "tagline": "Algo", "claim": "Un mensaje claro", "cta": "Ver", "confidence": 0.9}
            return _Resp(json.dumps(brief))

    class _Client:
        messages = _Messages()
    return _Client()


SITE = {"content": {"title": "X", "bodyText": "texto real", "headings": ["h"]}, "screenshot": "/fake.png"}


def _run(rubro):
    perception._client = _mk_client(rubro)
    perception._shot_b64 = lambda shot: "ZmFrZQ=="   # hay screenshot util (no dispara re-analisis: confidence 0.9)
    return asyncio.run(perception.analyze_to_brief("https://x.com", site=SITE))


def test_brief_lleva_energyhint_y_playbookkey():
    out = _run("tech")
    assert out["energyHint"] in _VALID_ENERGY, f"energyHint invalido/ausente: {out.get('energyHint')}"
    assert out["playbookKey"] == "saas", f"tech deberia dar playbookKey 'saas': {out.get('playbookKey')}"
    assert "themeHint" in out and isinstance(out["themeHint"], str)


def test_brief_energyhint_por_rubro():
    assert _run("fitness")["energyHint"] == "alto"
    assert _run("salud")["energyHint"] == "bajo"


def test_rubro_no_reconocido_no_rompe_el_brief():
    # rubro fuera de RUBROS -> _normalize lo lleva a 'default' -> pick -> generico/medio, sin romper la perception.
    out = _run("marciano")
    assert out["rubro"] == "default"
    assert out["energyHint"] in _VALID_ENERGY
    assert out["playbookKey"] == "generico"


if __name__ == "__main__":
    fns = [test_cada_rubro_activa_su_playbook, test_energias_de_marketing_clave,
           test_rubro_desconocido_cae_a_generico_sin_romper, test_texto_libre_sigue_matcheando_por_substring,
           test_brief_lleva_energyhint_y_playbookkey, test_brief_energyhint_por_rubro,
           test_rubro_no_reconocido_no_rompe_el_brief]
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
