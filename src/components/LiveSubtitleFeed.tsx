import React, { useRef, useEffect, useState } from 'react';
import { 
  ArrowDown, 
  Search, 
  Subtitles, 
  Languages
} from 'lucide-react';
import { SubtitleSegment } from '../types/subtitle';
import { AppSettings } from '../types/settings';
import { SubtitleItem } from './SubtitleItem';

interface LiveSubtitleFeedProps {
  subtitles: SubtitleSegment[];
  currentInterim: SubtitleSegment | null;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const LiveSubtitleFeed: React.FC<LiveSubtitleFeedProps> = ({
  subtitles,
  currentInterim,
  settings,
  onUpdateSettings,
}) => {
  const feedEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto scroll effect
  useEffect(() => {
    if (settings.autoScroll && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [subtitles, currentInterim, settings.autoScroll]);

  // Filter subtitles if search query is active
  const filteredSubtitles = subtitles.filter(s =>
    s.englishText.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.thaiText.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0b0f1a]/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Subtitle Feed Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/70 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Subtitles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            กระแสคำบรรยายเรียลไทม์ (Live Subtitle Stream)
          </h2>
          <span className="text-xs bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-full border border-slate-700/60">
            {subtitles.length} รายการ
          </span>
        </div>

        {/* Quick controls: Display mode & Search */}
        <div className="flex items-center gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="ค้นหาข้อความ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 w-32 sm:w-44 transition-all"
            />
          </div>

          {/* Quick Display Mode Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => onUpdateSettings({ displayMode: 'bilingual' })}
              className={`px-2 py-1 rounded-md transition-colors ${
                settings.displayMode === 'bilingual'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="แสดงทั้งสองภาษา (ไทย + อังกฤษ)"
            >
              สองภาษา
            </button>
            <button
              onClick={() => onUpdateSettings({ displayMode: 'thai-only' })}
              className={`px-2 py-1 rounded-md transition-colors ${
                settings.displayMode === 'thai-only'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="แสดงเฉพาะภาษาไทย"
            >
              เฉพาะไทย
            </button>
            <button
              onClick={() => onUpdateSettings({ displayMode: 'en-only' })}
              className={`px-2 py-1 rounded-md transition-colors ${
                settings.displayMode === 'en-only'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="แสดงเฉพาะภาษาอังกฤษ"
            >
              เฉพาะอังกฤษ
            </button>
          </div>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => onUpdateSettings({ autoScroll: !settings.autoScroll })}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              settings.autoScroll
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title={settings.autoScroll ? 'เลื่อนอัตโนมัติ: เปิด' : 'เลื่อนอัตโนมัติ: ปิด'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[380px] max-h-[600px]">
        {/* Empty State */}
        {subtitles.length === 0 && !currentInterim && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
              <Languages className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-medium text-slate-200">
                พร้อมแปลการประชุมแบบ Real-time (EN ➔ TH)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                กดปุ่ม <strong>"เริ่มแปลสด (Start Translation)"</strong> เพื่อเริ่มดักฟังเสียงพูดภาษาอังกฤษจากไมโครโฟน หรือเลือกเสียงแท็บ Google Meet / Zoom / Teams
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 text-left w-full max-w-lg">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/70 text-xs">
                <span className="font-semibold text-cyan-300 block mb-1">⚡ Instant Latency</span>
                แปลภาษาอังกฤษเป็นไทยเร็วระดับ &lt; 400ms
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/70 text-xs">
                <span className="font-semibold text-indigo-300 block mb-1">🖥️ PiP Overlay</span>
                หน้าต่างลอยตัววางซ้อนบน Zoom หรือ Meet ได้
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/70 text-xs">
                <span className="font-semibold text-emerald-300 block mb-1">📝 AI Minutes</span>
                สรุปประเด็นสำคัญและงานที่ต้องทำหลังจบประชุม
              </div>
            </div>
          </div>
        )}

        {/* Existing Confirmed Subtitles */}
        {filteredSubtitles.map((segment) => (
          <SubtitleItem key={segment.id} segment={segment} settings={settings} />
        ))}

        {/* Current Active Interim Segment */}
        {currentInterim && (
          <SubtitleItem key="interim-active" segment={currentInterim} settings={settings} />
        )}

        <div ref={feedEndRef} />
      </div>
    </div>
  );
};
