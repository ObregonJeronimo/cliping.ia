"""
lottie_manifest.py — construye la BIBLIOTECA (indice) de animaciones Lottie de urvid 1.0.
1) BUSCA en LottieFiles (matriz concepto x rubro) -> candidatos por rubro (rapido, sin bajar).
2) FETCH EN PARALELO + GATEA (determinismo: has_expressions) + FILTRO DE CALIDAD (tamano/dims/frames sanos) ->
   se queda con N BUENAS por rubro, enriquecidas con w/h/fps/frames. Asi el ruteo elige siempre una buena (la anim
   aparece CONFIABLE, no ~30% como con gate-en-runtime). El JSON igual se fetchea del CDN on-demand (manifiesto = metadata + url).
Escribe src/urvid/lottie/manifest.js (modulo JS). Uso: python tools/lottie_manifest.py [porRubro]
"""
import json, os, re, sys
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import backend.lottie_search as L

MANIFEST = os.path.join(ROOT, "src", "urvid", "lottie", "manifest.js")
os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)

# BLOCKLIST: ids curados a mano (visor "Lotties") que NO deben volver al regenerar. Ver tools/lottie_blocklist.txt.
_BL = os.path.join(ROOT, "tools", "lottie_blocklist.txt")
BLOCK = set()
if os.path.exists(_BL):
    with open(_BL, encoding="utf-8") as _f:
        BLOCK = {ln.strip() for ln in _f if ln.strip() and not ln.startswith("#")}
PER = int(sys.argv[1]) if len(sys.argv) > 1 else 200
DEFAULT_PER = max(PER, 250)
FIRST = 40
CAND_CAP = 460   # candidatos a fetchear/gatear por rubro (cap p/ acotar la red; ~70% pasan gate + filtro)

QUERIES = {
    "default": ["check mark success", "loading spinner", "arrow up", "star rating", "like heart", "notification bell",
                 "search find", "settings gear", "rocket launch", "thumbs up", "share", "message chat", "email send",
                 "calendar", "clock time", "download", "upload", "target goal", "trophy award", "idea lightbulb",
                 "team people", "handshake", "play button", "shield secure", "gift box", "location pin", "world globe",
                 "wifi", "sync refresh", "fire flame", "confetti celebration", "magic sparkle", "verified badge",
                 "lock unlock", "eye view", "filter sort", "menu list", "plus add", "trending", "growth arrow",
                 "phone call", "camera photo", "document file", "folder", "cloud", "battery", "bell ring", "tap click"],
    "finanzas": ["growth chart finance", "money coins", "dollar sign", "savings bank", "investment grow", "wallet pay",
                  "credit card", "percent discount", "financial graph up", "secure money lock", "bitcoin crypto",
                  "stock market", "calculator", "tax", "profit increase", "bank building", "exchange money", "piggy bank",
                  "balance scale", "invoice receipt", "insurance shield", "budget", "transfer money", "income chart"],
    "tech": ["cloud computing", "code programming", "data server", "ai robot", "network connect", "mobile app",
              "automation gear", "analytics dashboard", "api integration", "cyber security shield", "database",
              "cpu chip", "loading tech", "wifi signal", "bug fix", "rocket startup", "terminal console", "blockchain",
              "machine learning", "devops", "saas software", "responsive devices", "sync cloud", "encryption"],
    "inmobiliaria": ["house home", "key door", "building city", "for sale sign", "real estate agent", "sold house",
                      "house search", "apartment", "mortgage loan", "moving boxes", "blueprint plan", "skyline buildings",
                      "house location pin", "rent contract", "luxury home", "construction crane", "interior room",
                      "property tour", "garden house", "office building"],
    "salud": ["heartbeat health", "medical cross", "doctor care", "pill medicine", "wellness meditation", "hospital",
               "stethoscope", "health checkup", "vaccine syringe", "dna helix", "first aid kit", "dentist tooth",
               "mental health brain", "ambulance", "nurse", "health insurance", "blood drop", "virus protection",
               "telemedicine", "healthy heart"],
    "educacion": ["graduation cap", "book open reading", "online learning", "school education", "brain idea",
                   "certificate diploma", "study notes", "teacher class", "pencil write", "science experiment",
                   "math numbers", "library books", "elearning laptop", "quiz test", "language translate", "globe geography",
                   "kids learning", "scholarship", "lecture", "knowledge bulb"],
    "gastronomia": ["coffee cup", "pizza", "chef cooking", "food delivery", "restaurant plate", "burger", "wine glass",
                     "cake dessert", "ice cream", "sushi", "cocktail drink", "bakery bread", "salad healthy", "tea cup",
                     "barbecue grill", "menu order", "waiter service", "fast food", "fresh fruit", "kitchen utensils",
                     "taco mexican", "donut", "pancake breakfast"],
    "moda": ["shopping bag", "fashion clothes", "dress", "sale tag", "online shopping cart", "shoes sneakers", "style",
              "ecommerce", "tshirt", "handbag purse", "sunglasses", "jewelry ring", "fashion model", "discount offer",
              "wardrobe closet", "hanger clothes", "boutique", "trendy outfit", "shopping spree", "gift fashion"],
    "belleza": ["cosmetics beauty", "spa relax", "skincare drop", "makeup", "salon hair", "perfume", "nail polish",
                 "mirror", "lipstick", "face mask beauty", "hairdryer", "serum bottle", "lotion cream", "eyelashes",
                 "beauty sparkle", "massage", "soap bubbles", "facial treatment", "glow skin", "manicure"],
    "fitness": ["dumbbell workout", "running exercise", "yoga pose", "gym fitness", "sports", "cycling bike",
                 "muscle strong", "training", "stretching", "weight lifting", "treadmill cardio", "boxing", "swimming",
                 "heart rate fitness", "protein shake", "jump rope", "stopwatch timer sport", "trophy win sport",
                 "stretch warmup", "gym equipment"],
}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:56]


# fetch + gate + filtro de calidad de UN candidato. Devuelve el item enriquecido o None.
def vet(c):
    j = L.fetch_json(c["url"])
    if not j:
        return None
    if L.has_expressions(j):                                  # gate de determinismo
        return None
    w, h, fr = j.get("w"), j.get("h"), j.get("fr") or 30
    frames = (j.get("op") or 0) - (j.get("ip") or 0)
    if not (w and h):
        return None
    blob = json.dumps(j, separators=(",", ":"))
    if not (1500 < len(blob) < 320_000):                      # ni triviales ni pesadisimas
        return None
    if not (6 <= frames <= 360):                              # largo de loop sano
        return None
    ar = w / h
    if not (0.35 <= ar <= 3.2):                               # descarta muy panoramicas/altas (no encajan en el acento)
        return None
    return {**c, "w": w, "h": h, "fps": fr, "frames": round(frames, 1)}


seen, manifest, per = set(), [], {}
for rubro, qs in QUERIES.items():
    # 1) juntar candidatos del rubro (search, rapido)
    cands = []
    for q in qs:
        if len(cands) >= CAND_CAP:
            break
        try:
            res = L.search(q, FIRST)
        except Exception as e:
            print("search err", q, e); continue
        for r in res:
            rid = r.get("id") or r.get("jsonUrl")
            url = r.get("jsonUrl")
            if not rid or not url or rid in seen:
                continue
            seen.add(rid)
            cands.append({"id": slug((r.get("name") or "anim") + "-" + str(rid)), "name": (r.get("name") or "").strip()[:60],
                          "concept": slug(q.split()[0]), "rubro": rubro, "url": url, "author": r.get("author")})
            if len(cands) >= CAND_CAP:
                break
    # 2) fetch + gate + filtro EN PARALELO
    target = DEFAULT_PER if rubro == "default" else PER
    kept = 0
    with ThreadPoolExecutor(max_workers=24) as ex:
        for item in ex.map(vet, cands):
            if item and item["id"] not in BLOCK and kept < target:
                manifest.append(item); kept += 1
    per[rubro] = kept
    print(f"  {rubro:14} {kept}/{len(cands)} candidatos  (acumulado {len(manifest)})")

with open(MANIFEST, "w", encoding="utf-8") as f:
    f.write("// GENERADO por tools/lottie_manifest.py — no editar a mano. Pre-gateado (determinismo+calidad); JSON via CDN en runtime.\nexport default ")
    json.dump({"version": 3, "count": len(manifest), "items": manifest}, f, ensure_ascii=False)
    f.write("\n")
print(f"\nTOTAL: {len(manifest)} Lotties BUENAS (gateadas + filtradas) -> {MANIFEST}")
