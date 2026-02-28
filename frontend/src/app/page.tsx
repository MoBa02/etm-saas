"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";


export default function HomePage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setLoading(false);
    });
  }, []);

  return (
    <div
      dir="rtl"
      className="font-sans min-h-screen bg-gradient-to-b from-white to-slate-50 flex flex-col items-center justify-center text-center px-6"
    >
      <span className="inline-block mb-6 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-full border border-emerald-100">
        مدعوم بالذكاء الاصطناعي
      </span>

      <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-4 leading-tight">
        إتمام
      </h1>
      <p className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed">
        منصة الذكاء الاصطناعي لإنشاء صفحات هبوط محلية احترافية في ثوانٍ
      </p>

      {!loading && (
        <div className="flex gap-4 flex-wrap justify-center">
          {hasSession ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              الذهاب للوحة التحكم
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push("/register")}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                ابدأ مجاناً
              </button>
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-slate-700 font-bold rounded-full shadow-md hover:-translate-y-1 transition-all duration-300 border border-slate-200"
              >
                تسجيل الدخول
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
