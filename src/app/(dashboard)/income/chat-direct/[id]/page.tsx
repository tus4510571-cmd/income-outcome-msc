import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import IncomeDetailContent from "./IncomeDetailContent";

import TransactionActions from "@/components/TransactionActions";

export default async function ChatDirectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: transaction } = await supabase
    .from("transactions")
    .select(`
      *,
      income_detail:income_details(*),
      receipt_items:receipt_items(*),
      files:transaction_files(*)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!transaction) notFound();

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200/50 mb-8 shadow-sm">
          <div className="flex items-center gap-4">
            <Link 
              href="/income/chat-direct" 
              className="p-2 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm flex-shrink-0"
              title="ย้อนกลับ"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                {transaction.income_detail?.customer_name || "ลูกค้า"}
              </h1>
              <p className="text-slate-500 mt-1">
                {transaction.description || "ไม่มีรายละเอียด"} | <span className="font-medium text-emerald-600">฿{transaction.amount.toLocaleString()}</span>
              </p>
            </div>
          </div>
          <TransactionActions id={transaction.id} backUrl="/income/chat-direct" />
        </div>
        <IncomeDetailContent transaction={transaction} />
      </div>
    </main>
  );
}
