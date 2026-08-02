import { normalizeEventData, type EventData } from './exhibitors'

export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

export type FetchEventDataOptions = {
  fetchImpl?: FetchLike
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 5000

export async function fetchEventData(
  url: string,
  options: FetchEventDataOptions = {},
): Promise<EventData | null> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike | undefined)
  if (!fetchImpl) return null

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve(null)
    }, timeoutMs)
  })

  const request = (async (): Promise<EventData | null> => {
    try {
      const response = await fetchImpl(url, { signal: controller.signal })
      if (!response.ok) return null
      return normalizeEventData(await response.json())
    } catch {
      return null
    }
  })()

  try {
    return await Promise.race([request, timeout])
  } finally {
    clearTimeout(timer)
  }
}
