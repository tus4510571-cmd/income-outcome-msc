"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, type TransactionWithDetails, type FileType, REQUIRED_FILES } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import TransactionList from "@/components/TransactionList";

import { useRouter } from "next/navigation";

type FilterMode = "all" | "complete" | "incomplete";

export default function SummaryPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
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

  let filtered = transactions;
  if (filter === "complete") {
    filtered = transactions.filter(isComplete);
  } else if (filter === "incomplete") {
    filtered = transactions.filter((t) => !isComplete(t));
  }

  if (categoryFilter !== "all") {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const data = filtered.map((t) => ({
      "วันที่": formatDate(t.transaction_date),
      "ประเภท": getCategoryLabel(t.category),
      "ชื่อ/ร้านค้า": getDetailName(t),
      "รายละเอียด": t.description || "-",
      "จำนวนเงิน": t.amount,
      "สถานะเอกสาร": isComplete(t) ? "ครบถ้วน" : "ขาดเอกสาร",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outcome");
    XLSX.writeFile(workbook, `outcome_summary_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

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
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">สรุป Transaction รายจ่าย</h1>
              <p className="text-sm text-slate-500 mt-1">รายการบัญชีฝั่งรายจ่ายทั้งหมด</p>
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
                  <option value="shop_with_receipt">ร้านค้าที่มีใบเสร็จ</option>
                  <option value="shop_without_receipt">ร้านค้าไม่มีใบเสร็จ</option>
                  <option value="employee_labor">ค่าจ้างพนักงาน</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">ยอดรวม (ตามตัวกรองที่เลือก)</p>
              <h2 className="text-3xl font-black text-rose-600 mt-1">
                -฿{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportExcel}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
                title="Export เป็น Excel"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden md:inline">Export Excel</span>
              </button>
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4M4 12l6-6m-6 6l6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              filter === "all"
                ? "bg-slate-800 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ทั้งหมด ({transactions.length})
          </button>
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
          <div className="card text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
            <p>{filter === "complete" ? "ยังไม่มีรายการที่เอกสารครบ" : filter === "incomplete" ? "ไม่มีรายการที่ขาดเอกสาร" : "ยังไม่มีรายการในช่วงเวลานี้"}</p>
          </div>
        ) : (
          <TransactionList transactions={filtered as any[]} showFiles={true} />
        )}
      </div>
    </main>
  );
}
