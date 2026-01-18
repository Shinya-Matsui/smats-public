# Claude Code の Agent Skills と Antigravity での実践

## 学んだこと
- **Agent Skills**: Anthropic社の Claude Code には「Agent Skills」という機能があり、事前にマークダウンファイル（`SKILL.md`）で指示を定義しておくことで、AIに特定の役割や技能を持たせることができる。
- **仕組み**: フォルダごとに `SKILL.md` を配置し、役割、手順、出力フォーマットなどを記述する。
- **Antigravityでの再現**: Googleの Antigravity 環境でも同様のことが可能。`.agent/skills/[skill-name]/SKILL.md` を作成することで、AIエージェントにカスタムスキルを追加できる。

## 実践内容
1. `c:\Users\smats\smats-private\knowledge-base\.agent\skills\daily_reporter\SKILL.md` を作成。
2. 「日報作成特化スキル」として定義し、日々の活動を聞き取ってフォーマット通りに出力するよう指示。
3. 実際に2026年1月18日の日報をこのスキルを使って作成・更新した。

## 感想
「AIに指示を出す」のではなく「AIに役割を与える定義ファイルを作る」というアプローチは、再現性が高く非常に有用だと感じた。
