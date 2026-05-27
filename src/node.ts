/**
 * Node entry point. Consumed via `import { DrawPdf } from 'canvas-editor-pdf/node'`.
 *
 * Identical public surface to the browser entry (src/index.ts) — the only
 * difference is that the Node build aliases ./platform/current.ts to
 * ./platform/node.ts (via vite.config.ts), so DrawPdf runs against
 * @napi-rs/canvas + @resvg/resvg-js instead of DOM canvas + Image.
 *
 * Consumers must install @napi-rs/canvas and @resvg/resvg-js as peer deps.
 */
import { DrawPdf } from './core/draw/DrawPdf'
import { svgString2Image } from './core/draw/particle/ImageParticle'
import { IEditorData, IEditorOption } from './interface/Editor'

export {
  DrawPdf,
  svgString2Image
}

export type { IEditorData, IEditorOption }
export type { FontSource, PdfOptions } from './core/draw/DrawPdf'
