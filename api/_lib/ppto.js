import ExcelJS from 'exceljs'
import { downloadDriveFile } from './google.js'
import { memo } from './cache.js'
import { SOURCES, TABS, TTL } from './config.js'
import { num, parseDate, fold, isBlank, canonTipoGasto } from './rules.js'

/** Valor de celda de exceljs: resuelve fórmulas, texto enriquecido y fechas. */
function cellValue(cell) {
  const v = cell?.value
  if (v == null) return ''
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    if ('result' in v) return v.result ?? ''
    if ('richText' in v) return v.richText.map((t) => t.text).join('')
    if ('text' in v) return v.text
  }
  return v
}

/** Hoja -> objetos usando la fila 1 como encabezado (como PromoteHeaders). */
function sheetObjects(ws) {
  if (!ws) return []
  const header = []
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    header[col] = String(cellValue(cell)).trim()
  })
  const out = []
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const o = {}
    header.forEach((h, col) => {
      if (h) o[h] = cellValue(row.getCell(col))
    })
    out.push(o)
  })
  return out
}

function pick(obj, name) {
  const target = fold(name)
  for (const k of Object.keys(obj)) if (fold(k) === target) return obj[k]
  return ''
}

/**
 * Presupuesto 2025 (.xlsx en Drive, hojas "Ganancias" y "AnexoPsto").
 * Devuelve filas crudas; las filas sin fecha o sin monto se descartan
 * (el archivo trae muchas filas vacías).
 */
export function loadPpto() {
  return memo('ppto', TTL.ppto, async () => {
    const buffer = await downloadDriveFile(SOURCES.pptoFile)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)

    const sheet = (name) => wb.worksheets.find((w) => fold(w.name) === fold(name))
    const wsGan = sheet(TABS.pptoGanancias)
    const wsGas = sheet(TABS.pptoGastos)
    if (!wsGan || !wsGas) {
      throw new Error(
        `PPTO: faltan hojas (${TABS.pptoGanancias} / ${TABS.pptoGastos}). Hojas: ${wb.worksheets
          .map((w) => w.name)
          .join(', ')}`
      )
    }

    const ganancias = []
    for (const o of sheetObjects(wsGan)) {
      const fecha = parseDate(pick(o, 'Fecha'))
      const monto = num(pick(o, 'MONTO CLP'))
      if (!fecha || !monto) continue
      ganancias.push({ y: fecha.y, m: fecha.m, area: String(pick(o, 'ÁREA')).trim(), monto })
    }

    const gastos = []
    for (const o of sheetObjects(wsGas)) {
      const fecha = parseDate(pick(o, 'Fecha'))
      const monto = num(pick(o, 'Monto CLP'))
      if (!fecha || !monto) continue
      gastos.push({
        y: fecha.y,
        m: fecha.m,
        area: String(pick(o, 'Área')).trim(),
        tipoGasto: canonTipoGasto(pick(o, 'Tipo_Gasto')),
        clasif: isBlank(pick(o, 'Clasificacion_gasto'))
          ? ''
          : String(pick(o, 'Clasificacion_gasto')).trim(),
        monto,
      })
    }

    return { ganancias, gastos }
  })
}
