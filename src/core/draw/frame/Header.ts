import { Context2d } from 'jspdf'
import { maxHeightRadioMapping } from '../../../dataset/constant/Common'
import { EditorZone } from '../../../dataset/enum/Editor'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { pickSurroundElementList } from '../../../utils/element'
import { Position } from '../../position/Position'
import { DrawPdf } from '../DrawPdf'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
// import { IElement } from '@hufe921/canvas-editor'
// import { IElementPosition } from '@hufe921/canvas-editor/dist/src/editor/interface/Element'
// import { IRow } from '@hufe921/canvas-editor/dist/src/editor/interface/Row'

export class Header {
  private draw: DrawPdf
  private position: Position
  private options: DeepRequired<IEditorOption>

  private elementList: IElement[]
  private rowList: IRow[]
  private positionList: IElementPosition[]

  constructor(draw: DrawPdf, data?: IElement[]) {
    this.draw = draw
    this.position = draw.getPosition()
    this.options = draw.getOptions()

    this.elementList = data || []
    this.rowList = []
    this.positionList = []
  }

  public getRowList(): IRow[] {
    return this.rowList
  }

  public setElementList(elementList: IElement[]) {
    this.elementList = elementList
  }

  public getElementList(): IElement[] {
    return this.elementList
  }

  public getPositionList(): IElementPosition[] {
    return this.positionList
  }

  public compute() {
    this.recovery()
    this._computeRowList()
    this._computePositionList()
  }

  public recovery() {
    this.rowList = []
    this.positionList = []
  }

  private _computeRowList() {
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    const surroundElementList = pickSurroundElementList(this.elementList)
    this.rowList = this.draw.computeRowList({
      startX: margins[3],
      startY: this.getHeaderTop(),
      innerWidth,
      elementList: this.elementList,
      surroundElementList
    })
  }

  private _computePositionList() {
    const headerTop = this.getHeaderTop()
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    const startX = margins[3]
    const startY = headerTop
    this.position.computePageRowPosition({
      positionList: this.positionList,
      rowList: this.rowList,
      pageNo: 0,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth,
      zone: EditorZone.HEADER
    })
  }

  public getHeaderTop(): number {
    const {
      header: { top, disabled },
      scale
    } = this.options
    if (disabled) return 0
    return Math.floor(top * scale)
  }

  public getMaxHeight(): number {
    const {
      header: { maxHeightRadio }
    } = this.options
    const height = this.draw.getHeight()
    return Math.floor(height * maxHeightRadioMapping[maxHeightRadio])
  }

  public getHeight(): number {
    const maxHeight = this.getMaxHeight()
    const rowHeight = this.getRowHeight()
    return rowHeight > maxHeight ? maxHeight : rowHeight
  }

  public getRowHeight(): number {
    return this.rowList.reduce((pre, cur) => pre + cur.height, 0)
  }

  public getExtraHeight(): number {
    // 页眉上边距 + 实际高 - 页面上边距
    const margins = this.draw.getMargins()
    const headerHeight = this.getHeight()
    const headerTop = this.getHeaderTop()
    const extraHeight = headerTop + headerHeight - margins[0]
    return extraHeight <= 0 ? 0 : extraHeight
  }

  public render(ctx2d: Context2d, pageNo: number) {
    ctx2d.globalAlpha = 1
    const innerWidth = this.draw.getInnerWidth()
    const maxHeight = this.getMaxHeight()
    // 超出最大高度不渲染
    const rowList: IRow[] = []
    let curRowHeight = 0
    for (let r = 0; r < this.rowList.length; r++) {
      const row = this.rowList[r]
      if (curRowHeight + row.height > maxHeight) {
        break
      }
      rowList.push(row)
      curRowHeight += row.height
    }
    this.draw.drawRow(ctx2d, {
      elementList: this.elementList,
      positionList: this.draw.getHeader().getPositionList(),
      rowList,
      pageNo,
      startIndex: 0,
      innerWidth,
      zone: EditorZone.HEADER
    })
  }
}
