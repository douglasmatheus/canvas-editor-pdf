import { AbstractRichText } from './AbstractRichText'
import { IEditorOption } from '../../../interface/Editor'
import { DrawPdf } from '../DrawPdf'
import { Context2d, GState } from 'jspdf'

export class Highlight extends AbstractRichText {
  private draw: DrawPdf
  private options: Required<IEditorOption>

  constructor(draw: DrawPdf) {
    super()
    this.draw = draw
    this.options = draw.getOptions()
  }

  public render(ctx2d: Context2d) {
    if (!this.fillRect.width) return
    const { highlightAlpha } = this.options
    const { x, y, width, height } = this.fillRect
    ctx2d.save()
    this.draw.getPdf().setGState(new GState({
      opacity: highlightAlpha
    }))
    ctx2d.globalAlpha = highlightAlpha
    ctx2d.fillStyle = this.fillColor!
    ctx2d.fillRect(x, y, width, height)
    this.draw.getPdf().setGState(new GState({
      opacity: 1
    }))
    ctx2d.restore()
    this.clearFillInfo()
  }
}
