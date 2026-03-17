import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// Auto-discover GPX files in public/files/ at build time
function gpxManifestPlugin() {
  const virtualId = 'virtual:gpx-files'
  const resolvedId = '\0' + virtualId

  return {
    name: 'gpx-manifest',
    resolveId(id: string) {
      if (id === virtualId) return resolvedId
    },
    load(id: string) {
      if (id === resolvedId) {
        const dir = path.resolve(__dirname, 'public/files')
        const files = fs.existsSync(dir)
          ? fs.readdirSync(dir).filter((f: string) => f.endsWith('.gpx'))
          : []
        return `export default ${JSON.stringify(files)}`
      }
    },
  }
}

export default defineConfig(async () => {
  const plugins = [react(), tailwindcss(), gpxManifestPlugin()]
  if (process.env.CF_PAGES) {
    // @ts-ignore - only available in Cloudflare Pages build environment
    const { cloudflare } = await import('@cloudflare/vite-plugin')
    plugins.push(cloudflare())
  }
  return { plugins }
})
