"""
Caché de selección de animaciones por URL.
Evita llamar a Claude cada vez que se procesa la misma URL.
Guarda en disco para persistir entre reinicios del backend.
"""
import json
import hashlib
from pathlib import Path

CACHE_DIR = Path("animation_cache")
CACHE_DIR.mkdir(exist_ok=True)

def _cache_key(url: str, context: dict = None) -> str:
    """Key incluye URL + isDark + primaryColor para que páginas distintas o con colores distintos no compartan caché."""
    key_parts = url
    if context:
        key_parts += f"|isDark={context.get('isDark',False)}|color={context.get('primaryColor','')}"
    return hashlib.md5(key_parts.encode()).hexdigest()

def get_cached(url: str, context: dict = None) -> dict | None:
    key  = _cache_key(url, context)
    path = CACHE_DIR / f"{key}.json"
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            print(f"[cache] HIT para {url[:50]} → {list(data.get('scenes',{}).values())}")
            return data["selection"]
        except Exception as e:
            print(f"[cache] error leyendo caché: {e}")
    return None

def save_cache(url: str, selection: dict, context: dict = None) -> None:
    key  = _cache_key(url, context)
    path = CACHE_DIR / f"{key}.json"
    try:
        path.write_text(json.dumps({
            "url": url,
            "selection": selection,
            "scenes": {k: v.get("animation") for k, v in selection.items() if k != "reasoning" and isinstance(v, dict)},
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[cache] guardado para {url[:50]}")
    except Exception as e:
        print(f"[cache] error guardando: {e}")

def clear_cache(url: str = None) -> int:
    """Limpiar caché de una URL específica o todo."""
    if url:
        path = CACHE_DIR / f"{_cache_key(url, None)}.json"
        if path.exists():
            path.unlink()
            return 1
        return 0
    count = 0
    for f in CACHE_DIR.glob("*.json"):
        f.unlink()
        count += 1
    return count

def list_cache() -> list:
    result = []
    for f in CACHE_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            result.append({"url": data.get("url"), "scenes": data.get("scenes", {})})
        except: pass
    return result
