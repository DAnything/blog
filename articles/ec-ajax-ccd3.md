---
title: "EC-CUBE3系に簡単なAjax用エンドポイントを作成してみる"
emoji: "📝"
type: tech
topics: ["tech","EC-CUBE","PHP","Silex","Symfony"]
published: false
---


仕事の方でEC-CUBE3系を触る機会がありその際EC-CUBE3系にAjax用のエンドポイントを実装したので備忘録としてまとめてみた。

## 概要

EC-CUBE3系では標準でwebAPIが用意されているのだがそちらをSymfony内で有効化する方法や利用方法のドキュメントが皆無でありSymfony内で開発したほうが早いと思われたため自前で実装をした。

## How to

### routeの設定

まずはじめにAPI用のrouteを定義する。今回は特にCRUIDを意識した実装内容でないためmatchで下記の通りとした。routeの定義場所についてはPlugin内が推奨Pluginの構築方法等は[こちら](https://note.mu/j_ukyo/n/n47bc02beb30a)を参考にさせていただいた。

```php
$app->match('/api', 'Plugin\Custom\Controller\ApiController::index')->bind('api');
```

### コントローラの実装

次にエンドポイントとなるコントローラの実装だがroute定義でおわかりの通りSymfonyのform builderは使用せずにCSRF対策を行うEC-CUBEの公式ドキュメント等に記載はないが$app内にcsrf_providerがあるのでそちらを利用する。今回はajaxで実装するため下記の通り実装した。動作自体は商品IDを受け取ったらをれをお気に入りに追加するというものだ簡易的なものなのでお気に入り追加済み等のチャックやtry等は実装していない。

```php
<?php
    namespace Plugin\Custom\Controller;

    use Eccube\Application;
    use Symfony\Component\HttpFoundation\Request;
    use Symfony\Component\Security\Csrf\CsrfToken;
    use Symfony\Component\HttpFoundation\Response;

    class ApiController {
        public function index(Application $app, Request $request) {
            if($app['form.csrf_provider']->isTokenValid(new CsrfToken('csrf', $request->get('csrf')))) {
                $Customer = $app->user();
                $Product = $app['eccube.repository.product']->get($request->get('id'));
                $res = $app['eccube.repository.customer_favorite_product']->addFavorite($Customer, $Product);
                return '{"success": "success"}';
            }
            return Response::create('', 400);
        }
    }
```

### フロントの実装

次にフロントの実装だが今回はAjaxにjQueryを使用した。まずdefault_frame.twig等に下記の用にcsrf用のトークンを入れる。じつはcsrf_tokenが定義済みでtwig内で使用可能となっている()内のcsrfの部分はハッシュとなるためこちらの値が先程のコントローラのCsrfTokenインスタンス化時に指定した値と一致していなければならない本来はフォームを特定するためのものなのだがそこまでの対策でセキュリティの懸念には対して影響しないと思われたため今回はこのような実装とした。

```js
var csrf = "{{ csrf_token('csrf') }}";
```

ajax実行部分については下記の通り実装したidの箇所には商品IDが入る。

```js
$.ajax({
    type: 'POST',
    url: '/index_dev.php/api',
    data: 'csrf='+csrf+'&id='+id,
    dataType: 'json'
}).then(function(data) {
    console.log(data);
}, function(data) {
    console.log(data);
});
```

## まとめ

かなり早足で簡単な実装方法を紹介したがあくまでこれは旧バージョンで半ば強制的に対応する方法なので特段理由がないのであればそうそうに3系のサポートを切り旧バージョンのFWを採用するようなEC-CUBEの利用はやめましょう。(筆者のおすすめはWooCommerceのほうがおすすめです)

---

初出: https://doany.io/posts/ec-ajax/
