import { AbstractRichText } from './AbstractRichText'
import { IEditorOption } from '../../../interface/Editor'
import { DrawPdf } from '../DrawPdf'
import { Context2d } from 'jspdf'

export class Strikeout extends AbstractRichText {
  private options: Required<IEditorOption>

  constructor(draw: DrawPdf) {
    super()
    this.options = draw.getOptions()
  }

  public render(ctx2d: Context2d) {
    if (!this.fillRect.width) return
    const { scale, strikeoutColor } = this.options
    const { x, y, width } = this.fillRect
    ctx2d.save()
    ctx2d.lineWidth = scale
    ctx2d.strokeStyle = strikeoutColor
    const adjustY = y + 0.5 // 从1处渲染，避免线宽度等于3
    ctx2d.beginPath()
    ctx2d.moveTo(x, adjustY)
    ctx2d.lineTo(x + width, adjustY)
    ctx2d.stroke()
    ctx2d.restore()
    this.clearFillInfo()
  }
}
