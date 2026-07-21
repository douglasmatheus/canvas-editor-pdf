import { describe, it, expect, beforeAll } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ListStyle, ListType } from '../../src/dataset/enum/List'
import type { IElement } from '../../src/interface/Element'

// Nested ordered-list rendering (aligned with canvas-editor's listLevel
// handling). A list item in the flat element form is a leading ZERO carrying
// the list attributes, followed by its content — both sharing the item's
// listId/listLevel.
function olItem(text: string, listId: string, level: number): IElement[] {
  const attrs = {
    listId,
    listType: ListType.OL,
    listStyle: ListStyle.DECIMAL,
    listLevel: level
  }
  return [
    { value: ZERO, ...attrs },
    ...[...text].map(ch => ({ value: ch, ...attrs }))
  ]
}

const OUTER = 'list-outer'
const INNER = 'list-inner'

interface Marker {
  str: string
  x: number
}

describe('nested ordered list', () => {
  let markers: Marker[]

  beforeAll(async () => {
    // Outer item 1 → nested item (own numbering) → outer item 2 (resumes).
    const main: IElement[] = [
      ...olItem('Alpha', OUTER, 0),
      ...olItem('Beta', INNER, 1),
      ...olItem('Gamma', OUTER, 0),
      { value: ZERO }
    ]
    const instance = new DrawPdf({}, { main })
    instance.render()
    const bytes = new Uint8Array(
      instance.getPdf().output('arraybuffer') as ArrayBuffer
    )
    const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
    const page = await doc.getPage(1)
    const content = await page.getTextContent()
    markers = content.items
      .map(item => ('str' in item ? item : null))
      .filter((item): item is NonNullable<typeof item> => !!item)
      .filter(item => /^\d+\.$/.test(item.str.trim()))
      .map(item => ({ str: item.str.trim(), x: item.transform[4] as number }))
  })

  it('numbers each list level independently (parent resumes past the child)', () => {
    // Outer: 1. … (child: 1.) … 2.  — the child does not bump the parent.
    expect(markers.map(m => m.str)).toEqual(['1.', '1.', '2.'])
  })

  it('indents the nested item marker', () => {
    const [outer1, inner, outer2] = markers
    // Level-1 marker sits to the right of the level-0 markers.
    expect(inner.x).toBeGreaterThan(outer1.x)
    // Both level-0 markers share the same indent.
    expect(Math.abs(outer2.x - outer1.x)).toBeLessThan(1)
  })
})
