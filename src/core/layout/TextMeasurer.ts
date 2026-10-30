import { METRICS_BASIS_TEXT } from '../../dataset/constant/Common'
import { IElement } from '../../interface/Element'
import { ITextMetrics } from '../../interface/Text'
import { platform } from '../../platform/current'

// canvas-editor-pdf: a browser canvas ignores an invalid font string and keeps
// its current font; @napi-rs/canvas throws instead. Upstream's callers rely on
// the browser behaviour — measureBasis(element.font) passes a bare family
// name and expects the full font already on the context to be used.
export function setCanvasFont(ctx: CanvasRenderingContext2D, font: string) {
  try {
    ctx.font = font
  } catch {
    // keep the current font, as a browser would
  }
}

export class TextMeasurer {
  private ctx: CanvasRenderingContext2D
  private cache: Map<string, ITextMetrics>

  constructor(ctx?: CanvasRenderingContext2D) {
    this.ctx = ctx ?? platform.createMeasurementCanvas().getContext('2d')!
    this.cache = new Map()
  }

  public measure(
    element: IElement,
    font: string,
    ctx?: CanvasRenderingContext2D
  ): ITextMetrics {
    const measureCtx = ctx ?? this.ctx
    const textMetrics = this.measureText(element.value, font, measureCtx)
    if (!element.width) return textMetrics
    return {
      ...textMetrics,
      width: element.width
    }
  }

  public measureText(
    value: string,
    font: string,
    ctx?: CanvasRenderingContext2D
  ): ITextMetrics {
    const measureCtx = ctx ?? this.ctx
    setCanvasFont(measureCtx, font)
    const id = `${value}${measureCtx.font}`
    const cacheTextMetrics = this.cache.get(id)
    if (cacheTextMetrics) return cacheTextMetrics
    const textMetrics = measureCtx.measureText(value)
    const metrics: ITextMetrics = {
      width: textMetrics.width,
      actualBoundingBoxAscent: textMetrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: textMetrics.actualBoundingBoxDescent,
      actualBoundingBoxLeft: textMetrics.actualBoundingBoxLeft,
      actualBoundingBoxRight: textMetrics.actualBoundingBoxRight,
      fontBoundingBoxAscent: textMetrics.fontBoundingBoxAscent,
      fontBoundingBoxDescent: textMetrics.fontBoundingBoxDescent
    }
    this.cache.set(id, metrics)
    return metrics
  }

  public measureBasis(
    font: string,
    ctx?: CanvasRenderingContext2D
  ): ITextMetrics {
    const measureCtx = ctx ?? this.ctx
    measureCtx.save()
    const textMetrics = this.measure(
      { value: METRICS_BASIS_TEXT },
      font,
      measureCtx
    )
    measureCtx.restore()
    return textMetrics
  }
}
