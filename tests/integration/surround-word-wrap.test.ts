import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ImageDisplay } from '../../src/dataset/enum/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IElement } from '../../src/interface/Element'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
const WORD = 'Multiplanar'
const IMAGE_X = 50
const IMAGE_WIDTH = 20

interface IShownText {
  str: string
  x: number
  y: number
}

// Every text-showing operator on page 1 with the position it was drawn at
// (editor pixels). pdf.js's getTextContent merges neighbouring runs, so this
// reads the operator list instead: jsPDF emits a Td before each run.
async function shownText(width: number): Promise<IShownText[]> {
  const main: IElement[] = [
    // 'ab ' is 24px wide, so the word starts left of the image and, 88px
    // wide, runs into it.
    { value: `ab ${WORD} after` },
    {
      type: ElementType.IMAGE,
      value: PNG,
      width: IMAGE_WIDTH,
      height: 5,
      imgDisplay: ImageDisplay.SURROUND,
      imgFloatPosition: { x: IMAGE_X, y: 0, pageNo: 0 }
    }
  ]
  const instance = new DrawPdf(
    {
      width,
      height: 200,
      margins: [0, 0, 0, 0],
      header: { disabled: true },
      footer: { disabled: true },
      pageNumber: { disabled: true }
    },
    { main }
  )
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const pdfPerPx = page.view[2] / instance.getWidth()
  const opList = await page.getOperatorList()
  const list: IShownText[] = []
  let x = 0
  let y = 0
  for (let i = 0; i < opList.fnArray.length; i++) {
    const args = opList.argsArray[i]
    if (opList.fnArray[i] === OPS.moveText) {
      x = args[0] / pdfPerPx
      y = Math.round(args[1])
    } else if (opList.fnArray[i] === OPS.showText) {
      const str = (args[0] as { unicode?: string }[])
        .map(glyph => glyph?.unicode ?? '')
        .join('')
      if (str.trim()) list.push({ str, x, y })
    }
  }
  return list
}

// Text of each line, top to bottom.
const lines = (list: IShownText[]) => {
  const byY = new Map<number, string>()
  for (const t of list) byY.set(t.y, (byY.get(t.y) || '') + t.str)
  return [...byY.entries()].sort((a, b) => b[0] - a[0]).map(([, s]) => s)
}

// canvas-editor 7c4e8e66 (#1200). Before it, only the letters that overlapped
// the image moved past it, splitting the word around the image.
describe('word wrap around a surround image', () => {
  it('moves a word that would cross the image to its right as a whole', async () => {
    const list = await shownText(300)
    const line = lines(list).find(text => text.includes('M'))!
    expect(line).toContain(WORD)
    const start = list.findIndex(t => t.str === 'M')
    const word = list.slice(start, start + WORD.length)
    expect(word.map(t => t.str).join('')).toBe(WORD)
    for (const t of word)
      expect(t.x).toBeGreaterThanOrEqual(IMAGE_X + IMAGE_WIDTH)
  })

  it('wraps a word that does not fit beside the image instead of splitting it', async () => {
    const result = lines(await shownText(120))
    expect(result[0]).not.toContain('M')
    expect(result.some(text => text.includes(WORD))).toBe(true)
  })
})
