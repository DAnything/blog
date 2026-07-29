---
title: "ZabbixのアラートをIFTTTで通知する"
published: 2019-09-17
description: "ZabbixのアラートをIFTTTで通知する"
image: ""
tags: ["zabbix", "ifttt"]
category: "インフラ"
draft: false
---

## 概要

ちまたではPushbulletを使う方法やSlackを使う方法等が紹介されているがそもそもIFTTTアプリをスマホに入れており。履歴を記録する必要もなかったためIFTTTのプッシュ通知機能でアラートを受け取れるよう設定した。

## 前提条件

- Zabbixのバージョンは4
  - 基本的には下記記事で構築した通りの環境
  - [dockerでzabbixを導入してみる](./dockerzabbix)
  - 設定を日本語に変更済み今回は日本語でのUIを使って解説する
- iOSもしくはandroid端末にIFTTTアプリを導入しプッシュ通知を許可済み

## 設定手順

### メディアの作成

1. `管理`->`メディアタイプ`を開く
2. `メディアタイプの作成`を開く
3. 下記の通り設定(`SUBJECT`は二個要らないですミスで入れてしまいました。)

![image.png](/static/images/blog/zabbixifttt0.png)

4. (画像では登録済みのため更新と出ているが)追加をクリック

### メディアの紐づけ

1. 右上のユーザーアイコンをクリック
2. `メディア`->追加をクリック
3. `タイプ`でpushを選択
4. 送信先は今回使わないのでダミーで何か入れておいてください
5. 追加をクリック
6. 更新をクリック(ここを忘れて別ページ移ると設定が消えます)

### IFTTTレシピの作成

1. [レシピの作成](https://ifttt.com/create)を開く
2. thisにwebhooksを設定(途中で`Event Name`を聞かれますが後で使うので覚えておいてください)
3. thatに`Notification`の`Send a rich notification from the IFTTT app`を設定
4. 下記の通り設定

![image.png](/static/images/blog/zabbixifttt1.png)

#### プッシュ通知のテストとURLの取得

1. [webhooks](https://ifttt.com/maker_webhooks)を開く
2. 右上の`Documentaition`を開く
3. イベントの箇所に先ほど作成したwebhookのイベント名`value1`に適当な文言`value2`に適当なURLを入れる
4. `Test It`をクリック
5. IFTTTアプリが入ってる端末にプッシュ通知が届きプッシュ通知を開いた際に`value2`に入れたURLが開かれることを確認
6. この時のテスト画面にあったURLをコピーしておいてください

### scriptの設定

Monitoring Artistのdockbixのalertスクリプトのパスは[この](https://github.com/monitoringartist/dockbix-xxl)公式資料の`ZS_AlertScriptsPath`にあるとおり`/usr/local/share/zabbix/alertscripts`にあるzabbixの環境によってこのパスはことなると思うが、基本的にzabbixで設定されているalertscriptsディレクトリにスクリプトファイルを設置しないと呼び出されません。(永続化は別途設定必要)

1. alertscriptsディレクトリに`push.sh`を作成下記の通り記述

※何故STDINを使って改行しているかというと`$1`の中身が改行されていたため最初通知の発砲に失敗しており個の箇所を現在の様に修正したら治りました。よりよい解決放があればご教示願います。

```sh
#!/bin/sh
curl -X POST {先ほどのURL} -H "Content-Type: application/json"
-d @- << EOF
{
  "value1":"${1}",
  "value2":"${2}"
}
EOF
```

2.最後におまじないをして終わり`chmod +x push.sh`(大体意味は分かると思うので説明は割愛)

### プッシュ通知用にアクションをカスタマイズ(テスト中動かないかも)

IFTTTでURL用のパラメーターを設定したがそれをアクションの件名を使って引用しているので件名の欄をイベントURLに書き換えれば通知を開いた際アラートのイベント画面が開く(はず)

1. `設定`->`アクション`を開く
2. デフォルトのアクションを開き`複製`をクリック
3. `実行内容`,`復旧時の実行内容`,`更新時の実行内容`の`デフォルト件名`を下記の様な形式に書き換え  
`http://{zabbixホスト}/tr_events.php?triggerid={TRIGGER.ID}&eventid={EVENT.ID}`
4. `実行内容`,`復旧時の実行内容`,`更新時の実行内容`の`実行内容`のステップ1の`変更`をクリック
5. `次のメディアのみ使用`の箇所を`push`を選択
6. `作成`をクリック
