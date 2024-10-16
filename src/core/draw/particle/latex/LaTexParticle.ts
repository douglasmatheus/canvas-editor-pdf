import { Context2d } from 'jspdf'
import { IElement } from '../../../../interface/Element'
import { ImageParticle } from '../ImageParticle'
import { LaTexSVG, LaTexUtils } from './utils/LaTexUtils'

export class LaTexParticle extends ImageParticle {
  public static convertLaTextToSVG(laTex: string): LaTexSVG {
    return new LaTexUtils(laTex).svg({
      SCALE_X: 10,
      SCALE_Y: 10,
      MARGIN_X: 0,
      MARGIN_Y: 0
    })
  }

  public async render(
    ctx2d: Context2d,
    element: IElement,
    x: number,
    y: number
  ) {
    // const { scale } = this.options
    // const width = element.width! * scale
    // const height = element.height! * scale
    // // this.draw.getPdf().addSvgAsImage(element.laTexSVG!, x, y, width, height)
    // const pngData = await this.svgString2Image(element.laTexSVG!, width, height, 'png', (pngData: any) => {
    //   // pngData is base64 png string
    //   ctx2d.drawImage(pngData, x, y, width, height)
    // }).then((pngData: any) => { return pngData })
    // // const pngData = await this.svgString2Image(element.laTexSVG!, width, height, 'png', /* callback that gets png data URL passed to it */(pngData: any) => {
    // //   // pngData is base64 png string
    // //   ctx2d.drawImage(pngData, x, y, width, height)
    // // }).then((pngData: any) => {
    // //   return pngData
    // // })
    // console.log('pngData')
    // console.log(pngData)
    // ctx2d.drawImage(pngData, x, y, width, height)
    const { scale } = this.options
    const width = element.width! * scale
    const height = element.height! * scale
    ctx2d.drawImage(element.laTexSVG!, x, y, width, height)
  }

  public svgString2Image(svgString: string, width: number, height: number, format: string, callback: { (pngData: any): void; (arg0: string): void }) {
    return new Promise((resolve, reject) => {
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
          resolve(pngData)
        }
      } // end async
      // start loading SVG data into in memory image
      image.src = svgData
      // return canvas.toDataURL('image/' + format)
    })
  }
}
