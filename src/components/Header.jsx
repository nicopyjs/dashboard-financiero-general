export default function Header({ lastUpdated }) {
  const formatted = lastUpdated
    ? lastUpdated.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b border-elevated bg-surface animate-fade-slide-up"
      style={{ animationDelay: '0ms' }}
    >
      <div className="flex items-center gap-3">
        <img
          src="/logo-neb.png"
          alt="NEB Chile"
          className="h-10 w-auto rounded-lg"
        />
        <div>
          <h1 className="text-txt-primary font-semibold text-lg leading-tight">
            NEB Chile
          </h1>
          <p className="text-txt-secondary text-xs">P&L por Centro de Costo</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-txt-secondary text-xs">Última actualización</p>
        <p className="text-txt-primary text-xs font-medium tabular-nums">{formatted}</p>
      </div>
    </header>
  )
}
