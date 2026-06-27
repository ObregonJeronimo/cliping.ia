// brief_to_prompt.mjs — BRIEF (perception) -> PROMPT detallado de Seedance 2.0, estructura oficial:
// Subject -> Action -> Environment -> Camera -> Lighting -> Style -> Constraints (60-100 palabras, ingles).
// Las imagenes reales de la pagina se referencian con @Image1, @Image2... (Seedance acepta hasta 9).
const WORLD = {
  salud:        { subj: 'a glass jar of natural health-food grains, seeds and dried herbs', place: 'a cozy, tidy home kitchen', mood: 'wholesome, natural, trustworthy' },
  gastronomia:  { subj: 'a freshly made dish with vivid fresh ingredients', place: 'a warm wooden table', mood: 'appetizing, fresh, inviting' },
  finanzas:     { subj: 'a clean phone dashboard with rising charts and coins', place: 'a minimal desk', mood: 'reliable, professional, calm' },
  tech:         { subj: 'a sleek modern device with clean glowing interfaces', place: 'a minimal futuristic space', mood: 'innovative, precise' },
  moda:         { subj: 'the garment with rich fabric texture and detail', place: 'a clean editorial set', mood: 'aspirational, stylish' },
  belleza:      { subj: 'a skincare bottle with soft drips and creamy texture', place: 'a clean spa-like vanity', mood: 'sensorial, premium, soft' },
  fitness:      { subj: 'the product with dynamic athletic energy', place: 'a gym or outdoor with energy', mood: 'energetic, powerful' },
  inmobiliaria: { subj: 'the bright interior of the property with light pouring in', place: 'spacious sunlit rooms', mood: 'aspirational, warm' },
  educacion:    { subj: 'the course material with hands taking notes', place: 'a tidy study desk', mood: 'clear, inspiring' },
  default:      { subj: 'the brand product', place: 'a clean on-brand set', mood: 'premium' },
}
const SHOT = {
  hero:      { act: 'The camera slowly pushes in toward it in one smooth continuous move', dof: 'shallow depth of field, photoreal texture' },
  statement: { act: 'The camera glides in a single slow gentle pan across the scene', dof: 'soft focus, natural depth' },
  data:      { act: 'A calm slow orbit reveals a few of them arranged neatly', dof: 'crisp, even focus' },
  checklist: { act: 'The camera holds and slowly racks focus between close-up details', dof: 'tight macro close-up' },
  outro:     { act: 'A hand gently reaches in and places it into a kraft delivery box, one calm final beat', dof: 'shallow depth of field' },
}
const LIGHT = {
  dark:  'warm side rim light with deep soft shadows, premium moody key light',
  light: 'bright airy natural daylight, clean soft fill, gentle highlights',
}
function promptFor(brief, fn, img = '@Image1') {
  const w = WORLD[brief.rubro] || WORLD.default, s = SHOT[fn] || SHOT.statement
  return [
    `${img} — ${w.subj} — rests on a clean surface in ${w.place}.`,   // Subject (anclado a la imagen real)
    `${s.act}.`,                                                       // Action + Camera (una sola)
    `${LIGHT[brief.tone] || LIGHT.dark}; ${w.mood} mood; ${s.dof}.`,   // Lighting (lo que mas impacta) + Style
    `Vertical 9:16, photorealistic, slow and smooth. No cuts, no fast motion, no on-screen text, no logos, no words.`, // Constraints
  ].join(' ').replace(/\s+/g, ' ').trim()
}
const brief = { brand: 'Yerco Dietetica', rubro: 'salud', tone: 'dark', tagline: 'Tu dietetica de confianza', claim: 'Productos naturales y de calidad a la puerta de tu casa', cta: 'Pedi por WhatsApp' }
for (const fn of ['hero', 'outro']) {
  const p = promptFor(brief, fn)
  console.log(`\n[${fn.toUpperCase()}] (${p.split(' ').length} palabras)`)
  console.log(p)
}
