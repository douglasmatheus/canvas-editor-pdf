import { AbstractRichText } from './AbstractRichText'
import { IEditorOption } from '../../../interface/Editor'
import { DrawPdf } from '../DrawPdf'
import { DashType, TextDecorationStyle } from '../../../dataset/enum/Text'
import { Context2d } from 'jspdf'

export class Underline extends AbstractRichText {
  private options: Required<IEditorOption>

  constructor(draw: DrawPdf) {
    super()
    this.options = draw.getOptions()
  }

  // 下划线
  private _drawLine(
    ctx2d: Context2d,
    startX: number,
    startY: number,
    width: number,
    dashType?: DashType
  ) {
    const endX = startX + width
    ctx2d.beginPath()
    switch (dashType) {
      case DashType.DASHED:
        // 长虚线- - - - - -
        // ctx2d.setLineDash([3, 1])
        break
      case DashType.DOTTED:
        // 点虚线 . . . . . .
        // ctx2d.setLineDash([1, 1])
        break
    }
    ctx2d.moveTo(startX, startY)
    ctx2d.lineTo(endX, startY)
    ctx2d.stroke()
  }

  // 双实线
  private _drawDouble(
    ctx2d: Context2d,
    startX: number,
    startY: number,
    width: number
  ) {
    const SPACING = 3 // 双实线间距
    const endX = startX + width
    const endY = startY + SPACING * this.options.scale
    ctx2d.beginPath()
    ctx2d.moveTo(startX, startY)
    ctx2d.lineTo(endX, startY)
    ctx2d.stroke()
    ctx2d.beginPath()
    ctx2d.moveTo(startX, endY)
    ctx2d.lineTo(endX, endY)
    ctx2d.stroke()
  }

  // 波浪线
  private _drawWave(
    ctx2d: Context2d,
    startX: number,
    startY: number,
    width: number
  ) {
    const { scale } = this.options
    const AMPLITUDE = 1.2 * scale // 振幅
    const FREQUENCY = 1 / scale // 频率
    const adjustY = startY + 2 * AMPLITUDE // 增加2倍振幅
    ctx2d.beginPath()
    for (let x = 0; x < width; x++) {
      const y = AMPLITUDE * Math.sin(FREQUENCY * x)
      ctx2d.lineTo(startX + x, adjustY + y)
    }
    ctx2d.stroke()
  }

  public render(ctx2d: Context2d) {
    if (!this.fillRect.width) return
    const { underlineColor, scale } = this.options
    const { x, y, width } = this.fillRect
    ctx2d.save()
    ctx2d.strokeStyle = this.fillColor || underlineColor
    ctx2d.lineWidth = scale
    const adjustY = Math.floor(y + 2 * ctx2d.lineWidth) + 0.5 // +0.5从1处渲染，避免线宽度等于3
    switch (this.fillDecorationStyle) {
      case TextDecorationStyle.WAVY:
        this._drawWave(ctx2d, x, adjustY, width)
        break
      case TextDecorationStyle.DOUBLE:
        this._drawDouble(ctx2d, x, adjustY, width)
        break
      case TextDecorationStyle.DASHED:
        this._drawLine(ctx2d, x, adjustY, width, DashType.DASHED)
        break
      case TextDecorationStyle.DOTTED:
        this._drawLine(ctx2d, x, adjustY, width, DashType.DOTTED)
        break
      default:
        this._drawLine(ctx2d, x, adjustY, width)
        break
    }
    ctx2d.restore()
    this.clearFillInfo()
  }
}
