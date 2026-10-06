import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
]

let authClient = null

function getAuth() {
  if (authClient) return authClient
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !key) {
    throw new Error(
      'Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en el entorno.'
    )
  }
  authClient = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  })
  return authClient
}

const sheetsApi = () => google.sheets({ version: 'v4', auth: getAuth() })
const driveApi = () => google.drive({ version: 'v3', auth: getAuth() })

/** Hoja completa como matriz de strings (fila 1 = encabezado). */
export async function getSheet(spreadsheetId, range) {
  const res = await sheetsApi().spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  })
  const rows = res.data.values ?? []
  return rows.map((r) => r.map((c) => (c == null ? '' : String(c))))
}

/** Solo la fila de encabezados de una hoja. */
export async function getHeader(spreadsheetId, sheetName) {
  const res = await sheetsApi().spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!1:1`,
  })
  return (res.data.values?.[0] ?? []).map((c) => String(c ?? '').trim())
}

/** Índice 0-based de columna -> letra A1 (0 -> A, 26 -> AA). */
export function columnLetter(index) {
  let n = index
  let letter = ''
  do {
    letter = String.fromCharCode((n % 26) + 65) + letter
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return letter
}

/**
 * Lee solo algunas columnas de una hoja grande (por nombre de encabezado) con
 * un único batchGet. Devuelve { columnName: string[] } ya alineadas por fila
 * (sin la fila de encabezado). Las columnas llegan recortadas al último valor
 * no vacío, por eso se rellenan al largo máximo.
 */
export async function getColumns(spreadsheetId, sheetName, columnNames) {
  const header = await getHeader(spreadsheetId, sheetName)
  const ranges = []
  const used = []
  for (const name of columnNames) {
    const idx = header.findIndex((h) => h.toLowerCase() === name.toLowerCase())
    if (idx === -1) continue
    const letter = columnLetter(idx)
    ranges.push(`'${sheetName}'!${letter}2:${letter}`)
    used.push(name)
  }
  if (!ranges.length) return { columns: {}, length: 0, missing: columnNames }

  const res = await sheetsApi().spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    majorDimension: 'COLUMNS',
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  })

  const raw = (res.data.valueRanges ?? []).map((vr) => vr.values?.[0] ?? [])
  const length = raw.reduce((m, c) => Math.max(m, c.length), 0)
  const columns = {}
  used.forEach((name, i) => {
    const col = raw[i]
    const out = new Array(length)
    for (let r = 0; r < length; r++) out[r] = col[r] == null ? '' : col[r]
    columns[name] = out
  })
  return { columns, length, missing: columnNames.filter((n) => !used.includes(n)) }
}

/** Descarga un archivo de Drive (.xlsx subido, no Sheet nativo) como Buffer. */
export async function downloadDriveFile(fileId) {
  const res = await driveApi().files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )
  return Buffer.from(res.data)
}
