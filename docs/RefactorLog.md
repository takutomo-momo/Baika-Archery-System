# Refactor Log

## Phase 3

JavaScriptを機能別に分割しました。画面構造・デザイン・既存機能は変更していません。

- config.js: 設定値・共有状態
- app.js: 起動処理
- ui.js: 画面共通制御
- cloud.js: GAS通信
- auth.js: ログイン
- members.js: 部員管理
- environment.js: 環境・メモ保存
- calendar.js: カレンダー
- target.js: 的タップ入力
- practice.js: 練習記録
- match.js: 大会記録
- table.js: スコア表
- analytics.js: 分析グラフ


## Phase5-1
- Ver3.0の初期ダッシュボードを追加
- 今日の練習量、平均点、今月射数、最新大会を表示
- 既存の練習・大会モードの操作は維持


## Phase5 修正: クラウド保存・日付処理の安定化

- `js/cloud.js` に欠落していた `saveToCloud()` を復旧。
- Google Apps Script のCORS preflight回避のため、保存時POSTは `Content-Type` を明示しない形式に統一。
- `js/app.js` の初期日付をJST基準に変更し、日付が前日にずれる問題を防止。
- 以後はZIP丸ごと上書きではなく、差分修正を基本方針とする。


## Phase6 ユーザー権限管理

- metadata.memberRoles を利用して admin / leader / member の権限を読み込み。
- 管理者は他部員の記録削除・大会行編集が可能。
- 主将・幹部は全部員閲覧、自分の記録編集を想定。
- 部員は自分の記録編集を基本とする。
