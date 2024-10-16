import { Context2d } from 'jspdf'
import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { ImageDisplay } from '../../../dataset/enum/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { convertStringToBase64 } from '../../../utils'
import { DrawPdf } from '../DrawPdf'

export class ImageParticle {
  protected draw: DrawPdf
  protected options: Required<IEditorOption>
  protected imageCache: Map<string, HTMLImageElement>
  private container: HTMLDivElement
  private floatImageContainer: HTMLDivElement | null
  private floatImage: HTMLImageElement | null

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    this.container = draw.getContainer()
    this.imageCache = new Map()
    this.floatImageContainer = null
    this.floatImage = null
  }

  public createFloatImage(element: IElement) {
    const { scale } = this.options
    // 复用浮动元素
    let floatImageContainer = this.floatImageContainer
    let floatImage = this.floatImage
    if (!floatImageContainer) {
      floatImageContainer = document.createElement('div')
      floatImageContainer.classList.add(`${EDITOR_PREFIX}-float-image`)
      this.container.append(floatImageContainer)
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
    floatImageContainer.style.left = `${imgFloatPosition.x}px`
    floatImageContainer.style.top = `${preY + imgFloatPosition.y}px`
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

  public render(
    ctx2d: Context2d,
    element: IElement,
    x: number,
    y: number
  ) {
    // 衬于文字下方图片需要重新首先绘制
    if (element.imgDisplay === ImageDisplay.FLOAT_BOTTOM) {
      this.draw.render({
        isCompute: false,
        isSetCursor: false,
        isSubmitHistory: false
      })
    } else {
      const { scale } = this.options
      const width = element.width! * scale
      const height = element.height! * scale
      ctx2d.drawImage(element.value, x, y, width, height)
    }
  }
}

export function svgString2Image(svgString: string, width: number, height: number, format: string, callback: { (pngData: any): void; (arg0: string): void }) {
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
      callback(pngData)
    }
  } // end async
  // start loading SVG data into in memory image
  image.src = svgData
}