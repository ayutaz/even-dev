import { describe, expect, it } from 'vitest'
import type { EventData } from './exhibitors'
import { addItem, createEmptyItinerary, setCursor } from './itinerary'
import {
  loadCachedEventData,
  loadItinerary,
  normalizeItinerary,
  saveCachedEventData,
  saveItinerary,
  type StorageLike,
} from './storage'

function createFakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const storage: StorageLike = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
  return { storage, map }
}

function createThrowingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error('storage unavailable')
    },
    setItem: () => {
      throw new Error('storage unavailable')
    },
  }
}

const eventData: EventData = {
  eventId: 'genai-expo-vol6',
  eventName: '生成AIなんでも展示会 Vol.6',
  eventDate: '2026-09-23',
  version: 2,
  exhibitors: [{ id: 'e1', booth: 'B-12', name: 'ずんだもん研究所' }],
}

describe('normalizeItinerary', () => {
  it('正常な値を受け入れる', () => {
    const result = normalizeItinerary({
      items: [{ exhibitorId: 'e1', note: 'メモ', visited: true }],
      cursor: 0,
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.visited).toBe(true)
  })

  it('壊れた値では空のリストを返す', () => {
    expect(normalizeItinerary(null)).toEqual({ items: [], cursor: 0 })
    expect(normalizeItinerary('壊れた')).toEqual({ items: [], cursor: 0 })
    expect(normalizeItinerary({ items: 'not-array' })).toEqual({ items: [], cursor: 0 })
  })

  it('不正な項目を捨てる', () => {
    const result = normalizeItinerary({
      items: [
        { exhibitorId: 'ok', note: '', visited: false },
        { exhibitorId: '', note: '', visited: false },
        { note: 'ID無し' },
        'not-an-object',
      ],
      cursor: 0,
    })
    expect(result.items).toHaveLength(1)
  })

  it('欠けた note と visited を補う', () => {
    const result = normalizeItinerary({ items: [{ exhibitorId: 'e1' }], cursor: 0 })
    expect(result.items[0]).toEqual({ exhibitorId: 'e1', note: '', visited: false })
  })

  it('範囲外のカーソルを丸める', () => {
    const result = normalizeItinerary({
      items: [{ exhibitorId: 'e1', note: '', visited: false }],
      cursor: 99,
    })
    expect(result.cursor).toBe(0)
  })
})

describe('loadItinerary / saveItinerary', () => {
  it('保存した内容を読み戻せる', () => {
    const { storage } = createFakeStorage()
    const itinerary = setCursor(addItem(addItem(createEmptyItinerary(), 'e1', 'メモ'), 'e2'), 1)

    saveItinerary(storage, 'genai-expo-vol6', itinerary)
    expect(loadItinerary(storage, 'genai-expo-vol6')).toEqual(itinerary)
  })

  it('イベントごとに別々に保存する', () => {
    const { storage } = createFakeStorage()

    saveItinerary(storage, 'event-a', addItem(createEmptyItinerary(), 'e1'))
    saveItinerary(storage, 'event-b', addItem(createEmptyItinerary(), 'e2'))

    expect(loadItinerary(storage, 'event-a').items[0]?.exhibitorId).toBe('e1')
    expect(loadItinerary(storage, 'event-b').items[0]?.exhibitorId).toBe('e2')
  })

  it('保存が無ければ空のリストを返す', () => {
    const { storage } = createFakeStorage()
    expect(loadItinerary(storage, 'genai-expo-vol6')).toEqual({ items: [], cursor: 0 })
  })

  it('壊れた JSON では空のリストを返す', () => {
    const { storage } = createFakeStorage({
      'eventlens.itinerary.v1.genai-expo-vol6': '{壊れたJSON',
    })
    expect(loadItinerary(storage, 'genai-expo-vol6')).toEqual({ items: [], cursor: 0 })
  })

  it('storage が例外を投げても落ちない', () => {
    const storage = createThrowingStorage()
    expect(loadItinerary(storage, 'x')).toEqual({ items: [], cursor: 0 })
    expect(() => saveItinerary(storage, 'x', createEmptyItinerary())).not.toThrow()
  })
})

describe('loadCachedEventData / saveCachedEventData', () => {
  it('保存した出展者データを読み戻せる', () => {
    const { storage } = createFakeStorage()
    saveCachedEventData(storage, eventData)
    expect(loadCachedEventData(storage)).toEqual(eventData)
  })

  it('保存が無ければ null を返す', () => {
    const { storage } = createFakeStorage()
    expect(loadCachedEventData(storage)).toBeNull()
  })

  it('壊れた JSON では null を返す', () => {
    const { storage } = createFakeStorage({ 'eventlens.eventData.v1': 'not json' })
    expect(loadCachedEventData(storage)).toBeNull()
  })

  it('storage が例外を投げても落ちない', () => {
    const storage = createThrowingStorage()
    expect(loadCachedEventData(storage)).toBeNull()
    expect(() => saveCachedEventData(storage, eventData)).not.toThrow()
  })
})
