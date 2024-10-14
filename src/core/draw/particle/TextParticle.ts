import { Context2d } from 'jspdf'
import { ElementType, IEditorOption, IElement, RenderMode } from '@hufe921/canvas-editor'
import {
  PUNCTUATION_LIST,
  METRICS_BASIS_TEXT
} from '../../../dataset/constant/Common'
import { DeepRequired } from '../../../interface/Common'
import { IRowElement } from '../../../interface/Row'
import { ITextMetrics } from '../../../interface/Text'
import { DrawPdf } from '../DrawPdf'

export interface IMeasureWordResult {
  width: number
  endElement: IElement
}

export class TextParticle {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>

  private ctx2d: Context2d
  private curX: number
  private curY: number
  private text: string
  private curStyle: string
  private curColor?: string
  public cacheMeasureText: Map<string, TextMetrics>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getDraw().getOptions()
    this.ctx2d = draw.getCtx2d()
    this.curX = -1
    this.curY = -1
    this.text = ''
    this.curStyle = ''
    this.cacheMeasureText = new Map()
  }

  public measureBasisWord(
    ctx2d: Context2d,
    font: string
  ): ITextMetrics {
    ctx2d.save()
    ctx2d.font = font
    const textMetrics = this.measureText(ctx2d, {
      value: METRICS_BASIS_TEXT
    })
    ctx2d.restore()
    return textMetrics
  }

  public measureWord(
    ctx2d: Context2d,
    elementList: IElement[],
    curIndex: number
  ): IMeasureWordResult {
    const LETTER_REG = this.draw.getLetterReg()
    let width = 0
    let endElement: IElement = elementList[curIndex]
    let i = curIndex
    while (i < elementList.length) {
      const element = elementList[i]
      if (
        (element.type && element.type !== ElementType.TEXT) ||
        !LETTER_REG.test(element.value)
      ) {
        endElement = element
        break
      }
      width += this.measureText(ctx2d, element).width
      i++
    }
    return {
      width,
      endElement
    }
  }

  public measurePunctuationWidth(
    ctx2d: Context2d,
    element: IElement
  ): number {
    if (!element || !PUNCTUATION_LIST.includes(element.value)) return 0
    return this.measureText(ctx2d, element).width
  }

  public measureText(
    ctx2d: Context2d,
    element: IElement
  ): ITextMetrics {
    // 优先使用自定义字宽设置
    if (element.width) {
      const textMetrics = this.draw.getFakeCtx().measureText(element.value)
      // TextMetrics是类无法解构
      return {
        width: element.width,
        actualBoundingBoxAscent: textMetrics.actualBoundingBoxAscent,
        actualBoundingBoxDescent: textMetrics.actualBoundingBoxDescent,
        actualBoundingBoxLeft: textMetrics.actualBoundingBoxLeft,
        actualBoundingBoxRight: textMetrics.actualBoundingBoxRight,
        fontBoundingBoxAscent: textMetrics.fontBoundingBoxAscent,
        fontBoundingBoxDescent: textMetrics.fontBoundingBoxDescent
      }
    }
    const id = `${element.value}${ctx2d.font}`
    const cacheTextMetrics = this.cacheMeasureText.get(id)
    if (cacheTextMetrics) {
      return cacheTextMetrics
    }
    const textMetrics = this.draw.getFakeCtx().measureText(element.value)
    this.cacheMeasureText.set(id, textMetrics)
    return textMetrics
  }

  public complete() {
    this._render()
    this.text = ''
  }

  public record(
    ctx2d: Context2d,
    element: IRowElement,
    x: number,
    y: number
  ) {
    this.ctx2d = ctx2d
    // 兼容模式立即绘制
    if (this.options.renderMode === RenderMode.COMPATIBILITY) {
      this._setCurXY(x, y)
      this.text = element.value
      this.curStyle = element.style
      this.curColor = element.color
      this.complete()
      return
    }
    // 主动完成的重设起始点
    if (!this.text) {
      this._setCurXY(x, y)
    }
    // 样式发生改变
    if (
      (this.curStyle && element.style !== this.curStyle) ||
      element.color !== this.curColor
    ) {
      this.complete()
      this._setCurXY(x, y)
    }
    this.text += element.value
    this.curStyle = element.style
    this.curColor = element.color
  }

  private _setCurXY(x: number, y: number) {
    this.curX = x
    this.curY = y
  }

  private _render() {
    if (!this.text || !~this.curX || !~this.curX) return
    this.ctx2d.save()
    if (this.curStyle.includes('Microsoft YaHei')) {
      this.curStyle = this.curStyle.replace('Microsoft YaHei', 'Yahei')
    }
    this.ctx2d.font = this.curStyle
    this.ctx2d.fillStyle = this.curColor || this.options.defaultColor
    this.ctx2d.fillText(this.text, this.curX, this.curY)
    this.ctx2d.restore()
  }
}
