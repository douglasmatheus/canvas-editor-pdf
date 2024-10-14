import { Context2d } from 'jspdf'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IRowElement } from '../../../interface/Row'
import { I18n } from '../../i18n/I18n'
import { DrawPdf } from '../DrawPdf'

export class PageBreakParticle {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>
  private i18n: I18n

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    this.i18n = draw.getI18n()
  }

  public render(
    ctx2d: Context2d,
    element: IRowElement,
    x: number,
    y: number
  ) {
    const {
      pageBreak: { font, fontSize/*, lineDash*/ }
    } = this.options
    const displayName = this.i18n.t('pageBreak.displayName')
    const { scale, defaultRowMargin } = this.options
    const size = fontSize * scale
    const elementWidth = element.width! * scale
    const offsetY =
      this.draw.getDefaultBasicRowMarginHeight() * defaultRowMargin
    ctx2d.save()
    ctx2d.font = `${size}px ${font}`
    const textMeasure = this.draw.getFakeCtx().measureText(displayName)
    const halfX = (elementWidth - textMeasure.width) / 2
    // 线段
    // ctx2d.setLineDash(lineDash)
    ctx2d.translate(0, 0.5 + offsetY)
    ctx2d.beginPath()
    ctx2d.moveTo(x, y)
    ctx2d.lineTo(x + halfX, y)
    ctx2d.moveTo(x + halfX + textMeasure.width, y)
    ctx2d.lineTo(x + elementWidth, y)
    ctx2d.stroke()
    // 文字
    ctx2d.fillText(
      displayName,
      x + halfX,
      y + textMeasure.actualBoundingBoxAscent - size / 2
    )
    ctx2d.restore()
  }
}
