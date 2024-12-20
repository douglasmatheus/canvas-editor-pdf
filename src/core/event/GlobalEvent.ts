import { EDITOR_COMPONENT } from '../../dataset/constant/Editor'
import { IEditorOption } from '../../interface/Editor'
import { findParent } from '../../utils'
import { Draw } from '@hufe921/canvas-editor/dist/src/editor/core/draw/Draw'
import { CanvasEvent } from './CanvasEvent'
import { RangeManager } from '@hufe921/canvas-editor/dist/src/editor/core/range/RangeManager'
import { Previewer } from '@hufe921/canvas-editor/dist/src/editor/core/draw/particle/previewer/Previewer'
import { TableTool } from '@hufe921/canvas-editor/dist/src/editor/core/draw/particle/table/TableTool'
import { HyperlinkParticle } from '@hufe921/canvas-editor/dist/src/editor/core/draw/particle/HyperlinkParticle'
import { Control } from '@hufe921/canvas-editor/dist/src/editor/core/draw/control/Control'
import { DateParticle } from '@hufe921/canvas-editor/dist/src/editor/core/draw/particle/date/DateParticle'
import { ImageParticle } from '@hufe921/canvas-editor/dist/src/editor/core/draw/particle/ImageParticle'
import { Cursor } from '@hufe921/canvas-editor/dist/src/editor/core/cursor/Cursor'

export class GlobalEvent {
  private draw: Draw
  private options: Required<IEditorOption>
  private cursor: Cursor | null
  private canvasEvent: CanvasEvent
  private range: RangeManager
  private previewer: Previewer
  private tableTool: TableTool
  private hyperlinkParticle: HyperlinkParticle
  private control: Control
  private dateParticle: DateParticle
  private imageParticle: ImageParticle
  private dprMediaQueryList: MediaQueryList

  constructor(draw: Draw, canvasEvent: CanvasEvent) {
    this.draw = draw
    this.options = draw.getOptions()
    this.canvasEvent = canvasEvent
    this.cursor = null
    this.range = draw.getRange()
    this.previewer = draw.getPreviewer()
    this.tableTool = draw.getTableTool()
    this.hyperlinkParticle = draw.getHyperlinkParticle()
    this.dateParticle = draw.getDateParticle()
    this.imageParticle = draw.getImageParticle()
    this.control = draw.getControl()
    this.dprMediaQueryList = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    )
  }

  public register() {
    this.cursor = this.draw.getCursor()
    this.addEvent()
  }

  private addEvent() {
    window.addEventListener('blur', this.clearSideEffect)
    document.addEventListener('keyup', this.setRangeStyle)
    document.addEventListener('click', this.clearSideEffect)
    document.addEventListener('mouseup', this.setCanvasEventAbility)
    document.addEventListener('wheel', this.setPageScale, { passive: false })
    document.addEventListener('visibilitychange', this._handleVisibilityChange)
    this.dprMediaQueryList.addEventListener('change', this._handleDprChange)
  }

  public removeEvent() {
    window.removeEventListener('blur', this.clearSideEffect)
    document.removeEventListener('keyup', this.setRangeStyle)
    document.removeEventListener('click', this.clearSideEffect)
    document.removeEventListener('mouseup', this.setCanvasEventAbility)
    document.removeEventListener('wheel', this.setPageScale)
    document.removeEventListener(
      'visibilitychange',
      this._handleVisibilityChange
    )
    this.dprMediaQueryList.removeEventListener('change', this._handleDprChange)
  }

  public clearSideEffect = (evt: Event) => {
    if (!this.cursor) return
    // 编辑器内部dom
    const target = <Element>(evt?.composedPath()[0] || evt.target)
    const pageList = this.draw.getPageList()
    const innerEditorDom = findParent(
      target,
      (node: any) => pageList.includes(node),
      true
    )
    if (innerEditorDom) {
      this.setRangeStyle()
      return
    }
    // 编辑器外部组件dom
    const outerEditorDom = findParent(
      target,
      (node: Node & Element) =>
        !!node && node.nodeType === 1 && !!node.getAttribute(EDITOR_COMPONENT),
      true
    )
    if (outerEditorDom) {
      this.setRangeStyle()
      this.watchCursorActive()
      return
    }
    this.cursor.recoveryCursor()
    this.range.recoveryRangeStyle()
    this.previewer.clearResizer()
    this.tableTool.dispose()
    this.hyperlinkParticle.clearHyperlinkPopup()
    this.control.destroyControl()
    this.dateParticle.clearDatePicker()
    this.imageParticle.destroyFloatImage()
  }

  public setCanvasEventAbility = () => {
    this.canvasEvent.setIsAllowDrag(false)
    this.canvasEvent.setIsAllowSelection(false)
  }

  public setRangeStyle = () => {
    this.range.setRangeStyle()
  }

  public watchCursorActive() {
    // 选区闭合&实际光标移出光标代理
    if (!this.range.getIsCollapsed()) return
    setTimeout(() => {
      // 将模拟光标变成失活显示状态
      if (!this.cursor?.getAgentIsActive()) {
        this.cursor?.drawCursor({
          isFocus: false,
          isBlink: false
        })
      }
    })
  }

  public setPageScale = (evt: WheelEvent) => {
    if (!evt.ctrlKey) return
    evt.preventDefault()
    const { scale } = this.options
    if (evt.deltaY < 0) {
      // 放大
      const nextScale = scale * 10 + 1
      if (nextScale <= 30) {
        this.draw.setPageScale(nextScale / 10)
      }
    } else {
      // 缩小
      const nextScale = scale * 10 - 1
      if (nextScale >= 5) {
        this.draw.setPageScale(nextScale / 10)
      }
    }
  }

  private _handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // 页面可见时重新渲染激活页面
      const range = this.range.getRange()
      const isSetCursor =
        !!~range.startIndex &&
        !!~range.endIndex &&
        range.startIndex === range.endIndex
      this.range.replaceRange(range)
      this.draw.render({
        isSetCursor,
        isCompute: false,
        isSubmitHistory: false,
        curIndex: range.startIndex
      })
    }
  }

  private _handleDprChange = () => {
    this.draw.setPageDevicePixel()
  }
}
