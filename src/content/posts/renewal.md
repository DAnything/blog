---
title: "サイトを Astro + k3s で作り直した話"
zennEmoji: "🧱"
published: 2026-07-29
description: "Next.js で動かしていたこのブログを Astro 製テーマ Fuwari に全面移行しました。ビルドから配信、コメント、購読まで、現在の構成をひととおり紹介します。コメントは giscus から remark42 を経て Artalk に落ち着きました。"
image: ""
tags: ["Astro", "Caddy", "k3s", "Docker", "GitHub Actions", "Artalk"]
category: "インフラ"
draft: false
---

このサイトは元々 HUGO で作り、その後 Next.js（tailwind-nextjs-starter-blog）で運用していましたが、このたび Astro 製のテーマ **Fuwari** に全面移行しました。

せっかくなので、現在の構成を最初から最後まで書いておきます。

::github{repo="saicaca/fuwari"}

## 全体像

```
記事 (Markdown)
  ↓ pnpm build
Astro → dist/ + Pagefind の検索インデックス
  ↓ docker build (multi-stage)
node:24-slim でビルド → caddy:2-alpine に dist/ だけ載せる
  ↓ GitHub Actions
ghcr.io へ push → k3s のマニフェストを自動で書き換えてコミット
  ↓ ArgoCD が Git を監視して同期
k3s + Traefik（Let's Encrypt / DNS-01）→ Cloudflare → 読者
```

サーバーサイドのアプリケーションは一切動いていません。**配信されているのは完全に静的なファイルだけ**です。

## ビルド

Astro なので出力は静的 HTML です。ページ遷移は Swup が担当していて、フルリロードなしで切り替わります。

全文検索には **Pagefind** を使っています。ビルド時に `dist/` を走査してインデックスを作る方式で、検索用のサーバーが要りません。日本語もちゃんと引っかかります。

> [!NOTE]
> Pagefind は日本語のステミングには対応していないので、語形変化をまたいだ一致はしません。とはいえ個人ブログの検索としては十分実用的です。

## 配信は Caddy

イメージは2段構成にしています。ビルド用に `node:24-slim`、配信用に `caddy:2-alpine`。最終的なイメージには `dist/` と `Caddyfile` しか入っていません。

nginx ではなく Caddy を選んだのには理由があります。

Astro は `trailingSlash: "always"` なので、`/posts/foo` へのアクセスに対して `/posts/foo/` へリダイレクトが常時発生します。nginx はこのリダイレクト URL を `$scheme` から組み立てるため、**TLS を前段のプロキシで終端していると `http://` へ 301 してしまう**という古典的な罠があります。`absolute_redirect off;` を書けば回避できますが、知らないと必ず踏みます。

Caddy は相対リダイレクトを返すので、この問題が最初から存在しません。実際に確認するとこうなります。

```console
$ curl -sI https://doany.io/posts/truck | grep -i location
location: https://doany.io/posts/truck/
```

ついでに `encode zstd gzip` の1行で zstd 圧縮まで効きます。nginx で zstd を使おうとするとモジュールのビルドが必要なので、この手軽さはかなり大きいです。トップページで 97,465 バイト → 16,264 バイトまで落ちています。

旧 URL からのリダイレクトも Caddy に集約しました。

```text
@blogPost path_regexp blogPost ^/blog/(.+?)/?$
redir @blogPost /posts/{re.blogPost.1}/ permanent
```

`/blog/*` `/tags/*` `/projects` `/feed.xml` あたりが旧構成の URL なので、全部 301 で新しい場所へ飛ばしています。

## デプロイは GitOps

ここが個人的に一番気に入っているところです。**手元から `kubectl apply` を叩くことは一切ありません。**

`main` に push すると、まず GitHub Actions がイメージをビルドして `ghcr.io` へ push します。そのあと同じジョブが `k3s/deployment.yaml` のイメージタグをコミット SHA に書き換えて、リポジトリにコミットし返します。

```yaml
- name: Update deployment image tag
  run: |
    sed -i "s#image: ${REGISTRY}/${IMAGE_NAME}:.*#image: ${REGISTRY}/${IMAGE_NAME}:${GITHUB_SHA}#" k3s/deployment.yaml
```

そして k3s 側には **ArgoCD** が常駐していて、このリポジトリを監視しています。マニフェストの変更を検知すると自動で同期し、新しいイメージの Pod に入れ替わります。

つまり **Git がそのままクラスタの状態**になっていて、リポジトリを見ればいま何が動いているか分かります。ロールバックしたければ `git revert` するだけです。

ArgoCD 自体も k3s の `HelmChart` CRD でマニフェストとして宣言してあるので、クラスタを作り直しても同じ手順で戻せます。ログインは Entra ID の OIDC に寄せて、ローカルの admin アカウントは無効化してあります。

証明書は Traefik が Let's Encrypt から DNS-01 チャレンジで取得しています。前段には Cloudflare を挟んでいます。

### シークレットも Git に置いてある

コメントシステムの署名鍵や管理パスワードといった秘密情報も、**Sealed Secrets** で暗号化した状態で公開リポジトリにコミットしています。

```console
$ ./bootstrap/kubeseal.sh /tmp/secret.yaml k3s/artalk-secret.yaml
wrote k3s/artalk-secret.yaml
```

クラスタ内のコントローラが持つ秘密鍵でしか復号できないので、公開リポジトリに置いても問題ありません。おかげで「Git に全部ある」という状態を崩さずに済んでいます。

## コメントは Artalk をセルフホスト

ここは二転三転したので、経緯ごと書いておきます。

### giscus をやめた理由

移行の直後は giscus（GitHub Discussions を使うやつ）を入れていたのですが、**コメントするのに GitHub アカウントが要る**のがどうしても引っかかりました。

### remark42 にした理由と、やめた理由

そこで **remark42** に載せ替えました。Go の単一バイナリで、ストレージも BoltDB のファイルなので別途データベースが要りません。`AUTH_ANON=true` を入れるとアカウントなしで投稿できます。

読者は匿名のままでいい一方、荒らされたときに消す人間は要ります。そこで**管理者だけ Entra ID でログインする**構成にしました。ArgoCD や他の内部サービスと同じアプリ登録を使い回しています。

ここで少しハマりました。アプリ登録がシングルテナントだと、既定の `/common` エンドポイントは使えません。

```text
AADSTS50194: Application is not configured as a multi-tenant application.
Usage of the /common endpoint is not supported for such applications.
```

テナントを明示するオプションが必要なのですが、これは remark42 v1.16 以降でしか使えませんでした。アプリ登録をマルチテナント化すれば通るものの、その登録は他のサービスも共有しているので、認証範囲を広げるのは避けたい。結局 remark42 を上げて解決しました。

しばらく使って引っかかったのが**見た目**です。サイトは Tailwind で組んでいるのに、コメント欄だけ明らかに別物の顔をしている。

直そうとして分かったのですが、**remark42 は iframe で埋め込まれます**。ホストページの CSS が中に届かないので、外から手を入れる余地がありません。公開されている調整点は `theme: light | dark` だけです。つまり見た目が気に入らないなら、乗り換えるしかない。

### 候補を洗い直した

匿名コメントに対応していて、かつ見た目に手が届くものを並べました。

| | 実装 / DB | 描画 | スタイル | 管理者認証 |
| --- | --- | --- | --- | --- |
| **Artalk** | Go 単一バイナリ / SQLite | ホスト DOM | CSS 変数・ダークモード | パスワード |
| **Isso** | Python / SQLite | ホスト DOM | 完全に自由 | パスワード |
| **Comentario** | Go / SQLite | Web Component | 全切り・差し替え可 | **OIDC 可** |
| **Waline** | Node.js / 各種 | ホスト DOM | CSS 変数 | パスワード |
| **remark42** | Go 単一バイナリ / BoltDB | **iframe** | light/dark のみ | OIDC 可 |

Cusdis はアーカイブ済み、Commento は 2022 年で放置（Comentario が後継）、utterances と giscus は GitHub アカウント必須なので落としました。

「Isso は古い」と決めつけていたのですが、これは間違いでした。Isso は `data-isso-css="false"` で既定のスタイルシートを丸ごと切れる、**自分で CSS を書く前提**の作りです。素の見た目が地味なだけで、寄せようと思えばどこまでも寄せられます。

数字も見ました。star は Isso が 5,293 で最多ですが、これは 14 年分の累積です。実運用に近い Docker のプル数では **Artalk が 63.9 万**、Isso は非公式イメージに分散して合計 36 万程度でした。Comentario は 3 桁で、機能は良いのに前例がほぼありません。

### Artalk を選んだ

決め手は、**remark42 と運用の形が同じ**ことでした。Go の単一バイナリに SQLite なので、PVC 1 つに単一 Pod という構成がそのまま使い回せます。マニフェストはホスト名とイメージを差し替えるだけで済みました。

そして iframe ではなくホストページの DOM に描画するので、CSS を当てる道が残っています。素の状態でも現行世代の見た目なので、当面は書かずに済みそうです。

設定はすべて `ATK_` 接頭辞の環境変数で渡します。ネストしたキーは区切りを `_` にする規則です。

```yaml
- name: ATK_AUTH_ENABLED   # ソーシャルログインを使わない
  value: "false"
- name: ATK_DB_TYPE
  value: "sqlite"
```

代償もあります。**Artalk には OIDC がないので、せっかく組んだ Entra ID での管理者ログインは失いました。** 管理画面は共有パスワード 1 個です。両立させるなら Comentario でしたが、利用実績の薄さを取るほどの差ではないと判断しました。管理者は自分ひとりで、やることは荒らしの削除だけです。

なお乗り換えを決めた時点で**コメントは 0 件**でした。移行コストが実質ゼロだったので踏み切れた、という面は正直あります。

k3s に PVC を持たせる点は remark42 のときと変わらず、その分だけステートレスではありません。そこは素直にトレードオフです。

## 購読と支援

サイドバーに置いてあるやつです。

**Ko-fi** は、公式ウィジェットが外部スクリプトを読み込むので、ただのリンクとして実装しました。表示速度に影響せず、テーマのライト/ダークにもそのまま追従します。

**Newsletter** は Buttondown を使っています。当初は RSS フィードを監視して自動配信してくれる機能を使うつもりだったのですが、これが**月 $9 のアドオン**でした。年に数本しか書かないブログには少し重い。

一方で **API は無料プランでも叩けます**。やりたいことは「記事が増えたらメールを作る」だけなので、それなら自分で書けます。

そこで記事を push したときに動くワークフローを足しました。

```yaml
- name: Collect newly added posts
  run: |
    # 追加 (A) されたファイルのみ。既存記事の修正では配信しない。
    FILES=$(git diff --name-only --diff-filter=A "$BEFORE" "$SHA" \
      -- 'src/content/posts/**.md' | tr '\n' ' ')
```

`--diff-filter=A` で**新規追加されたファイルだけ**に絞っているのが要点です。これがないと、誤字を直すたびに購読者へメールが飛びます。

作られるのは下書きまでで、送信は Buttondown 側で内容を確認してから手動で押しています。慣れたら自動送信に切り替えるつもりですが、メールは取り消しが効かないので当面はこのままにします。

## 上流への追従

Fuwari はテーマとして使わせてもらっているので、本家の更新を取り込みたい。とはいえ毎回手で確認するのは続きません。

そこで **月に一度、上流を自動でチェックして PR を出す** ワークフローを入れました。マージが衝突なく通れば PR、衝突したら PR は作らず Issue で知らせる、という挙動にしてあります。

これを成立させるために、Git の履歴も細工しています。このリポジトリと Fuwari には元々**共通の祖先が1つもなかった**ので、そのままでは `git merge upstream/main` が "refusing to merge unrelated histories" で弾かれます。そこで移行時に、**Fuwari の全コミットの上に自分の変更を1コミット載せる**形へ履歴を作り直しました。

```console
$ git log --oneline -3
xxxxxxx feat: Next.js 版ブログの内容を Fuwari の上に移行
6d39b0d chore(deps): bump the patch-updates group ... (#681)
415fb97 chore(deps): bump the patch-updates group ... (#648)
```

GitHub 上のフォーク表示にはなりませんが、フォークにしたかった目的（上流追従）はこれで達成できています。

## おわりに

静的サイトなので落ちる要素がほとんどなく、記事を書いて push するだけで公開されます。コメントだけは自前で面倒を見ることになりましたが、そのぶん読者はアカウントなしで書き込めるようになりました。

ソースコードは全部公開しています。

::github{repo="DAnything/blog"}
