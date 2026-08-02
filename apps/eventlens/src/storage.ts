import { normalizeEventData, type EventData } from './exhibitors'
import { createEmptyItinerary, type Itinerary, type ItineraryItem } from './itinerary'

export type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

const ITINERARY_KEY_PREFIX = 'eventlens.itinerary.v1.'
const EVENT_DATA_KEY = 'eventlens.eventData.v1'

function normalizeItem(value: unknown): ItineraryItem | null {
  if (typeof value !== 'object' || value === null) return null

  const raw = value as Record<string, unknown>
  if (typeof raw.exhibitorId !== 'string' || raw.exhibitorId.trim().length === 0) return null

  return {
    exhibitorId: raw.exhibitorId.trim(),
    note: typeof raw.note === 'string' ? raw.note : '',
    visited: raw.visited === true,
  }
}

export function normalizeItinerary(value: unknown): Itinerary {
  if (typeof value !== 'object' || value === null) return createEmptyItinerary()

  const raw = value as Record<string, unknown>
  if (!Array.isArray(raw.items)) return createEmptyItinerary()

  const items = raw.items
    .map(normalizeItem)
    .filter((item): item is ItineraryItem => item !== null)

  if (items.length === 0) return createEmptyItinerary()

  const rawCursor = typeof raw.cursor === 'number' && Number.isFinite(raw.cursor)
    ? Math.trunc(raw.cursor)
    : 0
  const cursor = ((rawCursor % items.length) + items.length) % items.length

  return { items, cursor }
}

export function loadItinerary(storage: StorageLike, eventId: string): Itinerary {
  try {
    const raw = storage.getItem(ITINERARY_KEY_PREFIX + eventId)
    if (!raw) return createEmptyItinerary()
    return normalizeItinerary(JSON.parse(raw))
  } catch {
    return createEmptyItinerary()
  }
}

export function saveItinerary(storage: StorageLike, eventId: string, itinerary: Itinerary): void {
  try {
    storage.setItem(ITINERARY_KEY_PREFIX + eventId, JSON.stringify(itinerary))
  } catch {
    // Ignore storage failures, such as private mode or a disabled store.
  }
}

export function loadCachedEventData(storage: StorageLike): EventData | null {
  try {
    const raw = storage.getItem(EVENT_DATA_KEY)
    if (!raw) return null
    return normalizeEventData(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveCachedEventData(storage: StorageLike, data: EventData): void {
  try {
    storage.setItem(EVENT_DATA_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage failures, such as private mode or a disabled store.
  }
}
