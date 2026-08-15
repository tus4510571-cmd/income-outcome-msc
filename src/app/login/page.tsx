"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // Set initial activity cookie
      document.cookie = `last-activity=${Date.now()}; path=/; max-age=900; SameSite=Lax`;
      
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="MAISON CRAFT" className="h-16 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            MSC Income Outcome
          </h1>
          <p className="text-slate-500 text-sm">
            ระบบจัดการรายรับและรายจ่าย
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

            <div>
              <div className="flex items-center justify-between">
                <label className="label">รหัสผ่าน</label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="กรอกรหัสผ่าน"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  error.includes("ตรวจสอบ")
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "กำลังดำเนินการ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ลืมรหัสผ่าน? (Forgot Password)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
