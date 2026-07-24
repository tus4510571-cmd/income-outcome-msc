import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function QuotationPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Placeholder for fetching quotations
  const quotations: any[] = [];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">จัดการใบเสนอราคา</h1>
            <p className="text-sm text-slate-500 mt-1">รายการใบเสนอราคาทั้งหมด (Quotation)</p>
          </div>
          <Link href="/quotation/new">
            <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95">
              + สร้างใบเสนอราคา
            </button>
          </Link>
        </div>

        {quotations.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <p>ยังไม่มีรายการใบเสนอราคา</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List will go here */}
          </div>
        )}
      </div>
    </main>
  );
}
