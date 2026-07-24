"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center border border-slate-200 dark:border-slate-700">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
        </h2>
        
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-6 space-y-3 text-left bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <p>
            หากคุณไม่ได้ใช้งานระบบนี้นานเกิน 7 วัน มีความเป็นไปได้สูงมากที่ <strong className="text-slate-800 dark:text-slate-200">ฐานข้อมูล Supabase จะถูกหยุดการทำงาน (Paused)</strong> อัตโนมัติตามเงื่อนไขของผู้ใช้ฟรี
          </p>
          <p>
            <strong className="text-slate-800 dark:text-slate-200">วิธีแก้ไข:</strong> ให้คลิกปุ่มด้านล่างเพื่อไปยังเว็บ Supabase จากนั้นให้กดปุ่ม <strong>Restore Project</strong> และรอประมาณ 2-3 นาที แล้วค่อยกลับมากดลองใหม่อีกครั้งครับ
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Technical Details: {error.message || "Unknown error"}
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="https://supabase.com/dashboard/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
          >
            ไปที่หน้าจัดการ Supabase ↗
          </a>
          <button
            onClick={() => reset()}
            className="block w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
          >
            ลองโหลดใหม่อีกครั้ง (Try Again)
          </button>
        </div>
      </div>
    </div>
  );
}
