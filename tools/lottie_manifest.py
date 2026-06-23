"""
lottie_manifest.py - construye la BIBLIOTECA Lottie de urvid desde FUENTES 100% LIBRES DE LICENCIA (CC0 / dominio
publico / permisivas redistribuibles). Reemplaza el pipeline viejo que tiraba de LottieFiles (Lottie Simple License =
NO redistribuible). Las fuentes y la base legal viven en backend/lottie_cc0.py (registro de licencias).

Pasos:
1) JUNTA candidatos de cada fuente CC0 (hoy: Google Noto Animated Emoji, Apache-2.0). Cada candidato ya viene
   categorizado por rubro + concepto (alineado a ANIM_ROUTES de assemble.js).
2) DESCARGA el JSON en paralelo y lo SELF-HOSTEA en public/lottie/<dir>/<id>.json (frozen + propio; no dependemos
   del CDN ajeno en runtime; el manifiesto guarda la ruta local '/lottie/<dir>/<id>.json').
3) GATEA: determinismo (has_expressions) + calidad (tamano/dims/frames sanos) + IP estatico (ip_suspect).
4) Respeta la BLOCKLIST curada a mano (tools/lottie_blocklist.txt) y escribe los sospechosos de IP a
   tools/lottie_ip_review.txt (para revision visual antes de incluir, en fuentes con assets/texto).
5) ESCRIBE src/urvid/lottie/manifest.js (metadata + ruta local + source + license) y el REGISTRO de licencias
   tools/lottie_licenses.json (base legal por fuente).

Uso: python tools/lottie_manifest.py
"""
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import backend.lottie_cc0 as CC0
from backend.lottie_search import has_expressions   # gate de determinismo (espejo de lottieGate.js / player.js)

MANIFEST = os.path.join(ROOT, "src", "urvid", "lottie", "manifest.js")
LICENSES_OUT = os.path.join(ROOT, "tools", "lottie_licenses.json")
IP_REVIEW = os.path.join(ROOT, "tools", "lottie_ip_review.txt")
PUBLIC_LOTTIE = os.path.join(ROOT, "public", "lottie")

# carpeta self-host por fuente (corta, estable)
SOURCE_DIR = {"noto-animated-emoji": "noto"}

# BLOCKLIST: ids curados a mano (visor "Lotties") que NO deben volver al regenerar.
_BL = os.path.join(ROOT, "tools", "lottie_blocklist.txt")
BLOCK = set()
if os.path.exists(_BL):
    with open(_BL, encoding="utf-8") as _f:
        BLOCK = {ln.strip() for ln in _f if ln.strip() and not ln.startswith("#")}


def source_dir(source):
    return SOURCE_DIR.get(source, CC0.slug(source))


# descarga + self-host + gate + filtro de calidad + IP de UN candidato. Devuelve (item, ip_reasons) o (None, None).
def vet(c):
    src_dir = source_dir(c["source"])
    out_dir = os.path.join(PUBLIC_LOTTIE, src_dir)
    os.makedirs(out_dir, exist_ok=True)
    local_path = os.path.join(out_dir, c["id"] + ".json")
    rel_url = "/lottie/" + src_dir + "/" + c["id"] + ".json"

    if os.path.exists(local_path):                       # idempotente: ya bajado -> leer del disco
        try:
            with open(local_path, encoding="utf-8") as f:
                j = json.load(f)
        except Exception:
            j = CC0.fetch_json(c["url"])
    else:
        j = CC0.fetch_json(c["url"])
    if not j:
        return None, None

    if has_expressions(j):                               # gate de determinismo
        return None, None
    w, h, fr = j.get("w"), j.get("h"), j.get("fr") or 30
    frames = (j.get("op") or 0) - (j.get("ip") or 0)
    if not (w and h):
        return None, None
    blob = json.dumps(j, separators=(",", ":"))
    if not (1500 < len(blob) < 320_000):                 # ni triviales ni pesadisimas
        return None, None
    if not (6 <= frames <= 360):                         # largo de loop sano
        return None, None
    ar = w / h
    if not (0.35 <= ar <= 3.2):                          # descarta panoramicas/altas (no encajan en el acento)
        return None, None

    ip = CC0.ip_suspect(j, c.get("name", ""))            # P2: senal de IP/marca ajena (vacio = limpio)
    if "capa-de-texto" in ip:                            # un acento NO debe traer texto (calidad + IP) -> rechazo duro
        return None, None
    ip = [r for r in ip if r != "capa-de-texto"]         # el resto (imagen-embebida/marca) queda como flag a revisar

    if not os.path.exists(local_path):                   # persistir self-host (JSON compacto)
        with open(local_path, "w", encoding="utf-8") as f:
            f.write(blob)

    item = {"id": c["id"], "name": c["name"], "concept": c["concept"], "rubro": c["rubro"],
            "url": rel_url, "source": c["source"], "license": c["license"],
            "w": w, "h": h, "fps": fr, "frames": round(frames, 1)}
    return item, ip


def gather():
    """Candidatos de TODAS las fuentes CC0. (Hoy: Noto. Agregar fuentes nuevas = otra funcion candidates() aca.)"""
    cands = []
    cands += CC0.noto_candidates()
    cands += CC0.airbnb_candidates()
    return cands


def main():
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    os.makedirs(PUBLIC_LOTTIE, exist_ok=True)
    cands = gather()
    print(f"candidatos CC0: {len(cands)}")

    manifest, ip_flags, per = [], [], {}
    with ThreadPoolExecutor(max_workers=24) as ex:
        for c, (item, ip) in zip(cands, ex.map(vet, cands)):
            if not item or item["id"] in BLOCK:
                continue
            if ip:                                       # sospechoso de IP -> registrar para revision (no se excluye solo)
                ip_flags.append((item["id"], ",".join(ip)))
            manifest.append(item)
            per[item["rubro"]] = per.get(item["rubro"], 0) + 1

    # registro de IP a revisar
    with open(IP_REVIEW, "w", encoding="utf-8") as f:
        f.write("# Sospechosos de IP (parseo estatico). Revisar visualmente antes de confiar. id<TAB>razones\n")
        for i, r in ip_flags:
            f.write(f"{i}\t{r}\n")

    # REGISTRO DE LICENCIAS (base legal por fuente + conteo)
    used_sources = sorted({it["source"] for it in manifest})
    registry = {"generated_for": "urvid lottie library", "items": len(manifest), "sources": []}
    for s in used_sources:
        meta = dict(CC0.LICENSES.get(s, {"source": s, "license": "UNKNOWN"}))
        meta["items"] = sum(1 for it in manifest if it["source"] == s)
        registry["sources"].append(meta)
    with open(LICENSES_OUT, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
        f.write("\n")

    # MANIFIESTO (modulo JS)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        f.write("// GENERADO por tools/lottie_manifest.py desde fuentes CC0/permisivas (ver tools/lottie_licenses.json).\n"
                "// No editar a mano. Pre-gateado (determinismo + calidad + IP). JSON self-host en public/lottie/.\n"
                "export default ")
        json.dump({"version": 4, "count": len(manifest), "items": manifest}, f, ensure_ascii=False)
        f.write("\n")

    print(f"por rubro: {per}")
    print(f"IP a revisar: {len(ip_flags)} (ver {os.path.relpath(IP_REVIEW, ROOT)})")
    print(f"TOTAL: {len(manifest)} Lotties CC0 -> {os.path.relpath(MANIFEST, ROOT)}")
    print(f"registro de licencias -> {os.path.relpath(LICENSES_OUT, ROOT)}")


if __name__ == "__main__":
    main()
