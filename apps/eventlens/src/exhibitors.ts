export type Exhibitor = {
  id: string
  booth: string
  name: string
  genre?: string
}

export type EventData = {
  eventId: string
  eventName: string
  eventDate: string
  version: number
  exhibitors: Exhibitor[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function createEmptyEventData(): EventData {
  return {
    eventId: '',
    eventName: '',
    eventDate: '',
    version: 0,
    exhibitors: [],
  }
}

function normalizeExhibitor(value: unknown): Exhibitor | null {
  if (typeof value !== 'object' || value === null) return null

  const raw = value as Record<string, unknown>
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.booth) || !isNonEmptyString(raw.name)) {
    return null
  }

  const exhibitor: Exhibitor = {
    id: raw.id.trim(),
    booth: raw.booth.trim(),
    name: raw.name.trim(),
  }

  if (isNonEmptyString(raw.genre)) {
    exhibitor.genre = raw.genre.trim()
  }

  return exhibitor
}

export function normalizeEventData(value: unknown): EventData | null {
  if (typeof value !== 'object' || value === null) return null

  const raw = value as Record<string, unknown>
  if (!isNonEmptyString(raw.eventId) || !isNonEmptyString(raw.eventName)) return null

  const seen = new Set<string>()
  const exhibitors = Array.isArray(raw.exhibitors)
    ? raw.exhibitors
        .map(normalizeExhibitor)
        .filter((exhibitor): exhibitor is Exhibitor => exhibitor !== null)
        .filter((exhibitor) => {
          if (seen.has(exhibitor.id)) return false
          seen.add(exhibitor.id)
          return true
        })
    : []

  return {
    eventId: raw.eventId.trim(),
    eventName: raw.eventName.trim(),
    eventDate: isNonEmptyString(raw.eventDate) ? raw.eventDate.trim() : '',
    version: typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 0,
    exhibitors,
  }
}

type ParsedBooth = {
  prefix: string
  numeric: number
  rest: string
}

function parseBooth(booth: string): ParsedBooth {
  const match = /^(\D*)(\d*)(.*)$/.exec(booth.trim())
  const digits = match?.[2] ?? ''

  return {
    prefix: (match?.[1] ?? '').toUpperCase(),
    numeric: digits.length > 0 ? Number.parseInt(digits, 10) : Number.NaN,
    rest: match?.[3] ?? '',
  }
}

export function compareBooth(a: string, b: string): number {
  const left = parseBooth(a)
  const right = parseBooth(b)

  const leftHasNumber = !Number.isNaN(left.numeric)
  const rightHasNumber = !Number.isNaN(right.numeric)

  // Digit-presence check first: numbered booths come before non-numbered ones
  if (leftHasNumber && !rightHasNumber) return -1
  if (!leftHasNumber && rightHasNumber) return 1

  // Both have numbers or both don't - compare prefixes
  if (left.prefix !== right.prefix) {
    return left.prefix < right.prefix ? -1 : 1
  }

  // Prefixes match
  if (!leftHasNumber && !rightHasNumber) return left.rest.localeCompare(right.rest)
  // Both have numbers (we already know they have the same prefix)
  if (left.numeric !== right.numeric) return left.numeric - right.numeric

  return left.rest.localeCompare(right.rest)
}

export function sortExhibitorsByBooth(exhibitors: Exhibitor[]): Exhibitor[] {
  return [...exhibitors].sort((a, b) => compareBooth(a.booth, b.booth))
}

export function mergeEventData(current: EventData, incoming: EventData | null): EventData {
  if (!incoming) return current
  if (incoming.eventId !== current.eventId) return current
  if (incoming.version <= current.version) return current
  return incoming
}

export function findExhibitor(data: EventData, exhibitorId: string): Exhibitor | null {
  return data.exhibitors.find((exhibitor) => exhibitor.id === exhibitorId) ?? null
}

const ELLIPSIS = '…'

// East Asian Wide / Fullwidth code point ranges (Unicode UAX #11). Characters
// in these ranges render as two columns on the glasses' fixed-width display;
// everything else (ASCII, Latin, most punctuation) renders as one.
const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f], // Hangul Jamo
  [0x2e80, 0x303e], // CJK Radicals Supplement .. CJK Symbols and Punctuation
  [0x3041, 0x33ff], // Hiragana .. CJK Compatibility
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xa000, 0xa4cf], // Yi Syllables
  [0xac00, 0xd7a3], // Hangul Syllables
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0xfe30, 0xfe4f], // CJK Compatibility Forms
  [0xff00, 0xff60], // Fullwidth Forms
  [0xffe0, 0xffe6], // Fullwidth Signs
  [0x20000, 0x2fffd], // CJK Unified Ideographs Extension B and beyond
  [0x30000, 0x3fffd],
]

function isWideCodePoint(codePoint: number): boolean {
  // U+2026 (horizontal ellipsis, …) sits outside the CJK blocks above but
  // renders fullwidth in this app's Japanese UI, so it is special-cased.
  if (codePoint === 0x2026) return true
  return WIDE_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end)
}

export function displayColumns(text: string): number {
  let columns = 0
  for (const char of text) {
    columns += isWideCodePoint(char.codePointAt(0) ?? 0) ? 2 : 1
  }
  return columns
}

const ELLIPSIS_COLUMNS = displayColumns(ELLIPSIS)

export function truncateToColumns(text: string, maxColumns: number): string {
  if (displayColumns(text) <= maxColumns) return text
  if (maxColumns <= 0) return ''

  const hasRoomForEllipsis = maxColumns >= ELLIPSIS_COLUMNS
  const budget = hasRoomForEllipsis ? maxColumns - ELLIPSIS_COLUMNS : maxColumns

  let result = ''
  let used = 0

  for (const char of text) {
    const width = displayColumns(char)
    if (used + width > budget) break
    result += char
    used += width
  }

  return hasRoomForEllipsis ? result + ELLIPSIS : result
}
