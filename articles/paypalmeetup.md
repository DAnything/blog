---
title: "PayPalのClient Integrationの簡易的な実装方法"
emoji: "📝"
type: tech
topics: ["tech","PayPal","決済"]
published: true
published_at: 2018-09-26
---


[PayPal Tech Meetup](https://techplay.jp/event/690091)に行ってきてPayPalのClient Integrationについて色々お話が聞くことができたので決済後処理、決済フローのカスタマイズを除いて簡易的にボタンを作成する方法を紹介していく

## 1.スタイルの決定

[Checkout Integration Patterns](https://developer.paypal.com/demo/checkout/#/pattern/checkout)こちらでCheckoutボタンのテストができるのでこちらで確認しながらきめるとよいだろう下記がstyle関連で使用できるオプションです。

```js
locale: 'ja_JP'
```

ボタン等に使用する言語使用可能な言語は[こちら](https://developer.paypal.com/docs/integration/direct/rest/locale-codes/#supported-locale-codes)を参照

```js
style: {
    size: 'small',
    color: 'gold',
    shape: 'pill',
    label: 'checkout',
    tagline: 'true',
    layout: 'vertical',
    fundingicons: 'true'
}
```

ボタンのデザインに関するオプション[こちら](https://developer.paypal.com/docs/checkout/how-to/customize-button/#button-styles)から使用できるオプションを確認できます。  
またfundingだが日本だったら特にカスタマイズは要らないはずですチェックアウトボタンでのクレジットカード決済は有効になっているのでfundingiconsをtrueにしていただくか、layoutをverticalにしていただければアクセプタンスマークが表示されるはずですのでそちらからクレジットカード決済が可能になります。

## 2.ボタンの実装

[こちら](https://developer.paypal.com/developer/applications/)でREST API appsのCreate Appフロー通り情報を入力してAppを作成してください、作成が完了したらappのページを開きClient IDをどこかにメモしておいてくださいこれがSandbox(テスト)のIDになります次に右上のLiveをクリックしてください違うClient IDが表示されるのでこちらもメモしておいてくださいこれがLive(本番)のIDになります

```html
<script src="https://www.paypalobjects.com/api/checkout.js"></script><!--checkout.min.jsにするとminify版になります-->
<div id="paypal-button-container"></div><!--DOMで操作したいエレメント簡単に言うとボタンの設置場所-->
<script>
    paypal.Button.render({
        env: 'sandbox', //snadbox(テスト)かproduction(本番)か
        locale: 'ja_JP' //言語設定
        style: {
            //ここに先ほど決定したデザインを入れる
        },
        client: {
            sandbox: '', //先ほどメモしたsandboxのClient IDを入れる
            production: '' //先ほどメモしたLiveのClient IDを入れる
        },
        payment: function(data, actions) {
            return actions.payment.create({
                payment: {
                    transactions: [
                        {
                            amount: {total: '1000', currency: 'JPY'}
                        }
                    ]
                }
            });
        }, //商品内容や買い手へのメッセージ等の設定ができるこちらを参照https://developer.paypal.com/docs/checkout/integrate/#2-set-up-a-payment
            //また配送情報の削除等も可能こちらを参照https://developer.paypal.com/docs/checkout/how-to/customize-flow/#pass-web-experience-profile-options
        onAuthorize: function(data, actions) {
            return actions.payment.execute().then(function() {
                window.alert('Payment Complete!');
            });
        } //決済時のhookアクション等の設定ができる見本は決済完了時こちらを参照https://developer.paypal.com/docs/checkout/how-to/customize-flow/#show-a-confirmation-page
    }, '#paypal-button-container');//ボタンをレンダリングするエレメントのセレクタが引数
</script>
```

## 3.決済テスト

テスト用アカウントをログインできるようにする必要がある[こちら](https://developer.paypal.com/developer/accounts/)を開きアカウントをクリックしたらprofileをクリックそうするとモーダルが開くのでChange passwordをクリック任意のパスワード入力後saveをクリックこれを2アカウントあるはずなので両方行う次にチェックアウトボタンをテスト用のページなりで使用できるようにするコードが問題なければボタンが表示されるはずなのでクリックするenvの値がsandboxの場合sandboxの決済画面が開くので先ほどのアカウント一覧の画面のPERSONALと書かれている方でログインする、そうすれば決済ができるはずです。次にテスト用のアカウントで決済の受け取りが完了しているかの確認ですが[こちら](https://www.sandbox.paypal.com/jp/signin?country.x=JP&locale.x=ja_JP)から先ほどのアカウント一覧の画面のBUSINESSと書かれている方でログインすると先ほどテストで決済した分が反映されていれば成功していることになりますが、反映まで時間がかかるので注意が必要です。

## まとめ

速足で簡単な実装について説明して感じたことだが公式の[qiita](https://qiita.com/PPJP/items/990c55538213b7da04ad)の情報の少なさ英語版リファレンスの非フロー的な機能説明(主に情報が分散しすぎてる)が多いと感じました。その辺りなんとかなればもっと利用者が増えるのではないだろうか。

---

初出: https://doany.io/posts/paypalmeetup/
