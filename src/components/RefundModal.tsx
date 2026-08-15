"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { recordRefund } from "@/lib/actions";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  originalAmount: number;
  existingRefund?: {
    refund_amount?: number | null;
    refund_date?: string | null;
    refund_type?: "company_direct" | "via_personal" | null;
    refund_reason?: string | null;
    refund_no_chat_reason?: string | null;
  } | null;
}

export default function RefundModal({
  isOpen,
  onClose,
  transactionId,
  originalAmount,
  existingRefund,
}: RefundModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [refundAmount, setRefundAmount] = useState<number>(
    existingRefund?.refund_amount || originalAmount
  );
  const [refundDate, setRefundDate] = useState<string>(
    existingRefund?.refund_date || new Date().toISOString().split("T")[0]
  );
  const [refundType, setRefundType] = useState<"company_direct" | "via_personal">(
    existingRefund?.refund_type || "company_direct"
  );
  const [refundReason, setRefundReason] = useState<string>(
    existingRefund?.refund_reason || ""
  );
  const [noChatReason, setNoChatReason] = useState<string>(
    existingRefund?.refund_no_chat_reason || ""
  );

  // Files
  const [slipCompanyBase64, setSlipCompanyBase64] = useState<string>("");
  const [slipCompanyName, setSlipCompanyName] = useState<string>("");

  const [slipPersonalBase64, setSlipPersonalBase64] = useState<string>("");
  const [slipPersonalName, setSlipPersonalName] = useState<string>("");

  const [chatProofBase64, setChatProofBase64] = useState<string>("");
  const [chatProofName, setChatProofName] = useState<string>("");

  // Refs for camera / gallery
  const camCompanyRef = useRef<HTMLInputElement>(null);
  const fileCompanyRef = useRef<HTMLInputElement>(null);

  const camPersonalRef = useRef<HTMLInputElement>(null);
  const filePersonalRef = useRef<HTMLInputElement>(null);

  const camChatRef = useRef<HTMLInputElement>(null);
  const fileChatRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setBase64: (val: string) => void,
    setName: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => setBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!refundAmount || refundAmount <= 0) {
      setError("กรุณาระบุจำนวนเงินที่ได้รับคืนให้ถูกต้อง");
      return;
    }

    if (refundAmount > originalAmount) {
      setError(`ยอดเงินคืนต้องไม่เกินยอดซื้อเดิม (฿${originalAmount.toLocaleString()})`);
      return;
    }

    if (!refundReason.trim()) {
      setError("กรุณาระบุเหตุผลการขอคืนเงิน/คืนสินค้า");
      return;
    }

    if (!chatProofBase64 && !noChatReason.trim() && !existingRefund?.refund_no_chat_reason) {
      setError("กรุณาแนบหลักฐานแชท หรือระบุเหตุผลในกรณีที่ไม่มีหลักฐานแชท");
      return;
    }

    setLoading(true);
    try {
      await recordRefund({
        transactionId,
        refundAmount,
        refundDate,
        refundType,
        refundReason,
        refundSlipCompanyBase64: slipCompanyBase64 || undefined,
        refundSlipCompanyName: slipCompanyName || undefined,
        refundSlipPersonalBase64: slipPersonalBase64 || undefined,
        refundSlipPersonalName: slipPersonalName || undefined,
        refundChatProofBase64: chatProofBase64 || undefined,
        refundChatProofName: chatProofName || undefined,
        refundNoChatReason: noChatReason || undefined,
      });

      router.refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl text-lg font-bold">🔄</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">บันทึกรับเงินคืน (Refund)</h2>
              <p className="text-xs text-slate-500">อ้างอิงรหัสรายการ: {transactionId.substring(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนเงินที่ได้รับคืน (บาท) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={originalAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                className="input-field w-full text-slate-800 font-semibold text-base"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                ยอดซื้อเดิม: ฿{originalAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่ได้รับเงินคืน *
              </label>
              <input
                type="date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          {/* Refund Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              ช่องทางการรับเงินคืน *
            </label>
            <div className="grid grid-cols-1 gap-2">
              <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                refundType === "company_direct"
                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-medium"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}>
                <input
                  type="radio"
                  name="refundType"
                  value="company_direct"
                  checked={refundType === "company_direct"}
                  onChange={() => setRefundType("company_direct")}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-xs">🏢 ร้านค้าโอนคืนเข้า "บัญชีบริษัท" โดยตรง</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">เงินเข้าบัญชีบริษัททันที ตรงกับ Statement</div>
                </div>
              </label>

              <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                refundType === "via_personal"
                  ? "border-amber-500 bg-amber-50/50 text-amber-950 font-medium"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}>
                <input
                  type="radio"
                  name="refundType"
                  value="via_personal"
                  checked={refundType === "via_personal"}
                  onChange={() => setRefundType("via_personal")}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-xs">👤 ร้านค้าโอนเข้า "บัญชีส่วนตัว" ก่อน ➔ แล้วโอนเข้าบริษัท</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">ต้องแนบสลิปทั้ง 2 ขา เพื่อความโปร่งใสทางภาษี</div>
                </div>
              </label>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เหตุผลการขอคืนเงิน / คืนสินค้า *
            </label>
            <textarea
              rows={2}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="เช่น สินค้าชำรุดเสียหาย, สินค้าไม่ตรงตามสเปก, ยกเลิกออเดอร์"
              className="input-field w-full text-xs"
              required
            />
          </div>

          {/* File 1: Company Slip */}
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-800 mb-2">
              1. สลิปเงินโอนเข้าบัญชีบริษัท (สลิปขารับเงินเข้าบริษัท)
            </p>
            <input
              ref={camCompanyRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e, setSlipCompanyBase64, setSlipCompanyName)}
            />
            <input
              ref={fileCompanyRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => handleFile(e, setSlipCompanyBase64, setSlipCompanyName)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => camCompanyRef.current?.click()}
                className="flex-1 py-2 px-3 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium hover:bg-emerald-100 flex items-center justify-center gap-1.5"
              >
                📷 ถ่ายรูปสลิป
              </button>
              <button
                type="button"
                onClick={() => fileCompanyRef.current?.click()}
                className="flex-1 py-2 px-3 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                📁 เลือกไฟล์สลิป
              </button>
            </div>
            {slipCompanyName && (
              <p className="text-xs text-emerald-600 mt-2 font-medium">✓ {slipCompanyName}</p>
            )}
          </div>

          {/* File 2: Personal Slip (Only if via_personal) */}
          {refundType === "via_personal" && (
            <div className="p-3 border border-amber-200 rounded-xl bg-amber-50/40">
              <p className="text-xs font-semibold text-amber-900 mb-2">
                2. สลิปร้านค้าโอนคืนเข้าบัญชีส่วนตัว (ถ้ามี)
              </p>
              <input
                ref={camPersonalRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e, setSlipPersonalBase64, setSlipPersonalName)}
              />
              <input
                ref={filePersonalRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => handleFile(e, setSlipPersonalBase64, setSlipPersonalName)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => camPersonalRef.current?.click()}
                  className="flex-1 py-2 px-3 border border-amber-300 bg-amber-50 text-amber-900 rounded-lg text-xs font-medium hover:bg-amber-100 flex items-center justify-center gap-1.5"
                >
                  📷 ถ่ายรูปสลิป
                </button>
                <button
                  type="button"
                  onClick={() => filePersonalRef.current?.click()}
                  className="flex-1 py-2 px-3 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  📁 เลือกไฟล์สลิป
                </button>
              </div>
              {slipPersonalName && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">✓ {slipPersonalName}</p>
              )}
            </div>
          )}

          {/* File 3: Chat Proof */}
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-800 mb-2">
              3. หลักฐานแชทตกลงขอคืนเงิน / ใบคืนสินค้า
            </p>
            <input
              ref={camChatRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e, setChatProofBase64, setChatProofName)}
            />
            <input
              ref={fileChatRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => handleFile(e, setChatProofBase64, setChatProofName)}
            />
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => camChatRef.current?.click()}
                className="flex-1 py-2 px-3 border border-indigo-200 bg-indigo-50 text-indigo-800 rounded-lg text-xs font-medium hover:bg-indigo-100 flex items-center justify-center gap-1.5"
              >
                📷 ถ่ายรูปหลักฐานแชท
              </button>
              <button
                type="button"
                onClick={() => fileChatRef.current?.click()}
                className="flex-1 py-2 px-3 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                📁 เลือกรูปแชท
              </button>
            </div>
            {chatProofName && (
              <p className="text-xs text-emerald-600 mb-2 font-medium">✓ {chatProofName}</p>
            )}

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                กรณีไม่มีหลักฐานแชท โปรดระบุเหตุผล:
              </label>
              <input
                type="text"
                value={noChatReason}
                onChange={(e) => setNoChatReason(e.target.value)}
                placeholder="เช่น คืนสินค้าหน้าร้านด้วยตนเอง, เจรจาทางโทรศัพท์"
                className="input-field w-full text-xs"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "กำลังบันทึก..." : "💾 บันทึกรับเงินคืน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
