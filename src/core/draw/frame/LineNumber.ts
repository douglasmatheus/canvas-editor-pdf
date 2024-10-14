import { Context2d } from 'jspdf'
import { LineNumberType } from '../../../dataset/enum/LineNumber'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { DrawPdf } from '../DrawPdf'

export class LineNumber {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
  }

  public render(ctx2d: Context2d, pageNo: number) {
    const {
      scale,
      lineNumber: { color, size, font, right, type }
    } = this.options
    const textParticle = this.draw.getTextParticle()
    const margins = this.draw.getMargins()
    const positionList = this.draw.getPosition().getOriginalMainPositionList()
    const pageRowList = this.draw.getPageRowList()
    const rowList = pageRowList[pageNo]
    ctx2d.save()
    ctx2d.fillStyle = color
    ctx2d.font = `${size * scale}px ${font}`
    for (let i = 0; i < rowList.length; i++) {
      const row = rowList[i]
      const {
        coordinate: { leftBottom }
      } = positionList[row.startIndex]
      const seq = type === LineNumberType.PAGE ? i + 1 : row.rowIndex + 1
      const textMetrics = textParticle.measureText(ctx2d, {
        value: `${seq}`
      })
      const x = margins[3] - (textMetrics.width + right) * scale
      const y = leftBottom[1] - textMetrics.actualBoundingBoxAscent * scale
      ctx2d.fillText(`${seq}`, x, y)
    }
    ctx2d.restore()
  }
}
