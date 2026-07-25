"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  FileText, 
  Link as LinkIcon, 
  MessageCircle, 
  Building2, 
  List, 
  Store, 
  ShoppingBag, 
  Users, 
  Settings
} from "lucide-react";

export default function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [mountedPath, setMountedPath] = useState(pathname);

  useEffect(() => {
    if (pathname !== mountedPath) {
      setMountedPath(pathname);
      if (mobile && onClose) {
        onClose();
      }
    }
  }, [pathname, mountedPath, mobile, onClose]);

  const isActive = (path: string) => {
    return pathname?.startsWith(path);
  };

  const navLinkClass = (path: string) => {
    return `flex items-center gap-3 py-2 px-3 rounded-md text-[14px] font-medium transition-colors ${
      isActive(path) 
        ? "bg-slate-100 text-slate-900" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
  };

  const iconClass = (path: string) => {
    return `w-[18px] h-[18px] flex-shrink-0 ${isActive(path) ? "text-slate-900" : "text-slate-400"}`;
  };

  const content = (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-8 px-2">
        <Link href="/" className="inline-flex items-center gap-2" onClick={onClose}>
          <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
            IO
          </div>
          <span className="font-semibold text-slate-800 text-sm tracking-tight">IncomeOutcome</span>
        </Link>
        {mobile && (
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Quotation Section */}
        <div>
          <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            ใบเสนอราคา
          </h2>
          <ul className="space-y-0.5">
            <li>
              <Link href="/quotation" className={navLinkClass("/quotation")}>
                <FileText className={iconClass("/quotation")} />
                จัดการใบเสนอราคา
              </Link>
            </li>
          </ul>
        </div>

        {/* Income Section */}
        <div>
          <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            รายรับ
          </h2>
          <ul className="space-y-0.5">
            <li>
              <Link href="/income/payment-link" className={navLinkClass("/income/payment-link")}>
                <LinkIcon className={iconClass("/income/payment-link")} />
                Payment link
              </Link>
            </li>
            <li>
              <Link href="/income/chat-direct" className={navLinkClass("/income/chat-direct")}>
                <MessageCircle className={iconClass("/income/chat-direct")} />
                ลูกค้าคุยตรง
              </Link>
            </li>
            <li>
              <Link href="/income/branch-transfer" className={navLinkClass("/income/branch-transfer")}>
                <Building2 className={iconClass("/income/branch-transfer")} />
                เงินโอนจากสาขา/Event
              </Link>
            </li>
            <li className="pt-2">
              <Link href="/income/summary" className={navLinkClass("/income/summary")}>
                <List className={iconClass("/income/summary")} />
                Transaction summary
              </Link>
            </li>
          </ul>
        </div>

        {/* Outcome Section */}
        <div>
          <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            รายจ่าย
          </h2>
          <ul className="space-y-0.5">
            <li>
              <Link href="/outcome/shop-with-receipt" className={navLinkClass("/outcome/shop-with-receipt")}>
                <Store className={iconClass("/outcome/shop-with-receipt")} />
                ร้านค้าที่มีใบเสร็จ
              </Link>
            </li>
            <li>
              <Link href="/outcome/shop-without-receipt" className={navLinkClass("/outcome/shop-without-receipt")}>
                <ShoppingBag className={iconClass("/outcome/shop-without-receipt")} />
                ร้านค้าที่ไม่มีใบเสร็จ
              </Link>
            </li>
            <li>
              <Link href="/outcome/employee-labor" className={navLinkClass("/outcome/employee-labor")}>
                <Users className={iconClass("/outcome/employee-labor")} />
                ค่าแรงพนักงาน
              </Link>
            </li>
            <li className="pt-2">
              <Link href="/outcome/summary" className={navLinkClass("/outcome/summary")}>
                <List className={iconClass("/outcome/summary")} />
                Transaction summary
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Settings at the bottom */}
      <div className="pt-4 border-t border-slate-100 mt-4">
        <Link href="/settings" className={navLinkClass("/settings")}>
          <Settings className={iconClass("/settings")} />
          การตั้งค่า
        </Link>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <div className="h-full bg-white flex flex-col">
        {content}
      </div>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen hidden lg:block sticky top-0 h-screen">
      {content}
    </aside>
  );
}
