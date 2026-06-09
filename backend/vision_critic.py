"""
vision_critic.py — Crítico de animaciones CON VISIÓN (versión afilada).

Toma el MP4 ya renderizado + el timeline y arma DOS vistas de fotogramas:
  1) COMPOSICIÓN: un frame asentado por escena, grande y legible -> para juzgar encuadre,
     contraste, tipografía y copy (el texto tiene que leerse).
  2) STORYBOARD denso: cada ESCENA es una fila de frames en el tiempo (entrada -> salida),
     muestreados sesgados al principio (donde pasa la animación) -> para juzgar el MOVIMIENTO
     de verdad (easing, pop-ins, stagger, overshoot, ritmo), no adivinando.
Se los manda a Sonnet 4.6 (configurable a Opus) con un prompt anti-genérico y calibrado.

El render lo hace Remotion (PC de Jero); acá sólo leemos el MP4 ya hecho.
Requiere imageio-ffmpeg (trae su propio ffmpeg) y Pillow.
"""
import os, io, json, base64, subprocess, re
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

# Sonnet por default (barato y, con este prompt, nada genérico). Opus con CLIPING_VISION_MODEL.
VISION_MODEL = os.getenv("CLIPING_VISION_MODEL", "claude-sonnet-4-6")

FPS = 30
COMP_LONG_EDGE = 1400      # techo del lado largo de la hoja de composición
STORY_LONG_EDGE = 1568     # techo del storyboard (= máx que la API usa, sin downscale extra)


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


def _fracs(k):
    """k posiciones dentro de una escena, sesgadas al principio (la animación de entrada vive ahí)."""
    presets = {
        1: [0.5],
        2: [0.10, 0.85],
        3: [0.06, 0.35, 0.92],
        4: [0.05, 0.18, 0.45, 0.92],
        5: [0.04, 0.14, 0.30, 0.55, 0.92],
        6: [0.04, 0.12, 0.22, 0.38, 0.62, 0.92],
    }
    return presets.get(k, presets[6])


# ---------- armado de las hojas (PIL) ----------
def _font(size):
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except Exception:
        return ImageFont.load_default()


def _label(img, text):
    """Barra negra con el texto arriba del frame (para que la IA ubique escena/paso)."""
    d = ImageDraw.Draw(img)
    bar = max(15, img.height // 14)
    fs = max(11, img.width // 14)
    d.rectangle([0, 0, img.width, bar], fill=(0, 0, 0))
    d.text((4, max(1, (bar - fs) // 2)), text, fill=(255, 255, 255), font=_font(fs))
    return img


def _grid(images, cols, pad=6, bg=(238, 238, 238)):
    """Tila imágenes del mismo tamaño en una grilla de N columnas (fila por fila)."""
    if not images:
        return None
    w, h = images[0].size
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w + pad * (cols + 1), rows * h + pad * (rows + 1)), bg)
    for i, im in enumerate(images):
        sheet.paste(im, (pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad)))
    return sheet


def _grid_of_rows(rows, pad=6, bg=(238, 238, 238)):
    """Tila una lista de filas (cada fila = lista de frames del mismo tamaño). Fila = una escena."""
    rows = [r for r in rows if r]
    if not rows:
        return None
    w, h = rows[0][0].size
    cols = max(len(r) for r in rows)
    sheet = Image.new("RGB", (cols * w + pad * (cols + 1), len(rows) * h + pad * (len(rows) + 1)), bg)
    for ri, r in enumerate(rows):
        for ci, im in enumerate(r):
            sheet.paste(im, (pad + ci * (w + pad), pad + ri * (h + pad)))
    return sheet


def _fit_long_edge(img, mx):
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
    mandó (para el log). Hoja de composición + storyboard denso (una fila por escena)."""
    spans = _scene_spans(timeline, fps)
    if not spans:
        return [], {"images": []}

    # --- Hoja de COMPOSICIÓN: un frame al 72% de cada escena (animación asentada = lectura) ---
    cellW, comp_cells = 256, []
    for idx, typ, start, dur in spans:
        fr = _ffmpeg_frame(mp4_path, (start + dur * 0.72) / fps)
        if fr is None:
            continue
        fr = fr.resize((cellW, max(1, int(cellW * fr.height / fr.width))))
        _label(fr, f"E{idx + 1} {typ}")
        comp_cells.append(fr)
    sheet_comp = _fit_long_edge(_grid(comp_cells, 3), COMP_LONG_EDGE)

    # --- STORYBOARD: una fila por escena, muestreo denso sesgado al inicio (movimiento) ---
    nsc = len(spans)
    per = 6 if nsc <= 4 else (5 if nsc <= 6 else 4)   # ~24-30 frames totales
    seqW, rows = 150, []
    for idx, typ, start, dur in spans:
        row = []
        for j, fr_frac in enumerate(_fracs(per)):
            fr = _ffmpeg_frame(mp4_path, (start + dur * fr_frac) / fps)
            if fr is None:
                continue
            fr = fr.resize((seqW, max(1, int(seqW * fr.height / fr.width))))
            _label(fr, f"E{idx + 1}.{j + 1}")
            row.append(fr)
        if row:
            rows.append(row)
    sheet_story = _fit_long_edge(_grid_of_rows(rows), STORY_LONG_EDGE)

    blocks, meta = [], []
    if sheet_comp is not None:
        blocks += [{"type": "text", "text": "VISTA 1 — COMPOSICIÓN: un fotograma asentado por escena (etiquetado E#). Usala para legibilidad, encuadre, contraste y tipografía."},
                   {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": _b64_png(sheet_comp)}}]
        meta.append(f"composición ({len(comp_cells)} escenas)")
    if sheet_story is not None:
        blocks += [{"type": "text", "text": f"VISTA 2 — STORYBOARD: cada FILA es una escena en el tiempo (izquierda = entrada → derecha = salida), {per} frames por escena, densos al principio donde pasa la animación. Usala para juzgar el MOVIMIENTO: easing, pop-ins, stagger, overshoot y ritmo."},
                   {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": _b64_png(sheet_story)}}]
        meta.append(f"storyboard ({nsc} escenas × {per} frames)")
    return blocks, {"images": meta}


# ---------- el prompt (lo que hace que NO sea genérico) ----------
VISION_CRITIC_SYSTEM = """Sos director de arte y diseñador de motion-graphics senior, del nivel de un estudio top (pensá Apple, Stripe, Linear). Te paso fotogramas de un video de marketing vertical (9:16) hecho con un motor de animación propio, más el brief de la marca y el plan de escenas. Tu trabajo: una crítica PROFESIONAL, específica, calibrada y accionable — la que daría un director de arte exigente, no un comentario de redes.

TENÉS DOS VISTAS:
- VISTA 1 (COMPOSICIÓN): un frame asentado por escena, grande. Úsala para encuadre, márgenes, contraste, jerarquía, tipografía y copy (el texto se lee acá).
- VISTA 2 (STORYBOARD): cada FILA es UNA escena a lo largo del tiempo (izquierda = entrada, derecha = salida). Úsala para el MOVIMIENTO. Leé cada fila como un flipbook: cómo entra, cómo se asienta, cómo sale.

RÚBRICA — puntuás cada eje 0-10 (calibrado, ver más abajo):
- composicion: encuadre, márgenes, equilibrio, uso del espacio, foco visual.
- color: paleta, contraste texto/fondo, legibilidad, coherencia con la marca.
- tipografia: tamaño, jerarquía, tracking, cortes de línea, legibilidad en pantalla chica.
- jerarquia: qué se lee primero, si el mensaje principal domina, ruido visual.
- ritmo: timing de cada escena, tiempo de lectura, pacing del conjunto.
- movimiento: calidad de la animación según el STORYBOARD — ¿las entradas tienen easing (aceleran/desaceleran) o son lineales/abruptas? ¿los elementos aparecen de golpe (pop-in) o entran con intención? ¿hay overshoot y asentado? ¿los grupos (ítems de lista) entran en cascada (stagger) o todos juntos? ¿el corte entre escenas fluye o salta?
- marca: si transmite la identidad/tono del brief (que se sienta de ESTA marca, no de cualquiera).
- mensaje: si el copy comunica claro al público y empuja al objetivo del brief.

CALIBRACIÓN (NO repartas 7 a todo):
- 9-10 = nivel estudio top, lo publicaría una marca grande tal cual.
- 7-8 = profesional sólido, con detalles menores.
- 5-6 = correcto pero del montón / se nota "de plantilla".
- 3-4 = se ve barato o amateur.
- 0-2 = roto o ilegible.
Si algo es del montón, poné 5-6. Sé estricto: el objetivo es nivel marca grande.

REGLAS DE ESPECIFICIDAD (no negociables):
1. CADA crítica cita la EVIDENCIA del frame: qué viste y dónde ("en E3 (Vista 1) el título queda a ~6px del borde y se corta la última palabra"; "en la fila de E1 del storyboard, entre los frames 2 y 3 el título salta de golpe a tamaño final: no hay easing de entrada"). Sin evidencia visual concreta, no es crítica válida.
2. CADA problema termina en un FIX CONCRETO Y ACCIONABLE con número o acción ("subir el margen superior de ~20px a ~64px"; "el conteo del número tiene que arrancar 8 frames antes y frenar con ease-out (cubic-out)"; "los ítems del checklist tienen que entrar en cascada con ~3-4 frames de offset entre cada uno, no todos juntos"). Nada de "mejorar X" sin decir CÓMO.
3. PROHIBIDO el lenguaje genérico de relleno: "más dinámico", "más moderno", "mejorar la paleta", "darle más vida", "más profesional", "se puede mejorar", "podría ser mejor". Si lo vas a decir, atalo a una observación concreta + un número. Si no podés, no lo digas.
4. PRIORIZÁ: ordená los problemas por impacto (lo que más arruina el video primero).
5. SEPARÁ perillas de capacidades: si el problema es que falta un tipo de movimiento o de escena que el sistema NO tiene hoy (no es un valor a ajustar), va en su propia sección, no mezclado con los fixes.

ESTILO: rioplatense (voseo), directo, técnico, sin adulación. Detallado pero sin paja.

EJEMPLO de crítica MALA (genérica — NO hagas esto):
"La escena del título podría ser más dinámica y la paleta más moderna. El ritmo está bien pero se puede mejorar. En general se ve profesional pero le falta vida."
EJEMPLO de crítica BUENA (específica — hacé esto):
"E1 (paintTitle): en el storyboard, el título pasa de invisible (frame 2) a tamaño completo (frame 3) sin pasos intermedios — entra de golpe, sin easing, se siente duro. Fix: animar la entrada en ~10 frames con scale 0.92→1 + opacity 0→1 y ease-out. Además, el goteo de la barra (frames 4-5) se lee como mancha gris, no como gota: el blob ocupa ~40% del ancho. Fix: angostar a ~12% y aumentar la caída. Severidad: alta (es el primer segundo, el hook)."

FORMATO DE SALIDA (exactamente esto, en este orden):
Primero un bloque ```json con:
{"puntaje": <0-10>, "ejes": {"composicion":<0-10>,"color":<0-10>,"tipografia":<0-10>,"jerarquia":<0-10>,"ritmo":<0-10>,"movimiento":<0-10>,"marca":<0-10>,"mensaje":<0-10>}, "veredicto": "<una línea honesta>"}
Después, en markdown:
## Qué vi
(2-4 frases describiendo objetivamente el video escena por escena, ANTES de juzgar)
## Crítica de marketing
(¿el hook engancha en el primer segundo? ¿comunica al público del brief? ¿el copy y el cierre empujan al objetivo?)
## Crítica de diseño
(composición, color/contraste, tipografía, jerarquía — con evidencia de la Vista 1)
## Movimiento y ritmo
(leé el STORYBOARD fila por fila: calidad del easing, pop-ins, stagger, overshoot, y el pacing del conjunto — con evidencia de frames)
## Problemas priorizados
(lista ordenada por impacto; cada ítem: **observación con evidencia** → severidad (alta/media/baja) → **fix concreto** con número o acción)
## Lo que funciona
(qué conservar, para no romperlo al corregir)
## Qué le falta al MOTOR para nivel "marca grande"
(capacidades de animación o tipos de escena que el sistema NO tiene hoy. Por cada una: **qué se ve hoy** → **qué haría un estudio top** → **la capacidad técnica que falta**. Ej: "los ítems del checklist aparecen todos juntos en E3; un estudio los entraría en cascada con ~3-4 frames de offset y leve overshoot — falta un sistema de stagger por elemento")

CHECK FINAL antes de cerrar: releé tu salida. Si alguna línea no tiene evidencia de frame o no termina en un fix concreto (con número o acción), reescribila. Si se te coló una frase genérica prohibida, sacala. Si pusiste 7 en varios ejes "por defecto", recalibrá contra la escala."""


def _user_text(brief, timeline, fmt):
    scenes = "\n".join(
        f"- E{i + 1} {s.get('type')}: " +
        json.dumps({k: v for k, v in s.items() if k != "durationInFrames"}, ensure_ascii=False)[:240]
        for i, s in enumerate((timeline or {}).get("scenes", []) or [])
    ) or "(sin escenas)"
    return (f"BRIEF DE LA MARCA:\n{(brief or '(sin brief)')[:2500]}\n\n"
            f"PLAN DE ESCENAS (lo que el director pidió dibujar):\n{scenes}\n\n"
            f"Formato: {fmt} (9:16 vertical). Mirá las dos vistas adjuntas y entregá la crítica con el formato pedido.")


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
            model=model, max_tokens=4500,
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
