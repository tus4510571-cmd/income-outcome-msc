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
    
    if (t.category === "shop_with_receipt") {
      let count = 2; // transfer_slip, receipt
      if (t.description?.includes("[REQ_ID]")) count += 1;
      return count;
    }
    
    if (t.category === "employee_labor") return 3; // transfer_slip, id_card_copy, employee_receipt
    return 0;
  };
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
        <p>ยังไม่มีรายการ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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
          
          if (uploadedCount >= reqCount && reqCount > 0) {
            return <span className="text-emerald-600 font-medium">{t.description || "Completed"}</span>;
          }

          if (reqCount === 0) {
             return <span className="text-emerald-600 font-medium">{t.description || "Completed"}</span>;
          }

          const uploadedTypes = t.files?.map(f => f.file_type) || [];
          const missing: string[] = [];

          const checkMissing = (type: string, name: string) => {
            if (!uploadedTypes.includes(type as any)) missing.push(name);
          };

          if (t.category === "shop_without_receipt") {
            checkMissing("business_card", "นามบัตร");
            checkMissing("receipt", "ใบรับรองฯ");
            if (reqCount === 3) checkMissing("transfer_slip", "สลิปโอนเงิน");
          } else if (t.category === "shop_with_receipt") {
            checkMissing("transfer_slip", "สลิปโอนเงิน");
            checkMissing("receipt", "ใบเสร็จ");
            if (t.description?.includes("[REQ_ID]")) {
              checkMissing("id_card_copy", "สำเนาบัตรฯ");
            }
          } else if (t.category === "employee_labor") {
            checkMissing("transfer_slip", "สลิปโอนเงิน");
            checkMissing("id_card_copy", "สำเนาบัตรฯ");
            checkMissing("employee_receipt", "ใบสำคัญรับเงิน");
          } else if (t.type === "income") {
            checkMissing("receipt", "หลักฐาน");
          }

          return (
            <span className="text-rose-500 font-medium">
              ขาด: {missing.join(", ")}
            </span>
          );
        };

        const targetHref = baseHref 
          ? `${baseHref}/${t.id}` 
          : (isIncome ? `/income/${t.category.replace(/_/g, "-")}/${t.id}` : `/outcome/${t.category.replace(/_/g, "-")}/${t.id}`);

        return (
          <Link 
            key={t.id} 
            href={targetHref}
            className="group block bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex items-start gap-4">
                <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  isIncome ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                }`}>
                  {isIncome ? "+" : "-"}
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {getDetailName() || getCategoryLabel()}
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {formatDate(t.transaction_date).split(" ")[0]} {formatDate(t.transaction_date).split(" ")[1]}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{getCategoryLabel()}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs">{getStatusElement()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:flex-col md:items-end gap-2 pl-14 md:pl-0">
                <div className="text-right">
                  {isIncome ? (
                    <span className="text-lg font-black text-emerald-600">
                      +{formatCurrency(t.amount, t.currency)} {t.currency}
                    </span>
                  ) : (
                    <span className="text-lg font-black text-slate-700">
                      -{formatCurrency(t.amount, t.currency)} {t.currency}
                    </span>
                  )}
                </div>
                
                {showFiles && (
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {Array.from({ length: getRequiredCount(t) }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < (t.files?.length || 0) ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      />
                    ))}
                    <span className="text-[10px] text-slate-400 ml-1 font-medium">
                      {t.files?.length || 0}/{getRequiredCount(t)}
                    </span>
                    {t.category === "shop_without_receipt" && getRequiredCount(t) === 2 && (t.files?.length === 2) && (
                      <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold ml-1 border border-amber-100">CASH</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          </Link>
        );
      })}
    </div>
  );
}
