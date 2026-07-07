# Baika Archery System

梅花女子大学洋弓部 スコア管理システム。

## 構成

- `index.html`：画面構造
- `css/style.css`：元システムのデザインを分離
- `js/app.js`：元システムのJavaScriptを分離
- `gas/`：今後Google Apps Scriptを整理して配置
- `docs/`：設定手順・運用マニュアル

## 現在の状態

元の `baika_archery2.txt` から、見た目と機能を変えずにHTML/CSS/JavaScriptを分離した第1版です。

## 使い方

1. GitHubリポジトリにこの中身を配置
2. `index.html` をブラウザで開いて動作確認
3. GitHub Pagesを有効化

## 注意

Google Apps ScriptのURLは `js/app.js` 内の `GAS_API_URL` に入っています。必要に応じて差し替えてください。


## Phase 3

JavaScriptを機能別ファイルへ分割しました。


## Phase5-1 ダッシュボード
ログイン後のメイン画面に、今日の練習、平均点、今月射数、最新大会を表示するダッシュボードを追加しました。
