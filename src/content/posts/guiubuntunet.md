---
title: "GUIを入れたubuntuでネットワークが繋がらない"
published: 2019-01-11
description: "GUIを入れたubuntuでネットワークが繋がらない"
image: ""
tags: ["Ubuntu", "networkmanager", "netplan"]
category: "インフラ"
draft: false
---

ubuntu等のlinuxにnetplanでipを固定設定をしていてその後にubuntu-desktopやnetworkmanager等のGUIを入れた際NetworkManagerの管理外となりネットワークが繋がらなかったりGUIから設定できなくなることがあるその際は`/etc/netplan/`にyamlファイルを作成しNetworkManagerがnetplanを利用できるように設定を書き足せば良い下記の通り設定すれば動くと思われる。

```yaml
network:
  version: 2
  renderer: NetworkManager
```
