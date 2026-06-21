"""
lottie_manifest.py — construye la BIBLIOTECA de animaciones Lottie de urvid 1.0.
Busca en LottieFiles por una matriz de concepto x rubro, FILTRA por el gate de determinismo
(has_expressions), deduplica, descarta las muy pesadas/raras, GUARDA cada JSON crudo como asset
estatico en public/lottie/<id>.json y escribe el indice en src/urvid/lottie/manifest.json
(metadata: id, name, concept, rubro, fps, frames, w, h, author). El motor las rendea con lottie-web
(goToAndStop por t = determinista) como acento; el front fetchea /lottie/<id>.json on-demand.
Uso: python tools/lottie_manifest.py [target]   (target = minimo de animaciones, default 180)
"""
import json, os, re, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)   # para importar backend.lottie_search corriendo como `python tools/...`
import backend.lottie_search as L

PUB = os.path.join(ROOT, "public", "lottie")
MANIFEST = os.path.join(ROOT, "src", "urvid", "lottie", "manifest.js")
os.makedirs(PUB, exist_ok=True)
os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)

PER = int(sys.argv[1]) if len(sys.argv) > 1 else 18          # objetivo por rubro especifico
DEFAULT_PER = 40                                              # 'default' (universales) lleva mas, sirven a todos

# matriz concepto x rubro. 'universal' = sirve a cualquier rubro ('*').
QUERIES = {
    "default": ["check mark success", "loading spinner", "arrow up growth", "star rating", "like heart",
                 "notification bell", "search find", "settings gear", "rocket launch", "thumbs up",
                 "share network", "message chat", "email send", "calendar date", "clock time",
                 "download", "target goal", "trophy award", "idea lightbulb", "team people",
                 "handshake deal", "play button", "location pin map", "world globe", "sync refresh"],
    "finanzas": ["growth chart finance", "money coins", "dollar sign", "savings bank", "investment grow",
                  "wallet pay", "credit card", "percent discount", "financial graph up", "secure money lock"],
    "tech": ["cloud computing", "code programming", "data server", "ai robot", "network connect",
              "mobile app", "automation", "analytics dashboard", "api integration", "cyber security shield"],
    "inmobiliaria": ["house home", "key door", "building city", "for sale sign", "real estate", "sold house", "house search", "apartment"],
    "salud": ["heartbeat health", "medical cross", "doctor care", "pill medicine", "wellness", "hospital", "stethoscope", "health checkup"],
    "educacion": ["graduation cap", "book open reading", "online learning", "school education", "brain idea", "certificate diploma", "study", "teacher class"],
    "gastronomia": ["coffee cup", "pizza", "chef cooking", "food delivery", "restaurant plate", "burger", "wine glass", "cake dessert"],
    "moda": ["shopping bag", "fashion clothes", "dress", "sale tag", "online shopping", "shoes", "style", "ecommerce cart"],
    "belleza": ["cosmetics beauty", "spa relax", "skincare", "makeup", "salon", "perfume", "nail polish", "mirror"],
    "fitness": ["dumbbell workout", "running exercise", "yoga", "gym fitness", "sports", "cycling", "muscle strong", "training"],
}

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:48]

seen, manifest = set(), []
per = {}

for rubro, qs in QUERIES.items():
    target = DEFAULT_PER if rubro == "default" else PER
    for q in qs:
        if per.get(rubro, 0) >= target: break
        try: res = L.search(q, 10)
        except Exception as e: print("search err", q, e); continue
        for r in res:
            if per.get(rubro, 0) >= target: break
            rid = r.get("id") or r.get("jsonUrl")
            if not rid or rid in seen: continue
            j = L.fetch_json(r["jsonUrl"])
            if not j: continue
            if L.has_expressions(j): continue                      # gate de determinismo
            fr, op = j.get("fr") or 30, j.get("op") or 0
            frames = op - (j.get("ip") or 0)
            if not (6 <= frames <= 360): continue                  # largo razonable de loop
            blob = json.dumps(j, separators=(",", ":"))
            if len(blob) > 400_000: continue                       # muy pesada
            seen.add(rid)
            fid = slug((r.get("name") or "anim") + "-" + str(rid))
            with open(os.path.join(PUB, fid + ".json"), "w", encoding="utf-8") as f: f.write(blob)
            manifest.append({
                "id": fid, "name": (r.get("name") or "").strip()[:60], "concept": slug(q.split()[0]),
                "rubro": rubro, "fps": fr, "frames": frames, "w": j.get("w"), "h": j.get("h"),
                "author": r.get("author"), "file": "/lottie/" + fid + ".json",
            })
            per[rubro] = per.get(rubro, 0) + 1
        time.sleep(0.05)
    print(f"  {rubro:14} acumulado={len(manifest)}")

with open(MANIFEST, "w", encoding="utf-8") as f:
    f.write("// GENERADO por tools/lottie_manifest.py — no editar a mano.\nexport default ")
    json.dump({"version": 1, "count": len(manifest), "items": manifest}, f, ensure_ascii=False)
    f.write("\n")

print(f"\nTOTAL: {len(manifest)} animaciones gateadas + guardadas en public/lottie/")
for rubro in QUERIES: print(f"  {rubro:14} {per.get(rubro,0)}")
print("manifiesto -> src/urvid/lottie/manifest.json")
