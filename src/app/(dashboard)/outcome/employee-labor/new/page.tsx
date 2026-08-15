"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { convertImageToPdfBase64, mergePdfBase64 } from "@/lib/pdfUtils";
import { uploadToGoogleDrive } from "@/lib/drive";
import { getSetting, createTransaction, saveGoogleDriveFileLink } from "@/lib/actions";

type EmployeeReceipt = {
  id: string;
  employee_name: string;
  nickname: string;
  job_type: string;
  job_description: string;
  amount_before_tax: number;
  amount_after_tax: number;
  start_date: string;
  end_date: string;
  date_text: string;
};

type UploadTask = {
  id: string;
  name: string;
  status: "pending" | "uploading" | "success" | "error";
  link?: string;
  path?: string;
  error?: string;
};

export default function CreateEmployeeLaborTransactionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [receipts, setReceipts] = useState<EmployeeReceipt[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>("");
  
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [receiveFile, setReceiveFile] = useState<File | null>(null);
  
  const slipInputRef = useRef<HTMLInputElement>(null);
  const cameraSlipInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const cameraIdInputRef = useRef<HTMLInputElement>(null);
  const receiveInputRef = useRef<HTMLInputElement>(null);
  const cameraReceiveInputRef = useRef<HTMLInputElement>(null);

  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "complete" | "error">("idle");
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [overallError, setOverallError] = useState("");

  useEffect(() => {
    fetchReceipts();
  }, [startDate, endDate]);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_receipts")
        .select("*")
        .eq("status", "PENDING")
        .gte("start_date", startDate)
        .lte("start_date", endDate)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setReceipts(data || []);
      if (!data?.find(r => r.id === selectedReceiptId)) {
        setSelectedReceiptId("");
      }
    } catch (err) {
      console.error("Error fetching receipts", err);
    }
  };

  const handleDeleteReceipt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("คุณต้องการลบใบสำคัญรับเงินนี้ใช่หรือไม่? (การลบจะไม่สามารถกู้คืนได้)")) return;
    try {
      const { data, error } = await supabase.from("employee_receipts").delete().eq("id", id).select();
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("ระบบไม่สามารถลบข้อมูลได้ (อาจเกิดจากการตั้งค่าสิทธิ์ RLS ในฐานข้อมูล Supabase)");
      }

      setReceipts(prev => prev.filter(r => r.id !== id));
      if (selectedReceiptId === id) setSelectedReceiptId("");
    } catch (err: any) {
      alert("ไม่สามารถลบได้: " + err.message);
    }
  };

  const selectedReceipt = receipts.find(r => r.id === selectedReceiptId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
    } else {
      setter(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedReceipt) return;
    
    const missingFields = [];
    if (!slipFile) missingFields.push("สลิปโอนเงิน");
    if (!idFile) missingFields.push("สำเนาบัตรประชาชน");
    if (!receiveFile) missingFields.push("ใบสำคัญรับเงิน");

    if (missingFields.length > 0) {
      alert("ไม่สามารถบันทึกได้ กรุณาแนบไฟล์ต่อไปนี้ให้ครบถ้วน:\n- " + missingFields.join("\n- "));
      return;
    }

    setUploadStatus("uploading");
    setOverallError("");
    setUploadTasks([
      { id: "slip", name: "สลิปโอนเงิน", status: "pending" },
      { id: "id_card", name: "สำเนาบัตร ปชช.", status: "pending" },
      { id: "receipt", name: "ใบสำคัญรับเงิน", status: "pending" },
      { id: "merge", name: "รวมไฟล์ PDF", status: "pending" }
    ]);

    const date = selectedReceipt.start_date;
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear() + 543).slice(-2);
    const datePrefix = `${dd}${mm}${yy}`;
    const nickname = selectedReceipt.nickname || "ไม่มีชื่อ";

    try {
      const folderId = await getSetting("outcome_drive_folder_id");
      if (!folderId) throw new Error("ไม่พบ Folder ID สำหรับบันทึกไฟล์ (กรุณาตั้งค่าใน Settings)");
      
      const filesToUpload = [
        { file: slipFile, suffix: "slip", taskId: "slip" },
        { file: idFile, suffix: "id", taskId: "id_card" },
        { file: receiveFile, suffix: "receive", taskId: "receipt" }
      ];

      const uploadedFiles: { taskId: string, link: string }[] = [];
      const base64PdfsToMerge: string[] = [];

      for (const item of filesToUpload) {
        if (!item.file) continue;
        setUploadTasks(prev => prev.map(t => t.id === item.taskId ? { ...t, status: "uploading" } : t));
        
        try {
          // File to Base64
          const buffer = await item.file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const dataUrl = `data:${item.file.type};base64,${base64}`;
          
          // Convert to PDF / Compress
          const pdfBase64 = await convertImageToPdfBase64(dataUrl, item.file.type || "image/jpeg");
          base64PdfsToMerge.push(pdfBase64);
          const fileName = `${datePrefix}-out-จ้าง-${nickname}-${item.suffix}`;
          
          // Upload to Drive
          const res = await uploadToGoogleDrive(pdfBase64, folderId, fileName, date, "ค่าจ้างพนักงาน");
          
          if (!res.success) throw new Error(res.error || "Upload failed");
          
          setUploadTasks(prev => prev.map(t => t.id === item.taskId ? { 
            ...t, 
            status: "success", 
            link: res.link,
            path: `Outcome/ค่าจ้างพนักงาน/${date.substring(0,7)}/${fileName}.pdf`
          } : t));
          
          uploadedFiles.push({ taskId: item.taskId, link: res.link || "" });

        } catch (fileErr: any) {
          setUploadTasks(prev => prev.map(t => t.id === item.taskId ? { 
            ...t, 
            status: "error", 
            error: fileErr.message 
          } : t));
          throw new Error(`อัปโหลด ${item.suffix} ไม่สำเร็จ: ${fileErr.message}`);
        }
      }

      // Merge PDFs
      if (base64PdfsToMerge.length > 0) {
        setUploadTasks(prev => prev.map(t => t.id === "merge" ? { ...t, status: "uploading" } : t));
        try {
          const mergedPdfBase64 = await mergePdfBase64(base64PdfsToMerge);
          const sumFileName = `${datePrefix}-out-จ้าง-${nickname}-sum`;
          const res = await uploadToGoogleDrive(mergedPdfBase64, folderId, sumFileName, date, "");
          if (!res.success) throw new Error(res.error || "Failed to upload merged PDF");
          setUploadTasks(prev => prev.map(t => t.id === "merge" ? {
            ...t,
            status: "success",
            link: res.link,
            path: `Outcome/${date.substring(0,7)}/${sumFileName}.pdf`
          } : t));
          uploadedFiles.push({ taskId: "merge", link: res.link || "" });
        } catch (e: any) {
          setUploadTasks(prev => prev.map(t => t.id === "merge" ? { ...t, status: "error", error: e.message } : t));
          throw new Error(`รวมไฟล์ไม่สำเร็จ: ${e.message}`);
        }
      }

      // 1. Create Transaction in Supabase
      const transaction = await createTransaction({
        type: "outcome",
        category: "employee_labor",
        description: `ค่าจ้างบริการ: ${selectedReceipt.job_description} (${selectedReceipt.nickname})`,
        amount: selectedReceipt.amount_before_tax,
        currency: "THB",
        transaction_date: date,
        employee_name: selectedReceipt.employee_name,
      });

      // 2. Save Drive Links
      for (const uf of uploadedFiles) {
        const fileTypeMap: Record<string, string> = {
          "slip": "transfer_slip",
          "id_card": "id_card_copy",
          "receipt": "employee_receipt",
          "merge": "summary"
        };
        await saveGoogleDriveFileLink(
          transaction.id,
          fileTypeMap[uf.taskId] || "other",
          uf.link,
          "drive-file.pdf"
        );
      }

      // 3. Mark receipt as COMPLETED
      await supabase
        .from("employee_receipts")
        .update({ status: "COMPLETED" })
        .eq("id", selectedReceipt.id);

      setUploadStatus("complete");

    } catch (err: any) {
      setOverallError(err.message || "เกิดข้อผิดพลาดในการบันทึก");
      setUploadStatus("error");
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">สร้างรายการใหม่ (ค่าจ้างบริการ)</h1>
          <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 text-sm font-medium">
            ← กลับ
          </button>
        </div>

        {uploadStatus === "complete" ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">บันทึกข้อมูลเรียบร้อยแล้ว!</h2>
            <p className="text-slate-500 mb-8">ข้อมูลและไฟล์ทั้งหมดถูกอัปโหลดเข้า Google Drive แล้ว</p>
            <div className="space-y-3 max-w-md mx-auto text-left mb-8">
              {uploadTasks.map(t => (
                <div key={t.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-slate-700">{t.name}</span>
                  <a href={t.link} target="_blank" className="text-blue-600 hover:underline text-sm font-bold">ดูไฟล์ ↗</a>
                </div>
              ))}
            </div>
            <button 
              onClick={() => router.push("/outcome/employee-labor")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-sm hover:shadow-md"
            >
              กลับหน้าหลัก
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Part 1: Date & Selection */}
            <div className="card border-t-4 border-blue-500">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">ส่วนที่ 1: เลือกใบสำคัญรับเงิน</h2>
              
              <div className="mb-4">
                <label className="label">เลือกช่วงวันที่เพื่อค้นหา</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="date" 
                    className="input-field max-w-xs" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                  />
                  <span className="text-sm font-bold text-slate-500">ถึง</span>
                  <input 
                    type="date" 
                    className="input-field max-w-xs" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                  />
                </div>
              </div>

              {receipts.length > 0 ? (
                <div className="space-y-3">
                  <label className="label">รายการที่พบ ({receipts.length} รายการ)</label>
                  {receipts.map(r => (
                    <div 
                      key={r.id} 
                      onClick={() => setSelectedReceiptId(r.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedReceiptId === r.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-300'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-800">{r.nickname} <span className="text-slate-400 font-normal ml-2">({r.employee_name})</span></div>
                          <div className="text-sm text-slate-500 mt-1">{r.job_description}</div>
                          <div className="text-xs text-slate-400 mt-1">จ้างวันที่: {r.date_text}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="font-bold text-emerald-600">{r.amount_after_tax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท</div>
                          <button 
                            onClick={(e) => handleDeleteReceipt(r.id, e)} 
                            className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 text-xs font-bold" 
                            title="ลบรายการ"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ลบรายการนี้
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 py-8 text-center text-sm font-medium border-2 border-dashed rounded-xl">ไม่พบรายการใบสำคัญรับเงินในช่วงวันที่นี้</div>
              )}
            </div>

            {/* Document Uploads */}
            {selectedReceipt && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="card border-t-4 border-indigo-500">
                  <h2 className="text-lg font-bold mb-4 border-b pb-2">ส่วนที่ 2-4: แนบเอกสารหลักฐาน</h2>
                  <div className="text-sm text-slate-500 mb-6">
                    รองรับไฟล์รูปภาพและ PDF (ขนาดไม่เกิน 10MB) ไฟล์จะถูกบีบอัดและแปลงเป็น PDF อัตโนมัติ
                  </div>

                  <div className="space-y-6">
                    {/* Part 2: Slip */}
                    <div>
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                        <label className="label mb-0">ส่วนที่ 2: สลิปเงินโอน <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => cameraSlipInputRef.current?.click()}
                            className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors dark:bg-emerald-900/40 dark:text-emerald-300"
                          >
                            <span>📷</span>
                            <span>ถ่ายรูป</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => slipInputRef.current?.click()}
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors dark:bg-indigo-900/40 dark:text-indigo-400"
                          >
                            <span>📁</span>
                            <span>เลือกไฟล์</span>
                          </button>
                        </div>
                      </div>
                      <input 
                        ref={cameraSlipInputRef}
                        type="file" 
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileChange(e, setSlipFile)}
                        className="hidden"
                      />
                      <input 
                        ref={slipInputRef}
                        type="file" 
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileChange(e, setSlipFile)}
                        className="hidden"
                      />
                      {slipFile ? (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-200">
                          <span className="truncate font-medium">✓ {slipFile.name}</span>
                          <button type="button" onClick={() => setSlipFile(null)} className="text-red-500 hover:text-red-700 ml-2 font-bold">ลบ</button>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-lg text-xs text-center border border-dashed border-slate-200">
                          ยังไม่ได้เลือกไฟล์สลิป (กดปุ่มถ่ายรูป หรือเลือกไฟล์ด้านบน)
                        </div>
                      )}
                    </div>
                    
                    {/* Part 3: ID Card */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                        <label className="label mb-0">ส่วนที่ 3: สำเนาบัตรประชาชน <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => cameraIdInputRef.current?.click()}
                            className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors dark:bg-emerald-900/40 dark:text-emerald-300"
                          >
                            <span>📷</span>
                            <span>ถ่ายรูป</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => idInputRef.current?.click()}
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors dark:bg-indigo-900/40 dark:text-indigo-400"
                          >
                            <span>📁</span>
                            <span>เลือกไฟล์</span>
                          </button>
                        </div>
                      </div>
                      <input 
                        ref={cameraIdInputRef}
                        type="file" 
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileChange(e, setIdFile)}
                        className="hidden"
                      />
                      <input 
                        ref={idInputRef}
                        type="file" 
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileChange(e, setIdFile)}
                        className="hidden"
                      />
                      {idFile ? (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-200">
                          <span className="truncate font-medium">✓ {idFile.name}</span>
                          <button type="button" onClick={() => setIdFile(null)} className="text-red-500 hover:text-red-700 ml-2 font-bold">ลบ</button>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-lg text-xs text-center border border-dashed border-slate-200">
                          ยังไม่ได้เลือกสำเนาบัตรประชาชน (กดปุ่มถ่ายรูป หรือเลือกไฟล์ด้านบน)
                        </div>
                      )}
                    </div>

                    {/* Part 4: Signed Receipt */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                        <label className="label mb-0">ส่วนที่ 4: ใบสำคัญรับเงิน (เซ็นแล้ว) <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => cameraReceiveInputRef.current?.click()}
                            className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors dark:bg-emerald-900/40 dark:text-emerald-300"
                          >
                            <span>📷</span>
                            <span>ถ่ายรูป</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => receiveInputRef.current?.click()}
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors dark:bg-indigo-900/40 dark:text-indigo-400"
                          >
                            <span>📁</span>
                            <span>เลือกไฟล์</span>
                          </button>
                        </div>
                      </div>
                      <input 
                        ref={cameraReceiveInputRef}
                        type="file" 
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileChange(e, setReceiveFile)}
                        className="hidden"
                      />
                      <input 
                        ref={receiveInputRef}
                        type="file" 
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileChange(e, setReceiveFile)}
                        className="hidden"
                      />
                      {receiveFile ? (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-200">
                          <span className="truncate font-medium">✓ {receiveFile.name}</span>
                          <button type="button" onClick={() => setReceiveFile(null)} className="text-red-500 hover:text-red-700 ml-2 font-bold">ลบ</button>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-lg text-xs text-center border border-dashed border-slate-200">
                          ยังไม่ได้เลือกใบสำคัญรับเงิน (กดปุ่มถ่ายรูป หรือเลือกไฟล์ด้านบน)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tracking Progress */}
                {uploadTasks.length > 0 && (
                  <div className="card">
                    <h3 className="font-bold text-slate-800 mb-3">สถานะการอัปโหลด</h3>
                    <div className="space-y-3">
                      {uploadTasks.map(task => (
                        <div key={task.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold">{task.name}</span>
                            <span>
                              {task.status === "pending" && <span className="text-slate-400">รออัปโหลด</span>}
                              {task.status === "uploading" && <span className="text-blue-500 font-bold animate-pulse">กำลังอัปโหลด...</span>}
                              {task.status === "success" && <span className="text-emerald-500 font-bold">✅ อัปโหลดสำเร็จ</span>}
                              {task.status === "error" && <span className="text-red-500 font-bold">❌ ผิดพลาด</span>}
                            </span>
                          </div>
                          {task.path && <div className="text-xs text-slate-400 truncate">Path: {task.path}</div>}
                          {task.error && <div className="text-xs text-red-500 mt-1">{task.error}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {overallError && (
                  <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold text-center">
                    {overallError}
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSubmit}
                  disabled={uploadStatus === "uploading"}
                  className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md flex items-center justify-center gap-2 ${
                    uploadStatus === "uploading"
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  {uploadStatus === "uploading" ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      กำลังบันทึกและอัปโหลด...
                    </>
                  ) : (
                    "Accept and save to drive"
                  )}
                </button>
              </div>
            )}
            
          </div>
        )}
      </div>
    </main>
  );
}
