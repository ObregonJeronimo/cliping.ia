// urvid 1.0 · carga TODAS las bibliotecas (side-effect: registra sus modulos en el registro).
// Cada biblioteca nueva que llenen los agentes se agrega con un import aca.
import './color/index.js'         // esquemas/moods de color (derive -> paleta)
import './typography/index.js'    // pairings de fuentes (display/text/accent)
import './backgrounds/index.js'   // fondos full-canvas
import './substrates/index.js'    // texturas/overlays tenues
import './atmosphere/index.js'    // capas de luz/atmosfera
import './scenes/index.js'        // scene-layouts: contenido por beat
import './markkit/index.js'       // graficos/formas/iconos/decoradores
import './datakit/index.js'       // data-viz: numeros/barras/anillos
// PENDIENTES (proximas rondas, ver docs/URVID-1.0-BLUEPRINT.md): typekit, photokit, narrative, composition,
//   motion.*, transitions, audio, post.*, perception, strategy, brief, director, critique, audience.
