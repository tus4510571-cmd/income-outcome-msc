"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DeleteTransactionModal from "./DeleteTransactionModal";

interface TransactionActionsProps {
  id: string;
  backUrl: string;
}

export default function TransactionActions({ id, backUrl }: TransactionActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/edit/${id}`);
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleEdit}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
        >
          <span>✏️</span> แก้ไข
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors"
        >
          <span>🗑️</span> ลบ
        </button>
      </div>

      <DeleteTransactionModal
        id={id}
        backUrl={backUrl}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </>
  );
}
