---
title: "docker-hubを利用して簡易的なウェブアプリデプロイ環境を構築する"
zennEmoji: "🚢"
published: 2019-04-17
description: "docker-hubを利用して簡易的なウェブアプリデプロイ環境を構築する"
image: ""
tags: ["Docker", "docker-compose", "DockerHub", "Bitbucket"]
category: "Web開発"
draft: false
---

> docker-compose version3でのlinksの取り扱いが変更になっており今回の場合不要だったため削除(全然知りませんでした…)

## 概要

bitbucketとdocker-hubを用いて自動ビルド&デプロイ環境を構築した

## docker用インスタンスの作成

手元の環境ではlxcでサーバを管理していたため下記コマンドでlxcを立ち上げ&ip固定を行った。

```shell
lxc launch ubuntu:18.04 docker
lxc network attach lxdbr0 docker eth0 eth0
lxc config device set docker eth0 ipv4.address <IPアドレス>
lxc stop docker
lxc config set docker security.nesting true #コンテナ内コンテナのセキュリティ許可
lxc start docker
```

またlxcデフォルトテンプレートだとsshでkey認証が必須なので下記コマンドでgithubに保存してあるpublic keyを設定した。

```shell
curl https://github.com/{githubのアカウントid}.keys >> ~/.ssh/authorized_keys
```

### docker用インスタンスの準備

下記コマンドでdocker-composeごとインストールします。

```shell
sudo apt update
sudo apt install docker-compose
sudo gpasswd -a $USER docker    #aptで入れると実行する現在のアカウントが権限不足で実行エラーやroot権限が必要となってしまうためインストール後にグループ設定を行う。
sudo systemctl restart docker
exit    #一旦セッションを消す
```

## bitbucketリポジトリの作成

docker-hubで自動ビルドさせるリポジトリを作成していきます。今回はlaravelをデプロイする想定です。まず適当なディレクトリを作り下記の様なDockerfileとvhost.confを作成します。

```dockerfile
FROM centos

RUN yum install -y yum-utils epel-release
RUN yum-config-manager --enable rhui-REGION-rhel-server-extras rhui-REGION-rhel-server-optional
RUN rpm -Uvh http://rpms.remirepo.net/enterprise/remi-release-7.rpm
RUN yum install -y --enablerepo=remi --enablerepo=remi-php72 php-cli php-zts php-intl php-mbstring php-dom php-pdo php-mysql php-pgsql php-devel php-gd php-zip
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" \
 && php -r "if (hash_file('sha384', 'composer-setup.php') === '48e3236262b34d30969dca3c37281b3b4bbe3221bda826ac6a9a62d6444cdb0dcd0615698a5cbe587c3f0fe57a54d8f5') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;" \
 && php composer-setup.php \
 && php -r "unlink('composer-setup.php');" \
  && mv composer.phar /usr/local/bin/composer
RUN yum install -y python2-certbot-apache git httpd unzip
ADD ./vhost.conf /etc/httpd/conf.d/vhost.conf
ADD ./laravel /var/www/html
RUN chmod -R 777 /var/www/html

EXPOSE 80
EXPOSE 443

CMD httpd -DFOREGROUND
```

```ini
DocumentRoot /var/www/html/public
ServerName localhost
<Directory "/var/www/html">
AllowOverride All
</Directory>
```

次にdockerfileを作成したディレクトリでlaravelプロジェクトを立ち上げます。下記の様なコマンドで立ち上げます。

```shell
cd {dockerfileを作成してディレクトリ}
sudo apt install composer php-zip
composer global require "laravel/installer"
PATH=$PATH:~/.config/composer/vendor/bin
export PATH #パスは必要に応じて永続化(.bashrcに記述)等してください
laravel new laravel
rm laravel/.gitignore #開発もdocker前提なのでignoreを消してしまいます。開発用サーバーを分離したい等あれば別途設定してください
```

これをdockerfileごとbitbucketにpushします。(bitbucketのリポジトリ作成方法は割愛します)

```shell
git init
git add .
git commit -m "first commit"
git remote add origin {bitbucketリポジトリ}
git push -u origin HEAD
```

## docker-hubの自動ビルド設定

次にdocker-hubでリポジトリを作成します。アカウント設定で先ほどbitbucketにpushしたアカウントをconnectしておきます。そうするとリポジトリ作成時に下記の様にリポジトリが出てくるので先ほどpushしたリポジトリを選択しcreate&buildをクリックします。

![image.png](/static/images/blog/dhss.png)

## docker-composeでの運用

docker-hubのbuild画面にてsuccessが出ていたらbuild完了です。build完了を確認したらdockerを動かしたいインスタンスにて適当なディレクトリを作成し下記の様なdocker-compose.ymlとvhosts.confファイルを作成します。一様dbもdockerで用意していますが今回は設定方法や管理方法等は一旦割愛します。

```yml
version: '3'
services:
  db:
    image: mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: '0000'

  proxy:
    image: nginx
    ports:
      - "80:80"
      - "443:443"

  laravel:
    image: {先ほど作成したdocker-hubのリポジトリ}
```

```ini
server{
  listen 80;
  server_name {FQDN};
  location / {
    proxy_set_header Host $proxy_host;
    proxy_pass http://laravel;
  }
}
```

ファイルの作成が完了したらdocker-compose.ymlがあるディレクトリで下記コマンドでコンテナを追加。

```shell
docker-compose up -d
```

## サイトの開発

docker-composeを用いて本番環境とほぼ同一の環境の開発環境を構築する。先ほどのdocker-compose.ymlとvhosts.confをベースにローカル開発環境用にディレクトリを作成し下記ファイルを作成する。

```yml
version: '3'
services:
  db:
    image: mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: '0000'

  proxy:
    image: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./vhosts.conf:/etc/nginx/conf.d/default.conf

  laravel:
    build: ./laravel
    volumes:
      - ./laravel/laravel:/var/www/html
```

```ini
server{
  listen 80;
  server_name laravel.localhost;
  location / {
    proxy_set_header Host $proxy_host;
    proxy_pass http://laravel;
  }
}
```

次にlaravelリポジトリをサブモジュールとして追加し新規リポジトリを作成しpush。

```shell
git init
git submodule add {先ほど作成したlaravelのリポジトリ} laravel
git add .
git commit -m "first"
git add remote origin {bitbucketの新規リポジトリ}
git push origin HEAD
```

開発環境の起動を行う基本的には本番インスタンスと同じで下記コマンドを実行し`laravel.localhost`にアクセス

```shell
docker-compose up -d
```

### バージョンの更新

基本的にdocker-hubで設定したブランチに変更が入ると自動でビルドが開始されるのでブランチに変更を行いdocker-hub上でビルドが完了したら下記コマンドを本番インスタンスでdocker-compose.ymlがある場所で実行するだけで本番環境へのデプロイが完了する。

```shell
docker-compose pull
docker-compose up -d
```

## まとめ

以上が個人的に利用しているごく簡単なデプロイ環境の一例です間違っている箇所やもっと効率的にCI/CD等と連携できる方法等あればご教授いただけると助かります。
