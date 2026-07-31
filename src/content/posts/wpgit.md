---
title: "WordPressをマルチサイト化してgitを導入してみた"
zennEmoji: "🔀"
published: 2018-08-02
description: "WordPressをマルチサイト化してgitを導入してみた"
image: ""
tags: ["tech", "Git", "GitHub", "WordPress"]
category: "Web開発"
draft: false
---

## 経緯

日頃から WordPress の改修等やっているが理想的な管理方法はないかと思い自分なりに管理環境を構築してみた。

## 概要

大まかな概要としては以下の通り。

- WordPress をマルチサイト化
- ステージング用テーマを作成
- テーマディレクトリを branch ごとに管理

環境は以下の通り

- Ubuntu server 18.04.1
- nginx
- hhvm
- mysql
- WordPress 4.9.7

### nginx の設定

まず nginx の設定をしていく
nginx で virtual host と basic 認証の設定をしていく

#### .htpasswd の生成

.htpasswd を生成するため下記を実行

```shell
sudo htpasswd -c -b {生成する.htpasswdのパスファイル名も含めて} {ユーザ名} {パスワード}
#例
sudo htpasswd -c -b /etc/nginx/conf.d/.htasswd hogehoge hugahuga
```

#### basic 認証と virtual host の設定

basic 認証と virtual host を設定していく下記に例を示す。

```nginx
server{
    listen 443 ssl;#今回は443で待ち受けてsslを有効
    server_name stg.doany.io;#マルチサイトに使用するドメイン
    index index.php;#インデックスを有効にするファイル
    root /var/www/html;#ルートディレクトリ
    location / {
           try_files $uri $uri/ /index.php?$args;#WordPresのリライトを有効
        auth_basic "Restricted";#basic認証を有効
        auth_basic_user_file /etc/nginx/conf.d/.htpasswd;#.htpasswdのディレクトリを指定
    }
    location ~ \.php$ {#fast cgiの設定
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
    }
}
```

nginx を下記コマンドで再起動して起動すれば OK 起動しなければ文法ミス等が考えられるので修正。

```shell
sudo systemctl restart nginx
```

### WordPress のマルチサイト化

次に WordPress をマルチサイト化してステージング環境を作成していく。

#### WordPress のマルチサイトを有効化

まずマルチサイトの有効かだが wp-config.php に以下の一行を追加`/* 編集が必要なのはここまでです ! WordPress でブログをお楽しみください。 */`の上あたりに追加します。

```php
define('WP_ALLOW_MULTISITE', true);
/* 編集が必要なのはここまでです ! WordPress でブログをお楽しみください。 */
```

次にマルチサイト導入の為一旦プラグインを全て無効かしてから管理画面で左メニューのツール → ネットワークの設置クリックします。そして今回はサブディレクトリを選択サイトネットワーク名等を入力してインストールをクリック画面が変わったら案内通り下記を参考に wp-config を編集※下記の htaccess は今回は nginx の為無視してください。

```php
define('MULTISITE', true);
define('SUBDOMAIN_INSTALL', true);
define('DOMAIN_CURRENT_SITE', 'doany.io');#お使いのサイトのドメインによってかわります
define('PATH_CURRENT_SITE', '/');#こちらもWordPressの構成によってかわります
define('SITE_ID_CURRENT_SITE', 1);
define('BLOG_ID_CURRENT_SITE', 1);
/* 編集が必要なのはここまでです ! WordPress でブログをお楽しみください。 */
```

再度ログインしていただいてプラグインを有効かして既存のサイトが表示されていれば OK ですまたカスタム投稿タイプ等を使用していて記事が表示できなくなった場合フロントでのリライトを無効かすると治ることがあります。

#### ステージング用サイトの構築

今回はプラグインを使用して構築しました。[Cloner](https://premium.wpmudev.org/project/cloner/)こちらをインストール後左メニューのサイトを開きステージング環境を作成したいサイトの下の Clone をクリック Create a new Site を選択その下にサブドメイン(※フルドメインは不要です)を入力 Clone Site を実行。しばらくすると処理が始まり管理画面が表示されたら完了です。  
次に ftp なりで本番サイトで使用しているテーマを同じ themes ディレクトリ内に複製します。(※この時サイトネットワークから有効化しないと使用できない場合があります)そしたらそのテーマをステージングサイトで有効化します。

## Git の導入

次に本番テーマを master、ステージングテーマを stg としてブランチを作り git を構築していきます。

### git の導入と github への push

先に GitHub でリポジトリを作成しておいてください。作成したら ssh で入り本番用テーマのディレクトリ以下を git 管理します GitHub の案内通り git を導入していきます下記に例を示す。

```shell
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/16dyui/mywordpress.git #作成したリポジトリのurl
git push -u origin master
```

### ステージングブランチの作成

次にステージングブランチを作成していきます。ssh で stg サイトで有効にしたテーマディレクトリに移動してくださいそこで下記のようなコマンドを実行してください。

```shell
git init
git add .
git commit -m "my first stg"
git remote add origin https://github.com/16dyui/mywordpress.git #作成したリポジトリのurl
git branch -m stg #現在のブランチをstgにリネーム
git push origin stg #stgをリモートにpush
```

## まとめ

問題発生を防ぐ為サーバーを分けたりする場合が多いですが今回は簡易的に WordPress を git 管理する方法を紹介させていただきました。このようにマルチサイトを利用することでより簡易的に WordPress を Git 管理することができます。
