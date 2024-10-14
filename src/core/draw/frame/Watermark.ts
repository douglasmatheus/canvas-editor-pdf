import { Context2d, GState } from 'jspdf'
import { IEditorOption } from '@hufe921/canvas-editor'
import { DeepRequired } from '../../../interface/Common'
import { DrawPdf } from '../DrawPdf'

export class Watermark {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = <DeepRequired<IEditorOption>>draw.getOptions()
  }

  public render(ctx2d: Context2d) {
    const {
      watermark: { data, opacity, font, size, color, repeat, gap },
      scale
    } = this.options
    const width = this.draw.getDraw().getWidth()
    const height = this.draw.getDraw().getHeight()
    // 开始绘制
    ctx2d.save()
    this.draw.getPdf().setGState(new GState({
      opacity
    }))
    ctx2d.globalAlpha = opacity
    ctx2d.font = `${size * scale}px ${font}`
    const measureText = this.draw.getFakeCtx().measureText(data)
    if (repeat) {
      const dpr = this.draw.getPagePixelRatio()
      const temporaryCanvas = document.createElement('canvas')
      const temporaryCtx = temporaryCanvas.getContext('2d')!
      // 勾股定理计算旋转后的宽高对角线尺寸 a^2 + b^2 = c^2
      const textWidth = measureText.width
      const textHeight =
        measureText.actualBoundingBoxAscent +
        measureText.actualBoundingBoxDescent
      const diagonalLength = Math.sqrt(
        Math.pow(textWidth, 2) + Math.pow(textHeight, 2)
      )
      // 加上 gap 间距
      const patternWidth = diagonalLength + 2 * gap[0] * scale
      const patternHeight = diagonalLength + 2 * gap[1] * scale
      // 宽高设置
      temporaryCanvas.width = patternWidth
      temporaryCanvas.height = patternHeight
      temporaryCanvas.style.width = `${patternWidth * dpr}px`
      temporaryCanvas.style.height = `${patternHeight * dpr}px`
      // 旋转45度
      temporaryCtx.translate(patternWidth / 2, patternHeight / 2)
      temporaryCtx.rotate((-45 * Math.PI) / 180)
      temporaryCtx.translate(-patternWidth / 2, -patternHeight / 2)
      // 绘制文本
      temporaryCtx.font = `${size * scale}px ${font}`
      temporaryCtx.fillStyle = color
      temporaryCtx.fillText(
        data,
        (patternWidth - textWidth) / 2,
        (patternHeight - textHeight) / 2 + measureText.actualBoundingBoxAscent
      )
      // 创建平铺模式
      // const pattern = this.draw.getDraw().getCtx().createPattern(temporaryCanvas, 'repeat')
      // if (pattern) {
      ctx2d.createPattern()
      // ctx2d.fillStyle = pattern
      ctx2d.fillRect(0, 0, width, height)
      // }
    } else {
      const x = width / 2.8
      const y = height
      ctx2d.globalAlpha = opacity
      ctx2d.font = `${size * scale}px ${font}`
      ctx2d.fillStyle = color
      // 移动到中心位置再旋转
      ctx2d.translate(x, y)
      ctx2d.rotate((-45 * Math.PI) / 180)
      console.log(size, y)
      ctx2d.fillText(
        data,
        -measureText.width / 2,
        measureText.actualBoundingBoxAscent - (size * 2)
      )
    }
    this.draw.getPdf().setGState(new GState({
      opacity: 1
    }))
    ctx2d.restore()
  }
}
