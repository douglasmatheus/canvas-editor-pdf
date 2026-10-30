import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IElement } from '../../src/interface/Element'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// Text of every run on page 1, spaces removed (TextParticle's char spacing
// makes pdf.js split runs).
async function pageText(main: IElement[], options: object = {}) {
  const instance = new DrawPdf(
    options,
    { main },
    { loadDefaultFonts: true, fontSource: { dir: resolve('public/font') } }
  )
  await instance.defaultFontsLoadedPromise
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const content = await (await doc.getPage(1)).getTextContent()
  return content.items
    .map(item => ('str' in item ? item.str.replace(/\s/g, '') : ''))
    .join('')
}

// jsPDF's context2d only resolves a multi-word family when it is quoted, so
// every spot that sets ctx.font without an explicit setFont fell back to
// Times and garbled CJK text ('机密文件' came out as 'g:[Æe‡Nö').
describe('font family with a space', () => {
  it('reaches the registered font in superscript and subscript', async () => {
    const text = await pageText([
      { value: ZERO },
      { type: ElementType.SUPERSCRIPT, value: '上标' },
      { type: ElementType.SUBSCRIPT, value: '下标' }
    ])
    expect(text).toContain('上标')
    expect(text).toContain('下标')
  })

  it('reaches the registered font in an image caption', async () => {
    const text = await pageText([
      { value: ZERO },
      {
        type: ElementType.IMAGE,
        value: PNG,
        width: 120,
        height: 40,
        imgCaption: { value: '图片说明' }
      }
    ])
    expect(text).toContain('图片说明')
  })

  it('reaches the registered font in a text watermark', async () => {
    const text = await pageText([{ value: ZERO }, { value: 'x' }], {
      watermark: { data: '机密文件', size: 40 }
    })
    expect(text).toContain('机密文件')
  })
})
