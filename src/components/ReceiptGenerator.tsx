"use client";

import { useState, useEffect } from "react";
import { CURRENCY_OPTIONS, type ReceiptItem } from "@/lib/types";
import { formatCurrency } from "@/lib/types";

interface ReceiptGeneratorProps {
  initialItems?: ReceiptItem[];
  businessCardPreview?: string | null;
  onChange?: (items: ReceiptItem[]) => void;
}

export default function ReceiptGenerator({
  initialItems = [],
  businessCardPreview,
  onChange,
}: ReceiptGeneratorProps) {
  const [items, setItems] = useState<ReceiptItem[]>(
    initialItems.length > 0
      ? initialItems
      : [{ id: "", transaction_id: "", product_name: "", quantity: 1, unit_price: 0, currency: "THB" }]
  );

  useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const addItem = () => {
    const newItems = [
      ...items,
      { id: "", transaction_id: "", product_name: "", quantity: 1, unit_price: 0, currency: "THB" },
    ];
    setItems(newItems);
    onChange?.(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange?.(newItems);
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setItems(newItems);
    onChange?.(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {businessCardPreview && (
          <div className="mb-4 text-center">
            <img
              src={businessCardPreview}
              alt="นามบัตรร้านค้า"
              className="max-h-32 mx-auto rounded-lg border border-slate-200 object-contain"
            />
          </div>
        )}

        <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">ใบเสร็จรับเงิน</h3>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className="text-xs text-slate-500">รายการสินค้า</label>
                <input
                  type="text"
                  value={item.product_name}
                  onChange={(e) => updateItem(index, "product_name", e.target.value)}
                  className="input-field text-sm py-2"
                  placeholder="ชื่อสินค้า"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500">จำนวน</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                  className="input-field text-sm py-2"
                  min="0"
                />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-slate-500">ราคาต่อหน่วย</label>
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                  className="input-field text-sm py-2"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="w-full py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <button type="button" onClick={addItem} className="btn-ghost text-sm">
            + เพิ่มรายการ
          </button>
          <div className="text-right">
            <p className="text-sm text-slate-500">รวม {totalQuantity} รายการ</p>
            <p className="text-xl font-bold text-indigo-600">
              ราคารวม {formatCurrency(totalAmount, items[0]?.currency || "THB")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
