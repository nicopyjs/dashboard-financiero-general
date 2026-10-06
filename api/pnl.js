import { loadModel } from './_lib/model.js'

// Cubo agregado + presupuesto + diccionarios. El front calcula las medidas
// (VentasNeto, GastoReal, desviaciones, cascada del estado de resultados).
export default async function handler(req, res) {
  try {
    const m = await loadModel()
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.status(200).json({
      generatedAt: m.generatedAt,
      dict: m.dict,
      // [año, mes, área, tipoPlan(0 ganancia/1 gasto), tipoGasto, clasif, alias, flags, monto]
      // flags: 1 = cuenta excluida en vista Económico, 2 = cuenta MO directa
      cube: m.cube,
      ppto: m.ppto,
      stats: m.stats,
    })
  } catch (err) {
    console.error('[api/pnl]', err)
    res.status(500).json({ error: err.message || 'Error al cargar los datos' })
  }
}
