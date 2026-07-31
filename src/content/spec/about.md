# About

国立木更津工業高等専門学校 情報工学科に入学しましたが、将来の方向性に悩み、休学してウェブマーケティング会社でエンジニアとして働き始めました。実務を通じてエンジニアとしての道に進むことを決意し、高専を中退。SES企業に就職し、さまざまな業種の現場でエンジニアとしての経験を積みました。

その後、以前から関心のあった決済代行会社に転職。最初は社内SEとしてインフラやQA業務を担当しましたが、開発職の方が自分に合っていると感じ、開発部に異動しました。

在職中には法学にも興味を持ち、東洋大学法学部イブニングコースに入学しましたが、仕事との両立が難しく中退となりました。

その後、知人の誘いでPRM（パートナー・リレーションシップ・マネジメント）事業を行う会社に転職。しかし、事業縮小をきっかけに、以前から関心のあった自動車の陸送業界にドライバーとして転職しました。

現在は自動車の中古部品・新品部品の販売に関わるSaaSを提供する会社に勤めています。エンジニアとしての経歴と、自動車まわりで積んできた経験の双方が活きる領域です。

また、趣味が高じて古物商許可証を取得し、中古車業者オークションにも加盟しています。

## Work

個人でもお仕事お受けしております。

- 中古車の買い取り、販売相談
- 貨物登録などの自動車登録関係の相談
- 言語問わずWeb系開発全般
- WordPress, LP等のサイト制作の相談

古物商許可証 第481012400049号 長野県公安委員会

ページ下部の各SNS、または [info@doany.io](mailto:info@doany.io) よりお問い合わせください。

## Projects

### [cheaper-gs-map](https://github.com/5ym/cheaper-gs-map)

全国のガソリン価格ランキングから各都道府県の上位10店舗を集めて、衛星写真の地図上に表示する静的サイトです。GitHub Actions で定期的に収集し、GitHub Pages で配信しています。

### [cash-tabelog](https://github.com/5ym/cash-tabelog)

食べログに掲載されている店舗のうち、どれだけがカード決済に対応しているかを集計するツールです。決済まわりの仕事をしていた頃の関心から作りました。

### [zero-owner](https://github.com/5ym/zero-owner)

[zero.estate](https://zero.estate/) に掲載された0円物件を毎日収集し、衛星写真の地図上に表示する静的サイトです。

### [naltec-reservation-grabber](https://github.com/5ym/naltec-reservation-grabber)

検査レーンの予約を自動で取得するツールです。予約枠が一部事業者に寡占されている状況への対抗として、個人利用の範囲で作りました。

### [fixeed](https://github.com/5ym/fixeed)

goonews.jp の RSS は日付フィールドが壊れているため、定期的に取得して W3CDTF に直したうえで再配信しています。タイムゾーンの後ろに Unix タイムスタンプが連結されていたり、`17時39分T+09:00` のように日本語の相対日付が ISO8601 のテンプレートに埋まっていたりします。

### [𝕏ool](https://x.doany.io/)

𝕏 の OAuth 2.0 を利用し、Webhook からポストを作成できるウェブアプリです。SvelteKit と SQLite で SSR 構成にしてあります。

### [Smart-QR-Payment](https://github.com/5ym/smart-qr-payment)

催事等で使える、事前注文と店頭受け取り、そしてセルフレジ機能をもったウェブアプリです。Django と Vue で作成しました。

### [k3s-gitops](https://github.com/DAnything/k3s-gitops)

k3s クラスタで動かしている各アプリのマニフェスト集です。AdGuard Home、ERPNext、Opengist、Portainer、VPN などを ArgoCD で同期しています。

### [worklog](https://w.doany.io/)

Slack / GitHub / GitLab / Backlog / Jira / OpenProject / Redmine の API ログを横断し、日別の稼働開始・終了・休憩・実働を推定するサービスです。常駐エージェントを入れる必要がなく、過去の月に遡って稼働表を作れるのが特徴です。SvelteKit と SQLite で構築しています。
