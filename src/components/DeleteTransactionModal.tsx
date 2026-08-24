"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTransactionFilesForDeletion, deleteTransaction } from "@/lib/actions";
import { formatCurrency } from "@/lib/types";

interface DeleteTransactionModalProps {
  id: string;
  backUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

type FileItem = {
  id: string;
  file_type: string;
  file_name?: string | null;
  file_path: string;
};

type TxSummary = {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  expense_detail?: { employee_name?: string; shop_name?: string } | null;
  income_detail?: { customer_name?: string } | null;
};

export default function DeleteTransactionModal({
  id,
  backUrl,
  isOpen,
  onClose,
}: DeleteTransactionModalProps) {
  const router = useRouter();
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [tx, setTx] = useState<TxSummary | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [step, setStep] = useState<"confirm" | "executing" | "done" | "error">("confirm");
  
  const [executingStep, setExecutingStep] = useState<1 | 2 | 3>(1);
  const [deleteResult, setDeleteResult] = useState<{
    movedCount: number;
    driveSuccess: boolean;
    driveError?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setExecutingStep(1);
      setDeleteResult(null);
      setErrorMessage("");
      setCountdown(3);
      fetchInfo();
    }
  }, [isOpen, id]);

  const fetchInfo = async () => {
    setLoadingInfo(true);
    try {
      const data = await getTransactionFilesForDeletion(id);
      setTx(data.transaction as unknown as TxSummary);
      setFiles(data.files);
    } catch (err: any) {
      setErrorMessage(err.message || "ไม่สามารถดึงข้อมูลรายการได้");
    } finally {
      setLoadingInfo(false);
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case "transfer_slip": return "สลิปโอนเงิน";
      case "id_card_copy": return "สำเนาบัตรประชาชน";
      case "employee_receipt": return "ใบสำคัญรับเงิน";
      case "summary": return "ไฟล์รวม (sum PDF)";
      case "receipt": return "ใบเสร็จรับเงิน / ใบรับรองฯ";
      case "business_card": return "นามบัตร / รูปถ่าย";
      default:
        if (fileType.startsWith("attachment_")) return "เอกสารแนบเพิ่มเติม";
        return fileType;
    }
  };

  const handleConfirmDelete = async () => {
    setStep("executing");
    setExecutingStep(1);

    try {
      // Step 1: Checked files
      await new Promise(r => setTimeout(r, 400));
      setExecutingStep(2);

      // Step 2 & 3: Run backend deletion and Drive moving
      const result = await deleteTransaction(id);
      
      setExecutingStep(3);
      await new Promise(r => setTimeout(r, 400));

      setDeleteResult({
        movedCount: result.movedCount,
        driveSuccess: result.driveSuccess,
        driveError: result.driveError,
      });

      setStep("done");

      // Auto redirect countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push(backUrl);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการลบรายการ");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xl font-bold">
              🗑️
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {step === "done" ? "ลบรายการเรียบร้อย" : "ยืนยันการลบรายการ"}
              </h3>
              <p className="text-xs text-slate-500">
                {step === "done" ? "จัดการไฟล์ใน Google Drive และฐานข้อมูลแล้ว" : "ตรวจสอบไฟล์หลักฐานที่จะถูกย้ายไปโฟลเดอร์ delete transaction"}
              </p>
            </div>
          </div>
          {step !== "executing" && (
            <button
              onClick={() => {
                if (step === "done") {
                  router.push(backUrl);
                } else {
                  onClose();
                }
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Step: Confirm Details */}
        {step === "confirm" && (
          <div className="py-4 space-y-4">
            {loadingInfo ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-xs">กำลังตรวจสอบไฟล์ในระบบ...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm border border-rose-200 font-medium">
                {errorMessage}
              </div>
            ) : (
              <>
                {/* Transaction Summary Card */}
                {tx && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 dark:text-white truncate">
                        {tx.expense_detail?.employee_name || tx.expense_detail?.shop_name || tx.income_detail?.customer_name || tx.description}
                      </span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 text-base">
                        ฿{formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>วันที่: {tx.transaction_date}</span>
                      <span>•</span>
                      <span className="truncate">{tx.description}</span>
                    </div>
                  </div>
                )}

                {/* Google Drive Action Box */}
                <div className="border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800/50 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-sm">
                    <span>📁</span>
                    <span>การจัดการไฟล์ใน Google Drive</span>
                  </div>
                  <p className="text-amber-700 dark:text-amber-400">
                    ไฟล์ทั้งหมดของรายการนี้จะถูก <strong>ย้าย (Move)</strong> ไปเก็บไว้ในโฟลเดอร์ <strong>`delete transaction`</strong> ประจำเดือนนั้นๆ เพื่อความปลอดภัยทางบัญชี
                  </p>
                </div>

                {/* Files List */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      ไฟล์หลักฐานที่พบ ({files.length} ไฟล์):
                    </span>
                  </div>
                  {files.length === 0 ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-xs text-center border border-dashed border-slate-200">
                      ไม่มีไฟล์แนบในรายการนี้
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {files.map((file, idx) => (
                        <div
                          key={file.id || idx}
                          className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs border border-slate-100 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-slate-400 font-mono">#{idx + 1}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {getFileTypeLabel(file.file_type)}:
                            </span>
                            <span className="text-slate-500 truncate max-w-[200px]">
                              {file.file_name || "ไฟล์ใน Google Drive"}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            พร้อมย้าย
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={loadingInfo}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <span>🗑️</span>
                <span>ยืนยันการลบและย้ายไฟล์</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Executing Progress */}
        {step === "executing" && (
          <div className="py-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 border-3 border-slate-200 border-t-rose-600 rounded-full animate-spin mx-auto mb-3"></div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                กำลังดำเนินการลบและย้ายไฟล์...
              </h4>
              <p className="text-xs text-slate-500">กรุณารอสักครู่ ระบบกำลังส่งคำสั่งไปยัง Google Drive</p>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs">
              {/* Step 1 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <span>🔍</span>
                  <span>1. ตรวจสอบไฟล์หลักฐานในระบบ</span>
                </div>
                <span className="text-emerald-600 font-bold">✅ สำเร็จ ({files.length} ไฟล์)</span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <span>🔄</span>
                  <span>2. ย้ายไฟล์ไปยังโฟลเดอร์ delete transaction ใน Google Drive</span>
                </div>
                {executingStep >= 2 ? (
                  executingStep === 2 ? (
                    <span className="text-blue-600 font-bold animate-pulse">กำลังย้าย...</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">✅ ย้ายแล้ว</span>
                  )
                ) : (
                  <span className="text-slate-400">รอดำเนินการ</span>
                )}
              </div>

              {/* Step 3 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <span>🗑️</span>
                  <span>3. ลบข้อมูลรายการในฐานข้อมูล Supabase</span>
                </div>
                {executingStep === 3 ? (
                  <span className="text-blue-600 font-bold animate-pulse">กำลังลบ...</span>
                ) : (
                  <span className="text-slate-400">รอดำเนินการ</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="py-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                ลบรายการสำเร็จเรียบร้อย!
              </h4>
              <p className="text-xs text-slate-500">
                ข้อมูลถูกลบออกจากระบบ และไฟล์ถูกย้ายเข้าโฟลเดอร์ delete transaction ใน Google Drive แล้ว
              </p>
            </div>

            {/* Result Status Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-300 font-medium">สถานะ Google Drive:</span>
                {deleteResult?.driveSuccess ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                    ✅ ย้ายสำเร็จ ({deleteResult.movedCount} ไฟล์)
                  </span>
                ) : (
                  <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                    ⚠️ {deleteResult?.driveError || "ไม่สามารถย้ายไฟล์ได้"}
                  </span>
                )}
              </div>

              {!deleteResult?.driveSuccess && (
                <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl text-[11px] border border-amber-200">
                  <strong>คำแนะนำ:</strong> กรุณาตรวจสอบโค้ดใน Google Apps Script ว่ามีการเพิ่มคำสั่ง <code>moveToDeleted</code> หรือยัง
                </div>
              )}
            </div>

            <button
              onClick={() => router.push(backUrl)}
              className="w-full py-3.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>กลับสู่หน้ารวมรายการ</span>
              <span className="text-xs bg-slate-700 dark:bg-slate-600 px-2 py-0.5 rounded-full">({countdown}s)</span>
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="py-6 space-y-4 text-center">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto">
              ✕
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                เกิดข้อผิดพลาดในการลบรายการ
              </h4>
              <p className="text-xs text-rose-600 mt-1 font-medium">{errorMessage}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
