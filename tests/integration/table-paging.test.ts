import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IElement } from '../../src/interface/Element'

// A table taller than one page. Row 0 is a `pagingRepeat` header so the
// continuation pages re-show it.
function tableDoc(rowCount: number): IElement[] {
  const trList = Array.from({ length: rowCount }, (_, r) => ({
    height: 42,
    pagingRepeat: r === 0,
    tdList: [
      {
        colspan: 1,
        rowspan: 1,
        value: [{ value: r === 0 ? 'HeaderA' : `RowA${r}` }]
      },
      {
        colspan: 1,
        rowspan: 1,
        value: [{ value: r === 0 ? 'HeaderB' : `RowB${r}` }]
      }
    ]
  }))
  return [
    { value: ZERO },
    {
      type: ElementType.TABLE,
      value: '',
      colgroup: [{ width: 260 }, { width: 260 }],
      trList
    } as IElement,
    { value: ZERO }
  ]
}

function build(rowCount: number) {
  return new DrawPdf(
    { width: 595, height: 842, margins: [60, 60, 60, 60] },
    { main: tableDoc(rowCount) },
    { loadDefaultFonts: false }
  )
}

async function pageTexts(instance: DrawPdf): Promise<string[]> {
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const texts: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    texts.push(
      content.items
        .map(i => ('str' in i ? i.str : ''))
        .join('')
        .replace(/\s+/g, '')
    )
  }
  return texts
}

describe('table pagination across pages', () => {
  it('splits a tall table into per-page fragments at the render layer', () => {
    const instance = build(60)
    instance.render()
    const rows = instance.getPageRowList().flat()
    const fragmentRows = rows.filter(r => r.tableFragment)
    expect(instance.getPageRowList().length).toBeGreaterThan(1)
    expect(fragmentRows.length).toBeGreaterThan(1)
  })

  it('keeps the data layer as a single, un-split table', () => {
    const instance = build(60)
    instance.render()
    const tables = instance
      .getValue()
      .main!.filter(el => el.type === ElementType.TABLE)
    // Pre-#41 the renderer cloned the element per page (pagingId/pagingIndex),
    // which leaked split tables into getValue(). Now splitting is render-only.
    expect(tables).toHaveLength(1)
    expect(tables[0].trList).toHaveLength(60)
  })

  it('renders rows onto more than one page and repeats the header row', async () => {
    const instance = build(60)
    instance.render()
    const texts = await pageTexts(instance)
    expect(texts.length).toBeGreaterThan(1)
    // first and last data rows land on different pages
    expect(texts[0]).toContain('RowA1')
    expect(texts.at(-1)).toContain('RowA59')
    expect(texts[0]).not.toContain('RowA59')
    // pagingRepeat header re-shown on the continuation page
    expect(texts[1]).toContain('HeaderA')
  })

  it('does not lose or duplicate rows across pages', async () => {
    const instance = build(60)
    instance.render()
    const all = (await pageTexts(instance)).join('')
    for (let r = 1; r < 60; r++) {
      const occurrences = all.split(`RowA${r}` + 'R').length - 1
      expect(
        all.includes(`RowA${r}`),
        `RowA${r} missing from output`
      ).toBe(true)
      expect(occurrences, `RowA${r} duplicated`).toBeLessThanOrEqual(1)
    }
  })
})
