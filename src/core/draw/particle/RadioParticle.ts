import { Context2d } from 'jspdf'
import { NBSP, ZERO } from '../../../dataset/constant/Common'
import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { DrawPdf } from '../DrawPdf'

interface IRadioRenderOption {
  ctx2d: Context2d
  x: number
  y: number
  row: IRow
  index: number
}

export class RadioParticle {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
  }

  public setSelect(element: IElement) {
    const { radio } = element
    if (radio) {
      radio.value = !radio.value
    } else {
      element.radio = {
        value: true
      }
    }
    this.draw.render({
      isCompute: false,
      isSetCursor: false
    })
  }

  public render(payload: IRadioRenderOption) {
    const { ctx2d, x, index, row } = payload
    let { y } = payload
    const {
      radio: { gap, lineWidth, fillStyle, strokeStyle, verticalAlign },
      scale
    } = this.options
    const { metrics, radio } = row.elementList[index]
    // 垂直布局设置
    if (
      verticalAlign === VerticalAlign.TOP ||
      verticalAlign === VerticalAlign.MIDDLE
    ) {
      let nextIndex = index + 1
      let nextElement: IRowElement | null = null
      while (nextIndex < row.elementList.length) {
        nextElement = row.elementList[nextIndex]
        if (nextElement.value !== ZERO && nextElement.value !== NBSP) break
        nextIndex++
      }
      // 以后一个非空格元素为基准
      if (nextElement) {
        const {
          metrics: { boundingBoxAscent, boundingBoxDescent }
        } = nextElement
        const textHeight = boundingBoxAscent + boundingBoxDescent
        if (textHeight > metrics.height) {
          if (verticalAlign === VerticalAlign.TOP) {
            y -= boundingBoxAscent - metrics.height
          } else if (verticalAlign === VerticalAlign.MIDDLE) {
            y -= (textHeight - metrics.height) / 2
          }
        }
      }
    }
    // left top 四舍五入避免1像素问题
    const left = Math.round(x + gap * scale)
    const top = Math.round(y - metrics.height + lineWidth)
    const width = metrics.width - gap * 2 * scale
    const height = metrics.height
    ctx2d.save()
    ctx2d.beginPath()
    ctx2d.translate(0.5, 0.5)
    // 边框
    ctx2d.strokeStyle = radio?.value ? fillStyle : strokeStyle
    ctx2d.lineWidth = lineWidth
    ctx2d.arc(left + width / 2, top + height / 2, width / 2, 0, Math.PI * 2, true)
    ctx2d.stroke()
    // 填充选中色
    if (radio?.value) {
      ctx2d.beginPath()
      ctx2d.fillStyle = fillStyle
      ctx2d.arc(left + width / 2, top + height / 2, width / 3, 0, Math.PI * 2, true)
      ctx2d.fill()
    }
    ctx2d.closePath()
    ctx2d.restore()
  }
}
