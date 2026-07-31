---
title: "DooDでcronをコンテナで分離してみる&swarm対応"
zennEmoji: "⏰"
published: 2019-09-24
description: "DooDでcronをコンテナで分離してみる&swarm対応"
image: ""
tags: ["cron", "Docker", "docker-compose", "swarm"]
category: "インフラ"
draft: false
---

## 概要

dockerで複数サービスを1サービス1コンテナで管理している際1コンテナ内それぞれにcronを常駐させるもしくはホスト側cronで動かすのは個人的に好ましくない(どう好ましくないかは長くなるし大体の人はわかると思うのでここでは割愛します)と思ったのでDooDを使ってcron用コンテナを作成して管理できるようにしてみた

## 構成

下記の様にファイルを配置すれば動く
ssmtpに関してはcron実行結果をメール送信する際sendmailコマンドを内部的に利用するのだがalpineではそもそもsmtpサーバーが内蔵されていないため外部のsmtpサーバーを指定できるようにするためのものです。例ではgmailのsmtpサーバーを利用します。
※cronファイルの権限をrootユーザーにしないと動きません

```shell
~/
 ├ cron/
 │ ├ root
 │ ├ ssmtp.conf
 │ └ Dockerfile
 └ docker-compose.yml
```

```yaml
# docker-compose.yml
version: '3.7'
services:
  cron:
    build: cron
    restart: always # docker起動時に毎回自動起動
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # ホストのdockerソケットをマウントすることでDooDを可能に
      - ./cron/root:/var/spool/cron/crontabs/root # busybox cronの初期設定ディレクトリ
```

```dockerfile
# cron/Dockerfile
FROM alpine
# cronの実行時間が初期設定だと9hずれてしまうのでtimezoneを設定
RUN apk add --update --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    apk del tzdata
# dockerのクライアントとssmtpをインストール
RUN apk add ssmtp docker-cli
# ssmtpのコンフィグを追加
ADD ssmtp.conf /etc/ssmtp/ssmtp.conf
# crondをフォアグラウンドで標準出力を使用して起動
CMD crond -f -d 8
```

```shell
# cron/root
# cron実行完了時に実行結果をメールするメアド
MAILTO=メアド
# docker execでコンテナ内でバッチを走らせる
00  10  *  *  3 docker exec -w /var/www/api/m docker_lb_1 php cu.php

# docker swarm用inspectコマンド等を使ってコンテナIDを特定してる
00  10  *  *  3 docker exec -w /var/www/api/m $(docker inspect --format '{{ .Status.ContainerStatus.ContainerID }}' $(docker service ps --filter 'desired-state=running' main_lb -q)) php cu.php
```

```ini
# smtpサーバーホスト
mailhub=smtp.gmail.com:587
# gmailログイン用ユーザー名(大体メアド)
AuthUser=hoge@gmail.com
# gmailパスワード
AuthPass=password
# smtpサブミッション認証時にSTARTTLSを利用する(gmail等のSTARTLSサーバーでは必須)
UseSTARTTLS=YES
# メール送信時の送信元ホストを下記で書き換えるイメージ(dockerデフォルトだとコンテナIDが入ってしまうため大体迷惑メールとしてブロックされます)
hostname=gmail.com
```
