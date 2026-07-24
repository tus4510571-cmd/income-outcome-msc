import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#FAFAFA] dark:bg-slate-900 relative overflow-hidden">
      {/* Decorative Pastel Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-purple-200/50 rounded-full mix-blend-multiply filter blur-[80px] opacity-70"></div>
      <div className="absolute top-[-5%] right-[-5%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] bg-emerald-200/50 rounded-full mix-blend-multiply filter blur-[80px] opacity-70"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-rose-200/50 rounded-full mix-blend-multiply filter blur-[80px] opacity-70"></div>

      <div className="w-full max-w-5xl space-y-12 relative z-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-slate-300 tracking-tight">
            ระบบรายรับ-รายจ่าย
          </h1>
          <p className="text-lg text-slate-500 font-medium">จัดการธุรกรรมของคุณได้อย่างง่ายดายและสวยงาม</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <Link href="/income" className="block group h-full">
            <div className="h-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/50 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(16,185,129,0.12)] hover:-translate-y-2 transition-all duration-500">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-6 rounded-[1.5rem] bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-800/40 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm border border-emerald-100/50">
                  <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-emerald-600 transition-colors">รายรับ</h2>
                <p className="text-slate-500 dark:text-slate-400">สร้าง Payment Link และบันทึกรายได้จากทุกช่องทาง</p>
              </div>
            </div>
          </Link>

          <Link href="/outcome" className="block group h-full">
            <div className="h-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/50 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(244,63,94,0.12)] hover:-translate-y-2 transition-all duration-500">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-6 rounded-[1.5rem] bg-gradient-to-br from-rose-100 to-pink-50 dark:from-rose-900/40 dark:to-pink-800/40 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-sm border border-rose-100/50">
                  <svg className="w-10 h-10 text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-rose-500 transition-colors">รายจ่าย</h2>
                <p className="text-slate-500 dark:text-slate-400">บันทึกค่าใช้จ่าย พิมพ์ใบเสร็จ และจัดการเอกสาร</p>
              </div>
            </div>
          </Link>

          <Link href="/settings" className="block group h-full">
            <div className="h-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/50 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(99,102,241,0.12)] hover:-translate-y-2 transition-all duration-500">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-6 rounded-[1.5rem] bg-gradient-to-br from-indigo-100 to-purple-50 dark:from-indigo-900/40 dark:to-purple-800/40 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm border border-indigo-100/50">
                  <svg className="w-10 h-10 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-indigo-500 transition-colors">ตั้งค่า</h2>
                <p className="text-slate-500 dark:text-slate-400">เชื่อมต่อ Google Drive และจัดการข้อมูลระบบ</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
