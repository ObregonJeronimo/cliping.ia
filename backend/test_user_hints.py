"""Test L373: las notas DECLARADAS del usuario (audience_hint/goal_hint) entran al prompt de perception como un bloque de
MAXIMA prioridad ('MANDAN sobre lo inferido'). Mockea el cliente Anthropic (captura el texto del prompt) -> sin API key.
Corre con pytest O como script: python backend/test_user_hints.py"""
import asyncio
import json
import perception


class _Block:
    def __init__(self, text):
        self.type = "text"; self.text = text


class _Usage:
    input_tokens = 10; output_tokens = 20


class _Resp:
    def __init__(self, text):
        self.content = [_Block(text)]; self.usage = _Usage()


def _mk_client(capture):
    class _Messages:
        async def create(self, **kw):
            # captura el TEXTO del user-message (para asertar que el bloque declarado llego al prompt)
            for m in kw.get("messages", []):
                for b in (m.get("content") or []):
                    if isinstance(b, dict) and b.get("type") == "text":
                        capture.append(b.get("text", ""))
            brief = {"brand": "X", "rubro": "tech", "tone": "dark", "brandColor": "#3b82f6",
                     "tagline": "T", "claim": "C", "cta": "V", "confidence": 0.9}
            return _Resp(json.dumps(brief))

    class _Client:
        messages = _Messages()
    return _Client()


SITE = {"content": {"title": "X", "bodyText": "texto real", "headings": ["h"]}, "screenshot": "/f.png"}


def _run(audience_hint="", goal_hint=""):
    cap = []
    perception._client = _mk_client(cap)
    perception._shot_b64 = lambda shot: "ZmFrZQ=="   # hay screenshot util; confidence 0.9 -> 1 sola llamada
    out = asyncio.run(perception.analyze_to_brief("https://x.com", site=SITE, audience_hint=audience_hint, goal_hint=goal_hint))
    return "\n".join(cap), out


def test_hints_entran_al_prompt_como_bloque_declarado():
    txt, _ = _run(audience_hint="madres jovenes", goal_hint="reservas")
    assert "DECLARADOS POR EL USUARIO" in txt, "falta el bloque de audiencia/objetivo declarados en el prompt"
    assert "madres jovenes" in txt, "falta el publico declarado en el prompt"
    assert "reservas" in txt, "falta el objetivo declarado en el prompt"


def test_sin_hints_no_hay_bloque_declarado():
    txt, _ = _run()
    assert "DECLARADOS POR EL USUARIO" not in txt, "no deberia haber bloque declarado cuando no hay hints"


def test_solo_objetivo_alcanza():
    txt, _ = _run(goal_hint="ventas")
    assert "DECLARADOS POR EL USUARIO" in txt and "ventas" in txt


def test_no_rompe_el_brief():
    _, out = _run(audience_hint="pymes")
    assert out.get("brand") and out.get("rubro"), "el brief debe seguir saliendo normal con hints"


if __name__ == "__main__":
    fns = [test_hints_entran_al_prompt_como_bloque_declarado, test_sin_hints_no_hay_bloque_declarado,
           test_solo_objetivo_alcanza, test_no_rompe_el_brief]
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
