// Playground entry. Imports the library straight from ../src so the deployed
// demo always reflects the current repo (no dependency on a published release).
// The browser platform shim (src/platform/current → browser.ts) is used
// automatically; default fonts load from the CDN at runtime.
import { DrawPdf } from '../src/index'
// @ts-expect-error — plain JS fixture, no types
import { sampleEditorData, editorOptions } from '../scripts/smoke/fixtures/sample.js'

declare global {
  interface Window {
    goatcounter?: {
      count?: (opts: { path: string; title?: string; event?: boolean }) => void
    }
  }
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

// ---- Theme toggle (Auto → Light → Dark). Auto follows the OS via CSS; the
// explicit modes stamp data-theme on <html>, which wins over the media query.
type ThemeMode = 'auto' | 'light' | 'dark'
const THEME_KEY = 'demo-theme'
const THEME_ICON: Record<ThemeMode, string> = { auto: '🌓', light: '☀️', dark: '🌙' }
const THEME_NEXT: Record<ThemeMode, ThemeMode> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto'
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  $<HTMLElement>('themeIcon').textContent = THEME_ICON[mode]
  $<HTMLElement>('themeLabel').textContent =
    mode[0].toUpperCase() + mode.slice(1)
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null
  let mode: ThemeMode = stored ?? 'auto'
  applyTheme(mode)
  $<HTMLButtonElement>('theme').addEventListener('click', () => {
    mode = THEME_NEXT[mode]
    localStorage.setItem(THEME_KEY, mode)
    applyTheme(mode)
  })
}

// ---- Collapsible panels: clicking a panel head toggles its body.
function initCollapsiblePanels() {
  document.querySelectorAll<HTMLElement>('.panel > .head').forEach(head => {
    head.addEventListener('click', () => {
      head.parentElement?.classList.toggle('collapsed')
    })
  })
}

// ---- Optional usage analytics (GoatCounter — privacy-friendly, no cookies).
// Set GOATCOUNTER_CODE to your site code (the subdomain, e.g. 'canvas-editor-pdf'
// for https://canvas-editor-pdf.goatcounter.com) to enable. Leave '' to disable
// — everything below is then a no-op. Counts a pageview on load and a
// 'generate-pdf' event each time a PDF is successfully generated.
const GOATCOUNTER_CODE = 'canvas-editor-pdf'

function initAnalytics() {
  if (!GOATCOUNTER_CODE) return
  const script = document.createElement('script')
  script.async = true
  script.src = '//gc.zgo.at/count.js'
  script.setAttribute(
    'data-goatcounter',
    `https://${GOATCOUNTER_CODE}.goatcounter.com/count`
  )
  document.head.appendChild(script)
}

function countEvent(path: string) {
  window.goatcounter?.count?.({ path, event: true })
}

const optionsEl = $<HTMLTextAreaElement>('options')
const dataEl = $<HTMLTextAreaElement>('data')
const generateBtn = $<HTMLButtonElement>('generate')
const downloadBtn = $<HTMLButtonElement>('download')
const resetBtn = $<HTMLButtonElement>('reset')
const statusEl = $<HTMLElement>('status')
const previewHost = $<HTMLElement>('previewHost')
const versionEl = $<HTMLElement>('version')

versionEl.textContent = `v${__VERSION__}`

// The shared sample fixture drives the default content. Its LaTeX element is
// dropped from the default: this lib renders an already-converted SVG, but
// turning a LaTeX string into SVG is KaTeX's job (upstream canvas-editor), so a
// raw latex element has no `laTexSVG` and would fail on first click.
const defaultData = {
  ...sampleEditorData,
  main: (sampleEditorData.main as Array<{ type?: string }>).filter(
    el => el.type !== 'latex'
  )
}

function setStatus(msg: string, kind: '' | 'ok' | 'err' = '') {
  statusEl.textContent = msg
  statusEl.className = kind
}

function loadSample() {
  optionsEl.value = JSON.stringify(editorOptions, null, 2)
  dataEl.value = JSON.stringify(defaultData, null, 2)
  setStatus('')
}

let currentBlobUrl: string | null = null
let lastPdfBlob: Blob | null = null

function revokeBlob() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
}

function parseJson(label: string, raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new Error(`${label} is not valid JSON: ${(err as Error).message}`)
  }
}

async function generate() {
  generateBtn.disabled = true
  downloadBtn.disabled = true
  setStatus('Parsing input…')
  try {
    const options = parseJson('Options', optionsEl.value || '{}')
    const data = parseJson('Data', dataEl.value || '{}')

    setStatus('Loading fonts…')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = new DrawPdf(options as any, data as any, {
      loadDefaultFonts: true // fontSource defaults to 'cdn' in the browser
    })
    await instance.defaultFontsLoadedPromise

    setStatus('Rendering…')
    instance.render()

    revokeBlob()
    lastPdfBlob = instance.getPdf().output('blob') as Blob
    currentBlobUrl = URL.createObjectURL(lastPdfBlob)

    previewHost.className = ''
    previewHost.innerHTML = ''
    const iframe = document.createElement('iframe')
    iframe.title = 'PDF preview'
    iframe.src = currentBlobUrl
    previewHost.appendChild(iframe)

    downloadBtn.disabled = false
    setStatus('Rendered.', 'ok')
    countEvent('generate-pdf')
  } catch (err) {
    console.error(err)
    setStatus('✗ ' + ((err as Error)?.message || String(err)), 'err')
  } finally {
    generateBtn.disabled = false
  }
}

function download() {
  if (!lastPdfBlob) return
  const url = URL.createObjectURL(lastPdfBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'canvas-editor.pdf'
  a.click()
  URL.revokeObjectURL(url)
}

generateBtn.addEventListener('click', generate)
downloadBtn.addEventListener('click', download)
resetBtn.addEventListener('click', loadSample)

initTheme()
initCollapsiblePanels()
initAnalytics()
loadSample()
