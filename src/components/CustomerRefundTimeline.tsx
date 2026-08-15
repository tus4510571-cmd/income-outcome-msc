"use client";

import { useState } from "react";
import { formatCurrency, type TransactionWithDetails } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import CustomerRefundModal from "./CustomerRefundModal";
import { cancelCustomerRefund } from "@/lib/actions";
import Link from "next/link";

interface CustomerRefundTimelineProps {
  transaction: TransactionWithDetails;
}

export default function CustomerRefundTimeline({ transaction }: CustomerRefundTimelineProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const detail = transaction.income_detail;
  const isRefunded = detail?.is_refunded;
  const refundAmount = detail?.refund_amount || 0;
  const isFullRefund = refundAmount >= transaction.amount;

  const handleCancelRefund = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกสถานะการคืนเงินลูกค้ารายการนี้?")) {
      return;
    }

    try {
      setIsCanceling(true);
      await cancelCustomerRefund(transaction.id);
      window.location.reload();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + (err.message || "ไม่สามารถยกเลิกได้"));
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="my-6">
      {!isRefunded ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg flex-shrink-0">
              🔄
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">การรับคืนสินค้า / คืนเงินลูกค้า</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กรณีสินค้ามีปัญหาและต้องคืนเงิน (เต็มจำนวนหรือบางส่วน) พร้อมออกเอกสารรับคืนสินค้า (RN) และใบสำคัญจ่าย (PV)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>🔄 บันทึกรับคืนสินค้า / คืนเงินลูกค้า</span>
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/40 rounded-3xl p-6 border-2 border-amber-300 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200/70 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-sm">
                🔄
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    ประวัติการรับคืนสินค้า & คืนเงินลูกค้า
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isFullRefund 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {isFullRefund ? "✓ คืนเงินเต็มจำนวน 100%" : "⚡ คืนเงินบางส่วน"}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  ยอดเงินคืน: <strong className="text-amber-900 text-sm">฿{refundAmount.toLocaleString()}</strong> ({detail?.refund_date ? formatDate(detail.refund_date) : "-"})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-amber-200 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1"
              >
                <span>✏️</span> แก้ไข
              </button>
              <button
                type="button"
                onClick={handleCancelRefund}
                disabled={isCanceling}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <span>🗑️</span> ยกเลิก
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-amber-200/60 shadow-xs space-y-2">
              <p className="text-xs font-bold text-amber-900">📄 เลขที่เอกสารอ้างอิง</p>
              <div className="space-y-1 text-xs text-slate-700">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">เอกสารรับคืนสินค้า (RN):</span>
                  <span className="font-mono font-bold text-slate-900 bg-amber-100 px-2 py-0.5 rounded">
                    {detail?.return_note_number || "RN-"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">ใบสำคัญจ่ายคืนเงิน (PV):</span>
                  <span className="font-mono font-bold text-slate-900 bg-amber-100 px-2 py-0.5 rounded">
                    {detail?.payment_voucher_number || "PV-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-amber-200/60 shadow-xs space-y-2">
              <p className="text-xs font-bold text-amber-900">👤 ข้อมูลการโอนเงินคืนลูกค้า</p>
              <div className="space-y-1 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500">บัญชีปลายทาง: </span>
                  <span className="font-medium">{detail?.customer_account_info || "ไม่ระบุ"}</span>
                </div>
                <div>
                  <span className="text-slate-500">สาเหตุ: </span>
                  <span className="font-medium text-slate-800">{detail?.refund_reason || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Document Print/View Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Link
              href={`/income/return-note/${transaction.id}/print`}
              target="_blank"
              className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2"
            >
              <span>📄</span> พิมพ์เอกสารรับคืนสินค้า (Return Note)
            </Link>
            <Link
              href={`/income/payment-voucher/${transaction.id}/print`}
              target="_blank"
              className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2"
            >
              <span>🧾</span> พิมพ์ใบสำคัญจ่ายคืนเงิน (PV)
            </Link>
          </div>

          {/* Proof Photos */}
          <div>
            <p className="text-xs font-bold text-amber-900 mb-2">📸 หลักฐานที่แนบไว้</p>
            <div className="flex flex-wrap gap-3">
              {detail?.refund_slip_path && (
                <div className="bg-white p-2 rounded-2xl border border-amber-200 shadow-xs">
                  <a href={detail.refund_slip_path} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={detail.refund_slip_path} alt="Slip" className="w-24 h-24 object-cover rounded-xl" />
                    <span className="block text-[11px] text-center text-amber-900 font-semibold mt-1">
                      สลิปโอนคืนลูกค้า
                    </span>
                  </a>
                </div>
              )}

              {detail?.refund_chat_proof_path && (
                <div className="bg-white p-2 rounded-2xl border border-amber-200 shadow-xs">
                  <a href={detail.refund_chat_proof_path} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={detail.refund_chat_proof_path} alt="Chat" className="w-24 h-24 object-cover rounded-xl" />
                    <span className="block text-[11px] text-center text-amber-900 font-semibold mt-1">
                      หลักฐานแชท
                    </span>
                  </a>
                </div>
              )}

              {detail?.refund_product_photo_path && (
                <div className="bg-white p-2 rounded-2xl border border-amber-200 shadow-xs">
                  <a href={detail.refund_product_photo_path} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={detail.refund_product_photo_path} alt="Product" className="w-24 h-24 object-cover rounded-xl" />
                    <span className="block text-[11px] text-center text-amber-900 font-semibold mt-1">
                      รูปสินค้าที่รับคืน
                    </span>
                  </a>
                </div>
              )}

              {detail?.refund_no_chat_reason && !detail.refund_chat_proof_path && (
                <div className="bg-white p-3 rounded-2xl border border-amber-200 text-xs text-slate-600 flex items-center">
                  <span>ℹ️ เหตุผลไม่มีแชท: {detail.refund_no_chat_reason}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Modal */}
      <CustomerRefundModal
        transaction={transaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
