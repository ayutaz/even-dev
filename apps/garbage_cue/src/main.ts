import './styles.css'
import { createAutoConnector } from '../../_shared/autoconnect'
import {
  createGarbageController,
  type GarbagePhase,
  type GlassPreview,
} from './garbage-app'
import {
  GARBAGE_TYPES,
  WEEKDAYS,
  cloneSchedule,
  createSampleSchedule,
  findNextPickup,
  formatDateLabel,
  formatItems,
  getDayItems,
  loadSchedule,
  normalizeSchedule,
  saveSchedule,
  type GarbageType,
  type WeeklySchedule,
} from './schedule'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app element')
}

app.innerHTML = `
  <header class="hero card">
    <div>
      <p class="eyebrow">Even G2 · 日本向けMVP</p>
      <h1 class="page-title">GarbageCue</h1>
      <p class="page-subtitle">今日出すごみを、メガネで一目確認</p>
    </div>
    <div id="hero-pill" class="hero-pill is-ready" aria-live="polite">準備完了</div>
  </header>

  <section class="card connection-card">
    <button id="connect-btn" class="btn btn-primary connect-btn" type="button">Even G2に接続</button>
    <p id="status" class="status-line">ブラウザプレビューを準備しています。</p>
  </section>

  <section class="summary-grid">
    <article class="summary-card summary-card--today card">
      <p class="section-label">今日</p>
      <p id="today-date" class="summary-date">—</p>
      <p id="today-value" class="summary-value">—</p>
      <p id="today-hint" class="summary-hint">—</p>
    </article>
    <article class="summary-card summary-card--next card">
      <p class="section-label">次回</p>
      <p id="next-date" class="summary-date">—</p>
      <p id="next-value" class="summary-value">—</p>
      <p class="summary-hint">登録した曜日から計算</p>
    </article>
  </section>

  <section class="card schedule-card">
    <div class="section-heading">
      <div>
        <p class="section-label">週間設定</p>
        <p class="section-description">お住まいの地域の収集曜日を登録してください。</p>
      </div>
      <button id="reset-btn" class="btn btn-ghost compact-btn" type="button">サンプルに戻す</button>
    </div>
    <div id="schedule-form" class="schedule-form"></div>
    <p id="storage-note" class="storage-note">この設定はブラウザに保存されます。</p>
  </section>

  <section class="card glasses-card">
    <div class="section-heading">
      <div>
        <p class="section-label">G2プレビュー</p>
        <p class="section-description">上下スワイプで曜日を切り替えます。</p>
      </div>
      <div class="preview-actions">
        <button id="today-btn" class="btn btn-ghost compact-btn" type="button">今日を表示</button>
        <button id="sync-btn" class="btn btn-primary compact-btn" type="button">G2に反映</button>
      </div>
    </div>
    <div id="glass-preview" class="glass-preview" aria-live="polite">
      <div id="preview-title" class="preview-title">—</div>
      <div id="preview-next" class="preview-next">—</div>
      <div id="preview-days" class="preview-days"></div>
    </div>
  </section>

  <section class="card note-card">
    <p class="section-label">初版の範囲</p>
    <p class="note-text">自治体データ、祝日・振替収集、位置情報、通知はまだ扱いません。表示内容は登録した曜日に基づく予定です。</p>
  </section>

  <details class="log-details">
    <summary>イベントログ</summary>
    <pre id="event-log" aria-live="polite"></pre>
  </details>
`

const heroPill = document.querySelector<HTMLDivElement>('#hero-pill')!
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!
const connectBtn = document.querySelector<HTMLButtonElement>('#connect-btn')!
const resetBtn = document.querySelector<HTMLButtonElement>('#reset-btn')!
const todayBtn = document.querySelector<HTMLButtonElement>('#today-btn')!
const syncBtn = document.querySelector<HTMLButtonElement>('#sync-btn')!
const scheduleForm = document.querySelector<HTMLDivElement>('#schedule-form')!
const storageNote = document.querySelector<HTMLParagraphElement>('#storage-note')!
const logEl = document.querySelector<HTMLPreElement>('#event-log')!
const todayDateEl = document.querySelector<HTMLParagraphElement>('#today-date')!
const todayValueEl = document.querySelector<HTMLParagraphElement>('#today-value')!
const todayHintEl = document.querySelector<HTMLParagraphElement>('#today-hint')!
const nextDateEl = document.querySelector<HTMLParagraphElement>('#next-date')!
const nextValueEl = document.querySelector<HTMLParagraphElement>('#next-value')!
const previewTitleEl = document.querySelector<HTMLDivElement>('#preview-title')!
const previewNextEl = document.querySelector<HTMLDivElement>('#preview-next')!
const previewDaysEl = document.querySelector<HTMLDivElement>('#preview-days')!

let scheduleState: WeeklySchedule
let hasStoredSchedule = false

const phaseLabels: Record<GarbagePhase, { label: string; className: string }> = {
  idle: { label: '準備完了', className: 'is-ready' },
  connecting: { label: '接続中', className: 'is-connecting' },
  connected: { label: 'G2接続済み', className: 'is-connected' },
  mock: { label: 'プレビュー', className: 'is-mock' },
  error: { label: '要確認', className: 'is-error' },
}

function setPhase(phase: GarbagePhase): void {
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

function optionMarkup(selected: GarbageType | ''): string {
  const options = [`<option value="">なし</option>`]
  for (const garbageType of GARBAGE_TYPES) {
    const isSelected = garbageType === selected ? ' selected' : ''
    options.push(`<option value="${garbageType}"${isSelected}>${garbageType}</option>`)
  }
  return options.join('')
}

function renderScheduleForm(): void {
  scheduleForm.innerHTML = WEEKDAYS.map((day, dayIndex) => {
    const items = getDayItems(scheduleState, dayIndex)
    return `
      <div class="schedule-row">
        <span class="weekday-badge">${day}</span>
        <select class="schedule-select" data-day-index="${dayIndex}" data-slot="0" aria-label="${day}曜日 1つ目">
          ${optionMarkup(items[0] ?? '')}
        </select>
        <select class="schedule-select" data-day-index="${dayIndex}" data-slot="1" aria-label="${day}曜日 2つ目">
          ${optionMarkup(items[1] ?? '')}
        </select>
      </div>
    `
  }).join('')
}

function renderStorageNote(): void {
  storageNote.textContent = hasStoredSchedule
    ? 'この端末のブラウザに保存されています。'
    : '初期値はサンプルです。設定を変更するとこの端末に保存されます。'
}

function renderSummary(): void {
  const now = new Date()
  const todayIndex = now.getDay()
  const todayItems = getDayItems(scheduleState, todayIndex)
  const nextPickup = findNextPickup(scheduleState, now, todayItems.length === 0)

  todayDateEl.textContent = formatDateLabel(now)
  todayValueEl.textContent = formatItems(todayItems)
  todayValueEl.classList.toggle('is-empty', todayItems.length === 0)
  todayHintEl.textContent = todayItems.length > 0
    ? '今日の収集日です'
    : '今日は収集なし。次回を確認してください'

  if (nextPickup) {
    nextDateEl.textContent = formatDateLabel(nextPickup.date)
    nextValueEl.textContent = formatItems(nextPickup.items)
  } else {
    nextDateEl.textContent = '—'
    nextValueEl.textContent = '予定なし'
  }
}

function renderGlassPreview(preview: GlassPreview): void {
  previewTitleEl.textContent = preview.title
  previewNextEl.textContent = preview.next
  previewDaysEl.innerHTML = preview.days.map((day, index) => `
    <span class="preview-day${index === preview.selectedIndex ? ' is-selected' : ''}">${day}</span>
  `).join('')
}

function readDayFromForm(dayIndex: number): GarbageType[] {
  const selects = [...scheduleForm.querySelectorAll<HTMLSelectElement>(`select[data-day-index="${dayIndex}"]`)]
  const values = selects
    .map((select) => select.value)
    .filter((value): value is GarbageType => (GARBAGE_TYPES as readonly string[]).includes(value))

  return [...new Set(values)].slice(0, 2)
}

const loadedSchedule = loadSchedule()
scheduleState = loadedSchedule.schedule
hasStoredSchedule = loadedSchedule.isStored

const controller = createGarbageController({
  getSchedule: () => scheduleState,
  onPhase: setPhase,
  onStatus: setStatus,
  onLog: appendLog,
  onPreview: renderGlassPreview,
})

scheduleForm.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return

  const rawDayIndex = target.dataset.dayIndex
  if (rawDayIndex === undefined) return

  const dayIndex = Number.parseInt(rawDayIndex, 10)
  if (!Number.isFinite(dayIndex) || dayIndex < 0 || dayIndex >= WEEKDAYS.length) return

  scheduleState[dayIndex] = readDayFromForm(dayIndex)
  scheduleState = normalizeSchedule(scheduleState)
  saveSchedule(scheduleState)
  hasStoredSchedule = true
  renderSummary()
  renderStorageNote()
  appendLog(`${WEEKDAYS[dayIndex]}曜日の設定を更新しました`)
  void controller.sync()
})

resetBtn.addEventListener('click', () => {
  scheduleState = createSampleSchedule()
  saveSchedule(scheduleState)
  hasStoredSchedule = true
  renderScheduleForm()
  renderSummary()
  renderStorageNote()
  appendLog('サンプル設定に戻しました')
  void controller.sync()
})

todayBtn.addEventListener('click', () => {
  void controller.selectDay(new Date().getDay())
})

syncBtn.addEventListener('click', () => {
  void controller.sync()
})

renderScheduleForm()
renderSummary()
renderStorageNote()
setPhase('idle')

const connector = createAutoConnector({
  connect: controller.connect,
  onConnecting: () => setPhase('connecting'),
})
connector.bind(connectBtn)
