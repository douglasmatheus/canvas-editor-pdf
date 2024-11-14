import { Context2d } from 'jspdf'
// import { IEditorOption, IElement } from '@hufe921/canvas-editor'
import { DeepRequired } from '../../../interface/Common'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { formatElementList } from '../../../utils/element'
import { Position } from '../../position/Position'
import { DrawPdf } from '../DrawPdf'
import { LineBreakParticle } from '../particle/LineBreakParticle'
import { IEditorOption } from '../../../interface/Editor'

export class Placeholder {
  private draw: DrawPdf
  private position: Position
  private options: DeepRequired<IEditorOption>

  private elementList: IElement[]
  private rowList: IRow[]
  private positionList: IElementPosition[]

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.position = draw.getPosition()
    this.options = <DeepRequired<IEditorOption>>draw.getOptions()

    this.elementList = []
    this.rowList = []
    this.positionList = []
  }

  private _recovery() {
    this.elementList = []
    this.rowList = []
    this.positionList = []
  }

  public _compute() {
    this._computeRowList()
    this._computePositionList()
  }

  private _computeRowList() {
    const innerWidth = this.draw.getInnerWidth()
    this.rowList = this.draw.computeRowList({
      innerWidth,
      elementList: this.elementList
    })
  }

  private _computePositionList() {
    const { lineBreak, scale } = this.options
    const headerExtraHeight = this.draw.getHeader().getExtraHeight()
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    let startX = margins[3]
    // 换行符绘制开启时，移动起始位置
    if (!lineBreak.disabled) {
      startX += (LineBreakParticle.WIDTH + LineBreakParticle.GAP) * scale
    }
    const startY = margins[0] + headerExtraHeight
    this.position.computePageRowPosition({
      positionList: this.positionList,
      rowList: this.rowList,
      pageNo: 0,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth
    })
  }

  public render(ctx2d: Context2d) {
    const {
      placeholder: { data, font, size, color, opacity }
    } = this.options
    if (!data) return
    this._recovery()
    // 构建元素列表并格式化
    this.elementList = [
      {
        value: data,
        font,
        size,
        color
      }
    ]
    formatElementList(this.elementList, {
      editorOptions: this.options,
      isForceCompensation: true
    })
    // 计算
    this._compute()
    const innerWidth = this.draw.getInnerWidth()
    // 绘制
    ctx2d.save()
    ctx2d.globalAlpha = opacity
    this.draw.drawRow(ctx2d, {
      elementList: this.elementList,
      positionList: this.positionList,
      rowList: this.rowList,
      pageNo: 0,
      startIndex: 0,
      innerWidth,
      isDrawLineBreak: false
    })
    ctx2d.restore()
  }
}
