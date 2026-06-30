# e2e: captura una URL real -> perception -> brief. Imprime el brief y lo guarda para renderizar contact-sheet.
# Uso: python e2e_probe.py <url> [<url> ...]   (corre desde backend/, carga .env)
import asyncio, json, sys, os, uuid, urllib.parse
from dotenv import load_dotenv
load_dotenv()
import site_capture, perception

OUT = os.path.join(os.path.dirname(__file__), "..", "tools", "out")
os.makedirs(OUT, exist_ok=True)

async def probe(url):
    host = urllib.parse.urlparse(url).netloc.replace("www.", "").split(".")[0]
    try:
        site = await site_capture.capture_all(url, os.path.join(OUT, f"e2e_{host}.png"))
    except Exception as e:
        print(f"  [{host}] capture FALLO: {e}")
        site = {"screenshot": None, "content": None, "logo": "", "images": []}
    content = site.get("content") or {}
    cap_ok = bool(content.get("headings") or content.get("bodyText") or content.get("title"))
    try:
        brief = await perception.analyze_to_brief(url, "", site=site, usage=None)
    except Exception as e:
        print(f"  [{host}] perception FALLO: {e}")
        return
    # saca señales internas
    for k in ("_parse_ok", "_low_confidence"):
        brief.pop(k, None)
    path = os.path.join(OUT, f"e2e_{host}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(brief, f, ensure_ascii=False)
    c = brief.get("content", brief)
    print(f"\n===== {host}  (captura {'OK' if cap_ok else 'VACIA/botwall'}) =====")
    print(f"  brand={brief.get('brand')!r}  rubro={brief.get('rubro')!r}  tone={brief.get('tone')!r}  color={brief.get('brandColor')!r}")
    aud = brief.get("audience") or {}
    print(f"  audience: who={aud.get('who')!r} register={aud.get('register')!r} awareness={aud.get('awareness')!r}  lang={(content.get('lang') if content else None)!r}")
    print(f"  tagline={c.get('tagline')!r}")
    print(f"  claim={c.get('claim')!r}")
    print(f"  cta={c.get('cta')!r}")
    print(f"  bullets={c.get('bullets')}")
    print(f"  stats={c.get('stats')}")
    print(f"  proof={c.get('proof')!r}")
    print(f"  -> brief guardado: tools/out/e2e_{host}.json")

async def main():
    urls = sys.argv[1:]
    for u in urls:
        await probe(u)

asyncio.run(main())
