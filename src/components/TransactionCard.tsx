"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { formatCurrency, type TransactionWithDetails } from "@/lib/types";

interface TransactionCardProps {
  transaction: TransactionWithDetails;
  href?: string;
  showFiles?: boolean;
}

export default function TransactionCard({ transaction, href, showFiles = false }: TransactionCardProps) {
  const isIncome = transaction.type === "income";

  const getCategoryLabel = () => {
    if (isIncome) {
      switch (transaction.category) {
        case "payment_link": return "Payment Link ต่างประเทศ";
        case "chat_direct": return "Chat Line / Messenger / IG / Email";
        case "branch_transfer": return "โอนเข้าจากสาขา";
        default: return transaction.category;
      }
    } else {
      switch (transaction.category) {
        case "shop_with_receipt": return "ร้านค้าที่มีใบเสร็จ";
        case "shop_without_receipt": return "ร้านค้าไม่มีใบเสร็จ";
        case "employee_labor": return "ค่าจ้างพนักงาน";
        default: return transaction.category;
      }
    }
  };

  const getDetailName = () => {
    if (isIncome) return transaction.income_detail?.customer_name;
    return transaction.expense_detail?.shop_name || transaction.expense_detail?.employee_name;
  };

  const content = (
    <div className={`card-interactive ${isIncome ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-red-500"}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              isIncome ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {isIncome ? "รายรับ" : "รายจ่าย"}
          </span>
          <p className="text-sm text-slate-500 mt-1">{getCategoryLabel()}</p>
        </div>
        <p className={`text-lg font-bold ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
          {isIncome ? "+" : "-"}{formatCurrency(transaction.amount, transaction.currency)}
        </p>
      </div>

      {getDetailName() && (
        <p className="text-sm text-slate-700 font-medium">{getDetailName()}</p>
      )}

      {transaction.description && (
        <p className="text-sm text-slate-500 mt-1">{transaction.description}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-400">{formatDate(transaction.transaction_date)}</p>
        {showFiles && transaction.files && (
          <div className="flex gap-1">
            {transaction.files.map((f) => (
              <span key={f.id} className="inline-block w-2 h-2 rounded-full bg-indigo-400" title={f.file_type} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
