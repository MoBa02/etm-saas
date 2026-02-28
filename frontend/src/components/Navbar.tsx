"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setFullName(profile?.full_name || user.email || null);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="w-full bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
      {/* Logo */}
      <Link href="/" className="text-2xl font-extrabold text-emerald-600 tracking-tight">
        إتمام
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {loading ? null : fullName ? (
          <>
            {/* User avatar + name */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <span className="text-slate-700 font-medium text-sm hidden sm:block">
                {fullName}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-red-500 transition-colors font-medium"
            >
              تسجيل الخروج
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition-colors"
            >
              إنشاء حساب
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
