// urvid 1.0 · carga TODAS las bibliotecas (side-effect: registra sus modulos en el registro).
// Cada biblioteca nueva que llenen los agentes se agrega con un import aca.
import './backgrounds/index.js'   // fondos full-canvas (18)
import './substrates/index.js'    // texturas/overlays tenues (19)
import './atmosphere/index.js'    // capas de luz/atmosfera (17)
import './scenes/index.js'        // scene-layouts: contenido por beat (17)
import './markkit/index.js'       // graficos/formas/iconos/decoradores (21)
import './datakit/index.js'       // data-viz: numeros/barras/anillos (10)
// PENDIENTES (proximas rondas, ver docs/URVID-1.0-BLUEPRINT.md): color, typography, typekit, photokit, narrative,
//   composition, motion.*, transitions, audio, post.*, perception, strategy, brief, director, critique, audience.
