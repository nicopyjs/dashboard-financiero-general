import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { useMemo } from 'react'
import { formatCLP } from '../utils/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const ingr = payload.find(p => p.dataKey === 'ingresos')?.value ?? 0
  const gast = payload.find(p => p.dataKey === 'gastos')?.value ?? 0
  const res  = payload.find(p => p.dataKey === 'resultado')?.value ?? 0
  const positive = res >= 0

  return (
    <div className="bg-[#0a1628] border border-accent-blue/20 rounded-xl p-4 shadow-2xl text-sm min-w-[210px]">
      <p className="text-txt-secondary mb-3 font-semibold text-xs uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-2 text-txt-secondary text-xs">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#3b82f6' }} />
            Ingresos
          </span>
          <span className="text-accent-blue font-semibold tabular-nums text-xs">{formatCLP(ingr)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-2 text-txt-secondary text-xs">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#f43f5e' }} />
            Gastos
          </span>
          <span className="text-accent-red font-semibold tabular-nums text-xs">{formatCLP(gast)}</span>
        </div>
        <div className="border-t border-white/10 pt-1.5 flex justify-between gap-6">
          <span className="flex items-center gap-2 text-txt-secondary text-xs">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: positive ? '#10b981' : '#f43f5e' }} />
            Resultado
          </span>
          <span className={`font-bold tabular-nums text-xs ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
            {formatCLP(res)}
          </span>
        </div>
        {ingr > 0 && (
          <div className="flex justify-between gap-6">
            <span className="text-txt-secondary text-xs pl-4">Margen</span>
            <span className={`tabular-nums text-xs ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
              {((res / ingr) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function CustomLegend({ payload }) {
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((p) => (
        <span key={p.value} className="flex items-center gap-2 text-xs text-txt-secondary">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: p.color }} />
          {p.value}
        </span>
      ))}
    </div>
  )
}

export default function ChartBarMensual({ data }) {
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

  const tickFmt = (v) => {
    const abs = Math.abs(v)
    if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000)     return `$${(v / 1_000_000).toFixed(0)}M`
    if (abs >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`
    return `$${v}`
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={2} barCategoryGap="25%">
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
          tickFormatter={tickFmt}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
        <Legend content={<CustomLegend />} />
        <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />

        <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={28} opacity={0.9} />
        <Bar dataKey="gastos"   name="Gastos"   fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={28} opacity={0.85} />
        <Bar dataKey="resultado" name="Resultado" radius={[3, 3, 0, 0]} maxBarSize={28}>
          {chartData.map((d) => (
            <Cell
              key={d.year_month}
              fill={d.resultado >= 0 ? '#10b981' : '#f43f5e'}
              opacity={d.resultado >= 0 ? 1 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
