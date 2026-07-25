import { thaiBahtText } from "@/lib/thaiBaht";
import { formatCurrency } from "@/lib/types";

interface EmployeeReceiptGeneratorProps {
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  employeeName: string;
  employeeAddress: string;
  employeeTaxId: string;
  dateString: string;
  jobDescription: string;
  amountBeforeTax: number;
  taxAmount: number;
  amountAfterTax: number;
}

export default function EmployeeReceiptGenerator({
  companyName,
  companyAddress,
  companyTaxId,
  employeeName,
  employeeAddress,
  employeeTaxId,
  dateString,
  jobDescription,
  amountBeforeTax,
  taxAmount,
  amountAfterTax,
}: EmployeeReceiptGeneratorProps) {
  return (
    <div id="receipt-capture" className="p-10 font-sans w-[800px] border shadow-sm mx-auto my-0 bg-white text-black text-sm" style={{ minHeight: "1000px", borderColor: "#e5e7eb" }}>
      
      {/* Top Left Company Info */}
      <div className="mb-6">
        <h2 className="font-bold">{companyName}</h2>
        <p>{companyAddress}</p>
        <p>เลขประจำตัวผู้เสียภาษี {companyTaxId}</p>
      </div>

      <h1 className="text-2xl font-bold text-center mb-8">ใบสำคัญรับเงิน</h1>

      {/* Header Info */}
      <div className="flex justify-end mb-4">
        <div className="w-64 space-y-2">
          <div className="flex">
            <span className="w-16">เลขที่</span>
            <span className="flex-1 border-b border-black border-dashed px-2"></span>
          </div>
          <div className="flex">
            <span className="w-16">วันที่</span>
            <span className="flex-1 border-b border-black border-dashed px-2 text-center">{dateString}</span>
          </div>
        </div>
      </div>

      {/* Employee Info */}
      <div className="mb-6 space-y-3 leading-relaxed">
        <div className="flex items-center">
          <span className="w-20">ข้าพเจ้า</span>
          <span className="flex-1 border-b border-black border-dashed px-2">{employeeName}</span>
          <span className="w-48 text-center">(ผู้ขายสินค้า/ให้บริการ/รับว่าจ้าง)</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-32">เลขประจำตัวผู้เสียภาษี</span>
          <span className="w-48 border-b border-black border-dashed px-2 text-center">{employeeTaxId}</span>
          <span className="w-24 text-center">อยู่บ้านเลขที่</span>
          <span className="flex-1 border-b border-black border-dashed px-2">{employeeAddress}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-36">ได้รับเงินจาก</span>
          <span className="flex-1 border-b border-black border-dashed px-2">{companyName}</span>
          <span className="w-64 text-right">(ผู้ซื้อ/ผู้รับบริการ/ผู้ว่าจ้างดังรายการต่อไปนี้)</span>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm border-collapse border border-black mb-12 text-center mt-4">
        <thead>
          <tr className="border border-black bg-gray-50 h-10">
            <th className="border border-black w-16">ลำดับ</th>
            <th className="border border-black">รายการ</th>
            <th className="border border-black w-20">จำนวน</th>
            <th className="border border-black w-32">ราคาต่อหน่วย</th>
            <th className="border border-black w-32">จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: Income */}
          <tr className="border-x border-black h-10">
            <td className="border-r border-black">1</td>
            <td className="border-r border-black text-left px-4">{jobDescription}</td>
            <td className="border-r border-black">1</td>
            <td className="border-r border-black text-right px-4">{formatCurrency(amountBeforeTax, "")}</td>
            <td className="border-r border-black text-right px-4">{formatCurrency(amountBeforeTax, "")}</td>
          </tr>
          
          {/* Row 2: Tax deduction */}
          <tr className="border-x border-black h-10 text-red-600">
            <td className="border-r border-black text-black">2</td>
            <td className="border-r border-black text-left px-4 text-black">หักภาษี ณ ที่จ่าย 3%</td>
            <td className="border-r border-black text-black">1</td>
            <td className="border-r border-black text-right px-4">-{formatCurrency(taxAmount, "")}</td>
            <td className="border-r border-black text-right px-4">-{formatCurrency(taxAmount, "")}</td>
          </tr>

          {/* Empty rows filler */}
          {Array.from({ length: 12 }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-x border-black h-8">
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
            </tr>
          ))}

          {/* Total Row */}
          <tr className="border border-black h-10">
            <td colSpan={2} className="border-r border-black px-4 text-center font-bold bg-gray-50">
              {thaiBahtText(amountAfterTax)}
            </td>
            <td colSpan={2} className="border-r border-black text-right px-4 font-bold">รวม</td>
            <td className="border-r border-black text-right px-4 font-bold bg-gray-50">
              {formatCurrency(amountAfterTax, "")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div className="flex justify-between px-10 mt-12 mb-8">
        <div className="w-64">
          <div className="flex items-end mb-6">
            <span className="w-12">ลงชื่อ</span>
            <span className="flex-1 border-b border-black border-dashed"></span>
            <span className="w-16 text-right">ผู้รับเงิน</span>
          </div>
          <div className="flex items-end">
            <span className="w-12">ลงชื่อ</span>
            <span className="flex-1 border-b border-black border-dashed"></span>
            <span className="w-16 text-right">ผู้จ่ายเงิน</span>
          </div>
        </div>
        
        <div className="w-48">
          <div className="flex items-end mb-6">
            <span className="w-12">วันที่</span>
            <span className="flex-1 border-b border-black border-dashed"></span>
          </div>
          <div className="flex items-end">
            <span className="w-12">วันที่</span>
            <span className="flex-1 border-b border-black border-dashed"></span>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="mt-12 text-xs space-y-1">
        <p className="font-bold">หมายเหตุ :</p>
        <p>- แนบสำเนาบัตรประจำตัวประชาชนผู้รับเงิน (ซึ่งเป็นผู้ประกอบอาชีพขายสินค้า/ให้บริการอย่างแท้จริง)</p>
        <p>- แนบหลักฐานประกอบการจ่ายเงิน (กรณีไม่ได้จ่ายเงินสด)</p>
      </div>

    </div>
  );
}
