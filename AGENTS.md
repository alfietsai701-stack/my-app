<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 版本與更新規則

- 系統畫面（後台側欄、手機「更多」選單、登入頁）會顯示目前版本，值來自 `package.json` 的 `version`（經 `next.config.ts` → `lib/version.ts`）。
- **每次要上線的更新都必須更新版本號**，並在 `docs/maintenance/` 新增維護報告 `RM-YY-MM-NN.md`：
  - 修正問題、小調整 → 第三碼 +1（例：1.1.1 → 1.1.2）
  - 新增功能 → 第二碼 +1、第三碼歸零（例：1.1.2 → 1.2.0）
  - 大改版或資料結構重大變更 → 第一碼 +1
- 不要修改 `package-lock.json` 裡其他套件的版本號；只改 `package.json` 的 `version`。
