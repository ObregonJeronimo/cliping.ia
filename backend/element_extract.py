"""Extractor de ELEMENTOS: recorta los objetos reales de la pagina como PNG con transparencia.

POR QUE EXISTE
El motor Director sabe componer, animar y encadenar escenas, pero lo que anima sale de un catalogo
propio de figuras (un escudo, una tarjeta, una taza) teñidas con la paleta de la pagina. El video
queda prolijo y generico: dos marcas distintas del mismo rubro dan videos que se parecen entre si mas
de lo que cada uno se parece a SU pagina. Si los objetos que entran y salen del cuadro son el LOGO
real, la TARJETA real y el BOTON real, el video pasa a verse como la marca.

POR QUE POR DOM Y NO POR VISION
Segmentar un screenshot con un modelo cuesta plata por video y se equivoca en los bordes. El
navegador ya sabe donde empieza y termina cada objeto: es el layout que el mismo calculo. Playwright
recorta un nodo por locator y hace scroll solo, asi que sale exacto y gratis.

QUE NO HACE
No vectoriza. Un PNG recortado sirve para trasladar, escalar, rotar, revelar y hacer match-cut — que
es todo lo que la timeline sabe animar. Vectorizar solo agregaria deformacion de trazo, que ningun
gesto del motor usa hoy.
"""
import asyncio
import hashlib
import io
import os
import re

try:
    from PIL import Image
    _PIL_OK = True
except Exception:  # pragma: no cover
    _PIL_OK = False

MAX_LADO = 1400      # un recorte @2x de un hero llega a 2500px y 3MB; a 1400 no se nota y pesa 5x menos
MIN_TINTA = 0.04     # menos del 4% de pixeles opacos = el recorte quedo casi vacio
MAX_ELEMENTOS = 14


# ------------------------------------------------------------------ pase 1: elegir candidatos
# Corre DENTRO de la pagina porque solo el navegador sabe que se ve de verdad: display, opacidad,
# tamaño ya renderizado y quien tapa a quien. Marca cada candidato con data-uv=N para recortarlo
# despues por locator (el clip por coordenadas fallaba en todo lo que estaba debajo del fold).
_JS_CANDIDATOS = r"""
() => {
  const W = innerWidth, H = innerHeight;
  const trans = (c) => !c || /^rgba?\((?:0,\s*0,\s*0,\s*0)\)$/.test(c.replace(/\s+/g,' ')) || c === 'transparent';
  const vis = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.15) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 40 && r.height >= 20;
  };
  // Un elemento que no pinta NADA propio (sin fondo, sin borde, sin sombra) recorta lo que haya
  // DETRAS: el hermano que pinta el fondo no es ancestro, asi que apagar ancestros no lo saca. Un
  // boton transparente sobre una foto devolvia un pedazo de la foto, no el boton. Solo se aceptan
  // los que pintan lo suyo, o los que SON la imagen (img/svg/video/canvas).
  // Una pieza puede no pintar NADA propio y aun asi ser un objeto: en una tienda moderna el tile es
  // una foto a sangre con el titulo encima, y el contenedor no tiene ni fondo ni borde porque LA
  // IMAGEN es el fondo. Pidiendo fondo/borde, seis paginas nuevas de seis daban CERO tarjetas — justo
  // el rol que mejor viaja a un reel, porque ya viene con proporcion de pieza y jerarquia adentro.
  // Se pide que la imagen cubra el 60% para no aceptar un parrafo que casualmente tiene un icono.
  const conImagen = (el) => {
    const r = el.getBoundingClientRect(), a = r.width * r.height;
    if (a <= 0) return false;
    for (const im of el.querySelectorAll('img, video, canvas')) {
      const ri = im.getBoundingClientRect();
      if (ri.width * ri.height >= a * 0.6) return true;
    }
    const b = getComputedStyle(el).backgroundImage;
    return !!(b && b !== 'none' && b.includes('url('));
  };
  const propio = (el) => {
    const cs = getComputedStyle(el);
    if (/^(img|svg|video|canvas|picture)$/.test(el.tagName.toLowerCase())) return true;
    if (!trans(cs.backgroundColor)) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    if (parseFloat(cs.borderTopWidth) > 0 && !trans(cs.borderTopColor)) return true;
    if (cs.boxShadow && cs.boxShadow !== 'none') return true;
    return conImagen(el);
  };
  const out = [], visto = [];
  let n = 0;
  // `bloquea` distingue el objeto del ESCENARIO. Si capturo una tarjeta no quiero ademas su boton
  // suelto, asi que la tarjeta bloquea a sus hijos. El hero es distinto: es una escena entera que por
  // definicion contiene al logo y al CTA, y si bloqueara se llevaria puesto medio catalogo — que es
  // justo lo que pasaba (una pagina devolvia el hero y perdia sus dos botones principales).
  const push = (el, rol, score, bloquea = true) => {
    if (!el || !vis(el) || !propio(el)) return false;
    for (const o of visto) if (o === el || o.contains(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.width > W * 0.97 && r.height > H * 0.85) return false;   // eso es un contenedor, no un objeto
    // el texto mas chico que tiene adentro decide si sobrevive a un reel: si ya es diminuto en el
    // navegador, en 1080 de ancho es mugre gris
    let minPx = 999;
    for (const d of [el, ...el.querySelectorAll('*')]) {
      const t = (d.childNodes && Array.from(d.childNodes).some(c => c.nodeType === 3 && c.textContent.trim()));
      if (t) minPx = Math.min(minPx, parseFloat(getComputedStyle(d).fontSize) || 999);
    }
    if (bloquea) visto.push(el);
    el.setAttribute('data-uv', String(n));
    out.push({ i: n++, rol, score, w: Math.round(r.width), h: Math.round(r.height),
               y: Math.round(r.top + scrollY), tag: el.tagName.toLowerCase(),
               minPx: minPx === 999 ? 0 : Math.round(minPx),
               texto: (el.innerText || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 80) });
    return true;
  };

  // LOGO — el unico elemento que la marca controla al 100%. Los selectores por clase fallan en las
  // paginas que arman el logo con un <svg> suelto (Linear), asi que ademas se busca por FORMA: en la
  // cabecera, chico, ancho, y a la izquierda.
  const cab = document.querySelector('header, [role="banner"], nav') || document.body;
  let logo = cab.querySelector('a[href="/"] img, a[href="/"] svg, [class*="logo" i] img, [class*="logo" i] svg, img[alt*="logo" i], [aria-label*="home" i] svg');
  if (!logo) {
    for (const el of Array.from(cab.querySelectorAll('svg, img')).slice(0, 20)) {
      const r = el.getBoundingClientRect();
      if (r.width >= 40 && r.width <= 340 && r.height >= 12 && r.height <= 90 && r.left < W * 0.4) { logo = el; break; }
    }
  }
  push(logo, 'logo', 100);

  // El orden importa: de lo MAS especifico a lo mas general. Un CTA elegido despues del hero nunca
  // llegaba, porque el hero es un div gigante que lo contiene. Al reves funciona: los objetos chicos
  // se reservan primero y el hero entra igual porque no lo bloquea nadie.

  // CTA — el gesto accionable. Los del nav no sirven: 'Products', 'Solutions' son menu, no la accion
  // de la pagina. Se pide fondo pintado (el boton primario siempre lo tiene) o un verbo de accion.
  const VERBO = /(empez|comenz|prob|start|get|try|sign|book|reserv|compr|buy|contact|demo|descarg|download|solicit|agenda|join|crear|create|pedir|cotiz)/i;
  // El banner de cookies es un boton grande, pintado y arriba de todo: gana todos los criterios de un
  // CTA y no dice nada de la marca. Un video que abre con "Aceptar cookies" es un chiste.
  // Los botones de aviso legal ganan todos los criterios de un CTA — son grandes, pintados y estan
  // arriba de todo — y no dicen nada de la marca. Un video que abre con "Aceptar cookies" o
  // "Entendido" es un chiste. Los cortos van anclados para que "ok" no matchee "book" ni "Entendido"
  // se coma un "entendimiento".
  const COOKIE = /(cookie|consent|gdpr|privacidad|privacy|aceptar todo|accept all|más información|mas informacion|preferenc)/i;
  const LEGAL = /^(entendido|entendi|got it|de acuerdo|ok|acepto|aceptar|accept|allow all|permitir|i agree|agree|continuar|continue|cerrar|close|dismiss|no,? gracias|no thanks)$/i;
  let cta = 0;
  for (const el of Array.from(document.querySelectorAll('a[class*="btn" i], a[class*="button" i], button, [role="button"], a[href*="signup"], a[href*="contact"]')).slice(0, 150)) {
    if (cta >= 3) break;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const txt = (el.innerText || '').trim();
    if (!txt || r.width < 80 || r.height < 30 || r.height > 96) continue;
    if (COOKIE.test(txt) || LEGAL.test(txt)) continue;
    if (el.closest('[class*="cookie" i], [class*="consent" i], [id*="cookie" i], [id*="consent" i], [class*="gdpr" i], [class*="legal" i], [role="dialog"], [aria-modal="true"]')) continue;
    if (!(!trans(cs.backgroundColor) || VERBO.test(txt))) continue;
    if (push(el, 'cta', 40)) cta++;
  }

  // TARJETAS — el patron mas comun de una landing moderna (bento, features, planes) y el que mejor
  // viaja a un reel vertical: ya viene con proporcion de pieza y jerarquia adentro.
  const esTarjeta = (el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const fondo = !trans(cs.backgroundColor) || (cs.backgroundImage && cs.backgroundImage !== 'none');
    const borde = parseFloat(cs.borderTopWidth) > 0 || (cs.boxShadow && cs.boxShadow !== 'none');
    return (fondo || borde || conImagen(el)) && r.width >= 150 && r.height >= 100 && r.width <= W * 0.85 && r.height <= H * 0.92;
  };
  // Muchas paginas envuelven la tarjeta en una seccion que tambien tiene fondo propio. Capturar el
  // envoltorio da una tarjeta chiquita flotando en un mar de color, y como el envoltorio es opaco el
  // recorte de margenes transparentes no lo arregla. Si adentro hay algo con cara de tarjeta que
  // ocupa la mitad o mas, el envoltorio no es la pieza: se saltea y la pieza real entra sola cuando
  // el recorrido llegue a ella (querySelectorAll va de afuera hacia adentro).
  const envuelve = (el) => {
    const r = el.getBoundingClientRect(), a = r.width * r.height;
    for (const h of el.querySelectorAll('*')) {
      if (!vis(h) || !esTarjeta(h)) continue;
      const rh = h.getBoundingClientRect();
      if (rh.width * rh.height >= a * 0.4) return true;
    }
    return false;
  };
  // El <a> entra al selector porque en una tienda el tile ES un link: <a><img><div>titulo</div></a>.
  // Sin el, se capturaba el <img> suelto y la leyenda quedaba afuera — peor todavia desde que se
  // ocultan los overlays ajenos, porque para el <img> su propia leyenda es una HERMANA, no una hija.
  // Capturando el contenedor, la leyenda pasa a ser descendiente y sobrevive; y como las tarjetas se
  // eligen antes que las fotos, el tile bloquea a su propia imagen y no se duplica.
  const sel = 'article, li, a, [class*="card" i], [class*="feature" i], [class*="tile" i], [class*="plan" i], [class*="pricing" i], section > div > div';
  let tarj = 0;
  for (const el of Array.from(document.querySelectorAll(sel)).slice(0, 700)) {
    if (tarj >= 6) break;
    if (!vis(el) || !esTarjeta(el) || envuelve(el)) continue;
    if ((el.innerText || '').trim().length < 12) continue;
    if (push(el, 'tarjeta', 50)) tarj++;
  }

  // HERO — lo que la pagina eligio para venderse. Puede ser <img>, <video>, <canvas>, o un div con
  // background-image (muy comun; sin esto una landing entera daba cero heros). NO bloquea: es la
  // escena que contiene a los demas, no un objeto que compita con ellos.
  const medios = Array.from(document.querySelectorAll('img, video, canvas'));
  const fondos = Array.from(document.querySelectorAll('section div, div, header div')).slice(0, 800)
    .filter(el => { const b = getComputedStyle(el).backgroundImage; return b && b !== 'none' && b.includes('url('); });
  let mejor = null, area = 0;
  for (const el of medios.concat(fondos)) {
    const r = el.getBoundingClientRect();
    if (r.top + scrollY > H * 1.7 || r.width < 120 || r.height < 90) continue;
    if (r.width * r.height > area) { area = r.width * r.height; mejor = el; }
  }
  push(mejor, 'hero', 90, false);

  // FOTOS — el resto de las imagenes con cuerpo (producto, ambiente, gente), de mayor a menor
  const porArea = medios.map(el => [el, el.getBoundingClientRect()])
    .filter(([, r]) => r.width >= 140 && r.height >= 110)
    .sort((a, b) => b[1].width * b[1].height - a[1].width * a[1].height);
  let fotos = 0;
  for (const [el] of porArea) { if (fotos >= 5) break; if (push(el, 'foto', 60)) fotos++; }

  return out;
}
"""

# La transparencia real no sale sola: `omit_background` vuelve transparente el fondo POR DEFECTO,
# pero cualquier ancestro que pinte un color entra igual en el recorte. Se apagan los fondos de la
# cadena de ancestros — el elemento conserva el suyo, que es lo que se quiere en una tarjeta — y lo
# que sobra al costado sale con alfa 0. Ademas se ocultan fixed/sticky: Playwright hace scroll para
# capturar y un header pegajoso o un banner de cookies se pondria encima.
_JS_LIMPIAR = r"""
(i) => {
  const el = document.querySelector(`[data-uv="${i}"]`);
  if (!el) return false;
  window.__uvR = [];
  const g = (n, p, v) => { window.__uvR.push([n, p, n.style.getPropertyValue(p), n.style.getPropertyPriority(p)]); n.style.setProperty(p, v, 'important'); };
  for (let a = el.parentElement; a; a = a.parentElement) { g(a, 'background', 'transparent'); g(a, 'background-image', 'none'); g(a, 'box-shadow', 'none'); }
  g(document.documentElement, 'background', 'transparent');
  // Se oculta lo que TAPA al elemento: un header pegajoso o un banner de cookies se ponen encima
  // cuando Playwright hace scroll para capturar, y una tarjeta flotante que INVADE la caja de la foto
  // de al lado sale recortada a mitad de palabra dentro del recorte ("DISH…" "Book n…"), que es la
  // basura mas visible que devolvia el extractor en paginas que no estaban en el set de calibracion.
  //
  // Los DESCENDIENTES no se tocan: el titulo y el boton que la propia pieza lleva encima de su foto
  // son parte de la pieza, y son justamente lo que la hace servir para un reel.
  const r = el.getBoundingClientRect();
  for (const f of document.querySelectorAll('body *')) {
    if (f === el || f.contains(el) || el.contains(f)) continue;
    const cs = getComputedStyle(f);
    const flota = cs.position === 'fixed' || cs.position === 'sticky' || cs.position === 'absolute'
                  || (cs.zIndex !== 'auto' && parseFloat(cs.zIndex) > 0);
    if (!flota) continue;
    const rf = f.getBoundingClientRect();
    if (rf.width < 4 || rf.height < 4) continue;
    if (rf.right <= r.left || rf.left >= r.right || rf.bottom <= r.top || rf.top >= r.bottom) continue;
    g(f, 'display', 'none');
  }
  return true;
}
"""
_JS_RESTAURAR = "() => { for (const [n,p,v,pr] of (window.__uvR||[])) { if (v) n.style.setProperty(p,v,pr); else n.style.removeProperty(p) } window.__uvR = [] }"


def _despegar_losa(im: "Image.Image") -> "Image.Image":
    """Saca el fondo HORNEADO de un logo que vino como imagen opaca.

    Muchas marcas sirven su logo como PNG/JPG con la losa de color adentro del archivo. Ahi no hay
    nada que apagar en el DOM: el recorte sale correcto y es un rectangulo blanco con el logo en el
    medio. Sobre el fondo del video eso se lee como un parche pegado, que es peor que no poner el
    logo.

    Solo se aplica al rol `logo` y solo si el BORDE del recorte es de un color uniforme — o sea, si de
    verdad hay una losa. Si el borde es variado (un logo que ya es una foto, o que llega recortado con
    algo detras) no se toca nada. Y si al quitar el color queda casi vacio, se devuelve el original:
    un logo que era mayormente de ese color no tenia losa, ERA de ese color.
    """
    w, h = im.size
    px = im.load()
    borde = []
    paso = max(1, min(w, h) // 24)
    for x in range(0, w, paso):
        borde.append(px[x, 0]); borde.append(px[x, h - 1])
    for y in range(0, h, paso):
        borde.append(px[0, y]); borde.append(px[w - 1, y])
    borde = [p for p in borde if p[3] >= 200]
    if len(borde) < 8:
        return im
    cr = sum(p[0] for p in borde) // len(borde)
    cg = sum(p[1] for p in borde) // len(borde)
    cb = sum(p[2] for p in borde) // len(borde)
    disp = max(abs(p[0] - cr) + abs(p[1] - cg) + abs(p[2] - cb) for p in borde)
    if disp > 40:
        return im                                  # borde variado: no hay losa que sacar

    # rampa suave en vez de umbral seco: el antialias del trazo cae entre medio y un corte duro le
    # deja al logo un halo del color de la losa, que es exactamente lo que se quiere evitar
    DENTRO, FUERA = 26, 90
    out = im.copy()
    po = out.load()
    opacos = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = po[x, y]
            d = abs(r - cr) + abs(g - cg) + abs(b - cb)
            if d <= DENTRO:
                po[x, y] = (r, g, b, 0)
            elif d < FUERA:
                po[x, y] = (r, g, b, int(a * (d - DENTRO) / (FUERA - DENTRO)))
                opacos += 1
            else:
                opacos += 1
    if opacos < w * h * 0.02:
        return im                                  # el logo ERA de ese color: se habria borrado entero
    return out


def _analizar(png: bytes, rol: str = "") -> dict | None:
    """Recorta el margen transparente y mide el recorte. Devuelve None si no sirve.

    El recorte importa mas de lo que parece: la caja del elemento en el DOM incluye padding y aire, y
    si esa caja llega tal cual a la timeline, el motor coloca un objeto que visualmente esta mucho mas
    chico y descentrado que su caja — todo el encuadre queda mal por una razon invisible.
    """
    if not _PIL_OK:
        return {"png": png, "w": 0, "h": 0, "tinta": 1.0, "textura": 0.0, "color": "#808080", "lum": 0.5, "hash": hashlib.sha1(png).hexdigest()[:16], "alfa": False}
    try:
        im = Image.open(io.BytesIO(png)).convert("RGBA")
    except Exception:
        return None
    # La losa se saca ANTES de recortar margenes: recortar primero no hace nada (el recorte es 100%
    # opaco, su bbox es el rectangulo entero) y despues quedaria el margen de losa horneado adentro.
    if rol == "logo":
        im = _despegar_losa(im)
    caja = im.getbbox()  # bbox sobre alfa: devuelve la region con algo pintado
    if caja:
        im = im.crop(caja)
    w, h = im.size
    if w < 24 or h < 16:
        return None
    if max(w, h) > MAX_LADO:
        k = MAX_LADO / max(w, h)
        im = im.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)
        w, h = im.size

    alfa = im.getchannel("A")
    hist = alfa.histogram()
    opacos = sum(hist[200:])
    tinta = opacos / float(w * h)
    tiene_alfa = sum(hist[:200]) > w * h * 0.02

    # TEXTURA: fraccion de pixeles que el desenfoque destruye. Alta = superficie fotografica (piel,
    # follaje, tela); baja = grafico plano (una UI, un logo, una tarjeta de color).
    #
    # Se llama textura y no "legibilidad" porque eso es lo que mide de verdad. La primera version se
    # llamaba `detalle` y pretendia detectar el objeto que no sobrevive a la escala de un reel — un
    # muro de testimonios en letra de 10px. No lo hace: una foto aerea da 0.14 y una captura de
    # dashboard llena de texto diminuto da 0.05, porque la UI es casi toda panel liso. Ordenar por ese
    # numero hundia las fotos buenas y premiaba justo lo ilegible.
    # La legibilidad de verdad la da `minPx`, que sale del DOM y es exacta; para un <img> no se puede
    # saber y no se finge que si.
    gris = im.convert("L")
    chico = gris.resize((max(1, w // 8), max(1, h // 8)), Image.BOX).resize((w, h), Image.BOX)
    px_g, px_c = gris.tobytes(), chico.tobytes()
    paso = max(1, len(px_g) // 30000)
    idx = list(range(0, len(px_g), paso))
    textura = sum(1 for i in idx if abs(px_g[i] - px_c[i]) > 26) / max(1, len(idx))

    # HUELLA PERCEPTUAL (aHash 8x8 sobre gris). El hash exacto solo caza copias byte a byte y las
    # paginas no repiten asi: el mismo banner sale en dos tamaños del carrusel, el mismo boton aparece
    # arriba y abajo con dos padding distintos. Todo eso pasaba el filtro y el video mostraba dos veces
    # lo mismo creyendo que variaba. A 8x8 dos recortes del mismo dibujo dan huellas casi iguales sin
    # importar la escala.
    mini = gris.resize((8, 8), Image.BOX)
    px = list(mini.getdata())
    prom = sum(px) / 64.0
    huella = 0
    for i, v in enumerate(px):
        if v > prom:
            huella |= (1 << i)

    # COLOR DOMINANTE de lo opaco. Sin esto no hay forma de saber si el logo real se va a ver: un logo
    # negro sobre el fondo oscuro que eligio el look desaparece, y "el logo no esta" es el defecto que
    # el dueño de la marca nota antes que ninguno. Se ignoran los pixeles casi transparentes porque en
    # un recorte con alfa son la mayoria y arrastrarian el promedio a cualquier lado.
    peq = im.resize((max(1, min(48, w)), max(1, min(48, h))), Image.BOX)
    sr = sg = sb = 0
    n_op = 0
    for (pr, pg_, pb, pa) in peq.getdata():
        if pa >= 160:
            sr += pr; sg += pg_; sb += pb; n_op += 1
    if n_op:
        cr, cg, cb = sr // n_op, sg // n_op, sb // n_op
    else:
        cr = cg = cb = 128
    color = "#%02x%02x%02x" % (cr, cg, cb)
    lum = round((0.2126 * cr + 0.7152 * cg + 0.0722 * cb) / 255.0, 3)

    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    b = buf.getvalue()
    return {"png": b, "w": w, "h": h, "tinta": round(tinta, 3), "textura": round(textura, 3),
            "hash": hashlib.sha1(im.tobytes()).hexdigest()[:16], "huella": huella, "alfa": tiene_alfa,
            "color": color, "lum": lum}


async def extraer_elementos(page, max_n: int = MAX_ELEMENTOS) -> list[dict]:
    """Recorta los elementos de `page` (una pagina de Playwright YA cargada y asentada).

    Recibe la pagina en vez de la URL a proposito: capture_all abre Chromium una sola vez por video, y
    abrirlo de nuevo para esto duplicaria el unico paso caro del pipeline.

    Devuelve [{id, rol, w, h, tinta, detalle, alfa, minPx, texto, png}] ordenado por utilidad. Cada
    `png` son los bytes; subirlos o guardarlos es de quien llama.
    """
    try:
        cands = await page.evaluate(_JS_CANDIDATOS)
    except Exception as e:
        print(f"[elementos] candidatos: {e}")
        return []
    if not isinstance(cands, list):
        return []

    out, vistos, huellas = [], set(), []
    for c in cands:
        sel = f'[data-uv="{c["i"]}"]'
        try:
            # Una SPA vuelve a renderizar sola entre que se marcan los candidatos y se los fotografia,
            # y el nodo marcado deja de existir. Sin este chequeo el locator se queda ESPERANDO a que
            # aparezca — 30 segundos por elemento fantasma, que en una pagina React se lleva la mitad
            # del tiempo de captura. Existe o se saltea, no hay espera.
            if await page.query_selector(sel) is None:
                continue
            await page.evaluate(_JS_LIMPIAR, c["i"])
            loc = page.locator(sel)
            # animations='disabled' NO es cosmetico: Playwright espera a que el elemento quede quieto
            # antes de disparar, y un hero con gradiente o parallax en loop no se queda quieto nunca —
            # se comia 30s de timeout y devolvia el hero vacio en la mayoria de las landings modernas.
            png = await loc.screenshot(omit_background=True, timeout=6000, animations="disabled", caret="initial")
        except Exception as e:
            print(f"[elementos] {c.get('rol')}: {str(e).splitlines()[0][:80]}")
            continue
        finally:
            try:
                await page.evaluate(_JS_RESTAURAR)
            except Exception:
                pass

        a = _analizar(png, c.get("rol", ""))
        if not a:
            continue
        if a["tinta"] < MIN_TINTA:
            # el recorte salio casi vacio: el elemento pinta con pseudo-elementos o quedo fuera de vista
            continue
        # DUPLICADOS. Un carrusel repite la misma imagen en cada slide y el mismo boton aparece arriba
        # y al pie; sin filtro una pagina devolvia seis copias y el video mostraba seis veces lo mismo
        # creyendo que variaba.
        #
        # Hacen falta las DOS señales. Solo por pixeles no alcanza: una grilla de features son seis
        # tarjetas blancas con un icono arriba y dos renglones — a 8x8 son indistinguibles, y filtrar
        # por huella sola se llevaba puestas cuatro de las seis tarjetas buenas de una pagina. Solo por
        # texto tampoco: dos banners de un carrusel no tienen texto en el DOM.
        # Es duplicado si se PARECE y ademas DICE lo mismo.
        # El texto solo (si es largo) tambien alcanza: el mismo banner de carrusel sale recortado en
        # dos altos distintos, y con dos recortes de distinta proporcion las huellas ya no se parecen
        # — un aHash aplasta todo a 8x8 y pierde el aspecto. Se pide 10 caracteres para no colapsar
        # imagenes distintas que comparten un alt de relleno tipo "V2".
        txt = re.sub(r"\W+", " ", (c.get("texto") or "").lower()).strip()
        gemelo = a["hash"] in vistos or any(
            (bin(a["huella"] ^ h).count("1") <= 6 and t == txt) or (len(txt) >= 10 and t == txt)
            for h, t in huellas)
        if gemelo:
            continue
        vistos.add(a["hash"])
        huellas.append((a["huella"], txt))
        out.append({"id": f"el{c['i']}", "rol": c["rol"], "w": a["w"], "h": a["h"],
                    "tinta": a["tinta"], "textura": a["textura"], "alfa": a["alfa"],
                    "color": a["color"], "lum": a["lum"],
                    "minPx": c.get("minPx", 0), "texto": c.get("texto", ""), "png": a["png"]})
        if len(out) >= max_n:
            break

    # Orden por utilidad para el video, no por orden del DOM: el logo y el CTA son los que mas
    # identidad dan por pixel. Entre pares desempata la legibilidad REAL (minPx): dos tarjetas iguales,
    # gana la que no esta escrita en 9px, porque esa en un reel es una mancha.
    peso = {"logo": 100, "cta": 80, "tarjeta": 70, "hero": 65, "foto": 50}
    out.sort(key=lambda e: (-peso.get(e["rol"], 30), -min(e.get("minPx") or 99, 20)))
    return out


async def publicar_elementos(elementos: list[dict], dir_local: str, prefijo: str) -> list[dict]:
    """Guarda los PNG en disco y los sube; devuelve la lista SIN bytes y con `url`.

    Los recortes son archivos nuevos (no existen en la pagina), asi que alguien tiene que hospedarlos.
    Se descarta el data-uri a proposito: un elemento pesa cientos de kB y embeberlos en el pagemodel lo
    volveria de megabytes, cuando el pagemodel viaja en cada request y se guarda por video.

    Todo best-effort: sin credenciales de Cloudinary el elemento se queda con url="" y el pagemodel lo
    descarta, asi que el Director vuelve solo a dibujar sus figuras. Degradar es correcto; romper la
    captura entera porque no habia una API key, no.
    """
    if not elementos:
        return []
    os.makedirs(dir_local, exist_ok=True)
    subir = None
    try:
        from cloudinary_upload import upload_image, API_SECRET
        if API_SECRET:
            subir = upload_image
    except Exception as e:
        print(f"[elementos] sin uploader: {e}")

    async def uno(e):
        path = os.path.join(dir_local, f"{prefijo}_{e['id']}.png")
        try:
            with open(path, "wb") as f:
                f.write(e["png"])
        except Exception as ex:
            print(f"[elementos] no pude guardar {e['id']}: {ex}")
            return None
        url = ""
        if subir:
            try:
                url = await subir(path, f"el_{prefijo}_{e['id']}") or ""
            except Exception as ex:
                print(f"[elementos] upload {e['id']}: {str(ex)[:80]}")
        return {k: v for k, v in e.items() if k != "png"} | {"url": url, "path": path}

    subidos = await asyncio.gather(*[uno(e) for e in elementos], return_exceptions=False)
    return [s for s in subidos if s]
