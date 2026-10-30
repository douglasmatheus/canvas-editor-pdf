import { ZERO } from '../../dataset/constant/Common'
import { RowFlex } from '../../dataset/enum/Row'
import {
  IComputeRowListPayload,
  IDrawFloatPayload,
  IDrawOption,
  IDrawPagePayload,
  IDrawRowPayload,
  IGetOriginValueOption,
  IGetValueOption
} from '../../interface/Draw'
import { IEditorData, IEditorOption, IUpdateOption } from '../../interface/Editor'
import { IElement } from '../../interface/Element'
import { deepClone } from '../../utils'
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
import { TablePaging } from './particle/table/TablePaging'
import { HyperlinkParticle } from './particle/HyperlinkParticle'
import { LabelParticle } from './particle/LabelParticle'
import { Header } from './frame/Header'
import { SuperscriptParticle } from './particle/Superscript'
import { SubscriptParticle } from './particle/Subscript'
import { SeparatorParticle } from './particle/Separator'
import { Watermark } from './frame/Watermark'
import { WatermarkLayer } from '../../dataset/enum/Watermark'
import {
  EditorMode,
  EditorZone,
  PageMode,
  PaperDirection
} from '../../dataset/enum/Editor'
import { pickSurroundElementList, zipElementList } from '../../utils/element'
import { CheckboxParticle } from './particle/CheckboxParticle'
import { RadioParticle } from './particle/RadioParticle'
import { DeepRequired, IPadding } from '../../interface/Common'
import { ControlComponent } from '../../dataset/enum/Control'
import { formatElementList } from '../../utils/element'
import { DateParticle } from './particle/date/DateParticle'
import { IMargin } from '../../interface/Margin'
import { BlockParticle } from './particle/block/BlockParticle'
import { I18n } from '../i18n/I18n'
import { ImageObserver } from '../observer/ImageObserver'
import { Footer } from './frame/Footer'
import { TEXTLIKE_ELEMENT_TYPE } from '../../dataset/constant/Element'
import { ListParticle } from './particle/ListParticle'
import { Placeholder } from './frame/Placeholder'
import { Group } from './interactive/Group'
import { ImageDisplay } from '../../dataset/enum/Common'
import { PUNCTUATION_REG } from '../../dataset/constant/Regular'
import { LineBreakParticle } from './particle/LineBreakParticle'
import { LineNumber } from './frame/LineNumber'
import { PageBorder } from './frame/PageBorder'
import { jsPDF, Context2d } from 'jspdf'
import { IRow } from '../../interface/Row'
import { IColumnLayout, IColumnOption } from '../../interface/Column'
import { ColumnManager } from './column/ColumnManager'
import { ITd } from '../../interface/table/Td'
import { mergeOption } from '../../utils/option'
import { Area } from './interactive/Area'
import { Graffiti } from './graffiti/Graffiti'
import { Badge } from './frame/Badge'
import { platform } from '../../platform/current'
import { LayoutEngine } from '../layout/LayoutEngine'
import { TextMeasurer } from '../layout/TextMeasurer'
import type { IRenderBackend } from '../render/RenderBackend'
import { PdfBackend } from '../render/pdf/PdfBackend'
import { DisplayList } from '../render/model/DisplayList'
import type { IRenderContext } from '../render/model/RenderContext'
// import { Draw } from '@hufe921/canvas-editor/dist/src/editor/core/draw/Draw'
// import { IEditorData } from '@hufe921/canvas-editor'
// import { ITd } from '@hufe921/canvas-editor/dist/src/editor/interface/table/Td'
// import { IRow, IRowElement } from '@hufe921/canvas-editor/dist/src/editor/interface/Row'

/**
 * Where to fetch the default fonts from when `loadDefaultFonts: true`.
 *
 *   - `'cdn'` (browser default): fetch TTFs from cdn.jsdelivr.net. Requires
 *     network access; works in both browser and Node.
 *   - `'bundled'` (node default): read TTFs from the package's dist/font/
 *     directory. Resolved relative to the running module — no network needed.
 *   - `{ dir }`: read TTFs from an absolute filesystem path that the consumer
 *     supplies. Useful for custom font installs in Node deployments.
 */
export type FontSource = 'cdn' | 'bundled' | { dir: string }

export type PdfOptions = {
  loadDefaultFonts?: boolean
  fontSource?: FontSource
}

export class DrawPdf {
  // private draw: Draw
  private fakeCanvas: HTMLCanvasElement
  private fakeCtx: CanvasRenderingContext2D
  private textMeasurer: TextMeasurer
  // private container: HTMLDivElement
  private pageList: any[]
  private ctxListInfos: any[]
  private pageNo: number
  private mode: EditorMode
  private options: DeepRequired<IEditorOption>
  private position: Position
  private elementList: IElement[]
  private pdf!: jsPDF
  private fontCache: Array<{
    fileName: string
    base64: string
    id: string
    type: string
  }> = []
  private fontSource: FontSource = 'cdn'
  private warnedFontFamilySet = new Set<string>()

  private i18n: I18n
  private margin: Margin
  private background: Background
  private badge: Badge
  private group: Group
  private area: Area
  private underline: Underline
  private strikeout: Strikeout
  private highlight: Highlight
  private imageParticle: ImageParticle
  private laTexParticle: LaTexParticle
  private textParticle: TextParticle
  private tableParticle: TableParticle
  private tablePaging: TablePaging
  private pageNumber: PageNumber
  private lineNumber: LineNumber
  private waterMark: Watermark
  private placeholder: Placeholder
  private header: Header
  private footer: Footer
  private hyperlinkParticle: HyperlinkParticle
  private labelParticle: LabelParticle
  private dateParticle: DateParticle
  private separatorParticle: SeparatorParticle
  // private pageBreakParticle: PageBreakParticle
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
  private graffiti: Graffiti

  private LETTER_REG: RegExp
  private WORD_LIKE_REG: RegExp
  private rowList: IRow[]
  private pageRowList: IRow[][]
  private pageDirectionList: PaperDirection[]
  private printModeData: Required<Omit<IEditorData, 'graffiti'>> | null
  private columnManager: ColumnManager
  private layoutEngine: LayoutEngine
  private backend: IRenderBackend

  public defaultFontsLoadedPromise: Promise<boolean>

  constructor(
    // canvas-editor's IEditorOption is a separate copy — and, when consumed
    // from the editor's own source, a different module instance entirely — so
    // its enum-typed fields (mode, pageMode, …) are nominally incompatible and
    // no type union can accept `editor.command.getValue().options`. Options are
    // normalized by mergeOption at the boundary, so accept a loose object here;
    // pass this lib's IEditorOption for full autocomplete. (`object` rather
    // than Record<string, unknown> because interface types have no implicit
    // index signature and aren't assignable to Record.)
    options: IEditorOption | object,
    data: IEditorData,
    pdfOptions: PdfOptions = {}
    // draw: Draw
  ) {
    // this.draw = draw
    this.fakeCanvas = platform.createMeasurementCanvas()
    this.fakeCtx = this.fakeCanvas.getContext('2d')!
    this.textMeasurer = new TextMeasurer()
    // this.container = draw.getContainer()
    this.pageList = []
    this.ctxListInfos = []
    this.pageNo = 0
    this.options = mergeOption(options as IEditorOption)
    this.mode = this.options.mode
    data = data as IEditorData
    let headerElementList: IElement[] = []
    let mainElementList: IElement[] = []
    let footerElementList: IElement[] = []
    data = deepClone(data)
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
        editorOptions: this.getOptions(),
        isForceCompensation: true
      })
    })
    pageComponentData.forEach(datas => {
      if (datas) {
        datas = this.filterAssistElement(datas)
      }
    })
    this.elementList = data.main
    this.pageDirectionList = [this.options.paperDirection]

    this._formatContainer()
    this._resetPdf()

    this.fontSource = pdfOptions.fontSource ?? platform.defaultFontSource

    if (pdfOptions.loadDefaultFonts) {
      this.defaultFontsLoadedPromise = this._addDefaultFont()
    } else {
      this.defaultFontsLoadedPromise = Promise.resolve(false)
    }

    this.i18n = new I18n()
    this.position = new Position(this)
    // this.zone = new Zone(this.draw)
    // this.range = new RangeManager(this)
    this.margin = new Margin(this)
    this.background = new Background(this)
    this.badge = new Badge(this)
    this.group = new Group(this)
    this.area = new Area(this)
    this.underline = new Underline(this)
    this.strikeout = new Strikeout(this)
    this.highlight = new Highlight(this)
    this.imageParticle = new ImageParticle(this)
    this.laTexParticle = new LaTexParticle(this)
    this.textParticle = new TextParticle(this)
    this.tableParticle = new TableParticle(this)
    this.tablePaging = new TablePaging(this)
    this.pageNumber = new PageNumber(this)
    this.lineNumber = new LineNumber(this)
    this.waterMark = new Watermark(this)
    this.placeholder = new Placeholder(this)
    this.header = new Header(this, data.header)
    this.footer = new Footer(this, data.footer)
    this.hyperlinkParticle = new HyperlinkParticle(this)
    this.labelParticle = new LabelParticle(this)
    this.dateParticle = new DateParticle(this)
    this.separatorParticle = new SeparatorParticle(this)
    // this.pageBreakParticle = new PageBreakParticle(this)
    this.superscriptParticle = new SuperscriptParticle()
    this.subscriptParticle = new SubscriptParticle()
    this.checkboxParticle = new CheckboxParticle(this)
    this.radioParticle = new RadioParticle(this)
    this.blockParticle = new BlockParticle(this)
    this.listParticle = new ListParticle(this)
    this.lineBreakParticle = new LineBreakParticle(this)
    // this.control = new Control(this)
    this.pageBorder = new PageBorder(this)
    this.graffiti = new Graffiti(this, data.graffiti)
    this.columnManager = new ColumnManager(this)
    this.layoutEngine = new LayoutEngine(this)
    this.backend = new PdfBackend(this)

    this.imageObserver = new ImageObserver()

    const { letterClass } = this.options
    this.LETTER_REG = new RegExp(`[${letterClass.join('')}]`)
    this.WORD_LIKE_REG = new RegExp(
      `${letterClass.map(letter => `[^${letter}][${letter}]`).join('|')}`
    )
    this.rowList = []
    this.pageRowList = []
    this.printModeData = null
  }

  public getCtx2d(): Context2d {
    return this.pdf.context2d
  }

  public getFakeCtx() {
    return this.fakeCtx
  }

  public measureText(font: string, text: string): TextMetrics {
    this.fakeCtx.save()
    this.fakeCtx.font = font
    const textMetrics = this.fakeCtx.measureText(text)
    this.fakeCtx.restore()
    return textMetrics
  }

  /**
   * Load a single TTF font and register it with the PDF. In the browser, `source`
   * must be an http(s) URL. In Node, `source` may be either an https URL in the
   * font allowlist or an absolute filesystem path — see src/platform/node.ts for
   * the SSRF/path-traversal checks applied.
   */
  public async downloadFont(
    source: string,
    fileName: string,
    id: string,
    type: string
  ) {
    const base64 = await platform.loadFontAsBase64(source)
    const font = { fileName, base64, id, type }
    this.fontCache.push(font)
    this._applyFont(this.pdf, font)
    // Hook for the Node platform to register the same bytes with @napi-rs/canvas
    // so fakeCtx.measureText sees the right glyph metrics. No-op in browser.
    platform.registerFontForMeasurement(font, base64)
    return base64
  }

  private _applyFont(
    pdf: jsPDF,
    font: { fileName: string; base64: string; id: string; type: string }
  ) {
    pdf.addFileToVFS(font.fileName, font.base64)
    pdf.addFont(font.fileName, font.id, font.type)
  }

  // Declarative list of the fonts shipped in dist/font/ and also hosted at
  // cdn.jsdelivr.net under the same names. To add a font: drop the TTF in
  // public/font/, add a row here, no other code changes needed.
  private static readonly DEFAULT_FONTS: ReadonlyArray<{
    fileName: string
    id: string
    type: 'normal' | 'bold' | 'italic' | 'bolditalic'
  }> = [
    { fileName: 'msyh.ttf', id: 'microsoft yahei', type: 'normal' },
    // Bold msyh shares the 'msyh.ttf' VFS name with the normal weight — that's
    // the existing behavior pre-0.4.0 (see git history). jsPDF keys fonts by
    // (id, type), so this works, but it means addFileToVFS overwrites once.
    { fileName: 'msyh-bold.ttf', id: 'microsoft yahei', type: 'bold' },
    { fileName: 'Arial.ttf', id: 'arial', type: 'normal' },
    { fileName: 'Arial_Bold.ttf', id: 'arial', type: 'bold' },
    { fileName: 'Arial_Italic.ttf', id: 'arial', type: 'italic' },
    { fileName: 'Arial_Bold_Italic.ttf', id: 'arial', type: 'bolditalic' },
    { fileName: 'calibri-regular.ttf', id: 'calibri', type: 'normal' },
    { fileName: 'calibri-bold.ttf', id: 'calibri', type: 'bold' },
    { fileName: 'calibri-italic.ttf', id: 'calibri', type: 'italic' },
    { fileName: 'calibri-bold-italic.ttf', id: 'calibri', type: 'bolditalic' },
    { fileName: 'Cambria.ttf', id: 'cambria', type: 'normal' },
    { fileName: 'cambriab.ttf', id: 'cambria', type: 'bold' },
    { fileName: 'cambriai.ttf', id: 'cambria', type: 'italic' },
    { fileName: 'cambriaz.ttf', id: 'cambria', type: 'bolditalic' },
    { fileName: 'Verdana.ttf', id: 'verdana', type: 'normal' },
    { fileName: 'Verdana_Bold.ttf', id: 'verdana', type: 'bold' },
    { fileName: 'Verdana_Italic.ttf', id: 'verdana', type: 'italic' },
    { fileName: 'Verdana_Bold_Italic.ttf', id: 'verdana', type: 'bolditalic' },
    { fileName: 'Inkfree.ttf', id: 'ink free', type: 'normal' },
    { fileName: 'segoe-ui.ttf', id: 'segoe ui', type: 'normal' },
    { fileName: 'segoe-ui-bold.ttf', id: 'segoe ui', type: 'bold' },
    { fileName: 'segoeuii.ttf', id: 'segoe ui', type: 'italic' }
  ]

  // Same version-pinned CDN base used pre-0.4.0. Pinning to 0.2.7 means the
  // fonts hosted there never change under us — bumping the package version
  // doesn't move the font URLs.
  private static readonly CDN_FONT_BASE =
    'https://cdn.jsdelivr.net/npm/canvas-editor-pdf@0.2.7/dist/font'

  private _resolveDefaultFontSource(fileName: string): string {
    if (this.fontSource === 'cdn') {
      return `${DrawPdf.CDN_FONT_BASE}/${fileName}`
    }
    if (this.fontSource === 'bundled') {
      return platform.getBundledFontPath(fileName)
    }
    // { dir }: consumer-supplied. Could be an absolute filesystem path (Node)
    // or a base URL (browser). loadFontAsBase64 in the relevant shim handles
    // both forms — Node validates path traversal, browser does the fetch.
    return `${this.fontSource.dir.replace(/\/+$/, '')}/${fileName}`
  }

  public async _addDefaultFont() {
    await Promise.all(
      DrawPdf.DEFAULT_FONTS.map(font =>
        this.downloadFont(
          this._resolveDefaultFontSource(font.fileName),
          font.fileName,
          font.id,
          font.type
        )
      )
    )

    return true
  }

  public loadDefaultFonts() {
    return (this.defaultFontsLoadedPromise = this._addDefaultFont())
  }

  public async addFont(
    url: string,
    fileName: string,
    id: string,
    type: string
  ) {
    await this.downloadFont(url, fileName, id, type)
    return true
  }

  public getFont(el: IElement, scale = 1): string {
    const { defaultSize, defaultFont } = this.options
    const font = el.font || defaultFont
    const size = (el.actualSize || el.size || defaultSize) * scale
    return `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${size}px ${font}`
  }

  public getLetterReg(): RegExp {
    return this.LETTER_REG
  }

  public isWordLike(word: string): boolean {
    return this.WORD_LIKE_REG.test(word)
  }

  public getPagePixelRatio(): number {
    return 1
  }

  public getMode(): EditorMode {
    return this.mode
  }

  // public isReadonly() {
  //   if (this.area.getActiveAreaInfo()?.area?.mode) {
  //     return this.area.isReadonly()
  //   }
  //   switch (this.mode) {
  //     case EditorMode.DESIGN:
  //       return false
  //     case EditorMode.READONLY:
  //     case EditorMode.PRINT:
  //     case EditorMode.GRAFFITI:
  //       return true
  //     case EditorMode.FORM:
  //       return !this.control.getIsRangeWithinControl()
  //     default:
  //       return false
  //   }
  // }

  public getArea(): Area {
    return this.area
  }

  public getBadge(): Badge {
    return this.badge
  }

  public filterAssistElement(elementList: IElement[]): IElement[] {
    return elementList.filter(element => {
      if (element.type === ElementType.TABLE) {
        const trList = element.trList!
        for (let r = 0; r < trList.length; r++) {
          const tr = trList[r]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            td.value = this.filterAssistElement(td.value)
          }
        }
      }
      if (!element.controlId) return true
      // if (element.control?.minWidth) {
      if (
        element.controlComponent === ControlComponent.PREFIX ||
        element.controlComponent === ControlComponent.POSTFIX ||
        element.controlComponent === ControlComponent.PLACEHOLDER
      ) {
        element.value = ''
        return true
      }
      // }
      return true
      // return (
      //   element.controlComponent !== ControlComponent.PREFIX &&
      //   element.controlComponent !== ControlComponent.POSTFIX &&
      //   element.controlComponent !== ControlComponent.PLACEHOLDER
      // )
    })
  }

  public setMode(payload: EditorMode) {
    // if (this.mode === payload) return
    if (payload === EditorMode.PRINT) {
      this.printModeData = {
        header: this.header.getElementList(),
        main: this.elementList,
        footer: this.footer.getElementList()
      }
      const clonePrintModeData = deepClone(this.printModeData)
      const editorDataKeys: (keyof IEditorData)[] = ['header', 'main', 'footer']
      editorDataKeys.forEach(key => {
        clonePrintModeData[key] = this.filterAssistElement(
          clonePrintModeData[key]
        )
      })
      // this.setEditorData(clonePrintModeData)
    }
    // if (this.mode === EditorMode.PRINT && this.printModeData) {
    //   this.setEditorData(this.printModeData)
    //   this.printModeData = null
    // }
    this.clearSideEffect()
    this.mode = payload
    this.options.mode = payload
  }

  public isDesignMode() {
    return this.mode === EditorMode.DESIGN
  }

  public isPrintMode() {
    return this.mode === EditorMode.PRINT
  }

  public isGraffitiMode() {
    return this.mode === EditorMode.GRAFFITI
  }

  public isAreaHideDisabled() {
    return (
      this.isDesignMode() ||
      (this.isPrintMode() &&
        this.options.modeRule[EditorMode.PRINT].areaHideDisabled)
    )
  }

  public getIsPagingMode(): boolean {
    return this.options.pageMode === PageMode.PAGING
  }

  public getOriginalWidth(direction = this.options.paperDirection): number {
    const { width, height } = this.options
    return direction === PaperDirection.VERTICAL ? width : height
  }

  public getOriginalHeight(direction = this.options.paperDirection): number {
    const { width, height } = this.options
    return direction === PaperDirection.VERTICAL ? height : width
  }

  public getWidth(direction = this.options.paperDirection): number {
    return Math.floor(this.getOriginalWidth(direction) * this.options.scale)
  }

  public getHeight(direction = this.options.paperDirection): number {
    return Math.floor(this.getOriginalHeight(direction) * this.options.scale)
  }

  public getMainHeight(): number {
    const pageHeight = this.getHeight()
    return pageHeight - this.getMainOuterHeight()
  }

  public getMainOuterHeight(
    pageNo?: number,
    direction?: PaperDirection
  ): number {
    const curDirection =
      direction ||
      (pageNo === undefined
        ? this.options.paperDirection
        : this.getPageDirection(pageNo))
    const margins = this.getMargins(curDirection)
    const headerExtraHeight = this.header.getExtraHeight(pageNo, curDirection)
    const footerExtraHeight = this.footer.getExtraHeight(pageNo, curDirection)
    return margins[0] + margins[2] + headerExtraHeight + footerExtraHeight
  }

  public getCanvasWidth(pageNo = -1): number {
    // console.log('page')
    // console.log(pageNo)
    const page = this.ctxListInfos[pageNo] //this.getPdf().getPageInfo(pageNo + 1)
    // console.log(this.getCtx2d())
    // console.log(page)
    return page.width
  }

  public getCanvasHeight(pageNo = -1): number {
    const page = this.ctxListInfos[pageNo] //this.getPdf().getPageInfo(pageNo + 1)
    // const page = this.getPdf().getPageInfo(pageNo)
    return page.height
  }

  public getInnerWidth(direction = this.options.paperDirection): number {
    const width = this.getWidth(direction)
    const margins = this.getMargins(direction)
    return width - margins[1] - margins[3]
  }

  public getColumnLayout(direction?: PaperDirection): IColumnLayout | null {
    return this.columnManager.getLayout(direction)
  }

  public setColumnConfig(config: IColumnOption | null): void {
    if (this.options.pageMode === PageMode.CONTINUITY) return
    this.columnManager.setConfig(config)
  }

  public getOriginalInnerWidth(): number {
    const width = this.getOriginalWidth()
    const margins = this.getOriginalMargins()
    return width - margins[1] - margins[3]
  }

  public getContextInnerWidth(): number {
    const positionContext = this.position.getPositionContext()
    if (positionContext.isTable) {
      const elementList = this.getOriginalElementList()
      const td = this.position.getTableTdByContext(elementList, positionContext)
      const {
        table: { tdPadding }
      } = this.options
      return td!.width! - tdPadding[1] - tdPadding[3]
    }
    // 分栏布局下按栏宽计算可用宽度（栏宽为缩放值，还原为未缩放单位）
    const columnLayout = this.getColumnLayout()
    if (columnLayout && columnLayout.count > 1) {
      return columnLayout.width / this.options.scale
    }
    return this.getOriginalInnerWidth()
  }

  public getMargins(direction = this.options.paperDirection): IMargin {
    return <IMargin>(
      this.getOriginalMargins(direction).map(m => m * this.options.scale)
    )
  }

  public getOriginalMargins(direction = this.options.paperDirection): number[] {
    const { margins } = this.options
    return direction === PaperDirection.VERTICAL
      ? margins
      : [margins[1], margins[2], margins[3], margins[0]]
  }

  public getPageDirection(pageNo: number): PaperDirection {
    return this.pageDirectionList[pageNo] || this.options.paperDirection
  }

  public getPageDirectionList(): PaperDirection[] {
    return this.pageDirectionList
  }

  public getPageSize(pageNo: number) {
    const direction = this.getPageDirection(pageNo)
    const margins = this.getMargins(direction)
    const width = this.getWidth(direction)
    return {
      width,
      height: this.getHeight(direction),
      margins,
      innerWidth: width - margins[1] - margins[3]
    }
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

  public getHighlightMarginHeight(): number {
    return this.options.highlightMarginHeight * this.options.scale
  }

  public getTdPadding(): IPadding {
    const {
      table: { tdPadding },
      scale
    } = this.options
    return <IPadding>tdPadding.map(m => m * scale)
  }

  // public getContainer(): HTMLDivElement {
  //   return this.container
  // }

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
    return this.position.getTableTdByContext(
      sourceElementList,
      positionContext
    )!.rowList!
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

  public getMainRowList(): IRow[] {
    return this.rowList
  }

  public getPdf(): jsPDF {
    return this.pdf
  }

  public getOptions(): DeepRequired<IEditorOption> {
    return this.options
  }

  // Merge new options into the current ones at runtime. Kept as public API
  // (documented) even though the PDF-only fork usually configures via the
  // constructor; call render() afterwards to reflect changes.
  public updateOptions(payload: IUpdateOption | object) {
    const newOption = mergeOption(payload as IEditorOption)
    Object.entries(newOption).forEach(([key, value]) => {
      Reflect.set(this.options, key, value)
    })
    this.setColumnConfig(this.options.column)
  }

  public getGroup(): Group {
    return this.group
  }

  public getPosition(): Position {
    return this.position
  }

  public getColumnManager(): ColumnManager {
    return this.columnManager
  }

  public getLineBreakParticle(): LineBreakParticle {
    return this.lineBreakParticle
  }

  public getTextParticle(): TextParticle {
    return this.textParticle
  }

  public getTextMeasurer(): TextMeasurer {
    return this.textMeasurer
  }

  public getHeaderElementList(): IElement[] {
    return this.header.getElementList()
  }

  public getTableElementList(sourceElementList: IElement[]): IElement[] {
    const positionContext = this.position.getPositionContext()
    return (
      this.position.getTableTdByContext(sourceElementList, positionContext)
        ?.value || []
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
    if (!positionContext.isTable) return null
    return this.position.getTableTdByContext(
      this.getOriginalElementList(),
      positionContext
    )
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
      // if (
      //   !isIgnoreDeletedRule &&
      //   !this.isDesignMode() &&
      //   !this.control.getIsRangeWithinControl()
      // ) {
      //   const tdDeletable = this.getTd()?.deletable
      //   let deleteIndex = endIndex - 1
      //   while (deleteIndex >= start) {
      //     const deleteElement = elementList[deleteIndex]
      //     if (
      //       deleteElement?.hide ||
      //       deleteElement?.control?.hide ||
      //       deleteElement?.area?.hide ||
      //       (tdDeletable !== false &&
      //         deleteElement?.control?.deletable !== false &&
      //         (!deleteElement.controlId ||
      //           this.mode !== EditorMode.FORM ||
      //           !modeRule[this.mode].controlDeletableDisabled) &&
      //         deleteElement?.title?.deletable !== false &&
      //         (group.deletable !== false || !deleteElement.groupIds?.length) &&
      //         (deleteElement?.area?.deletable !== false ||
      //           deleteElement?.areaIndex !== 0))
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
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        elementList.splice(start + i, 0, items[i])
      }
    }
  }

  public getImageParticle(): ImageParticle {
    return this.imageParticle
  }

  public getTableParticle(): TableParticle {
    return this.tableParticle
  }

  public getTablePaging(): TablePaging {
    return this.tablePaging
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

  public getGraffiti(): Graffiti {
    return this.graffiti
  }

  public async setValue(payload: Partial<IEditorData>) {
    const { header, main, footer } = deepClone(payload)
    if (!header && !main && !footer) return
    const pageComponentData = [header, main, footer]
    for (let i = 0; i < pageComponentData.length; i++) {
      const data = pageComponentData[i]
      // Skip an absent zone — `return` here aborted the whole method (and
      // never reached setEditorData) whenever header/footer were missing.
      if (!data) continue
      formatElementList(data, {
        editorOptions: this.options,
        isForceCompensation: true
      })
    }
    pageComponentData.forEach(datas => {
      if (datas) {
        datas = this.filterAssistElement(datas)
      }
    })
    this.setEditorData({
      header,
      main,
      footer
    })
  }

  public getOriginValue(
    options: IGetOriginValueOption = {}
  ): Required<IEditorData> {
    const { pageNo } = options
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
    const data: Required<IEditorData> = {
      header: this.getHeaderElementList(),
      main: mainElementList,
      footer: this.getFooterElementList(),
      graffiti: this.graffiti.getValue()
    }
    return data
  }

  public getValue(options: IGetValueOption = {}): IEditorData {
    const originData = this.getOriginValue({ pageNo: options.pageNo })
    const { extraPickAttrs } = options
    const data: IEditorData = {
      header: zipElementList(originData.header, {
        extraPickAttrs
      }),
      main: zipElementList(originData.main, {
        extraPickAttrs,
        isClassifyArea: true
      }),
      footer: zipElementList(originData.footer, {
        extraPickAttrs
      }),
      graffiti: originData.graffiti
    }
    return data
  }

  public setEditorData(payload: Partial<Omit<IEditorData, 'graffiti'>>) {
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
    // this.container.style.position = 'relative'
    // this.container.style.width = `${this.getWidth()}px`
    // this.container.setAttribute(EDITOR_COMPONENT, EditorComponent.MAIN)
  }

  private _createPage(pageNo: number) {
    // 混排横竖版：每页按自身方向取尺寸，jsPDF 页面方向随之切换
    const { width, height: paperHeight } = this.getPageSize(pageNo)
    // Continuous mode: _computePageList has already grown page 0 to fit
    const height =
      pageNo === 0 && this.options.pageMode === PageMode.CONTINUITY
        ? this.pdf.internal.pageSize.getHeight()
        : paperHeight
    // // 调整分辨率
    const dpr = 1 //this.getPagePixelRatio()

    const orientation =
      this.getPageDirection(pageNo) === PaperDirection.VERTICAL ? 'p' : 'l'
    this.ctxListInfos.push({
      width,
      height,
      background: '#ffffff',
      marginBottom: `${this.getPageGap()}px`,
      index: String(pageNo)
    })
    this.pageList.push({
      width,
      height,
      background: '#ffffff',
      marginBottom: `${this.getPageGap()}px`,
      index: String(pageNo)
    })
    // _resetPdf already opened jsPDF page 1 sized from the global direction —
    // which is always page 0's direction, since the first section can only be
    // re-oriented by a page break. Adding another page here would shift every
    // page's geometry one slot down (page N getting page N-1's orientation),
    // which only became visible once pages stopped being uniform in size.
    if (pageNo === 0) return
    const newPagePdf = this.pdf.addPage([width, height], orientation)
    newPagePdf.context2d.scale(dpr, dpr)
  }

  public getElementSize(el: IElement) {
    return el.actualSize || el.size || this.options.defaultSize
  }

  public getElementRowMargin(el: IElement) {
    const {
      defaultSize,
      defaultBasicRowMarginHeight,
      defaultRowMargin,
      scale
    } = this.options
    // 字体在12-30之间，行间距不变，小于12按比例缩小，大于30按比例放大
    const fontSize = el.size || defaultSize
    let ratio = 1
    if (fontSize < 12) {
      ratio = fontSize / 12
    } else if (fontSize > 30) {
      ratio = 1 + (fontSize - 30) / 30
    }
    return (
      defaultBasicRowMarginHeight *
      ratio *
      (el.rowMargin ?? defaultRowMargin) *
      scale
    )
  }

  public computeRowList(payload: IComputeRowListPayload) {
    return this.layoutEngine.computeRowList(payload)
  }

  private _computePageList(): IRow[][] {
    const {
      pageMode,
      paperDirection,
      pageNumber: { maxPageNo }
    } = this.options
    const result = this.layoutEngine.computePageList({
      rowList: this.rowList,
      elementList: this.elementList,
      pageMode,
      paperDirection,
      maxPageNo
    })
    this.elementList = result.elementList
    this.pageDirectionList = result.pageDirectionList
    if (pageMode === PageMode.CONTINUITY) {
      const height = this.getHeight()
      const marginHeight = this.getMainOuterHeight(0)
      let pageHeight = marginHeight
      // 重置高度
      pageHeight += this.rowList.reduce(
        (pre, cur) => pre + cur.height + (cur.offsetY || 0),
        0
      )
      // canvas-editor-pdf: the jsPDF document is rebuilt on every render
      // (_resetPdf), so page 0 always starts out paper-high
      const pageDomHeight = height
      const nextHeight =
        pageHeight > pageDomHeight
          ? pageHeight
          : pageHeight < height
            ? height
            : pageHeight
      this.backend.resizeHeight(0, nextHeight, this.getPagePixelRatio())
    }
    return result.pageRowList
  }

  private _drawHighlight(ctx2d: IRenderContext, payload: IDrawRowPayload) {
    const {
      control: { activeBackgroundColor }
    } = this.options
    const { rowList, positionList /*, elementList */ } = payload
    const marginHeight = this.getDefaultBasicRowMarginHeight()
    const highlightMarginHeight = this.getHighlightMarginHeight()
    // const activeControlElement = this.control.getActiveControl()?.getElement()
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      // 内容高度：不含段后间距与区域补高
      const rowContentHeight =
        curRow.height -
        (curRow.spacingAfter || 0) -
        (curRow.areaPadding?.height || 0)
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        if (element.highlight) {
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
          // 当前元素位置信息记录（表格跨页片段行优先使用片段位置）
          const {
            coordinate: {
              leftTop: [x, y]
            }
          } = curRow.fragmentPosition || positionList[curRow.startIndex + j]
          // 元素向左偏移量
          const offsetX = element.left || 0
          this.highlight.recordFillInfo(
            ctx2d,
            x - offsetX,
            y + marginHeight - highlightMarginHeight, // 先减去行margin，再加上高亮margin
            element.metrics.width + offsetX,
            rowContentHeight - 2 * marginHeight + 2 * highlightMarginHeight,
            element.highlight || activeBackgroundColor
          )
          //     } else
          // if (preElement?.highlight) {
          //   // 之前是高亮元素，当前不是需立即绘制
          this.highlight.render(ctx2d)
          // }
        }
      }
      // this.highlight.render(ctx2d)
    }
  }

  public drawRow(ctx2d: IRenderContext, payload: IDrawRowPayload) {
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
    const isPrintMode = this.isPrintMode()
    // const isGraffitiMode = this.isGraffitiMode()
    // const { isCrossRowCol } = this.range.getRange()
    // let index = startIndex
    // let offY = 0
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      // 内容高度：不含段后间距与区域补高
      const rowContentHeight =
        curRow.height -
        (curRow.spacingAfter || 0) -
        (curRow.areaPadding?.height || 0)
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
        // 当前元素位置信息（表格跨页片段行优先使用片段位置）
        const {
          ascent: offsetY,
          coordinate: {
            leftTop: [x, y]
          }
        } = curRow.fragmentPosition || positionList[curRow.startIndex + j]
        // offY += y
        const preElement = curRow.elementList[j - 1]
        // 元素绘制
        if (
          (element.hide || element.control?.hide || element.area?.hide) &&
          !this.isDesignMode()
        ) {
          // 控件隐藏时不绘制
          this.textParticle.complete()
        } else if (element.type === ElementType.IMAGE) {
          this.textParticle.complete()
          // 浮动图片单独绘制
          if (
            element.imgDisplay !== ImageDisplay.SURROUND &&
            element.imgDisplay !== ImageDisplay.FLOAT_TOP &&
            element.imgDisplay !== ImageDisplay.FLOAT_BOTTOM
          ) {
            this.imageParticle.render(ctx2d, element, x, y + offsetY)
          }
        } else if (element.type === ElementType.LATEX) {
          this.textParticle.complete()
          this.laTexParticle.render(ctx2d, element, x, y + offsetY)
        } else if (element.type === ElementType.TABLE) {
          // if (isCrossRowCol) {
          //   rangeRecord.x = x
          //   rangeRecord.y = y
          //   // tableRangeElement = element
          // }
          this.tableParticle.render(
            ctx2d,
            element,
            x,
            y,
            curRow.tableFragment
          )
        } else if (element.type === ElementType.HYPERLINK) {
          this.textParticle.complete()
          this.hyperlinkParticle.render(
            ctx2d,
            element,
            x,
            y + offsetY
          )
        } else if (element.type === ElementType.LABEL) {
          this.textParticle.complete()
          this.labelParticle.render(ctx2d, element, x, y + offsetY)
        } else if (element.type === ElementType.DATE) {
          const nextElement = curRow.elementList[j + 1]
          // 释放之前的
          if (!preElement || preElement.dateId !== element.dateId) {
            this.textParticle.complete()
          }
          this.textParticle.record(ctx2d, element, x, y + offsetY)
          if (!nextElement || nextElement.dateId !== element.dateId) {
            // 手动触发渲染
            this.textParticle.complete()
          }
        } else if (element.type === ElementType.SUPERSCRIPT) {
          this.textParticle.complete()
          this.superscriptParticle.render(
            ctx2d,
            element,
            x,
            y + offsetY
          )
        } else if (element.type === ElementType.SUBSCRIPT) {
          this.underline.render(ctx2d)
          this.textParticle.complete()
          this.subscriptParticle.render(
            ctx2d,
            element,
            x,
            y + offsetY
          )
        } else if (element.type === ElementType.SEPARATOR) {
          this.separatorParticle.render(ctx2d, element, x, y)
        } else if (element.type === ElementType.PAGE_BREAK) {
          // if (this.mode !== EditorMode.CLEAN && !isPrintMode) {
          //   this.pageBreakParticle.render(ctx2d, element, x, y)
          // }
        } else if (
          element.type === ElementType.CHECKBOX ||
          element.controlComponent === ControlComponent.CHECKBOX
        ) {
          this.textParticle.complete()
          this.checkboxParticle.render({
            ctx2d,
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
            ctx2d,
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
          this.textParticle.record(ctx2d, element, x, y + offsetY)
          this.textParticle.complete()
        } else if (element.type === ElementType.BLOCK) {
          this.textParticle.complete()
          this.blockParticle.render(ctx2d, pageNo, element, x, y + offsetY)
        } else {
          // 如果当前元素设置左偏移，则上一元素立即绘制
          if (element.left) {
            this.textParticle.complete()
          }
          // console.log('element')
          // console.log(element)
          // if (element.rowFlex)
          this.textParticle.record(ctx2d, element, x, y + offsetY)
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
          this.lineBreakParticle.render(
            ctx2d,
            element,
            x,
            y + rowContentHeight / 2
          )
        }
        // // 边框绘制（目前仅支持控件）
        // if (element.control?.border) {
        //   // 不同控件边框立刻绘制
        //   if (
        //     preElement?.control?.border &&
        //     preElement.controlId !== element.controlId
        //   ) {
        //     this.control.drawPdfBorder(ctx2d)
        //   }
        //   // 当前元素位置信息记录
        //   const rowMargin = this.getElementRowMargin(element)
        //   this.control.recordBorderInfo(
        //     x,
        //     y + rowMargin,
        //     element.metrics.width,
        //     rowContentHeight - 2 * rowMargin
        //   )
        // } else if (preElement?.control?.border) {
        //   this.control.drawPdfBorder(ctx2d)
        // }
        // 下划线记录
        if (element.underline || element.control?.underline) {
          // 下标元素下划线单独绘制
          if (
            preElement?.type === ElementType.SUBSCRIPT &&
            element.type !== ElementType.SUBSCRIPT
          ) {
            this.underline.render(ctx2d)
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
            ctx2d,
            x - offsetX,
            y + rowContentHeight - rowMargin + offsetY,
            metrics.width + offsetX,
            0,
            color,
            element.textDecoration?.style
          )
        } else if (preElement?.underline || preElement?.control?.underline) {
          this.underline.render(ctx2d)
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
              this.strikeout.render(ctx2d)
            }
            // 基线文字测量信息
            const standardMetrics = this.textMeasurer.measureBasis(
              this.getFont(element)
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
            this.strikeout.recordFillInfo(
              ctx2d,
              x,
              adjustY,
              metrics.width
            )
          }
        } else if (preElement?.strikeout) {
          this.strikeout.render(ctx2d)
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
        //         rangeRecord.height = rowContentHeight
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
        //         rangeRecord.height = rowContentHeight
        //       }
        //       rangeRecord.width += rangeWidth
        //     }
        //   }
        // }
        // 组信息记录
        if (!group.disabled && element.groupIds) {
          this.group.recordFillInfo(
            element,
            x,
            y,
            metrics.width,
            rowContentHeight
          )
        }
        // index++
        // 绘制表格内元素
        if (element.type === ElementType.TABLE) {
          const tdPaddingWidth = tdPadding[1] + tdPadding[3]
          const fragment = curRow.tableFragment
          // 续页回显表头内容（使用一次性位置列表）
          if (curRow.repeatTdPositionList?.length) {
            for (const {
              td,
              positionList: repeatPositionList
            } of curRow.repeatTdPositionList) {
              this.drawRow(ctx2d, {
                elementList: td.value,
                positionList: repeatPositionList,
                rowList: td.rowList!,
                pageNo,
                startIndex: 0,
                innerWidth: (td.width! - tdPaddingWidth) * scale,
                zone,
                isDrawLineBreak
              })
            }
          }
          // 遍历片段范围行与进位合并单元格，仅绘制窗口内的内容行
          const fragmentTdList = fragment
            ? this.tableParticle.getFragmentTdList(element, fragment)
            : element.trList!.flatMap(tr => tr.tdList)
          for (const td of fragmentTdList) {
            let rowList = td.rowList!
            let startIndex = 0
            if (fragment) {
              const [windowStart, windowEnd] =
                this.tableParticle.getTdWindowInFragment(td, element, fragment)
              if (windowEnd <= windowStart) continue
              if (windowStart > 0 || windowEnd < td.height!) {
                const visible = this.tableParticle.getTdVisibleRowListByWindow(
                  td,
                  windowStart,
                  windowEnd
                )
                rowList = visible.rowList
                startIndex = visible.startIndex
              }
            }
            this.drawRow(ctx2d, {
              elementList: td.value,
              positionList: td.positionList!,
              rowList,
              pageNo,
              startIndex,
              innerWidth: (td.width! - tdPaddingWidth) * scale,
              zone,
              isDrawLineBreak
            })
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
      // this.control.drawPdfBorder(ctx2d)
      this.underline.render(ctx2d)
      this.strikeout.render(ctx2d)
      // 绘制批注样式
      this.group.render(ctx2d)
      // // 绘制选区
      // if (!isPrintMode && !isGraffitiMode) {
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

  private _drawFloat(ctx2d: IRenderContext, payload: IDrawFloatPayload) {
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
    const pageDom = this.getPageList()[pageNo]
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
    const isPrintMode = this.mode === EditorMode.PRINT
    const isContinuityMode = pageMode === PageMode.CONTINUITY
    const { innerWidth } = this.getPageSize(pageNo)
    // const ctx = this.ctxList[pageNo]
    const ctx2d = new DisplayList()
    this.getPdf().setPage(pageNo + 1)
    // 判断当前激活区域-非正文区域时元素透明度降低
    // ctx2d.globalAlpha = !this.zone.isMainActive() ? inactiveAlpha : 1
    this._clearPage(pageNo)
    // 绘制背景
    if (
      !isPrintMode ||
      !this.options.modeRule[EditorMode.PRINT]?.backgroundDisabled
    ) {
      this.background.render(ctx2d, pageNo)
    }
    // 绘制区域
    if (!isPrintMode) {
      this.area.render(ctx2d, pageNo)
    }
    // 绘制水印（底层）
    if (
      !isContinuityMode &&
      this.options.watermark.data &&
      this.options.watermark.layer === WatermarkLayer.BOTTOM
    ) {
      this.waterMark.render(ctx2d, pageNo)
    }
    // 绘制页边距
    if (!isPrintMode) {
      this.margin.render(ctx2d, pageNo)
    }
    // 绘制分栏分隔线
    this.columnManager.drawSeparator(ctx2d, pageNo)
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
      this.pageBorder.render(ctx2d, pageNo)
    }
    // 绘制签章
    this.badge.render(ctx2d, this.elementList[0], pageNo)
    // 绘制涂鸦
    if (this.isGraffitiMode()) {
      this.graffiti.render(ctx2d, pageNo)
    }
    // 绘制水印（顶层）
    if (
      !isContinuityMode &&
      this.options.watermark.data &&
      this.options.watermark.layer === WatermarkLayer.TOP
    ) {
      this.waterMark.render(ctx2d, pageNo)
    }
    this.backend.renderPage(pageNo, ctx2d)
  }

  private _immediateRender() {
    const positionList = this.getPosition().getOriginalMainPositionList()
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

  private _syncPageCount() {
    const targetPageCount = this.pageRowList.length
    for (let i = 0; i < targetPageCount; i++) {
      if (!this.pageList[i]) {
        this._createPage(i)
      }
    }
    if (this.pageList.length > targetPageCount) {
      this.pageList.splice(targetPageCount).forEach(page => {
        if (page.remove) {
          page.remove()
        }
      })
    }
    const pdfPageCount = this.getPdf().getNumberOfPages()
    if (pdfPageCount > targetPageCount) {
      for (let i = pdfPageCount; i > targetPageCount; i--) {
        this.getPdf().deletePage(i)
      }
    } else if (pdfPageCount < targetPageCount) {
      for (let i = pdfPageCount; i < targetPageCount; i++) {
        this.getPdf().addPage()
      }
    }
  }

  public render(payload?: IDrawOption) {
    // Resets the content of jsPDF pages to prevent successive renders
    // from stacking operators in the content stream (causing PDF size to increase)
    // with each export when reusing the same instance.
    this._resetPdf()
    this._warnUnregisteredPdfFonts()
    const { header, footer } = this.options
    const { isCompute = true } = payload || {}
    const innerWidth = this.getInnerWidth()
    const isPagingMode = this.getOptions().pageMode === PageMode.PAGING
    // 缓存当前页数信息
    // 计算文档信息
    if (isCompute) {
      // 清空浮动元素位置信息
      this.position.setFloatPositionList([])
      if (isPagingMode) {
        // 分栏信息
        this.columnManager.compute()
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
      const startX = margins[3]
      const startY = margins[0] + extraHeight
      const surroundElementList = pickSurroundElementList(this.elementList)
      this.rowList = this.computeRowList({
        startX,
        startY,
        pageHeight,
        isPagingMode,
        innerWidth,
        surroundElementList,
        elementList: this.elementList
      })!
      // 分页模式下跨页表格在渲染层拆分为按页片段行
      if (isPagingMode) {
        this.rowList = this.tablePaging.splitTableRowAcrossPages(this.rowList)
      }
      // 页面信息
      this.pageRowList = this._computePageList() //this.draw.getPageRowList()
      // 位置信息
      this.position.computePositionList()
      // 区域信息
      this.area.compute()
      // 涂鸦信息
      if (this.isGraffitiMode()) {
        this.graffiti.compute()
      }
      // // 控件关键词高亮
      // this.control.computeHighlightList()
    }
    // 创建纸张
    this._syncPageCount()
    this._immediateRender()
  }

  // Recreates the jsPDF instance with each render to prevent internal state accumulation
  // between exports (e.g., the putImage bug in jsPDF that mutates the global filter array
  // via splice, causing the 2nd save onwards to exit without
  // FlatEncode and ~3x larger). Fonts loaded via downloadFont are
  // reapplied from fontCache in the new instance.
  // 收集正文（含表格嵌套与页眉页脚）实际使用的字体族，
  // 未在导出字体中注册时提示，避免 PDF 静默乱码
  // (from upstream's feature/pdf CommandAdapt, 44584893). Adapted: upstream
  // treats defaultFont as registered; here fonts are opt-in, and a default
  // font that was never loaded is the most common cause of garbled CJK text,
  // so it is checked too. Each family is reported once per instance.
  private _warnUnregisteredPdfFonts() {
    const registered = new Set(
      Object.keys(this.pdf.getFontList()).map(family => family.toLowerCase())
    )
    const families = new Set<string>([this.options.defaultFont])
    const collect = (elementList: IElement[]) => {
      for (const element of elementList) {
        if (element.font) {
          families.add(element.font)
        }
        if (element.trList) {
          for (const tr of element.trList) {
            for (const td of tr.tdList) {
              collect(td.value)
            }
          }
        }
      }
    }
    collect(this.header.getElementList())
    collect(this.elementList)
    collect(this.footer.getElementList())
    for (const family of families) {
      if (
        registered.has(family.toLowerCase()) ||
        this.warnedFontFamilySet.has(family)
      ) {
        continue
      }
      this.warnedFontFamilySet.add(family)
      console.warn(
        `canvas-editor-pdf: font "${family}" is not registered with jsPDF, so ` +
          'text set in it falls back to a standard PDF font (CJK and other ' +
          'non-Latin text will not render). Load it with ' +
          '{ loadDefaultFonts: true } (and await defaultFontsLoadedPromise ' +
          'before render) or downloadFont().'
      )
    }
  }

  private _resetPdf() {
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
    this.fontCache.forEach(f => this._applyFont(this.pdf, f))
    this.pageList = []
    this.ctxListInfos = []
  }

  public destroy() {
    // this.container.remove()
  }

  public clearSideEffect() {
    // this.getTableTool().dispose()
    this.getHyperlinkParticle().clearHyperlinkPopup()
    // æ¥ææ§ä»¶
    this.getDateParticle().clearDatePicker()
  }
}
