import { defineConfig } from 'vite'
import * as path from 'path'
import pkg from '../package.json'

// Standalone Vite *app* build for the GitHub Pages playground — separate from
// the root vite.config.ts, which builds the library in lib mode (jspdf/
// canvas-editor externalized). Here we want everything bundled into a static
// site: the demo imports the library from ../src, so jspdf and the browser
// platform shim are pulled in and bundled normally.
//
//   npm run demo:dev    → local dev server
//   npm run demo:build  → static site into ../demo-dist (deployed to Pages)
export default defineConfig({
  root: __dirname,
  // Relative base so the built site works regardless of the Pages path
  // (e.g. https://<user>.github.io/canvas-editor-pdf/).
  base: './',
  define: {
    // DrawPdf reads __VERSION__ at runtime; the lib build injects it via
    // define, so the app build must too (see src/vite-env.d.ts for the type).
    __VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: path.resolve(__dirname, '../demo-dist'),
    emptyOutDir: true,
    sourcemap: true
  },
  server: {
    // root is demo/, but the app imports the library from ../src and the
    // fixture from ../scripts — allow the dev server to read the repo root.
    fs: { allow: [path.resolve(__dirname, '..')] }
  }
})
