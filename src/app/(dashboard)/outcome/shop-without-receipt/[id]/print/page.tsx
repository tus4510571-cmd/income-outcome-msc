import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getSignedUrl } from "@/lib/actions";
import { formatCurrency } from "@/lib/types";
import { thaiBahtText } from "@/lib/thaiBaht";
import PrintHelper from "./PrintHelper";

export default async function PrintReceiptPage({
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
      expense_detail:expense_details(*),
      receipt_items:receipt_items(*),
      files:transaction_files(*)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!transaction) notFound();

  // Get business card image URL
  const businessCardFile = transaction.files?.find((f: any) => f.file_type === "business_card");
  let businessCardUrl = null;
  if (businessCardFile) {
    businessCardUrl = await getSignedUrl(businessCardFile.file_path);
  }

  // Format Date for invoice number
  const txDate = new Date(transaction.transaction_date);
  const dateString = `${txDate.getDate()}/${txDate.getMonth() + 1}/${txDate.getFullYear() + 543}`;
  const shortId = transaction.id.substring(0, 4).toUpperCase();
  const invoiceNumber = `TV${txDate.getFullYear() + 543}${String(txDate.getMonth() + 1).padStart(2, "0")}${shortId}`;

  const items = transaction.receipt_items || [];
  const totalAmount = transaction.amount;

  return (
    <main className="bg-white text-black min-h-screen font-sans p-8 print:p-0">
      <PrintHelper />
      
      <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          {/* Left: Business Card Box */}
          <div className="w-[350px] h-[200px] border border-black flex items-center justify-center p-1 overflow-hidden">
            {businessCardUrl ? (
              <img 
                src={businessCardUrl} 
                alt="Business Card" 
                className="w-full h-full object-contain" 
              />
            ) : (
              <span className="text-gray-400">image นามบัตร file ใส่ตรงนี้</span>
            )}
          </div>

          {/* Right: Invoice Title */}
          <div className="text-right mt-12">
            <h1 className="text-2xl font-bold mb-1">ใบเสร็จรับเงิน</h1>
            <h2 className="text-lg font-bold mb-6">RECEIPT</h2>
            
            <div className="grid grid-cols-2 gap-x-4 text-sm font-bold text-right">
              <div className="col-span-2 text-right mb-2">{invoiceNumber}</div>
              <div className="col-span-2 text-right">{dateString}</div>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="mb-8 font-bold text-sm">
          <p>บริษัท โฮมออฟคราฟ จำกัด</p>
          <p>35 ถนนนิพัทธ์สงเคราะห์ 4 ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110</p>
          <p>เลขประจำตัวผู้เสียภาษี 0905560005314</p>
        </div>

        {/* Table */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 text-center w-16">ลำดับ</th>
              <th className="py-2 text-left">รายการ</th>
              <th className="py-2 text-center w-24">จำนวน</th>
              <th className="py-2 text-right w-32">ราคา/หน่วย</th>
              <th className="py-2 text-right w-32">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, index: number) => (
              <tr key={item.id} className="border-b border-transparent">
                <td className="py-2 text-center">{index + 1}</td>
                <td className="py-2 text-left">{item.product_name}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(item.unit_price, "").trim()}</td>
                <td className="py-2 text-right">{formatCurrency(item.unit_price * item.quantity, "").trim()}</td>
              </tr>
            ))}
            {/* Fill empty rows if needed to make it look like a receipt, simplified here */}
            <tr>
              <td className="py-1 text-center"></td>
              <td className="py-1 text-left"></td>
              <td className="py-1 text-center"></td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">-</td>
            </tr>
            <tr>
              <td className="py-1 text-center"></td>
              <td className="py-1 text-left"></td>
              <td className="py-1 text-center"></td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">-</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-between items-center border-t border-b border-black py-4 mb-8 text-sm font-bold">
          <div className="flex-1 text-center">
            {thaiBahtText(totalAmount)}
          </div>
          <div className="w-32 text-center">รวม</div>
          <div className="w-32 text-right">
            {formatCurrency(totalAmount, "").trim()}
          </div>
        </div>

        {/* Footer / Signatures */}
        <div className="flex justify-between items-start mt-8 text-sm font-bold">
          <div className="w-1/4 text-center">
            <p className="mb-20 mt-1">ผู้ส่งสินค้า</p>
          </div>
          <div className="w-1/2">
            <div className="text-xs font-normal">
              <p className="mb-1">- ได้รับสินค้าในสภาพสมบูรณ์ ครบถ้วน</p>
              <p className="mb-1">- สงวนสิทธิ์ในการแก้ไขเอกสารภายใน 7 วัน</p>
              <p className="mb-1">- สินค้าซื้อแล้วไม่รับเปลี่ยนหรือคืน</p>
              <p className="mb-1">- ชำระหนี้เกินกว่ากำหนด คิดดอกเบี้ยร้อยละ 1.5 ต่อเดือน</p>
            </div>
          </div>
          <div className="w-1/4 text-center mt-6">
            <p className="mb-12">ผู้รับสินค้า</p>
            <p className="mb-2 font-normal">...................................................</p>
            <div className="flex items-center justify-center gap-2 font-normal">
              <span>วันที่</span>
              <span>...................................................</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
