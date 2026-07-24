"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, type TransactionWithDetails, type FileType, REQUIRED_INCOME_FILES } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import TransactionList from "@/components/TransactionList";

type FilterMode = "complete" | "incomplete";

export default function IncomeSummaryPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [filter, setFilter] = useState<FilterMode>("complete");
  const [loading, setLoading] = useState(true);
  
  // Date Range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      let query = supabase
        .from("transactions")
        .select(`
          *,
          income_detail:income_details(*),
          files:transaction_files(*)
        `)
        .eq("type", "income")
        .order("transaction_date", { ascending: false });

      if (startDate) {
        query = query.gte("transaction_date", startDate);
      }
      if (endDate) {
        query = query.lte("transaction_date", endDate);
      }

      const { data } = await query;
      setTransactions((data as TransactionWithDetails[]) || []);
      setLoading(false);
    }
    fetchData();
  }, [supabase, startDate, endDate]);

  const getFileCount = (t: TransactionWithDetails): number => t.files?.length || 0;
  const getRequiredCount = (t: TransactionWithDetails): number => {
    const cat = t.category as keyof typeof REQUIRED_INCOME_FILES;
    return REQUIRED_INCOME_FILES[cat]?.length || 0;
  };
  const isComplete = (t: TransactionWithDetails) => getFileCount(t) >= getRequiredCount(t);

  const filtered = filter === "complete"
    ? transactions.filter(isComplete)
    : transactions.filter((t) => !isComplete(t));

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "payment_link": return "Payment Link";
      case "chat_direct": return "แชท/Direct";
      case "branch_transfer": return "โอนจากสาขา";
      default: return category;
    }
  };

  const getDetailName = (t: TransactionWithDetails) => {
    return t.income_detail?.customer_name || t.description || "-";
  };

  const getHref = (t: TransactionWithDetails) => {
    switch (t.category) {
      case "payment_link": return `/income/payment-link/${t.id}`;
      case "chat_direct": return `/income/chat-direct/${t.id}`;
      case "branch_transfer": return `/income/branch-transfer/${t.id}`;
      default: return "#";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">กำลังโหลด...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">สรุป Transaction รายรับ</h1>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-500 font-medium px-1 uppercase tracking-wider">ตั้งแต่</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none px-1"
              />
            </div>
            <span className="text-slate-300">-</span>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-500 font-medium px-1 uppercase tracking-wider">ถึง</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none px-1"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="ml-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="ล้างตัวกรองวันที่"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter("complete")}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              filter === "complete"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            รายการ upload เอกสารครบ ({transactions.filter(isComplete).length})
          </button>
          <button
            onClick={() => setFilter("incomplete")}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              filter === "incomplete"
                ? "bg-red-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            รายการขาดเอกสาร ({transactions.filter((t) => !isComplete(t)).length})
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <p>{filter === "complete" ? "ยังไม่มีรายการที่เอกสารครบ" : "ไม่มีรายการที่ขาดเอกสาร"}</p>
          </div>
        ) : (
          <TransactionList transactions={filtered as any[]} showFiles={true} />
        )}
      </div>
    </main>
  );
}
