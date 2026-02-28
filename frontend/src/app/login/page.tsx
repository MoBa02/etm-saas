"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("DATA:", JSON.stringify(data));
    console.log("ERROR:", JSON.stringify(error));

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      const redirectTo = searchParams.get("redirectTo") || "/dashboard";
      window.location.href = redirectTo;
    } else {
      setError("فشل تسجيل الدخول، حاول مجدداً");
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="font-sans min-h-screen min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 text-center">إتمام</h1>
        <p className="text-slate-500 text-center mb-8">تسجيل الدخول إلى لوحة التحكم</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400" />

          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 mt-2">
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-emerald-600 font-semibold hover:underline">إنشاء حساب جديد</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
