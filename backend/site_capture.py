"""
site_capture.py — Captura un screenshot del sitio del usuario para usarlo como
mockup real en la escena MockupShowcase.

Usa Playwright (Chromium headless). Es best-effort: si Playwright no está
instalado o falla, devuelve None y el render cae al dashboard genérico.

Setup en el backend (una vez):
    pip install playwright
    playwright install chromium
"""

from __future__ import annotations

import ipaddress
import socket
from pathlib import Path
from urllib.parse import urlparse

try:
    from playwright.async_api import async_playwright
    _PW_OK = True
except Exception as _e:  # pragma: no cover
    _PW_OK = False
    print(f"[capture] Playwright no disponible: {_e}")


# ---- SSRF GUARD --------------------------------------------------------------
# El backend abre Chromium contra una URL que viene del cliente, y corre detras de un tunel publico
# (ngrok/cloudflared) con CORS *. Sin validar, cualquiera puede apuntar a 169.254.169.254 (metadata de
# la nube), localhost, rangos RFC1918 o file:// y exfiltrar via screenshot/texto. Validamos ANTES de
# cargar: solo http/https, puerto estandar, y TODAS las IPs resueltas del host deben ser publicas.
_ALLOWED_SCHEMES = {"http", "https"}
_ALLOWED_PORTS = {80, 443, None}


def url_is_safe(url: str) -> tuple[bool, str]:
    """Devuelve (ok, motivo). Rechaza schemes raros, puertos no estandar y hosts que resuelven a IPs
    internas/no-ruteables (loopback/privadas/link-local/metadata/reservadas). Best-effort anti-SSRF."""
    try:
        u = urlparse((url or "").strip())
    except Exception:
        return False, "url ilegible"
    if u.scheme not in _ALLOWED_SCHEMES:
        return False, f"scheme no permitido: {u.scheme!r} (solo http/https)"
    host = u.hostname
    if not host:
        return False, "sin host"
    try:
        if u.port not in _ALLOWED_PORTS:
            return False, f"puerto no permitido: {u.port}"
    except ValueError:
        return False, "puerto invalido"
    default_port = 443 if u.scheme == "https" else 80
    try:
        infos = socket.getaddrinfo(host, u.port or default_port, proto=socket.IPPROTO_TCP)
    except Exception as e:
        return False, f"no resuelve el host: {e}"
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except Exception:
            return False, f"ip invalida: {ip_str}"
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped   # ::ffff:127.0.0.1 -> 127.0.0.1
        if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
                or ip.is_multicast or ip.is_unspecified):
            return False, f"ip interna/no-ruteable ({ip_str})"
    return True, "ok"


def _guard(url: str) -> bool:
    ok, why = url_is_safe(url)
    if not ok:
        print(f"[capture] URL rechazada (SSRF guard): {why} :: {url!r}")
    return ok


async def capture_site(url: str, out_path: str,
                       width: int = 1280, height: int = 900) -> str | None:
    """
    Captura el viewport superior del sitio (no la página entera, para que se vea
    como un 'hero' de la app). Devuelve out_path si salió bien, None si no.
    """
    if not _PW_OK or not url or not _guard(url):
        return None
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            # ignore_https_errors: muchos sitios legitimos tienen el cert vencido/mal (ERR_CERT_*); sin esto goto FALLA
            # y la captura vuelve vacia -> el brief se inventaria desde el nombre de marca (viola "fiel a la pagina").
            page = await browser.new_page(viewport={"width": width, "height": height},
                                          device_scale_factor=2, ignore_https_errors=True)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as ge:
                print(f"[capture] goto lento ({ge}); capturo lo que haya")
            await page.wait_for_timeout(2200)
            # Cerrar banners de cookies comunes (best-effort)
            for sel in ["#onetrust-accept-btn-handler", "button:has-text('Aceptar')",
                        "button:has-text('Accept')", "[aria-label*='accept' i]"]:
                try:
                    await page.click(sel, timeout=800)
                    break
                except Exception:
                    pass
            await page.screenshot(path=out_path, clip={"x": 0, "y": 0, "width": width, "height": height})
            await browser.close()
        return out_path if Path(out_path).exists() else None
    except Exception as e:
        print(f"[capture] error: {e}")
        return None


# JS que corre EN la página ya renderizada: junta texto visible + señales para el director.
_JS_EXTRACT = r"""
() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const txt = (el) => clean(el && el.innerText);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const meta = (sel, attr) => { const e = document.querySelector(sel); return e ? (e.getAttribute(attr) || '') : ''; };
  const headings = uniq([...document.querySelectorAll('h1,h2,h3')].map(txt)
    .filter(t => t.length >= 3 && t.length <= 90)).slice(0, 14);
  const nav = uniq([...document.querySelectorAll('nav a, header a')].map(txt)
    .filter(t => t.length >= 2 && t.length <= 26)).slice(0, 14);
  const ctas = uniq([...document.querySelectorAll('button, a.btn, a[class*="button" i], [role="button"]')].map(txt)
    .filter(t => t.length >= 2 && t.length <= 32)).slice(0, 10);
  const paragraphs = uniq([...document.querySelectorAll('p, li')].map(txt)
    .filter(t => t.length >= 30 && t.length <= 240)).slice(0, 14);
  // VOZ DEL CLIENTE: testimonios/reseñas reales -> dan el tono y los DOLORES del publico (no la voz de marketing de la
  // marca). Perception los usa para escribir un copy que suene como su cliente. Selectores semanticos + schema.org.
  const testimonials = uniq([...document.querySelectorAll(
    '[class*="testimonial" i], [class*="review" i], [class*="opinion" i], [class*="quote" i], blockquote, [itemprop="reviewBody" i]'
  )].map(txt).filter(t => t.length >= 20 && t.length <= 240)).slice(0, 6);
  let logoRaw = '';
  const ico = document.querySelector('link[rel*="apple-touch-icon" i]')
    || document.querySelector('meta[property="og:image"]')
    || document.querySelector('link[rel*="icon" i]');
  if (ico) logoRaw = ico.getAttribute('href') || ico.getAttribute('content') || '';
  let logo = '';
  try { logo = logoRaw ? new URL(logoRaw, location.href).href : ''; } catch (e) { logo = ''; }
  // ACENTO REAL por COMPUTED-STYLE: el color de marca VERDADERO suele ser el fill del CTA principal (no el theme-color,
  // que falta o es generico, ni el promedio del screenshot, que es ruidoso). Muestreamos botones/CTA, descartamos
  // gris/blanco/negro y elegimos el color mas saturado (el fill del boton pesa mas que su borde/texto). "" si no hay.
  let accentCss = '';
  try {
    const toHex = (rgb) => {
      const m = (rgb || '').match(/rgba?\(([^)]+)\)/); if (!m) return '';
      const p = m[1].split(',').map(x => parseFloat(x)); const a = p[3] == null ? 1 : p[3];
      if (a < 0.5 || p.length < 3) return '';
      return '#' + p.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    };
    const cand = [...document.querySelectorAll('button, a.btn, a[class*="button" i], [role="button"], a[class*="cta" i], [class*="primary" i]')].slice(0, 60);
    const score = {};
    for (const el of cand) {
      const r = el.getBoundingClientRect(); if (r.width < 40 || r.height < 16) continue;
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      for (const col of [bg, cs.borderColor, cs.color]) {
        const hex = toHex(col); if (!hex) continue;
        const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
        const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), chroma = (mx - mn) / 255, lum = (mx + mn) / 510;
        if (chroma < 0.18 || lum < 0.12 || lum > 0.92) continue;   // gris/blanco/negro -> no es acento de marca
        score[hex] = (score[hex] || 0) + chroma * (col === bg ? 2 : 1);   // el FILL del CTA pesa mas que borde/texto
      }
    }
    let best = -1; for (const h in score) if (score[h] > best) { best = score[h]; accentCss = h; }
  } catch (e) { accentCss = ''; }
  // DATOS DECLARADOS por la marca (structured data): JSON-LD + OpenGraph product + meta keywords. Definen con precision
  // rubro/precio/moneda/rating/region/B2B-B2C SIN que el modelo adivine -> mejor inferencia de AUDIENCIA (gama, poder
  // adquisitivo, region=moneda). Best-effort: cada parse va en try, una pagina sin structured data devuelve campos "".
  const ld = [];
  for (const s of document.querySelectorAll('script[type="application/ld+json" i]')) {
    try {
      const j = JSON.parse(s.textContent);
      const arr = Array.isArray(j) ? j : (j && j['@graph'] ? j['@graph'] : [j]);
      for (const o of arr) if (o && typeof o === 'object') ld.push(o);
    } catch (e) {}
    if (ld.length > 40) break;
  }
  const ldTypes = uniq([].concat(...ld.map(o => Array.isArray(o['@type']) ? o['@type'] : [o['@type']]))
    .filter(t => typeof t === 'string').map(t => t.toLowerCase())).slice(0, 8);
  let price = '', currency = '', priceRange = '', ratingVal = '', ratingCount = '', region = '';
  for (const o of ld) {
    const off = o.offers && (Array.isArray(o.offers) ? o.offers[0] : o.offers);
    if (!price && off && (off.price || off.lowPrice)) { price = String(off.price || off.lowPrice).slice(0, 16); currency = String(off.priceCurrency || '').slice(0, 6); }
    if (!priceRange && o.priceRange) priceRange = String(o.priceRange).slice(0, 16);
    const ar = o.aggregateRating;
    if (!ratingVal && ar && ar.ratingValue != null) { ratingVal = String(ar.ratingValue).slice(0, 6); ratingCount = String(ar.reviewCount || ar.ratingCount || '').slice(0, 8); }
    const addr = o.address && (Array.isArray(o.address) ? o.address[0] : o.address);
    if (!region && addr && typeof addr === 'object') region = clean([addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ')).slice(0, 50);
    if (!region && typeof o.areaServed === 'string') region = clean(o.areaServed).slice(0, 50);
  }
  if (!price) { price = clean(meta('meta[property="product:price:amount"]', 'content') || meta('meta[property="og:price:amount"]', 'content')).slice(0, 16); }
  if (!currency) { currency = clean(meta('meta[property="product:price:currency"]', 'content') || meta('meta[property="og:price:currency"]', 'content')).slice(0, 6); }
  const structured = {
    types: ldTypes,
    keywords: clean(meta('meta[name="keywords"]', 'content')).slice(0, 200),
    ogType: clean(meta('meta[property="og:type"]', 'content')).slice(0, 40),
    locale: clean(meta('meta[property="og:locale"]', 'content') || document.documentElement.lang).slice(0, 12),
    price, currency, priceRange, ratingValue: ratingVal, ratingCount, region,
  };
  return {
    lang: clean(document.documentElement.lang).slice(0, 5),
    title: clean(document.title),
    siteName: meta('meta[property="og:site_name"]', 'content'),
    description: clean(meta('meta[name="description"]', 'content') || meta('meta[property="og:description"]', 'content')).slice(0, 300),
    themeColor: meta('meta[name="theme-color"]', 'content'),
    accentCss,
    logo, headings, nav, ctas, paragraphs, testimonials, structured,
    bodyText: clean(document.body && document.body.innerText).slice(0, 4000),
  };
}
"""


# Extrae URLs de imágenes REALES del sitio (fotos de producto/hero), priorizando las grandes.
# Descarta iconos, data-URIs y svgs. Devuelve hasta 6 URLs absolutas, mayor área primero.
_JS_IMAGES = r"""
() => {
  const abs = (u) => { try { return new URL(u, location.href).href } catch (e) { return null } };
  // FILTRO DE CALIDAD/RELEVANCIA: descarta imagenes que NO son fotos de marca (mapas, sprites, iconos, ads,
  // tracking, placeholders) -> evita el bug de "screenshot de Google Maps / mi zona" y basura generica.
  const BAD = /staticmap|maps\.(googleapis|gstatic)|google\.com\/maps|\/maps[\/?]|mapbox|openstreetmap|tile(server)?s?[\/.]|\bsprite|favicon|apple-touch|\/icons?[\/_-]|[_-]icon\.|avatar|placeholder|spinner|loading|doubleclick|googlesyndication|google-analytics|\/ads?[\/_]|adservice|pixel\.|\/1x1|blank\.|spacer|logo[_-]?\d*\.(png|jpg|jpeg|webp)/i;
  const seen = new Set(); const out = [];
  const push = (u, area, w, h, rel) => {
    if (!u) return;
    const a = abs(u); if (!a) return;
    if (a.startsWith('data:')) return;
    if (a.toLowerCase().split('?')[0].endsWith('.svg')) return;
    if (BAD.test(a)) return;                                  // mapa/sprite/icono/ad/tracking
    if (w && h) { const ar = w / h; if (ar > 3.5 || ar < 0.25) return; }   // banners/tiras finas, no fotos
    if (seen.has(a)) return;
    seen.add(a); out.push({ u: a, area, ar: (w && h) ? w / h : null, rel: rel || 0 });
  };
  // de un srcset, la URL de mayor ancho declarado (suele ser la mejor calidad)
  const fromSrcset = (ss) => {
    if (!ss) return null; let best = null, bw = -1;
    ss.split(',').forEach(p => { const m = p.trim().split(/\s+/); const w = parseInt(m[1]) || 0; if (m[0] && w >= bw) { best = m[0]; bw = w; } });
    return best;
  };
  // RELEVANCIA de una <img>: alt con texto + estar dentro de main/article/figure/producto/hero = foto de contenido
  // (lo que le importa al comprador); estar en header/nav/footer = chrome decorativo -> penaliza.
  const relevance = (im) => {
    let rel = 0;
    const alt = (im.alt || '').toLowerCase();
    if (alt.length > 2) rel += 0.4;
    try { if (im.closest('main, article, figure, [class*="product" i], [class*="hero" i], [class*="gallery" i]')) rel += 0.6; } catch (e) {}
    try { if (im.closest('header, nav, footer')) rel -= 0.5; } catch (e) {}
    return rel;
  };
  const og = document.querySelector('meta[property="og:image"], meta[name="og:image"]');
  if (og && og.content) push(og.content, 5e9, 0, 0, 2);            // suele ser la mejor foto de marca (curada)
  for (const im of Array.from(document.images)) {
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    const r = im.getBoundingClientRect(); const rel = relevance(im);
    if (w >= 300 && h >= 200 && r.width >= 110) push(im.currentSrc || im.src, w * h, w, h, rel);
    // candidatos LAZY (fotos de producto servidas por Firebase suelen estar en srcset/data-src, aun SIN renderizar)
    push(fromSrcset(im.getAttribute('srcset') || im.getAttribute('data-srcset')), 9e5, 0, 0, rel);
    for (const at of ['data-src', 'data-original', 'data-lazy-src', 'data-lazy', 'data-image', 'data-bg']) push(im.getAttribute(at), 9e5, 0, 0, rel);
  }
  for (const s of Array.from(document.querySelectorAll('picture source'))) push(fromSrcset(s.getAttribute('srcset')), 9e5, 0, 0, 0);
  const els = Array.from(document.querySelectorAll('section,header,div,figure,a,li,article')).slice(0, 500);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 150) continue;
    const bg = getComputedStyle(el).backgroundImage;
    const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    if (m && m[1]) push(m[1], r.width * r.height, r.width, r.height, 0);
  }
  // RANKING final = area × aptitud-9:16 × (1 + relevancia). El retrato/cuadrado (no se recorta feo en vertical) sube;
  // el banner ancho baja. Asi el primer frame muestra el PRODUCTO relevante, no un fondo decorativo apaisado.
  const aspectFactor = (ar) => ar == null ? 1.0 : (ar <= 0.85 ? 1.35 : (ar <= 1.25 ? 1.12 : (ar <= 2.0 ? 0.8 : 0.5)));
  const rank = (x) => x.area * aspectFactor(x.ar) * (1 + 0.35 * x.rel);
  return out.sort((a, b) => rank(b) - rank(a)).slice(0, 18).map(x => x.u);
}
"""


async def extract_content(url: str) -> dict | None:
    """
    Carga la página con Chromium y extrae el texto YA RENDERIZADO (clave para sitios
    React/Vue/Next que devuelven HTML vacío en un GET crudo) + señales para el director:
    headings, nav, párrafos, CTAs, logo, theme-color e idioma. Best-effort: None si falla.
    """
    if not _PW_OK or not url or not _guard(url):
        return None
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            page = await browser.new_page(viewport={"width": 1280, "height": 900}, ignore_https_errors=True)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as ge:
                print(f"[extract] goto lento ({ge}); leo lo que haya")
            await page.wait_for_timeout(1800)
            data = await page.evaluate(_JS_EXTRACT)
            await browser.close()
        return data if isinstance(data, dict) else None
    except Exception as e:
        print(f"[extract] error: {e}")
        return None


async def capture_all(url: str, out_path: str, width: int = 1280, height: int = 900) -> dict:
    """UNA sola carga de Chromium: extrae el texto renderizado (content) Y saca el screenshot,
    en vez de abrir el navegador dos veces por video. Devuelve {'screenshot': path|None,
    'content': dict|None}. Best-effort: cualquier parte que falle vuelve None, no rompe."""
    out = {"screenshot": None, "content": None, "images": []}
    if not _PW_OK or not url or not _guard(url):
        return out
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            # ignore_https_errors: muchos sitios legitimos tienen el cert vencido/mal (ERR_CERT_*); sin esto goto FALLA
            # y la captura vuelve vacia -> el brief se inventaria desde el nombre de marca (viola "fiel a la pagina").
            page = await browser.new_page(viewport={"width": width, "height": height},
                                          device_scale_factor=2, ignore_https_errors=True)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as ge:
                print(f"[capture_all] goto lento ({ge}); sigo con lo que haya")
            # Cerrar cookies temprano (si las hay) para no taparle el hero al screenshot.
            for sel in ["#onetrust-accept-btn-handler", "button:has-text('Aceptar')",
                        "button:has-text('Accept')", "[aria-label*='accept' i]"]:
                try:
                    await page.click(sel, timeout=800)
                    break
                except Exception:
                    pass
            # Esperar a que la red se calme: hero, imágenes y FONDOS CSS terminan de cargar.
            # (Antes sacábamos la foto apenas cargaba el DOM y el hero salía vacío.)
            try:
                await page.wait_for_load_state("networkidle", timeout=9000)
            except Exception:
                pass
            # Forzar lazy-load de TODA la pagina: recorre el alto en pasos (asi cargan las fotos de producto
            # lazy/servidas por Firebase que estan fuera del primer viewport), despues vuelve arriba.
            try:
                await page.evaluate(
                    "async () => { const step = Math.max(500, Math.round(window.innerHeight * 0.85));"
                    " for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y);"
                    " await new Promise(r => setTimeout(r, 350)); } window.scrollTo(0, 0); }")
                await page.wait_for_timeout(900)
                try:
                    await page.wait_for_load_state("networkidle", timeout=6000)
                except Exception:
                    pass
            except Exception:
                pass
            # Esperar a que las <img> grandes (hero incluido) estén realmente cargadas.
            try:
                await page.wait_for_function(
                    "() => Array.from(document.images).filter(i=>i.width>200)"
                    ".every(i=>i.complete && i.naturalWidth>0)",
                    timeout=5000)
            except Exception:
                pass
            # SEÑAL CONCRETA (mejor que networkidle): esperar a que las WEBFONTS estén listas y APLICADAS antes del
            # screenshot. Si no, la foto sale con la fuente de fallback -> el modelo multimodal lee mal la tipografia
            # (y el FOUT cambia el layout del hero). document.fonts.ready es el gate real; va acotado por timeout.
            try:
                await page.evaluate(
                    "async () => { try { if (document.fonts && document.fonts.ready) "
                    "await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]); } catch (e) {} }")
            except Exception:
                pass
            await page.wait_for_timeout(900)
            try:
                data = await page.evaluate(_JS_EXTRACT)
                if isinstance(data, dict):
                    out["content"] = data
            except Exception as ee:
                print(f"[capture_all] extract: {ee}")
            try:
                imgs = await page.evaluate(_JS_IMAGES)
                if isinstance(imgs, list):
                    out["images"] = imgs
            except Exception as ie:
                print(f"[capture_all] images: {ie}")
            try:
                await page.screenshot(path=out_path, clip={"x": 0, "y": 0, "width": width, "height": height})
                if Path(out_path).exists():
                    out["screenshot"] = out_path
            except Exception as se:
                print(f"[capture_all] screenshot: {se}")
            await browser.close()
    except Exception as e:
        print(f"[capture_all] error: {e}")
    return out
