import { Context2d } from 'jspdf'
import { PageMode } from '../../../dataset/enum/Editor'
import { IEditorOption } from '../../../interface/Editor'
import { DrawPdf } from '../DrawPdf'

export class Margin {
  private draw: DrawPdf
  private options: Required<IEditorOption>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
  }

  public render(ctx2d: Context2d, pageNo: number) {
    const { marginIndicatorColor, pageMode } = this.options
    const width = this.draw.getWidth()
    const height =
      pageMode === PageMode.CONTINUITY
        ? this.draw.getCanvasHeight(pageNo)
        : this.draw.getHeight()
    const margins = this.draw.getMargins()
    const marginIndicatorSize = this.draw.getMarginIndicatorSize()
    ctx2d.save()
    ctx2d.translate(0.5, 0.5)
    ctx2d.strokeStyle = marginIndicatorColor
    ctx2d.beginPath()
    const leftTopPoint: [number, number] = [margins[3], margins[0]]
    const rightTopPoint: [number, number] = [width - margins[1], margins[0]]
    const leftBottomPoint: [number, number] = [margins[3], height - margins[2]]
    const rightBottomPoint: [number, number] = [
      width - margins[1],
      height - margins[2]
    ]
    // 上左
    ctx2d.moveTo(leftTopPoint[0] - marginIndicatorSize, leftTopPoint[1])
    ctx2d.lineTo(...leftTopPoint)
    ctx2d.lineTo(leftTopPoint[0], leftTopPoint[1] - marginIndicatorSize)
    // 上右
    ctx2d.moveTo(rightTopPoint[0] + marginIndicatorSize, rightTopPoint[1])
    ctx2d.lineTo(...rightTopPoint)
    ctx2d.lineTo(rightTopPoint[0], rightTopPoint[1] - marginIndicatorSize)
    // 下左
    ctx2d.moveTo(leftBottomPoint[0] - marginIndicatorSize, leftBottomPoint[1])
    ctx2d.lineTo(...leftBottomPoint)
    ctx2d.lineTo(leftBottomPoint[0], leftBottomPoint[1] + marginIndicatorSize)
    // 下右
    ctx2d.moveTo(rightBottomPoint[0] + marginIndicatorSize, rightBottomPoint[1])
    ctx2d.lineTo(...rightBottomPoint)
    ctx2d.lineTo(rightBottomPoint[0], rightBottomPoint[1] + marginIndicatorSize)
    ctx2d.stroke()
    ctx2d.restore()
  }
}
