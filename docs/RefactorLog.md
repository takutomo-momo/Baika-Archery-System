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
