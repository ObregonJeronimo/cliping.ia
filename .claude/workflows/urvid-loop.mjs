export const meta = {
  name: 'urvid-loop',
  description: 'Urvid autonomous improvement loop (MOCK only, no product API): anti-sameness + soul + new-techniques + QA, adversarially verified -> prioritized fix plan',
  phases: [
    { title: 'Prep', detail: 'regenerate mock brands + render frame pack + run probes (no API)' },
    { title: 'Analizar', detail: 'anti-sameness + alma + investigador + QA visual (parallel)' },
    { title: 'Verificar', detail: 'adversarial skeptic per proposed fix' },
  ],
}
const BASE = 'C:/Users/Usuario/Documents/cliping.ia'
const PK = `${BASE}/tools/_pack`
const RULES = 'REGLAS (ver docs/ARBOL.md): Canvas-2D DETERMINISTA (mulberry32, sin Math-random/reloj); bg-check 16/16; NO IA generativa; NO usar la API del producto (solo el MOCK); NO morph/figuras sobre titulos; legibilidad del cuerpo; commits ASCII'

const FIND = {
  type: 'object', additionalProperties: false,
  properties: { findings: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: { area: { type: 'string' }, severity: { type: 'string', enum: ['alta', 'media', 'baja'] }, issue: { type: 'string' }, fix: { type: 'string' }, file: { type: 'string' } },
    required: ['area', 'severity', 'issue', 'fix'] } } }, required: ['findings'],
}
const VERD = { type: 'object', additionalProperties: false, properties: { real: { type: 'boolean' }, confidence: { type: 'string', enum: ['alta', 'media', 'baja'] }, reasoning: { type: 'string' }, fixRisk: { type: 'string' } }, required: ['real', 'confidence', 'reasoning', 'fixRisk'] }

phase('Prep')
await agent(`Prepara el banco de pruebas de Urvid (sin API, todo local), desde ${BASE}, con Bash:
1) python backend/mock_director.py --out tools/brands   (regenera marcas mock deterministas)
2) node tools/bg-check.mjs   (DEBE dar 16/16; si no, REPORTALO)
3) node tools/similarity-probe.mjs tools/brands   (anti-sameness)
4) node tools/dump-pack.mjs   (renderiza un pack de frames full-res por escena de ~6 marcas a ${PK})
Devolve en texto: el output de similarity-probe, si bg-check dio 16/16, y cuantos PNGs creo el pack.`, { label: 'prep', phase: 'Prep' })

phase('Analizar')
const groups = await parallel([
  () => agent(`Sos el agente ANTI-SAMENESS de Urvid (la prioridad #1: dos paginas distintas NO pueden dar videos parecidos). Con Bash corre  node tools/similarity-probe.mjs tools/brands  y leelo; abri con Read los frames de ${PK} de los pares mas parecidos y de las marcas que comparten estructura. Identifica que hace que se parezcan (misma secuencia de escenas, mismo layout, mismo ritmo) y proponé fixes CONCRETOS y deterministas para variar por marca: estructura (backend/mock_director.py _gen_structure y el prompt de backend/timeline_director.py), layout por escena, ritmo/duraciones, paleta. ${RULES}. Devolve findings (area, severity, issue, fix con archivo:linea aprox, file).`, { label: 'anti-sameness', phase: 'Analizar', schema: FIND }),
  () => agent(`Sos el agente ALMA-DE-LA-PAGINA de Urvid. ¿El video refleja el rubro/mensaje/marca/fotos del sitio, o se siente generico? Abri con Read frames de ${PK} de varias marcas (distintos rubros) y juzga si el look/copy/fotos transmiten la identidad de ESA marca. Proponé fixes deterministas (uso de fotos reales, motivo contextual por rubro, copy especifico) en engineCore.js / mock_director.py / el prompt de timeline_director.py. ${RULES}. Devolve findings.`, { label: 'alma', phase: 'Analizar', schema: FIND }),
  () => agent(`Sos el agente INVESTIGADOR de Urvid. Proponé 2-4 tecnicas NUEVAS y deterministas (sin IA generativa, Canvas-2D) que suban la calidad y la UNICIDAD por marca: motion premium, tipografia cinetica/variable, composicion editorial, transiciones, texturas, grids. Para cada una: que es, por que ayuda a "capturar el alma" + unicidad, y un punto de integracion CONCRETO en src/pages/Animaciones/engineCore.js (funcion/escena). Nada que rompa el determinismo ni dependa de fuentes/glifos no embebidos. ${RULES}. Devolve findings (area='tecnica-nueva').`, { label: 'investigador', phase: 'Analizar', schema: FIND }),
  () => agent(`Sos QA VISUAL de Urvid (director de arte 2026). Abri con Read ~12 PNGs variados de ${PK} y lista defectos concretos que queden: texto ilegible, vacios, recortes, composicion floja, algo que parezca bug/plantilla. NO re-reportes cosas ya resueltas (estrellas tofu, blobs morph, scrim de tono claro) salvo que las VEAS de nuevo. ${RULES}. Devolve findings.`, { label: 'qa-visual', phase: 'Analizar', schema: FIND }),
])
const all = []; for (const g of groups) if (g && g.findings) for (const f of g.findings) all.push(f)
const top = all.filter(f => f.severity !== 'baja')

phase('Verificar')
const verds = await parallel(top.map((f) => () =>
  agent(`Sos revisor ESCEPTICO del motor de Urvid (repo ${BASE}). Confirma o REFUTA este hallazgo y evalua el riesgo del fix; si dudas, leé el codigo (src/pages/Animaciones/engineCore.js, backend/mock_director.py, backend/timeline_director.py) o corré las sondas/visor. ${RULES}. Hallazgo: [${f.area}] ${f.issue} -> fix: ${f.fix} (${f.file || '?'}). Devolve veredicto.`,
    { label: `verif:${f.area}`.slice(0, 38), phase: 'Verificar', schema: VERD }).then(v => ({ f, v }))))

const confirmed = verds.filter(Boolean).filter(x => x.v && x.v.real)
return {
  totals: { all: all.length, alta: all.filter(f => f.severity === 'alta').length, media: all.filter(f => f.severity === 'media').length },
  confirmedFixes: confirmed.map(x => ({ area: x.f.area, issue: x.f.issue, fix: x.f.fix, file: x.f.file, confidence: x.v.confidence, fixRisk: x.v.fixRisk })),
  refuted: verds.filter(Boolean).filter(x => x.v && !x.v.real).map(x => ({ area: x.f.area, issue: x.f.issue, why: x.v.reasoning })),
  allFindings: all,
}
