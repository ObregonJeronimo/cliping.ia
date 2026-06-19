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

// --- OLA 3: mas pairings (familias bundled en tools/fonts -> sin tofu) ---
// Lujo / editorial alto: serif de exhibicion + grotesk humanista + mono fino.
P('type.pair.fashion-luxe', 'pairings', { display: 'Playfair Display', text: 'Hanken Grotesk', accent: 'Space Mono' }, ['*', 'moda', 'belleza', 'joyeria'], ['lujo', 'editorial', 'elegante', 'glamour'], 1)
// Brutalista / industrial: condensada pesada + sans neutro + mono tecnico.
P('type.pair.brutalist', 'pairings', { display: 'Anton', text: 'Inter Tight', accent: 'IBM Plex Mono' }, ['*', 'fitness', 'eventos', 'default'], ['brutalista', 'industrial', 'impacto', 'poster'], 0.9)
// Geometrico premium: grotesk geometrico + neutro + mono -> SaaS / startup.
P('type.pair.geometric-startup', 'pairings', { display: 'Sora', text: 'Onest', accent: 'JetBrains Mono' }, ['*', 'tech', 'finanzas', 'startup'], ['geometrico', 'moderno', 'startup', 'limpio'], 1.1)
// Cartel deportivo: condensada de display + condensada de cuerpo + condensada display de acento.
P('type.pair.sport-poster', 'pairings', { display: 'Big Shoulders Display', text: 'Barlow', accent: 'Oswald' }, ['*', 'fitness', 'deportes', 'eventos'], ['deportivo', 'condensado', 'energico', 'poster'], 0.9)
// Magazine serif clasico: serif display + serif de lectura + mono retro.
P('type.pair.magazine-classic', 'pairings', { display: 'DM Serif Display', text: 'Spectral', accent: 'Space Mono' }, ['*', 'moda', 'educacion', 'gastronomia'], ['editorial', 'magazine', 'clasico', 'serif'], 0.9)
// Friendly redondeado: display redondo divertido + cuerpo amistoso + script a mano.
P('type.pair.friendly-round', 'pairings', { display: 'Bagel Fat One', text: 'Quicksand', accent: 'Caveat' }, ['*', 'gastronomia', 'infantil', 'belleza'], ['amigable', 'redondo', 'divertido', 'calido'], 0.8)
// Cyber / tech bold: grotesk expandido futurista + neutro + mono.
P('type.pair.cyber-bold', 'pairings', { display: 'Unbounded', text: 'DM Sans', accent: 'Space Mono' }, ['*', 'tech', 'gaming', 'eventos'], ['cyber', 'futurista', 'bold', 'tech'], 0.8)
// Clean swiss: grotesk neutro de display + el mismo de cuerpo + mono.
P('type.pair.clean-swiss', 'pairings', { display: 'Familjen Grotesk', text: 'Inter', accent: 'IBM Plex Mono' }, ['*', 'finanzas', 'inmobiliaria', 'tech', 'corporativo'], ['swiss', 'limpio', 'neutro', 'corporativo'], 1)
// Editorial calido: serif organico de exhibicion + grotesk suave + mono.
P('type.pair.warm-editorial', 'pairings', { display: 'Fraunces', text: 'Onest', accent: 'JetBrains Mono' }, ['*', 'gastronomia', 'belleza', 'salud'], ['editorial', 'calido', 'organico', 'suave'], 0.9)
// Retro funk: display retro pesado + neutro + script marcador.
P('type.pair.retro-funk', 'pairings', { display: 'Righteous', text: 'DM Sans', accent: 'Permanent Marker' }, ['*', 'gastronomia', 'eventos', 'musica'], ['retro', 'funk', 'divertido', 'vintage'], 0.7)
// Maximal display: grotesk recortado dramatico + neutro + mono.
P('type.pair.maximal-display', 'pairings', { display: 'Darker Grotesque', text: 'Hanken Grotesk', accent: 'Space Mono' }, ['*', 'moda', 'default', 'eventos'], ['maximal', 'display', 'dramatico'], 0.7)
// Tech editorial: grotesk geometrico + serif de lectura -> contraste sans/serif moderno.
P('type.pair.tech-editorial', 'pairings', { display: 'Outfit', text: 'Newsreader', accent: 'JetBrains Mono' }, ['*', 'tech', 'educacion', 'default'], ['editorial', 'contraste', 'moderno', 'tech'], 0.9)
// Boutique chic: serif fino de display + grotesk humanista + script.
P('type.pair.boutique-chic', 'pairings', { display: 'Spectral', text: 'Plus Jakarta Sans', accent: 'Caveat' }, ['*', 'belleza', 'moda', 'gastronomia'], ['boutique', 'chic', 'elegante', 'suave'], 0.8)
// Statement bold: grotesk geometrico ultra + neutro + mono -> claim potente.
P('type.pair.statement-bold', 'pairings', { display: 'Plus Jakarta Sans', text: 'Sora', accent: 'IBM Plex Mono' }, ['*', 'fitness', 'tech', 'default'], ['bold', 'statement', 'punchy', 'moderno'], 1)

// --- OLA tipografica (jun 2026): +20 pairings con register/intensity explicitos (alimentan el selector v3).
// Solo familias REALMENTE cargadas (tools/fonts + index.html) -> sin tofu en la app ni en el render Node.
const P2 = (id, fonts, rubros, reg, intensity, tags, weight = 1) =>
  register({ id, lib: 'typography', category: 'pairings', tones: ['dark', 'light'], rubros, weight, register: reg, intensity, tags, fonts })

P2('type.pair.caprasimo-fun', { display: 'Caprasimo', text: 'DM Sans', accent: 'Caveat' }, ['*', 'gastronomia', 'eventos', 'belleza'], 'playful', 'bold', ['divertido', 'chunky', 'calido'], 0.8)
P2('type.pair.tight-modern', { display: 'Inter Tight', text: 'Inter', accent: 'JetBrains Mono' }, ['*', 'tech', 'default', 'finanzas'], 'neutral', 'medium', ['moderno', 'limpio', 'tight'], 1.1)
P2('type.pair.serif-drama', { display: 'Playfair Display', text: 'Spectral', accent: 'Space Mono' }, ['*', 'moda', 'educacion', 'belleza'], 'editorial', 'bold', ['serif', 'dramatico', 'editorial'], 0.9)
P2('type.pair.anton-news', { display: 'Anton', text: 'Barlow', accent: 'Oswald' }, ['*', 'fitness', 'eventos', 'deportes'], 'neutral', 'loud', ['poster', 'condensado', 'impacto', 'news'], 0.9)
P2('type.pair.onest-quiet', { display: 'Onest', text: 'Onest', accent: 'IBM Plex Mono' }, ['*', 'finanzas', 'tech', 'salud'], 'corporate', 'calm', ['sobrio', 'neutro', 'prolijo'], 1)
P2('type.pair.unbounded-pop', { display: 'Unbounded', text: 'Hanken Grotesk', accent: 'Space Mono' }, ['*', 'tech', 'eventos', 'gaming'], 'playful', 'bold', ['futurista', 'pop', 'redondo'], 0.8)
P2('type.pair.dmserif-editorial', { display: 'DM Serif Display', text: 'Inter', accent: 'JetBrains Mono' }, ['*', 'moda', 'inmobiliaria', 'educacion'], 'editorial', 'medium', ['serif', 'editorial', 'elegante'], 0.95)
P2('type.pair.bricolage-warm', { display: 'Bricolage Grotesque', text: 'DM Sans', accent: 'Caveat' }, ['*', 'gastronomia', 'salud', 'educacion'], 'friendly', 'medium', ['calido', 'humano', 'amigable'], 1)
P2('type.pair.oswald-stack', { display: 'Oswald', text: 'Inter', accent: 'Barlow' }, ['*', 'fitness', 'default', 'deportes'], 'neutral', 'bold', ['condensado', 'deportivo', 'stack'], 0.9)
P2('type.pair.darker-fashion', { display: 'Darker Grotesque', text: 'Onest', accent: 'Space Mono' }, ['*', 'moda', 'belleza', 'default'], 'editorial', 'bold', ['fashion', 'display', 'dramatico'], 0.8)
P2('type.pair.sora-saas', { display: 'Sora', text: 'DM Sans', accent: 'IBM Plex Mono' }, ['*', 'tech', 'finanzas', 'startup'], 'corporate', 'medium', ['saas', 'geometrico', 'startup'], 1.1)
P2('type.pair.fraunces-boutique', { display: 'Fraunces', text: 'Hanken Grotesk', accent: 'Caveat' }, ['*', 'belleza', 'moda', 'gastronomia'], 'editorial', 'soft', ['boutique', 'organico', 'suave'], 0.9)
P2('type.pair.outfit-clean', { display: 'Outfit', text: 'Inter', accent: 'JetBrains Mono' }, ['*', 'tech', 'default', 'finanzas'], 'neutral', 'medium', ['limpio', 'moderno', 'geometrico'], 1.05)
P2('type.pair.righteous-retro', { display: 'Righteous', text: 'Barlow', accent: 'Permanent Marker' }, ['*', 'eventos', 'gastronomia', 'musica'], 'playful', 'loud', ['retro', 'funk', 'vintage'], 0.7)
P2('type.pair.newsreader-read', { display: 'Newsreader', text: 'Newsreader', accent: 'Space Mono' }, ['*', 'educacion', 'default', 'finanzas'], 'editorial', 'calm', ['serif', 'lectura', 'editorial'], 0.85)
P2('type.pair.chakra-cyber', { display: 'Chakra Petch', text: 'DM Sans', accent: 'JetBrains Mono' }, ['*', 'tech', 'gaming'], 'playful', 'bold', ['cyber', 'tecnico', 'gaming'], 0.8)
P2('type.pair.jakarta-trust', { display: 'Plus Jakarta Sans', text: 'Hanken Grotesk', accent: 'IBM Plex Mono' }, ['*', 'salud', 'finanzas', 'inmobiliaria'], 'corporate', 'calm', ['confianza', 'sobrio', 'prolijo'], 1)
P2('type.pair.bigshoulders-impact', { display: 'Big Shoulders Display', text: 'Inter Tight', accent: 'Oswald' }, ['*', 'fitness', 'deportes', 'eventos'], 'neutral', 'loud', ['impacto', 'condensado', 'poster'], 0.85)
P2('type.pair.bagel-playful', { display: 'Bagel Fat One', text: 'DM Sans', accent: 'Permanent Marker' }, ['*', 'gastronomia', 'infantil', 'belleza'], 'playful', 'bold', ['redondo', 'divertido', 'goloso'], 0.7)
P2('type.pair.familjen-editorial', { display: 'Familjen Grotesk', text: 'Onest', accent: 'Space Mono' }, ['*', 'finanzas', 'inmobiliaria', 'tech'], 'corporate', 'medium', ['swiss', 'neutro', 'corporativo'], 1)
