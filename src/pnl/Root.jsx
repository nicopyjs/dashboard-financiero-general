import { lazy, Suspense, useEffect, useState } from 'react'
import { PnlProvider, usePnl } from './PnlProvider'
import { NavBar, ROUTES } from './layout'
import { Ingresos, IngresosDetalle } from './IngresosPages'
import { Egresos, EgresosDetalle } from './EgresosPages'
import { EerrArea, EerrEmpresa } from './EerrPages'
import Loader from '../components/Loader'

// El dashboard original (resumen por centro, lee un CSV publicado) se mantiene aparte.
const Resumen = lazy(() => import('../App.jsx'))

const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('?')[0]

function useRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

function Inicio() {
  return (
    <div className="px-6 py-10 max-w-screen-lg mx-auto w-full">
      <h1 className="text-txt-primary text-2xl font-bold tracking-tight">Menú inicio</h1>
      <p className="text-txt-secondary text-sm mt-1">Selecciona un reporte</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {ROUTES.filter((r) => r.path && r.path !== 'resumen').map((r, i) => (
          <a
            key={r.path}
            href={`#/${r.path}`}
            className="group bg-surface border border-elevated rounded-xl p-5 hover:border-accent-blue/50 transition-colors animate-fade-slide-up glow-blue"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <p className="text-txt-primary font-semibold">{r.label}</p>
            <p className="text-accent-blue text-xs mt-3 group-hover:underline">Abrir →</p>
          </a>
        ))}
      </div>
    </div>
  )
}

const PAGES = {
  '': Inicio,
  ingresos: Ingresos,
  'ingresos-detalle': IngresosDetalle,
  egresos: Egresos,
  'egresos-detalle': EgresosDetalle,
  'eerr-area': EerrArea,
  'eerr-empresa': EerrEmpresa,
}

function Shell() {
  const route = useRoute()
  const { status, error, reload } = usePnl()

  // El resumen por centro trae su propio encabezado y su propia fuente de datos.
  if (route === 'resumen') {
    return (
      <Suspense fallback={<Loader />}>
        <a href="#/" className="block bg-surface text-xs text-accent-blue px-6 py-2 border-b border-elevated hover:underline">
          ← Volver al menú
        </a>
        <Resumen />
      </Suspense>
    )
  }

  if (status === 'loading') return <Loader />

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base gap-4 px-6 text-center">
        <p className="text-accent-red text-sm font-medium">No se pudieron cargar los datos</p>
        <p className="text-txt-secondary text-xs max-w-xl break-words">{error}</p>
        <button
          onClick={reload}
          className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const Page = PAGES[route] ?? Inicio
  return (
    <div className="min-h-screen bg-base flex flex-col">
      <NavBar route={PAGES[route] ? route : ''} />
      <main className="flex-1">
        <Page />
      </main>
      <footer className="px-6 py-4 border-t border-elevated text-center">
        <p className="text-txt-secondary text-xs">
          NEB Chile · Defontana (asientos contables) vía Google Sheets · Presupuesto 2025
        </p>
      </footer>
    </div>
  )
}

export default function Root() {
  return (
    <PnlProvider>
      <Shell />
    </PnlProvider>
  )
}
