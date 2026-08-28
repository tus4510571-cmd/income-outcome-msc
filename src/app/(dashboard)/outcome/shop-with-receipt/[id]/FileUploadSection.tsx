"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import FileImage from "@/components/FileImage";
import { type TransactionFile } from "@/lib/types";
import { getSetting, saveGoogleDriveFileLink, downloadFileBase64 } from "@/lib/actions";
import { downloadFromGoogleDrive, uploadToGoogleDrive } from "@/lib/drive";
import { mergePdfBase64, convertImageToPdfBase64 } from "@/lib/pdfUtils";

interface FileUploadSectionProps {
  transactionId: string;
  transactionDate: string;
  existingFiles: TransactionFile[];
  description?: string | null;
}

export default function FileUploadSection({
  transactionId,
  transactionDate,
  existingFiles,
  description,
}: FileUploadSectionProps) {
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
    return `${formattedDate}-OUT-มีบิล`;
  };

  const extractDriveFileId = (url: string) => {
    const match = url.match(/id=([^&]+)/);
    return match ? match[1] : null;
  };

  const hasReceipt = existingFiles.some(f => f.file_type === "receipt");
  const hasSlip = existingFiles.some(f => f.file_type === "transfer_slip");
  const requiresId = description?.includes("[REQ_ID]");
  const hasIdCard = !requiresId || existingFiles.some(f => f.file_type === "id_card_copy");

  const allCoreUploaded = hasReceipt && hasSlip && hasIdCard;
  const hasSummary = existingFiles.some(f => f.file_type === "summary" || f.file_name?.includes("-sum"));
  const isMissingSummaryOnly = allCoreUploaded && !hasSummary;

  const runMergeOnly = async () => {
    if (running) return;
    setRunning(true);
    setError("");
    setMergeStatus("กำลังเตรียมเอกสาร...");

    try {
      const folderId = await getSetting("outcome_drive_folder_id");
      if (!folderId) throw new Error("ไม่พบ Folder ID สำหรับบันทึกไฟล์ (กรุณาตั้งค่าใน Settings)");

      const baseName = deriveBaseName(existingFiles, transactionDate, description);
      const pdfsToMerge: string[] = [];

      const coreTypesToDownload = ["receipt", "transfer_slip"];
      if (requiresId) coreTypesToDownload.push("id_card_copy");

      for (const fileType of coreTypesToDownload) {
        const row = existingFiles.find((f) => f.file_type === fileType);
        if (!row) throw new Error(`ไม่พบไฟล์ ${fileType === "receipt" ? "ใบเสร็จ" : fileType === "transfer_slip" ? "สลิปโอนเงิน" : "สำเนาบัตร"}`);
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
        transactionDate,
        ""
      );
      if (!sRes.success) throw new Error(sRes.error || "บันทึกไฟล์รวมไม่สำเร็จ");
      await saveGoogleDriveFileLink(transactionId, "summary", sRes.link!, sumName);

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
    const file = existingFiles.find((f) => f.file_type === fileType);
    
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
          transactionId={transactionId}
          fileType={fileType}
          transactionDate={transactionDate}
          type="outcome"
          label={label}
        />
      </div>
    );
  };

  const renderAttachments = () => {
    const attachments = existingFiles.filter((f) => f.file_type.startsWith("attachment_"));
    
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
          transactionId={transactionId}
          fileType={`attachment_${nextIndex}`}
          transactionDate={transactionDate}
          type="outcome"
          label={`เพิ่มเอกสารแนบ ${nextIndex} (ถ้ามี)`}
        />
      </div>
    );

    return elements;
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">เอกสาร</h2>
        <div className="grid grid-cols-1 gap-4">
          {renderFileBox("transfer_slip", "สลิปการโอนเงิน")}
          {renderFileBox("receipt", "ใบเสร็จร้านค้า")}
          {(description?.includes("[REQ_ID]") || existingFiles.some(f => f.file_type === "id_card_copy")) && 
            renderFileBox("id_card_copy", "สำเนาบัตรประชาชนผู้ขาย")
          }
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
            const sumFile = existingFiles.find((f) => f.file_type === "summary" || f.file_name?.includes("-sum"));
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

        <div className="mt-4 flex gap-2 flex-wrap">
          <span className="text-xs text-slate-500">สถานะเอกสาร:</span>
          {existingFiles.map((f) => (
            <span key={f.id} className="inline-block px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
              มี{f.file_type === "transfer_slip" ? "สลิปโอนเงิน" : f.file_type === "receipt" ? "ใบเสร็จ" : f.file_type === "summary" || f.file_name?.includes("-sum") ? "ไฟล์รวม (-sum)" : "เอกสารแนบ"}
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
