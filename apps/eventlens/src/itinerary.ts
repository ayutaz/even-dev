import { compareBooth, findExhibitor, type EventData } from './exhibitors'

export type ItineraryItem = {
  exhibitorId: string
  note: string
  visited: boolean
}

export type Itinerary = {
  items: ItineraryItem[]
  cursor: number
}

export function createEmptyItinerary(): Itinerary {
  return { items: [], cursor: 0 }
}

function clampCursor(items: ItineraryItem[], cursor: number): number {
  if (items.length === 0) return 0
  const length = items.length
  return ((Math.trunc(cursor) % length) + length) % length
}

export function hasItem(itinerary: Itinerary, exhibitorId: string): boolean {
  return itinerary.items.some((item) => item.exhibitorId === exhibitorId)
}

export function addItem(itinerary: Itinerary, exhibitorId: string, note = ''): Itinerary {
  if (hasItem(itinerary, exhibitorId)) return itinerary

  const items = [...itinerary.items, { exhibitorId, note, visited: false }]
  return { items, cursor: clampCursor(items, itinerary.cursor) }
}

export function removeItem(itinerary: Itinerary, exhibitorId: string): Itinerary {
  const index = itinerary.items.findIndex((item) => item.exhibitorId === exhibitorId)
  if (index < 0) return itinerary

  const items = itinerary.items.filter((item) => item.exhibitorId !== exhibitorId)
  const shifted = itinerary.cursor > index ? itinerary.cursor - 1 : itinerary.cursor
  return { items, cursor: clampCursor(items, shifted) }
}

export function setNote(itinerary: Itinerary, exhibitorId: string, note: string): Itinerary {
  if (!hasItem(itinerary, exhibitorId)) return itinerary

  const items = itinerary.items.map((item) =>
    item.exhibitorId === exhibitorId ? { ...item, note } : item,
  )
  return { ...itinerary, items }
}

export function toggleVisited(itinerary: Itinerary, index: number): Itinerary {
  if (index < 0 || index >= itinerary.items.length) return itinerary

  const items = itinerary.items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, visited: !item.visited } : item,
  )
  return { ...itinerary, items }
}

export function moveCursor(itinerary: Itinerary, delta: number): Itinerary {
  if (itinerary.items.length === 0) return itinerary
  return { ...itinerary, cursor: clampCursor(itinerary.items, itinerary.cursor + delta) }
}

export function setCursor(itinerary: Itinerary, index: number): Itinerary {
  return { ...itinerary, cursor: clampCursor(itinerary.items, index) }
}

export function currentItem(itinerary: Itinerary): ItineraryItem | null {
  return itinerary.items[itinerary.cursor] ?? null
}

export function remainingCount(itinerary: Itinerary): number {
  return itinerary.items.filter((item) => !item.visited).length
}

export function sortByBooth(itinerary: Itinerary, data: EventData): Itinerary {
  const focused = currentItem(itinerary)

  const items = [...itinerary.items].sort((a, b) => {
    const left = findExhibitor(data, a.exhibitorId)
    const right = findExhibitor(data, b.exhibitorId)

    if (!left && !right) return 0
    if (!left) return 1
    if (!right) return -1

    return compareBooth(left.booth, right.booth)
  })

  const cursor = focused
    ? Math.max(0, items.findIndex((item) => item.exhibitorId === focused.exhibitorId))
    : 0

  return { items, cursor }
}
