# perception.py - urvid 1.0 · PERCEPTION (analisis REAL de una pagina/URL -> BRIEF rico del motor urvid 1.0).
# UNA SOLA llamada multimodal a Sonnet 4.6 (texto curado de la pagina + screenshot juntos) -> brief con el material
# YA SELECCIONADO para el video: que decir (claim/tagline/cta), que props mostrar (bullets), que datos (stats) y la
# prueba social. Reemplaza las 2 llamadas anteriores (vision + texto) por 1 -> mas robusto Y mas barato.
# Cache POR URL (lo hace main.py) -> la misma pagina NO re-llama. Input acotado + max_tokens chico = bajo gasto.
# Best-effort: si la captura o el LLM fallan, devuelve un brief con defaults sensatos (no rompe).
import base64
import json
import os
import re

import playbooks   # "el foso": playbook de marketing por rubro (item L142). Modulo de datos puro (sin deps) -> import seguro.

try:
    from anthropic import AsyncAnthropic
    _client = AsyncAnthropic()
except Exception:  # pragma: no cover
    _client = None

BRIEF_MODEL = "claude-sonnet-4-6"
# modelo FINO para RE-ESCALAR cuando el modelo se declara inseguro de su inferencia (pagina ambigua): mas caro, se usa
# SOLO en ese caso (no en el camino normal). Ya tarifado en template_director.MODEL_PRICES / brand_dna.MODEL_PRICES.
FINE_MODEL = "claude-opus-4-8"

RUBROS = ["tech", "finanzas", "inmobiliaria", "salud", "educacion", "gastronomia",
          "moda", "belleza", "fitness", "eventos", "default"]

_SYS = (
    "Sos director creativo de reels verticales (9:16) + analista de marca. Te paso lo que se capturo de una pagina "
    "(texto real + un screenshot) y devolves el BRIEF para un reel corto de esa marca, con el material YA SELECCIONADO "
    "(elegis lo mejor, descartas relleno/nav/legales). Respondes SOLO un objeto JSON (sin texto afuera) con estas claves:\n"
    '- "brand": nombre corto y real de la marca\n'
    '- "rubro": UNO EXACTO de: tech, finanzas, inmobiliaria, salud, educacion, gastronomia, moda, belleza, fitness, eventos, default\n'
    '- "tone": "dark" o "light" segun la identidad visual del screenshot (si dudas, "dark")\n'
    '- "brandColor": color de acento de la marca en hex "#rrggbb" — el que REALMENTE ves dominante/vivido en el screenshot\n'
    '- "tagline": gancho corto, MAX 6 palabras y <=42 caracteres\n'
    '- "claim": el mensaje principal del reel, una frase COMPLETA, MAX 12 palabras y <=76 caracteres, concreto y fiel a la pagina\n'
    '- "cta": llamado a la accion corto, MAX 4 palabras y <=22 caracteres (preferi el CTA real de la pagina si hay)\n'
    '- "bullets": 2 a 4 props/beneficios CORTOS y COMPLETOS (cada uno MAX 5 palabras y <=30 caracteres, una FRASE CON SENTIDO). Es un LIMITE DURO: si la idea no entra, REESCRIBILA mas corta (no la recortes) manteniendo el sentido; NUNCA dejes un fragmento sin su sustantivo (MAL: "Tienda online de alto", "PDV integrado al digital"; BIEN: "Alto rendimiento", "PDV integrado"). [] si no hay claros.\n'
    '- "stats": 0 a 2 datos numericos REALES que COMUNIQUEN un logro/beneficio, cada uno {"value": "92%" | "+600" | "4.9", "label": "etiqueta DESCRIPTIVA de 3 a 6 palabras y <=28 caracteres: QUE es el numero"} (ej {"value":"92%","label":"de clientes lo recomienda"}). El value es SOLO la cifra con su unidad (92%, +600, £12B, 4.9) — SIN simbolos decorativos como estrellas (★), flechas (->), checks (✓) ni emojis: el motor dibuja estrellas e iconos como graficos aparte. El label explica que significa para que la escena DIGA algo (no un numero suelto). NO incluyas precios sueltos, anios/fechas, telefonos ni codigos. [] si no hay datos que digan algo.\n'
    '- "proof": una linea de prueba social REAL (rating, cant. de clientes, premio) o "" si no hay\n'
    '- "seriousness": numero 0 a 1 (salud/finanzas alto ~0.8; gastronomia/moda bajo ~0.35)\n'
    '- "audience": objeto con A QUIEN le habla el reel, inferido de la pagina: {"who": "el publico objetivo en 2-5 palabras (ej: duenos de PyMEs, madres jovenes, gamers, profesionales de la salud)", "register": "formal" | "casual" | "warm" (como hablarle a ese publico), "awareness": UNA de "unaware" | "problem" | "solution" | "product" | "most" = la ETAPA DE CONSCIENCIA del comprador: unaware (no sabe que tiene el problema), problem (siente el problema pero no busca solucion), solution (busca soluciones), product (compara productos/marcas), most (listo para comprar, solo necesita el empujon)}. Es CLAVE: define el gancho y el tono del reel.\n'
    '- "confidence": numero 0 a 1 = que tan SEGURO estas de tu inferencia de rubro+audience DADO lo que viste (baja ~0.3 si la pagina tiene poco texto, es ambigua o casi solo tenes el screenshot; alta ~0.9 si el contenido es claro y explicito). Se honesto: es una señal interna para decidir si conviene re-analizar, no una nota de calidad.\n'
    "REGLAS: FIEL a la pagina (NO inventes datos, cifras, premios ni features que no esten; "
    "si no hay, deja [] o \"\"), conciso, sin comillas tipograficas. "
    "IDIOMA: escribi el copy en el IDIOMA de la pagina (ver 'Idioma de la pagina' en el resumen). Si es espanol o no se "
    "sabe -> espanol rioplatense (voseo). Si la pagina esta en OTRO idioma de ALFABETO LATINO (ingles, portugues, italiano, "
    "frances, aleman, etc.) -> escribi TODO el copy en ESE idioma (el reel le habla al publico en SU idioma, no traducido). "
    "PERO si la pagina esta en un idioma de ESCRITURA NO-LATINA (japones, chino, coreano, arabe, ruso, hebreo, hindi, "
    "tailandes, griego, etc.) -> escribi el copy en ESPAÑOL: el motor de video SOLO renderiza alfabeto latino, en esos "
    "alfabetos saldria como cajitas ilegibles. (El resumen te avisa cuando es no-latino.) "
    "El 'brand' SIEMPRE en alfabeto latino: si la marca es no-latina, usa su nombre latino oficial o transliteralo "
    "(Яндекс -> Yandex; 楽天 -> Rakuten; 三星 -> Samsung). Un wordmark no-latino saldria como cajitas. "
    "COPY SEGUN AWARENESS (clave para que le hable a SU publico): escribi tagline/claim/cta acorde a la etapa: "
    "unaware -> el gancho EDUCA sobre el problema/oportunidad (sin nombrar el producto); "
    "problem -> nombra el DOLOR concreto que ese publico siente; "
    "solution -> presenta la solucion/categoria como respuesta; "
    "product -> resalta el DIFERENCIAL frente a alternativas; "
    "most -> va directo a la oferta y un CTA fuerte. El TONO sigue el register (formal=preciso/sobrio, casual=directo/cercano, warm=calido/empatico). "
    "COMPLETITUD: cada texto debe estar ENTERO y entrar en su largo (el reel lo muestra tal cual, sin '...'); si una idea "
    "no entra, REESCRIBILA mas corta manteniendo el sentido — NUNCA la cortes a la mitad ni la dejes incompleta. "
    "Antes de responder, RELEE cada texto y verifica: completo, concreto, fiel a la pagina y dentro del largo. SOLO el JSON."
)


def _safe_hex(s):
    m = re.search(r"#([0-9a-fA-F]{6})", str(s or ""))
    return "#" + m.group(1).lower() if m else None


def _extract_json(text):
    s = str(text or "")
    i = s.find("{")
    if i < 0:
        return None
    depth = 0
    for j in range(i, len(s)):
        c = s[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(s[i:j + 1])
                except Exception:
                    return None
    return None


def _brand_from_url(url):
    host = re.sub(r"^https?://(www\.)?", "", (url or "").strip().lower()).split("/")[0]
    part = host.split(".")[0] if host else ""
    return part.capitalize() if part else None


# el motor de video solo renderiza ALFABETO LATINO: un brand en cirilico/CJK/arabe/griego/etc. saldria TOFU en el
# wordmark/outro. Red DETERMINISTA: si el brand perceptado es no-latino, caer al nombre del DOMINIO (siempre latino:
# yandex.ru -> Yandex). Cubre griego/cirilico/hebreo/arabe/siriaco/thai/kana/CJK/hangul.
_BRAND_NONLATIN = re.compile("[Ͱ-ϿЀ-ӿ֐-׿؀-ۿ܀-ݏ฀-๿぀-ヿ㐀-鿿가-힯]")
def _latin_brand(brand, url):
    if brand and _BRAND_NONLATIN.search(str(brand)):
        return _brand_from_url(url) or "Marca"
    return brand


def _clip(s, n):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return s[:n]


def _clip_words(s, n):
    """Recorta a <= n chars SIN cortar palabras (corta en el ultimo espacio que entra). Evita 'Automatiza lo aburri'.
    Espeja core/script.js clipWords -> los caps de salida coinciden con los BUDGETS del motor (fitContent)."""
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    if len(s) <= n:
        return s
    cut = s[:n]
    k = cut.rfind(" ")
    return (cut[:k] if k > 0 else s.split(" ")[0]).strip()


# detecta paginas-MURO (Cloudflare/challenge/captcha/JS-required): la captura trae el texto del MURO, no el de la marca.
# Si no se detecta, perception usaria esa basura como contenido real. Tratarlo como captura VACIA -> el guardrail
# anti-alucinacion (basate solo en el screenshot, no inventes) se ocupa.
_BOTWALL = re.compile(
    r"just a moment|performing security verification|checking (your browser|if the site connection)|"
    r"enable javascript|attention required|access denied|are you (a )?human|verifica que (eres|sos) human|"
    r"cloudflare|ddos protection|please (verify|enable)|unusual traffic|complete the (security )?check|captcha",
    re.I)
def _is_botwall(content):
    c = content if isinstance(content, dict) else {}
    blob = " ".join([str(c.get("title") or ""), " ".join(x for x in (c.get("headings") or []) if isinstance(x, str)),
                     str(c.get("bodyText") or "")[:500]])
    return bool(_BOTWALL.search(blob))


# idiomas de ESCRITURA NO-LATINA: el motor de video solo renderiza alfabeto latino -> el copy se escribe en español igual
# (en estos alfabetos saldria como cajitas). Deteccion por codigo de lang + backup por chars (titulo/headings no-latinos).
_NONLATIN_LANG = {"ja", "zh", "ko", "ar", "he", "iw", "fa", "ur", "ru", "uk", "be", "bg", "sr", "mk", "el", "hi", "bn",
                  "pa", "gu", "ta", "te", "kn", "ml", "th", "lo", "km", "my", "ka", "hy", "am", "yi", "ps", "sd", "dv"}
def _is_nonlatin(content):
    c = content if isinstance(content, dict) else {}
    base = str(c.get("lang") or "").split("-")[0].lower()
    if base in _NONLATIN_LANG:
        return True
    t = (str(c.get("title") or "") + " " + " ".join(x for x in (c.get("headings") or []) if isinstance(x, str)))[:200]
    if t:
        nl = sum(1 for ch in t if ord(ch) > 0x2c0)   # > Latin/IPA/spacing-mods -> CJK/cirilico/arabe/griego/etc.
        return nl > len(t) * 0.25
    return False


def _page_digest(content):
    """Resumen CURADO y compacto de la captura para el prompt (señal alta, pocos tokens). Evita dumpear bodyText crudo."""
    c = content if isinstance(content, dict) else {}
    if _is_botwall(c):
        return ""   # MURO de bot-detection -> sin contenido util -> que actue el guardrail anti-alucinacion
    parts = []
    if c.get("title"): parts.append("Titulo: " + _clip(c["title"], 120))
    if c.get("siteName"): parts.append("Sitio: " + _clip(c["siteName"], 60))
    if c.get("lang"):
        if _is_nonlatin(c):
            parts.append("Idioma de la pagina: " + _clip(c["lang"], 8) + " (ALFABETO NO-LATINO -> escribi el copy en ESPAÑOL; el motor no renderiza este alfabeto)")
        else:
            parts.append("Idioma de la pagina: " + _clip(c["lang"], 8))
    if c.get("description"): parts.append("Descripcion: " + _clip(c["description"], 260))
    H = [x for x in (c.get("headings") or []) if isinstance(x, str)][:12]
    if H: parts.append("Titulos de la pagina: " + " | ".join(_clip(h, 80) for h in H))
    CTA = [x for x in (c.get("ctas") or []) if isinstance(x, str)][:8]
    if CTA: parts.append("Botones/CTA: " + " | ".join(_clip(x, 30) for x in CTA))
    P = [x for x in (c.get("paragraphs") or []) if isinstance(x, str)][:8]
    if P: parts.append("Parrafos: " + " || ".join(_clip(p, 180) for p in P))
    T = [x for x in (c.get("testimonials") or []) if isinstance(x, str)][:5]
    if T: parts.append("Voz del cliente (testimonios reales, usalos para el TONO y los DOLORES del publico): " + " || ".join(_clip(t, 180) for t in T))
    # DATOS DECLARADOS (structured data de la captura): anclan la AUDIENCIA en hechos, no en adivinanza.
    s = c.get("structured") if isinstance(c.get("structured"), dict) else {}
    decl = []
    types = [t for t in (s.get("types") or []) if isinstance(t, str)][:6]
    if types: decl.append("tipo schema.org: " + ", ".join(types))
    if s.get("ogType"): decl.append("og:type: " + _clip(s["ogType"], 30))
    pr = (str(s.get("price") or "") + " " + str(s.get("currency") or "")).strip()
    if pr: decl.append("precio: " + _clip(pr, 24))
    elif s.get("priceRange"): decl.append("rango precio: " + _clip(s["priceRange"], 24))
    if s.get("ratingValue"):
        rc = _clip(str(s.get("ratingCount") or ""), 8)
        decl.append("rating: " + _clip(str(s["ratingValue"]), 8) + (f" ({rc} reseñas)" if rc else ""))
    if s.get("region"): decl.append("region/zona: " + _clip(s["region"], 50))
    if s.get("keywords"): decl.append("keywords: " + _clip(s["keywords"], 160))
    if decl:
        parts.append("DATOS DECLARADOS por la marca (usalos para inferir AUDIENCIA: gama/poder adquisitivo, region=moneda, B2B vs B2C): " + " | ".join(decl))
    if not parts and c.get("bodyText"): parts.append("Texto: " + _clip(c["bodyText"], 1500))
    return "\n".join(parts)[:5000]


def _shot_b64(path):
    try:
        if path and os.path.exists(path):
            with open(path, "rb") as f:
                return base64.standard_b64encode(f.read()).decode("utf-8")
    except Exception as e:
        print(f"[perceive] no se pudo leer el screenshot ({e})")
    return None


# quita palabras-FUNCION colgadas al final de un bullet (conjuncion/preposicion/articulo) que dejan la frase a medias:
# "Restaurantes, super y" -> "Restaurantes, super"; "Pago facil con" -> "Pago facil". Garantia determinista (el prompt
# pide frases completas pero el LLM a veces corta una enumeracion en la conjuncion).
_DANGLING = {"y", "e", "o", "u", "de", "del", "al", "a", "con", "en", "para", "por", "la", "el", "lo", "los", "las",
             "un", "una", "unos", "unas", "que", "su", "tu", "mi", "sin", "sobre", "entre", "desde", "hasta", "como",
             "and", "or", "the", "of", "to", "for", "with", "in", "on", "your", "our", "an", "&"}
def _no_dangling(s):
    s = re.sub(r"[\s,;:·•/\-]+$", "", str(s or "")).strip()
    words = s.split()
    while len(words) > 1 and words[-1].lower().strip(".,;:") in _DANGLING:
        words.pop()
    out = re.sub(r"[\s,;:·•/\-]+$", "", " ".join(words)).strip()
    return out or s   # si quedara vacio, devolver el original (no romper)


def _norm_list(v, n, maxlen):
    out = []
    if isinstance(v, list):
        for it in v:
            s = _no_dangling(_clip_words(it, maxlen))
            if s:
                out.append(s)
            if len(out) >= n:
                break
    return out


# quita simbolos DECORATIVOS (estrellas/flechas/checks/emojis) que el LLM a veces mete en cifras/copy: las fuentes
# display del motor pueden no tenerlos -> renderizan como caja (tofu). El motor dibuja estrellas/iconos como VECTORES.
_DECOR = re.compile("[\u2022\u2190-\u21ff\u2300-\u27bf\u2b00-\u2bff\ufe0f]|[\U0001f000-\U0001faff]")
def _no_decor(s):
    return re.sub(r"\s{2,}", " ", _DECOR.sub("", str(s or ""))).strip()

def _norm_stats(v):
    out = []
    if isinstance(v, list):
        for it in v:
            if isinstance(it, dict) and (it.get("value") not in (None, "")):
                out.append({"value": _no_decor(_clip(it.get("value"), 12)), "label": _clip_words(it.get("label"), 28)})
            if len(out) >= 3:
                break
    return out


def _normalize(b, url, content):
    b = b if isinstance(b, dict) else {}
    content = content if isinstance(content, dict) else {}
    rubro = b.get("rubro") if b.get("rubro") in RUBROS else "default"
    tone = b.get("tone") if b.get("tone") in ("dark", "light") else "dark"
    brand = (b.get("brand") or content.get("siteName") or content.get("title")
             or _brand_from_url(url) or "Marca")
    brand = _latin_brand(brand, url)   # el motor solo renderiza latino -> un brand no-latino (Яндекс) cae al dominio (Yandex)
    # CAPS de salida = los BUDGETS del motor (core/script.js): recorte por PALABRA (nunca a la mitad). El motor
    # vuelve a aplicar fitContent como red de seguridad -> el texto se ve COMPLETO en cualquier escena.
    out = {
        "brand": _clip_words(brand, 32) or "Marca", "rubro": rubro, "tone": tone,
        "brandColor": _safe_hex(b.get("brandColor")) or "#5b8cff",
        "tagline": _clip_words(b.get("tagline"), 42), "claim": _clip_words(b.get("claim"), 76), "cta": _clip_words(b.get("cta"), 22),
        "bullets": _norm_list(b.get("bullets"), 4, 30),
        "stats": _norm_stats(b.get("stats")),
        "proof": _clip_words(b.get("proof"), 90),
    }
    try:
        out["seriousness"] = max(0.0, min(1.0, float(b.get("seriousness"))))
    except Exception:
        pass
    try:
        out["_confidence"] = max(0.0, min(1.0, float(b.get("confidence"))))   # confianza de INFERENCIA declarada por el modelo (telemetria; señal interna con prefijo _)
    except Exception:
        out["_confidence"] = None
    # AUDIENCIA de primera clase: a quien le habla el reel (who), como hablarle (register) y la ETAPA DE CONSCIENCIA
    # (awareness, Eugene Schwartz) que decide el gancho/copy. Defaults sensatos (casual/solution) si el modelo no la dio.
    aud = b.get("audience") if isinstance(b.get("audience"), dict) else {}
    reg = aud.get("register") if aud.get("register") in ("formal", "casual", "warm") else None
    aw = aud.get("awareness") if aud.get("awareness") in ("unaware", "problem", "solution", "product", "most") else None
    out["audience"] = {"who": _clip_words(aud.get("who"), 40), "register": reg or "casual", "awareness": aw or "solution"}
    return out


async def analyze_to_brief(url, desarrollo="", site=None, usage=None, audience_hint="", goal_hint="", audience_bias=None):
    """UNA llamada multimodal (texto + screenshot) -> brief rico. `site` = resultado de site_capture.capture_all."""
    content = (site or {}).get("content") if isinstance(site, dict) else None
    shot = (site or {}).get("screenshot") if isinstance(site, dict) else None
    brief = {}
    parse_ok = False
    if _client is not None:
        digest = _page_digest(content)
        b64 = _shot_b64(shot)
        desarrollo = _clip(desarrollo, 500)   # cap: limita tokens y la superficie de prompt-injection de input del usuario
        text = f"URL: {url}\n"
        # DECLARADO POR EL USUARIO (item L373): el usuario conoce a su publico/objetivo mejor que la inferencia del sitio ->
        # bloque SEPARADO y de MAXIMA prioridad (manda sobre lo inferido). La audiencia declarada fija audience.who; el objetivo
        # adapta cta/awareness/gancho. Capeados (anti prompt-injection / tokens) como el resto del input del usuario.
        _ah, _gh = _clip(audience_hint, 160), _clip(goal_hint, 40)
        if _ah or _gh:
            text += "AUDIENCIA/OBJETIVO DECLARADOS POR EL USUARIO (MANDAN sobre lo inferido del sitio):\n"
            if _ah:
                text += f"- Publico objetivo: {_ah} -> usalo como audience.who y adapta tono/register/awareness a ese publico.\n"
            if _gh:
                text += f"- Objetivo del reel: {_gh} -> adapta el CTA, el gancho y el awareness a ese objetivo.\n"
        # PISTA SUAVE de HISTORIAL (item L389): que awareness/register/energia/seriedad anduvieron mejor en reels PREVIOS
        # de esta marca que el usuario valoro. Es un DESEMPATE leve -> va DEBAJO de lo declarado (L373) y de la inferencia
        # del sitio. Los valores son enums cerrados + un float (los formateamos nosotros) -> cero superficie de prompt-injection.
        if audience_bias:
            _bl = []
            _ab_aw = (audience_bias.get("awareness") or {}).get("value")
            _ab_reg = (audience_bias.get("register") or {}).get("value")
            _ab_en = (audience_bias.get("energy") or {}).get("value")
            _ab_ser = (audience_bias.get("seriousness") or {}).get("value")
            if _ab_aw:
                _bl.append(f"nivel de conciencia (awareness) '{_ab_aw}'")
            if _ab_reg:
                _bl.append(f"registro/tono '{_ab_reg}'")
            if _ab_en:
                _bl.append(f"energia '{_ab_en}'")
            if isinstance(_ab_ser, (int, float)):
                _bl.append(f"seriedad ~{_ab_ser:.2f}")
            if _bl:
                text += ("PISTA SUAVE (historial, NO obligatoria): en reels previos de esta marca que el usuario valoro "
                         "bien, funcionaron mejor " + ", ".join(_bl) + ". Usala SOLO como leve desempate; si lo declarado "
                         "por el usuario o lo que ves en el sitio sugieren otra cosa, IGNORALA.\n")
        if desarrollo:
            text += f"Notas del usuario (priorizalas): {desarrollo}\n"
        text += ("Contenido capturado de la pagina:\n" + digest + "\n") if digest else (
            "(ADVERTENCIA: la pagina casi NO devolvio texto -> puede no haber cargado (cert/timeout/bloqueo anti-bot). "
            "Basate SOLO en lo que REALMENTE veas en el screenshot. El brand puede salir del nombre del dominio, pero el "
            "RESTO solo de lo visible. NO inventes claims, cifras, features, premios ni bullets que no veas: es preferible "
            "un brief GENERICO y honesto (tagline/claim suaves, stats [], proof \"\") que uno inventado.)\n")
        text += ("Tambien te paso el screenshot (para tono y colores reales).\n" if b64 else "")
        text += "\nDevolve SOLO el JSON del brief, eligiendo lo mejor y mas fiel."
        blocks = []
        if b64:
            blocks.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}})
        blocks.append({"type": "text", "text": text})

        async def _call(max_toks, temp, model=BRIEF_MODEL):
            resp = await _client.messages.create(
                model=model, max_tokens=max_toks, temperature=temp,
                system=_SYS, messages=[{"role": "user", "content": blocks}])
            if usage is not None:
                try:
                    usage.append({"stage": "perceive", "model": model,
                                  "in": resp.usage.input_tokens, "out": resp.usage.output_tokens})
                except Exception:
                    pass
            return "".join(getattr(x, "text", "") for x in resp.content if getattr(x, "type", "") == "text")

        try:
            txt = await _call(750, 0.4)
            parsed = _extract_json(txt)
            # REPAIR: si el JSON no parseo (p.ej. se trunco en 750 tokens), reintenta UNA vez con mas tokens y menos
            # temperatura. Solo cuando falla -> no agrega costo en el caso normal. Antes un near-miss caia a un brief
            # generico SIN señal -> indistinguible de una falla total.
            if not parsed:
                print(f"[perceive] JSON no parseo, reintento. raw[:200]={txt[:200]!r}")
                txt2 = await _call(1200, 0.2)
                parsed = _extract_json(txt2)
                if not parsed:
                    print(f"[perceive] reintento tampoco parseo. raw2[:200]={txt2[:200]!r}")
            brief = parsed or {}
            parse_ok = bool(parsed)
            # ESCALADO POR BAJA CONFIANZA DE INFERENCIA (item L391): si el modelo se declara inseguro (pagina ambigua) y
            # hay screenshot util, re-analiza UNA vez con un modelo mas FINO y se queda con el brief de MAYOR confidence.
            # Distinto de _low_confidence (que mide baja confianza de CAPTURA: botwall/vacio); esto es baja confianza de
            # INFERENCIA (la pagina cargo bien pero es ambigua). Solo con b64 -> el modelo fino aporta sobre todo en la VISION.
            if parse_ok and b64:
                try:
                    conf = float(brief.get("confidence", 1))
                except (TypeError, ValueError):
                    conf = 1.0
                if conf < 0.55:
                    print(f"[perceive] confidence de inferencia baja ({conf:.2f}) -> re-analizo con {FINE_MODEL}")
                    txt3 = await _call(1200, 0.3, model=FINE_MODEL)
                    parsed3 = _extract_json(txt3)
                    if parsed3:
                        try:
                            conf3 = float(parsed3.get("confidence", 0))
                        except (TypeError, ValueError):
                            conf3 = 0.0
                        if conf3 >= conf:   # el re-analisis solo PISA el brief si viene mas seguro (nunca empeora)
                            brief = parsed3
        except Exception as e:
            print(f"[perceive] LLM fallo (sigo con defaults): {e}")
    else:
        print("[perceive] anthropic no disponible -> brief con defaults")

    out = _normalize(brief, url, content)
    out["_parse_ok"] = parse_ok   # señal interna para el caller (decidir si cachear); se saca antes de cachear/enviar
    # CALIDAD de captura: si la pagina vino VACIA o como bot-wall, el brief se baso solo en el screenshot/nombre (baja
    # confianza). El caller NO debe cachearlo (un bloqueo transitorio no debe quedar pegado; un reintento puede capturar bien).
    out["_low_confidence"] = bool(_is_botwall(content) or not (isinstance(content, dict) and (content.get("headings") or content.get("bodyText") or content.get("title"))))
    # fallback de color (en orden de FIDELIDAD): 1) el acento REAL del CTA por computed-style (verdad de la marca),
    # 2) el theme-color declarado, 3) (en main.py) el dominante del screenshot. Solo si el modelo no dio uno usable.
    if out["brandColor"] == "#5b8cff":
        ac = _safe_hex((content or {}).get("accentCss")) if isinstance(content, dict) else None
        if ac:
            out["brandColor"] = ac
    if out["brandColor"] == "#5b8cff":
        tc = _safe_hex((content or {}).get("themeColor")) if isinstance(content, dict) else None
        if tc:
            out["brandColor"] = tc
    # PLAYBOOK del rubro (item L142/L849): cableamos "el foso" de marketing al brief que consume el MOTOR (no solo el
    # prompt del director legacy). Adjuntamos SOLO los campos accionables por el motor determinista: energyHint
    # (alto|medio|bajo -> ritmo de stagger, ventana de transicion y agresividad de apertura) y playbookKey/themeHint
    # (telemetria + uso futuro). Best-effort: un miss NUNCA rompe la perception (el motor los trata como opcionales,
    # ausente = neutro byte-identico). El publico (who) modula el guide del prompt, no los campos del motor.
    # neutros PRIMERO: garantizan que las 3 claves SIEMPRE existan aunque pick() fallara -> nunca se cachea (v9) ni se sirve
    # un brief SIN energyHint (energyHint='medio' -> el motor lo trata como neutro byte-identico). Defensa anti cache-poisoning.
    out["energyHint"], out["playbookKey"], out["themeHint"] = "medio", "generico", ""
    try:
        pb = playbooks.pick(out.get("rubro", ""), (out.get("audience") or {}).get("who", ""))
        out["energyHint"] = pb["energy"]        # 'alto' | 'medio' | 'bajo'
        out["playbookKey"] = pb["key"]          # p.ej. 'saas' | 'generico'  (telemetria + branching futuro)
        out["themeHint"] = pb["theme_hint"]     # nombre de paleta THEME_VIBES o '' (uso futuro: mapa theme->hue en el motor)
    except Exception as e:
        print(f"[perceive] playbook no aplicado (sigo con neutros): {e}")
    return out
