import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IArea } from '../../src/interface/Area'
import type { IElement } from '../../src/interface/Element'

const AREA_COLOR = '#ff0000'
const UNDERLINE_COLOR = '#0000ff'

interface IBox {
  top: number
  bottom: number
}

interface IPageOutput {
  // Stroked paths by colour, in editor pixels divided back by scale.
  strokes: Map<string, IBox[]>
  // The AREA_COLOR entry of strokes.
  areaBoxes: IBox[]
  // Baseline of each text run, same units.
  textY: Map<string, number>
}

// Path y-extent: data is flat [op, x, y, …] with op 0 = moveTo,
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

async function renderPages(
  main: IElement[],
  scale = 1
): Promise<IPageOutput[]> {
  const instance = new DrawPdf({ scale }, { main })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const pages: IPageOutput[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const pdfPerPx = page.view[2] / instance.getWidth()
    const pageTop = page.view[3]
    // PDF y grows upward from the bottom edge; editor y grows down.
    const toEditor = (y: number) => (pageTop - y) / pdfPerPx / scale
    const strokes = new Map<string, IBox[]>()
    const opList = await page.getOperatorList()
    let stroke = ''
    const stack: string[] = []
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i]
      const args = opList.argsArray[i]
      if (fn === OPS.save) {
        stack.push(stroke)
      } else if (fn === OPS.restore) {
        stroke = stack.pop() ?? stroke
      } else if (fn === OPS.setStrokeRGBColor) {
        stroke = String(args[0]).toLowerCase()
      } else if (fn === OPS.constructPath && args[0] === OPS.stroke) {
        const [low, high] = yExtent(Array.from(args[1][0] as ArrayLike<number>))
        const boxes = strokes.get(stroke) ?? []
        boxes.push({ top: toEditor(high), bottom: toEditor(low) })
        strokes.set(stroke, boxes)
      }
    }
    const textY = new Map<string, number>()
    const content = await page.getTextContent()
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        textY.set(item.str.trim(), toEditor(item.transform[5]))
      }
    }
    pages.push({ strokes, areaBoxes: strokes.get(AREA_COLOR) ?? [], textY })
  }
  return pages
}

// An area holding 'A', then a paragraph 'B' (omitted when last is true).
const areaDoc = (
  area: IArea,
  last = false,
  content: Partial<IElement> = {}
): IElement[] => [
  {
    type: ElementType.AREA,
    value: '',
    area: { borderColor: AREA_COLOR, ...area },
    valueList: [{ value: 'A', ...content }]
  },
  ...(last ? [] : [{ value: ZERO }, { value: 'B' }])
]

const height = (box: IBox) => box.bottom - box.top

// Within a pixel: Area strokes on a half-pixel grid (translate(0.5, 0.5)).
const expectNear = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1)

describe('area minHeight', () => {
  it('pads a short area up to minHeight', async () => {
    const [page] = await renderPages(areaDoc({ minHeight: 200 }))
    expect(page.areaBoxes.length).toBe(1)
    const box = page.areaBoxes[0]
    expectNear(height(box), 200)
    // The following paragraph flows after the padded box.
    expect(page.textY.get('B')!).toBeGreaterThan(box.bottom)
  })

  it('scales minHeight with the editor scale', async () => {
    const [page] = await renderPages(areaDoc({ minHeight: 200 }), 2)
    expectNear(height(page.areaBoxes[0]), 200)
  })

  it('leaves an area taller than minHeight alone', async () => {
    const [plain] = await renderPages(areaDoc({}))
    const [padded] = await renderPages(areaDoc({ minHeight: 5 }))
    expect(height(padded.areaBoxes[0])).toBeCloseTo(
      height(plain.areaBoxes[0]),
      3
    )
    expect(padded.textY.get('B')).toBeCloseTo(plain.textY.get('B')!, 3)
  })

  it('ignores minHeight on a hidden area', async () => {
    const [plain] = await renderPages(areaDoc({ hide: true }))
    const [padded] = await renderPages(areaDoc({ hide: true, minHeight: 200 }))
    expect(padded.textY.get('B')).toBeCloseTo(plain.textY.get('B')!, 3)
  })

  it('keeps the underline of the last row against its text', async () => {
    const underlined = { underline: true, color: UNDERLINE_COLOR }
    const underlineDrop = async (area: IArea) => {
      const [page] = await renderPages(areaDoc(area, false, underlined))
      const [underline] = page.strokes.get(UNDERLINE_COLOR)!
      return underline.top - page.textY.get('A')!
    }
    expect(await underlineDrop({ minHeight: 200 })).toBeCloseTo(
      await underlineDrop({}),
      3
    )
  })

  it('fills the page and carries the rest of the padding over', async () => {
    // A4 at the default margins leaves 923px of content height per page.
    const pages = await renderPages(areaDoc({ minHeight: 1200 }))
    expect(pages.length).toBe(2)
    const [first, second] = pages
    // 'A' stays on page 1; the box runs to the bottom margin.
    expect(first.textY.has('A')).toBe(true)
    expect(first.areaBoxes.length).toBe(1)
    expectNear(first.areaBoxes[0].bottom, 1123 - 100)
    // Page 2 continues the box from the top margin, then 'B' follows it.
    expect(second.areaBoxes.length).toBe(1)
    const carry = second.areaBoxes[0]
    expectNear(carry.top, 100)
    expectNear(height(first.areaBoxes[0]) + height(carry), 1200)
    expect(second.textY.get('B')!).toBeGreaterThan(carry.bottom)
  })

  it('continues an area at the end of the document on a blank page', async () => {
    const pages = await renderPages(areaDoc({ minHeight: 1200 }, true))
    expect(pages.length).toBe(2)
    const [first, second] = pages
    expectNear(first.areaBoxes[0].bottom, 1123 - 100)
    // Only page chrome (the page number) on the continuation page.
    expect([...second.textY.keys()]).toEqual(['2'])
    expect(second.areaBoxes.length).toBe(1)
    expectNear(second.areaBoxes[0].top, 100)
    expectNear(height(first.areaBoxes[0]) + height(second.areaBoxes[0]), 1200)
  })
})
