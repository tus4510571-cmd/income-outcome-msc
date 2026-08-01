"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReceiptGenerator from "@/components/ReceiptGenerator";
import { type ReceiptItem } from "@/lib/types";
import { createTransaction, addReceiptItems, uploadFile, getSetting, getNextDailySequence, saveGoogleDriveFileLink } from "@/lib/actions";
import { uploadToGoogleDrive } from "@/lib/drive";
import { convertImageToPdfBase64, mergePdfBase64, compressImageBase64 } from "@/lib/pdfUtils";

export default function NewShopWithReceiptPage() {
  // Step 1: Data
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopTaxId, setShopTaxId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  
  // Step 2: Files & Options
  const [paidWithCash, setPaidWithCash] = useState(false);
  
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [hasItemList, setHasItemList] = useState(false);
  const [itemListPreview, setItemListPreview] = useState<string | null>(null);
  const [itemListFile, setItemListFile] = useState<File | null>(null);
  const itemListInputRef = useRef<HTMLInputElement>(null);

  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  const [requireIdCard, setRequireIdCard] = useState(false);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);

  // System States
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [dailySeq, setDailySeq] = useState("001");
  
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "complete" | "error">("idle");
  const [uploadError, setUploadError] = useState("");

  type UploadTask = {
    id: string;
    name: string;
    status: "pending" | "uploading" | "success" | "error";
    link?: string;
    path?: string;
    error?: string;
  };
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  const router = useRouter();

  useEffect(() => {
    async function initData() {
      const d = await getNextDailySequence(date);
      setDailySeq(d);
    }
    initData();
  }, [date]);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
    
    if (!hasItemList) {
      performAIScan([file]);
    }
  };

  const handleItemListChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setItemListFile(file);
    const reader = new FileReader();
    reader.onload = () => setItemListPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleManualScan = () => {
    const filesToScan: File[] = [];
    if (receiptFile) filesToScan.push(receiptFile);
    if (itemListFile) filesToScan.push(itemListFile);
    
    if (filesToScan.length === 0) return;
    performAIScan(filesToScan);
  };

  const performAIScan = async (files: File[]) => {
    setIsScanning(true);
    setScanError("");
    
    try {
      // Compress files before sending to AI to avoid 4.5MB Payload limit
      const compressedBlobs = await Promise.all(files.map(async (f) => {
        if (f.type === "application/pdf") return f; // Don't compress PDFs here
        
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        
        const compressedDataUrl = await compressImageBase64(dataUrl, f.type || "image/jpeg", 1600, 0.8);
        const res = await fetch(compressedDataUrl);
        const blob = await res.blob();
        return new File([blob], f.name, { type: "image/jpeg" });
      }));

      const formData = new FormData();
      compressedBlobs.forEach(blob => formData.append("receipt", blob));
      
      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสแกนใบเสร็จ");
      }
      
      if (data.shopName && data.shopName !== "ไม่ระบุชื่อร้าน") setShopName(data.shopName);
      if (data.address) setShopAddress(data.address);
      if (data.taxId) setShopTaxId(data.taxId);
      if (data.date) setDate(data.date);
      if (data.totalAmount) setAmount(data.totalAmount.toString());
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items.map((item: any) => ({
          id: "",
          transaction_id: "",
          product_name: item.name || "",
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          currency: "THB"
        })));
      }
    } catch (err) {
      setScanError((err as Error).message);
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = "";
      if (itemListInputRef.current) itemListInputRef.current.value = "";
    }
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdCardFile(file);
    const reader = new FileReader();
    reader.onload = () => setIdCardPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFinalSubmit = async () => {
    setUploadStatus("uploading");
    setUploadError("");

    const initialTasks: UploadTask[] = [
      { id: "db", name: "สร้างรายการในฐานข้อมูล", status: "uploading" }
    ];
    if (receiptPreview) initialTasks.push({ id: "receipt", name: "อัปโหลดใบเสร็จรับเงิน/ใบกำกับภาษี", status: "pending" });
    if (hasItemList && itemListPreview) initialTasks.push({ id: "itemList", name: "อัปโหลดไฟล์รายการสินค้า", status: "pending" });
    if (slipPreview && !paidWithCash) initialTasks.push({ id: "slip", name: "อัปโหลดสลิปการโอนเงิน", status: "pending" });
    if (requireIdCard && idCardPreview) initialTasks.push({ id: "idCard", name: "อัปโหลดสำเนาบัตรประชาชนผู้ขาย", status: "pending" });
    
    // Summary Merge Task
    const willHaveMultiple = (receiptPreview ? 1 : 0) + (hasItemList && itemListPreview ? 1 : 0) + (slipPreview && !paidWithCash ? 1 : 0) + (requireIdCard && idCardPreview ? 1 : 0) > 0;
    if (willHaveMultiple) initialTasks.push({ id: "merge", name: "รวมไฟล์ทั้งหมดเป็น PDF สรุป", status: "pending" });
    
    setUploadTasks(initialTasks);

    const updateTask = (id: string, updates: Partial<UploadTask>) => {
      setUploadTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    try {
      const folderId = await getSetting("outcome_drive_folder_id");
      if (!folderId) {
        throw new Error("ยังไม่ได้ตั้งค่า Google Drive สำหรับ Outcome ในหน้า Setting");
      }

      const dateObj = new Date(date);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      
      const filePrefix = `${dd}${mm}${yyyy}${dailySeq}`;
      const rawSafeShopName = shopName ? shopName.replace(/[^a-zA-Z0-9ก-๙\s-]/g, "").trim().replace(/\s+/g, "_") : "ไม่ระบุ";
      const safeShopName = rawSafeShopName.length > 30 ? rawSafeShopName.substring(0, 30) : rawSafeShopName;
      const baseFileName = `${filePrefix}-OUT-มีบิล-${safeShopName}`;

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const driveMonthStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')} ${months[dateObj.getMonth()]}`;
      const drivePathPrefix = `${yyyy} > ${driveMonthStr} > ร้านค้ามีใบเสร็จ`;

      const uploadedFiles: { type: string; link: string; name: string; path: string }[] = [];
      const base64PdfsToMerge: string[] = [];

      if (receiptPreview && receiptFile) {
        updateTask("receipt", { status: "uploading" });
        try {
          const pdfBase64 = await convertImageToPdfBase64(receiptPreview, receiptFile.type);
          base64PdfsToMerge.push(pdfBase64);
          const receiptName = `${baseFileName}-ใบเสร็จ`;
          const res = await uploadToGoogleDrive(pdfBase64, folderId, receiptName, date, "ร้านค้ามีใบเสร็จ");
          if (!res.success) throw new Error(res.error || "Failed to upload receipt to Drive");
          uploadedFiles.push({ type: "receipt", link: res.link, name: receiptName, path: `${drivePathPrefix} > ${receiptName}.pdf` });
          updateTask("receipt", { status: "success", link: res.link, path: `${drivePathPrefix} > ${receiptName}.pdf` });
        } catch (e) {
          updateTask("receipt", { status: "error", error: (e as Error).message });
          throw e;
        }
      }

      if (hasItemList && itemListPreview && itemListFile) {
        updateTask("itemList", { status: "uploading" });
        try {
          const pdfBase64 = await convertImageToPdfBase64(itemListPreview, itemListFile.type);
          base64PdfsToMerge.push(pdfBase64);
          const itemListName = `${baseFileName}-รายการสินค้า`;
          const res = await uploadToGoogleDrive(pdfBase64, folderId, itemListName, date, "ร้านค้ามีใบเสร็จ");
          if (!res.success) throw new Error(res.error || "Failed to upload item list to Drive");
          uploadedFiles.push({ type: "item_list", link: res.link, name: itemListName, path: `${drivePathPrefix} > ${itemListName}.pdf` });
          updateTask("itemList", { status: "success", link: res.link, path: `${drivePathPrefix} > ${itemListName}.pdf` });
        } catch (e) {
          updateTask("itemList", { status: "error", error: (e as Error).message });
          throw e;
        }
      }

      if (slipPreview && !paidWithCash && slipFile) {
        updateTask("slip", { status: "uploading" });
        try {
          const pdfBase64 = await convertImageToPdfBase64(slipPreview, slipFile.type);
          base64PdfsToMerge.push(pdfBase64);
          const slipFileName = `${baseFileName}-slip`;
          const res = await uploadToGoogleDrive(pdfBase64, folderId, slipFileName, date, "ร้านค้ามีใบเสร็จ");
          if (!res.success) throw new Error(res.error || "Failed to upload slip to Drive");
          uploadedFiles.push({ type: "transfer_slip", link: res.link, name: slipFileName, path: `${drivePathPrefix} > ${slipFileName}.pdf` });
          updateTask("slip", { status: "success", link: res.link, path: `${drivePathPrefix} > ${slipFileName}.pdf` });
        } catch (e) {
          updateTask("slip", { status: "error", error: (e as Error).message });
          throw e;
        }
      }

      if (requireIdCard && idCardPreview && idCardFile) {
        updateTask("idCard", { status: "uploading" });
        try {
          const pdfBase64 = await convertImageToPdfBase64(idCardPreview, idCardFile.type);
          base64PdfsToMerge.push(pdfBase64);
          const idCardFileName = `${baseFileName}-id`;
          const res = await uploadToGoogleDrive(pdfBase64, folderId, idCardFileName, date, "ร้านค้ามีใบเสร็จ");
          if (!res.success) throw new Error(res.error || "Failed to upload ID card to Drive");
          uploadedFiles.push({ type: "id_card_copy", link: res.link, name: idCardFileName, path: `${drivePathPrefix} > ${idCardFileName}.pdf` });
          updateTask("idCard", { status: "success", link: res.link, path: `${drivePathPrefix} > ${idCardFileName}.pdf` });
        } catch (e) {
          updateTask("idCard", { status: "error", error: (e as Error).message });
          throw e;
        }
      }

      // Merge and Upload Summary PDF
      if (base64PdfsToMerge.length > 0) {
        updateTask("merge", { status: "uploading" });
        try {
          const mergedPdfBase64 = await mergePdfBase64(base64PdfsToMerge);
          const sumFileName = `${baseFileName}-sum`;
          // Passing "" as subfolder puts it in root (month folder)
          const res = await uploadToGoogleDrive(mergedPdfBase64, folderId, sumFileName, date, "");
          if (!res.success) throw new Error(res.error || "Failed to upload merged summary PDF to Drive");
          uploadedFiles.push({ type: "summary", link: res.link, name: sumFileName, path: `${yyyy} > ${driveMonthStr} > ${sumFileName}.pdf` });
          updateTask("merge", { status: "success", link: res.link, path: `${yyyy} > ${driveMonthStr} > ${sumFileName}.pdf` });
        } catch (e) {
          updateTask("merge", { status: "error", error: (e as Error).message });
          throw e;
        }
      }

      // 2. Create Transaction and Database Records ONLY if all uploads succeeded
      updateTask("db", { status: "uploading" });
      const finalDescription = requireIdCard
        ? (description ? `${description} [REQ_ID]` : "[REQ_ID]")
        : description;

      const transaction = await createTransaction({
        type: "outcome",
        category: "shop_with_receipt",
        description: finalDescription,
        amount: parseFloat(amount) || 0,
        currency: items[0]?.currency || "THB",
        transaction_date: date,
        shop_name: shopName,
        shop_address: shopAddress,
        shop_tax_id: shopTaxId,
      });

      for (const uf of uploadedFiles) {
        await saveGoogleDriveFileLink(transaction.id, uf.type, uf.link, uf.name);
      }

      if (items.length > 0) {
        await addReceiptItems(
          transaction.id,
          items.map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            currency: item.currency || "THB",
          }))
        );
      }

      updateTask("db", { status: "success" });
      setUploadStatus("complete");
      
    } catch (err) {
      setUploadStatus("error");
      setUploadError((err as Error).message);
    }
  };

  const canSubmit = items.length > 0 && shopName && amount && (paidWithCash || slipPreview) && receiptPreview && (!requireIdCard || idCardPreview);

  return (
    <main className="min-h-screen p-4 md:p-8 pb-24 bg-slate-50/50">
      {uploadStatus !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-center text-slate-800 dark:text-white">
              สถานะการบันทึกข้อมูล
            </h3>
            
            <div className="space-y-3 mb-6">
              {uploadTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-1 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{task.name}</span>
                    <span className="text-sm">
                      {task.status === "pending" && <span className="text-slate-400">รอดำเนินการ...</span>}
                      {task.status === "uploading" && <span className="text-indigo-500 flex items-center gap-1"><span className="animate-spin text-lg">↻</span> กำลังอัปโหลด</span>}
                      {task.status === "success" && <span className="text-emerald-500 font-bold">✓ สำเร็จ</span>}
                      {task.status === "error" && <span className="text-red-500 font-bold">✗ ล้มเหลว</span>}
                    </span>
                  </div>
                  {task.error && <p className="text-xs text-red-500 mt-1">{task.error}</p>}
                  {task.path && task.status === "success" && (
                    <p className="text-[10px] text-slate-500 mt-1 bg-white p-1 rounded border border-slate-100 font-mono break-all">
                      📍 {task.path}
                    </p>
                  )}
                  {task.link && (
                    <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                      <span>🔗</span> ดูไฟล์ใน Google Drive
                    </a>
                  )}
                </div>
              ))}
            </div>

            {uploadError && <p className="text-red-500 text-sm mt-4 text-center">{uploadError}</p>}
            
            <div className="flex gap-3 mt-6">
              {uploadStatus === "error" && (
                <button onClick={() => setUploadStatus("idle")} className="w-full btn-outline">
                  ปิดและแก้ไข
                </button>
              )}
              {uploadStatus === "complete" && (
                <button onClick={() => router.push("/outcome/shop-with-receipt")} className="w-full btn-primary">
                  เสร็จสิ้น (กลับสู่หน้ารวม)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">สร้างรายการใหม่</h1>
          <p className="text-slate-500 mt-1">ร้านค้าที่มีใบเสร็จ (สแกน AI + แนบสลิป)</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          
          <div className="card shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">1</div>
              <h2 className="text-lg font-bold">สแกนใบเสร็จรับเงิน/ใบกำกับภาษี</h2>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-xl text-center mb-6">
              <h2 className="text-lg font-bold text-indigo-800 mb-2">📸 อัปโหลดใบเสร็จรับเงิน เพื่อสแกน</h2>
              <p className="text-sm text-indigo-600 mb-4 max-w-md mx-auto">
                AI จะช่วยดึงข้อมูลบริษัท, ที่อยู่, เลขผู้เสียภาษี และรายการสินค้าให้อัตโนมัติ
              </p>
              <input 
                type="file" 
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden" 
                ref={scanInputRef}
                onChange={handleReceiptChange}
              />
              
              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={() => scanInputRef.current?.click()}
                  disabled={isScanning}
                  className="btn-primary shadow-md shadow-indigo-200 px-8 py-3 rounded-full w-full max-w-sm"
                >
                  {isScanning ? "กำลังให้ AI อ่านข้อมูล... ⏳" : (receiptFile ? "เปลี่ยนรูปภาพใบเสร็จ" : "1. คลิกที่นี่สำหรับรูปใบเสร็จรับเงิน/ใบกำกับภาษี")}
                </button>
                
                <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-700 bg-white/50 px-4 py-2 rounded-lg border border-indigo-100 w-full max-w-sm">
                  <input
                    type="checkbox"
                    checked={hasItemList}
                    onChange={(e) => {
                      setHasItemList(e.target.checked);
                      if (!e.target.checked) {
                        setItemListFile(null);
                        setItemListPreview(null);
                      }
                    }}
                    className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>มีไฟล์รายการสินค้าแยกต่างหาก (เช่น จาก Shopee)</span>
                </label>
                
                {hasItemList && (
                  <div className="w-full max-w-sm animate-in fade-in slide-in-from-top-2">
                    <input 
                      type="file" 
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="hidden" 
                      ref={itemListInputRef}
                      onChange={handleItemListChange}
                    />
                    <button 
                      onClick={() => itemListInputRef.current?.click()}
                      disabled={isScanning}
                      className="btn-outline w-full px-8 py-3 rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      {itemListFile ? "เปลี่ยนรูปภาพรายการสินค้า" : "2. คลิกที่นี่สำหรับเพิ่มรายการสินค้าหรือไฟล์ที่เกี่ยวข้อง"}
                    </button>
                  </div>
                )}

                {hasItemList && (receiptFile || itemListFile) && (
                  <button 
                    onClick={handleManualScan}
                    disabled={isScanning || (!receiptFile && !itemListFile)}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 px-8 py-3 rounded-full w-full max-w-sm mt-2 animate-in fade-in"
                  >
                    {isScanning ? "กำลังให้ AI อ่านข้อมูล... ⏳" : "✨ สแกนข้อมูลด้วย AI"}
                  </button>
                )}
              </div>
              {scanError && <p className="text-red-500 text-sm mt-3">{scanError}</p>}
              
              <div className="flex gap-4 justify-center flex-wrap mt-6">
                {receiptPreview && (
                  <div className="relative inline-block group">
                    <p className="text-xs text-indigo-600 mb-1 font-medium">ใบเสร็จ/ใบกำกับภาษี</p>
                    <img src={receiptPreview} className="max-h-48 rounded-lg border border-slate-200 shadow-sm" alt="receipt preview" />
                    {!isScanning && (
                      <button onClick={() => { setReceiptPreview(null); setReceiptFile(null); }} className="absolute top-6 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">✕</button>
                    )}
                  </div>
                )}
                {hasItemList && itemListPreview && (
                  <div className="relative inline-block group animate-in fade-in zoom-in-95">
                    <p className="text-xs text-emerald-600 mb-1 font-medium">รายการสินค้า</p>
                    <img src={itemListPreview} className="max-h-48 rounded-lg border border-slate-200 shadow-sm" alt="item list preview" />
                    {!isScanning && (
                      <button onClick={() => { setItemListPreview(null); setItemListFile(null); }} className="absolute top-6 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">✕</button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">ชื่อร้านค้า / บริษัท</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input-field"
                  placeholder="กรอกชื่อบริษัท"
                />
              </div>
              <div>
                <label className="label">เลขประจำตัวผู้เสียภาษี</label>
                <input
                  type="text"
                  value={shopTaxId}
                  onChange={(e) => setShopTaxId(e.target.value)}
                  className="input-field"
                  placeholder="เลข Tax ID 13 หลัก"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">ที่อยู่ร้านค้า</label>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="input-field"
                  placeholder="ที่อยู่ตามใบกำกับภาษี"
                />
              </div>
              <div>
                <label className="label">วันที่บนใบเสร็จ</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">รายละเอียด (ไม่บังคับ)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  placeholder="เช่น ซื้ออุปกรณ์สำนักงาน"
                />
              </div>
            </div>
          </div>

          <div className="card shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">2</div>
              <h2 className="text-lg font-bold">ตรวจสอบรายการสินค้า</h2>
            </div>
            
            <ReceiptGenerator
              onChange={(newItems) => {
                setItems(newItems);
                const sum = newItems.reduce((acc, i) => acc + i.quantity * i.unit_price, 0);
                setAmount(sum.toString());
              }}
              initialItems={items}
            />
          </div>

          <div className="card shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">3</div>
                <h2 className="text-lg font-bold">อัปโหลดสลิปการโอนเงิน</h2>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                  checked={paidWithCash}
                  onChange={(e) => setPaidWithCash(e.target.checked)}
                />
                <span className="font-medium text-slate-700">ชำระด้วยเงินสด (ไม่ต้องใช้สลิป)</span>
              </label>
            </div>

            {!paidWithCash && (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 text-center">
                <input
                  ref={slipInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleSlipChange}
                  className="hidden"
                />
                {!slipPreview ? (
                  <div>
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">💸</div>
                    <p className="text-slate-600 font-medium mb-3">อัปโหลดสลิปโอนเงิน (Slip)</p>
                    <button
                      type="button"
                      onClick={() => slipInputRef.current?.click()}
                      className="btn-outline px-6 py-2"
                    >
                      เลือกรูปสลิป
                    </button>
                  </div>
                ) : (
                  <div>
                    <img src={slipPreview} alt="สลิป" className="max-h-48 rounded-lg border object-contain mx-auto shadow-sm mb-3" />
                    <button
                      type="button"
                      onClick={() => slipInputRef.current?.click()}
                      className="btn-outline px-6 py-2"
                    >
                      เปลี่ยนสลิป
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`card shadow-sm border border-slate-100 ${!requireIdCard ? 'opacity-75 bg-slate-50/50' : ''}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${requireIdCard ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>4</div>
                <h2 className={`text-lg font-bold ${!requireIdCard && 'text-slate-500'}`}>สำเนาบัตรประชาชนผู้ขาย</h2>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                  checked={requireIdCard}
                  onChange={(e) => setRequireIdCard(e.target.checked)}
                />
                <span className="font-medium text-slate-700">แนบสำเนาบัตรฯ</span>
              </label>
            </div>

            {requireIdCard && (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 text-center">
                <input
                  ref={idCardInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleIdCardChange}
                  className="hidden"
                />
                {!idCardPreview ? (
                  <div>
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">🪪</div>
                    <p className="text-slate-600 font-medium mb-3">อัปโหลดสำเนาบัตรประชาชนผู้ขาย</p>
                    <button
                      type="button"
                      onClick={() => idCardInputRef.current?.click()}
                      className="btn-outline px-6 py-2"
                    >
                      เลือกไฟล์
                    </button>
                  </div>
                ) : (
                  <div>
                    {idCardFile?.type === "application/pdf" ? (
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">PDF</div>
                    ) : (
                      <img src={idCardPreview} alt="สำเนาบัตร" className="max-h-48 rounded-lg border object-contain mx-auto shadow-sm mb-3" />
                    )}
                    <button
                      type="button"
                      onClick={() => idCardInputRef.current?.click()}
                      className="btn-outline px-6 py-2"
                    >
                      เปลี่ยนไฟล์
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 lg:left-72 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <p className="text-sm text-slate-500 hidden sm:block">ตรวจสอบข้อมูลให้ครบถ้วนก่อนบันทึก</p>
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={() => router.push("/outcome/shop-with-receipt")} 
                className="btn-outline flex-1 sm:flex-none"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleFinalSubmit}
                disabled={!canSubmit || uploadStatus === "uploading"}
                className="btn-primary flex-1 sm:flex-none shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                Accept and save to drive
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
