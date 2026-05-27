// Example Next.js API route — App Router (Next 13.4+).
//
// Drop this file at: app/api/generate-pdf/route.ts
//
// Requires the next.config.js tweak from ./nextjs-config-snippet.js
// (otherwise webpack will try to bundle @napi-rs/canvas and crash).
//
// TypeScript: make sure tsconfig.json has `"moduleResolution": "bundler"`
// (or "node16"/"nodenext") — the older "node" can't see the `/node`
// subpath export in canvas-editor-pdf's package.json.

import { NextRequest, NextResponse } from 'next/server'
import { DrawPdf } from 'canvas-editor-pdf/node'

// Force Node runtime — Edge runtime has no native binaries, so @napi-rs/canvas
// and @resvg/resvg-js can't load there. Without this line Next 13+ might
// route this handler to Edge.
export const runtime = 'nodejs'

// Disable static optimization; this route is always dynamic.
export const dynamic = 'force-dynamic'

const ALLOWED_ORIGIN = '*' // or pin to your frontend, e.g. 'https://app.example.com'

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    // If you flip ALLOWED_ORIGIN to a specific origin, you can also add:
    // 'Access-Control-Allow-Credentials': 'true'
  }
}

export async function OPTIONS() {
  // Preflight — return 204 with the CORS headers.
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: NextRequest) {
  try {
    const { editorOptions, editorData } = (await req.json()) as {
      editorOptions?: unknown
      editorData?: unknown
    }
    if (!editorOptions || !editorData) {
      return NextResponse.json(
        { error: 'Missing editorOptions or editorData in request body' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const pdf = new DrawPdf(editorOptions as any, editorData as any, {
      loadDefaultFonts: true
      // fontSource defaults to 'bundled' in Node — reads dist/font/ from the
      // installed canvas-editor-pdf package. No network access required.
    })
    await pdf.defaultFontsLoadedPromise
    pdf.render()

    const buffer = Buffer.from(pdf.getPdf().output('arraybuffer'))
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="out.pdf"'
      }
    })
  } catch (err) {
    console.error('[generate-pdf] render failed', err)
    return NextResponse.json(
      { error: (err as Error).message || 'unknown error' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
