import React, { useState } from 'react';
import { X, Headphones, Apple, MonitorCog, Info } from 'lucide-react';

interface HeadphoneSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Platform = 'macos' | 'windows';

export const HeadphoneSetupModal: React.FC<HeadphoneSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [platform, setPlatform] = useState<Platform>('macos');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-cyan-400 border border-indigo-500/30">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">ใช้ Headphone (Setup Guide)</h2>
              <p className="text-xs text-slate-400">วิธีตั้งค่าให้แปลเสียงประชุมได้แม้ใส่หูฟัง</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-xs text-cyan-200/90 bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              ระบบดักฟังเสียงผ่าน <strong>ไมโครโฟน</strong> ของเครื่องเท่านั้น ถ้าใส่หูฟัง เสียงคู่สนทนาจะไม่ลอดออกมาให้ไมค์ได้ยิน
              ต้อง <strong>mix เสียงประชุมกลับเข้าไมค์</strong> ด้วยโปรแกรม Virtual Audio ก่อน แล้วเลือกโหมด "ไมโครโฟน" ในแอปตามปกติ
            </div>
          </div>

          {/* Platform Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setPlatform('macos')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                platform === 'macos'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>macOS (BlackHole)</span>
            </button>
            <button
              onClick={() => setPlatform('windows')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                platform === 'windows'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MonitorCog className="w-3.5 h-3.5" />
              <span>Windows 11 (VoiceMeeter)</span>
            </button>
          </div>

          {/* Steps */}
          {platform === 'macos' ? (
            <ol className="space-y-3 text-xs sm:text-sm text-slate-300">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">1</span>
                <span>ติดตั้ง BlackHole 2ch ผ่าน Terminal: <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono text-[11px]">brew install blackhole-2ch</code></span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">2</span>
                <span>เปิด <strong>Audio MIDI Setup</strong> → สร้าง <strong>Multi-Output Device</strong> โดยติ๊กทั้งหูฟังจริง + BlackHole 2ch (ใช้สำหรับฟังเสียงประชุม)</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">3</span>
                <span>ใน Audio MIDI Setup เดียวกัน → สร้าง <strong>Aggregate Device</strong> โดยติ๊ก mic จริง + BlackHole 2ch (ใช้เป็น input ให้เบราว์เซอร์)</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">4</span>
                <span>ตั้งเสียงออกของ Zoom/Google Meet ให้ไปที่ <strong>Multi-Output Device</strong> และตั้ง Chrome ให้ใช้ <strong>Aggregate Device</strong> เป็นไมโครโฟน</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">5</span>
                <span>กลับมาที่ CHAKEN Sub เลือกโหมด <strong>"ไมโครโฟน (Microphone)"</strong> ตามปกติ — จะได้ยินหูฟังปกติ พร้อมแปลเสียงประชุมได้ครบ</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-xs sm:text-sm text-slate-300">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">1</span>
                <span>โหลดและติดตั้ง <strong>VoiceMeeter</strong> (ฟรี) จาก <span className="text-cyan-300">vb-audio.com/Voicemeeter</span></span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">2</span>
                <span>เปิด VoiceMeeter → ตั้ง <strong>Hardware Input 1</strong> เป็นไมค์จริง และ <strong>Hardware Out A1</strong> เป็นหูฟังจริง</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">3</span>
                <span>Windows Sound Settings → ตั้ง default playback device (หรือเจาะจงแค่ Zoom/Chrome) เป็น <strong>VoiceMeeter Input</strong></span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">4</span>
                <span>ตอน Chrome ขอสิทธิ์ไมโครโฟน เลือก <strong>"VoiceMeeter Output"</strong> เป็น input device</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">5</span>
                <span>กลับมาที่ CHAKEN Sub เลือกโหมด <strong>"ไมโครโฟน (Microphone)"</strong> ตามปกติ — จะได้ยินหูฟังปกติ พร้อมแปลเสียงประชุมได้ครบ</span>
              </li>
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
};
