/**
 * Platform shim — abstracts environment-specific APIs (DOM canvas, fetch, fs)
 * so the same DrawPdf source compiles to both browser and Node bundles.
 *
 * Two implementations live next door:
 *   - ./browser.ts (uses document.createElement, fetch, Image, FileReader)
 *   - ./node.ts    (uses @napi-rs/canvas, node:fs/promises, @resvg/resvg-js)
 *
 * The DrawPdf code imports from ./current, which re-exports ./browser by default.
 * The Node build aliases ./current to ./node via Vite resolve.alias.
 */

export interface IPlatformFont {
  fileName: string
  base64: string
  id: string
  type: string
}

export interface IPlatform {
  /**
   * Default fontSource for this platform when the consumer doesn't pass one.
   *   - Browser: 'cdn' (TTFs over https from jsdelivr)
   *   - Node:    'bundled' (TTFs read from dist/font/ via fs)
   */
  defaultFontSource: 'cdn' | 'bundled'
  /** Used by DrawPdf.fakeCanvas — text measurement only, no rendering */
  createMeasurementCanvas(): HTMLCanvasElement
  /** Used by Watermark — needs a real backing canvas with dimensions */
  createCanvas(width: number, height: number): HTMLCanvasElement
  /**
   * Resolve a font file shipped inside the package to an absolute path/URL
   * loadable by `loadFontAsBase64`. Only meaningful in Node (where fonts are
   * read from dist/font/); the browser implementation throws since browsers
   * can't read from the package's filesystem and should use 'cdn' instead.
   */
  getBundledFontPath(fileName: string): string
  /**
   * Load a TTF font from a URL (http(s)) or filesystem path (node only).
   * Returns base64-encoded font bytes (without the data: prefix).
   * Throws on SSRF / path-traversal violations.
   */
  loadFontAsBase64(source: string): Promise<string>
  /**
   * Optional hook called after a font is registered with jsPDF, so the platform
   * can also register it with the underlying measurement canvas (e.g.
   * @napi-rs/canvas GlobalFonts). No-op in the browser.
   */
  registerFontForMeasurement(font: IPlatformFont, fontBytesBase64: string): void
  /** Convert an SVG string into a PNG data URL (data:image/png;base64,...) */
  svgToPngDataUrl(svg: string, width: number, height: number): Promise<string>
}
