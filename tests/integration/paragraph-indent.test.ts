import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import { RowFlex } from '../../src/dataset/enum/Row'
import type { IElement } from '../../src/interface/Element'

// Default left margin, in editor pixels.
const MARGIN_LEFT = 120
const LONG = 'word '.repeat(60)

// Where each line of the page starts, top to bottom, in editor pixels.
async function lineStarts(main: IElement[]): Promise<number[]> {
  const instance = new DrawPdf({ pageNumber: { disabled: true } }, { main })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const pdfPerPx = page.view[2] / instance.getWidth()
  const content = await page.getTextContent()
  const lines = new Map<number, number>()
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const y = Math.round(item.transform[5])
    const x = item.transform[4] / pdfPerPx
    lines.set(y, Math.min(lines.get(y) ?? Infinity, x))
  }
  return [...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, x]) => x)
}

const paragraph = (style: Partial<IElement>): IElement[] => [
  { value: ZERO, ...style },
  { value: LONG, ...style }
]

// canvas-editor 948e6ac5 (#725 #1190)
describe('paragraph indent', () => {
  it('moves every line of the paragraph by indentLeft', async () => {
    const starts = await lineStarts(paragraph({ indentLeft: 40 }))
    expect(starts.length).toBeGreaterThan(1)
    for (const x of starts) expect(x).toBeCloseTo(MARGIN_LEFT + 40, 0)
  })

  it('moves only the first line by indentFirstLine', async () => {
    const [first, ...rest] = await lineStarts(
      paragraph({ indentFirstLine: 30 })
    )
    expect(first).toBeCloseTo(MARGIN_LEFT + 30, 0)
    for (const x of rest) expect(x).toBeCloseTo(MARGIN_LEFT, 0)
  })

  it('hangs the rest of the paragraph with a negative indentFirstLine', async () => {
    const [first, ...rest] = await lineStarts(
      paragraph({ indentLeft: 40, indentFirstLine: -40 })
    )
    expect(first).toBeCloseTo(MARGIN_LEFT, 0)
    for (const x of rest) expect(x).toBeCloseTo(MARGIN_LEFT + 40, 0)
  })

  it('wraps earlier with indentRight', async () => {
    const plain = await lineStarts(paragraph({}))
    const narrowed = await lineStarts(paragraph({ indentRight: 200 }))
    expect(narrowed.length).toBeGreaterThan(plain.length)
    for (const x of narrowed) expect(x).toBeCloseTo(MARGIN_LEFT, 0)
  })

  // canvas-editor 4be9e292 (#1459)
  it('aligns a centred or right-aligned line within indentRight', async () => {
    const line = (rowFlex: RowFlex, indentRight?: number) =>
      lineStarts([
        { value: ZERO, rowFlex, indentRight },
        { value: 'Hello', rowFlex, indentRight }
      ])
    const [centred] = await line(RowFlex.CENTER)
    const [centredIndented] = await line(RowFlex.CENTER, 200)
    expect(centred - centredIndented).toBeCloseTo(100, 0)
    const [right] = await line(RowFlex.RIGHT)
    const [rightIndented] = await line(RowFlex.RIGHT, 200)
    expect(right - rightIndented).toBeCloseTo(200, 0)
  })

  it('hangs wrapped lines under the text after leading tabs', async () => {
    const [first, ...rest] = await lineStarts([
      { value: ZERO },
      { type: ElementType.TAB, value: '' },
      { value: LONG }
    ])
    // the first line's text sits after the tab; wrapped lines line up with it
    expect(rest.length).toBeGreaterThan(0)
    for (const x of rest) expect(x).toBeCloseTo(first, 0)
    expect(first).toBeGreaterThan(MARGIN_LEFT + 10)
  })
})
