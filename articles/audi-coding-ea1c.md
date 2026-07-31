---
title: "アウディコーディングメモ"
emoji: "📝"
type: tech
topics: ["車"]
published: true
published_at: 2020-07-08
---


> ※以下内容を実行した際車両の破損や車検不適合が発生した際当方は一切の責任を負いません

↑あくまでも自己責任でお願いいたします。

アウディにてVCDSを用いて電装系の動作のカスタマイズ(俗にコーディングというらしい)を行ったので、手順やカスタマイズできる内容などを紹介していく。

## 1. VCDSケーブルの準備

ヤフオクや楽天などでVCDSと検索すればケーブルが出てきますのでそちらを購入すれば問題ありません。

バージョンなどが記載されていますが商品詳細ページに対応車種、年代などが書かれています大体新しめのものを買っておけば問題ありません。

## 2. PCの準備

大体ディスクが付属していますのでディスク内にある内容など読んで適宜セットアップしてください。

VCDSのアプリケーションが起動できたら先にAuto-Scanからマップデータを取得して保存しておきます。復元用に利用できます。

## 3. 設定リスト

各種カスタマイズするには、車両側OBD2とPC側にケーブルを指してSelect Control ModuleのSelectをクリックします。下記メニュー内での番号になります。車種によっては該当の項目が存在しない場合がありますその場合は別の項目にあるか対応していない可能性があります。  
A5B8用です

```text
- MMI再起動方法
前期 SETUP+ジョイコンの真ん中+右上のボタン同時押し
後期 MENU+ジョイコンの真ん中+右上のボタン同時押し
長押しはいらないです同時押しがちゃんと認識されてれば話した瞬間再起動します。
- グリーンメニュー有効化
MMI 2gの場合
[07-Bed.Paneel/Display]
[Aanpassen-10]
[Kanaal 08]  '1'を入力
前期: SETUP+CAR同時押し
後期: CAR+MENU同時押し
MMI 3gの場合
[5F-Informatie Electr.]
[Aanpassen-10]
[Kanaal 06]  '1'を入力
メニュー起動方法は同一
- クルコンの距離調整画面表示
[13-Afstandsregeling]
[Aanpassen-10]
[Kanaal 07]  値を'1'に
MMIにてCAR->ACC内に表示されると思います。
- パーキングアシスト解除速度設定
[10-Parkeerhulp]
[Aanpassen-10]
前期  [Kanaal 23]  最大20km/h
後期  [Kanaal 233]  最大20km/h
- 停車中に内気循環切り替え(外付けではないがパーキングエアコンというらしい)
[08-Airco/Verwarming]
[Hercoderen-07] longcoding
[Byte 01]  [Bit 4]  有効化
グリーンメニュー表示->'Car'->'cardevicelist'->'Auxillary heating' 有効化
グリーンメニュー表示->'Car'->'carmenuoperations'->'Auxillary heating'この項目を5に
- キーアンサーバック有効化&MMI設定表示有効化(盗難防止装置付き車両のみ)
[46-Comfortsysteem]
[Hercoderen-07] longcoding
[Byte 01]  [Bit 2]  有効化
[46-Comfortsysteem]
[Aanpassen-10]
[Kanaal 63]  初期値 40; 44で有効化
- 内部監視機能付き警報装置有効化(日本版だと標準装備ではないが後付けした場合)
[46-Comfortsysteem]
[Hercoderen-07] longcoding
[Byte 01]  [Bit 1]  盗難防止装置有効化
[Byte 01]  [Bit 2]  ホーンでのアラーム有効化
[Byte 01]  [Bit 3]  傾斜計有効化
[Byte 01]  [Bit 4]  内部モニタ有効化
[Byte 01]  [Bit 5]  リアウィンドウセンサ有効化
[Byte 01]  [Bit 6]  アンチロッドモニタリング無線接点有効化
- アウトバーンライト有効化
130km/hで点灯します日本での車検適合未確認
[09-Boordnet]
[Hercoderen-07] longcoding
上のプルダウンから下記の様な表示のやつを選ぶ
'2 -- xxx -- RLS' (Rain and Light Sensor)
[Byte 00]  [Bit 0]  有効化
```

---

初出: https://doany.io/posts/audi-coding/
