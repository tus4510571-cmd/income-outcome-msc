"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateTransaction, updateReceiptItems, getTransactionById } from "@/lib/actions";
import { CURRENCY_OPTIONS, type ReceiptItem } from "@/lib/types";
import ReceiptGenerator from "@/components/ReceiptGenerator";
import ReceiptCaptureTemplate from "@/components/ReceiptCaptureTemplate";
import { toJpeg } from "html-to-image";
import { convertImageToPdfBase64, mergePdfBase64 } from "@/lib/pdfUtils";
import { overwriteInGoogleDrive, downloadFromGoogleDrive } from "@/lib/drive";
import { getSetting } from "@/lib/actions";

export default function EditTransactionPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [transactionType, setTransactionType] = useState<"income" | "outcome" | null>(null);
  const [category, setCategory] = useState("");
  
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  
  // Specific fields
  const [shopName, setShopName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [source, setSource] = useState("");
  const [paymentGateway, setPaymentGateway] = useState("");
  const [customGateway, setCustomGateway] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [depositInfo, setDepositInfo] = useState("");

  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [hasReceiptItems, setHasReceiptItems] = useState(false);

  // Shop without receipt fields
  const [receiptNumber, setReceiptNumber] = useState("");
  const [originalReceiptNumber, setOriginalReceiptNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [approverName, setApproverName] = useState("");
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [fileUrls, setFileUrls] = useState<{ type: string; url: string; fileId: string; name: string }[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const tx = await getTransactionById(id);

      if (!tx || tx.user_id !== session.user.id) {
        setError("ไม่พบข้อมูลรายการ");
        setLoading(false);
        return;
      }

      setTransactionType(tx.type);
      setCategory(tx.category);
      setAmount(tx.amount.toString());
      setCurrency(tx.currency);
      setDate(tx.transaction_date);
      setDescription(tx.description || "");

      if (tx.type === "outcome") {
        console.log("Outcome tx:", tx);
        const edArray = Array.isArray(tx.expense_detail) ? tx.expense_detail : (tx.expense_detail ? [tx.expense_detail] : []);
        let sName = edArray[0]?.shop_name;
        let eName = edArray[0]?.employee_name;
        
        // Fetch from client-side if server-action returned empty due to RLS
        if (edArray.length === 0) {
          const { data: ed, error } = await supabase.from("expense_details").select("*").eq("transaction_id", id).single();
          console.log("Client ed:", ed, "error:", error);
          if (ed) {
            sName = ed.shop_name;
            eName = ed.employee_name;
            setReceiptNumber(ed.receipt_number || "");
            setOriginalReceiptNumber(ed.receipt_number || "");
          }
        } else {
          setReceiptNumber(edArray[0]?.receipt_number || "");
          setOriginalReceiptNumber(edArray[0]?.receipt_number || "");
        }
        
        setShopName(sName || "");
        setEmployeeName(eName || "");

        if (tx.category === "shop_without_receipt") {
          const cName = await getSetting("company_name");
          if (cName) setCompanyName(cName);
          const cAddress = await getSetting("company_address");
          if (cAddress) setCompanyAddress(cAddress);
          const cTaxId = await getSetting("company_tax_id");
          if (cTaxId) setCompanyTaxId(cTaxId);
          
          const sNames = await getSetting("saved_signatures");
          if (sNames) {
            setSavedNames(sNames.split(",").map((n: string) => n.trim()));
          }

          if (tx.files) {
            setFileUrls((tx.files as any[]).map((f: any) => {
              const match = f.file_path.match(/[-\w]{25,}/);
              return {
                type: f.file_type,
                url: f.file_path,
                fileId: match ? match[0] : "",
                name: f.file_name
              };
            }));
          }
        }
      } else {
        const idtArray = Array.isArray(tx.income_detail) ? tx.income_detail : (tx.income_detail ? [tx.income_detail] : []);
        let cName = idtArray[0]?.customer_name;
        let src = idtArray[0]?.source;
        let pg = idtArray[0]?.payment_gateway;
        let inv = idtArray[0]?.invoice_ref;
        let dep = idtArray[0]?.deposit_info;
        
        if (idtArray.length === 0) {
          const { data: idt } = await supabase.from("income_details").select("*").eq("transaction_id", id).single();
          if (idt) {
            cName = idt.customer_name;
            src = idt.source;
            pg = idt.payment_gateway;
            inv = idt.invoice_ref;
            dep = idt.deposit_info;
          }
        }
        
        setCustomerName(cName || "");
        setSource(src || tx.category);
        
        const GATEWAYS = ["Lian Lian Pay", "Ksher Payment (Tus)", "Stripe (Tus)", "K Shop (May)"];
        if (pg && !GATEWAYS.includes(pg)) {
          setPaymentGateway("Other");
          setCustomGateway(pg);
        } else {
          setPaymentGateway(pg || "");
        }
        setInvoiceRef(inv || "");
        setDepositInfo(dep || "");
      }

      if (tx.receipt_items && tx.receipt_items.length > 0) {
        setItems(tx.receipt_items);
        setHasReceiptItems(true);
      } else if (tx.category === "shop_without_receipt" || tx.type === "income") {
        // Some types might have an empty list but the UI should show the generator
        setHasReceiptItems(true);
      }

      setLoading(false);
    }

    loadData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const finalGateway = paymentGateway === "Other" ? customGateway : paymentGateway;
      
      await updateTransaction(id, {
        amount: parseFloat(amount) || 0,
        currency,
        transaction_date: date,
        description,
        shop_name: shopName,
        employee_name: employeeName,
        customer_name: customerName,
        source: source,
        payment_gateway: finalGateway || undefined,
        invoice_ref: invoiceRef || undefined,
        deposit_info: depositInfo || undefined,
        receipt_number: receiptNumber || undefined,
      });

      if (category === "shop_without_receipt" && receiptNumber !== originalReceiptNumber) {
        // We need to regenerate the PDF and overwrite
        const receiptElement = document.getElementById("receipt-capture-edit");
        if (receiptElement) {
          // ensure element is visible before capture
          receiptElement.style.display = "block";
          await new Promise(r => setTimeout(r, 500)); 
          const receiptBase64 = await toJpeg(receiptElement, { quality: 0.95, pixelRatio: 2 });
          receiptElement.style.display = "none";
          
          const pdfReceiptBase64 = await convertImageToPdfBase64(receiptBase64, "image/jpeg");
          
          // Find old receipt file ID
          const oldReceiptFile = fileUrls.find(f => f.type === "receipt");
          const oldSumFile = fileUrls.find(f => f.type === "sum");
          
          // Get root folder id from settings
          const rootFolderId = await getSetting("google_drive_folder_id");

          let newReceiptFileId = oldReceiptFile?.fileId;
          let newSumFileId = oldSumFile?.fileId;
          
          if (rootFolderId && oldReceiptFile && oldSumFile) {
            // Overwrite receipt
            const ext = oldReceiptFile.name.includes(".pdf") ? "" : ".pdf";
            const receiptRes = await overwriteInGoogleDrive(pdfReceiptBase64, oldReceiptFile.fileId, rootFolderId, oldReceiptFile.name.replace(".pdf", ""), date, "ร้านค้าไม่มีใบเสร็จ");
            if (receiptRes.success) {
              newReceiptFileId = receiptRes.fileId;
              
              // Now we need to re-merge
              // Download other files
              const base64PdfsToMerge: string[] = [];
              base64PdfsToMerge.push(pdfReceiptBase64);
              
              for (const f of fileUrls) {
                if (f.type !== "receipt" && f.type !== "sum" && f.fileId) {
                  try {
                    const b64 = await downloadFromGoogleDrive(f.fileId);
                    if (b64) base64PdfsToMerge.push(b64);
                  } catch(e) {
                    console.error("Failed to download", f.name);
                  }
                }
              }
              
              const mergedPdfBase64 = await mergePdfBase64(base64PdfsToMerge);
              const sumRes = await overwriteInGoogleDrive(mergedPdfBase64, oldSumFile.fileId, rootFolderId, oldSumFile.name.replace(".pdf", ""), date, "ร้านค้าไม่มีใบเสร็จ");
              
              if (sumRes.success) {
                newSumFileId = sumRes.fileId;
                
                // Update DB with new file IDs for receipt and sum
                const supabase = createClient();
                if (receiptRes.link !== oldReceiptFile.url) {
                  await supabase.from("transaction_files").update({ file_path: receiptRes.link }).eq("transaction_id", id).eq("file_type", "receipt");
                }
                if (sumRes.link !== oldSumFile.url) {
                  await supabase.from("transaction_files").update({ file_path: sumRes.link }).eq("transaction_id", id).eq("file_type", "sum");
                }
              }
            }
          }
        }
      }

      if (hasReceiptItems) {
        await updateReceiptItems(
          id,
          items.map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            currency: item.currency || currency,
          }))
        );
      }

      // Determine back URL
      let backUrl = `/${transactionType}/${category.replace(/_/g, "-")}/${id}`;
      router.push(backUrl);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex justify-center items-center">
        <p className="text-slate-500">กำลังโหลด...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-indigo-600 mb-2 inline-block">
            ← กลับ
          </button>
          <h1 className="text-2xl font-bold text-slate-800">แก้ไขรายการ</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {/* Specific Fields depending on type */}
          {transactionType === "outcome" && (category === "shop_with_receipt" || category === "shop_without_receipt") && (
            <>
              <div>
                <label className="label">ชื่อร้านค้า</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              
              {category === "shop_without_receipt" && (
                <div>
                  <label className="label">เลขที่ใบรับรองแทนใบเสร็จรับเงิน</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="input-field"
                    placeholder="เลขที่เอกสาร PV..."
                  />
                  {receiptNumber !== originalReceiptNumber && (
                    <p className="text-xs text-amber-600 mt-1">
                      * ระบบจะทำการสร้างเอกสาร PDF และ Merge ไฟล์ใหม่ไปทับของเดิมเมื่อกดบันทึก
                    </p>
                  )}
                </div>
              )}

              {category === "shop_without_receipt" && receiptNumber !== originalReceiptNumber && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-4 rounded-lg bg-amber-50 border-amber-200">
                  <div className="sm:col-span-3">
                    <p className="text-sm font-bold text-amber-800">กรุณาเลือกชื่อผู้เซ็นเอกสารเพื่อสร้าง PDF ใหม่:</p>
                  </div>
                  <div>
                    <label className="label">ผู้จ่ายเงิน</label>
                    <select className="input-field" value={payerName} onChange={(e) => setPayerName(e.target.value)} required>
                      <option value="">-- ไม่ระบุชื่อ --</option>
                      {savedNames.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">ผู้รับเงิน</label>
                    <select className="input-field" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} required>
                      <option value="">-- ไม่ระบุชื่อ --</option>
                      {savedNames.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">ผู้อนุมัติ</label>
                    <select className="input-field" value={approverName} onChange={(e) => setApproverName(e.target.value)} required>
                      <option value="">-- ไม่ระบุชื่อ --</option>
                      {savedNames.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {transactionType === "outcome" && category === "employee_labor" && (
            <div>
              <label className="label">ชื่อพนักงาน</label>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="input-field"
                required
              />
            </div>
          )}

          {transactionType === "income" && (
            <div>
              <label className="label">ชื่อลูกค้า</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-field"
                placeholder="ไม่ระบุ"
              />
            </div>
          )}

          {transactionType === "income" && category === "payment_link" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Payment Gateway</label>
                  <select
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="input-field"
                  >
                    <option value="">เลือก Payment Gateway</option>
                    {["Lian Lian Pay", "Ksher Payment (Tus)", "Stripe (Tus)", "K Shop (May)", "Other"].map((g) => (
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
            </>
          )}

          <div>
            <label className="label">รายละเอียด</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">จำนวนเงิน</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                step="0.01"
                required
                disabled={hasReceiptItems} // If has receipt items, amount is calculated from items
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

          {hasReceiptItems && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">รายการสินค้า/บริการ</h3>
              <ReceiptGenerator onChange={setItems} initialItems={items} />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full mt-6">
            {saving ? "กำลังบันทึกและจัดการไฟล์..." : "บันทึกการแก้ไข"}
          </button>
        </form>
        
        {/* Hidden template for regeneration */}
        {transactionType === "outcome" && category === "shop_without_receipt" && receiptNumber !== originalReceiptNumber && (
          <div style={{ display: 'none', position: 'absolute', top: '-9999px', left: '-9999px' }} id="receipt-capture-edit">
             <ReceiptCaptureTemplate
               companyName={companyName}
               companyAddress={companyAddress}
               companyTaxId={companyTaxId}
               invoiceNumber={receiptNumber}
               dateString={new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
               employeeName={employeeName}
               employeePosition={"พนักงาน"}
               totalAmount={parseFloat(amount) || 0}
               shopName={shopName}
               items={items}
               payerName={payerName}
               receiverName={receiverName}
               approverName={approverName}
               getSignatureUrl={(name, fallbackId) => `/api/drive-image?id=${fallbackId}`}
             />
          </div>
        )}

      </div>
    </main>
  );
}
