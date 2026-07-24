"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction } from "@/lib/actions";

interface TransactionActionsProps {
  id: string;
  backUrl: string;
}

export default function TransactionActions({ id, backUrl }: TransactionActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบรายการนี้? (การดำเนินการนี้ไม่สามารถย้อนกลับได้)")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTransaction(id);
      router.push(backUrl);
    } catch (error) {
      alert("ไม่สามารถลบรายการได้: " + (error as Error).message);
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/edit/${id}`);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleEdit}
        disabled={isDeleting}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
      >
        <span>✏️</span> แก้ไข
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        <span>🗑️</span> {isDeleting ? "กำลังลบ..." : "ลบ"}
      </button>
    </div>
  );
}
