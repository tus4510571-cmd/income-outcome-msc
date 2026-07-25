"use client";

import FileUpload from "@/components/FileUpload";
import FileImage from "@/components/FileImage";
import { type TransactionFile } from "@/lib/types";

interface EmployeeFileSectionProps {
  transactionId: string;
  transactionDate: string;
  existingFiles: TransactionFile[];
}

const FILE_TYPES = [
  { type: "transfer_slip", label: "สลิปการโอนเงิน" },
  { type: "id_card_copy", label: "สำเนาบัตรประชาชนพนักงาน" },
  { type: "employee_receipt", label: "ใบเสร็จรับเงินที่พนักงานเซ็นยืนยัน" },
];

export default function EmployeeFileSection({
  transactionId,
  transactionDate,
  existingFiles,
}: EmployeeFileSectionProps) {
  const getUploaded = (fileType: string) =>
    existingFiles.some((f) => f.file_type === fileType);

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
        <h2 className="text-lg font-semibold text-slate-800 mb-4">เอกสาร (3 ไฟล์)</h2>
        <div className="grid grid-cols-1 gap-4">
          {FILE_TYPES.map((ft) => (
            <div key={ft.type}>
              {renderFileBox(ft.type, ft.label)}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-2">สถานะเอกสาร:</p>
          <div className="flex gap-2 flex-wrap">
            {FILE_TYPES.map((ft) => (
              <span
                key={ft.type}
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  getUploaded(ft.type)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {getUploaded(ft.type) ? "✓" : "✗"} {ft.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
