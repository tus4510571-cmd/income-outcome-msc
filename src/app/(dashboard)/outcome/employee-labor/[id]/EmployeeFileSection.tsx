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
  downloadFromDirectUrl,
} from "@/lib/drive";
import {
  getSetting,
  saveGoogleDriveFileLink,
  updateTransactionFilePath,
  downloadFileBase64,
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
  link?: string;
  path?: string;
  error?: string;
};

type Selection = { file: File; preview: string | null };

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
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const getUploaded = (fileType: string) =>
    existingFiles.some((f) => f.file_type === fileType);

  const allCoreUploaded = CORE_TYPES.every((t) => getUploaded(t.type));
  const hasSummary = getUploaded("summary");
  const isComplete = allCoreUploaded && hasSummary;
  const isMissingSummaryOnly = allCoreUploaded && !hasSummary;

  const missingTypes = CORE_TYPES.filter((t) => !getUploaded(t.type));
  const missingLabels = missingTypes.map((t) => t.label);
  const selectedTypes = missingTypes.filter((t) => selections[t.type]?.file);
  const hasSelection = selectedTypes.length > 0;
  const willComplete =
    hasSelection && selectedTypes.length === missingTypes.length;

  const setTask = (id: string, updates: Partial<UploadTask>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

  const handleSelect = async (fileType: string, file: File | undefined) => {
    if (!file || running) return;
    let preview: string | null = null;
    if (file.type.startsWith("image/")) {
      preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    setSelections((prev) => ({ ...prev, [fileType]: { file, preview } }));
  };

  const clearSelection = (fileType: string) =>
    setSelections((prev) => {
      const next = { ...prev };
      delete next[fileType];
      return next;
    });

  const runMergeOnly = async () => {
    if (running) return;
    setRunning(true);
    setError("");
    setTasks([{ id: "merge", name: "รวมไฟล์ PDF (-sum)", status: "uploading" }]);

    try {
      const folderId = await getSetting("outcome_drive_folder_id");
      if (!folderId) throw new Error("ไม่พบ Folder ID สำหรับบันทึกไฟล์ (กรุณาตั้งค่าใน Settings)");

      const baseName = deriveBaseName(existingFiles, transactionDate, description);
      const pdfsToMerge: string[] = [];

      for (const t of CORE_TYPES) {
        const row = existingFiles.find((f) => f.file_type === t.type);
        if (!row) throw new Error(`ไม่พบไฟล์ ${t.label}`);
        
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

      const mergedPdf = await mergePdfBase64(pdfsToMerge);
      const sumName = `${baseName}-sum`;
      const sRes = await uploadToGoogleDrive(
        mergedPdf,
        folderId,
        sumName,
        transactionDate,
        ""
      );
      if (!sRes.success) throw new Error(sRes.error || "บันทึกไฟล์รวมไม่สำเร็จ");
      await saveGoogleDriveFileLink(transactionId, "summary", sRes.link!, sumName);

      setTask("merge", {
        status: "success",
        link: sRes.link,
        path: `Outcome/${transactionDate.substring(0, 7)}/${sumName}.pdf`,
      });
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message || "รวมไฟล์ไม่สำเร็จ";
      setTask("merge", { status: "error", error: msg });
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  const runPipeline = async () => {
    if (running || !hasSelection) return;
    setRunning(true);
    setError("");

    const initialTasks: UploadTask[] = selectedTypes.map((t) => ({
      id: t.type,
      name: t.label,
      status: "pending",
    }));
    if (willComplete) {
      initialTasks.push({ id: "merge", name: "รวมไฟล์ PDF (-sum)", status: "pending" });
    }
    setTasks(initialTasks);

    const folderId = await getSetting("outcome_drive_folder_id");
    if (!folderId) {
      setError("ไม่พบ Folder ID สำหรับบันทึกไฟล์ (กรุณาตั้งค่าใน Settings)");
      setRunning(false);
      return;
    }

    const baseName = deriveBaseName(existingFiles, transactionDate, description);
    const freshPdfs: Record<string, string> = {};
    const uploadedRows: TransactionFile[] = [];

    for (const t of missingTypes) {
      setTask(t.type, { status: "uploading" });
      try {
        const selection = selections[t.type];
        if (!selection) throw new Error("ไม่พบไฟล์ที่เลือก");
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selection.file);
        });

        const pdfBase64 = await convertImageToPdfBase64(
          base64,
          selection.file.type || "image/jpeg"
        );
        freshPdfs[t.type] = pdfBase64;

        const fileName = `${baseName}${t.suffix}`;
        const res = await uploadToGoogleDrive(
          pdfBase64,
          folderId,
          fileName,
          transactionDate,
          SUB_FOLDER
        );
        if (!res.success)
          throw new Error(res.error || "อัปโหลดไปยัง Google Drive ไม่สำเร็จ");

        await saveGoogleDriveFileLink(transactionId, t.type, res.link!, fileName);
        uploadedRows.push({
          id: `tmp-${t.type}`,
          transaction_id: transactionId,
          file_type: t.type,
          file_path: res.link!,
          file_name: fileName,
          file_size: 0,
          uploaded_at: new Date().toISOString(),
        });

        setTask(t.type, {
          status: "success",
          link: res.link,
          path: `Outcome/${SUB_FOLDER}/${transactionDate.substring(0, 7)}/${fileName}.pdf`,
        });
      } catch (err) {
        const msg = (err as Error).message || "อัปโหลดไม่สำเร็จ";
        setTask(t.type, { status: "error", error: msg });
        setError(msg);
        setRunning(false);
        return;
      }
    }

    if (willComplete) {
      setTask("merge", { status: "uploading" });
      try {
        const updatedFiles: TransactionFile[] = [
          ...existingFiles,
          ...uploadedRows,
        ];

        const pdfsToMerge: string[] = [];
        for (const t of CORE_TYPES) {
          const row = updatedFiles.find((f) => f.file_type === t.type);
          if (!row) throw new Error(`ไม่พบไฟล์ ${t.label}`);
          const fileId = extractDriveFileId(row.file_path);
          if (!fileId) throw new Error(`ไม่พบ fileId ของ ${row.file_name}`);
          try {
            pdfsToMerge.push(await downloadFromGoogleDrive(fileId));
          } catch {
            if (freshPdfs[t.type]) pdfsToMerge.push(freshPdfs[t.type]);
            else throw new Error(`ดึงไฟล์ ${row.file_name} จาก Google Drive ไม่สำเร็จ`);
          }
        }

        const mergedPdf = await mergePdfBase64(pdfsToMerge);
        const sumName = `${baseName}-sum`;
        const oldSumRow = updatedFiles.find((f) => f.file_type === "summary");

        if (oldSumRow && !oldSumRow.id.startsWith("tmp-")) {
          const oldSumFileId = extractDriveFileId(oldSumRow.file_path);
          if (!oldSumFileId) throw new Error("ไม่พบ fileId ของไฟล์ -sum เดิม");
          const oRes = await overwriteInGoogleDrive(
            mergedPdf,
            oldSumFileId,
            folderId,
            sumName,
            transactionDate,
            ""
          );
          if (!oRes.success) throw new Error(oRes.error || "แทนที่ไฟล์ -sum ไม่สำเร็จ");
          if (oRes.link && oRes.link !== oldSumRow.file_path) {
            await updateTransactionFilePath(oldSumRow.id, oRes.link);
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
        setTask("merge", {
          status: "success",
          path: `Outcome/${transactionDate.substring(0, 7)}/${sumName}.pdf`,
        });
      } catch (err) {
        const msg = (err as Error).message || "รวมไฟล์ไม่สำเร็จ";
        setTask("merge", { status: "error", error: msg });
        setError(msg);
      }
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== "merge"));
    }

    setSelections({});
    router.refresh();
    setRunning(false);
  };

  const renderPicker = (ft: (typeof CORE_TYPES)[number]) => {
    const sel = selections[ft.type];
    return (
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 mb-4">
        <p className="text-sm font-medium text-slate-700 mb-3">
          {ft.label}{" "}
          <span className="text-xs text-slate-400">
            (ยังไม่มีไฟล์ — เลือกเพื่ออัปโหลดทีหลังได้)
          </span>
        </p>
        <div className="flex gap-2 flex-wrap mb-2">
          <button
            type="button"
            disabled={running}
            onClick={() =>
              document.getElementById(`camera-${transactionId}-${ft.type}`)?.click()
            }
            className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            📷 ถ่ายรูป
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() =>
              document.getElementById(`file-${transactionId}-${ft.type}`)?.click()
            }
            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            📁 เลือกไฟล์
          </button>
        </div>
        <input
          id={`camera-${transactionId}-${ft.type}`}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleSelect(ft.type, e.target.files?.[0])}
        />
        <input
          id={`file-${transactionId}-${ft.type}`}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleSelect(ft.type, e.target.files?.[0])}
        />

        {sel ? (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
            {sel.preview ? (
              <img
                src={sel.preview}
                alt={sel.file.name}
                className="w-12 h-12 object-cover rounded-md border border-emerald-300"
              />
            ) : (
              <span className="text-xl">📄</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">✓ {sel.file.name}</p>
              <p className="text-xs text-emerald-600">
                พร้อมอัปโหลด — กด Accept and save to drive เพื่อยืนยัน
              </p>
            </div>
            <button
              type="button"
              disabled={running}
              onClick={() => clearSelection(ft.type)}
              className="text-red-500 hover:text-red-700 font-bold text-sm px-2 disabled:opacity-50"
            >
              ลบ
            </button>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 text-slate-400 rounded-lg text-xs text-center border border-dashed border-slate-200">
            ยังไม่ได้เลือกไฟล์ (กดปุ่มถ่ายรูป หรือเลือกไฟล์ด้านบน)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">เอกสาร</h2>

        {isMissingSummaryOnly ? (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800">
              สถานะ: Incomplete — เอกสารหลักครบ 3 รายการแล้ว แต่ยังไม่ได้รวมไฟล์ (-sum.pdf)
            </p>
            <p className="text-xs text-amber-600 mt-1">
              ระบบมีไฟล์สลิป, สำเนาบัตร และใบสำคัญรับเงินครบแล้ว แต่ยังขาดไฟล์รวม PDF (-sum) กรุณากดปุ่ม <strong>&quot;รวมไฟล์ PDF (-sum) ลง Google Drive&quot;</strong> ด้านล่าง
            </p>
          </div>
        ) : !isComplete ? (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800">
              สถานะ: Incomplete — ยังขาด {missingLabels.length} เอกสาร
            </p>
            <p className="text-sm text-amber-700 mt-1">{missingLabels.join(" / ")}</p>
            <p className="text-xs text-amber-600 mt-2">
              เลือกไฟล์ที่ยังขาด (ทยอยอัปโหลดทีละส่วนได้) แล้วกดปุ่ม Accept and save
              to drive — เมื่อเอกสารครบ ระบบจะรวมไฟล์ PDF (-sum) ลง Google Drive
              ให้อัตโนมัติ
            </p>
          </div>
        ) : (
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
            return <div key={ft.type}>{renderPicker(ft)}</div>;
          })}

          {/* Show Merged PDF Summary file if present */}
          {(() => {
            const sumFile = existingFiles.find((f) => f.file_type === "summary");
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
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                hasSummary
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {hasSummary ? "✓" : "✗"} รวมไฟล์ (-sum)
            </span>
          </div>
        </div>
      </div>

      {isMissingSummaryOnly ? (
        <div className="card">
          <button
            type="button"
            onClick={runMergeOnly}
            disabled={running}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md flex items-center justify-center gap-2 ${
              running
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {running ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                กำลังรวมไฟล์ PDF (-sum)...
              </>
            ) : (
              "🔄 รวมไฟล์ PDF (-sum) ลง Google Drive"
            )}
          </button>
          {!running && (
            <p className="text-xs text-center text-slate-500 mt-2">
              เอกสารครบ 3 รายการแล้ว กดปุ่มนี้เพื่อดึงไฟล์มารวมเป็น -sum.pdf และอัปโหลดขึ้น Google Drive
            </p>
          )}
        </div>
      ) : !isComplete ? (
        <div className="card">
          <button
            type="button"
            onClick={runPipeline}
            disabled={running || !hasSelection}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md flex items-center justify-center gap-2 ${
              running || !hasSelection
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {running ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                กำลังบันทึกและอัปโหลด...
              </>
            ) : (
              "Accept and save to drive"
            )}
          </button>
          {!running && !hasSelection && (
            <p className="text-xs text-center text-slate-500 mt-2">
              เลือกไฟล์ที่ยังขาดอย่างน้อย 1 รายการ (ทยอยทำได้) — พอเอกสารครบ
              ระบบจะ merge ให้อัตโนมัติ
            </p>
          )}
        </div>
      ) : null}

      {tasks.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-3">สถานะการอัปโหลด</h3>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border border-slate-100 rounded-lg p-3 text-sm"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold">{task.name}</span>
                    {task.path && (
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        Path: {task.path}
                      </div>
                    )}
                    {task.error && (
                      <div className="text-xs text-red-500 mt-0.5">{task.error}</div>
                    )}
                  </div>
                  <span className="flex-shrink-0">
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
                {task.status === "success" && task.link && (
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-blue-600 hover:underline text-xs font-bold"
                  >
                    ดูไฟล์ ↗
                  </a>
                )}
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