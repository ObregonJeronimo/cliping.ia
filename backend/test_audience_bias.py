"""Test L389: el audience_bias (pista SUAVE derivada de ratings del historial) entra al prompt de perception como un
bloque de DESEMPATE (no obligatorio, 'IGNORALA si contradice'), y sin bias el prompt queda byte-identico. Mockea el
cliente Anthropic (captura el texto del prompt) -> sin API key. Corre con pytest O como script: python backend/test_audience_bias.py"""
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
BIAS = {"awareness": {"value": "solution", "n": 3}, "register": {"value": "warm", "n": 2},
        "energy": {"value": "alto", "n": 2}, "seriousness": {"value": 0.62, "n": 3}, "_evidence": 3}


def _run(audience_bias=None, audience_hint="", goal_hint=""):
    cap = []
    perception._client = _mk_client(cap)
    perception._shot_b64 = lambda shot: "ZmFrZQ=="
    out = asyncio.run(perception.analyze_to_brief("https://x.com", site=SITE, audience_hint=audience_hint,
                                                  goal_hint=goal_hint, audience_bias=audience_bias))
    return "\n".join(cap), out


def test_bias_entra_como_pista_suave():
    txt, _ = _run(audience_bias=BIAS)
    assert "PISTA SUAVE" in txt, "falta el bloque de pista suave del historial"
    assert "solution" in txt and "warm" in txt and "alto" in txt and "0.62" in txt, "faltan los valores ganadores del bias"
    assert "IGNORALA" in txt, "la pista debe ser DESEMPATE (ignorable), no mandato"


def test_sin_bias_no_hay_bloque():
    txt, _ = _run(audience_bias=None)
    assert "PISTA SUAVE" not in txt, "sin bias no debe haber bloque (prompt byte-identico al de antes)"
    txt2, _ = _run(audience_bias={})       # dict vacio (poca evidencia) -> tampoco
    assert "PISTA SUAVE" not in txt2, "bias vacio no debe emitir bloque"


def test_bias_por_debajo_de_lo_declarado():
    # con hint declarado (L373) Y bias (L389): ambos bloques presentes, pero el declarado MANDA y el bias es desempate
    txt, _ = _run(audience_bias=BIAS, audience_hint="madres jovenes")
    assert "DECLARADOS POR EL USUARIO" in txt and "PISTA SUAVE" in txt
    assert txt.index("DECLARADOS POR EL USUARIO") < txt.index("PISTA SUAVE"), "lo declarado debe ir ANTES que la pista suave"


def test_bias_no_rompe_el_brief():
    _, out = _run(audience_bias=BIAS)
    assert out.get("brand") and out.get("rubro"), "el brief debe seguir saliendo normal con bias"


def test_bias_parcial():
    # bias con solo awareness -> el bloque sale con esa sola señal, sin las demas
    txt, _ = _run(audience_bias={"awareness": {"value": "product", "n": 4}, "_evidence": 4})
    assert "PISTA SUAVE" in txt and "product" in txt
    assert "seriedad" not in txt, "no debe mencionar seriedad si el bias no la trae"


if __name__ == "__main__":
    fns = [test_bias_entra_como_pista_suave, test_sin_bias_no_hay_bloque, test_bias_por_debajo_de_lo_declarado,
           test_bias_no_rompe_el_brief, test_bias_parcial]
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
