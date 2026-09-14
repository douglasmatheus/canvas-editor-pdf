// Type-level regression test. Nothing here runs — `npm run type:check`
// compiles it, and compiling *is* the assertion.
//
// src/interface/ and src/dataset/enum/ are copies of canvas-editor's types,
// and TypeScript makes two string enums mutually assignable only when their
// members match exactly in name and value (not even a valid subset passes).
// That exact-match rule is what lets a consumer hand `editor.command.getValue()`
// straight to `DrawPdf` with no cast — and it is also a tripwire: the moment
// upstream adds a member to an enum this fork copies, the editor's enum stops
// being assignable to the local one.
//
// Without this file that break surfaces in a consumer's project, after a
// release. With it, it surfaces here, in the fork's own build.
//
// It runs against whatever `@hufe921/canvas-editor` sits in devDependencies,
// so bumping that when porting moves the check with it. Runtime is unaffected
// either way — an element field this library doesn't know about is ignored at
// paint time; only the type boundary is strict.

import Editor from '@hufe921/canvas-editor'
import { DrawPdf } from '../../src/core/draw/DrawPdf'

declare const editor: Editor

// The canonical consumer snippet from README.md: no cast, no JSON round-trip,
// no defensive clone (DrawPdf deepClones the input itself).
const { options, data } = editor.command.getValue()
const pdf = new DrawPdf(options, data)

// setValue accepts the same shape.
void pdf.setValue(editor.command.getValue().data)
