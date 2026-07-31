---
title: "hhvm環境でlaravel5.7のプロジェクトを作成しようとしたら苦労した話"
emoji: "🔺"
type: tech
topics: ["HHVM","laravel","PHP"]
published: true
published_at: 2018-09-27
---


> hhvmでのphpのサポートが終了していますhhvmでのphpの利用は非推奨です。

## 初めに

当方がhhvm環境でlaravel5.7を導入しようとした際の備忘録として導入の際に発生した問題、解決策を書いていく

## composerの導入

自分は簡単なLaravelインストーラーを使用したのでまずLaravelインストーラーを導入するためにcomposerを導入しようとしたのだがその際下記の様なコマンドで導入しようとしたのだがインストール自体は完了するがapt自体がcomposerに必要なphp-commonやphp-cliを自動で同時にインストールされるためその際hhvmとphp-cliが競合してしまいcomposerコマンドが使い物にならなくなるなので解決策としては下記を参照

```console
sudo apt install composer
```

[公式ページ](https://getcomposer.org/download/)にもあるがセットアップ用のスクリプトをダウンロードしてきてpharを作成しパスを通すこれでhhvm環境でも問題なく動くはずだこの際注意なのだが誤ってaptでcomposerを導入してしまった場合composerだけでなくphp-*等で特に理由がない限りはphp環境を削除しておくこと

```console
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php -r "if (hash_file('SHA384', 'composer-setup.php') === '93b54496392c062774670ac18b134c3b3a95e5a5e5c8f1a9f115f203b75bf9a129d5daa8ba6a13e2cc8a1da0806388a8') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
php composer-setup.php
php -r "unlink('composer-setup.php');"
mv composer.phar /usr/local/bin/composer
```

## laravelインストーラーの導入

次にlaravelインストーラーを導入していくといっても下記のコマンドを実行してパスを通すだけどこちらでは特に問題は発生しなかった

```console
composer global require "laravel/installer=~1.1"
```

上記コマンドを実行して`~/.composer/vendor/bin`こちらにパスを通せば完了

## phpenvの導入

ここでやっとプロジェクトの作成ができると思ったのだが何やらエラーが出てきて進めなくなりました。この時点では知らなかったのですlaravel5.7がphp7.1からサポートなのですがhhvmは最新安定板がphp7.0ベースなため動かないことが判明しました。解決策としてはphpenvを導入してcliのphpバージョンを切り替えるという方法です。下記コマンドを実行していきます。

```console
git clone https://github.com/CHH/phpenv.git
cd phpenv/bin
./phpenv-install.sh
```

上記が完了したら下記を`.bashrc`なりに記述します

```bash
export PATH="$HOME/.phpenv/bin:$PATH"
eval "$(phpenv init -)"
```

そうしたら`source ~/.bashrc`なりで.bashrcを読み込みなおして`phpenv`コマンドが通っていればphpenvの導入は完了です。

## phpenvでphpのビルド

次はphp7.1以上の環境をphpenvで導入していきます。下記コマンドでインストール可能リストがみれますので7.1以上のものをえらびます。

```console
phpenv install --list
phpenv install {インストールするバージョン、エディション}
```

当方の環境ではライブラリが足りずビルドができなかったphpのビルドには様々なライブラリが必要なのだがaptでのパッケージ名で必要なライブラリの一覧等が見つけられなかったのでエラーに出てきたライブラリをインストールしてビルドしなおすという作業を繰り返しました。(ライブラリ一覧やもっと効率の良い方法があったら教えていただけると助かります)そしてビルドが完了したら下記コマンドでphpenvのバージョンを切り替えます。

```console
phpenv global {インストールしたバージョン、エディション}
```

## laravelプロジェクトの作成

laravelのプロジェクト自体はコマンドで作成できる。これで環境が構築できたと思うがphpenvの仮想環境はcliのみの設定となっているのでロードバランサー側のphp設定はhhvmのままだとエラーが出る可能性があるので別途設定がひつようだ。

```console
laravel new {プロジェクト名}
```

## まとめ

単純に当方の技術、能力不足な面が大きいが環境構築だけでかなりてこずってしまったこの記事が何かの解決につながれば幸いだ。

---

初出: https://doany.io/posts/hhvmlaravel/
