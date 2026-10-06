// Reglas de negocio replicadas del modelo semántico de Power BI
// ("Análisis Estado de Resultado"). Todas son funciones puras.

// --- Parseo flexible -------------------------------------------------------

/** Número desde string/number: tolera "1,234.5", "$ 1.234", "-", vacío. */
export function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (v == null) return 0
  const s = String(v).trim()
  if (!s || s === '-') return 0
  const n = Number(s.replace(/[$\s,]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Fecha desde ISO, M/D/YYYY, serial de Sheets o Date. Devuelve {y,m,d,iso} o null. */
export function parseDate(v) {
  if (v == null || v === '') return null
  let y, m, d
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    y = v.getUTCFullYear()
    m = v.getUTCMonth() + 1
    d = v.getUTCDate()
  } else if (typeof v === 'number' || /^\d+(\.\d+)?$/.test(String(v).trim())) {
    const serial = Number(v)
    if (serial < 1) return null
    const dt = new Date(Math.round((serial - 25569) * 86400 * 1000))
    y = dt.getUTCFullYear()
    m = dt.getUTCMonth() + 1
    d = dt.getUTCDate()
  } else {
    const s = String(v).trim()
    let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (match) {
      y = +match[1]; m = +match[2]; d = +match[3]
    } else if ((match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) {
      // Apps Script / Sheets en inglés: M/D/YYYY
      m = +match[1]; d = +match[2]; y = +match[3]
    } else {
      return null
    }
  }
  if (!y || y < 1990 || m < 1 || m > 12) return null
  return { y, m, d, iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
}

/** Compara sin tildes ni mayúsculas (los encabezados/valores varían entre fuentes). */
export const fold = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/** DAX trata "null" como texto; la hoja del plan trae el literal "null" en celdas vacías. */
export const isBlank = (s) => s == null || String(s).trim() === ''

// --- Tipo de plan de cuenta ------------------------------------------------

/** Tipo_Plan_Cuenta: primer dígito del código (1 Activo, 2 Pasivo, 3 Ganancia, 4 Gasto). */
export function tipoPlanCuenta(accountCode) {
  const first = String(accountCode).trim()[0]
  switch (first) {
    case '1': return 'Activo'
    case '2': return 'Pasivo'
    case '3': return 'Ganancia'
    case '4': return 'Gasto'
    default: return 'Otro'
  }
}

/** Monto_EERR: solo Gasto/Ganancia; crédito si existe, si no débito * -1. */
export function montoEERR(tipo, debit, credit) {
  if (tipo !== 'Gasto' && tipo !== 'Ganancia') return 0
  return credit !== 0 ? credit : debit * -1
}

// --- Tipo de gasto ---------------------------------------------------------

const TIPOS_GASTO = {
  'gasto directo': 'Gasto Directo',
  'gasto indirecto': 'Gasto Indirecto',
  'gasto administrativo': 'Gasto Administrativo',
}

/**
 * DAX compara texto sin distinguir mayúsculas ("Gasto directo" = "Gasto Directo"),
 * JS sí. Se normaliza al nombre canónico para que las medidas calcen.
 */
export function canonTipoGasto(s) {
  if (isBlank(s)) return ''
  return TIPOS_GASTO[fold(s)] ?? String(s).trim()
}

/**
 * TipoGasto (columna calculada del modelo):
 *  - solo cuentas de Gasto
 *  - si el plan define Clasificacion_manoObra, manda ese valor
 *  - sin centro de negocio -> sin tipo
 *  - centro "GN..."      -> Administrativo
 *  - centro con "General" -> Indirecto
 *  - resto               -> Directo
 */
export function tipoGasto({ tipoPlan, centroDescripcion, clasifManoObra }) {
  if (tipoPlan !== 'Gasto') return ''
  if (!isBlank(clasifManoObra)) return canonTipoGasto(clasifManoObra)
  if (isBlank(centroDescripcion)) return ''
  const desc = String(centroDescripcion)
  if (desc.slice(0, 2).toUpperCase() === 'GN') return 'Gasto Administrativo'
  if (fold(desc).includes('general')) return 'Gasto Indirecto'
  return 'Gasto Directo'
}

// --- Centros de negocio ----------------------------------------------------

/** Centros_Negocio[Nombre] = MID(Description, 7, LEN-6). */
export const centroNombre = (description) => String(description ?? '').slice(6)

/** Centros_Negocio[Área]: depende del prefijo de 3 letras de la descripción. */
export function centroArea(description) {
  const desc = String(description ?? '')
  switch (desc.slice(0, 3).toUpperCase()) {
    case 'GNR': return 'General empresa'
    case 'INT': return 'Instalaciones'
    case 'RBP': return 'Redes baja presión'
    case 'RCT': return 'Refacciones'
    case 'SST': return 'Servicio técnico'
    case 'GNN': return centroNombre(desc)
    case 'ING': return 'Ingenieria'
    default: return ''
  }
}

// --- Vista (Filtro_Vistas) -------------------------------------------------

export const VISTAS = ['Financiero', 'Económico']
