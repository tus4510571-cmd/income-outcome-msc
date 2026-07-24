"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname?.startsWith(path);
  };

  const navLinkClass = (path: string) => {
    return `block py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
      isActive(path) 
        ? "bg-indigo-50 text-indigo-700" 
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 h-screen overflow-y-auto sticky top-0 hidden lg:block">
      <div className="p-6">
        <Link href="/" className="inline-block mb-8">
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
            ระบบรายรับ-รายจ่าย
          </h1>
        </Link>

        <nav className="space-y-8">
          {/* Quotation Section */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-4">
              ใบเสนอราคา
            </h2>
            <ul className="space-y-1">
              <li>
                <Link href="/quotation" className={navLinkClass("/quotation")}>
                  จัดการใบเสนอราคา
                </Link>
              </li>
            </ul>
          </div>

          {/* Income Section */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-4">
              รายรับ
            </h2>
            <ul className="space-y-1">
              <li>
                <Link href="/income/payment-link" className={navLinkClass("/income/payment-link")}>
                  Payment link
                </Link>
              </li>
              <li>
                <Link href="/income/chat-direct" className={navLinkClass("/income/chat-direct")}>
                  ลูกค้าจากประเทศไทย คุยตรง
                </Link>
              </li>
              <li>
                <Link href="/income/branch-transfer" className={navLinkClass("/income/branch-transfer")}>
                  เงินที่โอนเข้ามาจากสาขาหรือ event
                </Link>
              </li>
              <li>
                <Link href="/income/summary" className={navLinkClass("/income/summary")}>
                  Transaction summary
                </Link>
              </li>
            </ul>
          </div>

          {/* Outcome Section */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-4">
              รายจ่าย
            </h2>
            <ul className="space-y-1">
              <li>
                <Link href="/outcome/shop-with-receipt" className={navLinkClass("/outcome/shop-with-receipt")}>
                  ร้านค้าที่มีใบเสร็จ
                </Link>
              </li>
              <li>
                <Link href="/outcome/shop-without-receipt" className={navLinkClass("/outcome/shop-without-receipt")}>
                  ร้านค้าที่ไม่มีใบเสร็จ
                </Link>
              </li>
              <li>
                <Link href="/outcome/employee-labor" className={navLinkClass("/outcome/employee-labor")}>
                  ค่าจ้างพนักงาน/ค่าบริการ
                </Link>
              </li>
              <li>
                <Link href="/outcome/summary" className={navLinkClass("/outcome/summary")}>
                  Transaction summary
                </Link>
              </li>
            </ul>
          </div>


          {/* Settings Section */}
          <div>
            <ul className="space-y-1 pt-4 border-t border-slate-100">
              <li>
                <Link href="/settings" className={navLinkClass("/settings")}>
                  การตั้งค่า
                </Link>
              </li>
              <li>
                <button 
                  onClick={async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                  className="w-full text-left block py-2 px-4 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  ออกจากระบบ
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}
