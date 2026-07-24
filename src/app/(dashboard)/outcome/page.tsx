import Link from "next/link";

export default function OutcomeDashboard() {
  const categories = [
    {
      href: "/outcome/shop-with-receipt",
      title: "ร้านค้าที่มีใบเสร็จ",
      description: "ร้านค้าที่ออกใบเสร็จให้เรียบร้อย มีสลิปโอนเงิน + ใบเสร็จ",
      color: "blue",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      href: "/outcome/shop-without-receipt",
      title: "ร้านค้าไม่มีใบเสร็จ",
      description: "มีแค่นามบัตร ระบบสร้างใบเสร็จอัตโนมัติ พร้อมสลิปโอนเงิน",
      color: "amber",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      href: "/outcome/employee-labor",
      title: "ค่าจ้างพนักงาน",
      description: "ค่าแรงงานพนักงาน 上传 สลิป + บัตรประชาชน + ใบเสร็จรับเงิน",
      color: "purple",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      href: "/outcome/summary",
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
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    slate: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-indigo-600 mb-2 inline-block">
            ← กลับหน้าหลัก
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">ระบบรายจ่าย</h1>
          <p className="text-slate-500 mt-1">เลือกหมวดหมู่ที่ต้องการจัดการ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat) => {
            const colors = colorMap[cat.color];
            return (
              <Link key={cat.href} href={cat.href} className="block">
                <div
                  className={`card-interactive ${colors.bg} border ${colors.border}`}
                >
                  <div className="flex items-start gap-4">
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
