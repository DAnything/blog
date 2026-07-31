---
title: "ubuntuのlxdが仮想ブリッジからネットワークにつながらない"
emoji: "📝"
type: tech
topics: ["lxc","lxd","netplan"]
published: false
---


## 概要

ubuntuでlxdの環境を構築した際ネットワークにつながらないという事象が発生した。

## 構成情報

- ubuntu18.04.3
- lxc,lxd3.17(snapバージョン)
- netplanにて仮想ブリッジを作成
- lxcコンテナにnetplanで作成したブリッジをアタッチした状態

## 解決策

どういった条件で引き起こされるかは不明だがubuntuのlxdがufwの書き換えでnatを設定しているためufwが無効化されているとコンテナ内部から適切にnat forwardされずに外部と疎通できなくなる。つまり下記コマンドで解消する

```bash
sudo ufw enable
```

これでもつながらない場合は本来は個別にroutedを作成しなければいけないがめんどくさい場合は下記を実行してすべてのroutingを許可

```bash
sudo ufw default allow routed
```

---

初出: https://doany.io/posts/ubuntulxdnet/
