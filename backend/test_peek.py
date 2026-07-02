"""Test L348 (peek surgical): la logica PURA de decidir/elegir/fusionar el peek a /nosotros o /precios. Sin browser/red.
La navegacion Playwright real se prueba e2e. Corre con pytest O como script: python backend/test_peek.py"""
import site_capture as sc


def test_sparse_detection():
    rich = {"bodyText": "x" * 2000, "headings": ["a", "b", "c", "d"], "paragraphs": ["p1", "p2", "p3", "p4", "p5"]}
    assert sc._is_sparse(rich) is False                       # home rico -> NO peek
    sparse = {"bodyText": "Bienvenido", "headings": ["Hero"], "paragraphs": []}
    assert sc._is_sparse(sparse) is True                      # home pobre -> peek
    assert sc._is_sparse(None) is False


def test_peek_url_primer_match_mismo_dominio():
    base = "https://www.acme.com/"
    nav = [
        {"t": "Inicio", "h": "https://www.acme.com/"},
        {"t": "Precios", "h": "https://www.acme.com/precios"},
        {"t": "Nosotros", "h": "https://www.acme.com/nosotros"},
    ]
    assert sc._peek_url(nav, base) == "https://www.acme.com/precios"   # el PRIMER que matchea


def test_peek_url_rechaza_otro_dominio():
    base = "https://acme.com/"
    nav = [
        {"t": "Precios", "h": "https://otro-sitio.com/pricing"},       # match pero OTRO host -> rechaza (SSRF/no salir)
        {"t": "Nosotros", "h": "https://acme.com/about-nosotros"},     # match + mismo host -> este
    ]
    assert sc._peek_url(nav, base) == "https://acme.com/about-nosotros"


def test_peek_url_none_si_no_hay_match():
    base = "https://acme.com/"
    nav = [{"t": "Inicio", "h": "https://acme.com/"}, {"t": "Blog", "h": "https://acme.com/blog"}]
    assert sc._peek_url(nav, base) is None
    assert sc._peek_url([], base) is None


def test_merge_peek_fusiona_y_dedup():
    home = {"bodyText": "Home", "headings": ["H1"], "paragraphs": ["p1"], "logo": "L", "screenshot": "s.png"}
    extra = {"bodyText": "Somos una empresa de...", "headings": ["Quienes somos", "H1"], "paragraphs": ["Nuestro equipo"]}
    m = sc._merge_peek(home, extra, "https://acme.com/nosotros")
    assert "Quienes somos" in m["headings"] and m["headings"].count("H1") == 1   # fusiona + dedup
    assert "Nuestro equipo" in m["paragraphs"]
    assert "Somos una empresa" in m["bodyText"] and "Home" in m["bodyText"]      # apendea, no reemplaza
    assert m["peekedFrom"] == "https://acme.com/nosotros"
    assert m["logo"] == "L" and m["screenshot"] == "s.png"                        # el home conserva su logo/screenshot


def test_home_has_price():
    # Tiendanube-style: tabla real de planes (3 montos distintos con /mes) -> el home YA tiene pricing -> NO peek
    tabla = {"bodyText": "Esencial $26.999/mes, Impulso $78.999/mes, Escala $234.999/mes"}
    assert sc._home_plan_prices(tabla) == 3 and sc._home_has_price(tabla) is True
    # Shopify-style: mockup 'US$ 125,00' repetido 6x SIN periodicidad -> 0 montos de plan -> peek /precios
    shopify = {"bodyText": "Compra por US$ 125,00 " * 6}
    assert sc._home_plan_prices(shopify) == 0 and sc._home_has_price(shopify) is False
    # promo suelta ('$1/mes') = 1 monto de plan -> < 2 -> peek (el caso que motivó el fix)
    assert sc._home_has_price({"bodyText": "empezá con $1/mes de promo por 3 meses"}) is False
    # Notion/Slack-style: home sin montos -> peek
    assert sc._home_has_price({"bodyText": "Crea, colabora y organiza tu trabajo"}) is False
    # JSON-LD Offer / og:price declara precio -> home con pricing declarado -> NO peek
    assert sc._home_has_price({"bodyText": "sin texto de precio", "structured": {"price": "19.00", "currency": "USD"}}) is True
    assert sc._home_has_price({"bodyText": "x", "structured": {"priceRange": "$$-$$$"}}) is True


def test_peek_url_solo_precios():
    base = "https://acme.com/"
    nav = [
        {"t": "Nosotros", "h": "https://acme.com/nosotros"},   # no es de precios
        {"t": "Precios", "h": "https://acme.com/precios"},      # este (regex de precios)
    ]
    assert sc._peek_url(nav, base, sc._PRICE_LINK_RE) == "https://acme.com/precios"
    assert sc._peek_url([{"t": "Nosotros", "h": "https://acme.com/nosotros"}], base, sc._PRICE_LINK_RE) is None   # sin link de precios


if __name__ == "__main__":
    fns = [test_sparse_detection, test_peek_url_primer_match_mismo_dominio, test_peek_url_rechaza_otro_dominio,
           test_peek_url_none_si_no_hay_match, test_merge_peek_fusiona_y_dedup, test_home_has_price, test_peek_url_solo_precios]
    p = f = 0
    for fn in fns:
        try:
            fn(); p += 1; print(f"PASS  {fn.__name__}")
        except AssertionError as e:
            f += 1; print(f"FAIL  {fn.__name__}: {e}")
        except Exception as e:
            f += 1; print(f"ERR   {fn.__name__}: {type(e).__name__}: {e}")
    print(f"\n{p} pass, {f} fail")
    raise SystemExit(1 if f else 0)
