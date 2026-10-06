// Pruebas de las reglas de negocio y del motor de medidas con datos sintéticos.
import assert from 'node:assert/strict'
import { tipoPlanCuenta, montoEERR, tipoGasto, canonTipoGasto, centroArea, centroNombre, parseDate, num } from '../api/_lib/rules.js'
import { createEngine } from '../src/pnl/measures.js'

// --- reglas ---
assert.equal(tipoPlanCuenta('3110101002'), 'Ganancia')
assert.equal(tipoPlanCuenta(4510401003), 'Gasto')
assert.equal(tipoPlanCuenta('1110801001'), 'Activo')
assert.equal(montoEERR('Ganancia', 0, 1634371), 1634371)
assert.equal(montoEERR('Gasto', 4582001, 0), -4582001)
assert.equal(montoEERR('Activo', 5, 0), 0)

// "Gasto directo" (d minúscula) del plan debe calzar con la medida "Gasto Directo"
assert.equal(canonTipoGasto('Gasto directo'), 'Gasto Directo')
assert.equal(tipoGasto({ tipoPlan: 'Gasto', centroDescripcion: 'INT - Algo', clasifManoObra: 'Gasto directo' }), 'Gasto Directo')
assert.equal(tipoGasto({ tipoPlan: 'Gasto', centroDescripcion: 'GNN - General Empresa', clasifManoObra: '' }), 'Gasto Administrativo')
assert.equal(tipoGasto({ tipoPlan: 'Gasto', centroDescripcion: 'SST - General Servicio', clasifManoObra: '' }), 'Gasto Indirecto')
assert.equal(tipoGasto({ tipoPlan: 'Gasto', centroDescripcion: 'INT - Obra X', clasifManoObra: '' }), 'Gasto Directo')
assert.equal(tipoGasto({ tipoPlan: 'Gasto', centroDescripcion: '', clasifManoObra: '' }), '')
assert.equal(tipoGasto({ tipoPlan: 'Ganancia', centroDescripcion: 'INT - X', clasifManoObra: '' }), '')

assert.equal(centroArea('GNN - General Administración'), 'General Administración')
assert.equal(centroArea('SST - Servicio'), 'Servicio técnico')
assert.equal(centroArea('XXX - nada'), '')
assert.equal(centroNombre('GNN - Gerencia Comercial'), 'Gerencia Comercial')

assert.deepEqual(parseDate('2025-12-31T00:00:00'), { y: 2025, m: 12, d: 31, iso: '2025-12-31' })
assert.equal(parseDate('3/9/2025 10:00:00').m, 3)
assert.equal(parseDate(45658).y, 2025) // serial de Sheets 2025-01-01
assert.equal(parseDate('1900-01-01T00:00:00'), null)
assert.equal(num('$ 1,234'), 1234)
assert.equal(num('-'), 0)

// --- motor de medidas ---
const data = {
  dict: {
    areas: ['Instalaciones', 'General Empresa'],
    tiposGasto: ['Gasto Directo', 'Gasto Indirecto', 'Gasto Administrativo'],
    clasifs: ['MATERIALES'],
    aliases: ['MATERIALES', 'MANO DE OBRA INDIRECTA', 'OTRO'],
  },
  cube: [
    // año, mes, área, tp, tg, cls, alias, flags, monto
    [2025, 1, 0, 0, -1, -1, 2, 0, 1000], // venta Instalaciones
    [2025, 1, 0, 0, -1, -1, 2, 1, 200], // venta en cuenta excluida del Económico
    [2025, 1, 0, 1, 0, 0, 0, 0, -300], // gasto directo materiales
    [2025, 1, 0, 1, 0, -1, 2, 2, -100], // gasto directo MO directa (flag 2)
    [2025, 1, 0, 1, 1, -1, 1, 0, -50], // indirecto MO indirecta
    [2025, 1, 1, 1, 2, -1, 2, 0, -150], // administrativo
  ],
  ppto: {
    ganancias: [[2025, 1, 0, 900]],
    gastos: [[2025, 1, 0, 0, -1, 400], [2025, 1, 0, 1, -1, 60], [2025, 1, 1, 2, -1, 120]],
  },
}
const e = createEngine(data)
const t = e.totals({})
assert.equal(t.ventasNeto, 1200)
assert.equal(t.gastoReal, 600)
assert.equal(t.utilidadReal, 600)
assert.equal(t.gastoDirecto, -400)
assert.equal(t.gastoDirectoMateriales, -300)
assert.equal(t.gastoDirectoMO, -100)
assert.equal(t.realOperacional, 800)
assert.equal(t.gastoIndirecto, -50)
assert.equal(t.gastoIndirectoMO, -50)
assert.equal(t.estadoResultado, 750)
assert.equal(t.estadoResultadoEmpresa, 600)
// presupuesto
assert.equal(t.pptoIngresos, 900)
assert.equal(t.pptoGastos, 580)
assert.equal(t.desviacionVenta, 300)
assert.equal(t.desviacionGasto, 20)
assert.equal(t.resultadoOperacionalPst, 500)
assert.equal(t.estadoResultadoEsperado, 440)
assert.equal(t.estadoResultadoEmpresaEsperado, 320)
assert.ok(Math.abs(t.pctDesviacionIngreso - 300 / 900) < 1e-12)

// vista Económico excluye la cuenta 3110101002
assert.equal(e.totals({ vista: 'Económico' }).ventasNeto, 1000)
assert.equal(e.totals({ vista: 'Financiero' }).ventasNeto, 1200)
// slicer de área filtra hechos y presupuesto
const inst = e.totals({ areas: ['instalaciones'] })
assert.equal(inst.ventasNeto, 1200)
assert.equal(inst.pptoGastos, 460)
// slicer de tipo de gasto: excluye filas sin tipo (ventas) pero no el PPTO de ganancias
const dir = e.totals({ tipos: ['Gasto Directo'] })
assert.equal(dir.ventasNeto, 0)
assert.equal(dir.gastoReal, 400)
assert.equal(dir.pptoIngresos, 900)
// agrupado por área
const byArea = e.aggregate({}, ['area'])
assert.equal(byArea.find((r) => r.area === 'General Empresa').gastoAdministrativo, -150)
// DesviacionGasto = 0 si no hay presupuesto de gasto
assert.equal(e.totals({ years: [2024] }).desviacionGasto, 0)
console.log('OK: reglas y medidas')
