import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { parseNum } from '../utils/formatters'

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSINjpy3ClEtTGK9urLQCDC14Nlf_pFgJRIwn-5g1BaiK9XA88_EVxXi8ESkROucLS-zvrgkdMMr6S7/pub?gid=1902246803&single=true&output=csv'

const REFRESH_INTERVAL = 5 * 60 * 1000

function normalizeRow(row) {
  return {
    bussinessCenterId: String(row.bussinessCenterId ?? '').trim(),
    cn_nombre: String(row.cn_nombre ?? '').trim(),
    cn_agrupado: String(row.cn_agrupado ?? '').trim() || '#N/A',
    cn_agrupado2: String(row.cn_agrupado2 ?? '').trim(),
    area: String(row.area ?? '').trim(),
    area_nombre: String(row.area_nombre ?? '').trim(),
    year: parseInt(row.year, 10) || 0,
    month: parseInt(row.month, 10) || 0,
    year_month: (() => {
      const y = parseInt(row.year, 10) || 0
      const m = parseInt(row.month, 10) || 0
      return y && m ? `${y}-${String(m).padStart(2, '0')}` : String(row.year_month ?? '').trim()
    })(),
    ingresos: parseNum(row.ingresos),
    gastos: parseNum(row.gastos),
    resultado: parseNum(row.resultado),
    margen_pct: String(row.margen_pct ?? '0%').trim(),
  }
}

export function useSheetData() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    const urlWithBust = `${CSV_URL}&_t=${Date.now()}`
    Papa.parse(urlWithBust, {
      download: true,
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        const normalized = results.data.map(normalizeRow).filter((r) => r.year > 0)
        console.log(
          `[NEB Dashboard] Filas parseadas: ${normalized.length}`,
          '| Años únicos:',
          [...new Set(normalized.map((r) => r.year))].sort()
        )
        setData(normalized)
        setLastUpdated(new Date())
        setLoading(false)
      },
      error: (err) => {
        console.error('[NEB Dashboard] Error CSV:', err)
        setError(err.message || 'Error al cargar datos')
        setLoading(false)
      },
    })
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  return { data, loading, error, lastUpdated, retry: fetchData }
}
