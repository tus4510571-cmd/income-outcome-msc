import { type ReceiptItem, formatCurrency } from "@/lib/types";
import { thaiBahtText } from "@/lib/thaiBaht";

interface CashBillGeneratorProps {
  shopName: string;
  shopAddress: string;
  shopTaxId: string;
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  dateString: string;
  items: ReceiptItem[];
  totalAmount: number;
}

export default function CashBillGenerator({
  shopName,
  shopAddress,
  shopTaxId,
  companyName,
  companyAddress,
  companyTaxId,
  dateString,
  items,
  totalAmount
}: CashBillGeneratorProps) {
  return (
    <div id="cashbill-capture" className="p-10 font-sans w-[800px] border shadow-sm mx-auto my-0 bg-white text-black" style={{ minHeight: "1100px", borderColor: "#e5e7eb" }}>
      {/* Header: Shop Info */}
      <div className="flex justify-between items-start mb-8">
        <div className="w-1/3">
          {/* Logo was here, left blank intentionally */}
        </div>
        <div className="w-2/3 text-right">
          {shopName && <h2 className="text-xl font-bold mb-1">{shopName}</h2>}
          {shopAddress && <p className="text-sm">{shopAddress}</p>}
          {shopTaxId && <p className="text-sm mt-1">เลขประจำตัวผู้เสียภาษีอากร {shopTaxId}</p>}
        </div>
      </div>

      <h1 className="text-2xl font-bold text-center mb-8">บิลเงินสด</h1>

      {/* Buyer Info */}
      <div className="mb-6 space-y-2 text-sm">
        <div className="flex">
          <span className="w-16 font-bold">นาม</span>
          <span className="flex-1 border-b border-black border-dashed px-2">{companyName}</span>
          <span className="w-16 font-bold text-right pr-2">วันที่</span>
          <span className="w-40 border-b border-black border-dashed px-2 text-center">{dateString}</span>
        </div>
        <div className="flex">
          <span className="w-16 font-bold">ที่อยู่</span>
          <span className="flex-1 border-b border-black border-dashed px-2">
            {companyAddress} {companyTaxId ? `(เลขประจำตัวผู้เสียภาษี: ${companyTaxId})` : ""}
          </span>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm border-collapse border border-black mb-8 text-center">
        <thead>
          <tr className="border border-black">
            <th className="border border-black py-2 w-20">จำนวน</th>
            <th className="border border-black py-2">รายการ</th>
            <th className="border border-black py-2 w-24">หน่วยละ</th>
            <th className="border border-black py-2 w-32" colSpan={2}>
              จำนวนเงิน<br/>
              <div className="flex border-t border-black mt-1">
                <span className="flex-1 border-r border-black py-1">บาท</span>
                <span className="w-8 py-1">สต.</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const amountStr = (item.quantity * item.unit_price).toFixed(2);
            const [baht, satang] = amountStr.split('.');
            return (
              <tr key={index} className="border-x border-black h-8">
                <td className="border-r border-black">{item.quantity}</td>
                <td className="border-r border-black text-left px-2">{item.product_name}</td>
                <td className="border-r border-black text-right px-2">{formatCurrency(item.unit_price, "").trim()}</td>
                <td className="border-r border-black text-right px-2">{baht}</td>
                <td className="w-8">{satang}</td>
              </tr>
            );
          })}
          {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-x border-black h-8">
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td></td>
            </tr>
          ))}
          <tr className="border border-black font-bold h-10 bg-gray-50">
            <td colSpan={3} className="border-r border-black px-4 text-center">
              {thaiBahtText(totalAmount)}
            </td>
            <td className="border-r border-black text-right px-2">
              {Math.floor(totalAmount).toString()}
            </td>
            <td>
              {((totalAmount % 1) * 100).toFixed(0).padStart(2, '0')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex justify-end pr-12">
        <div className="w-64 text-center">
          <div className="border-b border-black border-dashed h-8 mb-2"></div>
          <p className="text-sm">ผู้รับเงิน</p>
        </div>
      </div>
    </div>
  );
}
