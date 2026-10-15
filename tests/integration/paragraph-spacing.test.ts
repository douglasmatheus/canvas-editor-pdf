import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import type { IElement } from '../../src/interface/Element'

// Vertical distance from paragraph 'A' to paragraph 'B', in editor pixels
// divided back by scale, so the result is directly comparable across scales.
async function unscaledGap(
  first: Partial<IElement>,
  second: Partial<IElement>,
  scale = 1
): Promise<number> {
  const instance = new DrawPdf(
    { scale },
    {
      main: [
        { value: ZERO },
        { value: 'A', ...first },
        { value: ZERO },
        { value: 'B', ...second }
      ]
    }
  )
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const pdfPerPx = page.view[2] / instance.getWidth()
  const content = await page.getTextContent()
  const y = (str: string) => {
    const item = content.items.find(item => 'str' in item && item.str === str)
    if (!item || !('transform' in item)) throw new Error(`no '${str}' on page`)
    return item.transform[5]
  }
  // PDF y grows upward, so the earlier paragraph has the larger y.
  return (y('A') - y('B')) / pdfPerPx / scale
}

const UNDERLINE_COLOR = '#0000ff'
const HIGHLIGHT_COLOR = '#ffff00'

// Path y-extent per op: data is flat [op, x, y, …] with op 0 = moveTo,
// 1 = lineTo (closePath carries no coordinates).
function yExtent(coords: number[]): [number, number] {
  const ys: number[] = []
  for (let i = 0; i < coords.length; ) {
    const op = coords[i]
    if (op === 0 || op === 1) {
      ys.push(coords[i + 2])
      i += 3
    } else {
      i += 1
    }
  }
  return [Math.min(...ys), Math.max(...ys)]
}

// A one-row paragraph, underlined and highlighted, followed by another one.
// Returns how far the underline sits below the text baseline and how tall
// the highlight is, both in PDF units.
async function lastRowDecorations(spacingAfter: number) {
  const instance = new DrawPdf(
    {},
    {
      main: [
        { value: ZERO },
        {
          value: 'Ab',
          underline: true,
          color: UNDERLINE_COLOR,
          highlight: HIGHLIGHT_COLOR,
          spacingAfter
        },
        { value: ZERO },
        { value: 'C' }
      ]
    }
  )
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const content = await page.getTextContent()
  const text = content.items.find(item => 'str' in item && item.str === 'Ab')
  if (!text || !('transform' in text)) throw new Error("no 'Ab' on page")
  const opList = await page.getOperatorList()
  let stroke = ''
  let fill = ''
  let underlineY: number | undefined
  let highlightHeight: number | undefined
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]
    if (fn === OPS.setStrokeRGBColor) stroke = String(args[0]).toLowerCase()
    else if (fn === OPS.setFillRGBColor) fill = String(args[0]).toLowerCase()
    else if (fn === OPS.constructPath) {
      const [min, max] = yExtent(Array.from(args[1][0] as ArrayLike<number>))
      if (stroke === UNDERLINE_COLOR && min === max) underlineY ??= min
      if (fill === HIGHLIGHT_COLOR && max > min) highlightHeight ??= max - min
    }
  }
  if (underlineY === undefined) throw new Error('no underline drawn')
  if (highlightHeight === undefined) throw new Error('no highlight drawn')
  return {
    // PDF y grows upward: the underline is below, so the baseline is larger.
    underlineBelowText: text.transform[5] - underlineY,
    highlightHeight
  }
}

describe('paragraph spacing', () => {
  it('spacingAfter pushes the next paragraph down', async () => {
    const base = await unscaledGap({}, {})
    expect(await unscaledGap({ spacingAfter: 20 }, {})).toBeCloseTo(
      base + 20,
      1
    )
  })

  it('spacingBefore pushes its own paragraph down', async () => {
    const base = await unscaledGap({}, {})
    expect(await unscaledGap({}, { spacingBefore: 20 })).toBeCloseTo(
      base + 20,
      1
    )
  })

  it('adds both when the two paragraphs meet', async () => {
    const base = await unscaledGap({}, {})
    expect(
      await unscaledGap({ spacingAfter: 10 }, { spacingBefore: 15 })
    ).toBeCloseTo(base + 25, 1)
  })

  // canvas-editor 1d7cd1a7: spacingAfter is folded into the row height, so
  // decorations measured from the row height must use the content height.
  it('keeps the underline under the text on the last row', async () => {
    const without = await lastRowDecorations(0)
    const withSpacing = await lastRowDecorations(40)
    expect(withSpacing.underlineBelowText).toBeCloseTo(
      without.underlineBelowText,
      3
    )
  })

  it('keeps the highlight to the text height on the last row', async () => {
    const without = await lastRowDecorations(0)
    const withSpacing = await lastRowDecorations(40)
    expect(withSpacing.highlightHeight).toBeGreaterThan(0)
    expect(withSpacing.highlightHeight).toBeCloseTo(without.highlightHeight, 3)
  })

  it('scales with the document', async () => {
    const atOne = await unscaledGap({ spacingAfter: 20 }, { spacingBefore: 5 })
    expect(
      await unscaledGap({ spacingAfter: 20 }, { spacingBefore: 5 }, 2)
    ).toBeCloseTo(atOne, 1)
  })
})
