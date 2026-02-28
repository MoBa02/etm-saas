"use client";
import { useRef } from "react";
import html2canvas from "html2canvas";
import { Download, Link2, RefreshCw } from "lucide-react";

interface ActionBarProps {
  jobId: string;
  previewRef: React.RefObject<HTMLDivElement>;
  onReset: () => void;
}

export default function ActionBar({ jobId, previewRef, onReset }: ActionBarProps) {
  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = `etm-landing-${jobId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/p/${jobId}`;
    await navigator.clipboard.writeText(url);
    alert("✅ Public link copied!");
  };

  return (
    <div className="flex flex-wrap gap-3 justify-center py-6">
      <button
        onClick={handleDownloadPDF}
        className="flex items-center gap-2 px-5 py-3 bg-[#C8A96E] text-white font-semibold rounded-xl hover:bg-[#b8944f] transition-all"
      >
        <Download className="w-4 h-4" />
        Download PDF
      </button>

      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-5 py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-700 transition-all"
      >
        <Link2 className="w-4 h-4" />
        Copy Public Link
      </button>

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-5 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-gray-400 transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        Edit Prompt
      </button>
    </div>
  );
}