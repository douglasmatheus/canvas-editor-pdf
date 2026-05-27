import { EDITOR_PREFIX } from '../../../../dataset/constant/Editor'
import { BlockType } from '../../../../dataset/enum/Block'
import { ElementType } from '../../../../dataset/enum/Element'
// import { IIframeInfo } from '../../../../interface/Block'
// import { DeepRequired } from '../../../../interface/Common'
// import { IEditorOption } from '../../../../interface/Editor'
import { IRowElement } from '../../../../interface/Row'
import { loadImage } from '../../../../utils'
import { BaseBlock } from './modules/BaseBlock'
import { DrawPdf } from '../../DrawPdf'
import { Context2d } from 'jspdf'

export class BlockParticle {
  private draw: DrawPdf
  // private container: HTMLDivElement
  // BLOCK elements (iframe, video, etc.) don't render to PDF — they need a
  // live DOM to host an <iframe>/<video>. In non-browser environments the
  // container stays null and the rendering code paths skip it.
  private blockContainer: HTMLDivElement | null
  private blockMap: Map<string, BaseBlock>

  constructor(draw: DrawPdf) {
    this.draw = draw
    // this.container = draw.getContainer()
    this.blockMap = new Map()
    this.blockContainer = this._createBlockContainer()
    // this.container.append(this.blockContainer)
  }

  private _createBlockContainer(): HTMLDivElement | null {
    if (typeof document === 'undefined') return null
    const blockContainer = document.createElement('div')
    blockContainer.classList.add(`${EDITOR_PREFIX}-block-container`)
    return blockContainer
  }

  public getDraw(): DrawPdf {
    return this.draw
  }

  public getBlockContainer(): HTMLDivElement {
    // Cast: in non-browser environments the container is null, but the only
    // caller (BaseBlock) is itself editor-mode code that never runs during
    // PDF render. Keeping the return type non-null avoids a cascade of `null`
    // guards through BaseBlock's DOM-heavy constructor.
    return this.blockContainer as HTMLDivElement
  }

  public render(
    ctx: Context2d,
    pageNo: number,
    element: IRowElement,
    x: number,
    y: number
  ) {
    // 优先使用缓存block
    const id = element.id!
    let cacheBlock = this.blockMap.get(id)
    if (!cacheBlock) {
      cacheBlock = new BaseBlock(this, element)
      cacheBlock.render()
      this.blockMap.set(id, cacheBlock)
    }
    ctx
    // 打印模式截图，其他模式更新位置
    // if (this.draw.isPrintMode()) {
    //   cacheBlock.snapshot(ctx, x, y)
    // } else {
      cacheBlock.setClientRects(pageNo, x, y)
    // }
  }

  public clear() {
    if (!this.blockMap.size) return
    const elementList = this.draw.getOriginalMainElementList()
    const blockElementIds: string[] = []
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (element.type === ElementType.BLOCK) {
        blockElementIds.push(element.id!)
      }
    }
    this.blockMap.forEach(block => {
      const id = block.getBlockElement().id!
      if (!blockElementIds.includes(id)) {
        block.remove()
        this.blockMap.delete(id)
      }
    })
  }

  public update() {
    this.blockMap.forEach(baseBlock => {
      const element = baseBlock.getBlockElement()
      // 更新iframe srcdoc
      if (
        element.block?.type === BlockType.IFRAME &&
        element.block.iframeBlock?.srcdoc
      ) {
        const iframe = baseBlock.getIFrameBlock?.()?.getIframe?.()
        if (iframe?.contentDocument) {
          element.block.iframeBlock.srcdoc =
            iframe.contentDocument.documentElement.outerHTML
        }
      }
    })
  }

  public async drawIframeToPage(
    pageList: HTMLCanvasElement[],
    snapDomFunction: (iframe: HTMLIFrameElement) => Promise<string>
  ) {
    const tasks: Promise<void>[] = []
    this.blockMap.forEach(cacheBlock => {
      if (cacheBlock.getBlockElement().block?.type !== BlockType.IFRAME) return
      const positionInfo = cacheBlock.getPositionInfo()
      if (!positionInfo) return
      const iframe = cacheBlock.getIFrameBlock()?.getIframe()
      if (!iframe) return
      const { pageNo, x, y } = positionInfo
      const ctx = pageList[pageNo]?.getContext('2d')
      if (!ctx) return
      const { width, height } = cacheBlock.getBlockElement().metrics
      tasks.push(
        snapDomFunction(iframe)
          .then(base64 => loadImage(base64))
          .then(img => ctx.drawImage(img, x, y, width, height))
      )
    })
    await Promise.allSettled(tasks)
  }

  // public pickIframeInfo(): IIframeInfo[][] {
  //   const result: IIframeInfo[][] = []
  //   const { scale } = this.options
  //   this.blockMap.forEach(cacheBlock => {
  //     const element = cacheBlock.getBlockElement()

  //     if (
  //       !element.block?.iframeBlock ||
  //       element.block.type !== BlockType.IFRAME
  //     ) {
  //       return
  //     }

  //     // 获取位置信息
  //     const positionInfo = cacheBlock.getPositionInfo()
  //     if (!positionInfo) return

  //     const { pageNo, x, y } = positionInfo
  //     if (!result[pageNo]) {
  //       result[pageNo] = []
  //     }

  //     result[pageNo].push({
  //       x,
  //       y,
  //       width: element.metrics.width / scale,
  //       height: element.metrics.height / scale,
  //       src: element.block.iframeBlock.src,
  //       srcdoc: element.block.iframeBlock.srcdoc
  //     })
  //   })

  //   return result
  // }
}
