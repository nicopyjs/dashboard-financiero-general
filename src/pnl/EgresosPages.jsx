import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { usePnl, useDetalle } from './PnlProvider'
import { PageFrame } from './layout'
import {
  Panel,
  Empty,
  ChartTooltip,
  TreeTable,
  COLORS,
  axisProps,
  tickFmt,
  fmtPct,
} from './ui'
import { ComboMensual } from './IngresosPages'
import KPICard from '../components/KPICard'
import { formatCLP } from '../utils/formatters'

const SLICERS = ['vista', 'year', 'month', 'area', 'tipo', 'clasif']

const hasGasto = (r) => r._parts.gastoRaw !== 0 || r._parts.pGasto !== 0

export function Egresos() {
  const { engine, filters } = usePnl()
  const total = useMemo(() => engine.totals(filters), [engine, filters])
  const monthly = useMemo(() => engine.aggregate(filters, ['year', 'month']), [engine, filters])
  const byArea = useMemo(
    () =>
      engine
        .aggregate(filters, ['area'])
        .filter((r) => r.gastoReal !== 0)
        .sort((a, b) => b.gastoReal - a.gastoReal),
    [engine, filters]
  )

  // Composición por tipo de gasto en cada mes (columnas 100 % apiladas).
  const { stacked, tipos } = useMemo(() => {
    const rows = engine.aggregate(filters, ['ym', 'tipo']).filter((r) => r.tipo && r.gastoReal !== 0)
    const tipos = [...new Set(rows.map((r) => r.tipo))].sort()
    const byYm = new Map()
    for (const r of rows) {
      const o = byYm.get(r.ym) ?? { ym: r.ym }
      o[r.tipo] = (o[r.tipo] ?? 0) + r.gastoReal
      byYm.set(r.ym, o)
    }
    return { stacked: [...byYm.values()].sort((a, b) => a.ym.localeCompare(b.ym)), tipos }
  }, [engine, filters])

  const tipoColor = (t, i) =>
    t === 'Gasto Directo' ? COLORS.gasto : t === 'Gasto Indirecto' ? COLORS.ppto : t === 'Gasto Administrativo' ? COLORS.ventas : COLORS.series[i % COLORS.series.length]

  return (
    <PageFrame title="Egresos" slicers={SLICERS}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Presupuesto gastos" value={total.pptoGastos} format={formatCLP} color="white" delay={0} />
        <KPICard title="Gasto real" value={total.gastoReal} format={formatCLP} color="red" delay={60} />
        <KPICard title="Desviación gasto" value={total.desviacionGasto} format={formatCLP} color="white" delay={120} />
        <KPICard title="% desviación gasto" value={total.pctDesviacionGasto} format={fmtPct} color="white" delay={180} />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
        <Panel title="Gasto real vs presupuesto por mes" subtitle="Barras: gasto real por año · Línea: presupuesto" className="2xl:col-span-2" delay={200}>
          <ComboMensual
            rows={monthly}
            realKey="gastoReal"
            pptoKey="pptoGastos"
            realLabel="Gasto"
            realColors={[COLORS.gasto, '#fb7185', '#fda4af', '#be123c', '#9f1239', '#881337']}
          />
        </Panel>
        <Panel title="Gasto real por área" delay={240}>
          {byArea.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, byArea.length * 30 + 30)}>
              <BarChart data={byArea} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={tickFmt} />
                <YAxis type="category" dataKey="area" {...axisProps} width={130} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="gastoReal" name="Gasto real" fill={COLORS.gasto} radius={[0, 3, 3, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <Panel title="Composición del gasto por tipo" subtitle="Participación de cada tipo de gasto sobre el gasto real del mes" delay={280}>
        {stacked.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stacked} stackOffset="expand" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="ym" {...axisProps} tickMargin={8} interval="preserveStartEnd" minTickGap={20} />
              <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              {tipos.map((t, i) => (
                <Bar key={t} dataKey={t} name={t} stackId="g" fill={tipoColor(t, i)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </PageFrame>
  )
}

// Verde si el gasto quedó bajo presupuesto (GastoColorMatriz del modelo original).
// Sin presupuesto no hay desviación que juzgar: se muestra neutro.
const toneGasto = (m) =>
  m.pptoGastos === 0 ? '#64748b' : m.pctDesviacionGasto < 0 ? COLORS.ok : COLORS.bad

const gastoColumns = [
  { label: 'Gasto real', get: (m) => m.gastoReal, fmt: formatCLP, leaf: (l) => -l.monto },
  { label: 'Presupuesto', get: (m) => m.pptoGastos, fmt: formatCLP },
  { label: 'Desviación', get: (m) => m.desviacionGasto, fmt: formatCLP, tone: toneGasto },
  { label: '% desviación', get: (m) => m.pctDesviacionGasto, fmt: fmtPct, tone: toneGasto },
]

// Las hojas de nivel superior muestran '' para los leaves sin dato (fmt de leaf nulo).
const columnsWithLeafSafe = gastoColumns.map((c) => ({
  ...c,
  fmt: (v) => (v == null ? '' : c.fmt(v)),
  leaf: c.leaf ?? (() => null),
}))

const comprobanteLabel = (l) => l.comprobante || '(Sin comprobante)'

export function EgresosDetalle() {
  const { engine, filters } = usePnl()
  const detalle = useDetalle('comprobante', filters)

  const byArea = useMemo(
    () => engine.aggregate(filters, ['area', 'tipo', 'clasif']).filter(hasGasto),
    [engine, filters]
  )
  const byTime = useMemo(
    () => engine.aggregate(filters, ['year', 'month', 'area', 'tipo', 'clasif']).filter(hasGasto),
    [engine, filters]
  )

  const levelsArea = useMemo(
    () => [
      { key: 'area', label: 'Área' },
      { key: 'tipo', label: 'Tipo de gasto' },
      { key: 'clasif', label: 'Clasificación' },
    ],
    []
  )
  const levelsTime = useMemo(
    () => [
      { key: 'year', label: 'Año' },
      { key: 'month', label: 'Mes' },
      ...levelsArea,
    ],
    [levelsArea]
  )

  const leavesArea = useMemo(
    () => ({
      items: detalle.rows,
      keyOf: (l) => `${l.area}|${l.tipoGasto}|${l.clasif}`,
      label: comprobanteLabel,
    }),
    [detalle.rows]
  )
  const leavesTime = useMemo(
    () => ({
      items: detalle.rows,
      keyOf: (l) => `${l.year}|${l.month}|${l.area}|${l.tipoGasto}|${l.clasif}`,
      label: comprobanteLabel,
    }),
    [detalle.rows]
  )

  return (
    <PageFrame title="Detalle de egresos" slicers={SLICERS}>
      {detalle.error && (
        <p className="text-accent-red text-xs">No se pudo cargar el detalle por comprobante: {detalle.error}</p>
      )}
      {detalle.truncated && (
        <p className="text-accent-amber text-xs">
          Hay {detalle.total.toLocaleString('es-CL')} comprobantes con los filtros actuales; se muestran los 3.000 de mayor
          monto. Acota por año, mes o área para ver el resto.
        </p>
      )}
      <Panel
        title="Área › Tipo de gasto › Clasificación › Comprobante"
        subtitle={detalle.loading ? 'Cargando comprobantes…' : 'Despliega una clasificación para ver sus comprobantes'}
        delay={0}
      >
        <TreeTable
          rows={byArea}
          levels={levelsArea}
          columns={columnsWithLeafSafe}
          leaves={leavesArea}
          firstColLabel="Área › Tipo › Clasificación › Comprobante"
        />
      </Panel>
      <Panel title="Año › Mes › Área › Tipo › Clasificación › Comprobante" delay={80}>
        <TreeTable
          rows={byTime}
          levels={levelsTime}
          columns={columnsWithLeafSafe}
          leaves={leavesTime}
          firstColLabel="Año › Mes › Área › …"
        />
      </Panel>
    </PageFrame>
  )
}
