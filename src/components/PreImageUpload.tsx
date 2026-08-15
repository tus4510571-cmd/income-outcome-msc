"use client";

import { useCallback, useRef, useState } from "react";

export interface PreUploadFile {
  id: string;
  file: File;
  preview: string;
}

interface PreImageUploadProps {
  label?: string;
  files: PreUploadFile[];
  onChange: (files: PreUploadFile[]) => void;
  uploadProgress?: number;
  uploadStatus?: "idle" | "uploading" | "complete" | "error";
  uploadError?: string;
}

export default function PreImageUpload({
  label = "อัพโหลดรูปภาพ",
  files,
  onChange,
  uploadProgress = 0,
  uploadStatus = "idle",
  uploadError,
}: PreImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;

      const newFiles = selectedFiles.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        preview: URL.createObjectURL(file),
      }));

      onChange([...files, ...newFiles]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    },
    [files, onChange]
  );

  const removeFile = (idToRemove: string) => {
    onChange(files.filter((f) => f.id !== idToRemove));
  };

  return (
    <div className="card border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors duration-200 shadow-none dark:bg-slate-800/50">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <p className="font-medium text-slate-700 dark:text-slate-300">{label}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploadStatus === "uploading"}
            className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-colors dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm"
          >
            <span>📷</span>
            <span>ถ่ายรูป</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus === "uploading"}
            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-colors dark:bg-indigo-900/40 dark:text-indigo-400 shadow-sm"
          >
            <span>📁</span>
            <span>เลือกไฟล์</span>
          </button>
        </div>
      </div>

      {/* Hidden Inputs: Camera and File Explorer */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {files.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          ยังไม่ได้เลือกไฟล์
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {files.map((f) => (
            <div key={f.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
              {f.file.type === "application/pdf" ? (
                <div className="w-full h-24 flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 font-bold text-sm">
                  <span>📄 PDF</span>
                </div>
              ) : (
                <img src={f.preview} alt="preview" className="w-full h-24 object-cover" />
              )}
              {uploadStatus !== "uploading" && uploadStatus !== "complete" && (
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {uploadStatus !== "idle" && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex justify-between text-sm mb-1">
            <span className={uploadStatus === "complete" ? "text-emerald-600 font-bold" : "text-slate-600"}>
              {uploadStatus === "uploading" && "Uploading..."}
              {uploadStatus === "complete" && "✓ Complete upload"}
              {uploadStatus === "error" && "Upload failed"}
            </span>
            <span className="text-slate-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                uploadStatus === "error" ? "bg-red-500" : uploadStatus === "complete" ? "bg-emerald-500" : "bg-indigo-500"
              }`}
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
        </div>
      )}
    </div>
  );
}
