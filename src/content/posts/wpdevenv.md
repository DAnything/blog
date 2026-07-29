---
title: "ubuntuでhhvm+nginx+mysqlでwordpress環境の構築"
published: 2018-07-28
description: "ubuntuでhhvm+nginx+mysqlでwordpress環境の構築"
image: ""
tags: ["Ubuntu", "WordPress", "環境構築"]
category: "Web開発"
draft: false
---

## 経緯

環境構築の経緯だが大変間抜けな話だがubuntuのpythonコアをあろうことかpurgeしてしまい修復するにも手が付けられずまたguiからcuiに乗り換える目的から1から環境構築しなおしたので備忘録としてこちらに書いていこうと思う。

## バックアップ

以下の順番でバックアップしていった

1. mysql
2. その他設定等のファイル群

### mysqlのダンプ

まずmysqlだが幸いシリアルコンソールは起動したので下記コマンドにてダンプファイルを生成した。

```console
mysqldump -u root -p {データベース名} > dump.sql
```

### ファイルのバックアップ

live cdより起動して先ほどのmysqlのダンプファイルと自己ビルドしたnginxを使用していたため/usr/local/nginx内を全て外部メモリに保存した。この際設定ファイル等には隠しファイルや権限が必要なファイルがある可能性もあるのできおつけること。

## ubuntuのインストール

次にUbuntuをインストールしていく内容はさほど凝ったものではないので飛ばし飛ばし書いていく。

### Ubuntuイメージディスクの作成

今回はUbuntu server 18.04.1を使用した。下記よりダウンロードしwindows7以降ならWindowsディスクイメージ書き込みツールが搭載されているはずなのでそちらで焼いた。
[Ubuntu server](https://www.ubuntu.com/server)

### Ubuntuのインストール

まずUbuntu serverを起動するこの時点では知らなかったのだが今のUbuntu serverはEFIブートするらしいのでわざわざ書き込みツール使う必要もなかったのですがまあいいでしょうインストールを進めていきます。EFIで起動したら黒い画面に白字で選択画面がでるのでInstallなんちゃらを選択する。今は便利でCUIながらグラフィカルなインストールのマネージャーが上がるので以下に手順を簡単に示す。

1. Englishを選択。
2. キーボードレイアウトを選択
3. Install Ubuntuを選択
4. セットアップに使用するネットワークI/Fを選択(今回は優先でオンボードのドライバが当たっていたので特に何も設定せず進めた)
5. 仕様するプロキシーの設定(今回は特別に設定はしてない)
6. ミラーアドレスの設定(こちらも今回特別に設定はしていない)
7. ディスクの構成(今回は得に考えずUse An Entire Diskを選択)
8. インストールするディスクを選択
9. ディスクの構成(今回は特に考えず自動設定のまま進めた)
10. ユーザー等の設定
11. サーバーパッケージ(?)詳しくないのでよくはわかっていないが代表的なサーバーのパッケージを自動セットアップできる(今回は特に選択無し)
12. インストールが完了したら再起動します

## Ubuntuの設定

ubuntuが起動したらユーザー名とパスワードを打ってログインします。

### ipの固定

ローカルipを固定してポートフォワードを設定していたのでipを固定します。インストール時に実は設定できたのですが知らなかったので後から設定します。/etc/netplan/50-cloud-init.yaml以下を編集します。

```yaml title="/etc/netplan/50-cloud-init.yaml"
network:
    ethernets:
        {デバイス}:
            addresses: [{ipアドレス}]
            dhcp4: true
    version: 2
```

設定の適用は

```console
sudo netplan apply
```

### sshポートの変更

デフォルトのポート(22)で使用していた際海外からのアクセスが集中し認証できなくなるという事態が発生したのでポートは絶対に変えておきましょう。/etc/ssh/sshd_configの記述を変更。念のためテストしようと思ったのですが、以前のキーが残っていると接続できないので厳密にはそれぞれキーを再生成すべきなのですがめんどくさいので~/.ssh/known_hostsを削除しました(非推奨)

```ini title="/etc/ssh/sshd_config"
Port {ポート番号}
```

## sslの取得

通常だとnginxのインストールが先な気がしますが今回はssl化が前提なので先にsslを取得していきます。

### certbotの導入

下記コマンドを実行。

```bash
sudo apt update
sudo apt install software-properties-common
sudo add-apt-repository universe
sudo add-apt-repository ppa:certbot/certbot
sudo apt update
sudo apt install certbot
```

### 証明書の取得

今回は複数ドメイン+サブドメインを同時に証明書取得したいと思います。
下記既にcertbot-auto導入済みなので下記コマンドを実行-dの後ろはドメイン(今回は二つ指定)-mの後ろはメールアドレスに適宜書き換えてください。

```shellsession
sudo certbot certonly --agree-tos --no-eff-email --manual-public-ip-logging-ok --manual -m {メールアドレス} -d {ドメイン} -d {ドメイン}
```

次に下記の様な案内がでますのでネームサーバーのtxtレコードに案内の通り設定していきます。もし-dを2つ以上設定していた場合下記の様な案内が出た後エンターを押す度指定したドメインの数だけ案内がでますので全てtxtレコード設定してください。※最後の案内が出た後エンターを押さないでそのままにしてください。

```shellsession
Please deploy a DNS TXT record under the name
_acme-challenge.siteyui.site with the following value:

lb0hNdyPwXpftFbkZcIVsXIyQFxd5bzmTKrKQJlGqMs

Before continuing, verify the record is deployed.
```

設定が終わりtxtレコードが反映完了したらエンターを押してください。反映されていない段階でエンターを押したりエラーが出た際には上のコマンドを再度実行して1から設定しなおしてください。
また下記コマンドでtxtレコードの状態を確認できます。ドメイン名のところはサブドメイン無しのドメインを入れればすべてのレコードが見れるはずです。

```bash
dig -t txt {ドメイン名}
```

## mysqlのインストール

先にmysqlをインストール設定していきます。下記コマンドを実行。

```console
sudo apt install mysql-server
```

### mysqlの初期パスワード設定

本来は非推奨らしいのだがセキュリティプラグイン周りは詳しくない為平文で直接テーブルを書き換える。

```shellsession
sudo mysql

mysql>ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '{パスワード}';
```

### mysqlでのインポート

テーブルを作ってエクスポートの逆をやるだけ。

```shellsession
mysql -u root -p

mysql>CREATE DATABASE {データベース名};
mysql>exit;

mysql -u root -p {データベース名} < {ダンプファイル}
```

## hhvmのインストール

今回はphpの代わりに速度改善の為にhhvmを入れていきます。下記コマンドを順次実行。

```console
sudo apt update
sudo apt-key adv --recv-keys --keyserver hkp://keyserver.ubuntu.com:80 0xB4112585D386EB94
sudo add-apt-repository https://dl.hhvm.com/ubuntu
sudo apt update
sudo apt install hhvm
```

## nginxのインストールとセットアップ

他記事等ではaptでのインストールだとバージョンが古いと書かれているものもありますが2018/07/28現在1.15.2がインストールされるので問題ないです。下記コマンドを実行

```console
sudo apt install nginx
```

### nginxの設定

nginxの設定をしていくaptでインストールした場合は/etc/nginx/conf.d以下に拡張子.confでファイルを作成すれば自動的に読み込まれる今回は下記の様な設定を行ったので簡単に説明していく。

```nginx title="/etc/nginx/conf.d/vhosts.conf"
server{
    listen 80;#80番ポートで待ち受け
    server_name .siteyui.site;#.でスタートするとドメイン+サブドメイン全てが対象
    return 301 https://$host$request_uri;#httpsに全て301リダイレクト
}
client_max_body_size 100m;#自分の環境ではwordpressのメディアアップロード時エラーが出ていたため明示的にリクエストサイズを指定
ssl_certificate /etc/letsencrypt/live/siteyui.site/cert.pem;
ssl_certificate_key /etc/letsencrypt/live/siteyui.site/privkey.pem;#先ほどcertbotで取得した証明書の設定
server{
    listen 443 ssl;#443で待ち受け&SSLを有効
    server_name tv.siteyui.site;
    location / {
        auth_basic "Restricted";#ベーシック認証を使用
        auth_basic_user_file /etc/nginx/conf.d/.htpasswd;#id,pwファイルの指定
        proxy_pass http://192.168.0.2;#プロキシの設定
    }
}
server{
    listen 443 ssl;
    server_name siteyui.site;
    index index.php;#indes.phpにインデックスを有効
    root /var/www/html;
    location / {
           try_files $uri $uri/ /index.php?$args;#スラッグでのアクセスをクエリに変換(wordpress用)
    }
    location ~ \.php$ {#hhvmの設定
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
    }
}
```

## 最後に

以上となりますがセキュリティ的におすすめできるような内容ではないので後学の為にも指摘等頂けると大変助かります。
