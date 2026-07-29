---
title: "サイトを Astro + k3s で作り直した話"
published: 2026-07-29
description: "Next.js で動かしていたこのブログを Astro 製テーマ Fuwari に全面移行しました。ビルドから配信、コメント、購読まで、現在の構成をひととおり紹介します。"
image: ""
tags: ["Astro", "Caddy", "k3s", "Docker", "GitHub Actions", "remark42"]
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
$ ./bootstrap/kubeseal.sh /tmp/secret.yaml k3s/remark42-secret.yaml
wrote k3s/remark42-secret.yaml
```

クラスタ内のコントローラが持つ秘密鍵でしか復号できないので、公開リポジトリに置いても問題ありません。おかげで「Git に全部ある」という状態を崩さずに済んでいます。

## コメントは remark42 をセルフホスト

移行の直後は giscus（GitHub Discussions を使うやつ）を入れていたのですが、**コメントするのに GitHub アカウントが要る**のがどうしても引っかかりました。

そこで **remark42** に載せ替えました。Go の単一バイナリで、ストレージも BoltDB のファイルなので別途データベースが要りません。`AUTH_ANON=true` を入れるとアカウントなしで投稿できます。

```yaml
- name: AUTH_ANON
  value: "true"
```

k3s に PVC を持たせることになるので、その分だけステートレスではなくなりました。そこは素直にトレードオフです。

## 購読と支援

サイドバーに置いてあるやつです。

- **Newsletter** — buttondown の埋め込みフォーム。RSS-to-email で `/rss.xml` を監視させられるので、記事を公開すれば自動で配信されます
- **Ko-fi** — 公式ウィジェットは外部スクリプトを読み込むので、ただのリンクとして実装しました。表示速度に影響せず、テーマのライト/ダークにもそのまま追従します

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
