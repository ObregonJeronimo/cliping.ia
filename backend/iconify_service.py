"""
iconify_service.py — Librería de objetos vectoriales para cliping.ia
====================================================================

Busca SVGs de objetos reales (carrito, mouse, símbolo $, cohete, candado, etc.)
en la API pública de Iconify y devuelve el "body" crudo del SVG, listo para
embeber y animar dentro del JSX que genera Haiku/Sonnet.

Por qué Iconify (y no SVG Repo u otra):
  - API pública gratuita, sin API key, sin rate limit agresivo.
  - +200.000 iconos de ~150 sets open source.
  - Devuelve el PATH crudo (no un <img>), así la IA puede animar cada trazo,
    morphear entre formas, escalar, recolorear, etc.
  - Cada set declara su licencia SPDX -> filtramos a solo las comerciales-seguras.

Endpoints de Iconify usados:
  GET /search?query=cart&limit=32   -> { icons: ["mdi:cart", ...], collections: {...} }
  GET /{prefix}.json?icons={name}   -> { icons: { name: { body, width, height } } }

Los `body` usan fill="currentColor", así que se recolorean seteando el `color`
del SVG/elemento contenedor. Ideal para respetar la paleta de la animación.
"""

from __future__ import annotations

import httpx
from typing import Optional

ICONIFY_BASE = "https://api.iconify.design"
TIMEOUT = httpx.Timeout(8.0)

# Licencias SPDX seguras para uso comercial SIN atribución obligatoria.
COMMERCIAL_SAFE_SPDX = {
    "MIT", "Apache-2.0", "ISC", "CC0-1.0",
    "Unlicense", "BSD-3-Clause", "BSD-2-Clause",
}

# Permitidas comercialmente pero conviene atribuir al autor.
# Se marcan con attribution=True en la respuesta para decidir en el frontend.
ATTRIBUTION_SPDX = {"CC-BY-4.0", "CC-BY-3.0", "CC-BY-SA-4.0"}

# Sets preferidos: trazo limpio, monocromático, fáciles de recolorear y animar.
# Se priorizan en este orden cuando hay varios resultados para una búsqueda.
PREFERRED_PREFIXES = [
    "mdi", "tabler", "lucide", "ph", "mingcute",
    "solar", "material-symbols", "fluent", "ri", "carbon",
]

# Licencia conocida de sets populares: si la API no devuelve metadata de
# licencia (a veces pasa), igual aceptamos estos porque son comercial-seguros.
KNOWN_SAFE_PREFIXES = {
    "mdi": "Apache-2.0", "tabler": "MIT", "lucide": "ISC", "ph": "MIT",
    "mingcute": "Apache-2.0", "solar": "MIT", "material-symbols": "Apache-2.0",
    "fluent": "MIT", "ri": "Apache-2.0", "carbon": "Apache-2.0",
    "iconamoon": "MIT", "hugeicons": "MIT", "majesticons": "MIT",
}


async def _fetch_json(client: httpx.AsyncClient, url: str, params: dict | None = None):
    r = await client.get(url, params=params)
    r.raise_for_status()
    return r.json()


async def search_objects(query: str, limit: int = 24) -> list[dict]:
    """
    Busca objetos por texto y devuelve SOLO los de licencia comercial-segura.
    Pone primero los sets preferidos (trazo limpio, fácil de animar).

    Devuelve: [{ id, prefix, name, set, license, attribution, author }, ...]
    """
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Pedimos de más porque después filtramos por licencia.
        data = await _fetch_json(
            client, f"{ICONIFY_BASE}/search",
            params={"query": query, "limit": min(limit * 4, 120)},
        )

    collections = data.get("collections", {}) or {}
    results: list[dict] = []

    for icon_id in data.get("icons", []):
        prefix, _, name = icon_id.partition(":")
        info = collections.get(prefix, {}) or {}
        spdx = ((info.get("license") or {}).get("spdx")) or ""

        # Si la API no trajo licencia pero el set es conocido-seguro, lo aceptamos.
        if not spdx and prefix in KNOWN_SAFE_PREFIXES:
            spdx = KNOWN_SAFE_PREFIXES[prefix]

        if spdx not in COMMERCIAL_SAFE_SPDX and spdx not in ATTRIBUTION_SPDX:
            continue

        results.append({
            "id": icon_id,
            "prefix": prefix,
            "name": name,
            "set": info.get("name", prefix),
            "license": spdx or "unknown",
            "attribution": spdx in ATTRIBUTION_SPDX,
            "author": (info.get("author") or {}).get("name", ""),
        })

    # Priorizar sets preferidos sin perder el resto.
    def sort_key(it: dict) -> int:
        try:
            return PREFERRED_PREFIXES.index(it["prefix"])
        except ValueError:
            return len(PREFERRED_PREFIXES)

    results.sort(key=sort_key)
    return results[:limit]


async def get_icon_body(icon_id: str) -> Optional[dict]:
    """
    Devuelve el SVG crudo de un icono concreto ("mdi:cart"):
       { id, body, width, height, viewBox }
    El `body` son los <path>/<g> internos con fill="currentColor".
    Para usarlo:  <svg viewBox={viewBox} style={{color: '#0af'}}>{body}</svg>
    """
    prefix, _, name = icon_id.partition(":")
    if not prefix or not name:
        return None

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        data = await _fetch_json(
            client, f"{ICONIFY_BASE}/{prefix}.json",
            params={"icons": name},
        )

    icons = data.get("icons", {}) or {}
    if name not in icons:
        return None

    icon = icons[name]
    w = icon.get("width", data.get("width", 24))
    h = icon.get("height", data.get("height", 24))
    return {
        "id": icon_id,
        "body": icon["body"],
        "width": w,
        "height": h,
        "viewBox": f"0 0 {w} {h}",
    }


async def fetch_objects_for_prompt(queries: list[str]) -> dict[str, dict]:
    """
    Dado un set de conceptos (["shopping cart", "mouse cursor", "dollar"]),
    devuelve un dict listo para inyectar en el prompt de Haiku:

        { "shopping cart": { id, body, viewBox }, "dollar": {...}, ... }

    Toma el primer resultado comercial-seguro de cada concepto. Si una query
    no devuelve nada, simplemente se omite (la IA dibuja esa forma a mano).
    """
    out: dict[str, dict] = {}
    for q in queries:
        hits = await search_objects(q, limit=1)
        if not hits:
            continue
        body = await get_icon_body(hits[0]["id"])
        if body:
            out[q] = body
    return out


def build_objects_prompt_block(objects: dict[str, dict]) -> str:
    """
    Convierte el dict de fetch_objects_for_prompt en un bloque de texto para
    inyectar en el system/user prompt de Haiku. La IA recibe cada objeto como
    un SVG nombrado que DEBE usar y animar (en vez de dibujar formas a mano).
    """
    if not objects:
        return ""

    lines = [
        "OBJETOS VECTORIALES DISPONIBLES (usalos como elementos reales de la "
        "animación; podés escalarlos, moverlos, recolorearlos con `color`, "
        "y morphear/transicionar entre ellos):",
    ]
    for concept, obj in objects.items():
        lines.append(
            f'\n- "{concept}"  (viewBox="{obj["viewBox"]}"):\n'
            f'  <svg viewBox="{obj["viewBox"]}">{obj["body"]}</svg>'
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Router FastAPI — drop-in.
# En main.py:
#     from iconify_service import iconify_router
#     app.include_router(iconify_router)
# ---------------------------------------------------------------------------
from fastapi import APIRouter, Query, HTTPException

iconify_router = APIRouter(prefix="/api/svg", tags=["objetos"])


@iconify_router.get("/search")
async def api_search(q: str = Query(..., min_length=1), limit: int = 24):
    """Buscador de objetos para el picker del frontend."""
    return {"query": q, "objects": await search_objects(q, limit)}


@iconify_router.get("/icon")
async def api_icon(id: str = Query(...)):
    """Devuelve el SVG crudo de un objeto puntual (para preview o embed)."""
    body = await get_icon_body(id)
    if not body:
        raise HTTPException(status_code=404, detail=f"Objeto no encontrado: {id}")
    return body
