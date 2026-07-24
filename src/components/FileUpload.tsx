"use client";

import { useCallback, useRef, useState } from "react";
import { uploadFile } from "@/lib/actions";

interface FileUploadProps {
  transactionId: string;
  fileType: string;
  transactionDate: string;
  type: "income" | "outcome";
  label: string;
  onUploadComplete?: (filePath: string, fileName: string) => void;
}

export default function FileUpload({
  transactionId,
  fileType,
  transactionDate,
  type,
  label,
  onUploadComplete,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setError("");

      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadFile(transactionId, fileType, transactionDate, type, file.name, base64);

        setUploaded(true);
        setUploadedFileName(file.name);

        if (file.type.startsWith("image/")) {
          setPreview(base64);
        }

        onUploadComplete?.(file.name, file.name);
      } catch (err) {
        setError("อัพโหลดไม่สำเร็จ: " + (err as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [transactionId, fileType, transactionDate, type, onUploadComplete]
  );

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-indigo-400 transition-colors duration-200">
      <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        id={`file-${fileType}`}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full py-3 px-4 border-2 border-slate-200 rounded-xl text-slate-500
          hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
          disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {uploading ? "กำลังอัพโหลด..." : uploaded ? "เปลี่ยนไฟล์" : "เลือกไฟล์"}
      </button>

      {uploaded && (
        <p className="mt-2 text-sm text-emerald-600 font-medium">
          ✓ {uploadedFileName}
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
      )}

      {preview && (
        <div className="mt-3">
          <img
            src={preview}
            alt="ตัวอย่างไฟล์"
            className="max-h-40 rounded-lg border border-slate-200 object-contain"
          />
        </div>
      )}
    </div>
  );
}
