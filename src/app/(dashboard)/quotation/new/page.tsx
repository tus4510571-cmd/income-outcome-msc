"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SellerType = "company_th" | "company_en" | "person1_th" | "person1_en" | "person2_th" | "person2_en";

export default function NewQuotationPage() {
  const router = useRouter();
  
  const [seller, setSeller] = useState<SellerType>("company_th");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  
  const [workingPeriod, setWorkingPeriod] = useState("");
  const [workingPeriodUnit, setWorkingPeriodUnit] = useState("Days");
  
  const [paymentTerms, setPaymentTerms] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  
  // Products state (will be expanded later for Shopify integration)
  const [products, setProducts] = useState<any[]>([]);

  // Generate ID on load
  const [quotationId] = useState(() => {
    const now = new Date();
    const ddmmyy = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return `001-${ddmmyy}/${now.getDate()} ${time}`;
  });

  const getSellerDetails = () => {
    switch (seller) {
      case "company_th":
        return {
          name: "บริษัท โฮมออฟคราฟ จำกัด",
          address: "35 ถนนนิพัทธ์สงเคราะห์ 4 ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110",
          tax: "0905560005314"
        };
      case "company_en":
        return {
          name: "Home of craft company limited",
          address: "35 Niphatsongkrow 4 rd, Hatyai Songkhla 90110",
          tax: "0905560005314"
        };
      case "person1_th":
        return {
          name: "นางสาวเมทินี รัตนไชย",
          address: "35 ถนนนิพัทธ์สงเคราะห์ 4 ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110",
          tax: "1 9098 000 20 837"
        };
      case "person1_en":
        return {
          name: "Mathinee Ratanachai",
          address: "35 Niphatsongkrow 4 rd, Hatyai Songkhla 90110",
          tax: "1 9098 000 20 837"
        };
      case "person2_th":
        return {
          name: "นายเศรษฐวิทย์ ด่านวรพงศ์",
          address: "35 ถนนนิพัทธ์สงเคราะห์ 4 ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110",
          tax: "3 9098 000 65 691"
        };
      case "person2_en":
        return {
          name: "Saethawit Danworapong",
          address: "35 Niphatsongkrow 4 rd, Hatyai Songkhla 90110",
          tax: "3 9098 000 65 691"
        };
    }
  };

  const currentSeller = getSellerDetails();

  return (
    <main className="min-h-screen p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">สร้างใบเสนอราคาใหม่</h1>
            <p className="text-slate-500 mt-1">เลขที่เอกสาร: <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{quotationId}</span></p>
          </div>
          <Link href="/quotation" className="btn-outline px-4 py-2 text-sm">
            ยกเลิก
          </Link>
        </div>

        <div className="space-y-6">
          {/* 1. Seller Info */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">1. ข้อมูลผู้จัดจำหน่าย (Seller)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">เลือกผู้ขาย</label>
                <select 
                  className="input-field"
                  value={seller}
                  onChange={(e) => setSeller(e.target.value as SellerType)}
                >
                  <option value="company_th">บริษัท โฮมออฟคราฟ จำกัด (TH)</option>
                  <option value="company_en">Home of craft company limited (EN)</option>
                  <option value="person1_th">นางสาวเมทินี รัตนไชย (TH)</option>
                  <option value="person1_en">Mathinee Ratanachai (EN)</option>
                  <option value="person2_th">นายเศรษฐวิทย์ ด่านวรพงศ์ (TH)</option>
                  <option value="person2_en">Saethawit Danworapong (EN)</option>
                </select>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600">
              <p className="font-bold text-slate-800">{currentSeller.name}</p>
              <p>{currentSeller.address}</p>
              <p>Tax ID: {currentSeller.tax}</p>
            </div>
          </div>

          {/* 2. Customer Info */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">2. ข้อมูลลูกค้า (Customer)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">ชื่อลูกค้า / บริษัท</label>
                <input type="text" className="input-field" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="label">ที่อยู่</label>
                <textarea className="input-field" rows={2} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}></textarea>
              </div>
              <div>
                <label className="label">เบอร์โทรศัพท์ (ไม่บังคับ)</label>
                <input type="text" className="input-field" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <label className="label">เลขประจำตัวผู้เสียภาษี (ไม่บังคับ)</label>
                <input type="text" className="input-field" value={customerTaxId} onChange={e => setCustomerTaxId(e.target.value)} />
              </div>
            </div>
          </div>

          {/* 3. Products */}
          <div className="card">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold">3. รายการสินค้า (Products)</h2>
              <button className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2">
                <span className="text-lg leading-none">+</span> Choose from Shopify
              </button>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                ยังไม่มีรายการสินค้า กดปุ่ม Choose เพื่อเพิ่มสินค้า
              </div>
            ) : (
              <div>{/* Product list will render here */}</div>
            )}
          </div>

          {/* 4 & 5. Terms */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">4. เงื่อนไขและข้อตกลง (Terms)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">ระยะเวลาการทำงาน (Lead time)</label>
                <div className="flex gap-2">
                  <input type="number" className="input-field" placeholder="e.g. 3-4" value={workingPeriod} onChange={e => setWorkingPeriod(e.target.value)} />
                  <select className="input-field w-32" value={workingPeriodUnit} onChange={e => setWorkingPeriodUnit(e.target.value)}>
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                  </select>
                </div>
                {workingPeriod && <p className="text-xs text-slate-500 mt-2">Preview: Lead time is normally {workingPeriod} {workingPeriodUnit.toLowerCase()}.</p>}
              </div>
              
              <div>
                <label className="label">เงื่อนไขการชำระเงิน (Payment Terms)</label>
                <textarea className="input-field" rows={3} placeholder="e.g. 60% deposit, 40% before delivery" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}></textarea>
                <p className="text-xs text-slate-500 mt-2">พิมพ์เงื่อนไขเป็นภาษาอังกฤษ (เช่น In order to proceed the order...)</p>
              </div>
            </div>
          </div>

          {/* 6. Payment Method */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">5. วิธีการชำระเงิน (Payment Method)</h2>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="payment" value="bank" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="w-4 h-4 text-indigo-600" />
                <span>โอนเงินผ่านธนาคาร (Bank Transfer)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="payment" value="link" checked={paymentMethod === 'link'} onChange={() => setPaymentMethod('link')} className="w-4 h-4 text-indigo-600" />
                <span>ลิงก์ชำระเงิน (Payment Link)</span>
              </label>
            </div>

            {paymentMethod === 'bank' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="label text-xs">ธนาคาร (Bank Name)</label>
                  <input type="text" className="input-field text-sm" placeholder="Kasikorn Bank" />
                </div>
                <div>
                  <label className="label text-xs">ชื่อบัญชี (Account Name)</label>
                  <input type="text" className="input-field text-sm" placeholder="Home of Craft Co., Ltd." />
                </div>
                <div>
                  <label className="label text-xs">เลขที่บัญชี (Account No.)</label>
                  <input type="text" className="input-field text-sm" placeholder="032-3-354-472" />
                </div>
                <div>
                  <label className="label text-xs">SWIFT Code (ถ้ามี)</label>
                  <input type="text" className="input-field text-sm" placeholder="" />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="label text-xs">ระบุลิงก์หรืออีเมลสำหรับชำระเงิน (เช่น Stripe, PayPal)</label>
                <input type="text" className="input-field text-sm" placeholder="Stripe: craftymastershop@gmail.com" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 lg:left-72 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <p className="text-sm text-slate-500 hidden sm:block">ตรวจสอบข้อมูลให้ครบถ้วนก่อนบันทึก</p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button className="btn-outline flex-1 sm:flex-none">บันทึกแบบร่าง</button>
            <button className="btn-primary flex-1 sm:flex-none shadow-lg shadow-indigo-200">สร้างใบเสนอราคา (PDF)</button>
          </div>
        </div>
      </div>
    </main>
  );
}
