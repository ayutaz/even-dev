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
import { findExhibitor, truncateToColumns, type EventData } from './exhibitors'
import {
  currentItem,
  moveCursor,
  remainingCount,
  toggleVisited,
  type Itinerary,
  type ItineraryItem,
} from './itinerary'

// Device text metrics (apps/restapi/src/restapi-app.ts): ~36.9 columns per
// 544px line, ~24.75-31px per line. Both budgets below stay under that with margin.
const HEADING_NAME_MAX_COLUMNS = 72 // 2 lines x 36 columns (heading is booth + name)
const ITEM_LABEL_MAX_COLUMNS = 36 // single list row, includes the "✓ " mark

export type EventLensPhase = 'idle' | 'connecting' | 'connected' | 'mock' | 'error'

export type GlassPreview = {
  heading: string
  note: string
  footer: string
  itemLabels: string[]
  selectedIndex: number
}

export type EventLensControllerOptions = {
  getItinerary: () => Itinerary
  getEventData: () => EventData
  onItineraryChange: (next: Itinerary) => void
  onPhase: (phase: EventLensPhase) => void
  onStatus: (message: string) => void
  onLog: (message: string) => void
  onPreview: (preview: GlassPreview) => void
}

export type EventLensController = {
  connect: () => Promise<void>
  sync: () => Promise<void>
}

export function buildItemLabel(data: EventData, item: ItineraryItem): string {
  const exhibitor = findExhibitor(data, item.exhibitorId)
  const mark = item.visited ? '✓ ' : ''

  if (!exhibitor) {
    return truncateToColumns(`${mark}（掲載終了）`, ITEM_LABEL_MAX_COLUMNS)
  }

  return truncateToColumns(`${mark}${exhibitor.booth} ${exhibitor.name}`, ITEM_LABEL_MAX_COLUMNS)
}

export function createEventLensController(
  options: EventLensControllerOptions,
): EventLensController {
  let bridge: EvenAppBridge | null = null
  let startupRendered = false
  let unsubscribeEventLoop: (() => void) | null = null

  function buildPreview(): GlassPreview {
    const itinerary = options.getItinerary()
    const data = options.getEventData()
    const item = currentItem(itinerary)

    if (!item) {
      return {
        heading: 'リストが空です',
        note: 'スマホでブースを登録してください',
        footer: '2回タップで終了',
        itemLabels: [],
        selectedIndex: 0,
      }
    }

    const exhibitor = findExhibitor(data, item.exhibitorId)
    const heading = exhibitor
      ? `${exhibitor.booth}\n${truncateToColumns(exhibitor.name, HEADING_NAME_MAX_COLUMNS)}`
      : '（掲載終了）\nこの出展は一覧にありません'

    const position = `${itinerary.cursor + 1}/${itinerary.items.length}`
    const visitedMark = item.visited ? '✓ 訪問済' : '未訪問'
    const footer = `${visitedMark}  残り ${remainingCount(itinerary)} / ${itinerary.items.length}  (${position})\n↑↓送り  タップ=訪問済  2回タップで終了`

    return {
      heading,
      note: item.note.length > 0 ? item.note : '—',
      footer,
      itemLabels: itinerary.items.map((entry) => buildItemLabel(data, entry)),
      selectedIndex: itinerary.cursor,
    }
  }

  function publishPreview(): GlassPreview {
    const preview = buildPreview()
    options.onPreview(preview)
    return preview
  }

  function buildPagePayload() {
    const preview = publishPreview()

    const headingText = new TextContainerProperty({
      containerID: 1,
      containerName: 'eventlens-heading',
      content: preview.heading,
      xPosition: 8,
      yPosition: 4,
      width: 544,
      height: 100,
      isEventCapture: 0,
    })

    const noteText = new TextContainerProperty({
      containerID: 2,
      containerName: 'eventlens-note',
      content: preview.note,
      xPosition: 8,
      yPosition: 108,
      width: 544,
      height: 40,
      isEventCapture: 0,
    })

    const footerText = new TextContainerProperty({
      containerID: 3,
      containerName: 'eventlens-footer',
      content: preview.footer,
      xPosition: 8,
      yPosition: 152,
      width: 544,
      height: 40,
      isEventCapture: 0,
    })

    const itemList = new ListContainerProperty({
      containerID: 4,
      containerName: 'eventlens-items',
      itemContainer: new ListItemContainerProperty({
        itemCount: Math.max(1, preview.itemLabels.length),
        itemWidth: 544,
        isItemSelectBorderEn: 1,
        itemName: preview.itemLabels.length > 0 ? preview.itemLabels : ['（未登録）'],
      }),
      isEventCapture: 1,
      xPosition: 8,
      yPosition: 196,
      width: 544,
      height: 70,
    })

    return {
      containerTotalNum: 4,
      textObject: [headingText, noteText, footerText],
      listObject: [itemList],
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
    const itinerary = options.getItinerary()

    if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      options.onLog('G2: 終了操作を受け付けました')
      await bridge.shutDownPageContainer(1)
      return
    }

    if (itinerary.items.length === 0) return

    if (eventType === OsEventTypeList.CLICK_EVENT) {
      const next = toggleVisited(itinerary, itinerary.cursor)
      const item = next.items[next.cursor]
      options.onLog(item?.visited ? 'G2: 訪問済にしました' : 'G2: 訪問済を解除しました')
      options.onItineraryChange(next)
      await renderPage()
      return
    }

    let next = itinerary

    if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      next = moveCursor(itinerary, -1)
    } else if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      next = moveCursor(itinerary, 1)
    }

    if (next.cursor === itinerary.cursor) return

    options.onLog(`G2: ${next.cursor + 1}件目を表示`)
    options.onItineraryChange(next)
    await renderPage()
  }

  function registerEventLoop(nextBridge: EvenAppBridge): void {
    if (unsubscribeEventLoop) {
      unsubscribeEventLoop()
      unsubscribeEventLoop = null
    }

    unsubscribeEventLoop = nextBridge.onEvenHubEvent((event) => {
      void handleHubEvent(event).catch((error) => {
        console.error('[eventlens] event handling failed', error)
        options.onLog(`G2イベント処理エラー: ${String(error)}`)
      })
    })
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
        }

        registerEventLoop(nextBridge)
        await renderPage()
        options.onPhase('connected')
        options.onStatus('接続済み。G2で上下スワイプして巡回できます。')
        options.onLog('Even G2に接続しました')
      } catch (error) {
        bridge = null
        startupRendered = false
        if (unsubscribeEventLoop) {
          unsubscribeEventLoop()
          unsubscribeEventLoop = null
        }
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
          options.onStatus('リストをG2に反映しました。')
        }
      } catch (error) {
        options.onPhase('error')
        options.onStatus('G2への反映に失敗しました。')
        options.onLog(`反映エラー: ${String(error)}`)
      }
    },
  }
}
