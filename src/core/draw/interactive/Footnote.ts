import { ZERO } from '../../../dataset/constant/Common'
import { EditorZone, PaperDirection } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { getUUID } from '../../../utils'
import type { IRenderContext } from '../../render/model/RenderContext'
import { DrawPdf } from '../DrawPdf'

// canvas-editor-pdf: copied from upstream's core/draw/interactive/Footnote.ts
// (6042a141, #747, plus #1521). Only the layout and painting half is here:
// the editing half (insertFootnote, setFootnoteValue, getFootnoteValue,
// locationFootnote and the position-context getters behind footnote editing)
// works on the cursor, range and zone, which this fork does not have.

// 行高为小数时，逐页剩余高度的累减存在浮点误差，恰好放得下的脚注行不能因此被隐藏
const HEIGHT_EPSILON = 1e-8

export interface IFootnoteLayout {
  id: string
  referenceIndex: number
  number: number
  element: IElement
  rowList: IRow[]
  visibleRowList: IRow[]
  positionList: IElementPosition[]
  numberWidth: number
  height: number
  pageNo: number
}

interface IFootnoteReference {
  element: IElement
  index: number
  number: number
}

interface IFootnotePageLayout {
  layoutList: IFootnoteLayout[]
  separatorY: number
}

/** 管理正文脚注引用、页底布局及脚注编辑上下文 */
export class Footnote {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>
  private referenceMap: Map<string, IFootnoteReference>
  // 横竖版可用宽度不同，断行结果按纸张方向分别缓存
  private layoutMap: Map<string, Map<PaperDirection, IFootnoteLayout>>
  private pageLayoutMap: Map<number, IFootnotePageLayout>
  // 首次分页得到的页底占用，供高度回流时收窄正文区域
  private reservedHeightMap: Map<string, number>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    this.referenceMap = new Map()
    this.layoutMap = new Map()
    this.pageLayoutMap = new Map()
    this.reservedHeightMap = new Map()
  }

  public recovery() {
    this.referenceMap.clear()
    this.layoutMap.clear()
    this.pageLayoutMap.clear()
    this.reservedHeightMap.clear()
  }

  // 正文断行时逐个计算引用，高度回流遇到同一元素时不重复编号
  public computeReference(element: IElement, index: number) {
    let id = element.footnoteId || getUUID()
    const reference = this.referenceMap.get(id)
    if (reference?.element === element) {
      reference.index = index
      return
    }
    // 复制粘贴可能带入重复 ID，后出现的引用视为新的脚注
    if (reference) {
      id = getUUID()
    }
    const number = this.referenceMap.size + 1
    element.footnoteId = id
    element.value = String(number)
    this.referenceMap.set(id, {
      element,
      index,
      number
    })
  }

  public isReferenceExist(): boolean {
    return this.referenceMap.size > 0
  }

  public getRowHeight(row: IRow, direction: PaperDirection): number {
    let height = 0
    const visited = new Set<string>()
    for (const element of row.elementList) {
      if (element.type !== ElementType.FOOTNOTE) continue
      const id = element.footnoteId
      if (!id || visited.has(id) || !this.referenceMap.has(id)) continue
      visited.add(id)
      height += this._getLayoutByDirection(id, direction).height
    }
    return height
  }

  public getSeparatorHeight(): number {
    const { lineWidth, gap } = this.options.footnote
    return (lineWidth + gap) * this.options.scale
  }

  public getMaxPageHeight(direction: PaperDirection): number {
    const availableHeight =
      this.draw.getHeight(direction) -
      this.draw.getMainOuterHeight(0, direction)
    return Math.max(availableHeight / 2, 0)
  }

  public getReservedHeight(pageNo: number, direction: PaperDirection): number {
    return this.reservedHeightMap.get(`${pageNo}:${direction}`) || 0
  }

  // 编号单独占位列，正文使用剩余宽度断行；
  // rowList 保留完整内容，visibleRowList 后续按页底空间裁剪
  private _getLayoutByDirection(
    id: string,
    direction: PaperDirection
  ): IFootnoteLayout {
    const directionLayoutMap = this.layoutMap.get(id) || new Map()
    this.layoutMap.set(id, directionLayoutMap)
    const cached = directionLayoutMap.get(direction)
    if (cached) return cached
    const reference = this.referenceMap.get(id)!
    const { scale, defaultFont, footnote } = this.options
    const numberElement: IElement = {
      value: `${reference.number}. `,
      font: defaultFont,
      size: footnote.size
    }
    const ctx = this.draw.getCtx2d()
    ctx.font = this.draw.getFont(numberElement)
    const numberWidth =
      this.draw.getTextParticle().measureText(ctx, numberElement).width * scale
    const innerWidth = Math.max(
      this.draw.getInnerWidth(direction) - numberWidth,
      0
    )
    const rowList = this.draw.computeRowList({
      innerWidth,
      elementList: reference.element.valueList || [{ value: ZERO }]
    })
    const height = rowList.reduce(
      (total, row) => total + row.height + (row.offsetY || 0),
      0
    )
    const layout: IFootnoteLayout = {
      id,
      referenceIndex: reference.index,
      number: reference.number,
      element: reference.element,
      rowList,
      visibleRowList: rowList,
      positionList: [],
      numberWidth,
      height,
      pageNo: 0
    }
    directionLayoutMap.set(direction, layout)
    return layout
  }

  // 将脚注放到引用所在页，并记录页底占用供正文高度回流；
  // 回流后的再次计算会生成最终的可见行与位置信息
  public compute() {
    const pageRowList = this.draw.getPageRowList()
    const pageDirectionList = this.draw.getPageDirectionList()
    this.pageLayoutMap.clear()
    this.reservedHeightMap.clear()
    if (!this.isReferenceExist() || !this.draw.getIsPagingMode()) return
    for (let pageNo = 0; pageNo < pageRowList.length; pageNo++) {
      const direction = pageDirectionList[pageNo]
      const visited = new Set<string>()
      const layoutList: IFootnoteLayout[] = []
      for (const row of pageRowList[pageNo]) {
        for (const element of row.elementList) {
          const id = element.footnoteId
          if (
            element.type !== ElementType.FOOTNOTE ||
            !id ||
            visited.has(id) ||
            !this.referenceMap.has(id)
          ) {
            continue
          }
          visited.add(id)
          const layout = this._getLayoutByDirection(id, direction)
          layout.pageNo = pageNo
          layoutList.push(layout)
        }
      }
      if (!layoutList.length) continue
      const contentHeight = layoutList.reduce(
        (total, layout) => total + layout.height,
        0
      )
      const separatorHeight = this.getSeparatorHeight()
      const height = Math.min(
        contentHeight + separatorHeight,
        this.getMaxPageHeight(direction)
      )
      this.reservedHeightMap.set(`${pageNo}:${direction}`, height)
      const {
        margins,
        innerWidth,
        height: pageHeight
      } = this.draw.getPageSize(pageNo)
      const bottomY =
        pageHeight -
        margins[2] -
        this.draw.getFooter().getExtraHeight(pageNo, direction)
      const separatorY = bottomY - height
      let startY = separatorY + separatorHeight
      let remainingHeight = height - separatorHeight
      // 超出页底空间的内容整行隐藏，不跨页续排；
      // 仅为可见行计算位置，隐藏内容不参与命中与选区
      for (const layout of layoutList) {
        layout.positionList = []
        layout.visibleRowList = []
        let visibleHeight = 0
        for (const row of layout.rowList) {
          const rowHeight = row.height + (row.offsetY || 0)
          if (visibleHeight + rowHeight - remainingHeight > HEIGHT_EPSILON) {
            break
          }
          layout.visibleRowList.push(row)
          visibleHeight += rowHeight
        }
        this.draw.getPosition().computePageRowPosition({
          positionList: layout.positionList,
          rowList: layout.visibleRowList,
          pageNo,
          startRowIndex: 0,
          startIndex: 0,
          startX: margins[3] + layout.numberWidth,
          startY,
          innerWidth: Math.max(innerWidth - layout.numberWidth, 0),
          zone: EditorZone.MAIN
        })
        startY += layout.height
        remainingHeight -= layout.height
      }
      this.pageLayoutMap.set(pageNo, {
        layoutList,
        separatorY
      })
    }
  }

  public getPageLayoutList(pageNo: number): IFootnoteLayout[] {
    return this.pageLayoutMap.get(pageNo)?.layoutList || []
  }

  public getPageLayoutById(id: string): IFootnoteLayout | null {
    for (const page of this.pageLayoutMap.values()) {
      const layout = page.layoutList.find(item => item.id === id)
      if (layout) return layout
    }
    return null
  }

  public render(ctx: IRenderContext, pageNo: number) {
    const page = this.pageLayoutMap.get(pageNo)
    if (!page) return
    const { margins, innerWidth } = this.draw.getPageSize(pageNo)
    const { color, lineColor, lineWidth, size } = this.options.footnote
    ctx.save()
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth * this.options.scale
    ctx.beginPath()
    ctx.moveTo(margins[3], page.separatorY)
    ctx.lineTo(margins[3] + innerWidth / 3, page.separatorY)
    ctx.stroke()
    for (const layout of page.layoutList) {
      const firstPosition = layout.positionList[0]
      if (firstPosition && layout.visibleRowList.length) {
        ctx.save()
        ctx.fillStyle = color
        ctx.font = this.draw.getFont({
          value: '',
          size,
          font: this.options.defaultFont
        })
        ctx.fillText(
          `${layout.number}.`,
          margins[3],
          firstPosition.coordinate.leftTop[1] + firstPosition.ascent
        )
        ctx.restore()
      }
      this.draw.drawRow(ctx, {
        elementList: layout.element.valueList || [],
        positionList: layout.positionList,
        rowList: layout.visibleRowList,
        pageNo,
        startIndex: 0,
        innerWidth: Math.max(innerWidth - layout.numberWidth, 0),
        zone: EditorZone.MAIN
      })
    }
    ctx.restore()
  }
}
