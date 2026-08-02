# Even G2 / Even Hub ストア調査

調査日: 2026-07-27（日本時間）  
目的: Even G2向けアプリをリリースする前提で、Even Hubに掲載されているアプリの傾向、競合、技術的な可能性、公開時の注意点を把握する。

## 先に結論

- Even Hubは、Even Realitiesアプリ内からG2向けプラグインを検索・インストールするアプリストアである。
- 2026年6月1日時点のユーザーによる全件スナップショットでは、アプリ見出しが245件あった。重複名を含むため、ユニーク件数とは一致しない。
- 2026年7月のEven Day Japanに関する報道では、公開アプリは500本超、登録開発者は約5,000人、個人用の非公開アプリは約4,000本と説明されている。ストアは現在も急速に増加している。
- 掲載アプリの中心は、天気・ニュース・タイマー・メモ・読書・音楽・ナビ・AI・ゲーム・車/スマートホーム連携である。
- G2で価値が出やすいのは、スマートフォンアプリの完全な代替ではなく、「手を使わず、視界の隅で短時間確認する」情報・操作である。
- タイマー、時計、天気、簡易メモ、汎用AI、ミニゲームはすでに競合が多い。新規アプリは、特定の場面・地域・職種に絞るか、設定の簡単さで差別化する必要がある。
- 公式規約上、金融、健康・医療、教育・訓練、インスタントメッセージ、子ども向けなどは現在の新規公開に制限がある。既存ストアに似たアプリがあっても、新規公開可能とは限らない。

## 1. 調査範囲と限界

Even Hubのストア一覧は、通常のWebページとして全件公開されているわけではない。公式案内では、Even RealitiesアプリのEven Hubタブからカテゴリ検索・曖昧検索・詳細確認・インストールを行う仕組みになっている。

そのため、今回の調査は次の情報を突き合わせた。

1. Even Realities公式のEven Hub案内、開発ドキュメント、開発者規約
2. 2026-06-01時点の全件スナップショットを作成した日本語記事
3. 2026年7月のEven Day Japanに関するイベント報道
4. 実機レビューとユーザーの利用報告

したがって、以下のアプリ名一覧は「2026-06-01時点の公開スナップショット」と「公式ガイド画像で確認できる例」が中心であり、2026-07-27時点の完全な現行一覧ではない。現行の正確な一覧・地域差・個別アプリの公開状態は、Evenアプリ内で確認する必要がある。

## 2. ストアの規模と仕組み

### 2.1 ユーザー側

公式案内によると、ユーザーはEven RealitiesアプリのEven Hubタブからアプリを探し、詳細画面でG2上の表示例を確認してインストールできる。インストール後のプラグインはスマートフォン側のホーム画面に追加され、G2のメニューに表示するアプリも選択できる。公開アプリと、招待制のBetaアプリは別々に管理される。

参照: [Even Hub公式案内](https://support.evenrealities.com/hc/en-us/articles/15688149217167-Even-Hub)

### 2.2 規模の推移

| 時点 | 確認できる規模 | 根拠 |
|---|---:|---|
| 2026-04頃 | 公式ガイド画像に主要アプリが掲載 | Weather、Timer、DisplayPlus Music、Live Newsなど |
| 2026-06-01 | 245件のアプリ見出しを確認（重複名あり） | ユーザーによる全件スナップショット |
| 2026-07-17前後 | 公開アプリ500本超、登録開発者約5,000人、非公開アプリ約4,000本 | Even Day Japanの報道 |

出典: [2026-06-01全件スナップショット](https://note.com/gpsnmeajp/n/n9d35da180670)、[Even Day Japan報告](https://www.moguravr.com/?p=319093)、[同イベントの別報道](https://dig-it.media/thundervolt/article/905660/)

6月の245件と7月の500本超は、調査方法や「公開アプリ」の定義が異なる可能性があるため、単純に倍増と断定はしない。ただし、短期間で掲載数が大きく増えていることは確かである。

## 3. 掲載アプリのカテゴリマップ

以下は、2026-06-01スナップショットに掲載されたアプリを中心に、用途別に整理したものだ。同じアプリが複数カテゴリに当てはまる場合がある。

| カテゴリ | 代表例 | 観察 |
|---|---|---|
| 情報・ニュース・Web | Weather、Live News、Web Scope、ER Browser、Reddit Feed、Wikipedia Glass、FeedLens、RSS Ticker、NewsLake G2 | G2の「ちら見」価値と相性がよく、中心カテゴリの一つ |
| 読書・文書 | EPUB Reader、ePub Book Reader、青空文庫リーダー、PDF Reader、DocuLens、Docs Reader、Notion、G2-md-browser | 日本語コンテンツや、スマホを見にくい場面に用途がある |
| 時間・メモ・仕事 | Timer、Pomodoro Timer、G2 Pomodoro、Quick Memo、Notes、Simple Notes、Simple Calendar、G2 Calendar、Checklist、TodoLens、Voice Recorder | 便利だが、同種アプリが非常に多い |
| AI・音声・思考支援 | OcuClaw、Sensemaker、Thought Partner、Caduceus、Local LLM、OpenVide、VoiceInk、G2 Fact Check、Interview Trainer、SalesEye | 成長カテゴリ。ただし外部AI・サーバー・API設定が必要な例もある |
| 音楽・メディア | DisplayPlus Music、Lyric Lens、Spotify Lyrics、Sing with You、Jellyfin、YT Captions、LiveStream Comment | 音楽情報や字幕の表示が中心。サービス依存が強い |
| ナビ・交通・旅行 | OEC東京スカウター、SubwayLens、LTA Buses、Transit Switzerland、NextStop Paris、Kangaroo、Norway Transit、Glass Transit 511、Merlion Travel、RoadView、Flight Tracker | 地域特化が多く、日本向けの余地もあるがデータ供給が必要 |
| 車・スマートホーム・開発者向け | Tesla、Tesla Controls、SmartThings、HA Glance & Control、TV Remote_HUD、Proxmox Remote、Fronius solar.web、APITrigger、G2Commerce Monitor | G2から外部サービスを操作する用途。設定・認証・安全性が課題 |
| フィットネス・生活 | ER Workout、Lift Heavier、RunG2、Neck Lift、Stillness、Smokeless、ER Kitchen、Birdie、SommNI、Bartender、Pour-Over Helper | 生活の場面に入り込めるが、健康関連は公開規約に注意 |
| ゲーム | Chess、PixelPet、Snake、Solitaire、Blocks、Bricks、Minesweeper、Trivia、Blackjack、Paddle、G2oom、Panspermia、Sliding Puzzle | 作品数が多く、短時間プレイとリング操作が主な設計パターン |
| 宗教・趣味・ニッチ用途 | BibleLens、Noor Quran、Noor Prayer、Liturgy of the Hours、Religious Scroll、Card Counting、Film Exposure Meter、Music Key Detector | 小規模でも特定ユーザーには価値があるロングテール |

全件に近い名前・説明の確認には、[Segment氏の2026-06-01調査](https://note.com/gpsnmeajp/n/n9d35da180670)を参照する。

## 4. 公式ガイドと初期人気から見えること

公式のEven Hubガイド画像では、次のアプリがストアの目立つ位置に表示されている。

- OcuClaw: 複数のAIモデルを扱うエージェント型AI
- Weather: 天気予報
- Timer: カウントダウンタイマー
- DisplayPlus Music: Spotify情報・アルバムアート・歌詞
- Live News: ニュース・天気・ゲームなどの配信
- ER Browser: Web閲覧
- Visionote: 写真・画像表示
- ConDash: カスタマイズ可能なダッシュボード

公式ガイドの「Most downloaded」画面でも、Weather、Timer、DisplayPlus Music、Live News、ER Browser、Visionote、ConDash、OcuClawが上位に並んでいる。これは現在のランキングではなく、ガイド作成時点のスナップショットとして扱うべきだが、初期ユーザーが求める方向性は読み取れる。

## 5. G2で実現できること

公式ドキュメントによると、Even HubのプラグインはHTML/CSS/JavaScriptまたはTypeScriptで作るWebアプリであり、Even Hub SDKを通してG2と接続する。現時点で公開されている主な開発面はプラグインである。

G2側で利用できる主な要素は次の通り。

- 片眼576×288の単色グリーン表示
- タップ、ダブルタップ、上下スワイプ
- オプションのR1リング入力
- 4マイクアレイからの音声入力
- スマートフォン経由のネットワーク/API連携
- Webアプリからのテキスト、画像、ゲーム画面、外部データ表示

G2にはカメラとスピーカーがなく、処理・通信は主にスマートフォン側で行う。したがって、音声出力を前提とするアプリや、G2カメラによる視界解析を前提とするアプリは、このプラットフォームの標準機能だけでは成立しない。

参照: [Even Hub開発ドキュメント](https://hub.evenrealities.com/docs)

## 6. 競争状況とユーザー体験上の課題

### 6.1 競合が多い領域

- 時計、タイマー、ポモドーロ
- 天気、ニュース、RSS
- メモ、チェックリスト、カレンダー
- 汎用AIチャット
- EPUB/PDF/Webリーダー
- シンプルなゲーム
- 株価・暗号資産表示

これらは既存アプリを参考にしやすい一方、機能を少し足しただけでは埋もれやすい。

### 6.2 競合が分散している領域

- 東京・特定都市の公共交通
- Tesla、SmartThings、Home Assistantなどの個別連携
- 特定の仕事・趣味向けHUD
- 特定言語・地域の読書・ニュース
- 特定の外出・移動・作業シーン向けアプリ

これらは市場規模が小さくても、対象ユーザーの課題が明確なら成立しやすい。ただし、APIや外部サービスの維持が必要になる。

### 6.3 現在の大きな摩擦

実機レビューでは、サードパーティアプリの中に、スマートフォン側のEvenアプリを起動していないと機能が制限されるものがあると報告されている。アプリによっては、スマートフォンで書籍や設定を選んだ後にG2で使う設計になっている。

参照: [AI WatchのEven G2レビュー](https://ai.watch.impress.co.jp/docs/review/2106702.html)

また、Even側も、アプリの発見性、フォルダ分け、素早い起動、推薦ページを今後改善する予定だと説明している。良いアプリを作るだけでなく、初回起動までの導線・説明・設定の少なさも重要な競争要素になる。

## 7. 公開・審査上の注意点

公式の開発者向け規約では、プラグインの公開前にPublication Reviewが行われる。現在、次の種類は公開対象外または大きな制限対象とされている。

- 金融商品・金融サービス
- 健康関連のコンテンツ・サービス
- 医療、健康相談、診断、医療情報など
- 教育・訓練サービス
- インスタントメッセージサービス
- 子どもを主な対象とするアプリ
- Even Realitiesがリスクまたは不適切と判断するアプリ

2026-06-01の公開スナップショットには、株価、運動、学習、メッセージ関連に見えるアプリも含まれている。しかし、既存アプリの掲載実績は新規申請の承認を保証しない。これらのジャンルを候補にする場合は、企画段階でEvenの最新規約とDeveloper Portalの審査基準を確認する。

個人情報、音声、位置情報、外部アカウントを扱うアプリは、必要最小限の取得、明確な同意、公開プライバシーポリシー、第三者サービスの規約確認も必要になる。

参照: [Even Hub Developer Platform Terms of Service](https://support.evenrealities.com/hc/en-us/articles/15606676690703-Even-Hub-Developer-Platform-Terms-of-Service)

## 8. アプリ企画への示唆

次のアイデア検討では、以下を優先する。

1. **スマートフォンを取り出せない瞬間に価値があるか**
2. **1〜3秒で読める情報に圧縮できるか**
3. **タップ・スワイプ・リングだけで操作できるか**
4. **初回設定やAPIキー入力を最小限にできるか**
5. **日本語・日本の場所・特定の仕事や趣味など、対象を明確にできるか**
6. **既存の天気・タイマー・メモ・AI・ゲームとの差が一言で説明できるか**
7. **外部サービス停止やAPI変更があっても最低限動くか**

現時点で避けるべき初期案は、単純な時計、単純な天気、単純なタイマー、汎用メモ、汎用AIチャット、既存ゲームの軽微なコピーである。

逆に、ストアの既存アプリが示している有望な方向は、「特定の状況に特化した短い情報提示」「日本語・地域データ」「手を使わない作業補助」「個人用データを安全に一瞬だけ見る」ことである。ただし、具体的な候補は公開規約に適合するかを確認しながら絞り込む。

## 9. 次の調査・企画作業

次は、6月1日時点のアプリ群を次の軸で表にして、空白領域をスコアリングする。

- カテゴリと類似アプリ数
- 外部アカウント/APIの必要性
- スマホを開かずに完結するか
- 日本語・日本向けの有無
- 1日に何度使うか
- G2/R1固有の価値があるか
- 審査・個人情報・運用リスク
- 実装難易度とAPI維持コスト

本リポジトリの開発環境には、Weather、Chess、EPUB、Reddit、Transitなど既存ストアと重なるサンプルが登録されている。比較検証には、[README.md](../README.md)と[apps.json](../apps.json)も利用できる。

## 参照資料

- [Even Hub公式案内](https://support.evenrealities.com/hc/en-us/articles/15688149217167-Even-Hub)
- [Even Hub公式開発ドキュメント](https://hub.evenrealities.com/docs)
- [Even Hub Developer Platform Terms of Service](https://support.evenrealities.com/hc/en-us/articles/15606676690703-Even-Hub-Developer-Platform-Terms-of-Service)
- [Even G2ストアの全アプリ（2026-06-01）](https://note.com/gpsnmeajp/n/n9d35da180670)
- [Even Day Japan 2026レポート](https://www.moguravr.com/?p=319093)
- [Even Dayに関する別報道](https://dig-it.media/thundervolt/article/905660/)
- [AI Watch: Even G2レビュー](https://ai.watch.impress.co.jp/docs/review/2106702.html)
