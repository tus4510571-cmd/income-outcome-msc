"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReceiptGenerator from "@/components/ReceiptGenerator";
import CashBillGenerator from "@/components/CashBillGenerator";
import { type ReceiptItem, formatCurrency } from "@/lib/types";
import { createTransaction, addReceiptItems, uploadFile, getSetting, setSetting, getNextDailySequence, getNextMonthlySequence, saveGoogleDriveFileLink } from "@/lib/actions";
import { uploadToGoogleDrive } from "@/lib/drive";
import { convertImageToPdfBase64, mergePdfBase64 } from "@/lib/pdfUtils";
import { thaiBahtText } from "@/lib/thaiBaht";
import { toJpeg } from "html-to-image";

export default function NewShopWithoutReceiptPage() {
  // Step 1: AI Data
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopTaxId, setShopTaxId] = useState("");
  const [platform, setPlatform] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  
  // Step 2: Files & Options
  const [paidWithCash, setPaidWithCash] = useState(false);
  
  const [businessCardPreview, setBusinessCardPreview] = useState<string | null>(null);
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [scannedFiles, setScannedFiles] = useState<File[]>([]);
  const cardInputRef = useRef<HTMLInputElement>(null);

  const [isCashBillMode, setIsCashBillMode] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");

  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  // Step 4: Signatures
  const [savedNames, setSavedNames] = useState<string[]>(["เมทินี รัตนไชย"]);
  const [savedPositions, setSavedPositions] = useState<string[]>(["กรรมการผู้จัดการ"]);
  
  const [payerName, setPayerName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [approverName, setApproverName] = useState("");
  
  const [employeeName, setEmployeeName] = useState("เมทินี รัตนไชย");
  const [employeePosition, setEmployeePosition] = useState("กรรมการผู้จัดการ");

  const [newNameInput, setNewNameInput] = useState("");
  const [isAddingName, setIsAddingName] = useState(false);
  
  const [newPositionInput, setNewPositionInput] = useState("");
  const [isAddingPosition, setIsAddingPosition] = useState(false);

  // System States
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "complete" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const [dailySeq, setDailySeq] = useState("001");
  const [monthlySeq, setMonthlySeq] = useState("0001");

  type UploadTask = {
    id: string;
    name: string;
    status: "pending" | "uploading" | "success" | "error";
    link?: string;
    path?: string;
    error?: string;
  };
  type DriveFile = { id: string; name: string; mimeType: string };
  const [signatureFiles, setSignatureFiles] = useState<DriveFile[]>([]);
  const [driveListError, setDriveListError] = useState<string | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  const router = useRouter();

  // Load sequences and names
  useEffect(() => {
    async function initData() {
      const d = await getNextDailySequence(date);
      const m = await getNextMonthlySequence(date);
      setDailySeq(d);
      setMonthlySeq(m);
      
      const namesStr = await getSetting("saved_signature_names");
      if (namesStr) {
        try {
          const names = JSON.parse(namesStr);
          if (names.length > 0) setSavedNames(names);
        } catch(e) {}
      }

      const positionsStr = await getSetting("saved_employee_positions");
      if (positionsStr) {
        try {
          const positions = JSON.parse(positionsStr);
          if (positions.length > 0) setSavedPositions(positions);
        } catch(e) {}
      }

      // Load company details
      const cName = await getSetting("company_name");
      if (cName) setCompanyName(cName);
      const cAddress = await getSetting("company_address");
      if (cAddress) setCompanyAddress(cAddress);
      const cTaxId = await getSetting("company_tax_id");
      if (cTaxId) setCompanyTaxId(cTaxId);
      
      const sigFolderId = await getSetting("signature_folder_id");
      if (sigFolderId) {
        try {
          const res = await fetch(`/api/drive-list?folderId=${sigFolderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.files) {
              setSignatureFiles(data.files);
              const driveNames = data.files.map((f: DriveFile) => f.name.replace(/\.[^/.]+$/, ""));
              setSavedNames(prev => Array.from(new Set([...prev, ...driveNames])));
              setDriveListError(null);
            }
          } else {
             const errData = await res.json();
             setDriveListError(errData.error || "ไม่สามารถดึงข้อมูลจาก Google Drive ได้ กรุณาอัปเดต GAS Script เป็น V2");
          }
        } catch (e: any) {
          console.error("Failed to fetch signature files", e);
          setDriveListError(e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ Google Drive");
        }
      } else {
        setDriveListError("ยังไม่ได้ตั้งค่า Folder ID ลายเซ็นต์ในหน้า Settings");
      }
    }
    initData();
  }, [date]);

  const handleAddNewName = async () => {
    if (!newNameInput.trim()) return;
    const newName = newNameInput.trim();
    if (savedNames.includes(newName)) {
       setNewNameInput("");
       setIsAddingName(false);
       return;
    }
    
    const updatedList = [...savedNames, newName];
    setSavedNames(updatedList);
    setNewNameInput("");
    setIsAddingName(false);
    
    await setSetting("saved_signature_names", JSON.stringify(updatedList));
  };

  const handleAddNewPosition = async () => {
    if (!newPositionInput.trim()) return;
    const newPos = newPositionInput.trim();
    if (savedPositions.includes(newPos)) {
       setNewPositionInput("");
       setIsAddingPosition(false);
       return;
    }
    
    const updatedList = [...savedPositions, newPos];
    setSavedPositions(updatedList);
    setNewPositionInput("");
    setIsAddingPosition(false);
    
    await setSetting("saved_employee_positions", JSON.stringify(updatedList));
  };

  const getSignatureUrl = (name: string, fallbackId: string) => {
    if (!name || signatureFiles.length === 0) return `/api/drive-image?id=${fallbackId}`;
    
    // Find file in drive matching the name (more flexible matching)
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    const file = signatureFiles.find(f => {
      const normalizedFileName = f.name.toLowerCase().replace(/\s+/g, '');
      return normalizedFileName.includes(normalizedName);
    });
    
    if (file) {
      return `/api/drive-image?id=${file.id}`;
    }
    
    return `/api/drive-image?id=${fallbackId}`;
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusinessCardFile(file);
    const reader = new FileReader();
    reader.onload = () => setBusinessCardPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsScanning(true);
    setScanError("");
    
    const fileArray = Array.from(files);
    setScannedFiles(fileArray);
    
    // Preview the first file
    setBusinessCardFile(fileArray[0]);
    const reader = new FileReader();
    reader.onload = () => setBusinessCardPreview(reader.result as string);
    reader.readAsDataURL(fileArray[0]);
    
    try {
      const formData = new FormData();
      fileArray.forEach(f => formData.append("receipt", f));
      
      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสแกนใบเสร็จ");
      }
      
      if (data.shopName && data.shopName !== "ไม่ระบุชื่อร้าน") setShopName(data.shopName);
      if (data.address && data.address !== "ไม่ระบุที่อยู่") setShopAddress(data.address);
      if (data.taxId && data.taxId !== "ไม่ระบุ Tax ID") setShopTaxId(data.taxId);
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
    }
  };

  const handleFinalSubmit = async () => {
    setUploadStatus("uploading");
    setUploadError("");

    const initialTasks: { id: string, name: string, status: "pending" | "uploading" | "success" | "error", link?: string, error?: string, path?: string }[] = [
      { id: "db", name: "สร้างรายการในฐานข้อมูล", status: "uploading" }
    ];
    if (scannedFiles.length > 0) initialTasks.push({ id: "card", name: `อัปโหลดไฟล์แนบ (${scannedFiles.length} ไฟล์)`, status: "pending" });
    if (slipPreview && !paidWithCash) initialTasks.push({ id: "slip", name: "อัปโหลดสลิปการโอนเงิน", status: "pending" });
    if (isCashBillMode) initialTasks.push({ id: "cashbill", name: "สร้างและอัปโหลดบิลเงินสด", status: "pending" });
    initialTasks.push({ id: "receipt", name: "สร้างและอัปโหลดใบรับรองแทนใบเสร็จ", status: "pending" });
    
    // Summary Merge Task
    const willHaveMultiple = (scannedFiles.length > 0 ? 1 : 0) + (slipPreview && !paidWithCash ? 1 : 0) + (isCashBillMode ? 1 : 0) + 1 > 0;
    if (willHaveMultiple) initialTasks.push({ id: "merge", name: "รวมไฟล์ทั้งหมดเป็น PDF สรุป", status: "pending" });
    
    setUploadTasks(initialTasks);

    const updateTask = (id: string, updates: any) => {
      setUploadTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    try {
      const folderId = await getSetting("outcome_drive_folder_id");
      if (!folderId) {
        throw new Error("ยังไม่ได้ตั้งค่า Google Drive สำหรับ Outcome ในหน้า Setting");
      }

      // Transaction creation moved to the end of the try block

      const receiptElement = document.getElementById("receipt-capture");
      if (!receiptElement) throw new Error("Receipt template not found");
      
      await new Promise(r => setTimeout(r, 500)); 
      
      const receiptBase64 = await toJpeg(receiptElement, { quality: 0.95, pixelRatio: 2 });

      const dateObj = new Date(date);
      const yyyy = dateObj.getFullYear();
      const yy = String(yyyy).slice(2);
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      
      const filePrefix = `${dd}${mm}${yyyy}${dailySeq}`;
      const rawSafeShopName = shopName ? shopName.replace(/[^a-zA-Z0-9ก-๙\s-]/g, "").trim().replace(/\s+/g, "_") : "ไม่ระบุ";
      const safeShopName = rawSafeShopName.length > 30 ? rawSafeShopName.substring(0, 30) : rawSafeShopName;
      const baseFileName = `${filePrefix}-OUT-ไม่มีบิล-${safeShopName}`;

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const driveMonthStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')} ${months[dateObj.getMonth()]}`;
      const drivePathPrefix = `${yyyy} > ${driveMonthStr} > ร้านค้าไม่มีใบเสร็จ`;

      const uploadedFiles: { type: string; link: string; name: string; path: string }[] = [];
      const base64PdfsToMerge: string[] = [];

      if (scannedFiles.length > 0) {
        updateTask("card", { status: "uploading" });
        try {
          for (let i = 0; i < scannedFiles.length; i++) {
            const f = scannedFiles[i];
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(f);
            });
            const pdfBase64 = await convertImageToPdfBase64(dataUrl, f.type || "image/jpeg");
            base64PdfsToMerge.push(pdfBase64);
            const name = scannedFiles.length > 1 ? `${baseFileName}-แนบ-${i+1}` : `${baseFileName}-แนบ`;
            const res = await uploadToGoogleDrive(pdfBase64, folderId, name, date, "ร้านค้าไม่มีใบเสร็จ");
            if (!res.success) throw new Error(res.error || `Failed to upload attached file ${i+1}`);
            uploadedFiles.push({ type: `attachment_${i+1}`, link: res.link, name, path: `${drivePathPrefix} > ${name}.pdf` });
            if (i === 0) updateTask("card", { status: "success", link: res.link, path: `${drivePathPrefix} > ${name}.pdf` });
          }
        } catch (e) {
          updateTask("card", { status: "error", error: (e as Error).message });
          throw e;
        }
      }

      if (slipPreview && !paidWithCash) {
        updateTask("slip", { status: "uploading" });
        try {
          const pdfBase64 = await convertImageToPdfBase64(slipPreview, slipFile?.type || "image/jpeg");
          base64PdfsToMerge.push(pdfBase64);
          const slipFileName = `${baseFileName}-slip`;
          const res = await uploadToGoogleDrive(pdfBase64, folderId, slipFileName, date, "ร้านค้าไม่มีใบเสร็จ");
          if (!res.success) throw new Error(res.error || "Failed to upload slip to Drive");
          uploadedFiles.push({ type: "transfer_slip", link: res.link, name: slipFileName, path: `${drivePathPrefix} > ${slipFileName}.pdf` });
          updateTask("slip", { status: "success", link: res.link, path: `${drivePathPrefix} > ${slipFileName}.pdf` });
        } catch (e) {
          updateTask("slip", { status: "error", error: (e as Error).message });
          throw e;
        }
      }

      if (isCashBillMode) {
        updateTask("cashbill", { status: "uploading" });
        try {
          const cashBillElement = document.getElementById("cashbill-capture");
          if (!cashBillElement) throw new Error("Cash bill template not found");
          const cbBase64 = await toJpeg(cashBillElement, { quality: 0.95, pixelRatio: 2 });
          const cbPdfBase64 = await convertImageToPdfBase64(cbBase64, "image/jpeg");
          base64PdfsToMerge.push(cbPdfBase64);
          const cbFileName = `${baseFileName}-บิลเงินสด`;
          const cbRes = await uploadToGoogleDrive(cbPdfBase64, folderId, cbFileName, date, "ร้านค้าไม่มีใบเสร็จ");
          if (!cbRes.success) throw new Error(cbRes.error || "Failed to upload cash bill to Drive");
          uploadedFiles.push({ type: "cash_bill", link: cbRes.link, name: cbFileName, path: `${drivePathPrefix} > ${cbFileName}.pdf` });
          updateTask("cashbill", { status: "success", link: cbRes.link, path: `${drivePathPrefix} > ${cbFileName}.pdf` });
        } catch (e) {
          updateTask("cashbill", { status: "error", error: (e as Error).message });
          throw e;
        }
      }

      updateTask("receipt", { status: "uploading" });
      try {
        const pdfReceiptBase64 = await convertImageToPdfBase64(receiptBase64, "image/jpeg");
        base64PdfsToMerge.push(pdfReceiptBase64);
        const receiptFileName = `${baseFileName}-ใบรับรองแทนใบเสร็จรับเงิน`;
        const res = await uploadToGoogleDrive(pdfReceiptBase64, folderId, receiptFileName, date, "ร้านค้าไม่มีใบเสร็จ");
        if (!res.success) throw new Error(res.error || "Failed to upload generated receipt to Drive");
        uploadedFiles.push({ type: "receipt", link: res.link, name: receiptFileName, path: `${drivePathPrefix} > ${receiptFileName}.pdf` });
        updateTask("receipt", { status: "success", link: res.link, path: `${drivePathPrefix} > ${receiptFileName}.pdf` });
      } catch (e) {
        updateTask("receipt", { status: "error", error: (e as Error).message });
        throw e;
      }

      // Merge and Upload Summary PDF
      if (base64PdfsToMerge.length > 0) {
        updateTask("merge", { status: "uploading" });
        try {
          const mergedPdfBase64 = await mergePdfBase64(base64PdfsToMerge);
          const sumFileName = `${baseFileName}-sum`;
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
      const finalDescription = [platform && platform !== "Other" ? platform : "", description].filter(Boolean).join(" ");
      const transaction = await createTransaction({
        type: "outcome",
        category: "shop_without_receipt",
        description: finalDescription,
        amount: parseFloat(amount) || 0,
        currency: items[0]?.currency || "THB",
        transaction_date: date,
        shop_name: shopName,
        shop_address: shopAddress,
        shop_tax_id: shopTaxId,
      });
      setTransactionId(transaction.id);

      for (const uf of uploadedFiles) {
        await saveGoogleDriveFileLink(transaction.id, uf.type, uf.link, uf.name);
      }

      await addReceiptItems(
        transaction.id,
        items.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: item.currency || "THB",
        }))
      );
      updateTask("db", { status: "success" });

      setUploadStatus("complete");
      // ไม่ทำการ redirect อัตโนมัติ เพื่อให้ผู้ใช้กดลิงก์ดูไฟล์ได้
      
    } catch (err) {
      setUploadStatus("error");
      setUploadError((err as Error).message);
    }
  };

  const canSubmit = items.length > 0 && shopName && amount && (paidWithCash || slipPreview);
  
  const txDate = new Date(date);
  const dateString = `${String(txDate.getDate()).padStart(2, '0')}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${txDate.getFullYear() + 543}`;
  const invoiceNumber = `PV${String(txDate.getFullYear() + 543).slice(2)}${String(txDate.getMonth() + 1).padStart(2, '0')}${monthlySeq}`;
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

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
                <button onClick={() => router.push("/outcome/shop-without-receipt")} className="w-full btn-primary">
                  เสร็จสิ้น (กลับสู่หน้ารวม)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">สร้างใบรับรองแทนใบเสร็จรับเงิน</h1>
          <p className="text-slate-500 mt-1">ร้านค้าไม่มีใบเสร็จ (สแกน AI + แนบสลิป)</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          
          <div className="card shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">1</div>
              <h2 className="text-lg font-bold">สแกนบิล/นามบัตร ด้วย AI</h2>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-xl text-center mb-6">
              <h2 className="text-lg font-bold text-indigo-800 mb-2">📸 อัปโหลดบิล/นามบัตร เพื่อสแกน</h2>
              <p className="text-sm text-indigo-600 mb-4 max-w-md mx-auto">
                AI จะช่วยดึงข้อมูลร้านค้า, ยอดเงิน และรายการสินค้าให้อัตโนมัติ
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="cashBillMode"
                  checked={isCashBillMode}
                  onChange={(e) => setIsCashBillMode(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="cashBillMode" className="text-sm font-medium text-slate-700 cursor-pointer">
                  สร้างบิลเงินสดจากนามบัตร (อัปโหลดได้หลายไฟล์)
                </label>
              </div>

              <input 
                type="file" 
                accept="application/pdf,image/jpeg,image/png,image/webp"
                multiple
                className="hidden" 
                ref={scanInputRef}
                onChange={handleScanReceipt}
              />
              <button 
                onClick={() => scanInputRef.current?.click()}
                disabled={isScanning}
                className="btn-primary shadow-md shadow-indigo-200 px-8 py-3 rounded-full"
              >
                {isScanning ? "กำลังให้ AI อ่านข้อมูล... ⏳" : "เลือกรูปภาพบิลเงินสด/นามบัตร"}
              </button>
              {scanError && <p className="text-red-500 text-sm mt-3">{scanError}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">ชื่อร้านค้า / ผู้ขาย</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input-field"
                  placeholder="กรอกชื่อร้านค้า"
                />
              </div>
              <div>
                <label className="label">วันที่</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">รายละเอียด (ไม่บังคับ)</label>
                <div className="flex gap-2">
                  <select
                    className="input-field max-w-[150px] cursor-pointer"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    <option value="">(ระบุที่มา)</option>
                    <option value="Shopee">Shopee</option>
                    <option value="Lazada">Lazada</option>
                    <option value="TiktokShop">TiktokShop</option>
                    <option value="FB">FB</option>
                    <option value="Other">อื่นๆ</option>
                  </select>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field"
                    placeholder="พิมพ์รายละเอียดเพิ่มเติม เช่น ค่าจัดส่งพัสดุ"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">2</div>
              <h2 className="text-lg font-bold">ตรวจสอบรายการสินค้า</h2>
            </div>
            
            <ReceiptGenerator
              businessCardPreview={null}
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
                <h2 className="text-lg font-bold">หลักฐานการชำระเงิน</h2>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                  checked={paidWithCash}
                  onChange={(e) => setPaidWithCash(e.target.checked)}
                />
                <span className="font-medium text-slate-700">ชำระด้วยเงินสด</span>
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

          <div className="card shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">4</div>
                <h2 className="text-lg font-bold">ข้อมูลการลงนาม และพรีวิวเอกสาร</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
               <div className="md:col-span-2 mb-2 border-b pb-2">
                 <h3 className="font-bold text-slate-700">ข้อมูลผู้เบิกเงิน</h3>
               </div>
               <div>
                  <label className="label">ชื่อ</label>
                  <select 
                    className="input-field mb-2" 
                    value={employeeName} 
                    onChange={(e) => setEmployeeName(e.target.value)}
                  >
                     {savedNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="label">ตำแหน่ง</label>
                  <select 
                    className="input-field mb-2" 
                    value={employeePosition} 
                    onChange={(e) => setEmployeePosition(e.target.value)}
                  >
                     {savedPositions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
               </div>

               {/* Add New Position Section */}
               <div className="md:col-span-2 border-t border-slate-200 pt-4">
                 {!isAddingPosition ? (
                   <button 
                     type="button" 
                     onClick={() => setIsAddingPosition(true)} 
                     className="text-indigo-600 font-medium text-sm hover:underline"
                   >
                     + สร้างตำแหน่งใหม่
                   </button>
                 ) : (
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       className="input-field flex-1" 
                       placeholder="พิมพ์ตำแหน่งใหม่" 
                       value={newPositionInput}
                       onChange={e => setNewPositionInput(e.target.value)}
                     />
                     <button type="button" onClick={handleAddNewPosition} className="btn-primary whitespace-nowrap">เพิ่มตำแหน่ง</button>
                     <button type="button" onClick={() => { setIsAddingPosition(false); setNewPositionInput(""); }} className="btn-outline">ยกเลิก</button>
                   </div>
                 )}
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
               <div className="md:col-span-3 mb-2 border-b pb-2 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700">ข้อมูลผู้ลงนาม (ลายเซ็นต์)</h3>
                 {driveListError ? (
                   <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded border border-red-100">
                     ⚠️ {driveListError}
                   </span>
                 ) : (
                   <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded border border-green-100">
                     ✅ ดึงรูปลิงก์จากโฟลเดอร์สำเร็จ ({signatureFiles.length} รูป)
                   </span>
                 )}
               </div>
               <div>
                  <label className="label">ผู้จ่ายเงิน</label>
                  <select 
                    className="input-field mb-2" 
                    value={payerName} 
                    onChange={(e) => setPayerName(e.target.value)}
                  >
                     <option value="">-- ไม่ระบุชื่อ --</option>
                     {savedNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="label">ผู้รับของ/บริการ</label>
                  <select 
                    className="input-field mb-2" 
                    value={receiverName} 
                    onChange={(e) => setReceiverName(e.target.value)}
                  >
                     <option value="">-- ไม่ระบุชื่อ --</option>
                     {savedNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="label">ผู้อนุมัติ</label>
                  <select 
                    className="input-field mb-2" 
                    value={approverName} 
                    onChange={(e) => setApproverName(e.target.value)}
                  >
                     <option value="">-- ไม่ระบุชื่อ --</option>
                     {savedNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
               </div>

               {/* Add New Name Section */}
               <div className="md:col-span-3 border-t border-slate-200 pt-4">
                 {!isAddingName ? (
                   <button 
                     type="button" 
                     onClick={() => setIsAddingName(true)} 
                     className="text-indigo-600 font-medium text-sm hover:underline"
                   >
                     + สร้างชื่อลงนามใหม่
                   </button>
                 ) : (
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       className="input-field flex-1" 
                       placeholder="พิมพ์ชื่อ นามสกุล" 
                       value={newNameInput}
                       onChange={e => setNewNameInput(e.target.value)}
                     />
                     <button type="button" onClick={handleAddNewName} className="btn-primary whitespace-nowrap">เพิ่มชื่อ</button>
                     <button type="button" onClick={() => { setIsAddingName(false); setNewNameInput(""); }} className="btn-outline">ยกเลิก</button>
                   </div>
                 )}
               </div>
             </div>

             <div className="border border-slate-300 rounded-lg overflow-x-auto bg-slate-200 p-4">
                <div id="receipt-capture" className="p-10 font-sans border shadow-sm mx-auto my-0 flex flex-col" style={{ width: "794px", height: "fit-content", minHeight: "1040px", backgroundColor: "#ffffff", color: "#000000", borderColor: "#e5e7eb", boxSizing: "border-box" }}>
                  <div className="text-sm font-bold leading-relaxed mb-6">
                    <p>{companyName || "บริษัท โฮมออฟคราฟ จำกัด (สำนักงานใหญ่)"}</p>
                    <p>{companyAddress || "เลขที่ 35 ถ.นิพัทธ์สงเคราะห์ 4 ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110"}</p>
                    <p>{companyTaxId ? `เลขประจำตัวผู้เสียภาษี ${companyTaxId}` : "เลขประจำตัวผู้เสียภาษี 0905560005314"}</p>
                  </div>

                  <h1 className="text-2xl font-bold text-center mb-8">ใบรับรองแทนใบเสร็จรับเงิน</h1>

                  <div className="flex justify-end mb-6">
                    <div className="w-64">
                      <div className="flex border-b mb-2 pb-1" style={{ borderColor: "#000000" }}>
                        <span className="w-16 font-bold">เลขที่ :</span>
                        <span>{invoiceNumber}</span>
                      </div>
                      <div className="flex border-b pb-1" style={{ borderColor: "#000000" }}>
                        <span className="w-16 font-bold">วันที่ :</span>
                        <span>{dateString}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-base mb-8">
                    <div className="flex items-end">
                      <span className="w-24 font-bold">ชื่อ :</span>
                      <span className="flex-1 border-b text-center px-4" style={{ borderColor: "#000000" }}>{employeeName}</span>
                    </div>
                    <div className="flex items-end">
                      <span className="w-24 font-bold">ตำแหน่ง :</span>
                      <span className="flex-1 border-b text-center px-4" style={{ borderColor: "#000000" }}>{employeePosition}</span>
                    </div>
                    <div className="flex items-end">
                      <span className="font-bold mr-4">ขอรับรองว่าได้จ่ายเงินจำนวน :</span>
                      <span className="w-32 text-center border-b mr-4" style={{ borderColor: "#000000" }}>{formatCurrency(totalAmount, "").trim()} บาท</span>
                      <span className="flex-1 text-center border-b" style={{ borderColor: "#000000" }}>({thaiBahtText(totalAmount)})</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold mr-4">ให้แก่ (ชื่อบุคคล/ร้านค้า/สถานที่ตั้ง) :</span>
                      <span className="flex-1 border-b" style={{ borderColor: "#000000" }}>{shopName}</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold mr-4">โดยได้จ่ายไปในงานของทาง {companyName || "บริษัท โฮมออฟคราฟ จำกัด"} โดยแท้จริง</span>
                      <span>ดังรายการต่อไปนี้</span>
                    </div>
                  </div>

                  <table className="w-full text-base border-collapse border mb-2 text-center" style={{ borderColor: "#000000" }}>
                    <thead>
                      <tr className="border" style={{ borderColor: "#000000", backgroundColor: "#f9fafb" }}>
                        <th className="border py-2 font-bold w-24" style={{ borderColor: "#000000" }}>วันที่จ่าย<br/>Date</th>
                        <th className="border py-2 font-bold text-left px-2" style={{ borderColor: "#000000" }}>รายละเอียด<br/>Description</th>
                        <th className="border py-2 font-bold w-20" style={{ borderColor: "#000000" }}>จำนวน<br/>Quantity</th>
                        <th className="border py-2 font-bold w-28" style={{ borderColor: "#000000" }}>ราคาต่อหน่วย<br/>Unit Price</th>
                        <th className="border py-2 font-bold w-24" style={{ borderColor: "#000000" }}>ส่วนลด<br/>Discount</th>
                        <th className="border py-2 font-bold w-32" style={{ borderColor: "#000000" }}>จำนวนเงิน (บาท)<br/>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-x h-8" style={{ borderColor: "#000000" }}>
                          <td className="border-r" style={{ borderColor: "#000000" }}>{index === 0 ? dateString : ""}</td>
                          <td className="border-r text-left px-2" style={{ borderColor: "#000000" }}>{item.product_name}</td>
                          <td className="border-r" style={{ borderColor: "#000000" }}>{item.quantity}</td>
                          <td className="border-r text-right px-2" style={{ borderColor: "#000000" }}>{formatCurrency(item.unit_price, "").trim()}</td>
                          <td className="border-r" style={{ borderColor: "#000000" }}>-</td>
                          <td className="text-right px-2">{formatCurrency(item.quantity * item.unit_price, "").trim()}</td>
                        </tr>
                      ))}
                      {Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="border-x h-8" style={{ borderColor: "#000000" }}>
                          <td className="border-r" style={{ borderColor: "#000000" }}></td>
                          <td className="border-r" style={{ borderColor: "#000000" }}></td>
                          <td className="border-r" style={{ borderColor: "#000000" }}></td>
                          <td className="border-r" style={{ borderColor: "#000000" }}></td>
                          <td className="border-r" style={{ borderColor: "#000000" }}>-</td>
                          <td></td>
                        </tr>
                      ))}
                      
                      <tr className="border font-bold h-10" style={{ borderColor: "#000000" }}>
                        <td colSpan={2} className="border-r text-left px-2" style={{ borderColor: "#000000", backgroundColor: "#f9fafb" }}>รวมเงิน (ตัวอักษร)</td>
                        <td colSpan={3} className="border-r text-center" style={{ borderColor: "#000000", backgroundColor: "#f9fafb" }}>{thaiBahtText(totalAmount)}</td>
                        <td className="text-right px-2" style={{ backgroundColor: "#f9fafb" }}>{formatCurrency(totalAmount, "").trim()}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="grid grid-cols-3 gap-8 mt-12 text-center text-sm font-bold">
                    <div>
                      <p className="mb-2">ผู้จ่ายเงิน</p>
                      <div className="h-16 flex items-end justify-center mb-1">
                        <img src={getSignatureUrl(payerName, "signature_payer")} crossOrigin="anonymous" className="max-h-16 object-contain" alt="Payer Signature" />
                      </div>
                      <p className="border-b inline-block px-4 pb-1 mb-2 whitespace-nowrap min-w-[150px]" style={{ borderColor: "#000000" }}>
                        {payerName ? `( ${payerName} )` : "\u00A0"}
                      </p>
                      <div>วันที่ <span className="border-b px-2" style={{ borderColor: "#000000" }}>{dateString}</span></div>
                    </div>

                    <div>
                      <p className="mb-2">ผู้รับของ/บริการ</p>
                      <div className="h-16 flex items-end justify-center mb-1">
                        <img src={getSignatureUrl(receiverName, "signature_payer")} crossOrigin="anonymous" className="max-h-16 object-contain" alt="Receiver Signature" />
                      </div>
                      <p className="border-b inline-block px-4 pb-1 mb-2 whitespace-nowrap min-w-[150px]" style={{ borderColor: "#000000" }}>
                        {receiverName ? `( ${receiverName} )` : "\u00A0"}
                      </p>
                      <div>วันที่ <span className="border-b px-2" style={{ borderColor: "#000000" }}>{dateString}</span></div>
                    </div>

                    <div>
                      <p className="mb-2">ผู้อนุมัติ</p>
                      <div className="h-16 flex items-end justify-center mb-1">
                        <img src={getSignatureUrl(approverName, "signature_approver")} crossOrigin="anonymous" className="max-h-16 object-contain" alt="Approver Signature" />
                      </div>
                      <p className="border-b inline-block px-4 pb-1 mb-2 whitespace-nowrap min-w-[150px]" style={{ borderColor: "#000000" }}>
                        {approverName ? `( ${approverName} )` : "\u00A0"}
                      </p>
                      <div>วันที่ <span className="border-b px-2" style={{ borderColor: "#000000" }}>{dateString}</span></div>
                    </div>
                  </div>

                  <div className="mt-12 text-sm font-bold">
                    <span className="underline mr-4">หมายเหตุ</span>
                    <div className="inline-block align-top">
                      <p>- แนบสำเนาบัตรประจำตัวประชาชนผู้รับเงิน (ซึ่งเป็นผู้ประกอบอาชีพขายสินค้า/ให้บริการ)</p>
                      <p>- แนบหลักฐานประกอบการจ่ายเงิน (กรณีไม่ได้จ่ายเงินสด)</p>
                    </div>
                  </div>
              </div>
           </div>

           {/* Hidden Cash Bill Capture Section */}
           {isCashBillMode && (
             <div className="border border-slate-300 rounded-lg overflow-x-auto bg-slate-200 p-4 mt-6">
               <h3 className="text-center font-bold mb-4">พรีวิวบิลเงินสด</h3>
               <CashBillGenerator
                 shopName={shopName}
                 shopAddress={shopAddress}
                 shopTaxId={shopTaxId}
                 companyName={companyName}
                 companyAddress={companyAddress}
                 companyTaxId={companyTaxId}
                 dateString={dateString}
                 items={items}
                 totalAmount={totalAmount}
               />
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
                onClick={() => router.push("/outcome/shop-without-receipt")} 
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
