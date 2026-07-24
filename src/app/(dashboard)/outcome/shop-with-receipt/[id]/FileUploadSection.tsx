"use client";

import FileUpload from "@/components/FileUpload";
import FileImage from "@/components/FileImage";
import { type TransactionFile } from "@/lib/types";

interface FileUploadSectionProps {
  transactionId: string;
  transactionDate: string;
  existingFiles: TransactionFile[];
}

export default function FileUploadSection({
  transactionId,
  transactionDate,
  existingFiles,
}: FileUploadSectionProps) {

  const renderFileBox = (fileType: string, label: string) => {
    const file = existingFiles.find((f) => f.file_type === fileType);
    
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
          transactionId={transactionId}
          fileType={fileType}
          transactionDate={transactionDate}
          type="outcome"
          label={label}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">เอกสาร</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderFileBox("transfer_slip", "สลิปการโอนเงิน")}
          {renderFileBox("receipt", "ใบเสร็จร้านค้า")}
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <span className="text-xs text-slate-500">สถานะเอกสาร:</span>
          {existingFiles.map((f) => (
            <span key={f.id} className="inline-block px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
              มี{f.file_type === "transfer_slip" ? "สลิปโอนเงิน" : "ใบเสร็จ"}
            </span>
          ))}
          {existingFiles.length === 0 && (
            <span className="inline-block px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
              ยังไม่มีเอกสาร
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
