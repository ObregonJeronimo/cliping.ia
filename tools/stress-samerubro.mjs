// stress-samerubro.mjs — genera N marcas del MISMO rubro al estilo PRODUCCION (cada una con su propia
// stable_seed, SIN el re-roll anti-colision del banco) y mide cuantas colisionan. Asi se ve el riesgo
// real de "dos videos parecidos" en produccion (donde cada video se genera aislado, sin memoria cross-marca).
// Usa el mock como motor de datos (NO la API). Escribe a tools/_stress/<rubro>/ y corre la similarity-probe.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

// 8 nombres reales-ish por rubro (mismo rubro -> mismo PROFILE en style_engine -> el riesgo de molde es maximo)
const BANKS = {
  inmobiliaria: ['Altos del Sur', 'Nogal', 'Mirador', 'Costa Real', 'Pampa Norte', 'Solares', 'Bahia', 'Cumbres'],
  tech: ['DataFlow', 'Nimbus', 'Vortex', 'Pulsar', 'Quanta', 'Nodo', 'Sintra', 'Kairo'],
}
const IND = { inmobiliaria: 'inmobiliaria de propiedades premium', tech: 'plataforma SaaS de automatizacion para pymes' }

const rubro = process.argv[2] || 'inmobiliaria'
const names = BANKS[rubro]
if (!names) { console.error('rubro desconocido:', rubro, '-> elegi:', Object.keys(BANKS).join('|')); process.exit(1) }
const outDir = join(ROOT, 'tools', '_stress', rubro)
rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true })

// Generar via el mock en Python (production-style: stable_seed por nombre, SIN re-roll). Un proceso, todas las marcas.
const py = `
import sys, os, json
sys.path.insert(0, os.path.join(${JSON.stringify(ROOT)}, 'backend'))
import style_engine as se
import mock_director as mock
names = ${JSON.stringify(names)}
ind = ${JSON.stringify(IND[rubro])}
out = ${JSON.stringify(outDir)}
styles = mock.STYLE_ORDER
for i, name in enumerate(names):
    seed = se.stable_seed(name, ind)              # PRODUCCION: una sola semilla por marca, sin re-roll
    sty = styles[i % len(styles)]
    tl = mock.generate(name, ind, seed=seed, style=sty, images=[])
    slug = ''.join(c for c in name.lower().replace(' ', '-') if c.isalnum() or c == '-')
    json.dump(tl, open(os.path.join(out, f"{i:02d}-{slug}.json"), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"{name:16} {tl['rubro']:13} {tl['theme']:16} {tl['accent']}  estructura={'-'.join(tl['structure'])}")
print()
`
console.log(`STRESS same-rubro = "${rubro}" (${names.length} marcas, production-style: sin re-roll)\n`)
execFileSync('python', ['-c', py], { stdio: 'inherit' })
// Medir colisiones con la probe ya existente (cae a "todos los .json" si no hay banco canonico ^\d\d-... pero estos SI lo son)
execFileSync('node', [join(ROOT, 'tools', 'similarity-probe.mjs'), outDir], { stdio: 'inherit' })
