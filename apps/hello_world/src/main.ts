import { EvenBetterSdk } from '@jappyjan/even-better-sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import { getRawEventType, normalizeEventType } from '../../_shared/even-events'

// =========================================================================
// ブラウザ側 UI (スマホの WebView に表示される / グラス表示には影響しない)
// =========================================================================
const appRoot = document.querySelector<HTMLDivElement>('#app')
if (!appRoot) {
  throw new Error('Missing #app element')
}

appRoot.innerHTML = `
  <main style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px 16px; color: #f6f6f6;">
    <h1 style="font-size: 18px; margin: 0 0 4px;">Hello World — Even G2</h1>
    <p id="status" style="font-size: 13px; margin: 8px 0;">Status: idle</p>
    <button id="render" type="button"
      style="padding: 10px 18px; font-size: 14px; cursor: pointer;">
      Render to glasses
    </button>
    <pre id="log" style="margin-top: 14px; padding: 10px; background: #111; border: 1px solid #333;
      border-radius: 6px; font-size: 11px; line-height: 1.5; max-height: 55vh; overflow: auto;
      white-space: pre-wrap; word-break: break-all;"></pre>
  </main>
`

const statusEl = appRoot.querySelector<HTMLParagraphElement>('#status')!
const renderBtn = appRoot.querySelector<HTMLButtonElement>('#render')!
const logEl = appRoot.querySelector<HTMLPreElement>('#log')!

function setStatus(text: string): void {
  statusEl.textContent = `Status: ${text}`
}

function logLine(level: string, message: unknown): void {
  const time = new Date().toLocaleTimeString()
  const text = typeof message === 'string' ? message : JSON.stringify(message)
  logEl.textContent += `[${time}] ${level}: ${text}\n`
  logEl.scrollTop = logEl.scrollHeight
}

// SDK の内部ログを画面に出す (実機では console が見えないため)
EvenBetterSdk.setLogLevel('debug')
EvenBetterSdk.setLogger({
  info: (m) => logLine('sdk-info', m),
  warn: (m) => logLine('sdk-warn', m),
  error: (m) => logLine('sdk-error', m),
  debug: (m) => logLine('sdk-debug', m),
})

// =========================================================================
// グラス側の状態 (入力イベントで書き換わる)
// =========================================================================
const MESSAGES = ['Hello, World!', 'Hello, Even G2!', 'こんにちは!', 'Bonjour!']
let messageIndex = 0
let tapCount = 0
let lastEventLabel = '(まだイベントなし)'

// OsEventTypeList を読みやすい名前にする
function eventLabel(type: OsEventTypeList | undefined): string {
  switch (type) {
    case OsEventTypeList.CLICK_EVENT:
      return 'CLICK (タップ)'
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      return 'DOUBLE_CLICK (ダブルタップ)'
    case OsEventTypeList.SCROLL_TOP_EVENT:
      return 'SCROLL_TOP (上スワイプ)'
    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      return 'SCROLL_BOTTOM (下スワイプ)'
    default:
      return 'unknown'
  }
}

// 受け取ったイベントを状態に反映する
function applyEvent(type: OsEventTypeList | undefined): void {
  switch (type) {
    case OsEventTypeList.CLICK_EVENT:
      tapCount += 1
      break
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      tapCount = 0
      messageIndex = 0
      break
    case OsEventTypeList.SCROLL_TOP_EVENT:
      messageIndex = (messageIndex - 1 + MESSAGES.length) % MESSAGES.length
      break
    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      messageIndex = (messageIndex + 1) % MESSAGES.length
      break
    default:
      break
  }
}

// =========================================================================
// グラスのセットアップ + 入力ループ
// =========================================================================
let glasses: { rerender: () => Promise<void> } | null = null

async function setupGlasses(): Promise<void> {
  // 2 回目以降は再セットアップせず、現在の状態を再描画するだけ
  if (glasses) {
    await glasses.rerender()
    return
  }

  setStatus('setup 中... (bridge 待機)')
  logLine('app', 'setupGlasses() start')

  try {
    const sdk = new EvenBetterSdk()
    const page = sdk.createPage('hello-world')

    // メインのテキスト要素。markAsEventCaptureElement() で
    // この要素がタップ / スクロール入力を受け取るようになる (1 ページに 1 つだけ)
    const helloText = page.addTextElement(MESSAGES[messageIndex])
    helloText
      .setPosition((position) => position.setX(8).setY(70))
      .setSize((size) => size.setWidth(560).setHeight(70))
      .markAsEventCaptureElement()

    // 直近イベントを表示する 2 つ目のテキスト要素
    const infoText = page.addTextElement('タップ / 上下スワイプで操作')
    infoText
      .setPosition((position) => position.setX(8).setY(160))
      .setSize((size) => size.setWidth(560).setHeight(70))

    // 現在の状態をグラスへ反映する
    const rerender = async (): Promise<void> => {
      helloText.setContent(`${MESSAGES[messageIndex]}  (taps: ${tapCount})`)
      infoText.setContent(`last: ${lastEventLabel}`)
      await page.render()
    }

    // 入力ループ: タップ / スクロールを受け取って状態を更新し、再描画する
    sdk.addEventListener((event) => {
      // 実機 / シミュレータでイベント構造が異なるため、
      // _shared のヘルパーで型を正規化する
      const type = normalizeEventType(getRawEventType(event), OsEventTypeList)
      lastEventLabel = eventLabel(type)
      logLine('event', `received: ${lastEventLabel}`)

      applyEvent(type)
      void rerender()
    })

    glasses = { rerender }

    await page.render()
    setStatus('ready — グラスでタップ/スワイプを試してください')
    logLine('app', 'page.render() resolved OK')
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    setStatus(`setup failed — ${msg}`)
    logLine('error', `setupGlasses() failed: ${msg}`)
  }
}

renderBtn.addEventListener('click', () => {
  void setupGlasses()
})

// 起動時に自動セットアップ
void setupGlasses()
