<!-- Category: Development -->

# Cloudflare Email Routing + SMTP2GOで、カスタムドメインメールを無料で構築する

## 学んだこと

- **ムームーメールのNS変更制約**: ムームーメール利用中はネームサーバーの変更が**完全にブロック**される。DNS設定レベル（A/CNAME変更）では回避不可で、解約しないとCloudflareへのNS移管ができない
- **Cloudflare Email Routingは完全無料**: カスタムドメイン宛メールをGmailなどに転送できる無料サービス。MX/SPF/DKIMレコードが自動生成され、設定が簡単
- **Gmailの「別のアドレスから送信」には外部SMTPが必要**: 無料のGmailアカウントではGoogle自前のSMTPが使えないため、カスタムドメインから送信するにはサードパーティのSMTPリレーサービスが必須
- **SMTP2GOが個人利用に最適**: 月1,000通の永続無料枠、Gmail Send-as専用ガイド、クレカ不要、CNAME3件だけでDKIM認証が完了する
- **CloudflareのProxy設定がDKIMを壊す**: SMTP2GOのDKIM用CNAMEレコードをCloudflareに追加する際、Proxy ON（オレンジの雲）にするとCNAME解決が失敗し、**DKIM認証が通らなくなる**。必ずDNS only（灰色の雲）にする
- **SPFレコードは1つに統合する**: Cloudflare Email RoutingとSMTP2GOの両方を使う場合、`include`を1つのSPFレコードにまとめる必要がある

## 実践内容

### 背景

企業サイト（gliders.co.jp）をCanvaからCloudflare Pagesに移行する際、メールインフラも同時に再構築する必要があった。ムームーメール（info@gliders.co.jp）を使っていたが、Cloudflareへのネームサーバー移管にはムームーメールの解約が必須だったため、**受信**と**送信**の両方を無料サービスで代替する構成を設計・実装した。

### ゴール構成

```
【受信フロー】
外部 → info@gliders.co.jp → Cloudflare Email Routing → Gmail受信箱

【送信フロー】
Gmail（From: info@gliders.co.jp）→ SMTP2GO（DKIM署名付き）→ 相手先
```

### 実施した手順

#### 1. ムームーメールの制約を把握・解約

ムームードメインでネームサーバーをCloudflareに変更しようとしたところ、以下のエラーが発生した：

> 「ムームーメールご利用中は他のネームサーバ設定の変更は行えません。」

代替案を検討した結果、**ムームーメールを解約**してCloudflare Email Routingに移行する方針に決定。

| 方法 | 評価 | 理由 |
|------|------|------|
| wwwのみCNAME設定 | △ | apex（gliders.co.jp）が使えない |
| ムームーDNSのALIASレコード | × | Cloudflare PagesがapexにNS移管を要求 |
| ムームーメール解約 → NS移管 | ◎ | 根本解決。メールは無料で代替可能 |

#### 2. Cloudflare Email Routing設定（受信側）

Cloudflare Dashboardでドメインを追加した後、Email Routingを設定した。

```
Cloudflare Dashboard → Email → Email Routing
→ Destination address: shinya.matsui@gmail.com を追加・認証
→ ルーティングルール: info@gliders.co.jp → shinya.matsui@gmail.com
```

以下のDNSレコードが自動生成された：

| 種別 | 名前 | 内容 |
|------|------|------|
| MX | gliders.co.jp | route1/2/3.mx.cloudflare.net |
| TXT | gliders.co.jp | v=spf1 include:_spf.mx.cloudflare.net ~all |
| TXT | cf2024-1._domainkey | DKIM署名 |

#### 3. SMTPリレーサービスの選定（送信側）

Gmailの「別のアドレスから送信」機能には外部SMTPが必要なため、各サービスを比較した。

| サービス | 無料枠 | Gmail Send-as | 決め手 |
|----------|--------|--------------|--------|
| **SMTP2GO** | 月1,000通/日200通（永続） | ◎ 専用ガイドあり | **採用** |
| Resend | 月3,000通/日100通 | △ API主体 | 専用ガイドなし |
| Brevo | 月300通/日300通 | ○ | 無料枠が小さい |
| Mailgun | 月1,000通 | ○ | 永続無料枠が不明確 |
| Amazon SES | 初年度無料 | ○ | 12ヶ月限定 |

**SMTP2GOの決め手**: Gmail Send-as専用のセットアップガイドが存在する唯一のサービスだった。クレカ不要で、DKIM認証もCNAME3件だけで完結する。

#### 4. SMTP2GOのドメイン認証

SMTP2GOでアカウントを作成し、送信ドメイン（gliders.co.jp）を登録。提示されたCNAMEレコード3件をCloudflare DNSに追加した。

```
⚠️ 重要: Proxyは必ずOFF（灰色の雲 = DNS only）にすること
→ Proxied（オレンジ）だとCNAMEが正しく解決されず、DKIM認証に失敗する
```

SPFレコードも統合した：

```
変更前: v=spf1 include:_spf.mx.cloudflare.net ~all
変更後: v=spf1 include:_spf.mx.cloudflare.net include:spf.smtp2go.com ~all
```

> Cloudflare Email RoutingがSPFレコードをロックしている場合は、Email Routing設定画面から一時的にロックを解除してから編集する。

#### 5. Gmail「別のアドレスから送信」設定

```
Gmail → ⚙️ 設定 → アカウントとインポート
→ 「名前」セクション → 「他のメールアドレスを追加」
→ 名前: 松井 真也、メールアドレス: info@gliders.co.jp
→ SMTPサーバー: mail.smtp2go.com、ポート: 2525、TLS使用
→ SMTP2GOのユーザー名/パスワードを入力
```

確認メールがinfo@gliders.co.jpに送信され、Cloudflare Email Routing経由でGmailに転送されるので、そのリンクをクリックして認証完了。

#### 6. 動作確認

- ✅ `info@gliders.co.jp` 宛メールがGmailに正常に転送される（受信）
- ✅ GmailのFrom欄で `info@gliders.co.jp` を選択して送信できる（送信）
- ✅ 受信側で「〜経由」や「on behalf of」が表示されない
- ✅ DKIM署名が正しく付与されている

## 感想

ムームーメールがNS変更をブロックするというのは、事前に知らないとかなり焦るポイントだった。しかし結果的には、Cloudflare Email Routing（受信）+ SMTP2GO（送信）という組み合わせで、ムームーメールの有料サービスと同等以上の機能を**完全無料**で実現できた。

特にSMTP2GOは、Gmail Send-as専用のガイドがある点が他サービスとの大きな差別化ポイント。DKIM認証用のDNSレコードがCNAMEベースであるため、Cloudflare Email Routingの既存TXTレコード（SPF/DKIM）と競合しにくいのも実用上の大きなメリットだった。

一番の落とし穴は**CloudflareのProxy設定**。CNAMEレコードをProxied（オレンジの雲）にすると、SMTP2GOのDKIM認証が静かに失敗する。エラーメッセージが出ないので原因特定に時間がかかりやすい。DNS認証系のCNAMEはProxy OFFが鉄則。
