// IDs de las fuentes. No son secretos (el acceso lo da la Service Account),
// pero se pueden sobreescribir por variable de entorno.
export const SOURCES = {
  movimientos: process.env.MOVIMIENTOS_SHEET_ID || '1b4QPLY0otfzhSkJ7QQscJALJu7DssHi9w1XCad2LI48',
  planes: process.env.PLANES_SHEET_ID || '1H6a16Mj3VShFgXXf6nnLZ08udW7xT0X6m4NPsL_BXxU',
  centros: process.env.CENTROS_SHEET_ID || '1i9Je74fLspED4WiMJHPCDGrxXsiE1x4O6Do7DFhlyW0',
  pptoFile: process.env.PPTO_FILE_ID || '1H-vXLc8HwauSscBSQ3QxiKjBM-MCM1sU',
}

export const TABS = {
  planes: 'ClasificaciónPlanCuentas',
  centros: 'Hoja1',
  pptoGanancias: 'Ganancias',
  pptoGastos: 'AnexoPsto',
  // El año en la hoja es el fiscalYear del comprobante.
  histYears: [2021, 2022, 2023, 2024, 2025, 2026],
  recent: 'three_months_voucher_details',
}

// Cuenta que la vista "Económico" excluye (Filtro_Vistas del modelo Power BI).
export const CUENTA_EXCLUIDA_ECONOMICO = '3110101002'
// Cuenta de la medida "Gasto Directo (MO directa)".
export const CUENTA_MO_DIRECTA = '4510401003'

// TTL (ms). Los años cerrados casi no cambian; el año en curso y los últimos
// 3 meses sí.
export const TTL = {
  closedYear: 6 * 60 * 60 * 1000,
  live: 10 * 60 * 1000,
  dims: 30 * 60 * 1000,
  ppto: 6 * 60 * 60 * 1000,
  model: 10 * 60 * 1000,
}
