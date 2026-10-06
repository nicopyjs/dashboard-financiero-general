// Motor de medidas. Replica las medidas DAX del modelo "Análisis Estado de
// Resultado" sobre el cubo que entrega /api/pnl.
//
// Filas del cubo:      [año, mes, área, tipoPlan(0 ganancia / 1 gasto), tipoGasto, clasif, alias, flags, monto]
// PPTO ganancias:      [año, mes, área, monto]
// PPTO gastos:         [año, mes, área, tipoGasto, clasif, monto]
// flags: 1 = cuenta excluida en la vista "Económico", 2 = cuenta de MO directa.
// Los índices de diccionario son -1 cuando el valor está en blanco.

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const fold = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

export const emptyParts = () => ({
  ventas: 0, // Σ Monto_EERR de cuentas Ganancia
  gastoRaw: 0, // Σ Monto_EERR de cuentas Gasto (negativo)
  dir: 0,
  ind: 0,
  adm: 0,
  mat: 0, // Directo + alias MATERIALES
  moInd: 0, // Indirecto + alias MANO DE OBRA INDIRECTA
  moDir: 0, // cuenta 4510401003
  pG: 0, // PPTO Ganancias
  pGasto: 0, // PPTO Gastos
  pDir: 0,
  pInd: 0,
  pAdm: 0,
})

const divide = (a, b) => (b ? a / b : 0)

/** Medidas finales a partir de las sumas parciales (mismas fórmulas que el DAX). */
export function derive(p) {
  const ventasNeto = p.ventas
  const gastoReal = -p.gastoRaw // GastoReal(+)
  const realOperacional = ventasNeto + p.dir // RealResult.Operacional
  const estadoResultado = realOperacional + p.ind
  const estadoResultadoEmpresa = estadoResultado + p.adm

  const desviacionVenta = ventasNeto - p.pG
  const desviacionGasto = p.pGasto === 0 ? 0 : gastoReal - p.pGasto
  const utilidadReal = ventasNeto - gastoReal
  const utilidadEsperada = p.pG - p.pGasto

  // Presupuesto espejo (los "…PST")
  const gastoDirectoPst = -p.pDir
  const resultadoOperacionalPst = p.pG + gastoDirectoPst // .PS.Result.Operacional
  const gastoIndirectoPst = -p.pInd
  const estadoResultadoEsperado = resultadoOperacionalPst + gastoIndirectoPst
  const gastoAdministrativoPst = -p.pAdm
  const estadoResultadoEmpresaEsperado = estadoResultadoEsperado + gastoAdministrativoPst

  return {
    ventasNeto,
    gastoReal,
    utilidadReal,
    utilidadEsperada,
    pptoIngresos: p.pG,
    pptoGastos: p.pGasto,
    desviacionVenta,
    pctDesviacionIngreso: divide(desviacionVenta, p.pG),
    desviacionGasto,
    pctDesviacionGasto: divide(desviacionGasto, p.pGasto),
    pctDesviacionUtilidad: divide(utilidadReal - utilidadEsperada, utilidadEsperada),
    pctKpiVentas: divide(ventasNeto, p.pG),
    pctKpiGastos: divide(gastoReal, p.pGasto),
    pctKpiResultado: divide(utilidadReal, utilidadEsperada),
    // cascada real
    gastoDirecto: p.dir,
    gastoDirectoMO: p.moDir,
    gastoDirectoMateriales: p.mat,
    realOperacional,
    gastoIndirecto: p.ind,
    gastoIndirectoMO: p.moInd,
    estadoResultado,
    gastoAdministrativo: p.adm,
    estadoResultadoEmpresa,
    pctDifOperacional: divide(realOperacional - resultadoOperacionalPst, resultadoOperacionalPst),
    // cascada presupuestada
    gastoDirectoPst,
    resultadoOperacionalPst,
    gastoIndirectoPst,
    estadoResultadoEsperado,
    gastoAdministrativoPst,
    estadoResultadoEmpresaEsperado,
  }
}

/**
 * Crea el motor sobre la respuesta de /api/pnl.
 *
 * filters = { years: number[], months: number[], areas: string[],
 *             vista: '' | 'Financiero' | 'Económico',
 *             tipos: string[], clasifs: string[], aliases: string[] }
 * Una lista vacía significa "sin filtrar" (como un slicer sin selección).
 */
export function createEngine(data) {
  const { dict, cube, ppto } = data
  const nameOf = (arr, i) => (i >= 0 ? arr[i] : '')

  const aliasKind = dict.aliases.map((a) => {
    const f = fold(a)
    return f === 'materiales' ? 'mat' : f === 'mano de obra indirecta' ? 'moInd' : ''
  })
  const tgKind = dict.tiposGasto.map((t) => {
    const f = fold(t)
    return f === 'gasto directo' ? 'dir' : f === 'gasto indirecto' ? 'ind' : f === 'gasto administrativo' ? 'adm' : ''
  })

  const idsFor = (list, arr) => {
    if (!list?.length) return null
    const wanted = new Set(list.map(fold))
    const ids = new Set()
    arr.forEach((v, i) => wanted.has(fold(v)) && ids.add(i))
    return ids
  }

  function prepare(filters = {}) {
    return {
      years: filters.years?.length ? new Set(filters.years.map(Number)) : null,
      months: filters.months?.length ? new Set(filters.months.map(Number)) : null,
      areas: idsFor(filters.areas, dict.areas),
      tipos: idsFor(filters.tipos, dict.tiposGasto),
      clasifs: idsFor(filters.clasifs, dict.clasifs),
      aliases: idsFor(filters.aliases, dict.aliases),
      economico: fold(filters.vista) === 'economico',
    }
  }

  const keyPart = {
    year: (y) => y,
    month: (_y, m) => m,
    ym: (y, m) => `${y}-${String(m).padStart(2, '0')}`,
  }

  /**
   * Agrega por las dimensiones de `groupBy` (subconjunto de
   * year | month | ym | area | tipo | clasif). Devuelve filas con las
   * dimensiones y las medidas ya derivadas.
   */
  function aggregate(filters, groupBy = []) {
    const f = prepare(filters)
    const groups = new Map()

    const bucket = (y, m, area, tipo, clasif) => {
      const dims = {}
      const parts = []
      for (const g of groupBy) {
        if (g === 'year') { dims.year = y; parts.push(y) }
        else if (g === 'month') { dims.month = m; parts.push(m) }
        else if (g === 'ym') { dims.ym = keyPart.ym(y, m); dims.year = y; dims.month = m; parts.push(dims.ym) }
        else if (g === 'area') { dims.area = nameOf(dict.areas, area); parts.push(area) }
        else if (g === 'tipo') { dims.tipo = nameOf(dict.tiposGasto, tipo); parts.push(tipo) }
        else if (g === 'clasif') { dims.clasif = nameOf(dict.clasifs, clasif); parts.push(clasif) }
      }
      const key = parts.join('|')
      let b = groups.get(key)
      if (!b) {
        b = { dims, p: emptyParts() }
        groups.set(key, b)
      }
      return b.p
    }

    const passTime = (y, m) => (!f.years || f.years.has(y)) && (!f.months || f.months.has(m))

    for (const [y, m, area, tp, tg, cls, alias, flags, monto] of cube) {
      if (!passTime(y, m)) continue
      if (f.areas && !f.areas.has(area)) continue
      if (f.tipos && !f.tipos.has(tg)) continue
      if (f.clasifs && !f.clasifs.has(cls)) continue
      if (f.aliases && !f.aliases.has(alias)) continue
      if (f.economico && flags & 1) continue

      const p = bucket(y, m, area, tg, cls)
      if (tp === 0) {
        p.ventas += monto
        continue
      }
      p.gastoRaw += monto
      const kind = tgKind[tg]
      if (kind) p[kind] += monto
      if (kind === 'dir' && aliasKind[alias] === 'mat') p.mat += monto
      if (kind === 'ind' && aliasKind[alias] === 'moInd') p.moInd += monto
      if (flags & 2) p.moDir += monto
    }

    // Presupuesto de ganancias: sin relación con tipo de gasto, clasificación ni vista.
    for (const [y, m, area, monto] of ppto.ganancias) {
      if (!passTime(y, m)) continue
      if (f.areas && !f.areas.has(area)) continue
      bucket(y, m, area, -1, -1).pG += monto
    }
    // Presupuesto de gastos: no tiene alias (el slicer de alias no lo filtra).
    for (const [y, m, area, tg, cls, monto] of ppto.gastos) {
      if (!passTime(y, m)) continue
      if (f.areas && !f.areas.has(area)) continue
      if (f.tipos && !f.tipos.has(tg)) continue
      if (f.clasifs && !f.clasifs.has(cls)) continue
      const p = bucket(y, m, area, tg, cls)
      p.pGasto += monto
      const kind = tgKind[tg]
      if (kind) p['p' + kind[0].toUpperCase() + kind.slice(1)] += monto
    }

    return [...groups.values()].map(({ dims, p }) => ({ ...dims, ...derive(p), _parts: p }))
  }

  /** Totales (sin agrupar). */
  function totals(filters) {
    const rows = aggregate(filters, [])
    return rows[0] ?? { ...derive(emptyParts()), _parts: emptyParts() }
  }

  // Dimensiones para los slicers (años/meses con movimientos o presupuesto).
  const years = new Set()
  for (const r of cube) years.add(r[0])
  for (const r of ppto.ganancias) years.add(r[0])
  for (const r of ppto.gastos) years.add(r[0])

  return {
    aggregate,
    totals,
    dict,
    years: [...years].sort((a, b) => a - b),
    areas: [...dict.areas].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
    tiposGasto: [...dict.tiposGasto].filter(Boolean).sort(),
    clasifs: [...dict.clasifs].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
    aliases: [...dict.aliases].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
  }
}
