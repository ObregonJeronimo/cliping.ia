# 🤖 AGENTES — equipo autónomo de desarrollo de Urvid

> Cómo un **agente líder** dirige un **equipo de agentes** que mejoran + testean el motor **en loop**,
> SIN gastar la API del usuario (todo con el MOCK + la PC), persiguiendo el objetivo del sistema
> (ver `docs/ARBOL.md`). Diseñado para correr con **ultracode** (Workflow tool) y durar.

## Principio central
- **El producto NO usa la API en el loop**: para generar videos de prueba se usa `backend/mock_director.py`
  (director determinista offline), NUNCA `timeline_director.py` (que llama a Anthropic). Así no se gasta saldo.
- **Los AGENTES sí son Claude** (Claude Code / Workflow) — corren con la cuota de Claude Code del usuario, que es
  OTRA cosa que el saldo de la API de Anthropic del producto. Analizan, critican e implementan; el TESTING es local.
- **Verificación adversarial**: cada hallazgo se confirma/refuta con un escéptico antes de gastar esfuerzo (la
  sonda de legibilidad, por ejemplo, sobre-cuenta artefactos; sin esto se "arregla" lo que no está roto).
- **Gates duros** tras cada cambio: `bg-check` 16/16, `npx vite build`, y las sondas. Commit por fix.

## Roster de agentes (visiones distintas)
1. **LÍDER / Orquestador** (director de producto). Descompone el objetivo, prioriza, sintetiza, DECIDE qué se
   arregla, commitea y **mantiene `docs/ARBOL.md` actualizado**. Corre el loop hasta "seco" o gran progreso.
2. **QA Visual (frames)** — N agentes con lentes distintos (director de arte, usuario de TikTok, diseñador
   editorial). Renderizan mock+visor, MIRAN los frames, listan defectos: legibilidad, vacíos, composición,
   "parece bug/plantilla", recortes, jerarquía.
3. **Anti-sameness** — compara videos ENTRE marcas (`similarity-probe` + frames). Marca patrones/moldes repetidos;
   propone variar estructura/ritmo/paleta/look. (Prioridad #1 del usuario.)
4. **Alma de la página** — ¿el video refleja el rubro/mensaje/marca/fotos del sitio, o es genérico? Revisa el
   `dna`/copy/fotos vs el resultado.
5. **Ingeniero de Movimiento/Fluidez** — calidad de motion determinista (crawl, easing, cámara). `fluidity-probe` + código.
6. **Ingeniero de Legibilidad** — contraste/scrim/tipografía. `legibility-probe` + código (ojo: la sonda sobre-cuenta;
   confiar en el CUERPO de texto).
7. **Investigador de técnicas/librerías** — explora técnicas NUEVAS deterministas (motion, tipografía cinética,
   composición, transiciones) DENTRO de las reglas (Canvas-2D, sin IA generativa). Propone integraciones al motor.
8. **Implementador** — aplica los fixes confirmados (engineCore / mock / prompt del director). Determinista.
9. **Escéptico / Verificador adversarial** — refuta hallazgos dudosos y valida que cada fix sea determinismo-safe y
   no rompa el look.
10. **Gate-keeper** — corre bg-check/build/sondas; bloquea el commit si algo falla.

## El loop (una vuelta = un Workflow)
```
LÍDER define foco (del ROADMAP de ARBOL.md)
  └─ FAN-OUT (paralelo): QA Visual + Anti-sameness + Alma + Investigador
       sobre marcas mock + frames renderizados (sin API)
  └─ DEDUP + VERIFICACIÓN ADVERSARIAL de cada hallazgo (escéptico)
  └─ IMPLEMENTADOR aplica los confirmados (1 por 1)
       └─ GATE: bg-check 16/16 + build + sondas + re-render → si falla, revierte
  └─ COMMIT por fix (ASCII + trailer)
  └─ LÍDER actualiza ARBOL.md y MEMORY → repite hasta "seco" (2 rondas sin hallazgos nuevos) o gran progreso
```
- **Reusable**: `Workflow({ name: 'urvid-loop' })` (ver `.claude/workflows/urvid-loop.md`). Se puede encadenar en
  varias vueltas o disparar con `/loop`.

## Gestión de contexto (ventana de 1M, ultracode)
- Estado durable SIEMPRE en archivos (`docs/ARBOL.md`, `MEMORY.md`), no solo en el chat → cualquier agente/sesión retoma.
- Al ~95% de contexto: el líder **compacta solo** (resume lo hecho, deja ARBOL/MEMORY al día) y sigue el loop sin perder hilo.
- Commits chicos y frecuentes (por fix) = checkpoints recuperables.

## Qué NO hacen los agentes
- No llaman a la API del producto para testear (usan el mock).
- No meten morph/figuras sobre títulos, ni IA generativa, ni Math.random/Date.now.
- No tocan la landing (Thiago) ni los IDs reales (Firebase/repo/carpeta).
- No preguntan al usuario en el loop: deciden y avanzan; paran solo en gran progreso para que el usuario pruebe en vivo.
