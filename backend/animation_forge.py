"""
ANIMATION FORGE — Sistema de generación en loop de animaciones cinemáticas.

Flujo:
1. Claude Haiku genera JSX de animación
2. esbuild compila (sandbox rápido ~200ms)
3. Si falla → Haiku ve el error y corrige (hasta MAX_ATTEMPTS intentos)
4. Si pasa todos los intentos → Opus hace un último intento
5. Si compila OK → guarda en la biblioteca
6. Emite progreso por WebSocket en tiempo real

Costo estimado: ~$0.003 por animación con Haiku
"""
import asyncio, json, re, subprocess, tempfile, time, uuid
from pathlib import Path
from anthropic import AsyncAnthropic

# Librería de objetos vectoriales (Iconify). Si no está disponible, el forge
# sigue funcionando sin objetos.
try:
    from iconify_service import fetch_objects_for_prompt, build_objects_prompt_block
    _ICONIFY_OK = True
except Exception as _e:  # pragma: no cover
    _ICONIFY_OK = False
    print(f"[forge] Iconify no disponible: {_e}")

client = AsyncAnthropic()

REMOTION_DIR = Path(__file__).parent.parent / "remotion"
LIBRARY_DIR  = Path(__file__).parent.parent / "cinematic_library"
LIBRARY_DIR.mkdir(exist_ok=True)

MAX_ATTEMPTS  = 5
HAIKU_MODEL   = "claude-haiku-4-5-20251001"
OPUS_MODEL    = "claude-sonnet-4-6"  # fallback — más barato que Opus completo

# ─── Prompt del sistema ───────────────────────────────────────────────────────
FORGE_SYSTEM = """Sos un director de motion graphics premium (nivel Apple/Stripe/Linear).
Generás animaciones SVG/React para Remotion VISUALMENTE ESPECTACULARES y CON SENTIDO.

REGLAS TÉCNICAS ESTRICTAS (si no se cumplen, no compila):
1. El componente DEBE llamarse exactamente como se indique
2. Imports ÚNICAMENTE: import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
3. Props: ({ primaryColor = '#6366f1', secondaryColor = '#a78bfa', accentColor = '#f59e0b', bg = '#07070f', siteName = 'Marca' })
4. Duración: exactamente 90 frames (3 segundos a 30fps)
5. SVG SIEMPRE VERTICAL: viewBox="0 0 1080 1920" — el centro es cx=540 cy=960
6. Las formas deben ser GRANDES — mínimo 200px de diámetro/tamaño
7. NO uses hooks personalizados, NO useRef, NO useEffect
8. Todo determinista — mismo frame = mismo output. Derivá TODO de useCurrentFrame().
9. Para IDs de gradientes/filtros usá nombres únicos por animación (ej: 'grad-{algo}') para que no choquen al concatenar.

PRINCIPIOS DE MOTION (lo que separa lo amateur de lo premium):
- TIMELINE CLARA: dividí los 90 frames en actos con propósito (entrada → desarrollo → clímax → salida). Que se lea una micro-historia, no ruido.
- EASING SIEMPRE: nada se mueve a velocidad lineal. Usá easeOut para entradas, easeInOut para tránsitos. spring(...) para rebotes orgánicos.
- ANTICIPACIÓN + OVERSHOOT + SETTLE: las cosas se preparan antes de moverse, se pasan un poco del objetivo y vuelven. Eso da vida.
- STAGGER: si hay varios elementos, que entren escalonados (cada uno con delay), nunca todos juntos.
- PROFUNDIDAD: parallax entre capas (fondo se mueve menos que el frente), escala + blur para simular distancia.
- JERARQUÍA FOCAL: un único protagonista por momento. El resto acompaña, no compite.

CALIDAD VISUAL:
- Degradados SVG SIEMPRE (linear/radial), nunca color plano. Animá gradientTransform/offset/opacity.
- Filtros SVG: feGaussianBlur para glow real, feDropShadow para profundidad.
- Multicapa por objeto: sombra difusa + forma con degradado + highlight/specular encima.
- Fondo vivo: radialGradient oscuro con tinte del primaryColor + grano/partículas sutiles, nunca #000 plano.
- Partículas con propósito (orbitan, explotan en el clímax, fluyen), no decorado al azar.
- Glow del accentColor en los momentos de impacto.

PALETA — usá las 3 con intención:
- primaryColor: protagonista. secondaryColor: degradados/capas de apoyo. accentColor: destellos, partículas, el "pop".

HELPERS YA DEFINIDOS (no los reimplementes ni los redeclares):
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeInOut = (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
(spring viene de remotion: spring({ frame, fps, config: { damping: 12 } }))

PATRÓN DE REFERENCIA (estructura, no copiar literal):
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const entrada = easeOut(clamp(f / 24, 0, 1))         // acto 1: 0-24
  const climax  = easeInOut(clamp((f - 36) / 30, 0, 1)) // acto 2: 36-66
  const salida  = clamp((f - 78) / 12, 0, 1)            // acto 3: 78-90
  const pop = spring({ frame: f - 36, fps, config: { damping: 10 } })
  // ...usar estos factores para escalar/rotar/desplazar/opacar capas con stagger.

OUTPUT: Solo el código JSX. Sin explicaciones, sin markdown, sin ```."""

# ─── Prompt de corrección ─────────────────────────────────────────────────────
CORRECTION_SYSTEM = """Sos un experto en debugging de React/JSX para Remotion.
Te dan un componente que falló al compilar con esbuild y el error exacto.
Tu tarea: corregir SOLO el error sin cambiar la lógica de la animación.

REGLAS:
- Solo corregís errores de sintaxis/imports/tipos
- NO cambies la narrativa ni la lógica visual
- Solo imports permitidos: { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
- NO agregues imports nuevos
- OUTPUT: Solo el código JSX corregido, sin explicaciones"""

# ─── Planificador de objetos (qué buscar en la librería) ──────────────────────
OBJECT_PLANNER_SYSTEM = """Sos un asistente que traduce una idea de animación en términos de búsqueda de objetos vectoriales.

Devolvés SOLO un array JSON de 1 a 4 strings, EN INGLÉS, cada uno un objeto concreto,
simple y buscable como icono (en singular). Pensá qué objetos REALES haría falta mostrar.

Ejemplos:
- "un carrito que al hacer click se convierte en dinero" -> ["shopping cart", "cursor arrow", "dollar coin"]
- "crecimiento de una empresa de tecnología" -> ["line chart", "rocket", "computer chip"]
- "agenda médica online" -> ["calendar", "stethoscope", "smartphone"]

Si la idea es PURAMENTE abstracta (solo formas/energía/ondas sin objetos reales), devolvés [].
Nada de explicaciones, solo el array JSON."""


async def plan_object_queries(idea: str, tags: list, desarrollo: str,
                              rubro: str, user_objects: list) -> list:
    """
    Decide qué objetos vectoriales buscar en la librería a partir de la idea.
    Incorpora y traduce al inglés los objetos que el usuario cargó a mano.
    Devuelve una lista de términos de búsqueda en inglés (máx 4). Si algo falla,
    cae a los objetos del usuario tal cual.
    """
    partes = []
    if (desarrollo or "").strip():
        partes.append(f'Descripción: "{desarrollo.strip()}"')
    if tags:
        partes.append("Conceptos: " + ", ".join(tags))
    if user_objects:
        partes.append("Objetos que pidió el usuario (traducilos e incluilos): " + ", ".join(user_objects))
    if rubro:
        partes.append(f"Rubro: {rubro}")
    if not partes:
        return list(user_objects)[:4]

    try:
        resp = await client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=200,
            system=OBJECT_PLANNER_SYSTEM,
            messages=[{"role": "user", "content": "\n".join(partes)}],
        )
        raw = resp.content[0].text.strip()
        m = re.search(r"\[.*\]", raw, re.S)
        if not m:
            return list(user_objects)[:4]
        arr = json.loads(m.group(0))
        out = []
        for x in arr:
            if isinstance(x, str) and x.strip() and x.strip().lower() not in [o.lower() for o in out]:
                out.append(x.strip())
        return out[:4]
    except Exception as e:
        print(f"[forge] plan_object_queries error: {e}")
        return list(user_objects)[:4]


# ─── Compilar con esbuild (sandbox rápido) ────────────────────────────────────
async def compile_jsx(code: str, component_name: str) -> tuple[bool, str]:
    """Compila el JSX con esbuild. Retorna (ok, error_message)."""
    # Si el código ya importa de remotion, no duplicar
    has_remotion_import = "from 'remotion'" in code or 'from "remotion"' in code

    with tempfile.NamedTemporaryFile(suffix=".jsx", mode="w", delete=False, encoding="utf-8") as f:
        if has_remotion_import:
            # El código ya tiene sus imports — solo agregar helpers si faltan
            full_code = code
        else:
            # Agregar imports y helpers
            full_code = f"""import {{ AbsoluteFill, useCurrentFrame, useVideoConfig, spring }} from 'remotion'

const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeInOut = (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

{code}
"""
        f.write(full_code)
        tmp_path = f.name

    out_path = tmp_path.replace(".jsx", "_out.js")
    esbuild = str(REMOTION_DIR / "node_modules" / ".bin" / "esbuild")
    esbuild_win = str(REMOTION_DIR / "node_modules" / ".bin" / "esbuild.cmd")
    bin_path = esbuild_win if Path(esbuild_win).exists() else esbuild

    try:
        result = subprocess.run(
            [bin_path, tmp_path,
             "--bundle=false", "--format=esm",
             "--jsx=automatic", f"--loader:.jsx=jsx",
             f"--outfile={out_path}"],
            capture_output=True, text=True, timeout=15,
            cwd=str(REMOTION_DIR)
        )
        Path(tmp_path).unlink(missing_ok=True)
        Path(out_path).unlink(missing_ok=True)

        if result.returncode == 0:
            return True, ""
        else:
            err = (result.stderr + result.stdout)[:600]
            return False, err
    except Exception as e:
        Path(tmp_path).unlink(missing_ok=True)
        return False, str(e)[:300]

# ─── Generador principal ──────────────────────────────────────────────────────
async def forge_animation(
    idea: str,
    component_name: str,
    rubro: str,
    anim_id: str,
    tags: list = None,
    desarrollo: str = "",
    primaryColor: str = "#6366f1",
    secondaryColor: str = "#a78bfa",
    accentColor: str = "#f59e0b",
    objects: list = None,
    progress_callback=None,
) -> dict:
    """
    Genera una animación en loop hasta que compile correctamente.
    tags: lista de conceptos seleccionados por el usuario
    desarrollo: texto libre del usuario (puede estar vacío)
    objects: lista de conceptos de objetos reales a buscar en Iconify
             (ej: ["shopping cart", "mouse pointer", "dollar"])
    """

    async def emit(msg: str, step: int, total: int = MAX_ATTEMPTS + 2):
        if progress_callback:
            await progress_callback({"msg": msg, "step": step, "total": total, "id": anim_id})

    await emit(f"🎬 Generando '{component_name}'...", 0)
    start = time.time()

    code = None
    last_error = None
    attempt = 0
    success = False

    # ── Construir el prompt según lo que puso el usuario ─────────────────────
    tags_str = ", ".join(tags) if tags else ""

    # Evaluar si el desarrollo tiene sentido real
    desarrollo_limpio = (desarrollo or "").strip()
    desarrollo_valido = len(desarrollo_limpio) > 3 and desarrollo_limpio not in [".", "..", "...", "x", "n"]

    if desarrollo_valido:
        narrativa_section = f"""EL USUARIO DESCRIBIÓ ESTA ANIMACIÓN (seguí esto al pie de la letra):
"{desarrollo_limpio}"

{"Los siguientes conceptos/tags también deben estar presentes: " + tags_str if tags_str else ""}"""
    elif tags_str:
        narrativa_section = f"""El usuario seleccionó estos conceptos para la animación: {tags_str}
Creá una narrativa visual cinematográfica original basada EXCLUSIVAMENTE en estos conceptos.
Rubro de referencia: {rubro}"""
    else:
        narrativa_section = f"""Creá una narrativa visual cinematográfica original y sorprendente para el rubro: {rubro}
Sé muy creativo — buscá algo que nadie haya visto antes."""

    # ── Objetos reales (Iconify): se derivan AUTOMÁTICAMENTE de la idea ───────
    # No hace falta que el usuario los cargue a mano: a partir de la idea/tags/
    # descripción decidimos qué objetos vectoriales buscar (en inglés, que es
    # como están etiquetados los iconos) y los inyectamos como protagonistas.
    objects_block = ""
    if _ICONIFY_OK and (desarrollo_valido or tags_str or objects):
        try:
            await emit("🔎 Eligiendo objetos para animar...", 0)
            queries = await plan_object_queries(idea, tags, desarrollo_limpio, rubro, objects or [])
            if not queries and objects:
                queries = list(objects)[:4]
            if queries:
                fetched = await fetch_objects_for_prompt(queries)
                objects_block = build_objects_prompt_block(fetched)
                if fetched:
                    await emit(f"📦 {len(fetched)} objeto(s) de librería listos: {', '.join(fetched.keys())}", 0)
                else:
                    await emit("📦 Sin coincidencias en la librería — uso formas", 0)
        except Exception as oe:
            print(f"[forge] Iconify/planner error: {oe}")

    user_prompt = f"""Creá una animación React para Remotion llamada `{component_name}`.

PALETA DE COLORES A USAR (obligatorio):
- primaryColor = '{primaryColor}' → color principal, formas centrales
- secondaryColor = '{secondaryColor}' → degradados y capas secundarias  
- accentColor = '{accentColor}' → brillos, partículas, destellos
- bg = '#07070f' → fondo oscuro base

{narrativa_section}
{(chr(10) + objects_block) if objects_block else ""}

CÓMO HACERLO:
- La animación dura 90 frames (3 segundos a 30fps)
- Estructurala en actos con propósito (entrada → desarrollo → clímax → salida), no en bloques iguales
- Cada acto transforma el protagonista con easing y stagger — nada lineal, nada abrupto
- Usá SVG con paths, círculos, polígonos (y los objetos provistos si los hay) que se morphean/animan
- Las formas deben ser GRANDES y ocupar gran parte del canvas vertical
- viewBox="0 0 1080 1920", centro en cx=540 cy=960
- Profundidad real: capas con parallax, glow y sombras; fondo vivo con tinte del primaryColor
- Si te dieron objetos, ELLOS son los protagonistas — animalos, no dibujes formas genéricas en su lugar
- Sin texto estático — todo debe moverse y transformarse

Solo el código JSX, sin explicaciones ni markdown."""

    for attempt in range(1, MAX_ATTEMPTS + 1):
        await emit(f"⚙️ Intento {attempt}/{MAX_ATTEMPTS} — {'Haiku genera' if attempt == 1 else 'Haiku corrige'}...", attempt)

        model = HAIKU_MODEL
        if attempt == 1:
            messages = [{"role": "user", "content": user_prompt}]
        else:
            messages = [
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": code},
                {"role": "user", "content": f"Ese código falló al compilar con este error:\n\n{last_error}\n\nCorregí SOLO el error manteniendo la narrativa visual intacta."},
            ]

        try:
            resp = await client.messages.create(
                model=model,
                max_tokens=4000,
                system=FORGE_SYSTEM if attempt == 1 else CORRECTION_SYSTEM,
                messages=messages,
            )
            raw = resp.content[0].text.strip()
            # Limpiar markdown si lo hay
            raw = re.sub(r'^```(?:jsx?|javascript)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'^```\s*$', '', raw, flags=re.MULTILINE)
            code = raw.strip()
        except Exception as e:
            await emit(f"❌ Error de API: {e}", attempt)
            continue

        # Compilar
        await emit(f"🔨 Compilando...", attempt)
        ok, err = await compile_jsx(code, component_name)

        if ok:
            success = True
            await emit(f"✅ Compiló en el intento {attempt}!", attempt)
            break
        else:
            last_error = err
            await emit(f"⚠️ Error de compilación: {err[:80]}...", attempt)

    # ── Fallback con Sonnet si Haiku falló todos los intentos ─────────────────
    if not success:
        await emit(f"🔄 Haiku falló {MAX_ATTEMPTS} veces — intentando con Sonnet...", MAX_ATTEMPTS + 1)
        try:
            resp = await client.messages.create(
                model=OPUS_MODEL,
                max_tokens=4000,
                system=FORGE_SYSTEM,
                messages=[
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": code or ""},
                    {"role": "user", "content": f"El código anterior falló: {last_error}\n\nReescribí el componente completo desde cero, siendo muy cuidadoso con la sintaxis JSX."},
                ],
            )
            raw = resp.content[0].text.strip()
            raw = re.sub(r'^```(?:jsx?|javascript)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'^```\s*$', '', raw, flags=re.MULTILINE)
            code = raw.strip()

            ok, err = await compile_jsx(code, component_name)
            if ok:
                success = True
                await emit(f"✅ Sonnet lo logró!", MAX_ATTEMPTS + 1)
            else:
                last_error = err
                await emit(f"❌ Sonnet también falló: {err[:80]}", MAX_ATTEMPTS + 1)
        except Exception as e:
            await emit(f"❌ Error Sonnet: {e}", MAX_ATTEMPTS + 1)

    elapsed = round(time.time() - start, 1)

    result = {
        "id": anim_id,
        "component_name": component_name,
        "rubro": rubro,
        "idea": idea,
        "code": code or "",
        "success": success,
        "attempts": attempt,
        "elapsed_s": elapsed,
        "error": last_error if not success else None,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    # Guardar en biblioteca si tuvo éxito
    if success and code:
        lib_file = LIBRARY_DIR / f"{anim_id}.json"
        lib_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        # También guardar el JSX directamente
        jsx_file = LIBRARY_DIR / f"{component_name}.jsx"
        jsx_file.write_text(f"// {idea}\n// Rubro: {rubro}\n// Generado: {result['created_at']}\n\n{code}", encoding="utf-8")
        await emit(f"💾 Guardado en biblioteca ({elapsed}s)", MAX_ATTEMPTS + 2)

    return result


def list_library() -> list:
    """Lista todas las animaciones guardadas en la biblioteca."""
    items = []
    for f in sorted(LIBRARY_DIR.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            items.append({
                "id": data["id"],
                "component_name": data["component_name"],
                "rubro": data["rubro"],
                "idea": data["idea"][:80],
                "success": data["success"],
                "attempts": data["attempts"],
                "elapsed_s": data["elapsed_s"],
                "created_at": data["created_at"],
            })
        except:
            pass
    return items


def get_animation(anim_id: str) -> dict | None:
    """Obtiene una animación por ID."""
    f = LIBRARY_DIR / f"{anim_id}.json"
    if not f.exists():
        return None
    return json.loads(f.read_text(encoding="utf-8"))
