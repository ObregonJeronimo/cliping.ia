# fixtures del motor Director — `pagemodel.v1`

Pagemodels congelados que consume el gate `tools/director-pagemodel-check.mjs` (y, desde F2, el
storyboard/timeline). Existen para que los gates **no dependan de la red**: el `pagemodel` se mide
una sola vez y se guarda (invariante 2 de `docs/director/DNA-SPEC.md` §0).

## Los 5 adversariales (§5 de la DNA-SPEC) — sintéticos, sin red

`vacia.json` · `botwall.json` · `no-latina.json` · `spa-sin-html.json` · `404.json`

Cómo se generaron: `backend/test_pagemodel.py` define, para cada caso, la salida **sintética del
extractor** (lo que §5.7 dice que `_JS_EXTRACT` + `_JS_DNA` devuelven en esa página) y la pasa por
`backend/pagemodel.py::build_pagemodel`. O sea: no son JSON escritos a mano que se desincronizan del
código, son la salida real del ensamblador para una entrada fija.

```
python backend/test_pagemodel.py            # corre los asserts (matriz §5.7 + normalización §3)
python backend/test_pagemodel.py --write    # además reescribe estos 5 .json
```

Si un cambio en `pagemodel.py` los mueve, el diff de git muestra exactamente qué campo cambió y en
qué caso. Un fixture que cambia sin que nadie lo haya pedido **es el bug**.

## Los de páginas reales

Los deja `backend/e2e_probe.py <url>` como `<host>.json` (ese sí abre Chromium y necesita red; los
gates solo leen el resultado). El objetivo de F1 es tener 10 páginas reales acá, además de los 5
adversariales.

## Qué verifica el gate

1. `validatePageModel()` de todos los `.json` de esta carpeta.
2. **Espejo Python↔JS**: `normalizePageModel(fixture)` tiene que devolver el mismo objeto. Caza que
   los defaults de `backend/pagemodel.py` y los de `src/director/core/schema.js` se separen.
3. La matriz de aceptación §5.7 para los 5 adversariales (estado, confianza, qué DNA se descarta,
   qué campos quedan vacíos).
