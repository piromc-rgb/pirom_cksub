import React, { useState } from 'react';
import { X, Share2, Copy, Check, Smartphone, ShieldCheck } from 'lucide-react';

interface ShareLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareLiveModal: React.FC<ShareLiveModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/#live-session` : 'https://felo-subtitles.local/live';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">แชร์คำบรรยายสด (Live Sharing)</h2>
              <p className="text-xs text-slate-400">ให้ผู้ร่วมประชุมหรือผู้ชมอ่านซับไตเติลผ่านมือถือ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-center">
          {/* QR Code Card */}
          <div className="inline-block p-4 bg-white rounded-2xl shadow-xl shadow-cyan-500/10 border-4 border-slate-800">
            {/* Clean SVG QR code representation */}
            <svg className="w-40 h-40" viewBox="0 0 100 100" fill="currentColor">
              <path d="M0 0h30v30H0zM10 10h10v10H10zM70 0h30v30H70zM80 10h10v10H80zM0 70h30v30H0zM10 80h10v10H10zM40 10h10v10H40zM50 20h10v10H50zM40 40h20v20H40zM70 40h10v10H70zM90 40h10v20H90zM40 70h10v10H40zM50 80h20v20H50zM80 70h20v10H80zM70 90h10v10H70z" fill="#0f172a"/>
              <circle cx="50" cy="50" r="6" fill="#4f46e5" />
            </svg>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">สแกน QR Code เพื่ออ่านคำบรรยายสด</h3>
            <p className="text-xs text-slate-400">
              ไม่ต้องลงแอป ไม่ต้องล็อกอิน รองรับทั้ง iPhone, iPad และ Android
            </p>
          </div>

          {/* Share Link Input */}
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent flex-1 text-slate-300 font-mono focus:outline-none px-2 text-xs truncate"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
            </button>
          </div>

          {/* Features bullet points */}
          <div className="grid grid-cols-2 gap-2 text-left pt-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Mobile Second Screen</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>เข้ารหัสความปลอดภัย</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
