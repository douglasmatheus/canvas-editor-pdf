import { ZERO } from '../../dataset/constant/Common'
import { RowFlex } from '../../dataset/enum/Row'
import {
  IComputeRowListPayload,
  IDrawFloatPayload,
  IDrawOption,
  IDrawPagePayload,
  IDrawRowPayload,
  IGetImageOption,
  IGetValueOption,
} from '../../interface/Draw'
import {
  IEditorOption,
  IEditorResult,
} from '../../interface/Editor'
import {
  IElementMetrics,
} from '../../interface/Element'
import { deepClone, getUUID } from '../../utils'
import { Position } from '../position/Position'
import { Background } from './frame/Background'
import { Highlight } from './richtext/Highlight'
import { Margin } from './frame/Margin'
import { Strikeout } from './richtext/Strikeout'
import { Underline } from './richtext/Underline'
import { ElementType } from '../../dataset/enum/Element'
import { ImageParticle } from './particle/ImageParticle'
import { LaTexParticle } from './particle/latex/LaTexParticle'
import { TextParticle } from './particle/TextParticle'
import { PageNumber } from './frame/PageNumber'
import { TableParticle } from './particle/table/TableParticle'
import { HyperlinkParticle } from './particle/HyperlinkParticle'
import { Header } from './frame/Header'
import { SuperscriptParticle } from './particle/Superscript'
import { SubscriptParticle } from './particle/Subscript'
import { SeparatorParticle } from './particle/Separator'
import { PageBreakParticle } from './particle/PageBreak'
import { Watermark } from './frame/Watermark'
import {
  EditorComponent,
  EditorMode,
  EditorZone,
  PageMode,
  PaperDirection,
  WordBreak
} from '../../dataset/enum/Editor'
import {
  deleteSurroundElementList,
  getIsBlockElement,
  pickSurroundElementList,
  zipElementList
} from '../../utils/element'
import { CheckboxParticle } from './particle/CheckboxParticle'
import { RadioParticle } from './particle/RadioParticle'
import { DeepRequired, IPadding } from '../../interface/Common'
import {
  ControlComponent,
  ControlIndentation
} from '../../dataset/enum/Control'
import { formatElementList } from '../../utils/element'
import { DateParticle } from './particle/date/DateParticle'
import { IMargin } from '../../interface/Margin'
import { BlockParticle } from './particle/block/BlockParticle'
import { EDITOR_COMPONENT } from '../../dataset/constant/Editor'
import { I18n } from '../i18n/I18n'
import { ImageObserver } from '../observer/ImageObserver'
import { Footer } from './frame/Footer'
import {
  TEXTLIKE_ELEMENT_TYPE
} from '../../dataset/constant/Element'
import { ListParticle } from './particle/ListParticle'
import { Placeholder } from './frame/Placeholder'
import { Group } from './interactive/Group'
import { ImageDisplay } from '../../dataset/enum/Common'
import { PUNCTUATION_REG } from '../../dataset/constant/Regular'
import { LineBreakParticle } from './particle/LineBreakParticle'
import { LineNumber } from './frame/LineNumber'
import { PageBorder } from './frame/PageBorder'
import jsPDF, { Context2d } from 'jspdf'
import { Draw } from '@hufe921/canvas-editor/dist/src/editor/core/draw/Draw'
import { IEditorData, IElement } from '@hufe921/canvas-editor'
import { ITd } from '@hufe921/canvas-editor/dist/src/editor/interface/table/Td'
import { IRow, IRowElement } from '@hufe921/canvas-editor/dist/src/editor/interface/Row'

export class DrawPdf {
  private draw: Draw
  private fakeCanvas: HTMLCanvasElement
  private fakeCtx: CanvasRenderingContext2D
  private container: HTMLDivElement
  private pageList: HTMLCanvasElement[]
  private ctxList: CanvasRenderingContext2D[]
  private ctxListInfos: any[]
  private pageNo: number
  private pagePixelRatio: number | null
  private mode: EditorMode
  private options: DeepRequired<IEditorOption>
  private position: Position
  private elementList: IElement[]
  private pdf: jsPDF

  private i18n: I18n
  private margin: Margin
  private background: Background
  private group: Group
  private underline: Underline
  private strikeout: Strikeout
  private highlight: Highlight
  private imageParticle: ImageParticle
  private laTexParticle: LaTexParticle
  private textParticle: TextParticle
  private tableParticle: TableParticle
  private pageNumber: PageNumber
  private lineNumber: LineNumber
  private waterMark: Watermark
  private placeholder: Placeholder
  private header: Header
  private footer: Footer
  private hyperlinkParticle: HyperlinkParticle
  private dateParticle: DateParticle
  private separatorParticle: SeparatorParticle
  private pageBreakParticle: PageBreakParticle
  private superscriptParticle: SuperscriptParticle
  private subscriptParticle: SubscriptParticle
  private checkboxParticle: CheckboxParticle
  private radioParticle: RadioParticle
  private blockParticle: BlockParticle
  private listParticle: ListParticle
  private lineBreakParticle: LineBreakParticle
  // private control: Control
  private pageBorder: PageBorder
  private imageObserver: ImageObserver

  private LETTER_REG: RegExp
  private WORD_LIKE_REG: RegExp
  private rowList: IRow[]
  private pageRowList: IRow[][]

  constructor(
    options: DeepRequired<IEditorOption>,
    data: IEditorData,
    draw: Draw
  ) {
    this.draw = draw
    this.fakeCanvas = document.createElement('canvas')
    this.fakeCtx = this.fakeCanvas.getContext('2d')!
    this.container = draw.getContainer()
    this.pageList = []
    this.ctxList = []
    this.ctxListInfos = []
    this.pageNo = 0
    this.pagePixelRatio = null
    this.mode = options.mode
    this.options = options
    let headerElementList: IElement[] = []
    let mainElementList: IElement[] = []
    let footerElementList: IElement[] = []
    if (Array.isArray(data)) {
      mainElementList = data
    } else {
      headerElementList = data.header || []
      mainElementList = data.main
      footerElementList = data.footer || []
    }
    const pageComponentData = [
      headerElementList,
      mainElementList,
      footerElementList
    ]
    pageComponentData.forEach(elementList => {
      formatElementList(elementList, {
        editorOptions: draw.getOptions(),
        isForceCompensation: true
      })
    })
    this.elementList = data.main

    this._formatContainer()
    this.pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [this.getWidth(), this.getHeight()],
      hotfixes: ['px_scaling'],
      compress: true
    })
    this.pdf.setDocumentProperties({
      author: 'canvas-editor'
    })
    this._addFont()
    this._createPage(0)

    this.i18n = new I18n()
    this.position = new Position(this)
    // this.zone = new Zone(this.draw)
    // this.range = new RangeManager(this)
    this.margin = new Margin(this)
    this.background = new Background(this)
    this.group = new Group(this)
    this.underline = new Underline(this)
    this.strikeout = new Strikeout(this)
    this.highlight = new Highlight(this)
    this.imageParticle = new ImageParticle(this)
    this.laTexParticle = new LaTexParticle(this)
    this.textParticle = new TextParticle(this)
    this.tableParticle = new TableParticle(this)
    this.pageNumber = new PageNumber(this)
    this.lineNumber = new LineNumber(this)
    this.waterMark = new Watermark(this)
    this.placeholder = new Placeholder(this)
    this.header = new Header(this, data.header)
    this.footer = new Footer(this, data.footer)
    this.hyperlinkParticle = new HyperlinkParticle(this)
    this.dateParticle = new DateParticle(this.draw)
    this.separatorParticle = new SeparatorParticle(this)
    this.pageBreakParticle = new PageBreakParticle(this)
    this.superscriptParticle = new SuperscriptParticle()
    this.subscriptParticle = new SubscriptParticle()
    this.checkboxParticle = new CheckboxParticle(this)
    this.radioParticle = new RadioParticle(this)
    this.blockParticle = new BlockParticle(this.draw)
    this.listParticle = new ListParticle(this)
    this.lineBreakParticle = new LineBreakParticle(this)
    // this.control = new Control(this)
    this.pageBorder = new PageBorder(this)

    this.imageObserver = new ImageObserver()

    const { letterClass } = options
    this.LETTER_REG = new RegExp(`[${letterClass.join('')}]`)
    this.WORD_LIKE_REG = new RegExp(
      `${letterClass.map(letter => `[^${letter}][${letter}]`).join('|')}`
    )
    this.rowList = []
    this.pageRowList = []
  }

  public getDraw(): Draw {
    return this.draw
  }

  public getCtx2d(): Context2d {
    return this.pdf.context2d
  }

  public getFakeCtx() {
    return this.fakeCtx
  }

  private _addFont() {
    this.pdf.addFont('https://raw.githubusercontent.com/Hufe921/canvas-editor/refs/heads/feature/pdf/public/font/msyh-bold.ttf', 'Yahei', 'normal')
    this.pdf.addFont('https://raw.githubusercontent.com/Hufe921/canvas-editor/refs/heads/feature/pdf/public/font/msyh.ttf', 'Yahei', 'bold')
    this.pdf.setFont('Yahei')
  }

  public getFont(el: IElement): string {
    const { defaultSize, defaultFont } = this.options
    let font = el.font || defaultFont
    if (font === 'Microsoft YaHei') {
      font = 'Yahei'
    }
    const size = el.actualSize || el.size || defaultSize
    return `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${size}px ${font}`
  }

  public getLetterReg(): RegExp {
    return this.LETTER_REG
  }

  public getMode(): EditorMode {
    return this.mode
  }

  public getOriginalWidth(): number {
    const { paperDirection, width, height } = this.options
    return paperDirection === PaperDirection.VERTICAL ? width : height
  }

  public getOriginalHeight(): number {
    const { paperDirection, width, height } = this.options
    return paperDirection === PaperDirection.VERTICAL ? height : width
  }

  public getWidth(): number {
    return Math.floor(this.getOriginalWidth() * this.options.scale)
  }

  public getHeight(): number {
    return Math.floor(this.getOriginalHeight() * this.options.scale)
  }

  public getMainHeight(): number {
    const pageHeight = this.getHeight()
    return pageHeight - this.getMainOuterHeight()
  }

  public getMainOuterHeight(): number {
    const margins = this.getMargins()
    const headerExtraHeight = this.header.getExtraHeight()
    const footerExtraHeight = this.footer.getExtraHeight()
    return margins[0] + margins[2] + headerExtraHeight + footerExtraHeight
  }

  public getCanvasWidth(pageNo = -1): number {
    const page = this.draw.getPage(pageNo)
    return page.width
  }

  public getCanvasHeight(pageNo = -1): number {
    const page = this.draw.getPage(pageNo)
    return page.height
  }

  public getInnerWidth(): number {
    const width = this.getWidth()
    const margins = this.getMargins()
    return width - margins[1] - margins[3]
  }

  public getOriginalInnerWidth(): number {
    const width = this.getOriginalWidth()
    const margins = this.getOriginalMargins()
    return width - margins[1] - margins[3]
  }

  public getContextInnerWidth(): number {
    const positionContext = this.position.getPositionContext()
    if (positionContext.isTable) {
      const { index, trIndex, tdIndex } = positionContext
      const elementList = this.getOriginalElementList()
      const td = elementList[index!].trList![trIndex!].tdList[tdIndex!]
      const tdPadding = this.getTdPadding()
      return td!.width! - tdPadding[1] - tdPadding[3]
    }
    return this.getOriginalInnerWidth()
  }

  public getMargins(): IMargin {
    return <IMargin>this.getOriginalMargins().map(m => m * this.options.scale)
  }

  public getOriginalMargins(): number[] {
    const { margins, paperDirection } = this.options
    return paperDirection === PaperDirection.VERTICAL
      ? margins
      : [margins[1], margins[2], margins[3], margins[0]]
  }

  public getPageGap(): number {
    return this.options.pageGap * this.options.scale
  }

  public getOriginalPageGap(): number {
    return this.options.pageGap
  }

  public getPageNumberBottom(): number {
    const {
      pageNumber: { bottom },
      scale
    } = this.options
    return bottom * scale
  }

  public getMarginIndicatorSize(): number {
    return this.options.marginIndicatorSize * this.options.scale
  }

  public getDefaultBasicRowMarginHeight(): number {
    return this.options.defaultBasicRowMarginHeight * this.options.scale
  }

  public getTdPadding(): IPadding {
    const {
      table: { tdPadding },
      scale
    } = this.options
    return <IPadding>tdPadding.map(m => m * scale)
  }

  public getContainer(): HTMLDivElement {
    return this.container
  }

  public getPageNo(): number {
    return this.pageNo
  }

  public setPageNo(payload: number) {
    this.pageNo = payload
  }

  public getPage(pageNo = -1): HTMLCanvasElement {
    return this.pageList[~pageNo ? pageNo : this.pageNo]
  }

  public getPageList(): HTMLCanvasElement[] {
    return this.pageList
  }

  public getPageCount(): number {
    return this.pageList.length
  }

  public getTableRowList(sourceElementList: IElement[]): IRow[] {
    const positionContext = this.position.getPositionContext()
    const { index, trIndex, tdIndex } = positionContext
    return sourceElementList[index!].trList![trIndex!].tdList[tdIndex!].rowList!
  }

  public getOriginalRowList() {
    // const zoneManager = this.getZone()
    // if (zoneManager.isHeaderActive()) {
    //   return this.header.getRowList()
    // }
    // if (zoneManager.isFooterActive()) {
    //   return this.footer.getRowList()
    // }
    return this.rowList
  }

  public getRowList(): IRow[] {
    const positionContext = this.position.getPositionContext()
    return positionContext.isTable
      ? this.getTableRowList(this.getOriginalElementList())
      : this.getOriginalRowList()
  }

  public getPageRowList(): IRow[][] {
    return this.pageRowList
  }

  public getPdf(): jsPDF {
    return this.pdf
  }

  public getCtx(): CanvasRenderingContext2D {
    return this.ctxList[this.pageNo]
  }

  public getOptions(): DeepRequired<IEditorOption> {
    return this.options
  }

  public getGroup(): Group {
    return this.group
  }

  public getPosition(): Position {
    return this.position
  }

  public getLineBreakParticle(): LineBreakParticle {
    return this.lineBreakParticle
  }

  public getTextParticle(): TextParticle {
    return this.textParticle
  }

  public getHeaderElementList(): IElement[] {
    return this.header.getElementList()
  }

  public getTableElementList(sourceElementList: IElement[]): IElement[] {
    const positionContext = this.position.getPositionContext()
    const { index, trIndex, tdIndex } = positionContext
    return (
      sourceElementList[index!].trList?.[trIndex!].tdList[tdIndex!].value || []
    )
  }

  public getElementList(): IElement[] {
    const positionContext = this.position.getPositionContext()
    const elementList = this.getOriginalElementList()
    return positionContext.isTable
      ? this.getTableElementList(elementList)
      : elementList
  }

  public getMainElementList(): IElement[] {
    const positionContext = this.position.getPositionContext()
    return positionContext.isTable
      ? this.getTableElementList(this.elementList)
      : this.elementList
  }

  public getOriginalElementList() {
    // const zoneManager = this.getZone()
    // if (zoneManager.isHeaderActive()) {
    //   return this.getHeaderElementList()
    // }
    // if (zoneManager.isFooterActive()) {
    //   return this.getFooterElementList()
    // }
    return this.elementList
  }

  public getOriginalMainElementList(): IElement[] {
    return this.elementList
  }

  public getFooterElementList(): IElement[] {
    return this.footer.getElementList()
  }

  public getTd(): ITd | null {
    const positionContext = this.position.getPositionContext()
    const { index, trIndex, tdIndex, isTable } = positionContext
    if (isTable) {
      const elementList = this.getOriginalElementList()
      return elementList[index!].trList![trIndex!].tdList[tdIndex!]
    }
    return null
  }

  public spliceElementList(
    elementList: IElement[],
    start: number,
    deleteCount: number,
    ...items: IElement[]
  ) {
    // const isDesignMode = this.isDesignMode()
    if (deleteCount > 0) {
      // 当最后元素与开始元素列表信息不一致时：清除当前列表信息
      const endIndex = start + deleteCount
      const endElement = elementList[endIndex]
      const endElementListId = endElement?.listId
      if (
        endElementListId &&
        elementList[start - 1]?.listId !== endElementListId
      ) {
        let startIndex = endIndex
        while (startIndex < elementList.length) {
          const curElement = elementList[startIndex]
          if (
            curElement.listId !== endElementListId ||
            curElement.value === ZERO
          ) {
            break
          }
          delete curElement.listId
          delete curElement.listType
          delete curElement.listStyle
          startIndex++
        }
      }
      // // 元素删除（不可删除控件忽略）
      // if (!this.control.getActiveControl()) {
      //   const tdDeletable = this.getTd()?.deletable
      //   let deleteIndex = endIndex - 1
      //   while (deleteIndex >= start) {
      //     const deleteElement = elementList[deleteIndex]
      //     if (
      //       isDesignMode ||
      //       (tdDeletable !== false &&
      //         deleteElement?.control?.deletable !== false &&
      //         deleteElement?.title?.deletable !== false)
      //     ) {
      //       elementList.splice(deleteIndex, 1)
      //     }
      //     deleteIndex--
      //   }
      // } else {
      //   elementList.splice(start, deleteCount)
      // }
    }
    // 循环添加，避免使用解构影响性能
    for (let i = 0; i < items.length; i++) {
      elementList.splice(start + i, 0, items[i])
    }
  }

  public getImageParticle(): ImageParticle {
    return this.imageParticle
  }

  public getTableParticle(): TableParticle {
    return this.tableParticle
  }

  public getHeader(): Header {
    return this.header
  }

  public getFooter(): Footer {
    return this.footer
  }

  public getHyperlinkParticle(): HyperlinkParticle {
    return this.hyperlinkParticle
  }

  public getDateParticle(): DateParticle {
    return this.dateParticle
  }

  public getListParticle(): ListParticle {
    return this.listParticle
  }

  public getCheckboxParticle(): CheckboxParticle {
    return this.checkboxParticle
  }

  public getRadioParticle(): RadioParticle {
    return this.radioParticle
  }

  // public getControl(): Control {
  //   return this.control
  // }

  public getImageObserver(): ImageObserver {
    return this.imageObserver
  }

  public getI18n(): I18n {
    return this.i18n
  }

  public getRowCount(): number {
    return this.getRowList().length
  }

  public async getDataURL(payload: IGetImageOption = {}): Promise<string[]> {
    const { pixelRatio, mode } = payload
    // 放大像素比
    if (pixelRatio) {
      this.setPagePixelRatio(pixelRatio)
    }
    // 不同模式
    const currentMode = this.mode
    const isSwitchMode = !!mode && currentMode !== mode
    if (isSwitchMode) {
      // this.setMode(mode)
    }
    this.render({
      isLazy: false,
      isCompute: false,
      isSetCursor: false,
      isSubmitHistory: false
    })
    await this.imageObserver.allSettled()
    const dataUrlList = this.pageList.map(c => c.toDataURL())
    // 还原
    if (pixelRatio) {
      this.setPagePixelRatio(null)
    }
    if (isSwitchMode) {
      // this.setMode(currentMode)
    }
    return dataUrlList
  }

  public setPageScale(payload: number) {
    const dpr = this.getPagePixelRatio()
    this.options.scale = payload
    const width = this.getWidth()
    const height = this.getHeight()
    this.container.style.width = `${width}px`
    this.pageList.forEach((p, i) => {
      p.width = width * dpr
      p.height = height * dpr
      p.style.width = `${width}px`
      p.style.height = `${height}px`
      p.style.marginBottom = `${this.getPageGap()}px`
      this._initPageContext(this.ctxList[i])
    })
    const cursorPosition = this.position.getCursorPosition()
    this.render({
      isSubmitHistory: false,
      isSetCursor: !!cursorPosition,
      curIndex: cursorPosition?.index
    })
  }

  public getPagePixelRatio(): number {
    return this.pagePixelRatio || window.devicePixelRatio
  }

  public setPagePixelRatio(payload: number | null) {
    if (
      (!this.pagePixelRatio && payload === window.devicePixelRatio) ||
      payload === this.pagePixelRatio
    ) {
      return
    }
    this.pagePixelRatio = payload
    this.setPageDevicePixel()
  }

  public setPageDevicePixel() {
    const dpr = this.getPagePixelRatio()
    const width = this.getWidth()
    const height = this.getHeight()
    this.pageList.forEach((p, i) => {
      p.width = width * dpr
      p.height = height * dpr
      this._initPageContext(this.ctxList[i])
    })
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperSize(width: number, height: number) {
    this.options.width = width
    this.options.height = height
    const dpr = this.getPagePixelRatio()
    const realWidth = this.getWidth()
    const realHeight = this.getHeight()
    this.container.style.width = `${realWidth}px`
    this.pageList.forEach((p, i) => {
      p.width = realWidth * dpr
      p.height = realHeight * dpr
      p.style.width = `${realWidth}px`
      p.style.height = `${realHeight}px`
      this._initPageContext(this.ctxList[i])
    })
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperDirection(payload: PaperDirection) {
    const dpr = this.getPagePixelRatio()
    this.options.paperDirection = payload
    const width = this.getWidth()
    const height = this.getHeight()
    this.container.style.width = `${width}px`
    this.pageList.forEach((p, i) => {
      p.width = width * dpr
      p.height = height * dpr
      p.style.width = `${width}px`
      p.style.height = `${height}px`
      this._initPageContext(this.ctxList[i])
    })
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperMargin(payload: IMargin) {
    this.options.margins = payload
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public getValue(options: IGetValueOption = {}): IEditorResult {
    const { pageNo, extraPickAttrs } = options
    let mainElementList = this.elementList
    if (
      Number.isInteger(pageNo) &&
      pageNo! >= 0 &&
      pageNo! < this.pageRowList.length
    ) {
      mainElementList = this.pageRowList[pageNo!].flatMap(
        row => row.elementList
      )
    }
    const data: IEditorData = {
      header: zipElementList(this.getHeaderElementList(), {
        extraPickAttrs
      }),
      main: zipElementList(mainElementList, {
        extraPickAttrs
      }),
      footer: zipElementList(this.getFooterElementList(), {
        extraPickAttrs
      })
    }
    const version = '0.0.94'
    return {
      version,
      data,
      options: deepClone(this.options)
    }
  }

  public setEditorData(payload: Partial<IEditorData>) {
    const { header, main, footer } = payload
    if (header) {
      this.header.setElementList(header)
    }
    if (main) {
      this.elementList = main
    }
    if (footer) {
      this.footer.setElementList(footer)
    }
  }

  private _formatContainer() {
    // 容器宽度需跟随纸张宽度
    this.container.style.position = 'relative'
    this.container.style.width = `${this.getWidth()}px`
    this.container.setAttribute(EDITOR_COMPONENT, EditorComponent.MAIN)
  }

  private _createPage(pageNo: number) {
    const width = this.getWidth()
    const height = this.getHeight()
    // // 调整分辨率
    const dpr = this.getPagePixelRatio()

    const orientation = this.getOptions().paperDirection === PaperDirection.VERTICAL ? 'p' : 'l'
    this.ctxListInfos.push({
      width,
      height,
      background: '#ffffff',
      marginBottom: `${this.getPageGap()}px`,
      index: String(pageNo)
    })
    const newPagePdf = this.pdf.addPage([width, height], orientation)
    newPagePdf.context2d.scale(dpr, dpr)
  }

  private _initPageContext(ctx: CanvasRenderingContext2D) {
    const dpr = this.getPagePixelRatio()
    ctx.scale(dpr, dpr)
    // 重置以下属性是因部分浏览器(chrome)会应用css样式
    ctx.letterSpacing = '0px'
    ctx.wordSpacing = '0px'
    ctx.direction = 'ltr'
  }

  public getElementFont(el: IElement, scale = 1): string {
    const { defaultSize, defaultFont } = this.options
    const font = el.font || defaultFont
    const size = el.actualSize || el.size || defaultSize
    return `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${size * scale
      }px ${font}`
  }

  public getElementSize(el: IElement) {
    return el.actualSize || el.size || this.options.defaultSize
  }

  public getElementRowMargin(el: IRowElement) {
    const { defaultBasicRowMarginHeight, defaultRowMargin, scale } =
      this.options
    return (
      defaultBasicRowMarginHeight * (el.rowMargin ?? defaultRowMargin) * scale
    )
  }

  public computeRowList(payload: IComputeRowListPayload) {
    const {
      innerWidth,
      elementList,
      isPagingMode = false,
      isFromTable = false,
      startX = 0,
      startY = 0,
      pageHeight = 0,
      mainOuterHeight = 0,
      surroundElementList = []
    } = payload
    const {
      defaultSize,
      defaultRowMargin,
      scale,
      table: { tdPadding },
      defaultTabWidth
    } = this.options
    const defaultBasicRowMarginHeight = this.getDefaultBasicRowMarginHeight()
    // 计算列表偏移宽度
    const listStyleMap = this.listParticle.computeListStyle(elementList)
    const rowList: IRow[] = []
    if (elementList.length) {
      rowList.push({
        width: 0,
        height: 0,
        ascent: 0,
        elementList: [],
        startIndex: 0,
        rowIndex: 0,
        rowFlex: elementList?.[0]?.rowFlex || elementList?.[1]?.rowFlex
      })
    }
    // 起始位置及页码计算
    let x = startX
    let y = startY
    let pageNo = 0
    // 列表位置
    let listId: string | undefined
    let listIndex = 0
    // 控件最小宽度
    let controlRealWidth = 0
    for (let i = 0; i < elementList.length; i++) {
      const curRow: IRow = rowList[rowList.length - 1]
      const element = elementList[i]
      const rowMargin =
        defaultBasicRowMarginHeight * (element.rowMargin ?? defaultRowMargin)
      const metrics: IElementMetrics = {
        width: 0,
        height: 0,
        boundingBoxAscent: 0,
        boundingBoxDescent: 0
      }
      // 实际可用宽度
      const offsetX =
        curRow.offsetX ||
        (element.listId && listStyleMap.get(element.listId)) ||
        0
      const availableWidth = innerWidth - offsetX
      // 增加起始位置坐标偏移量
      x += curRow.elementList.length === 1 ? offsetX : 0
      if (
        element.type === ElementType.IMAGE ||
        element.type === ElementType.LATEX
      ) {
        // 浮动图片无需计算数据
        if (
          element.imgDisplay === ImageDisplay.SURROUND ||
          element.imgDisplay === ImageDisplay.FLOAT_TOP ||
          element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
        ) {
          metrics.width = 0
          metrics.height = 0
          metrics.boundingBoxDescent = 0
        } else {
          const elementWidth = element.width! * scale
          const elementHeight = element.height! * scale
          // 图片超出尺寸后自适应（图片大小大于可用宽度时）
          if (elementWidth > availableWidth) {
            const adaptiveHeight =
              (elementHeight * availableWidth) / elementWidth
            element.width = availableWidth / scale
            element.height = adaptiveHeight / scale
            metrics.width = availableWidth
            metrics.height = adaptiveHeight
            metrics.boundingBoxDescent = adaptiveHeight
          } else {
            metrics.width = elementWidth
            metrics.height = elementHeight
            metrics.boundingBoxDescent = elementHeight
          }
        }
        metrics.boundingBoxAscent = 0
      } else if (element.type === ElementType.TABLE) {
        const tdPaddingWidth = tdPadding[1] + tdPadding[3]
        const tdPaddingHeight = tdPadding[0] + tdPadding[2]
        // 表格分页处理进度：https://github.com/Hufe921/canvas-editor/issues/41
        // 查看后续表格是否属于同一个源表格-存在即合并
        if (element.pagingId) {
          let tableIndex = i + 1
          let combineCount = 0
          while (tableIndex < elementList.length) {
            const nextElement = elementList[tableIndex]
            if (nextElement.pagingId === element.pagingId) {
              const nexTrList = nextElement.trList!.filter(
                tr => !tr.pagingRepeat
              )
              element.trList!.push(...nexTrList)
              element.height! += nextElement.height!
              tableIndex++
              combineCount++
            } else {
              break
            }
          }
          if (combineCount) {
            elementList.splice(i + 1, combineCount)
          }
        }
        element.pagingIndex = element.pagingIndex ?? 0
        // 计算表格行列
        this.tableParticle.computeRowColInfo(element)
        // 计算表格内元素信息
        const trList = element.trList!
        for (let t = 0; t < trList.length; t++) {
          const tr = trList[t]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const rowList = this.computeRowList({
              innerWidth: (td.width! - tdPaddingWidth) * scale,
              elementList: td.value,
              isFromTable: true,
              isPagingMode
            })
            const rowHeight = rowList.reduce((pre, cur) => pre + cur.height, 0)
            td.rowList = rowList
            // 移除缩放导致的行高变化-渲染时会进行缩放调整
            const curTdHeight = rowHeight / scale + tdPaddingHeight
            // 内容高度大于当前单元格高度需增加
            if (td.height! < curTdHeight) {
              const extraHeight = curTdHeight - td.height!
              const changeTr = trList[t + td.rowspan - 1]
              changeTr.height += extraHeight
              changeTr.tdList.forEach(changeTd => {
                changeTd.height! += extraHeight
              })
            }
            // 当前单元格最小高度及真实高度（包含跨列）
            let curTdMinHeight = 0
            let curTdRealHeight = 0
            let i = 0
            while (i < td.rowspan) {
              const curTr = trList[i + t] || trList[t]
              curTdMinHeight += curTr.minHeight!
              curTdRealHeight += curTr.height!
              i++
            }
            td.realMinHeight = curTdMinHeight
            td.realHeight = curTdRealHeight
            td.mainHeight = curTdHeight
          }
        }
        // 单元格高度大于实际内容高度需减少
        const reduceTrList = this.tableParticle.getTrListGroupByCol(trList)
        for (let t = 0; t < reduceTrList.length; t++) {
          const tr = reduceTrList[t]
          let reduceHeight = -1
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const curTdRealHeight = td.realHeight!
            const curTdHeight = td.mainHeight!
            const curTdMinHeight = td.realMinHeight!
            // 获取最大可减少高度
            const curReduceHeight =
              curTdHeight < curTdMinHeight
                ? curTdRealHeight - curTdMinHeight
                : curTdRealHeight - curTdHeight
            if (!~reduceHeight || curReduceHeight < reduceHeight) {
              reduceHeight = curReduceHeight
            }
          }
          if (reduceHeight > 0) {
            const changeTr = trList[t]
            changeTr.height -= reduceHeight
            changeTr.tdList.forEach(changeTd => {
              changeTd.height! -= reduceHeight
            })
          }
        }
        // 需要重新计算表格内值
        this.tableParticle.computeRowColInfo(element)
        // 计算出表格高度
        const tableHeight = this.tableParticle.getTableHeight(element)
        const tableWidth = this.tableParticle.getTableWidth(element)
        element.width = tableWidth
        element.height = tableHeight
        const elementWidth = tableWidth * scale
        const elementHeight = tableHeight * scale
        metrics.width = elementWidth
        metrics.height = elementHeight
        metrics.boundingBoxDescent = elementHeight
        metrics.boundingBoxAscent = -rowMargin
        // 表格分页处理(拆分表格)
        if (isPagingMode) {
          const height = this.getHeight()
          const marginHeight = this.getMainOuterHeight()
          let curPagePreHeight = marginHeight
          for (let r = 0; r < rowList.length; r++) {
            const row = rowList[r]
            if (
              row.height + curPagePreHeight > height ||
              rowList[r - 1]?.isPageBreak
            ) {
              curPagePreHeight = marginHeight + row.height
            } else {
              curPagePreHeight += row.height
            }
          }
          // 当前剩余高度是否能容下当前表格第一行（可拆分）的高度，排除掉表头类型
          const rowMarginHeight = rowMargin * 2 * scale
          if (
            curPagePreHeight + element.trList![0].height! + rowMarginHeight >
            height ||
            (element.pagingIndex !== 0 && element.trList![0].pagingRepeat)
          ) {
            // 无可拆分行则切换至新页
            curPagePreHeight = marginHeight
          }
          // 表格高度超过页面高度开始截断行
          if (curPagePreHeight + rowMarginHeight + elementHeight > height) {
            const trList = element.trList!
            // 计算需要移除的行数
            let deleteStart = 0
            let deleteCount = 0
            let preTrHeight = 0
            // 大于一行时再拆分避免循环
            if (trList.length > 1) {
              for (let r = 0; r < trList.length; r++) {
                const tr = trList[r]
                const trHeight = tr.height * scale
                if (
                  curPagePreHeight + rowMarginHeight + preTrHeight + trHeight >
                  height
                ) {
                  // 当前行存在跨行中断-暂时忽略分页
                  const rowColCount = tr.tdList.reduce(
                    (pre, cur) => pre + cur.colspan,
                    0
                  )
                  if (element.colgroup?.length !== rowColCount) {
                    deleteCount = 0
                  }
                  break
                } else {
                  deleteStart = r + 1
                  deleteCount = trList.length - deleteStart
                  preTrHeight += trHeight
                }
              }
            }
            if (deleteCount) {
              const cloneTrList = trList.splice(deleteStart, deleteCount)
              const cloneTrHeight = cloneTrList.reduce(
                (pre, cur) => pre + cur.height,
                0
              )
              const pagingId = element.pagingId || getUUID()
              element.pagingId = pagingId
              element.height -= cloneTrHeight
              metrics.height -= cloneTrHeight
              metrics.boundingBoxDescent -= cloneTrHeight
              // 追加拆分表格
              const cloneElement = deepClone(element)
              cloneElement.pagingId = pagingId
              cloneElement.pagingIndex = element.pagingIndex! + 1
              // 处理分页重复表头
              const repeatTrList = trList.filter(tr => tr.pagingRepeat)
              if (repeatTrList.length) {
                const cloneRepeatTrList = deepClone(repeatTrList)
                cloneRepeatTrList.forEach(tr => (tr.id = getUUID()))
                cloneTrList.unshift(...cloneRepeatTrList)
              }
              cloneElement.trList = cloneTrList
              cloneElement.id = getUUID()
              this.spliceElementList(elementList, i + 1, 0, cloneElement)
            }
          }
          // 表格经过分页处理-需要处理上下文
          if (element.pagingId) {
            const positionContext = this.position.getPositionContext()
            if (positionContext.isTable) {
              // 查找光标所在表格索引（根据trId搜索）
              let newPositionContextIndex = -1
              let newPositionContextTrIndex = -1
              let tableIndex = i
              while (tableIndex < elementList.length) {
                const curElement = elementList[tableIndex]
                if (curElement.pagingId !== element.pagingId) break
                const trIndex = curElement.trList!.findIndex(
                  r => r.id === positionContext.trId
                )
                if (~trIndex) {
                  newPositionContextIndex = tableIndex
                  newPositionContextTrIndex = trIndex
                  break
                }
                tableIndex++
              }
              if (~newPositionContextIndex) {
                positionContext.index = newPositionContextIndex
                positionContext.trIndex = newPositionContextTrIndex
                this.position.setPositionContext(positionContext)
              }
            }
          }
        }
      } else if (element.type === ElementType.SEPARATOR) {
        const {
          separator: { lineWidth }
        } = this.options
        element.width = availableWidth / scale
        metrics.width = availableWidth
        metrics.height = lineWidth * scale
        metrics.boundingBoxAscent = -rowMargin
        metrics.boundingBoxDescent = -rowMargin + metrics.height
      } else if (element.type === ElementType.PAGE_BREAK) {
        element.width = availableWidth / scale
        metrics.width = availableWidth
        metrics.height = defaultSize
      } else if (
        element.type === ElementType.RADIO ||
        element.controlComponent === ControlComponent.RADIO
      ) {
        const { width, height, gap } = this.options.radio
        const elementWidth = width + gap * 2
        element.width = elementWidth
        metrics.width = elementWidth * scale
        metrics.height = height * scale
      } else if (
        element.type === ElementType.CHECKBOX ||
        element.controlComponent === ControlComponent.CHECKBOX
      ) {
        const { width, height, gap } = this.options.checkbox
        const elementWidth = width + gap * 2
        element.width = elementWidth
        metrics.width = elementWidth * scale
        metrics.height = height * scale
      } else if (element.type === ElementType.TAB) {
        metrics.width = defaultTabWidth * scale
        metrics.height = defaultSize * scale
        metrics.boundingBoxDescent = 0
        metrics.boundingBoxAscent = metrics.height
      } else if (element.type === ElementType.BLOCK) {
        if (!element.width) {
          metrics.width = availableWidth
        } else {
          const elementWidth = element.width * scale
          metrics.width = Math.min(elementWidth, availableWidth)
        }
        metrics.height = element.height! * scale
        metrics.boundingBoxDescent = metrics.height
        metrics.boundingBoxAscent = 0
      } else {
        // 设置上下标真实字体尺寸
        const size = element.size || defaultSize
        if (
          element.type === ElementType.SUPERSCRIPT ||
          element.type === ElementType.SUBSCRIPT
        ) {
          element.actualSize = Math.ceil(size * 0.6)
        }
        metrics.height = (element.actualSize || size) * scale
        this.getCtx2d().font = this.getElementFont(element)
        const fontMetrics = this.textParticle.measureText(this.getCtx2d(), element)
        metrics.width = fontMetrics.width * scale
        if (element.letterSpacing) {
          metrics.width += element.letterSpacing * scale
        }
        metrics.boundingBoxAscent =
          (element.value === ZERO
            ? element.size || defaultSize
            : fontMetrics.actualBoundingBoxAscent) * scale
        metrics.boundingBoxDescent =
          fontMetrics.actualBoundingBoxDescent * scale
        if (element.type === ElementType.SUPERSCRIPT) {
          metrics.boundingBoxAscent += metrics.height / 2
        } else if (element.type === ElementType.SUBSCRIPT) {
          metrics.boundingBoxDescent += metrics.height / 2
        }
      }
      const ascent =
        (element.imgDisplay !== ImageDisplay.INLINE &&
          element.type === ElementType.IMAGE) ||
          element.type === ElementType.LATEX
          ? metrics.height + rowMargin
          : metrics.boundingBoxAscent + rowMargin
      const height =
        rowMargin +
        metrics.boundingBoxAscent +
        metrics.boundingBoxDescent +
        rowMargin
      const rowElement: IRowElement = Object.assign(element, {
        metrics,
        left: 0,
        style: this.getElementFont(element, scale)
      })
      // 暂时只考虑非换行场景：控件开始时统计宽度，结束时消费宽度及还原
      if (rowElement.control?.minWidth) {
        if (rowElement.controlComponent) {
          controlRealWidth += metrics.width
        }
        if (rowElement.controlComponent === ControlComponent.POSTFIX) {
          const extraWidth = rowElement.control.minWidth - controlRealWidth
          // 消费超出实际最小宽度的长度
          if (extraWidth > 0) {
            // 超出行宽时截断
            const rowRemainingWidth =
              availableWidth - curRow.width - metrics.width
            const left = Math.min(rowRemainingWidth, extraWidth) * scale
            rowElement.left = left
            curRow.width += left
          }
          controlRealWidth = 0
        }
      }
      // 超过限定宽度
      const preElement = elementList[i - 1]
      let nextElement = elementList[i + 1]
      // 累计行宽 + 当前元素宽度 + 排版宽度(英文单词整体宽度 + 后面标点符号宽度)
      let curRowWidth = curRow.width + metrics.width
      if (this.options.wordBreak === WordBreak.BREAK_WORD) {
        if (
          (!preElement?.type || preElement?.type === ElementType.TEXT) &&
          (!element.type || element.type === ElementType.TEXT)
        ) {
          // 英文单词
          const word = `${preElement?.value || ''}${element.value}`
          if (this.WORD_LIKE_REG.test(word)) {
            const { width, endElement } = this.textParticle.measureWord(
              this.getCtx2d(),
              elementList,
              i
            )
            // 单词宽度大于行可用宽度，无需折行
            const wordWidth = width * scale
            if (wordWidth <= availableWidth) {
              curRowWidth += wordWidth
              nextElement = endElement
            }
          }
          // 标点符号
          const punctuationWidth = this.textParticle.measurePunctuationWidth(
            this.getCtx2d(),
            nextElement
          )
          curRowWidth += punctuationWidth * scale
        }
      }
      // 列表信息
      if (element.listId) {
        if (element.listId !== listId) {
          listIndex = 0
        } else if (element.value === ZERO && !element.listWrap) {
          listIndex++
        }
      }
      listId = element.listId
      // 计算四周环绕导致的元素偏移量
      const surroundPosition = this.position.setSurroundPosition({
        pageNo,
        rowElement,
        row: curRow,
        rowElementRect: {
          x,
          y,
          height,
          width: metrics.width
        },
        availableWidth,
        surroundElementList
      })
      x = surroundPosition.x
      curRowWidth += surroundPosition.rowIncreaseWidth
      x += metrics.width
      // 是否强制换行
      const isForceBreak =
        element.type === ElementType.SEPARATOR ||
        element.type === ElementType.TABLE ||
        preElement?.type === ElementType.TABLE ||
        preElement?.type === ElementType.BLOCK ||
        element.type === ElementType.BLOCK ||
        preElement?.imgDisplay === ImageDisplay.INLINE ||
        element.imgDisplay === ImageDisplay.INLINE ||
        preElement?.listId !== element.listId ||
        (i !== 0 && element.value === ZERO)
      // 是否宽度不足导致换行
      const isWidthNotEnough = curRowWidth > availableWidth
      const isWrap = isForceBreak || isWidthNotEnough
      // 新行数据处理
      if (isWrap) {
        const row: IRow = {
          width: metrics.width,
          height,
          startIndex: i,
          elementList: [rowElement],
          ascent,
          rowIndex: curRow.rowIndex + 1,
          rowFlex: elementList[i]?.rowFlex || elementList[i + 1]?.rowFlex,
          isPageBreak: element.type === ElementType.PAGE_BREAK
        }
        // 控件缩进
        if (
          rowElement.controlComponent !== ControlComponent.PREFIX &&
          rowElement.control?.indentation === ControlIndentation.VALUE_START
        ) {
          // 查找到非前缀的第一个元素位置
          const preStartIndex = curRow.elementList.findIndex(
            el =>
              el.controlId === rowElement.controlId &&
              el.controlComponent !== ControlComponent.PREFIX
          )
          if (~preStartIndex) {
            const preRowPositionList = this.position.computeRowPosition({
              row: curRow,
              innerWidth: this.getInnerWidth()
            })
            const valueStartPosition = preRowPositionList[preStartIndex]
            if (valueStartPosition) {
              row.offsetX = valueStartPosition.coordinate.leftTop[0]
            }
          }
        }
        // 列表缩进
        if (element.listId) {
          row.isList = true
          row.offsetX = listStyleMap.get(element.listId!)
          row.listIndex = listIndex
        }
        rowList.push(row)
      } else {
        curRow.width += metrics.width
        // 减小块元素前第一行空行行高
        if (i === 0 && getIsBlockElement(elementList[1])) {
          curRow.height = defaultBasicRowMarginHeight
          curRow.ascent = defaultBasicRowMarginHeight
        } else if (curRow.height < height) {
          curRow.height = height
          curRow.ascent = ascent
        }
        curRow.elementList.push(rowElement)
      }
      // 行结束时逻辑
      if (isWrap || i === elementList.length - 1) {
        // 换行原因：宽度不足
        curRow.isWidthNotEnough = isWidthNotEnough && !isForceBreak
        // 两端对齐、分散对齐
        if (
          !curRow.isSurround &&
          (preElement?.rowFlex === RowFlex.JUSTIFY ||
            (preElement?.rowFlex === RowFlex.ALIGNMENT && isWidthNotEnough))
        ) {
          // 忽略换行符及尾部元素间隔设置
          const rowElementList =
            curRow.elementList[0]?.value === ZERO
              ? curRow.elementList.slice(1)
              : curRow.elementList
          const gap =
            (availableWidth - curRow.width) / (rowElementList.length - 1)
          for (let e = 0; e < rowElementList.length - 1; e++) {
            const el = rowElementList[e]
            el.metrics.width += gap
          }
          curRow.width = availableWidth
        }
      }
      // 重新计算坐标、页码、下一行首行元素环绕交叉
      if (isWrap) {
        x = startX
        y += curRow.height
        if (
          isPagingMode &&
          !isFromTable &&
          pageHeight &&
          (y - startY + mainOuterHeight + height > pageHeight ||
            element.type === ElementType.PAGE_BREAK)
        ) {
          y = startY
          // 删除多余四周环绕型元素
          deleteSurroundElementList(surroundElementList, pageNo)
          pageNo += 1
        }
        // 计算下一行第一个元素是否存在环绕交叉
        rowElement.left = 0
        const nextRow = rowList[rowList.length - 1]
        const surroundPosition = this.position.setSurroundPosition({
          pageNo,
          rowElement,
          row: nextRow,
          rowElementRect: {
            x: x,
            y,
            height,
            width: metrics.width
          },
          availableWidth,
          surroundElementList
        })
        x = surroundPosition.x
        x += metrics.width
      }
    }
    return rowList
  }

  // private _computePageList(): IRow[][] {
  //   const pageRowList: IRow[][] = [[]]
  //   const {
  //     pageMode,
  //     pageNumber: { maxPageNo }
  //   } = this.options
  //   const height = this.getHeight()
  //   const marginHeight = this.getMainOuterHeight()
  //   let pageHeight = marginHeight
  //   let pageNo = 0
  //   if (pageMode === PageMode.CONTINUITY) {
  //     pageRowList[0] = this.rowList
  //     // 重置高度
  //     pageHeight += this.rowList.reduce((pre, cur) => pre + cur.height, 0)
  //     const dpr = this.getPagePixelRatio()
  //     const pageDom = this.pageList[0]
  //     const pageDomHeight = Number(pageDom.style.height.replace('px', ''))
  //     if (pageHeight > pageDomHeight) {
  //       pageDom.style.height = `${pageHeight}px`
  //       pageDom.height = pageHeight * dpr
  //     } else {
  //       const reduceHeight = pageHeight < height ? height : pageHeight
  //       pageDom.style.height = `${reduceHeight}px`
  //       pageDom.height = reduceHeight * dpr
  //     }
  //     this._initPageContext(this.ctxList[0])
  //   } else {
  //     for (let i = 0; i < this.rowList.length; i++) {
  //       const row = this.rowList[i]
  //       if (
  //         row.height + pageHeight > height ||
  //         this.rowList[i - 1]?.isPageBreak
  //       ) {
  //         if (Number.isInteger(maxPageNo) && pageNo >= maxPageNo!) {
  //           this.elementList = this.elementList.slice(0, row.startIndex)
  //           break
  //         }
  //         pageHeight = marginHeight + row.height
  //         pageRowList.push([row])
  //         pageNo++
  //       } else {
  //         pageHeight += row.height
  //         pageRowList[pageNo].push(row)
  //       }
  //     }
  //   }
  //   return pageRowList
  // }

  private _drawHighlight(
    ctx2d: Context2d,
    payload: IDrawRowPayload
  ) {
    const {
      control: { activeBackgroundColor }
    } = this.options
    const { rowList, positionList } = payload
    // const activeControlElement = this.control.getActiveControl()?.getElement()
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        // const preElement = curRow.elementList[j - 1]
        //     if (
        //       element.highlight ||
        //       (activeBackgroundColor &&
        //         activeControlElement &&
        //         element.controlId === activeControlElement.controlId &&
        //         !this.control.getIsRangeInPostfix())
        //     ) {
        //       // 高亮元素相连需立即绘制，并记录下一元素坐标
        //       if (
        //         preElement &&
        //         preElement.highlight &&
        //         preElement.highlight !== element.highlight
        //       ) {
        //         this.highlight.render(ctx2d)
        //       }
        // 当前元素位置信息记录
        const {
          coordinate: {
            leftTop: [x, y]
          }
        } = positionList[curRow.startIndex + j]
        // 元素向左偏移量
        const offsetX = element.left || 0
        this.highlight.recordFillInfo(
          ctx2d,
          x - offsetX,
          y,
          element.metrics.width + offsetX,
          curRow.height,
          element.highlight || activeBackgroundColor
        )
        //     } else 
        // if (preElement?.highlight) {
        //   // 之前是高亮元素，当前不是需立即绘制
        this.highlight.render(ctx2d)
        // }
      }
      // this.highlight.render(ctx2d)
    }
  }

  public drawRow(ctx2d: Context2d, payload: IDrawRowPayload) {
    // 优先绘制高亮元素
    this._drawHighlight(ctx2d, payload)
    // 绘制元素、下划线、删除线、选区
    const {
      scale,
      table: { tdPadding },
      group,
      lineBreak
    } = this.options
    const {
      rowList,
      pageNo,
      // elementList,
      positionList,
      // startIndex,
      zone,
      isDrawLineBreak = !lineBreak.disabled
    } = payload
    const isPrintMode = this.mode === EditorMode.PRINT
    // const { isCrossRowCol } = this.range.getRange()
    // let index = startIndex
    // let offY = 0
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      // 选区绘制记录
      // const rangeRecord: IElementFillRect = {
      //   x: 0,
      //   y: 0,
      //   width: 0,
      //   height: 0
      // }
      // let tableRangeElement: IElement | null = null
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const metrics = element.metrics
        console.log('element')
        console.log(element)
        // 当前元素位置信息
        const {
          ascent: offsetY,
          coordinate: {
            leftTop: [x, y]
          }
        } = positionList[curRow.startIndex + j]
        // offY += y
        const preElement = curRow.elementList[j - 1]
        // 元素绘制
        if (element.type === ElementType.IMAGE) {
          this.textParticle.complete()
          // 浮动图片单独绘制
          if (
            element.imgDisplay !== ImageDisplay.SURROUND &&
            element.imgDisplay !== ImageDisplay.FLOAT_TOP &&
            element.imgDisplay !== ImageDisplay.FLOAT_BOTTOM
          ) {
            this.imageParticle.render(this.getCtx2d(), element, x, y + offsetY)
          }
        } else if (element.type === ElementType.LATEX) {
          this.textParticle.complete()
          this.laTexParticle.render(this.getCtx2d(), element, x, y + offsetY)
        } else if (element.type === ElementType.TABLE) {
          // if (isCrossRowCol) {
          //   rangeRecord.x = x
          //   rangeRecord.y = y
          //   // tableRangeElement = element
          // }
          this.tableParticle.render(this.getCtx2d(), element, x, y)
        } else if (element.type === ElementType.HYPERLINK) {
          this.textParticle.complete()
          this.hyperlinkParticle.render(this.getCtx2d(), element, x, y + offsetY)
        } else if (element.type === ElementType.DATE) {
          const nextElement = curRow.elementList[j + 1]
          // 释放之前的
          if (!preElement || preElement.dateId !== element.dateId) {
            this.textParticle.complete()
          }
          this.textParticle.record(this.getCtx2d(), element, x, y + offsetY)
          if (!nextElement || nextElement.dateId !== element.dateId) {
            // 手动触发渲染
            this.textParticle.complete()
          }
        } else if (element.type === ElementType.SUPERSCRIPT) {
          this.textParticle.complete()
          this.superscriptParticle.render(this.getCtx2d(), element, x, y + offsetY)
        } else if (element.type === ElementType.SUBSCRIPT) {
          this.underline.render(this.getCtx2d())
          this.textParticle.complete()
          this.subscriptParticle.render(this.getCtx2d(), element, x, y + offsetY)
        } else if (element.type === ElementType.SEPARATOR) {
          this.separatorParticle.render(this.getCtx2d(), element, x, y)
        } else if (element.type === ElementType.PAGE_BREAK) {
          if (this.mode !== EditorMode.CLEAN && !isPrintMode) {
            this.pageBreakParticle.render(this.getCtx2d(), element, x, y)
          }
        } else if (
          element.type === ElementType.CHECKBOX ||
          element.controlComponent === ControlComponent.CHECKBOX
        ) {
          this.textParticle.complete()
          this.checkboxParticle.render({
            ctx2d: this.getCtx2d(),
            x,
            y: y + offsetY,
            index: j,
            row: curRow
          })
        } else if (
          element.type === ElementType.RADIO ||
          element.controlComponent === ControlComponent.RADIO
        ) {
          this.textParticle.complete()
          this.radioParticle.render({
            ctx2d: this.getCtx2d(),
            x,
            y: y + offsetY,
            index: j,
            row: curRow
          })
        } else if (element.type === ElementType.TAB) {
          this.textParticle.complete()
        } else if (
          element.rowFlex === RowFlex.ALIGNMENT ||
          element.rowFlex === RowFlex.JUSTIFY
        ) {
          // 如果是两端对齐，因canvas目前不支持letterSpacing需单独绘制文本
          this.textParticle.record(this.getCtx2d(), element, x, y + offsetY)
          this.textParticle.complete()
        } else if (element.type === ElementType.BLOCK) {
          this.textParticle.complete()
          this.blockParticle.render(pageNo, element, x, y)
        } else {
          // 如果当前元素设置左偏移，则上一元素立即绘制
          if (element.left) {
            this.textParticle.complete()
          }
          this.textParticle.record(this.getCtx2d(), element, x, y + offsetY)
          // 如果设置字宽、字间距、标点符号（避免浏览器排版缩小间距）需单独绘制
          if (
            element.width ||
            element.letterSpacing ||
            PUNCTUATION_REG.test(element.value)
          ) {
            this.textParticle.complete()
          }
        }
        // 换行符绘制
        if (
          isDrawLineBreak &&
          !isPrintMode &&
          this.mode !== EditorMode.CLEAN &&
          !curRow.isWidthNotEnough &&
          j === curRow.elementList.length - 1
        ) {
          this.lineBreakParticle.render(this.getCtx2d(), element, x, y + curRow.height / 2)
        }
        // // 边框绘制（目前仅支持控件）
        // if (element.control?.border) {
        //   // 不同控件边框立刻绘制
        //   if (
        //     preElement?.control?.border &&
        //     preElement.controlId !== element.controlId
        //   ) {
        //     this.control.drawPdfBorder(this.getCtx2d())
        //   }
        //   // 当前元素位置信息记录
        //   const rowMargin = this.getElementRowMargin(element)
        //   this.control.recordBorderInfo(
        //     x,
        //     y + rowMargin,
        //     element.metrics.width,
        //     curRow.height - 2 * rowMargin
        //   )
        // } else if (preElement?.control?.border) {
        //   this.control.drawPdfBorder(this.getCtx2d())
        // }
        // 下划线记录
        if (element.underline || element.control?.underline) {
          // 下标元素下划线单独绘制
          if (
            preElement?.type === ElementType.SUBSCRIPT &&
            element.type !== ElementType.SUBSCRIPT
          ) {
            this.underline.render(this.getCtx2d())
          }
          // 行间距
          const rowMargin = this.getElementRowMargin(element)
          // 元素向左偏移量
          const offsetX = element.left || 0
          // 下标元素y轴偏移值
          let offsetY = 0
          if (element.type === ElementType.SUBSCRIPT) {
            offsetY = this.subscriptParticle.getOffsetY(element)
          }
          // 占位符不参与颜色计算
          const color =
            element.controlComponent === ControlComponent.PLACEHOLDER
              ? undefined
              : element.color
          this.underline.recordFillInfo(
            this.getCtx2d(),
            x - offsetX,
            y + curRow.height - rowMargin + offsetY,
            metrics.width + offsetX,
            0,
            color,
            element.textDecoration?.style
          )
        } else if (preElement?.underline || preElement?.control?.underline) {
          this.underline.render(this.getCtx2d())
        }
        // 删除线记录
        if (element.strikeout) {
          // 仅文本类元素支持删除线
          if (!element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)) {
            // 字体大小不同时需立即绘制
            if (
              preElement &&
              ((preElement.type === ElementType.SUBSCRIPT &&
                element.type !== ElementType.SUBSCRIPT) ||
                (preElement.type === ElementType.SUPERSCRIPT &&
                  element.type !== ElementType.SUPERSCRIPT) ||
                this.getElementSize(preElement) !==
                this.getElementSize(element))
            ) {
              this.strikeout.render(this.getCtx2d())
            }
            // 基线文字测量信息
            const standardMetrics = this.textParticle.measureBasisWord(
              this.getCtx2d(),
              this.getElementFont(element)
            )
            // 文字渲染位置 + 基线文字下偏移量 - 一半文字高度
            let adjustY =
              y +
              offsetY +
              standardMetrics.actualBoundingBoxDescent * scale -
              metrics.height / 2
            // 上下标位置调整
            if (element.type === ElementType.SUBSCRIPT) {
              adjustY += this.subscriptParticle.getOffsetY(element)
            } else if (element.type === ElementType.SUPERSCRIPT) {
              adjustY += this.superscriptParticle.getOffsetY(element)
            }
            this.strikeout.recordFillInfo(this.getCtx2d(), x, adjustY, metrics.width)
          }
        } else if (preElement?.strikeout) {
          this.strikeout.render(this.getCtx2d())
        }
        // // 选区记录
        // const {
        //   zone: currentZone,
        //   startIndex,
        //   endIndex
        // } = this.range.getRange()
        // if (
        //   currentZone === zone &&
        //   startIndex !== endIndex &&
        //   startIndex <= index &&
        //   index <= endIndex
        // ) {
        //   const positionContext = this.position.getPositionContext()
        //   // 表格需限定上下文
        //   if (
        //     (!positionContext.isTable && !element.tdId) ||
        //     positionContext.tdId === element.tdId
        //   ) {
        //     // 从行尾开始-绘制最小宽度
        //     if (startIndex === index) {
        //       const nextElement = elementList[startIndex + 1]
        //       if (nextElement && nextElement.value === ZERO) {
        //         rangeRecord.x = x + metrics.width
        //         rangeRecord.y = y
        //         rangeRecord.height = curRow.height
        //         rangeRecord.width += this.options.rangeMinWidth
        //       }
        //     } else {
        //       let rangeWidth = metrics.width
        //       // 最小选区宽度
        //       if (rangeWidth === 0 && curRow.elementList.length === 1) {
        //         rangeWidth = this.options.rangeMinWidth
        //       }
        //       // 记录第一次位置、行高
        //       if (!rangeRecord.width) {
        //         rangeRecord.x = x
        //         rangeRecord.y = y
        //         rangeRecord.height = curRow.height
        //       }
        //       rangeRecord.width += rangeWidth
        //     }
        //   }
        // }
        // 组信息记录
        if (!group.disabled && element.groupIds) {
          this.group.recordFillInfo(element, x, y, metrics.width, curRow.height)
        }
        // index++
        // 绘制表格内元素
        if (element.type === ElementType.TABLE) {
          const tdPaddingWidth = tdPadding[1] + tdPadding[3]
          for (let t = 0; t < element.trList!.length; t++) {
            const tr = element.trList![t]
            for (let d = 0; d < tr.tdList!.length; d++) {
              const td = tr.tdList[d]
              this.drawRow(ctx2d, {
                elementList: td.value,
                positionList: td.positionList!,
                rowList: td.rowList!,
                pageNo,
                startIndex: 0,
                innerWidth: (td.width! - tdPaddingWidth) * scale,
                zone,
                isDrawLineBreak
              })
            }
          }
        }
      }
      // 绘制列表样式
      if (curRow.isList) {
        this.listParticle.drawListStyle(
          ctx2d,
          curRow,
          positionList[curRow.startIndex]
        )
      }
      // 绘制文字、边框、下划线、删除线
      this.textParticle.complete()
      // this.control.drawPdfBorder(this.getCtx2d())
      this.underline.render(this.getCtx2d())
      this.strikeout.render(this.getCtx2d())
      // 绘制批注样式
      this.group.render(this.getCtx2d())
      // // 绘制选区
      // if (!isPrintMode) {
      //   if (rangeRecord.width && rangeRecord.height) {
      //     const { x, y, width, height } = rangeRecord
      //     this.range.render(ctx, x, y, width, height)
      //   }
      //   if (
      //     isCrossRowCol &&
      //     tableRangeElement &&
      //     tableRangeElement.id === tableId
      //   ) {
      //     const {
      //       coordinate: {
      //         leftTop: [x, y]
      //       }
      //     } = positionList[curRow.startIndex]
      //     this.tableParticle.drawRange(ctx, tableRangeElement, x, y)
      //   }
      // }
    }
  }

  private _drawFloat(
    ctx2d: Context2d,
    payload: IDrawFloatPayload
  ) {
    const { scale } = this.options
    const floatPositionList = this.position.getFloatPositionList()
    const { imgDisplays, pageNo } = payload
    for (let e = 0; e < floatPositionList.length; e++) {
      const floatPosition = floatPositionList[e]
      const element = floatPosition.element
      if (
        (pageNo === floatPosition.pageNo ||
          floatPosition.zone === EditorZone.HEADER ||
          floatPosition.zone == EditorZone.FOOTER) &&
        element.imgDisplay &&
        imgDisplays.includes(element.imgDisplay) &&
        element.type === ElementType.IMAGE
      ) {
        const imgFloatPosition = element.imgFloatPosition!
        this.imageParticle.render(
          ctx2d,
          element,
          imgFloatPosition.x * scale,
          imgFloatPosition.y * scale
        )
      }
    }
  }

  private _clearPage(pageNo: number) {
    const ctx = this.getCtx2d()
    const pageDom = this.draw.getPageList()[pageNo]
    if (pageDom) {
      ctx.clearRect(
        0,
        0,
        Math.max(pageDom.width, this.getWidth()),
        Math.max(pageDom.height, this.getHeight())
      )
    }
    this.blockParticle.clear()
  }

  private _drawPage(payload: IDrawPagePayload) {
    const { elementList, positionList, rowList, pageNo } = payload
    const {
      // inactiveAlpha,
      pageMode,
      header,
      footer,
      pageNumber,
      lineNumber,
      pageBorder
    } = this.options
    const innerWidth = this.getInnerWidth()
    // const ctx = this.ctxList[pageNo]
    const ctx2d = this.getCtx2d()
    this.getPdf().setPage(pageNo + 1)
    // 判断当前激活区域-非正文区域时元素透明度降低
    // ctx2d.globalAlpha = !this.zone.isMainActive() ? inactiveAlpha : 1
    this._clearPage(pageNo)
    // 绘制背景
    this.background.render(ctx2d, pageNo)
    // 绘制页边距
    if (this.mode !== EditorMode.PRINT) {
      this.margin.render(ctx2d, pageNo)
    }
    // 渲染衬于文字下方元素
    this._drawFloat(ctx2d, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_BOTTOM]
    })
    // 控件高亮
    // this.control.renderHighlightList(ctx2d, pageNo)
    // 渲染元素
    const index = rowList[0]?.startIndex
    this.drawRow(ctx2d, {
      elementList,
      positionList,
      rowList,
      pageNo,
      startIndex: index,
      innerWidth,
      zone: EditorZone.MAIN
    })
    // if (this.getIsPagingMode()) {
    if (this.getOptions().pageMode === PageMode.PAGING) {
      // 绘制页眉
      if (!header.disabled) {
        this.header.render(ctx2d, pageNo)
      }
      // 绘制页码
      if (!pageNumber.disabled) {
        this.pageNumber.render(ctx2d, pageNo)
      }
      // 绘制页脚
      if (!footer.disabled) {
        this.footer.render(ctx2d, pageNo)
      }
    }
    // 渲染浮于文字上方元素
    this._drawFloat(ctx2d, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND]
    })
    // // 搜索匹配绘制
    // if (this.search.getSearchKeyword()) {
    //   this.search.render(ctx, pageNo)
    // }
    // 绘制水印
    if (pageMode !== PageMode.CONTINUITY && this.options.watermark.data) {
      this.waterMark.render(ctx2d)
    }
    // 绘制空白占位符
    if (this.elementList.length <= 1 && !this.elementList[0]?.listId) {
      this.placeholder.render(ctx2d)
    }
    // 渲染行数
    if (!lineNumber.disabled) {
      this.lineNumber.render(ctx2d, pageNo)
    }
    // 绘制页面边框
    if (!pageBorder.disabled) {
      this.pageBorder.render(ctx2d)
    }
  }

  private _immediateRender() {
    const positionList = this.draw.getPosition().getOriginalMainPositionList()
    const elementList = this.getOriginalMainElementList()
    for (let i = 0; i < this.pageRowList.length; i++) {
      this._drawPage({
        elementList,
        positionList,
        rowList: this.pageRowList[i],
        pageNo: i
      })
    }
  }

  public render(payload?: IDrawOption) {
    const { header, footer } = this.options
    const {
      isCompute = true
    } = payload || {}
    const innerWidth = this.getInnerWidth()
    const isPagingMode = this.getOptions().pageMode === PageMode.PAGING
    // 缓存当前页数信息
    // 计算文档信息
    if (isCompute) {
      // 清空浮动元素位置信息
      this.position.setFloatPositionList([])
      if (isPagingMode) {
        // 页眉信息
        if (!header.disabled) {
          this.header.compute()
        }
        // 页脚信息
        if (!footer.disabled) {
          this.footer.compute()
        }
      }
      // 行信息
      const margins = this.getMargins()
      const pageHeight = this.getHeight()
      const extraHeight = this.header.getExtraHeight()
      const mainOuterHeight = this.getMainOuterHeight()
      const startX = margins[3]
      const startY = margins[0] + extraHeight
      const surroundElementList = pickSurroundElementList(this.elementList)
      this.rowList = this.computeRowList({
        startX,
        startY,
        pageHeight,
        mainOuterHeight,
        isPagingMode,
        innerWidth,
        surroundElementList,
        elementList: this.elementList
      })!
      // 页面信息
      this.pageRowList = this.draw.getPageRowList()
      // 位置信息
      this.position.computePositionList()
      // // 控件关键词高亮
      // this.control.computeHighlightList()
    }
    // 创建纸张
    for (let i = 0; i < this.pageRowList.length; i++) {
      if (!this.pageList[i]) {
        this._createPage(i)
      }
    }
    // 移除多余页
    const curPageCount = this.pageRowList.length
    const prePageCount = this.pageList.length
    if (prePageCount > curPageCount) {
      const deleteCount = prePageCount - curPageCount
      this.ctxList.splice(curPageCount, deleteCount)
      this.pageList
        .splice(curPageCount, deleteCount)
        .forEach((page, index) => {
          page.remove()
          this.getPdf().deletePage(index + 1)
        })
    }
    if (this.getPdf().getNumberOfPages() > this.draw.getPageList().length) {
      const deleteCount = this.getPdf().getNumberOfPages() - this.draw.getPageList().length
      for (let i = 1; i <= deleteCount; i++) {
        this.getPdf().deletePage(i)
      }
    }
    if (this.getPdf().getNumberOfPages() < this.draw.getPageList().length) {
      const addCount = this.draw.getPageList().length - this.getPdf().getNumberOfPages()
      for (let i = 1; i <= addCount; i++) {
        this.getPdf().addPage()
      }
    }
    this._immediateRender()
    if (this.getPdf().getNumberOfPages() > this.draw.getPageList().length) {
      const deleteCount = this.getPdf().getNumberOfPages() - this.draw.getPageList().length
      for (let i = 1; i <= deleteCount; i++) {
        this.getPdf().deletePage(i)
      }
    }
  }

  public destroy() {
    this.container.remove()
  }
}
