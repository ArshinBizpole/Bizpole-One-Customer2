import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import nodePath from 'node:path'

// Static pages/scripts in public/ are copied as-is, so they can't read
// import.meta.env. They carry this token instead; it is replaced with
// VITE_API_BASE_URL from the .env (dev server) or the build environment
// (vite build). There is no hardcoded fallback host — if VITE_API_BASE_URL is
// missing the pages log an error and their API calls fail (same as the React app).
const API_TOKEN = '__VITE_API_BASE_URL__'
const API_FILES = /\.(html|js)$/

function apiBaseFrom(env) {
  const v = String(env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
  return /^https?:\/\/[^\s"'<>\\]+$/.test(v) ? v : ''
}

function staticApiBase(apiBase) {
  const inject = (text) => (apiBase ? text.split(API_TOKEN).join(apiBase) : text)
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }
  let publicDir = ''
  let outDir = ''
  return {
    name: 'static-api-base',
    configResolved(c) { publicDir = nodePath.resolve(c.publicDir); outDir = nodePath.resolve(c.root, c.build.outDir) },
    // Dev: serve public/ html/js with the token replaced (runs after the
    // clean-URL rewrite in staticLandingPages).
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = decodeURIComponent((req.url || '').split('?')[0])
        if (!apiBase || !API_FILES.test(p) || p.includes('..')) return next()
        const file = nodePath.resolve(publicDir, '.' + p)
        if (!file.startsWith(publicDir + nodePath.sep) || !fs.existsSync(file)) return next()
        const text = fs.readFileSync(file, 'utf8')
        if (!text.includes(API_TOKEN)) return next()
        res.setHeader('Content-Type', types[nodePath.extname(file)])
        res.setHeader('Cache-Control', 'no-cache')
        res.end(inject(text))
      })
    },
    // Build: replace the token in the copied public files under dist/.
    closeBundle() {
      if (!apiBase || !fs.existsSync(outDir)) return
      const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const f = nodePath.join(dir, e.name)
          if (e.isDirectory()) { if (e.name !== 'assets') walk(f) }
          else if (API_FILES.test(e.name)) {
            const text = fs.readFileSync(f, 'utf8')
            if (text.includes(API_TOKEN)) fs.writeFileSync(f, inject(text))
          }
        }
      }
      walk(outDir)
    },
  }
}

// Static landing pages in public/<slug>/index.html, served at clean URLs (/<slug>).
// Production does the same via vercel.json / staticwebapp.config.json.
const STATIC_PAGES = [
  '/trademark-registration',
  '/trademark-registration/apply',
  '/private-limited-company-registration',
  '/private-limited-company-registration/apply',
  '/gst-registration',
  '/gst-registration/apply',
  '/trademark-search/meta', // Meta (FB/IG) ads copy — separate file, edited independently
  '/trademark-classes',
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

export default defineConfig(({ mode }) => ({
  plugins: [
    staticLandingPages(),
    staticApiBase(apiBaseFrom({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env })),
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: [
      '1466334ce371.ngrok-free.app',
      'bizpole-one.vercel.app'
    ],
  },
}))
