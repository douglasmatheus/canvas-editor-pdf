import { Context2d } from 'jspdf'
import { DrawPdf } from '../DrawPdf'
import { /*deepClone, */getUUID, isNonValue } from '../../../utils'
import { ElementType } from '../../../dataset/enum/Element'
import {
  IArea,
  IAreaInfo,
  IGetAreaValueOption,
  IGetAreaValueResult,
  // IInsertAreaOption,
  ISetAreaPropertiesOption
} from '../../../interface/Area'
// import { EditorMode/*, EditorZone*/ } from '../../../dataset/enum/Editor'
// import { LocationPosition } from '../../../dataset/enum/Common'
// import { RangeManager } from '../../range/RangeManager'
// import { Zone } from '../../zone/Zone'
import { Position } from '../../position/Position'
import { zipElementList } from '../../../utils/element'
import { AreaMode } from '../../../dataset/enum/Area'
// import { IRange } from '../../../interface/Range'
import { IElement, IElementPosition } from '../../../interface/Element'
import { Placeholder } from '../frame/Placeholder'
import { defaultPlaceholderOption } from '../../../dataset/constant/Placeholder'
import { ITd } from '../../../interface/table/Td'
import { IEditorOption } from '../../..'
import { DeepRequired } from '../../../interface/Common'

export class Area {
  private draw: DrawPdf
  // private zone: Zone
  // private range: RangeManager
  private position: Position
  private options: DeepRequired<IEditorOption>
  private areaInfoMap = new Map<string, IAreaInfo>()

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    // this.zone = draw.getZone()
    // this.range = draw.getRange()
    this.position = draw.getPosition()
  }

  public getAreaInfo(): Map<string, IAreaInfo> {
    return this.areaInfoMap
  }

  public getActiveAreaId(): string | null {
    if (!this.areaInfoMap.size) return null
    // const { startIndex } = this.range.getRange()
    // const elementList = this.draw.getElementList()
    // const element = elementList[startIndex]
    // return element?.areaId || null
    return null
  }

  public getActiveAreaInfo(): IAreaInfo | null {
    const activeAreaId = this.getActiveAreaId()
    if (!activeAreaId) return null
    return this.areaInfoMap.get(activeAreaId) || null
  }

  public isReadonly() {
    const activeAreaInfo = this.getActiveAreaInfo()
    if (!activeAreaInfo) return false
    switch (activeAreaInfo.area.mode) {
      case AreaMode.EDIT:
        return false
      case AreaMode.READONLY:
        return true
      // case AreaMode.FORM:
      //   return !this.draw.getControl().getIsRangeWithinControl()
      default:
        return false
    }
  }

  public insertArea(): string | null {
    // // 切换至正文
    // if (this.zone.getZone() !== EditorZone.MAIN) {
    //   this.zone.setZone(EditorZone.MAIN)
    // }
    // // 设置插入位置
    // const { id, value, area, position } = payload
    // if (position === LocationPosition.BEFORE) {
    //   this.range.setRange(0, 0)
    // } else {
    //   const elementList = this.draw.getOriginalMainElementList()
    //   const lastIndex = elementList.length - 1
    //   this.range.setRange(lastIndex, lastIndex)
    // }
    const areaId = getUUID()
    // this.draw.insertElementList([
    //   {
    //     type: ElementType.AREA,
    //     value: '',
    //     areaId,
    //     valueList: value,
    //     area: deepClone(area)
    //   }
    // ])
    return areaId
  }

  public render(ctx2d: Context2d, pageNo: number) {
    if (!this.areaInfoMap.size) return
    ctx2d.save()
    const margins = this.draw.getMargins()
    const width = this.draw.getInnerWidth()
    for (const areaInfoItem of this.areaInfoMap) {
      const { area, positionList } = areaInfoItem[1]
      if (
        area?.hide ||
        (!area?.backgroundColor && !area?.borderColor && !area?.placeholder)
      ) {
        continue
      }
      const pagePositionList = positionList.filter(p => p.pageNo === pageNo)
      if (!pagePositionList.length) continue
      ctx2d.translate(0.5, 0.5)
      const firstPosition = pagePositionList[0]
      const lastPosition = pagePositionList[pagePositionList.length - 1]
      const tableCell = areaInfoItem[1].tableCell
      const isTableArea = !!tableCell
      const tdPadding = this.draw.getTdPadding()
      // 起始位置
      const x = isTableArea
        ? tableCell.tablePosition.coordinate.leftTop[0] +
          tableCell.td.x! * this.options.scale +
          tdPadding[3]
        : margins[3]
      const y = Math.ceil(firstPosition.coordinate.leftTop[1])
      const height = Math.ceil(lastPosition.coordinate.rightBottom[1] - y)
      const areaWidth = isTableArea
        ? tableCell.td.width! * this.options.scale - tdPadding[1] - tdPadding[3]
        : width
      // 背景色
      if (area.backgroundColor) {
        ctx2d.fillStyle = area.backgroundColor
        ctx2d.fillRect(x, y, areaWidth, height)
      }
      // 边框
      if (area.borderColor) {
        ctx2d.strokeStyle = area.borderColor
        ctx2d.strokeRect(x, y, areaWidth, height)
      }
      // 提示词
      if (area.placeholder && positionList.length <= 1) {
        const placeholder = new Placeholder(this.draw)
        placeholder.render(ctx2d, {
          placeholder: {
            ...defaultPlaceholderOption,
            ...area.placeholder
          },
          startY: firstPosition.coordinate.leftTop[1]
        })
      }
      ctx2d.translate(-0.5, -0.5)
    }
    ctx2d.restore()
  }

  public compute() {
    this.areaInfoMap.clear()
    const elementList = this.draw.getOriginalMainElementList()
    const positionList = this.position.getOriginalMainPositionList()
    this.computeAreaInfo(elementList, positionList, elementList)
  }

  private computeAreaInfo(
    elementList: IElement[],
    positionList: IElementPosition[] = [],
    sourceElementList: IElement[],
    inheritedAreaId?: string,
    tableCell?: IAreaInfo['tableCell']
  ) {
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      const areaId = element.areaId
      const position = positionList[e]
      if (areaId && areaId !== inheritedAreaId) {
        const areaInfo = this.areaInfoMap.get(areaId)
        if (!areaInfo) {
          this.areaInfoMap.set(areaId, {
            id: areaId,
            area: element.area!,
            elementList: [element],
            positionList: position ? [position] : [],
            sourceElementList,
            tableCell
          })
        } else {
          areaInfo.elementList.push(element)
          if (position) {
            areaInfo.positionList.push(position)
          }
        }
      }
      if (element.type === ElementType.TABLE && element.trList) {
        this.computeTableAreaInfo(element, position, areaId)
      }
    }
  }

  private computeTableAreaInfo(
    tableElement: IElement,
    tablePosition?: IElementPosition,
    inheritedAreaId?: string
  ) {
    const trList = tableElement.trList!
    for (let r = 0; r < trList.length; r++) {
      const tr = trList[r]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td: ITd = tr.tdList[d]
        this.computeAreaInfo(
          td.value,
          td.positionList,
          td.value,
          inheritedAreaId,
          tablePosition
            ? {
                td,
                tablePosition
              }
            : undefined
        )
      }
    }
  }

  public getAreaValue(
    options: IGetAreaValueOption = {}
  ): IGetAreaValueResult | null {
    const areaId = options.id || this.getActiveAreaId()
    if (!areaId) return null
    const areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) return null
    return {
      area: areaInfo.area,
      id: areaInfo.id,
      startPageNo: areaInfo.positionList[0].pageNo,
      endPageNo: areaInfo.positionList[areaInfo.positionList.length - 1].pageNo,
      value: zipElementList(areaInfo.elementList)
    }
  }

  public setAreaProperties(payload: ISetAreaPropertiesOption) {
    const areaId = payload.id || this.getActiveAreaId()
    if (!areaId) return
    const areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) return
    if (!areaInfo.area) {
      areaInfo.area = {}
    }
    // 需要计算的属性
    let isCompute = false
    const computeProps: Array<keyof IArea> = ['top', 'hide']
    // 循环设置
    Object.entries(payload.properties).forEach(([key, value]) => {
      if (isNonValue(value)) return
      const propKey = key as keyof IArea
      areaInfo.area[propKey] = value
      if (computeProps.includes(propKey)) {
        isCompute = true
      }
    })
    this.draw.render({
      isCompute,
      isSetCursor: false
    })
  }
}