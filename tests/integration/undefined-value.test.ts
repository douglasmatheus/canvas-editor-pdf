import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import type { IElement } from '../../src/interface/Element'

// canvas-editor's pickElementAttr copies `value: payload.value` straight
// through, so an element can reach the exporter with value undefined.
// formatElementList used to read `.length` off it and throw; upstream guards
// the same expression with `?.`.
const docWithUndefinedValue = (): IElement[] =>
  [
    { value: ZERO },
    { value: 'before' },
    { value: undefined } as unknown as IElement,
    { value: 'after' },
    { value: ZERO }
  ] as IElement[]

// Text comes back glyph by glyph with positional gaps, so compare without
// whitespace.
async function packedTextOfPageOne(instance: DrawPdf): Promise<string> {
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const content = await (await doc.getPage(1)).getTextContent()
  const raw = content.items
    .map(item => ('str' in item ? item.str : ''))
    .join('')
  return raw.replace(/\s+/g, '')
}

describe('element with an undefined value', () => {
  it('survives the constructor and still renders its neighbours', async () => {
    const instance = new DrawPdf({}, { main: docWithUndefinedValue() })
    const text = await packedTextOfPageOne(instance)
    expect(text).toContain('before')
    expect(text).toContain('after')
  })

  it('survives setValue', async () => {
    const instance = new DrawPdf({}, { main: [{ value: ZERO }] })
    await expect(
      instance.setValue({ main: docWithUndefinedValue() })
    ).resolves.not.toThrow()
    const text = await packedTextOfPageOne(instance)
    expect(text).toContain('before')
    expect(text).toContain('after')
  })

  // Deliberately not papered over: the element keeps its undefined value and
  // TextParticle appends it to the run (`this.text += element.value`), exactly
  // as canvas-editor's own TextParticle does. Emitting an element with no
  // value is a data problem on the caller's side; the contract here is only
  // that it must not throw.
  it('renders the value as the literal string, like the editor does', async () => {
    const instance = new DrawPdf({}, { main: docWithUndefinedValue() })
    expect(await packedTextOfPageOne(instance)).toContain('undefined')
  })
})
