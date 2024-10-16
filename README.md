# canvas-editor-pdf

Pdf exporter to [canvas-editor](https://github.com/Hufe921/canvas-editor).
This project currently replicates the same code as canvas-editor to be used with the jsPdf library. Making the appropriate specific modifications for jsPdf. I will be updating this repository with all the modifications to canvas-editor so that it does not become obsolete over time.

## Usage
At the moment this project is for internal use in canvas-editor, and it is necessary to create a function within CommandAdapt for the editor to use it. In the future I intend to decouple it so that it can be used independently. That said, first install it:

```
npm i canvas-editor-pdf --save
```

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