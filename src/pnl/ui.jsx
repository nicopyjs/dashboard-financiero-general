import { useMemo, useState } from 'react'
import { usePnl } from './PnlProvider'
import { derive, emptyParts, MESES } from './measures'
import { formatCLP } from '../utils/formatters'

export const COLORS = {
  ventas: '#3b82f6',
  gasto: '#f43f5e',
  ppto: '#f59e0b',
  ok: '#20be0f', // verde de la matriz de gastos del reporte original
  bad: '#ff0000',
  gold: '#e6c029',
  // Sin ámbar: ese color es exclusivo del presupuesto.
  series: ['#3b82f6', '#10b981', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'],
}

export const MES_CORTO = MESES.map((m) => m.slice(0, 3))

export const fmtPct = (n) => `${(n * 100).toFixed(2)} %`

export const tickFmt = (v) => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(0)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${abs}`
}

export const axisProps = {
  tick: { fill: '#64748b', fontSize: 10 },
  axisLine: false,
  tickLine: false,
}

// --- Contenedores ----------------------------------------------------------

export function Panel({ title, subtitle, children, className = '', delay = 0 }) {
  return (
    <section
      className={`bg-surface border border-elevated rounded-xl p-4 animate-fade-slide-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {title && <h2 className="text-txt-primary text-sm font-semibold">{title}</h2>}
      {subtitle && <p className="text-txt-secondary text-xs mt-0.5">{subtitle}</p>}
      <div className={title ? 'mt-4' : ''}>{children}</div>
    </section>
  )
}

export function Empty({ children = 'Sin datos para la selección actual' }) {
  return (
    <div className="flex items-center justify-center h-48 text-txt-secondary text-sm text-center px-4">
      {children}
    </div>
  )
}

export function ChartTooltip({ active, payload, label, valueFormat = formatCLP }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a1628] border border-accent-blue/20 rounded-xl p-3 shadow-2xl text-xs min-w-[200px]">
      <p className="text-txt-secondary mb-2 font-semibold uppercase tracking-wider">{label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex justify-between gap-6">
            <span className="flex items-center gap-2 text-txt-secondary">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: p.color || p.fill }} />
              {p.name}
            </span>
            <span className="text-txt-primary font-semibold tabular-nums">{valueFormat(p.value, p)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Slicers ---------------------------------------------------------------

function SlicerList({ title, options, selected, onChange, maxHeight = 'max-h-40' }) {
  const set = new Set(selected.map(String))
  const toggle = (value) => {
    const next = new Set(set)
    next.has(String(value)) ? next.delete(String(value)) : next.add(String(value))
    const original = options.filter((o) => next.has(String(o.value))).map((o) => o.value)
    onChange(original)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-txt-secondary text-[11px] font-semibold uppercase tracking-wider">{title}</p>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-[11px] text-accent-blue hover:underline"
          >
            Limpiar
          </button>
        )}
      </div>
      <div className={`border border-elevated rounded-lg overflow-y-auto ${maxHeight} bg-base/40`}>
        {options.length === 0 && <p className="text-txt-secondary text-xs p-2">Sin opciones</p>}
        {options.map((o) => {
          const on = set.has(String(o.value))
          return (
            <label
              key={o.value}
              className={`flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-elevated/60 ${
                on ? 'text-txt-primary' : 'text-txt-secondary'
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(o.value)}
                className="accent-[#3b82f6]"
              />
              <span className="truncate">{o.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function VistaSlicer({ value, onChange }) {
  const options = [
    { v: '', label: 'Todas' },
    { v: 'Financiero', label: 'Financiero' },
    { v: 'Económico', label: 'Económico' },
  ]
  return (
    <div>
      <p className="text-txt-secondary text-[11px] font-semibold uppercase tracking-wider mb-1.5">Vista</p>
      <div className="flex rounded-lg border border-elevated overflow-hidden">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`flex-1 px-2 py-1.5 text-xs transition-colors ${
              value === o.v
                ? 'bg-accent-blue text-white'
                : 'text-txt-secondary hover:bg-elevated/60'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Panel lateral de slicers. `show` elige cuáles aplican a la página. */
export function SlicerPanel({ show }) {
  const { engine, filters, patchFilters, resetFilters } = usePnl()
  const has = (k) => show.includes(k)
  const active =
    filters.years.length +
      filters.months.length +
      filters.areas.length +
      filters.tipos.length +
      filters.clasifs.length +
      filters.aliases.length +
      (filters.vista ? 1 : 0) >
    0

  return (
    <aside className="bg-surface border border-elevated rounded-xl p-4 space-y-4 lg:sticky lg:top-4 self-start animate-fade-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-txt-primary text-sm font-semibold">Filtros</h2>
        {active && (
          <button onClick={resetFilters} className="text-xs text-accent-blue hover:underline">
            Limpiar todo
          </button>
        )}
      </div>
      {has('vista') && <VistaSlicer value={filters.vista} onChange={(v) => patchFilters({ vista: v })} />}
      {has('year') && (
        <SlicerList
          title="Año"
          options={engine.years.map((y) => ({ value: y, label: String(y) }))}
          selected={filters.years}
          onChange={(years) => patchFilters({ years })}
        />
      )}
      {has('month') && (
        <SlicerList
          title="Mes"
          options={MESES.map((m, i) => ({ value: i + 1, label: m }))}
          selected={filters.months}
          onChange={(months) => patchFilters({ months })}
        />
      )}
      {has('area') && (
        <SlicerList
          title="Área"
          options={engine.areas.map((a) => ({ value: a, label: a }))}
          selected={filters.areas}
          onChange={(areas) => patchFilters({ areas })}
        />
      )}
      {has('tipo') && (
        <SlicerList
          title="Tipo de gasto"
          options={engine.tiposGasto.map((a) => ({ value: a, label: a }))}
          selected={filters.tipos}
          onChange={(tipos) => patchFilters({ tipos })}
          maxHeight="max-h-28"
        />
      )}
      {has('clasif') && (
        <SlicerList
          title="Clasificación"
          options={engine.clasifs.map((a) => ({ value: a, label: a === 'null' ? 'Sin clasificar' : a }))}
          selected={filters.clasifs}
          onChange={(clasifs) => patchFilters({ clasifs })}
        />
      )}
      {has('alias') && (
        <SlicerList
          title="Alias"
          options={engine.aliases.map((a) => ({ value: a, label: a }))}
          selected={filters.aliases}
          onChange={(aliases) => patchFilters({ aliases })}
        />
      )}
    </aside>
  )
}

// --- Tabla jerárquica (matriz con expandir/contraer) -----------------------

const levelLabel = (key, v) => {
  if (v === '' || v == null) return '(En blanco)'
  if (key === 'month') return MESES[v - 1] ?? String(v)
  if (key === 'clasif' && v === 'null') return 'Sin clasificar'
  return String(v)
}

const sumParts = (a, b) => {
  for (const k of Object.keys(b)) a[k] += b[k]
  return a
}

/**
 * rows    : filas de engine.aggregate() con las dimensiones de `levels` y _parts
 * levels  : [{ key: 'year' | 'month' | 'area' | 'tipo' | 'clasif', label }]
 * columns : [{ label, get(m) , fmt, tone?(m, value), leaf?(leaf) }]
 * leaves  : { items, keyOf(leaf) -> clave del nodo del último nivel, label(leaf) }
 */
export function TreeTable({ rows, levels, columns, leaves, firstColLabel }) {
  const [open, setOpen] = useState(() => new Set())

  const tree = useMemo(() => {
    const root = { children: new Map(), parts: emptyParts() }
    for (const r of rows) {
      let node = root
      sumParts(root.parts, r._parts)
      const path = []
      levels.forEach((lv, depth) => {
        const raw = r[lv.key] ?? ''
        path.push(String(raw))
        let child = node.children.get(String(raw))
        if (!child) {
          child = {
            id: path.join('›'),
            leafKey: path.join('|'),
            raw,
            levelKey: lv.key,
            depth,
            parts: emptyParts(),
            children: new Map(),
          }
          node.children.set(String(raw), child)
        }
        sumParts(child.parts, r._parts)
        node = child
      })
    }
    return root
  }, [rows, levels])

  const leafIndex = useMemo(() => {
    if (!leaves) return null
    const m = new Map()
    for (const l of leaves.items) {
      const k = leaves.keyOf(l)
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(l)
    }
    return m
  }, [leaves])

  const sorted = (children) =>
    [...children.values()].sort((a, b) => {
      if (typeof a.raw === 'number' && typeof b.raw === 'number') return a.raw - b.raw
      return levelLabel(a.levelKey, a.raw).localeCompare(levelLabel(b.levelKey, b.raw), 'es')
    })

  const visible = []
  const walk = (node) => {
    for (const child of sorted(node.children)) {
      const isLast = child.depth === levels.length - 1
      const leafList = isLast && leafIndex ? leafIndex.get(child.leafKey) ?? [] : []
      const expandable = child.children.size > 0 || leafList.length > 0
      visible.push({ type: 'node', node: child, expandable })
      if (open.has(child.id)) {
        walk(child)
        leafList.slice(0, 200).forEach((l, i) =>
          visible.push({ type: 'leaf', leaf: l, id: `${child.id}#${i}`, depth: child.depth + 1 })
        )
        if (leafList.length > 200) visible.push({ type: 'more', n: leafList.length - 200, depth: child.depth + 1 })
      }
    }
  }
  walk(tree)

  const allIds = useMemo(() => {
    const ids = []
    const go = (n) => n.children.forEach((c) => (ids.push(c.id), go(c)))
    go(tree)
    return ids
  }, [tree])

  const toggle = (id) =>
    setOpen((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  if (!rows.length) return <Empty />

  const total = derive(tree.parts)

  return (
    <div>
      <div className="flex gap-3 mb-2 text-xs">
        <button className="text-accent-blue hover:underline" onClick={() => setOpen(new Set(allIds))}>
          Expandir todo
        </button>
        <button className="text-accent-blue hover:underline" onClick={() => setOpen(new Set())}>
          Contraer todo
        </button>
      </div>
      <div className="overflow-auto max-h-[560px] border border-elevated rounded-lg">
        <table className="w-full text-xs tabular-nums">
          <thead className="sticky top-0 bg-elevated text-txt-secondary">
            <tr>
              <th className="text-left font-semibold px-3 py-2">{firstColLabel ?? levels[0]?.label}</th>
              {columns.map((c) => (
                <th key={c.label} className="text-right font-semibold px-3 py-2 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((v) => {
              if (v.type === 'more') {
                return (
                  <tr key={`more-${v.depth}-${v.n}`} className="border-t border-elevated/60">
                    <td
                      className="px-3 py-1.5 text-txt-secondary italic"
                      style={{ paddingLeft: 12 + v.depth * 16 }}
                      colSpan={columns.length + 1}
                    >
                      … {v.n} comprobantes más (acota con los filtros)
                    </td>
                  </tr>
                )
              }
              if (v.type === 'leaf') {
                return (
                  <tr key={v.id} className="border-t border-elevated/60 text-txt-secondary">
                    <td className="px-3 py-1.5 truncate max-w-[420px]" style={{ paddingLeft: 12 + v.depth * 16 }} title={leaves.label(v.leaf)}>
                      {leaves.label(v.leaf)}
                    </td>
                    {columns.map((c) => (
                      <td key={c.label} className="px-3 py-1.5 text-right">
                        {c.leaf ? c.fmt(c.leaf(v.leaf)) : ''}
                      </td>
                    ))}
                  </tr>
                )
              }
              const { node, expandable } = v
              const m = derive(node.parts)
              return (
                <tr key={node.id} className="border-t border-elevated/60 hover:bg-elevated/30">
                  <td className="px-3 py-1.5 text-txt-primary" style={{ paddingLeft: 12 + node.depth * 16 }}>
                    {expandable ? (
                      <button onClick={() => toggle(node.id)} className="mr-1.5 text-txt-secondary hover:text-txt-primary w-3 inline-block">
                        {open.has(node.id) ? '▾' : '▸'}
                      </button>
                    ) : (
                      <span className="mr-1.5 w-3 inline-block" />
                    )}
                    {levelLabel(node.levelKey, node.raw)}
                  </td>
                  {columns.map((c) => {
                    const val = c.get(m)
                    return (
                      <td key={c.label} className="px-3 py-1.5 text-right" style={c.tone ? { color: c.tone(m, val) } : undefined}>
                        {c.fmt(val)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr className="border-t-2 border-elevated bg-elevated/40 font-semibold text-txt-primary sticky bottom-0">
              <td className="px-3 py-2">Total</td>
              {columns.map((c) => {
                const val = c.get(total)
                return (
                  <td key={c.label} className="px-3 py-2 text-right" style={c.tone ? { color: c.tone(total, val) } : undefined}>
                    {c.fmt(val)}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Cascada del estado de resultados (reemplaza los embudos de Power BI) --

/**
 * rows: [{ label, value, indent?, strong? }]. Un embudo no admite valores
 * negativos (los gastos lo son), por eso se dibuja como barras horizontales
 * con la misma escala para real y presupuesto.
 */
export function Cascade({ title, rows, scale, accent = COLORS.ventas }) {
  const max = scale ?? Math.max(1, ...rows.map((r) => Math.abs(r.value)))
  return (
    <div>
      {title && <h3 className="text-txt-primary text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>}
      <div className="space-y-2">
        {rows.map((r) => {
          const pct = Math.min(100, (Math.abs(r.value) / max) * 100)
          const negative = r.value < 0
          const color = r.strong ? (negative ? COLORS.gasto : COLORS.gold) : negative ? COLORS.gasto : accent
          return (
            <div key={r.label} style={{ paddingLeft: (r.indent ?? 0) * 16 }}>
              <div className="flex justify-between items-baseline gap-3 text-xs">
                <span className={r.strong ? 'text-txt-primary font-semibold' : 'text-txt-secondary'}>{r.label}</span>
                <span
                  className="tabular-nums font-semibold"
                  style={{ color: r.strong ? (negative ? COLORS.gasto : COLORS.gold) : '#f1f5f9' }}
                >
                  {formatCLP(r.value)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-elevated mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color, opacity: r.strong ? 1 : 0.8 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const cascadeScale = (...groups) =>
  Math.max(1, ...groups.flat().map((r) => Math.abs(r.value)))
