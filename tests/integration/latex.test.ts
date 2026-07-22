import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IElement } from '../../src/interface/Element'

const latexDoc = (): IElement[] => [
  { value: ZERO },
  { type: ElementType.LATEX, value: 'x^2 + y^2 = z^2' },
  { value: ZERO }
]

// pdfjs fuses the paint (stroke) op into constructPath, so count vector path
// constructions and any raster-image paints instead.
async function pageOps(
  instance: DrawPdf
): Promise<{ paths: number; images: number }> {
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const { fnArray } = await page.getOperatorList()
  const imageOps = [
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintImageMaskXObject
  ]
  return {
    paths: fnArray.filter(fn => fn === OPS.constructPath).length,
    images: fnArray.filter(fn => imageOps.includes(fn)).length
  }
}

describe('LaTeX rendering', () => {
  // The regression: setValue() awaits formatElementList, which used to await an
  // SVG→PNG conversion that hung forever in the browser shim. A hang would blow
  // the test timeout; resolving proves the formula path is now synchronous.
  it('setValue() resolves for a document containing a LaTeX formula', async () => {
    const instance = new DrawPdf({}, { main: [{ value: ZERO }] })
    await expect(instance.setValue({ main: latexDoc() })).resolves.toBeUndefined()
  })

  it('draws the formula as vector paths (no rasterized image)', async () => {
    const withLatex = await pageOps(new DrawPdf({}, { main: latexDoc() }))
    const plain = await pageOps(
      new DrawPdf({}, { main: [{ value: ZERO }, { value: 'x' }, { value: ZERO }] })
    )
    // The LaTeX page adds vector paths (its polylines) over the same baseline
    // page furniture the plain page draws — and never paints a raster image for
    // the formula.
    expect(withLatex.paths).toBeGreaterThan(plain.paths)
    expect(withLatex.images).toBe(0)
  })
})
