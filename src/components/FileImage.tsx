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
        <p className="text-sm text-slate-400">กำลังโหลดรูปภาพ...</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="h-48 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-500">โหลดรูปภาพไม่สำเร็จ</p>
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
