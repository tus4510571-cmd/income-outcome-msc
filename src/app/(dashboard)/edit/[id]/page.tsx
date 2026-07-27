"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateTransaction, updateReceiptItems, getTransactionById } from "@/lib/actions";
import { CURRENCY_OPTIONS, type ReceiptItem } from "@/lib/types";
import ReceiptGenerator from "@/components/ReceiptGenerator";

export default function EditTransactionPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [transactionType, setTransactionType] = useState<"income" | "outcome" | null>(null);
  const [category, setCategory] = useState("");
  
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  
  // Specific fields
  const [shopName, setShopName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [source, setSource] = useState("");
  const [paymentGateway, setPaymentGateway] = useState("");
  const [customGateway, setCustomGateway] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [depositInfo, setDepositInfo] = useState("");

  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [hasReceiptItems, setHasReceiptItems] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const tx = await getTransactionById(id);

      if (!tx || tx.user_id !== session.user.id) {
        setError("ไม่พบข้อมูลรายการ");
        setLoading(false);
        return;
      }

      setTransactionType(tx.type);
      setCategory(tx.category);
      setAmount(tx.amount.toString());
      setCurrency(tx.currency);
      setDate(tx.transaction_date);
      setDescription(tx.description || "");

      if (tx.type === "outcome") {
        setShopName(tx.expense_detail?.[0]?.shop_name || "");
        setEmployeeName(tx.expense_detail?.[0]?.employee_name || "");
      } else {
        setCustomerName(tx.income_detail?.[0]?.customer_name || "");
        setSource(tx.income_detail?.[0]?.source || tx.category);
        
        const pg = tx.income_detail?.[0]?.payment_gateway || "";
        const GATEWAYS = ["Lian Lian Pay", "Ksher Payment (Tus)", "Stripe (Tus)", "K Shop (May)"];
        if (pg && !GATEWAYS.includes(pg)) {
          setPaymentGateway("Other");
          setCustomGateway(pg);
        } else {
          setPaymentGateway(pg);
        }
        setInvoiceRef(tx.income_detail?.[0]?.invoice_ref || "");
        setDepositInfo(tx.income_detail?.[0]?.deposit_info || "");
      }

      if (tx.receipt_items && tx.receipt_items.length > 0) {
        setItems(tx.receipt_items);
        setHasReceiptItems(true);
      } else if (tx.category === "shop_without_receipt" || tx.type === "income") {
        // Some types might have an empty list but the UI should show the generator
        setHasReceiptItems(true);
      }

      setLoading(false);
    }

    loadData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const finalGateway = paymentGateway === "Other" ? customGateway : paymentGateway;
      
      await updateTransaction(id, {
        amount: parseFloat(amount) || 0,
        currency,
        transaction_date: date,
        description,
        shop_name: shopName,
        employee_name: employeeName,
        customer_name: customerName,
        source: source,
        payment_gateway: finalGateway || undefined,
        invoice_ref: invoiceRef || undefined,
        deposit_info: depositInfo || undefined,
      });

      if (hasReceiptItems) {
        await updateReceiptItems(
          id,
          items.map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            currency: item.currency || currency,
          }))
        );
      }

      // Determine back URL
      let backUrl = `/${transactionType}/${category.replace(/_/g, "-")}/${id}`;
      router.push(backUrl);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex justify-center items-center">
        <p className="text-slate-500">กำลังโหลด...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-indigo-600 mb-2 inline-block">
            ← กลับ
          </button>
          <h1 className="text-2xl font-bold text-slate-800">แก้ไขรายการ</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {/* Specific Fields depending on type */}
          {transactionType === "outcome" && (category === "shop_with_receipt" || category === "shop_without_receipt") && (
            <div>
              <label className="label">ชื่อร้านค้า</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="input-field"
                required
              />
            </div>
          )}

          {transactionType === "outcome" && category === "employee_labor" && (
            <div>
              <label className="label">ชื่อพนักงาน</label>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="input-field"
                required
              />
            </div>
          )}

          {transactionType === "income" && (
            <div>
              <label className="label">ชื่อลูกค้า</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-field"
                placeholder="ไม่ระบุ"
              />
            </div>
          )}

          {transactionType === "income" && category === "payment_link" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Payment Gateway</label>
                  <select
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="input-field"
                  >
                    <option value="">เลือก Payment Gateway</option>
                    {["Lian Lian Pay", "Ksher Payment (Tus)", "Stripe (Tus)", "K Shop (May)", "Other"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                {paymentGateway === "Other" && (
                  <div>
                    <label className="label">ระบุ Payment Gateway</label>
                    <input
                      type="text"
                      value={customGateway}
                      onChange={(e) => setCustomGateway(e.target.value)}
                      className="input-field"
                      placeholder="พิมพ์ชื่อ Gateway"
                      required
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="label">เลขที่ใบ Invoice หรือ Quotation</label>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  className="input-field"
                  placeholder="กรอกเลขที่เอกสารอ้างอิง"
                />
              </div>
              <div>
                <label className="label">มัดจำ งวดที่ / เปอร์เซ็นต์ (%)</label>
                <input
                  type="text"
                  value={depositInfo}
                  onChange={(e) => setDepositInfo(e.target.value)}
                  className="input-field"
                  placeholder="เช่น งวดที่ 1 (50%)"
                />
              </div>
            </>
          )}

          <div>
            <label className="label">รายละเอียด</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">จำนวนเงิน</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                step="0.01"
                required
                disabled={hasReceiptItems} // If has receipt items, amount is calculated from items
              />
            </div>
            <div>
              <label className="label">สกุลเงิน</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-field"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {hasReceiptItems && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">รายการสินค้า/บริการ</h3>
              <ReceiptGenerator onChange={setItems} initialItems={items} />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full mt-6">
            {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </form>
      </div>
    </main>
  );
}
