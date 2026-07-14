# Baika Archery System Ver4 開発日誌

## プロジェクト概要

Baika Archery System は、梅花女子大学アーチェリー部のために開発している
クラウド対応アーチェリー記録システムである。

目標は、

- 練習記録の効率化
- 写真入力への対応
- Googleスプレッドシートによるクラウド管理
- グルーピング分析
- 将来的なAI着弾認識

を一つのシステムで実現することである。

---

# 開発履歴

## 2026-07-13

### 完成

- Step26 写真から現在エンドへ反映
- Step27 写真からGoogleスプレッドシート登録
- Step28 得点一覧パネル追加

### 修正

- Apps Scriptの日付ずれ修正
- JSTで日付を統一
- ISO日時問題を解消

### Git

- Ver4 Step28 score list panel
- Fix GAS date handling for JST

### 次回予定

Step29
写真入力からグルーピングへのリアルタイム反映

## 2026-07-14

### 完了

- Apps Scriptの日付処理を修正
- Googleスプレッドシートの日付ずれを解消
- GitHubへApps Scriptをコミット
- docsフォルダを作成
- 開発ドキュメントの構成を決定

### 学んだこと

- Apps ScriptもGitHubで管理する運用を確立
- ドキュメントもコードと同じくらい重要であることを確認

### 次回予定

Step29A
写真入力 → グルーピング リアルタイム同期