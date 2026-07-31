---
title: "RDS+ECSで定期的にダンプをS3に保存してみる"
emoji: "📝"
type: tech
topics: ["S3","RDS","Docker","ECS","BitbucketPipelines"]
published: true
published_at: 2019-10-31
---


## 概要

AWS にて RDS の定期ダンプを取得したかったので ECS にある cron 的な機能を使ってダンプを定期取得する設定をしてみた  
ECS で動かす定期実行用のコンテナのイメージやタスクも管理を自動化してみた  
今回 postgres が対象です mysql 等は適宜 dockerfile を変更してください

## 前提条件

- AWS のアカウント取得済み
- RDS 構築済み
- bitbucket のアカウント取得済み

## 準備

### IAM ユーザーの作成

今回 bitbucket pipeline からのデプロイとダンプデータ S3 へのアップロード用にユーザーを作成する。  
通常はデプロイと S3 でユーザーを分けた方がいいのだが今回は管理コストの面で一つで作成します。

IAM を開き左メニューにあるユーザーを開くその後ユーザーの追加を開くと下記の様な画面になる  
ユーザー名を適宜入力,アクセスの種類をプログラムによるアクセスに制限

![console.aws.amazon.com_iam_home_.png](https://doany.io/static/images/blog/rdsecsdump0.png)

`AmazonECS_FullAccess`, `AmazonEC2ContainerRegistryFullAccess`, `AmazonS3FullAccess`を選択(今回 CLI で同一ユーザーを使いたかったので広に権限取ってあります。わかる人は適宜絞ってください。)

![console.aws.amazon.com_iam_home_ (1).png](https://doany.io/static/images/blog/rdsecsdump1.png)

その後特に設定項目はないのでユーザーの作成まで進む  
最後にこのような画面が表示されるのでアクセスキー ID とシークレットアクセスキーをメモしておいてください。シークレットアクセスキーに関しては追加発行できますが二度と再表示できないので絶対にメモしておいてください。

![console.aws.amazon.com_iam_home_ (2).png](https://doany.io/static/images/blog/rdsecsdump2.png)

### IAM ロールの作成

タスクを実行するためのロールだが自動で作られるものではあるのだが ECS を全く使っていない場合は作成されていないので手動で作成する。  
(`ecsTaskExecutionRole`と最後に付くロールが既にある場合はその ARN をメモしておいてください)  
IAM を開き左メニューにあるロールを開くその後ロールの作成を開くと下記の様な画面になる  
`Elastic Container Service`を選択次に`Elastic Container Service Task`を選択次へ

![console.aws.amazon.com_iam_home_region=ap-northeast-1 (1).png](https://doany.io/static/images/blog/rdsecsdump3.png)

`AmazonECSTaskExecutionRolePolicy`を選択その後特に設定項目はないのでロールの作成まで進む

![console.aws.amazon.com_iam_home_region=ap-northeast-1 (2).png](https://doany.io/static/images/blog/rdsecsdump4.png)

作成が完了したら元の画面に戻ってくるので先ほど作成したロールを開く下記画面の`ロール ARN`をメモしておいてください。

![console.aws.amazon.com_iam_home_region=ap-northeast-1 (4).png](https://doany.io/static/images/blog/rdsecsdump5.png)

### バケットの作成

特別設定する項目はありません。適宜設定の上作成しておいてください。  
その際作成した名前をメモしておいてください。

### ECR リポジトリの作成

こちらも特別設定する項目はありませんが、パイプラインでタグを上書きする関係上タグのイミュータビリティは無効化しておいてください(デフォルトで無効)  
作成した後 URI のカラムにある URL みたいなものをメモしておいてください。

### bitbucket でリポジトリの作成

いつも通りリポジトリを作成してください。  
ローカルで下記の通りファイルを作成してください。

```shell
~/
 ├ .pgpass
 ├ bitbucket-pipelines.yml
 ├ Dockerfile
 └ docker-entrypoint.sh
```

.pgpass は postgres にパスワードを省略してアクセスするためのパスワードファイルですダ下記の通り記述してください。

```shell
hostname:port:database:username:password
```

bitbucket-pipelines.yml は bitbucket のパイプラインの定義を記述するファイルです下記の通り記述してください。  
execution-role-arn のところに先ほどメモした`ロール ARN`を記入してください。

```yml
# enable Docker for your repository
options:
  docker: true

pipelines:
  default:
    - step:
        name: build-push
        image: atlassian/pipelines-awscli:latest
        deployment: test
        caches:
          - docker
        script:
          # aws login
          - eval $(aws ecr get-login --no-include-email --region ${AWS_DEFAULT_REGION})
          # docker
          - export BUILD_ID=$BITBUCKET_BRANCH_$BITBUCKET_COMMIT_$BITBUCKET_BUILD_NUMBER
          - docker build -t ${AWS_REGISTRY_URL}:$BUILD_ID -t ${AWS_REGISTRY_URL}:development .
          - docker push ${AWS_REGISTRY_URL}

    - step:
        name: deploy
        image: atlassian/pipelines-awscli:latest
        deployment: production
        script:
          - export BUILD_ID=$BITBUCKET_BRANCH_$BITBUCKET_COMMIT_$BITBUCKET_BUILD_NUMBER
          - export IMAGE_NAME="${AWS_REGISTRY_URL}:$BUILD_ID"
          # ECS variables
          - export ECS_CLUSTER_NAME="${BITBUCKET_REPO_OWNER}"
          - export ECS_SERVICE_NAME="${BITBUCKET_REPO_SLUG}"
          - export ECS_TASK_NAME="${BITBUCKET_REPO_SLUG}"
          # Create ECS cluster, task, service
          - aws ecs list-clusters | grep "${ECS_CLUSTER_NAME}" || aws ecs create-cluster --cluster-name "${ECS_CLUSTER_NAME}"
          # Updating the existing cluster, task, service
          - export TASK_VERSION=$(aws ecs register-task-definition
            --family "${ECS_TASK_NAME}"
            --execution-role-arn ""
            --network-mode "awsvpc"
            --requires-compatibilities "FARGATE"
            --cpu "256"
            --memory "512"
            --container-definitions "[{\"name\":\"${ECS_TASK_NAME}\",\"image\":\"${IMAGE_NAME}\",\"logConfiguration\":{\"logDriver\":\"awslogs\",\"options\":{\"awslogs-group\":\"/ecs\",\"awslogs-region\":\"${AWS_DEFAULT_REGION}\",\"awslogs-stream-prefix\":\"${ECS_TASK_NAME}\"}}}]"
            | jq --raw-output '.taskDefinition.revision')
          - echo "Registered ECS Task Definition:" "${TASK_VERSION}"
```

Dockerfile は ECS でデプロイする用のコンテナ定義です下記の通り記述してください。  
補足がある箇所は先ほどメモしたものから適宜いれてください。

```dockerfile
FROM alpine

RUN apk --no-cache add postgresql-client python3
RUN pip3 install awscli
ENV AWS_DEFAULT_REGION ap-northeast-1
ENV AWS_ACCESS_KEY_ID {アクセスキーID}
ENV AWS_SECRET_ACCESS_KEY {シークレットアクセスキー}
RUN mkdir dump
WORKDIR /root/dump
ADD .pgpass /root/.pgpass
RUN chmod 0600 /root/.pgpass
ADD docker-entrypoint.sh /root/docker-entrypoint.sh
RUN chmod +x /root/docker-entrypoint.sh

CMD ["/root/docker-entrypoint.sh"]
```

docker-entrypoint.sh は docker 起動時に実行するコマンド群ですいわゆる cron の中身です。  
補足がある箇所は先ほどメモしたものから適宜いれてください。  
保存構成的には最初のプレフィックスが削除周期次に DB 名最後にファイルの接頭辞が今回はダンプの周期を入れています。

```shell
#!/bin/sh

mkdir -p yearly/{DB名}
pg_dump -Fc -h {DBのホスト} -U {ユーザー} {DB名} > yearly/{DB名}/weekly-`date "+%Y%m%d_%H%M%S"`.custom
aws s3 sync . s3://{S3のバケット}
```

準備が完了したらいつもの通り先ほど作成したリポジトリにプッシュしてください。

### bitbucket での pipeline の準備

先ほどプッシュしたリポジトリを bitbucket で開く  
設定->PIPELINES->Settings に進み`Enable Pipelines`を有効にする

![bitbucket.org_j-roi_dump_admin_addon_admin_pipelines_settings.png](https://doany.io/static/images/blog/rdsecsdump6.png)

次に`Repository variables`を開く  
下記の通り先ほどメモしたものから設定をする。

![bitbucket.org_j-roi_dump_admin_addon_admin_pipelines_repository-variables.png](https://doany.io/static/images/blog/rdsecsdump7.png)

## デプロイと cron の設定

### デプロイの実行

引き続き bitbucket の画面で再度メニューから`Pipelines`を開く次に`Run pipeline`をクリックし下記の通り選択して`Run`をクリック

![bitbucket.org_j-roi_dump_addon_pipelines_home.png](https://doany.io/static/images/blog/rdsecsdump8.png)

完了すると下記の様になるのでパイプラインが完了するのを待つ

![bitbucket.org_j-roi_dump_addon_pipelines_home (1).png](https://doany.io/static/images/blog/rdsecsdump9.png)

次回以降ブランチに変更が入る度自動で実行されます。

### AWS でスケジュールの作成

AWS ECS 上でリポジトリオーナー名でクラスタが作成されているのでそのクラスタを開く(クラスタ名が書かれているところをクリックすると開きます)。

![ap-northeast-1.console.aws.amazon.com_ecs_home_region=ap-northeast-1.png](https://doany.io/static/images/blog/rdsecsdump10.png)

タスクのスケジューリングのタブを開き作成をクリック

![ap-northeast-1.console.aws.amazon.com_ecs_home_region=ap-northeast-1 (1).png](https://doany.io/static/images/blog/rdsecsdump11.png)

実行間隔等を設定しターゲットの部分は今回`FARGATE`用にタスクを作成したので起動タイプを`FARGATE`を選択タスク定義のファミリーはリポジトリ名と同名のタスクがあるのでそれを選択する。VPC とセキュリティグループは適宜設定してください。

![ap-northeast-1.console.aws.amazon.com_ecs_home_region=ap-northeast-1 (2).png](https://doany.io/static/images/blog/rdsecsdump12.png)

補足:Cron 式を選択したときに躓いたのだが busybox cron 等の cron 式とは違う模様下記を参考にいたしました。  
[AWS_Cron 式のワイルドカード](https://qiita.com/da-sugi/items/ef3bb45a8a99a4acacb1)

---

初出: https://doany.io/posts/rdsecsdump/
