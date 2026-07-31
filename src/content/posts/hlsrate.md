---
title: "hls.jsのレベル変更で躓いた件"
zennEmoji: "🎬"
published: 2018-12-18
description: "hls.jsのレベル変更で躓いた件"
image: ""
tags: ["tech"]
category: "Web開発"
draft: false
---

## 概要

すごく稚拙の理由だがhls.jsでレベル変更機能(m3u8ファイルの切り替え)で躓いた。

## 躓いたとこ

hls.jsにはhls.currentLevelというapiが用意されていてこちらの値を変更することでレベルの変更ができるようになっているのだがこちらにslectを変更した際にoptionの値を導入するという仕様で作成を試みたのだが-1を与えてると再生が止まる状況に陥ってしまった。

```js
$('.res>select').on('change', function() {
    hls.currentLevel = $(this).val();
});
```

### 解決方法

optionのvalueをNumberでキャストすれば治ります。

```js
$('.res>select').on('change', function() {
    hls.currentLevel = Number($(this).val());
});
```

### 原因

val()で取得した値は非明示的に文字になったり数字になったりする-がついた際に文字にキャストされさらにはhls.jsが内部で値チェック等を行っていなかったためエラーなどもでず再生できなくなったと思われる。

## まとめ

かなりレベルの低い内容だったが筆者のレベルが低いのか解決になかなか時間がかかったりする。日本語でこういった情報が溢れていてくれるとありがたい。
