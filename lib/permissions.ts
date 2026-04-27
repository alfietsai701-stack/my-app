export type Permissions = {
  dashboard: boolean
  appointments: boolean
  customers: boolean
  services: boolean
  inventory: boolean
  reports: boolean
  members: boolean
  settings: boolean
}

export const DEFAULT_PERMISSIONS: Permissions = {
  dashboard: true,
  appointments: false,
  customers: false,
  services: false,
  inventory: false,
  reports: false,
  members: false,
  settings: false,
}

export const ENGINEER_PERMISSIONS: Permissions = {
  dashboard: true,
  appointments: true,
  customers: true,
  services: true,
  inventory: true,
  reports: true,
  members: true,
  settings: true,
}

export const OWNER_PERMISSIONS: Permissions = {
  dashboard: true,
  appointments: true,
  customers: true,
  services: true,
  inventory: true,
  reports: true,
  members: true,
  settings: false,
}

export const ASSISTANT_PERMISSIONS: Permissions = {
  dashboard: true,
  appointments: true,
  customers: true,
  services: false,
  inventory: false,
  reports: false,
  members: false,
  settings: false,
}

export const MODULE_LABELS: Record<keyof Permissions, string> = {
  dashboard: '首頁總覽',
  appointments: '預約管理',
  customers: '顧客管理',
  services: '服務項目',
  inventory: '庫存管理',
  reports: '報表 / 財務',
  members: '會員管理',
  settings: '系統設定',
}
