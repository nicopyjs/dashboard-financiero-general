import { useMemo } from 'react'
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { usePnl } from './PnlProvider'
import { PageFrame } from './layout'
import {
  Panel,
  Empty,
  ChartTooltip,
  TreeTable,
  COLORS,
  MES_CORTO,
  axisProps,
  tickFmt,
  fmtPct,
} from './ui'
import KPICard from '../components/KPICard'
import { formatCLP } from '../utils/formatters'

const SLICERS = ['vista', 'year', 'month', 'area']

/** Serie mensual: una barra por año (valor real) y una línea por año (presupuesto). */
export function monthlyByYear(rows, realKey, pptoKey) {
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b)
  const data = MES_CORTO.map((mes, i) => {
    const o = { mes }
    for (const y of years) {
      const r = rows.find((x) => x.year === y && x.month === i + 1)
      o[`real${y}`] = r ? r[realKey] : 0
      o[`ppto${y}`] = r ? r[pptoKey] : 0
    }
    return o
  })
  const pptoYears = years.filter((y) => data.some((d) => d[`ppto${y}`] !== 0))
  const realYears = years.filter((y) => data.some((d) => d[`real${y}`] !== 0))
  return { data, realYears, pptoYears }
}

export function ComboMensual({ rows, realKey, pptoKey, realLabel, realColors }) {
  const { data, realYears, pptoYears } = useMemo(
    () => monthlyByYear(rows, realKey, pptoKey),
    [rows, realKey, pptoKey]
  )
  if (!realYears.length && !pptoYears.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="mes" {...axisProps} tickMargin={8} />
        <YAxis {...axisProps} tickFormatter={tickFmt} width={60} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
        {realYears.map((y, i) => (
          // Recharts empareja los ítems por key: barras y líneas no pueden compartirla.
          <Bar
            key={`bar-${y}`}
            dataKey={`real${y}`}
            name={`${realLabel} ${y}`}
            fill={realColors[i % realColors.length]}
            radius={[3, 3, 0, 0]}
            maxBarSize={22}
          />
        ))}
        {pptoYears.map((y) => (
          <Line
            key={`line-${y}`}
            type="monotone"
            dataKey={`ppto${y}`}
            name={`Presupuesto ${y}`}
            stroke={COLORS.ppto}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.ppto }}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function Ingresos() {
  const { engine, filters } = usePnl()
  const total = useMemo(() => engine.totals(filters), [engine, filters])
  const monthly = useMemo(() => engine.aggregate(filters, ['year', 'month']), [engine, filters])
  const byArea = useMemo(
    () =>
      engine
        .aggregate(filters, ['area'])
        .filter((r) => r.ventasNeto !== 0)
        .sort((a, b) => b.ventasNeto - a.ventasNeto),
    [engine, filters]
  )

  return (
    <PageFrame title="Ingresos" slicers={SLICERS}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Presupuesto ingresos" value={total.pptoIngresos} format={formatCLP} color="white" delay={0} />
        <KPICard title="Ventas netas" value={total.ventasNeto} format={formatCLP} color="blue" delay={60} />
        <KPICard title="Desviación ventas" value={total.desviacionVenta} format={formatCLP} color="green" delay={120} />
        <KPICard title="% desviación ingreso" value={total.pctDesviacionIngreso} format={fmtPct} color="green" delay={180} />
      </div>

      <Panel title="Ventas netas vs presupuesto por mes" subtitle="Barras: ventas reales por año · Línea: presupuesto" delay={200}>
        <ComboMensual
          rows={monthly}
          realKey="ventasNeto"
          pptoKey="pptoIngresos"
          realLabel="Ventas"
          realColors={COLORS.series}
        />
      </Panel>

      <Panel title="Ventas netas por área" delay={260}>
        {byArea.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, byArea.length * 34 + 30)}>
            <BarChart data={byArea} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={tickFmt} />
              <YAxis type="category" dataKey="area" {...axisProps} width={150} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="ventasNeto" name="Ventas netas" fill={COLORS.ventas} radius={[0, 3, 3, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </PageFrame>
  )
}

// Sin presupuesto no hay desviación que juzgar: se muestra neutro.
const tone = (m, v) => (m.pptoIngresos === 0 ? '#64748b' : v < 0 ? COLORS.bad : COLORS.ok)

export const ingresosColumns = [
  { label: 'Ventas netas', get: (m) => m.ventasNeto, fmt: formatCLP },
  { label: 'Presupuesto', get: (m) => m.pptoIngresos, fmt: formatCLP },
  { label: 'Desviación', get: (m) => m.desviacionVenta, fmt: formatCLP, tone },
  { label: '% desviación', get: (m) => m.pctDesviacionIngreso, fmt: fmtPct, tone },
]

export function IngresosDetalle() {
  const { engine, filters } = usePnl()
  const active = (r) => r.ventasNeto !== 0 || r.pptoIngresos !== 0
  const byArea = useMemo(() => engine.aggregate(filters, ['area']).filter(active), [engine, filters])
  const byTime = useMemo(
    () => engine.aggregate(filters, ['year', 'month', 'area']).filter(active),
    [engine, filters]
  )
  const levelsArea = useMemo(() => [{ key: 'area', label: 'Área' }], [])
  const levelsTime = useMemo(
    () => [
      { key: 'year', label: 'Año' },
      { key: 'month', label: 'Mes' },
      { key: 'area', label: 'Área' },
    ],
    []
  )

  return (
    <PageFrame title="Detalle de ingresos" slicers={SLICERS}>
      <Panel title="Por área" delay={0}>
        <TreeTable rows={byArea} levels={levelsArea} columns={ingresosColumns} />
      </Panel>
      <Panel title="Por año, mes y área" delay={80}>
        <TreeTable rows={byTime} levels={levelsTime} columns={ingresosColumns} firstColLabel="Año › Mes › Área" />
      </Panel>
    </PageFrame>
  )
}
