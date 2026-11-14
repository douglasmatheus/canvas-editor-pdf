import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import { TabStopLeader, TabStopType } from '../../src/dataset/enum/TabStop'
import type { IElement, ITabStop } from '../../src/interface/Element'

// Default left margin and defaultTabWidth, in editor pixels.
const MARGIN_LEFT = 120
const TAB_WIDTH = 32

interface IRun {
  str: string
  x: number
  right: number
}

// Text runs of page 1, left to right, in editor pixels.
async function runs(main: IElement[]): Promise<IRun[]> {
  const instance = new DrawPdf({ pageNumber: { disabled: true } }, { main })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const pdfPerPx = page.view[2] / instance.getWidth()
  const content = await page.getTextContent()
  const list: IRun[] = []
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const x = item.transform[4] / pdfPerPx
    list.push({ str: item.str, x, right: x + item.width / pdfPerPx })
  }
  return list.sort((a, b) => a.x - b.x)
}

const tabbed = (tabStops?: ITabStop[]): IElement[] => [
  { value: ZERO, tabStops },
  { value: 'ab', tabStops },
  { type: ElementType.TAB, value: '', tabStops },
  { value: 'XYZ', tabStops }
]

const runOf = (list: IRun[], text: string) =>
  list.find(run => run.str.includes(text[0]))!

// canvas-editor 1865c9b0 (#256)
describe('tab stops', () => {
  it('steps a tab to the next default grid column', async () => {
    const x = runOf(await runs(tabbed()), 'X').x
    expect(x).toBeCloseTo(MARGIN_LEFT + TAB_WIDTH, 0)
  })

  it('jumps a tab to a left tab stop', async () => {
    const list = await runs(tabbed([{ position: 100, type: TabStopType.LEFT }]))
    expect(runOf(list, 'X').x).toBeCloseTo(MARGIN_LEFT + 100, 0)
  })

  it('ends the text after a tab at a right tab stop', async () => {
    const list = await runs(
      tabbed([{ position: 200, type: TabStopType.RIGHT }])
    )
    const run = runOf(list, 'X')
    expect(run.str.replace(/\s/g, '')).toBe('XYZ')
    expect(run.right).toBeCloseTo(MARGIN_LEFT + 200, 0)
  })

  it('centres the text after a tab on a center tab stop', async () => {
    const list = await runs(
      tabbed([{ position: 200, type: TabStopType.CENTER }])
    )
    const run = runOf(list, 'X')
    expect((run.x + run.right) / 2).toBeCloseTo(MARGIN_LEFT + 200, 0)
  })

  it('fills the gap before a tab stop with its leader', async () => {
    const list = await runs(
      tabbed([
        { position: 200, type: TabStopType.LEFT, leader: TabStopLeader.DOT }
      ])
    )
    // pdf.js merges the leader into the run before it.
    const text = list.map(run => run.str.replace(/\s/g, '')).join('')
    expect(text).toMatch(/^ab\.{20,}XYZ$/)
    expect(runOf(list, 'X').x).toBeCloseTo(MARGIN_LEFT + 200, 0)
  })

  it('draws no leader on the default grid', async () => {
    const list = await runs(tabbed())
    expect(list.some(run => run.str.includes('.'))).toBe(false)
  })
})
