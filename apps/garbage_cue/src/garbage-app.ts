import {
  CreateStartUpPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  OsEventTypeList,
  RebuildPageContainer,
  TextContainerProperty,
  waitForEvenAppBridge,
  type EvenAppBridge,
  type EvenHubEvent,
} from '@evenrealities/even_hub_sdk'
import { withTimeout } from '../../_shared/async'
import { getRawEventType, normalizeEventType } from '../../_shared/even-events'
import {
  WEEKDAYS,
  findNextPickup,
  formatDateLabel,
  formatDayLabel,
  formatItems,
  getDayItems,
  type WeeklySchedule,
} from './schedule'

export type GarbagePhase = 'idle' | 'connecting' | 'connected' | 'mock' | 'error'

export type GlassPreview = {
  title: string
  next: string
  days: readonly string[]
  selectedIndex: number
}

export type GarbageControllerOptions = {
  getSchedule: () => WeeklySchedule
  onPhase: (phase: GarbagePhase) => void
  onStatus: (message: string) => void
  onLog: (message: string) => void
  onPreview: (preview: GlassPreview) => void
}

export type GarbageController = {
  connect: () => Promise<void>
  sync: () => Promise<void>
  selectDay: (dayIndex: number) => Promise<void>
  getSelectedDay: () => number
}

function clampDayIndex(dayIndex: number): number {
  const normalized = Math.trunc(dayIndex)
  return ((normalized % WEEKDAYS.length) + WEEKDAYS.length) % WEEKDAYS.length
}

function getIncomingDayIndex(event: EvenHubEvent): number | null {
  const rawIndex = event.listEvent?.currentSelectItemIndex
  const parsedIndex = typeof rawIndex === 'number'
    ? rawIndex
    : typeof rawIndex === 'string'
      ? Number.parseInt(rawIndex, 10)
      : Number.NaN

  if (Number.isFinite(parsedIndex) && parsedIndex >= 0 && parsedIndex < WEEKDAYS.length) {
    return parsedIndex
  }

  const rawName = event.listEvent?.currentSelectItemName
  if (typeof rawName !== 'string') return null

  const normalizedName = rawName.trim()
  const matchingIndex = WEEKDAYS.findIndex((day) => normalizedName.includes(day))
  return matchingIndex >= 0 ? matchingIndex : null
}

export function createGarbageController(options: GarbageControllerOptions): GarbageController {
  let bridge: EvenAppBridge | null = null
  let startupRendered = false
  let eventLoopRegistered = false
  let selectedDayIndex = new Date().getDay()

  function getPreview(): GlassPreview {
    const schedule = options.getSchedule()
    const now = new Date()
    const todayIndex = now.getDay()
    const selectedItems = getDayItems(schedule, selectedDayIndex)
    const selectedLabel = selectedDayIndex === todayIndex
      ? `今日 ${formatDateLabel(now)}`
      : formatDayLabel(selectedDayIndex)

    const title = `${selectedLabel}\n${formatItems(selectedItems)}`
    const todayItems = getDayItems(schedule, todayIndex)
    const nextPickup = findNextPickup(schedule, now, todayItems.length === 0)
    const next = nextPickup
      ? `次回 ${formatDateLabel(nextPickup.date)}\n${formatItems(nextPickup.items)}`
      : '次回の収集予定なし'

    return {
      title,
      next: `${next}\n↑↓ 曜日を確認  2回タップで終了`,
      days: WEEKDAYS,
      selectedIndex: selectedDayIndex,
    }
  }

  function publishPreview(): GlassPreview {
    const preview = getPreview()
    options.onPreview(preview)
    return preview
  }

  function buildPagePayload() {
    const preview = publishPreview()
    const titleText = new TextContainerProperty({
      containerID: 1,
      containerName: 'garbage-title',
      content: preview.title,
      xPosition: 8,
      yPosition: 4,
      width: 560,
      height: 64,
      isEventCapture: 0,
    })

    const nextText = new TextContainerProperty({
      containerID: 3,
      containerName: 'garbage-next',
      content: preview.next,
      xPosition: 8,
      yPosition: 76,
      width: 560,
      height: 62,
      isEventCapture: 0,
    })

    const dayList = new ListContainerProperty({
      containerID: 2,
      containerName: 'garbage-days',
      itemContainer: new ListItemContainerProperty({
        itemCount: WEEKDAYS.length,
        itemWidth: 76,
        isItemSelectBorderEn: 1,
        itemName: WEEKDAYS.map((day) => `${day}曜日`),
      }),
      isEventCapture: 1,
      xPosition: 8,
      yPosition: 148,
      width: 560,
      height: 118,
    })

    return {
      containerTotalNum: 3,
      textObject: [titleText, nextText],
      listObject: [dayList],
    }
  }

  async function renderPage(): Promise<void> {
    if (!bridge) {
      publishPreview()
      return
    }

    const payload = buildPagePayload()
    if (!startupRendered) {
      await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(payload))
      startupRendered = true
      return
    }

    await bridge.rebuildPageContainer(new RebuildPageContainer(payload))
  }

  async function handleHubEvent(event: EvenHubEvent): Promise<void> {
    if (!bridge) return

    const eventType = normalizeEventType(getRawEventType(event), OsEventTypeList)
    if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      options.onLog('G2: 終了操作を受け付けました')
      await bridge.shutDownPageContainer(1)
      return
    }

    const incomingIndex = getIncomingDayIndex(event)
    const previousIndex = selectedDayIndex

    if (incomingIndex !== null) {
      selectedDayIndex = incomingIndex
    } else if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      selectedDayIndex = clampDayIndex(selectedDayIndex - 1)
    } else if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      selectedDayIndex = clampDayIndex(selectedDayIndex + 1)
    }

    if (selectedDayIndex === previousIndex) return

    options.onLog(`G2: ${WEEKDAYS[selectedDayIndex]}曜日を表示`)
    await renderPage()
  }

  function registerEventLoop(nextBridge: EvenAppBridge): void {
    if (eventLoopRegistered) return

    nextBridge.onEvenHubEvent((event) => {
      void handleHubEvent(event).catch((error) => {
        console.error('[garbage-cue] event handling failed', error)
        options.onLog(`G2イベント処理エラー: ${String(error)}`)
      })
    })

    eventLoopRegistered = true
  }

  return {
    async connect() {
      options.onPhase('connecting')
      options.onStatus('Even G2に接続しています…')
      options.onLog('接続を開始しました')

      try {
        const nextBridge = await withTimeout(waitForEvenAppBridge(), 6000)
        const isNewBridge = bridge !== nextBridge
        bridge = nextBridge

        if (isNewBridge) {
          startupRendered = false
          eventLoopRegistered = false
        }

        registerEventLoop(nextBridge)
        await renderPage()
        options.onPhase('connected')
        options.onStatus('接続済み。G2で上下スワイプして曜日を確認できます。')
        options.onLog('Even G2に接続しました')
      } catch (error) {
        bridge = null
        startupRendered = false
        eventLoopRegistered = false
        options.onPhase('mock')
        options.onStatus('G2未接続のため、ブラウザプレビューで動作しています。')
        options.onLog(`G2未接続: ${String(error)}`)
        publishPreview()
      }
    },

    async sync() {
      try {
        publishPreview()
        if (bridge) {
          await renderPage()
          options.onStatus('設定をG2に反映しました。')
        }
      } catch (error) {
        options.onPhase('error')
        options.onStatus('G2への反映に失敗しました。')
        options.onLog(`反映エラー: ${String(error)}`)
      }
    },

    async selectDay(dayIndex: number) {
      selectedDayIndex = clampDayIndex(dayIndex)
      options.onLog(`表示曜日を${WEEKDAYS[selectedDayIndex]}曜日に変更しました`)
      await this.sync()
    },

    getSelectedDay() {
      return selectedDayIndex
    },
  }
}
