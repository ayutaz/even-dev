# EventLens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 展示会の巡回リストを事前に登録し、会場では Even G2 に「次に行くブース・見たいもの・残り件数」だけを表示する、完全オフラインで動くアプリを作る。

**Architecture:** `apps/garbage_cue` と同じ 3 層構成（スマートフォン UI / G2 コントローラ / 純粋ロジック）を踏襲する。純粋ロジックを `exhibitors` `itinerary` `storage` `remote` の 4 モジュールに分け、Vitest で検証する。G2 コントローラと DOM は Even Hub Simulator で検証する。状態の単一の真実源は `main.ts` が持つ `Itinerary` オブジェクトであり、G2 側の操作はコールバックで UI 側へ戻す。

**Tech Stack:** TypeScript 5.9 / Vite 7 / Vitest 3 / `@evenrealities/even_hub_sdk` / Even Hub Simulator（`start-even.sh` 経由）

設計: [docs/superpowers/specs/2026-08-02-eventlens-design.md](../specs/2026-08-02-eventlens-design.md)

## 実装中に確定した変更（この計画本文との差分）

実装は完了しており、以下の 3 点は**このドキュメント本文のコード例より実際のコードが正しい**。各タスクのコードブロックは当時の指示内容として残してある。

1. **`compareBooth`（Task 2）** — 本文の実装は、接頭辞の比較を数字の有無より先に行うため「数字を含まないブース名を後ろに置く」規則が接頭辞の異なる組で成立しなかった（`compareBooth('AA', 'Z-1')` が負を返す）。実際のコードは数字の有無を先に判定し、回帰テスト 3 件を追加してある。
2. **`tsconfig.json` と `@types/node`（Task 1 のファイル一覧に無かったもの）** — リポジトリに `tsconfig.json` が 1 つも存在せず、検証手順の `npx tsc --noEmit` が対象ファイルを 1 つも拾っていなかった。`apps/eventlens` にのみ追加し、型チェックが実際に機能することを確認済み（意図的な型エラーが検出されることを実証）。`_shared/standalone-vite.ts` が `node:path` / `node:url` を使うため `@types/node` を devDependencies に追加した。
3. **同梱データの配置（Task 7）** — 本文は `public/exhibitors.json` を `fetch` する構成だが、これはシミュレータ経由（`start-even.sh` が使うルートの開発サーバ、ポート 5173）で **404 になる**。ルートの開発サーバは `root` がリポジトリルートであり、`apps/eventlens/public/` を publicDir として扱わないためである。実際のコードは `src/exhibitors-data.json` を `import` しており、`BUNDLED_DATA_URL` と `loadBundledData()` は存在しない。あわせてサンプルデータを架空の 24 件に拡充し、出展者一覧の 50 件表示上限に告知を追加した。

## Global Constraints

- アプリのディレクトリは `apps/eventlens/`。リポジトリ規約どおりに作れば `start-even.sh` が自動検出するため、ランチャー側の変更は一切しない。
- 開発サーバのポートは **5180**（5174 timer / 5175 base_app / 5176 hello_world・restapi / 5177 quicktest / 5178 clock / 5179 garbage_cue が使用済み）。
- UI の表示言語は日本語。
- G2 の描画領域は幅 **560**、高さは **266** まで（`y + height <= 266`）。
- G2 でイベントを受け取るには `ListContainerProperty` に `isEventCapture: 1` が必要。`TextContainerProperty` は `isEventCapture: 0` にする（`apps/timer`・`apps/garbage_cue` と同じ）。
- 外部通信は公開されている出展者データ JSON の GET のみ。ユーザーが作成した巡回リスト・メモ・訪問済み状態を外部に送信しない。通信が失敗しても全機能が動作し続けること。
- 個人情報・マイク・位置情報・外部アカウント・サーバー保存を使わない。
- 保存先は `localStorage` のみ。`storage.ts` の各関数は `StorageLike` を第 1 引数で受け取り、モジュール内部で `window.localStorage` を参照しない（テストで偽ストレージを渡せるようにするため）。`window.localStorage` を渡すのは `main.ts` の役目。
- `apps/_shared` の既存ユーティリティを再利用する: `withTimeout`（`async.ts`）、`createAutoConnector`（`autoconnect.ts`）、`getRawEventType` / `normalizeEventType`（`even-events.ts`）、`createStandaloneViteConfig`（`standalone-vite.ts`）。
- 純粋ロジックはイミュータブルに書く。状態を書き換えず、新しいオブジェクトを返す。
- Vitest の対象は純粋ロジックのみ。SDK ブリッジと DOM はテスト対象外とし、シミュレータで確認する。

---

## File Structure

| ファイル | 責務 |
| --- | --- |
| `apps/eventlens/app.json` | Even Hub のアプリメタデータ |
| `apps/eventlens/index.html` | エントリポイント |
| `apps/eventlens/package.json` | 依存とスクリプト（dev / build / test） |
| `apps/eventlens/vite.config.ts` | スタンドアロン Vite 設定（ポート 5180） |
| `apps/eventlens/vitest.config.ts` | Vitest 設定 |
| `apps/eventlens/tsconfig.json` | 型チェック設定（実装中に追加） |
| `apps/eventlens/README.md` | 使い方と初版の範囲 |
| `apps/eventlens/src/exhibitors-data.json` | 同梱する出展者データ（`import` でバンドルに含める） |
| `apps/eventlens/src/exhibitors.ts` | 出展者データの型・正規化・ブース番号の自然順比較・版数マージ |
| `apps/eventlens/src/itinerary.ts` | 巡回リストの追加・削除・メモ・訪問済み・カーソル・残り件数・並べ替え |
| `apps/eventlens/src/storage.ts` | `localStorage` の読み書きと破損時のフォールバック |
| `apps/eventlens/src/remote.ts` | 出展者データの更新取得（タイムアウト付き、失敗は無視） |
| `apps/eventlens/src/eventlens-app.ts` | G2 コントローラ。SDK 描画とイベント処理 |
| `apps/eventlens/src/main.ts` | スマートフォン UI。状態の保持と各モジュールの結線 |
| `apps/eventlens/src/styles.css` | スタイル |

---

## Task 1: アプリの雛形をシミュレータで起動する

**Files:**
- Create: `apps/eventlens/package.json`
- Create: `apps/eventlens/vite.config.ts`
- Create: `apps/eventlens/vitest.config.ts`
- Create: `apps/eventlens/index.html`
- Create: `apps/eventlens/app.json`
- Create: `apps/eventlens/src/main.ts`
- Create: `apps/eventlens/src/styles.css`（`apps/garbage_cue/src/styles.css` からコピー）

**Interfaces:**
- Consumes: なし
- Produces: `apps/eventlens/` ディレクトリ一式。以降のすべてのタスクがここにファイルを追加する。`npm test` が Vitest を起動する状態。

- [ ] **Step 1: ディレクトリを作り、スタイルを既存アプリからコピーする**

```bash
mkdir -p apps/eventlens/src apps/eventlens/public
cp apps/garbage_cue/src/styles.css apps/eventlens/src/styles.css
```

- [ ] **Step 2: `apps/eventlens/package.json` を作る**

```json
{
  "name": "eventlens-even-g2",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5180",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@evenrealities/even_hub_sdk": "latest"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 3: `apps/eventlens/vite.config.ts` を作る**

```ts
import { defineConfig } from 'vite'
import { createStandaloneViteConfig } from '../_shared/standalone-vite'

export default defineConfig(createStandaloneViteConfig(import.meta.url, 5180))
```

- [ ] **Step 4: `apps/eventlens/vitest.config.ts` を作る**

Vitest は `vite.config.ts` ではなくこちらを優先して読む。`environment` を `node` にするのは、テスト対象が純粋ロジックのみで DOM を必要としないため（jsdom を入れずに済む）。

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 5: `apps/eventlens/index.html` を作る**

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1d4ed8" />
    <title>EventLens — 展示会巡回HUD</title>
    <script type="module" src="/src/main.ts"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

- [ ] **Step 6: `apps/eventlens/app.json` を作る**

```json
{
  "package_id": "com.yuta.eventlens",
  "edition": "202601",
  "name": "EventLens",
  "version": "0.1.0",
  "min_app_version": "0.1.0",
  "tagline": "次に行くブースを一目で確認",
  "description": "展示会の巡回リストを事前に登録して、次に行くブースと残り件数をEven G2で確認するアプリです。",
  "author": "yuta",
  "entrypoint": "index.html"
}
```

- [ ] **Step 7: 最小の `apps/eventlens/src/main.ts` を作る**

```ts
import './styles.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app element')
}

app.innerHTML = `
  <header class="hero card">
    <div>
      <p class="eyebrow">Even G2 · 展示会巡回HUD</p>
      <h1 class="page-title">EventLens</h1>
      <p class="page-subtitle">次に行くブースを、メガネで一目確認</p>
    </div>
    <div id="hero-pill" class="hero-pill is-ready" aria-live="polite">準備完了</div>
  </header>
`
```

- [ ] **Step 8: 依存をインストールする**

```bash
cd apps/eventlens && npm install
```

- [ ] **Step 9: Vitest が起動することを確認する**

Run: `cd apps/eventlens && npm test`
Expected: テストファイルがまだ無いため `No test files found` で終了する。Vitest 自体が起動していれば成功。

- [ ] **Step 10: シミュレータで起動を確認する**

Run: `./start-even.sh eventlens`
Expected: ランチャーが `eventlens` を検出して選択でき、Vite が起動し、Even Hub Simulator が立ち上がる。ブラウザ側に「EventLens」の見出しが表示される。G2 側はまだ何も描画しない（Task 5 で実装する）。

- [ ] **Step 11: コミット**

```bash
git add apps/eventlens
git commit -m "feat(eventlens): scaffold app with vite, vitest and simulator entry"
```

---

## Task 2: 出展者データモジュール

**Files:**
- Create: `apps/eventlens/src/exhibitors.ts`
- Test: `apps/eventlens/src/exhibitors.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `type Exhibitor = { id: string; booth: string; name: string; genre?: string }`
  - `type EventData = { eventId: string; eventName: string; eventDate: string; version: number; exhibitors: Exhibitor[] }`
  - `function normalizeEventData(value: unknown): EventData | null`
  - `function compareBooth(a: string, b: string): number`
  - `function sortExhibitorsByBooth(exhibitors: Exhibitor[]): Exhibitor[]`
  - `function mergeEventData(current: EventData, incoming: EventData | null): EventData`
  - `function findExhibitor(data: EventData, exhibitorId: string): Exhibitor | null`
  - `function createEmptyEventData(): EventData`

- [ ] **Step 1: 失敗するテストを書く**

`apps/eventlens/src/exhibitors.test.ts`:

```ts
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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `cd apps/eventlens && npm test`
Expected: FAIL。`Failed to resolve import "./exhibitors"` が出る。

- [ ] **Step 3: 実装を書く**

`apps/eventlens/src/exhibitors.ts`:

```ts
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

  if (left.prefix !== right.prefix) {
    return left.prefix < right.prefix ? -1 : 1
  }

  const leftHasNumber = !Number.isNaN(left.numeric)
  const rightHasNumber = !Number.isNaN(right.numeric)

  if (!leftHasNumber && !rightHasNumber) return left.rest.localeCompare(right.rest)
  if (!leftHasNumber) return 1
  if (!rightHasNumber) return -1
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
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `cd apps/eventlens && npm test`
Expected: PASS。全テストが通る。

- [ ] **Step 5: コミット**

```bash
git add apps/eventlens/src/exhibitors.ts apps/eventlens/src/exhibitors.test.ts
git commit -m "feat(eventlens): add exhibitor data model with natural booth sort and version merge"
```

---

## Task 3: 巡回リストモジュール

**Files:**
- Create: `apps/eventlens/src/itinerary.ts`
- Test: `apps/eventlens/src/itinerary.test.ts`

**Interfaces:**
- Consumes: `EventData`, `compareBooth`, `findExhibitor`（Task 2）
- Produces:
  - `type ItineraryItem = { exhibitorId: string; note: string; visited: boolean }`
  - `type Itinerary = { items: ItineraryItem[]; cursor: number }`
  - `function createEmptyItinerary(): Itinerary`
  - `function addItem(itinerary: Itinerary, exhibitorId: string, note?: string): Itinerary`
  - `function removeItem(itinerary: Itinerary, exhibitorId: string): Itinerary`
  - `function setNote(itinerary: Itinerary, exhibitorId: string, note: string): Itinerary`
  - `function toggleVisited(itinerary: Itinerary, index: number): Itinerary`
  - `function moveCursor(itinerary: Itinerary, delta: number): Itinerary`
  - `function setCursor(itinerary: Itinerary, index: number): Itinerary`
  - `function currentItem(itinerary: Itinerary): ItineraryItem | null`
  - `function remainingCount(itinerary: Itinerary): number`
  - `function sortByBooth(itinerary: Itinerary, data: EventData): Itinerary`
  - `function hasItem(itinerary: Itinerary, exhibitorId: string): boolean`

- [ ] **Step 1: 失敗するテストを書く**

`apps/eventlens/src/itinerary.test.ts`:

```ts
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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `cd apps/eventlens && npm test`
Expected: FAIL。`Failed to resolve import "./itinerary"` が出る。

- [ ] **Step 3: 実装を書く**

`apps/eventlens/src/itinerary.ts`:

```ts
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
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `cd apps/eventlens && npm test`
Expected: PASS。Task 2 のテストも引き続き通る。

- [ ] **Step 5: コミット**

```bash
git add apps/eventlens/src/itinerary.ts apps/eventlens/src/itinerary.test.ts
git commit -m "feat(eventlens): add itinerary logic with cursor, visited toggle and booth sort"
```

---

## Task 4: 保存モジュール

**Files:**
- Create: `apps/eventlens/src/storage.ts`
- Test: `apps/eventlens/src/storage.test.ts`

**Interfaces:**
- Consumes: `Itinerary`, `ItineraryItem`, `createEmptyItinerary`（Task 3）、`EventData`, `normalizeEventData`（Task 2）
- Produces:
  - `type StorageLike = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }`
  - `function normalizeItinerary(value: unknown): Itinerary`
  - `function loadItinerary(storage: StorageLike, eventId: string): Itinerary`
  - `function saveItinerary(storage: StorageLike, eventId: string, itinerary: Itinerary): void`
  - `function loadCachedEventData(storage: StorageLike): EventData | null`
  - `function saveCachedEventData(storage: StorageLike, data: EventData): void`

- [ ] **Step 1: 失敗するテストを書く**

`apps/eventlens/src/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `cd apps/eventlens && npm test`
Expected: FAIL。`Failed to resolve import "./storage"` が出る。

- [ ] **Step 3: 実装を書く**

`apps/eventlens/src/storage.ts`:

```ts
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
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `cd apps/eventlens && npm test`
Expected: PASS。

- [ ] **Step 5: コミット**

```bash
git add apps/eventlens/src/storage.ts apps/eventlens/src/storage.test.ts
git commit -m "feat(eventlens): add localStorage persistence with corruption fallback"
```

---

## Task 5: 出展者データの更新取得

**Files:**
- Create: `apps/eventlens/src/remote.ts`
- Test: `apps/eventlens/src/remote.test.ts`

**Interfaces:**
- Consumes: `EventData`, `normalizeEventData`（Task 2）
- Produces:
  - `type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>`
  - `function fetchEventData(url: string, options?: { fetchImpl?: FetchLike; timeoutMs?: number }): Promise<EventData | null>`

この関数は**決して例外を投げない**。ネットワーク不通・タイムアウト・404・壊れた JSON のいずれでも `null` を返す。オフラインを既定の状態として扱うためである。

- [ ] **Step 1: 失敗するテストを書く**

`apps/eventlens/src/remote.test.ts`:

```ts
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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `cd apps/eventlens && npm test`
Expected: FAIL。`Failed to resolve import "./remote"` が出る。

- [ ] **Step 3: 実装を書く**

`apps/eventlens/src/remote.ts`:

```ts
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
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `cd apps/eventlens && npm test`
Expected: PASS。

- [ ] **Step 5: コミット**

```bash
git add apps/eventlens/src/remote.ts apps/eventlens/src/remote.test.ts
git commit -m "feat(eventlens): add timeout-guarded exhibitor data fetch that never throws"
```

---

## Task 6: G2 コントローラ

**Files:**
- Create: `apps/eventlens/src/eventlens-app.ts`

**Interfaces:**
- Consumes: `EventData`, `findExhibitor`（Task 2）、`Itinerary`, `currentItem`, `moveCursor`, `remainingCount`, `toggleVisited`, `setCursor`（Task 3）
- Produces:
  - `type EventLensPhase = 'idle' | 'connecting' | 'connected' | 'mock' | 'error'`
  - `type GlassPreview = { heading: string; note: string; footer: string; itemLabels: string[]; selectedIndex: number }`
  - `type EventLensController = { connect: () => Promise<void>; sync: () => Promise<void> }`
  - `function createEventLensController(options: EventLensControllerOptions): EventLensController`
  - `function buildItemLabel(data: EventData, item: ItineraryItem): string`

**設計上の要点:**

- コントローラは巡回リストの状態を**保持しない**。`getItinerary()` で読み、変更は `onItineraryChange(next)` で UI 側へ返す。状態の単一の真実源は `main.ts` にある。
- G2 でイベントを受け取るには `ListContainerProperty` に `isEventCapture: 1` が必要なため、巡回リスト全件を持つリストコンテナを画面下部に置く。上部の大きな `TextContainerProperty` が現在項目を表示する。リストの選択インデックスがカーソルとして働く。
- 座標は幅 560 / 高さ 266 に収める。

- [ ] **Step 1: 実装を書く**

`apps/eventlens/src/eventlens-app.ts`:

```ts
import {
  CreateStartUpPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  OsEventTypeList,
  RebuildPageContainer,
  TextContainerProperty,
  waitForEvenAppBridge,
  type EvenAppBridge,
  type EvenHubEvent,
} from '@evenrealities/even_hub_sdk'
import { withTimeout } from '../../_shared/async'
import { getRawEventType, normalizeEventType } from '../../_shared/even-events'
import { findExhibitor, type EventData } from './exhibitors'
import {
  currentItem,
  moveCursor,
  remainingCount,
  setCursor,
  toggleVisited,
  type Itinerary,
  type ItineraryItem,
} from './itinerary'

export type EventLensPhase = 'idle' | 'connecting' | 'connected' | 'mock' | 'error'

export type GlassPreview = {
  heading: string
  note: string
  footer: string
  itemLabels: string[]
  selectedIndex: number
}

export type EventLensControllerOptions = {
  getItinerary: () => Itinerary
  getEventData: () => EventData
  onItineraryChange: (next: Itinerary) => void
  onPhase: (phase: EventLensPhase) => void
  onStatus: (message: string) => void
  onLog: (message: string) => void
  onPreview: (preview: GlassPreview) => void
}

export type EventLensController = {
  connect: () => Promise<void>
  sync: () => Promise<void>
}

export function buildItemLabel(data: EventData, item: ItineraryItem): string {
  const exhibitor = findExhibitor(data, item.exhibitorId)
  const mark = item.visited ? '✓ ' : ''

  if (!exhibitor) {
    return `${mark}（掲載終了）`
  }

  return `${mark}${exhibitor.booth} ${exhibitor.name}`
}

function getIncomingIndex(event: EvenHubEvent, itemCount: number): number | null {
  const rawIndex = event.listEvent?.currentSelectItemIndex
  const parsed = typeof rawIndex === 'number'
    ? rawIndex
    : typeof rawIndex === 'string'
      ? Number.parseInt(rawIndex, 10)
      : Number.NaN

  if (Number.isFinite(parsed) && parsed >= 0 && parsed < itemCount) {
    return parsed
  }

  return null
}

export function createEventLensController(
  options: EventLensControllerOptions,
): EventLensController {
  let bridge: EvenAppBridge | null = null
  let startupRendered = false
  let eventLoopRegistered = false

  function buildPreview(): GlassPreview {
    const itinerary = options.getItinerary()
    const data = options.getEventData()
    const item = currentItem(itinerary)

    if (!item) {
      return {
        heading: 'リストが空です',
        note: 'スマホでブースを登録してください',
        footer: '2回タップで終了',
        itemLabels: [],
        selectedIndex: 0,
      }
    }

    const exhibitor = findExhibitor(data, item.exhibitorId)
    const heading = exhibitor
      ? `${exhibitor.booth}\n${exhibitor.name}`
      : '（掲載終了）\nこの出展は一覧にありません'

    const position = `${itinerary.cursor + 1}/${itinerary.items.length}`
    const visitedMark = item.visited ? '✓ 訪問済' : '未訪問'
    const footer = `${visitedMark}  残り ${remainingCount(itinerary)} / ${itinerary.items.length}  (${position})\n↑↓送り  タップ=訪問済  2回タップで終了`

    return {
      heading,
      note: item.note.length > 0 ? item.note : '—',
      footer,
      itemLabels: itinerary.items.map((entry) => buildItemLabel(data, entry)),
      selectedIndex: itinerary.cursor,
    }
  }

  function publishPreview(): GlassPreview {
    const preview = buildPreview()
    options.onPreview(preview)
    return preview
  }

  function buildPagePayload() {
    const preview = publishPreview()

    const headingText = new TextContainerProperty({
      containerID: 1,
      containerName: 'eventlens-heading',
      content: preview.heading,
      xPosition: 8,
      yPosition: 4,
      width: 560,
      height: 72,
      isEventCapture: 0,
    })

    const noteText = new TextContainerProperty({
      containerID: 2,
      containerName: 'eventlens-note',
      content: preview.note,
      xPosition: 8,
      yPosition: 80,
      width: 560,
      height: 44,
      isEventCapture: 0,
    })

    const footerText = new TextContainerProperty({
      containerID: 3,
      containerName: 'eventlens-footer',
      content: preview.footer,
      xPosition: 8,
      yPosition: 128,
      width: 560,
      height: 40,
      isEventCapture: 0,
    })

    const itemList = new ListContainerProperty({
      containerID: 4,
      containerName: 'eventlens-items',
      itemContainer: new ListItemContainerProperty({
        itemCount: Math.max(1, preview.itemLabels.length),
        itemWidth: 560,
        isItemSelectBorderEn: 1,
        itemName: preview.itemLabels.length > 0 ? preview.itemLabels : ['（未登録）'],
      }),
      isEventCapture: 1,
      xPosition: 8,
      yPosition: 172,
      width: 560,
      height: 94,
    })

    return {
      containerTotalNum: 4,
      textObject: [headingText, noteText, footerText],
      listObject: [itemList],
    }
  }

  async function renderPage(): Promise<void> {
    if (!bridge) {
      publishPreview()
      return
    }

    const payload = buildPagePayload()
    if (!startupRendered) {
      await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(payload))
      startupRendered = true
      return
    }

    await bridge.rebuildPageContainer(new RebuildPageContainer(payload))
  }

  async function handleHubEvent(event: EvenHubEvent): Promise<void> {
    if (!bridge) return

    const eventType = normalizeEventType(getRawEventType(event), OsEventTypeList)
    const itinerary = options.getItinerary()

    if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      options.onLog('G2: 終了操作を受け付けました')
      await bridge.shutDownPageContainer(1)
      return
    }

    if (itinerary.items.length === 0) return

    if (eventType === OsEventTypeList.CLICK_EVENT) {
      const next = toggleVisited(itinerary, itinerary.cursor)
      const item = next.items[next.cursor]
      options.onLog(item?.visited ? 'G2: 訪問済にしました' : 'G2: 訪問済を解除しました')
      options.onItineraryChange(next)
      await renderPage()
      return
    }

    const incomingIndex = getIncomingIndex(event, itinerary.items.length)
    let next = itinerary

    if (incomingIndex !== null) {
      next = setCursor(itinerary, incomingIndex)
    } else if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      next = moveCursor(itinerary, -1)
    } else if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      next = moveCursor(itinerary, 1)
    }

    if (next.cursor === itinerary.cursor) return

    options.onLog(`G2: ${next.cursor + 1}件目を表示`)
    options.onItineraryChange(next)
    await renderPage()
  }

  function registerEventLoop(nextBridge: EvenAppBridge): void {
    if (eventLoopRegistered) return

    nextBridge.onEvenHubEvent((event) => {
      void handleHubEvent(event).catch((error) => {
        console.error('[eventlens] event handling failed', error)
        options.onLog(`G2イベント処理エラー: ${String(error)}`)
      })
    })

    eventLoopRegistered = true
  }

  return {
    async connect() {
      options.onPhase('connecting')
      options.onStatus('Even G2に接続しています…')
      options.onLog('接続を開始しました')

      try {
        const nextBridge = await withTimeout(waitForEvenAppBridge(), 6000)
        const isNewBridge = bridge !== nextBridge
        bridge = nextBridge

        if (isNewBridge) {
          startupRendered = false
          eventLoopRegistered = false
        }

        registerEventLoop(nextBridge)
        await renderPage()
        options.onPhase('connected')
        options.onStatus('接続済み。G2で上下スワイプして巡回できます。')
        options.onLog('Even G2に接続しました')
      } catch (error) {
        bridge = null
        startupRendered = false
        eventLoopRegistered = false
        options.onPhase('mock')
        options.onStatus('G2未接続のため、ブラウザプレビューで動作しています。')
        options.onLog(`G2未接続: ${String(error)}`)
        publishPreview()
      }
    },

    async sync() {
      try {
        publishPreview()
        if (bridge) {
          await renderPage()
          options.onStatus('リストをG2に反映しました。')
        }
      } catch (error) {
        options.onPhase('error')
        options.onStatus('G2への反映に失敗しました。')
        options.onLog(`反映エラー: ${String(error)}`)
      }
    },
  }
}
```

- [ ] **Step 2: 型エラーが無いことを確認する**

Run: `cd apps/eventlens && npx tsc --noEmit`
Expected: エラー無しで終了する。エラーが出た場合は SDK の型定義に合わせて修正する。

- [ ] **Step 3: コミット**

```bash
git add apps/eventlens/src/eventlens-app.ts
git commit -m "feat(eventlens): add G2 controller with single-item focus layout"
```

---

## Task 7: スマートフォン UI と結線

**Files:**
- Modify: `apps/eventlens/src/main.ts`（Task 1 で作った最小版を全面的に書き換える）
- Create: `apps/eventlens/public/exhibitors.json`

**Interfaces:**
- Consumes: Task 2〜6 のすべて。`createAutoConnector`（`apps/_shared/autoconnect`）
- Produces: 動作するアプリ全体。

**この画面が満たすこと:**

- 出展者一覧を検索して巡回リストに追加・削除できる
- 各項目にメモを書ける
- 「ブース番号順に並べ替え」ボタンがある
- G2 プレビューを表示する
- G2 側の操作（訪問済みトグル・カーソル移動）が画面に反映される
- 操作のたびに `localStorage` へ保存する

- [ ] **Step 1: 同梱データの雛形を作る**

`apps/eventlens/public/exhibitors.json`:

出展者は開催直前まで確定しないため、初版はサンプル 3 件で作る。確定後にこのファイルを差し替える。

```json
{
  "eventId": "genai-expo-vol6",
  "eventName": "生成AIなんでも展示会 Vol.6",
  "eventDate": "2026-09-23",
  "version": 1,
  "exhibitors": [
    { "id": "sample-001", "booth": "A-5", "name": "サンプル出展A", "genre": "音声AI" },
    { "id": "sample-002", "booth": "B-2", "name": "サンプル出展B", "genre": "画像生成" },
    { "id": "sample-003", "booth": "B-12", "name": "サンプル出展C", "genre": "LLMアプリ" }
  ]
}
```

- [ ] **Step 2: `apps/eventlens/src/main.ts` を書き換える**

```ts
import './styles.css'
import { createAutoConnector } from '../../_shared/autoconnect'
import {
  createEventLensController,
  type EventLensPhase,
  type GlassPreview,
} from './eventlens-app'
import {
  createEmptyEventData,
  findExhibitor,
  normalizeEventData,
  sortExhibitorsByBooth,
  type EventData,
  type Exhibitor,
} from './exhibitors'
import {
  addItem,
  createEmptyItinerary,
  hasItem,
  removeItem,
  setNote,
  sortByBooth,
  type Itinerary,
} from './itinerary'
import { fetchEventData } from './remote'
import {
  loadCachedEventData,
  loadItinerary,
  saveCachedEventData,
  saveItinerary,
} from './storage'

const BUNDLED_DATA_URL = '/exhibitors.json'
const REMOTE_DATA_URL = 'https://www.genai-expo.com/eventlens/exhibitors.json'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app element')
}

app.innerHTML = `
  <header class="hero card">
    <div>
      <p class="eyebrow">Even G2 · 展示会巡回HUD</p>
      <h1 class="page-title">EventLens</h1>
      <p class="page-subtitle">次に行くブースを、メガネで一目確認</p>
    </div>
    <div id="hero-pill" class="hero-pill is-ready" aria-live="polite">準備完了</div>
  </header>

  <section class="card connection-card">
    <button id="connect-btn" class="btn btn-primary connect-btn" type="button">Even G2に接続</button>
    <p id="status" class="status-line">ブラウザプレビューを準備しています。</p>
  </section>

  <section class="card schedule-card">
    <div class="section-heading">
      <div>
        <p class="section-label">巡回リスト</p>
        <p id="itinerary-summary" class="section-description">—</p>
      </div>
      <button id="sort-btn" class="btn btn-ghost compact-btn" type="button">ブース番号順</button>
    </div>
    <div id="itinerary-list" class="schedule-form"></div>
    <p id="storage-note" class="storage-note">この端末のブラウザに保存されます。</p>
  </section>

  <section class="card schedule-card">
    <div class="section-heading">
      <div>
        <p class="section-label">出展者を探す</p>
        <p id="event-name" class="section-description">—</p>
      </div>
    </div>
    <input id="search-input" class="schedule-select" type="search" placeholder="ブース番号・出展名で検索" aria-label="出展者を検索" />
    <div id="exhibitor-list" class="schedule-form"></div>
  </section>

  <section class="card glasses-card">
    <div class="section-heading">
      <div>
        <p class="section-label">G2プレビュー</p>
        <p class="section-description">上下スワイプで送り、タップで訪問済みにします。</p>
      </div>
      <div class="preview-actions">
        <button id="sync-btn" class="btn btn-primary compact-btn" type="button">G2に反映</button>
      </div>
    </div>
    <div id="glass-preview" class="glass-preview" aria-live="polite">
      <div id="preview-title" class="preview-title">—</div>
      <div id="preview-next" class="preview-next">—</div>
    </div>
  </section>

  <details class="log-details">
    <summary>イベントログ</summary>
    <pre id="event-log" aria-live="polite"></pre>
  </details>
`

const heroPill = document.querySelector<HTMLDivElement>('#hero-pill')!
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!
const connectBtn = document.querySelector<HTMLButtonElement>('#connect-btn')!
const sortBtn = document.querySelector<HTMLButtonElement>('#sort-btn')!
const syncBtn = document.querySelector<HTMLButtonElement>('#sync-btn')!
const itinerarySummaryEl = document.querySelector<HTMLParagraphElement>('#itinerary-summary')!
const itineraryListEl = document.querySelector<HTMLDivElement>('#itinerary-list')!
const eventNameEl = document.querySelector<HTMLParagraphElement>('#event-name')!
const searchInput = document.querySelector<HTMLInputElement>('#search-input')!
const exhibitorListEl = document.querySelector<HTMLDivElement>('#exhibitor-list')!
const previewTitleEl = document.querySelector<HTMLDivElement>('#preview-title')!
const previewNextEl = document.querySelector<HTMLDivElement>('#preview-next')!
const logEl = document.querySelector<HTMLPreElement>('#event-log')!

let eventData: EventData = createEmptyEventData()
let itinerary: Itinerary = createEmptyItinerary()

const phaseLabels: Record<EventLensPhase, { label: string; className: string }> = {
  idle: { label: '準備完了', className: 'is-ready' },
  connecting: { label: '接続中', className: 'is-connecting' },
  connected: { label: 'G2接続済み', className: 'is-connected' },
  mock: { label: 'プレビュー', className: 'is-mock' },
  error: { label: '要確認', className: 'is-error' },
}

function setPhase(phase: EventLensPhase): void {
  const next = phaseLabels[phase]
  heroPill.textContent = next.label
  heroPill.className = `hero-pill ${next.className}`
}

function setStatus(message: string): void {
  statusEl.textContent = message
}

function appendLog(message: string): void {
  const time = new Date().toLocaleTimeString()
  logEl.textContent = `[${time}] ${message}\n${logEl.textContent ?? ''}`
  const lines = logEl.textContent.split('\n')
  if (lines.length > 80) {
    logEl.textContent = lines.slice(0, 80).join('\n')
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function persist(): void {
  if (eventData.eventId.length === 0) return
  saveItinerary(window.localStorage, eventData.eventId, itinerary)
}

function renderItinerary(): void {
  if (itinerary.items.length === 0) {
    itineraryListEl.innerHTML = '<p class="note-text">まだ登録がありません。下の一覧から追加してください。</p>'
    itinerarySummaryEl.textContent = '0件'
    return
  }

  const visitedCount = itinerary.items.filter((item) => item.visited).length
  itinerarySummaryEl.textContent = `${itinerary.items.length}件中 ${visitedCount}件 訪問済み`

  itineraryListEl.innerHTML = itinerary.items.map((item, index) => {
    const exhibitor = findExhibitor(eventData, item.exhibitorId)
    const label = exhibitor
      ? `${escapeHtml(exhibitor.booth)} ${escapeHtml(exhibitor.name)}`
      : '（掲載終了）'
    const current = index === itinerary.cursor ? ' is-selected' : ''
    const visited = item.visited ? '✓ ' : ''

    return `
      <div class="schedule-row${current}">
        <span class="weekday-badge">${index + 1}</span>
        <span>${visited}${label}</span>
        <input class="schedule-select" type="text" value="${escapeHtml(item.note)}"
               data-note-for="${escapeHtml(item.exhibitorId)}"
               placeholder="見たいもの" aria-label="${label} のメモ" />
        <button class="btn btn-ghost compact-btn" type="button"
                data-remove="${escapeHtml(item.exhibitorId)}">削除</button>
      </div>
    `
  }).join('')
}

function matchesQuery(exhibitor: Exhibitor, query: string): boolean {
  if (query.length === 0) return true
  const haystack = `${exhibitor.booth} ${exhibitor.name} ${exhibitor.genre ?? ''}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}

function renderExhibitors(): void {
  const query = searchInput.value.trim()
  const matched = sortExhibitorsByBooth(eventData.exhibitors)
    .filter((exhibitor) => matchesQuery(exhibitor, query))
    .slice(0, 50)

  if (matched.length === 0) {
    exhibitorListEl.innerHTML = '<p class="note-text">該当する出展がありません。</p>'
    return
  }

  exhibitorListEl.innerHTML = matched.map((exhibitor) => {
    const added = hasItem(itinerary, exhibitor.id)
    return `
      <div class="schedule-row">
        <span class="weekday-badge">${escapeHtml(exhibitor.booth)}</span>
        <span>${escapeHtml(exhibitor.name)}</span>
        <button class="btn ${added ? 'btn-ghost' : 'btn-primary'} compact-btn" type="button"
                data-add="${escapeHtml(exhibitor.id)}" ${added ? 'disabled' : ''}>
          ${added ? '追加済み' : '追加'}
        </button>
      </div>
    `
  }).join('')
}

function renderGlassPreview(preview: GlassPreview): void {
  previewTitleEl.textContent = preview.heading
  previewNextEl.textContent = `${preview.note}\n${preview.footer}`
}

function renderAll(): void {
  eventNameEl.textContent = eventData.eventName.length > 0
    ? `${eventData.eventName}（${eventData.exhibitors.length}組）`
    : '出展者データがありません'
  renderItinerary()
  renderExhibitors()
}

const controller = createEventLensController({
  getItinerary: () => itinerary,
  getEventData: () => eventData,
  onItineraryChange: (next) => {
    itinerary = next
    persist()
    renderItinerary()
  },
  onPhase: setPhase,
  onStatus: setStatus,
  onLog: appendLog,
  onPreview: renderGlassPreview,
})

itineraryListEl.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof HTMLButtonElement)) return

  const exhibitorId = target.dataset.remove
  if (!exhibitorId) return

  itinerary = removeItem(itinerary, exhibitorId)
  persist()
  renderAll()
  appendLog('巡回リストから削除しました')
  void controller.sync()
})

itineraryListEl.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return

  const exhibitorId = target.dataset.noteFor
  if (!exhibitorId) return

  itinerary = setNote(itinerary, exhibitorId, target.value)
  persist()
  appendLog('メモを更新しました')
  void controller.sync()
})

exhibitorListEl.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof HTMLButtonElement)) return

  const exhibitorId = target.dataset.add
  if (!exhibitorId) return

  itinerary = addItem(itinerary, exhibitorId)
  persist()
  renderAll()
  appendLog('巡回リストに追加しました')
  void controller.sync()
})

searchInput.addEventListener('input', () => {
  renderExhibitors()
})

sortBtn.addEventListener('click', () => {
  itinerary = sortByBooth(itinerary, eventData)
  persist()
  renderAll()
  appendLog('ブース番号順に並べ替えました')
  void controller.sync()
})

syncBtn.addEventListener('click', () => {
  void controller.sync()
})

async function loadBundledData(): Promise<EventData> {
  try {
    const response = await fetch(BUNDLED_DATA_URL)
    if (!response.ok) return createEmptyEventData()
    return normalizeEventData(await response.json()) ?? createEmptyEventData()
  } catch {
    return createEmptyEventData()
  }
}

async function bootstrap(): Promise<void> {
  eventData = await loadBundledData()

  const cached = loadCachedEventData(window.localStorage)
  if (cached && cached.eventId === eventData.eventId && cached.version > eventData.version) {
    eventData = cached
    appendLog('保存済みの新しい出展者データを使用します')
  }

  itinerary = loadItinerary(window.localStorage, eventData.eventId)
  renderAll()
  setPhase('idle')

  const connector = createAutoConnector({
    connect: controller.connect,
    onConnecting: () => setPhase('connecting'),
  })
  connector.bind(connectBtn)

  const remote = await fetchEventData(REMOTE_DATA_URL)
  if (remote && remote.eventId === eventData.eventId && remote.version > eventData.version) {
    eventData = remote
    saveCachedEventData(window.localStorage, remote)
    appendLog(`出展者データを更新しました（version ${remote.version}）`)
    renderAll()
    void controller.sync()
  }
}

void bootstrap()
```

- [ ] **Step 3: 型エラーが無いことを確認する**

Run: `cd apps/eventlens && npx tsc --noEmit`
Expected: エラー無しで終了する。

- [ ] **Step 4: 既存のテストが壊れていないことを確認する**

Run: `cd apps/eventlens && npm test`
Expected: PASS。Task 2〜5 のテストが全て通る。

- [ ] **Step 5: ブラウザ単体で確認する**

Run: `cd apps/eventlens && npm run dev`
ブラウザで `http://localhost:5180` を開き、次を確認する。

- サンプル出展 3 件が「出展者を探す」に表示される
- 「追加」で巡回リストに入り、ボタンが「追加済み」に変わる
- メモを入力すると G2 プレビューに反映される
- 「ブース番号順」で A-5 → B-2 → B-12 の順になる
- ページを再読み込みしても巡回リストが残る

続いて、合格基準「機内モード（完全オフライン）で基本操作が完結する」を検証する。ブラウザの開発者ツールで Network を **Offline** に切り替え、ページを再読み込みして次を確認する。

- 巡回リストが復元される（`localStorage` から読むため）
- 出展者一覧が表示される（同梱 JSON を読むため）
- 追加・削除・メモ・並べ替えが動作する
- コンソールに未処理の例外が出ない（`REMOTE_DATA_URL` への通信は失敗するが `fetchEventData` が握り潰す）

- [ ] **Step 6: シミュレータで確認する**

Run: `./start-even.sh eventlens`
シミュレータ上で次を確認する。

- 上部にブース番号と出展名が大きく表示される
- 下スワイプで次の項目へ、上スワイプで前の項目へ移動する
- シングルタップで「✓ 訪問済」に変わり、残り件数が減る
- もう一度シングルタップで解除され、残り件数が戻る
- ダブルタップでページが閉じる
- G2 側で訪問済みにすると、ブラウザ側の巡回リストにも `✓` が付く

- [ ] **Step 7: コミット**

```bash
git add apps/eventlens/src/main.ts apps/eventlens/public/exhibitors.json
git commit -m "feat(eventlens): add phone UI, data bootstrap and G2 wiring"
```

---

## Task 8: ドキュメントとパッケージング

**Files:**
- Create: `apps/eventlens/README.md`
- Modify: `README.md`（ルート。組み込みアプリ表に 1 行追加）

**Interfaces:**
- Consumes: Task 1〜7 の成果物
- Produces: 審査提出用の `apps/eventlens/out.ehpk`

- [ ] **Step 1: `apps/eventlens/README.md` を書く**

```markdown
# EventLens

「生成AIなんでも展示会 Vol.6」（2026-09-23 / 東京都立産業貿易センター浜松町館）の来場者向け、Even G2 用の巡回リストアプリです。

## MVP

- 出展者一覧から見たいブースを選んで巡回リストに登録
- 各項目に「見たいもの」のメモを追加
- ブース番号順への並べ替え
- G2 には次に行くブース・出展名・メモ・残り件数を表示
- 上下スワイプで送り、シングルタップで訪問済みをトグル、ダブルタップで終了
- 完全オフラインで動作

巡回リストとメモはこの端末の `localStorage` にのみ保存され、外部に送信されません。出展者データは同梱の JSON を使い、通信できる場合のみ最新版に更新します。

初版では会場マップ、出展者の画像、GPS、通知、タイムテーブル連動を扱いません。

## Run

```bash
npm install
npm run dev
```

シミュレータで動かす場合はリポジトリのルートから次を実行します。

```bash
./start-even.sh eventlens
```

## Test

```bash
npm test
```

## 出展者データの差し替え

`public/exhibitors.json` を更新し、`version` を 1 つ増やしてください。同じ形式の JSON を公開 URL に置くと、通信できる環境で自動的に新しい方が使われます。
```

- [ ] **Step 2: ルート `README.md` の組み込みアプリ表に 1 行足す**

`apps/garbage_cue` の行のすぐ下に、同じ書式で追加する（表は README の 58〜62 行付近にある）。

```markdown
|    [eventlens](./apps/eventlens/) | EventLens – exhibition itinerary HUD (booth, note, remaining count) | |
```

- [ ] **Step 3: ビルドが通ることを確認する**

Run: `cd apps/eventlens && npm run build`
Expected: `apps/eventlens/dist` が生成され、エラー無く終了する。

- [ ] **Step 4: パッケージングを確認する**

Run: `./scripts/pack-app.sh eventlens`
Expected: `apps/eventlens/out.ehpk` が生成される。

- [ ] **Step 5: 生成物が git に入らないことを確認する**

Run: `git status --short apps/eventlens`
Expected: `dist/` と `out.ehpk` が表示されない。表示された場合はルートの `.gitignore` に次を追記する。

```
apps/*/dist/
apps/*/out.ehpk
```

- [ ] **Step 6: コミット**

```bash
git add apps/eventlens/README.md README.md
git commit -m "docs(eventlens): add app README and register in root app list"
```

---

## 実装後に残る作業（このプランの範囲外）

次の 2 つは主催側で用意が必要なもので、コードの完成とは独立している。

1. **出展者データの確定と差し替え** — `src/exhibitors-data.json` を実データに更新し、`version` を上げる。現在は架空のサンプル 24 件が入っている。このデータはビルド時にバンドルへ取り込まれるため、差し替えには再ビルド（公開済みなら再提出）が必要である。あわせて同じ JSON を `https://www.genai-expo.com/eventlens/exhibitors.json`（`main.ts` の `REMOTE_DATA_URL`）に配置しておくと、通信できる端末は起動時に新しい `version` を取得でき、再提出なしでデータを更新できる。URL を変える場合は `REMOTE_DATA_URL` の定数を修正する。
2. **プライバシーポリシーの掲示** — Even Hub の公開審査に必要。「巡回リスト・メモ・訪問済み状態は端末内にのみ保存し、外部送信しない。出展者データの取得のみ通信を行う」という内容で足りる。

審査提出は Task 8 で生成した `out.ehpk` を使う。目標日は設計ドキュメントのとおり 2026-09-01。
