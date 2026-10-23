import { Context2d } from 'jspdf'
import { NBSP, ZERO } from '../../../dataset/constant/Common'
import { CheckboxMarkType } from '../../../dataset/enum/Common'
import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { DrawPdf } from '../DrawPdf'

interface ICheckboxRenderOption {
  ctx2d: Context2d
  x: number
  y: number
  row: IRow
  index: number
}

export class CheckboxParticle {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
  }

  public setSelect(element: IElement) {
    const { checkbox } = element
    if (checkbox) {
      checkbox.value = !checkbox.value
    } else {
      element.checkbox = {
        value: true
      }
    }
    this.draw.render({
      isCompute: false,
      isSetCursor: false
    })
  }

  public render(payload: ICheckboxRenderOption) {
    const { ctx2d, x, index, row } = payload
    let { y } = payload
    const {
      checkbox: {
        gap,
        lineWidth,
        fillStyle,
        strokeStyle,
        checkFillStyle,
        checkStrokeStyle,
        checkMarkColor,
        markType,
        verticalAlign
      },
      scale
    } = this.options
    const { metrics, checkbox, control } = row.elementList[index]
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
    // 绘制勾选状态
    if (checkbox?.value) {
      // 选中时填充背景
      ctx2d.fillStyle = checkFillStyle
      ctx2d.fillRect(left, top, width, height)
      // 选中时绘制边框
      ctx2d.beginPath()
      ctx2d.lineWidth = lineWidth
      ctx2d.strokeStyle = checkStrokeStyle
      ctx2d.rect(left, top, width, height)
      ctx2d.stroke()
      // 勾选标记：元素 > 控件 > 全局配置
      ctx2d.beginPath()
      ctx2d.strokeStyle = checkMarkColor
      ctx2d.lineWidth = lineWidth * 2 * scale
      const checkMarkType = checkbox.markType || control?.markType || markType
      if (checkMarkType === CheckboxMarkType.CROSS) {
        // 叉号
        const padding = 3 * scale
        ctx2d.moveTo(left + padding, top + padding)
        ctx2d.lineTo(left + width - padding, top + height - padding)
        ctx2d.moveTo(left + width - padding, top + padding)
        ctx2d.lineTo(left + padding, top + height - padding)
      } else {
        // 对号
        ctx2d.moveTo(left + 2 * scale, top + height / 2)
        ctx2d.lineTo(left + width / 2, top + height - 3 * scale)
        ctx2d.lineTo(left + width - 2 * scale, top + 3 * scale)
      }
      ctx2d.stroke()
    } else {
      // 未选中时填充背景
      ctx2d.fillStyle = fillStyle
      ctx2d.fillRect(left, top, width, height)
      // 未选中时绘制边框
      ctx2d.beginPath()
      ctx2d.lineWidth = lineWidth
      ctx2d.strokeStyle = strokeStyle
      ctx2d.rect(left, top, width, height)
      ctx2d.stroke()
    }
    ctx2d.closePath()
    ctx2d.restore()
  }
}
