import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { SubtitleSegment } from '../types/subtitle';
import { AppSettings } from '../types/settings';

interface SubtitleItemProps {
  segment: SubtitleSegment;
  settings: AppSettings;
}

export const SubtitleItem: React.FC<SubtitleItemProps> = ({
  segment,
  settings,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `${segment.englishText}\n(ไทย): ${segment.thaiText}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Font size classes (50% smaller for clean meeting subtitle reading)
  const thaiSizeClass = {
    small: 'text-[11px] sm:text-xs',
    medium: 'text-xs sm:text-sm',
    large: 'text-sm sm:text-base font-semibold',
    xlarge: 'text-base sm:text-lg font-bold',
  }[settings.fontSize];

  const enSizeClass = {
    small: 'text-[10px] sm:text-[11px]',
    medium: 'text-[11px] sm:text-xs',
    large: 'text-xs sm:text-sm',
    xlarge: 'text-sm sm:text-base',
  }[settings.fontSize];

  // Thai text color styling
  const thaiColorClass = {
    cyan: 'text-cyan-300',
    yellow: 'text-amber-300',
    white: 'text-white',
    emerald: 'text-emerald-300',
  }[settings.textColor];

  return (
    <div
      className={`group relative rounded-xl p-3 sm:p-3.5 transition-all duration-200 ${
        segment.isFinal
          ? 'bg-[#101624]/80 hover:bg-[#151c2d]/90 border border-slate-800/80 shadow-sm'
          : 'bg-[#121a2c] border border-cyan-500/50 shadow-md shadow-cyan-500/10'
      }`}
    >
      {/* Top Meta: Timestamp, Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 relative">
          {settings.showTimestamp && (
            <span className="text-xs text-slate-400 font-mono">
              {segment.timestamp}
            </span>
          )}
          {!segment.isFinal && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-md border border-cyan-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              กำลังพูดสด
            </span>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={handleCopy}
          title="คัดลอกข้อความ (Copy Subtitle)"
          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Subtitle Content: English on Top Row, Thai on Bottom Row */}
      <div className="space-y-1.5">
        {/* English Source Subtitle (Top Row) */}
        {(settings.displayMode === 'bilingual' || settings.displayMode === 'en-only') && (
          <div className={`text-slate-300 font-normal leading-relaxed ${enSizeClass}`}>
            {segment.englishText}
          </div>
        )}

        {/* Thai Translated Subtitle (Bottom Row) */}
        {(settings.displayMode === 'bilingual' || settings.displayMode === 'thai-only') && (
          <div className={`font-semibold tracking-wide leading-relaxed ${thaiSizeClass} ${thaiColorClass} min-h-[1.25rem]`}>
            {segment.thaiText || '\u00A0'}
          </div>
        )}
      </div>
    </div>
  );
};
