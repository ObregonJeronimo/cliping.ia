"""
Inyecta animaciones generadas al MarketingVideo.jsx.
Valida el JSX antes de guardarlo, con rollback si falla.
"""
import subprocess
import shutil
import re
from pathlib import Path

JSX_FILE = Path("../remotion/src/compositions/MarketingVideo.jsx")
BACKUP_FILE = Path("../remotion/src/compositions/MarketingVideo.backup.jsx")
INDUSTRY_DIR = Path("industry_animations")

ROUTER_MARKER = "// ══════════════════════════════════════════════════════════════════════════════\n// ROUTER"
ANIM_MAP_END = "  freeze_frame_outro:    FreezeFrameOutro,"


def _validate_jsx(jsx_path: Path) -> tuple[bool, str]:
    """Valida que el JSX compile correctamente con Remotion."""
    remotion_bin = Path("../remotion/node_modules/.bin/remotion.cmd")
    if not remotion_bin.exists():
        remotion_bin = Path("../remotion/node_modules/.bin/remotion")
    
    try:
        result = subprocess.run(
            [str(remotion_bin), "render", "index.jsx", "MarketingVideo",
             "test_validation_output.mp4",
             "--duration-in-frames", "1",
             "--log", "error"],
            cwd=Path("../remotion"),
            capture_output=True, text=True, timeout=90
        )
        
        # Limpiar archivo de test si existe
        test_out = Path("../remotion/test_validation_output.mp4")
        if test_out.exists():
            test_out.unlink()
            
        if result.returncode == 0:
            return True, "OK"
        else:
            # Capturar el error completo para debug
            stderr = (result.stderr or "")
            stdout = (result.stdout or "")
            full_err = (stderr + stdout)
            # Extraer la línea de error más relevante
            for line in full_err.split("\n"):
                if "Error" in line or "error" in line or "undefined" in line:
                    print(f"[injector] error detalle: {line[:150]}")
            return False, full_err[-600:]
    except subprocess.TimeoutExpired:
        return False, "Timeout en validación"
    except Exception as e:
        return False, str(e)


def inject_animations(industry_key: str, animations: list[dict]) -> tuple[bool, list[str]]:
    """
    Inyecta animaciones nuevas al JSX.
    Retorna (éxito, lista_de_nombres_inyectados).
    """
    if not animations:
        return True, []

    jsx_path = JSX_FILE
    if not jsx_path.exists():
        print(f"[injector] No se encontró {jsx_path}")
        return False, []

    content = jsx_path.read_text(encoding="utf-8")
    
    # Backup antes de modificar
    BACKUP_FILE.write_text(content, encoding="utf-8")

    injected_names = []
    new_functions = []
    new_map_entries = []

    for anim in animations:
        fn_code = anim.get("jsx_code", "")
        anim_name = anim.get("name", "")  # snake_case
        scene = anim.get("scene", "")
        description = anim.get("description", "")

        # Extraer nombre de la función JSX
        fn_match = re.search(r'function\s+(\w+)\s*\(', fn_code)
        if not fn_match:
            print(f"[injector] No se encontró nombre de función en: {anim_name}")
            continue
        fn_name = fn_match.group(1)

        # Verificar que no existe ya
        if f"function {fn_name}(" in content:
            print(f"[injector] '{fn_name}' ya existe en el JSX — saltando")
            injected_names.append(anim_name)  # ya estaba, contar como disponible
            continue

        # Parchear el código para garantizar helpers disponibles
        clean_code = fn_code.strip()
        # Inyectar isDarkBg inline si lo usa y no está como función separada
        if "isDarkBg" in clean_code:
            # Reemplazar llamadas a isDarkBg con la lógica inline
            clean_code = clean_code.replace(
                "isDarkBg(bg)",
                "(!bg || bg.includes('0a') || bg.includes('07') || bg.includes('0d') || bg.includes('linear'))"
            ).replace(
                "isDarkBg(primaryColor)",
                "false"
            )
        # Reemplazar useCurrentFrame() con el frame recibido como prop
        if "useCurrentFrame()" in clean_code:
            # Agregar const frame = al inicio de la función
            clean_code = re.sub(
                r'(function\s+\w+\s*\([^)]*\)\s*\{)',
                r'\1\n  // frame viene como prop, no usar useCurrentFrame();',
                clean_code, count=1
            )
            clean_code = clean_code.replace("useCurrentFrame()", "frame")
        # Eliminar useVideoConfig() si se usa solo para fps (ya viene como prop)
        if "useVideoConfig()" in clean_code and "fps" in clean_code:
            clean_code = re.sub(r'const\s*\{[^}]*fps[^}]*\}\s*=\s*useVideoConfig\(\);?', '', clean_code)

        block = f"\n// {description}\n// Scene: {scene} | Industry: {industry_key}\n{clean_code}\n"
        new_functions.append(block)

        # Preparar entrada del ANIM_MAP
        new_map_entries.append(f"  {anim_name}:    {fn_name},")
        injected_names.append(anim_name)
        print(f"[injector] Preparando '{anim_name}' → {fn_name}()")

    if not new_functions:
        print(f"[injector] Nada nuevo que inyectar")
        return True, injected_names

    # Insertar funciones antes del ROUTER
    if ROUTER_MARKER not in content:
        print(f"[injector] No se encontró ROUTER_MARKER")
        return False, []

    industry_header = f"\n// ══════════ ANIMACIONES {industry_key.upper()} — GENERADAS ══════════\n"
    insert_block = industry_header + "".join(new_functions)
    content = content.replace(ROUTER_MARKER, insert_block + ROUTER_MARKER)

    # Insertar en el ANIM_MAP
    if ANIM_MAP_END in content and new_map_entries:
        entries_str = "\n  // Generadas para rubro: " + industry_key + "\n" + "\n".join(new_map_entries)
        content = content.replace(ANIM_MAP_END, ANIM_MAP_END + entries_str)

    # Guardar
    jsx_path.write_text(content, encoding="utf-8")
    print(f"[injector] Guardado en {jsx_path}")

    # Validar compilación
    print(f"[injector] Validando compilación...")
    ok, err = _validate_jsx(jsx_path)

    if ok:
        print(f"[injector] ✓ JSX compila correctamente con {len(injected_names)} animaciones nuevas")
        # Actualizar registro de animaciones disponibles para el rubro
        _update_industry_catalog(industry_key, injected_names)
        return True, injected_names
    else:
        print(f"[injector] ✗ Error de compilación: {err[:200]}")
        print(f"[injector] Revirtiendo al backup...")
        jsx_path.write_text(BACKUP_FILE.read_text(encoding="utf-8"), encoding="utf-8")
        return False, []


def _update_industry_catalog(industry_key: str, new_names: list[str]):
    """Actualiza el catálogo del rubro con las nuevas animaciones."""
    import json
    catalog_file = INDUSTRY_DIR / f"{industry_key}_generated.json"
    existing = []
    if catalog_file.exists():
        try:
            data = json.loads(catalog_file.read_text(encoding="utf-8"))
            existing = data.get("animations", [])
        except:
            pass
    all_anims = list(dict.fromkeys(existing + new_names))
    catalog_file.write_text(json.dumps({
        "industry": industry_key,
        "animations": all_anims,
        "count": len(all_anims),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[injector] Catálogo '{industry_key}' actualizado: {len(all_anims)} animaciones")
