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

client = AsyncAnthropic()

REMOTION_DIR = Path(__file__).parent.parent / "remotion"
LIBRARY_DIR  = Path(__file__).parent.parent / "cinematic_library"
LIBRARY_DIR.mkdir(exist_ok=True)

MAX_ATTEMPTS  = 5
HAIKU_MODEL   = "claude-haiku-4-5-20251001"
OPUS_MODEL    = "claude-sonnet-4-6"  # fallback — más barato que Opus completo

# ─── Prompt del sistema ───────────────────────────────────────────────────────
FORGE_SYSTEM = """Sos un experto en motion graphics y animación SVG/React.
Generás componentes React para Remotion que crean animaciones cinematográficas complejas.

REGLAS TÉCNICAS ESTRICTAS:
1. El componente DEBE llamarse exactamente como se te indique (ej: export function EcommerceJourney)
2. Imports permitidos ÚNICAMENTE:
   - import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
   - NO importes nada más — ni animejs, ni gsap, ni three
3. Toda la animación va en el componente usando frame y matemáticas puras
4. Props: ({ primaryColor = '#6366f1', bg = '#07070f', siteName = 'Marca' })
5. El componente debe durar exactamente 90 frames (3 segundos a 30fps)
6. Usá SVG para las formas — paths, círculos, polígonos
7. La interpolación es manual: lerp(a, b, t) donde t = frame/90
8. Para morphing de paths: interpolá los números del path directamente
9. NO uses hooks personalizados, NO uses useRef, NO uses useEffect
10. Todo debe ser determinista — mismo frame = mismo output visual

HELPER DISPONIBLE (ya definido, no lo reimplementes):
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeInOut = (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

OUTPUT: Solo el código JSX del componente. Sin explicaciones, sin markdown, sin ```."""

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

# ─── Compilar con esbuild (sandbox rápido) ────────────────────────────────────
async def compile_jsx(code: str, component_name: str) -> tuple[bool, str]:
    """Compila el JSX con esbuild. Retorna (ok, error_message)."""
    with tempfile.NamedTemporaryFile(suffix=".jsx", mode="w", delete=False, encoding="utf-8") as f:
        # Agregar los helpers y el wrapper
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
    progress_callback=None,
) -> dict:
    """
    Genera una animación en loop hasta que compile correctamente.
    Retorna dict con el resultado.
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

    # ── Intento inicial con Haiku ─────────────────────────────────────────────
    user_prompt = f"""Creá una animación React para Remotion llamada `{component_name}`.

RUBRO: {rubro}
IDEA NARRATIVA: {idea}

El componente debe contar visualmente esa narrativa completa en 90 frames (3 segundos).
Usá formas SVG (paths, círculos, polígonos) que se transforman y morphean entre sí.
Cada momento de la narrativa ocupa un segmento del timeline de 0-90 frames.
Las transiciones entre formas son suaves usando interpolación de paths.

Acordate: solo exports el componente, sin markdown, sin explicaciones."""

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
                max_tokens=3000,
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
