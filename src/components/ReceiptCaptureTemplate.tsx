import { formatCurrency } from "@/lib/types";
import { thaiBahtText } from "@/lib/thaiBaht";

interface ReceiptCaptureTemplateProps {
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  invoiceNumber: string;
  dateString: string;
  employeeName: string;
  employeePosition: string;
  totalAmount: number;
  shopName: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
  payerName: string;
  receiverName: string;
  approverName: string;
  getSignatureUrl: (name: string, defaultName: string) => string;
}

export default function ReceiptCaptureTemplate({
  companyName,
  companyAddress,
  companyTaxId,
  invoiceNumber,
  dateString,
  employeeName,
  employeePosition,
  totalAmount,
  shopName,
  items,
  payerName,
  receiverName,
  approverName,
  getSignatureUrl,
}: ReceiptCaptureTemplateProps) {
  return (
    <div id="receipt-capture" className="p-10 font-sans border shadow-sm mx-auto my-0 flex flex-col" style={{ width: "794px", height: "fit-content", minHeight: "1040px", backgroundColor: "#ffffff", color: "#000000", borderColor: "#e5e7eb", boxSizing: "border-box" }}>
      <div className="text-sm font-bold leading-relaxed mb-6">
        <p>{companyName || "บริษัท โฮมออฟคราฟ จำกัด (สำนักงานใหญ่)"}</p>
        <p>{companyAddress || "เลขที่ 35 ถ.นิพัทธ์สงเคราะห์ 4 ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110"}</p>
        <p>{companyTaxId ? `เลขประจำตัวผู้เสียภาษี ${companyTaxId}` : "เลขประจำตัวผู้เสียภาษี 0905560005314"}</p>
      </div>

      <h1 className="text-2xl font-bold text-center mb-8">ใบรับรองแทนใบเสร็จรับเงิน</h1>

      <div className="flex justify-end mb-6">
        <div className="w-64">
          <div className="flex border-b mb-2 pb-1" style={{ borderColor: "#000000" }}>
            <span className="w-16 font-bold">เลขที่ :</span>
            <span>{invoiceNumber}</span>
          </div>
          <div className="flex border-b pb-1" style={{ borderColor: "#000000" }}>
            <span className="w-16 font-bold">วันที่ :</span>
            <span>{dateString}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-base mb-8">
        <div className="flex items-end">
          <span className="w-24 font-bold">ชื่อ :</span>
          <span className="flex-1 border-b text-center px-4" style={{ borderColor: "#000000" }}>{employeeName}</span>
        </div>
        <div className="flex items-end">
          <span className="w-24 font-bold">ตำแหน่ง :</span>
          <span className="flex-1 border-b text-center px-4" style={{ borderColor: "#000000" }}>{employeePosition}</span>
        </div>
        <div className="flex items-end">
          <span className="font-bold mr-4">ขอรับรองว่าได้จ่ายเงินจำนวน :</span>
          <span className="w-32 text-center border-b mr-4" style={{ borderColor: "#000000" }}>{formatCurrency(totalAmount, "").trim()} บาท</span>
          <span className="flex-1 text-center border-b" style={{ borderColor: "#000000" }}>({thaiBahtText(totalAmount)})</span>
        </div>
        <div className="flex">
          <span className="font-bold mr-4">ให้แก่ (ชื่อบุคคล/ร้านค้า/สถานที่ตั้ง) :</span>
          <span className="flex-1 border-b" style={{ borderColor: "#000000" }}>{shopName}</span>
        </div>
        <div className="flex">
          <span className="font-bold mr-4">โดยได้จ่ายไปในงานของทาง {companyName || "บริษัท โฮมออฟคราฟ จำกัด"} โดยแท้จริง</span>
          <span>ดังรายการต่อไปนี้</span>
        </div>
      </div>

      <table className="w-full text-base border-collapse border mb-2 text-center" style={{ borderColor: "#000000" }}>
        <thead>
          <tr className="border" style={{ borderColor: "#000000", backgroundColor: "#f9fafb" }}>
            <th className="border py-2 font-bold w-24" style={{ borderColor: "#000000" }}>วันที่จ่าย<br/>Date</th>
            <th className="border py-2 font-bold text-left px-2" style={{ borderColor: "#000000" }}>รายละเอียด<br/>Description</th>
            <th className="border py-2 font-bold w-20" style={{ borderColor: "#000000" }}>จำนวน<br/>Quantity</th>
            <th className="border py-2 font-bold w-28" style={{ borderColor: "#000000" }}>ราคาต่อหน่วย<br/>Unit Price</th>
            <th className="border py-2 font-bold w-24" style={{ borderColor: "#000000" }}>ส่วนลด<br/>Discount</th>
            <th className="border py-2 font-bold w-32" style={{ borderColor: "#000000" }}>จำนวนเงิน (บาท)<br/>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-x h-8" style={{ borderColor: "#000000" }}>
              <td className="border-r" style={{ borderColor: "#000000" }}>{index === 0 ? dateString : ""}</td>
              <td className="border-r text-left px-2" style={{ borderColor: "#000000" }}>{item.product_name}</td>
              <td className="border-r" style={{ borderColor: "#000000" }}>{item.quantity}</td>
              <td className="border-r text-right px-2" style={{ borderColor: "#000000" }}>{formatCurrency(item.unit_price, "").trim()}</td>
              <td className="border-r" style={{ borderColor: "#000000" }}>-</td>
              <td className="text-right px-2">{formatCurrency(item.quantity * item.unit_price, "").trim()}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-x h-8" style={{ borderColor: "#000000" }}>
              <td className="border-r" style={{ borderColor: "#000000" }}></td>
              <td className="border-r" style={{ borderColor: "#000000" }}></td>
              <td className="border-r" style={{ borderColor: "#000000" }}></td>
              <td className="border-r" style={{ borderColor: "#000000" }}></td>
              <td className="border-r" style={{ borderColor: "#000000" }}>-</td>
              <td></td>
            </tr>
          ))}
          
          <tr className="border font-bold h-10" style={{ borderColor: "#000000" }}>
            <td colSpan={2} className="border-r text-left px-2" style={{ borderColor: "#000000", backgroundColor: "#f9fafb" }}>รวมเงิน (ตัวอักษร)</td>
            <td colSpan={3} className="border-r text-center" style={{ borderColor: "#000000", backgroundColor: "#f9fafb" }}>{thaiBahtText(totalAmount)}</td>
            <td className="text-right px-2" style={{ backgroundColor: "#f9fafb" }}>{formatCurrency(totalAmount, "").trim()}</td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-3 gap-8 mt-12 text-center text-sm font-bold">
        <div>
          <p className="mb-2">ผู้จ่ายเงิน</p>
          <div className="h-16 flex items-end justify-center mb-1">
            <img src={getSignatureUrl(payerName, "signature_payer")} crossOrigin="anonymous" className="max-h-16 object-contain" alt="Payer Signature" />
          </div>
          <p className="border-b inline-block px-4 pb-1 mb-2 whitespace-nowrap min-w-[150px]" style={{ borderColor: "#000000" }}>
            {payerName ? `( ${payerName} )` : "\u00A0"}
          </p>
          <div>วันที่ <span className="border-b px-2" style={{ borderColor: "#000000" }}>{dateString}</span></div>
        </div>

        <div>
          <p className="mb-2">ผู้รับของ/บริการ</p>
          <div className="h-16 flex items-end justify-center mb-1">
            <img src={getSignatureUrl(receiverName, "signature_payer")} crossOrigin="anonymous" className="max-h-16 object-contain" alt="Receiver Signature" />
          </div>
          <p className="border-b inline-block px-4 pb-1 mb-2 whitespace-nowrap min-w-[150px]" style={{ borderColor: "#000000" }}>
            {receiverName ? `( ${receiverName} )` : "\u00A0"}
          </p>
          <div>วันที่ <span className="border-b px-2" style={{ borderColor: "#000000" }}>{dateString}</span></div>
        </div>

        <div>
          <p className="mb-2">ผู้อนุมัติ</p>
          <div className="h-16 flex items-end justify-center mb-1">
            <img src={getSignatureUrl(approverName, "signature_approver")} crossOrigin="anonymous" className="max-h-16 object-contain" alt="Approver Signature" />
          </div>
          <p className="border-b inline-block px-4 pb-1 mb-2 whitespace-nowrap min-w-[150px]" style={{ borderColor: "#000000" }}>
            {approverName ? `( ${approverName} )` : "\u00A0"}
          </p>
          <div>วันที่ <span className="border-b px-2" style={{ borderColor: "#000000" }}>{dateString}</span></div>
        </div>
      </div>

      <div className="mt-12 text-sm font-bold">
        <span className="underline mr-4">หมายเหตุ</span>
        <div className="inline-block align-top">
          <p>- แนบสำเนาบัตรประจำตัวประชาชนผู้รับเงิน (ซึ่งเป็นผู้ประกอบอาชีพขายสินค้า/ให้บริการ)</p>
          <p>- แนบหลักฐานประกอบการจ่ายเงิน (กรณีไม่ได้จ่ายเงินสด)</p>
        </div>
      </div>
    </div>
  );
}
