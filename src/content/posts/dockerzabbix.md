---
title: "dockerでzabbixを導入してみる"
published: 2019-04-24
description: "dockerでzabbixを導入してみる"
image: ""
tags: ["Docker", "docker-compose", "zabbix"]
category: "インフラ"
draft: false
---

## 概要

[前回の記事](./bbdhdeploy)で紹介したウェブアプリデプロイ環境だが今回はここにzabbixを導入してみる。
最近ではdockerの死活環境を監視するにはdatadogやprometheus+etc.等での監視環境があるがdatadogはコンテナ監視機能が有料なのとprometheusはalertとalertのgrafanaへの反映等にとても作業手順が多いため最初からalertやdashboardの設定がされているzabbixを採用した。
基本的に前回の続きからとなるためパッケージの導入やディレクトリ構成等は上記記事を参照してください。

## zabbixの導入

まず手元の環境がlxcなのでコンテナ内特権を許可するために以下を実行。コンテナ内特権はzabbix-agentコンテナで使用します。

```shell
lxc config set {コンテナ名} security.privileged true
cat <<EOT | lxc config set {コンテナ名} raw.lxc -
lxc.cgroup.devices.allow = a
lxc.cap.drop =
EOT
lxc restart {コンテナ名}
```

次にzabbix関連のコンテナを用意していきます今回はzabbix公式イメージではなくmonitoringartistのdocker向けのzabbixイメージを利用しますこちらを利用することでテンプレートの設定の手間等がほぼなしでセットアップができます。それでは前回作成したdocker-compose.ymlを下記の様に編集します。データベースのユーザ,パスワード等は適宜設定を変更してください。

```yml
version: '3'
services:
  db:
    image: mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: '0000'

  laravel:
    image: yuim/laravel

  zabbixdb:
    image: monitoringartist/zabbix-db-mariadb
    restart: always
    environment:
      MARIADB_USER: "zabbix"
      MARIADB_PASS: "zabbix"
    volumes:
      - zabbixdb:/var/lib/mysql

  zabbixs:
    image: monitoringartist/dockbix-xxl
    restart: always
    environment:
      ZS_DBHost: "zabbixdb"
      ZS_DBUser: "zabbix"
      ZS_DBPassword: "zabbix"
      PHP_date_timezone: "Asia/Tokyo"

  zabbixa:
    image: monitoringartist/dockbix-agent-xxl-limited
    privileged: true
    restart: unless-stopped
    volumes:
      - /:/rootfs
      - /var/run:/var/run

volumes:
  zabbixdb:
    driver: local
```

次にzabbixのコンソールにアクセスできるようにvhosts.confを下記のように追記

```nginx
server{
  listen 80;
  server_name {fqdn};
  location / {
    proxy_set_header Host $proxy_host;
    proxy_pass http://laravel;
  }
}
server{
  listen 80;
  server_name {fqdn};
  location / {
    proxy_set_header Host $proxy_host;
    proxy_pass http://zabbixs;
  }
}
```

最後に下記コマンドを実行するとzabbixが立ち上がります。コマンド実行完了後30秒程度でアクセスできるようになります。

```shell
docker-compose up -d
```

## agentの設定

起動が完了したら早速コンソールにアクセスしてログインします初期ID/PWは`Admin/zabbix`ですログインしたらメニューの`Configration`->`Hosts`の順番でクリックし右上の`Create host`をクリックします。下記の通り設定してください。

![Screenshot from 2019-04-24 22-05-01.png](/static/images/blog/dockerzabbix0.png)

次にTemplatesタブに移動して`Select`をクリックし`Template App Docker - www.monitoringartist.com`と`Template OS Linux`を選択しSelectをクリックその後下の`Add`をクリックしさらにその下にある`Add`で登録します。初期設定で10分程度でコンテナが認識されるはずですコンテナの状況は`Monitoring`->`Latset data`で確認できます。

## alertの設定

そのままではdockerがstopした際等にalertをしてくれないのでプロトタイプにtriggerを設定していく。webの疎通確認のトリガーに関してはdockerだからといって特段変わった設定は要らないので今回は割愛します。プロトタイプのtrigger設定は先程の`Hosts`の画面で先程作成したホストの`Discovery`をクリック次に`Running containers`と記載がある行の`Trigger prototypes`をクリックその次に右上の`Create trigger prototype`をクリックそうするとtrigger作成画面になるので下記のように入力し`Add`をクリックし作成します。こちらも10分程度で反映されます。

![Screenshot from 2019-04-24 22-20-24.png](/static/images/blog/dockerzabbix1.png)

## mail通知の設定

dockerの監視に関する設定は以上になるが、zabbixにはメール通知機能がついておりそちらも設定したので設定方法を紹介する。まず`Administration`->`Media types`をクリック次にEmailをクリックgmailのsmtpsを利用する際は下記の様に設定します。

![Screenshot from 2019-04-24 22-32-18.png](/static/images/blog/dockerzabbix2.png)

次にメール送信先ユーザーを設定していきます。今回は初期アカウントであるAdminに設定します。まず`Administration`->`Users`をクリック次に`Admin`をクリック`Media`タブを選択し`Add`をクリック`Type`で`Email`を選択し`Send to`に送信先を入力し`Add`をクリック最後にその下の`Update`をクリックして保存します。最後に`Configuration`->`Actions`をクリックし`Disabled`になっている箇所をクリックして`Enabled`にします。以上でメール送信の設定は完了です。
