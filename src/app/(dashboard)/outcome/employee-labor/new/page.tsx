"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import { createTransaction } from "@/lib/actions";

export default function NewEmployeeLaborPage() {
  const [employeeName, setEmployeeName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const transaction = await createTransaction({
        type: "outcome",
        category: "employee_labor",
        description,
        amount: parseFloat(amount) || 0,
        currency: "THB",
        transaction_date: date,
        employee_name: employeeName,
      });
      setTransactionId(transaction.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (transactionId) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">อัพโหลดเอกสาร</h1>
            <p className="text-slate-500 mt-1">พนักงาน: {employeeName}</p>
          </div>

          <div className="space-y-4">
            <FileUpload
              transactionId={transactionId}
              fileType="transfer_slip"
              transactionDate={date}
              type="outcome"
              label="สลิปการโอนเงิน"
            />
            <FileUpload
              transactionId={transactionId}
              fileType="id_card_copy"
              transactionDate={date}
              type="outcome"
              label="สำเนาบัตรประชาชนพนักงาน"
            />
            <FileUpload
              transactionId={transactionId}
              fileType="employee_receipt"
              transactionDate={date}
              type="outcome"
              label="ใบเสร็จรับเงินที่พนักงานเซ็นยืนยัน"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-8">
            <button onClick={() => router.push("/outcome/employee-labor")} className="btn-outline w-full">
              กลับไปรายการ
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">สร้างรายการใหม่</h1>
          <p className="text-slate-500 mt-1">ค่าจ้างพนักงาน</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">ชื่อพนักงาน</label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="input-field"
              placeholder="กรอกชื่อ-สกุล พนักงาน"
              required
            />
          </div>
          <div>
            <label className="label">รายละเอียด</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="กรอกรายละเอียด (ไม่บังคับ)"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">จำนวนเงิน (฿)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
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
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "กำลังบันทึก..." : "สร้างรายการ"}
          </button>
        </form>
      </div>
    </main>
  );
}
