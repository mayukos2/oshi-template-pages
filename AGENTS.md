# 推し活ストーリーmaker 権利リスクチェック運用

このアプリに新しいテンプレ・画像・サンプル・FV画像・記事内画像を追加するときは、必ず以下の順番で作業する。

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

「著作権OK判定」のような断定表現は使わない。
名称は「権利リスクチェック」「公開前チェック」「rights check」を使う。

