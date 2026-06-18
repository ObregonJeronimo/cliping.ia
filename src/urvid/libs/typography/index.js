// urvid 1.0 · biblioteca TYPOGRAPHY — pairings (display/text/accent). El director elige UNO por rubro/mood/tono.
// Un pairing es DATO (no dibuja): { fonts:{display,text,accent} } + metadata. La tipografia es la firma del estilo.
// PLANTILLA para que los agentes llenen typography/ con cientos de familias + pairings validos.
import { register } from '../../core/registry.js'

const P = (id, category, fonts, rubros, tags, weight = 1) => register({ id, lib: 'typography', category, tones: ['dark', 'light'], rubros, weight, tags, fonts })

P('type.pair.grotesk-clean', 'pairings', { display: 'Space Grotesk', text: 'Inter', accent: 'JetBrains Mono' }, ['*', 'tech', 'default', 'finanzas'], ['limpio', 'moderno'], 1.3)
P('type.pair.editorial-serif', 'pairings', { display: 'Fraunces', text: 'Hanken Grotesk', accent: 'Space Mono' }, ['*', 'moda', 'belleza', 'gastronomia'], ['editorial', 'elegante', 'lujo'], 1.1)
P('type.pair.bold-impact', 'pairings', { display: 'Archivo', text: 'Inter', accent: 'Archivo' }, ['*', 'fitness', 'default'], ['bold', 'punchy'], 1)
P('type.pair.humanist', 'pairings', { display: 'Bricolage Grotesque', text: 'Plus Jakarta Sans', accent: 'Space Grotesk' }, ['*', 'gastronomia', 'educacion', 'salud'], ['amigable', 'calido'], 1)
P('type.pair.corporate', 'pairings', { display: 'Plus Jakarta Sans', text: 'Inter', accent: 'JetBrains Mono' }, ['*', 'finanzas', 'inmobiliaria', 'tech'], ['corporativo', 'sobrio'], 1)
P('type.pair.condensed', 'pairings', { display: 'Oswald', text: 'Barlow', accent: 'Big Shoulders Display' }, ['*', 'fitness', 'default'], ['condensado', 'deportivo', 'news'], 0.9)
P('type.pair.rounded-soft', 'pairings', { display: 'Quicksand', text: 'Hanken Grotesk', accent: 'Caveat' }, ['*', 'belleza', 'salud', 'gastronomia'], ['redondo', 'suave'], 0.8)
P('type.pair.mono-tech', 'pairings', { display: 'Chakra Petch', text: 'JetBrains Mono', accent: 'Space Mono' }, ['*', 'tech'], ['tecnico', 'cyber'], 0.8)
P('type.pair.display-serif', 'pairings', { display: 'Newsreader', text: 'Inter', accent: 'Space Mono' }, ['*', 'moda', 'educacion', 'default'], ['editorial', 'revista'], 0.9)
