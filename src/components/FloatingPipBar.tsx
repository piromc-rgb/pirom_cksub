import React, { useState } from 'react';
import { ExternalLink, X, ChevronDown, ChevronUp } from 'lucide-react';
import { SubtitleSegment } from '../types/subtitle';
import { AppSettings } from '../types/settings';

interface FloatingPipBarProps {
  currentSubtitle: SubtitleSegment | null;
  settings: AppSettings;
  onRequestNativePip: () => void;
  isNativePipActive: boolean;
}

export const FloatingPipBar: React.FC<FloatingPipBarProps> = ({
  currentSubtitle,
  settings,
  onRequestNativePip,
  isNativePipActive,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const thaiColorClass = {
    cyan: 'text-cyan-300',
    yellow: 'text-amber-300',
    white: 'text-white',
    emerald: 'text-emerald-300',
  }[settings.textColor];

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl transition-all duration-300 ${
        isMinimized ? 'opacity-80 hover:opacity-100' : 'opacity-100'
      }`}
    >
      <div
        className="rounded-2xl shadow-2xl border border-cyan-500/30 overflow-hidden backdrop-blur-2xl transition-all"
        style={{
          backgroundColor: `rgba(10, 13, 20, ${settings.bgOpacity})`,
        }}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold text-white">CHAKEN Sub Overlay</span>
            {currentSubtitle && settings.showSpeaker && (
              <span className="text-slate-400">| 🎙️ {currentSubtitle.speaker}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Popout to OS Native PiP */}
            <button
              onClick={onRequestNativePip}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[11px] font-medium transition-all ${
                isNativePipActive
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Pop out to OS Floating Window (Always on Top of other apps)"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{isNativePipActive ? 'PiP Active' : 'Pop out PiP'}</span>
            </button>

            {/* Minimize / Maximize */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subtitle Content Display */}
        {!isMinimized && (
          <div className="p-3 sm:p-4 text-center min-h-[60px] flex flex-col justify-center items-center">
            {currentSubtitle ? (
              <div className="space-y-1 max-w-2xl">
                {/* English Source Subtitle (Top Row) */}
                {settings.displayMode !== 'thai-only' && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-normal font-normal">
                    {currentSubtitle.englishText}
                  </p>
                )}

                {/* Thai Subtitle (Bottom Row) */}
                {settings.displayMode !== 'en-only' && currentSubtitle.thaiText ? (
                  <p className={`font-semibold tracking-wide text-sm sm:text-base leading-snug ${thaiColorClass}`}>
                    {currentSubtitle.thaiText}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="text-slate-500 text-xs flex items-center gap-2">
                <span>✦ กำลังรอรับเสียงการประชุมเพื่อแสดงคำบรรยายภาษาไทยแบบ Real-time...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
