import { describe, expect, it } from 'vitest'
import {
  compareBooth,
  createEmptyEventData,
  findExhibitor,
  mergeEventData,
  normalizeEventData,
  sortExhibitorsByBooth,
  type EventData,
} from './exhibitors'

function sampleData(overrides: Partial<EventData> = {}): EventData {
  return {
    eventId: 'genai-expo-vol6',
    eventName: '生成AIなんでも展示会 Vol.6',
    eventDate: '2026-09-23',
    version: 1,
    exhibitors: [
      { id: 'e1', booth: 'B-12', name: 'ずんだもん研究所' },
      { id: 'e2', booth: 'B-2', name: 'AIイラスト工房' },
    ],
    ...overrides,
  }
}

describe('normalizeEventData', () => {
  it('正常なデータをそのまま受け入れる', () => {
    const result = normalizeEventData(sampleData())
    expect(result?.eventId).toBe('genai-expo-vol6')
    expect(result?.exhibitors).toHaveLength(2)
  })

  it('オブジェクトでない値には null を返す', () => {
    expect(normalizeEventData(null)).toBeNull()
    expect(normalizeEventData('文字列')).toBeNull()
    expect(normalizeEventData(42)).toBeNull()
  })

  it('eventId が無いデータには null を返す', () => {
    expect(normalizeEventData({ eventName: 'x', exhibitors: [] })).toBeNull()
  })

  it('必須項目が欠けた出展者を捨てる', () => {
    const result = normalizeEventData({
      eventId: 'e',
      eventName: 'イベント',
      version: 1,
      exhibitors: [
        { id: 'ok', booth: 'A-1', name: '有効' },
        { id: '', booth: 'A-2', name: 'ID無し' },
        { id: 'x', name: 'ブース無し' },
        { id: 'y', booth: 'A-3' },
        'not-an-object',
      ],
    })
    expect(result?.exhibitors).toHaveLength(1)
    expect(result?.exhibitors[0]?.id).toBe('ok')
  })

  it('重複した id を最初の 1 件だけ残す', () => {
    const result = normalizeEventData({
      eventId: 'e',
      eventName: 'イベント',
      version: 1,
      exhibitors: [
        { id: 'dup', booth: 'A-1', name: '先' },
        { id: 'dup', booth: 'A-2', name: '後' },
      ],
    })
    expect(result?.exhibitors).toHaveLength(1)
    expect(result?.exhibitors[0]?.name).toBe('先')
  })

  it('version が数値でなければ 0 として扱う', () => {
    const result = normalizeEventData({
      eventId: 'e',
      eventName: 'イベント',
      version: '3',
      exhibitors: [],
    })
    expect(result?.version).toBe(0)
  })

  it('exhibitors が配列でなければ空配列にする', () => {
    const result = normalizeEventData({ eventId: 'e', eventName: 'イベント', exhibitors: null })
    expect(result?.exhibitors).toEqual([])
  })
})

describe('compareBooth', () => {
  it('同じ接頭辞では数値の大小で比較する（辞書順ではない）', () => {
    expect(compareBooth('B-2', 'B-12')).toBeLessThan(0)
    expect(compareBooth('B-12', 'B-2')).toBeGreaterThan(0)
  })

  it('接頭辞が違えば接頭辞で比較する', () => {
    expect(compareBooth('A-1', 'B-1')).toBeLessThan(0)
  })

  it('同じ値では 0 を返す', () => {
    expect(compareBooth('C-7', 'C-7')).toBe(0)
  })

  it('数字を含まないブース名は数字を含むものより後ろに置く', () => {
    expect(compareBooth('特設', 'A-1')).toBeGreaterThan(0)
  })

  it('接頭辞が異なっても数字有無が優先される（AA vs Z-1）', () => {
    expect(compareBooth('AA', 'Z-1')).toBeGreaterThan(0)
    expect(compareBooth('Z-1', 'AA')).toBeLessThan(0)
  })

  it('空文字は数字を含むものより後ろに置く', () => {
    expect(compareBooth('', 'A-1')).toBeGreaterThan(0)
  })

  it('数字を含まないラベル同士は接頭辞で比較する', () => {
    const result = compareBooth('特設', 'ラウンジ')
    expect(result).toBeGreaterThan(0)
  })
})

describe('sortExhibitorsByBooth', () => {
  it('ブース番号の自然順に並べ替え、元の配列を変更しない', () => {
    const input = sampleData().exhibitors
    const sorted = sortExhibitorsByBooth(input)
    expect(sorted.map((e) => e.booth)).toEqual(['B-2', 'B-12'])
    expect(input.map((e) => e.booth)).toEqual(['B-12', 'B-2'])
  })
})

describe('mergeEventData', () => {
  it('新しい version のデータを採用する', () => {
    const current = sampleData({ version: 1 })
    const incoming = sampleData({ version: 2, eventName: '更新後' })
    expect(mergeEventData(current, incoming).eventName).toBe('更新後')
  })

  it('同じか古い version は無視する', () => {
    const current = sampleData({ version: 2 })
    expect(mergeEventData(current, sampleData({ version: 2, eventName: '同版' })).eventName)
      .toBe('生成AIなんでも展示会 Vol.6')
    expect(mergeEventData(current, sampleData({ version: 1, eventName: '旧版' })).eventName)
      .toBe('生成AIなんでも展示会 Vol.6')
  })

  it('incoming が null なら現在の値を返す', () => {
    const current = sampleData()
    expect(mergeEventData(current, null)).toBe(current)
  })

  it('eventId が違うデータは無視する', () => {
    const current = sampleData({ version: 1 })
    const other = sampleData({ eventId: 'other-event', version: 99, eventName: '別イベント' })
    expect(mergeEventData(current, other).eventName).toBe('生成AIなんでも展示会 Vol.6')
  })
})

describe('findExhibitor', () => {
  it('id で出展者を引ける', () => {
    expect(findExhibitor(sampleData(), 'e2')?.name).toBe('AIイラスト工房')
  })

  it('存在しない id には null を返す', () => {
    expect(findExhibitor(sampleData(), 'missing')).toBeNull()
  })
})

describe('createEmptyEventData', () => {
  it('出展者が空のデータを返す', () => {
    const empty = createEmptyEventData()
    expect(empty.exhibitors).toEqual([])
    expect(empty.version).toBe(0)
  })
})
