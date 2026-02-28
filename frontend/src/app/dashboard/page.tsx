"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useJobStream, JobFormData } from "@/hooks/useJobStream";
import DynamicRenderer from "@/components/DynamicRenderer";
import Navbar from "@/components/Navbar";

function ShareButton({ jobId }: { jobId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/p/${jobId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      onClick={handleShare}
      className={`px-4 py-2 font-semibold rounded-full shadow-md border transition-all text-sm ${
        copied
          ? "bg-emerald-500 text-white border-emerald-500"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {copied ? "✅ تم النسخ!" : "🔗 مشاركة الرابط"}
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { jobId, status, currentStep, currentMessage, completedSteps, structure, error, submitJob, reset } = useJobStream();

  const [form, setForm] = useState<JobFormData>({
    business_name: "",
    business_type: "",
    target_city: "",
    locale: "ar",
    direction: "rtl",
  });

  const steps = ["clarifier", "researcher", "copywriter", "structure_builder"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitJob(form);
  };

  // ── Show rendered page when done ────────────────────────────────────────
  if (status === "completed" && structure) {
    return (
      <div>
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-white text-slate-700 font-semibold rounded-full shadow-md border border-slate-200 hover:bg-slate-50 transition-all text-sm"
          >
            ← إنشاء صفحة جديدة
          </button>
          <ShareButton jobId={jobId!} />
        </div>
        <DynamicRenderer structure={structure} />
      </div>
    );
  }

  // ── Show pipeline progress ───────────────────────────────────────────────
  if (status === "processing") {
    return (
      <div dir="rtl" className="font-sans min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">جاري الإنشاء...</h2>
          <p className="text-slate-500 mb-10">{currentMessage || "يعمل الذكاء الاصطناعي على صفحتك"}</p>
          <div className="flex flex-col gap-4 w-full max-w-md">
            {steps.map((step) => {
              const isDone = completedSteps.includes(step as any);
              const isActive = currentStep === step;
              return (
                <div
                  key={step}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                    isDone ? "bg-emerald-50 border border-emerald-200" :
                    isActive ? "bg-white shadow-md border border-slate-200" :
                    "bg-slate-100 opacity-40"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isDone ? "bg-emerald-500 text-white" :
                    isActive ? "bg-slate-900 text-white animate-pulse" :
                    "bg-slate-300 text-white"
                  }`}>
                    {isDone ? "✓" : steps.indexOf(step) + 1}
                  </div>
                  <span className={`font-semibold ${isDone ? "text-emerald-700" : "text-slate-700"}`}>
                    {{
                      clarifier: "تحليل النشاط التجاري",
                      researcher: "بحث السوق المحلي",
                      copywriter: "كتابة النصوص",
                      structure_builder: "بناء الصفحة",
                    }[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Show form ────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="font-sans min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white w-full max-w-lg p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 text-center">إنشاء صفحة هبوط</h1>
          <p className="text-slate-500 text-center mb-8">أدخل بيانات نشاطك التجاري</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="اسم النشاط التجاري"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              type="text"
              placeholder="نوع النشاط (مثال: مطعم، عيادة، صالون)"
              value={form.business_type}
              onChange={(e) => setForm({ ...form, business_type: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              type="text"
              placeholder="المدينة المستهدفة (مثال: الدمام)"
              value={form.target_city}
              onChange={(e) => setForm({ ...form, target_city: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <select
              value={form.locale}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>

            <button
              type="submit"
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:-translate-y-0.5 mt-2"
            >
              🚀 ابدأ الإنشاء
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
