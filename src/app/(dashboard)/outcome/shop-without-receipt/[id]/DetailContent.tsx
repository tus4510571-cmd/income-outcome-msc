"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import FileImage from "@/components/FileImage";
import RefundTimeline from "@/components/RefundTimeline";
import { type TransactionWithDetails, formatCurrency } from "@/lib/types";
import { getSetting, saveGoogleDriveFileLink, downloadFileBase64 } from "@/lib/actions";
import { downloadFromGoogleDrive, uploadToGoogleDrive } from "@/lib/drive";
import { mergePdfBase64, convertImageToPdfBase64 } from "@/lib/pdfUtils";

interface DetailContentProps {
  transaction: TransactionWithDetails;
}

export default function DetailContent({ transaction }: DetailContentProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [mergeStatus, setMergeStatus] = useState("");

  const deriveBaseName = (files: any[], dateStr: string, desc: string | null | undefined) => {
    const sample = files.find(f => f.file_name && f.file_name.includes("-OUT-"));
    if (sample && sample.file_name) {
      const match = sample.file_name.match(/^(.*-OUT-[^-]*-[^-]*)/);
      if (match) return match[1];
      const match2 = sample.file_name.match(/^(.*-OUT-[^-]*)/);
      if (match2) return match2[1];
    }
    const formattedDate = dateStr.split("-").reverse().join("");
    return `${formattedDate}-OUT-ไม่มีบิล`;
  };

  const extractDriveFileId = (url: string) => {
    const match = url.match(/id=([^&]+)/);
    return match ? match[1] : null;
  };

  const filesList = transaction.files || [];
  const hasReceipt = filesList.some(f => f.file_type === "receipt");
  const requiresSlip = filesList.some(f => f.file_type === "transfer_slip") || transaction.description?.includes("[TRANSFER]");
  const hasSlip = !requiresSlip || filesList.some(f => f.file_type === "transfer_slip");

  const allCoreUploaded = hasReceipt && hasSlip;
  const hasSummary = filesList.some(f => f.file_type === "summary" || f.file_name?.includes("-sum"));
  const isMissingSummaryOnly = allCoreUploaded && !hasSummary;

  const runMergeOnly = async () => {
    if (running) return;
    setRunning(true);
    setError("");
    setMergeStatus("กำลังเตรียมเอกสาร...");

    try {
      const folderId = await getSetting("outcome_drive_folder_id");
      if (!folderId) throw new Error("ไม่พบ Folder ID สำหรับบันทึกไฟล์ (กรุณาตั้งค่าใน Settings)");

      const baseName = deriveBaseName(filesList, transaction.transaction_date, transaction.description);
      const pdfsToMerge: string[] = [];

      const coreTypesToDownload = ["receipt"];
      if (requiresSlip) coreTypesToDownload.push("transfer_slip");

      for (const fileType of coreTypesToDownload) {
        const row = filesList.find((f) => f.file_type === fileType);
        if (!row) throw new Error(`ไม่พบไฟล์ ${fileType === "receipt" ? "ใบรับรองฯ" : "สลิปโอนเงิน"}`);
        setMergeStatus(`กำลังโหลดไฟล์ ${row.file_name}...`);
        
        const fileId = extractDriveFileId(row.file_path);
        let fileBase64 = "";
        if (fileId) {
          fileBase64 = await downloadFromGoogleDrive(fileId);
        } else if (row.file_path) {
          fileBase64 = await downloadFileBase64(row.file_path);
        } else {
          throw new Error(`ไม่พบที่อยู่ของไฟล์ ${row.file_name}`);
        }

        // Convert image files to PDF format before merging
        const isPdf = fileBase64.startsWith("data:application/pdf") || row.file_name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          let mimeType = "image/jpeg";
          const mimeMatch = fileBase64.match(/^data:([^;]+);/);
          if (mimeMatch) mimeType = mimeMatch[1];
          
          if (mimeType === "application/octet-stream" || !["image/jpeg", "image/png"].includes(mimeType)) {
            const ext = row.file_name.toLowerCase().split('.').pop();
            if (ext === "png") {
              mimeType = "image/png";
            } else {
              mimeType = "image/jpeg";
            }
          }
          fileBase64 = await convertImageToPdfBase64(fileBase64, mimeType);
        }
        
        pdfsToMerge.push(fileBase64);
      }

      setMergeStatus("กำลังรวมไฟล์ PDF...");
      const mergedPdf = await mergePdfBase64(pdfsToMerge);
      const sumName = `${baseName}-sum`;
      
      setMergeStatus("กำลังอัปโหลดไฟล์รวมขึ้น Google Drive...");
      const sRes = await uploadToGoogleDrive(
        mergedPdf,
        folderId,
        sumName,
        transaction.transaction_date,
        ""
      );
      if (!sRes.success) throw new Error(sRes.error || "บันทึกไฟล์รวมไม่สำเร็จ");
      await saveGoogleDriveFileLink(transaction.id, "summary", sRes.link!, sumName);

      setMergeStatus("สำเร็จแล้ว! ระบบกำลังรีโหลด...");
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message || "รวมไฟล์ไม่สำเร็จ";
      setError(msg);
    } finally {
      setRunning(false);
      setMergeStatus("");
    }
  };

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

          {/* Missing Summary - Show Merge Button */}
          {isMissingSummaryOnly && (
            <div className="border-2 border-dashed rounded-xl p-4 border-amber-300 bg-amber-50/50 mb-4 text-center">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                ⚠️ ไฟล์เอกสารหลักครบถ้วนแล้ว แต่ยังไม่ได้สร้างไฟล์รวม PDF (-sum)
              </p>
              <button
                type="button"
                onClick={runMergeOnly}
                disabled={running}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{running ? "⏳" : "🔄"}</span>
                <span>{running ? mergeStatus || "กำลังรวมไฟล์..." : "กดเพื่อรวมไฟล์ PDF (-sum) ลง Google Drive"}</span>
              </button>
              {error && (
                <p className="mt-2 text-xs font-semibold text-red-600">❌ {error}</p>
              )}
            </div>
          )}

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
