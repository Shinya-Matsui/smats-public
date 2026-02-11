<!-- Category: Development -->

# CloudflareでカスタムドメインをWorkers/Pagesに設定する

## 学んだこと

- **ネームサーバーの役割**: ドメインのDNSをどのサービスで管理するかを決める「住所録の管理者」のようなもの。ムームードメインからCloudflareにネームサーバーを変更することで、DNS管理をCloudflareに移管できる
- **Aレコード vs CNAME**: Aレコードは固定IPアドレスを直接指定するが、Cloudflare PagesのようなエッジネットワークではIPが変動する可能性があるため、CNAMEやCloudflareの自動設定が推奨される
- **DNS伝播の時間**: ネームサーバーの変更は、世界中のDNSサーバーに反映されるまで数時間〜最大48時間かかる（実際には数時間で完了することが多い）
- **Cloudflareの自動DNS設定**: Workers/Pagesにカスタムドメインを追加すると、必要なDNSレコードが自動的に作成される。手動でAレコードのIPアドレスを探す必要はない
- **SSL証明書の自動発行**: Cloudflareはカスタムドメイン設定後、5〜15分程度で自動的にSSL証明書を発行してくれる

## 実践内容

### 背景
Canvaで公開していたプロフィールサイト（smats.jp）を、Cloudflare Workers/Pagesに移行し、カスタムドメインで公開する作業を実施した。

### 実施した手順

#### 1. Cloudflareにドメインを追加
```
Cloudflare Dashboard → 「+ Add」 → 「Connect a domain」
→ smats.jp を入力 → Freeプランを選択
```

Cloudflareが既存のDNSレコード（Canva向けのAレコードなど）を自動スキャンして取り込んでくれた。

#### 2. ネームサーバーの変更
Cloudflareが提示した2つのネームサーバー（例：`gabriel.ns.cloudflare.com`、`ophelia.ns.cloudflare.com`）を、ムームードメインのコントロールパネルで設定した。

```
ムームードメイン → ドメイン操作 → ネームサーバ設定変更
→ 「GMOペパボ以外のネームサーバを使用する」を選択
→ Cloudflareのネームサーバーを入力
```

#### 3. DNS反映の確認
nslookupコマンドで、ネームサーバーがCloudflareに切り替わったことを確認した。

```bash
nslookup -type=NS smats.jp
# 結果: gabriel.ns.cloudflare.com, ophelia.ns.cloudflare.com
```

#### 4. 古いDNSレコードの削除
Cloudflare Dashboard の DNS 管理画面で、Canva向けの古いAレコード（103.169.142.0）とムームードメインのNSレコードを削除した。

#### 5. Workers/Pagesにカスタムドメインを追加
```
Workers & Pages → smats-profile → 「+ Add」 → 「Custom domain」
→ smats.jp を入力
→ Cloudflareが自動でDNSレコードを作成
```

同様に `www.smats.jp` も追加し、両方のドメインでアクセスできるようにした。

#### 6. SSL証明書の発行とアクセス確認
約10分後、ブラウザで `https://smats.jp` にアクセスし、プロフィールサイトが正常に表示されることを確認した。

### 使用したコマンド

```bash
# ネームサーバーの確認
nslookup -type=NS smats.jp

# Aレコード/AAAAレコードの確認
nslookup smats.jp

# wwwサブドメインの確認
nslookup www.smats.jp
```

## 感想

DNS設定は一見複雑に見えるが、各ステップの役割を理解すれば論理的に進められる。特にCloudflareの自動DNS設定機能は、手動でAレコードを調べる手間を省いてくれるため、初心者にも優しい。ネームサーバーの変更はドメインの管理権限を移すわけではなく、あくまで「DNS管理をどこでやるか」を変えるだけという点も重要な学びだった。

今後、他のサービス（メールサーバーなど）を追加する場合も、Cloudflareの DNS 管理画面で一元管理できるため、保守性が向上した。
