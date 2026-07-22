import { Context2d } from 'jspdf'
import { IElement } from '../../../../interface/Element'
import { ImageParticle } from '../ImageParticle'
import { ExportOpt, LaTexSVG, LaTexUtils } from './utils/LaTexUtils'

// Shared scale so the polylines and the intrinsic size below stay in the same
// coordinate space as the legacy SVG output (see LaTexUtils.svg()).
const EXPORT_OPT: ExportOpt = {
  SCALE_X: 10,
  SCALE_Y: 10,
  MARGIN_X: 0,
  MARGIN_Y: 0
}

export interface LaTexPolylines {
  polylines: number[][][]
  width: number
  height: number
}

export class LaTexParticle extends ImageParticle {
  public static convertLaTextToSVG(laTex: string): LaTexSVG {
    return new LaTexUtils(laTex).svg(EXPORT_OPT)
  }

  // Vector path data for the formula. Points live in the same [0..width] ×
  // [0..height] space the SVG export used, so a formula's intrinsic size is
  // identical whether it is rasterized or drawn directly.
  public static convertLaTextToPolylines(laTex: string): LaTexPolylines {
    const util = new LaTexUtils(laTex)
    const box = util.box(EXPORT_OPT)
    return {
      polylines: util.polylines(EXPORT_OPT),
      width: Math.ceil(box.w),
      height: Math.ceil(box.h)
    }
  }

  public render(ctx2d: Context2d, element: IElement, x: number, y: number) {
    const { scale } = this.options
    const width = element.width! * scale
    const height = element.height! * scale
    ctx2d.clearRect(x, y, width, height)
    // Draw the formula as vector strokes straight onto the jsPDF context —
    // no SVG→PNG rasterization (crisp at any zoom, smaller PDF, and fully
    // synchronous so it can never stall an awaited caller like setValue).
    const { polylines, width: svgWidth, height: svgHeight } =
      LaTexParticle.convertLaTextToPolylines(element.value)
    if (!polylines.length || !svgWidth || !svgHeight) return
    // Map the formula's own coordinate space onto the target rect.
    const sx = width / svgWidth
    const sy = height / svgHeight
    ctx2d.save()
    ctx2d.beginPath()
    ctx2d.strokeStyle = element.color || 'black'
    // The legacy SVG used stroke-width 1 in the (already ×10) formula space;
    // scaling it by sx keeps the stroke weight visually consistent with the
    // rasterized output.
    ctx2d.lineWidth = sx
    ctx2d.lineCap = 'round'
    ctx2d.lineJoin = 'round'
    for (let i = 0; i < polylines.length; i++) {
      const line = polylines[i]
      for (let j = 0; j < line.length; j++) {
        const px = x + line[j][0] * sx
        const py = y + line[j][1] * sy
        if (j === 0) {
          ctx2d.moveTo(px, py)
        } else {
          ctx2d.lineTo(px, py)
        }
      }
    }
    ctx2d.stroke()
    ctx2d.restore()
  }
}
