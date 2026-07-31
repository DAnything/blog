---
title: "Slack で「自分の全投稿を取得するアプリ」は配布できない"
zennEmoji: "🚫"
published: 2026-07-31
description: "search.messages を使うアプリを他人のワークスペースに届けようとしたら、search:read が Slack Marketplace の拒否スコープに名指しされていました。代替経路も含めて調べた結果と、結局どういう形にしたかの記録です。"
image: ""
tags: ["Slack", "Slack API", "OAuth", "個人開発"]
category: "Web開発"
draft: false
---

先に結論を書きます。

**Slack で「自分の全投稿を横断して取得する」アプリは、Slack Marketplace に掲載できません。**
必要になる `search:read` が、ガイドラインで拒否スコープとして名指しされているからです。

迂回路もひととおり潰れていて、**ユーザー自身に内部アプリを作ってもらう以外の方法がありません**でした。

同じことを調べる人がまた1日溶かさないように、引用と出典を付けて残しておきます。

## やりたかったこと

Slack の投稿時刻から稼働表（勤務時間の一覧）を自動生成したい、という話です。

必要なのは**時刻だけ**です。本文は要りません。誰がいつ発言したかが分かれば、活動の塊から稼働の開始・終了・休憩を推定できます。

これを実現する API は `search.messages` です。`from:<@USER_ID> after:2026-06-01 before:2026-07-01` のようなクエリで、自分の投稿だけを期間指定で引けます。必要なスコープは `search:read` ひとつ。

権限としてはむしろ小さいほうです。チャンネルの履歴を丸ごと読むわけではなく、**自分の投稿しか返らない**からです。

## 1. `search:read` は拒否スコープに名指しされている

ガイドラインにそのまま書かれています。

> legacy/restricted scopes or methods, scopes that provide extensive access to workspace data without a clear use case that requires them, or coded workflow scopes (e.g. `admin.*`, `identity.*`, **`search:read`**, `workflow.steps:execute`, `triggers:*`)

— [Slack Marketplace app guidelines and requirements](https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements/)

スコープのリファレンス側でも legacy 扱いです。

> This is a legacy scope

— [search:read scope](https://docs.slack.dev/reference/scopes/search.read/)

> [!NOTE]
> **廃止されたわけではありません。** user token であれば `search.messages` は現役で動きます。掲載できないだけです。ここを混同すると「もう使えない」と誤解します。

## 2. `*:history` での迂回も塞がれている

「検索がダメならチャンネル履歴を読めばいい」と考えるところですが、同じページが**やってはいけないこと**として挙げています。

> Request user token `*:history` and `files:read` scopes **for the collection of message and file data**

しかも 2025 年 5 月にレート制限が変わり、この経路は実質的に死んでいます。

> The `conversations.history` API method rate limit for commercially distributed apps created after May 29, 2025 ... will be limited to 1 request per minute ... These methods will have a new rate limit of 15 messages per request.

— [Rate limit changes for non-Marketplace apps](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/)

**1分に1リクエスト、1リクエストあたり15件**です。1か月分を遡って集計する用途では話になりません。

そもそも履歴の取得は「チャンネル内の**全員の**メッセージを読む」ことになります。自分の投稿だけ欲しいのに、要求する権限は検索より遥かに広くなる。**摩擦を減らそうとして、より侵襲的になる**という交換で、筋が悪いです。

## 3. 代替として案内されている API も条件が刺さる

2026 年 2 月に、Slack は `search:read` の代替として Real-time Search API を出しています。`assistant.search.context` と、粒度を細かくした `search:read.public` / `.private` / `.im` などです。

— [Announcing the Slack MCP server and Real-time Search API](https://docs.slack.dev/changelog/2026/02/17/slack-mcp/)

こちらは掲載できます。ただし利用条件が4つあり、用途によっては全部刺さります。

| 条件 | 内容 |
| --- | --- |
| データ保存の禁止 | "You must not store or copy any of the data retrieved from this API." |
| ゲスト利用不可 | "Workspace guests are not permitted to access apps using platform AI features" |
| プラン制限 | semantic search は Business+ / Enterprise+ |
| AI features 限定 | "exclusively in your app using AI features" |

— [Using the Real-time Search API](https://docs.slack.dev/apis/web-api/real-time-search-api/)

自分の用途では**2番目が致命的**でした。客先常駐や業務委託の人は、常駐先のワークスペースに**ゲストとして参加していることが多い**からです。狙っている利用者層をそのまま除外する条件になっていました。

1リクエストあたり最大20件、ユーザーあたり毎分10リクエストという上限もあります。

## 4. ワークスペース側の設定は、思っていたのと逆だった

ここが一番の収穫でした。

「内部アプリなんて、どうせ管理者に止められるのでは」と思っていたのですが、**前提が逆**でした。

> By default, members can install apps without approval from a Workspace Owner.

— [Manage app approval for your workspace](https://slack.com/help/articles/222386767-Manage-app-approval-for-your-workspace)

**デフォルトは承認不要**です。そのうえで、設定を厳しくした場合の挙動が重要です。

| ワークスペースの設定 | Marketplace 掲載アプリ | 自作の内部アプリ |
| --- | --- | --- |
| 制限なし（**デフォルト**） | 通る | 通る |
| Marketplace のアプリのみ許可 | 通る | **通る** |
| 全アプリ承認必須 | 承認待ち | 承認待ち |

2行目について、Slack が明言しています。

> Workspace Owners can set a permission to "Only allow apps from the Slack Marketplace" ... **This will not prevent members from creating and installing internal apps.**

— [Add apps to your Slack workspace](https://slack.com/help/articles/202035138-Add-apps-to-your-Slack-workspace)

つまり「Marketplace 限定」の設定は、**内部アプリを止めません**。名前から受ける印象と逆です。

そして 3 行目の「全アプリ承認必須」では、Marketplace 掲載アプリも同じく承認待ちになります。**内部アプリが不利になる設定は存在しない**わけです。

さらに、さきほどのレート制限の変更にはこう書かれています。

> **Internal customer-built apps will not notice any changes.**

内部アプリは制限強化の対象外です。

結果として、内部アプリ方式は「掲載できないので仕方なく選ぶ次善策」ではなく、**この用途で唯一まともに動く選択肢**でした。

## 5. 選んだ形と、その代償

ユーザー自身にアプリを作ってもらう形にしました。手間を減らすため、**App Manifest を URL に載せて渡します**。

```
https://api.slack.com/apps?new_app=1&manifest_yaml=<URL エンコードした manifest>
```

— [Configuring apps with app manifests](https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests/)

これでアプリ名・説明・スコープが入力済みの状態から始められます。要求するのは `search:read` ひとつだけなので、同意画面も軽いです。

ドキュメント上は「リンクを踏む → Create → Install → トークンをコピー」で終わるように読めます。**実際にやると罠が2つありました。**

### 罠1: 作成時に必ず赤いエラーが出る

Step 2 の **Create and Install** を押すと、白いポップアップが一瞬開いて閉じ、こう表示されます。

```
Installation was not completed. Click Create and Install to try again.
```

**アプリ自体は作成できています。** 一覧を再読み込みすれば出てきます。

原因はおそらく、このアプリが **bot スコープを1つも持っていない**ことです。作成とインストールを一度に行う導線なのに、インストールする bot が存在しないので空振りしている。bot スコープを足せば消えると思われますが、そのために要求権限を増やすのは本末転倒なので、そのままにしています。

初回オンボーディングの一歩目で赤いエラーが出るのは、説明が無ければ確実に離脱します。**「これは正常です」と手順に書く**しかありませんでした。

### 罠2: token rotation を有効にすると連携が切れる

OAuth & Permissions のページ上部に、こう書かれた項目があります。

> **Recommended** for developers building on or for security-minded organizations

`Recommended` と書いてある以上、押したくなります。**押すとトークンが短時間で失効するようになり**、リフレッシュの仕組みを持っていないアプリは繋がらなくなります。

生成する manifest では `token_rotation_enabled: false` にしていますが、後から画面で有効にできてしまうので、こちらも手順に「有効にしないでください」と明記しています。

## 6. 実装はほとんど AI に書かせた

正直に書いておくと、**コードはほぼ AI（Claude Code）に書かせています**。人間側がやったのは、何を作るか・何を作らないかの判断です。

これは楽な仕事ではありませんでした。AI は指示すれば動くものを作りますが、**指示が間違っていれば間違ったものが完成度高く出来上がります。**

具体例を挙げます。

無料プランの線引きを、最初は「**Slack 連携だけ無料、他のサービスは有料**」に設計していました。Slack が主力のデータ源なので、一見もっともらしい線です。実装も、料金ページも、決定記録もその前提で書かれ、テストも通っていました。

**間違いに気づいたのは、自分で触ったときです。** GitHub しか繋いでいない人は、無料プランでは何も生成できません。サインアップして、連携して、空の稼働表を見て帰るだけになります。無料で価値を見せ切るのが目的だったのに、その目的を壊す線を引いていた。

線を「**サービスの種類は問わず、連携1つまで**」に変えました。同時に、コミット時刻だけで稼働表を作ると1か月の実働が **9時間** にしかならないことも実データで分かり、そちらは推定モデルの調整に繋がりました。

AI に任せられるのは**作る作業**で、**何を作るかを間違えないこと**は任せられない、というのが今のところの実感です。動くかどうかはテストが教えてくれますが、正しいかどうかは教えてくれません。

## おわりに

`search.messages` を使うアプリを配布したい人へ、まとめるとこうです。

- **Marketplace には掲載できません。** `search:read` が拒否スコープに名指しされています
- **`*:history` での迂回も潰れています。** ガイドラインで禁止され、レート制限も 1req/分・15件
- **Real-time Search API は掲載できますが**、データ保存禁止・ゲスト利用不可・プラン制限があります
- **内部アプリ方式は現役です。** ワークスペースの「Marketplace のみ許可」設定でも止まりませんし、レート制限強化の対象外です

作ったものはこれです。Slack や GitHub の活動ログから、日別の稼働開始・終了・休憩・実働を推定して稼働表の下書きを出します。常駐先に監視エージェントを入れられない環境でも使えて、**過去の月にも遡って生成できる**のが特徴です。

<https://w.doany.io>
