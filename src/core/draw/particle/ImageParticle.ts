import { Context2d } from 'jspdf'
import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { IEditorOption } from '../../../interface/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import { convertStringToBase64 } from '../../../utils'
import { DrawPdf } from '../DrawPdf'
import { DeepRequired } from '../../../interface/Common'

export class ImageParticle {
  protected draw: DrawPdf
  protected options: DeepRequired<IEditorOption>
  protected imageCache: Map<string, HTMLImageElement>
  // private container: HTMLDivElement
  private floatImageContainer: HTMLDivElement | null
  private floatImage: HTMLImageElement | null

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    // this.container = draw.getContainer()
    this.imageCache = new Map()
    this.floatImageContainer = null
    this.floatImage = null
  }

  public getOriginalMainImageList(): IElement[] {
    const imageList: IElement[] = []
    const getImageList = (elementList: IElement[]) => {
      for (const element of elementList) {
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              getImageList(td.value)
            }
          }
        } else if (element.type === ElementType.IMAGE) {
          imageList.push(element)
        }
      }
    }
    // 获取正文图片列表
    getImageList(this.draw.getOriginalMainElementList())
    return imageList
  }

  private _countImagesBeforeTarget(
    elementList: IElement[],
    targetElement: IElement
  ): number {
    let count = 0
    for (const element of elementList) {
      if (element === targetElement) break
      if (element.type === ElementType.TABLE) {
        const trList = element.trList!
        for (const tr of trList) {
          for (const td of tr.tdList) {
            count += this._countImagesBeforeTarget(td.value, targetElement)
          }
        }
      } else if (element.type === ElementType.IMAGE) {
        count++
      }
    }
    return count
  }

  public createFloatImage(element: IElement) {
    const { scale } = this.options
    // 复用浮动元素
    let floatImageContainer = this.floatImageContainer
    let floatImage = this.floatImage
    if (!floatImageContainer) {
      floatImageContainer = document.createElement('div')
      floatImageContainer.classList.add(`${EDITOR_PREFIX}-float-image`)
      // this.container.append(floatImageContainer)
      this.floatImageContainer = floatImageContainer
    }
    if (!floatImage) {
      floatImage = document.createElement('img')
      floatImageContainer.append(floatImage)
      this.floatImage = floatImage
    }
    floatImageContainer.style.display = 'none'
    floatImage.style.width = `${element.width! * scale}px`
    floatImage.style.height = `${element.height! * scale}px`
    // 浮动图片初始信息
    const height = this.draw.getHeight()
    const pageGap = this.draw.getPageGap()
    const preY = this.draw.getPageNo() * (height + pageGap)
    const imgFloatPosition = element.imgFloatPosition!
    floatImageContainer.style.left = `${imgFloatPosition.x * scale}px`
    floatImageContainer.style.top = `${preY + imgFloatPosition.y * scale}px`
    floatImage.src = element.value
  }

  public dragFloatImage(movementX: number, movementY: number) {
    if (!this.floatImageContainer) return
    this.floatImageContainer.style.display = 'block'
    // 之前的坐标加移动长度
    const x = parseFloat(this.floatImageContainer.style.left) + movementX
    const y = parseFloat(this.floatImageContainer.style.top) + movementY
    this.floatImageContainer.style.left = `${x}px`
    this.floatImageContainer.style.top = `${y}px`
  }

  public destroyFloatImage() {
    if (this.floatImageContainer) {
      this.floatImageContainer.style.display = 'none'
    }
  }

  protected addImageObserver(promise: Promise<unknown>) {
    this.draw.getImageObserver().add(promise)
  }

  protected getFallbackImage(width: number, height: number): HTMLImageElement {
    const tileSize = 8
    const x = (width - Math.ceil(width / tileSize) * tileSize) / 2
    const y = (height - Math.ceil(height / tileSize) * tileSize) / 2
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                  <rect width="${width}" height="${height}" fill="url(#mosaic)" />
                  <defs>
                    <pattern id="mosaic" x="${x}" y="${y}" width="${tileSize * 2
      }" height="${tileSize * 2}" patternUnits="userSpaceOnUse">
                      <rect width="${tileSize}" height="${tileSize}" fill="#cccccc" />
                      <rect width="${tileSize}" height="${tileSize}" fill="#cccccc" transform="translate(${tileSize}, ${tileSize})" />
                    </pattern>
                  </defs>
                </svg>`
    const fallbackImage = new Image()
    fallbackImage.src = `data:image/svg+xml;base64,${convertStringToBase64(
      svg
    )}`
    return fallbackImage
  }

  private _renderCaption(
    ctx2d: Context2d,
    element: IElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (!element.imgCaption?.value) return
    const { scale, imgCaption } = this.options
    let captionText = element.imgCaption.value
    // 替换特殊字符
    if (captionText.includes('{imageNo}')) {
      const elementList = this.draw.getOriginalMainElementList()
      const imageNo = this._countImagesBeforeTarget(elementList, element) + 1
      captionText = captionText.replace(/\{imageNo\}/g, String(imageNo))
    }
    const fontSize = (element.imgCaption.size || imgCaption.size) * scale
    const fontFamily = element.imgCaption.font || imgCaption.font
    const color = element.imgCaption.color || imgCaption.color
    ctx2d.save()
    ctx2d.font = `${fontSize}px ${fontFamily}`
    ctx2d.fillStyle = color
    ctx2d.textAlign = 'center'
    // 超出图片宽度后省略
    let displayText = captionText
    const textMetrics = this.draw.getFakeCtx().measureText(captionText)
    if (textMetrics.width > width) {
      let left = 0
      let right = captionText.length
      while (left < right) {
        const mid = Math.ceil((left + right) / 2)
        const truncated = captionText.substring(0, mid)
        if (this.draw.getFakeCtx().measureText(truncated + '...').width <= width) {
          left = mid
        } else {
          right = mid - 1
        }
      }
      displayText = captionText.substring(0, left) + '...'
    }
    const captionTop = (element.imgCaption.top ?? imgCaption.top) * scale
    const captionY =
      y + height + captionTop + textMetrics.actualBoundingBoxAscent
    const captionX = x + width / 2
    ctx2d.fillText(displayText, captionX, captionY)
    ctx2d.restore()
  }

  public render(
    ctx2d: Context2d,
    element: IElement,
    x: number,
    y: number
  ) {
    if (!element.value) return
    const { scale } = this.options
    const width = element.width! * scale
    const height = element.height! * scale
    ctx2d.drawImage(element.value, x, y, width, height)
    this._renderCaption(ctx2d, element, x, y, width, height)
  }
}

export function svgString2Image(svgString: string, width: number, height: number, format: string, callback: { (pngData: any): void; (arg0: string): void }) {
  return new Promise((resolve) => {
    // set default for format parameter
    format = format ? format : 'png'
    // SVG data URL from SVG string
    const svgData = svgString//'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)))
    // create canvas in memory(not in DOM)
    const canvas = document.createElement('canvas')
    // get canvas context for drawing on canvas
    const context = canvas.getContext('2d')
    // set canvas size
    canvas.width = width
    canvas.height = height
    // create image in memory(not in DOM)
    const image = new Image()
    // later when image loads run this
    image.onload = function () { // async (happens later)
      if (context) {
        // clear canvas
        context.clearRect(0, 0, width, height)
        // draw image with SVG data to canvas
        context.drawImage(image, 0, 0, width, height)
        // snapshot canvas as png
        const pngData = canvas.toDataURL('image/' + format)
        // pass png data URL to callback
        resolve(pngData)
        callback(pngData)
      }
    } // end async
    // start loading SVG data into in memory image
    image.src = svgData
  })
}