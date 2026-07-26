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
  taxRate: number;
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
  taxRate,
}: EmployeeReceiptGeneratorProps) {
  return (
    <div id="receipt-capture" className="p-8 font-sans border border-black mx-auto my-0 bg-white text-black text-sm flex flex-col" style={{ width: "794px", height: "1040px", minHeight: "1040px", boxSizing: "border-box" }}>
      
      {/* Top Left Company Info */}
      <div className="mb-4 text-xs font-bold leading-relaxed">
        <p>{companyName}</p>
        <p>เลขที่ {companyAddress}</p>
        <p>เลขประจำตัวผู้เสียภาษี {companyTaxId}</p>
      </div>

      <h1 className="text-2xl font-bold text-center mb-8">ใบสำคัญรับเงิน</h1>

      {/* Header Info */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-3">
          <div className="flex items-end">
            <span className="w-16">เลขที่</span>
            <span className="flex-1 border-b border-black border-dashed px-2 pb-1"></span>
          </div>
          <div className="flex items-end">
            <span className="w-16">วันที่</span>
            <span className="flex-1 border-b border-black border-dashed px-2 pb-1 text-center">{dateString}</span>
          </div>
        </div>
      </div>

      {/* Employee Info */}
      <div className="mb-6 space-y-4 leading-relaxed text-[13px]">
        <div className="flex items-end">
          <span className="w-20 pl-4">ข้าพเจ้า</span>
          <span className="flex-1 border-b border-black border-dashed px-2 pb-1 text-center">{employeeName}</span>
          <span className="w-48 text-right">(ผู้ขายสินค้า/ให้บริการ/รับว่าจ้าง)</span>
        </div>
        
        <div className="flex items-end">
          <span className="w-36">เลขประจำตัวผู้เสียภาษี</span>
          <span className="w-48 border-b border-black border-dashed px-2 pb-1 text-center">{employeeTaxId}</span>
          <span className="w-24 text-center">อยู่บ้านเลขที่</span>
          <span className="w-40 border-b border-black border-dashed px-2 pb-1 text-center">{employeeAddress}</span>
          <span className="w-12 text-center">หมู่</span>
          <span className="flex-1 border-b border-black border-dashed px-2 pb-1"></span>
        </div>

        <div className="flex items-end">
          <span className="w-16 pl-4">ถนน</span>
          <span className="flex-1 border-b border-black border-dashed px-2 pb-1 text-center"></span>
          <span className="w-24 text-center">แขวง/ตำบล</span>
          <span className="w-40 border-b border-black border-dashed px-2 pb-1 text-center"></span>
          <span className="w-24 text-center">เขต/อำเภอ</span>
          <span className="flex-1 border-b border-black border-dashed px-2 pb-1"></span>
        </div>

        <div className="flex items-end">
          <span className="w-16 pl-2">จังหวัด</span>
          <span className="flex-1 border-b border-black border-dashed px-2 pb-1 text-center"></span>
          <span className="w-16 text-center">โทร</span>
          <span className="flex-1 border-b border-black border-dashed px-2 pb-1 text-center"></span>
        </div>
        
        <div className="flex items-end">
          <span className="w-24">ได้รับเงินจาก</span>
          <span className="w-64 border-b border-black border-dashed px-2 pb-1 text-center"></span>
          <span className="w-48 text-center whitespace-nowrap">ในนามบริษัท {companyName}</span>
          <span className="flex-1 text-right whitespace-nowrap">(ผู้ซื้อ/ผู้รับบริการ/ผู้ว่าจ้าง ดังรายการต่อไปนี้)</span>
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
          {taxRate > 0 && (
            <tr className="border-x border-black h-10 text-red-600">
              <td className="border-r border-black text-black">2</td>
              <td className="border-r border-black text-left px-4 text-black">หักภาษี ณ ที่จ่าย {taxRate}%</td>
              <td className="border-r border-black text-black">1</td>
              <td className="border-r border-black text-right px-4">-{formatCurrency(taxAmount, "")}</td>
              <td className="border-r border-black text-right px-4">-{formatCurrency(taxAmount, "")}</td>
            </tr>
          )}

          {/* Empty rows filler */}
          {Array.from({ length: taxRate > 0 ? 12 : 13 }).map((_, i) => (
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
            <span className="flex-1 border-b border-black border-dashed pb-1"></span>
            <span className="w-16 text-right">ผู้รับเงิน</span>
          </div>
          <div className="flex items-end">
            <span className="w-12">ลงชื่อ</span>
            <span className="flex-1 border-b border-black border-dashed pb-1"></span>
            <span className="w-16 text-right">ผู้จ่ายเงิน</span>
          </div>
        </div>
        
        <div className="w-48">
          <div className="flex items-end mb-6">
            <span className="w-12">วันที่</span>
            <span className="flex-1 border-b border-black border-dashed pb-1"></span>
          </div>
          <div className="flex items-end">
            <span className="w-12">วันที่</span>
            <span className="flex-1 border-b border-black border-dashed pb-1"></span>
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
