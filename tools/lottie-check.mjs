// lottie-check.mjs — valida el gate de determinismo de Lottie (POC 4) sobre el sample real + casos.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { hasExpressions, isSafeLottie, lottieMeta } from '../src/pages/Animaciones/lottieGate.js'

const here = dirname(fileURLToPath(import.meta.url))
const sample = JSON.parse(readFileSync(join(here, '../src/pages/Animaciones/sampleLottie.json'), 'utf8'))

let pass = 0, fail = 0
const ok = (n, c) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`) }

ok('sample es Lottie valido (fr/op/ip)', Number.isFinite(sample.fr) && Number.isFinite(sample.op) && Number.isFinite(sample.ip))
ok('sample pasa el gate (sin expresiones)', isSafeLottie(sample))
const meta = lottieMeta(sample)
ok('meta: fps y duracion > 0', !!meta && meta.fps > 0 && meta.durationInFrames > 0)
console.log('  meta sample:', JSON.stringify(meta))

// sinteticos que DEBEN ser rechazados
const withExpr = { fr: 30, ip: 0, op: 30, layers: [{ ks: { p: { x: 'wiggle(2,10)' } } }] }
ok('rechaza expresion ("x":"...")', hasExpressions(withExpr) && !isSafeLottie(withExpr))
const withEf = { fr: 30, ip: 0, op: 30, layers: [{ ef: [{ ty: 5 }] }] }
ok('rechaza efectos ("ef")', hasExpressions(withEf) && !isSafeLottie(withEf))
// no debe confundir "ix" (property index) con "x" expresion
const withIx = { fr: 30, ip: 0, op: 30, layers: [{ ks: { p: { ix: 3, k: [0, 0] } } }] }
ok('NO confunde "ix" con expresion', !hasExpressions(withIx) && isSafeLottie(withIx))

console.log(`\n${pass} pass, ${fail} fail`)
process.exit(fail ? 1 : 0)
