// import Editor from '..'

import Editor from '@hufe921/canvas-editor'

export type PluginFunction<Options> = (editor: Editor, options?: Options) => any

export type UsePlugin = <Options>(
  pluginFunction: PluginFunction<Options>,
  options?: Options
) => void
