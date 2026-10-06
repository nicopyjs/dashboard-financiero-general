import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo sirve las funciones de /api igual que Vercel (req/res estilo
// Node con res.status().json()), así no hace falta el CLI de Vercel.
function apiDev(mode) {
  return {
    name: 'neb-api-dev',
    apply: 'serve',
    configureServer(server) {
      // .env.local sin prefijo VITE_: credenciales solo para el servidor.
      const env = loadEnv(mode, process.cwd(), '')
      for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '')
        if (!name || name.includes('/') || name.startsWith('_')) return next()

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          req.query = Object.fromEntries(url.searchParams)
          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(body))
          }
          await mod.default(req, res)
        } catch (err) {
          console.error('[api-dev]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), apiDev(mode)],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          csv: ['papaparse'],
        },
      },
    },
  },
}))
