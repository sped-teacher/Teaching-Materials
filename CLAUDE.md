# teaching-materials

教材與講義網頁專案。GitHub **公開** repo：https://github.com/yunj90526/teaching-materials

## 專案規則
- 使用繁體中文撰寫教材與說明。
- repo 是公開的，任何人都看得到：絕對不要把學生個資（姓名、學號、成績、照片）、密碼、API Key 放進 repo。
- 部署使用免費 GitHub Pages，網址：https://yunj90526.github.io/teaching-materials/ （有第一份網頁後才啟用；部署完成要回報網址）。

## 跨電腦使用
- 第一次在新電腦：`gh repo clone yunj90526/teaching-materials`
- GitHub 是唯一的同步來源，不要把此資料夾放進 Google 雲端 / OneDrive 同步資料夾。

## 開工流程
1. `git pull` 取得其他電腦的最新進度
2. 讀本檔 CLAUDE.md 與 `notes/工作筆記.md`
3. `git status` 確認狀態
4. 回報目前進度與下一步

## 收工流程
1. 檢查敏感資料（學生個資、密碼、金鑰）沒有被加入
2. 更新 `notes/工作筆記.md`（今天做了什麼、下一步）
3. `git add` → `git commit` → `git push`
