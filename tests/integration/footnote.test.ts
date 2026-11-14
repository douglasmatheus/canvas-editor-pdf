import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ElementType } from '../../src/dataset/enum/Element'
import { PageMode } from '../../src/dataset/enum/Editor'
import type { IEditorOption } from '../../src/interface/Editor'
import type { IElement } from '../../src/interface/Element'

// Default page geometry, in editor pixels.
const PAGE_HEIGHT = 1123
const MARGIN_LEFT = 120
const MARGIN_BOTTOM = 100
const INNER_WIDTH = 794 - 240

const footnote = (text: string): IElement => ({
  type: ElementType.FOOTNOTE,
  value: '',
  valueList: [{ value: text }]
})

interface ILine {
  text: string
  // baseline, from the top of the page
  y: number
}

interface IPage {
  lines: ILine[]
  // y of every horizontal stroke, from the top of the page
  strokes: { x1: number; x2: number; y: number }[]
}

async function render(
  main: IElement[],
  options: IEditorOption = {},
  loadDefaultFonts = false
): Promise<{ instance: DrawPdf; pages: IPage[] }> {
  const instance = new DrawPdf(
    { pageNumber: { disabled: true }, ...options },
    { main },
    loadDefaultFonts
      ? { loadDefaultFonts, fontSource: { dir: resolve('public/font') } }
      : {}
  )
  await instance.defaultFontsLoadedPromise
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const pages: IPage[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const pdfPerPx = page.view[2] / instance.getWidth()
    const height = page.view[3]
    const content = await page.getTextContent()
    const byY = new Map<number, { x: number; str: string }[]>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round((height - item.transform[5]) / pdfPerPx)
      byY.set(y, [
        ...(byY.get(y) || []),
        { x: item.transform[4], str: item.str }
      ])
    }
    const lines = [...byY.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([y, items]) => ({
        y,
        text: items
          .sort((a, b) => a.x - b.x)
          .map(item => item.str.replace(/\s/g, ''))
          .join('')
      }))
    const strokes: IPage['strokes'] = []
    const opList = await page.getOperatorList()
    for (let i = 0; i < opList.fnArray.length; i++) {
      if (opList.fnArray[i] !== OPS.constructPath) continue
      const c = Array.from(opList.argsArray[i][1][0] as ArrayLike<number>)
      // a single moveTo + lineTo at the same height
      if (c.length === 6 && c[0] === 0 && c[3] === 1 && c[2] === c[5]) {
        strokes.push({
          x1: c[1] / pdfPerPx,
          x2: c[4] / pdfPerPx,
          y: (height - c[2]) / pdfPerPx
        })
      }
    }
    pages.push({ lines, strokes })
  }
  return { instance, pages }
}

const separatorOf = (page: IPage) =>
  page.strokes.find(
    s =>
      Math.abs(s.x1 - MARGIN_LEFT) < 0.5 &&
      Math.abs(s.x2 - s.x1 - INNER_WIDTH / 3) < 0.5
  )

// canvas-editor 6042a141 (#747)
describe('footnotes', () => {
  it('numbers the references and lists the notes at the foot of the page', async () => {
    const { pages } = await render([
      { value: 'Alpha' },
      footnote('First note'),
      { value: ' beta' },
      footnote('Second note')
    ])
    expect(pages).toHaveLength(1)
    const [body, ...notes] = pages[0].lines
    // the reference marks are superscripts, so pdf.js puts them on their own
    // baselines; join the body back together
    const bodyText = pages[0].lines
      .filter(line => line.y < PAGE_HEIGHT / 2)
      .map(line => line.text)
      .join('')
    expect(bodyText).toContain('Alpha')
    expect(bodyText).toContain('1')
    expect(bodyText).toContain('2')
    expect(body.y).toBeLessThan(PAGE_HEIGHT / 2)
    const noteLines = notes.filter(line => line.y > PAGE_HEIGHT / 2)
    expect(noteLines.map(line => line.text)).toEqual([
      '1.Firstnote',
      '2.Secondnote'
    ])
    for (const line of noteLines) {
      expect(line.y).toBeLessThan(PAGE_HEIGHT - MARGIN_BOTTOM)
    }
  })

  it('draws a separator a third of the text width long above the notes', async () => {
    const { pages } = await render([{ value: 'Alpha' }, footnote('Note')])
    const separator = separatorOf(pages[0])
    expect(separator).toBeDefined()
    const note = pages[0].lines.find(line => line.text.includes('Note'))!
    expect(separator!.y).toBeLessThan(note.y)
    expect(separator!.y).toBeGreaterThan(PAGE_HEIGHT / 2)
  })

  it('keeps the body text clear of the notes when it fills the page', async () => {
    const main: IElement[] = [
      { value: 'Start' },
      footnote('A note with enough text to take a line of its own'),
      ...Array.from({ length: 60 }, (_, i) => ({ value: `\nLine ${i}` }))
    ]
    const { pages } = await render(main)
    expect(pages.length).toBeGreaterThan(1)
    const separator = separatorOf(pages[0])!
    expect(separator).toBeDefined()
    const bodyLines = pages[0].lines.filter(line =>
      line.text.startsWith('Line')
    )
    expect(bodyLines.length).toBeGreaterThan(0)
    for (const line of bodyLines) expect(line.y).toBeLessThan(separator.y)
    // the note is drawn on the page holding its reference only
    expect(pages[1].lines.some(line => line.text.includes('note'))).toBe(false)
    expect(separatorOf(pages[1])).toBeUndefined()
  })

  // canvas-editor #1521: with the default fonts (22.33px rows) the last note
  // measured 22.333…6 against 22.333…3 left and was dropped.
  it('draws a note that exactly fills the space left', async () => {
    const { pages } = await render(
      [
        { value: 'Alpha' },
        footnote(
          'A first note long enough to wrap onto a second line inside the ' +
            'footnote area at the bottom of the page, and then some more.'
        ),
        { value: ' beta' },
        footnote('Second note')
      ],
      {},
      true
    )
    const text = pages[0].lines.map(line => line.text).join('')
    expect(text).toContain('2.Secondnote')
  })

  it('draws no notes outside paging mode', async () => {
    const { pages } = await render([{ value: 'Alpha' }, footnote('Note')], {
      pageMode: PageMode.CONTINUITY
    })
    expect(pages[0].lines.some(line => line.text.includes('Note'))).toBe(false)
    expect(separatorOf(pages[0])).toBeUndefined()
  })

  it('keeps the note content in getValue', async () => {
    const { instance } = await render([{ value: 'Alpha' }, footnote('Note')])
    const reference = instance
      .getValue()
      .main.find(el => el.type === ElementType.FOOTNOTE)!
    expect(reference.footnoteId).toBeTruthy()
    expect(reference.valueList?.map(el => el.value).join('')).toBe('Note')
  })
})
