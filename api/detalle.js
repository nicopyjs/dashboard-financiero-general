import { loadModel } from './_lib/model.js'
import { fold } from './_lib/rules.js'

const MAX_ROWS = 3000

const list = (v) =>
  String(v ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)

/**
 * Drill-down a nivel de comprobante / cuenta.
 * Query:
 *   mode   = comprobante (Detalle Egresos) | eerr (Estado de resultados por área)
 *   year, month  = listas separadas por "|"
 *   area, tg, cls, alias = nombres separados por "|"
 *   vista  = Financiero | Económico
 *   tp     = gasto | ganancia | all   (default según modo)
 */
export default async function handler(req, res) {
  try {
    const q = req.query ?? Object.fromEntries(new URL(req.url, 'http://x').searchParams)
    const mode = q.mode === 'eerr' ? 'eerr' : 'comprobante'
    const m = await loadModel()
    const { areas, tiposGasto, clasifs, aliases } = m.dict

    const years = new Set(list(q.year).map(Number))
    const months = new Set(list(q.month).map(Number))
    const wantArea = new Set(list(q.area).map(fold))
    const wantTg = new Set(list(q.tg).map(fold))
    const wantCls = new Set(list(q.cls).map(fold))
    const wantAlias = new Set(list(q.alias).map(fold))
    const economico = fold(q.vista) === 'economico'
    const tp = q.tp ?? (mode === 'comprobante' ? 'gasto' : 'all')

    const name = (arr, i) => (i >= 0 ? arr[i] : '')
    const groups = new Map()

    for (const l of m.lines) {
      if (years.size && !years.has(l.y)) continue
      if (months.size && !months.has(l.m)) continue
      if (tp === 'gasto' && l.tp !== 1) continue
      if (tp === 'ganancia' && l.tp !== 0) continue
      if (economico && l.flags & 1) continue
      if (wantArea.size && !wantArea.has(fold(name(areas, l.area)))) continue
      if (wantTg.size && !wantTg.has(fold(name(tiposGasto, l.tg)))) continue
      if (wantCls.size && !wantCls.has(fold(name(clasifs, l.cls)))) continue
      if (wantAlias.size && !wantAlias.has(fold(name(aliases, l.alias)))) continue

      const area = name(areas, l.area)
      const tg = name(tiposGasto, l.tg)
      const cls = name(clasifs, l.cls)
      const alias = name(aliases, l.alias)

      const key =
        mode === 'eerr'
          ? `${tg}|${alias}|${l.centro}|${l.cuenta}`
          : `${l.y}|${l.m}|${area}|${tg}|${cls}|${l.info}`
      let g = groups.get(key)
      if (!g) {
        g =
          mode === 'eerr'
            ? { tipoGasto: tg, alias, centro: l.centro, cuenta: l.cuenta, monto: 0 }
            : { year: l.y, month: l.m, area, tipoGasto: tg, clasif: cls, comprobante: l.info, fecha: l.date, monto: 0 }
        groups.set(key, g)
      }
      g.monto += l.monto
      if (mode === 'comprobante' && l.date > g.fecha) g.fecha = l.date
    }

    const rows = [...groups.values()].sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto))
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.status(200).json({
      mode,
      total: rows.length,
      truncated: rows.length > MAX_ROWS,
      rows: rows.slice(0, MAX_ROWS),
    })
  } catch (err) {
    console.error('[api/detalle]', err)
    res.status(500).json({ error: err.message || 'Error al cargar el detalle' })
  }
}
