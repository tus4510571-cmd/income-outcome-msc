"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_OPTIONS } from "@/lib/types";
import { createTransaction, saveGoogleDriveFileLink, getSetting, getNextDailySequence } from "@/lib/actions";
import { uploadToGoogleDrive } from "@/lib/drive";
import { PDFDocument } from "pdf-lib";

const BRANCHES = [
  { id: "icon siam", label: "Icon Siam", icon: "🏢" },
  { id: "garsorn amarin", label: "Garsorn Amarin", icon: "🛍️" },
  { id: "the old siam", label: "The Old Siam", icon: "🏛️" },
  { id: "happylyfe", label: "HappyLyfe", icon: "🌿" },
  { id: "rayavedee heritage", label: "Rayavedee Heritage", icon: "🏡" },
  { id: "kata thani", label: "Kata Thani", icon: "🏖️" },
  { id: "other", label: "Other", icon: "📦" },
];

export default function NewBranchTransferPage() {
  const [branchName, setBranchName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailySeq, setDailySeq] = useState("001");
  
  useEffect(() => {
    async function loadSeq() {
      const d = await getNextDailySequence(date);
      setDailySeq(d);
    }
    loadSeq();
  }, [date]);
  
  const [selectedFiles, setSelectedFiles] = useState<{ id: string; file: File; name: string; url: string }[]>([]);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [mergedPdfBase64, setMergedPdfBase64] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [merging, setMerging] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "complete" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleMergeFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName) {
      setError("กรุณาเลือกสาขา");
      return;
    }
    if (selectedFiles.length === 0) {
      setError("กรุณาเลือกไฟล์ยอดขายอย่างน้อย 1 ไฟล์");
      return;
    }
    
    setMerging(true);
    setError("");
    
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const fileObj of selectedFiles) {
        const fileBytes = await fileObj.file.arrayBuffer();
        
        if (fileObj.file.type === "application/pdf") {
          const donorPdfDoc = await PDFDocument.load(fileBytes);
          const copiedPages = await pdfDoc.copyPages(donorPdfDoc, donorPdfDoc.getPageIndices());
          copiedPages.forEach((page) => pdfDoc.addPage(page));
        } else if (fileObj.file.type.startsWith("image/")) {
          let image;
          if (fileObj.file.type === "image/jpeg" || fileObj.file.type === "image/jpg") {
            image = await pdfDoc.embedJpg(fileBytes);
          } else if (fileObj.file.type === "image/png") {
            image = await pdfDoc.embedPng(fileBytes);
          } else {
            throw new Error(`ไม่รองรับรูปภาพประเภท: ${fileObj.file.type}`);
          }
          
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        } else {
          throw new Error(`ไม่รองรับไฟล์ประเภท: ${fileObj.file.type}`);
        }
      }
      
      const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: true });
      setMergedPdfBase64(pdfBytes);
      setShowPreview(true);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการรวมไฟล์: " + (err as Error).message);
    } finally {
      setMerging(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!branchName || !mergedPdfBase64) return;
    
    setSaving(true);
    setUploadStatus("uploading");
    setUploadProgress(10);
    setError("");

    try {
      const folderId = await getSetting("income_drive_folder_id");
      if (!folderId) {
        throw new Error("ยังไม่ได้ตั้งค่า Google Drive สำหรับ Income ในหน้า Setting");
      }
      setUploadProgress(20);

      const txDate = new Date(date);
      const dateStr = `${String(txDate.getDate()).padStart(2, "0")}${String(txDate.getMonth() + 1).padStart(2, "0")}${txDate.getFullYear()}`;
      const safeBranchName = branchName.replace(/[^a-zA-Z0-9ก-๙\s-]/g, "").trim().replace(/\s+/g, "_");
      const customFileName = `${dateStr}${dailySeq}-IN-สาขา-${safeBranchName}`;
      
      setUploadProgress(40);

      // Upload merged PDF to Drive
      const res = await uploadToGoogleDrive(mergedPdfBase64, folderId, customFileName, date, "โอนเงินจากสาขา");
      
      if (!res.success) {
        throw new Error(res.error || "Failed to upload to Google Drive");
      }
      
      setUploadProgress(60);

      // Create Transaction only if upload succeeds
      const transaction = await createTransaction({
        type: "income",
        category: "branch_transfer",
        description,
        amount: parseFloat(amount) || 0,
        currency,
        transaction_date: date,
        branch_name: branchName,
      });
      setUploadProgress(80);

      if (res.link) {
        await saveGoogleDriveFileLink(transaction.id, "receipt", res.link, `${customFileName}.pdf`);
      }
      
      setUploadProgress(100);
      setUploadStatus("complete");
      
      setTimeout(() => {
        router.push("/income/branch-transfer");
      }, 1500);

    } catch (err) {
      setUploadStatus("error");
      setUploadError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Modal Progress Overlay */}
      {uploadStatus !== "idle" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-center text-slate-800 dark:text-white">
              กำลังบันทึกและอัปโหลด...
            </h3>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className={uploadStatus === "error" ? "text-red-500" : uploadStatus === "complete" ? "text-emerald-500" : "text-indigo-500"}>
                {uploadStatus === "uploading" && "Uploading to Google Drive"}
                {uploadStatus === "complete" && "Upload Complete!"}
                {uploadStatus === "error" && "Upload Failed"}
              </span>
              <span className="text-slate-500 dark:text-slate-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  uploadStatus === "error" ? "bg-red-500" : uploadStatus === "complete" ? "bg-emerald-500" : "bg-indigo-500"
                }`}
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            {uploadError && <p className="text-red-500 text-sm mt-4 text-center">{uploadError}</p>}
            {uploadStatus === "error" && (
              <button onClick={() => setUploadStatus("idle")} className="mt-6 w-full btn-outline">
                ปิด
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreview && mergedPdfBase64 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">ตัวอย่างเอกสารยอดขาย (PDF ฉบับรวม)</h2>
              <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4">
              <iframe 
                src={mergedPdfBase64} 
                className="w-full h-full rounded-lg shadow-inner border border-slate-200 dark:border-slate-800"
                title="PDF Preview"
              />
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900">
              <button onClick={() => setShowPreview(false)} className="btn-outline flex-1 py-3 text-lg">
                กลับไปแก้ไข
              </button>
              <button onClick={handleFinalSubmit} disabled={saving} className="btn-primary flex-1 py-3 text-lg shadow-lg shadow-indigo-200 dark:shadow-none">
                {saving ? "กำลังอัปโหลด..." : "ยืนยันและอัปโหลดไป Google Drive"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">สร้างรายการใหม่</h1>
          <p className="text-slate-500 mt-1">เงินที่โอนเข้ามาจากสาขา</p>
        </div>

        <form onSubmit={handleMergeFiles} className="card space-y-6">
          {/* Branch Selection */}
          <div>
            <label className="label mb-3 block">เลือกสาขา (จำเป็น)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BRANCHES.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => setBranchName(branch.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                    branchName === branch.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300"
                      : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="text-2xl mb-1">{branch.icon}</span>
                  <span className="text-sm font-medium text-center">{branch.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">รายละเอียด / ชื่อเรื่อง</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="เช่น สรุปยอดขาย"
              required
            />
            <p className="text-xs text-slate-500 mt-1">ข้อความนี้จะถูกนำไปตั้งเป็นชื่อไฟล์ PDF เช่น ปีเดือนวัน_[ชื่อเรื่อง].pdf</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">จำนวนเงิน (ยอดสุทธิ)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">สกุลเงิน</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-field"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Multiple Files Upload */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="label mb-0">ยอดขายจากสาขา (PDF/Image)</label>
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="text-indigo-600 text-sm font-medium hover:text-indigo-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                เพิ่มไฟล์
              </button>
            </div>
            
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            
            {selectedFiles.length === 0 ? (
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="w-full py-8 px-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="font-medium">เลือกไฟล์ (สามารถเลือกได้หลายไฟล์)</span>
              </button>
            ) : (
              <div className="space-y-3">
                {selectedFiles.map((f, index) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{f.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{f.file.type.includes('pdf') ? 'PDF Document' : 'Image'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={merging || selectedFiles.length === 0 || !branchName} className="btn-secondary flex-1 py-3 text-lg">
              {merging ? "กำลังประมวลผลไฟล์..." : "รวมไฟล์และตรวจสอบ"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
