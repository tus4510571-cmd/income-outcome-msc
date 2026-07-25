"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface FileImageProps {
  filePath: string;
  label: string;
}

export default function FileImage({ filePath, label }: FileImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUrl() {
      if (!filePath) {
        setLoading(false);
        return;
      }

      // If it's a Google Drive link or direct URL
      if (filePath.startsWith("http")) {
        setUrl(filePath);
        setLoading(false);
        return;
      }

      // Fallback for old Supabase storage files (if any)
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("transaction-files")
        .createSignedUrl(filePath, 3600);

      if (data?.signedUrl) {
        setUrl(data.signedUrl);
      }
      setLoading(false);
    }
    fetchUrl();
  }, [filePath]);

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-400">กำลังโหลดเอกสาร...</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="h-48 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-500">โหลดเอกสารไม่สำเร็จ</p>
      </div>
    );
  }

  // If it's a Google Drive link
  if (url.includes("drive.google.com")) {
    const previewUrl = url.replace(/\/view.*/, "/preview");
    return (
      <div className="flex flex-col gap-3">
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
          <iframe 
            src={previewUrl} 
            className="w-full h-full border-none"
            title={label}
            allow="autoplay"
          ></iframe>
        </div>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          เปิดดูไฟล์เต็ม
        </a>
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={label} 
      className="max-h-64 rounded-lg border border-slate-200 object-contain bg-white mx-auto block" 
    />
  );
}
