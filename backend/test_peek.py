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


if __name__ == "__main__":
    fns = [test_sparse_detection, test_peek_url_primer_match_mismo_dominio, test_peek_url_rechaza_otro_dominio,
           test_peek_url_none_si_no_hay_match, test_merge_peek_fusiona_y_dedup]
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
