import React from 'react';
import { 
  Mic, 
  Play, 
  Square, 
  Laptop, 
  Info,
  Zap,
  Trash2,
  Headphones,
  HelpCircle
} from 'lucide-react';
import { AudioInputMode } from '../types/subtitle';
import { AudioVisualizer } from './AudioVisualizer';

interface MeetingControlsProps {
  isListening: boolean;
  audioMode: AudioInputMode;
  onToggleListen: () => void;
  onChangeAudioMode: (mode: AudioInputMode) => void;
  onClearTranscript: () => void;
  subtitleCount: number;
  activeSpeaker?: string;
  onOpenHeadphoneGuide?: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isListening,
  audioMode,
  onToggleListen,
  onChangeAudioMode,
  onClearTranscript,
  subtitleCount,
  activeSpeaker,
  onOpenHeadphoneGuide,
}) => {
  return (
    <div className="w-full bg-[#0d121e]/90 border border-slate-800/80 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-xl shadow-black/40 backdrop-blur-md">
      {/* Single Line Controls Row */}
      <div className="flex flex-row items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* Left: Main Action Button & Visualizer in one row */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleListen}
            className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all duration-300 transform active:scale-95 whitespace-nowrap shrink-0 ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
                : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-indigo-500/30'
            }`}
          >
            {isListening ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>หยุดการแปล (Stop)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>เริ่มแปลสด (Start Translation)</span>
              </>
            )}
          </button>

          {/* Audio Visualizer & Status */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800/90 rounded-xl px-3 py-1.5 shrink-0 whitespace-nowrap">
            <AudioVisualizer isActive={isListening} barCount={8} />
            <div className="text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isListening ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className={isListening ? 'text-emerald-300' : 'text-slate-400'}>
                  {isListening ? 'กำลังดักฟังเสียง (Live)' : 'พร้อมทำงาน (Standby)'}
                </span>
              </div>
              {isListening && activeSpeaker && (
                <p className="text-[10px] text-slate-400 truncate max-w-[100px]">
                  🎙️ {activeSpeaker}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center: Audio Source Selection Modes */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800/90 p-1 rounded-xl shrink-0 whitespace-nowrap">
          <button
            onClick={() => onChangeAudioMode('mic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              audioMode === 'mic'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>ไมโครโฟน (Mic)</span>
          </button>

          <button
            onClick={() => onChangeAudioMode('tab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              audioMode === 'tab'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>เสียงแท็บการประชุม (Tab)</span>
          </button>

          <button
            onClick={() => onChangeAudioMode('headphones')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              audioMode === 'headphones'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-cyan-300" />
            <span>หูฟัง (Headphones)</span>
          </button>

          {onOpenHeadphoneGuide && (
            <button
              onClick={onOpenHeadphoneGuide}
              title="คู่มือการใช้งานร่วมกับหูฟัง (Headphone Guide)"
              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors ml-0.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Latency & Clear */}
        <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Latency: </span>
            <span className="text-cyan-300 font-mono font-medium">&lt; 380ms</span>
          </div>

          {subtitleCount > 0 && (
            <button
              onClick={onClearTranscript}
              title="ล้างข้อความทั้งหมด (Clear Transcript)"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้าง</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Helpful Info Banners */}
      {audioMode === 'tab' && (
        <div className="mt-3.5 text-xs text-cyan-200/90 bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-cyan-300">เคล็ดลับการจับเสียง Google Meet / Zoom / YouTube:</span> เมื่อกดเริ่มแปล ให้เลือกแท็บเบราว์เซอร์ที่เปิดการประชุมอยู่ แล้วติ๊กเลือก <strong>"แชร์เสียงของแท็บ (Share tab audio)"</strong> ระบบจะดักฟังเสียงของผู้ร่วมประชุมภาษาอังกฤษและแปลเป็นซับไตเติลภาษาไทยให้สดทันที
          </div>
        </div>
      )}

      {audioMode === 'headphones' && (
        <div className="mt-3.5 text-xs text-cyan-200/90 bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3 flex items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <Headphones className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-300">โหมดใช้งานร่วมกับหูฟัง (Headphone Audio Pass-Through):</span> ระบบจะดักฟังเสียงภาษาอังกฤษจากในแท็บการประชุมตรงๆ พร้อมส่งต่อสัญญาณเสียงไปยังหูฟังของคุณตามปกติ (ไม่โดน Mute)
            </div>
          </div>
          {onOpenHeadphoneGuide && (
            <button
              onClick={onOpenHeadphoneGuide}
              className="underline text-cyan-300 hover:text-white font-medium shrink-0 ml-2 cursor-pointer"
            >
              ดูวิธีตั้งค่า &gt;
            </button>
          )}
        </div>
      )}
    </div>
  );
};
