# PLAN MAESTRO — cliping.ia de nivel profesional

Norte: que cliping.ia genere videos que **atrapen de principio a fin**, con **calidad de
profesional** y **animaciones complejas**, adaptados al **rubro y al público** de CADA página, que
**replican el alma** del sitio y **garantizan el propósito** del usuario. El desarrollo que pone el
usuario (simple o avanzado) **manda sobre todo**.

## Foso (por qué esta dirección)
Las herramientas que generan video desde URL son de avatar (HeyGen, Synthesia), de montaje de
stock + voz (Pictory, revid) o foto-realistas (Sora/Veo/Runway/Kling: clips cortos, topes de
resolución, motion incoherente, requieren prompt-engineering multi-escena). **Nadie hace bien
motion-graphics NATIVO de la marca, determinista, legible, multi-formato, a centavos.** Ese es el
foso. NO competir con Sora en foto-realismo: ser el mejor del mundo en "diseño de movimiento con el
alma de la marca, en minutos".

## Tesis
Pasar de **"elegir entre ~10 themes" (recolorear plantillas)** a **"dirección de arte generativa
DERIVADA del ADN de cada página"**. El video no se parece a una plantilla pintada con los colores de
la marca: ES una extensión visual del sitio. Ese salto = ~60% del resultado. El otro 40% = animación.

---

## Subsistemas

### 1. Alma → BrandDNA
Hoy se extrae texto + 1 screenshot + imágenes + theme-color + logo (entiende QUÉ dice, no CÓMO se
siente). Sumar:
- **Paleta real** (no theme-color): `getComputedStyle` de títulos/botones/fondos por Playwright +
  dominantes del screenshot → 4-5 roles (primario/secundario/acento/fondo/texto).
- **ADN tipográfico**: font-family/pesos computados → clasificar vibra → mapear a la Google Font más
  cercana (licencia).
- **Lectura visual con modelo multimodal (DESBLOQUEO CLAVE)**: pasar el screenshot a un modelo de
  visión → ejes de diseño (minimalista↔recargado, claro↔oscuro, calmo↔enérgico, corporativo↔lúdico↔
  lujo↔brutalista↔editorial↔orgánico, temperatura, densidad). El sistema MIRA la página, no solo la lee.
- **Densidad/aire** → pista de ritmo.
Todo consolidado en un objeto **BrandDNA** = única fuente de verdad de la dirección de arte.

### 2. Cientos de rubros → industria + público + playbooks
- **Clasificador** de vertical + público objetivo (desde BrandDNA + copy + desarrollo).
- **Base de playbooks por rubro × público (en DATOS, no en código)**: tono, ritmo (cortes/seg),
  hooks que funcionan, psicología de color, energía de movimiento, escenas a priorizar/evitar, tipo
  de prueba (reseñas/specs/precio/credenciales/estética), CTA, música, do's & don'ts.
  - Lujo/belleza: lento, elegante, serif, aire, aspiracional, movimiento mínimo.
  - SaaS/B2B: limpio, cinética + mockups + datos, problema→solución→prueba.
  - Local/clínica: confiable, cálido, credenciales + reseñas + mapa, calmo.
  - Comida: imagen apetitosa, sensorial, gatillo de hambre.
  - DTC Gen Z: cortes rápidos, cinética audaz, alto contraste, punch.
  - Fintech: confianza + claridad + datos + seguridad.
- El director **recupera SOLO el playbook relevante** (prompt liviano + curable sin tocar código).
  Es el foso real: conocimiento de marketing por vertical que se mejora con el tiempo.

### 3. Desarrollo del usuario = columna vertebral  ✅ (v1 hecha)
- El brief extrae OBJETIVO/oferta/público/mensajes/EVITAR del desarrollo y lo trata como **prioridad
  absoluta**; el director sirve ese pedido por encima de arco/hook/defaults.
- Modo avanzado: campos estructurados (objetivo, público, oferta, puntos clave, qué evitar) → mapean
  al brief. (PENDIENTE el front del modo avanzado estructurado.)

### 4. Mejor representación → director multi-etapa + autocrítica
Reemplazar las 2 llamadas actuales por una cadena (Sonnet mecánico, Opus solo donde el razonamiento
se ve en el resultado):
1. Percibir (BrandDNA: visión + CSS + texto).
2. Clasificar (industria + público → playbook).
3. **Estrategia (Opus)**: la idea grande, el arco emocional, el momento "freno de scroll".
4. **Dirección de arte (derivar, no elegir)**: paleta/tipo/personalidad de movimiento/ritmo/música.
5. Storyboard (Sonnet): escenas con su personalidad de movimiento.
6. **Crítica + revisión (Opus, condicional)**: rúbrica (hook, fidelidad de marca, propósito, público,
   ritmo, legibilidad, variedad, "¿parece de un pro / frena el scroll?"). Si está bajo el piso, revisa.
7. QA determinista: fit de texto, tiempo de lectura, contraste, formato.

### 5. Animaciones profesionales (de principio a fin) — expandir PLAN_CALIDAD
- Cinética a nivel **carácter** combinando posición+escala+rotación+opacidad, escalonada.
- **Easing físico** (bezier con overshoot/oscilación) en todo.
- **Transiciones diseñadas** (no solo crossfade): máscara, push con profundidad, zoom-through,
  barrido de luz, match-cut; curvas en S.
- **Profundidad/3D**: parallax multicapa + transforms 3D sutiles (estándar de calidad actual).
- **Momento héroe** por video (count-up con partículas, giro 3D, explosión de cinética, mesh morph).
- **Fondos mesh-gradient** derivados de la paleta + light leaks.
- **Motion blur** en movimientos rápidos.
- **Ritmo por beats** (grilla aun en mudo; con música, sync).
- **Ilustraciones SVG animadas** (librería unDraw pendiente) + íconos draw-on/morph.
- **2-3 variantes de movimiento por escena** (calmo/estándar/punch) según personalidad.
- Setting de **intensidad / movimiento reducido**.

### 6. Que atrape → audio/música
- Librería royalty-free etiquetada por mood/género/energía/BPM; el director elige track.
- Beat detection offline → grilla expuesta a Remotion para sync de cortes/acentos.
- SFX sutiles en transiciones (opcional). Toggle mudo/propia música (default actual).

### 7. Más arquetipos de escena + responsividad total
Reseña, antes-después, demo con UI, dashboard, quote, ubicación/horarios, menú/precios, comparación
de planes, countdown, logos "as seen in", historia del fundador. Todas re-maquetadas por formato
(no recorte).

---

## Roadmap (por retorno)
- **Fase 0 (barato, alto impacto)**: desarrollo como columna vertebral ✅ + clasificador industria/
  público + ~12-15 playbooks. (Playbooks PENDIENTE.)
- **Fase 1 (el alma)**: BrandDNA (paleta real + lectura visual con modelo) → dirección de arte derivada.
- **Fase 2 (el cerebro)**: director multi-etapa + loop de crítica.
- **Fase 3 (el oficio)**: overhaul del sistema de movimiento (PLAN_CALIDAD expandido).
- **Fase 4 (que atrape)**: música + beat-sync + SFX; más arquetipos de escena.
- **Fase 5 (escala)**: Remotion Lambda (PLAN_NUBE) + variantes + loop de rating → playbooks.

---

## Economía (estimada; el logging la mide real)
Hoy: ~$0.035/video (2 Sonnet). Pipeline propuesto:
- Solo-Sonnet: ~$0.09-0.10/video.
- Mixto (Opus en estrategia + crítica condicional): ~$0.12-0.13/video.  ← recomendado
- Solo-Opus: ~$0.16/video (no conviene: tarifa premium para trabajo mecánico).
Precios/M: Opus 4.8 $5/$25, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5.

Costo cargado (tokens + ~$0.03 infra a escala: Cloudinary + Lambda; hoy ~$0 con render local):
recomendado ~$0.16/video, lean ~$0.13/video.

Márgenes por plan (tras comisión de pago ~3%):
- **$20 / 40 videos** ($0.50/video): a 100% margen ~64% (rec) / ~70% (lean); a 60% ~76-80%.
- **$60 / 150 videos** ($0.40/video): a 100% margen ~57% (rec) / ~64% (lean); a 60% ~73-77%.
- Stress (todos maxean $60 con solo-Opus): margen ~49%. Igual gana.

Recomendación: **default solo-Sonnet, Opus solo en estrategia, crítica-Opus condicional.** Casi toda
la calidad del mixto al costo del lean. El riesgo real de costo a escala NO son los tokens: es el
render en una sola máquina → por eso Lambda (Fase 5).

Palancas para bajar costo: prompt caching (system fijo, ~90% off input), Batch API (50% off si async),
Haiku para clasificar/visión, crítica condicional, expirar videos viejos en Cloudinary.

---

## Estado actual (hecho)
- ✅ **Logging de tokens por etapa** (vision + brief + director [+ retry]) con costo USD; se loguea y
  se guarda en el doc del video (`tokens: {in,out,cost_usd,calls}`). En una semana = costo real medido.
- ✅ **Desarrollo como columna vertebral**: brief con OBJETIVO/EVITAR + pedido del usuario como
  PRIORIDAD ABSOLUTA en brief y director (manda sobre arco/hook/defaults).
- ✅ **Fase 0.2 — Playbooks por rubro** (`playbooks.py`, 14 verticales + modificador por público):
  el brief clasifica INDUSTRIA/PÚBLICO y se inyecta el playbook (tono, ritmo, prueba, escenas a
  priorizar/evitar, CTA, energía) al director. DATA editable, mejora sin tocar código.
- ✅ **Fase 1 — BrandDNA / el alma** (`brand_dna.py`): lectura visual del screenshot con modelo
  multimodal (mood, paleta real, vibra tipográfica, energía, densidad, mejor theme) + paleta por PIL
  de refuerzo. El theme y el acento del video se DERIVAN del sitio (el alma manda sobre la rotación).
  Todo best-effort: si falla, vuelve a defaults sin romper. Logea [dna].
- ✅ **Concepto + momento héroe**: el brief define la idea central y el golpe que frena el scroll;
  se inyectan al director.
- ✅ **QA determinista con autocorrección** (`_qa_spec`): formato, escena pesada al inicio (swap),
  cierre, acento legible (autoaclarado), duplicados, tiempo de lectura (bump de duración), líneas
  largas. Logea [qa]. Reduce la necesidad de "ajuste" a ojo.

## Próximo
- ✅ **Fase 3 — overhaul de animación** (hecho, a validar con el ojo): (1) movimiento adaptado a la
  energía de la marca; (2) sistema de partículas + momento héroe (StatReveal/CtaOutro); (3) fondo
  cinematográfico (gradient-mesh + viñeta); (4) tipografía cinética a nivel carácter; (5) transiciones
  diseñadas por energía. Todo no-regresivo (energía media = idéntico a hoy) y validado en render.
- Fase 2: director multi-etapa con paso de estrategia + loop de crítica. DECISIÓN DE JERO: la crítica
  debe usar **Opus si realmente marca la diferencia** en calidad (no usar Sonnet solo para ahorrar si no
  rinde igual). Medir el costo igual con el logging existente, pero la calidad manda. Jero sabe que esto
  sube el costo por video.
- Fase 4: música + beat-sync (POSPUESTA — bloqueada por assets/licencia). Fase 5: Lambda + variantes
  + rating→playbooks.
