import { useState } from 'react'
import { usePnl } from './PnlProvider'
import { SlicerPanel } from './ui'

export const ROUTES = [
  { path: '', label: 'Inicio' },
  { path: 'ingresos', label: 'Ingresos' },
  { path: 'ingresos-detalle', label: 'Detalle ingresos' },
  { path: 'egresos', label: 'Egresos' },
  { path: 'egresos-detalle', label: 'Detalle egresos' },
  { path: 'eerr-area', label: 'EERR por área' },
  { path: 'eerr-empresa', label: 'EERR empresa' },
  { path: 'resumen', label: 'Resumen por centro' },
]

export function NavBar({ route }) {
  const { meta, error, reload } = usePnl()
  const updated = meta?.generatedAt
    ? new Date(meta.generatedAt).toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <header className="bg-surface border-b border-elevated">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <a href="#/" className="flex items-center gap-3 min-w-0">
          <img src="/logo-neb.png" alt="NEB Chile" className="h-9 w-auto rounded-lg" />
          <div className="min-w-0">
            <p className="text-txt-primary font-semibold leading-tight">NEB Chile</p>
            <p className="text-txt-secondary text-xs">Análisis Estado de Resultado</p>
          </div>
        </a>
        <div className="text-right text-xs shrink-0">
          <p className="text-txt-secondary">Datos al</p>
          <p className="text-txt-primary font-medium tabular-nums">{updated}</p>
          {error && (
            <button onClick={reload} className="text-accent-amber hover:underline">
              Error al actualizar · reintentar
            </button>
          )}
        </div>
      </div>
      <nav className="flex gap-1 px-4 overflow-x-auto" aria-label="Páginas">
        {ROUTES.map((r) => {
          const active = r.path === route
          return (
            <a
              key={r.path}
              href={`#/${r.path}`}
              aria-current={active ? 'page' : undefined}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-accent-blue text-txt-primary'
                  : 'border-transparent text-txt-secondary hover:text-txt-primary'
              }`}
            >
              {r.label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}

/** Página con panel de filtros a la izquierda, como en el reporte original. */
export function PageFrame({ title, slicers, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-txt-primary text-lg font-semibold">{title}</h1>
        {/* En pantallas angostas los filtros se despliegan a demanda. */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="lg:hidden px-3 py-1.5 text-xs rounded-lg border border-elevated text-txt-secondary hover:text-txt-primary"
        >
          {open ? 'Ocultar filtros' : 'Filtros'}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4">
        <div className={open ? 'block' : 'hidden lg:block'}>
          <SlicerPanel show={slicers} />
        </div>
        <div className="space-y-4 min-w-0">{children}</div>
      </div>
    </div>
  )
}
