// Standalone Node script that renders a PDF to disk. Use this shape for CLI
// tools, batch jobs, queue workers, scheduled tasks — anything that doesn't
// involve an HTTP layer.
//
// To run:
//   npm install canvas-editor-pdf @napi-rs/canvas @resvg/resvg-js
//   node examples/standalone-script.mjs
//
// Reads optional `--data path/to/file.json` and `--out path/to/output.pdf`
// CLI args. Defaults to a built-in sample document.

import { writeFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DrawPdf } from 'canvas-editor-pdf/node'

// --- Parse args -------------------------------------------------------------

const args = process.argv.slice(2)
function getFlag(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const dataPath = getFlag('--data')
const outPath = getFlag('--out') || 'out.pdf'

// --- Load editor data -------------------------------------------------------

let editorData
let editorOptions

if (dataPath) {
  // Expected JSON: { "editorOptions": {...}, "editorData": {...} }
  const parsed = JSON.parse(await readFile(resolve(dataPath), 'utf8'))
  editorOptions = parsed.editorOptions ?? {}
  editorData = parsed.editorData
  if (!editorData) {
    throw new Error('--data file must contain a top-level "editorData" key')
  }
} else {
  // Sample document.
  editorOptions = { defaultFont: 'arial' }
  editorData = {
    main: [
      { value: 'Hello PDF from a standalone script!', size: 18, bold: true },
      { value: '\n' },
      {
        value:
          'You can use this shape for batch rendering: read N records from ' +
          'your DB, build an IEditorData for each, render, write to disk or ' +
          'upload to object storage.',
        size: 12
      }
    ]
  }
}

// --- Render -----------------------------------------------------------------

console.log('[render] loading default fonts (bundled)…')
const pdf = new DrawPdf(editorOptions, editorData, { loadDefaultFonts: true })
await pdf.defaultFontsLoadedPromise

console.log('[render] rendering…')
pdf.render()

console.log('[render] writing', outPath)
const buffer = Buffer.from(pdf.getPdf().output('arraybuffer'))
await writeFile(resolve(outPath), buffer)

console.log(`✓ ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`)
