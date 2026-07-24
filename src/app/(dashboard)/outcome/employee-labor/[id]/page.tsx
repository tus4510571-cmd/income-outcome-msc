import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import EmployeeFileSection from "./EmployeeFileSection";

import TransactionActions from "@/components/TransactionActions";

export default async function EmployeeLaborDetailPage({
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
      expense_detail:expense_details(*),
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
            <Link href="/outcome/employee-labor" className="text-sm text-slate-500 hover:text-indigo-600 mb-2 inline-block">
              ← กลับ
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">
              {transaction.expense_detail?.employee_name || "พนักงาน"}
            </h1>
            <p className="text-slate-500 mt-1">
              {transaction.description || "ไม่มีรายละเอียด"} | ฿{transaction.amount.toLocaleString()}
            </p>
          </div>
          <TransactionActions id={transaction.id} backUrl="/outcome/employee-labor" />
        </div>

        <EmployeeFileSection
          transactionId={transaction.id}
          transactionDate={transaction.transaction_date}
          existingFiles={transaction.files || []}
        />
      </div>
    </main>
  );
}
