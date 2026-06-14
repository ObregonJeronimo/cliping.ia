# Cómo probar y testear todo (POC 1-4)

> Mejora del motor de video sin IA generativa: fondos fluidos, motion premium nativo, dirección
> generativa por rubro y acentos Lottie. Todo determinista. Esta guía es para verificarlo de punta a
> punta. Regla de oro: **"bundlea" ≠ "renderiza" ≠ "se ve lindo"**. Lo automático llega hasta "bundlea
> + es determinista"; el "se ve lindo" final es tu ojo sobre el MP4.

## 0. Setup (una vez)

```bash
cd Documents/cliping.ia
npm install                 # frontend (incluye lottie-web + @napi-rs/canvas para el visor)
(cd remotion && npm install) # render (incluye @remotion/lottie)
```
Python: el backend usa solo stdlib para lo nuevo (style_engine, lottie_search). No hace falta instalar nada extra para los tests de abajo.

## 1. Ver TODO sin abrir el navegador (visor offline de frames)

Rasteriza el motor Canvas a PNG con Skia (`@napi-rs/canvas`) y arma "contact sheets" para mirar el
resultado sin renderizar MP4. Las imágenes quedan en `tools/out/`.

```bash
node tools/render.mjs all       # fondo-seeds, fondo-motion, fondo-themes, video-demo
node tools/render.mjs motion    # motion-eases, motion-path, motion-morph, motion-stagger
node tools/render.mjs rubros    # un fondo por rubro (necesita tools/style-presets.json, ver paso 4)
node tools/render.mjs video tools/sample-tech.json video-tech   # un video de marca puntual
node tools/render.mjs video tools/sample-food.json video-food
```
Abrí los `.png` de `tools/out/`. Sirve para juzgar composición, color, movimiento y variedad.
(Limitación honesta: Skia ≈ Chromium pero sin la fuente Inter local usa un fallback sans; el "feel"
final del movimiento se confirma en el MP4 real.)

## 2. Tests automáticos (determinismo + invariantes)

```bash
node tools/bg-check.mjs        # 16: fondo determinista por (semilla,t), varía por marca/tema/acento
node tools/motion-check.mjs    # 63: easings 0→1, motion-path por arco, morph exacto, demos deterministas
node tools/lottie-check.mjs    #  6: gate Lottie (acepta sample, rechaza expresiones/efectos)
cd backend && python test_style_engine.py && cd ..   # 8: clasificación + determinismo + familias disjuntas
```
Los 4 deben terminar en `N pass, 0 fail`. (El de style también corre con `pytest backend/`.)

## 3. Que compila/bundlea (frontend + render + backend)

```bash
npx vite build                                  # frontend completo (las 4 secciones lab nuevas)
python -m py_compile backend/timeline_director.py backend/style_engine.py backend/lottie_search.py
# render path de Remotion (incluye engineCore y la composición Lottie):
./remotion/node_modules/.bin/esbuild remotion/src/compositions/TimelineVideo.jsx  --bundle --format=esm --jsx=automatic --external:remotion "--external:@remotion/*" --external:react "--external:react/*" --outfile=/tmp/x.js
./remotion/node_modules/.bin/esbuild remotion/src/compositions/LottieOverlay.jsx --bundle --format=esm --jsx=automatic --external:remotion --external:react "--external:react/*" --external:react-dom --outfile=/tmp/y.js
```

## 4. En la app (tu ojo)

```bash
npm run dev      # arranca el frontend (Vite)
```
Login → en el sidebar aparecen 4 secciones nuevas (aisladas, no tocan producción):

| Sección | POC | Qué mirás |
|---|---|---|
| **Fondo (lab)** | 1 | Mesh-gradient fluido. Slider de tiempo, tema, acento, semilla + galería de semillas (cada marca = fondo distinto). |
| **Motion (lab)** | 2 | Easings premium, motion-path por curva, morph entre formas arbitrarias, stagger. |
| **Dirección (lab)** | 3 | Presets de estilo por rubro (paleta/formas/ritmo/semilla) con su fondo. Rubros distintos = look distinto. |
| **Acentos Lottie (lab)** | 4 | Una Lottie de ejemplo (ya gateada) reproducida con lottie-web. |

Regenerar presets de ejemplo (si tocás `style_engine.py`):
```bash
python backend/style_engine.py > tools/style-presets.json
python backend/style_engine.py > src/pages/Animaciones/styleSamples.json   # alimenta el lab de Dirección
```
Buscar Lotties por concepto (API pública, sin auth):
```bash
python backend/lottie_search.py "growth arrow"
python backend/lottie_search.py "delivery" --download src/pages/Animaciones/sampleLottie.json
```

## 5. Render real del MP4 (sólo vos)

Lo que NO puedo verificar acá y necesita tu render/ojo:
- El **MP4 real** y el "feel" del movimiento (el visor no rasteriza idéntico a Chromium; fuentes).
- La **Lottie sobre el video** en movimiento (`LottieOverlay` se confirma en `<Player>`/MP4).
- La **diversidad real del copy** del director (necesita correr el LLM con la API key; tiene costo).

El render del motor Canvas usa `remotion/src/compositions/TimelineVideo.jsx`; la variante con Lottie,
`LottieOverlay.jsx`. El timeline lo escribe `backend/timeline_director.py` (ahora con el preset de
`style_engine.py`: fija `tl.seed` → el fondo varía por marca).

## 6. Testear el PIPELINE COMPLETO sin gastar la API de Claude (director mock)

`backend/mock_director.py` IMITA al LLM: arma timelines completos, variados y deterministas. Sirve para
probar director→motor→render y verificar UNICIDAD sin tokens.

```bash
# genera 12 marcas de rubros distintos (timelines en tools/brands/)
cd backend && python mock_director.py --out ../tools/brands && cd ..

# galeria de unicidad: 1 frame del hero de cada marca, lado a lado (mira tools/out/brands-gallery.png)
node tools/render.mjs gallery tools/brands 3.0

# film-strip de una marca (12 frames en el tiempo)
node tools/render.mjs video tools/brands/01-nimbus.json brand-nimbus
```

### Ver el MP4 REAL frame por frame (fidelidad total, Chromium de Remotion + ffmpeg)
```bash
# 1) props desde un timeline
python -c "import json; tl=json.load(open('tools/brands/01-nimbus.json',encoding='utf-8')); json.dump({'timeline':tl}, open('remotion/props-nimbus.json','w',encoding='utf-8'))"
# 2) render real
cd remotion && npx remotion render testRender.jsx Brand ../tools/out/nimbus.mp4 --props=props-nimbus.json --concurrency=2 && cd ..
# 3) extraer una grilla de 12 frames para mirar
ffmpeg -y -i tools/out/nimbus.mp4 -vf "fps=12/23,scale=270:480,tile=4x3" tools/out/nimbus-real.png
```

## Mapa de archivos nuevos/tocados

- Motor Canvas: `src/pages/Animaciones/engineCore.js` (fondo fluido sembrado + `drawBackground`/`setSeed`).
- Motion: `src/pages/Animaciones/motion2d.js` + `motionDemo.js`.
- Dirección: `backend/style_engine.py` (+ test) + integración en `backend/timeline_director.py`.
- Lottie: `backend/lottie_search.py`, `src/pages/Animaciones/lottieGate.js`, `remotion/src/compositions/LottieOverlay.jsx`.
- Labs: `src/pages/Animaciones/{FondoLab,MotionLab,DireccionLab,LottieLab}.jsx` + rutas en `src/App.jsx` + `src/components/Layout/Sidebar.jsx`.
- Tooling de test/visor: `tools/render.mjs`, `tools/{bg,motion,lottie}-check.mjs`, `backend/test_style_engine.py`.
