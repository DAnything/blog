---
title: "Mercedes NTG ATAロック解除メモ"
emoji: "🔓"
type: tech
topics: ["車"]
published: true
published_at: 2024-05-25
---


下記で紹介されているxboxhdmを使う有名な方法があるがxboxhdm v1.9はsata接続に対応していないため4.5のsata接続以降では利用できない    
[NTG4.5 / 4.7 HDD imaging project](https://mhhauto.com/Thread-NTG4-5-4-7-HDD-imaging-project)  
fujtoolを利用する方法等が紹介されているがそもそもwindows用のsmart編集ツールなどで解除できないか調べた  
windowsで利用できるusb, sataなどに対応したsmart編集用ツールとしてsmartctlがある、またxboxhdmの最新版v.2.3においてはunlockhdコマンドにsmartctlが利用されている

ならば上記フォーラムに記載のパスワード生成手順と合わせ下記のようなコマンドでロックが解除できるのではないかと予想している

```shell
./smartctl.exe -s security-unlock,"longUserPasswordFromMelcoCalculator" /dev/sdb
./smartctl.exe -s security-disable,"longUserPasswordFromMelcoCalculator" /dev/sdb
```

---

初出: https://doany.io/posts/ntg-ssd/
