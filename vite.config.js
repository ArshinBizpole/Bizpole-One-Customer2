import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Static landing pages in public/<slug>/index.html, served at clean URLs (/<slug>).
// Production does the same via vercel.json / staticwebapp.config.json.
const STATIC_PAGES = [
  '/trademark-registration',
  '/trademark-registration/apply',
  '/private-limited-company-registration',
  '/private-limited-company-registration/apply',
  '/gst-registration',
  '/gst-registration/apply',
  '/trademark-search',
]

function staticLandingPages() {
  const middleware = (req, res, next) => {
    const path = (req.url || '').split('?')[0]
    const query = (req.url || '').slice(path.length)
    const hit = STATIC_PAGES.find((p) => path === `${p}/` || path === `${p}/index.html`)
    if (hit) {
      res.statusCode = 301
      res.setHeader('Location', hit + query)
      return res.end()
    }
    if (STATIC_PAGES.includes(path)) req.url = `${path}/index.html${query}`
    next()
  }
  return {
    name: 'static-landing-pages',
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
  }
}

export default defineConfig({
  plugins: [staticLandingPages(), react(), tailwindcss()],
  server: {
    allowedHosts: [
      '1466334ce371.ngrok-free.app',
      'bizpole-one.vercel.app'
    ],
  },
})
