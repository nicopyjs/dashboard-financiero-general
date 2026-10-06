# NEB Chile — Análisis Estado de Resultado

Réplica web del reporte Power BI "Análisis Estado de Resultado". Los datos salen de
Google Sheets / Drive (Defontana vía ETL) y se leen en el servidor con una Service Account.

## Arquitectura

```
Google Sheets / Drive ──(Service Account)──▶ api/*.js (Vercel Functions) ──▶ React (Vite)
```

- `api/_lib/` — cliente de Google, reglas de negocio (`rules.js`), carga y cubo (`model.js`), presupuesto (`ppto.js`).
- `api/pnl.js` — cubo agregado + presupuesto + diccionarios.
- `api/detalle.js` — drill-down por comprobante (Detalle egresos) y por cuenta (EERR por área).
- `src/pnl/measures.js` — las 25 medidas DAX del modelo original, calculadas en el navegador.
- `src/pnl/*Pages.jsx` — páginas: Ingresos, Detalle ingresos, Egresos, Detalle egresos, EERR por área, EERR empresa.
- `src/App.jsx` — dashboard anterior ("Resumen por centro", lee un CSV publicado). Se mantiene en `#/resumen`.

## Fuentes

| Dato | Fuente |
|---|---|
| Asientos contables | `Defontana - Movimientos contables` → `hist_details_2021…2026` + `three_months_voucher_details` (se deduplican) |
| Plan de cuentas | `Planes_de_cuenta_NEB` → `ClasificaciónPlanCuentas` |
| Centros de negocio | `centros_negocios` → `Hoja1` |
| Presupuesto 2025 | `PPTO 2025 Tabulado.xlsx` (Drive, hojas `Ganancias` y `AnexoPsto`) |

Los IDs están en `api/_lib/config.js`. Cada archivo debe estar compartido (lector) con la Service Account.

## Configuración

1. Copia `.env.example` a `.env.local` y completa `GOOGLE_SERVICE_ACCOUNT_EMAIL` y
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (la llave en una línea, con los saltos como `\n`).
2. En el proyecto de GCP deben estar habilitadas la **Sheets API** y la **Drive API**.
3. Las mismas variables van en Vercel (Settings → Environment Variables).

```bash
npm run dev                    # sirve el front y /api localmente
node scripts/test-rules.mjs    # pruebas de reglas y medidas (sin credenciales)
node scripts/validate.mjs      # compara contra scripts/baseline.mjs (local, no versionado) y las credenciales
```

## Reglas del modelo que conviene recordar

- `Tipo_Plan_Cuenta` sale del primer dígito del código de cuenta (3 = Ganancia, 4 = Gasto).
- `Monto_EERR` = crédito si existe, si no débito × −1 (solo Ganancia/Gasto).
- `TipoGasto`: manda `Clasificacion_manoObra` del plan; si no, centro `GN…` = Administrativo,
  centro con "General" = Indirecto, resto = Directo. DAX no distingue mayúsculas
  ("Gasto directo" = "Gasto Directo"); aquí se normaliza.
- El filtro **Provisiones** reemplaza a la "vista" del reporte original: **Sin provisiones** (antes Económico) excluye la cuenta `3110101002`; **Con provisiones** (antes Financiero) incluye todas.
- El presupuesto de ganancias no depende de tipo de gasto ni de clasificación.
