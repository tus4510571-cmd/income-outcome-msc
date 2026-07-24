"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { formatCurrency, type TransactionWithDetails } from "@/lib/types";

interface TransactionListProps {
  transactions: TransactionWithDetails[];
  baseHref?: string;
  showFiles?: boolean;
}

export default function TransactionList({ transactions, baseHref, showFiles = false }: TransactionListProps) {
  const getRequiredCount = (t: TransactionWithDetails) => {
    if (t.category === "shop_without_receipt") {
      const hasCard = t.files?.some(f => f.file_type === "business_card");
      const hasReceipt = t.files?.some(f => f.file_type === "receipt");
      const hasSlip = t.files?.some(f => f.file_type === "transfer_slip");
      
      if (hasCard && hasReceipt && !hasSlip) return 2; // Cash payment
      return 3; // Bank transfer
    }
    const REQUIRED_FILES: Record<string, string[]> = {
      shop_with_receipt: ["transfer_slip", "receipt"],
      employee_labor: ["transfer_slip", "id_card_copy", "employee_receipt"],
    };
    return REQUIRED_FILES[t.category]?.length || 0;
  };
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
        <p>ยังไม่มีรายการ</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Amount</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Category</th>
              {showFiles && (
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Files</th>
              )}
              <th className="py-4 px-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.map((t) => {
              const isIncome = t.type === "income";

              const getCategoryLabel = () => {
                if (isIncome) {
                  switch (t.category) {
                    case "payment_link": return "Payment Link";
                    case "chat_direct": return "Chat / Social";
                    case "branch_transfer": return "โอนเข้าจากสาขา";
                    default: return t.category;
                  }
                } else {
                  switch (t.category) {
                    case "shop_with_receipt": return "ร้านค้าที่มีใบเสร็จ";
                    case "shop_without_receipt": return "ร้านค้าไม่มีใบเสร็จ";
                    case "employee_labor": return "ค่าจ้างพนักงาน";
                    default: return t.category;
                  }
                }
              };

              const getDetailName = () => {
                if (isIncome) return t.income_detail?.customer_name;
                return t.expense_detail?.shop_name || t.expense_detail?.employee_name;
              };

              const getStatusElement = () => {
                const reqCount = getRequiredCount(t);
                const uploadedCount = t.files?.length || 0;
                
                if (uploadedCount >= reqCount) {
                  return <span className="text-slate-400">{t.description || "Completed"}</span>;
                }

                const uploadedTypes = t.files?.map(f => f.file_type) || [];
                const missing: string[] = [];

                const checkMissing = (type: string, name: string) => {
                  if (!uploadedTypes.includes(type)) missing.push(name);
                };

                if (t.category === "shop_without_receipt") {
                  checkMissing("business_card", "นามบัตร");
                  checkMissing("receipt", "ใบรับรองฯ");
                  if (reqCount === 3) checkMissing("transfer_slip", "สลิปโอนเงิน");
                } else if (t.category === "shop_with_receipt") {
                  checkMissing("transfer_slip", "สลิปโอนเงิน");
                  checkMissing("receipt", "ใบเสร็จ");
                } else if (t.category === "employee_labor") {
                  checkMissing("transfer_slip", "สลิปโอนเงิน");
                  checkMissing("id_card_copy", "สำเนาบัตรฯ");
                  checkMissing("employee_receipt", "ใบสำคัญรับเงิน");
                } else if (t.type === "income") {
                  checkMissing("receipt", "หลักฐาน");
                }

                return (
                  <span className="text-red-500 font-medium">
                    Incomplete (ขาด: {missing.join(", ")})
                  </span>
                );
              };

              return (
                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-sm text-slate-500 whitespace-nowrap">
                    {formatDate(t.transaction_date).split(" ")[0]} {formatDate(t.transaction_date).split(" ")[1]}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 truncate max-w-[200px] md:max-w-[300px]">
                        {getDetailName() || getCategoryLabel()}
                      </span>
                      <span className="text-xs truncate max-w-[200px] md:max-w-[300px]">
                        {getStatusElement()}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    {isIncome ? (
                      <span className="inline-flex px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100/80 text-emerald-700">
                        {formatCurrency(t.amount, t.currency)} {t.currency}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-slate-600">
                        -{formatCurrency(t.amount, t.currency)} {t.currency}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <span className="text-sm text-slate-500">
                      {getCategoryLabel()}
                    </span>
                  </td>
                  {showFiles && (
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {Array.from({ length: getRequiredCount(t) }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    i < (t.files?.length || 0) ? (isIncome ? "bg-emerald-400" : "bg-emerald-400") : "bg-red-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-400 w-8 text-right">
                              {t.files?.length || 0}/{getRequiredCount(t)}
                            </span>
                          </div>
                          {t.category === "shop_without_receipt" && getRequiredCount(t) === 2 && (t.files?.length === 2) && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded whitespace-nowrap">จ่ายเงินสด</span>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-4 text-right">
                    <Link href={baseHref ? `${baseHref}/${t.id}` : (isIncome ? `/income/${t.category.replace(/_/g, "-")}/${t.id}` : `/outcome/${t.category.replace(/_/g, "-")}/${t.id}`)} className="inline-block p-2 text-slate-300 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
