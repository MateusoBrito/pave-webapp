import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Caminhos servidos pela API (api/app/routers/*.py) — sem prefixo comum, então listamos
// os segmentos de topo. Repassados aqui para que o front, acessado via ngrok, não precise
// de um segundo túnel nem sofra CORS: a requisição sai como mesma origem e o Vite
// encaminha para a API localmente.
const API_PATHS = [
  'entities',
  'topics',
  'collection',
  'registry',
  'series',
  'overview',
  'comparison',
  'candidates',
  'networks',
  'documents',
  'fotos',
  'health',
  'ready',
]

export default defineConfig({
  base: '/pave/',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['customs-hardwood-concur.ngrok-free.dev', 'labpi.ufsj.edu.br'],
    proxy: {
      ...Object.fromEntries(
        API_PATHS.map((path) => [`/${path}`, { target: 'http://localhost:19031' }]),
      ),
      '/pave-api': {
        target: 'http://localhost:19031',
        rewrite: (path) => path.replace(/^\/pave-api/, ''),
      },
    },
  },
})
