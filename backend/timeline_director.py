"""
timeline_director.py — arma los archivos de render para el MOTOR NUEVO (animaciones por timeline).

Espejo de template_director.build_video_files, pero apunta a la composicion Canvas (TimelineVideo),
que reusa el MISMO nucleo de animacion (engineCore) que el preview en vivo del sidebar.

Por ahora el timeline esta horneado en el nucleo (la demo); cuando la IA lo escriba desde la URL,
se pasa por defaultProps={{ timeline }} y el nucleo lo consume. El render es determinista (sin IA
generativa): el costo es $0; solo paga la futura llamada al LLM que escriba el timeline.
"""
import json
from pathlib import Path

# Root que registra la composicion Canvas. TimelineVideo vive en remotion/src/compositions/.
TIMELINE_ROOT_TEMPLATE = """import { Composition } from 'remotion'
import TimelineVideo from './compositions/TimelineVideo'

const TIMELINE = __TIMELINE_JSON__

export const RemotionRoot = () => (
  <Composition
    id="__COMPID__"
    component={TimelineVideo}
    durationInFrames={__TOTAL__}
    fps={30}
    width={__WIDTH__}
    height={__HEIGHT__}
    defaultProps={{ timeline: TIMELINE }}
  />
)
"""

TIMELINE_ENTRY_TEMPLATE = """import { registerRoot } from 'remotion'
import { RemotionRoot } from './src/__ROOT_FILE__'
registerRoot(RemotionRoot)
"""

FORMATS = {"vertical": (1080, 1920), "square": (1080, 1080), "wide": (1920, 1080)}

# Duracion de la demo horneada (engineCore: ~21.4s a 30fps). Cuando el timeline venga en datos,
# se usa timeline["durationInFrames"].
DEMO_FRAMES = 732


def build_timeline_files(job_id: str, timeline: dict, remotion_dir, fmt: str = "vertical"):
    """Escribe el Root + entry que renderizan el timeline con TimelineVideo.
    Devuelve (entry_file, comp_id, total_frames, temp_files)."""
    remotion_dir = Path(remotion_dir)
    short = job_id[:8]
    comp_id = f"TimelineVideo-{short}"
    scenes = (timeline or {}).get("scenes") or []
    if scenes:
        total = int(sum(max(30, int(s.get("durationInFrames") or 120)) for s in scenes))
    else:
        total = int((timeline or {}).get("durationInFrames") or DEMO_FRAMES)
    w, h = FORMATS.get(fmt, FORMATS["vertical"])
    temp_files = []

    root_src = (TIMELINE_ROOT_TEMPLATE
                .replace("__TIMELINE_JSON__", json.dumps(timeline or {}, ensure_ascii=False))
                .replace("__TOTAL__", str(total))
                .replace("__COMPID__", comp_id)
                .replace("__WIDTH__", str(w))
                .replace("__HEIGHT__", str(h)))
    root_file = f"Root_tl_{short}.jsx"
    (remotion_dir / "src" / root_file).write_text(root_src, encoding="utf-8")
    temp_files.append(remotion_dir / "src" / root_file)

    entry_src = TIMELINE_ENTRY_TEMPLATE.replace("__ROOT_FILE__", root_file)
    entry_file = f"index_tl_{short}.jsx"
    (remotion_dir / entry_file).write_text(entry_src, encoding="utf-8")
    temp_files.append(remotion_dir / entry_file)

    return entry_file, comp_id, total, temp_files


# ══════════════════════════════════════════════════════════════════════════════
# DIRECTOR DE TIMELINE (IA real) — adapta el cerebro de cinematicas al motor Canvas.
# Reusa de template_director: analisis del sitio, brief estrategico, playbooks, rotacion
# (angulo/hook/arco evitando recientes + sesgo por rating), cliente API y medicion de costo.
# Lo NUEVO aca: el catalogo de escenas Canvas (por categoria de uso) y los prompts.
# Salida: un timeline { brand, accent, scenes:[{type, ...props, durationInFrames}] }.
# Una generacion = UN video (sin A/B). Costo: ~1 call Sonnet (director) + 1 Opus (critico).
# ══════════════════════════════════════════════════════════════════════════════
import os as _os
import json as _json
import random as _random
import template_director as _td
import brand_dna as _bdna
import iconify_service
import style_engine as _se

TL_DIRECTOR_MODEL = "claude-sonnet-4-6"
TL_CRITIC_MODEL = _os.getenv("CLIPING_CRITIC_MODEL", "claude-sonnet-4-6")
TL_CRITIC_ENABLED = _os.getenv("CLIPING_CRITIC", "1").strip().lower() not in ("0", "false", "no", "off", "")
try:
    TL_CRITIC_ROUNDS = max(1, int(_os.getenv("CLIPING_CRITIC_ROUNDS", "1")))
except Exception:
    TL_CRITIC_ROUNDS = 1

# Biblioteca de escenas del motor Canvas, SEPARADA POR CATEGORIA DE USO. El director elige
# segun lo que cuente la marca y el arco; cada escena dice para que sirve y sus props.
TL_SCENE_CATALOG = """ESCENAS DISPONIBLES (motor Canvas) — agrupadas por CATEGORIA DE USO:

[APERTURA / HOOK]  (la 1ra escena: corta y filosa, frena el scroll)
- "statement": una frase con gancho. props: text (string, 4-9 palabras, potente).
- "paintTitle": el nombre de la marca "pintado" con 2 subtitulos. props: title (string = marca),
  subtitles (array de exactamente 2 strings cortos). Es un reveal de marca; tambien sirve de cierre visual.

[DATO / PRUEBA]
- "bigStat": un numero que cuenta de 0 al valor (el beat de "dato que impacta"). props: value (numero),
  prefix? ("+","$"), suffix? ("%","k","/5"), label (string corto debajo, que describe el numero).
  USALA SOLO si hay un numero REAL en el contexto del sitio. NUNCA inventes la cifra.

[BENEFICIOS]
- "checklist": lista de 3 o 4 beneficios concretos con tilde. props: title (string), items (array de 3-4
  strings cortos, 1 a 4 palabras c/u). Para "3 razones" / features reales.

[ENFASIS]
- "statement": (ver arriba) tambien sirve en el medio para un remate o giro.

[CIERRE]  (la ULTIMA escena, siempre)
- "outro": marca + llamado a la accion. props: brand (string), cta (string con ACCION concreta,
  ej "Probalo gratis", "Pedi en yerco.ar", "Agenda tu demo").

[ESCENA LIBRE / DIRIGIDA]  (tu lienzo SIN molde: para el HERO/apertura y para cualquier momento que pida movimiento propio)
- "scene": vos COMPONES la escena con objetos animados por keyframes. Aca no hay plantilla: cada marca puede tener un hero unico
  que capte SU alma. props: elements (array de objetos animados).
  Cada element = { kind, ...estilo, keys:[ fotogramas ] }. Los keys van en SEGUNDOS (campo t) y el motor interpola con easing.
  En cada keyframe podes setear: t (seg), opacity (0-1), scale, rot (grados), x, y (pixeles; lienzo 405x720, centro 202,360),
    ctrl:[cx,cy] (hace una CURVA bezier hacia ese punto -> arcos y vuelos), fill (color), ease.
  kinds:
    - "text"  -> props: text, size, weight (700|800), fill, align. (el texto se autoajusta para no cortarse)
    - "morph" -> forma que MUTA: en cada key pone form y r (radio). forms: circle, square, triangle, diamond, pentagon,
       hexagon, star, plus, heart, leaf, drop, flower, shield, blob. El motor funde una silueta en la otra con bordes
       SUAVES y puntos alineados (morph organico, sin facetas ni torsion). fill, stroke y blur:true (estela) opcionales.
       Ideal para un hero: semilla -> hoja -> flower; punto -> estrella; gota -> blob. Elegi formas que digan algo del rubro.
    - "icon"  -> iconos simples hand-coded: icon (box, house, cart, check, star, leaf, dot).
    - "svgicon" -> ICONO de BIBLIOTECA (Iconify, +200k iconos). props: concept = CONCEPTO en INGLES de lo que
       queres mostrar (ej "shopping cart","fresh leaf","shield","rocket","heart","truck","lock","medal","clock").
       El backend lo busca y lo resuelve solo. props: size (px ~56-120), fill ('accent'|'ink'|'dim'|#hex).
       Animalo con keys (opacity/scale/x/y/rot/ease). USALOS para LLENAR la escena y que NO quede vacia:
       1-3 iconos relevantes al rubro, bien ubicados (no encimados, no tapando el texto).
    - "shape" -> token (dot, circle, pill, bar, box, card, line, square) + w/h/r; morphea entre tokens; label opcional.
    - "particles" -> count, spread; con un key burst de 0 a 1 = estallido (chispas / celebracion).
    - "photo" -> FOTO REAL del sitio a sangre (lo que hace que el video NO parezca plantilla: se ve el producto/
       propiedad/local real). props: photoIdx (0 = la mejor/mas grande). Default pantalla completa (o w/h+x/y para
       panel/split). El motor le pone Ken Burns + un scrim oscuro abajo. El TEXTO encima va con fill "photoink"
       (claro) o "photodim" para que se lea sobre la foto. SOLO si hay fotos disponibles (ver abajo).
  colores (tokens): accent (color de marca), accent2, ink (texto claro), dim (texto tenue), dark, o un #rrggbb.
  ease: outCubic, inCubic, inOutCubic, outBack (overshoot), spring, smooth, outQuint.
  EJEMPLO de hero (una semilla crece a hoja y aparece la marca; adaptalo al rubro, NO lo copies tal cual):
  {"type":"scene","durationInFrames":210,"elements":[
    {"kind":"morph","fill":"accent","keys":[{"t":0,"form":"circle","r":6,"opacity":0},{"t":0.5,"form":"circle","r":34,"opacity":1,"ease":"outBack"},{"t":1.8,"form":"leaf","r":86,"ease":"inOutCubic"},{"t":5.5,"form":"leaf","r":86}]},
    {"kind":"text","text":"<marca>","fill":"ink","size":46,"weight":800,"keys":[{"t":2.0,"opacity":0,"y":430,"scale":0.85},{"t":2.6,"opacity":1,"y":408,"scale":1,"ease":"outBack"}]},
    {"kind":"text","text":"<subtitulo de 2-4 palabras>","fill":"dim","size":22,"weight":600,"keys":[{"t":2.8,"opacity":0,"y":470},{"t":3.4,"opacity":1,"y":452,"ease":"outCubic"}]}
  ]}
  REGLAS de 'scene': conta UNA idea visual clara (no amontones objetos sueltos); que el movimiento APOYE el mensaje (no decoracion
  al azar); arranca cada objeto en opacity 0 y hacelo entrar con ease; usa morph y/o curvas para que se sienta vivo; el texto
  SIEMPRE legible. Que el momento capte el ALMA de ESTA pagina (rubro, tono, publico) y sea IRREPETIBLE.

REGLA DE DURACION: el motor anima la escena y CONGELA su frame final para dar tiempo de lectura.
Por eso durationInFrames = animacion + lectura. Valores recomendados (30fps):
paintTitle 200 · statement 110 · checklist 145 (3 items) a 160 (4) · bigStat 90 · scene 144 · outro 112.
APUNTA A UN REEL DE 12-16s EN TOTAL (no mas): mejor corto y punchy que largo con holds muertos."""

TL_DIRECTOR_SYSTEM = (
    "Sos director creativo de videos verticales (reels) de marketing/explainer para marcas. "
    "Disenas un TIMELINE que un motor de animacion (Canvas) renderiza. El video se dibuja a mano "
    "(no son plantillas de texto): es motion-graphics limpio.\n\n"
    + TL_SCENE_CATALOG +
    "\n\nDevolves SOLO un objeto JSON valido (sin markdown, sin texto antes ni despues), con esta forma:\n"
    '{ "brand": "<nombre de marca>", "accent": "<#rrggbb vivo de la marca>", '
    '"scenes": [ { "type": "...", "durationInFrames": 150, ...props } ] }\n\n'
    "REGLAS:\n"
    "- 4 a 5 escenas. ABRI con un HOOK ('statement' o 'paintTitle'), NUNCA con 'checklist' ni 'bigStat'. "
    "CERRA SIEMPRE con 'outro'.\n"
    "- ANTI-FORMULA (critico): no armes siempre el mismo esqueleto. Pensa que combinacion cuenta MEJOR a "
    "ESTA marca puntual. Si dos marcas distintas terminan con la misma estructura, fallaste. 'checklist' y "
    "'bigStat' son OPCIONALES; muchos videos no llevan ninguna.\n"
    "- HONESTIDAD (critico): 'bigStat' muestra un HECHO. El numero TIENE que aparecer textualmente en el "
    "CONTEXTO DEL SITIO que te paso. NO uses datos que 'sabes' de memoria de marcas conocidas. Si no hay un "
    "numero real, NO uses bigStat: conta el beneficio con statement/checklist.\n"
    "- COPY: especifico de ESTA marca y su PUBLICO, no generico. Evita frases vacias ('la mejor calidad', "
    "'tu aliado ideal'). Beneficios concretos y reales, sacados del contexto. Verbos variados. Que suene humano.\n"
    "- Copy CORTO. En 'statement' la frase es de 4 a 9 palabras. En 'checklist' cada item 1 a 4 palabras. "
    "En 'paintTitle' los subtitulos son 2 frases muy cortas.\n"
    "- PUBLICO (clave): infieri del sitio QUIEN compra/usa esto y escribi TODO hablandole a ESE publico, "
    "con su lenguaje y prioridades. Que el video se sienta hecho para la audiencia de ESTA pagina.\n"
    "- accent: un hex VIVO (saturado) acorde a la marca; si te paso uno sugerido, usalo.\n"
    "- LIENZO (clave anti-patron): para la APERTURA/HERO usa el RECURSO PROTAGONISTA segun los assets (ver 'FOTOS REALES'): si hay foto del sitio -> hero FOTOGRAFICO (kind:'photo' a sangre); si NO hay foto -> tipografia de autor (palabra-heroe revelada) o, a veces, un morph/forma. El morph NO es el default universal: que NO aparezca la misma figura geometrica en todos los videos. Varia el recurso entre marcas: si dos marcas terminan con el mismo hero, fallaste. Las escenas enlatadas (statement/checklist/bigStat/paintTitle) siguen disponibles para los beats de apoyo.\n"
    "- El timeline cuenta una micro-historia coherente con el proposito y el arco indicado."
)

TL_CRITIC_SYSTEM = (
    "Sos director creativo SENIOR de una agencia top. Un junior te pasa el TIMELINE (JSON) de un reel hecho con un motor de "
    "animacion Canvas, mas el BRIEF y el contexto del sitio. Tu trabajo: ELEVAR el guion ANTES de renderizar. "
    "Si ya es fuerte, lo dejas casi igual; solo cambias lo que DE VERDAD lo mejora. Exigente, especifico y quirurgico, nunca generico.\n\n"
    "Revisa en este orden:\n"
    "1. PEDIDO/OBJETIVO (manda): que cumpla lo que pidio el usuario y el objetivo del brief.\n"
    "2. HOOK (1ra escena, statement o paintTitle): tiene que frenar el scroll en 1-3s. Un hook fuerte dice algo concreto, contraintuitivo o que toca un dolor real del publico; uno debil es una descripcion neutra ('Bienvenido a X', 'Productos de calidad'). Si es debil, reescribilo apuntando al dolor o deseo concreto del publico del brief.\n"
    "3. COPY GENERICO (matalo): toda frase vacia ('calidad', 'lo mejor', 'tu aliado', 'soluciones a medida') -> beneficio concreto y especifico de ESTA marca, sacado del contexto. Verbos variados, tono humano. Si una linea podria estar en el reel de cualquier competidor, no sirve.\n"
    "4. ANTI-FORMULA: si la estructura es un molde repetido, rompela. checklist/bigStat son opcionales.\n"
    "5. HONESTIDAD (critico): el numero de un 'bigStat' TIENE que estar TEXTUAL en el contexto del sitio. Si no esta, sacalo o pasalo a 'statement'. NUNCA inventes cifras.\n"
    "6. PUBLICO + IDIOMA: copy al publico correcto, en el MISMO idioma del guion.\n\n"
    "FORMA (no la rompas): 4-5 escenas; abri con un HOOK; cerra con outro. Tipos validos: "
    "statement, paintTitle, checklist, bigStat, outro, scene. Si una escena es 'scene' (motion propio con elements/keys), "
    "NO la reestructures ni le toques los keys: respetala tal cual; como mucho afina el copy de sus elements 'text' si es generico. "
    "statement.text 4-9 palabras; checklist.items 3-4 strings cortos; "
    "paintTitle.subtitles = 2 strings; bigStat.value numero real. durationInFrames: paintTitle 200, statement 110, "
    "checklist 145-160, bigStat 90, scene 144, outro 112 (REEL de 12-16s total, no mas). ANTES DE RESPONDER relee cada linea de copy del spec: si alguna es generica o no se siente de ESTA marca puntual, reescribila.\n\n"
    "SALIDA: SOLO un JSON valido (sin markdown), con esta forma EXACTA:\n"
    '{"verdict":"ok"|"revisado","notas":"<1-2 frases concretas: que cambiaste y por que>","spec":{"brand":"<marca>","accent":"<#rrggbb>","scenes":[ ... ]}}\n'
    "Si ya esta bien, verdict='ok' y devolve el spec TAL CUAL. El campo 'spec' SIEMPRE va completo."
)

_TL_VALID_TYPES = {"paintTitle", "statement", "checklist", "outro", "bigStat", "deliver", "scene"}
_TL_DEFAULT_DUR = {"paintTitle": 234, "statement": 150, "checklist": 192, "outro": 150, "bigStat": 150, "deliver": 204, "scene": 210}


_SCENE_KINDS = {"text", "icon", "shape", "morph", "particles", "svgicon", "orbit", "photo"}
_SCENE_FORMS = {"circle", "ring", "square", "diamond", "triangle", "pentagon", "hexagon", "star", "plus", "heart", "leaf", "drop", "flower", "shield", "blob"}
_SCENE_ICONS = {"box", "house", "cart", "check", "star", "leaf", "dot"}
_SCENE_SHAPE_TOK = {"dot", "circle", "pill", "bar", "box", "card", "line", "square"}
_SCENE_EASES = {"linear", "outCubic", "inCubic", "inOutCubic", "outBack", "outElastic", "spring", "smooth", "outQuint", "inOutQuint"}


def _norm_scene_elements(s: dict, dur_frames: int) -> list:
    """Blinda una escena 'scene' (dirigida): coacciona kinds/keys/canales a valores seguros, descarta
    lo invalido y clampa los tiempos. Asi cualquier cosa que invente la IA (o el critico) renderiza sin romper."""
    dur_s = max(1.0, dur_frames / 30.0)
    out = []
    for el in (s.get("elements") or [])[:8]:
        if not isinstance(el, dict):
            continue
        kind = el.get("kind")
        if kind not in _SCENE_KINDS or not isinstance(el.get("keys"), list) or not el["keys"]:
            continue
        keys = []
        for k in el["keys"][:14]:
            if not isinstance(k, dict):
                continue
            try:
                tk = max(0.0, min(dur_s, float(k.get("t", 0))))
            except Exception:
                continue
            nk = {"t": round(tk, 3)}
            for ch in ("opacity", "scale", "rot", "x", "y", "size", "w", "h", "r", "burst", "labelOpacity"):
                if ch in k:
                    try:
                        nk[ch] = float(k[ch])
                    except Exception:
                        pass
            c = k.get("ctrl")
            if isinstance(c, list) and len(c) == 2:
                try:
                    nk["ctrl"] = [float(c[0]), float(c[1])]
                except Exception:
                    pass
            if isinstance(k.get("ease"), str) and k["ease"] in _SCENE_EASES:
                nk["ease"] = k["ease"]
            if isinstance(k.get("fill"), str):
                nk["fill"] = k["fill"]
            if kind == "morph" and isinstance(k.get("form"), str) and k["form"] in _SCENE_FORMS:
                nk["form"] = k["form"]
            if kind == "shape" and isinstance(k.get("shape"), str) and k["shape"] in _SCENE_SHAPE_TOK:
                nk["shape"] = k["shape"]
            keys.append(nk)
        if not keys:
            continue
        if kind == "morph" and not any("form" in k for k in keys):
            continue
        nel = {"kind": kind, "keys": keys}
        if kind == "text":
            txt = str(el.get("text") or "").strip()
            if not txt:
                continue
            nel["text"] = txt
            if isinstance(el.get("fill"), str):
                nel["fill"] = el["fill"]
            if el.get("align") in ("left", "center", "right"):
                nel["align"] = el["align"]
            for f in ("size", "weight", "maxW"):
                if f in el:
                    try:
                        nel[f] = (int(el[f]) if f == "weight" else float(el[f]))
                    except Exception:
                        pass
            if el.get("kinetic"):
                nel["kinetic"] = True
        elif kind == "icon":
            ic = el.get("icon")
            nel["icon"] = ic if (isinstance(ic, str) and ic in _SCENE_ICONS) else "dot"
            if el.get("blur"):
                nel["blur"] = True
        elif kind == "svgicon":
            cpt = el.get("concept")
            if isinstance(cpt, str) and cpt.strip():
                nel["concept"] = cpt.strip()[:60]
            ic = el.get("icon")
            if isinstance(ic, str) and ic in _SCENE_ICONS:
                nel["icon"] = ic
            if isinstance(el.get("fill"), str):
                nel["fill"] = el["fill"]
            if "size" in el:
                try:
                    nel["size"] = float(el["size"])
                except Exception:
                    pass
            if not nel.get("concept") and not nel.get("icon"):
                continue
        elif kind == "shape":
            if isinstance(el.get("fill"), str):
                nel["fill"] = el["fill"]
            if el.get("glow") is False:
                nel["glow"] = False
            if el.get("label"):
                nel["label"] = str(el["label"])
                if isinstance(el.get("labelFill"), str):
                    nel["labelFill"] = el["labelFill"]
        elif kind == "morph":
            if isinstance(el.get("fill"), str):
                nel["fill"] = el["fill"]
            if isinstance(el.get("stroke"), str):
                nel["stroke"] = el["stroke"]
                if "strokeW" in el:
                    try:
                        nel["strokeW"] = float(el["strokeW"])
                    except Exception:
                        pass
            if el.get("glow") is False:
                nel["glow"] = False
            if el.get("blur"):
                nel["blur"] = True
        elif kind == "particles":
            for f in ("count", "spread", "dotR", "phase"):
                if f in el:
                    try:
                        nel[f] = float(el[f])
                    except Exception:
                        pass
        elif kind == "orbit":
            if isinstance(el.get("fill"), str):
                nel["fill"] = el["fill"]
            for f in ("count", "r", "speed", "phase", "dotR", "ry"):
                if f in el:
                    try:
                        nel[f] = float(el[f])
                    except Exception:
                        pass
        elif kind == "photo":
            try:
                nel["photoIdx"] = max(0, int(el.get("photoIdx", 0)))
            except Exception:
                nel["photoIdx"] = 0
            for f in ("w", "h"):
                if f in el:
                    try:
                        nel[f] = float(el[f])
                    except Exception:
                        pass
            if el.get("scrim") is False:
                nel["scrim"] = False
            if el.get("accentEdge") is False:
                nel["accentEdge"] = False
        out.append(nel)
    return out


def _normalize_timeline(tl: dict, dna: dict = None) -> dict:
    """Red de seguridad: deja solo tipos validos, props sanas y duraciones con tiempo de lectura."""
    if not isinstance(tl, dict):
        tl = {}
    out_scenes = []
    for s in (tl.get("scenes") or []):
        if not isinstance(s, dict):
            continue
        ty = s.get("type")
        if ty not in _TL_VALID_TYPES:
            continue
        s = dict(s)
        try:
            d = int(s.get("durationInFrames") or 0)
        except Exception:
            d = 0
        if d < 60 or d > 360:
            d = _TL_DEFAULT_DUR.get(ty, 150)
        s["durationInFrames"] = d
        if ty == "checklist":
            s["items"] = [str(x) for x in (s.get("items") or []) if str(x).strip()][:4]
            if len(s["items"]) < 2:
                continue
            s["title"] = str(s.get("title") or "")
        if ty == "paintTitle":
            s["title"] = str(s.get("title") or tl.get("brand") or "")
            s["subtitles"] = [str(x) for x in (s.get("subtitles") or [])][:2]
        if ty == "statement":
            s["text"] = str(s.get("text") or "")
            if not s["text"].strip():
                continue
        if ty == "bigStat":
            if s.get("value") in (None, "") or not str(s.get("value")).strip():
                continue
        if ty == "outro":
            s["brand"] = str(s.get("brand") or tl.get("brand") or "")
            s["cta"] = str(s.get("cta") or "Conoce mas")
        if ty == "scene":
            els = _norm_scene_elements(s, d)
            if not els:
                continue
            s["elements"] = els
        out_scenes.append(s)
    # cerrar SIEMPRE con outro
    if not out_scenes or out_scenes[-1].get("type") != "outro":
        out_scenes.append({"type": "outro", "brand": tl.get("brand") or "", "cta": "Conoce mas", "durationInFrames": 150})
    tl["scenes"] = out_scenes[:6]
    # acento: ADN visual (real) > el que eligio la IA > default del motor
    acc = (dna or {}).get("accent") or tl.get("accent") or ""
    if _bdna._hex_ok(acc):
        tl["accent"] = acc
    elif not _bdna._hex_ok(str(tl.get("accent") or "")):
        tl.pop("accent", None)
    # tema visual (del ADN) -> el motor elige la paleta de fondo acorde al rubro
    th = (dna or {}).get("theme")
    if isinstance(th, str) and th.strip():
        tl["theme"] = th.strip()
    tl.setdefault("brand", "")
    return tl


def _fallback_timeline(url_data: dict, dna: dict = None) -> dict:
    brand = (url_data or {}).get("siteName") or "Tu marca"
    tl = {"brand": brand, "scenes": [
        {"type": "paintTitle", "title": brand, "subtitles": [], "durationInFrames": 234},
        {"type": "statement", "text": "Descubri lo que podemos hacer por vos", "durationInFrames": 150},
        {"type": "outro", "brand": brand, "cta": "Conoce mas", "durationInFrames": 150},
    ]}
    acc = (dna or {}).get("accent") or ""
    if _bdna._hex_ok(acc):
        tl["accent"] = acc
    return tl


async def _critique_timeline(tl, *, brief_txt="", contexto="", desarrollo="", proposito="marketing", round_i=1, usage=None):
    """Fase 2 para timelines: un director SENIOR (Sonnet por default) revisa y mejora. Misma red que cinematicas."""
    if not TL_CRITIC_ENABLED or not isinstance(tl, dict) or not tl.get("scenes"):
        return tl
    payload = {
        "objetivo": proposito, "pedido_usuario": (desarrollo or "")[:500],
        "brief": (brief_txt or "")[:1500], "contexto_sitio": (contexto or "")[:2000],
        "timeline": {"brand": tl.get("brand"), "accent": tl.get("accent"), "scenes": tl.get("scenes")},
    }
    try:
        resp = await _td._client.messages.create(
            model=TL_CRITIC_MODEL, max_tokens=4000,
            system=_td._sys_cached(TL_CRITIC_SYSTEM),
            messages=[{"role": "user", "content": _json.dumps(payload, ensure_ascii=False)}],
        )
        _td._acc_usage(usage, "tl_critic", TL_CRITIC_MODEL, resp)
        parsed = _td._parse_critic((resp.content[0].text or "").strip())
        if not parsed:
            print(f"[tl-critic] r{round_i}: no parseo -> mantengo el guion del director")
            return tl
        verdict, notas, improved = parsed
        print(f"[tl-critic] r{round_i} {verdict} ({TL_CRITIC_MODEL}): {(notas or '')[:160]}")
        if str(verdict).lower().startswith("ok"):
            return tl   # ya estaba bien -> corta el loop
        if isinstance(improved, dict) and improved.get("scenes"):
            return improved
        return tl
    except Exception as e:
        print(f"[tl-critic] r{round_i} fallo ({e}) -> mantengo el guion del director")
        return tl


async def _resolve_one_timeline_icon(concept):
    """Resuelve un concepto (en ingles) a {body,width,height} de Iconify, o None."""
    try:
        hits = await iconify_service.search_objects(concept.strip(), limit=1)
        return await iconify_service.get_icon_body(hits[0]["id"]) if hits else None
    except Exception as ie:
        print(f"[tl-director] icono '{concept}' no resuelto: {ie}")
        return None


async def _resolve_timeline_icons(tl):
    """Resuelve los elementos svgicon (concept) a SVG de Iconify, en paralelo. Si uno no se
    resuelve, queda sin svg -> el motor dibuja un punto chico (nunca rompe la escena)."""
    import asyncio
    jobs = []
    for sc in tl.get("scenes", []):
        if not isinstance(sc, dict):
            continue
        for el in (sc.get("elements") or []):
            if isinstance(el, dict) and el.get("kind") == "svgicon" and isinstance(el.get("concept"), str) and el["concept"].strip():
                jobs.append(el)
    if not jobs:
        return tl
    results = await asyncio.gather(*[_resolve_one_timeline_icon(el["concept"]) for el in jobs])
    n_ok = 0
    for el, body in zip(jobs, results):
        if body:
            el["svg"] = {"body": body["body"], "width": body["width"], "height": body["height"]}
            n_ok += 1
    print(f"[tl-director] iconos Iconify resueltos: {n_ok}/{len(jobs)}")
    return tl


async def write_timeline(url, desarrollo, proposito="marketing", idioma="",
                         recent_profile=None, rating_bias=None, prefetched_site=None,
                         dna=None, cached_brand=None, usage=None, brand_sink=None):
    """URL + desarrollo -> timeline. Reusa analisis + rotacion + brief de cinematicas; director Canvas + critico."""
    url_data = await _td.analyze_site_rich(url, prefetched=prefetched_site)
    rp = recent_profile or {}
    rb = rating_bias or {}

    angle = _td._pick_smart(_td.CREATIVE_ANGLES, rp.get("angles"), net=rb.get("angles"))
    mood = _random.choice(_td.MOODS)
    hook = _td._pick_smart(_td.HOOK_ARCHETYPES, rp.get("hooks"), net=rb.get("hooks"), key="name")
    _arc_pool = _td.PURPOSE_ARCS.get((proposito or "").lower(), _td.PURPOSE_ARCS["marketing"])
    arc_name = _td._pick_smart(_arc_pool, rp.get("arcs"), net=rb.get("arcs"))
    arc_guide = _td.NARRATIVE_ARCS.get(arc_name, "")

    # Brief estrategico (reusa el de cinematicas): industria/publico/concepto/momento heroe + playbook.
    brief_txt, _brand_block = await _td._build_brief(url_data, desarrollo, proposito, usage=usage, cached_brand=cached_brand)
    if brand_sink is not None:
        brand_sink.append(_brand_block)
    industria = _td._brief_field(brief_txt, "INDUSTRIA")
    publico = _td._brief_field(brief_txt, "PUBLICO") or _td._brief_field(brief_txt, "PÚBLICO")
    pb = _td.playbooks.pick(industria, publico)
    concepto = _td._brief_field(brief_txt, "CONCEPTO")
    heroe = _td._brief_field(brief_txt, "MOMENTO HEROE") or _td._brief_field(brief_txt, "MOMENTO HÉROE")

    # POC 3 — direccion generativa: preset de estilo DETERMINISTA por rubro+marca. Acota el vocabulario
    # (paleta/formas/ritmo) y mete un String-Seed para que dos marcas NO salgan iguales. No usa IA.
    _energy = (dna or {}).get("energy", "medio") if isinstance(dna, dict) else "medio"
    _style_seed_int = _se.stable_seed(url_data.get("siteName") or url, url)
    _preset = _se.preset(industria, publico, _energy, _style_seed_int)
    _style_block = _se.prompt_block(_preset)
    print(f"[tl-style] rubro={_preset['rubro']} theme={_preset['theme']} accent={_preset['accent']} "
          f"seed={_preset['seed']} formas={_preset['morphs']}")

    contexto = url_data.get("context") or f"Marca: {url_data.get('siteName') or 'desconocido'}"
    # IDIOMA del ANUNCIO: lo elige el USUARIO (solo es/en). DEFAULT = español SIEMPRE, sin importar el idioma
    # de la pagina (ej: una web en ingles -> el anuncio igual sale en español salvo que el usuario pida 'en').
    _LANG_NAME = {"es": "español rioplatense (voseo)", "en": "inglés (English)"}
    _lang_sel = idioma if idioma in _LANG_NAME else "es"
    lang_hint = (f"\nIDIOMA OBLIGATORIO: escribí ABSOLUTAMENTE TODO el copy en {_LANG_NAME[_lang_sel]} "
                 f"(titulares, frases, items, CTA). NO mezcles idiomas ni copies texto del sitio en otro idioma; "
                 f"si el sitio esta en otro idioma, TRADUCI las ideas al idioma pedido.")
    accent = (dna or {}).get("accent") or ""
    accent_hint = (f"\nACENTO sugerido (color real de la marca): {accent}"
                   if _bdna._hex_ok(accent) else "\nACENTO: elegí un hex VIVO acorde a la marca (saturado, no gris).")
    # RECURSO PROTAGONISTA del hero: si hay fotos reales -> hero FOTOGRAFICO (no morph). Si no -> tipografia/morph.
    # Esto mata el "misma figura geometrica en todos los videos": el morph deja de ser el default universal.
    _n_imgs = len((dna.get("images") if isinstance(dna, dict) else None) or [])
    if _n_imgs:
        photo_hint = (f"\nFOTOS REALES: hay {_n_imgs} foto(s) del sitio (kind:'photo', photoIdx 0..{_n_imgs - 1}; 0 = la mejor). "
                      f"EL HERO/APERTURA DEBE SER UNA FOTO a pantalla completa (kind:'photo') con el titular encima en fill "
                      f"'photoink' — NO uses morph ni figura geometrica para el hero cuando hay foto (es lo que hace que "
                      f"parezca un anuncio real). Podes reusar fotos en otras escenas (foto+panel, dato sobre foto).")
    else:
        photo_hint = ("\nSIN FOTOS del sitio: el hero va con TIPOGRAFIA de autor (palabra-heroe revelada) o, con moderacion, "
                      "UN morph/forma. NO pongas figura geometrica en TODAS las escenas; varia el recurso protagonista.")
    extra = (f'\n\n>>> PEDIDO DEL USUARIO (PRIORIDAD ABSOLUTA, el video DEBE cumplirlo): "{desarrollo.strip()}"'
             if (desarrollo or "").strip() else "")

    user_prompt = f"""PROPÓSITO: {proposito}
URL: {url}

CONTEXTO DEL SITIO (usalo para copy específico y real, no genérico):
{contexto}{extra}{lang_hint}{accent_hint}{photo_hint}

BRIEF ESTRATÉGICO (la lectura de la marca, basate en esto):
{brief_txt}

{pb['guide']}
{('CONCEPTO (que todo gire alrededor): ' + concepto) if concepto else ''}
{('MOMENTO HÉROE (dale la escena más fuerte): ' + heroe) if heroe else ''}

{_style_block}

DIRECCIÓN DE ESTE VIDEO (hacelo único, no formulaico):
- Ángulo narrativo: {angle}
- Mood: {mood}
- ARCO (seguilo adaptándolo a ESTA marca, no lo recites literal): {arc_guide}

EL HOOK MANDA (primeros 1-3s = la señal #1 del algoritmo): la PRIMERA escena usa este patrón,
adaptado a la marca y su público:
>> {hook['guide']} (ejemplo de FORMA, no de contenido: "{hook['ex']}")
Abrí con 'statement' o 'paintTitle' (cortos y filosos). NUNCA arranques con 'checklist'.

OBJETIVO ({proposito}): {_td.PURPOSE_GUIDE.get((proposito or '').lower(), _td.PURPOSE_GUIDE['marketing'])}

Generá el timeline JSON (brand, accent, scenes). 4-5 escenas, cerrá con 'outro'. El copy tiene que
sonar a ESTA marca puntual y su público (usá el brief y el contexto). Si NO hay un número real en el
contexto, NO uses bigStat. Si hay un PEDIDO DEL USUARIO, cumplilo SÍ O SÍ por encima de todo."""

    try:
        resp = await _td._client.messages.create(
            model=TL_DIRECTOR_MODEL, max_tokens=4000, temperature=0.9,
            system=_td._sys_cached(TL_DIRECTOR_SYSTEM),
            messages=[{"role": "user", "content": user_prompt}],
        )
        _td._acc_usage(usage, "tl_director", TL_DIRECTOR_MODEL, resp)
        if getattr(resp, "stop_reason", None) == "max_tokens":
            print(f"[tl-director] OJO: respuesta CORTADA por max_tokens ({len(resp.content[0].text or '')} chars) -> el JSON puede no cerrar")
        tl = _td._parse_spec(resp.content[0].text.strip())
        if tl is None:
            print("[tl-director] r1 no parseo -> reintento")
            resp2 = await _td._client.messages.create(
                model=TL_DIRECTOR_MODEL, max_tokens=4000, temperature=0.5,
                system=_td._sys_cached(TL_DIRECTOR_SYSTEM),
                messages=[{"role": "user", "content": user_prompt + "\n\nIMPORTANTE: respondé SOLO el JSON del timeline, sin texto antes ni después."}],
            )
            _td._acc_usage(usage, "tl_director_retry", TL_DIRECTOR_MODEL, resp2)
            tl = _td._parse_spec(resp2.content[0].text.strip())
        _types_raw = [sc.get("type") for sc in (tl.get("scenes") or [])] if isinstance(tl, dict) else "None(parse fallo)"
        tl = _normalize_timeline(tl, dna)
        print(f"[tl-director] director={_types_raw} -> normalizado={[sc.get('type') for sc in tl.get('scenes', [])]}")
        for _r in range(TL_CRITIC_ROUNDS):
            improved = await _critique_timeline(tl, brief_txt=brief_txt, contexto=contexto,
                                                desarrollo=desarrollo, proposito=proposito,
                                                round_i=_r + 1, usage=usage)
            if improved is tl:
                break
            tl = _normalize_timeline(improved, dna)
        if not tl.get("scenes"):
            tl = _fallback_timeline(url_data, dna)
    except Exception as e:
        print(f"[tl-director] fallback ({e})")
        tl = _fallback_timeline(url_data, dna)

    # POC 3 / unicidad: marcar las escenas enlatadas con el ESTILO por rubro (listStyle/ctaStyle) para que
    # checklist y outro NO se vean iguales entre marcas (el motor los lee; si faltan, usa defaults).
    for _sc in tl.get("scenes", []):
        if isinstance(_sc, dict):
            if _sc.get("type") == "checklist":
                _sc.setdefault("listStyle", _preset.get("list_style", "check"))
            elif _sc.get("type") == "outro":
                _sc.setdefault("ctaStyle", _preset.get("cta_style", "pill"))
            elif _sc.get("type") == "statement":
                _sc.setdefault("stmtStyle", _preset.get("stmt_style", "centered"))

    # POC 3: fijar la SEMILLA del fondo (el fondo fluido varia por marca) y completar tema/acento
    # desde el preset si el ADN no los dio. El motor (engineCore._seedFor) usa tl["seed"].
    tl["seed"] = _preset["seed"]
    tl.setdefault("texture", _preset.get("bg_texture", "none"))   # identidad del fondo por rubro
    tl.setdefault("motif", _preset.get("rubro", ""))              # fondo CONTEXTUAL por rubro (skyline / sparkline / vapor / pulso / botanico)
    tl.setdefault("bgEnergy", _preset.get("bg_energy", 1.0))      # energia/velocidad del fondo por rubro
    # LOGO real (si el capture del sitio lo extrajo): el renderer lo precarga y el motor lo dibuja en el cierre;
    # si no hay, el motor cae al monograma. Se pasa la URL aca (el server debe propagar capture.logo a dna/_preset).
    _logo = (dna.get("logo") if isinstance(dna, dict) else "") or _preset.get("logo", "")
    if _logo:
        tl.setdefault("logo", _logo)
    # FOTOS REALES del sitio (hasta 6) -> el motor las usa en heros/escenas fotograficas (kind:'photo').
    _imgs = (dna.get("images") if isinstance(dna, dict) else None) or _preset.get("images") or []
    if _imgs and not tl.get("images"):
        tl["images"] = _imgs[:6]
    # ESTILO VISUAL: lo ELIGE el usuario (dna['styleId']) o se recomienda por rubro. Aplica la direccion de
    # arte del catalogo compartido (bgStyle / tono / sombra / textura) -> el video toma el estilo elegido.
    try:
        import style_catalog as _sc
        import random as _rnd
        _rub = _preset.get("rubro", "default")
        _sr = _rnd.Random((int(_preset.get("seed", 0)) ^ 0x5715) & 0xFFFFFFFF)
        _sid = (dna.get("styleId") if isinstance(dna, dict) else None) or _sc.recommend_style(_rub, _sr)
        if _sid in _sc.STYLE_PRESETS:
            _ston = "light" if _sr.random() < _sc.STYLE_PRESETS[_sid]["light_p"] else "dark"
            for _k, _v in _sc.style_fields(_sid, _ston).items():
                tl[_k] = _v   # el estilo manda sobre los defaults de fondo/tono/textura
    except Exception as _e:
        print(f"[tl-director] estilo no aplicado ({_e})")
    if not tl.get("theme"):
        tl["theme"] = _preset["theme"]
    if not _bdna._hex_ok(str(tl.get("accent") or "")):
        tl["accent"] = _preset["accent"]

    # Anotar dimensiones de receta para la rotacion/rating (las lee _push_recent_profile en main.py).
    tl["angle"] = angle
    tl["hookName"] = hook["name"]
    tl["arcName"] = arc_name
    tl = await _resolve_timeline_icons(tl)
    return tl
