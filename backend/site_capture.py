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
import re
import socket
from pathlib import Path
from urllib.parse import urlparse

try:
    from playwright.async_api import async_playwright
    _PW_OK = True
except Exception as _e:  # pragma: no cover
    _PW_OK = False
    print(f"[capture] Playwright no disponible: {_e}")

try:
    from element_extract import extraer_elementos, publicar_elementos
except Exception as _ee:  # pragma: no cover
    # sin PIL o sin el modulo la captura sigue funcionando entera: los elementos son ADITIVOS y el
    # Director vuelve solo a dibujar sus figuras si no le llega ninguno
    async def extraer_elementos(page, max_n=0): return []
    async def publicar_elementos(els, d, p): return []
    print(f"[capture] extractor de elementos no disponible: {_ee}")

# Perfil de navegador REALISTA (anti bot-wall): el User-Agent headless de Playwright lo detectan muchos muros
# (Cloudflare/etc.) -> servian el "Just a moment..." o nada. Un UA de Chrome real + locale/timezone de AR hacen
# que la captura parezca un usuario real argentino -> mas sitios devuelven su contenido real. Best-effort.
_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
_CTX = dict(user_agent=_UA, locale="es-AR", timezone_id="America/Argentina/Buenos_Aires")

# JS heuristico: encuentra y clickea el boton de ACEPTAR cookies/consent por TEXTO (cubre banners NO listados que
# tapan el hero al screenshot). Prefiere botones dentro de un contenedor cookie/consent/gdpr. Best-effort, idempotente.
_JS_CONSENT = r"""
() => {
  const RX = /^(aceptar|acepto|aceptar todo|aceptar y cerrar|aceptar cookies|accept|accept all|allow all|entendido|de acuerdo|got it|ok|permitir|continuar|continue|estoy de acuerdo|i agree|i accept|agree|consent)$/i;
  const CONT = /cookie|consent|gdpr|privacy|banner|onetrust|cmp|didomi|cookiebot|truste/i;
  const els = [...document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')];
  let best = null, bs = -1;
  for (const el of els) {
    const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
    if (!t || t.length > 26 || !RX.test(t)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 20 || r.height < 12) continue;
    let s = 1, p = el;
    for (let i = 0; i < 6 && p; i++) { const id = (p.id || '') + ' ' + (p.className || ''); if (CONT.test(id)) { s += 3; break; } p = p.parentElement; }
    if (s > bs) { bs = s; best = el; }
  }
  if (best) { best.click(); return true; }
  return false;
}
"""
# El banner se OCULTA, no se acepta. Antes esto clickeaba "Accept" / "Aceptar" en el sitio del cliente,
# y eso es dar un consentimiento en nombre de alguien que no lo pidio, en una pagina de un tercero. No
# hace falta: para medir la pagina alcanza con sacar el overlay de nuestra propia vista. Tampoco se
# clickea "Rechazar", que tambien es una respuesta.
#
# Y ADEMAS ANDA MEJOR. El click dependia de encontrar un boton con el texto exacto; oatly.com usa
# CookieInformation, cuyo boton no dice "Accept" y cuyo dialogo tapa la pagina entera. Resultado: la
# captura media el aviso legal y no el sitio — las cinco frases del video salian del banner ("Cookie
# policy", "What is a cookie?", "How long are cookies stored?"). Ocultar el contenedor no depende del
# idioma ni del texto del boton.
_JS_OCULTAR_CONSENT = """() => {
  const NOMBRE = /cookie|consent|gdpr|ccpa|privacy|onetrust|cookiebot|didomi|usercentrics|trustarc|klaro|osano|quantcast|termly|\bcmp\b|\bcoi\b|privacidad|preferencias/i;
  const cand = [].slice.call(document.querySelectorAll(
    '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="gdpr" i],[class*="gdpr" i],' +
    '[id*="onetrust" i],[id*="cookiebot" i],[id*="didomi" i],[id*="usercentrics" i],[id*="coi" i],[class*="coi-" i],' +
    '[class*="cmp" i],[role="dialog"],[role="alertdialog"],[aria-modal="true"],[role="banner"]'), 0, 500);
  let n = 0;
  for (const el of cand) {
    let r = null, cs = null;
    try { r = el.getBoundingClientRect(); cs = getComputedStyle(el); } catch (e) { continue; }
    if (!r || r.width < 120 || r.height < 40) continue;
    const cls = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : (el.className || ''));
    const firma = (el.id || '') + ' ' + cls + ' ' + (el.getAttribute('aria-label') || '');
    let txt = ''; try { txt = (el.innerText || '').slice(0, 500); } catch (e) {}
    const porNombre = NOMBRE.test(firma), porTexto = NOMBRE.test(txt);
    const esDialogo = ['dialog', 'alertdialog', 'banner'].indexOf(el.getAttribute('role') || '') >= 0 || el.getAttribute('aria-modal') === 'true';
    const pegado = cs && (cs.position === 'fixed' || cs.position === 'sticky');
    // Dos señales, nombre/texto y forma: hay marcas cuyo producto se llama "cookie" y banners de
    // novedades que no son consentimiento. Sin la segunda condicion se podria ocultar media pagina.
    if (!((porNombre || porTexto) && (esDialogo || pegado))) continue;
    try { el.style.setProperty('display', 'none', 'important'); n++; } catch (e) {}
  }
  // Muchos CMP bloquean el scroll del documento mientras el aviso esta abierto. Ocultandolo sin soltar
  // el scroll, el paso de lazy-load no recorre la pagina y la captura se queda con el primer viewport.
  try {
    for (const el of [document.documentElement, document.body]) {
      el.style.setProperty('overflow', 'auto', 'important');
      el.style.setProperty('position', 'static', 'important');
    }
  } catch (e) {}
  return n;
}"""


async def _dismiss_consent(page):
    """OCULTA el aviso de cookies/consent para poder medir la pagina. No lo acepta ni lo rechaza."""
    try:
        n = await page.evaluate(_JS_OCULTAR_CONSENT)
        if n:
            print(f"[capture_all] aviso de consentimiento oculto ({n} bloque/s) — no se acepto nada")
    except Exception:
        pass
    try:
        await page.evaluate(_JS_CONSENT)
    except Exception:
        pass


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


# ---- PEEK SURGICAL (item L348): mirar /nosotros o /precios si el home trae poca señal, O si es rico pero le FALTA el precio ----
_PEEK_RE = re.compile(r"(nosotros|about|qui[eé]nes|equipo|precios|pricing|planes|plans|productos|servicios|company)", re.I)
_PRICE_LINK_RE = re.compile(r"(precios|pricing|planes|plans|tarifas?|price)", re.I)   # links a la pagina de PRECIOS
# monto monetario en texto: (simbolo/codigo de moneda + numero) o (numero + codigo). Grupo 1/2 = el numero.
_MONEY_RE = re.compile(
    r"(?:US\$|U\$S|AR\$|R\$|\$|€|£|USD|ARS|EUR|MXN|CLP|COP|BRL)\s?(\d[\d.,]*)"
    r"|(\d[\d.,]*)\s?(?:usd|ars|eur|mxn|clp|cop|brl|€|pesos|d[oó]lares|reais)\b",
    re.I,
)
# periodicidad/recurrencia: lo que, CERCA de un monto, delata que es precio de un PLAN (no un mockup ni un precio de producto suelto).
_PERIOD_RE = re.compile(
    r"(/\s?mes\b|/\s?mo\b|/\s?month\b|\bpor\s+mes\b|\bmensual|/\s?a[nñ]o\b|/\s?year\b|\banual|/\s?usuario\b|/\s?user\b|per\s+(?:member|user|month|seat)|/\s?seat\b)",
    re.I,
)


def _bare_host(netloc: str) -> str:
    h = (netloc or "").lower()
    return h[4:] if h.startswith("www.") else h


def _is_sparse(content: dict) -> bool:
    """El HOME trae POCA señal (landing minima / hero sin cuerpo) -> vale mirar /nosotros o /precios. PURO (testeable)."""
    if not isinstance(content, dict):
        return False
    body = content.get("bodyText") or ""
    heads = content.get("headings") or []
    paras = content.get("paragraphs") or []
    return len(body) < 600 and (len(heads) + len(paras)) < 8


def _home_plan_prices(content: dict) -> int:
    """Nº de MONTOS de precio DISTINTOS en el home que parecen de un PLAN: un monto monetario con un token de
    periodicidad (/mes, /año, per user...) a <=30 chars. Distingue una tabla de planes real de una promo/mockup
    suelto (Shopify: 'US$125' x6 sin '/mes' = 0; Tiendanube: '$26.999/mes' x3 = 3). PURO (testeable)."""
    if not isinstance(content, dict):
        return 99
    blob = " ".join([content.get("bodyText") or ""] + list(content.get("headings") or []) + list(content.get("paragraphs") or []))
    seen = set()
    for m in _MONEY_RE.finditer(blob):
        amt = m.group(1) or m.group(2) or ""
        norm = re.sub(r"[.,]", "", amt).lstrip("0") or "0"          # normaliza miles/decimales para comparar montos ($26.999 -> 26999)
        lo, hi = max(0, m.start() - 30), min(len(blob), m.end() + 30)
        if _PERIOD_RE.search(blob[lo:hi]):                          # solo cuenta si hay periodicidad cerca -> es de plan, no un precio suelto
            seen.add(norm)
    return len(seen)


def _home_has_price(content: dict) -> bool:
    """El home YA muestra su PRICING real -> no hace falta peekear /precios. True si:
    (a) la marca DECLARA precio en structured data (JSON-LD Offer / og:price), o
    (b) hay >=2 montos de plan DISTINTOS (monto + periodicidad). Una promo suelta ('$1/mes') o un mockup NO alcanzan. PURO."""
    if not isinstance(content, dict):
        return True
    st = content.get("structured") or {}
    if isinstance(st, dict) and (str(st.get("price") or "").strip() or str(st.get("priceRange") or "").strip()):
        return True                                                 # precio declarado por la marca -> el home ya tiene pricing
    return _home_plan_prices(content) >= 2


def _peek_url(nav_links, base_url: str, regex=_PEEK_RE):
    """El PRIMER link de nav/footer que matchee `regex` (por defecto /nosotros|precios|...) y sea del MISMO dominio
    (anti-SSRF / no salir del sitio). None si no hay. PURO (testeable sin browser)."""
    base = _bare_host(urlparse((base_url or "").strip()).netloc)
    for lk in (nav_links or []):
        if not isinstance(lk, dict):
            continue
        href = (lk.get("h") or "").strip()
        if not href or not (regex.search(href) or regex.search(lk.get("t") or "")):
            continue
        try:
            h = urlparse(href)
        except Exception:
            continue
        if h.scheme not in ("http", "https"):
            continue
        host = _bare_host(h.netloc)
        if host and host != base:   # mismo dominio: no salir del sitio ni pegarle a otro host
            continue
        return href
    return None


def _merge_peek(home: dict, extra: dict, peek_url: str) -> dict:
    """Fusiona el texto de la pagina peekeada en el content del HOME (dedup + capeado). El home conserva screenshot/logo/images."""
    if not isinstance(extra, dict) or not isinstance(home, dict):
        return home
    out = dict(home)
    for k, cap in (("headings", 20), ("titulares", 16), ("paragraphs", 30), ("testimonials", 12), ("ctas", 14)):
        a = list(home.get(k) or [])
        seen = set(a)
        for x in (extra.get(k) or []):
            if x and x not in seen and len(a) < cap:
                a.append(x)
                seen.add(x)
        out[k] = a
    eb = (extra.get("bodyText") or "").strip()
    if eb:
        tag = urlparse(peek_url).path.strip("/") or "peek"
        out["bodyText"] = ((home.get("bodyText") or "") + f"\n\n[/{tag}] " + eb)[:6000]
    out["peekedFrom"] = peek_url
    return out


# NOTA: capture_site (screenshot-only) se ELIMINO por codigo muerto (0 callers; el pipeline vivo usa capture_all, que
# captura screenshot+contenido+imagenes en UNA sola carga). extract_content (content-only) queda porque lo usa el
# pipeline Remotion LEGACY (template_director.py). Si se retira ese legacy, extract_content tambien puede borrarse.


# JS que corre EN la página ya renderizada: junta texto visible + señales para el director.
_JS_EXTRACT = r"""
() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const txt = (el) => clean(el && el.innerText);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const meta = (sel, attr) => { const e = document.querySelector(sel); return e ? (e.getAttribute(attr) || '') : ''; };
  // NADA QUE VIVA ADENTRO DE UN AVISO DE COOKIES CUENTA COMO CONTENIDO DE LA PAGINA.
  //
  // La captura ya oculta el aviso antes de medir, y eso alcanza para `bodyText` —innerText respeta el
  // display—. Pero varios CMP se vuelven a mostrar despues del barrido de lazy-load, y entonces sus
  // <h2> entran como si fueran titulos de la marca. En oatly.com el video terminaba hablando de
  // cookies: "Cookie policy", "What is a cookie?", "How long are cookies stored?". La regla
  // anti-invencion funcionaba perfecto —solo uso lo que la pagina decia—; lo que decia era el aviso.
  //
  // Este filtro mira los ANCESTROS y no el momento, asi que no depende de si el aviso volvio a
  // aparecer. Es la red que atrapa lo que al ocultado se le escapa.
  const AVISO = /cookie|consent|gdpr|ccpa|onetrust|cookiebot|didomi|usercentrics|trustarc|klaro|osano|quantcast|termly|coi-|coibanner|coioverlay|cmp-/i;
  const enAviso = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const c = String(n.className && n.className.baseVal !== undefined ? n.className.baseVal : (n.className || ''));
      if (AVISO.test((n.id || '') + ' ' + c)) return true;
    }
    return false;
  };
  const headings = uniq([...document.querySelectorAll('h1,h2,h3')].filter(el => !enAviso(el)).map(txt)
    .filter(t => t.length >= 3 && t.length <= 90)).slice(0, 14);
  // TITULARES: el texto de los enlaces que son NOTAS, no navegacion.
  //
  // En un medio, los <h2> son nombres de SECCION ("Most Popular", "Latest from Tech") y el contenido
  // de verdad vive en los enlaces de las tarjetas. Sin esto, el video de theverge.com salia diciendo
  // "Most Popular" y "Staff picks" como si fueran lo que la marca hace — nombres de mueble, no de
  // producto. Un medio no tiene features; tiene titulares, y son lo unico suyo que hay para mostrar.
  //
  // Se distinguen de la navegacion por tres cosas a la vez, y hacen falta las tres: viven dentro de
  // main/article/una tarjeta, miden como una frase (30 a 120) y tienen mas de tres palabras. Un item
  // de menu cumple como mucho una.
  const titulares = uniq([...document.querySelectorAll(
      'main a, article a, [class*="card" i] a, [class*="story" i] a, [class*="post" i] a')]
    .filter(a => { try { return !a.closest('nav, header, footer, aside') } catch (e) { return true } })
    .map(txt)
    .filter(t => t.length >= 30 && t.length <= 120 && t.split(/\s+/).length >= 4
      && !/^(ver|leer|read|see|more|mas|subscribe|suscrib)/i.test(t))).slice(0, 16);
  const nav = uniq([...document.querySelectorAll('nav a, header a')].map(txt)
    .filter(t => t.length >= 2 && t.length <= 26)).slice(0, 14);
  // navLinks (item L348): texto + href absoluto de nav/header/footer -> el peek surgical elige /nosotros|/precios. Dedup por href.
  const _seenH = new Set();
  const navLinks = [...document.querySelectorAll('nav a, header a, footer a')]
    .map(a => ({ t: clean(a.innerText).slice(0, 40), h: a.href || '' }))
    .filter(x => { if (!x.h || _seenH.has(x.h)) return false; _seenH.add(x.h); return true; })
    .slice(0, 40);
  // CTAs. La primera version buscaba por SELECTOR —button, .btn, [role=button]— y se perdia el boton
  // principal de media web moderna: con Tailwind y compania, el CTA es un <a> con clases de utilidad y
  // ninguna se llama "button". Medido en tailwindcss.com: su "Get started" no llegaba, y el video
  // salia sin llamada a la accion.
  //
  // Un humano no reconoce un boton por su etiqueta HTML: lo reconoce porque tiene FONDO PROPIO y
  // relleno alrededor del texto. Eso es lo que se mide acá. Se recorren como mucho 400 enlaces para no
  // pagar un getComputedStyle por cada uno de los miles que tiene un portal.
  const pareceBoton = (el) => {
    try {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor || '';
      const m = bg.match(/rgba?\(([^)]+)\)/);
      if (!m) return false;
      const p = m[1].split(',').map(Number);
      if (p.length > 3 && p[3] < 0.35) return false;           // fondo transparente: es texto, no boton
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      return padX >= 14 && padY >= 8;
    } catch (e) { return false }
  };
  const porEstilo = [...document.querySelectorAll('a')].slice(0, 400)
    .filter(a => { try { return !a.closest('nav, footer') } catch (e) { return true } })
    .filter(pareceBoton);
  const ctas = uniq([...document.querySelectorAll('button, a.btn, a[class*="button" i], [role="button"]')]
    .concat(porEstilo).map(txt)
    .filter(t => t.length >= 2 && t.length <= 32)).slice(0, 14);
  const paragraphs = uniq([...document.querySelectorAll('p, li')].filter(el => !enAviso(el)).map(txt)
    .filter(t => t.length >= 30 && t.length <= 240)).slice(0, 14);
  // VOZ DEL CLIENTE: testimonios/reseñas reales -> dan el tono y los DOLORES del publico (no la voz de marketing de la
  // marca). Perception los usa para escribir un copy que suene como su cliente. Selectores semanticos + schema.org.
  // LA FIRMA VIAJA CON LA CITA, Y NO ES UN ADORNO. Medido en linear.app: las tres citas estan firmadas en la pagina
  // ("Gabriel Peal, Staff Software Engineer, OpenAI" / "Nik Koblov, Head of Engineering, Ramp"), pero el <blockquote>
  // que matchea el selector contiene SOLO la cita — el nombre vive en un hermano. Capturando la cita sola, el modelo
  // recibia tres testimonios huerfanos y llenaba el casillero de autor con un generico ("Linear customer"): perdiamos
  // al ingeniero de OpenAI que avala el producto —la prueba social mas fuerte de esa pagina— y ADEMAS publicabamos
  // una atribucion que la pagina nunca hizo. La regla anti-invencion ya estaba escrita en el prompt; lo que faltaba
  // era que hubiera algo que leer. Se busca la firma en el contenedor de la cita y se PEGA al final, que es
  // exactamente la forma en que otras paginas (basecamp.com, 7 de 7) ya la sirven: asi aguas abajo hay un solo
  // criterio de lectura y no dos caminos que mantener.
  const CITA_SEL = '[class*="testimonial" i], [class*="review" i], [class*="opinion" i], [class*="quote" i], blockquote, [itemprop="reviewBody" i]';
  const FIRMA_SEL = 'figcaption, cite, footer, [class*="author" i], [class*="autor" i], [class*="byline" i], [class*="role" i], [class*="cargo" i]';
  const firmaDe = (el) => {
    // SE TREPA DE A UN NIVEL, Y SE FRENA EN SECO AL LLEGAR AL GRUPO. Medido en basecamp.com: buscando la firma en
    // "el contenedor" a secas, se llegaba al carrusel que agrupa los siete testimonios y se devolvia la PRIMERA
    // firma que hubiera ahi — o sea la de otra persona. La cita de Patrick Sheffield salia firmada por Aaron
    // Bingaman. Atribuirle a alguien palabras que dijo otro es peor que no tener firma: es el unico error de esta
    // familia que ademas de mentir sobre la marca, mete a un tercero real en el medio.
    // La condicion de corte es contar citas: un contenedor que abarca mas de una NO es el de esta cita, y sus
    // firmas pertenecen a las otras.
    let n = el.parentElement;
    for (let i = 0; i < 3 && n; i++, n = n.parentElement) {
      if (n.querySelectorAll(CITA_SEL).length > 1) return '';
      let mejor = '';
      for (const f of n.querySelectorAll(FIRMA_SEL)) {
        if (el.contains(f)) continue;            // lo que esta DENTRO de la cita es cita, no firma
        // NOMBRE Y EMPRESA SE UNEN CON COMA, y no es cosmetica. Cuando la firma esta armada con dos <span> en
        // linea, innerText los pega sin separador y sale "Gabriel PealOpenAI": eso se publicaria asi, tal cual,
        // debajo de la cita. Se leen las partes y se unen, que ademas deja la forma "Nombre, Empresa" que el
        // lector de aguas abajo ya sabe cortar cuando no entra.
        const partes = [...f.children].map(txt).filter(Boolean);
        const t = partes.length >= 2 ? partes.join(', ') : txt(f);
        // La mas COMPLETA de las candidatas: en linear.app conviven la version corta y "Gabriel Peal, Staff
        // Software Engineer, OpenAI", y la segunda es la que dice quien es la persona.
        if (t && t.length >= 3 && t.length <= 60 && t.length > mejor.length) mejor = t;
      }
      if (mejor) return mejor;
    }
    return '';
  };
  const testimonials = uniq([...document.querySelectorAll(
    '[class*="testimonial" i], [class*="review" i], [class*="opinion" i], [class*="quote" i], blockquote, [itemprop="reviewBody" i]'
  )].map(el => {
    const cita = txt(el);
    const firma = firmaDe(el);
    // Si el contenedor ya traia la firma adentro (el caso basecamp), pegarla otra vez la duplicaria.
    return (cita && firma && !cita.includes(firma)) ? (cita + ' ' + firma) : cita;
  }).filter(t => t.length >= 20 && t.length <= 240)).slice(0, 6);
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
    logo, headings, titulares, nav, navLinks, ctas, paragraphs, testimonials, structured,
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
  const push = (u, area, w, h, rel, alt) => {
    if (!u) return;
    const a = abs(u); if (!a) return;
    if (a.startsWith('data:')) return;
    if (a.toLowerCase().split('?')[0].endsWith('.svg')) return;
    if (BAD.test(a)) return;                                  // mapa/sprite/icono/ad/tracking
    if (w && h) { const ar = w / h; if (ar > 3.5 || ar < 0.25) return; }   // banners/tiras finas, no fotos
    if (seen.has(a)) return;
    seen.add(a); out.push({ u: a, area, ar: (w && h) ? w / h : null, rel: rel || 0, alt: (alt || '').toLowerCase() });
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
  if (og && og.content) push(og.content, 9e5, 0, 0, 1.2);          // og suele ser curada PERO a veces es un logo/social-card -> area moderada (no inalcanzable) para que una foto real de producto la pueda superar
  for (const im of Array.from(document.images)) {
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    const r = im.getBoundingClientRect(); const rel = relevance(im);
    if (w >= 300 && h >= 200 && r.width >= 110) push(im.currentSrc || im.src, w * h, w, h, rel, im.alt);
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
  // DEMOTE suave de LOGOS / og-social-cards (no exclusion: si es el unico candidato igual se usa). Asi el showcase
  // (slot-media) muestra una FOTO de producto, no el logo. (favicon/sprite/apple-touch ya los excluye BAD arriba.)
  const LOGOISH = /logo|brandmark|wordmark|\bog[-_]|opengraph|social[-_]?card|\bshare\b|badge|\bseal\b/i;
  const logoFactor = (x) => {
    let f = 1;
    if (LOGOISH.test(x.u + ' ' + (x.alt || ''))) f *= 0.18;
    if (x.ar != null && x.ar > 0.85 && x.ar < 1.18) f *= 0.8;   // cuadrado-chico tiende a logo/icono
    return f;
  };
  const rank = (x) => x.area * aspectFactor(x.ar) * (1 + 0.35 * x.rel) * logoFactor(x);
  return out.sort((a, b) => rank(b) - rank(a)).slice(0, 18).map(x => x.u);
}
"""


# ============================================================================================
# DNA VISUAL (pagemodel.v1 · docs/director/DNA-SPEC.md §2) — F1/C1
# ============================================================================================
# POR QUE existe: el motor Director necesita que el video se SIENTA de la misma familia que la
# pagina del cliente. Ese "adjetivo" se MIDE (Playwright, $0, determinista), no se le pregunta a un
# LLM: medir es gratis, exacto y repetible; adivinar es caro y distinto en cada corrida.
#
# PRECONDICION DURA — VIEWPORT 1280x900: TODOS los umbrales de abajo estan calibrados a ese ancho
# (areas relativas al viewport, h1Ratio contra 1280, rejilla de densidad de 64x45 celdas). Cambiar el
# viewport NO rompe el codigo pero SI invalida la calibracion: hay que recalibrar §2 entera.
#
# PRECONDICIONES DE MOMENTO (§2.0), verificadas en capture_all:
#   1) window.scrollY === 0            -> el DNA es el del PRIMER viewport, no el de la mitad de la pagina
#   2) document.fonts.ready resuelto   -> si no, fontFamily computa el fallback y displayHint sale mal
#   3) banner de consentimiento cerrado-> si no, medimos el diseño del CMP, no el de la marca
#   4) ANTES del bloque `peek`         -> el peek NAVEGA a otra URL (/precios, /nosotros): medir despues
#      seria medir OTRA pagina del sitio. Es la trampa mas facil de reintroducir al mover el peek.
#
# El bloque devuelto es CRUDO: la normalizacion/sanidad (§3: hex, clamps, contraste, acromatismo,
# accent2 derivado) corre en Python (backend/pagemodel.py) porque asi es testeable SIN browser.

_JS_DNA = r"""
() => {
  'use strict';
  // ---- UMBRALES NOMBRADOS (§2). Calibrados a viewport 1280x900 (ver comentario en Python). ----
  const K = {
    POOL_SCAN: 4000, POOL_MAX: 1200, LADO_MIN: 8, PROF_VP: 2,          // universo de muestreo (§2.1)
    CAP_BTN: 60, CAP_CARD: 80, CAP_TXT: 300, CAP_TIT: 20, CAP_IMG: 40,
    BTN_W: 40, BTN_H: 16, CARD_AREA: 0.02, IMG_NAT_W: 120,
    ACC_A: 0.5, ACC_CHROMA: 0.18, ACC_LUM_LO: 0.12, ACC_LUM_HI: 0.92, // accent (§2.3)
    ACC_AREA_REF: 20000, BK_H: 12, BK_S: 0.12, BK_L: 0.10,
    ACC2_DHUE: 25, ACC2_SCORE: 0.25,
    BG_AREA: 0.06, BG_A: 0.9,                                          // bg (§2.3)
    WR_DEF: 0.66, WR_COND: 0.56, WR_ROUND: 0.74,                       // typography (§2.4)
    CASE_UPPER: 0.40, CASE_TITLE: 0.60, SCRIPT_MIN: 0.30,
    BORD_FRAC: 0.25, BORD_HAIR: 1.5, BORD_A: 0.05, BORD_CONTR: 1.15,   // shape (§2.5)
    SOMB_FRAC: 0.25, SOMB_SOFT: 12, SOMB_HARD_BLUR: 6, SOMB_HARD_OFF: 2, SOMB_A: 0.04,
    CELDA: 20,                                                          // density (§2.6)
    GLASS_BLUR: 4, GLASS_A_LO: 0.03, GLASS_A_HI: 0.85, GLASS_AREA: 0.02,   // modernidad (§2.8)
    BENTO_HIJOS: 4, BENTO_RAD: 8, BENTO_VAR: 1.6,
    BIG_PIVOTE: 0.030, BIG_PASO: 0.030,
    EDIT_MAYOR: 0.22, EDIT_GRANDE: 0.04, EDIT_RATIO: 0.8,
    MESH_PORT: 0.40, MESH_BLOB_BLUR: 40, MESH_BLOB_CHROMA: 0.2, MESH_STOPS: 3,
    BRUT_BORD: 3, BRUT_RAD: 4, BRUT_BLUR: 2, BRUT_CONTR: 12,
    BRUT_CHROMA: 0.55, BRUT_LUM_LO: 0.35, BRUT_LUM_HI: 0.75,
    MOD_ENTRA: 0.5, MOD_MAX: 3,
    TXT_MIN: 200, TXT_NODOS: 5,                                         // señal insuficiente (§3.5)
  };

  const t0 = Date.now();
  const notas = [];
  const nota = (s) => { s = String(s).slice(0, 120); if (notas.length < 12 && notas.indexOf(s) < 0) notas.push(s); };

  const VW = Math.max(320, window.innerWidth || 1280);
  const VH = Math.max(320, window.innerHeight || 900);
  const VAREA = VW * VH;

  const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
  const r2 = (v) => (isFinite(v) ? Math.round(v * 100) / 100 : 0);
  const median = (xs) => { const s = xs.filter(isFinite).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  // mediana PONDERADA: el elemento donde la suma acumulada de pesos cruza la mitad del total.
  const medianW = (pairs) => {
    const s = pairs.filter(p => isFinite(p[0]) && p[1] > 0).sort((a, b) => a[0] - b[0]);
    if (!s.length) return null;
    const tot = s.reduce((a, p) => a + p[1], 0); let acc = 0;
    for (const p of s) { acc += p[1]; if (acc >= tot / 2) return p[0]; }
    return s[s.length - 1][0];
  };

  // ---------------------------------------------------------------- §2.2 resolucion de color
  // Chromium computa cada vez mas colores como oklch()/color(display-p3)/color-mix(): un regex de
  // rgba() falla EN SILENCIO ahi (devuelve '') y el acento se pierde. Pintar en un canvas 1x1 y leer
  // el pixel resuelve CUALQUIER sintaxis que el motor entienda, hoy y dentro de dos años.
  const _cv = document.createElement('canvas'); _cv.width = _cv.height = 1;
  let _cx = null; try { _cx = _cv.getContext('2d', { willReadFrequently: true }); } catch (e) { _cx = null; }
  const HEXCACHE = new Map();
  function toRGBA(css) {
    if (!_cx || !css || css === 'none' || css === 'transparent') return null;
    if (HEXCACHE.has(css)) return HEXCACHE.get(css);
    let out = null;
    try {
      // VALIDEZ por DOBLE SENTINELA: fillStyle CONSERVA el valor previo si el nuevo es invalido. Con un
      // solo sentinela negro haria falta una lista de "que strings SON negro" que siempre queda corta y
      // descarta negros legitimos. Con dos opuestos no hace falta lista: un valor valido no puede quedar
      // igual a los dos.
      _cx.fillStyle = '#000000'; _cx.fillStyle = css; const a1 = _cx.fillStyle;
      _cx.fillStyle = '#ffffff'; _cx.fillStyle = css; const a2 = _cx.fillStyle;
      if (a1 !== a2) { HEXCACHE.set(css, null); return null; }
      _cx.save();
      _cx.globalCompositeOperation = 'copy';   // 'copy' escribe el alfa tal cual, sin componer con lo previo
      _cx.fillStyle = css;
      _cx.fillRect(0, 0, 1, 1);
      _cx.restore();                            // OBLIGATORIO: sin esto 'copy' queda pegado en el contexto
      const d = _cx.getImageData(0, 0, 1, 1).data;
      out = { hex: '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''), a: d[3] / 255 };
    } catch (e) { out = null; }
    HEXCACHE.set(css, out);
    return out;
  }

  const rgbOf = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const hslOf = (hex) => {
    const [R, G, B] = rgbOf(hex).map(v => v / 255);
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn, l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (d > 1e-6) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = (mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4) * 60;
      if (h < 0) h += 360;
    }
    return [d < 0.02 ? 0 : h, s, l];         // hue sin sentido bajo croma 0.02 -> 0
  };
  const chromaOf = (hex) => { const [R, G, B] = rgbOf(hex); return (Math.max(R, G, B) - Math.min(R, G, B)) / 255; };
  const lum01Of = (hex) => { const [R, G, B] = rgbOf(hex); return (Math.max(R, G, B) + Math.min(R, G, B)) / 510; };
  const hueOf = (hex) => hslOf(hex)[0];
  const relLum = (hex) => {                  // luminancia relativa WCAG (misma formula que brand_dna.py::_rellum)
    const c = rgbOf(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => { const la = relLum(a), lb = relLum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const dHue = (a, b) => { let d = Math.abs(a - b); return d > 180 ? 360 - d : d; };

  // ---------------------------------------------------------------- §2.1 universo de muestreo
  // r y cs se miden UNA sola vez por nodo: releerlos por campo dispara reflow y la extraccion pasa de
  // milisegundos a segundos en cualquier landing grande.
  const visible = (el) => {
    let r; try { r = el.getBoundingClientRect(); } catch (e) { return null; }
    if (r.width < K.LADO_MIN || r.height < K.LADO_MIN) return null;
    if (r.bottom < 0 || r.top > VH * K.PROF_VP) return null;   // 2 viewports de profundidad, no mas
    let cs; try { cs = getComputedStyle(el); } catch (e) { return null; }
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden') return null;
    if (parseFloat(cs.opacity) < 0.1) return null;
    return { el, r, cs };
  };
  const areaVP = (r) => Math.max(0, Math.min(r.right, VW) - Math.max(r.left, 0)) *
                        Math.max(0, Math.min(r.bottom, VH) - Math.max(r.top, 0));

  // ---------------------------------------------------------------- el aviso de cookies NO ES LA PAGINA
  //
  // Un modal de consentimiento tapa el sitio y esta hecho de las dos cosas que este motor mide: texto
  // grande y un boton de color. Sin excluirlo, la pieza entera se arma sobre el. En oatly.com la
  // captura devolvio cinco frases y las cinco eran del aviso —"Cookie policy", "What is a cookie?",
  // "How long are cookies stored?"— y el video hablaba de cookies. La regla anti-invencion funciono
  // perfecto: uso SOLO lo que la pagina decia. El problema es que lo que la pagina decia era el aviso
  // legal.
  //
  // Se IGNORA, no se acepta: no se toca ningun boton ni se da ningun consentimiento. Simplemente los
  // nodos que viven adentro del aviso dejan de ser candidatos a texto, a boton y a color de acento —
  // eso ultimo importa tanto como lo primero, porque el boton "Aceptar" suele ser el mas prominente de
  // la pagina y se llevaba el acento de la marca.
  //
  // Se pide DOS señales, nombre y forma, y no una: hay marcas cuyo producto se llama "cookie" y hay
  // banners de novedades que no son consentimiento. Un contenedor tiene que nombrarse de aviso Y ser un
  // dialogo, o estar fijo/pegado cubriendo una franja del viewport.
  const CONSENT = [];
  try {
    const NOMBRE = /cookie|consent|gdpr|ccpa|privacy|onetrust|cookiebot|didomi|usercentrics|trustarc|klaro|osano|cmp|preferencias|privacidad/i;
    const cand = [].slice.call(document.querySelectorAll(
      '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="gdpr" i],[class*="gdpr" i],' +
      '[id*="onetrust" i],[id*="cookiebot" i],[id*="didomi" i],[id*="usercentrics" i],[class*="cmp" i],' +
      '[role="dialog"],[role="alertdialog"],[aria-modal="true"]'), 0, 400);
    for (const el of cand) {
      let r = null, cs = null;
      try { r = el.getBoundingClientRect(); cs = getComputedStyle(el); } catch (e) { continue; }
      if (!r || r.width < 120 || r.height < 40) continue;
      const firma = ((el.id || '') + ' ' + (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '') + ' ' + (el.getAttribute('aria-label') || ''));
      const porNombre = NOMBRE.test(String(firma));
      const esDialogo = el.getAttribute('role') === 'dialog' || el.getAttribute('role') === 'alertdialog' || el.getAttribute('aria-modal') === 'true';
      const pegado = cs && (cs.position === 'fixed' || cs.position === 'sticky');
      let texto = ''; try { texto = (el.innerText || '').slice(0, 400); } catch (e) {}
      const porTexto = NOMBRE.test(texto);
      // nombre + (dialogo | pegado)  ó  dialogo + texto de aviso
      if ((porNombre && (esDialogo || pegado)) || (esDialogo && porTexto)) {
        // Solo el ancestro mas alto: si entran padre e hijo, `contains` del padre ya cubre al hijo.
        let cubierto = false;
        for (const c of CONSENT) if (c.contains(el)) { cubierto = true; break; }
        if (!cubierto) CONSENT.push(el);
      }
    }
    if (CONSENT.length) nota('aviso de consentimiento ignorado: ' + CONSENT.length + ' bloque(s)');
  } catch (e) { nota('consent: ' + e); }
  const enConsent = (el) => { for (const c of CONSENT) { try { if (c === el || c.contains(el)) return true; } catch (e) {} } return false; };

  let POOL = [];
  try {
    POOL = [].slice.call(document.querySelectorAll('body *'), 0, K.POOL_SCAN)
             .map(visible).filter(Boolean)
             .filter(x => !enConsent(x.el))
             .slice(0, K.POOL_MAX);
  } catch (e) { nota('pool: ' + e); }

  const inPool = new Map(); for (const x of POOL) inPool.set(x.el, x);

  const SEL_BTN = 'button, a.btn, a[class*="button" i], [role="button"], a[class*="cta" i], input[type=submit]';
  const BOTONES = POOL.filter(x => { try { return x.el.matches(SEL_BTN); } catch (e) { return false; } })
                      .filter(x => x.r.width >= K.BTN_W && x.r.height >= K.BTN_H).slice(0, K.CAP_BTN);

  const bgHexDe = (x) => { const c = toRGBA(x.cs.backgroundColor); return c && c.a >= 0.5 ? c.hex : null; };
  const CARDS = POOL.filter(x => {
    if (x.r.width * x.r.height < K.CARD_AREA * VAREA) return false;
    const rad = parseFloat(x.cs.borderTopLeftRadius) || 0;
    if (rad > 0) return true;
    if (x.cs.boxShadow && x.cs.boxShadow !== 'none') return true;
    if ((parseFloat(x.cs.borderTopWidth) || 0) > 0 && x.cs.borderTopStyle !== 'none') return true;
    const mio = bgHexDe(x); if (!mio) return false;
    const p = x.el.parentElement ? inPool.get(x.el.parentElement) : null;
    const suyo = p ? bgHexDe(p) : null;
    return suyo !== mio;                     // fondo opaco distinto del padre = card
  }).slice(0, K.CAP_CARD);

  // hojas de texto: el nodo tiene texto propio y ningun hijo-elemento aporta texto (evita contar el
  // mismo parrafo 5 veces, una por ancestro).
  const TEXTO = [];
  for (const x of POOL) {
    if (TEXTO.length >= K.CAP_TXT) break;
    let t = ''; try { t = (x.el.innerText || '').trim(); } catch (e) { continue; }
    if (t.length < 2) continue;
    let hijoConTexto = false;
    const ch = x.el.children;
    for (let i = 0; i < ch.length; i++) { if ((ch[i].textContent || '').trim().length) { hijoConTexto = true; break; } }
    if (hijoConTexto) continue;
    x.txt = t;
    TEXTO.push(x);
  }

  const SEL_TIT = 'h1, h2, [class*="title" i], [class*="heading" i]';
  const esTit = (x) => { try { return x.el.matches(SEL_TIT); } catch (e) { return false; } };
  let TITULARES = TEXTO.filter(esTit);
  if (!TITULARES.length) {
    // FALLBACK sano: <h1><span>Big</span> title</h1> NO es hoja de texto -> quedaria sin titulares y
    // displayHint/h1Ratio saldrian del cuerpo. Si el corte por hoja deja el set vacio, aflojamos.
    TITULARES = POOL.filter(esTit);
    for (const x of TITULARES) { if (x.txt == null) { try { x.txt = (x.el.innerText || '').trim(); } catch (e) { x.txt = ''; } } }
    if (TITULARES.length) nota('titulares por fallback (no-hoja)');
  }
  TITULARES = TITULARES.sort((a, b) => (parseFloat(b.cs.fontSize) || 0) - (parseFloat(a.cs.fontSize) || 0)).slice(0, K.CAP_TIT);

  const IMAGENES = [];
  try {
    for (const im of Array.prototype.slice.call(document.images)) {
      if ((im.naturalWidth || 0) < K.IMG_NAT_W) continue;
      const v = visible(im); if (!v) continue;
      v.esImg = true; v.nw = im.naturalWidth; v.nh = im.naturalHeight; v.alt = im.alt || '';
      IMAGENES.push(v);
      if (IMAGENES.length >= K.CAP_IMG) break;
    }
    for (const x of POOL) {
      if (IMAGENES.length >= K.CAP_IMG) break;
      const bi = x.cs.backgroundImage;
      if (!bi || bi.indexOf('url(') < 0) continue;
      if (x.r.width * x.r.height < K.CARD_AREA * VAREA) continue;
      x.esImg = false; x.bgImg = bi;
      IMAGENES.push(x);
    }
  } catch (e) { nota('imagenes: ' + e); }

  // ---------------------------------------------------------------- §2.3 palette · accent
  const accCand = [];                 // TODOS los hex crudos ANTES de cualquier descarte -> chromaMax
  const votos = new Map(), votosSinChroma = new Map();
  let caidosChroma = 0, caidosLum = 0;
  for (const b of BOTONES) {
    const wArea = Math.min(1, (b.r.width * b.r.height) / K.ACC_AREA_REF);   // un CTA de 200x48 pesa mas que un chip
    const lista = [[b.cs.backgroundColor, 2], [b.cs.borderTopColor, 1], [b.cs.color, 1]];
    for (const ps of ['::before', '::after']) {
      try { const p = getComputedStyle(b.el, ps); if (p) lista.push([p.backgroundColor, 2]); } catch (e) {}
    }
    for (const par of lista) {
      const c = toRGBA(par[0]); if (!c) continue;
      accCand.push(c.hex);
      if (c.a < K.ACC_A) continue;           // transparente: no es un color, no cuenta como "candidato caido"
      const ch = chromaOf(c.hex), lu = lum01Of(c.hex);
      votosSinChroma.set(c.hex, (votosSinChroma.get(c.hex) || 0) + Math.max(ch, 0.05) * par[1] * wArea);
      if (ch < K.ACC_CHROMA) { caidosChroma++; continue; }                  // gris/blanco/negro
      if (lu < K.ACC_LUM_LO || lu > K.ACC_LUM_HI) { caidosLum++; continue; }
      votos.set(c.hex, (votos.get(c.hex) || 0) + ch * par[1] * wArea);
    }
  }
  // ---------------------------------------------------------------- el LOGO tambien vota
  // Y PESA MAS QUE UN BOTON, porque es lo unico de la pagina que la marca eligio para SER la marca.
  // Hasta aca el acento salia unicamente de los botones, y eso falla en dos casos frecuentes: una
  // pagina cuyo CTA principal esta pintado por un elemento que el selector de botones no agarra, y una
  // marca cuyo color vive en el simbolo y no en la interfaz. Duolingo es los dos a la vez: el acento
  // medido salio #1cb0f6 —un azul que la marca si usa, en botones secundarios— y el verde #58cc02, que
  // es LA marca, no aparecia en el ranking ni como segundo candidato. El video salia celeste.
  //
  // Se cuenta UNA VEZ POR COLOR Y POR SVG, no por nodo: un logo de doscientos paths del mismo verde no
  // puede valer doscientos votos, o cualquier ilustracion vectorial de la pagina se lleva el acento.
  try {
    const SEL_LOGO = 'header svg, nav svg, [class*="logo" i] svg, [id*="logo" i] svg, a[href="/"] svg, svg[class*="logo" i], svg[aria-label*="logo" i]';
    for (const sv of [].slice.call(document.querySelectorAll(SEL_LOGO), 0, 12)) {
      let r = null; try { r = sv.getBoundingClientRect(); } catch (e) { continue; }
      // Un simbolo de marca mide decenas de pixeles, no cientos: descartando lo muy grande se evita
      // que una ilustracion de hero envuelta en un <svg> se haga pasar por logo.
      if (!r || r.width < 14 || r.height < 10 || r.width > 420 || r.height > 260) continue;
      const nodos = [sv].concat([].slice.call(sv.querySelectorAll('path, circle, rect, polygon, ellipse, g'), 0, 60));
      const suyos = new Set();
      for (const nd of nodos) {
        let cs = null; try { cs = getComputedStyle(nd); } catch (e) { continue; }
        let at = ''; try { at = nd.getAttribute('fill') || ''; } catch (e) {}
        for (const v of [cs.fill, at, cs.color, cs.backgroundColor]) {
          const c = toRGBA(v); if (!c || c.a < K.ACC_A) continue;
          suyos.add(c.hex);
        }
      }
      for (const hex of suyos) {
        accCand.push(hex);
        const ch = chromaOf(hex), lu = lum01Of(hex);
        votosSinChroma.set(hex, (votosSinChroma.get(hex) || 0) + Math.max(ch, 0.05) * 2.6);
        if (ch < K.ACC_CHROMA) { caidosChroma++; continue; }               // un logo monocromo no aporta acento
        if (lu < K.ACC_LUM_LO || lu > K.ACC_LUM_HI) { caidosLum++; continue; }
        votos.set(hex, (votos.get(hex) || 0) + ch * 2.6);
      }
    }
  } catch (e) { nota('accent por logo: ' + e); }

  // El canvas guarda PREMULTIPLICADO: un color con alfa vuelve con hasta +-2/255 por canal. Sin este
  // bucketing, rgba(91,140,255,.9) y rgb(91,140,255) votan como DOS colores y se parten el score.
  const bucketize = (m) => {
    const items = [...m.entries()].map(e => { const h = hslOf(e[0]); return { hex: e[0], sc: e[1], h: h[0], s: h[1], l: h[2] }; })
                                  .sort((a, b) => b.sc - a.sc || (a.hex < b.hex ? -1 : 1));
    const out = [];
    for (const it of items) {
      let hit = null;
      for (const b of out) if (dHue(b.h, it.h) < K.BK_H && Math.abs(b.s - it.s) < K.BK_S && Math.abs(b.l - it.l) < K.BK_L) { hit = b; break; }
      if (hit) hit.sc += it.sc; else out.push(it);
    }
    return out.sort((a, b) => b.sc - a.sc || (a.hex < b.hex ? -1 : 1));
  };

  let ranking = bucketize(votos);
  let accent = ranking.length ? ranking[0].hex : '';
  let accentScore = ranking.length ? ranking[0].sc : 0;

  if (!accent) {                                     // fallback 1: theme-color declarado por la marca
    const tc = document.querySelector('meta[name="theme-color" i]');
    const c = tc ? toRGBA((tc.getAttribute('content') || '').trim()) : null;
    if (c && c.a >= K.ACC_A) {
      const ch = chromaOf(c.hex), lu = lum01Of(c.hex);
      if (ch >= K.ACC_CHROMA && lu >= K.ACC_LUM_LO && lu <= K.ACC_LUM_HI) {
        accent = c.hex; accentScore = ch; ranking = bucketize(new Map([[c.hex, ch]])); nota('accent por theme-color');
      }
    }
  }
  if (!accent) {                                     // fallback 2: el bg mas saturado de los 8 nodos mayores
    const grandes = POOL.slice().sort((a, b) => areaVP(b.r) - areaVP(a.r)).slice(0, 8);
    let mejor = '', mch = 0;
    for (const g of grandes) {
      const c = toRGBA(g.cs.backgroundColor); if (!c || c.a < K.ACC_A) continue;
      const ch = chromaOf(c.hex), lu = lum01Of(c.hex);
      if (ch < K.ACC_CHROMA || lu < K.ACC_LUM_LO || lu > K.ACC_LUM_HI) continue;
      if (ch > mch) { mch = ch; mejor = c.hex; }
    }
    if (mejor) { accent = mejor; accentScore = mch; ranking = bucketize(new Map([[mejor, mch]])); nota('accent por fondo saturado'); }
  }
  // FALLBACK 2.5 (acromatico) — NO es opcional. Sin el, una marca negro-sobre-blanco (Apple, Vercel)
  // pierde todos sus candidatos en el gate de chroma, cae al default #5b8cff y el video se pinta de un
  // azul que la marca NO tiene. Condicion: hubo candidatos y TODOS cayeron por croma (ninguno por
  // luminosidad, que es lo que delataria un color real pero extremo). Los transparentes no cuentan:
  // no son colores, y exigir "cero descartes por alfa" desactivaria este fallback en casi toda pagina real.
  if (!accent && caidosChroma > 0 && caidosLum === 0) {
    const rk = bucketize(votosSinChroma);
    if (rk.length) { accent = rk[0].hex; accentScore = rk[0].sc; ranking = rk; nota('marca acromatica: accent medido sin gate de chroma'); }
  }
  if (!accent) nota('accent por defecto');           // fallback 3 lo aplica Python (#5b8cff, accentScore 0)

  // accent2: SEGUNDO del ranking con salto real de hue. El mismo hue con otra luminosidad no es un
  // segundo color de marca, es una sombra -> null y que §3.4 lo derive si la direccion de arte lo pide.
  let accent2 = null;
  if (accent && ranking.length > 1) {
    const h0 = hueOf(accent), s0 = accentScore || 1;
    for (const c of ranking.slice(1)) {
      if (c.sc >= K.ACC2_SCORE * s0 && dHue(hueOf(c.hex), h0) >= K.ACC2_DHUE) { accent2 = c.hex; break; }
    }
  }

  // ---------------------------------------------------------------- §2.3 palette · bg / inkOnBg
  const votosBg = new Map();
  for (const x of POOL) {
    const a = areaVP(x.r); if (a < K.BG_AREA * VAREA) continue;
    const c = toRGBA(x.cs.backgroundColor); if (!c || c.a < K.BG_A) continue;
    votosBg.set(c.hex, (votosBg.get(c.hex) || 0) + a);
  }
  let bg = '';
  { let best = -1; for (const e of votosBg) if (e[1] > best) { best = e[1]; bg = e[0]; } }
  // stops de un gradiente: partir por comas de NIVEL 0 (rgb(1,2,3) NO son tres stops) y descartar el
  // primer arg si es direccion. Contar comas a secas se equivoca por uno segun haya o no direccion.
  const splitTop = (s) => {
    const out = []; let d = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') d++; else if (ch === ')') d--;
      if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur);
    return out.map(x => x.trim()).filter(Boolean);
  };
  const primerGrad = (bgi) => {
    const m = /(?:-webkit-)?(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.exec(bgi || '');
    if (!m) return '';
    let d = 0, j = m.index + m[0].length - 1;
    for (; j < bgi.length; j++) { if (bgi[j] === '(') d++; else if (bgi[j] === ')') { d--; if (d === 0) { j++; break; } } }
    return bgi.slice(m.index, j);
  };
  const argsGrad = (g) => {
    const i = g.indexOf('('); if (i < 0) return [];
    const args = splitTop(g.slice(i + 1, g.lastIndexOf(')')));
    // El primer arg puede ser DIRECCION y no un stop. Ademas de las formas lineales (to/angulo/from/in),
    // hay que cubrir las RADIALES/CONICAS ('circle at 20% 20%', 'ellipse closest-side', 'farthest-corner'):
    // sin eso `radial-gradient(circle at 20% 20%, #a, transparent)` cuenta 3 stops en vez de 2 y dispara
    // gradient-mesh por el gate `stops >= 3`. Ningun color-stop empieza con esas palabras.
    if (args.length && (/^(to |[\d.]+(deg|rad|grad|turn)|at |from |in |circle\b|ellipse\b|closest-|farthest-)/i.test(args[0])
                        || /\bat\s/i.test(args[0]))) args.shift();
    return args;
  };
  if (!bg) {
    for (const el of [document.body, document.documentElement]) {
      if (!el) continue;
      const cs = getComputedStyle(el);
      const c = toRGBA(cs.backgroundColor);
      if (c && c.a >= K.BG_A) { bg = c.hex; break; }
      const g = primerGrad(cs.backgroundImage);
      if (g) { const a0 = argsGrad(g)[0]; const cc = a0 ? toRGBA(a0.replace(/\s+[-\d.]+(%|px|em|rem)\s*$/i, '')) : null; if (cc) { bg = cc.hex; nota('bg por 1er stop de gradiente'); break; } }
    }
  }
  if (!bg) { bg = '#ffffff'; nota('bg por defecto'); }
  const bgLum = relLum(bg);

  const votosInk = new Map();
  for (const x of TEXTO) {
    const c = toRGBA(x.cs.color); if (!c || c.a < 0.5) continue;
    const peso = x.txt.length * (parseFloat(x.cs.fontSize) || 16);
    votosInk.set(c.hex, (votosInk.get(c.hex) || 0) + peso);
  }
  let inkOnBg = '';
  { let best = -1; for (const e of votosInk) if (e[1] > best) { best = e[1]; inkOnBg = e[0]; } }
  // PIVOTE 0.18 (no 0.5): es donde el blanco y el negro dan el MISMO contraste sobre ese fondo.
  // relLum no es lightness: #808080 vale 0.216, no 0.5. Con 0.5, un fondo #8a8a8a recibiria tinta clara
  // (contraste 2.8) cuando la correcta es la oscura (5.9).
  if (!inkOnBg) { inkOnBg = bgLum > 0.18 ? '#111114' : '#f4f1ea'; nota('ink por defecto'); }

  let chromaMax = 0;
  for (const h of accCand.concat([bg, inkOnBg])) { const c = chromaOf(h); if (c > chromaMax) chromaMax = c; }

  // ---------------------------------------------------------------- §2.4 typography
  const stackDe = (cs) => {
    const ff = (cs.fontFamily || '').toLowerCase();
    const partes = ff.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    return { primera: partes[0] || '', generico: partes[partes.length - 1] || '', full: ff };
  };
  const widthRatioDe = (cs) => {
    if (!_cx) return 0;
    try {
      // PESO FIJO 400 (y NO cs.fontWeight): widthRatio mide la CONDENSACION DE LA FAMILIA, y los cortes
      // de la cascada (<0.56 condensed, >0.74 rounded) salen de una tabla de anchos en peso regular.
      // Medido en Chromium: Arial 400=0.67 pero 800=0.76 (bold sintetico) -> una grotesca neutra en un
      // titular bold se clasificaria `rounded`, y Arial Narrow 900 da 0.76, o sea una CONDENSADA se
      // leeria `rounded`. Con 400 la tabla de referencia de la spec se reproduce exacta.
      _cx.font = '400 100px ' + cs.fontFamily;
      if (_cx.font.indexOf('100px') < 0) return 0;    // font invalida: el ctx CONSERVA el valor previo
      // HAMBURGEFONTSIV = las 15 mayusculas de la panela clasica de diseño de tipos (anchas MWOG,
      // medias HABURNETSV, la estrecha I). El resultado es ANCHO MEDIO DE MAYUSCULA EN EMS.
      return _cx.measureText('HAMBURGEFONTSIV').width / (15 * 100);
    } catch (e) { return 0; }
  };
  const claseDe = (cs, wr) => {
    const st = stackDe(cs);
    const sinSans = st.full.replace(/sans[- ]?serif/g, '');   // "sans-serif" CONTIENE "serif": limpiar antes
    const stretch = (cs.fontStretch || 'normal');
    const stretchPct = /(\d+(?:\.\d+)?)%/.exec(stretch);
    if (/mono|courier|consolas|menlo|monaco|jetbrains|space mono|ibm plex mono|source code|fira code/.test(st.full) || st.generico === 'monospace') return 'mono';
    if (/condensed|narrow|oswald|bebas|anton|teko|archivo narrow|barlow condensed|roboto condensed/.test(st.full)
        || (stretchPct && parseFloat(stretchPct[1]) < 100)
        || (wr > 0 && wr < K.WR_COND)) return 'condensed';
    if (/serif|georgia|times|garamond|playfair|merriweather|lora|tiempos|canela|recoleta|freight|charter|cambria|bodoni|didot/.test(sinSans) || st.generico === 'serif') return 'serif';
    if (/rounded|nunito|quicksand|comfortaa|varela|baloo|fredoka|circular|dm sans rounded|sf pro rounded/.test(st.full)
        || (wr > K.WR_ROUND && /sans/.test(st.generico))) return 'rounded';
    return 'grotesk';
  };

  const nodoDisplay = TITULARES[0] || null;
  let nodoBody = null, mejorPeso = -1;
  for (const x of TEXTO) {
    const fs = parseFloat(x.cs.fontSize) || 0;
    if (fs > 22 || fs <= 0) continue;
    const peso = x.txt.length * fs;
    if (peso > mejorPeso) { mejorPeso = peso; nodoBody = x; }
  }
  const wrDisplay = nodoDisplay ? widthRatioDe(nodoDisplay.cs) : 0;
  const displayHint = nodoDisplay ? claseDe(nodoDisplay.cs, wrDisplay) : '';
  const bodyHint = nodoBody ? claseDe(nodoBody.cs, widthRatioDe(nodoBody.cs)) : '';
  const widthRatio = wrDisplay > 0 ? wrDisplay : (nodoBody ? widthRatioDe(nodoBody.cs) : 0);

  // h1Ratio contra el ANCHO (no el alto) a proposito: el ancho es lo que limita cuantas palabras entran
  // en una linea, que es lo que "big type" significa.
  let h1Fs = nodoDisplay ? (parseFloat(nodoDisplay.cs.fontSize) || 0) : 0;
  const h1RectH = nodoDisplay ? nodoDisplay.r.height : 0;
  if (h1Fs > 200) {                       // §3.5: pagina con zoom/transform:scale
    if (h1RectH >= 8 && h1RectH <= 200) { h1Fs = h1RectH; nota('h1 gigante: recalculado por rect'); }
    else { h1Fs = 0; nota('h1 gigante: h1Ratio descartado'); }
  }
  const h1Ratio = clamp(h1Fs / VW, 0, 0.5);

  // script / textDir
  let blob = ''; try { blob = (document.body && document.body.innerText || '').slice(0, 4000); } catch (e) {}
  const RANGOS = {
    cjk: /[぀-ヿ㐀-鿿豈-﫿가-힯]/g,
    arabic: /[؀-ۿݐ-ݿ]/g,
    hebrew: /[֐-׿]/g,
    cyrillic: /[Ѐ-ӿ]/g,
    greek: /[Ͱ-Ͽ]/g,
    devanagari: /[ऀ-ॿ]/g,
    latin: /[a-zA-ZÀ-ɏ]/g,
  };
  const conteo = {}; let totalAlfa = 0;
  for (const k in RANGOS) { const m = blob.match(RANGOS[k]); conteo[k] = m ? m.length : 0; totalAlfa += conteo[k]; }
  let script = 'latin';
  if (totalAlfa > 0) { for (const k in conteo) if (conteo[k] / totalAlfa >= K.SCRIPT_MIN) { script = k; break; } }
  let dirHtml = ''; try { dirHtml = (document.dir || getComputedStyle(document.documentElement).direction || '').toLowerCase(); } catch (e) {}
  const textDir = (script === 'arabic' || script === 'hebrew' || dirHtml === 'rtl') ? 'rtl' : 'ltr';

  // caseHint
  const letras = (s) => s.replace(/[^\p{L}]/gu, '');
  const esUpper = (x) => {
    if (x.cs.textTransform === 'uppercase') return true;
    const t = x.txt || ''; const L = letras(t);
    return L.length >= 6 && (L.match(/\p{Lu}/gu) || []).length / L.length >= 0.85;
  };
  const esTitle = (x) => {
    const ws = (x.txt || '').split(/\s+/).filter(w => letras(w).length > 3);
    return ws.length >= 2 && ws.every(w => /^\p{Lu}/u.test(letras(w))) && !esUpper(x);
  };
  const muestraCase = TITULARES.slice(0, 12).concat(BOTONES.filter(b => { if (b.txt == null) { try { b.txt = (b.el.innerText || '').trim(); } catch (e) { b.txt = ''; } } return b.txt.length >= 2; }));
  let caseHint = '';
  if (muestraCase.length) {
    const up = muestraCase.filter(esUpper).length / muestraCase.length;
    const ti = muestraCase.filter(esTitle).length / muestraCase.length;
    caseHint = up >= K.CASE_UPPER ? 'upper' : (ti >= K.CASE_TITLE ? 'title' : 'sentence');
  }
  // §5.3: mayusculas y Title Case NO existen en CJK/arabe/hebreo; aplicarlas produce texto roto.
  if (script !== 'latin') { caseHint = 'sentence'; nota('script no latino: verificar glifos'); }

  // ---------------------------------------------------------------- §2.5 shape
  const parseRad = (v, mn) => {
    const t = String(v || '').trim().split(/\s+/)[0];
    if (t.endsWith('%')) return (parseFloat(t) || 0) / 100 * mn;
    const n = parseFloat(t); return isFinite(n) ? n : 0;
  };
  const radMuestras = [], radRatios = [];
  let pills = 0;
  for (const x of BOTONES.concat(CARDS)) {
    const mn = Math.min(x.r.width, x.r.height);
    const rad = parseRad(x.cs.borderTopLeftRadius, mn);
    const esPill = rad >= mn / 2 - 1;
    const esBtn = BOTONES.indexOf(x) >= 0;
    if (esBtn && esPill) pills++;
    if (!esPill) radMuestras.push([rad, Math.max(1, x.r.width * x.r.height)]);
    if (!esBtn) radRatios.push(clamp(rad / Math.max(1, mn), 0, 0.5));   // el ratio es lo que se HEREDA (§4.1)
  }
  let radius = medianW(radMuestras);
  let pill = BOTONES.length ? (pills / BOTONES.length) >= 0.5 : false;
  if (radius != null && radius > 64) { pill = true; radius = 32; nota('radius absurdo: pastilla mal medida'); }  // §3.5
  const radiusRatio = median(radRatios);

  const bordes = [];
  for (const x of BOTONES.concat(CARDS)) {
    const w = parseFloat(x.cs.borderTopWidth) || 0;
    if (w <= 0 || x.cs.borderTopStyle === 'none') { bordes.push(null); continue; }
    const c = toRGBA(x.cs.borderTopColor);
    if (!c || c.a < K.BORD_A || contrast(c.hex, bg) < K.BORD_CONTR) { bordes.push(null); continue; }  // un borde invisible no es un borde
    bordes.push(w);
  }
  const bordesOk = bordes.filter(v => v != null);
  const fracBorde = bordes.length ? bordesOk.length / bordes.length : 0;
  let borderWidth = median(bordesOk);
  if (borderWidth != null && borderWidth > 12) { borderWidth = 12; nota('borderWidth absurdo: clamp 12'); }
  const borderStyle = fracBorde < K.BORD_FRAC ? 'none' : ((borderWidth || 0) <= K.BORD_HAIR ? 'hairline' : 'bold');

  // box-shadow en Chromium viene SIEMPRE normalizado: "rgb(...) X Y B S[, ...]". Sin libreria: partir a
  // nivel 0, primera no-inset, leer los px por orden.
  const parseSombra = (bs) => {
    if (!bs || bs === 'none') return null;
    for (const parte of splitTop(bs)) {
      if (/\binset\b/.test(parte)) continue;
      const m = /^\s*(rgba?\([^)]*\))\s*(.*)$/i.exec(parte);
      const col = m ? m[1] : null, resto = m ? m[2] : parte;
      const c = col ? toRGBA(col) : null;
      if (c && c.a < K.SOMB_A) continue;
      const nums = (resto.match(/-?[\d.]+px/g) || []).map(parseFloat);
      if (!nums.length) continue;
      return { ox: nums[0] || 0, oy: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0 };
    }
    return null;
  };
  const sombras = CARDS.map(x => parseSombra(x.cs.boxShadow));
  const sombrasOk = sombras.filter(Boolean);
  const fracSombra = sombras.length ? sombrasOk.length / sombras.length : 0;
  const blurMediano = median(sombrasOk.map(s => s.blur));
  const maxOff = sombrasOk.length ? Math.max.apply(null, sombrasOk.map(s => Math.max(Math.abs(s.ox), Math.abs(s.oy)))) : 0;
  let shadowStyle = 'flat';
  if (fracSombra >= K.SOMB_FRAC && blurMediano != null) {
    shadowStyle = blurMediano >= K.SOMB_SOFT ? 'soft'
                : (blurMediano <= K.SOMB_HARD_BLUR && maxOff >= K.SOMB_HARD_OFF ? 'hard' : 'soft');
  }

  // ---------------------------------------------------------------- §2.6 density
  // La rejilla es la parte que importa: sumar areas de rects ANIDADOS da fill > 1 en cualquier landing
  // moderna (el texto vive dentro de la card, que vive dentro de la seccion).
  const CX = Math.ceil(VW / K.CELDA), CY = Math.ceil(VH / K.CELDA);
  const GRID = new Uint8Array(CX * CY);
  const CONT = TEXTO.concat(IMAGENES, BOTONES).filter(x => areaVP(x.r) > 0);
  for (const x of CONT) {
    const x0 = Math.max(0, Math.floor(x.r.left / K.CELDA)), x1 = Math.min(CX - 1, Math.ceil(x.r.right / K.CELDA) - 1);
    const y0 = Math.max(0, Math.floor(x.r.top / K.CELDA)), y1 = Math.min(CY - 1, Math.ceil(x.r.bottom / K.CELDA) - 1);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) GRID[yy * CX + xx] = 1;
  }
  let ocupadas = 0; for (let i = 0; i < GRID.length; i++) ocupadas += GRID[i];
  const fill = clamp(ocupadas / (CX * CY), 0, 1);
  const nodos = CONT.length;
  const dScore = clamp(0.65 * fill + 0.35 * Math.min(1, nodos / 45), 0, 1);
  const dNivel = dScore < 0.30 ? 'aireado' : (dScore <= 0.52 ? 'medio' : 'denso');

  // ---------------------------------------------------------------- §2.8 detectores de modernidad
  const sc = {};

  // glass — backdrop-filter es la firma INEQUIVOCA. filter: blur() sobre el propio nodo NO cuenta
  // (eso es un blob desenfocado -> mira gradient-mesh).
  let blurBackdrop = 0, nGlass = 0;
  for (const x of POOL) {
    const bf = x.cs.backdropFilter || x.cs.webkitBackdropFilter || '';
    const m = /blur\(\s*([\d.]+)px/i.exec(bf); if (!m) continue;
    const px = parseFloat(m[1]); if (!(px >= K.GLASS_BLUR)) continue;
    const c = toRGBA(x.cs.backgroundColor); if (!c || c.a < K.GLASS_A_LO || c.a > K.GLASS_A_HI) continue;
    if (areaVP(x.r) < K.GLASS_AREA * VAREA) continue;
    nGlass++; if (px > blurBackdrop) blurBackdrop = px;
  }
  // GUARDA OBLIGATORIA, no defensiva: la expresion arranca en 0.5, asi que sin esto glass entraria en
  // TODAS las paginas del mundo (y max() de un conjunto vacio es -Infinity).
  sc.glass = nGlass === 0 ? 0 : clamp(0.5 + 0.1 * nGlass + 0.01 * (blurBackdrop - K.GLASS_BLUR), 0, 1);

  // bento
  let gridCards = 0, bento = 0;
  for (const x of POOL) {
    const disp = x.cs.display;
    if (disp !== 'grid' && disp !== 'inline-grid' && disp !== 'flex') continue;
    const kids = [];
    for (const k of x.el.children) { const v = inPool.get(k) || visible(k); if (v) kids.push(v); }
    if (kids.length < K.BENTO_HIJOS) continue;
    const mio = bgHexDe(x);
    const cards = kids.filter(k => (parseFloat(k.cs.borderTopLeftRadius) || 0) >= K.BENTO_RAD
                                || (k.cs.boxShadow && k.cs.boxShadow !== 'none')
                                || (bgHexDe(k) && bgHexDe(k) !== mio));
    if (cards.length < K.BENTO_HIJOS) continue;      // 3 cards en fila es el layout mas generico que existe
    const areas = cards.map(k => Math.max(1, k.r.width * k.r.height));
    const varianza = Math.max.apply(null, areas) / Math.max(1, Math.min.apply(null, areas));
    const spans = cards.some(k => /span\s*\d+/i.test((k.cs.gridColumn || '') + ' ' + (k.cs.gridRow || '')) && !/span\s*1\b/i.test((k.cs.gridColumn || '') + ' ' + (k.cs.gridRow || '')));
    const asim = varianza >= K.BENTO_VAR || (x.cs.gridTemplateAreas && x.cs.gridTemplateAreas !== 'none') || spans;
    if (cards.length > gridCards) gridCards = cards.length;
    bento = Math.max(bento, clamp(0.35 + 0.08 * Math.min(cards.length, 8) + (asim ? 0.25 : 0), 0, 1));
  }
  sc.bento = bento;

  // bigtype — consume el h1Ratio ya medido en §2.4, NO lo recalcula
  if (nodoDisplay && h1Fs > 0) {
    const palabras = (nodoDisplay.txt || '').split(/\s+/).filter(Boolean).length;
    const fw = parseFloat(nodoDisplay.cs.fontWeight) || 400;
    sc.bigtype = clamp((h1Ratio - K.BIG_PIVOTE) / K.BIG_PASO + (palabras <= 6 ? 0.20 : 0) + (fw >= 700 ? 0.10 : 0), 0, 1);
  } else sc.bigtype = 0;

  // editorial-photo
  let areaImgVP = 0, mayor = 0, nGrandes = 0;
  for (const x of IMAGENES) {
    const a = areaVP(x.r); areaImgVP += a;
    if (a / VAREA > mayor) mayor = a / VAREA;
    if (x.r.width * x.r.height >= K.EDIT_GRANDE * VAREA) nGrandes++;
  }
  let areaTxtVP = 0; for (const x of TEXTO) areaTxtVP += areaVP(x.r);
  const areaImgVsTexto = areaImgVP / Math.max(1, areaTxtVP);
  // CONDICION DE ENTRADA antes del score: sin ella una landing SaaS con UN mockup de hero entra igual
  // (el primer termino solo ya toca el umbral) y dispara heroes de foto real donde no hay fotos.
  sc['editorial-photo'] = (mayor < K.EDIT_MAYOR || (nGrandes < 2 && areaImgVsTexto < K.EDIT_RATIO)) ? 0
    : clamp(0.5 * Math.min(1, mayor / K.EDIT_MAYOR) + 0.3 * Math.min(1, nGrandes / 3) + 0.2 * Math.min(1, areaImgVsTexto / 1.2), 0, 1);

  // gradient-mesh — el gate de 40% va en el FILTRO de portadores: sin el, un boton con gradiente pinta
  // de mesh el video entero. Los blobs si recorren POOL (un blob desenfocado es chico por definicion).
  const portadores = [];
  for (const el of [document.body, document.documentElement]) if (el) { try { portadores.push({ el, cs: getComputedStyle(el) }); } catch (e) {} }
  for (const x of POOL.slice().sort((a, b) => areaVP(b.r) - areaVP(a.r))) {
    if (portadores.length >= 8) break;
    if (areaVP(x.r) >= K.MESH_PORT * VAREA) portadores.push(x);
  }
  let radiales = 0, conicos = 0, gradStops = 0;
  for (const p of portadores) {
    const bgi = p.cs.backgroundImage; if (!bgi || bgi === 'none') continue;
    radiales = Math.max(radiales, (bgi.match(/radial-gradient\(/gi) || []).length);
    conicos = Math.max(conicos, (bgi.match(/conic-gradient\(/gi) || []).length);
    const g = primerGrad(bgi); if (g) gradStops = Math.max(gradStops, argsGrad(g).length);
  }
  let blobs = 0;
  for (const x of POOL) {
    const m = /blur\(\s*([\d.]+)px/i.exec(x.cs.filter || ''); if (!m) continue;
    if (parseFloat(m[1]) < K.MESH_BLOB_BLUR) continue;
    const c = toRGBA(x.cs.backgroundColor); if (!c || chromaOf(c.hex) < K.MESH_BLOB_CHROMA) continue;
    blobs++;
  }
  sc['gradient-mesh'] = clamp((radiales >= 2 ? 0.6 : 0) + (conicos >= 1 ? 0.6 : 0)
                            + (gradStops >= K.MESH_STOPS ? 0.35 : 0) + 0.15 * Math.min(blobs, 3), 0, 1);

  // brutalist
  const accParaBrut = accent || '#5b8cff';
  const c1 = (borderWidth || 0) >= K.BRUT_BORD, c2 = (radius == null ? 12 : radius) <= K.BRUT_RAD;
  const c3 = shadowStyle === 'hard' && (blurMediano == null ? 99 : blurMediano) <= K.BRUT_BLUR;
  const c4 = contrast(inkOnBg, bg) >= K.BRUT_CONTR;
  // c5 exige accent MEDIDO: puntuar "color plano y chillon" con el default #5b8cff seria puntuar un
  // color que la pagina no tiene (una pagina vacia sacaba 0.25 de brutalist por este termino).
  const c5 = !!accent && chromaOf(accParaBrut) >= K.BRUT_CHROMA && lum01Of(accParaBrut) >= K.BRUT_LUM_LO && lum01Of(accParaBrut) <= K.BRUT_LUM_HI;
  sc.brutalist = 0.30 * c1 + 0.25 * c2 + 0.20 * c3 + 0.15 * c4 + 0.10 * c5;

  let modernidad = Object.keys(sc).filter(k => sc[k] >= K.MOD_ENTRA).sort((a, b) => sc[b] - sc[a] || (a < b ? -1 : 1));
  // brutalist y glass son ANTAGONICOS por definicion: si entran los dos, queda el de mayor score.
  if (modernidad.indexOf('brutalist') >= 0 && modernidad.indexOf('glass') >= 0) {
    const perdedor = sc.brutalist >= sc.glass ? 'glass' : 'brutalist';
    modernidad = modernidad.filter(k => k !== perdedor);
  }
  modernidad = modernidad.slice(0, K.MOD_MAX);       // mas de 3 lenguajes visuales = slop
  const modernidadScores = {};
  for (const k of modernidad) modernidadScores[k] = r2(sc[k]);

  // ---------------------------------------------------------------- §2.7 mood (base + deltas)
  // Se calcula ACA porque todas las entradas estan medidas ACA; Python aplica despues los deltas del
  // caso acromatico (§3.2) y el clamp/redondeo final. Los tres ejes caen directo en el moodPick
  // gaussiano que ya existe en src/kinetic/core/dna.js: mismo espacio, misma escala.
  const warmth = (hex) => chromaOf(hex) < 0.10 ? 0.5 : 0.5 + 0.5 * Math.cos((hueOf(hex) - 40) * Math.PI / 180);
  const accM = accent || '#5b8cff';
  // Si el accent NO se midio, sus terminos aportan 0 en vez de opinar con el default: la formula solo
  // corre sobre lo que se midio (misma regla que "0 medido != 0.35 por default" de §2.6).
  const hayAcc = !!accent, chAcc = hayAcc ? chromaOf(accM) : 0;
  const dh = displayHint || 'grotesk';
  const rr = radiusRatio == null ? 0.06 : radiusRatio;

  let calidez = 0.50 + (hayAcc ? 0.40 * (warmth(accM) - 0.5) * 2 : 0) + 0.20 * (warmth(bg) - 0.5) * 2;
  calidez += (dh === 'serif' || dh === 'rounded') ? 0.08 : ((dh === 'mono' || dh === 'condensed') ? -0.08 : 0);
  calidez += rr >= 0.12 ? 0.06 : (rr <= 0.02 ? -0.06 : 0);
  calidez += bgLum >= 0.55 ? 0.04 : (bgLum <= 0.06 ? -0.04 : 0);

  let formalidad = 0.50;
  formalidad += dh === 'serif' ? 0.18 : ((dh === 'mono' || dh === 'condensed') ? 0.10 : (dh === 'rounded' ? -0.20 : 0));
  formalidad += (caseHint === 'upper') ? 0.12 : 0;
  formalidad += rr <= 0.03 ? 0.12 : (rr >= 0.14 ? -0.14 : 0);
  formalidad += dNivel === 'denso' ? 0.12 : (dNivel === 'aireado' ? -0.06 : 0);
  formalidad += !hayAcc ? 0 : (chAcc >= 0.65 ? -0.14 : (chAcc <= 0.25 ? 0.10 : 0));
  formalidad += borderStyle === 'hairline' ? 0.08 : 0;
  formalidad += modernidad.indexOf('brutalist') >= 0 ? -0.10 : 0;
  formalidad += modernidad.indexOf('editorial-photo') >= 0 ? 0.06 : 0;

  const esAccentFill = (hex) => { const a = hslOf(accM), b = hslOf(hex); return dHue(a[0], b[0]) < K.BK_H && Math.abs(a[1] - b[1]) < K.BK_S && Math.abs(a[2] - b[2]) < K.BK_L; };
  let nCtasAccent = 0;
  for (const b of BOTONES) { const c = toRGBA(b.cs.backgroundColor); if (c && c.a >= 0.5 && esAccentFill(c.hex)) nCtasAccent++; }
  let nAnimaciones = 0;
  for (const x of POOL) if (x.cs.animationName && x.cs.animationName !== 'none') nAnimaciones++;

  // base 0.35 (no 0.45, que es el default de "no medi nada"): el primer termino casi nunca es cero en
  // una pagina medida, asi que una marca con acento saturado normal aterriza en ~0.55.
  let energia = 0.35 + 0.30 * chAcc;
  energia += (accent2 && dHue(hueOf(accent2), hueOf(accM)) >= 60) ? 0.08 : 0;
  energia += modernidad.indexOf('gradient-mesh') >= 0 ? 0.12 : 0;
  energia += modernidad.indexOf('bigtype') >= 0 ? 0.10 : 0;
  energia += modernidad.indexOf('brutalist') >= 0 ? 0.10 : 0;
  energia += nCtasAccent >= 3 ? 0.08 : 0;
  energia += dScore >= 0.55 ? 0.08 : 0;
  energia += (bgLum <= 0.06 && chAcc >= 0.5) ? 0.08 : 0;
  energia += nAnimaciones >= 5 ? 0.06 : 0;
  energia += (dh === 'serif' && caseHint !== 'upper') ? -0.08 : 0;

  // ---------------------------------------------------------------- §2.9 assets.images[].kind
  // el guard de falsy NO es decorativo: new URL(null, href) resuelve a ".../null" y mete una entrada
  // fantasma en imagesMeta por cada <img> sin srcset/data-src.
  const absUrl = (u) => { if (!u) return null; try { return new URL(u, location.href).href; } catch (e) { return null; } };
  const mejorSrcset = (ss) => {
    if (!ss) return null; let best = null, bw = -1;
    ss.split(',').forEach(p => { const m = p.trim().split(/\s+/); const w = parseInt(m[1]) || 0; if (m[0] && w >= bw) { best = m[0]; bw = w; } });
    return best;
  };
  const tieneMarco = (el) => {
    let p = el;
    for (let i = 0; i < 4 && p; i++) {
      let cs; try { cs = getComputedStyle(p); } catch (e) { break; }
      if ((parseFloat(cs.borderTopLeftRadius) || 0) >= 8 && cs.boxShadow && cs.boxShadow !== 'none') return true;
      p = p.parentElement;
    }
    return false;
  };
  const enProducto = (el) => { try { return !!(el.matches('[itemprop="image" i]') || el.closest('[class*="product" i], [itemprop="image" i], [class*="pricing" i] figure, [class*="price" i] figure')); } catch (e) { return false; } };
  // EL ORDEN DE LAS REGLAS ES LA PRECEDENCIA (primer match gana). `ui` es nombre ∨ (aspecto ∧ marco):
  // con la lectura (nombre ∨ aspecto) ∧ marco, una imagen con "dashboard" en el alt pero sin marco se
  // colaria al pool editorial.
  const clasificar = (el, r, alt, url, w, h) => {
    const A = (alt || '').toLowerCase(), U = (url || '').toLowerCase(), blob2 = U + ' ' + A;
    const ar = (w && h) ? w / h : (r && r.height ? r.width / r.height : null);
    if (/screenshot|dashboard|mockup|app[-_]?(ui|screen)|interface|panel/.test(blob2)) return 'ui';
    if (ar != null && ar >= 1.5 && ar <= 2.2 && tieneMarco(el)) return 'ui';
    if (/team|equipo|founder|ceo|cliente|customer|retrato|portrait|avatar|staff/.test(A)) return 'persona';
    if (ar != null && ar >= 0.7 && ar <= 1.05 && r) {
      let cs2; try { cs2 = getComputedStyle(el); } catch (e) { cs2 = null; }
      const mn = Math.min(r.width, r.height);
      if (cs2 && parseRad(cs2.borderTopLeftRadius, mn) >= 0.4 * mn) return 'persona';
    }
    if (enProducto(el) || /producto|product|item|modelo|sku/.test(A)) return 'producto';
    if (ar != null && ar >= 0.75 && ar <= 1.3) return 'producto';
    // ambiente usa el aspecto RENDERIZADO, no el natural: un hero full-bleed suele ser una foto 3:2
    // recortada por object-fit a una banda 1280x520. Lo que lo hace "ambiente" es como ocupa la
    // pantalla, no las proporciones del archivo.
    const arR = (r && r.height) ? r.width / r.height : ar;
    if (r && r.width * r.height >= 0.25 * VAREA && arR != null && arR >= 1.6) return 'ambiente';
    return 'desconocido';
  };
  const imagesMeta = [], vistas = new Set();
  const regMeta = (url, kind, ar, alt) => {
    const a = absUrl(url); if (!a || vistas.has(a) || a.indexOf('data:') === 0) return;
    vistas.add(a); imagesMeta.push({ url: a, kind, ar: ar == null ? null : r2(ar), alt: (alt || '').slice(0, 80) });
  };
  try {
    for (const im of Array.prototype.slice.call(document.images, 0, 120)) {
      let r = null; try { r = im.getBoundingClientRect(); } catch (e) {}
      const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      const src = im.currentSrc || im.src;
      const kind = clasificar(im, r, im.alt, src, w, h);
      const ar = (w && h) ? w / h : null;
      // se registra el MISMO kind bajo TODAS las urls que esa <img> puede aportar (src, srcset, data-*),
      // porque _JS_IMAGES emite cualquiera de ellas: asi el join por url del pagemodel no falla.
      regMeta(src, kind, ar, im.alt);
      regMeta(mejorSrcset(im.getAttribute('srcset') || im.getAttribute('data-srcset')), kind, ar, im.alt);
      for (const at of ['data-src', 'data-original', 'data-lazy-src', 'data-lazy', 'data-image', 'data-bg']) regMeta(im.getAttribute(at), kind, ar, im.alt);
      if (imagesMeta.length > 90) break;
    }
    for (const x of IMAGENES) {
      if (x.esImg || !x.bgImg) continue;
      const m = /url\(["']?(.*?)["']?\)/.exec(x.bgImg); if (!m || !m[1]) continue;
      regMeta(m[1], clasificar(x.el, x.r, '', m[1], x.r.width, x.r.height), x.r.width / Math.max(1, x.r.height), '');
    }
  } catch (e) { nota('imagesMeta: ' + e); }

  // ---------------------------------------------------------------- salida CRUDA
  const bodyLen = blob.trim().length;
  const senalInsuficiente = bodyLen < K.TXT_MIN && TEXTO.length < K.TXT_NODOS;   // §3.5 / §5.1
  if (senalInsuficiente) nota('sin texto: dna por defecto');
  let scrollY = 0; try { scrollY = window.scrollY || 0; } catch (e) {}
  if (scrollY > 4) nota('scrollY != 0 al medir');

  return {
    palette: {
      accent: accent || '', accent2: accent2, bg, inkOnBg, bgLum: r2(bgLum),
      // ranking completo: §3.5 lo necesita para "accent == bg -> siguiente candidato" sin re-capturar
      accentRank: ranking.slice(0, 8).map(c => ({ hex: c.hex, score: r2(c.sc), hue: Math.round(c.h), chroma: r2(chromaOf(c.hex)), lum: r2(c.l) })),
    },
    typography: { displayHint, bodyHint, caseHint, script, textDir, h1Ratio: r2(h1Ratio), widthRatio: r2(widthRatio) },
    shape: {
      radius: radius == null ? null : Math.round(radius),
      radiusRatio: radiusRatio == null ? null : r2(radiusRatio),
      pill, borderStyle, borderWidth: borderWidth == null ? 0 : r2(borderWidth), shadowStyle,
    },
    density: { nivel: dNivel, score: r2(dScore), fill: r2(fill), nodos },
    mood: { calidez: r2(clamp(calidez, 0, 1)), formalidad: r2(clamp(formalidad, 0, 1)), energia: r2(clamp(energia, 0, 1)) },
    modernidad, modernidadScores,
    signals: {
      muestras: { botones: BOTONES.length, cards: CARDS.length, texto: TEXTO.length, imagenes: IMAGENES.length },
      accentScore: r2(accentScore), chromaMax: r2(chromaMax), blurBackdrop: Math.round(blurBackdrop),
      gridCards, areaImgVsTexto: r2(areaImgVsTexto), gradStops, contrasteBgInk: r2(contrast(bg, inkOnBg)),
    },
    imagesMeta,
    notas,
    // crudo para trazabilidad/desempates de director-loop: el motor NO lo consume
    extras: {
      senalInsuficiente, bodyLen, scrollY, ms: Date.now() - t0,
      h1FontSize: r2(h1Fs), h1RectH: r2(h1RectH), nCtasAccent, nAnimaciones,
      caidosChroma, caidosLum, blurMediano: blurMediano == null ? null : r2(blurMediano),
      scoresAll: { bento: r2(sc.bento), glass: r2(sc.glass), bigtype: r2(sc.bigtype),
                   'editorial-photo': r2(sc['editorial-photo']), 'gradient-mesh': r2(sc['gradient-mesh']),
                   brutalist: r2(sc.brutalist) },
    },
  };
}
"""


# Sonda barata para clasificar el ESTADO de la captura (§5): shell de SPA vacio, marcadores de
# Cloudflare y largo del body. Va aparte de _JS_EXTRACT porque hay que evaluarla TAMBIEN despues de
# los reintentos, y aparte de _JS_DNA porque decide SI vale la pena medir el DNA.
_JS_PROBE = r"""
() => {
  const body = ((document.body && document.body.innerText) || '').trim();
  const root = document.querySelector('#root, #app, [data-reactroot], #__next');
  const spaVacia = !!root && root.children.length <= 1 && ((root.innerText || '').trim().length < 40);
  const cf = !!document.querySelector('#cf-wrapper, .cf-error-code, #challenge-form, #challenge-running, [class*="cf-browser-verification"]');
  return { bodyLen: body.length, spaVacia, cfMarker: cf, title: (document.title || '').slice(0, 200), bodyText: body.slice(0, 1200) };
}
"""


# ---- ESTADO DE LA CAPTURA (DNA-SPEC §5) — puro y testeable sin browser ------------------------
_BOTWALL_RE = re.compile(
    r"just a moment|checking your browser|verify (you are )?human|attention required|"
    r"access denied|enable javascript|ddos protection|cf-browser-verification|"
    r"unusual traffic|are you a robot", re.I)
_404_RE = re.compile(r"\b404\b|not found|p[áa]gina no encontrada|no existe|error 5\d\d|oops", re.I)
_BOTWALL_STATUS = {403, 429, 503}

# Que hace pagemodel.py con el `dna` medido, segun el estado (§5.2/§5.4/§5.5/§5.6). El extractor NO
# decide direccion de arte, solo deja la instruccion explicita para que nadie estampe el diseño de
# Cloudflare (gris, Inter, radius 8) sobre la marca del cliente.
_POLITICA_DNA = {
    "ok": "completo",
    "spa-vacia": "solo-bg",     # se conserva bg + theme-color + logo; el resto a defaults
    "botwall": "descartar",
    "404": "descartar",
    "timeout": "descartar",
    "bloqueada": "descartar",
}


def detect_estado(probe: dict | None, http_status: int = 0, goto_fallo: bool = False) -> tuple[str, str]:
    """Clasifica la captura segun DNA-SPEC §5. Devuelve (estado, nota). PURO (testeable sin browser).
    `probe` = salida de _JS_PROBE. El orden importa: un 403 de Cloudflare es botwall, no 404."""
    p = probe if isinstance(probe, dict) else {}
    body = (p.get("bodyText") or "")
    body_len = int(p.get("bodyLen") or 0)
    blob = f"{p.get('title') or ''} {body}"
    if goto_fallo and body_len == 0 and not http_status:
        return "timeout", "timeout de captura"
    if http_status in _BOTWALL_STATUS or _BOTWALL_RE.search(blob) or (body_len < 400 and p.get("cfMarker")):
        return "botwall", "botwall: dna descartado"
    if http_status >= 400 or (_404_RE.search(p.get("title") or "") and body_len < 800):
        return "404", "404/error"
    if body_len < 200 and p.get("spaVacia"):
        return "spa-vacia", "spa sin contenido"
    return "ok", ""


def _root_url(url: str) -> str:
    """Raiz del MISMO host (scheme://host/) — recuperacion del caso 404 (§5.5). '' si no se puede."""
    try:
        u = urlparse((url or "").strip())
        if u.scheme in _ALLOWED_SCHEMES and u.netloc:
            return f"{u.scheme}://{u.netloc}/"
    except Exception:
        pass
    return ""


async def extract_dna(page) -> dict:
    """Mide el DNA VISUAL (DNA-SPEC §2) sobre la pagina YA renderizada y devuelve el bloque CRUDO
    (sin normalizar: §3 corre en Python, en backend/pagemodel.py, para poder testearlo sin browser).

    INVARIANTE: nunca lanza. Si el evaluate falla devuelve {} y el resto del pipeline sigue vivo —
    capture_all alimenta a perception/urvid/kinetic y no puede morir por una medicion opcional."""
    try:
        await page.evaluate("() => window.scrollTo(0, 0)")   # precondicion 1 de §2.0
    except Exception:
        pass
    try:
        dna = await page.evaluate(_JS_DNA)
        return dna if isinstance(dna, dict) else {}
    except Exception as e:
        print(f"[dna] extract fallo: {e}")
        return {}


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
            page = await browser.new_page(viewport={"width": 1280, "height": 900}, ignore_https_errors=True, **_CTX)
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


async def _settle(page):
    """Secuencia de espera del pipeline: consent -> networkidle -> lazy-load -> <img> grandes -> fonts.
    Extraida a funcion PARA PODER REPETIRLA en los reintentos de §5.4 (SPA vacia) y §5.5 (404 -> raiz)
    sin duplicar el codigo (y sin que los dos caminos se desincronicen). Best-effort de punta a punta."""
    # Cerrar cookies temprano (si las hay) para no taparle el hero al screenshot NI al DNA (si el banner
    # sigue abierto medimos el diseño del CMP, no el de la marca — precondicion 3 de §2.0).
    await _dismiss_consent(page)
    # Esperar a que la red se calme: hero, imágenes y FONDOS CSS terminan de cargar.
    # (Antes sacábamos la foto apenas cargaba el DOM y el hero salía vacío.)
    try:
        await page.wait_for_load_state("networkidle", timeout=9000)
    except Exception:
        pass
    # Y OTRA VEZ DESPUES DE QUE LA RED SE CALME. Esta era la razon por la que el aviso seguia entrando:
    # los CMP se inyectan por script y en oatly.com el dialogo todavia no existia en el DOM cuando
    # corria el primer intento. Un solo pase, por temprano, no puede ocultar algo que no llego. El
    # segundo cuesta milisegundos y es el que de verdad limpia la pagina antes de medirla.
    await _dismiss_consent(page)
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
    # Para el DNA es MAS critico todavia: sin esto fontFamily computa el fallback y displayHint/widthRatio
    # miden una tipografia que el usuario nunca vio (precondicion 2 de §2.0).
    try:
        await page.evaluate(
            "async () => { try { if (document.fonts && document.fonts.ready) "
            "await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]); } catch (e) {} }")
    except Exception:
        pass
    await page.wait_for_timeout(900)


# LA FORMA DE UNA CAPTURA, EN UN SOLO LUGAR — y por eso `capture_all` arranca copiandola en vez de
# escribir el literal. Las seis claves se inicializan SIEMPRE, incluso en el retorno temprano de una
# URL bloqueada, asi que un site.json al que le falte alguna NO lo escribio esta version: es de antes.
# `motor.py` lo usa para no reusar una captura rancia. Paso de verdad — stripe-com y
# mercadolibre quedaron cacheadas el 27/7 con solo `content`, el formato anterior a `elementos`, y el
# motor las reuso sin chistar: los dos videos se construyeron sin uno solo de los recortes que tenian
# en disco al lado (12 y 8). Importar esta constante en vez de copiar la lista es lo que evita que el
# detector se quede viejo el dia que la captura devuelva una clave mas.
CLAVES_CAPTURA = {"screenshot": None, "content": None, "images": [], "dna": {}, "captura": None,
                  "elementos": []}


async def capture_all(url: str, out_path: str, width: int = 1280, height: int = 900, elementos: bool = True) -> dict:
    """UNA sola carga de Chromium: extrae el texto renderizado (content) Y saca el screenshot,
    en vez de abrir el navegador dos veces por video. Devuelve {'screenshot': path|None,
    'content': dict|None, 'images': [...], 'dna': {...}, 'captura': {...}}. Best-effort: cualquier
    parte que falle vuelve None/{}, no rompe.

    ADITIVO (F1): 'dna' (mediciones CRUDAS de DNA-SPEC §2) y 'captura' (estado/httpStatus/urlFinal de
    §1.1) son claves NUEVAS; todo lo que ya devolvia (content/images/screenshot) no cambio de forma.

    ADITIVO (elementos): recortes PNG de los objetos reales de la pagina (logo, tarjetas, botones,
    fotos) para que el video anime la pagina del usuario y no figuras de catalogo. `elementos=False`
    los saltea: son ~10 screenshots extra por captura y no todo llamador los necesita."""
    out = {k: (v.copy() if isinstance(v, (list, dict)) else v) for k, v in CLAVES_CAPTURA.items()}
    viewport = [width, height]
    if not _PW_OK or not url or not _guard(url):
        # `bloqueada` es el UNICO estado que se decide SIN navegar: es la barrera anti-SSRF. Si el
        # extractor llegara a medir una URL que url_is_safe() rechazo, el bug es de seguridad.
        motivo = "playwright no disponible" if not _PW_OK else url_is_safe(url)[1]
        out["captura"] = {"url": url or "", "urlFinal": url or "", "httpStatus": 0,
                          "estado": "bloqueada", "viewport": viewport,
                          "notas": [f"url bloqueada: {motivo}"[:120]], "politicaDna": "descartar"}
        out["dna"] = {"politica": "descartar"}
        return out
    http_status, goto_fallo, url_final, notas = 0, False, url, []
    estado = "ok"
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            # ignore_https_errors: muchos sitios legitimos tienen el cert vencido/mal (ERR_CERT_*); sin esto goto FALLA
            # y la captura vuelve vacia -> el brief se inventaria desde el nombre de marca (viola "fiel a la pagina").
            # ESCALA 3 Y NO 2, POR LOS RECORTES CHICOS. Este contexto es el que saca las fotos de los
            # ELEMENTOS (logo, CTA, tarjetas), y el logo es el recorte mas chico del catalogo: medido
            # sobre los 82 que hay en disco, el minimo es 100 px y 30 estan por debajo de 400.
            #
            # Eso importa porque `topeNitido` (render3d/demo/kit.js) no deja dibujar un recorte a mas
            # de 1.4x su resolucion — con razon, arriba de eso el remuestreo se ve en el canto de una
            # letra. O sea que la falta de pixeles no se ve como borrosidad: se ve como UN LOGO MAS
            # CHICO DEL QUE LA COMPOSICION QUERIA. El logo de stripe mide 60x25 CSS; a escala 2 llega
            # con 120 px y no se puede dibujar a mas de 168, a escala 3 llega con 180 y llega a 252.
            #
            # NO HAY RIESGO DE ARCHIVOS ENORMES: `element_extract.MAX_LADO` ya topea el lado largo en
            # 1400 px, asi que los elementos grandes salen igual que antes y los unicos que ganan son
            # justamente los chicos, que es donde hace falta.
            #
            # Se hace en el CONTEXTO y no por elemento a proposito. Escalar un elemento suelto con
            # `transform` se probo el 8/8/2026 y funciono en dos de tres paginas: en la tercera el
            # `overflow: visible` que hace falta para que no se recorte dejo entrar contenido vecino y
            # el logo salio corrupto —sin icono y con un "Product" del nav adentro— en un PNG valido que
            # ninguna compuerta rechaza. El device_scale_factor no toca el layout: lo resuelve el
            # navegador antes de pintar.
            page = await browser.new_page(viewport={"width": width, "height": height},
                                          device_scale_factor=3, ignore_https_errors=True, **_CTX)
            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                http_status = int(getattr(resp, "status", 0) or 0)
            except Exception as ge:
                goto_fallo = True
                print(f"[capture_all] goto lento ({ge}); sigo con lo que haya")
            await _settle(page)
            # UNA VEZ MAS, JUSTO ANTES DE MEDIR. `_settle` recorre la pagina entera para disparar el
            # lazy-load, y varios CMP se vuelven a mostrar ante el scroll: oatly.com quedaba con el
            # bodyText ya limpio —o sea que el ocultado habia funcionado— y los `headings` seguian
            # siendo los del aviso, porque el dialogo habia vuelto despues del barrido. El ocultado es
            # barato y no acepta nada; el momento que importa es el ultimo antes de la medicion.
            await _dismiss_consent(page)
            try:
                data = await page.evaluate(_JS_EXTRACT)
                if isinstance(data, dict):
                    out["content"] = data
            except Exception as ee:
                print(f"[capture_all] extract: {ee}")

            # ---- ESTADO DE LA CAPTURA + RECUPERACIONES (§5). Van ANTES del DNA: si hay que medir otra
            # pagina (raiz de un 404) o esperar un segundo pintado (SPA), el DNA tiene que salir de ESA.
            probe = None
            try:
                probe = await page.evaluate(_JS_PROBE)
            except Exception as pe:
                print(f"[capture_all] probe: {pe}")
            estado, nota0 = detect_estado(probe, http_status, goto_fallo)
            if nota0:
                notas.append(nota0)

            if estado == "spa-vacia":
                # §5.4: UN reintento. El shell ya esta montado, a la app le puede faltar un tick de datos.
                try:
                    await page.wait_for_timeout(3000)
                    await _settle(page)
                    probe2 = await page.evaluate(_JS_PROBE)
                    est2, _ = detect_estado(probe2, http_status, False)
                    if est2 == "ok":
                        probe, estado = probe2, "ok"
                        notas.append("spa: 2.º intento")
                        d2 = await page.evaluate(_JS_EXTRACT)
                        if isinstance(d2, dict):
                            out["content"] = d2
                except Exception as se:
                    print(f"[capture_all] retry spa: {se}")

            if estado == "404":
                # §5.5: UNA recuperacion a la raiz del MISMO host (pasando por el guard). Una URL rota no
                # justifica inventar marca, pero la raiz suele ser el sitio real que el usuario quiso.
                root = _root_url(page.url or url)
                if root and root.rstrip("/") != (page.url or url).rstrip("/") and _guard(root):
                    try:
                        r2 = await page.goto(root, wait_until="domcontentloaded", timeout=20000)
                        st2 = int(getattr(r2, "status", 0) or 0)
                        await _settle(page)
                        probe2 = await page.evaluate(_JS_PROBE)
                        est2, n2 = detect_estado(probe2, st2, False)
                        if est2 == "ok":
                            probe, estado, http_status, url_final = probe2, "ok", st2, page.url or root
                            notas.append("404: se midió la raíz")
                            d2 = await page.evaluate(_JS_EXTRACT)
                            if isinstance(d2, dict):
                                out["content"] = d2
                    except Exception as re4:
                        print(f"[capture_all] retry 404: {re4}")

            # ---- DNA VISUAL (§2.0): ACA, con scrollY == 0, DESPUES de _JS_EXTRACT y MUY ANTES del peek.
            # NO MOVER debajo del bloque `peek`: el peek hace page.goto(/precios) y el DNA pasaria a ser
            # el de OTRA pagina del sitio. Es la trampa mas facil de reintroducir al tocar el peek.
            try:
                dna = await extract_dna(page)
                if isinstance(dna, dict) and dna:
                    out["dna"] = dna
                    for n in (dna.get("notas") or []):
                        if n not in notas:
                            notas.append(n)
            except Exception as de:
                print(f"[capture_all] dna: {de}")
            # urlFinal se congela ACA (tras redirects, antes del peek): si se leyera al final, el peek
            # a /precios se colaria como "la URL que medimos".
            url_final = page.url or url_final
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

            # ---- ELEMENTOS (recortes de los objetos reales para animarlos en el video). VA ACA por la
            # misma razon que el DNA: DESPUES del screenshot del hero y ANTES del peek. Si bajara del
            # peek, los objetos serian los de /precios y el video mostraria la pagina equivocada.
            # Hace scroll para disparar el lazy-load y vuelve a 0, porque el peek de abajo lee el nav.
            if elementos:
                try:
                    await page.evaluate("async()=>{const h=document.body.scrollHeight;for(let y=0;y<h;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}scrollTo(0,0)}")
                    await page.wait_for_timeout(400)
                    els = await extraer_elementos(page)
                    if els:
                        pref = Path(out_path).stem
                        out["elementos"] = await publicar_elementos(els, str(Path(out_path).parent / "elementos"), pref)
                        print(f"[capture_all] elementos: {len(out['elementos'])} ({', '.join(sorted({e['rol'] for e in out['elementos']}))})")
                except Exception as ee:
                    print(f"[capture_all] elementos: {ee}")
                finally:
                    try:
                        await page.evaluate("() => scrollTo(0, 0)")
                    except Exception:
                        pass
            # PEEK SURGICAL (item L348): si el HOME trae POCA señal, el publico-objetivo/precio suele estar en /nosotros o
            # /precios. El browser YA esta abierto y el screenshot del hero YA se saco -> navegamos UNA vez mas SOLO en ese caso
            # (cero costo de latencia en el caso comun) y fusionamos el texto extra en el content. Mismo dominio (SSRF). Best-effort.
            try:
                c = out.get("content")
                if isinstance(c, dict):
                    home_url = page.url or url                                    # base REAL tras redirect (notion.so -> notion.com): los <a> del nav se resuelven contra ESTA, no la url original
                    nav = c.get("navLinks") or []
                    price_link = _peek_url(nav, home_url, _PRICE_LINK_RE)         # <a> a /precios|pricing|planes del MISMO dominio (o None)
                    has_price = _home_has_price(c)
                    peek, why = None, ""
                    if not has_price and price_link:
                        peek, why = price_link, "sin-precio"                      # al home le falta la tabla de planes + hay <a> de /precios -> peekearlo
                    elif _is_sparse(c):
                        peek, why = _peek_url(nav, home_url), "sparse"            # home pobre -> cualquier /nosotros|precios|... para enriquecer
                    st = c.get("structured") or {}
                    # DIAGNOSTICO (item L348): por que (no) peekea.
                    print(f"[capture_all] peek? has_price={has_price} planPrices={_home_plan_prices(c)} ld_price={(st.get('price') or '')!r} sparse={_is_sparse(c)} priceLink={price_link or '-'} -> {peek or 'NO'}")
                    if peek and _guard(peek):
                        print(f"[capture_all] peek ({why}) -> {peek}")
                        resp = await page.goto(peek, wait_until="domcontentloaded", timeout=20000)
                        await page.wait_for_timeout(700)
                        final = page.url or peek                                  # re-valida el destino REAL: no fusionar un redirect cross-host ni un 4xx/5xx
                        same_host = _bare_host(urlparse(final).netloc) == _bare_host(urlparse(home_url).netloc)
                        if same_host and ((resp is None) or resp.status < 400):
                            extra = await page.evaluate(_JS_EXTRACT)
                            out["content"] = _merge_peek(c, extra, final)
                        else:
                            print(f"[capture_all] peek descartado (host_ok={same_host} status={getattr(resp, 'status', None)})")
            except Exception as pe:
                print(f"[capture_all] peek: {pe}")
            await browser.close()
    except Exception as e:
        estado = estado if estado != "ok" else "timeout"
        notas.append(f"error de captura: {e}"[:120])
        print(f"[capture_all] error: {e}")

    # ---- bloque `captura` (§1.1): estado + trazabilidad. `confianza` NO se calcula aca: su formula
    # (§1.5) necesita la semantica del LLM, asi que la arma pagemodel.py cuando tiene las dos mitades.
    dna_blk = out.get("dna") or {}
    politica = _POLITICA_DNA.get(estado, "descartar")
    # §3.5/§5.1: una pagina que respondio 200 pero no tiene texto no es "ok con dna medido": es "no se
    # midio nada util". Escribir 0 medido es distinto de escribir el default, y la politica lo dice.
    if politica == "completo" and ((dna_blk.get("extras") or {}).get("senalInsuficiente")):
        politica = "solo-bg"
    if isinstance(dna_blk, dict):
        dna_blk["politica"] = politica
        out["dna"] = dna_blk
    out["captura"] = {"url": url, "urlFinal": url_final or url, "httpStatus": http_status,
                      "estado": estado, "viewport": viewport,
                      "notas": [str(n)[:120] for n in notas][:8], "politicaDna": politica}
    print(f"[capture_all] captura estado={estado} http={http_status} politicaDna={politica} "
          f"muestras={((dna_blk.get('signals') or {}).get('muestras') or {})} "
          f"modernidad={dna_blk.get('modernidad') or []}")
    return out
