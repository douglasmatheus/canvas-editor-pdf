import { describe, it, expect } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IElement } from '../../src/interface/Element'

// 100x100 PNG: red top-left, green top-right, blue bottom-left, black
// bottom-right quadrant.
function quadrants(): string {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext('2d')
  const fill = (color: string, x: number, y: number) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, 50, 50)
  }
  fill('#ff0000', 0, 0)
  fill('#00ff00', 50, 0)
  fill('#0000ff', 0, 50)
  fill('#000000', 50, 50)
  return canvas.toDataURL('image/png')
}

// Rasterize page 1 and count the pixels of each quadrant colour.
async function colourCounts(image: Partial<IElement>) {
  const instance = new DrawPdf(
    { pageNumber: { disabled: true } },
    {
      main: [
        { value: ZERO },
        { type: ElementType.IMAGE, value: quadrants(), width: 200, height: 200, ...image }
      ]
    }
  )
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: canvas as unknown as HTMLCanvasElement
  }).promise
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const counts = { red: 0, green: 0, blue: 0 }
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    if (r > 200 && g < 60 && b < 60) counts.red++
    else if (g > 200 && r < 60 && b < 60) counts.green++
    else if (b > 200 && r < 60 && g < 60) counts.blue++
  }
  return counts
}

// canvas-editor bc066f33 (#1327): `imgCrop` draws only a region of the
// source image, stretched over the element's box.
describe('image crop', () => {
  it('draws the whole image without imgCrop', async () => {
    const counts = await colourCounts({})
    expect(counts.red).toBeGreaterThan(0)
    expect(counts.green).toBeGreaterThan(0)
    expect(counts.blue).toBeGreaterThan(0)
  })

  it('draws only the cropped region, and nothing of the rest', async () => {
    const counts = await colourCounts({
      imgCrop: { x: 0, y: 0, width: 50, height: 50 }
    })
    // the red quadrant now fills the whole 200x200 box
    expect(counts.red).toBeGreaterThan(150 * 150 * 0.5)
    expect(counts.green).toBe(0)
    expect(counts.blue).toBe(0)
  })
})
