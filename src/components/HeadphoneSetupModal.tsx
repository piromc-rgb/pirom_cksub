import React, { useState } from 'react';
import { 
  X, 
  Headphones, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Laptop, 
  HelpCircle,
  Volume2,
  Key
} from 'lucide-react';
import { AppSettings } from '../types/settings';

interface HeadphoneSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
}

export const HeadphoneSetupModal: React.FC<HeadphoneSetupModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'easy' | 'mac' | 'windows'>('easy');

  if (!isOpen) return null;

  const handleSaveKey = () => {
    onSaveSettings({ geminiApiKey: geminiKey.trim() });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>วิธีใช้งาน CHAKEN Sub ร่วมกับหูฟัง (Headphone Guide)</span>
              </h2>
              <p className="text-xs text-slate-400">วิธีแปลเสียงการประชุมสดเมื่อสวมใส่หูฟังใน Google Meet / Zoom / Teams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/40 text-xs font-medium">
          <button
            onClick={() => setActiveTab('easy')}
            className={`flex items-center gap-1.5 py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'easy'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>วิธีที่ 1: ใช้เสียงแท็บดิจิทัล (แนะนำ ง่ายที่สุด)</span>
          </button>
          <button
            onClick={() => setActiveTab('mac')}
            className={`flex items-center gap-1.5 py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'mac'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>วิธีที่ 2: Mac (BlackHole)</span>
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-1.5 py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'windows'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>วิธีที่ 3: Windows (Stereo Mix)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300 leading-relaxed">
          {activeTab === 'easy' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-800/40 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>ดักฟังเสียงจากแท็บการประชุมตรงๆ (Audio Pass-Through)</span>
                </h3>
                <p>
                  เมื่อสวมหูฟัง เสียงจากที่ประชุมจะไม่ดังออกลำโพงภายนอก ทำให้ไมโครโฟนทั่วไปไม่ได้ยินเสียงคนอื่น แต่ในโหมด <strong>"หูฟัง / เสียงแท็บ"</strong> ระบบจะดักฟังข้อมูลเสียงดิจิทัลจากในแท็บ Google Meet / Zoom ได้โดยตรง และยังคงส่งเสียงไปยังหูฟังของคุณตามปกติ ไม่โดน Mute เสียง!
                </p>
              </div>

              {/* Gemini API Key Box */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>ใส่ Google Gemini API Key (ฟรี เพื่อถอดเสียงจากในสายหูฟัง):</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline font-medium"
                  >
                    <span>ขอ API Key ฟรีที่นี่ (Google AI Studio)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="วางคีย์ AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    onClick={handleSaveKey}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
                  >
                    {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
                    <span>{savedSuccess ? 'บันทึกแล้ว!' : 'บันทึก'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  💡 Gemini API ใช้งานได้ฟรี 1,500 ครั้งต่อวัน เพียงพอต่อการประชุมทั้งวันอย่างต่อเนื่อง
                </p>
              </div>

              {/* Step by Step */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white">ขั้นตอนการเริ่มประชุมด้วยหูฟัง:</h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300">
                  <li>กดเลือกโหมด <strong>"🎧 หูฟัง (Headphones)"</strong> ในหน้าควบคุม</li>
                  <li>กดปุ่ม <strong>"เริ่มแปลสด (Start Translation)"</strong></li>
                  <li>หน้าต่างเบราว์เซอร์จะเด้งขึ้นมา ให้เลือกแท็บที่มีการประชุม (เช่น Google Meet หรือ Zoom)</li>
                  <li><strong>สำคัญมาก:</strong> ติ๊กเลือกช่อง <strong>"แชร์เสียงของแท็บ (Share tab audio)"</strong> แล้วกดแชร์</li>
                  <li>ระบบจะเริ่มดักฟังและแปลเป็นภาษาไทยสดทันที โดยที่เสียงการประชุมยังคงดังในหูฟังของคุณตามปกติ</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'mac' && (
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-indigo-300">
                  สำหรับผู้ใช้ Mac (ต้องการใช้ Web Speech API ฟรี 100% โดยไม่ต้องใช้ API Key)
                </h3>
                <p>
                  บน macOS หากต้องการให้เบราว์เซอร์ดักฟังเสียงจากโปรแกรม Zoom Desktop หรือ Teams เข้ามายังระบบถอดเสียงไมโครโฟนได้โดยตรงแม้จะใส่หูฟังอยู่:
                </p>
              </div>
              <ol className="list-decimal list-inside space-y-2 pl-1">
                <li>
                  ติดตั้ง <strong>BlackHole 2ch</strong> (Virtual Audio Driver ฟรี):{' '}
                  <a
                    href="https://existential.audio/blackhole/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline inline-flex items-center gap-0.5"
                  >
                    existential.audio/blackhole <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  เปิดโปรแกรม <strong>Audio MIDI Setup</strong> บน Mac (กด Cmd + Space แล้วค้นหา Audio MIDI Setup)
                </li>
                <li>
                  กดเครื่องหมาย <strong>+</strong> มุมล่างซ้าย แล้วเลือก <strong>Create Multi-Output Device</strong>
                </li>
                <li>
                  ติ๊กเลือก 2 อย่างพร้อมกัน: <strong>"หูฟังของคุณ"</strong> และ <strong>"BlackHole 2ch"</strong>
                </li>
                <li>
                  ใน System Settings ของ Mac ให้เลือก Output เป็น <strong>Multi-Output Device</strong> (เสียงจะดังทั้งในหูฟังและวิ่งเข้า BlackHole)
                </li>
                <li>
                  ในเว็บ CHAKEN Sub ให้ตั้งค่าไมโครโฟนของเบราว์เซอร์เป็น <strong>BlackHole 2ch</strong>
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'windows' && (
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-emerald-300">
                  สำหรับผู้ใช้ Windows (ใช้งานผ่าน Stereo Mix)
                </h3>
                <p>
                  บน Windows สามารถเปิดใช้งานฟังก์ชันจำลองเสียงสเตอริโอมิกซ์ เพื่อให้เสียงจากหูฟังส่งเข้ามายังระบบถอดเสียงได้:
                </p>
              </div>
              <ol className="list-decimal list-inside space-y-2 pl-1">
                <li>คลิกขวาที่ไอคอนรูปลำโพงมุมล่างขวาของ Taskbar แล้วเลือก <strong>Sound settings</strong></li>
                <li>เลื่อนลงมาเลือก <strong>More sound settings</strong> (เปิดหน้าต่าง Sound Control Panel)</li>
                <li>ไปที่แท็บ <strong>Recording</strong></li>
                <li>คลิกขวาในพื้นที่ว่างแล้วติ๊ก <strong>Show Disabled Devices</strong></li>
                <li>คลิกขวาที่ <strong>Stereo Mix</strong> แล้วกด <strong>Enable</strong> และ <strong>Set as Default Device</strong></li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/50">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>มีข้อสงสัยหรือติดปัญหาการใช้งาน สามารถกดเปิดคู่มือนี้ได้ตลอดเวลา</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            เข้าใจแล้ว (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
