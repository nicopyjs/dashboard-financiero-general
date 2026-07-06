import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useMemo } from 'react'
import { formatCLP } from '../utils/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a1628] border border-accent-blue/20 rounded-xl p-4 shadow-2xl text-sm min-w-[200px]">
      <p className="text-txt-secondary mb-3 font-semibold text-xs uppercase tracking-wider">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 mb-1">
          <span className="flex items-center gap-2 text-txt-secondary text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tabular-nums font-semibold" style={{ color: p.color }}>
            {formatCLP(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function CustomLegend({ payload }) {
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((p) => (
        <span key={p.value} className="flex items-center gap-2 text-xs text-txt-secondary">
          <span className="w-3 h-0.5 inline-block rounded" style={{ background: p.color }} />
          {p.value}
        </span>
      ))}
    </div>
  )
}

export default function ChartEvolucion({ data }) {
  const chartData = useMemo(() => {
    const map = {}
    data.forEach((r) => {
      if (!map[r.year_month]) map[r.year_month] = { year_month: r.year_month, ingresos: 0, gastos: 0, resultado: 0 }
      map[r.year_month].ingresos  += r.ingresos
      map[r.year_month].gastos    += r.gastos
      map[r.year_month].resultado += r.resultado
    })
    return Object.values(map).sort((a, b) => a.year_month.localeCompare(b.year_month))
  }, [data])

  if (!chartData.length) return (
    <div className="flex items-center justify-center h-64 text-txt-secondary text-sm">
      Sin datos para el período seleccionado
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradIngr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradGast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="year_month"
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => {
            if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`
            if (Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
            return `$${v}`
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f620', strokeWidth: 24 }} />
        <Legend content={<CustomLegend />} />
        <ReferenceLine y={0} stroke="#1e293b" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="ingresos"
          name="Ingresos"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#gradIngr)"
          dot={false}
          activeDot={{ r: 5, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="gastos"
          name="Gastos"
          stroke="#f43f5e"
          strokeWidth={2}
          fill="url(#gradGast)"
          dot={false}
          activeDot={{ r: 5, fill: '#f43f5e', stroke: '#0f172a', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="resultado"
          name="Resultado"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
          strokeDasharray="6 3"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
