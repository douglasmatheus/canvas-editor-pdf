// Example Express server exposing canvas-editor-pdf as a POST endpoint.
//
// To run:
//   npm install express cors canvas-editor-pdf @napi-rs/canvas @resvg/resvg-js
//   node examples/express-server.mjs
//
// Then POST to http://localhost:3000/generate-pdf with a JSON body:
//   { "editorOptions": {...}, "editorData": {...} }
//
// Returns the PDF binary. The fields mirror canvas-editor's command.getValue()
// shape — see the canvas-editor docs for the IEditorData type.

import express from 'express'
import cors from 'cors'
import { DrawPdf } from 'canvas-editor-pdf/node'

const app = express()

// Bump from the default 100KB; editor payloads with images are often a few MB.
app.use(express.json({ limit: '10mb' }))

// CORS: open API. If you're behind authentication, pin `origin` to your
// frontend domain and add `credentials: true` instead of '*'.
app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.post('/generate-pdf', async (req, res) => {
  const { editorOptions, editorData } = req.body || {}
  if (!editorOptions || !editorData) {
    return res
      .status(400)
      .json({ error: 'Missing editorOptions or editorData in request body' })
  }

  try {
    const pdf = new DrawPdf(editorOptions, editorData, {
      loadDefaultFonts: true
      // fontSource defaults to 'bundled' in Node (reads dist/font/ from the
      // installed package). Override with 'cdn' or { dir: '/path' } if needed.
    })

    // Wait for fonts before rendering. Skipping this means the first render
    // happens with the jsPDF built-in fonts only, which produces a noticeably
    // different layout.
    await pdf.defaultFontsLoadedPromise

    pdf.render()
    const buffer = Buffer.from(pdf.getPdf().output('arraybuffer'))

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="out.pdf"')
    res.status(200).send(buffer)
  } catch (err) {
    console.error('[generate-pdf] render failed', err)
    res.status(500).json({ error: err.message || 'unknown error' })
  }
})

// Optional: a simple health check.
app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`canvas-editor-pdf API listening on http://localhost:${PORT}`)
  console.log(`  POST /generate-pdf  body: { editorOptions, editorData }`)
})
