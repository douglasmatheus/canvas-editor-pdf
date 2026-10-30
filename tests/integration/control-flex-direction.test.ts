import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { FlexDirection } from '../../src/dataset/enum/Common'
import { ControlType } from '../../src/dataset/enum/Control'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IElement } from '../../src/interface/Element'

// Top edge (editor pixels) of each option label of a checkbox/radio control.
async function optionTops(
  type: ControlType.CHECKBOX | ControlType.RADIO,
  flexDirection?: FlexDirection
): Promise<number[]> {
  const main: IElement[] = [
    { value: ZERO },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        type,
        value: null,
        code: null,
        ...(flexDirection ? { flexDirection } : {}),
        valueSets: [
          { value: 'Alpha', code: 'a' },
          { value: 'Beta', code: 'b' },
          { value: 'Gamma', code: 'c' }
        ]
      } as IElement['control']
    }
  ]
  const instance = new DrawPdf({}, { main })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const pdfPerPx = page.view[2] / instance.getWidth()
  const content = await page.getTextContent()
  return ['Alpha', 'Beta', 'Gamma'].map(label => {
    const item = content.items.find(
      item => 'str' in item && item.str.replace(/\s/g, '').startsWith(label)
    )
    if (!item || !('transform' in item)) throw new Error(`no '${label}'`)
    return (page.view[3] - item.transform[5]) / pdfPerPx
  })
}

// canvas-editor c599d563 (#652)
describe('control flexDirection', () => {
  for (const type of [ControlType.CHECKBOX, ControlType.RADIO] as const) {
    it(`stacks ${type} options when the control is a column`, async () => {
      const [a, b, c] = await optionTops(type, FlexDirection.COLUMN)
      expect(b).toBeGreaterThan(a)
      expect(c).toBeGreaterThan(b)
    })

    it(`keeps ${type} options on one row by default`, async () => {
      const [a, b, c] = await optionTops(type)
      expect(b).toBeCloseTo(a, 1)
      expect(c).toBeCloseTo(a, 1)
    })
  }
})
