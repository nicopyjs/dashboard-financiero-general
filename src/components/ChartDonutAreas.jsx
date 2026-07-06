import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCLP } from '../utils/formatters'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a78bfa', '#f43f5e', '#06b6d4', '#fb923c']

function SingleDonut({ areas, dataKey, title, color, valueFormatter }) {
  const pieData = areas.map((d) => ({ ...d, value: Math.abs(d[dataKey]) }))
  const total   = areas.reduce((s, d) => s + d[dataKey], 0)
  const positive = total >= 0

  const fmt = (n) => {
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000)         return `${sign}$${(abs / 1_000).toFixed(0)}K`
    return `${sign}$${abs}`
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-txt-secondary text-xs font-medium mb-2 uppercase tracking-wider">{title}</p>
      <div className="relative" style={{ width: 190, height: 190 }}>
        {/* Center total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
          <p className={`text-[11px] font-medium uppercase tracking-wider opacity-60 ${dataKey === 'resultado' ? (positive ? 'text-accent-green' : 'text-accent-red') : color}`}>
            total
          </p>
          <p className={`text-lg font-bold tabular-nums leading-none ${dataKey === 'resultado' ? (positive ? 'text-accent-green' : 'text-accent-red') : color}`}>
            {fmt(total)}
          </p>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {pieData.map((d, i) => (
                <Cell key={d.area_nombre} fill={COLORS[i % COLORS.length]} opacity={0.9} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val, name, props) => [valueFormatter ? valueFormatter(props.payload[dataKey]) : formatCLP(val), props.payload.area_nombre]}
              contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }}
              itemStyle={{ color: '#94a3b8' }}
              labelStyle={{ display: 'none' }}
              cursor={false}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function ChartDonutAreas({ data }) {
  const areas = useMemo(() => {
    const map = {}
    data.forEach((r) => {
      if (!map[r.area_nombre]) map[r.area_nombre] = { area_nombre: r.area_nombre, ingresos: 0, gastos: 0 }
      map[r.area_nombre].ingresos += r.ingresos
      map[r.area_nombre].gastos  += r.gastos
    })
    return Object.values(map)
      .filter(d => d.ingresos > 0 || d.gastos > 0)
      .map(d => ({ ...d, resultado: d.ingresos - d.gastos }))
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [data])

  if (!areas.length) return (
    <div className="flex items-center justify-center h-48 text-txt-secondary text-sm">Sin datos</div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 3 donuts */}
      <div className="flex flex-wrap justify-around gap-4">
        <SingleDonut areas={areas} dataKey="ingresos"  title="Ingresos"  color="text-accent-blue" />
        <SingleDonut areas={areas} dataKey="gastos"    title="Gastos"    color="text-accent-red" />
        <SingleDonut areas={areas} dataKey="resultado" title="Resultado" color="text-accent-green" />
      </div>

      {/* Legend compartida */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {areas.map((d, i) => (
          <span key={d.area_nombre} className="flex items-center gap-1.5 text-xs text-txt-secondary">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            {d.area_nombre}
          </span>
        ))}
      </div>
    </div>
  )
}
