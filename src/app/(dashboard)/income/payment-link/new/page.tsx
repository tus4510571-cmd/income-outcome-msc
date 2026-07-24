"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReceiptGenerator from "@/components/ReceiptGenerator";
import { CURRENCY_OPTIONS, type ReceiptItem } from "@/lib/types";
import { createTransaction, addReceiptItems, getSetting, saveGoogleDriveFileLink, getNextDailySequence } from "@/lib/actions";
import { uploadToGoogleDrive } from "@/lib/drive";
import PreImageUpload, { PreUploadFile } from "@/components/PreImageUpload";
import { convertImageToPdfBase64 } from "@/lib/pdfUtils";

export default function NewPaymentLinkPage() {
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailySeq, setDailySeq] = useState("001");
  
  useEffect(() => {
    async function loadSeq() {
      const d = await getNextDailySequence(date);
      setDailySeq(d);
    }
    loadSeq();
  }, [date]);
  const [paymentGateway, setPaymentGateway] = useState("");
  const [customGateway, setCustomGateway] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [depositInfo, setDepositInfo] = useState("");
  
  const [uploadFiles, setUploadFiles] = useState<PreUploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "complete" | "error">("idle");
  const [uploadError, setUploadError] = useState("");

  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const GATEWAYS = ["Lian Lian Pay", "Ksher Payment (Tus)", "Stripe (Tus)", "K Shop (May)", "Other"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || items.every((i) => !i.product_name)) {
      setError("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }
    
    setSaving(true);
    setError("");

    const finalGateway = paymentGateway === "Other" ? customGateway : paymentGateway;

    try {
      const dateObj = new Date(date);
      const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth() + 1).padStart(2, '0')}${dateObj.getFullYear()}`;

      const safeCustomerName = customerName ? customerName.replace(/[^a-zA-Z0-9ก-๙\s-]/g, "").trim().replace(/\s+/g, "_") : "ไม่ระบุ";
      const customFileName = `${dateStr}${dailySeq}-IN-ต่างประเทศ-${safeCustomerName}`;

      // 1. Upload files to Google Drive (if any)
      const uploadedLinks: { link: string, name: string }[] = [];
      if (uploadFiles.length > 0) {
        setUploadStatus("uploading");
        setUploadProgress(10);
        
        const folderId = await getSetting("income_drive_folder_id");
        if (!folderId) {
          throw new Error("ยังไม่ได้ตั้งค่า Google Drive Folder ID ในหน้า Setting");
        }

        setUploadProgress(30);

        for (let i = 0; i < uploadFiles.length; i++) {
          const fileObj = uploadFiles[i];
          const reader = new FileReader();
          
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(fileObj.file);
          });

          // Convert to PDF
          const pdfBase64 = await convertImageToPdfBase64(base64, fileObj.file.type);
          const finalName = uploadFiles.length > 1 ? `${customFileName}-${i+1}` : customFileName;

          const res = await uploadToGoogleDrive(pdfBase64, folderId, finalName, date, "ลูกค้าต่างประเทศ");
          if (res.link) {
            uploadedLinks.push({ link: res.link, name: finalName });
          }
          setUploadProgress(30 + Math.floor(((i + 1) / uploadFiles.length) * 60));
        }

        setUploadProgress(100);
        setUploadStatus("complete");
        setTimeout(() => {
          setUploadFiles([]);
        }, 2000);
      }

      // 2. Create Transaction
      const transaction = await createTransaction({
        type: "income",
        category: "payment_link",
        description,
        amount: parseFloat(amount) || 0,
        currency,
        transaction_date: date,
        source: "payment_link",
        customer_name: customerName || undefined,
        payment_gateway: finalGateway || undefined,
        invoice_ref: invoiceRef || undefined,
        deposit_info: depositInfo || undefined,
      });

      // 3. Add Receipt Items
      await addReceiptItems(
        transaction.id,
        items.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency,
        }))
      );

      // 4. Save Google Drive Links to DB
      for (const item of uploadedLinks) {
        await saveGoogleDriveFileLink(transaction.id, "transfer_slip", item.link, item.name);
      }

      router.push("/income/payment-link");
    } catch (err) {
      setError((err as Error).message);
      setUploadStatus("error");
      setUploadError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">สร้างรายการใหม่</h1>
          <p className="text-slate-500 mt-1">ลูกค้าจาก Payment Link ต่างประเทศ</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">1. ข้อมูลทั่วไป</h2>
            <div>
              <label className="label">ชื่อลูกค้า</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-field"
                placeholder="กรอกชื่อลูกค้า"
                required
              />
            </div>
            <div>
              <label className="label">รายละเอียด</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                placeholder="กรอกรายละเอียด"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Payment Gateway</label>
                <select
                  value={paymentGateway}
                  onChange={(e) => setPaymentGateway(e.target.value)}
                  className="input-field"
                >
                  <option value="">เลือก Payment Gateway</option>
                  {GATEWAYS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              {paymentGateway === "Other" && (
                <div>
                  <label className="label">ระบุ Payment Gateway</label>
                  <input
                    type="text"
                    value={customGateway}
                    onChange={(e) => setCustomGateway(e.target.value)}
                    className="input-field"
                    placeholder="พิมพ์ชื่อ Gateway"
                    required
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">เลขที่ใบ Invoice หรือ Quotation</label>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  className="input-field"
                  placeholder="กรอกเลขที่เอกสารอ้างอิง"
                />
              </div>
              <div>
                <label className="label">มัดจำ งวดที่ / เปอร์เซ็นต์ (%)</label>
                <input
                  type="text"
                  value={depositInfo}
                  onChange={(e) => setDepositInfo(e.target.value)}
                  className="input-field"
                  placeholder="เช่น งวดที่ 1 (50%)"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">จำนวนเงิน</label>
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
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
             <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">2. รายการสินค้า</h2>
             <ReceiptGenerator onChange={setItems} />
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
             <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">3. อัปโหลดหลักฐาน (ไฟล์จะถูกแปลงเป็น PDF อัตโนมัติ)</h2>
            <PreImageUpload
              files={uploadFiles}
              onChange={setUploadFiles}
              uploadProgress={uploadProgress}
              uploadStatus={uploadStatus}
              uploadError={uploadError}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 flex gap-3">
             <button
               type="button"
               onClick={() => router.push("/income/payment-link")} 
               className="btn-outline flex-1"
             >
               ยกเลิก
             </button>
             <button
               type="submit"
               disabled={saving || uploadStatus === "uploading"}
               className="btn-primary flex-1"
             >
               {saving || uploadStatus === "uploading" ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
             </button>
          </div>
        </form>
      </div>
    </main>
  );
}
