"""
vision_critic.py — Crítico de animaciones CON VISIÓN.

Toma el MP4 ya renderizado + el timeline, extrae fotogramas representativos, los arma en
"contact sheets" y se los manda a Sonnet 4.6 (configurable) con un prompt anti-genérico para que
devuelva un análisis profundo de marketing + diseño: qué vio, qué falla y el fix concreto por
escena. NO es un loop: una crítica por video (la prueba de 5 corre esto una vez por video).

El render lo hace Remotion (PC de Jero); acá sólo leemos el MP4 ya hecho.
Requiere imageio-ffmpeg (trae su propio binario de ffmpeg) y Pillow.
"""
import os, io, json, base64, subprocess, re
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

# Sonnet por default (barato y, con este prompt, nada genérico). Opus con CLIPING_VISION_MODEL.
VISION_MODEL = os.getenv("CLIPING_VISION_MODEL", "claude-sonnet-4-6")

FPS = 30
LONG_EDGE_MAX = 1400              # techo del lado largo de cada sheet (controla tokens de imagen)
MOTION_TYPES = {"paintTitle", "bigStat"}   # escenas con más movimiento -> grilla de secuencia


# ---------- extracción de fotogramas (ffmpeg) ----------
def _ffmpeg_frame(mp4_path, t_seconds):
    """Extrae 1 frame al tiempo t (segundos) del MP4 como PIL.Image RGB. None si falla."""
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [exe, "-nostdin", "-loglevel", "error", "-ss", f"{max(0.0, t_seconds):.3f}",
           "-i", mp4_path, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]
    try:
        out = subprocess.run(cmd, capture_output=True, timeout=30).stdout
        return Image.open(io.BytesIO(out)).convert("RGB") if out else None
    except Exception:
        return None


def _scene_spans(timeline, fps=FPS):
    """[(idx, type, start_frame, dur_frames)] a partir de durationInFrames de cada escena."""
    spans, acc = [], 0
    for i, s in enumerate((timeline or {}).get("scenes", []) or []):
        dur = int(s.get("durationInFrames", 90) or 90)
        spans.append((i, s.get("type", "?"), acc, dur))
        acc += dur
    return spans


# ---------- armado de las hojas (PIL) ----------
def _font(size):
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except Exception:
        return ImageFont.load_default()


def _label(img, text):
    """Barra negra con el texto arriba del frame (para que la IA ubique cada escena/paso)."""
    d = ImageDraw.Draw(img)
    bar = max(18, img.height // 13)
    d.rectangle([0, 0, img.width, bar], fill=(0, 0, 0))
    d.text((5, max(1, (bar - max(12, img.width // 17)) // 2)), text, fill=(255, 255, 255),
           font=_font(max(12, img.width // 17)))
    return img


def _grid(images, cols, pad=6, bg=(238, 238, 238)):
    """Tila imágenes del mismo tamaño en una grilla de N columnas, con separación."""
    if not images:
        return None
    w, h = images[0].size
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w + pad * (cols + 1), rows * h + pad * (rows + 1)), bg)
    for i, im in enumerate(images):
        x = pad + (i % cols) * (w + pad)
        y = pad + (i // cols) * (h + pad)
        sheet.paste(im, (x, y))
    return sheet


def _fit_long_edge(img, mx=LONG_EDGE_MAX):
    if img is None:
        return None
    le = max(img.size)
    if le <= mx:
        return img
    r = mx / le
    return img.resize((max(1, int(img.width * r)), max(1, int(img.height * r))))


def _b64_png(img):
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def build_frames(mp4_path, timeline, fps=FPS):
    """Devuelve (blocks, meta). blocks = bloques de imagen/texto para la API; meta describe qué se
    mandó (para el log). Sheet A: un frame 'asentado' por escena (lectura/composición). Sheet B:
    secuencia de 6 frames de hasta 2 escenas con movimiento (para juzgar la animación)."""
    spans = _scene_spans(timeline, fps)
    if not spans:
        return [], {"images": []}

    # Sheet A — un frame al 72% de cada escena (animación ya asentada = el frame "de lectura").
    cellW, a_cells = 260, []
    for idx, typ, start, dur in spans:
        fr = _ffmpeg_frame(mp4_path, (start + dur * 0.72) / fps)
        if fr is None:
            continue
        fr = fr.resize((cellW, max(1, int(cellW * fr.height / fr.width))))
        _label(fr, f"E{idx + 1} {typ}")
        a_cells.append(fr)
    sheetA = _fit_long_edge(_grid(a_cells, 3))

    # Sheet B — secuencia de movimiento de hasta 2 escenas (las animadas, o la más larga si no hay).
    motion = [s for s in spans if s[1] in MOTION_TYPES][:2] or sorted(spans, key=lambda s: -s[3])[:1]
    sheetsB = []
    for idx, typ, start, dur in motion:
        seqW, seq = 168, []
        for k in range(6):
            fr = _ffmpeg_frame(mp4_path, (start + dur * (0.05 + 0.9 * k / 5)) / fps)
            if fr is None:
                continue
            fr = fr.resize((seqW, max(1, int(seqW * fr.height / fr.width))))
            _label(fr, f"{k + 1}")
            seq.append(fr)
        sh = _fit_long_edge(_grid(seq, 6))
        if sh is not None:
            sheetsB.append((f"E{idx + 1} {typ} — secuencia de movimiento (izquierda a derecha en el tiempo):", sh))

    blocks, meta = [], []
    if sheetA is not None:
        blocks += [{"type": "text", "text": "COMPOSICIÓN — un fotograma asentado por escena (etiquetado E#):"},
                   {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": _b64_png(sheetA)}}]
        meta.append(f"composición ({len(a_cells)} escenas)")
    for cap, sh in sheetsB:
        blocks += [{"type": "text", "text": cap},
                   {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": _b64_png(sh)}}]
        meta.append(cap.split(" —")[0])
    return blocks, {"images": meta}


# ---------- el prompt (lo que hace que NO sea genérico) ----------
VISION_CRITIC_SYSTEM = """Sos director de arte y estratega de motion-graphics para marcas. Te paso fotogramas de un video de marketing vertical (9:16) hecho con un motor de animación propio, más el brief de la marca y el plan de escenas. Tu trabajo: una crítica PROFESIONAL, específica y accionable — del nivel de un director de arte senior de agencia, no un comentario de redes.

QUÉ MIRÁS (rúbrica — puntuás cada eje 0-10):
- composicion: encuadre, márgenes, equilibrio, uso del espacio, foco visual.
- color: paleta, contraste texto/fondo, legibilidad, coherencia con la marca.
- tipografia: tamaño, jerarquía, tracking, cortes de línea, legibilidad en pantalla chica.
- jerarquia: qué se lee primero, si el mensaje principal domina, ruido visual.
- ritmo: timing de cada escena, tiempo de lectura, pacing del conjunto.
- movimiento: calidad de la animación (easing, fluidez, intención) según las secuencias.
- marca: si transmite la identidad/tono del brief (que se sienta de ESTA marca, no de cualquiera).
- mensaje: si el copy comunica claro al público y empuja al objetivo del brief.

REGLAS DE ESPECIFICIDAD (no negociables):
1. CADA crítica cita la EVIDENCIA del frame: qué viste y dónde ("en E3 el título queda a ~6px del borde superior y se corta la última palabra"; "en la secuencia de E1, entre los frames 2 y 3 hay un salto, no hay easing de entrada"). Sin evidencia visual concreta, no es una crítica válida.
2. CADA problema termina en un FIX CONCRETO Y ACCIONABLE: qué cambiar y a qué valor aproximado ("subir el margen superior de ~20px a ~64px"; "bajar la opacidad del subtítulo a ~60%"; "el conteo del número tiene que arrancar 8 frames antes y frenar con ease-out"). Nada de "mejorar X" sin decir CÓMO.
3. PROHIBIDO el lenguaje genérico de relleno: "más dinámico", "más moderno", "mejorar la paleta", "darle más vida", "más profesional", "se puede mejorar", "podría ser mejor". Si lo vas a decir, atalo a una observación concreta + un número. Si no podés, no lo digas.
4. PRIORIZÁ: ordená los problemas por impacto (lo que más arruina el video primero).
5. SÉ HONESTO con lo que el MOTOR no puede hacer hoy: si el problema es que falta un tipo de movimiento o de escena que el sistema no tiene (no es una perilla a ajustar), va en su propia sección, no mezclado con los fixes.

ESTILO: rioplatense (voseo), directo, técnico, sin adulación. Detallado pero sin paja.

EJEMPLO de crítica MALA (genérica — NO hagas esto):
"La escena del título podría ser más dinámica y la paleta más moderna. El ritmo está bien pero se puede mejorar. En general se ve profesional pero le falta vida."
EJEMPLO de crítica BUENA (específica — hacé esto):
"E1 (paintTitle): el título entra bien, pero el goteo de la barra (frames 3-4 de la secuencia) se lee como una mancha gris, no como una gota: el blob central ocupa ~40% del ancho y cae poco. Fix: angostar la gota a ~12% del ancho y aumentar la caída para que se lea como goteo. Severidad: media. El subtítulo aparece a ~18px del borde inferior y se siente apretado: subir a ~56px."

FORMATO DE SALIDA (exactamente esto, en este orden):
Primero un bloque ```json con:
{"puntaje": <0-10>, "ejes": {"composicion":<0-10>,"color":<0-10>,"tipografia":<0-10>,"jerarquia":<0-10>,"ritmo":<0-10>,"movimiento":<0-10>,"marca":<0-10>,"mensaje":<0-10>}, "veredicto": "<una línea>"}
Después, en markdown:
## Qué vi
(2-4 frases describiendo objetivamente el video, escena por escena, ANTES de juzgar)
## Crítica de marketing
(¿comunica al público del brief? ¿el hook engancha en el primer segundo? ¿el copy y el cierre empujan al objetivo?)
## Crítica de diseño
(composición, color/contraste, tipografía, jerarquía — siempre con evidencia de frames)
## Ritmo y movimiento
(timing por escena + calidad de la animación según las secuencias de movimiento)
## Problemas priorizados
(lista ordenada por impacto; cada ítem: **observación con evidencia** → severidad (alta/media/baja) → **fix concreto** con número o acción)
## Lo que funciona
(qué conservar, para no romperlo al corregir)
## Qué le falta al MOTOR para nivel "marca grande"
(capacidades de animación o tipos de escena que el sistema NO tiene hoy y que harían falta — esto NO son perillas a ajustar, es para evolucionar el código del motor)

CHECK FINAL antes de cerrar: releé tu salida. Si alguna línea no tiene evidencia de frame o no termina en un fix concreto (con número o acción), reescribila. Si se te coló alguna frase genérica prohibida, sacala."""


def _user_text(brief, timeline, fmt):
    scenes = "\n".join(
        f"- E{i + 1} {s.get('type')}: " +
        json.dumps({k: v for k, v in s.items() if k != "durationInFrames"}, ensure_ascii=False)[:240]
        for i, s in enumerate((timeline or {}).get("scenes", []) or [])
    ) or "(sin escenas)"
    return (f"BRIEF DE LA MARCA:\n{(brief or '(sin brief)')[:2500]}\n\n"
            f"PLAN DE ESCENAS (lo que el director pidió dibujar):\n{scenes}\n\n"
            f"Formato: {fmt} (9:16 vertical). Mirá los fotogramas adjuntos y entregá la crítica con el formato pedido.")


def _split_scores(text):
    """Separa el bloque ```json (puntajes) del cuerpo en markdown."""
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.S)
    if not m:
        return None, text
    scores = None
    try:
        scores = json.loads(m.group(1))
    except Exception:
        scores = None
    return scores, (text[:m.start()] + text[m.end():]).strip()


async def analyze_video(mp4_path, timeline, brief, fmt="vertical", usage=None, model=None):
    """Análisis con visión de UN video. Devuelve dict con puntajes + análisis detallado en markdown.
    El costo se acumula en `usage` (mismo tracking que el resto del pipeline)."""
    import template_director as _td   # import perezoso: así el módulo se puede testear sin el cliente
    model = model or VISION_MODEL
    blocks, meta = build_frames(mp4_path, timeline)
    if not blocks:
        return {"ok": False, "error": "no se pudieron extraer fotogramas del video", "model": model}
    content = [{"type": "text", "text": _user_text(brief, timeline, fmt)}] + blocks
    try:
        resp = await _td._client.messages.create(
            model=model, max_tokens=3500,
            system=_td._sys_cached(VISION_CRITIC_SYSTEM),
            messages=[{"role": "user", "content": content}],
        )
        if usage is not None:
            _td._acc_usage(usage, "vision_critic", model, resp)
        text = (resp.content[0].text or "").strip()
    except Exception as e:
        return {"ok": False, "error": f"crítica con visión falló: {e}", "model": model}
    scores, body = _split_scores(text)
    return {"ok": True, "model": model, "scores": scores, "analysis": body, "raw": text, "frames": meta.get("images", [])}
