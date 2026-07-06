import { useMemo, useState, useRef, useEffect } from 'react'
import { MONTH_NAMES } from '../utils/formatters'

function MultiSelectDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(v) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  const displayLabel =
    value.length === 0
      ? label
      : value.length === 1
      ? options.find((o) => o.value === value[0])?.label ?? label
      : `${value.length} seleccionados`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-elevated border border-border text-txt-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent-blue transition-colors cursor-pointer min-w-[140px] hover:border-accent-blue/50"
      >
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        {value.length > 0 && (
          <span className="bg-accent-blue text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none flex-shrink-0">
            {value.length}
          </span>
        )}
        <span className="text-txt-secondary text-xs flex-shrink-0">{open ? '▲' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#0f172a] border border-elevated rounded-xl shadow-2xl min-w-[160px] max-h-64 overflow-y-auto py-1">
          {options.map((o) => {
            const checked = value.includes(o.value)
            return (
              <label
                key={o.value}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-elevated transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked
                      ? 'bg-accent-blue border-accent-blue'
                      : 'border-border bg-transparent'
                  }`}
                >
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm select-none ${
                    checked ? 'text-txt-primary' : 'text-txt-secondary'
                  }`}
                >
                  {o.label}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.value)}
                  className="sr-only"
                />
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SingleSelectDropdown({ label, options, value, onChange, searchable = false }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const listRef = useRef(null)
  const selectedRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      if (searchable) {
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      // scroll al item seleccionado
      setTimeout(() => {
        if (selectedRef.current && listRef.current) {
          const list = listRef.current
          const item = selectedRef.current
          const itemTop = item.offsetTop
          const itemBottom = itemTop + item.offsetHeight
          const listHeight = list.clientHeight
          if (itemTop < list.scrollTop || itemBottom > list.scrollTop + listHeight) {
            list.scrollTop = itemTop - listHeight / 2 + item.offsetHeight / 2
          }
        }
      }, 60)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  const displayLabel = value
    ? options.find((o) => o.value === value)?.label ?? label
    : label

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 bg-elevated border text-txt-primary text-sm rounded-lg px-3 py-2 focus:outline-none transition-colors cursor-pointer min-w-[160px] hover:border-accent-blue/50 ${
          value ? 'border-accent-blue/40' : 'border-border'
        }`}
      >
        <span className={`flex-1 text-left truncate ${value ? 'text-txt-primary' : 'text-txt-secondary'}`}>
          {displayLabel}
        </span>
        <span className="text-txt-secondary text-xs flex-shrink-0">{open ? '▲' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#0f172a] border border-elevated rounded-xl shadow-2xl min-w-full flex flex-col" style={{ maxHeight: '18rem' }}>
          {searchable && (
            <div className="px-2 pt-2 pb-1 flex-shrink-0">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-elevated border border-border text-txt-primary text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-blue placeholder-txt-secondary"
              />
            </div>
          )}
          <div ref={listRef} className="overflow-y-auto py-1 flex-1">
            {!search && (
              <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-elevated transition-colors">
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${!value ? 'border-accent-blue bg-accent-blue' : 'border-border'}`}>
                  {!value && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <span className={`text-sm select-none ${!value ? 'text-txt-primary' : 'text-txt-secondary'}`}>
                  {label}
                </span>
                <input type="radio" checked={!value} onChange={() => { onChange(''); setOpen(false); setSearch('') }} className="sr-only" />
              </label>
            )}
            {filtered.map((o) => {
              const selected = value === o.value
              return (
                <label
                  key={o.value}
                  ref={selected ? selectedRef : null}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-elevated transition-colors ${selected ? 'bg-elevated/50' : ''}`}
                >
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-accent-blue bg-accent-blue' : 'border-border'}`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  <span className={`text-sm select-none truncate ${selected ? 'text-txt-primary font-medium' : 'text-txt-secondary'}`}>
                    {o.label}
                  </span>
                  <input type="radio" checked={selected} onChange={() => { onChange(o.value); setOpen(false); setSearch('') }} className="sr-only" />
                </label>
              )
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-txt-secondary text-sm text-center">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FilterBar({ data, filters, setFilters }) {
  const years = useMemo(
    () => [...new Set(data.map((r) => r.year))].sort((a, b) => b - a),
    [data]
  )
  const areas = useMemo(
    () => [...new Set(data.map((r) => r.area_nombre))].filter(Boolean).sort(),
    [data]
  )
  const centros = useMemo(() => {
    const base = filters.areas.length ? data.filter((r) => filters.areas.includes(r.area_nombre)) : data
    return [...new Map(base.map((r) => [r.bussinessCenterId, r.cn_nombre])).entries()]
      .map(([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [data, filters.areas])

  const hasFilters =
    filters.years.length > 0 ||
    filters.months.length > 0 ||
    filters.areas.length > 0 ||
    filters.centro

  return (
    <div
      className="sticky top-0 z-20 bg-surface border-b border-elevated px-6 py-3 animate-fade-slide-up overflow-visible"
      style={{ animationDelay: '100ms' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-txt-secondary text-xs font-medium whitespace-nowrap">
          Filtros:
        </span>

        <MultiSelectDropdown
          label="Año"
          options={years.map((y) => ({ value: y, label: String(y) }))}
          value={filters.years}
          onChange={(v) => setFilters((f) => ({ ...f, years: v }))}
        />

        <MultiSelectDropdown
          label="Mes"
          options={MONTH_NAMES.map((m, i) => ({ value: i + 1, label: m }))}
          value={filters.months}
          onChange={(v) => setFilters((f) => ({ ...f, months: v }))}
        />

        <MultiSelectDropdown
          label="Área"
          options={areas.map((a) => ({ value: a, label: a }))}
          value={filters.areas}
          onChange={(v) => {
            setFilters((f) => ({ ...f, areas: v, centro: '' }))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />

        <SingleSelectDropdown
          label="Todos los centros"
          options={centros}
          value={filters.centro}
          onChange={(v) => {
            setFilters((f) => ({ ...f, centro: v }))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          searchable
        />

        {hasFilters && (
          <button
            onClick={() => setFilters({ years: [], months: [], areas: [], centro: '' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-elevated border border-border text-txt-secondary text-sm hover:text-accent-red hover:border-accent-red transition-colors"
          >
            <span>✕</span>
            <span>Limpiar</span>
          </button>
        )}
      </div>
    </div>
  )
}
