export const formatCLP = (n) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)

export const formatPct = (str) => {
  const n = parseFloat(String(str ?? '0').replace('%', ''))
  return `${n.toFixed(2)}%`
}

export const parseNum = (val) =>
  parseFloat(String(val ?? '0').replace(/,/g, '')) || 0

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
