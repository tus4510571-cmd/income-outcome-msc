"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSetting } from "@/lib/actions";
import EmployeeReceiptGenerator from "@/components/EmployeeReceiptGenerator";

const jobTypes = [
  "พนักงาน PC",
  "จ้างขนของ",
  "จ้าง Part Time ทำ content",
  "จ้าง Part Time ทำ Billing",
  "อื่นๆ"
];

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatThaiDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr) return "";
  
  const start = new Date(startDateStr);
  const startDay = start.getDate();
  const startMonth = thaiMonths[start.getMonth()];
  const startYear = start.getFullYear() + 543;

  if (!endDateStr || startDateStr === endDateStr) {
    return `${startDay} ${startMonth} ${startYear}`;
  }

  const end = new Date(endDateStr);
  const endDay = end.getDate();
  const endMonth = thaiMonths[end.getMonth()];
  const endYear = end.getFullYear() + 543;

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth} ${startYear}`;
  } else if (startYear === endYear) {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
  } else {
    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  }
}

export default function CreateEmployeeReceiptPage() {
  const router = useRouter();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");

  const [employeeName, setEmployeeName] = useState("");
  const [nickname, setNickname] = useState("");
  const [employeeAddress, setEmployeeAddress] = useState("");
  const [employeeHouseNo, setEmployeeHouseNo] = useState("");
  const [employeeStreet, setEmployeeStreet] = useState("");
  const [employeeSubdistrict, setEmployeeSubdistrict] = useState("");
  const [employeeDistrict, setEmployeeDistrict] = useState("");
  const [employeeProvince, setEmployeeProvince] = useState("");
  const [employeeTaxId, setEmployeeTaxId] = useState("");
  
  const [jobType, setJobType] = useState("");
  const [jobTypeOther, setJobTypeOther] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  
  const [amountBeforeTax, setAmountBeforeTax] = useState<number | "">("");
  
  const [taxRateType, setTaxRateType] = useState<"3" | "1" | "other" | "0">("3");
  const [customTaxRate, setCustomTaxRate] = useState<string>("");
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const cName = await getSetting("company_name");
      const cAddress = await getSetting("company_address");
      const cTaxId = await getSetting("company_tax_id");
      if (cName) setCompanyName(cName);
      if (cAddress) setCompanyAddress(cAddress);
      if (cTaxId) setCompanyTaxId(cTaxId);
    } catch (e) {
      console.error(e);
    }
  };

  const amountBeforeTaxNum = Number(amountBeforeTax) || 0;
  
  let taxRate = 0;
  if (taxRateType === "3") taxRate = 3;
  else if (taxRateType === "1") taxRate = 1;
  else if (taxRateType === "other") taxRate = Number(customTaxRate) || 0;

  const taxAmount = amountBeforeTaxNum * (taxRate / 100);
  const amountAfterTax = amountBeforeTaxNum - taxAmount;
  const dateText = formatThaiDateRange(startDate, endDate);

  const finalJobType = jobType === "อื่นๆ" ? jobTypeOther : jobType;

  const handleSaveAndPrint = async () => {
    setError("");
    
    if (!employeeName || !nickname || !jobType || !jobDescription || !amountBeforeTax || !startDate || !endDate) {
      setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }
    if (jobType === "อื่นๆ" && !jobTypeOther) {
      setError("กรุณาระบุประเภทการจ้างงาน");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น");
      return;
    }

    setSaving(true);
    try {
      // Save to Supabase
      const fullAddress = [
        employeeHouseNo ? `บ้านเลขที่ ${employeeHouseNo}` : "",
        employeeStreet ? `ถนน ${employeeStreet}` : "",
        employeeSubdistrict ? `ตำบล/แขวง ${employeeSubdistrict}` : "",
        employeeDistrict ? `อำเภอ/เขต ${employeeDistrict}` : "",
        employeeProvince ? `จังหวัด ${employeeProvince}` : "",
      ].filter(Boolean).join(" ") || employeeAddress;

      const { error: insertError } = await supabase
        .from("employee_receipts")
        .insert({
          employee_name: employeeName,
          nickname: nickname,
          employee_address: fullAddress,
          employee_tax_id: employeeTaxId,
          job_type: finalJobType,
          job_description: jobDescription,
          amount_before_tax: amountBeforeTaxNum,
          amount_after_tax: amountAfterTax,
          start_date: startDate,
          end_date: endDate,
          date_text: dateText,
          status: "PENDING"
        });

      if (insertError) throw insertError;

      setSaved(true);
      
      // Print
      setTimeout(() => {
        window.print();
        router.push("/outcome/employee-labor");
      }, 500);

    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      {/* Hide this section when printing */}
      <div className="max-w-4xl mx-auto print:hidden">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
            ← กลับ
          </button>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-6">สร้างใบสำคัญรับเงิน</h1>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">ข้อมูลผู้รับเงิน (พนักงาน)</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">ชื่อพนักงาน <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={employeeName} 
                      onChange={e => setEmployeeName(e.target.value)} 
                      placeholder="เช่น นายสมชาย ใจดี"
                    />
                  </div>
                  <div>
                    <label className="label">ชื่อเล่น <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={nickname} 
                      onChange={e => setNickname(e.target.value)} 
                      placeholder="เช่น บอย"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">เลขประจำตัวผู้เสียภาษี (ไม่บังคับ)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={employeeTaxId} 
                    onChange={e => setEmployeeTaxId(e.target.value)} 
                    placeholder="เลขบัตร ปชช 13 หลัก"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">ที่อยู่ (ไม่บังคับ)</label>
                    <span className="text-xs text-slate-400">แยกตามช่องในใบสำคัญรับเงิน</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">บ้านเลขที่</label>
                      <input 
                        type="text" 
                        className="input-field text-sm" 
                        value={employeeHouseNo} 
                        onChange={e => setEmployeeHouseNo(e.target.value)} 
                        placeholder="เช่น 123/45"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">ถนน</label>
                      <input 
                        type="text" 
                        className="input-field text-sm" 
                        value={employeeStreet} 
                        onChange={e => setEmployeeStreet(e.target.value)} 
                        placeholder="เช่น สุขุมวิท"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">ตำบลหรือแขวง</label>
                      <input 
                        type="text" 
                        className="input-field text-sm" 
                        value={employeeSubdistrict} 
                        onChange={e => setEmployeeSubdistrict(e.target.value)} 
                        placeholder="เช่น คลองเตย"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">อำเภอหรือเขต</label>
                      <input 
                        type="text" 
                        className="input-field text-sm" 
                        value={employeeDistrict} 
                        onChange={e => setEmployeeDistrict(e.target.value)} 
                        placeholder="เช่น คลองเตย"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">จังหวัด</label>
                    <input 
                      type="text" 
                      className="input-field text-sm" 
                      value={employeeProvince} 
                      onChange={e => setEmployeeProvince(e.target.value)} 
                      placeholder="เช่น กรุงเทพมหานคร"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-t-4 border-blue-500">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">รายละเอียดการจ้างงาน</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">การจ้างงาน <span className="text-red-500">*</span></label>
                  <div className="space-y-2 mt-2">
                    {jobTypes.map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="jobType" 
                          value={type}
                          checked={jobType === type}
                          onChange={e => setJobType(e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                    {jobType === "อื่นๆ" && (
                      <input 
                        type="text"
                        className="input-field mt-2"
                        value={jobTypeOther}
                        onChange={e => setJobTypeOther(e.target.value)}
                        placeholder="ระบุการจ้างงานอื่นๆ"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">รายละเอียดการจ้างงาน <span className="text-red-500">*</span></label>
                  <div className="text-xs text-slate-500 mb-1">(เช่น จ้างขนของไปไบเทค / จ้าง pc งาน craft bangkok 2026 / จ้างสอนทำ workshop ที่ central ชิดลม เป็นต้น)</div>
                  <textarea 
                    className="input-field min-h-[80px]" 
                    value={jobDescription} 
                    onChange={e => setJobDescription(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">วันเริ่มต้น <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="label">วันสิ้นสุด <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={endDate} 
                      onChange={e => {
                        setEndDate(e.target.value);
                        if (!startDate) setStartDate(e.target.value);
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-t-4 border-emerald-500">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">การจ่ายเงิน</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">จำนวนเงินที่จ้าง (ก่อนหักภาษี) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="input-field pr-12 font-bold text-lg" 
                      value={amountBeforeTax} 
                      onChange={e => setAmountBeforeTax(e.target.value ? Number(e.target.value) : "")} 
                      placeholder="0.00"
                    />
                    <div className="absolute right-4 top-3 text-slate-400 font-bold">บาท</div>
                  </div>
                </div>

                <div>
                  <label className="label">อัตราภาษีหัก ณ ที่จ่าย <span className="text-red-500">*</span></label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="taxRate" value="3" checked={taxRateType === "3"} onChange={() => setTaxRateType("3")} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-medium">3%</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="taxRate" value="1" checked={taxRateType === "1"} onChange={() => setTaxRateType("1")} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-medium">1%</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="taxRate" value="0" checked={taxRateType === "0"} onChange={() => setTaxRateType("0")} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-medium">ไม่หัก (0%)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="taxRate" value="other" checked={taxRateType === "other"} onChange={() => setTaxRateType("other")} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-medium">อื่นๆ</span>
                    </label>
                  </div>
                  {taxRateType === "other" && (
                    <div className="mt-2 flex items-center gap-2">
                      <input type="number" className="input-field max-w-[100px]" value={customTaxRate} onChange={e => setCustomTaxRate(e.target.value)} placeholder="0.00" />
                      <span className="text-slate-500 font-medium">%</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex justify-between items-center text-sm text-emerald-700 mb-1">
                    <span>หักภาษี ณ ที่จ่าย {taxRate}%</span>
                    <span>{taxAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg text-emerald-900 mt-2 pt-2 border-t border-emerald-200">
                    <span>คงเหลือเงินที่ต้องจ่ายสุทธิ</span>
                    <span>{amountAfterTax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท</span>
                  </div>
                  <div className="text-xs text-emerald-600 mt-1 text-right">
                    * ระบบคำนวณให้อัตโนมัติ
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveAndPrint}
              disabled={saving || saved}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                saving || saved ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  กำลังบันทึก...
                </>
              ) : saved ? (
                "บันทึกสำเร็จ กำลังเปิดหน้าต่างพิมพ์..."
              ) : (
                "Save and print as PDF"
              )}
            </button>
            <div className="text-center text-sm text-slate-500">
              ระบบจะเซฟข้อมูลและเปิดหน้าต่างสั่งพิมพ์ (หรือ Save as PDF)
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:sticky lg:top-8 self-start">
            <h2 className="text-lg font-bold mb-4 text-slate-800">ตัวอย่างเอกสารที่จะถูกสร้าง</h2>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex justify-center p-4" style={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
              <EmployeeReceiptGenerator 
                companyName={companyName}
                companyAddress={companyAddress}
                companyTaxId={companyTaxId}
                employeeName={employeeName || "ชื่อพนักงาน"}
                employeeAddress={employeeAddress}
                employeeHouseNo={employeeHouseNo}
                employeeStreet={employeeStreet}
                employeeSubdistrict={employeeSubdistrict}
                employeeDistrict={employeeDistrict}
                employeeProvince={employeeProvince}
                employeeTaxId={employeeTaxId || "เลขประจำตัวผู้เสียภาษี"}
                dateString={dateText || "วันที่"}
                jobDescription={jobDescription || "รายละเอียดการจ้างงาน"}
                amountBeforeTax={amountBeforeTaxNum}
                taxAmount={taxAmount}
                amountAfterTax={amountAfterTax}
                taxRate={taxRate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Print-only section */}
      <div className="hidden print:block">
        <EmployeeReceiptGenerator 
          companyName={companyName}
          companyAddress={companyAddress}
          companyTaxId={companyTaxId}
          employeeName={employeeName}
          employeeAddress={employeeAddress}
          employeeHouseNo={employeeHouseNo}
          employeeStreet={employeeStreet}
          employeeSubdistrict={employeeSubdistrict}
          employeeDistrict={employeeDistrict}
          employeeProvince={employeeProvince}
          employeeTaxId={employeeTaxId}
          dateString={dateText}
          jobDescription={jobDescription}
          amountBeforeTax={amountBeforeTaxNum}
          taxAmount={taxAmount}
          amountAfterTax={amountAfterTax}
          taxRate={taxRate}
        />
      </div>
    </main>
  );
}
