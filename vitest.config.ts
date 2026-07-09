import { defineConfig } from 'vitest/config'
import * as path from 'path'
import pkg from './package.json'

// Tests run against src/ under Node, so we mirror the two things the Node lib
// build does in vite.config.ts:
//   1. Alias ./platform/current → ./platform/node.ts, so DrawPdf transparently
//      uses the @napi-rs/canvas shim instead of the DOM one (there is no DOM
//      under Node/Vitest). This is the same regex alias the lib-node build uses.
//   2. Define __VERSION__, which DrawPdf.getValue() reads at runtime.
//
// The browser bundle (dist/canvas-editor-pdf.es.js) and the Node bundle
// (dist/node/index.es.js) are exercised end-to-end by the smoke scripts under
// scripts/smoke/ — those need a prior `npm run build`. These Vitest tests hit
// src/ directly so they run without a build and iterate fast.
export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version)
  },
  resolve: {
    alias: [
      {
        find: /^.+\/platform\/current(\.ts)?$/,
        replacement: path.resolve(__dirname, 'src/platform/node.ts')
      }
    ]
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts']
  }
})
