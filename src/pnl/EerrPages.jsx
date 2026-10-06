import { useMemo } from 'react'
import { usePnl, useDetalle } from './PnlProvider'
import { PageFrame } from './layout'
import { Panel, Empty, Cascade, cascadeScale, COLORS, fmtPct } from './ui'
import { formatCLP } from '../utils/formatters'

const SLICERS_AREA = ['vista', 'year', 'month', 'area', 'tipo', 'alias']
const SLICERS_EMPRESA = ['vista', 'year', 'month']

function realRows(t) {
  return [
    { label: 'Ventas netas', value: t.ventasNeto },
    { label: 'Gasto directo', value: t.gastoDirecto },
    { label: 'Mano de obra directa', value: t.gastoDirectoMO, indent: 1 },
    { label: 'Materiales', value: t.gastoDirectoMateriales, indent: 1 },
    { label: 'Resultado operacional', value: t.realOperacional, strong: true },
    { label: 'Gasto indirecto', value: t.gastoIndirecto },
    { label: 'Mano de obra indirecta', value: t.gastoIndirectoMO, indent: 1 },
    { label: 'Estado de resultado', value: t.estadoResultado, strong: true },
  ]
}

function pptoRows(t) {
  return [
    { label: 'Ingresos presupuestados', value: t.pptoIngresos },
    { label: 'Gasto directo', value: t.gastoDirectoPst },
    { label: 'Resultado operacional', value: t.resultadoOperacionalPst, strong: true },
    { label: 'Gasto indirecto', value: t.gastoIndirectoPst },
    { label: 'Estado de resultado esperado', value: t.estadoResultadoEsperado, strong: true },
  ]
}

export function EerrArea() {
  const { engine, filters } = usePnl()
  const t = useMemo(() => engine.totals(filters), [engine, filters])
  const detalle = useDetalle('eerr', filters)

  const real = realRows(t)
  const ppto = pptoRows(t)
  const scale = cascadeScale(real, ppto)

  return (
    <PageFrame title="Estados de resultado por áreas" slicers={SLICERS_AREA}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Presupuesto" subtitle="Estado de resultado esperado" delay={0}>
          <Cascade rows={ppto} scale={scale} accent={COLORS.ppto} />
        </Panel>
        <Panel title="Real" subtitle="Estado de resultado según contabilidad" delay={60}>
          <Cascade rows={real} scale={scale} />
          <p className="text-txt-secondary text-xs mt-4">
            Diferencia operacional vs presupuesto:{' '}
            <span className="text-txt-primary font-semibold">{fmtPct(t.pctDifOperacional)}</span>
          </p>
        </Panel>
      </div>

      <Panel
        title="Detalle por cuenta"
        subtitle={
          detalle.loading
            ? 'Cargando…'
            : detalle.truncated
              ? `Se muestran las 3.000 líneas de mayor monto de ${detalle.total.toLocaleString('es-CL')}`
              : `${detalle.total.toLocaleString('es-CL')} líneas`
        }
        delay={120}
      >
        {detalle.error ? (
          <p className="text-accent-red text-xs">{detalle.error}</p>
        ) : detalle.rows.length === 0 && !detalle.loading ? (
          <Empty />
        ) : (
          <div className="overflow-auto max-h-[480px] border border-elevated rounded-lg">
            <table className="w-full text-xs tabular-nums">
              <thead className="sticky top-0 bg-elevated text-txt-secondary">
                <tr>
                  <th className="text-right font-semibold px-3 py-2">Monto EERR</th>
                  <th className="text-left font-semibold px-3 py-2">Tipo de gasto</th>
                  <th className="text-left font-semibold px-3 py-2">Alias</th>
                  <th className="text-left font-semibold px-3 py-2">Centro de negocio</th>
                  <th className="text-left font-semibold px-3 py-2">Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {detalle.rows.map((r, i) => (
                  <tr key={i} className="border-t border-elevated/60 hover:bg-elevated/30">
                    <td className="px-3 py-1.5 text-right" style={{ color: r.monto < 0 ? COLORS.gasto : '#f1f5f9' }}>
                      {formatCLP(r.monto)}
                    </td>
                    <td className="px-3 py-1.5 text-txt-secondary whitespace-nowrap">{r.tipoGasto || '—'}</td>
                    <td className="px-3 py-1.5 text-txt-secondary">{r.alias || '—'}</td>
                    <td className="px-3 py-1.5 text-txt-secondary">{r.centro || '—'}</td>
                    <td className="px-3 py-1.5 text-txt-secondary">{r.cuenta || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PageFrame>
  )
}

export function EerrEmpresa() {
  const { engine, filters } = usePnl()
  const t = useMemo(() => engine.totals(filters), [engine, filters])

  const real = [
    { label: 'Estado de resultado', value: t.estadoResultado },
    { label: 'Gasto administrativo', value: t.gastoAdministrativo },
    { label: 'Estado de resultado empresa', value: t.estadoResultadoEmpresa, strong: true },
  ]
  const ppto = [
    { label: 'Estado de resultado esperado', value: t.estadoResultadoEsperado },
    { label: 'Gasto administrativo presupuestado', value: t.gastoAdministrativoPst },
    { label: 'Estado de resultado empresa esperado', value: t.estadoResultadoEmpresaEsperado, strong: true },
  ]
  const scale = cascadeScale(real, ppto)

  return (
    <PageFrame title="Estados de resultado empresa" slicers={SLICERS_EMPRESA}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Presupuesto" delay={0}>
          <Cascade rows={ppto} scale={scale} accent={COLORS.ppto} />
        </Panel>
        <Panel title="Real" delay={60}>
          <Cascade rows={real} scale={scale} />
        </Panel>
      </div>
      <Panel title="Resumen" delay={120}>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {[
            ['Ventas netas', formatCLP(t.ventasNeto)],
            ['Gasto real', formatCLP(t.gastoReal)],
            ['Utilidad real', formatCLP(t.utilidadReal)],
            ['% desviación utilidad', fmtPct(t.pctDesviacionUtilidad)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-txt-secondary uppercase tracking-wider">{k}</dt>
              <dd className="text-txt-primary text-base font-semibold tabular-nums mt-1">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </PageFrame>
  )
}
