import {
  AreaChart,
  Area,
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a78bfa', '#f43f5e', '#06b6d4', '#fb923c']

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
    <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
      {payload.map((p) => (
        <span key={p.value} className="flex items-center gap-2 text-xs text-txt-secondary">
          <span className="w-3 h-0.5 inline-block rounded" style={{ background: p.color }} />
          {p.value}
        </span>
      ))}
    </div>
  )
}

export default function ChartEvolucionAreas({ data, areas }) {
  const { chartData, areaList } = useMemo(() => {
    const areaList = areas.length ? areas : [...new Set(data.map((r) => r.area_nombre))].filter(Boolean).sort()
    const map = {}
    data.forEach((r) => {
      if (!map[r.year_month]) map[r.year_month] = { year_month: r.year_month }
      if (!map[r.year_month][r.area_nombre]) map[r.year_month][r.area_nombre] = 0
      map[r.year_month][r.area_nombre] += r.resultado
    })
    return {
      chartData: Object.values(map).sort((a, b) => a.year_month.localeCompare(b.year_month)),
      areaList,
    }
  }, [data, areas])

  if (!chartData.length) return (
    <div className="flex items-center justify-center h-64 text-txt-secondary text-sm">
      Sin datos para el período seleccionado
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          {areaList.map((area, i) => (
            <linearGradient key={area} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
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
        <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
        {areaList.map((area, i) => (
          <Area
            key={area}
            type="monotone"
            dataKey={area}
            name={area}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            fill={`url(#grad-${i})`}
            dot={false}
            activeDot={{ r: 5, stroke: '#0f172a', strokeWidth: 2 }}
            connectNulls
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
