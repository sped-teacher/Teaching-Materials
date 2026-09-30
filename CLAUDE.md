# Teaching-Materials（資源班教材總覽）

資源班教材網站。GitHub **公開** repo：https://github.com/sped-teacher/Teaching-Materials

## 網站結構（GitHub Pages）
- 總覽首頁：https://sped-teacher.github.io/Teaching-Materials/ （根目錄 `index.html`）
- 國語五上學習樂園：https://sped-teacher.github.io/Teaching-Materials/mandarin/ （`mandarin/`）
- 新增教材：在根目錄開一個新資料夾，並在總覽 `index.html` 加一張卡片
- 教材網站左上角名稱格式：「版本＋科目＋年級學期」，例如「康軒國語五上」（國語網站改 `mandarin/assets/app.js` 的 `SITE_NAME`）；新增其他版本、年級照同一格式，總覽頁的子標籤也用「版本＋年級」
- 部署完成要回報網址

## 專案規則
- 使用繁體中文撰寫教材與說明。
- repo 是公開的，任何人都看得到：絕對不要把學生個資（姓名、學號、成績、照片）、密碼、API Key 放進 repo。
- 課文全文有著作權：原稿（`mandarin/data/reading/`、`mandarin/tools/texts/lessonXX.txt`）只留在老師電腦，網站只放加密檔；教室密碼不寫在任何檔案或對話裡。

## 跨電腦使用
- 第一次在新電腦：`gh repo clone sped-teacher/Teaching-Materials`
- 已經有舊資料夾的電腦：`git remote set-url origin https://github.com/sped-teacher/Teaching-Materials.git`
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
