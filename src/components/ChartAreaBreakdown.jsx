import { useMemo } from 'react'
import { formatCLP } from '../utils/formatters'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a78bfa', '#f43f5e', '#06b6d4', '#fb923c']

export default function ChartAreaBreakdown({ data }) {
  const chartData = useMemo(() => {
    const map = {}
    data.forEach((r) => {
      if (!map[r.area_nombre]) map[r.area_nombre] = { area: r.area_nombre, ingresos: 0, gastos: 0 }
      map[r.area_nombre].ingresos += r.ingresos
      map[r.area_nombre].gastos  += r.gastos
    })
    return Object.values(map)
      .map(d => ({ ...d, resultado: d.ingresos - d.gastos }))
      .sort((a, b) => (b.ingresos + b.gastos) - (a.ingresos + a.gastos))
  }, [data])

  if (!chartData.length) return (
    <div className="flex items-center justify-center h-64 text-txt-secondary text-sm">Sin datos</div>
  )

  const maxIngr = Math.max(...chartData.map(d => d.ingresos))

  return (
    <div className="space-y-3">
      {chartData.map((d, i) => {
        const barW    = maxIngr > 0 ? (d.ingresos / maxIngr) * 100 : 0
        const gastW   = d.ingresos > 0 ? Math.min((d.gastos / d.ingresos) * barW, 100) : barW
        const positive = d.resultado >= 0
        const color   = COLORS[i % COLORS.length]

        return (
          <div key={d.area}>
            {/* Row: nombre + resultado */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-txt-primary truncate max-w-[140px]">{d.area}</span>
              <span className={`text-xs font-semibold tabular-nums ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
                {formatCLP(d.resultado)}
              </span>
            </div>
            {/* Bar ingresos (full width relative to max) */}
            <div className="h-2 bg-elevated rounded-full overflow-hidden mb-0.5">
              <div className="h-full rounded-full" style={{ width: `${barW}%`, background: color, opacity: 0.85 }} />
            </div>
            {/* Bar gastos */}
            <div className="h-2 bg-elevated rounded-full overflow-hidden mb-1">
              <div className="h-full rounded-full" style={{ width: `${gastW}%`, background: '#f43f5e', opacity: 0.75 }} />
            </div>
            {/* Labels alineados */}
            <div className="flex justify-between">
              <span className="text-[10px] tabular-nums" style={{ color }}>{formatCLP(d.ingresos)}</span>
              <span className="text-[10px] tabular-nums text-accent-red">{formatCLP(d.gastos)}</span>
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-4 pt-2 border-t border-elevated">
        <span className="flex items-center gap-1.5 text-[10px] text-txt-secondary">
          <span className="w-2 h-2 rounded-sm bg-accent-blue inline-block" />Ingresos
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-txt-secondary">
          <span className="w-2 h-2 rounded-sm bg-accent-red inline-block" />Gastos
        </span>
      </div>
    </div>
  )
}
