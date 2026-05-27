import type { IPlatform, IPlatformFont } from './types'

export const platform: IPlatform = {
  defaultFontSource: 'cdn',

  createMeasurementCanvas() {
    return document.createElement('canvas')
  },

  createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  },

  getBundledFontPath(fileName) {
    // Browsers can't read from the published package's filesystem. The browser
    // build doesn't ship with bundled font paths; consumers wanting offline
    // fonts should host the TTFs themselves and pass `fontSource: { dir }`
    // (interpreted as a base URL) or stick with the default 'cdn' source.
    throw new Error(
      `fontSource 'bundled' is not supported in the browser build (looking up ${fileName}). ` +
      `Use 'cdn' (default) or host the TTFs and pass { dir: '/your/url/base' }.`
    )
  },

  async loadFontAsBase64(source) {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`Font fetch failed: ${response.status} ${response.statusText}`)
    }
    const blob = await response.blob()
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split('base64,')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  },

  registerFontForMeasurement(_font: IPlatformFont, _fontBytesBase64: string) {
    // No-op: browsers use the OS/system font registry for canvas measureText.
    // The font name passed to jsPDF (e.g. 'arial') must match a system font
    // available to the user agent. Same behavior as pre-0.4.0.
  },

  svgToPngDataUrl(svg, width, height) {
    return new Promise<string>(resolve => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
    })
  }
}
