import Link from "next/link";

export default function IncomeDashboard() {
  const categories = [
    {
      href: "/income/payment-link",
      title: "ลูกค้าจาก Payment Link ต่างประเทศ",
      description: "ลูกค้าที่สั่งซื้อผ่าน Payment Link จ่ายเงินเป็น USD, EUR, CNY",
      color: "emerald",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/income/chat-direct",
      title: "ลูกค้าจากประเทศไทย คุยตรง",
      description: "Line, Messenger, IG, Email - จ่ายเงินเป็น THB",
      color: "blue",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: "/income/branch-transfer",
      title: "เงินที่โอนเข้ามาจากสาขา",
      description: "สาขาตามห้าง, Fair - จ่ายเงินเป็น THB",
      color: "violet",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      href: "/income/summary",
      title: "สรุป Transaction",
      description: "ดูรายการทั้งหมด แยกตามเอกสารครบ / ขาดเอกสาร",
      color: "slate",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
    slate: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-indigo-600 mb-2 inline-block">
            ← กลับหน้าหลัก
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">ระบบรายรับ</h1>
          <p className="text-slate-500 mt-1">เลือกแหล่งที่มาของรายรับ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat) => {
            const colors = colorMap[cat.color];
            return (
              <Link key={cat.href} href={cat.href} className="block">
                <div className={`card-interactive ${colors.bg} border ${colors.border} h-full`}>
                  <div className={`flex items-start gap-4`}>
                    <div className={`${colors.text} flex-shrink-0`}>{cat.icon}</div>
                    <div>
                      <h2 className={`text-lg font-bold ${colors.text}`}>{cat.title}</h2>
                      <p className="text-sm text-slate-600 mt-1">{cat.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
