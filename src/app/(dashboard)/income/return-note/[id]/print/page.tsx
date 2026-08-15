import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { formatCurrency } from "@/lib/types";
import { thaiBahtText } from "@/lib/thaiBaht";
import PrintHelper from "@/app/(dashboard)/outcome/shop-without-receipt/[id]/print/PrintHelper";
import { getSetting } from "@/lib/actions";

export default async function PrintReturnNotePage({
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
  const originalAmount = transaction.amount;
  const refundAmount = detail?.refund_amount || 0;
  const netAmount = Math.max(0, originalAmount - refundAmount);

  const companyName = await getSetting("company_name") || "บริษัท โฮมออฟคราฟ จำกัด (สำนักงานใหญ่)";
  const companyAddress = await getSetting("company_address") || "35 ถนนนิพัทธ์สงเคราะห์ 4 ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110";
  const companyTaxId = await getSetting("company_tax_id") || "0905560005314";

  const refundDate = detail?.refund_date ? new Date(detail.refund_date) : new Date();
  const dd = String(refundDate.getDate()).padStart(2, "0");
  const mm = String(refundDate.getMonth() + 1).padStart(2, "0");
  const thaiYear = refundDate.getFullYear() + 543;
  const dateString = `${dd}/${mm}/${thaiYear}`;

  const returnNoteNo = detail?.return_note_number || `RN${String(thaiYear).slice(-2)}${mm}0001`;

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
            <h1 className="text-xl font-black text-slate-900">เอกสารรับคืนสินค้าและปรับลดมูลค่าการขาย</h1>
            <h2 className="text-xs font-bold tracking-wider text-slate-500 mt-0.5">GOODS RETURN & SALES ADJUSTMENT NOTE (NON-VAT)</h2>
            
            <div className="mt-3 text-xs space-y-1">
              <div className="flex justify-end gap-2">
                <span className="font-bold text-slate-600">เลขที่เอกสาร:</span>
                <span className="font-mono font-bold text-slate-900">{returnNoteNo}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-bold text-slate-600">วันที่:</span>
                <span className="font-medium text-slate-900">{dateString}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-bold text-slate-600">อ้างอิงรายการขายเดิม:</span>
                <span className="font-mono text-slate-700">{transaction.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 font-medium">ชื่อลูกค้า / Beneficiary:</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {detail?.customer_name || transaction.description || "ลูกค้าทั่วไป"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">ช่องทางการรับเงิน / บัญชีที่โอนคืน:</p>
              <p className="text-xs font-medium text-slate-800 mt-0.5">
                {detail?.customer_account_info || "โอนเงินผ่านบัญชีธนาคาร"}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-xs border-collapse mb-6">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300">
              <th className="py-2.5 px-3 text-center w-12 font-bold">ลำดับ</th>
              <th className="py-2.5 px-3 text-left font-bold">รายการ / คำอธิบาย</th>
              <th className="py-2.5 px-3 text-right w-36 font-bold">มูลค่าเดิม (บาท)</th>
              <th className="py-2.5 px-3 text-right w-36 font-bold">ยอดคืน/ปรับลด (บาท)</th>
              <th className="py-2.5 px-3 text-right w-36 font-bold">ยอดคงเหลือสุทธิ (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-3 px-3 text-center">1</td>
              <td className="py-3 px-3">
                <p className="font-bold text-slate-900">{transaction.description || "ค่าสินค้า / บริการ"}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  สาเหตุ: {detail?.refund_reason || "รับคืนสินค้าเนื่องจากสินค้าชำรุดเสียหาย/ไม่ตรงตามเงื่อนไข"}
                </p>
              </td>
              <td className="py-3 px-3 text-right font-mono">{formatCurrency(originalAmount, "THB")}</td>
              <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">-{formatCurrency(refundAmount, "THB")}</td>
              <td className="py-3 px-3 text-right font-mono font-bold">{formatCurrency(netAmount, "THB")}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-b border-slate-800">
              <td colSpan={3} className="py-3 px-3 font-bold bg-slate-50">
                ( {thaiBahtText(refundAmount)} )
              </td>
              <td className="py-3 px-3 text-right font-bold text-slate-700 bg-slate-50">
                รวมยอดเงินคืน:
              </td>
              <td className="py-3 px-3 text-right font-mono font-black text-sm bg-slate-50 text-slate-900">
                ฿{formatCurrency(refundAmount, "THB")}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Legal Non-VAT Notice */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl mb-10 text-[11px] text-amber-900 leading-relaxed">
          <p className="font-bold">⚠️ หมายเหตุทางภาษีและบัญชี (Non-VAT Notice):</p>
          <p className="mt-0.5">
            บริษัทฯ ไม่ได้เป็นผู้ประกอบการจดทะเบียนภาษีมูลค่าเพิ่ม (Non-VAT) เอกสารฉบับนี้ใช้เป็นหลักฐานการรับคืนสินค้าและปรับปรุงลดยอดขายทางการค้าเท่านั้น และไม่ใช่ใบลดหนี้ตามมาตรา 86/10 แห่งประมวลรัษฎากร
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 pt-4 text-xs text-center">
          <div>
            <div className="border-b border-slate-400 pb-12 mb-2"></div>
            <p className="font-bold text-slate-800">ผู้จัดทำ / ผู้รับคืนสินค้า</p>
            <p className="text-[10px] text-slate-500 mt-0.5">วันที่: ...../...../..........</p>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-12 mb-2"></div>
            <p className="font-bold text-slate-800">ผู้อนุมัติจ่ายเงินคืน</p>
            <p className="text-[10px] text-slate-500 mt-0.5">กรรมการผู้จัดการ</p>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-12 mb-2"></div>
            <p className="font-bold text-slate-800">ผู้รับเงินคืน (ลูกค้า)</p>
            <p className="text-[10px] text-slate-500 mt-0.5">วันที่: ...../...../..........</p>
          </div>
        </div>

      </div>
    </main>
  );
}
