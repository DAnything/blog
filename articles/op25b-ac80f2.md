---
title: "postfixの導入とOP25Bの回避"
emoji: "📮"
type: tech
topics: ["Ubuntu","postfix","OP25B"]
published: true
published_at: 2018-08-01
---


## 概要

ubuntu server 18.04.1にてpostfixを導入しOP25Bの回避設定をしたので備忘録としてこちらに書いていく。

## postfixの導入

下記コマンドを実行。

```console
sudo apt install postfix
```

## postfixの設定

### OP25Bの回避

まずOP25Bとは簡単に説明すると25番ポートを用いて直接メールを送信するのをブロックし迷惑メールを減らすためのもので今ではほとんどのISPが導入している、その為ISPのメールサーバー等を経由(ここに関してはお使いの環境によって異なります)してメールを送信するように設定する必要がある、方法は簡単で/etc/postfix/main.cf内を下記の様に編集していく。

```ini title="/etc/postfix/main.cf"
relayhost = [mail.so-net.ne.jp]:587 #ISPのmailサーバー
smtp_sasl_auth_enable = yes
smtp_sasl_mechanism_filter = plain
smtp_sasl_password_maps = hash:/etc/postfix/mailpass
smtp_sasl_security_options = noanonymous
smtp_sasl_tls_security_options = noanonymous
smtp_use_tls = yes
smtp_tls_CApath = /etc/ssl/certs/ca-certificates.crt #ca証明書(お使いの環境によって違います)
```

次に/etc/postfix/mailpassを作成下記の様に記述していく。

```plaintext
[{ISPのメールサーバー}]:587 {ID}:{パスワード}
```

次にID、パスワードをハッシュ化しpostfixを再起動して送信テストするため以下を実行。

```console
sudo postmap hash:/etc/postfix/mailpass
sudo systemctl restart postfix
echo "Hello post" | sendmail {メールアドレス}
```

## まとめ

以上でOP25Bの回避ができます。自宅サーバーでメールが送信できないなんてときは試してみてください。

---

初出: https://doany.io/posts/op25b/
