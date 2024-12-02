# canvas-editor-pdf

Pdf exporter to [canvas-editor](https://github.com/Hufe921/canvas-editor).
This project currently replicates the same code as canvas-editor to be used with the jsPdf library. Making the appropriate specific modifications for jsPdf. I will be updating this repository with all the modifications to canvas-editor so that it does not become obsolete over time.

## Usage
As of version 0.1.0, the library is completely decoupled from the editor. You only need to pass the data from the editor - at instantiation or later through the setValue() function. If you use a version prior to 0.1.0, see how to use it below.

```
npm i canvas-editor-pdf --save
```

It is recommended to instantiate the library before exporting the PDF, as the UI may crash. This is because jspdf loads fonts synchronously.

Import the class from pdf:
```javascript
  import { DrawPdf } from 'canvas-editor-pdf'
```

First you create the library instance:
```javascript
  const instancePdf = new DrawPdf(
    JSON.parse(JSON.stringify(instance.command.getValue().options)), // make a copy of the editor settings and avoid type conflicts
    instance.command.getValue().data
  )
```

When you want to export the pdf:
```javascript
  // If you want to update the data, you need to use await so that internally you can convert latex from svg to png - jspdf does not support svg
  await instancePdf.setValue(instance.command.getValue().data)
  instancePdf.render() // you need to call render to process and create the data within jspdf
  instancePdf.getPdf().save(`test.pdf`) // pdf download
```

## Fonts
At the moment few fonts are supported, jspdf defaults:
- courier (normal, bold, italic)
- helvetica (normal, bold, italic)
- symbol (normal)
- times (roman, bold, italic)

And also the following fonts:
- Microsoft Yahei (normal, bold)
- Arial (normal, bold, italic)
- Calibri (normal, bold, italic)
- Cambria (normal, bold, italic)
- Ink Free (normal)
- Verdana (normal, bold, italic)
- Segoe UI (normal, bold italic)

Other fonts will be added little by little, but if necessary, you can manually add a font by passing the link to the .ttf file:
```javascript
  // instance.addFont(url, fileName, id, type)
  instance.addFont('https://raw.githubusercontent.com/Hufe921/canvas-editor/refs/heads/feature/pdf/public/font/msyh.ttf', 'Yahei.ttf', 'Yahei', 'normal')
```

## Usage before version 0.1.0
At the moment this project is for internal use in canvas-editor, and it is necessary to create a function within CommandAdapt for the editor to use it. In the future I intend to decouple it so that it can be used independently. That said, first install it:

Now inside the editor in src > editor > core > command > CommandAdapt.ts place this function at the end:

```javascript
public async pdf(fileName: string) {
    const dataHeader = JSON.parse(JSON.stringify(this.draw.getValue().data.header))
    // You need to update the latex elements from svg to png, since jspdf does not support the svg format
    const updateSrcLatexElements = (elementList: any[]) => {
      elementList.forEach((element) => {
        if (element.laTexSVG) {
          const { scale } = this.options
          const width = element.width! * scale
          const height = element.height! * scale
          svgString2Image(element.laTexSVG, width, height, 'png', (pngData: any) => {
            // pngData is base64 png string
            element.laTexSVG = pngData
          })
        }
      })
    }
    this.draw.getOriginalMainElementList().forEach((elem) => {
      if (elem.laTexSVG) {
        updateSrcLatexElements([elem])
      }
    })
    const dataMain = JSON.parse(JSON.stringify(this.draw.getValue().data.main))
    const dataFooter = JSON.parse(JSON.stringify(this.draw.getValue().data.footer))
    // A timeout is necessary to give time to update the latex elements (in some situations with a lot of data and many laex elements it may be necessary to increase the timeout)
    setTimeout(() => {
      this.draw.render({isLazy: false})
      const drawPdf = new DrawPdf(
        JSON.parse(JSON.stringify(this.draw.getOptions())),
        {
          header: dataHeader,
          main: dataMain,
          footer: dataFooter
        },
        this.draw
      )
      drawPdf.render()
      drawPdf.getPdf().save(${fileName}.pdf)
    }, 1)
}
```

Inside the editor in src > editor > core > command > Command.ts register the new property:

```javascript
public pdf: CommandAdapt['pdf']
```

And inside the constructor define the property with the CommandAdapt function:

```javascript
this.pdf = adapt.pdf.bind(adapt)
```

To use the new editor function call it like this:

```javascript
editor.command.pdf('test')
```