// 系統目前版本（值由 next.config.ts 在建置時從 package.json 帶入）。
// 更新流程：改 package.json 的 version → 寫維護報告 docs/maintenance/RM-YY-MM-NN.md → 部署。

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

const env = process.env.NEXT_PUBLIC_APP_ENV
const commit = process.env.NEXT_PUBLIC_APP_COMMIT

/** 例如「v1.1.1」；預覽版為「v1.1.1 · 預覽 6f4a8eb」；本機開發為「v1.1.1 · 開發版」 */
export const APP_VERSION_LABEL =
  env === 'production' ? `v${APP_VERSION}`
  : env === 'preview' ? `v${APP_VERSION} · 預覽${commit ? ` ${commit}` : ''}`
  : `v${APP_VERSION} · 開發版`
