import { useMemo } from 'react'
import { formatCLP } from '../utils/formatters'

export default function ChartTopCentros({ data }) {
  const centros = useMemo(() => {
    const map = {}
    data.forEach((r) => {
      if (!map[r.cn_nombre]) map[r.cn_nombre] = { nombre: r.cn_nombre, area: r.area_nombre, ingresos: 0, gastos: 0 }
      map[r.cn_nombre].ingresos += r.ingresos
      map[r.cn_nombre].gastos  += r.gastos
    })
    return Object.values(map)
      .map(d => ({ ...d, resultado: d.ingresos - d.gastos }))
      .sort((a, b) => b.resultado - a.resultado)
      .slice(0, 10)
  }, [data])

  if (!centros.length) return (
    <div className="flex items-center justify-center h-48 text-txt-secondary text-sm">Sin datos</div>
  )

  const maxAbs = Math.max(...centros.map(d => Math.abs(d.resultado)))

  return (
    <div className="space-y-2.5">
      {centros.map((d, i) => {
        const pct = maxAbs > 0 ? Math.abs(d.resultado) / maxAbs * 100 : 0
        const positive = d.resultado >= 0
        const barColor = positive ? '#10b981' : '#f43f5e'
        const margen = d.ingresos > 0 ? ((d.resultado / d.ingresos) * 100).toFixed(1) : null

        return (
          <div key={d.nombre} className="group flex items-center gap-3">
            {/* Rank */}
            <span className="text-txt-secondary text-xs tabular-nums w-4 flex-shrink-0 text-right">
              {i + 1}
            </span>

            {/* Nombre + area */}
            <div className="w-44 flex-shrink-0">
              <p className="text-txt-primary text-xs font-medium truncate group-hover:text-white transition-colors leading-tight"
                title={d.nombre}>
                {d.nombre}
              </p>
              <p className="text-txt-secondary text-[10px] truncate">{d.area}</p>
            </div>

            {/* Barra */}
            <div className="flex-1 h-6 bg-elevated rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: positive
                    ? 'linear-gradient(90deg, #059669, #10b981)'
                    : 'linear-gradient(90deg, #e11d48, #f43f5e)',
                  minWidth: pct > 0 ? '4px' : '0',
                  opacity: 0.85,
                }}
              />
            </div>

            {/* Valor resultado */}
            <div className="w-32 flex-shrink-0 text-right">
              <p className={`text-sm font-semibold tabular-nums ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
                {formatCLP(d.resultado)}
              </p>
              {margen !== null && (
                <p className="text-[10px] text-txt-secondary tabular-nums">{margen}% margen</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
