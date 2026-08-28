"use client";

import FileUpload from "@/components/FileUpload";
import FileImage from "@/components/FileImage";
import { type TransactionWithDetails, formatCurrency } from "@/lib/types";
import IncomeMergeButton from "@/components/IncomeMergeButton";

interface IncomeDetailContentProps {
  transaction: TransactionWithDetails;
}

export default function IncomeDetailContent({ transaction }: IncomeDetailContentProps) {

  const renderFileBox = (fileType: string, label: string) => {
    const file = transaction.files?.find((f) => f.file_type === fileType);
    
    if (file) {
      return (
        <div className="border-2 rounded-xl p-4 border-emerald-300 bg-emerald-50 mb-4">
          <p className="text-sm font-medium text-emerald-700 mb-2">{label}</p>
          <FileImage filePath={file.file_path} label={label} />
        </div>
      );
    }

    return (
      <div className="border-2 rounded-xl p-4 border-slate-200 mb-4">
        <FileUpload
          transactionId={transaction.id}
          fileType={fileType}
          transactionDate={transaction.transaction_date}
          type="income"
          label={label}
        />
      </div>
    );
  };

  const renderAttachments = () => {
    const attachments = transaction.files?.filter((f) => f.file_type.startsWith("attachment_")) || [];
    
    const elements = attachments.map((file, idx) => {
      const label = `เอกสารแนบ ${idx + 1}`;
      return (
        <div key={file.id} className="border-2 rounded-xl p-4 border-emerald-300 bg-emerald-50 mb-4">
          <p className="text-sm font-medium text-emerald-700 mb-2">{label}</p>
          <FileImage filePath={file.file_path} label={label} />
        </div>
      );
    });

    const nextIndex = attachments.length + 1;
    elements.push(
      <div key="new-attachment" className="border-2 rounded-xl p-4 border-slate-200 mb-4">
        <FileUpload
          transactionId={transaction.id}
          fileType={`attachment_${nextIndex}`}
          transactionDate={transaction.transaction_date}
          type="income"
          label={`เพิ่มเอกสารแนบ ${nextIndex} (ถ้ามี)`}
        />
      </div>
    );

    return elements;
  };

  return (
    <div className="space-y-4">
      {(transaction.income_detail?.invoice_ref || transaction.income_detail?.deposit_info) && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">ข้อมูลเพิ่มเติม</h2>
          <div className="space-y-3 text-sm">
            {transaction.income_detail?.invoice_ref && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">เลขที่ Invoice/Quotation:</span>
                <span className="font-medium text-slate-800">{transaction.income_detail.invoice_ref}</span>
              </div>
            )}
            {transaction.income_detail?.deposit_info && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">มัดจำ งวดที่ / เปอร์เซ็นต์:</span>
                <span className="font-medium text-slate-800">{transaction.income_detail.deposit_info}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {transaction.receipt_items && transaction.receipt_items.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">รายการสินค้า</h2>
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
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(item.unit_price * item.quantity, item.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold">
                <tr>
                  <td className="px-4 py-2">รวม</td>
                  <td className="px-4 py-2 text-center">
                    {transaction.receipt_items.reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-600">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">เอกสาร</h2>
        <div className="grid grid-cols-1 gap-4">
          {renderFileBox("receipt", "ใบเสร็จที่ออกให้ลูกค้า")}
          {renderAttachments()}
          
          <IncomeMergeButton
            transactionId={transaction.id}
            transactionDate={transaction.transaction_date}
            files={transaction.files || []}
            description={transaction.description}
          />
        </div>
      </div>
    </div>
  );
}
