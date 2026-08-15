"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency, type TransactionWithDetails } from "@/lib/types";
import { recordCustomerRefund, getNextRNNumber, getNextPVNumber } from "@/lib/actions";

interface CustomerRefundModalProps {
  transaction: TransactionWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CustomerRefundModal({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}: CustomerRefundModalProps) {
  const [refundAmount, setRefundAmount] = useState<string>(
    transaction.income_detail?.refund_amount?.toString() || transaction.amount.toString()
  );
  const [refundDate, setRefundDate] = useState<string>(
    transaction.income_detail?.refund_date || new Date().toISOString().split("T")[0]
  );
  const [refundReason, setRefundReason] = useState<string>(
    transaction.income_detail?.refund_reason || ""
  );
  const [customerAccountInfo, setCustomerAccountInfo] = useState<string>(
    transaction.income_detail?.customer_account_info || ""
  );
  const [noChatReason, setNoChatReason] = useState<string>(
    transaction.income_detail?.refund_no_chat_reason || ""
  );

  const [returnNoteNumber, setReturnNoteNumber] = useState<string>(
    transaction.income_detail?.return_note_number || ""
  );
  const [paymentVoucherNumber, setPaymentVoucherNumber] = useState<string>(
    transaction.income_detail?.payment_voucher_number || ""
  );

  // File states
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(
    transaction.income_detail?.refund_slip_path || null
  );

  const [chatFile, setChatFile] = useState<File | null>(null);
  const [chatPreview, setChatPreview] = useState<string | null>(
    transaction.income_detail?.refund_chat_proof_path || null
  );

  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(
    transaction.income_detail?.refund_product_photo_path || null
  );

  // Refs for File / Camera inputs
  const slipFileRef = useRef<HTMLInputElement>(null);
  const slipCameraRef = useRef<HTMLInputElement>(null);

  const chatFileRef = useRef<HTMLInputElement>(null);
  const chatCameraRef = useRef<HTMLInputElement>(null);

  const productFileRef = useRef<HTMLInputElement>(null);
  const productCameraRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load next RN and PV numbers when date changes
  useEffect(() => {
    async function loadSeq() {
      if (!transaction.income_detail?.return_note_number) {
        const rn = await getNextRNNumber(refundDate);
        setReturnNoteNumber(rn);
      }
      if (!transaction.income_detail?.payment_voucher_number) {
        const pv = await getNextPVNumber(refundDate);
        setPaymentVoucherNumber(pv);
      }
    }
    if (isOpen) {
      loadSeq();
    }
  }, [refundDate, isOpen, transaction.income_detail]);

  if (!isOpen) return null;

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const parsedAmount = parseFloat(refundAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("กรุณาระบุจำนวนเงินที่คืนให้ถูกต้อง (มากกว่า 0)");
      return;
    }
    if (parsedAmount > transaction.amount) {
      setErrorMsg(`จำนวนเงินคืนต้องไม่เกินยอดรับเดิม (฿${transaction.amount.toLocaleString()})`);
      return;
    }
    if (!refundReason.trim()) {
      setErrorMsg("กรุณาระบุเหตุผลการรับคืนสินค้า / คืนเงิน");
      return;
    }
    if (!slipPreview && !slipFile) {
      setErrorMsg("กรุณาแนบสลิปการโอนเงินคืนลูกค้า (ออกจากบัญชีบริษัท)");
      return;
    }
    if (!chatPreview && !chatFile && !noChatReason.trim()) {
      setErrorMsg("กรุณาแนบหลักฐานแชทตกลงขอคืนเงิน หรือระบุเหตุผลหากไม่มีแชท");
      return;
    }

    try {
      setIsSubmitting(true);

      let refundSlipBase64: string | undefined;
      if (slipFile) refundSlipBase64 = await fileToBase64(slipFile);

      let refundChatProofBase64: string | undefined;
      if (chatFile) refundChatProofBase64 = await fileToBase64(chatFile);

      let refundProductPhotoBase64: string | undefined;
      if (productFile) refundProductPhotoBase64 = await fileToBase64(productFile);

      await recordCustomerRefund({
        transactionId: transaction.id,
        refundAmount: parsedAmount,
        refundDate,
        refundReason: refundReason.trim(),
        customerAccountInfo: customerAccountInfo.trim() || undefined,
        returnNoteNumber,
        paymentVoucherNumber,
        refundSlipBase64,
        refundSlipName: slipFile?.name,
        refundChatProofBase64,
        refundChatProofName: chatFile?.name,
        refundNoChatReason: noChatReason.trim() || undefined,
        refundProductPhotoBase64,
        refundProductPhotoName: productFile?.name,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm">
              🔄
            </div>
            <div>
              <h2 className="text-lg font-bold">บันทึกรับคืนสินค้า / คืนเงินลูกค้า (Non-VAT)</h2>
              <p className="text-xs text-amber-100 mt-0.5">
                อ้างอิงรายการ: {transaction.income_detail?.customer_name || transaction.description || "ลูกค้า"} | ยอดเดิม: ฿{transaction.amount.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Document Reference Codes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
            <div>
              <label className="text-xs font-bold text-amber-900 block mb-1">
                เลขที่เอกสารรับคืนสินค้า (Return Note)
              </label>
              <input
                type="text"
                value={returnNoteNumber}
                onChange={(e) => setReturnNoteNumber(e.target.value)}
                className="w-full bg-white px-3 py-2 border border-amber-200 rounded-xl text-sm font-mono font-bold text-slate-800"
                placeholder="RN69080001"
              />
              <p className="text-[11px] text-amber-700 mt-1">รหัสสำหรับออกเอกสารส่งให้ลูกค้า</p>
            </div>
            <div>
              <label className="text-xs font-bold text-amber-900 block mb-1">
                เลขที่ใบสำคัญจ่าย (Payment Voucher)
              </label>
              <input
                type="text"
                value={paymentVoucherNumber}
                onChange={(e) => setPaymentVoucherNumber(e.target.value)}
                className="w-full bg-white px-3 py-2 border border-amber-200 rounded-xl text-sm font-mono font-bold text-slate-800"
                placeholder="PV69080001"
              />
              <p className="text-[11px] text-amber-700 mt-1">รหัสสำหรับฝ่ายบัญชีภายในบริษัท</p>
            </div>
          </div>

          {/* Refund Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                จำนวนเงินที่คืนลูกค้า (บาท) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  max={transaction.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all"
                  required
                />
                <span className="absolute left-3 top-3.5 text-slate-400 font-bold">฿</span>
              </div>
              <div className="flex justify-between items-center mt-1.5 px-1">
                <span className="text-xs text-slate-400">
                  ยอดเต็ม: ฿{transaction.amount.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => setRefundAmount(transaction.amount.toString())}
                  className="text-xs text-amber-600 font-bold hover:underline"
                >
                  คืนเต็มจำนวน 100%
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                วันที่โอนเงินคืน <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:bg-white focus:border-amber-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Customer Account / PromptPay details */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              ข้อมูลบัญชี / พร้อมเพย์ของลูกค้าที่รับเงินโอนคืน
            </label>
            <input
              type="text"
              value={customerAccountInfo}
              onChange={(e) => setCustomerAccountInfo(e.target.value)}
              placeholder="เช่น ธ.กสิกรไทย 123-4-56789-0 นาย สมชาย หรือ พร้อมเพย์ 081-xxx-xxxx"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all"
            />
          </div>

          {/* Refund Reason */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              สาเหตุการขอคืนเงิน / รับคืนสินค้า <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="เช่น สินค้าชำรุดเสียหายระหว่างขนส่ง, ลูกค้าขอยกเลิกคำสั่งซื้อบางรายการ, สินค้าไม่ตรงสเปก"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all"
              required
            />
          </div>

          {/* Section: Attachments */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>📎</span> แนบหลักฐานประกอบ (สำหรับรายงานภาษีและบัญชี)
            </h3>

            {/* 1. Slip โอนเงินคืนลูกค้า (บังคับ) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700">
                  1. สลิปการโอนเงินคืนลูกค้า (ออกจากบัญชีบริษัท) <span className="text-rose-500">*</span>
                </span>
                {slipPreview && <span className="text-xs text-emerald-600 font-bold">✓ แนบแล้ว</span>}
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => slipCameraRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>📷</span> ถ่ายรูป
                </button>
                <button
                  type="button"
                  onClick={() => slipFileRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>📁</span> เลือกไฟล์
                </button>
              </div>

              <input
                type="file"
                ref={slipCameraRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(e, setSlipFile, setSlipPreview)}
              />
              <input
                type="file"
                ref={slipFileRef}
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e, setSlipFile, setSlipPreview)}
              />

              {slipPreview && (
                <div className="mt-2 relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img src={slipPreview} alt="Slip" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSlipFile(null); setSlipPreview(null); }}
                    className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* 2. หลักฐานแชทตกลงขอคืนเงิน (บังคับ หรือระบุเหตุผล) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700">
                  2. ภาพหลักฐานแชท / ข้อตกลงขอคืนเงิน <span className="text-rose-500">*</span>
                </span>
                {chatPreview && <span className="text-xs text-emerald-600 font-bold">✓ แนบแล้ว</span>}
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => chatCameraRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>📷</span> ถ่ายรูปแชท
                </button>
                <button
                  type="button"
                  onClick={() => chatFileRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>📁</span> เลือกรูปแชท
                </button>
              </div>

              <input
                type="file"
                ref={chatCameraRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(e, setChatFile, setChatPreview)}
              />
              <input
                type="file"
                ref={chatFileRef}
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e, setChatFile, setChatPreview)}
              />

              {chatPreview ? (
                <div className="mt-2 relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img src={chatPreview} alt="Chat Proof" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setChatFile(null); setChatPreview(null); }}
                    className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <input
                    type="text"
                    value={noChatReason}
                    onChange={(e) => setNoChatReason(e.target.value)}
                    placeholder="กรณีไม่มีแชท: ระบุเหตุผล เช่น ติดต่อทางโทรศัพท์โดยตรง / หน้าร้าน"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
                  />
                </div>
              )}
            </div>

            {/* 3. รูปภาพสินค้าที่รับคืน (ตัวเลือกเสริม) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700">
                  3. ภาพถ่ายสภาพสินค้าที่รับคืน / สินค้าชำรุด (ถ้ามี)
                </span>
                {productPreview && <span className="text-xs text-emerald-600 font-bold">✓ แนบแล้ว</span>}
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => productCameraRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>📷</span> ถ่ายรูปสินค้า
                </button>
                <button
                  type="button"
                  onClick={() => productFileRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>📁</span> เลือกรูปสินค้า
                </button>
              </div>

              <input
                type="file"
                ref={productCameraRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(e, setProductFile, setProductPreview)}
              />
              <input
                type="file"
                ref={productFileRef}
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e, setProductFile, setProductPreview)}
              />

              {productPreview && (
                <div className="mt-2 relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img src={productPreview} alt="Product Damaged" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setProductFile(null); setProductPreview(null); }}
                    className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-amber-200 hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <span>💾 บันทึกรับคืนสินค้า & คืนเงิน</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
