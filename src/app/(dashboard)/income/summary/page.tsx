"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, type TransactionWithDetails, type FileType, REQUIRED_INCOME_FILES as REQUIRED_FILES } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import TransactionList from "@/components/TransactionList";

import { useRouter } from "next/navigation";

type FilterMode = "complete" | "incomplete";

export default function SummaryPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [filter, setFilter] = useState<FilterMode>("complete");
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const router = useRouter();
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

  const isComplete = (t: TransactionWithDetails) => {
    const hasReceipt = t.files?.some(f => f.file_type === "receipt");
    return !!hasReceipt;
  };

  let filtered = filter === "complete"
    ? transactions.filter(isComplete)
    : transactions.filter((t) => !isComplete(t));

  if (categoryFilter !== "all") {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "payment_link": return "Payment Link";
      case "chat_direct": return "ลูกค้าคุยตรง/แชท";
      case "branch_transfer": return "โอนจากสาขา/Event";
      default: return category;
    }
  };

  const getDetailName = (t: TransactionWithDetails) => {
    return t.income_detail?.customer_name || t.description || "-";
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">กำลังโหลด...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm flex-shrink-0"
              title="ย้อนกลับ"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">สรุป Transaction รายรับ</h1>
              <p className="text-sm text-slate-500 mt-1">รายการบัญชีฝั่งรายรับทั้งหมด</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center bg-slate-50 rounded-xl p-1.5 border border-slate-100 flex-1 min-w-[200px]">
              <div className="flex flex-col flex-1">
                <label className="text-[10px] text-slate-500 font-bold px-2 uppercase tracking-wider">ตั้งแต่</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none px-2 w-full"
                />
              </div>
              <span className="text-slate-300 font-light px-2">-</span>
              <div className="flex flex-col flex-1">
                <label className="text-[10px] text-slate-500 font-bold px-2 uppercase tracking-wider">ถึง</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none px-2 w-full"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="ml-1 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                  title="ล้างตัวกรองวันที่"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="flex items-center bg-slate-50 rounded-xl p-1.5 border border-slate-100 min-w-[200px] flex-1">
              <div className="flex flex-col w-full">
                <label className="text-[10px] text-slate-500 font-bold px-2 uppercase tracking-wider">ประเภทรายการ</label>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none px-1 w-full"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="payment_link">Payment Link</option>
                  <option value="chat_direct">ลูกค้าคุยตรง/แชท</option>
                  <option value="branch_transfer">โอนจากสาขา/Event</option>
                </select>
              </div>
            </div>
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
