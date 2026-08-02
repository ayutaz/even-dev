export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

export const GARBAGE_TYPES = [
  '燃やすごみ',
  '燃やさないごみ',
  '資源ごみ',
  '容器包装プラ',
  'びん・かん',
  'ペットボトル',
  '古紙',
  '粗大ごみ',
] as const

export type GarbageType = (typeof GARBAGE_TYPES)[number]
export type WeeklySchedule = GarbageType[][]

export type Pickup = {
  date: Date
  dayIndex: number
  items: GarbageType[]
}

const STORAGE_KEY = 'garbage-cue.schedule.v1'

export function createSampleSchedule(): WeeklySchedule {
  return [
    [],
    ['燃やすごみ'],
    [],
    ['資源ごみ'],
    ['燃やすごみ'],
    [],
    [],
  ]
}

function isGarbageType(value: unknown): value is GarbageType {
  return typeof value === 'string' && (GARBAGE_TYPES as readonly string[]).includes(value)
}

export function normalizeSchedule(value: unknown): WeeklySchedule {
  if (!Array.isArray(value)) {
    return createSampleSchedule()
  }

  return Array.from({ length: WEEKDAYS.length }, (_, dayIndex) => {
    const rawItems = value[dayIndex]
    if (!Array.isArray(rawItems)) return []

    return [...new Set(rawItems.filter(isGarbageType))].slice(0, 2)
  })
}

export function cloneSchedule(schedule: WeeklySchedule): WeeklySchedule {
  return schedule.map((items) => [...items])
}

export function loadSchedule(): { schedule: WeeklySchedule; isStored: boolean } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { schedule: createSampleSchedule(), isStored: false }
    }

    return {
      schedule: normalizeSchedule(JSON.parse(raw)),
      isStored: true,
    }
  } catch {
    return { schedule: createSampleSchedule(), isStored: false }
  }
}

export function saveSchedule(schedule: WeeklySchedule): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSchedule(schedule)))
  } catch {
    // Ignore storage failures, such as private mode or disabled storage.
  }
}

export function getDayItems(schedule: WeeklySchedule, dayIndex: number): GarbageType[] {
  const normalizedDay = ((dayIndex % WEEKDAYS.length) + WEEKDAYS.length) % WEEKDAYS.length
  return [...(schedule[normalizedDay] ?? [])]
}

function dateAtNoon(date: Date): Date {
  const result = new Date(date)
  result.setHours(12, 0, 0, 0)
  return result
}

function addDays(date: Date, days: number): Date {
  const result = dateAtNoon(date)
  result.setDate(result.getDate() + days)
  return result
}

export function findNextPickup(
  schedule: WeeklySchedule,
  fromDate = new Date(),
  includeFromDay = true,
  maxDays = 14,
): Pickup | null {
  const firstOffset = includeFromDay ? 0 : 1

  for (let offset = firstOffset; offset <= maxDays; offset += 1) {
    const date = addDays(fromDate, offset)
    const items = getDayItems(schedule, date.getDay())
    if (items.length > 0) {
      return {
        date,
        dayIndex: date.getDay(),
        items,
      }
    }
  }

  return null
}

export function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`
}

export function formatDayLabel(dayIndex: number): string {
  const normalizedDay = ((dayIndex % WEEKDAYS.length) + WEEKDAYS.length) % WEEKDAYS.length
  return `${WEEKDAYS[normalizedDay]}曜日`
}

export function formatItems(items: GarbageType[]): string {
  return items.length > 0 ? items.join(' / ') : '収集なし'
}
