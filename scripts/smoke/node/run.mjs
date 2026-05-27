// Node smoke test for canvas-editor-pdf v0.4.0.
//
// Run from the project root after `npm run build`:
//
//     node scripts/smoke/node/run.mjs
//
// Generates ./scripts/smoke/out/out-node.pdf next to this script. If anything
// fails before writeFile, the error bubbles up and the process exits non-zero
// — that's the signal that the Node port broke.

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Import from the built dist/node entry (NOT from src/) to exercise the
// exact same artifact a consumer would see after `npm install`.
import { DrawPdf } from '../../../dist/node/index.es.js'

import { sampleEditorData, editorOptions } from '../fixtures/sample.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'out')
const outFile = resolve(outDir, 'out-node.pdf')

console.log('[smoke:node] instantiating DrawPdf with loadDefaultFonts:true (bundled)…')
const instance = new DrawPdf(editorOptions, sampleEditorData, {
  loadDefaultFonts: true
  // fontSource defaults to 'bundled' in Node — reads dist/font/ via fs
})

console.log('[smoke:node] awaiting defaultFontsLoadedPromise…')
await instance.defaultFontsLoadedPromise

console.log('[smoke:node] rendering…')
instance.render()

console.log('[smoke:node] serializing PDF…')
const arrayBuffer = instance.getPdf().output('arraybuffer')
const buffer = Buffer.from(arrayBuffer)

await mkdir(outDir, { recursive: true })
await writeFile(outFile, buffer)

console.log(`[smoke:node] ✓ wrote ${outFile} (${(buffer.length / 1024).toFixed(1)} KB)`)
