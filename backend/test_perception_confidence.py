"""Tests de perception L391 (re-escalado por baja confianza de INFERENCIA). Mockea el cliente Anthropic -> sin API key.
Corre con pytest O como script: python backend/test_perception_confidence.py"""
import asyncio
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


def _mk_client(confidences):
    """Cliente fake: la N-esima llamada a messages.create devuelve un brief con confidences[N]. Registra los modelos usados."""
    calls = []
    seq = list(confidences)

    class _Messages:
        async def create(self, **kw):
            calls.append(kw.get("model"))
            conf = seq[min(len(calls) - 1, len(seq) - 1)]
            brief = {"brand": "Ambigua", "rubro": "tech", "tone": "dark", "brandColor": "#3b82f6",
                     "tagline": "Algo", "claim": "Un mensaje claro", "cta": "Ver", "confidence": conf}
            return _Resp(json.dumps(brief))

    class _Client:
        messages = _Messages()

    return _Client(), calls


SITE = {"content": {"title": "X", "bodyText": "algo de texto real", "headings": ["h"]}, "screenshot": "/fake.png"}


def _run(confidences, b64="ZmFrZWI2NA==", site=SITE):
    perception._client, calls = _mk_client(confidences)
    perception._shot_b64 = lambda shot: b64   # controla si "hay screenshot util"
    out = asyncio.run(perception.analyze_to_brief("https://x.com", site=site))
    return out, calls


def test_baja_confianza_reescala_con_opus():
    out, calls = _run([0.3, 0.85])          # 1ra sonnet conf 0.3 -> reintenta; 2da opus conf 0.85
    assert len(calls) == 2, f"esperaba 2 llamadas, hubo {len(calls)}: {calls}"
    assert calls[0] == perception.BRIEF_MODEL, f"1ra deberia ser sonnet: {calls[0]}"
    assert calls[1] == perception.FINE_MODEL, f"2da deberia ser opus: {calls[1]}"
    assert out["_confidence"] == 0.85, f"deberia quedarse con el brief mas seguro: {out['_confidence']}"


def test_alta_confianza_no_reescala():
    out, calls = _run([0.9])
    assert len(calls) == 1, f"alta confianza -> 1 sola llamada: {calls}"
    assert out["_confidence"] == 0.9


def test_reescala_no_empeora():
    out, calls = _run([0.3, 0.1])           # el re-analisis viene MENOS seguro -> conserva el original
    assert len(calls) == 2
    assert out["_confidence"] == 0.3, f"deberia conservar el original (0.3): {out['_confidence']}"


def test_sin_screenshot_no_reescala():
    out, calls = _run([0.2], b64=None, site={"content": SITE["content"], "screenshot": None})
    assert len(calls) == 1, f"sin screenshot no reescala aunque conf baja: {calls}"


if __name__ == "__main__":
    fns = [test_baja_confianza_reescala_con_opus, test_alta_confianza_no_reescala,
           test_reescala_no_empeora, test_sin_screenshot_no_reescala]
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
