"use client";

import FileUpload from "@/components/FileUpload";
import FileImage from "@/components/FileImage";
import { type TransactionWithDetails, formatCurrency } from "@/lib/types";

interface DetailContentProps {
  transaction: TransactionWithDetails;
}

export default function DetailContent({ transaction }: DetailContentProps) {

  const renderFileBox = (fileType: string, label: string) => {
    const file = transaction.files?.find((f) => f.file_type === fileType);
    
    if (file) {
      return (
        <div className="border-2 rounded-xl p-4 border-emerald-300 bg-emerald-50">
          <p className="text-sm font-medium text-emerald-700 mb-2">{label}</p>
          <FileImage filePath={file.file_path} label={label} />
        </div>
      );
    }

    return (
      <div className="border-2 rounded-xl p-4 border-slate-200">
        <FileUpload
          transactionId={transaction.id}
          fileType={fileType}
          transactionDate={transaction.transaction_date}
          type="outcome"
          label={label}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">เอกสาร</h2>
          <a
            href={`/outcome/shop-without-receipt/${transaction.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <span>🖨️</span> พิมพ์ใบเสร็จ
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderFileBox("transfer_slip", "สลิปการโอนเงิน")}
          {renderFileBox("business_card", "นามบัตรร้านค้า")}
        </div>
      </div>

      {transaction.receipt_items && transaction.receipt_items.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">ใบเสร็จรับเงิน</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">รายการ</th>
                  <th className="text-center px-4 py-2 font-medium text-slate-600">จำนวน</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">ราคา</th>
                </tr>
              </thead>
              <tbody>
                {transaction.receipt_items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{item.product_name}</td>
                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price * item.quantity, item.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold">
                <tr>
                  <td className="px-4 py-2">รวม</td>
                  <td className="px-4 py-2 text-center">
                    {transaction.receipt_items.reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-2 text-right text-indigo-600">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
