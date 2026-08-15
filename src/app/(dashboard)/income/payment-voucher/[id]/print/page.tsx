import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { formatCurrency } from "@/lib/types";
import { thaiBahtText } from "@/lib/thaiBaht";
import PrintHelper from "@/app/(dashboard)/outcome/shop-without-receipt/[id]/print/PrintHelper";
import { getSetting } from "@/lib/actions";

export default async function PrintPaymentVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: transaction } = await supabase
    .from("transactions")
    .select(`
      *,
      income_detail:income_details(*),
      files:transaction_files(*)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!transaction) notFound();

  const detail = transaction.income_detail;
  const refundAmount = detail?.refund_amount || 0;

  const companyName = await getSetting("company_name") || "บริษัท โฮมออฟคราฟ จำกัด (สำนักงานใหญ่)";
  const companyAddress = await getSetting("company_address") || "35 ถนนนิพัทธ์สงเคราะห์ 4 ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110";
  const companyTaxId = await getSetting("company_tax_id") || "0905560005314";

  const refundDate = detail?.refund_date ? new Date(detail.refund_date) : new Date();
  const dd = String(refundDate.getDate()).padStart(2, "0");
  const mm = String(refundDate.getMonth() + 1).padStart(2, "0");
  const thaiYear = refundDate.getFullYear() + 543;
  const dateString = `${dd}/${mm}/${thaiYear}`;

  const pvNumber = detail?.payment_voucher_number || `PV${String(thaiYear).slice(-2)}${mm}0001`;
  const returnNoteNo = detail?.return_note_number || "-";

  return (
    <main className="bg-white text-black min-h-screen font-sans p-8 print:p-0">
      <PrintHelper />
      
      <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{companyName}</h2>
            <p className="text-xs text-slate-600 mt-1 max-w-md">{companyAddress}</p>
            <p className="text-xs text-slate-700 font-medium mt-0.5">เลขประจำตัวผู้เสียภาษี: {companyTaxId}</p>
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ใบสำคัญจ่าย</h1>
            <h2 className="text-xs font-bold tracking-wider text-slate-500 mt-0.5">PAYMENT VOUCHER</h2>
            
            <div className="mt-3 text-xs space-y-1">
              <div className="flex justify-end gap-2">
                <span className="font-bold text-slate-600">เลขที่สำคัญจ่าย:</span>
                <span className="font-mono font-bold text-slate-900">{pvNumber}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-bold text-slate-600">วันที่จ่าย:</span>
                <span className="font-medium text-slate-900">{dateString}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-bold text-slate-600">อ้างอิงเอกสารรับคืน:</span>
                <span className="font-mono text-slate-700">{returnNoteNo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Beneficiary & Payment Info */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 font-medium">จ่ายให้แก่ (Pay To):</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {detail?.customer_name || transaction.description || "ลูกค้าทั่วไป"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">ช่องทางการจ่ายเงิน (Payment Method):</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                โอนเงินผ่านบัญชีธนาคาร (Bank Transfer)
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {detail?.customer_account_info || "บัญชีลูกค้าตามสลิปแนบ"}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Details Table */}
        <table className="w-full text-xs border-collapse mb-6">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300">
              <th className="py-2.5 px-3 text-center w-12 font-bold">ลำดับ</th>
              <th className="py-2.5 px-3 text-left font-bold">คำอธิบายรายการจ่าย / Explanation</th>
              <th className="py-2.5 px-3 text-right w-48 font-bold">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-4 px-3 text-center">1</td>
              <td className="py-4 px-3">
                <p className="font-bold text-slate-900">
                  จ่ายคืนเงินค่าสินค้าเนื่องจากรับคืนสินค้า (Customer Refund)
                </p>
                <p className="text-slate-600 text-xs mt-1">
                  สาเหตุ: {detail?.refund_reason || "สินค้ามีปัญหา/ชำรุดเสียหาย"}
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  อ้างอิงเอกสารรับคืนเลขที่: {returnNoteNo} (Transaction: {transaction.id.substring(0, 8).toUpperCase()})
                </p>
              </td>
              <td className="py-4 px-3 text-right font-mono font-bold text-base text-slate-900">
                {formatCurrency(refundAmount, "THB")}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-b-2 border-slate-800 bg-slate-50">
              <td colSpan={2} className="py-3 px-3 font-bold text-slate-800">
                จำนวนเงินตัวอักษร: ( {thaiBahtText(refundAmount)} )
              </td>
              <td className="py-3 px-3 text-right font-mono font-black text-base text-slate-900">
                ฿{formatCurrency(refundAmount, "THB")}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Attached Slip Preview in Print (if available) */}
        {detail?.refund_slip_path && (
          <div className="mb-8 border border-slate-200 rounded-xl p-4 bg-slate-50">
            <p className="text-xs font-bold text-slate-700 mb-2">📎 สำเนาหลักฐานการโอนเงิน (Attached Transfer Slip):</p>
            <div className="max-w-xs max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img src={detail.refund_slip_path} alt="Transfer Slip" className="w-full h-auto object-contain" />
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 pt-8 text-xs text-center">
          <div>
            <div className="border-b border-slate-400 pb-14 mb-2"></div>
            <p className="font-bold text-slate-800">ผู้จัดทำ / ผู้ขอเบิกจ่าย</p>
            <p className="text-[10px] text-slate-500 mt-0.5">วันที่: ...../...../..........</p>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-14 mb-2"></div>
            <p className="font-bold text-slate-800">ผู้จ่ายเงิน / ผู้ทำรายการโอน</p>
            <p className="text-[10px] text-slate-500 mt-0.5">ฝ่ายการเงิน</p>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-14 mb-2"></div>
            <p className="font-bold text-slate-800">ผู้อนุมัติจ่าย (Approved By)</p>
            <p className="text-[10px] text-slate-500 mt-0.5">กรรมการผู้จัดการ</p>
          </div>
        </div>

      </div>
    </main>
  );
}
