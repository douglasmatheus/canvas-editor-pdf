import { AbstractRichText } from './AbstractRichText'
import { IEditorOption } from '../../../interface/Editor'
import { DrawPdf } from '../DrawPdf'
import { GState } from 'jspdf'
import type { IRenderContext } from '../../render/model/RenderContext'

export class Highlight extends AbstractRichText {
  private options: Required<IEditorOption>

  constructor(draw: DrawPdf) {
    super()
    this.options = draw.getOptions()
  }

  public render(ctx2d: IRenderContext) {
    if (!this.fillRect.width) return
    const { highlightAlpha } = this.options
    // console.log(highlightAlpha)
    const { x, y, width, height } = this.fillRect
    // console.log(x, y, width, height)
    ctx2d.save()
    ctx2d.setGState(new GState({
      opacity: highlightAlpha
    }))
    ctx2d.globalAlpha = highlightAlpha
    ctx2d.fillStyle = this.fillColor!
    ctx2d.fillRect(x, y, width, height)
    ctx2d.setGState(new GState({
      opacity: 1
    }))
    ctx2d.restore()
    this.clearFillInfo()
  }
}
