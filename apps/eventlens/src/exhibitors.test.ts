import { describe, expect, it } from 'vitest'
import {
  compareBooth,
  createEmptyEventData,
  displayColumns,
  findExhibitor,
  mergeEventData,
  normalizeEventData,
  sortExhibitorsByBooth,
  truncateToColumns,
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

describe('displayColumns', () => {
  it('ASCII文字は1カラムとして数える', () => {
    expect(displayColumns('Hello')).toBe(5)
  })

  it('全角の日本語文字は2カラムとして数える', () => {
    expect(displayColumns('こんにちは')).toBe(10)
  })

  it('ASCIIと日本語が混在する文字列を正しく数える', () => {
    expect(displayColumns('AI研究所')).toBe(8)
  })

  it('空文字は0', () => {
    expect(displayColumns('')).toBe(0)
  })

  it('省略記号（…）は2カラムとして数える', () => {
    expect(displayColumns('…')).toBe(2)
  })
})

describe('truncateToColumns', () => {
  it('予算内に収まる文字列はそのまま返す（同一の値）', () => {
    const text = 'Hello World'
    expect(truncateToColumns(text, 20)).toBe(text)
  })

  it('境界ちょうどの長さは切り詰めない', () => {
    const text = 'ABCDE'
    expect(displayColumns(text)).toBe(5)
    expect(truncateToColumns(text, 5)).toBe(text)
  })

  it('境界を1カラム超えると切り詰められる', () => {
    const result = truncateToColumns('ABCDEF', 5)
    expect(result).toBe('ABC…')
    expect(displayColumns(result)).toBeLessThanOrEqual(5)
  })

  it('ASCIIのみの文字列を切り詰める', () => {
    const result = truncateToColumns('Hello World', 7)
    expect(result).toBe('Hello…')
    expect(displayColumns(result)).toBeLessThanOrEqual(7)
  })

  it('日本語のみの文字列を切り詰める', () => {
    const result = truncateToColumns('こんにちは', 6)
    expect(result).toBe('こん…')
    expect(displayColumns(result)).toBeLessThanOrEqual(6)
  })

  it('ASCIIと日本語が混在する文字列を切り詰める', () => {
    const result = truncateToColumns('AI研究所オフィス', 8)
    expect(displayColumns(result)).toBeLessThanOrEqual(8)
    expect(result.endsWith('…')).toBe(true)
  })

  it('全角文字が境界をまたぐ場合は文字を割らず手前で切る', () => {
    // budget = maxColumns(5) - ellipsis(2) = 3。"AB"で2消費した時点で残り1、
    // 次の全角「字」は2カラム必要なため入らず、割らずに丸ごと除外される。
    const result = truncateToColumns('AB字XY', 5)
    expect(result).toBe('AB…')
    expect(displayColumns(result)).toBeLessThanOrEqual(5)
  })

  it('空文字はそのまま返す', () => {
    expect(truncateToColumns('', 5)).toBe('')
  })

  it('maxColumns が省略記号より小さい場合でも安全に処理する（例: 1）', () => {
    const result = truncateToColumns('こんにちは', 1)
    expect(displayColumns(result)).toBeLessThanOrEqual(1)
  })

  it('maxColumns がちょうど省略記号の幅の場合は省略記号のみを返す（例: 2）', () => {
    const result = truncateToColumns('Hello World', 2)
    expect(result).toBe('…')
    expect(displayColumns(result)).toBeLessThanOrEqual(2)
  })

  it('maxColumns が0以下なら空文字を返す', () => {
    expect(truncateToColumns('Hello', 0)).toBe('')
    expect(truncateToColumns('Hello', -1)).toBe('')
  })
})
