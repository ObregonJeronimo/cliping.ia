"""
lottie_search.py — capa de RETRIEVAL de animaciones Lottie por concepto (POC 4).

Igual que iconify_service busca SVGs por palabra, esto busca animaciones Lottie en la API publica
GraphQL de LottieFiles (sin auth) y devuelve el jsonUrl (el JSON crudo reproducible por @remotion/lottie).
La IA elige por concepto/vibra (ej "growth", "check", "delivery") y el motor las compone como ACENTOS
sobre el fondo. Usa solo stdlib (urllib) -> sin dependencias nuevas en el backend.

OJO determinismo (gate): muchas Lotties del pool gratis traen EXPRESIONES/efectos que rompen el render
reproducible de Remotion. Por eso devolvemos jsonUrl (NO lottieUrl, que es dotLottie/zip) y el front/render
pasa cada JSON por el gate (lottieGate.js) antes de usarlo.
"""
import json
import urllib.request
import urllib.error

GRAPHQL = "https://graphql.lottiefiles.com/"

# searchPublicAnimations: busqueda publica; pedimos jsonUrl (crudo) + metadatos.
_QUERY = """
query Search($query: String!, $first: Int) {
  searchPublicAnimations(query: $query, first: $first) {
    edges {
      node {
        id
        name
        jsonUrl
        lottieUrl
        bgColor
        createdBy { username }
      }
    }
  }
}
"""


def search(query: str, first: int = 12, timeout: float = 12.0) -> list:
    """Devuelve [{id,name,jsonUrl,...}] para una query. [] si falla (nunca rompe el pipeline)."""
    body = json.dumps({"query": _QUERY, "variables": {"query": query, "first": int(first)}}).encode("utf-8")
    req = urllib.request.Request(GRAPHQL, data=body, headers={
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "urvid/1.0 (+lottie-search)",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as e:
        print(f"[lottie] search fallo: {e}")
        return []
    if data.get("errors"):
        print(f"[lottie] GraphQL errors: {data['errors']}")
        # puede que el schema haya cambiado; devolvemos lo que haya
    edges = (((data.get("data") or {}).get("searchPublicAnimations") or {}).get("edges")) or []
    out = []
    for e in edges:
        n = (e or {}).get("node") or {}
        if n.get("jsonUrl"):
            out.append({
                "id": n.get("id"), "name": n.get("name"),
                "jsonUrl": n.get("jsonUrl"), "bgColor": n.get("bgColor"),
                "author": (n.get("createdBy") or {}).get("username"),
            })
    return out


def fetch_json(url: str, timeout: float = 12.0):
    """Baja el JSON crudo de una Lottie (para gate/preview). None si falla."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "urvid/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print(f"[lottie] fetch_json fallo: {e}")
        return None


def has_expressions(lottie: dict) -> bool:
    """Gate de DETERMINISMO (espejo de lottieGate.js): True si la Lottie trae expresiones/efectos.
    Esas NO son reproducibles frame-a-frame en Remotion -> se descartan."""
    # compacto (sin espacios) para que el match '"x":"' funcione (json.dumps por defecto pone espacios)
    blob = json.dumps(lottie, separators=(",", ":"))
    if '"ef":' in blob or '"x":"' in blob:   # 'ef' = effects; 'x' string = expresion en una prop
        return True
    return False


if __name__ == "__main__":
    import sys
    q = sys.argv[1] if len(sys.argv) > 1 else "growth arrow"
    res = search(q, 12)
    print(f"query={q!r} -> {len(res)} resultados")
    for r in res[:12]:
        print(" -", (r["name"] or "")[:34].ljust(34), r["jsonUrl"])
    # --download <path>: baja la PRIMERA que pase el gate y la guarda (sample para el lab)
    if "--download" in sys.argv and res:
        path = sys.argv[sys.argv.index("--download") + 1]
        for r in res:
            j = fetch_json(r["jsonUrl"])
            if j and not has_expressions(j):
                json.dump(j, open(path, "w", encoding="utf-8"))
                print(f"OK guardado (gate pasado): {r['name']} -> {path}")
                break
            elif j:
                print(f"  (descartada por gate: {r['name']})")
