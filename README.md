# blog

[doany.io](https://doany.io) — [Fuwari](https://github.com/saicaca/fuwari) をベースにした Astro 製の静的ブログ。

## 開発

```shell
pnpm install
pnpm dev
```

<http://localhost:4321>

Docker で起動する場合:

```shell
cp compose.sample.yml compose.yml
docker compose up
```

## ビルド

```shell
pnpm build    # dist/ に出力（pagefind の検索インデックス生成まで実行）
pnpm preview
```

## 記事の追加

```shell
pnpm new-post <filename>
```

`src/content/posts/` に Markdown を置く。フロントマターは以下。

```yaml
---
title: タイトル
published: 2026-07-29
description: 概要
image: /static/images/blog/example.png # 省略可
tags: ["タグ1", "タグ2"]
category: "インフラ" # インフラ / Web開発 / 車 / 決済 / その他
draft: false
---
```

## デプロイ

`main` への push で GitHub Actions がイメージをビルドし `ghcr.io` へ push、
`k3s/deployment.yaml` のタグを自動更新する。配信は Caddy（`Caddyfile`）。
