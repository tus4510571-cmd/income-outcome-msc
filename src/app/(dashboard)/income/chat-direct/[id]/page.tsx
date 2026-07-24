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
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Link href="/income/chat-direct" className="text-sm text-slate-500 hover:text-indigo-600 mb-2 inline-block">
              ← กลับ
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">รายละเอียตรายรับ</h1>
            <p className="text-slate-500 mt-1">
              {transaction.income_detail?.customer_name || "ลูกค้า"} | {transaction.currency} {transaction.amount.toLocaleString()}
            </p>
          </div>
          <TransactionActions id={transaction.id} backUrl="/income/chat-direct" />
        </div>
        <IncomeDetailContent transaction={transaction} />
      </div>
    </main>
  );
}
