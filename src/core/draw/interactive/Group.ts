import { Context2d, GState } from 'jspdf'
// import { EditorZone } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
// import { DeepRequired } from '../../../interface/Common'
// import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementFillRect } from '../../../interface/Element'
import { IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
// import { getUUID } from '../../../utils'
// import { RangeManager } from '../../range/RangeManager'
import { DrawPdf } from '../DrawPdf'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'

export class Group {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>
  // private range: RangeManager
  private fillRectMap: Map<string, IElementFillRect>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    // this.range = draw.getRange()
    this.fillRectMap = new Map()
  }

  public setGroup(): string | null {
    // if (
    // this.draw.isReadonly()// ||
    // this.draw.getZone().getZone() !== EditorZone.MAIN
    // ) {
    //   return null
    // }
    // const selection = this.range.getSelection()
    // if (!selection) return null
    // const groupId = getUUID()
    // selection.forEach(el => {
    //   if (!Array.isArray(el.groupIds)) {
    //     el.groupIds = []
    //   }
    //   el.groupIds.push(groupId)
    // })
    this.draw.render({
      isSetCursor: false,
      isCompute: false
    })
    return null
    // return groupId
  }

  public getElementListByGroupId(
    elementList: IElement[],
    groupId: string
  ): IElement[] {
    const groupElementList: IElement[] = []
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (element.type === ElementType.TABLE) {
        const trList = element.trList!
        for (let r = 0; r < trList.length; r++) {
          const tr = trList[r]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const tdGroupElementList = this.getElementListByGroupId(
              td.value,
              groupId
            )
            if (tdGroupElementList.length) {
              groupElementList.push(...tdGroupElementList)
              return groupElementList
            }
          }
        }
      }
      if (element?.groupIds?.includes(groupId)) {
        groupElementList.push(element)
        const nextElement = elementList[e + 1]
        if (!nextElement?.groupIds?.includes(groupId)) break
      }
    }
    return groupElementList
  }

  public deleteGroup(groupId: string) {
    // 仅主体内容可以成组
    const elementList = this.draw.getOriginalMainElementList()
    const groupElementList = this.getElementListByGroupId(elementList, groupId)
    if (!groupElementList.length) return
    for (let e = 0; e < groupElementList.length; e++) {
      const element = groupElementList[e]
      const groupIds = element.groupIds!
      const groupIndex = groupIds.findIndex(id => id === groupId)
      groupIds.splice(groupIndex, 1)
      // 不包含成组时删除字段，减少存储及内存占用
      if (!groupIds.length) {
        delete element.groupIds
      }
    }
    this.draw.render({
      isSetCursor: false,
      isCompute: false
    })
  }

  public getContextByGroupId(
    elementList: IElement[],
    groupId: string
  ): (IRange & IPositionContext) | null {
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (element.type === ElementType.TABLE) {
        const trList = element.trList!
        for (let r = 0; r < trList.length; r++) {
          const tr = trList[r]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const range = this.getContextByGroupId(td.value, groupId)
            if (range) {
              return {
                ...range,
                isTable: true,
                index: e,
                trIndex: r,
                tdIndex: d,
                tdId: td.id,
                trId: tr.id,
                tableId: element.tableId
              }
            }
          }
        }
      }
      const nextElement = elementList[e + 1]
      if (
        element.groupIds?.includes(groupId) &&
        !nextElement?.groupIds?.includes(groupId)
      ) {
        return {
          isTable: false,
          startIndex: e,
          endIndex: e
        }
      }
    }
    return null
  }

  public clearFillInfo() {
    this.fillRectMap.clear()
  }

  public recordFillInfo(
    element: IElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const groupIds = element.groupIds
    if (!groupIds) return
    for (const groupId of groupIds) {
      const fillRect = this.fillRectMap.get(groupId)
      if (!fillRect) {
        this.fillRectMap.set(groupId, {
          x,
          y,
          width,
          height
        })
      } else {
        fillRect.width += width
      }
    }
  }

  public render(ctx2d: Context2d) {
    if (!this.fillRectMap.size) return
    const {
      group: { backgroundColor, opacity, activeOpacity, activeBackgroundColor }
    } = this.options
    // 当前激活组信息
    const elementList = this.draw.getElementList()
    const elementsWithGroupIds = elementList.filter(element => { return element.groupIds })
    const anchorGroupIds = elementsWithGroupIds.reduce((accum: any[], element) => {
      element.groupIds?.forEach(groupId => accum.push(groupId))

      return accum
    }, [])
    ctx2d.save()
    this.draw.getPdf().setGState(new GState({
      opacity: opacity
    }))
    this.fillRectMap.forEach((fillRect, groupId) => {
      const { x, y, width, height } = fillRect
      if (anchorGroupIds?.includes(groupId)) {
        ctx2d.globalAlpha = activeOpacity
        ctx2d.fillStyle = activeBackgroundColor
      } else {
        ctx2d.globalAlpha = opacity
        ctx2d.fillStyle = backgroundColor
      }
      ctx2d.fillRect(x, y, width, height)
    })
    this.draw.getPdf().setGState(new GState({
      opacity: 1
    }))
    ctx2d.restore()
    this.clearFillInfo()
  }
}
