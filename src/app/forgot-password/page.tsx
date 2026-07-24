"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // In production, you'd probably use `window.location.origin` for redirectTo
      // to ensure it works across different hostnames like local IP or domain.
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
      });
      
      if (error) throw error;
      
      setMessage("ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบกล่องจดหมาย");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            ลืมรหัสผ่าน
          </h1>
          <p className="text-slate-500">
            กรุณากรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="example@email.com"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}
            
            {message && (
              <div className="p-3 rounded-xl text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!message}
              className="btn-primary w-full"
            >
              {loading ? "กำลังส่งลิงก์..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
