import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "إتمام | Etm",
  description: "AI-powered localized landing pages",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
