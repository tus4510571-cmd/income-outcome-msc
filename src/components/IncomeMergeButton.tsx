"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSetting, saveGoogleDriveFileLink } from "@/lib/actions";
import { downloadFromGoogleDrive, uploadToGoogleDrive } from "@/lib/drive";
import { mergePdfBase64 } from "@/lib/pdfUtils";
import { type TransactionFile } from "@/lib/types";

interface IncomeMergeButtonProps {
  transactionId: string;
  transactionDate: string;
  files: TransactionFile[];
  description?: string | null;
}

export default function IncomeMergeButton({
  transactionId,
  transactionDate,
  files,
  description,
}: IncomeMergeButtonProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const deriveBaseName = (filesList: TransactionFile[], dateStr: string) => {
    const sample = filesList.find(f => f.file_name && f.file_name.includes("-INC-"));
    if (sample && sample.file_name) {
      const match = sample.file_name.match(/^(.*-INC-[^-]*-[^-]*)/);
      if (match) return match[1];
      const match2 = sample.file_name.match(/^(.*-INC-[^-]*)/);
      if (match2) return match2[1];
    }
    const formattedDate = dateStr.split("-").reverse().join("");
    return `${formattedDate}-INC`;
  };

  const extractDriveFileId = (url: string) => {
    const match = url.match(/id=([^&]+)/);
    return match ? match[1] : null;
  };

  const coreFiles = files.filter(f => f.file_type !== "summary" && !f.file_name?.includes("-sum"));
  const hasSummary = files.some(f => f.file_type === "summary" || f.file_name?.includes("-sum"));

  // Only display if we have at least 2 files to merge and no summary yet
  if (coreFiles.length < 2 || hasSummary) return null;

  const handleMerge = async () => {
    if (running) return;
    setRunning(true);
    setError("");
    setStatus("กำลังเตรียมเอกสาร...");

    try {
      const folderId = await getSetting("income_drive_folder_id");
      if (!folderId) throw new Error("ไม่พบ Folder ID สำหรับบันทึกไฟล์ (กรุณาตั้งค่าใน Settings)");

      const baseName = deriveBaseName(coreFiles, transactionDate);
      const pdfsToMerge: string[] = [];

      for (const row of coreFiles) {
        const fileId = extractDriveFileId(row.file_path);
        if (!fileId) throw new Error(`ไม่พบ fileId ของ ${row.file_name}`);
        setStatus(`กำลังโหลดไฟล์ ${row.file_name}...`);
        pdfsToMerge.push(await downloadFromGoogleDrive(fileId));
      }

      setStatus("กำลังรวมไฟล์ PDF...");
      const mergedPdf = await mergePdfBase64(pdfsToMerge);
      const sumName = `${baseName}-sum`;

      setStatus("กำลังอัปโหลดไฟล์รวมขึ้น Google Drive...");
      const sRes = await uploadToGoogleDrive(
        mergedPdf,
        folderId,
        sumName,
        transactionDate,
        ""
      );
      if (!sRes.success) throw new Error(sRes.error || "บันทึกไฟล์รวมไม่สำเร็จ");
      await saveGoogleDriveFileLink(transactionId, "summary", sRes.link!, sumName);

      setStatus("สำเร็จแล้ว! ระบบกำลังรีโหลด...");
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message || "รวมไฟล์ไม่สำเร็จ";
      setError(msg);
    } finally {
      setRunning(false);
      setStatus("");
    }
  };

  return (
    <div className="border-2 border-dashed rounded-xl p-4 border-amber-300 bg-amber-50/50 mb-4 text-center mt-4">
      <p className="text-sm font-semibold text-amber-800 mb-2">
        ⚠️ ตรวจพบเอกสารหลายไฟล์ แต่ยังไม่มีไฟล์รวม PDF (-sum)
      </p>
      <button
        type="button"
        onClick={handleMerge}
        disabled={running}
        className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <span>{running ? "⏳" : "🔄"}</span>
        <span>{running ? status || "กำลังรวมไฟล์..." : "กดเพื่อรวมไฟล์ PDF (-sum) ลง Google Drive"}</span>
      </button>
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600">❌ {error}</p>
      )}
    </div>
  );
}
