import { Context2d } from 'jspdf'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IRowElement } from '../../../interface/Row'
import { DrawPdf } from '../DrawPdf'

export class LineBreakParticle {
  private options: DeepRequired<IEditorOption>
  public static readonly WIDTH = 12
  public static readonly HEIGHT = 9
  public static readonly GAP = 3 // 距离左边间隙

  constructor(draw: DrawPdf) {
    this.options = draw.getOptions()
  }

  public render(
    ctx2d: Context2d,
    element: IRowElement,
    x: number,
    y: number
  ) {
    const {
      scale,
      lineBreak: { color, lineWidth }
    } = this.options
    ctx2d.save()
    ctx2d.beginPath()
    // 换行符尺寸设置为9像素
    const top = y - (LineBreakParticle.HEIGHT * scale) / 2
    const left = x + element.metrics.width
    // 移动位置并设置缩放
    ctx2d.translate(left, top)
    ctx2d.scale(scale, scale)
    // 样式设置
    ctx2d.strokeStyle = color
    ctx2d.lineWidth = lineWidth
    ctx2d.lineCap = 'round'
    ctx2d.lineJoin = 'round'
    ctx2d.beginPath()
    // 回车折线
    ctx2d.moveTo(8, 0)
    ctx2d.lineTo(12, 0)
    ctx2d.lineTo(12, 6)
    ctx2d.lineTo(3, 6)
    // 箭头向上
    ctx2d.moveTo(3, 6)
    ctx2d.lineTo(6, 3)
    // 箭头向下
    ctx2d.moveTo(3, 6)
    ctx2d.lineTo(6, 9)
    ctx2d.stroke()
    ctx2d.closePath()
    ctx2d.restore()
  }
}
