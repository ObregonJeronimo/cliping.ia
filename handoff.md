# cliping.ia — Handoff Document
> Última actualización: 2026-06-03

---

## OBJETIVO DEL PROYECTO

SaaS de generación de videos de marketing con IA. El usuario pone una URL, el sistema analiza el sitio, genera un video personalizado con animaciones cinemáticas y lo entrega listo para publicar en redes.

**Arquitectura en dos capas:**
- **Capa 1 — Animaciones simples** (3s, SVG puro, generadas por IA en loop): bloques de construcción individuales
- **Capa 2 — Cine** (cinematografías completas): combinar 5-10 animaciones simples con datos reales del sitio para armar un video narrativo completo

---

## STACK TÉCNICO

| Componente | Tecnología |
|---|---|
| Frontend | React + Vite, desplegado en Vercel (`cliping-ia.vercel.app`) |
| Backend | FastAPI (Python), corre local en Windows |
| Túnel | ngrok (`draw-overturn-backpack.ngrok-free.dev`) — dominio fijo permanente |
| Render de video | Remotion (local, carpeta `/remotion`) |
| IA generativa | Claude Haiku (generación JSX, ~$0.003/animación) + Sonnet (fallback) |
| Storage de videos | Cloudinary (cloud: `dnbylaj2y`, API key: `474391961355116`) |
| Base de datos | Firebase Firestore (colección `cinematicas`) |
| Auth | Firebase Auth |
| Compilación sandbox | esbuild (en `remotion/node_modules/.bin/esbuild.cmd`) |

---

## CÓMO LEVANTAR EL PROYECTO

Doble click en `start.bat` en la raíz. Abre Windows Terminal con dos paneles:
- **Panel superior**: backend (`python run.py` en `/backend`)
- **Panel inferior**: ngrok (`ngrok http 8000`)

Variables de entorno en Vercel: `VITE_API_URL=https://draw-overturn-backpack.ngrok-free.dev`

---

## ARCHIVOS CLAVE

### Backend
```
backend/
  main.py              — FastAPI, todos los endpoints (~909 líneas)
  animation_forge.py   — Motor de generación en loop (Haiku → esbuild → Sonnet)
  cloudinary_upload.py — Upload de videos a Cloudinary
  composition_generator.py — Genera composición completa para MarketingVideo (sistema viejo)
  agent.py             — Agente que analiza URLs
  requirements.txt     — cloudinary, firebase-admin, anthropic, etc.
```

### Frontend
```
src/pages/Cinematicas/
  index.jsx       — Contenedor con tabs (Animaciones | Cine)
  Animaciones.jsx — Generador de animaciones simples (tags + colores + desarrollo)
  Cine.jsx        — Selector de animaciones para cinematografía completa
  Cinematicas.module.css

src/pages/Home.jsx      — Flujo viejo (URL → análisis → video), en pausa
src/components/Layout/Sidebar.jsx — Navegación
src/App.jsx             — Rutas
```

### Remotion
```
remotion/
  index.jsx                         — Entry point
  src/Root.jsx                      — Registra composiciones
  src/compositions/
    AnimeAnimations.jsx             — Biblioteca animaciones Anime.js v4
    GsapAnimations.jsx              — Biblioteca animaciones GSAP
    MarketingVideo.jsx              — Composición principal (sistema viejo)
    Cinematic_*.jsx                 — Generados dinámicamente para render, se borran después
```

---

## ESTADO ACTUAL — SISTEMA DE CINEMÁTICAS

### Flujo completo implementado:
1. Usuario elige tags + colores + descripción libre → apreta "Generar animación"
2. **Haiku genera JSX** con degradados SVG, filtros glow, animaciones complejas
3. **esbuild compila** en ~200ms (sandbox rápido)
4. Si falla → Haiku ve el error y corrige (hasta 5 intentos)
5. Si sigue fallando → **Sonnet** hace el último intento
6. Si compila → **Remotion renderiza** el video (90 frames, 3s, 1080x1920)
7. Si el render falla → regenera el JSX con el error como contexto (hasta 3 intentos de render)
8. Si render OK → **sube a Cloudinary** → **guarda en Firestore** con URL del video
9. Video aparece automáticamente en el reproductor

### UI de Animaciones:
- 8 presets de paleta de colores (Principal + Secundario + Acento)
- Color pickers custom
- Tags por categoría (Formas / Movimiento / Concepto / Estilo / Narrativa)
- Botón "🎲 Aleatorio"
- Descripción libre (opcional) — si tiene sentido, la IA la sigue al pie de la letra
- Log en tiempo real con barra de progreso
- Biblioteca: lee de Firestore primero, fallback local si Firestore no disponible
- Botón × borra de Firestore + archivos locales

### UI de Cine (parcialmente implementada):
- Selector de URL + propósito (Marketing, Informativo, Storytelling, etc.)
- Descripción libre
- Grid de animaciones de la biblioteca para seleccionar (con thumbnails de video)
- Reordenar seleccionadas con ↑↓
- Mínimo 5, máximo 10 animaciones
- **El render completo de cinematografía NO está implementado** — solo muestra el plan narrativo

---

## BUGS CONOCIDOS Y ESTADO DE FIXES

| Bug | Estado | Fix aplicado |
|---|---|---|
| `AbsoluteFill already declared` | ✅ Resuelto | compile_jsx detecta si el código ya tiene imports |
| `lerp/clamp/easeInOut duplicados` | ✅ Resuelto | Se limpian con regex antes de escribir el archivo Remotion |
| `export default duplicado` | ✅ Resuelto | Se limpia con regex antes de escribir el archivo Remotion |
| `anim_id not defined` en render | ✅ Resuelto | `anim.get("id", job_id)` |
| Biblioteca local vs Firestore | ✅ Resuelto | Si Firestore disponible, nunca usar fallback local |
| DELETE no borraba de Firestore | ✅ Resuelto | Ahora borra de Firestore + archivos locales |
| CORS preflight bloqueado por ngrok | ✅ Resuelto | Middleware responde OPTIONS inmediatamente |
| `primaryColor` AttributeError en ForgeRequest | ✅ Resuelto | Agregado al modelo Pydantic |
| Polling no paraba si generación fallaba | ✅ Resuelto | Se para en `done` Y `failed` |
| Video pequeño (viewBox horizontal) | ✅ Resuelto | Prompt especifica 1080x1920 vertical |
| render_job_id llega tarde al frontend | ✅ Resuelto | Frontend espera aunque forge ya esté `done` |
| `cloudinary` no instalado en Windows | ⚠️ Pendiente del usuario | `pip install cloudinary` en la ventana del backend |
| Archivos locales viejos en `cinematic_library/` | ⚠️ Pendiente del usuario | `del cinematic_library\*.json` y `*.jsx` |

---

## PENDIENTES (no urgentes, para cuando corresponda)

### Ideas del usuario para próximas iteraciones:

**1. SVGs de librerías externas en animaciones**
El usuario quiere que las animaciones usen objetos reales (carrito, dólar, cursor de mouse) además de formas geométricas. La idea es integrar SVGs sin fondo de librerías gratuitas:
- **SVG Repo** (svgrepo.com) — miles de SVGs, libre uso comercial
- **Iconify API** (api.iconify.design) — API gratuita, buscar SVG por nombre y obtener el path directamente
- Implementación: nuevo endpoint `GET /api/svg/search?q=carrito` que busca en Iconify y devuelve el SVG string. El prompt de Haiku incluiría el SVG embebido como string que puede animar.

**2. Render completo de cinematografía en Cine**
La sección Cine muestra el plan pero no renderiza. Hay que:
- Endpoint `POST /api/cine/generate` que recibe animaciones seleccionadas + URL + propósito
- El agente analiza la URL y asigna datos reales a cada segmento
- Remotion concatena los 5-10 videos en secuencia con transiciones
- Sube a Cloudinary como video largo

**3. Loop nocturno / generación masiva**
Sistema para generar N animaciones sin intervención:
- Endpoint `POST /api/forge/batch` con una lista de ideas/rubros
- Corre en background, genera una por una
- UI con dashboard de progreso del batch

**4. Mejorar calidad de animaciones**
El usuario nota que las animaciones no son tan atractivas. Ideas:
- Aumentar complejidad visual en el prompt (más capas, más efectos)
- Agregar ejemplos de código de alta calidad al prompt como referencia
- Sistema de rating: el usuario califica animaciones y las mejor calificadas se usan como ejemplos en el prompt

**5. Home / flujo viejo**
La página Home con el flujo URL → análisis → video está en pausa. No borrar todavía — puede volver a ser relevante cuando Cine esté completo.

---

## MODELO DE COSTOS

| Operación | Modelo | Costo estimado |
|---|---|---|
| Generación JSX (5 intentos Haiku) | claude-haiku-4-5 | ~$0.003 |
| Fallback Sonnet | claude-sonnet-4-6 | ~$0.01 adicional |
| 100 animaciones con Haiku | — | ~$0.30 total |
| Cloudinary video upload | — | Gratis hasta 25GB |
| Firestore reads/writes | — | Gratis hasta límite generoso |

---

## CONFIGURACIÓN FIREBASE

- `backend/firebase-service-account.json` — en la máquina local, NO en el repo
- Colección principal: `cinematicas`
- Documento por animación:
  ```
  id, componentName, rubro, idea, code, videoUrl, localFile,
  attempts, elapsedS, createdAt
  ```

---

## CONTINUACIÓN

La próxima sesión debe arrancar exactamente acá:

**El render cinemático falla con error "export default duplicado" resuelto parcialmente.** El fix está en main.py — se limpian imports y helpers duplicados antes de escribir el archivo Remotion. El último commit `333a960` tiene ese fix. Si el render sigue fallando, revisar si hay otros símbolos duplicados en el JSX generado.

**Próximo paso concreto:** verificar que el loop completo (generar → compilar → renderizar → Cloudinary → Firestore → video en UI) funcione de punta a punta sin intervención manual. Una vez confirmado, implementar la integración con Iconify para SVGs de objetos reales en las animaciones.
