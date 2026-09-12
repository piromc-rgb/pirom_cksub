import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  BookOpen, 
  Palette, 
  Cpu, 
  Plus, 
  Trash2, 
  RotateCcw,
  Check
} from 'lucide-react';
import { AppSettings, DEFAULT_SETTINGS, TerminologyRule } from '../types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'terminology' | 'engine'>('display');
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);

  // New term form
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');

  if (!isOpen) return null;

  const handleAddTerm = () => {
    if (!newSource.trim() || !newTarget.trim()) return;
    const newRule: TerminologyRule = {
      id: Date.now().toString(),
      source: newSource.trim(),
      target: newTarget.trim(),
    };
    setCurrentSettings(prev => ({
      ...prev,
      customTerms: [...prev.customTerms, newRule],
    }));
    setNewSource('');
    setNewTarget('');
  };

  const handleRemoveTerm = (id: string) => {
    setCurrentSettings(prev => ({
      ...prev,
      customTerms: prev.customTerms.filter(t => t.id !== id),
    }));
  };

  const handleSaveAndClose = () => {
    onSave(currentSettings);
    onClose();
  };

  const handleResetDefaults = () => {
    setCurrentSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">ตั้งค่าระบบ (Preferences)</h2>
              <p className="text-xs text-slate-400">ปรับแต่งการแสดงผลและพจนานุกรมแปลภาษา</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/30">
          <button
            onClick={() => setActiveTab('display')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'display'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>รูปแบบคำบรรยาย (Appearance)</span>
          </button>

          <button
            onClick={() => setActiveTab('terminology')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'terminology'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>พจนานุกรมเฉพาะทาง (Dictionary)</span>
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'engine'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>เครื่องมือแปล AI (Engine)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Display */}
          {activeTab === 'display' && (
            <div className="space-y-5">
              {/* Display Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  โหมดแสดงภาษา (Display Mode)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'bilingual', title: 'สองภาษา (Bilingual)', desc: 'แสดงทั้งไทยและอังกฤษ' },
                    { id: 'thai-only', title: 'เฉพาะไทย (Thai)', desc: 'แสดงเฉพาะคำแปล' },
                    { id: 'en-only', title: 'เฉพาะอังกฤษ (EN)', desc: 'แสดงเฉพาะเสียงพูด' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setCurrentSettings({ ...currentSettings, displayMode: mode.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentSettings.displayMode === mode.id
                          ? 'bg-indigo-600/20 border-cyan-400 text-white shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs text-white">{mode.title}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  ขนาดตัวอักษรคำบรรยาย (Font Size)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setCurrentSettings({ ...currentSettings, fontSize: size })}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium capitalize transition-all ${
                        currentSettings.fontSize === size
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Color Theme */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  สีตัวอักษรภาษาไทย (Highlight Color)
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { id: 'cyan', label: 'Cyan Blue', color: '#38bdf8' },
                    { id: 'yellow', label: 'Golden Amber', color: '#fbbf24' },
                    { id: 'emerald', label: 'Emerald Green', color: '#34d399' },
                    { id: 'white', label: 'Pure White', color: '#ffffff' },
                  ].map((colorOpt) => (
                    <button
                      key={colorOpt.id}
                      onClick={() => setCurrentSettings({ ...currentSettings, textColor: colorOpt.id as any })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                        currentSettings.textColor === colorOpt.id
                          ? 'bg-slate-800 border-cyan-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: colorOpt.color }} />
                      <span>{colorOpt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Opacity */}
              <div>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-slate-300 font-medium">ความทึบของพื้นหลัง (Background Opacity)</span>
                  <span className="text-cyan-400 font-mono">{Math.round(currentSettings.bgOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={currentSettings.bgOpacity}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, bgOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.showTimestamp}
                    onChange={(e) => setCurrentSettings({ ...currentSettings, showTimestamp: e.target.checked })}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>แสดงเวลา (Show Timestamp)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Terminology Dictionary */}
          {activeTab === 'terminology' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                กำหนดคำศัพท์เฉพาะทาง คำย่อ หรือชื่อเฉพาะ เพื่อให้ระบบแปลเป็นภาษาไทยตรงตามความต้องการขององค์กร (เช่น คำศัพท์วงการ IT, การเงิน, การแพทย์)
              </p>

              {/* Add Term Form */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  placeholder="คำภาษาอังกฤษ (e.g. PR)"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="text"
                  placeholder="คำแปลไทยที่ต้องการ (e.g. Pull Request)"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleAddTerm}
                  className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold py-2 px-3 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่ม</span>
                </button>
              </div>

              {/* Terminology List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {currentSettings.customTerms.map((term) => (
                  <div
                    key={term.id}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-indigo-300 font-mono">{term.source}</span>
                      <span className="text-slate-500">➔</span>
                      <span className="text-emerald-300 font-medium">{term.target}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveTerm(term.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Engine */}
          {activeTab === 'engine' && (
            <div className="space-y-5">
              {/* Translation Engine */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  เอนจินการแปลภาษา (Translation Engine)
                </label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 cursor-pointer hover:border-slate-700">
                    <input
                      type="radio"
                      name="engine"
                      value="free-fast"
                      checked={currentSettings.translationEngine === 'free-fast'}
                      onChange={() => setCurrentSettings({ ...currentSettings, translationEngine: 'free-fast' })}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>Free High-Speed Translation (ค่าเริ่มต้น - แนะนำ)</span>
                        <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded">ใช้งานฟรี</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ความเร็วสูง ไม่ต้องใส่ API Key แปลภาษาอังกฤษเป็นไทยได้ทันที
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 cursor-pointer hover:border-slate-700">
                    <input
                      type="radio"
                      name="engine"
                      value="gemini"
                      checked={currentSettings.translationEngine === 'gemini'}
                      onChange={() => setCurrentSettings({ ...currentSettings, translationEngine: 'gemini' })}
                      className="mt-1"
                    />
                    <div className="w-full">
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>Google Gemini 1.5 Flash (AI Context Aware)</span>
                        <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 rounded">AI Pro</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        เข้าใจบริบททางธุรกิจและสำนวนอย่างลึกซึ้ง พร้อมสร้างสรุปการประชุมอัจฉริยะ
                      </p>

                      {currentSettings.translationEngine === 'gemini' && (
                        <div className="mt-2.5">
                          <input
                            type="password"
                            placeholder="ระบุ Gemini API Key ของคุณ (AIzaSy...)"
                            value={currentSettings.geminiApiKey || ''}
                            onChange={(e) => setCurrentSettings({ ...currentSettings, geminiApiKey: e.target.value })}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น (Reset)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
