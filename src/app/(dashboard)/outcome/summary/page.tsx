"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, type TransactionWithDetails, type FileType, REQUIRED_FILES } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import TransactionList from "@/components/TransactionList";

type FilterMode = "complete" | "incomplete";

export default function SummaryPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [filter, setFilter] = useState<FilterMode>("complete");
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      let query = supabase
        .from("transactions")
        .select(`
          *,
          expense_detail:expense_details(*),
          files:transaction_files(*)
        `)
        .eq("type", "outcome")
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
    if (t.category === "shop_without_receipt") {
      const hasAttachment = t.files?.some(f => f.file_type === "business_card" || f.file_type.startsWith("attachment_"));
      const hasReceipt = t.files?.some(f => f.file_type === "receipt");
      return hasAttachment && hasReceipt;
    }
    
    if (t.category === "shop_with_receipt") {
      const hasSlip = t.files?.some(f => f.file_type === "transfer_slip");
      const hasReceipt = t.files?.some(f => f.file_type === "receipt");
      const hasIdCard = t.files?.some(f => f.file_type === "id_card_copy");
      
      let complete = hasSlip && hasReceipt;
      
      if (t.description?.includes("[REQ_ID]")) {
        complete = complete && hasIdCard;
      }
      return !!complete;
    }
    
    if (t.category === "employee_labor") {
      const hasIdCard = t.files?.some(f => f.file_type === "id_card_copy");
      const hasEmployeeReceipt = t.files?.some(f => f.file_type === "employee_receipt");
      return hasIdCard && hasEmployeeReceipt;
    }

    const cat = t.category as keyof typeof REQUIRED_FILES;
    const reqCount = REQUIRED_FILES[cat]?.length || 0;
    return (t.files?.length || 0) >= reqCount;
  };

  let filtered = filter === "complete"
    ? transactions.filter(isComplete)
    : transactions.filter((t) => !isComplete(t));

  if (categoryFilter !== "all") {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "shop_with_receipt": return "ร้านค้าที่มีใบเสร็จ";
      case "shop_without_receipt": return "ร้านค้าไม่มีใบเสร็จ";
      case "employee_labor": return "ค่าจ้างพนักงาน";
      default: return category;
    }
  };

  const getDetailName = (t: TransactionWithDetails) => {
    return t.expense_detail?.shop_name || t.expense_detail?.employee_name || "-";
  };

  const getHref = (t: TransactionWithDetails) => {
    switch (t.category) {
      case "shop_with_receipt": return `/outcome/shop-with-receipt/${t.id}`;
      case "shop_without_receipt": return `/outcome/shop-without-receipt/${t.id}`;
      case "employee_labor": return `/outcome/employee-labor/${t.id}`;
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
            <h1 className="text-2xl font-bold text-slate-800">สรุป Transaction รายจ่าย</h1>
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
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-500 font-medium px-1 uppercase tracking-wider">ประเภทรายการ</label>
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none px-1"
              >
                <option value="all">ทั้งหมด</option>
                <option value="shop_with_receipt">ร้านค้าที่มีใบเสร็จ</option>
                <option value="shop_without_receipt">ร้านค้าไม่มีใบเสร็จ</option>
                <option value="employee_labor">ค่าจ้างพนักงาน</option>
              </select>
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
