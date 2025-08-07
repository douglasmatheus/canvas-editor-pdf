import { Context2d, GState } from 'jspdf'
// import { IEditorOption } from '@hufe921/canvas-editor'
import { DeepRequired } from '../../../interface/Common'
import { DrawPdf } from '../DrawPdf'
import { IEditorOption } from '../../../interface/Editor'
import { FORMAT_PLACEHOLDER } from '../../../dataset/constant/PageNumber'
import { PageNumber } from './PageNumber'
import { WatermarkType } from '../../../dataset/enum/Watermark'

export class Watermark {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>
  private imageCache: Map<string, HTMLImageElement>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = <DeepRequired<IEditorOption>>draw.getOptions()
    this.imageCache = new Map()
  }

  public renderText(ctx2d: Context2d, pageNo: number) {
    const {
      watermark: { data, opacity, font, size, color, repeat, gap, numberType },
      scale
    } = this.options
    const width = this.draw.getWidth()
    const height = this.draw.getHeight()
    // 开始绘制
    ctx2d.save()
    this.draw.getPdf().setGState(new GState({
      opacity
    }))
    ctx2d.globalAlpha = opacity
    ctx2d.font = `${size * scale}px ${font}`
    // 格式化文本
    let text = data
    const pageNoReg = new RegExp(FORMAT_PLACEHOLDER.PAGE_NO)
    if (pageNoReg.test(text)) {
      text = PageNumber.formatNumberPlaceholder(
        text,
        pageNo + 1,
        pageNoReg,
        numberType
      )
    }
    const pageCountReg = new RegExp(FORMAT_PLACEHOLDER.PAGE_COUNT)
    if (pageCountReg.test(text)) {
      text = PageNumber.formatNumberPlaceholder(
        text,
        this.draw.getPageCount(),
        pageCountReg,
        numberType
      )
    }
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
      // console.log(size, y)
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

  public renderImage(ctx2d: Context2d) {
    const {
      watermark: { width, height, data, opacity, repeat, gap },
      scale
    } = this.options
    if (!this.imageCache.has(data)) {
      // const img = new Image()
      // img.setAttribute('crossOrigin', 'Anonymous')
      // img.src = data
      // img.onload = () => {
      //   this.imageCache.set(data, img)
      //   // 避免层级上浮，触发编辑器二次渲染
      //   this.draw.render({
      //     isCompute: false,
      //     isSubmitHistory: false
      //   })
      // }
      // return
    }
    const docWidth = this.draw.getWidth()
    const docHeight = this.draw.getHeight()
    const imageWidth = width * scale
    const imageHeight = height * scale
    // 开始绘制
    ctx2d.save()
    ctx2d.globalAlpha = opacity
    if (repeat) {
      const dpr = this.draw.getPagePixelRatio()
      const temporaryCanvas = document.createElement('canvas')
      const temporaryCtx = temporaryCanvas.getContext('2d')!
      // 勾股定理计算旋转后的宽高对角线尺寸 a^2 + b^2 = c^2
      const diagonalLength = Math.sqrt(
        Math.pow(imageWidth, 2) + Math.pow(imageHeight, 2)
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
      // 绘制图片
      temporaryCtx.drawImage(
        this.imageCache.get(data)!,
        (patternWidth - imageWidth) / 2,
        (patternHeight - imageHeight) / 2,
        imageWidth,
        imageHeight
      )
      // 创建平铺模式
      // const pattern = ctx2d.createPattern(temporaryCanvas, 'repeat')
      ctx2d.createPattern()
      // if (pattern) {
      //   ctx2d.fillStyle = pattern
      ctx2d.fillRect(0, 0, docWidth, docHeight)
      // }
    } else {
      // const x = docWidth / 2
      // const y = docHeight / 2
      // ctx2d.translate(x, y)
      // ctx2d.rotate((-45 * Math.PI) / 180)
      // const angle = 45 * Math.PI / 180 // em radianos
      // const centerX = imageWidth / 2
      // const centerY = imageHeight / 2

      // Para rotacionar pelo centro, ajuste x e y:
      // const x = centerX + (imageWidth / 2)
      // console.log('x, centerX, docWidth, imageWidth')
      // console.log(x, centerX, docWidth, imageWidth)
      // const y = centerY + (imageHeight / 2)
      // console.log('y, centerY, docHeight, imageHeight')
      // console.log(y, centerY, docHeight, imageHeight)
      // console.log('(docWidth - (docWidth * 45) / 100)')
      // console.log((docWidth - (docWidth * 45) / 100))
      // console.log((docHeight - (docHeight * 35) / 100))
      this.draw.getPdf().addImage(
        data,
        'PNG', // ou outro formato
        ((docWidth * 45) / 100),
        ((docHeight * 35) / 100),
        imageWidth,
        imageHeight,
        undefined,
        'FAST',
        45
      )
    }
    ctx2d.restore()
  }

  public render(ctx2d: Context2d, pageNo: number) {
    if (this.options.watermark.type === WatermarkType.IMAGE) {
      this.renderImage(ctx2d)
    } else {
      this.renderText(ctx2d, pageNo)
    }
  }
}