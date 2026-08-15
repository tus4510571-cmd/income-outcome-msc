"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="lg:hidden p-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center gap-3 shadow-sm backdrop-blur-md bg-white/90">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="inline-flex items-center gap-2">
          <img src="/icon-192.png" alt="MSC Logo" className="w-7 h-7 rounded-md object-contain shadow-xs border border-slate-100" />
          <span className="font-bold text-slate-900 text-sm tracking-tight">MAISON CRAFT</span>
        </Link>
        {/* Back button logic can be handled inside specific pages instead, to allow going back to specific previous paths */}
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer Content */}
          <div className="relative flex w-72 max-w-xs flex-col bg-white overflow-y-auto animate-in slide-in-from-left duration-300 shadow-2xl">
            <Sidebar mobile={true} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
