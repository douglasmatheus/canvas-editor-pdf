import { describe, it, expect, beforeAll } from 'vitest'
// Legacy build runs in Node without a browser DOM / real Worker.
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
// @ts-expect-error — plain JS fixture, no types
import { sampleEditorData, editorOptions } from '../../scripts/smoke/fixtures/sample.js'

// Renders the shared sample fixture and asserts on the produced PDF via pdfjs
// (extracted text per page, page count, embedded image). Deterministic — this
// is the layer that catches layout/pagination regressions (the multi-column,
// per-page header/footer and table work all flow through render()).

function buildData() {
  // Drop the raw LaTeX element: this lib converts an existing SVG string to
  // PNG, but turning `\frac{1}{2}` into SVG is KaTeX's job (upstream canvas-
  // editor), so the fixture's latex element has no `laTexSVG` and would crash
  // drawImage here. LaTeX SVG→PNG is covered in the platform tests.
  return {
    ...sampleEditorData,
    main: sampleEditorData.main.filter(
      (el: { type?: string }) => el.type !== 'latex'
    )
  }
}

function renderToPdfBytes(): Uint8Array {
  // No loadDefaultFonts: the bundled TTFs live in dist/font/ (build output),
  // and text still renders + extracts with jsPDF's standard fonts. Glyph
  // measurement uses @napi-rs/canvas via the node platform shim, so layout is
  // computed regardless.
  const instance = new DrawPdf(editorOptions, buildData())
  instance.render()
  const arrayBuffer = instance.getPdf().output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

interface Parsed {
  numPages: number
  pageText: string[]
  imageOpCount: number
}

async function parsePdf(bytes: Uint8Array): Promise<Parsed> {
  // pdfjs detaches the ArrayBuffer it is handed, so give it a copy and keep
  // `bytes` intact for the caller.
  const doc = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 })
    .promise
  const pageText: string[] = []
  let imageOpCount = 0
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    pageText.push(
      content.items.map(item => ('str' in item ? item.str : '')).join('')
    )
    const ops = await page.getOperatorList()
    imageOpCount += ops.fnArray.filter(
      (fn: number) =>
        fn === OPS.paintImageXObject ||
        fn === OPS.paintInlineImageXObject ||
        fn === OPS.paintImageMaskXObject
    ).length
  }
  return { numPages: doc.numPages, pageText, imageOpCount }
}

describe('PDF output — sample fixture', () => {
  let bytes: Uint8Array
  let parsed: Parsed
  // Whitespace-stripped concatenation of all pages. pdfjs emits glyphs with
  // positioning that can insert stray spaces (e.g. table cell "A1" → "A 1"),
  // so text-presence assertions compare against the squished form.
  let squished: string

  beforeAll(async () => {
    bytes = renderToPdfBytes()
    parsed = await parsePdf(bytes)
    squished = parsed.pageText.join('').replace(/\s+/g, '')
  })

  it('produces a non-empty PDF', () => {
    expect(bytes.byteLength).toBeGreaterThan(0)
    // "%PDF" magic header
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46])
  })

  it('paginates the content across at least 2 pages', () => {
    // The fixture ends with `'X '.repeat(2000)` filler specifically to spill
    // onto a second page — guards the paging pipeline.
    expect(parsed.numPages).toBeGreaterThanOrEqual(2)
  })

  it('renders the main body text', () => {
    expect(squished).toContain('PlainArialregular.')
    expect(squished).toContain('Bold')
    expect(squished).toContain('anditalic.')
  })

  it('renders every table cell', () => {
    for (const cell of ['A1', 'B1', 'C1', 'A2', 'B2', 'C2']) {
      expect(squished).toContain(cell)
    }
  })

  it('renders the header and footer', () => {
    expect(squished).toContain('Smoketestheader')
    expect(squished).toContain('Footer')
  })

  it('repeats the header/footer on every page', () => {
    for (const text of parsed.pageText) {
      const perPage = text.replace(/\s+/g, '')
      expect(perPage).toContain('Smoketestheader')
      expect(perPage).toContain('Footer')
    }
  })

  it('embeds the inline image as a PDF image operator', () => {
    // The fixture has one inline PNG. Raw-byte scanning fails because the
    // content stream is Flate-compressed (compress: true), so detect it via
    // pdfjs' decoded operator list instead.
    expect(parsed.imageOpCount).toBeGreaterThanOrEqual(1)
  })
})
