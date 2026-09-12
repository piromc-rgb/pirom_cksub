import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Sparkles, 
  Edit2, 
  Trash2, 
  Check, 
  X
} from 'lucide-react';
import { SpeakerProfile, SpeakerColor } from '../types/subtitle';

interface SpeakerBarProps {
  speakers: SpeakerProfile[];
  activeSpeakerId: string;
  autoDiarize: boolean;
  onSelectSpeaker: (speakerId: string) => void;
  onToggleAutoDiarize: () => void;
  onAddSpeaker: () => void;
  onUpdateSpeaker: (id: string, updates: Partial<SpeakerProfile>) => void;
  onDeleteSpeaker: (id: string) => void;
  isVoiceActive?: boolean;
}

export const COLOR_OPTIONS: { id: SpeakerColor; label: string; badge: string; dot: string }[] = [
  { id: 'cyan', label: 'Cyan', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', dot: 'bg-cyan-400' },
  { id: 'purple', label: 'Purple', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', dot: 'bg-purple-400' },
  { id: 'emerald', label: 'Emerald', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' },
  { id: 'amber', label: 'Amber', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-400' },
  { id: 'rose', label: 'Rose', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', dot: 'bg-rose-400' },
  { id: 'indigo', label: 'Indigo', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', dot: 'bg-indigo-400' },
  { id: 'blue', label: 'Blue', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', dot: 'bg-blue-400' },
];

export const getSpeakerBadgeClasses = (color?: SpeakerColor) => {
  const match = COLOR_OPTIONS.find((c) => c.id === color);
  return match ? match.badge : COLOR_OPTIONS[0].badge;
};

export const SpeakerBar: React.FC<SpeakerBarProps> = ({
  speakers,
  activeSpeakerId,
  autoDiarize,
  onSelectSpeaker,
  onToggleAutoDiarize,
  onAddSpeaker,
  onUpdateSpeaker,
  onDeleteSpeaker,
  isVoiceActive = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<SpeakerColor>('cyan');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [editPitch, setEditPitch] = useState<number>(120);

  const handleStartEdit = (speaker: SpeakerProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(speaker.id);
    setEditName(speaker.name);
    setEditColor(speaker.color);
    const g = speaker.gender || (speaker.pitchBaseline && speaker.pitchBaseline > 165 ? 'female' : 'male');
    setEditGender(g);
    setEditPitch(speaker.pitchBaseline || (g === 'female' ? 215 : 120));
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingId && editName.trim()) {
      onUpdateSpeaker(editingId, { 
        name: editName.trim(), 
        color: editColor,
        gender: editGender,
        pitchBaseline: editPitch
      });
      setEditingId(null);
    }
  };

  return (
    <div className="w-full bg-[#0a0f1b]/85 border border-slate-800/80 rounded-2xl px-4 py-2.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      {/* Left: Speaker chips list */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 shrink-0 mr-1">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">ผู้พูด:</span>
        </div>

        {speakers.map((spk) => {
          const isActive = spk.id === activeSpeakerId;
          const badgeClass = getSpeakerBadgeClasses(spk.color);

          return (
            <div
              key={spk.id}
              onClick={() => onSelectSpeaker(spk.id)}
              className={`group relative flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 border shrink-0 ${
                isActive
                  ? `${badgeClass} ring-2 ring-indigo-500/50 shadow-sm shadow-indigo-500/20`
                  : 'bg-slate-900/80 hover:bg-slate-800/90 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {/* Active mic wave / voice indicator */}
              {isActive && isVoiceActive ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-current' : 'bg-slate-500'}`} />
              )}

              <span className="text-xs">{spk.gender === 'female' ? '👩' : '👨'}</span>
              <span>{spk.name}</span>

              {/* Edit button */}
              <button
                onClick={(e) => handleStartEdit(spk, e)}
                title="แก้ไขชื่อและสีผู้พูด"
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded transition-opacity"
              >
                <Edit2 className="w-3 h-3" />
              </button>

              {/* Delete button (if > 1) */}
              {speakers.length > 1 && !isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSpeaker(spk.id);
                  }}
                  title="ลบผู้พูดนี้"
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 rounded transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Speaker button */}
        <button
          onClick={onAddSpeaker}
          title="เพิ่มผู้พูดคนใหม่ (Add Speaker)"
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-dashed border-slate-700 hover:border-cyan-500/50 transition-all shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>เพิ่มผู้พูด</span>
        </button>
      </div>

      {/* Right: Auto Diarization Toggle */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/60">
        <button
          onClick={onToggleAutoDiarize}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
            autoDiarize
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="วิเคราะห์ระดับเสียง (Voice Pitch) และจังหวะเว้นวรรคเพื่อสลับผู้พูดอัตโนมัติ"
        >
          <Sparkles className={`w-3.5 h-3.5 ${autoDiarize ? 'text-indigo-400' : 'text-slate-500'}`} />
          <span>ตรวจจับอัตโนมัติ:</span>
          <span className={`font-semibold ${autoDiarize ? 'text-emerald-300' : 'text-slate-500'}`}>
            {autoDiarize ? 'เปิด (Auto)' : 'ปิด (Manual)'}
          </span>
        </button>
      </div>

      {/* Inline Edit Modal / Popover */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#0f1523] border border-slate-700/80 rounded-2xl p-4 sm:p-5 w-full max-w-sm shadow-2xl animate-fade-in space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>แก้ไขข้อมูลผู้พูด</span>
              </h4>
              <button
                onClick={() => setEditingId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">ชื่อผู้พูด (Speaker Name)</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="เช่น สมชาย, Sarah, Host"
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">สีประจำตัว (Speaker Color)</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setEditColor(col.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      editColor === col.id
                        ? `${col.badge} ring-2 ring-indigo-500`
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span>{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">ประเภทเสียงผู้พูด (Speaker Gender / Voice)</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditGender('male');
                    setEditPitch(120);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition-all ${
                    editGender === 'male'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-lg">👨</span>
                  <div>
                    <div className="font-semibold text-white">เสียงผู้ชาย (Male)</div>
                    <div className="text-[10px] text-slate-400">โทนทุ้มลึก (~120 Hz)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditGender('female');
                    setEditPitch(215);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition-all ${
                    editGender === 'female'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-lg">👩</span>
                  <div>
                    <div className="font-semibold text-white">เสียงผู้หญิง (Female)</div>
                    <div className="text-[10px] text-slate-400">โทนแหลมสูง (~215 Hz)</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleSaveEdit()}
                className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
