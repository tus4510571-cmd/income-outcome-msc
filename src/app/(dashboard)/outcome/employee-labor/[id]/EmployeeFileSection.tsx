"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileImage from "@/components/FileImage";
import FileUpload from "@/components/FileUpload";
import { type TransactionFile } from "@/lib/types";
import { convertImageToPdfBase64, mergePdfBase64 } from "@/lib/pdfUtils";
import {
  uploadToGoogleDrive,
  downloadFromGoogleDrive,
  overwriteInGoogleDrive,
} from "@/lib/drive";
import {
  getSetting,
  saveGoogleDriveFileLink,
  updateTransactionFilePath,
} from "@/lib/actions";

interface EmployeeFileSectionProps {
  transactionId: string;
  transactionDate: string;
  existingFiles: TransactionFile[];
  description?: string | null;
}

const CORE_TYPES = [
  { type: "transfer_slip", label: "สลิปการโอนเงิน", suffix: "-slip" },
  { type: "id_card_copy", label: "สำเนาบัตรประชาชนพนักงาน", suffix: "-id" },
  { type: "employee_receipt", label: "ใบเสร็จรับเงินที่พนักงานเซ็นยืนยัน", suffix: "-receive" },
] as const;

const SUB_FOLDER = "ค่าจ้างพนักงาน";

type UploadTask = {
  id: string;
  name: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

function extractDriveFileId(url: string): string | null {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function deriveBaseName(
  files: TransactionFile[],
  transactionDate: string,
  description?: string | null
): string {
  const named = files.find(
    (f) =>
      f.file_name &&
      f.file_name !== "drive-file.pdf" &&
      ["-sum", "-receive", "-id", "-slip"].some((s) => f.file_name.endsWith(s))
  );
  if (named) {
    const suffix = ["-sum", "-receive", "-id", "-slip"].find((s) =>
      named.file_name.endsWith(s)
    )!;
    return named.file_name.slice(0, -suffix.length);
  }

  const [y, m, d] = transactionDate.split("-");
  const yy = String(Number(y) + 543).slice(-2);
  const datePrefix = `${d}${m}${yy}`;
  let nickname = "ไม่มีชื่อ";
  if (description) {
    const match = description.match(/\(([^()]+)\)\s*$/);
    if (match) nickname = match[1];
  }
  return `${datePrefix}-out-จ้าง-${nickname}`;
}

export default function EmployeeFileSection({
  transactionId,
  transactionDate,
  existingFiles,
  description,
}: EmployeeFileSectionProps) {
  const router = useRouter();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [error, setError] = useState("");

  const getUploaded = (fileType: string) =>
    existingFiles.some((f) => f.file_type === fileType);

  const isComplete = CORE_TYPES.every((t) => getUploaded(t.type));
  const missingLabels = CORE_TYPES.filter((t) => !getUploaded(t.type)).map(
    (t) => t.label
  );

  const setTask = (id: string, updates: Partial<UploadTask>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

  const handleCoreUpload = async (fileType: string, file: File) => {
    if (uploadingType) return;
    setUploadingType(fileType);
    setError("");
    const core = CORE_TYPES.find((t) => t.type === fileType)!;
    setTasks([
      { id: fileType, name: core.label, status: "uploading" },
      { id: "merge", name: "รวมไฟล์ PDF (sum)", status: "pending" },
    ]);

    try {
      const folderId = await getSetting("outcome_drive_folder_id");
      if (!folderId)
        throw new Error("ไม่พบ Folder ID สำหรับบันทึกไฟล์ (กรุณาตั้งค่าใน Settings)");

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const pdfBase64 = await convertImageToPdfBase64(
        base64,
        file.type || "image/jpeg"
      );
      const baseName = deriveBaseName(existingFiles, transactionDate, description);
      const fileName = `${baseName}${core.suffix}`;

      const res = await uploadToGoogleDrive(
        pdfBase64,
        folderId,
        fileName,
        transactionDate,
        SUB_FOLDER
      );
      if (!res.success) throw new Error(res.error || "อัปโหลดไปยัง Google Drive ไม่สำเร็จ");

      await saveGoogleDriveFileLink(transactionId, fileType, res.link!, fileName);
      setTask(fileType, { status: "success" });

      const updatedFiles: TransactionFile[] = [
        ...existingFiles.filter((f) => f.file_type !== fileType),
        {
          id: `tmp-${fileType}`,
          transaction_id: transactionId,
          file_type: fileType,
          file_path: res.link!,
          file_name: fileName,
          file_size: 0,
          uploaded_at: new Date().toISOString(),
        },
      ];

      const nowComplete = CORE_TYPES.every((t) =>
        updatedFiles.some((f) => f.file_type === t.type)
      );

      if (nowComplete) {
        setTask("merge", { status: "uploading" });
        const pdfsToMerge: string[] = [];
        for (const t of CORE_TYPES) {
          const row = updatedFiles.find((f) => f.file_type === t.type);
          const fileId = row ? extractDriveFileId(row.file_path) : null;
          if (!fileId) throw new Error("ไม่พบ fileId ของไฟล์บน Google Drive");
          try {
            pdfsToMerge.push(await downloadFromGoogleDrive(fileId));
          } catch {
            if (fileType === t.type) pdfsToMerge.push(pdfBase64);
            else throw new Error(`ดึงไฟล์ ${row?.file_name} จาก Google Drive ไม่สำเร็จ`);
          }
        }

        const mergedPdf = await mergePdfBase64(pdfsToMerge);
        const sumName = `${baseName}-sum`;
        const oldSumRow = updatedFiles.find((f) => f.file_type === "summary");

        if (oldSumRow && !oldSumRow.id.startsWith("tmp-")) {
          const oldSumFileId = extractDriveFileId(oldSumRow.file_path);
          if (oldSumFileId) {
            const oRes = await overwriteInGoogleDrive(
              mergedPdf,
              oldSumFileId,
              folderId,
              sumName,
              transactionDate,
              ""
            );
            if (oRes.success && oRes.link && oRes.link !== oldSumRow.file_path) {
              await updateTransactionFilePath(oldSumRow.id, oRes.link);
            }
          }
        } else {
          const sRes = await uploadToGoogleDrive(
            mergedPdf,
            folderId,
            sumName,
            transactionDate,
            ""
          );
          if (!sRes.success) throw new Error(sRes.error || "บันทึกไฟล์รวมไม่สำเร็จ");
          await saveGoogleDriveFileLink(transactionId, "summary", sRes.link!, sumName);
        }
        setTask("merge", { status: "success" });
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== "merge"));
      }

      router.refresh();
    } catch (err) {
      const msg = (err as Error).message || "เกิดข้อผิดพลาดในการอัปโหลด";
      setError(msg);
      setTasks((prev) =>
        prev.map((t) =>
          t.status === "uploading" || t.status === "pending"
            ? { ...t, status: "error", error: msg }
            : t
        )
      );
    } finally {
      setUploadingType(null);
    }
  };

  const renderUploader = (fileType: string, label: string) => (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
      <p className="text-sm font-medium text-slate-700 mb-3">
        {label}{" "}
        <span className="text-xs text-slate-400">(อัปโหลดทีหลังได้ — PDF/รูปภาพ)</span>
      </p>
      <div className="flex gap-2 flex-wrap mb-2">
        <button
          type="button"
          disabled={!!uploadingType}
          onClick={() =>
            document.getElementById(`camera-${transactionId}-${fileType}`)?.click()
          }
          className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          📷 ถ่ายรูป
        </button>
        <button
          type="button"
          disabled={!!uploadingType}
          onClick={() =>
            document.getElementById(`file-${transactionId}-${fileType}`)?.click()
          }
          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          📁 เลือกไฟล์
        </button>
      </div>
      <input
        id={`camera-${transactionId}-${fileType}`}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCoreUpload(fileType, f);
          e.target.value = "";
        }}
      />
      <input
        id={`file-${transactionId}-${fileType}`}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCoreUpload(fileType, f);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-slate-400 text-center border border-dashed border-slate-200 rounded-lg p-2 bg-slate-50">
        ยังไม่มีไฟล์นี้ — แนบเพื่อทำให้เอกสารครบถ้วน
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">เอกสาร</h2>

        {!isComplete && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800">
              สถานะ: Incomplete — ยังขาด {missingLabels.length} เอกสาร
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {missingLabels.join(" / ")}
            </p>
            <p className="text-xs text-amber-600 mt-2">
              อัปโหลดด้านล่างให้ครบ เมื่อครบทั้ง 3 เอกสาร ระบบจะรวมไฟล์เป็น PDF
              (-sum) และบันทึกลง Google Drive ให้อัตโนมัติ
            </p>
          </div>
        )}
        {isComplete && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm font-bold text-emerald-700">
              ✅ Complete — เอกสารครบถ้วนและ merge ไฟล์แล้ว
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {CORE_TYPES.map((ft) => {
            const file = existingFiles.find((f) => f.file_type === ft.type);
            if (file) {
              return (
                <div
                  key={ft.type}
                  className="border-2 rounded-xl p-4 border-emerald-300 bg-emerald-50 mb-4"
                >
                  <p className="text-sm font-medium text-emerald-700 mb-2">{ft.label}</p>
                  <FileImage filePath={file.file_path} label={ft.label} />
                </div>
              );
            }
            return (
              <div key={ft.type} className="mb-4">
                {renderUploader(ft.type, ft.label)}
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-2">สถานะเอกสาร:</p>
          <div className="flex gap-2 flex-wrap">
            {CORE_TYPES.map((ft) => (
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

      {tasks.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-3">สถานะการอัปโหลด</h3>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-bold">{task.name}</span>
                  <span>
                    {task.status === "uploading" && (
                      <span className="text-blue-500 font-bold animate-pulse">กำลังอัปโหลด...</span>
                    )}
                    {task.status === "success" && (
                      <span className="text-emerald-500 font-bold">✅ สำเร็จ</span>
                    )}
                    {task.status === "error" && (
                      <span className="text-red-500 font-bold">❌ ผิดพลาด</span>
                    )}
                  </span>
                </div>
                {task.error && <div className="text-xs text-red-500 mt-1">{task.error}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold text-center text-sm">
          {error}
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">เอกสารแนบเพิ่มเติม</h2>
        {(() => {
          const attachments =
            existingFiles.filter((f) => f.file_type.startsWith("attachment_")) || [];
          const elements = attachments.map((file, idx) => {
            const label = `เอกสารแนบ ${idx + 1}`;
            return (
              <div
                key={file.id}
                className="border-2 rounded-xl p-4 border-emerald-300 bg-emerald-50 mb-4"
              >
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
        })()}
      </div>
    </div>
  );
}
