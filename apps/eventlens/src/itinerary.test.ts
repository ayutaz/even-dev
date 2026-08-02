import { describe, expect, it } from 'vitest'
import type { EventData } from './exhibitors'
import {
  addItem,
  createEmptyItinerary,
  currentItem,
  hasItem,
  moveCursor,
  remainingCount,
  removeItem,
  setCursor,
  setNote,
  sortByBooth,
  toggleVisited,
  type Itinerary,
} from './itinerary'

const eventData: EventData = {
  eventId: 'genai-expo-vol6',
  eventName: '生成AIなんでも展示会 Vol.6',
  eventDate: '2026-09-23',
  version: 1,
  exhibitors: [
    { id: 'e1', booth: 'B-12', name: 'ずんだもん研究所' },
    { id: 'e2', booth: 'B-2', name: 'AIイラスト工房' },
    { id: 'e3', booth: 'A-5', name: 'LLMエージェント研究会' },
  ],
}

function threeItems(): Itinerary {
  let itinerary = createEmptyItinerary()
  itinerary = addItem(itinerary, 'e1', '音声合成デモを触る')
  itinerary = addItem(itinerary, 'e2')
  itinerary = addItem(itinerary, 'e3')
  return itinerary
}

describe('createEmptyItinerary', () => {
  it('空のリストとカーソル 0 を返す', () => {
    expect(createEmptyItinerary()).toEqual({ items: [], cursor: 0 })
  })
})

describe('addItem', () => {
  it('末尾に追加する', () => {
    const itinerary = addItem(createEmptyItinerary(), 'e1', 'メモ')
    expect(itinerary.items).toEqual([{ exhibitorId: 'e1', note: 'メモ', visited: false }])
  })

  it('メモを省略すると空文字になる', () => {
    expect(addItem(createEmptyItinerary(), 'e1').items[0]?.note).toBe('')
  })

  it('同じ出展者を二重に追加しない', () => {
    const once = addItem(createEmptyItinerary(), 'e1')
    const twice = addItem(once, 'e1')
    expect(twice.items).toHaveLength(1)
    expect(twice).toBe(once)
  })

  it('元のオブジェクトを変更しない', () => {
    const before = createEmptyItinerary()
    addItem(before, 'e1')
    expect(before.items).toHaveLength(0)
  })
})

describe('removeItem', () => {
  it('指定した出展者を取り除く', () => {
    const itinerary = removeItem(threeItems(), 'e2')
    expect(itinerary.items.map((item) => item.exhibitorId)).toEqual(['e1', 'e3'])
  })

  it('カーソルより前を削除するとカーソルが 1 つ手前に寄る', () => {
    const itinerary = setCursor(threeItems(), 2)
    const removed = removeItem(itinerary, 'e1')
    expect(removed.cursor).toBe(1)
    expect(currentItem(removed)?.exhibitorId).toBe('e3')
  })

  it('最後の 1 件を削除するとカーソルが 0 に戻る', () => {
    let itinerary = addItem(createEmptyItinerary(), 'e1')
    itinerary = removeItem(itinerary, 'e1')
    expect(itinerary).toEqual({ items: [], cursor: 0 })
  })

  it('存在しない出展者では変化しない', () => {
    const itinerary = threeItems()
    expect(removeItem(itinerary, 'missing')).toBe(itinerary)
  })
})

describe('setNote', () => {
  it('メモを差し替える', () => {
    const itinerary = setNote(threeItems(), 'e2', 'ポスターを見る')
    expect(itinerary.items[1]?.note).toBe('ポスターを見る')
  })

  it('存在しない出展者では変化しない', () => {
    const itinerary = threeItems()
    expect(setNote(itinerary, 'missing', 'x')).toBe(itinerary)
  })
})

describe('toggleVisited', () => {
  it('訪問済みを立てて、もう一度呼ぶと解除する', () => {
    const visited = toggleVisited(threeItems(), 0)
    expect(visited.items[0]?.visited).toBe(true)
    expect(toggleVisited(visited, 0).items[0]?.visited).toBe(false)
  })

  it('範囲外の添字では変化しない', () => {
    const itinerary = threeItems()
    expect(toggleVisited(itinerary, -1)).toBe(itinerary)
    expect(toggleVisited(itinerary, 3)).toBe(itinerary)
  })

  it('カーソルを動かさない', () => {
    const itinerary = setCursor(threeItems(), 1)
    expect(toggleVisited(itinerary, 1).cursor).toBe(1)
  })
})

describe('moveCursor', () => {
  it('末尾の次は先頭に折り返す', () => {
    const itinerary = setCursor(threeItems(), 2)
    expect(moveCursor(itinerary, 1).cursor).toBe(0)
  })

  it('先頭の前は末尾に折り返す', () => {
    expect(moveCursor(threeItems(), -1).cursor).toBe(2)
  })

  it('空のリストでは変化しない', () => {
    const empty = createEmptyItinerary()
    expect(moveCursor(empty, 1)).toBe(empty)
  })
})

describe('remainingCount', () => {
  it('未訪問の件数を返す', () => {
    expect(remainingCount(threeItems())).toBe(3)
    expect(remainingCount(toggleVisited(threeItems(), 0))).toBe(2)
  })
})

describe('currentItem', () => {
  it('カーソル位置の項目を返す', () => {
    expect(currentItem(setCursor(threeItems(), 1))?.exhibitorId).toBe('e2')
  })

  it('空のリストでは null を返す', () => {
    expect(currentItem(createEmptyItinerary())).toBeNull()
  })
})

describe('hasItem', () => {
  it('登録済みかどうかを返す', () => {
    expect(hasItem(threeItems(), 'e1')).toBe(true)
    expect(hasItem(threeItems(), 'missing')).toBe(false)
  })
})

describe('sortByBooth', () => {
  it('ブース番号の自然順に並べ替える', () => {
    const sorted = sortByBooth(threeItems(), eventData)
    expect(sorted.items.map((item) => item.exhibitorId)).toEqual(['e3', 'e2', 'e1'])
  })

  it('並べ替えてもカーソルが同じ項目を指し続ける', () => {
    const itinerary = setCursor(threeItems(), 0)
    const sorted = sortByBooth(itinerary, eventData)
    expect(currentItem(sorted)?.exhibitorId).toBe('e1')
    expect(sorted.cursor).toBe(2)
  })

  it('出展者データに無い項目は末尾に置く', () => {
    let itinerary = threeItems()
    itinerary = addItem(itinerary, 'unknown')
    const sorted = sortByBooth(itinerary, eventData)
    expect(sorted.items[3]?.exhibitorId).toBe('unknown')
  })
})
