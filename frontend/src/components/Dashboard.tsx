"use client";
import { useRef, useState } from "react";
import { useJobStream } from "@/hooks/useJobStream";
import Stepper from "./Stepper";
import ActionBar from "./ActionBar";
import DynamicRenderer from "./DynamicRenderer";
import Image from "next/image";

export default function Dashboard() {
  const previewRef = useRef<HTMLDivElement>(null);
  const { jobId, status, currentStep, currentMessage, completedSteps,
          structure, error, submitJob, reset } = useJobStream();

  const [form, setForm] = useState({
    business_name: "",
    business_type: "",
    target_city:   "",
    locale:        "ar-SA",
    direction:     "rtl" as "rtl" | "ltr",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitJob(form);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[#C8A96E]">إتمام</span>
          <span className="text-xs text-gray-400 font-light">Etm</span>
        </div>
        <span className="text-sm text-gray-400">صفحات هبوط ذكية · بالعربي</span>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* ── IDLE: Input Form ────────────────────────────────────── */}
        {status === "idle" && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">أنشئ صفحتك الآن</h1>
            <p className="text-gray-500 text-sm mb-6">
              أدخل معلومات نشاطك التجاري وسنبني لك صفحة هبوط احترافية في دقيقتين.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                required
                placeholder="اسم النشاط التجاري"
                className="border border-gray-200 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-[#C8A96E]"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              />
              <input
                required
                placeholder="نوع النشاط (مطعم، عيادة، متجر...)"
                className="border border-gray-200 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-[#C8A96E]"
                value={form.business_type}
                onChange={(e) => setForm({ ...form, business_type: e.target.value })}
              />
              <input
                required
                placeholder="المدينة المستهدفة"
                className="border border-gray-200 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-[#C8A96E]"
                value={form.target_city}
                onChange={(e) => setForm({ ...form, target_city: e.target.value })}
              />
              <button
                type="submit"
                className="bg-[#C8A96E] text-white font-bold py-3 rounded-xl hover:bg-[#b8944f] transition-all text-lg"
              >
                🚀 ابدأ الإنشاء
              </button>
            </form>
          </div>
        )}

        {/* ── PROCESSING: Stepper ─────────────────────────────────── */}
        {status === "processing" && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
              جاري بناء صفحتك...
            </h2>
            <p className="text-center text-sm text-gray-400 mb-6">
              الذكاء الاصطناعي يحلل سوقك المحلي ويكتب نسختك الآن
            </p>
            <Stepper
              currentStep={currentStep}
              completedSteps={completedSteps}
              currentMessage={currentMessage}
            />
          </div>
        )}

        {/* ── FAILED ──────────────────────────────────────────────── */}
        {status === "failed" && (
          <div className="max-w-lg mx-auto bg-red-50 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-semibold mb-4">❌ {error}</p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl font-semibold"
            >
              حاول مجدداً
            </button>
          </div>
        )}

        {/* ── COMPLETED: Preview + Actions ────────────────────────── */}
        {status === "completed" && structure && jobId && (
          <div className="flex flex-col gap-6">
            <ActionBar jobId={jobId} previewRef={previewRef} onReset={reset} />
            <div
              ref={previewRef}
              className="rounded-2xl overflow-hidden shadow-lg border border-gray-100"
            >
              <DynamicRenderer structure={structure} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
