import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createEngine } from './measures'

const PnlContext = createContext(null)

export const EMPTY_FILTERS = {
  years: [],
  months: [],
  areas: [],
  vista: '',
  tipos: [],
  clasifs: [],
  aliases: [],
}

const REFRESH_MS = 10 * 60 * 1000

async function fetchJson(url) {
  const res = await fetch(url)
  const text = await res.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch {
    /* respuesta no JSON (p. ej. la SPA devolviendo index.html sin /api) */
  }
  if (!res.ok) throw new Error(body?.error || `Error ${res.status} al llamar ${url}`)
  if (!body) throw new Error(`Respuesta inválida de ${url}. ¿Está corriendo la API (/api)?`)
  return body
}

export function PnlProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', engine: null, error: null, meta: null })
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const load = useCallback(async () => {
    try {
      const data = await fetchJson('/api/pnl')
      setState({
        status: 'ready',
        engine: createEngine(data),
        error: null,
        meta: { generatedAt: data.generatedAt, stats: data.stats },
      })
    } catch (err) {
      // Si ya había datos, se conservan y solo se avisa del error.
      setState((s) => ({ ...s, status: s.engine ? 'ready' : 'error', error: err.message }))
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const patchFilters = useCallback((patch) => setFilters((f) => ({ ...f, ...patch })), [])
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const value = useMemo(
    () => ({ ...state, filters, patchFilters, resetFilters, reload: load }),
    [state, filters, patchFilters, resetFilters, load]
  )
  return <PnlContext.Provider value={value}>{children}</PnlContext.Provider>
}

export function usePnl() {
  const ctx = useContext(PnlContext)
  if (!ctx) throw new Error('usePnl debe usarse dentro de <PnlProvider>')
  return ctx
}

/** Detalle por comprobante / cuenta (/api/detalle) según los filtros activos. */
export function useDetalle(mode, filters) {
  const [state, setState] = useState({ loading: true, rows: [], total: 0, truncated: false, error: null })
  const qs = useMemo(() => {
    const p = new URLSearchParams({ mode })
    if (filters.years.length) p.set('year', filters.years.join('|'))
    if (filters.months.length) p.set('month', filters.months.join('|'))
    if (filters.areas.length) p.set('area', filters.areas.join('|'))
    if (filters.tipos.length) p.set('tg', filters.tipos.join('|'))
    if (filters.clasifs.length) p.set('cls', filters.clasifs.join('|'))
    if (filters.aliases.length) p.set('alias', filters.aliases.join('|'))
    if (filters.vista) p.set('vista', filters.vista)
    return p.toString()
  }, [mode, filters])

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchJson(`/api/detalle?${qs}`)
      .then((d) => !cancelled && setState({ loading: false, error: null, ...d }))
      .catch((err) => !cancelled && setState((s) => ({ ...s, loading: false, error: err.message })))
    return () => {
      cancelled = true
    }
  }, [qs])

  return state
}
