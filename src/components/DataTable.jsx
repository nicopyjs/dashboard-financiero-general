import { useState, useMemo } from 'react'
import { formatCLP, formatPct } from '../utils/formatters'

const PAGE_SIZE = 25

const COLUMNS = [
  { key: 'year_month', label: 'Período' },
  { key: 'cn_nombre', label: 'Centro de Costo' },
  { key: 'area_nombre', label: 'Área' },
  { key: 'ingresos', label: 'Ingresos', numeric: true },
  { key: 'gastos', label: 'Gastos', numeric: true },
  { key: 'resultado', label: 'Resultado', numeric: true, colored: true },
  { key: 'margen_pct', label: 'Margen' },
]

export default function DataTable({ data }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'year_month', dir: 'desc' })
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(
      (r) =>
        r.cn_nombre.toLowerCase().includes(q) ||
        r.area_nombre.toLowerCase().includes(q)
    )
  }, [data, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const dir = sort.dir === 'asc' ? 1 : -1
      if (typeof av === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [filtered, sort])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(key) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(0)
  }

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(0)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por centro o área..."
          value={search}
          onChange={handleSearch}
          className="bg-elevated border border-border text-txt-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent-blue transition-colors w-64 placeholder-txt-secondary"
        />
        <p className="text-txt-secondary text-xs">
          {filtered.length.toLocaleString('es-CL')} registros
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-elevated bg-surface">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-4 py-3 text-left text-txt-secondary text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-txt-primary transition-colors select-none whitespace-nowrap ${col.numeric ? 'text-right' : ''}`}
                >
                  <span className="flex items-center gap-1 justify-between">
                    <span>{col.label}</span>
                    <span className="text-[10px]">
                      {sort.key === col.key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr
                key={i}
                className="border-b border-elevated/50 hover:bg-elevated transition-colors duration-150"
              >
                <td className="px-4 py-3 text-txt-secondary tabular-nums">{row.year_month}</td>
                <td className="px-4 py-3 text-txt-primary max-w-xs truncate" title={row.cn_nombre}>
                  {row.cn_nombre}
                </td>
                <td className="px-4 py-3 text-txt-secondary">{row.area_nombre}</td>
                <td className="px-4 py-3 text-right tabular-nums text-accent-blue">
                  {formatCLP(row.ingresos)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-accent-red">
                  {formatCLP(row.gastos)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums font-medium ${
                    row.resultado >= 0 ? 'text-accent-green' : 'text-accent-red'
                  }`}
                >
                  {formatCLP(row.resultado)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums text-xs ${
                    parseFloat(String(row.margen_pct).replace('%', '')) >= 0
                      ? 'text-accent-green'
                      : 'text-accent-red'
                  }`}
                >
                  {formatPct(row.margen_pct)}
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-txt-secondary">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg bg-elevated border border-border text-txt-secondary text-sm disabled:opacity-30 hover:text-txt-primary hover:border-accent-blue transition-colors disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <span className="text-txt-secondary text-sm tabular-nums">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-4 py-2 rounded-lg bg-elevated border border-border text-txt-secondary text-sm disabled:opacity-30 hover:text-txt-primary hover:border-accent-blue transition-colors disabled:cursor-not-allowed"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
