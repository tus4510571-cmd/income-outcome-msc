"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReceiptGenerator from "@/components/ReceiptGenerator";
import { type ReceiptItem, formatCurrency } from "@/lib/types";
import { createTransaction, addReceiptItems, uploadFile, getSetting, setSetting, getNextDailySequence, getNextMonthlySequence, saveGoogleDriveFileLink } from "@/lib/actions";
import { uploadToGoogleDrive } from "@/lib/drive";
import { convertImageToPdfBase64 } from "@/lib/pdfUtils";
import { thaiBahtText } from "@/lib/thaiBaht";
import html2canvas from "html2canvas";

export default function NewShopWithoutReceiptPage() {
  // Step 1: AI Data
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  
  // Step 2: Files & Options
  const [paidWithCash, setPaidWithCash] = useState(false);
  
  const [businessCardPreview, setBusinessCardPreview] = useState<string | null>(null);
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

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
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);
    setScanError("");
    
    setBusinessCardFile(file);
    const reader = new FileReader();
    reader.onload = () => setBusinessCardPreview(reader.result as string);
    reader.readAsDataURL(file);
    
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      
      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสแกนใบเสร็จ");
      }
      
      if (data.shopName && data.shopName !== "ไม่ระบุชื่อร้าน") setShopName(data.shopName);
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
    setUploadProgress(5);
    setUploadError("");

    try {
      const folderId = await getSetting("outcome_drive_folder_id");
      if (!folderId) {
        throw new Error("ยังไม่ได้ตั้งค่า Google Drive สำหรับ Outcome ในหน้า Setting");
      }
      setUploadProgress(10);

      const transaction = await createTransaction({
        type: "outcome",
        category: "shop_without_receipt",
        description,
        amount: parseFloat(amount) || 0,
        currency: "THB",
        transaction_date: date,
        shop_name: shopName,
      });
      setTransactionId(transaction.id);
      setUploadProgress(20);

      const receiptElement = document.getElementById("receipt-capture");
      if (!receiptElement) throw new Error("Receipt template not found");
      
      await new Promise(r => setTimeout(r, 500)); 
      
      const canvas = await html2canvas(receiptElement, { scale: 2, useCORS: true, allowTaint: true });
      const receiptBase64 = canvas.toDataURL("image/jpeg");
      setUploadProgress(40);

      const dateObj = new Date(date);
      const yyyy = dateObj.getFullYear();
      const yy = String(yyyy).slice(2);
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      
      const filePrefix = `${dd}${mm}${yyyy}${dailySeq}`;
      const safeShopName = shopName ? shopName.replace(/[^a-zA-Z0-9ก-๙\s-]/g, "").trim().replace(/\s+/g, "_") : "ไม่ระบุ";
      const baseFileName = `${filePrefix}-OUT-ไม่มีบิล-${safeShopName}`;

      if (businessCardPreview) {
        const pdfBase64 = await convertImageToPdfBase64(businessCardPreview, businessCardFile?.type || "image/jpeg");
        const res = await uploadToGoogleDrive(pdfBase64, folderId, baseFileName, date, "ร้านค้าไม่มีใบเสร็จ");
        if (!res.success) throw new Error(res.error || "Failed to upload business card to Drive");
        if (res.link) await saveGoogleDriveFileLink(transaction.id, "business_card", res.link, baseFileName);
      }
      setUploadProgress(60);

      if (slipPreview && !paidWithCash) {
        const pdfBase64 = await convertImageToPdfBase64(slipPreview, slipFile?.type || "image/jpeg");
        const slipFileName = `${baseFileName}-slip`;
        const res = await uploadToGoogleDrive(pdfBase64, folderId, slipFileName, date, "ร้านค้าไม่มีใบเสร็จ");
        if (!res.success) throw new Error(res.error || "Failed to upload slip to Drive");
        if (res.link) await saveGoogleDriveFileLink(transaction.id, "transfer_slip", res.link, slipFileName);
      }
      setUploadProgress(75);

      const pdfReceiptBase64 = await convertImageToPdfBase64(receiptBase64, "image/jpeg");
      const receiptFileName = `${baseFileName}-ใบรับรองแทนใบเสร็จรับเงิน`;
      const res = await uploadToGoogleDrive(pdfReceiptBase64, folderId, receiptFileName, date, "ร้านค้าไม่มีใบเสร็จ");
      if (!res.success) throw new Error(res.error || "Failed to upload generated receipt to Drive");
      if (res.link) await saveGoogleDriveFileLink(transaction.id, "receipt", res.link, receiptFileName);
      setUploadProgress(85);

      if (businessCardFile && businessCardPreview) {
        await uploadFile(transaction.id, "business_card", date, "outcome", businessCardFile.name, businessCardPreview);
      }
      if (slipFile && slipPreview && !paidWithCash) {
        await uploadFile(transaction.id, "transfer_slip", date, "outcome", slipFile.name, slipPreview);
      }
      await uploadFile(transaction.id, "receipt", date, "outcome", "generated_receipt.jpg", receiptBase64);
      setUploadProgress(90);

      await addReceiptItems(
        transaction.id,
        items.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: item.currency || "THB",
        }))
      );

      setUploadProgress(100);
      setUploadStatus("complete");
      
      setTimeout(() => {
        router.push("/outcome/shop-without-receipt");
      }, 1500);

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
    <main className="min-h-screen p-4 md:p-8 pb-24">
      {uploadStatus !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-center text-slate-800 dark:text-white">
              กำลังบันทึกและอัปโหลด...
            </h3>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className={uploadStatus === "error" ? "text-red-500" : uploadStatus === "complete" ? "text-emerald-500" : "text-indigo-500"}>
                {uploadStatus === "uploading" && "Uploading files..."}
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
              <input 
                type="file" 
                accept="image/*" 
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
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  placeholder="เช่น ค่าจัดส่งพัสดุ"
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
                  accept="image/*"
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
               <div className="md:col-span-3 mb-2 border-b pb-2">
                 <h3 className="font-bold text-slate-700">ข้อมูลผู้ลงนาม (ลายเซ็นต์)</h3>
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
                <div id="receipt-capture" className="p-10 font-sans w-[800px] border shadow-sm mx-auto my-0" style={{ minHeight: "1100px", backgroundColor: "#ffffff", color: "#000000", borderColor: "#e5e7eb" }}>
                  <div className="text-sm font-bold leading-relaxed mb-6">
                    <p>บริษัท โฮมออฟคราฟ จำกัด (สำนักงานใหญ่)</p>
                    <p>เลขที่ 35 ถ.นิพัทธ์สงเคราะห์ 4 ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110</p>
                    <p>เลขประจำตัวผู้เสียภาษี 0905560005314</p>
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
                      <span className="font-bold mr-4">โดยได้จ่ายไปในงานของทาง บริษัท โฮมออฟคราฟ จำกัด โดยแท้จริง</span>
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
                      {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, i) => (
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
                        <img src="/api/drive-image?id=signature_payer" crossOrigin="anonymous" className="max-h-16 object-contain" alt="Payer Signature" />
                      </div>
                      <p className="border-b inline-block px-4 pb-1 mb-2 whitespace-nowrap min-w-[150px]" style={{ borderColor: "#000000" }}>
                        {payerName ? `( ${payerName} )` : "\u00A0"}
                      </p>
                      <div>วันที่ <span className="border-b px-2" style={{ borderColor: "#000000" }}>{dateString}</span></div>
                    </div>

                    <div>
                      <p className="mb-2">ผู้รับของ/บริการ</p>
                      <div className="h-16 flex items-end justify-center mb-1">
                        <img src="/api/drive-image?id=signature_payer" crossOrigin="anonymous" className="max-h-16 object-contain" alt="Receiver Signature" />
                      </div>
                      <p className="border-b inline-block px-4 pb-1 mb-2 whitespace-nowrap min-w-[150px]" style={{ borderColor: "#000000" }}>
                        {receiverName ? `( ${receiverName} )` : "\u00A0"}
                      </p>
                      <div>วันที่ <span className="border-b px-2" style={{ borderColor: "#000000" }}>{dateString}</span></div>
                    </div>

                    <div>
                      <p className="mb-2">ผู้อนุมัติ</p>
                      <div className="h-16 flex items-end justify-center mb-1">
                        <img src="/api/drive-image?id=signature_approver" crossOrigin="anonymous" className="max-h-16 object-contain" alt="Approver Signature" />
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
