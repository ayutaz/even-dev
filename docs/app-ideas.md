# EVEN G2 アプリ・サービスアイデア集

EVEN G2 スマートグラスでの開発アイデアを、デバイス制約と既存サンプル群を踏まえて整理したもの。

---

## 1. デバイス能力・制約

G2 アプリは「ペアリングしたスマホ上の Flutter WebView (`flutter_inappwebview`) で動く Web アプリ」。ブリッジは `bridge.callEvenApp(method, params)` 経由で BLE 越しにメガネと通信する構造。

### 表示

- **解像度**: 両眼 micro-LED、576 × 288、グリーン単色 4bit 階調
- **視野角**: 約 27.5°
- **明るさ**: 最大 1200 nit（屋外可、直射日光下は読みづらい）
- **レイアウト制約**: 画像コンテナ最大 4、その他 8。フォント固定、左寄せのみ、背景色なし
- **任意ピクセル描画**: 不可。テキストと画像コンテナのみ

### 入力

- タップ / ダブルタップ / スクロール上下 / フォアグラウンド遷移 / 異常終了の 7 イベント
- 入力デバイス: テンプル側タッチパッド、または R1 リングのタップ・スクロール・長押し
- テキスト入力は不可

### バッテリー・装着

- 本体 48 時間、ケース込み 7 充電
- 軽量 1.26 oz、IP65、常時装着が実用的

### SDK ネイティブで取れるデータ

| データ | API |
|---|---|
| マイク PCM | `bridge.audioControl(true)` → 16 kHz / S16LE / mono |
| デバイス状態 | `bridge.getDeviceInfo()`（バッテリー、装着、充電、ケース、SN、モデル） |
| ユーザ情報 | `bridge.getUserInfo()`（uid / name / avatar / country） |
| 永続ストレージ | `bridge.setLocalStorage` / `getLocalStorage` |
| 入力イベント | タップ / リング / ヘッドジェスチャ |

### Web 標準 API 経由で取れるデータ（重要）

WebView 内で動くため、ブラウザの Web API がそのまま使える:

| データ | API | 実証アプリ |
|---|---|---|
| GPS | `navigator.geolocation` | even-stars |
| 方位・IMU | `DeviceOrientationEvent` / `DeviceMotionEvent` | even-stars |
| 任意の外部 API | fetch / WebSocket / WebRTC | weather, transit, reddit ほか |

### 取れないもの

- **カメラ**: G2 にハードウェアとしてレンズがない
- **スピーカー**: G2 にスピーカーは搭載されていない。TTS や BGM、音声出力アシスタントは **Bluetooth イヤホン or スマホ側** で鳴らす必要がある (マイクは存在: `bridge.audioControl(true)` で 16 kHz PCM)
- **スマホ着信・LINE 等の通知**: OS 通知を読む API なし
- **心拍・SpO2**: R1 リングのデータは公式アプリ専用、SDK 非公開
- **BLE 直接アクセス**: SDK 経由のみ

---

## 2. 既存サンプルアプリのカバー領域

時計 / タイマー / 天気 / ニュース (reddit) / ゲーム (chess, snake, pong, tetris, solitaire, make20, tamagotchi) / 読書 (epub) / 買い物 (smart-cart) / 交通 (transit) / 天体 (stars) / 太陽 (sunscout) / レシピ (kitchen) / メッセージ / ブラウザ / STT / メモ (visionote) / 世界時計

---

## 3. アイデア選定の指針

アイデアを評価する基準:

1. **物理的にスマホを取り出せない場面か** — 両手作業、運転、暗闇、相手との会話中
2. **視線をそらせない場面か** — 演奏、調理、運転、対面会話
3. **取り出すと失礼な場面か** — 商談、葬儀、初対面
4. **HUD の "視界の隅にちらっと" が体験価値か** — 詩的・物語的演出
5. **G2 のテキスト中心 UI が弱みでなく強みになるか** — 機能を絞った方が緊張下で使える

"スマホで充分なものはスマホでよい" を徹底する。

---

## 4. 有望テーマ 5 つ

### テーマ 1: 街そのものを物語装置にする — Locative Narrative

GPS + 方位 + AI で、歩いているその場所が体験コンテンツになる。

| アプリ | 内容 |
|---|---|
| **even-seichi** | アニメ聖地巡礼。聖地に近づくと作品の名セリフ・名シーン解説が降ってくる |
| **even-rekishi** | 歴史散歩。歩いている場所の江戸時代・幕末の様子を AI が短文で語る |
| **even-kaidan** | 怪談ナイトウォーク。事故物件・廃線跡・心霊スポットで怪談が読まれる |
| **even-fudoki** | 地誌。地元の伝承・民話 |
| **even-jinja** | 神社の歴史と参拝作法 |

**G2 必須な理由**: 歩きながら読む = スマホ画面注視は危険・没入崩壊。視界の隅にテキストが降ってくる体験が本質。

### テーマ 2: マイクが拾った瞬間に世界が広がる — Audio-Triggered Discovery

マイク PCM が取れることが G2 の隠れた強み。ある音が聞こえた瞬間に勝手に情報が降ってくる、能動的に検索しない受動的発見。

| アプリ | 内容 |
|---|---|
| **even-bird** | 鳥の鳴き声識別。Merlin Bird ID の HUD 版 |
| **even-shazam** | BGM が流れたら曲名がそっと表示 |
| **even-soundscape** | 環境音の解説。「これは○○線のホームの発車メロディ」 |

**G2 必須な理由**: スマホで Shazam を開く頃には曲が終わる。装着しっぱなしなので「気づいた瞬間」を逃さない。

### テーマ 3: 日常を文芸化する — Life as Narrative

| アプリ | 内容 |
|---|---|
| **even-narrator** | 自分の人生に三人称ナレーション。STT + GPS + AI で「彼は東京駅の改札を抜け、いつもの喫茶店へ向かった」 |
| **even-haiku-life** | 一日の出来事から夜に俳句が一首生成される |
| **even-monologue** | 村上春樹風・カフカ風・ジブリ風など、選んだ作家の文体で自分の日常がモノローグ化 |
| **even-haiku** | 毎日違う俳句・短歌・名言が朝降ってくる |

**G2 必須な理由**: スマホアプリでこれをやっても他人事だが、視界の隅に常に降ってくると「自分の人生が物語になっている」感覚が成立する。

### テーマ 4: 屋外で完結する AI 相棒 — Walking AI Companion

スマホで ChatGPT を開く面倒を消す。マイク + イヤホン + HUD で、歩きながら AI と対話。

| アプリ | 内容 |
|---|---|
| **even-walk-therapy** | 散歩しながらの感情整理。AI が傾聴と問い返し、HUD には要点だけ |
| **even-eikaiwa** | 歩きながらの英会話練習。AI が会話相手、間違いを HUD で修正 |
| **even-think-out-loud** | アイデアを声に出して整理。AI が要点を構造化して HUD に |
| **even-ai-callsign** | 「ねえ Claude」ウェイクワード→ 1 質問→ 1 行回答 |

**G2 必須な理由**: 散歩・通勤・移動中に「ちゃんと AI と話す」体験はスマホでは成立しない。

### テーマ 5: 場所と人をつなぐ — Location Social

| アプリ | 内容 |
|---|---|
| **even-tegami** | 場所に手紙を残す。特定の地点に近づいた人だけが読める文字メッセージ |
| **even-treasure** | リアル宝探し。友人が街に隠した宝（GPS ピン）を方位ヒントで探す |
| **even-ghost-walk** | 過去の自分の歩いた場所に「過去の自分のメモ」が降ってくる時間カプセル |

**G2 必須な理由**: 位置情報通知をスマホで受けると煩わしいだけ。HUD だと「場所と一体化した受信」になる。

---

## 5. 業務・実用方向のアイデア（参考）

エンタメではないが、「物理的にスマホ NG」な業務向け。B2B 単価が取れる方向。

| アプリ | 内容 |
|---|---|
| **even-cuecard** | 純粋なカンペアプリ。結婚式スピーチ・講演・YouTube 収録・葬儀の弔辞。既存 teleprompter への「AI 過剰で使えない」不満を解消 |
| **even-picking** | 倉庫ピッキング指示。WMS / API から「次: 棚 A-12 / 商品 X / 数量 3」を表示。両手フリー化 |
| **even-stylist-card** | 美容師・ネイリスト用 客カルテ。鏡越しに客と話しながらスマホは見られない |
| **even-score** | 演奏者の譜面・コード表示。ピアノ・ギター弾き語り。タブレット譜面台の置き換え |
| **even-face-caption** | 対面字幕。軽度難聴・補聴器補助。相手の顔を見ながら口元と字幕を同視 |

---

## 6. 推奨する優先順

### エンタメ路線で進めるなら

**第 1 候補: even-seichi（聖地巡礼）**

- 市場が既に存在（数百億円規模の確立した文化）
- G2 でしか成立しない（スマホは没入崩壊）
- 技術的成立性が高い（GPS + 事前の作品位置データ + 短文 HUD）
- コンテンツ拡張性（作品を増やすだけでカタログ拡大）
- 公式コラボの可能性（角川・京アニ等の権利元）

**第 2 候補: even-narrator（人生ナレーション）**

- 新規性が最強、既存のどのプラットフォームにもない
- 中二病・SNS インフルエンサー・ライター志望者に刺さる
- 課金導線が自然（作風切り替え: ジブリ風・カフカ風・村上春樹風）
- MVP 実装が小さい（STT + AI + 2 行 HUD）

### 業務路線なら

**第 1 候補: even-cuecard**

- コミュニティの明確な不満が観測されている（既存 teleprompter）
- スマホ NG の理由が決定的（観客が下向きの顔を見るのは致命的）
- 実装が極小、ターゲットが広い（結婚式・葬儀・授業・配信）

---

## 7. 参考リンク

- G2 開発ノート: https://github.com/nickustinov/even-g2-notes
- SDK: https://www.npmjs.com/package/@evenrealities/even_hub_sdk
- CLI: https://www.npmjs.com/package/@evenrealities/evenhub-cli
- Simulator: https://www.npmjs.com/package/@evenrealities/evenhub-simulator
- Community SDK: https://www.npmjs.com/package/@jappyjan/even-better-sdk
- UI components: https://www.npmjs.com/package/@jappyjan/even-realities-ui
- 既存アプリ実装参考: even-stars（GPS + 方位）、weather-even-g2（外部 API）、stt-even-g2（マイク PCM）

---

## 8. 外部リソースから収集したアイデア・事例（30 エージェント並列調査）

Reddit / X / YouTube / Hacker News / Qiita / Zenn / 競合 HUD グラスエコシステム / 業界事例の網羅調査。重複を除いた要点と出典のみを掲載。各項目末尾の記号は G2 実装可能性（◎ 容易 / ◯ 工夫すれば可 / △ 限定的 / × 不可）。

### 8.1 EVEN G2 公式コミュニティの生の声

#### Reddit r/EvenRealities（EvenHub Dev 募集スレが事実上の wishlist ハブ）

- **タイマー / ストップウォッチ強化**（EMOM / インターバル / Pomodoro）: "reminders and timers... not in any meaningful way" ◎
- **ジムリフトトラッカー**（"Do you EVEN Lift"）— 重量・rep・PR 表示 ◎
- **常駐タスクトラッカー（クエスト式 ADHD 向け）** ◎
- **Anki / フラッシュカード SRS** ◎
- **音声駆動メンタル計算 / 単位変換** ◯
- **ライブ会場曲名識別（Shazam 型）** ◯
- **Home Assistant / HTTP webhook 連携** — Tasker plugin 要望含む ◎
- **スポーツライブスコア（サッカー・野球・NBA・ピックルボール）** ◎
- **ギターチューナー / メトロノーム** ◯
- **ゴルフキャディ（距離・クラブ推奨）** ◯
- **ロケーションリマインダー（Humane AI Pin 風）** ◎

出典: https://www.reddit.com/r/EvenRealities/comments/1qh6bun/ , https://www.reddit.com/r/EvenRealities/comments/1svv1ju/ , https://www.reddit.com/r/EvenRealities/comments/1tdpnz7/ , https://www.reddit.com/r/EvenRealities/comments/1px4wnj/ , https://www.reddit.com/r/EvenRealities/comments/1szy2vi/

#### X / Twitter（英語圏・日本語圏）

- **g2_helloworld（任意テキスト WebSocket ブリッジ）** — 汎用 HUD 基盤 ◎ — https://x.com/Seg_Faul/status/2053462317988462908
- **Even Hub 提案（meditation guide / pickleball scorekeeper）** ◎ — https://androidguys.com/news/even-realities-even-hub-app-store-for-g2-smart-glasses-launches/
- **AI 推しキャラ（篠澤広）常駐エージェント** — 内蔵マイク STT → AWS キャラ AI → レンズ表示 ◎ — https://qiita.com/har1101/items/7d7b391f5edf376787f9
- **居酒屋ヒアリングサポート（騒音下話者キーワード抽出）** — 日本人レビュアー共通の要望 ◯ — https://www.moguravr.com/even-g2-smart-glasses-review-daily-use/
- **晴天用ハイコントラスト時計 / 通知モード** — 晴天下で読みづらい問題への対策 ◎ — https://note.com/yukihiko_a/n/n9cfa0eb160d1

#### Even Realities 公式（Even Hub 2026/4/3 ローンチ・約 50 アプリ・007 First Light コラボ）

- 公式予告: **Conversate + Prep Notes**（事前文書を会話中にサーフェス）/ **EvenLLM** / **Translate 35 言語** / **Teleprompt**（AI/Manual/Auto）
- 公式 widgets: QuickList / Calendar / Navigation / Music / Stocks / Weather
- レビュー由来の不満: **ダッシュボード カスタマイズ不可** / **詳細天気が欲しい** / **運転時ナビ未対応** / **クイック返信**（テキスト入力不可で △）

出典: https://www.evenrealities.com/smart-glasses , https://www.prnewswire.com/news-releases/youll-never-feel-unprepared-again-even-realities-g2-brings-conversation-support-prep-notes-to-smart-glasses-302725570.html , https://www.digitaltrends.com/wearables/even-realities-launches-even-hub-to-turn-g2-smart-glasses-into-a-full-app-ecosystem/ , https://www.trustedreviews.com/reviews/even-realities-g2

### 8.2 GitHub 上の未登録 G2 自作アプリ（apps.json 拡充候補）

| リポジトリ | 内容 | G2 |
|---|---|---|
| [tntpsu/Cue](https://github.com/tntpsu/Cue) | 会話アシスタント（面接/雑談/プレゼン）、AI 返答候補 | ◎ |
| [tntpsu/Pulse](https://github.com/tntpsu/Pulse) | カレンダー・タスク・天気・GitHub 通知の集約ダッシュボード | ◎ |
| [tntpsu/lyrics-glow](https://github.com/tntpsu/lyrics-glow) | タイムスタンプ付き歌詞同期カラオケ | ◎ |
| [tntpsu/Glance](https://github.com/tntpsu/Glance) | 3 層 Web 記事リーダー（RSS → 記事 → reader） | ◎ |
| [tntpsu/HouseGames](https://github.com/tntpsu/HouseGames) / [CardPack](https://github.com/tntpsu/CardPack) | カジノ系 4 種 + トランプ系 7 種 | ◎ |
| [Alireza29675/hevy-g2](https://github.com/Alireza29675/hevy-g2) | Hevy 連携ジムワークアウトロガー | ◎ |
| [aleapc/eyefit-g2](https://github.com/aleapc/eyefit-g2) | IMU で頭部追従、眼球運動誘導 | ◎ |
| [aleapc/breakmate-g2](https://github.com/aleapc/breakmate-g2) | ヘルスリマインダー + ピクセルアートキャラ | ◎ |
| [aleapc/storywalk-g2](https://github.com/aleapc/storywalk-g2) | GPS 連動 POI ストーリーテリング（Overpass/Wikipedia） | ◎ |
| [aleapc/hunter-g2](https://github.com/aleapc/hunter-g2) | OSRM 徒歩経路でスポット探索 | ◎ |
| [aleapc/speechcoach-g2](https://github.com/aleapc/speechcoach-g2) | STT で発話 WPM 矯正 | ◎ |
| [200even/flappy-g2](https://github.com/200even/flappy-g2) | タップ操作 Flappy Bird | ◎ |
| [sam-siavoshian/claude-code-g2](https://github.com/sam-siavoshian/claude-code-g2) | 音声で Claude Code を呼び出す | △ |

### 8.3 競合 HUD グラスエコシステムからの移植候補

#### Brilliant Labs Frame（最も近い競合 / カメラ依存を除けば移植容易）

- **AR Live Location Pin**（磁気センサ + 加速度センサで方位ピン）◎
- **Cloud STT 字幕（Google Speech）** — stt サンプルと別軸（長文連続字幕）◎
- **Live 翻訳 HUD** ◎
- **Wikipedia Viewer / ランダム記事 HUD** ◎
- **Teleprompter Universal**（UTF-8 テキストファイル）◎
- **Noa AI Assistant**（Perplexity/GPT-4 統合）◯

出典: https://github.com/brilliantlabsAR , https://github.com/CitizenOneX , https://docs.brilliant.xyz/frame/frame-sdk-flutter/

#### INMO Air 2 / INMO GO（中国製）/ RayNeo X2 / Rokid Glasses

- **AI 翻訳字幕**（98 言語、INMO GO の主力）◎
- **AI スマートテレプロンプター**（発話速度連動スクロール）◎
- **会議録音 + AI サマリー** ◯
- **INMO GPT 風 音声 → LLM → 表示** ◎
- **Voice Pay / 音声で配車・カフェ注文** ◯
- **AR Recording + Action Item 抽出** ◯

出典: https://www.inmoxr.com/pages/inmo-go3-ai-glasses , https://www.rayneo.com/pages/app-features-and-user-guide , https://global.rokid.com/pages/rokid-ai-glasses-style

#### Vuzix Blade / Xander（B2B + アクセシビリティ事例）

- **XanderGlasses 型ライブ字幕（VA 病院導入実績）** — G2 の中核機能と完全一致、$5000 級市場の代替候補 ◎
- **Fujitec エレベーター遠隔監査 / Amazon RME 設備保守** — 映像中継不可なので「位置情報 + チェックリスト + 音声メモ」に縮小 △
- **Fortune 100 倉庫遠隔訓練** — 手順書 HUD + 音声完了報告で再現可 ◯

出典: https://www.prnewswire.com/news-releases/vuzix-blade-powers-xanders-real-time-captioning-xanderglasses-for-the-deaf-and-hard-of-hearing-301715249.html , https://www.vuzix.com/

#### Meta Ray-Ban Display / Orion / Hypernova（公式・リーク）

- **歩行ターン・バイ・ターン・ナビ** — Meta Display の killer use case、自由経路（transit と非重複）◎
- **Live Captions**（周囲音声書き起こし → 下部スクロール）◎
- **リアルタイム翻訳字幕** ◎
- **Stocks / Calendar ウィジェット** ◯
- カメラ・ビデオ通話・Reels 鑑賞は G2 不可 ×

出典: https://about.fb.com/news/2025/09/meta-ray-ban-display-ai-glasses-emg-wristband/ , https://www.uploadvr.com/meta-ray-ban-display-first-major-os-update-new-app-minigames-features/

#### Apple Vision Pro "glanceable / passive" 系（G2 HUD と思想が一致）

- **Day Ahead**（縦バー + 色付きドロップで一日可視化）◎
- **GlanceBar**（時刻・天気・予定・バッテリーの縦スタック）◎
- **Sticky Vision**（空間付箋 → G2 では音声入力での付箋追加）◯
- **Visutate**（呼吸誘導の passive UI）◎
- **Visual Countdown Timer** ◎

出典: https://www.macstories.net/reviews/vision-pro-app-spotlight-day-ahead/ , https://appsforapplevision.com/

#### スポーツ HUD（ActiveLook / ENGO / Solos / Garmin Varia / REKKIE）

- **GPS ペース / スピード / 平均-最大** ◎
- **ターン・バイ・ターン徒歩-自転車ナビ**（OSRM fetch + 矢印）◯
- **インターバル進捗ゲージ**（目標 vs 実値）◎
- **エレベーションゲイン + 上昇速度（Vario）** ◯
- **ラップ / スプリット履歴** ◎
- **ブレッドクラム（走行軌跡 mini-map）** ◯
- **斜度計（Slope Angle Meter）** — 雪崩 30-45° ゾーン警告 ◎

出典: https://engoeyewear.com/ , https://help.activelook.net/ , https://www.onxmaps.com/backcountry/app/features/avalanche-slope-angle

### 8.4 業界・職能別ユースケース

#### 医療・看護・介護

- **音声 → EHR スクライブ（Augmedix 型）** ◎
- **バイタル監視 HUD**（5 秒更新で HR/SpO2/BP/RR）◎
- **CPR / BLS プロトコルガイド + 圧迫テンポメトロノーム** ◎
- **Parkinson 視覚キューイング歩行支援**（横ライン流し、IMU 連動）◎
- **認知症ケア服薬リマインダー（顔認識を抜いた版）** ◎
- **NEWS2 早期警告スコア表示** ◎

出典: https://www.augmedix.com/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC5468397/ , https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0250122

#### 教育・学習・ADHD・dyslexia

- **講義テレプロンプター**（教員/塾講師の聴衆アイコンタクト維持）◎
- **Anki / FSRS フラッシュカード** ◎
- **Smart Pomodoro + 視野隅プログレスバー** ◎
- **Narbis 風 ADHD ニュートラル・キュー** ◯
- **Dyslexia リーディング・ペーサー**（1 行ずつ大文字自動進行）◯
- **発音シャドーイング**（マイク → 音素スコアリング）◯
- **小学校教員 タイムキーパ + 名簿** ◎
- **フィールドワーク・ガイド**（GPS 観察ポイント）◎

出典: https://docs.ankiweb.net/ , https://www.narbis.com/ , https://www.tandfonline.com/doi/full/10.1080/10447318.2025.2542886

#### 翻訳・聴覚アクセシビリティ

- **対面会話ライブ字幕**（XanderGlasses 型）◎
- **講義字幕 + 後でテキスト書き出し** ◎
- **会議話者番号付与字幕**（[#1]/[#2] スクロール履歴）◯
- **多言語 → 母語翻訳字幕**（DeepL / MyMemory fetch）◎
- **劇場 SRT 同期字幕**（マイク fingerprint で同期）◯
- **環境音検知**（サイレン・名前呼び・接近音を文字通知）◯
- **医療面談特化辞書 STT** ◎
- **NoiseMeter**（dB レベル + 会話可能度バー）◎

出典: https://www.xanderglasses.com/ , https://www.transcribeglass.com/ , https://xrai.glass/ , https://www.hearingtracker.com/hearing-glasses/

#### 音楽・パフォーマンス

- **AugmentedChords** — G1 で既に実装あり（MusicXML → ビットマップ）◯ — https://github.com/kevinlinxc/AugmentedChords
- **ChordPro リーダー + auto-scroll + 移調** ◎
- **LivePrompter 風セットリスト管理** ◎
- **LRC タイムド歌詞 + AcoustID 楽曲識別** ◯
- **マイク FFT チューナー + コード進行表示** ◎
- **ストリーマー配信台本 + コメント要約** ◯
- **メトロノーム ビジュアルクリック** ◎

出典: https://www.chordpro.org/ , https://www.liveprompter.com/ , https://news.ycombinator.com/item?id=43906442

#### 観光・文化施設

- **VoiceMap 型 GPS 自動発火セルフガイド街歩き** ◎ — https://voicemap.me/
- **Detour 復刻（Bose 買収済・終了）** ◎ — シネマ品質ナレーション
- **izi.TRAVEL CMS**（25000 ツアー / 2500 都市）◎ — https://izi.travel/
- **GuideAlong / Just Ahead**（国立公園ハイキングガイド）◎
- **ECHOES サウンドウォーク** ◯ — https://echoes.xyz/

#### アウトドア・冒険

- **斜度計（Slope Angle Meter）** — IMU のみ、最小実装 ◎
- **Pace HUD（ENGO 代替）** ◎
- **Solunar / 潮汐ウォッチ** — tides4fishing / NOAA fetch ◎
- **Vario 上昇率**（パラグライダー・トレイル）◎
- **Peak Finder**（コンパス + 高度 + OSM peak DB）◯
- **キャスト / ジャンプ自動記録**（IMU で滞空時間・最大 G）◎

出典: https://engoeyewear.com/ , https://tides4fishing.com/ , https://www.hoolan.app/

#### 倉庫・産業

- **Pick-by-Vision（Picavi 型）** — 棚番号・数量を大文字 HUD ◎
- **DHL Vision Picking 25% 効率向上**（バーコード抜き、音声完了報告版）◯
- **設備点検チェックリスト**（GPS 現場特定 → 手順表示 → 音声記録）◎
- **DIY 修理ステップガイド**（IKEA / 車種ライブラリ fetch）◎
- **OBD-II データ HUD**（BLE 別端末経由）◯

出典: https://www.picavi.com/ , https://realwear.com/ , https://group.dhl.com/en/media-relations/press-releases/2019/dhl-supply-chain-deploys-latest-version-of-smart-glasses-worldwide.html

### 8.5 AI always-on wearable パターン（AI Pin / Rabbit R1 / Limitless / Friend の失敗を G2 で救済）

- **Ambient Recap HUD** — 30 秒ごとに「今の話題 / 次のアクション」1 行表示。Pin/Friend は音声出力で他人に聞かれる問題を視覚出力で解決 ◎
- **Speaker Cue Card** — 話者識別 + 過去発言要約 ◯
- **Promise Tracker** — 「明日までに送る」を IMU 頷きでマーク ◎
- **Pre-Meeting Briefing** — GPS で会議室到着検知 → 議事録 + 相手名前 プッシュ ◎
- **Memory Recall** — 過去録音検索 → タップで該当箇所サマリ ◯
- **AI Coach Whisper** — 会話のトーン分析 → 「声が大きい」「相手が黙っている」を視覚通知のみで ◯
- **Voice Memo Index** — タップ長押し録音 → タイトル候補スクロール選択 ◎
- **Sleep / Posture Nudge** — IMU + マイク無音時間で集中度推定、1 時間ごと指標 ◎

出典: https://www.unite.ai/what-went-wrong-with-the-humane-ai-pin/ , https://help.limitless.ai/en/articles/9124757-pendant-faq , https://www.tomsguide.com/ai/i-wore-friend-the-ai-companion-that-listens-all-day

### 8.6 ロングテール / 新規着想（HN / Tildes / Level1Techs / その他）

- **製品電子マニュアル**: 型番を音声で言うと該当章を HUD に — https://news.ycombinator.com/item?id=41808955
- **Guardian Angel ナイトナッジ**: 夜間 / 治安データ / 時刻で警告 ◯
- **PubMed / Wikipedia 即時 lookup（voice query）** ◎
- **AR Speaking Coach（フィラー語 / WPM 分析）** ◎ — テレプロンプター系と別軸
- **Korean Theatre cue HUD** — 演目の進行 cue を時刻同期配信 ◯ — https://www.digitaltrends.com/cool-tech/smart-glasses-are-finding-a-surprise-niche-korean-drama-and-theater-shows/
- **方向別音量バー（聴覚補助）** — 前 / 横の dB を計測 → 騒音源回避 ◎
- **顕微鏡 / 測定器 telemetry HUD**（MQTT fetch）◯
- **健康 / 視覚ヘルス・ナッジ（20-20-20 / 水分 / 姿勢）** ◎
- **Vet / Winemaker 職人ログ**（樽番号 / 患畜 ID を声でメモ）◎
- **SSH / CLI クライアント（音声入力 / 4 行 stdout）** ◯
- **Claude Code / Codex 承認リモコン** — permission request を Tailscale 経由で承認/拒否 ◎ — https://zenn.dev/wmoto_ai/articles/claude-code-even-g2-glasses
- **Obsidian / Notion Live Consulting** — 面談中にナレッジから関連助言 5 件 ◯ — https://note.com/daily_ai_shin/n/n88e1e7b842fa
- **tmux-on-G2**（リモート端末ミラー、FastAPI + WebSocket）◯ — https://note.com/toru_hosokawa/n/n09c3120d65a8
- **MacroDroid 連携ダッシュボード**（Android HTTP サーバを fetch）◯
- **Pollinations 画像生成 → G2 表示** — 4bit 緑にディザ ◯
- **AI 開発ジョブ完了通知**（Claude Code / ChatGPT の完了を Webhook → HUD）◎

### 8.7 G2 で実装困難 / 不向き（除外推奨）

- **カメラ依存**: 物体認識、バーコード読取、顔/表情認識、AR 重畳、OCR、Shazam 視覚版、料理カロリー推定、ボディカム
- **通知読取依存**: スマホ着信 / LINE 通知、INMO 型通知リレー、Google Maps Nav 通知
- **BLE 直接アクセス**: 心拍ストラップ、独自プロトコル魚探、防爆認証機器
- **スピーカー無し**: TTS、BGM 再生、音声出力アシスタント
- **4 bit 緑単色 / 576x288**: 動画再生、Steam Link、マルチウィンドウ、解剖画像細部、リッチカラーグラフィック
- **テキスト入力不可**: フリーフォーム返信、メール作成、長文編集、Strava OAuth 認証（PKCE）

### 8.8 新規実装候補（差別化大・既存 20 アプリ非重複・◎ 評価のみ）

優先度の高い順:

1. **even-livecaption** — Xander 型対面ライブ字幕。$5000 級アクセシビリティ市場の代替。stt と差別化（連続スクロール + 言語切替 + 履歴）
2. **even-slope** — IMU だけで動く斜度計 + 雪崩ゾーン警告。最小実装・需要明確
3. **even-pace** — ENGO/Solos 代替の GPS ペース HUD（ラン/サイクル）
4. **even-prompter** — Even 公式テレプロンプター強化版（フィラー検知 + Q&A カンペ + 箇条書きモード）
5. **even-anki** — SRS フラッシュカードの HUD 表示（一日中ランダム 1 枚）
6. **even-pomodoro** — 視野隅プログレスバー + IMU 装着検知
7. **even-vario** — 上昇率 + 累積標高（パラ/トレイル両用）
8. **even-recap** — Limitless 型 ambient 会議要約（30 秒ごと「今の話題」表示）
9. **even-promise** — 口頭コミットメント抽出 + IMU 頷きマーク
10. **even-voicemap** — VoiceMap 型 GPS 連動街歩きツアー（izi.TRAVEL fetch）
11. **even-dashboard** — Pulse 型カレンダー/タスク/天気/通知の集約ウィジェット
12. **even-cpr** — CPR 圧迫テンポメトロノーム + AHA プロトコル進行
13. **even-cclaude** — Claude Code / Codex 承認リモコン（PC 前にいなくても OK）
14. **even-chord** — マイク FFT チューナー + コード進行 + 視覚メトロノーム
15. **even-noisemeter** — dB + 方向別音量バー（聴覚補助 / 自衛）

---

### 8.9 主要参考リンク（本セクション全体）

- Reddit r/EvenRealities: https://www.reddit.com/r/EvenRealities/
- Even Hub 公式ローンチ: https://www.digitaltrends.com/wearables/even-realities-launches-even-hub-to-turn-g2-smart-glasses-into-a-full-app-ecosystem/
- GitHub topic even-g2: https://github.com/topics/even-g2
- Brilliant Frame コミュニティ: https://github.com/CitizenOneX
- Meta Ray-Ban Display: https://about.fb.com/news/2025/09/meta-ray-ban-display-ai-glasses-emg-wristband/
- Vuzix Xander 提携: https://www.prnewswire.com/news-releases/vuzix-blade-powers-xanders-real-time-captioning-xanderglasses-for-the-deaf-and-hard-of-hearing-301715249.html
- ENGO Eyewear: https://engoeyewear.com/
- ActiveLook プロトコル: https://www.activelook.net/
- VoiceMap: https://voicemap.me/
- AugmentedChords（G1 実装）: https://github.com/kevinlinxc/AugmentedChords
- 日本コミュニティハブ: https://zenn.dev/takashicompany/articles/cacedc49c7c9c4 , https://zenn.dev/miyaura/articles/eveng2-part1-getstarted-0ed90d3aa144e8
- HN 主要スレッド: https://news.ycombinator.com/item?id=45981113（Even G2）, https://news.ycombinator.com/item?id=43906442（Sheet music）, https://news.ycombinator.com/item?id=41808955（Killer app AR glasses）, https://news.ycombinator.com/item?id=45140381（MentraOS）

---

## 9. 学習フェーズの再現ロードマップ（本人資産活用版）

現フェーズは EVEN G2 の **SDK 知見を貯めるための試行期間**。既存事例 (国内・海外) と機能が被ることは問題視せず、**再現・模倣でハマり所を体で覚える** ことを優先する。独自性は知見が貯まった後で組み立て直す。

### 9.1 本人資産マップ（G2 と接続可能性の高いもの）

#### TTS / 音声合成エコシステム（中心軸）

| リポジトリ / プロジェクト | 役割 | G2 接続例 |
|---|---|---|
| [`piper-plus`](https://github.com/ayutaz/piper-plus) (160 ⭐) | 6 言語対応の軽量ニューラル TTS | G2 上のテキストを Bluetooth イヤホン経由で読み上げ |
| `piper-plus-web-demo` | WASM ブラウザ TTS デモ | G2 アプリ (WebView) にそのまま組込 |
| `piper-plus-g2p` / [`cc-g2pnp`](https://github.com/ayutaz/cc-g2pnp) | 純 MIT 多言語 G2P | 多言語アプリの音素変換 |
| `piper-plus_lip-sync_live2d` | Live2D × TTS リップシンク | HUD マスコットの基盤 |
| `godot-piper-plus` / [`uPiper`](https://github.com/ayutaz/uPiper) | Godot / Unity 統合 | ゲーム連動 TTS |
| [`uCosyVoice`](https://github.com/ayutaz/uCosyVoice) / `uStyle-Bert-VITS2` / `uZipVoice` | 競合 TTS の Unity 実装 | 話者バリエーション |
| `はるなさん歌声` / `はるなさん音声` | 個別学習話者データセット | 推し駆動の生活パートナー |
| `LongCat-AudioDiT` / `MioTTS-Inference` / `faster-qwen3-tts` | 拡散モデル系 TTS の研究 | 高品質 TTS の選択肢 |

#### 音声変換 / 解析

| リポジトリ | 役割 |
|---|---|
| [`kawaii-voice-changer`](https://github.com/ayutaz/kawaii-voice-changer) (112 ⭐) | F0/F1-F3 リアルタイム変換 (WORLD Vocoder) |
| `X-VC` / `research-kawaii-voice` | 音声変換研究 |
| `FlowW2N` | ささやき → 通常声 (Flow Matching) |
| `vocal-tract-synth` / `vowel-playground` | 声道合成・フォルマント可視化 |
| `Retrieval-based-Voice-Conversion-WebUI` | RVC ベース話者変換 |

#### STT / リアルタイム音声

| リポジトリ | 役割 |
|---|---|
| [`faster-whisper-server`](https://github.com/ayutaz/faster-whisper-server) | Whisper サーバ |
| `convert-whisper-unity-onnx` | Whisper ONNX 化 |
| [`UniRealtime`](https://github.com/ayutaz/UniRealtime) | OpenAI Realtime API クライアント |
| [`uni-llm-voice-chat`](https://github.com/ayutaz/uni-llm-voice-chat) (22 ⭐) | Whisper + llama.cpp + TTS パイプライン |
| Moonshine Voice 検証 (はてな記事) | オンデバイス STT |

#### AITuber / マスコット系

| リポジトリ | 役割 |
|---|---|
| [`uDesktopMascot`](https://github.com/ayutaz/uDesktopMascot) (346 ⭐) | デスクトップマスコット OSS |
| `nemu-aituber` / `nemu` / `nemu-discord-bot` | AI VTuber キャラ実装 |
| `asmr-aituber` / `asmr-aituber-ref` | ASMR コンテンツ AITuber |
| `live2d-movie-to-motion` / `movie-to-live2d` | 動画 → Live2D モーション |
| `3d-model-pv` | 3D モデル PV |

#### ツール / 自動化

| リポジトリ | 役割 |
|---|---|
| `claude-usage-dashboard` | Claude API 使用量ダッシュボード |
| `self-time-manager` | 自己タイムマネジメント |
| `notion-task-watch` / `Notion-Watch-Task-Notification-discord` | Notion タスク監視 |
| `discord-mcp` / `google-mcp` / `godot-loop-mcp` | MCP サーバ群 |
| `auto-short-movie` / `office-auto-product` | 自動化系 |
| `convert_and_quantize_model` | HF → ONNX/ORT 量子化 |

#### シミュレーション / データ

| リポジトリ | 役割 |
|---|---|
| `LLM-Economist` / `project-sid` | マクロ経済 × LLM エージェント |
| `timesfm` | 時系列予測 |
| JAXA Earth API 連携 (はてな記事) | 衛星データ可視化 |

#### Brilliant Frame 検証（はてなブログ 4 記事）

- [Frame を Mac から動かす](https://ayousanz.hatenadiary.jp/entry/2026/05/10/180318)
- [Frame で写真を撮る](https://ayousanz.hatenadiary.jp/entry/2026/05/10/182137)
- [Frame に日本語を表示](https://ayousanz.hatenadiary.jp/entry/2026/05/10/183420)
- [Frame のマイクで録音](https://ayousanz.hatenadiary.jp/entry/2026/05/10/203911)

### 9.2 国内既出事例（学習用に再現する対象として有効）

| アプリ | 機能 | 学べる SDK 領域 |
|---|---|---|
| **ミライの AR ラジオ** | ハンズフリー ニュース自動配信、AI キャラ「ミライ」、毎日数百件のニュース AI 解説、グラスマイク音声通話、プロアクティブ AI、ゲーム 8 種・ツール 6 種・クイズ・朝刊・天気、日英対応 | RSS fetch / LLM 要約 / キャラ画像表示 / マイク音声通話 / バックグラウンドタイマー / localStorage / 多言語切替 |
| **iPhone カメラ → G2 表示**（個人開発） | iPhone カメラ映像を AI 認識しつつグラスに表示、ディザリング + ガンマ補正 | 画像コンテナ 200x100 / Floyd-Steinberg 等ディザ / WebSocket or fetch ストリーミング |
| **大声操作 横スクゲーム**（個人開発） | マイク音量でキャラを操作するアクションゲーム | PCM RMS 解析 / ゲームループ / タップ操作 / 画像コンテナアニメーション |

### 9.3 SDK 機能カバレッジ × 再現案マッピング

| # | 再現案 | テキスト | 画像 | タップ | マイク | GPS | IMU | fetch | localStorage | 流用元 |
|---|---|---|---|---|---|---|---|---|---|---|
| 00 | base_app 改造 | ◎ | | ◎ | | | | | | `apps/base_app` |
| 01 | stt 字幕クローン | ◎ | | ◎ | ◎ | | | ◎ | | `stt-even-g2` |
| 02 | weather クローン | ◎ | | ◎ | | ◎ | | ◎ | ◎ | `weather-even-g2` |
| 03 | stars クローン | ◎ | | ◎ | | ◎ | ◎ | ◎ | | `even-stars` |
| 04 | epub クローン | ◎ | | ◎ | | | | ◎ | ◎ | `epub-reader-g2` |
| 05 | visionote クローン | | ◎ | ◎ | | | | ◎ | ◎ | `visionote` |
| 06 | iPhone カメラ → G2 再現 | | ◎ | ◎ | | | | ◎ | | 国内既出 |
| 07 | 大声横スクゲーム再現 | | ◎ | ◎ | ◎ | | | | | 国内既出 |
| 08 | Tamagotchi 派生 | ◎ | ◎ | ◎ | | | ◎ | | ◎ | `EVEN-G2-Tamagotchi` |
| 09 | ミライラジオ mini クローン | ◎ | ◎ | ◎ | ◎ | | | ◎ | ◎ | 国内既出 |
| 10 | piper-plus WASM 組込 | ◎ | | ◎ | | | | ◎ | | `piper-plus-web-demo` |
| 11 | Live2D 量子化マスコット PoC | | ◎ | ◎ | ◎ | | ◎ | ◎ | | `piper-plus_lip-sync_live2d` |
| 12 | kawaii-voice HUD UI | ◎ | | ◎ | ◎ | | | | ◎ | `kawaii-voice-changer` |
| 13 | storywalk クローン | ◎ | | ◎ | | ◎ | ◎ | ◎ | ◎ | `aleapc/storywalk-g2` |
| 14 | tntpsu/Cue クローン | ◎ | | ◎ | ◎ | | | ◎ | | `tntpsu/Cue` |
| 15 | tntpsu/Pulse クローン | ◎ | ◎ | ◎ | | | | ◎ | ◎ | `tntpsu/Pulse` |
| 16 | claude-usage HUD | ◎ | | ◎ | | | | ◎ | ◎ | `claude-usage-dashboard` |
| 17 | nemu-aituber HUD (総合演習) | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ | `nemu-aituber` |

### 9.4 推奨学習経路（フェーズ別）

#### フェーズ 0 — 環境慣らし（半日）

- **00. base_app を実機で動かす** — Hub に接続、Counter+1/-1 と Sync が通る確認。SDK セットアップ・ペアリング・QR サイドロード・`apps.json` 更新ループを一周。

#### フェーズ 1 — SDK 機能を 1 個ずつ独立に触る（各 1〜2 日）

マイクが一番ハマり所が多いので早めに潰す。

- **01. stt クローン** → マイク 16 kHz PCM のキャプチャ・ストリーミング送信・字幕描画
- **02. weather クローン** → `navigator.geolocation` + `fetch` で OpenWeather / Open-Meteo
- **03. stars クローン** → IMU で方位、Astronomy Engine 等で星座計算
- **04. epub クローン** → 長文ページング、localStorage で読書位置保存
- **05. visionote クローン** → 200x100 画像コンテナ最大 4 枚の描画限界を体で覚える

ここまでで SDK の主要 API はおおむね一周する。

#### フェーズ 2 — 既出国内事例の再現（各 2〜3 日）

- **06. iPhone カメラ → G2 再現** → スマホ側で `getUserMedia` → Canvas で Floyd-Steinberg ディザ → 緑チャンネル抽出 → 200x100 PNG 連投。**ディザリング知見は Live2D 量子化マスコットへ転用可**
- **07. 大声横スク再現** → PCM 音量を RMS で取り、キャラのジャンプにマップ。マイク + ゲームループ
- **08. Tamagotchi 派生** → IMU 振動でお世話、localStorage で永続
- **09. ミライラジオ mini クローン** → RSS fetch → LLM 要約 (Claude/Gemini API) → テキスト + キャラ画像ローテーション

#### フェーズ 3 — 自前資産との合体（各 3〜5 日）

- **10. piper-plus WASM 組込** → `piper-plus-web-demo` を Vite に取り込み、Bluetooth イヤホン経由で再生
- **11. Live2D 量子化マスコット PoC** → フェーズ 2 の 06 で身につけたディザを Cubism Web に適用、差分送信 fps を実測、`piper-plus_lip-sync_live2d` のリップシンクを移植
- **12. kawaii-voice HUD UI** → WORLD パラメータ (F0 / F1-F3) を R1 スクロールで調整、変換波形を 200x100 で可視化

#### フェーズ 4 — 海外コミュ作の再現（各 2 日）

- **13. storywalk クローン** → GPS POI ストーリーテリングの完成系
- **14. Cue クローン** → 会話アシスタントの基礎
- **15. Pulse クローン** → マルチカードダッシュボードの組み方

#### フェーズ 5 — 自分用ツール / 総合演習

- **16. claude-usage HUD** → 既存 `claude-usage-dashboard` をそのまま G2 化。「本当に毎日使う」最初の G2 アプリ
- **17. nemu-aituber HUD** → 全機能投入の総合作 (Live2D + piper-plus + STT + IMU + GPS + LLM)

### 9.5 着手推奨

学習効率の高い順:

1. **フェーズ 0** (base_app 実機接続)
2. **フェーズ 1-01** (stt クローン) — マイク 16 kHz PCM のハマり所を最初に潰す
3. **フェーズ 2-06** (iPhone カメラ → G2 再現) — ディザリング + ガンマ補正のノウハウは **11. Live2D 量子化マスコット** と直結

ここまでで「G2 でできること / できないこと」の体感が完成する。以降は自分の資産 (piper-plus / kawaii-voice / nemu) を載せる方向に進む。
