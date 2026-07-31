---
title: "ubuntuで超簡単にmastodonインスタンスを作成する方法(docker)"
zennEmoji: "🐘"
published: 2018-08-17
description: "ubuntuで超簡単にmastodonインスタンスを作成する方法(docker)"
image: ""
tags: ["Ubuntu", "mastodon", "Docker"]
category: "インフラ"
draft: false
---

## 概要

qiita等に上がっている既存の情報ですと情報が少し古かったりしまたtootsuiteによる公式ドキュメントも現在は存在する為公式ドキュメントに沿って無駄な構成要素を省いて構築していく。
> 2018-12-25:対話形式のものを使用するように修正タイトルを修正  
> 2018-12-25:公式ドキュメントが移動dockerページがなくなるサポート状況不明

## 環境

OS:Ubuntu server 18.04 AMI
HW:aws c5.large

## nginxの構築

### nginxのインストール

```shell
sudo apt update
sudo apt install nginx
```

インストールが完了したら下記の通りconfファイルを作成しexample.comを今回インスタンスを作成するドメインに修正する(serverとssl証明書の4箇所)

```nginx title="/etc/nginx/sites-enabled/default"
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  listen [::]:80;
  server_name example.com;
  root /home/mastodon/live/public;
  # Useful for Let's Encrypt
  location /.well-known/acme-challenge/ { allow all; }
  location / { return 301 https://$host$request_uri; }
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name example.com;

  ssl_protocols TLSv1.2;
  ssl_ciphers HIGH:!MEDIUM:!LOW:!aNULL:!NULL:!SHA;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;

  ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

  keepalive_timeout    70;
  sendfile             on;
  client_max_body_size 8m;

  root /home/mastodon/live/public;

  gzip on;
  gzip_disable "msie6";
  gzip_vary on;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_buffers 16 8k;
  gzip_http_version 1.1;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

  add_header Strict-Transport-Security "max-age=31536000";

  location / {
    try_files $uri @proxy;
  }

  location ~ ^/(emoji|packs|system/accounts/avatars|system/media_attachments/files) {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri @proxy;
  }
  
  location /sw.js {
    add_header Cache-Control "public, max-age=0";
    try_files $uri @proxy;
  }

  location @proxy {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Proxy "";
    proxy_pass_header Server;

    proxy_pass http://127.0.0.1:3000;
    proxy_buffering off;
    proxy_redirect off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    tcp_nodelay on;
  }

  location /api/v1/streaming {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Proxy "";

    proxy_pass http://127.0.0.1:4000;
    proxy_buffering off;
    proxy_redirect off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    tcp_nodelay on;
  }

  error_page 500 501 502 503 504 /500.html;
}
```

### sslの取得

```shell
sudo apt install certbot
sudo systemctl stop nginx
sudo certbot certonly --standalone -d {ドメイン}
```

この後は対話型で情報入力していきます。

## dockerの構築

### dockerのインストール

```shell
sudo apt-get -y remove docker docker-engine docker.io containerd runc
sudo apt-get update
sudo apt-get -y install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo adduser $USER docker
exit    #一旦セッションを消す
```

### dockerのビルド

```shell
cd
git clone https://github.com/tootsuite/mastodon
cd mastodon
cp .env.production.sample .env.production
docker-compose run --rm web bundle exec rake mastodon:setup
```

ビルドが完了すると対話形式で情報を入力していきます。
途中`This configuration will be written to .env.production`と聞かれた際にYesを選択その後下記のような設定ファイルが出力されるのでメモっておき処理が完了したら`.env.production`にコピペして保存する。
※このとき別のセッション等で保存後に続きの質問を続行する

```ini
# Generated with mastodon:setup on 2018-12-25 10:12:56 UTC

LOCAL_DOMAIN=m.do-a.co
SINGLE_USER_MODE=false
SECRET_KEY_BASE=xxxxxxx
OTP_SECRET=xxxxxx
VAPID_PRIVATE_KEY=xxxx=
VAPID_PUBLIC_KEY=xxxx=
DB_HOST=db
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASS=
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
SMTP_SERVER=mail.so-net.ne.jp
SMTP_PORT=587
SMTP_LOGIN=xx
MTP_PASSWORD=xxx
SMTP_AUTH_METHOD=plain
SMTP_OPENSSL_VERIFY_MODE=none
SMTP_FROM_ADDRESS=Mastodon <notifications@m.do-a.co>
```

最後に下記コマンドを実行して起動

```shell
docker-compose up -d
sudo systemctl restart nginx
```

以上で管理者アカウントの設定まで他保守に関する設定は一切省いた構成となっているので実際に複数人数で利用する際は別途設定が必要です。
