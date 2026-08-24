"use client";

import FileUpload from "@/components/FileUpload";
import FileImage from "@/components/FileImage";
import RefundTimeline from "@/components/RefundTimeline";
import { type TransactionWithDetails, formatCurrency } from "@/lib/types";

interface DetailContentProps {
  transaction: TransactionWithDetails;
}

export default function DetailContent({ transaction }: DetailContentProps) {
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
          type="outcome"
          label={label}
        />
      </div>
    );
  };

  const renderAttachments = () => {
    const attachments = transaction.files?.filter((f) => f.file_type.startsWith("attachment_") || f.file_type === "business_card" || f.file_type === "cash_bill") || [];
    
    const elements = attachments.map((file, idx) => {
      let label = `เอกสารแนบ ${idx + 1}`;
      if (file.file_type === "business_card") label = "นามบัตรร้านค้า";
      if (file.file_type === "cash_bill") label = "บิลเงินสด";

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
          type="outcome"
          label={`เพิ่มเอกสารแนบ ${nextIndex} (ถ้ามี)`}
        />
      </div>
    );

    return elements;
  };

  return (
    <div className="space-y-4">
      <RefundTimeline transaction={transaction} />

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
        <div className="grid grid-cols-1 gap-4">
          {renderFileBox("transfer_slip", "สลิปการโอนเงิน")}
          {renderFileBox("receipt", "ใบรับรองแทนใบเสร็จ")}
          {renderAttachments()}

          {/* Show Merged PDF Summary file if present */}
          {(() => {
            const sumFile = transaction.files?.find((f) => f.file_type === "summary" || f.file_name?.includes("-sum"));
            if (!sumFile) return null;
            return (
              <div className="border-2 rounded-xl p-4 border-blue-300 bg-blue-50/50 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-blue-800">
                    📄 ไฟล์รวมเอกสารทั้งหมด (-sum.pdf)
                  </p>
                  <a
                    href={sumFile.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm"
                  >
                    เปิดดูไฟล์ ↗
                  </a>
                </div>
                <FileImage filePath={sumFile.file_path} label="ไฟล์รวมเอกสาร (-sum.pdf)" />
              </div>
            );
          })()}
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
                  <th className="text-right px-4 py-2 font-medium text-slate-600">ราคา/หน่วย</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">รวม</th>
                </tr>
              </thead>
              <tbody>
                {transaction.receipt_items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{item.product_name}</td>
                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price, item.currency)}</td>
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
                  <td className="px-4 py-2"></td>
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
