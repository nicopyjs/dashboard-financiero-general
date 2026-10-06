// Compara el cubo calculado desde Google Sheets contra el baseline de Power BI.
// Uso:  node scripts/validate.mjs        (requiere credenciales en .env.local)
import fs from 'node:fs'
import path from 'node:path'

// Carga .env.local sin dependencias.
const envFile = path.resolve('.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const { loadModel } = await import('../api/_lib/model.js')
const { createEngine } = await import('../src/pnl/measures.js')
const { BASELINE, BASELINE_PPTO_2025, BASELINE_VISTAS_2025 } = await import('./baseline.mjs')

const t0 = Date.now()
const model = await loadModel()
console.log(`Modelo cargado en ${((Date.now() - t0) / 1000).toFixed(1)} s`)
console.log(
  'Filas leídas:', model.stats.rows,
  '· duplicados descartados:', model.stats.duplicates,
  '· líneas P&L:', model.stats.lines
)
console.log('Hojas:', model.stats.sheets)

const engine = createEngine({ dict: model.dict, cube: model.cube, ppto: model.ppto })
const monthly = engine.aggregate({}, ['year', 'month'])
const get = (y, m) => monthly.find((r) => r.year === y && r.month === m)

const TOL = 1 // pesos
let bad = 0
let checked = 0
const rows = []
for (const b of BASELINE) {
  const r = get(b.y, b.m)
  const mine = {
    ventas: r?.ventasNeto ?? 0,
    gasto: r?.gastoReal ?? 0,
    dir: r?.gastoDirecto ?? 0,
    ind: r?.gastoIndirecto ?? 0,
    adm: r?.gastoAdministrativo ?? 0,
  }
  for (const k of Object.keys(mine)) {
    checked++
    const diff = mine[k] - b[k]
    if (Math.abs(diff) > TOL) {
      bad++
      rows.push({
        periodo: `${b.y}-${String(b.m).padStart(2, '0')}`,
        medida: k,
        powerbi: b[k],
        nuevo: Math.round(mine[k]),
        diff: Math.round(diff),
      })
    }
  }
}
console.log(`\nHechos (año/mes): ${checked - bad}/${checked} medidas calzan (tolerancia $${TOL}).`)
if (rows.length) console.table(rows.slice(0, 60))

// Presupuesto 2025
let pBad = 0
const p2025 = engine.aggregate({ years: [2025] }, ['month'])
for (const b of BASELINE_PPTO_2025) {
  const r = p2025.find((x) => x.month === b.m)
  const checks = [
    ['pG', r?.pptoIngresos ?? 0, b.pG],
    ['pGasto', r?.pptoGastos ?? 0, b.pGasto],
    ['EERR esperado', r?.estadoResultadoEsperado ?? 0, b.eerr],
  ]
  for (const [name, mine, expected] of checks) {
    if (Math.abs(mine - expected) > 1) {
      pBad++
      console.log(`PPTO 2025-${b.m} ${name}: powerbi=${expected} nuevo=${Math.round(mine)}`)
    }
  }
}
console.log(`Presupuesto 2025: ${pBad === 0 ? 'todo calza' : pBad + ' diferencias'}`)

// Vistas (año fiscal 2025 ~ calendario 2025)
for (const [vista, exp] of Object.entries(BASELINE_VISTAS_2025)) {
  const t = engine.totals({ years: [2025], vista })
  console.log(
    `Vista ${vista}: ventas ${Math.round(t.ventasNeto)} (PBI ${exp.ventas}) · gasto ${Math.round(t.gastoReal)} (PBI ${exp.gasto})`
  )
}

process.exit(bad || pBad ? 1 : 0)
