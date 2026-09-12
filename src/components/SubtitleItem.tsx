import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { SubtitleSegment, SpeakerProfile } from '../types/subtitle';
import { AppSettings } from '../types/settings';
import { getSpeakerBadgeClasses } from './SpeakerBar';

interface SubtitleItemProps {
  segment: SubtitleSegment;
  settings: AppSettings;
  speakers?: SpeakerProfile[];
  onReassignSpeaker?: (segmentId: string, newSpeaker: SpeakerProfile) => void;
}

export const SubtitleItem: React.FC<SubtitleItemProps> = ({
  segment,
  settings,
  speakers = [],
  onReassignSpeaker,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeakerMenuOpen, setIsSpeakerMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close speaker dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsSpeakerMenuOpen(false);
      }
    };
    if (isSpeakerMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSpeakerMenuOpen]);

  const handleCopy = () => {
    const text = `${segment.speaker}: ${segment.englishText}\n(ไทย): ${segment.thaiText}`;
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

  // Get matching speaker profile
  const matchedSpeaker = speakers.find(
    (s) => s.id === segment.speakerId || s.name === segment.speaker
  );
  const speakerBadgeClass = getSpeakerBadgeClasses(matchedSpeaker?.color);

  return (
    <div
      className={`group relative rounded-xl p-3 sm:p-3.5 transition-all duration-200 ${
        segment.isFinal
          ? 'bg-[#101624]/80 hover:bg-[#151c2d]/90 border border-slate-800/80 shadow-sm'
          : 'bg-[#121a2c] border border-cyan-500/50 shadow-md shadow-cyan-500/10'
      }`}
    >
      {/* Top Meta: Speaker, Timestamp, Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 relative">
          {settings.showSpeaker && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => segment.isFinal && onReassignSpeaker && setIsSpeakerMenuOpen(!isSpeakerMenuOpen)}
                title={segment.isFinal && onReassignSpeaker ? 'คลิกเพื่อเปลี่ยนผู้พูดของประโยคนี้' : undefined}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${speakerBadgeClass} ${
                  segment.isFinal && onReassignSpeaker ? 'hover:brightness-125 cursor-pointer' : ''
                }`}
              >
                <span>🎙️ {segment.speaker}</span>
                {segment.isFinal && onReassignSpeaker && speakers.length > 1 && (
                  <ChevronDown className="w-3 h-3 opacity-60" />
                )}
              </button>

              {/* Speaker Re-assignment Popover */}
              {isSpeakerMenuOpen && speakers.length > 0 && (
                <div className="absolute left-0 top-full mt-1.5 z-40 bg-[#0e1422] border border-slate-700/90 rounded-xl p-1.5 shadow-2xl min-w-[140px] space-y-1 animate-fade-in">
                  <div className="text-[10px] text-slate-400 px-2 py-1 font-semibold uppercase tracking-wider">
                    เปลี่ยนผู้พูด:
                  </div>
                  {speakers.map((spk) => {
                    const isSelected = spk.id === segment.speakerId || spk.name === segment.speaker;
                    const badge = getSpeakerBadgeClasses(spk.color);
                    return (
                      <button
                        key={spk.id}
                        type="button"
                        onClick={() => {
                          onReassignSpeaker?.(segment.id, spk);
                          setIsSpeakerMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-medium text-left transition-colors ${
                          isSelected ? `${badge} font-bold` : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{spk.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-current" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
