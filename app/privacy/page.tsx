import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '隱私權政策｜Ada 慢療室',
  description: 'Ada 慢療室線上預約與管理系統的隱私權政策與資料刪除說明',
}

const UPDATED = '2026 年 11 月 19 日'
const CONTACT_EMAIL = 'norvintsai@gmail.com'

// 公開頁面（proxy.ts 已放行 /privacy）。Facebook / Google / LINE 登入設定要填這個網址。
export default function PrivacyPage() {
  return (
    <main className="min-h-dvh px-5 py-10 lg:py-16" style={{ background: 'var(--t-bg)' }}>
      <article className="mx-auto flex max-w-2xl flex-col gap-8 rounded-2xl bg-surface p-6 text-[15px] leading-7 text-ink lg:p-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-[26px] font-medium tracking-[0.06em]">隱私權政策</h1>
          <p className="text-[13px] text-ink-muted">最後更新：{UPDATED}</p>
          <p>
            Ada 慢療室（以下稱「本工作室」）重視您的個人資料。本政策說明本工作室網站
            ada-studio-2026.com 的線上預約與後台管理系統，會收集哪些資料、怎麼使用，以及您可以如何要求刪除。
          </p>
        </header>

        <Section title="一、我們收集的資料">
          <p><b>線上預約的顧客</b></p>
          <ul>
            <li>您填寫的姓名、手機號碼、電子郵件（選填）與備註。</li>
            <li>預約的服務項目、日期與時間。</li>
            <li>若您透過 LINE 預約：LINE 使用者 ID 與 LINE 顯示名稱，用來帶入姓名並傳送預約提醒。</li>
            <li>到店服務後，工作室人員可能記錄生日、服務與消費紀錄等，作為後續服務參考。</li>
          </ul>
          <p><b>使用第三方帳號（Google、LINE、Facebook、Apple）登入後台的工作室人員</b></p>
          <ul>
            <li>該平台提供的使用者 ID 與顯示名稱；若平台有提供，另包含電子郵件。</li>
            <li>本系統只用這些資料確認登入者身分，不會讀取您的好友、貼文、相片或其他資料，也不會代您發文。</li>
          </ul>
          <p><b>網站使用統計</b></p>
          <ul>
            <li>透過 Vercel Analytics 與 Speed Insights 收集匿名的瀏覽次數與網頁效能資料，不含可識別個人身分的資訊。</li>
            <li>後台登入會使用必要的登入 Cookie，前台預約頁不使用廣告或追蹤 Cookie。</li>
          </ul>
        </Section>

        <Section title="二、使用目的">
          <ul>
            <li>處理您的預約，並透過 LINE 或電子郵件傳送預約確認與提醒。</li>
            <li>保存服務紀錄，以提供更合適的服務。</li>
            <li>確認後台登入者的身分，保護顧客資料。</li>
          </ul>
        </Section>

        <Section title="三、資料的分享與委託處理">
          <p>本工作室不會出售或出租您的個人資料。為了提供服務，資料會存放或經由以下服務處理：</p>
          <ul>
            <li>Supabase（資料庫）、Vercel（網站主機）</li>
            <li>LINE（預約提醒訊息）、Resend（預約確認電子郵件）</li>
            <li>Google、LINE、Facebook、Apple（僅限後台人員選擇以該平台登入時）</li>
          </ul>
          <p>除上述情況或依法令要求外，不會提供給其他第三方。</p>
        </Section>

        <Section title="四、保存期間">
          <p>資料會保存到不再需要為您提供服務為止，或在您要求刪除後刪除；法令另有保存規定者，依法令辦理。</p>
        </Section>

        <Section title="五、您的權利">
          <p>依個人資料保護法，您可以向本工作室請求查詢、閱覽、製給複本、補充或更正、停止蒐集處理利用，或刪除您的個人資料。</p>
        </Section>

        <Section title="六、資料刪除方式" id="data-deletion">
          <p><b>顧客資料</b>：請透過本工作室 LINE 官方帳號，或寄信至下方聯絡信箱，提供預約時使用的姓名與手機號碼，我們會在確認身分後刪除您的資料，並回覆告知。</p>
          <p><b>第三方登入資料（後台人員）</b>：</p>
          <ul>
            <li>登入後台後，到「登入方式」按「解除綁定」，該平台的登入資料會立即刪除。</li>
            <li>您也可以在 Facebook「設定和隱私 → 設定 → 應用程式和網站」移除本應用程式，再寄信要求刪除，我們會在 30 天內處理並回覆。</li>
          </ul>
        </Section>

        <Section title="七、聯絡我們">
          <p>對本政策或您的個人資料有任何問題，請來信：<a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </Section>

        <Section title="八、政策更新">
          <p>本政策如有修改，會更新於本頁並調整上方的「最後更新」日期。</p>
        </Section>
      </article>
    </main>
  )
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
      <h2 className="text-[19px] font-medium">{title}</h2>
      {children}
    </section>
  )
}
