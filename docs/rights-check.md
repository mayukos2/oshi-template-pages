# 権利リスクチェック / 公開前チェック

このチェックは、ユーザーがアップロードする写真を判定するものではありません。
運営側がテンプレ画像・サンプル画像・FV画像・記事内画像をサイトへ追加する前に通す、公開前の権利リスクチェックです。

完全な法的判定はできません。目的は、明らかに危なそうな画像・文言・テンプレを公開前に止めることです。

## リスク分類

- `low`: 公開リスクが低そう
- `medium`: 要確認。公開前に人間レビューが必要
- `high`: 公開禁止。`public` や表示対象に入れず、`assets/quarantine/` または `assets/rejected/` に移動

## 基本ルール

- 実在アイドル・芸能人・有名人の顔写真は販売導線やテンプレ見本に使わない
- 公式写真、公式SNS画像、配信スクリーンショット、ライブ映像、テレビ、雑誌、MV、YouTube画面のスクリーンショットは使わない
- 公式ロゴ、グループ名、ツアー名、番組名、事務所名、ブランドロゴをテンプレや販売導線に入れない
- アニメ・漫画・ゲーム・サンリオ・ディズニー等の既存キャラクター画像を使わない
- 特定の公式グッズや公式デザインを再現しない
- サンプルは架空アイドル・自作素材・許可素材のみ使う
- 「公式グッズ風」ではなく、「オリジナルのファンメイド風」「推し活グッズ風」のように一般表現へ寄せる
- 色変更機能を前提にし、特定グループ専用に見えないようにする
- テンプレの `notes` には「特定の公式グッズ再現ではない」と明記する
- `medium` は人間レビュー必須
- `high` は公開禁止

## 追加手順

Codexが新しいテンプレ・画像・サンプルを追加するときは、必ずこの順番で作業します。

1. 画像やテンプレを `assets/pending/` に置く
2. `metadata/rights-metadata.json` に metadata を作成する
3. 実在人物名・グループ名・公式名・既存キャラ名が入っていないか確認する
4. 公式グッズの再現になっていないか確認する
5. 色変更可能か、特定グループ専用に見えないか確認する
6. `npm run rights:check` を実行する
7. `low` のみ表示対象へ移動する
8. `medium` は人間レビュー待ち
9. `high` は `assets/rejected/` または `assets/quarantine/` に移動する
10. `reports/rights-check-report.md` と `reports/rights-check-report.json` を残す

## metadata 必須項目

```json
{
  "id": "color-block-memory",
  "file": "assets/templates/template-free.jpg",
  "title": "カラーブロック思い出テンプレ",
  "type": "template",
  "sourceType": "original",
  "createdBy": "mayuko",
  "license": "original",
  "usesRealPerson": false,
  "usesOfficialLogo": false,
  "usesOfficialScreenshot": false,
  "usesExistingCharacter": false,
  "usesGroupNameOrTourName": false,
  "inspiredByOfficialMerch": false,
  "allowsColorChange": true,
  "sampleUsesFictionalContent": true,
  "notes": "オリジナルの推し活記録テンプレ。特定の公式グッズ再現ではない。"
}
```

## コマンド

```bash
npm run rights:check
```

出力:

- `reports/rights-check-report.json`
- `reports/rights-check-report.md`

`high` が1件でもある場合、チェックは失敗します。
`medium` がある場合も通常は失敗します。
開発中の確認だけ、必要に応じて以下を使えます。

```bash
ALLOW_MEDIUM_RISK=true npm run rights:check
```

production build では `medium` も原則 fail です。

