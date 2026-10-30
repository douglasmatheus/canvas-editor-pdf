import type { Context2d } from 'jspdf'
import type { IRenderContext } from '../../render/model/RenderContext'
import { DisplayList } from '../../render/model/DisplayList'
import { setCanvasFont, TextMeasurer } from '../../layout/TextMeasurer'
import { PUNCTUATION_LIST } from '../../../dataset/constant/Common'
import { IRowElement } from '../../../interface/Row'
import { ITextMetrics } from '../../../interface/Text'
import { DrawPdf } from '../DrawPdf'
import { DeepRequired } from '../../../interface/Common'
import { IElement } from '../../../interface/Element'
import { IEditorOption } from '../../../interface/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { RenderMode } from '../../../dataset/enum/Editor'

export interface IMeasureWordResult {
  width: number
  endElement: IElement | null
}

export class TextParticle {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>

  private ctx2d: IRenderContext
  private curX: number
  private curY: number
  private text: string
  private bold?: boolean
  // private size: number
  private italic?: boolean
  private curStyle: string
  private curColor?: string
  private textMeasurer: TextMeasurer

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    this.ctx2d = new DisplayList()
    this.curX = -1
    this.curY = -1
    this.text = ''
    this.bold = false
    // this.size = this.options.defaultSize
    this.italic = false
    this.curStyle = ''
    this.textMeasurer = draw.getTextMeasurer()
  }

  public measureBasisWord(
    ctx2d: Context2d | IRenderContext,
    font: string
  ): ITextMetrics {
    return this.textMeasurer.measureBasis(font, this._getMeasureCtx(ctx2d))
  }

  public measureWord(
    ctx2d: Context2d | IRenderContext,
    elementList: IElement[],
    curIndex: number
  ): IMeasureWordResult {
    const LETTER_REG = this.draw.getLetterReg()
    let width = 0
    let endElement: IElement | null = null
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
    ctx2d: Context2d | IRenderContext,
    element: IElement
  ): number {
    if (!element || !PUNCTUATION_LIST.includes(element.value)) return 0
    ctx2d.font = this.draw.getFont(element)
    return this.measureText(ctx2d, element).width
  }

  public measureText(
    ctx2d: Context2d | IRenderContext,
    element: IElement
  ): ITextMetrics {
    return this.textMeasurer.measure(
      element.value === `\n` ? { ...element, value: '' } : element,
      ctx2d.font,
      this._getMeasureCtx(ctx2d)
    )
  }

  // canvas-editor-pdf: upstream measures on the very canvas its caller just
  // set the font on. ctx2d here is jsPDF's Context2d (or a DisplayList), which
  // can't measure, so carry its font over to the platform measuring canvas.
  private _getMeasureCtx(
    ctx2d: Context2d | IRenderContext
  ): CanvasRenderingContext2D {
    const measureCtx = this.draw.getFakeCtx()
    setCanvasFont(measureCtx, ctx2d.font)
    return measureCtx
  }

  public getBasisWordBoundingBoxAscent(
    ctx2d: Context2d | IRenderContext,
    font: string
  ): number {
    return this.measureBasisWord(ctx2d, font).actualBoundingBoxAscent
  }

  public complete() {
    this._render()
    this.text = ''
  }

  public record(
    ctx2d: IRenderContext,
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
      this.bold = element.bold
      // this.size = element.size || this.options.defaultSize
      this.italic = element.italic
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
    this.curStyle = element.style.toLocaleLowerCase()
    this.curColor = element.color
    this.bold = element.bold
    this.italic = element.italic
  }

  private _setCurXY(x: number, y: number) {
    this.curX = x
    this.curY = y
  }

  private _render() {
    if (!this.text || !~this.curX || !~this.curY) return
    this.ctx2d.save()
    // if (this.curStyle.includes('Microsoft YaHei')) {
    //   this.curStyle = this.curStyle.replace('Microsoft YaHei', 'Yahei')
    // }
    this.ctx2d.font = this.curStyle.toLowerCase()
    const fontWeight = this.bold ? 'bold' : 'normal'
    const fontItalic = this.italic ? 'italic' : ''
    // this.draw.getPdf().setFontSize(this.size)
    this.ctx2d.setFont(this.curStyle.split('px ')[1], fontItalic, fontWeight)
    this.ctx2d.setCharSpace(0.1) // https://jsfiddle.net/pg7byu80/5/
    // this.draw.getPdf().internal.write(0, "Tw")
    // this.draw.getPdf().text(this.text, this.curX, this.curY) // attempt to apply the font globally every time you add some text - currently unsuccessful
    this.ctx2d.save()
    this.ctx2d.fillStyle = this.curColor || this.options.defaultColor
    this.ctx2d.fillText(this.text, this.curX, this.curY)
    this.ctx2d.restore()
  }
}
