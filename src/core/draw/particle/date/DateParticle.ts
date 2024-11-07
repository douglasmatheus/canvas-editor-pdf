import { ElementType } from '../../../../dataset/enum/Element'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { formatElementContext } from '../../../../utils/element'
import { Draw } from '@hufe921/canvas-editor/dist/src/editor/core/draw/Draw'
import { DatePicker } from './DatePicker'
// import { RangeManager } from '@hufe921/canvas-editor/dist/src/editor/core/range/RangeManager'
import { DrawPdf } from '../../DrawPdf'

export class DateParticle {
  private draw: DrawPdf
  // private range: RangeManager
  private datePicker: DatePicker
  private options: DeepRequired<IEditorOption>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    // this.range = draw.getRange()
    this.datePicker = new DatePicker(draw, {
      // onSubmit: this._setValue.bind(this)
    })
  }

  // private _setValue(date: string) {
  //   if (!date) return
  //   const range = this.getDateElementRange()
  //   if (!range) return
  //   const [leftIndex, rightIndex] = range
  //   const elementList = this.draw.getElementList()
  //   const startElement = elementList[leftIndex + 1]
  //   // 删除旧时间
  //   this.draw.spliceElementList(
  //     elementList,
  //     leftIndex + 1,
  //     rightIndex - leftIndex
  //   )
  //   this.range.setRange(leftIndex, leftIndex)
  //   // 插入新时间
  //   const dateElement: IElement = {
  //     type: ElementType.DATE,
  //     value: '',
  //     dateFormat: startElement.dateFormat,
  //     valueList: [
  //       {
  //         value: date
  //       }
  //     ]
  //   }
  //   formatElementContext(elementList, [dateElement], leftIndex, {
  //     editorOptions: this.draw.getOptions()
  //   })
  //   this.draw.insertElementList([dateElement])
  // }

  // public getDateElementRange(): [number, number] | null {
  //   let leftIndex = -1
  //   let rightIndex = -1
  //   const { startIndex, endIndex } = this.range.getRange()
  //   if (!~startIndex && !~endIndex) return null
  //   const elementList = this.draw.getElementList()
  //   const startElement = elementList[startIndex]
  //   if (startElement.type !== ElementType.DATE) return null
  //   // 向左查找
  //   let preIndex = startIndex
  //   while (preIndex > 0) {
  //     const preElement = elementList[preIndex]
  //     if (preElement.dateId !== startElement.dateId) {
  //       leftIndex = preIndex
  //       break
  //     }
  //     preIndex--
  //   }
  //   // 向右查找
  //   let nextIndex = startIndex + 1
  //   while (nextIndex < elementList.length) {
  //     const nextElement = elementList[nextIndex]
  //     if (nextElement.dateId !== startElement.dateId) {
  //       rightIndex = nextIndex - 1
  //       break
  //     }
  //     nextIndex++
  //   }
  //   // 控件在最后
  //   if (nextIndex === elementList.length) {
  //     rightIndex = nextIndex - 1
  //   }
  //   if (!~leftIndex || !~rightIndex) return null
  //   return [leftIndex, rightIndex]
  // }

  public clearDatePicker() {
    this.datePicker.dispose()
  }

  public renderDatePicker(element: IElement, position: IElementPosition) {
    console.log('passando aqui pra criar datepicker...')
    const elementList = this.draw.getElementList()
    // const range = this.getDateElementRange()
    // const value = range
    //   ? elementList
    //       .slice(range[0] + 1, range[1] + 1)
    //       .map(el => el.value)
    //       .join('')
    //   : ''
    // this.datePicker.render({
    //   value,
    //   position,
    //   dateFormat: element.dateFormat
    // })
  }
}
