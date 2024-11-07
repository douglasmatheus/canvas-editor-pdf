import { Context2d } from 'jspdf'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IRowElement } from '../../../interface/Row'
import { DrawPdf } from '../DrawPdf'
export class SeparatorParticle {
  private options: DeepRequired<IEditorOption>

  constructor(draw: DrawPdf) {
    this.options = draw.getOptions()
  }

  public render(
    ctx2d: Context2d,
    element: IRowElement,
    x: number,
    y: number
  ) {
    ctx2d.save()
    const {
      scale,
      separator: { lineWidth, strokeStyle }
    } = this.options
    ctx2d.lineWidth = lineWidth * scale
    ctx2d.strokeStyle = element.color || strokeStyle
    if (element.dashArray?.length) {
      // ctx2d.setLineDash(element.dashArray)
    }
    const offsetY = Math.round(y) // 四舍五入避免绘制模糊
    ctx2d.translate(0, ctx2d.lineWidth / 2)
    ctx2d.beginPath()
    ctx2d.moveTo(x, offsetY)
    // console.log("element")
    // console.log(element)
    // console.log("offsetY, y")
    // console.log(offsetY, y)
    ctx2d.lineTo(x + element.width! * scale, offsetY)
    ctx2d.stroke()
    ctx2d.restore()
  }
}
