import { useState, useMemo } from 'react'
import { useSheetData } from './hooks/useSheetData'
import { formatCLP } from './utils/formatters'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import KPICard from './components/KPICard'
import ChartEvolucion from './components/ChartEvolucion'
import ChartAreaBreakdown from './components/ChartAreaBreakdown'
import ChartEvolucionAreas from './components/ChartEvolucionAreas'
import ChartTopCentros from './components/ChartTopCentros'
import ChartDonutAreas from './components/ChartDonutAreas'
import ChartBarMensual from './components/ChartBarMensual'
import DataTable from './components/DataTable'
import Loader from './components/Loader'

export default function App() {
  const { data, loading, error, lastUpdated, retry } = useSheetData()
  const [filters, setFilters] = useState({ years: [], months: [], areas: [], centro: '' })

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (filters.years.length && !filters.years.includes(r.year)) return false
      if (filters.months.length && !filters.months.includes(r.month)) return false
      if (filters.areas.length && !filters.areas.includes(r.area_nombre)) return false
      if (filters.centro && r.bussinessCenterId !== filters.centro) return false
      return true
    })
  }, [data, filters])

  const kpis = useMemo(() => {
    const ingresos = filtered.reduce((s, r) => s + r.ingresos, 0)
    const gastos = filtered.reduce((s, r) => s + r.gastos, 0)
    const resultado = filtered.reduce((s, r) => s + r.resultado, 0)
    const centros = new Set(filtered.map((r) => r.bussinessCenterId)).size
    return { ingresos, gastos, resultado, centros }
  }, [filtered])

  if (loading && !data.length) return <Loader />

  if (error && !data.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base gap-4">
        <p className="text-accent-red text-sm font-medium">Error al cargar datos: {error}</p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Header lastUpdated={lastUpdated} />
      <FilterBar data={data} filters={filters} setFilters={setFilters} />

      <main className="flex-1 px-6 py-6 space-y-6 max-w-screen-2xl mx-auto w-full">
        {/* KPIs */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-slide-up"
          style={{ animationDelay: '200ms' }}
        >
          <KPICard
            title="Ingresos Totales"
            value={kpis.ingresos}
            format={formatCLP}
            color="blue"
            delay={200}
          />
          <KPICard
            title="Gastos Totales"
            value={kpis.gastos}
            format={formatCLP}
            color="red"
            delay={280}
          />
          <KPICard
            title="Resultado Neto"
            value={kpis.resultado}
            format={formatCLP}
            color="green"
            delay={360}
          />
          <KPICard
            title="Centros Activos"
            value={kpis.centros}
            format={(n) => Math.round(n).toLocaleString('es-CL')}
            color="white"
            delay={440}
          />
        </div>

        {/* Evolución Mensual — gráfico principal full-width */}
        <div
          className="bg-surface border border-elevated rounded-xl p-4 animate-fade-slide-up"
          style={{ animationDelay: '480ms' }}
        >
          <h2 className="text-txt-primary text-sm font-semibold mb-4">Evolución Mensual</h2>
          <ChartEvolucion data={filtered} />
        </div>

        {/* 3 donuts por área */}
        <div
          className="bg-surface border border-elevated rounded-xl p-4 animate-fade-slide-up"
          style={{ animationDelay: '500ms' }}
        >
          <h2 className="text-txt-primary text-sm font-semibold mb-1">Distribución por Área</h2>
          <p className="text-txt-secondary text-xs mb-4">Cada segmento representa un área · hover para ver detalle</p>
          <ChartDonutAreas data={filtered} />
        </div>

        {/* Barras mensuales + Breakdown */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-slide-up"
          style={{ animationDelay: '540ms' }}
        >
          <div className="lg:col-span-2 bg-surface border border-elevated rounded-xl p-4">
            <h2 className="text-txt-primary text-sm font-semibold mb-1">Ingresos · Gastos · Resultado por Mes</h2>
            <p className="text-txt-secondary text-xs mb-4">Resultado en verde = positivo · rojo = negativo</p>
            <ChartBarMensual data={filtered} />
          </div>
          <div className="bg-surface border border-elevated rounded-xl p-4">
            <h2 className="text-txt-primary text-sm font-semibold mb-4">Breakdown por Área</h2>
            <ChartAreaBreakdown data={filtered} />
          </div>
        </div>

        {/* Evolución por área — visible cuando hay áreas seleccionadas */}
        {filters.areas.length >= 1 && (
          <div
            className="bg-surface border border-elevated rounded-xl p-4 animate-fade-slide-up"
            style={{ animationDelay: '550ms' }}
          >
            <h2 className="text-txt-primary text-sm font-semibold mb-1">
              Resultado por Área — Evolución mensual
            </h2>
            <p className="text-txt-secondary text-xs mb-4">
              {filters.areas.join(' · ')}
            </p>
            <ChartEvolucionAreas data={filtered} areas={filters.areas} />
          </div>
        )}

        {/* Top centros */}
        <div
          className="bg-surface border border-elevated rounded-xl p-4 animate-fade-slide-up"
          style={{ animationDelay: '600ms' }}
        >
          <h2 className="text-txt-primary text-sm font-semibold mb-1">
            Top 10 Centros de Costo por Resultado
          </h2>
          <p className="text-txt-secondary text-xs mb-4">
            Verde = resultado positivo · Rojo = resultado negativo
          </p>
          <ChartTopCentros data={filtered} />
        </div>

        {/* Table */}
        <div
          className="animate-fade-slide-up"
          style={{ animationDelay: '700ms' }}
        >
          <h2 className="text-txt-primary text-sm font-semibold mb-4">
            Detalle de Registros
          </h2>
          <DataTable data={filtered} />
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-elevated text-center">
        <p className="text-txt-secondary text-xs">
          NEB Chile · Datos actualizados desde Defontana vía ETL ·{' '}
          {loading && <span className="text-accent-amber">Actualizando...</span>}
          {error && !loading && (
            <span className="text-accent-red">
              Error al actualizar ·{' '}
              <button onClick={retry} className="underline hover:text-txt-primary">
                Reintentar
              </button>
            </span>
          )}
        </p>
      </footer>
    </div>
  )
}
