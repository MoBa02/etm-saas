// src/components/DynamicRenderer.tsx


interface ThemeConfig {
  primary_color: string;
  font_family: string;
  border_radius: string;
}

interface ComponentBlock {
  id: string;
  type: "hero" | "features" | "benefits" | "whatsapp_cta" | "footer";
  data: Record<string, any>;
}

interface LandingPageStructure {
  brand_name: string;
  theme: ThemeConfig;
  rtl: boolean;
  locale: string;
  layout: ComponentBlock[];
}

// ── Hero ─────────────────────────────────────────────────────────────────

function HeroBlock({ data, theme, rtl }: { data: any; theme: ThemeConfig; rtl: boolean }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-white to-slate-50">
      {data.social_proof && (
        <span className="inline-block mb-6 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-full border border-emerald-100">
          {data.social_proof}
        </span>
      )}
      <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-slate-900 mb-6 max-w-3xl">
        {data.headline}
      </h1>
      <p className="text-xl md:text-2xl text-slate-500 mb-10 max-w-2xl leading-relaxed">
        {data.subheadline}
      </p>
      <button
        className="px-8 py-4 text-white font-bold text-lg rounded-full shadow-lg hover:-translate-y-1 transition-all duration-300"
        style={{ backgroundColor: theme.primary_color }}
      >
        {data.cta_text}
      </button>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────

function FeaturesBlock({ data, theme }: { data: any; theme: ThemeConfig }) {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-4">
        {data.title}
      </h2>
      <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">
        {data.subtitle}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {data.items?.map((item: any, i: number) => (
          <div
            key={i}
            className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 text-emerald-600 text-xl font-bold rounded-2xl mb-6">
              {i + 1}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
            <p className="text-slate-500 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Benefits ──────────────────────────────────────────────────────────────

function BenefitsBlock({ data, theme }: { data: any; theme: ThemeConfig }) {
  return (
    <section className="py-24 px-6 bg-white">
      <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-4">
        {data.title}
      </h2>
      <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">
        {data.subtitle}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {data.items?.map((item: any, i: number) => (
          <div
            key={i}
            className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col items-center text-center"
          >
            <div
              className="w-14 h-14 flex items-center justify-center text-white font-extrabold text-xl rounded-2xl mb-6 shadow-md"
              style={{ backgroundColor: theme.primary_color }}
            >
              {i + 1}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
            <p className="text-slate-500 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── WhatsApp CTA ──────────────────────────────────────────────────────────

function WhatsAppCTABlock({ data }: { data: any }) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(data.wa_message ?? data.headline)}`;
  return (
    <section className="py-24 px-6 text-center bg-slate-50">
      <h2 className="text-3xl font-extrabold text-slate-900 mb-4">{data.headline}</h2>
      <p className="text-slate-500 mb-10 max-w-xl mx-auto">{data.subtext}</p>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-8 py-4 bg-[#25D366] text-white hover:bg-green-600 font-bold text-lg rounded-full shadow-lg hover:-translate-y-1 transition-all duration-300"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {data.button_text}
      </a>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────

function FooterBlock() {
  return (
    <footer className="border-t border-slate-200 py-8 text-center text-slate-500 text-sm bg-white">
      تم الإنشاء بحب بواسطة{" "}
      <span className="font-bold text-slate-700">إتمام (Etm)</span>
    </footer>
  );
}

// ── Main Renderer ─────────────────────────────────────────────────────────
"use client";  // ✅ Makes it client-only (fonts are client-only anyway)

import { Cairo } from "next/font/google";  // ✅ Add this
const cairo = Cairo({ 
  subsets: ["arabic", "latin"], 
  weight: ["400", "600", "700"] 
});


export default function DynamicRenderer({ structure }: { structure: LandingPageStructure }) {
  const { theme, rtl, layout } = structure;

  if (!theme || !layout) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div dir={rtl ? "rtl" : "ltr"} className={cairo.className}>
      {layout.map((block) => {
        switch (block.type) {
          case "hero":
            return <HeroBlock key={block.id} data={block.data} theme={theme} rtl={rtl} />;
          case "features":
            return <FeaturesBlock key={block.id} data={block.data} theme={theme} />;
          case "benefits":
            return <BenefitsBlock key={block.id} data={block.data} theme={theme} />;
          case "whatsapp_cta":
            return <WhatsAppCTABlock key={block.id} data={block.data} />;
          case "footer":
            return <FooterBlock key={block.id} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
