"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type TransactionWithDetails } from "@/lib/types";
import FileImage from "@/components/FileImage";
import RefundModal from "@/components/RefundModal";
import { cancelRefund } from "@/lib/actions";

interface RefundTimelineProps {
  transaction: TransactionWithDetails;
}

export default function RefundTimeline({ transaction }: RefundTimelineProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const detail = transaction.expense_detail;
  const isRefunded = detail?.is_refunded;
  const refundAmount = detail?.refund_amount || 0;
  const isFullRefund = refundAmount >= transaction.amount;
  const netAmount = Math.max(0, transaction.amount - refundAmount);

  const handleCancelRefund = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกสถานะการคืนเงินของรายการนี้?")) return;
    setIsCanceling(true);
    try {
      await cancelRefund(transaction.id);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <>
      <div className="card border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 p-5 rounded-2xl shadow-sm mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-amber-200/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl font-bold shadow-sm">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  {isRefunded ? "รายการนี้ได้รับการคืนเงินแล้ว" : "บันทึกการขอคืนเงิน / ยกเลิกรายการ"}
                </h3>
                {isRefunded && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isFullRefund ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {isFullRefund ? "คืนเต็มจำนวน 100%" : "คืนบางส่วน"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                รหัสอ้างอิง: REF-{transaction.id.substring(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>{isRefunded ? "✏️ แก้ไขข้อมูลคืนเงิน" : "🔄 บันทึกรับคืนเงิน (Refund)"}</span>
            </button>
            {isRefunded && (
              <button
                type="button"
                onClick={handleCancelRefund}
                disabled={isCanceling}
                className="py-2 px-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                title="ยกเลิกการคืนเงิน"
              >
                {isCanceling ? "..." : "ยกเลิกคืนเงิน"}
              </button>
            )}
          </div>
        </div>

        {isRefunded ? (
          <div className="mt-4 space-y-4">
            {/* Financial summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium">ยอดจ่ายซื้อเดิม</span>
                <p className="text-base font-bold text-slate-700">฿{transaction.amount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-white border border-amber-200 rounded-xl">
                <span className="text-[11px] text-amber-600 font-medium">ยอดเงินที่ได้รับคืน</span>
                <p className="text-base font-bold text-amber-600">- ฿{refundAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-white border border-emerald-200 rounded-xl">
                <span className="text-[11px] text-emerald-700 font-medium">ยอดจ่ายสุทธิหลังคืนเงิน</span>
                <p className="text-base font-bold text-emerald-700">฿{netAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Refund meta details */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">วันที่ได้รับเงินคืน:</span>
                <span className="font-semibold text-slate-800">{detail.refund_date || "-"}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">ช่องทางการรับเงิน:</span>
                <span className="font-semibold text-slate-800">
                  {detail.refund_type === "via_personal"
                    ? "👤 โอนผ่านบัญชีส่วนตัว ➔ เข้าบัญชีบริษัท"
                    : "🏢 โอนเข้าบัญชีบริษัทโดยตรง"}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">เหตุผลการขอคืนเงิน:</span>
                <p className="text-slate-800 bg-slate-50 p-2 rounded-lg font-normal">
                  {detail.refund_reason || "ไม่ได้ระบุ"}
                </p>
              </div>
            </div>

            {/* Evidence Attachments */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700">หลักฐานการคืนเงินที่บันทึกไว้:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {detail.refund_slip_company_path && (
                  <div className="border border-emerald-300 bg-emerald-50/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-emerald-800 mb-2">
                      ✓ สลิปโอนคืนเข้าบัญชีบริษัท
                    </p>
                    <FileImage filePath={detail.refund_slip_company_path} label="สลิปคืนเงินเข้าบริษัท" />
                  </div>
                )}

                {detail.refund_slip_personal_path && (
                  <div className="border border-amber-300 bg-amber-50/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-900 mb-2">
                      ✓ สลิปร้านค้าโอนเข้าบัญชีส่วนตัว
                    </p>
                    <FileImage filePath={detail.refund_slip_personal_path} label="สลิปร้านค้าโอนเข้าส่วนตัว" />
                  </div>
                )}

                {detail.refund_chat_proof_path ? (
                  <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-indigo-900 mb-2">
                      ✓ ภาพหลักฐานแชทตกลงขอคืนเงิน
                    </p>
                    <FileImage filePath={detail.refund_chat_proof_path} label="หลักฐานแชทคืนเงิน" />
                  </div>
                ) : detail.refund_no_chat_reason ? (
                  <div className="border border-slate-200 bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">
                      หมายเหตุ (ไม่มีหลักฐานแชท):
                    </p>
                    <p className="text-xs text-slate-600">{detail.refund_no_chat_reason}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            หากสินค้ารายการนี้ชำรุด มีตำหนิ หรือร้านค้าโอนเงินคืน (ไม่ว่าจะคืนเข้าบัญชีบริษัทโดยตรง หรือคืนเข้าบัญชีส่วนตัว) สามารถกดปุ่ม <strong>"บันทึกรับคืนเงิน (Refund)"</strong> เพื่อบันทึกลดยอดค่าใช้จ่ายและแนบหลักฐานให้ถูกต้องตามหลักบัญชีได้ทันทีครับ
          </p>
        )}
      </div>

      <RefundModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transactionId={transaction.id}
        originalAmount={transaction.amount}
        existingRefund={detail}
      />
    </>
  );
}
