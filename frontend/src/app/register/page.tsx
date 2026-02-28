"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setError("هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول.");
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
      });
      if (profileError) console.error("Profile error:", profileError.message);
    }

    if (data.session) {
      router.push("/dashboard");
    } else {
      setMessage("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب.");
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="font-sans min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 text-center">إنشاء حساب</h1>
        <p className="text-slate-500 text-center mb-8">ابدأ رحلتك مع إتمام مجاناً</p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="الاسم الكامل"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <input
            type="password"
            placeholder="تأكيد كلمة المرور"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl">{error}</p>
          )}
          {message && (
            <p className="text-emerald-600 text-sm text-center bg-emerald-50 p-3 rounded-xl">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 mt-2"
          >
            {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
