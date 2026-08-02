import './styles.css'
import { createAutoConnector } from '../../_shared/autoconnect'
import {
  createEventLensController,
  type EventLensPhase,
  type GlassPreview,
} from './eventlens-app'
import {
  createEmptyEventData,
  findExhibitor,
  normalizeEventData,
  sortExhibitorsByBooth,
  type EventData,
  type Exhibitor,
} from './exhibitors'
import {
  addItem,
  createEmptyItinerary,
  hasItem,
  removeItem,
  setNote,
  sortByBooth,
  type Itinerary,
} from './itinerary'
import { fetchEventData } from './remote'
import {
  loadCachedEventData,
  loadItinerary,
  saveCachedEventData,
  saveItinerary,
} from './storage'

const BUNDLED_DATA_URL = '/exhibitors.json'
const REMOTE_DATA_URL = 'https://www.genai-expo.com/eventlens/exhibitors.json'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app element')
}

app.innerHTML = `
  <header class="hero card">
    <div>
      <p class="eyebrow">Even G2 · 展示会巡回HUD</p>
      <h1 class="page-title">EventLens</h1>
      <p class="page-subtitle">次に行くブースを、メガネで一目確認</p>
    </div>
    <div id="hero-pill" class="hero-pill is-ready" aria-live="polite">準備完了</div>
  </header>

  <section class="card connection-card">
    <button id="connect-btn" class="btn btn-primary connect-btn" type="button">Even G2に接続</button>
    <p id="status" class="status-line">ブラウザプレビューを準備しています。</p>
  </section>

  <section class="card schedule-card">
    <div class="section-heading">
      <div>
        <p class="section-label">巡回リスト</p>
        <p id="itinerary-summary" class="section-description">—</p>
      </div>
      <button id="sort-btn" class="btn btn-ghost compact-btn" type="button">ブース番号順</button>
    </div>
    <div id="itinerary-list" class="schedule-form"></div>
    <p id="storage-note" class="storage-note">この端末のブラウザに保存されます。</p>
  </section>

  <section class="card schedule-card">
    <div class="section-heading">
      <div>
        <p class="section-label">出展者を探す</p>
        <p id="event-name" class="section-description">—</p>
      </div>
    </div>
    <input id="search-input" class="schedule-select" type="search" placeholder="ブース番号・出展名で検索" aria-label="出展者を検索" />
    <div id="exhibitor-list" class="schedule-form"></div>
  </section>

  <section class="card glasses-card">
    <div class="section-heading">
      <div>
        <p class="section-label">G2プレビュー</p>
        <p class="section-description">上下スワイプで送り、タップで訪問済みにします。</p>
      </div>
      <div class="preview-actions">
        <button id="sync-btn" class="btn btn-primary compact-btn" type="button">G2に反映</button>
      </div>
    </div>
    <div id="glass-preview" class="glass-preview" aria-live="polite">
      <div id="preview-title" class="preview-title">—</div>
      <div id="preview-next" class="preview-next">—</div>
    </div>
  </section>

  <details class="log-details">
    <summary>イベントログ</summary>
    <pre id="event-log" aria-live="polite"></pre>
  </details>
`

const heroPill = document.querySelector<HTMLDivElement>('#hero-pill')!
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!
const connectBtn = document.querySelector<HTMLButtonElement>('#connect-btn')!
const sortBtn = document.querySelector<HTMLButtonElement>('#sort-btn')!
const syncBtn = document.querySelector<HTMLButtonElement>('#sync-btn')!
const itinerarySummaryEl = document.querySelector<HTMLParagraphElement>('#itinerary-summary')!
const itineraryListEl = document.querySelector<HTMLDivElement>('#itinerary-list')!
const eventNameEl = document.querySelector<HTMLParagraphElement>('#event-name')!
const searchInput = document.querySelector<HTMLInputElement>('#search-input')!
const exhibitorListEl = document.querySelector<HTMLDivElement>('#exhibitor-list')!
const previewTitleEl = document.querySelector<HTMLDivElement>('#preview-title')!
const previewNextEl = document.querySelector<HTMLDivElement>('#preview-next')!
const logEl = document.querySelector<HTMLPreElement>('#event-log')!

let eventData: EventData = createEmptyEventData()
let itinerary: Itinerary = createEmptyItinerary()

const phaseLabels: Record<EventLensPhase, { label: string; className: string }> = {
  idle: { label: '準備完了', className: 'is-ready' },
  connecting: { label: '接続中', className: 'is-connecting' },
  connected: { label: 'G2接続済み', className: 'is-connected' },
  mock: { label: 'プレビュー', className: 'is-mock' },
  error: { label: '要確認', className: 'is-error' },
}

function setPhase(phase: EventLensPhase): void {
  const next = phaseLabels[phase]
  heroPill.textContent = next.label
  heroPill.className = `hero-pill ${next.className}`
}

function setStatus(message: string): void {
  statusEl.textContent = message
}

function appendLog(message: string): void {
  const time = new Date().toLocaleTimeString()
  logEl.textContent = `[${time}] ${message}\n${logEl.textContent ?? ''}`
  const lines = logEl.textContent.split('\n')
  if (lines.length > 80) {
    logEl.textContent = lines.slice(0, 80).join('\n')
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function persist(): void {
  if (eventData.eventId.length === 0) return
  saveItinerary(window.localStorage, eventData.eventId, itinerary)
}

function renderItinerary(): void {
  if (itinerary.items.length === 0) {
    itineraryListEl.innerHTML = '<p class="note-text">まだ登録がありません。下の一覧から追加してください。</p>'
    itinerarySummaryEl.textContent = '0件'
    return
  }

  const visitedCount = itinerary.items.filter((item) => item.visited).length
  itinerarySummaryEl.textContent = `${itinerary.items.length}件中 ${visitedCount}件 訪問済み`

  itineraryListEl.innerHTML = itinerary.items.map((item, index) => {
    const exhibitor = findExhibitor(eventData, item.exhibitorId)
    const label = exhibitor
      ? `${escapeHtml(exhibitor.booth)} ${escapeHtml(exhibitor.name)}`
      : '（掲載終了）'
    const current = index === itinerary.cursor ? ' is-selected' : ''
    const visited = item.visited ? '✓ ' : ''

    return `
      <div class="schedule-row${current}">
        <span class="weekday-badge">${index + 1}</span>
        <span>${visited}${label}</span>
        <input class="schedule-select" type="text" value="${escapeHtml(item.note)}"
               data-note-for="${escapeHtml(item.exhibitorId)}"
               placeholder="見たいもの" aria-label="${label} のメモ" />
        <button class="btn btn-ghost compact-btn" type="button"
                data-remove="${escapeHtml(item.exhibitorId)}">削除</button>
      </div>
    `
  }).join('')
}

function matchesQuery(exhibitor: Exhibitor, query: string): boolean {
  if (query.length === 0) return true
  const haystack = `${exhibitor.booth} ${exhibitor.name} ${exhibitor.genre ?? ''}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}

function renderExhibitors(): void {
  const query = searchInput.value.trim()
  const matched = sortExhibitorsByBooth(eventData.exhibitors)
    .filter((exhibitor) => matchesQuery(exhibitor, query))
    .slice(0, 50)

  if (matched.length === 0) {
    exhibitorListEl.innerHTML = '<p class="note-text">該当する出展がありません。</p>'
    return
  }

  exhibitorListEl.innerHTML = matched.map((exhibitor) => {
    const added = hasItem(itinerary, exhibitor.id)
    return `
      <div class="schedule-row">
        <span class="weekday-badge">${escapeHtml(exhibitor.booth)}</span>
        <span>${escapeHtml(exhibitor.name)}</span>
        <button class="btn ${added ? 'btn-ghost' : 'btn-primary'} compact-btn" type="button"
                data-add="${escapeHtml(exhibitor.id)}" ${added ? 'disabled' : ''}>
          ${added ? '追加済み' : '追加'}
        </button>
      </div>
    `
  }).join('')
}

function renderGlassPreview(preview: GlassPreview): void {
  previewTitleEl.textContent = preview.heading
  previewNextEl.textContent = `${preview.note}\n${preview.footer}`
}

function renderAll(): void {
  eventNameEl.textContent = eventData.eventName.length > 0
    ? `${eventData.eventName}（${eventData.exhibitors.length}組）`
    : '出展者データがありません'
  renderItinerary()
  renderExhibitors()
}

const controller = createEventLensController({
  getItinerary: () => itinerary,
  getEventData: () => eventData,
  onItineraryChange: (next) => {
    itinerary = next
    persist()
    renderItinerary()
  },
  onPhase: setPhase,
  onStatus: setStatus,
  onLog: appendLog,
  onPreview: renderGlassPreview,
})

itineraryListEl.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof HTMLButtonElement)) return

  const exhibitorId = target.dataset.remove
  if (!exhibitorId) return

  itinerary = removeItem(itinerary, exhibitorId)
  persist()
  renderAll()
  appendLog('巡回リストから削除しました')
  void controller.sync()
})

itineraryListEl.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return

  const exhibitorId = target.dataset.noteFor
  if (!exhibitorId) return

  itinerary = setNote(itinerary, exhibitorId, target.value)
  persist()
  appendLog('メモを更新しました')
  void controller.sync()
})

exhibitorListEl.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof HTMLButtonElement)) return

  const exhibitorId = target.dataset.add
  if (!exhibitorId) return

  itinerary = addItem(itinerary, exhibitorId)
  persist()
  renderAll()
  appendLog('巡回リストに追加しました')
  void controller.sync()
})

searchInput.addEventListener('input', () => {
  renderExhibitors()
})

sortBtn.addEventListener('click', () => {
  itinerary = sortByBooth(itinerary, eventData)
  persist()
  renderAll()
  appendLog('ブース番号順に並べ替えました')
  void controller.sync()
})

syncBtn.addEventListener('click', () => {
  void controller.sync()
})

async function loadBundledData(): Promise<EventData> {
  try {
    const response = await fetch(BUNDLED_DATA_URL)
    if (!response.ok) return createEmptyEventData()
    return normalizeEventData(await response.json()) ?? createEmptyEventData()
  } catch {
    return createEmptyEventData()
  }
}

async function bootstrap(): Promise<void> {
  eventData = await loadBundledData()

  const cached = loadCachedEventData(window.localStorage)
  if (cached && cached.eventId === eventData.eventId && cached.version > eventData.version) {
    eventData = cached
    appendLog('保存済みの新しい出展者データを使用します')
  }

  itinerary = loadItinerary(window.localStorage, eventData.eventId)
  renderAll()
  setPhase('idle')

  const connector = createAutoConnector({
    connect: controller.connect,
    onConnecting: () => setPhase('connecting'),
  })
  connector.bind(connectBtn)

  const remote = await fetchEventData(REMOTE_DATA_URL)
  if (remote && remote.eventId === eventData.eventId && remote.version > eventData.version) {
    eventData = remote
    saveCachedEventData(window.localStorage, remote)
    appendLog(`出展者データを更新しました（version ${remote.version}）`)
    renderAll()
    void controller.sync()
  }
}

void bootstrap()
