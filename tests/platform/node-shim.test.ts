import { describe, it, expect } from 'vitest'
import { isAbsolute } from 'node:path'
// Import the Node shim directly (no alias needed — this IS the node file).
import { platform } from '../../src/platform/node'

// Unit coverage for the Node platform shim (@napi-rs/canvas + @resvg/resvg-js).
// The browser shim (DOM canvas / fetch) isn't unit-tested here: a fake DOM
// (jsdom/happy-dom) doesn't implement real canvas text metrics, so those
// assertions would be meaningless. The browser path is exercised end-to-end by
// the browser smoke script instead.

describe('platform/node shim', () => {
  it('defaults fontSource to bundled', () => {
    expect(platform.defaultFontSource).toBe('bundled')
  })

  it('createMeasurementCanvas returns a canvas with working measureText', () => {
    const canvas = platform.createMeasurementCanvas()
    const ctx = canvas.getContext('2d')!
    ctx.font = '16px sans-serif'
    const metrics = ctx.measureText('hello world')
    expect(metrics.width).toBeGreaterThan(0)
    // Wider string must measure wider — sanity that metrics track content.
    expect(ctx.measureText('wwwwwwwwww').width).toBeGreaterThan(
      ctx.measureText('.').width
    )
  })

  it('createCanvas returns a canvas of the requested size', () => {
    const canvas = platform.createCanvas(120, 40)
    expect(canvas.width).toBe(120)
    expect(canvas.height).toBe(40)
  })

  it('getBundledFontPath resolves to an absolute path for the file', () => {
    const p = platform.getBundledFontPath('msyh.ttf')
    expect(isAbsolute(p)).toBe(true)
    expect(p.replace(/\\/g, '/')).toMatch(/\/font\/msyh\.ttf$/)
  })

  it('loadFontAsBase64 rejects a relative filesystem path', async () => {
    await expect(platform.loadFontAsBase64('some/relative/font.ttf')).rejects
      .toThrow(/absolute/i)
  })

  it('svgToPngDataUrl converts raw SVG to a PNG data URL', async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
      '<rect width="10" height="10" fill="black"/></svg>'
    const url = await platform.svgToPngDataUrl(svg, 10, 10)
    expect(url).toMatch(/^data:image\/png;base64,/)
    // Non-trivial payload (decodes to a real PNG, starts with the PNG magic).
    const b64 = url.split('base64,')[1]
    const bytes = Buffer.from(b64, 'base64')
    expect(bytes.length).toBeGreaterThan(0)
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
  })

  it('svgToPngDataUrl unwraps a data:image/svg+xml source', async () => {
    const rawSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">' +
      '<rect width="8" height="8" fill="red"/></svg>'
    const dataUrl =
      'data:image/svg+xml;base64,' + Buffer.from(rawSvg).toString('base64')
    const url = await platform.svgToPngDataUrl(dataUrl, 8, 8)
    expect(url).toMatch(/^data:image\/png;base64,/)
  })
})
