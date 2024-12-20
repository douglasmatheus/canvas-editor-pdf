import { Context2d } from 'jspdf'
// import { IElement } from '@hufe921/canvas-editor'
import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { DrawPdf } from '../DrawPdf'

export class HyperlinkParticle {
  private draw: DrawPdf
  private options: Required<IEditorOption>
  // private container: HTMLDivElement
  private hyperlinkPopupContainer: HTMLDivElement
  private hyperlinkDom: HTMLAnchorElement

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    // this.container = draw.getContainer()
    const { hyperlinkPopupContainer, hyperlinkDom } =
      this._createHyperlinkPopupDom()
    this.hyperlinkDom = hyperlinkDom
    this.hyperlinkPopupContainer = hyperlinkPopupContainer
  }

  private _createHyperlinkPopupDom() {
    const hyperlinkPopupContainer = document.createElement('div')
    hyperlinkPopupContainer.classList.add(`${EDITOR_PREFIX}-hyperlink-popup`)
    const hyperlinkDom = document.createElement('a')
    hyperlinkDom.target = '_blank'
    hyperlinkDom.rel = 'noopener'
    hyperlinkPopupContainer.append(hyperlinkDom)
    // this.container.append(hyperlinkPopupContainer)
    return { hyperlinkPopupContainer, hyperlinkDom }
  }

  public drawHyperlinkPopup(element: IElement, position: IElementPosition) {
    const {
      coordinate: {
        leftTop: [left, top]
      },
      lineHeight
    } = position
    const height = this.draw.getHeight()
    const pageGap = this.draw.getPageGap()
    const preY = this.draw.getPageNo() * (height + pageGap)
    // 位置
    this.hyperlinkPopupContainer.style.display = 'block'
    this.hyperlinkPopupContainer.style.left = `${left}px`
    this.hyperlinkPopupContainer.style.top = `${top + preY + lineHeight}px`
    // 标签
    const url = element.url || '#'
    this.hyperlinkDom.href = url
    this.hyperlinkDom.title = url
    this.hyperlinkDom.innerText = url
  }

  public clearHyperlinkPopup() {
    this.hyperlinkPopupContainer.style.display = 'none'
  }

  public openHyperlink(element: IElement) {
    const newTab = window.open(element.url, '_blank')
    if (newTab) {
      newTab.opener = null
    }
  }

  public render(
    ctx2d: Context2d,
    element: IRowElement,
    x: number,
    y: number
  ) {
    ctx2d.save()
    ctx2d.font = element.style.toLowerCase()
    // if (ctx2d.font.includes('Microsoft YaHei')) {
    //   ctx2d.font = ctx2d.font.replace('Microsoft YaHei', 'Yahei')
    // }
    if (!element.color) {
      element.color = this.options.defaultHyperlinkColor
    }
    ctx2d.fillStyle = element.color
    if (element.underline === undefined) {
      element.underline = true
    }
    ctx2d.fillText(element.value, x, y)
    ctx2d.restore()
  }
}
