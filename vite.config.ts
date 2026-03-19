import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import type { ViteDevServer } from 'vite'

// Supported track file extensions (case-insensitive)
const TRACK_EXTS = ['.gpx', '.kml', '.tcx']
function isTrackFile(name: string): boolean {
  return TRACK_EXTS.includes(path.extname(name).toLowerCase())
}

// Auto-discover track files in public/files/, with HMR on file changes
function gpxManifestPlugin() {
  const virtualId = 'virtual:gpx-files'
  const resolvedId = '\0' + virtualId
  const filesDir = path.resolve(__dirname, 'public/files')

  function getGpxFiles(): string[] {
    return fs.existsSync(filesDir)
      ? fs.readdirSync(filesDir).filter(isTrackFile).sort().reverse()
      : []
  }

  return {
    name: 'gpx-manifest',
    resolveId(id: string) {
      if (id === virtualId) return resolvedId
    },
    load(id: string) {
      if (id === resolvedId) {
        return `export default ${JSON.stringify(getGpxFiles())}`
      }
    },
    configureServer(server: ViteDevServer) {
      // Watch public/files/ for added/removed GPX files and hot-reload the virtual module
      fs.mkdirSync(filesDir, { recursive: true })
      fs.watch(filesDir, () => {
        const mod = server.moduleGraph.getModuleById(resolvedId)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
          server.ws.send({ type: 'full-reload' })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), gpxManifestPlugin()],
})
