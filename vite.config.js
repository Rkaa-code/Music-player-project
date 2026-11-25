import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'node:fs'
import path from 'node:path'

function kuromojiDict() {
  const handler = (req, res, next) => {
    const name = path.basename((req.url || '').split('?')[0])
    const file = path.join(process.cwd(), 'public', 'dict', name)
    if (!name.endsWith('.dat.gz') || !fs.existsSync(file)) return next()
    res.setHeader('Content-Type', 'application/octet-stream')
    res.end(fs.readFileSync(file))
  }

  return {
    name: 'kuromoji-dict',
    configureServer(server) {
      server.middlewares.use('/dict', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/dict', handler)
    },
  }
}


export default defineConfig({
  plugins: [kuromojiDict(),
            vue()],
});
