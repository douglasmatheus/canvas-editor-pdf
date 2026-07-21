import { Context2d } from 'jspdf'
import { ZERO } from '../../../dataset/constant/Common'
import { ulStyleMapping } from '../../../dataset/constant/List'
import { ElementType } from '../../../dataset/enum/Element'
import { KeyMap } from '../../../dataset/enum/KeyMap'
import { ListStyle, ListType, UlStyle } from '../../../dataset/enum/List'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
// import { getUUID } from '../../../utils'
// import { RangeManager } from '../../range/RangeManager'
import { DrawPdf } from '../DrawPdf'
// import { IElement } from '@hufe921/canvas-editor'

export class ListParticle {
  private draw: DrawPdf
  // private range: RangeManager
  private options: DeepRequired<IEditorOption>

  // 非递增样式直接返回默认值
  private readonly UN_COUNT_STYLE_WIDTH = 20
  private readonly MEASURE_BASE_TEXT = '0'
  private readonly LIST_GAP = 10
  // 每一级列表的缩进宽度（用于嵌套列表）
  public readonly LIST_INDENT_WIDTH = 30

  constructor(draw: DrawPdf) {
    this.draw = draw
    // this.range = draw.getRange()
    this.options = draw.getOptions()
  }

  // public setList(listType: ListType | null, listStyle?: ListStyle) {
  //   const isReadonly = this.draw.isReadonly()
  //   if (isReadonly) return
  //   const { startIndex, endIndex } = this.range.getRange()
  //   if (!~startIndex && !~endIndex) return
  //   // 需要改变的元素列表
  //   const changeElementList = this.range.getRangeParagraphElementList()
  //   if (!changeElementList || !changeElementList.length) return
  //   // 如果包含列表则设置为取消列表
  //   const isUnsetList = changeElementList.find(
  //     el => el.listType === listType && el.listStyle === listStyle
  //   )
  //   if (isUnsetList || !listType) {
  //     this.unsetList()
  //     return
  //   }
  //   // 设置值
  //   const listId = getUUID()
  //   changeElementList.forEach(el => {
  //     el.listId = listId
  //     el.listType = listType
  //     el.listStyle = listStyle
  //   })
  //   // 光标定位
  //   const isSetCursor = startIndex === endIndex
  //   const curIndex = isSetCursor ? endIndex : startIndex
  //   this.draw.render({ curIndex, isSetCursor })
  // }

  // public unsetList() {
  //   const isReadonly = this.draw.isReadonly()
  //   if (isReadonly) return
  //   const { startIndex, endIndex } = this.range.getRange()
  //   if (!~startIndex && !~endIndex) return
  //   // 需要改变的元素列表
  //   const changeElementList = this.range
  //     .getRangeParagraphElementList()
  //     ?.filter(el => el.listId)
  //   if (!changeElementList || !changeElementList.length) return
  //   // 如果列表最后字符不是换行符则需插入换行符
  //   const elementList = this.draw.getElementList()
  //   const endElement = elementList[endIndex]
  //   if (endElement.listId) {
  //     let start = endIndex + 1
  //     while (start < elementList.length) {
  //       const element = elementList[start]
  //       if (element.value === ZERO && !element.listWrap) break
  //       if (element.listId !== endElement.listId) {
  //         this.draw.spliceElementList(elementList, start, 0, {
  //           value: ZERO
  //         })
  //         break
  //       }
  //       start++
  //     }
  //   }
  //   // 取消设置
  //   changeElementList.forEach(el => {
  //     delete el.listId
  //     delete el.listType
  //     delete el.listStyle
  //     delete el.listWrap
  //   })
  //   // 光标定位
  //   const isSetCursor = startIndex === endIndex
  //   const curIndex = isSetCursor ? endIndex : startIndex
  //   this.draw.render({ curIndex, isSetCursor })
  // }

  public computeListStyle(
    ctx2d: Context2d,
    elementList: IElement[]
  ): Map<string, number> {
    const listStyleMap = new Map<string, number>()
    let start = 0
    if (!elementList[start]) return listStyleMap
    let curListId = elementList[start].listId
    let curElementList: IElement[] = []
    const elementLength = elementList.length
    while (start < elementLength) {
      const curElement = elementList[start]
      if (curListId && curListId === curElement.listId) {
        curElementList.push(curElement)
      } else {
        if (curElement.listId && curElement.listId !== curListId) {
          // 列表结束
          if (curElementList.length) {
            const width = this.getListStyleWidth(ctx2d, curElementList)
            listStyleMap.set(curListId!, width)
          }
          curListId = curElement.listId
          curElementList = curListId ? [curElement] : []
        }
      }
      start++
    }
    if (curElementList.length) {
      const width = this.getListStyleWidth(ctx2d, curElementList)
      listStyleMap.set(curListId!, width)
    }
    return listStyleMap
  }

  private findStyledElement(elementList: IElement[]): IElement {
    let styleElement = elementList[0]
    for (let i = 1; i < elementList.length; i++) {
      const element = elementList[i]
      if (element.font || element.size || element.bold || element.italic) {
        styleElement = element
        break
      }
    }
    return styleElement
  }

  private getListFontStyle(elementList: IElement[], scale: number): string {
    if (this.options.list.inheritStyle) {
      const styleElement = this.findStyledElement(elementList)
      return this.draw.getElementFont(styleElement, scale)
    } else {
      const { defaultFont, defaultSize } = this.options
      return `${defaultSize * scale}px ${defaultFont}`
    }
  }

   public getListStyleWidth(
    ctx2d: Context2d,
    listElementList: IElement[]
  ): number {
    const { scale, checkbox } = this.options
    const startElement = listElementList[0]
    // 非递增样式返回固定值
    if (
      startElement.listStyle &&
      startElement.listStyle !== ListStyle.DECIMAL
    ) {
      if (startElement.listStyle === ListStyle.CHECKBOX) {
        return (checkbox.width + this.LIST_GAP) * scale
      }
      return this.UN_COUNT_STYLE_WIDTH * scale
    }
    // 计算列表数量
    const count = listElementList.reduce((pre, cur) => {
      if (cur.value === ZERO) {
        pre += 1
      }
      return pre
    }, 0)
    if (!count) return 0
    ctx2d.save()
    ctx2d.font = this.getListFontStyle(listElementList, scale)
    // 以递增样式最大宽度为准
    const text = `${this.MEASURE_BASE_TEXT.repeat(String(count).length - 1 || 1)}${
      KeyMap.PERIOD
    }`
    const textMetrics = this.draw.getFakeCtx().measureText(text)
    ctx2d.restore()
    return Math.ceil((textMetrics.width + this.LIST_GAP) * scale)
  }

  public drawListStyle(
    ctx2d: Context2d,
    row: IRow,
    position: IElementPosition
  ) {
    const { elementList, offsetX, listIndex, ascent } = row
    const startElement = elementList[0]
    if (startElement.value !== ZERO || startElement.listWrap) return
    // tab width
    let tabWidth = 0
    const { defaultTabWidth, scale } = this.options
    for (let i = 1; i < elementList.length; i++) {
      const element = elementList[i]
      if (element?.type !== ElementType.TAB) break
      tabWidth += defaultTabWidth * scale
    }
    // 列表样式渲染
    const {
      coordinate: {
        leftTop: [startX, startY]
      }
    } = position
    // 嵌套列表按层级缩进标记位置
    const indentWidth = startElement.listLevel
      ? this.LIST_INDENT_WIDTH * startElement.listLevel * scale
      : 0
    const x = startX - offsetX! + indentWidth + tabWidth
    const y = startY + ascent
    // 复选框样式特殊处理
    if (startElement.listStyle === ListStyle.CHECKBOX) {
      const { width, height, gap } = this.options.checkbox
      const checkboxRowElement: IRowElement = {
        ...startElement,
        checkbox: {
          value: !!startElement.checkbox?.value
        },
        metrics: {
          ...startElement.metrics,
          width: (width + gap * 2) * scale,
          height: height * scale
        }
      }
      this.draw.getCheckboxParticle().render({
        ctx2d,
        x: x - gap * scale,
        y,
        index: 0,
        row: {
          ...row,
          elementList: [checkboxRowElement, ...row.elementList]
        }
      })
    } else {
      let text = ''
      if (startElement.listType === ListType.UL) {
        // 无序列表按层级轮换项目符号（level 0 用配置样式）
        const level = startElement.listLevel ?? 0
        const rotation = [UlStyle.DISC, UlStyle.CIRCLE, UlStyle.SQUARE]
        const rotated = rotation[level % rotation.length]
        const fallbackStyle =
          level === 0
            ? <UlStyle>(<unknown>startElement.listStyle) || UlStyle.DISC
            : rotated
        text = ulStyleMapping[fallbackStyle] || ulStyleMapping[UlStyle.DISC]
      } else {
        text = `${listIndex! + 1}${KeyMap.PERIOD}`
      }
      if (!text) return
      ctx2d.save()
      ctx2d.font = this.getListFontStyle(elementList, scale)
      ctx2d.fillText(text, x, y)
      ctx2d.restore()
    }
  }
}
