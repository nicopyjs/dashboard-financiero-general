import { getSheet, getColumns } from './google.js'
import { memo } from './cache.js'
import { loadPpto } from './ppto.js'
import {
  SOURCES,
  TABS,
  TTL,
  CUENTA_EXCLUIDA_ECONOMICO,
  CUENTA_MO_DIRECTA,
} from './config.js'
import {
  num,
  parseDate,
  fold,
  isBlank,
  tipoPlanCuenta,
  montoEERR,
  tipoGasto,
  canonTipoGasto,
  centroArea,
} from './rules.js'

const DETAIL_COLUMNS = [
  'detailLine',
  'accountCode',
  'debit',
  'credit',
  'comment',
  'bussinessCenterId',
  'voucherNumber',
  'voucherType',
  'fiscalYear',
  'date',
]

// --- Dimensiones -----------------------------------------------------------

function sheetToObjects(rows) {
  if (!rows.length) return []
  const header = rows[0].map((h) => String(h).trim())
  return rows.slice(1).map((r) => {
    const o = {}
    header.forEach((h, i) => (o[h] = r[i] ?? ''))
    return o
  })
}

/** Busca una propiedad por nombre ignorando mayúsculas y tildes. */
function pick(obj, name) {
  const target = fold(name)
  for (const k of Object.keys(obj)) if (fold(k) === target) return obj[k]
  return ''
}

/** Plan_De_Cuentas: Code1 numérico, distinct por Code1. */
export function loadPlan() {
  return memo('plan', TTL.dims, async () => {
    const rows = await getSheet(SOURCES.planes, `'${TABS.planes}'`)
    const byCode = new Map()
    for (const o of sheetToObjects(rows)) {
      const code = String(pick(o, 'Code1')).trim().replace(/\.0+$/, '')
      if (!/^\d+$/.test(code) || byCode.has(code)) continue
      byCode.set(code, {
        descripcion: String(pick(o, 'Descripción')).trim(),
        // "Tipo de gasto" se renombra a ClasificacionGasto en el modelo.
        clasificacion: String(pick(o, 'Tipo de gasto')).trim(),
        clasifManoObra: String(pick(o, 'Clasificacion_manoObra')).trim(),
        alias: String(pick(o, 'Alias 2')).trim(),
      })
    }
    return byCode
  })
}

/** Centros_Negocio: solo Imputable = "S", distinct por Code. */
export function loadCentros() {
  return memo('centros', TTL.dims, async () => {
    const rows = await getSheet(SOURCES.centros, `'${TABS.centros}'`)
    const byCode = new Map()
    for (const o of sheetToObjects(rows)) {
      const code = String(pick(o, 'Code')).trim()
      if (!code || byCode.has(code)) continue
      if (String(pick(o, 'Imputable')).trim().toUpperCase() !== 'S') continue
      const description = String(pick(o, 'Description')).trim()
      byCode.set(code, { description, area: centroArea(description) })
    }
    return byCode
  })
}

// --- Asientos --------------------------------------------------------------

/** Filas crudas de una hoja de detalle (solo las columnas necesarias). */
function loadDetailSheet(sheetName, ttl) {
  return memo(`details:${sheetName}`, ttl, async () => {
    const { columns, length, missing } = await getColumns(
      SOURCES.movimientos,
      sheetName,
      DETAIL_COLUMNS
    )
    if (missing.length) {
      throw new Error(`Hoja "${sheetName}": faltan columnas ${missing.join(', ')}`)
    }
    return { sheetName, columns, length }
  })
}

async function loadAllDetails() {
  const thisYear = new Date().getFullYear()
  const jobs = TABS.histYears.map((y) =>
    loadDetailSheet(`hist_details_${y}`, y >= thisYear ? TTL.live : TTL.closedYear)
  )
  jobs.push(loadDetailSheet(TABS.recent, TTL.live))
  return Promise.all(jobs)
}

// --- Construcción del cubo -------------------------------------------------

/**
 * Lee todo y construye:
 *  - cube: montos agregados por (año, mes, área, tipo plan, tipo gasto,
 *    clasificación, alias, flags) -> lo que consume el front para las medidas.
 *  - lines: líneas de gasto/ganancia para el drill-down por comprobante.
 */
export function loadModel() {
  return memo('model', TTL.model, async () => {
    const [plan, centros, sheets, pptoRaw] = await Promise.all([
      loadPlan(),
      loadCentros(),
      loadAllDetails(),
      loadPpto(),
    ])

    // Más reciente gana: las hojas "recent" van al final del arreglo.
    const seen = new Map()
    const stats = { sheets: {}, rows: 0, duplicates: 0, lines: 0 }

    for (const sh of sheets) {
      const { columns: c, length } = sh
      stats.sheets[sh.sheetName] = length
      for (let i = 0; i < length; i++) {
        const accountCode = String(c.accountCode[i]).trim().replace(/\.0+$/, '')
        if (!accountCode) continue
        stats.rows++

        const voucherType = String(c.voucherType[i]).trim()
        const voucherNumber = String(c.voucherNumber[i]).trim().replace(/\.0+$/, '')
        const fiscalYear = String(c.fiscalYear[i]).trim().replace(/\.0+$/, '')
        const detailLine = String(c.detailLine[i]).trim().replace(/\.0+$/, '')
        const key = `${voucherType}|${fiscalYear}|${voucherNumber}|${detailLine}|${accountCode}`

        if (seen.has(key)) stats.duplicates++
        seen.set(key, {
          accountCode,
          debit: num(c.debit[i]),
          credit: num(c.credit[i]),
          comment: String(c.comment[i] ?? '').trim(),
          centroId: String(c.bussinessCenterId[i]).trim(),
          voucherNumber,
          voucherType,
          date: parseDate(c.date[i]),
        })
      }
    }

    const dict = {
      areas: [],
      tiposGasto: [],
      clasifs: [],
      aliases: [],
    }
    const idx = {
      areas: new Map(),
      tiposGasto: new Map(),
      clasifs: new Map(),
      aliases: new Map(),
    }
    const intern = (kind, value) => {
      if (isBlank(value)) return -1
      const k = kind === 'areas' ? fold(value) : String(value)
      let i = idx[kind].get(k)
      if (i === undefined) {
        i = dict[kind].length
        dict[kind].push(String(value))
        idx[kind].set(k, i)
      }
      return i
    }

    // AreasNegocio: todas las áreas de los centros, aunque no tengan movimientos.
    for (const c of centros.values()) intern('areas', c.area)

    const cube = new Map()
    const lines = []

    for (const r of seen.values()) {
      const tipoPlan = tipoPlanCuenta(r.accountCode)
      const monto = montoEERR(tipoPlan, r.debit, r.credit)
      if (monto === 0) continue
      if (!r.date) continue // sin fecha no entra al calendario del modelo

      const centro = centros.get(r.centroId)
      const cuenta = plan.get(r.accountCode)
      const area = centro?.area || ''
      const tg = tipoGasto({
        tipoPlan,
        centroDescripcion: centro?.description,
        clasifManoObra: cuenta?.clasifManoObra,
      })

      const areaI = intern('areas', area)
      const tgI = intern('tiposGasto', tg)
      const clsI = intern('clasifs', cuenta?.clasificacion)
      const aliasI = intern('aliases', cuenta?.alias)
      const tp = tipoPlan === 'Ganancia' ? 0 : 1
      const flags =
        (r.accountCode === CUENTA_EXCLUIDA_ECONOMICO ? 1 : 0) |
        (r.accountCode === CUENTA_MO_DIRECTA ? 2 : 0)

      const ck = `${r.date.y}|${r.date.m}|${areaI}|${tp}|${tgI}|${clsI}|${aliasI}|${flags}`
      let row = cube.get(ck)
      if (!row) {
        row = [r.date.y, r.date.m, areaI, tp, tgI, clsI, aliasI, flags, 0]
        cube.set(ck, row)
      }
      row[8] += monto

      lines.push({
        y: r.date.y,
        m: r.date.m,
        date: r.date.iso,
        area: areaI,
        tp,
        tg: tgI,
        cls: clsI,
        alias: aliasI,
        flags,
        monto,
        cuenta: cuenta?.descripcion ?? '',
        centro: centro?.description ?? '',
        // InfoComprobante solo existe cuando hay área.
        info: area ? `${r.voucherType}-${r.voucherNumber}-${r.comment}` : '',
      })
    }
    stats.lines = lines.length

    // Presupuesto: mismas dimensiones que los hechos (área, tipo, clasificación).
    const pGan = new Map()
    for (const r of pptoRaw.ganancias) {
      const k = `${r.y}|${r.m}|${intern('areas', r.area)}`
      const row = pGan.get(k) ?? [r.y, r.m, intern('areas', r.area), 0]
      row[3] += r.monto
      pGan.set(k, row)
    }
    const pGas = new Map()
    for (const r of pptoRaw.gastos) {
      const a = intern('areas', r.area)
      const t = intern('tiposGasto', r.tipoGasto)
      const c = intern('clasifs', r.clasif)
      const k = `${r.y}|${r.m}|${a}|${t}|${c}`
      const row = pGas.get(k) ?? [r.y, r.m, a, t, c, 0]
      row[5] += r.monto
      pGas.set(k, row)
    }

    return {
      dict,
      cube: [...cube.values()],
      ppto: { ganancias: [...pGan.values()], gastos: [...pGas.values()] },
      lines,
      stats,
      generatedAt: new Date().toISOString(),
    }
  })
}

export { canonTipoGasto }
