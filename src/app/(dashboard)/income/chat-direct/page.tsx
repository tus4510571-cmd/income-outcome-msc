import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import TransactionList from "@/components/TransactionList";
import TransactionCard from "@/components/TransactionCard";

export default async function ChatDirectPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      *,
      income_detail:income_details(*),
      receipt_items:receipt_items(*),
      files:transaction_files(*)
    `)
    .eq("user_id", session.user.id)
    .eq("category", "chat_direct")
    .order("transaction_date", { ascending: false });

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ลูกค้าจากประเทศไทย คุยตรง</h1>
            <p className="text-sm text-slate-500 mt-1">Line, Messenger, IG, Email</p>
          </div>
          <Link href="/income/chat-direct/new">
            <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95">
              + สร้างรายการใหม่
            </button>
          </Link>
        </div>

        <TransactionList transactions={transactions as any[]} baseHref="/income/chat-direct/" />
      </div>
    </main>
  );
}
