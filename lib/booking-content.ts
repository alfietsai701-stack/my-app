// 客人端預約頁的文字內容，來源是店家的「服務價目表」與「預約須知」兩張圖。
// 資料庫的 Service 沒有說明欄位，所以說明依服務名稱對應放在這裡；
// 名稱比對會忽略空白、全形半形括號與加號的差異，也接受只寫括號前名稱的服務。

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  // 特別療癒套組
  '雙修復組合（臉肌＋身體）': '釋放長期僵硬與緊繃感，特別適合長期久坐、壓力大、睡眠不佳者',
  '深層修復組（提拉＋身體）': '針對深層肌肉與筋膜進行調理，改善痠痛、僵硬與循環不良',
  // 臉部護理
  '深層臉肌放鬆': '放鬆臉部肌肉與壓力點，改善緊繃、暗沉，讓氣色自然透亮',
  '保濕修復護理': '補水＋修護雙重保養，改善乾燥、粗糙與敏感狀況',
  '筋膜緊緻提拉': '深層筋膜放鬆，搭配整合式拉提手法，幫助輪廓提升',
  // 身體按摩
  '全身修復': '釋放長期僵硬與緊繃感，特別適合長期久坐、壓力大、睡眠不佳者',
  '深層修復': '針對深層肌肉與筋膜進行調理，改善痠痛、僵硬與循環不良',
}

function normalize(name: string) {
  return name
    .replace(/\s+/g, '')
    .replace(/\(/g, '（').replace(/\)/g, '）')
    .replace(/\+/g, '＋')
}
const baseName = (name: string) => normalize(name).split('（')[0]

const EXACT = new Map(Object.entries(SERVICE_DESCRIPTIONS).map(([k, v]) => [normalize(k), v]))
const BY_BASE = new Map(Object.entries(SERVICE_DESCRIPTIONS).map(([k, v]) => [baseName(k), v]))

/** 依服務名稱找價目表上的說明；找不到回傳 null */
export function serviceDescription(name: string): string | null {
  return EXACT.get(normalize(name)) ?? BY_BASE.get(baseName(name)) ?? null
}

export const BOOKING_NOTICE = {
  title: '預約須知',
  intro: '這裡是一個讓身體慢慢放鬆的地方，為了維護療癒品質，預約前請留意：',
  items: [
    '本空間為預約制私人療癒空間，採一對一服務',
    '預約完成後，會提供詳細地址與交通資訊',
    '如需更改或取消預約，請提前 24 小時告知',
    '當日臨時取消或未到者，將影響下次預約權益',
    '療程時間已為客人保留，若遲到將依原預約時間結束',
    '若有發燒、身體不適、懷孕或重大疾病，請提前告知',
    '本空間目前僅提供女性顧客預約服務',
  ],
  closing: '願你在忙碌的生活裡，找到一段屬於自己的休息時間。',
  agree: '我已閱讀並同意遵守以上預約須知',
} as const
