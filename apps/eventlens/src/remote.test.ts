import { describe, expect, it, vi } from 'vitest'
import { fetchEventData, type FetchLike } from './remote'

const validPayload = {
  eventId: 'genai-expo-vol6',
  eventName: '生成AIなんでも展示会 Vol.6',
  eventDate: '2026-09-23',
  version: 3,
  exhibitors: [{ id: 'e1', booth: 'B-12', name: 'ずんだもん研究所' }],
}

function okResponse(payload: unknown): FetchLike {
  return async () => ({ ok: true, json: async () => payload })
}

describe('fetchEventData', () => {
  it('正常なデータを正規化して返す', async () => {
    const result = await fetchEventData('/exhibitors.json', { fetchImpl: okResponse(validPayload) })
    expect(result?.version).toBe(3)
    expect(result?.exhibitors).toHaveLength(1)
  })

  it('HTTP エラーでは null を返す', async () => {
    const fetchImpl: FetchLike = async () => ({ ok: false, json: async () => ({}) })
    expect(await fetchEventData('/exhibitors.json', { fetchImpl })).toBeNull()
  })

  it('ネットワーク例外では null を返し、例外を投げない', async () => {
    const fetchImpl: FetchLike = async () => {
      throw new Error('network down')
    }
    await expect(fetchEventData('/exhibitors.json', { fetchImpl })).resolves.toBeNull()
  })

  it('壊れた JSON では null を返す', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      json: async () => {
        throw new Error('invalid json')
      },
    })
    expect(await fetchEventData('/exhibitors.json', { fetchImpl })).toBeNull()
  })

  it('形の合わないデータでは null を返す', async () => {
    const result = await fetchEventData('/exhibitors.json', {
      fetchImpl: okResponse({ nothing: 'useful' }),
    })
    expect(result).toBeNull()
  })

  it('タイムアウトすると null を返す', async () => {
    vi.useFakeTimers()
    const fetchImpl: FetchLike = () => new Promise(() => {})

    const promise = fetchEventData('/exhibitors.json', { fetchImpl, timeoutMs: 3000 })
    await vi.advanceTimersByTimeAsync(3100)

    await expect(promise).resolves.toBeNull()
    vi.useRealTimers()
  })
})
