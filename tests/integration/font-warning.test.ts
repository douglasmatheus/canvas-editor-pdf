import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolve } from 'node:path'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IElement } from '../../src/interface/Element'

const fontWarnings = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls
    .map(call => String(call[0]))
    .filter(message => message.startsWith('canvas-editor-pdf: font'))

afterEach(() => {
  vi.restoreAllMocks()
})

// Upstream's feature/pdf export warns about fonts the document uses but that
// were never embedded; jsPDF itself falls back silently.
describe('unregistered font warning', () => {
  it('names each unregistered family once, including those in tables', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const main: IElement[] = [
      { value: ZERO },
      { value: 'a', font: 'SimSun' },
      {
        type: ElementType.TABLE,
        value: '',
        colgroup: [{ width: 100 }],
        trList: [
          {
            height: 30,
            tdList: [
              {
                colspan: 1,
                rowspan: 1,
                value: [{ value: 'b', font: 'KaiTi' }]
              }
            ]
          }
        ]
      }
    ]
    const instance = new DrawPdf({ defaultFont: 'helvetica' }, { main })
    instance.render()
    instance.render()
    const messages = fontWarnings(warn)
    expect(messages).toHaveLength(2)
    expect(messages.some(m => m.includes('"SimSun"'))).toBe(true)
    expect(messages.some(m => m.includes('"KaiTi"'))).toBe(true)
  })

  it('warns about a default font that was never loaded', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new DrawPdf({}, { main: [{ value: ZERO }, { value: 'x' }] }).render()
    expect(fontWarnings(warn)).toEqual([
      expect.stringContaining('"Microsoft YaHei"')
    ])
  })

  it('stays quiet once the fonts are loaded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const instance = new DrawPdf(
      {},
      { main: [{ value: ZERO }, { value: 'x', font: 'Arial' }] },
      { loadDefaultFonts: true, fontSource: { dir: resolve('public/font') } }
    )
    await instance.defaultFontsLoadedPromise
    instance.render()
    expect(fontWarnings(warn)).toEqual([])
  })
})
