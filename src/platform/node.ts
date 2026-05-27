/**
 * Node implementation of the platform shim. Loaded by the Node build via
 * vite.config.ts resolve.alias swap on `./current`. Never imported directly
 * from the browser build.
 *
 * Required peer deps (declared as optionalPeerDependencies in package.json):
 *   - @napi-rs/canvas — Skia-backed canvas for text measurement + watermark patterns
 *   - @resvg/resvg-js — SVG → PNG conversion for LaTeX rendering
 */
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { Resvg } from '@resvg/resvg-js'
import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IPlatform, IPlatformFont } from './types'

async function fetchFontFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Font fetch failed: ${response.status} ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function readFontFromPath(filePath: string): Promise<Buffer> {
  // Require absolute + verify it's a real file so the failure is a clear error
  // ("not a regular file") instead of an obscure read error later. These are
  // cheap sanity checks, not a security boundary — font sources are supplied
  // by the developer, not end users.
  if (!isAbsolute(filePath)) {
    throw new Error(`Font path must be absolute (got: ${filePath})`)
  }
  const resolved = resolve(filePath)
  let info
  try {
    info = await stat(resolved)
  } catch (err) {
    throw new Error(`Cannot stat font path ${resolved}: ${(err as Error).message}`)
  }
  if (!info.isFile()) {
    throw new Error(`Font path is not a regular file: ${resolved}`)
  }
  return readFile(resolved)
}

export const platform: IPlatform = {
  defaultFontSource: 'bundled',

  createMeasurementCanvas() {
    // Tiny canvas — we only call measureText on it, no rendering.
    return createCanvas(1, 1) as unknown as HTMLCanvasElement
  },

  createCanvas(width, height) {
    return createCanvas(width, height) as unknown as HTMLCanvasElement
  },

  getBundledFontPath(fileName) {
    // After bundling, this module lives at dist/node/index.{es,cjs}.js, and the
    // TTFs ship at dist/font/. So '../font/<fileName>' resolves correctly
    // relative to the bundled file. During development from src/ this path
    // won't exist — devs should use fontSource: { dir } or 'cdn' in that case.
    //
    // import.meta.url is preserved by Vite 5+ in lib mode (Vite 2 used to
    // wipe it via a `const import_meta = {}` stub — the workaround for that
    // was dropped when we upgraded). For the CJS build Vite 5 rewrites
    // import.meta.url to a runtime call that derives the URL from __filename,
    // so this same line works in both formats.
    const url = new URL('../font/' + fileName, import.meta.url)
    return fileURLToPath(url)
  },

  async loadFontAsBase64(source) {
    const bytes = /^https?:\/\//i.test(source)
      ? await fetchFontFromUrl(source)
      : await readFontFromPath(source)
    return bytes.toString('base64')
  },

  registerFontForMeasurement(font: IPlatformFont, fontBytesBase64: string) {
    // Register the same font bytes with @napi-rs/canvas so measureText on
    // fakeCtx returns metrics consistent with what jsPDF will draw. Without
    // this, fakeCtx would fall back to the default sans-serif and the layout
    // would diverge from the rendered PDF.
    //
    // The family name passed here MUST match what DrawPdf.getFont() emits in
    // its CSS-style font string (e.g. 'arial', 'microsoft yahei'), because
    // canvas.font = 'bold 12px arial' is what triggers the lookup.
    const buffer = Buffer.from(fontBytesBase64, 'base64')
    GlobalFonts.register(buffer, font.id)
  },

  async svgToPngDataUrl(svg, width, height) {
    // LaTexUtils.svg() returns the SVG already wrapped as a `data:image/svg+xml;base64,…`
    // URL (a pattern that works in browsers because <img src=…> handles it). resvg-js
    // wants raw SVG bytes/string, so unwrap the data URL when we see one.
    const rawSvg = svg.startsWith('data:image/svg+xml')
      ? Buffer.from(svg.split('base64,')[1], 'base64').toString('utf8')
      : svg
    // fitTo by width preserves the SVG's intrinsic aspect ratio. Height is
    // currently ignored — matching browser canvas behavior where drawImage
    // would stretch to fit. If we hit aspect-ratio bugs we can revisit.
    void height
    const resvg = new Resvg(rawSvg, {
      fitTo: { mode: 'width', value: width }
    })
    // resvg's asPng() returns a Buffer directly; TS 5 / newer @types/node
    // refuse `Buffer.from(Buffer)` so call toString on it as-is.
    const pngBuffer = resvg.render().asPng()
    return 'data:image/png;base64,' + pngBuffer.toString('base64')
  }
}
