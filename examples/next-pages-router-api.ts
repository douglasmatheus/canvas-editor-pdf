// Example Next.js API route — Pages Router.
//
// Drop this file at: pages/api/generate-pdf/index.ts
// (or pages/api/generate-pdf.ts — both work, the URL becomes
//  /api/generate-pdf or /api/generate-pdf/ depending on your
//  next.config.js#trailingSlash setting.)
//
// Requires the next.config.js tweak from ./nextjs-config-snippet.js
// (otherwise webpack will try to bundle @napi-rs/canvas and crash).
//
// TypeScript: make sure tsconfig.json has `"moduleResolution": "bundler"`
// (or "node16"/"nodenext") — the older "node" can't see the `/node`
// subpath export in canvas-editor-pdf's package.json.

import type { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import { DrawPdf } from 'canvas-editor-pdf/node'

// CORS: with `credentials: true`, browsers reject a wildcard `*` origin per
// spec. Either drop credentials (and keep '*' open to anyone), or echo the
// request origin and keep credentials. The first form is shown — adjust if
// you serve only a known frontend.
const cors = Cors({
  methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
})

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: unknown) => {
      if (result instanceof Error) return reject(result)
      resolve(result)
    })
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { editorOptions, editorData } = (req.body || {}) as {
      editorOptions?: unknown
      editorData?: unknown
    }
    if (!editorOptions || !editorData) {
      return res
        .status(400)
        .json({ error: 'Missing editorOptions or editorData in request body' })
    }

    const pdf = new DrawPdf(editorOptions as any, editorData as any, {
      loadDefaultFonts: true
      // fontSource defaults to 'bundled' in Node — reads dist/font/ from the
      // installed canvas-editor-pdf package. No network access required.
    })
    await pdf.defaultFontsLoadedPromise
    pdf.render()

    const buffer = Buffer.from(pdf.getPdf().output('arraybuffer'))
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="out.pdf"')
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('[generate-pdf] render failed', err)
    return res
      .status(500)
      .json({ error: (err as Error).message || 'unknown error' })
  }
}

// Bump the JSON body size limit for large editor payloads. Default is 1MB,
// which is small for documents with embedded images. Adjust to taste.
export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
}
