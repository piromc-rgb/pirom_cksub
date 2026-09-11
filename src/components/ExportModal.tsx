import React, { useState } from 'react';
import { X, Download, FileText, Film, Code } from 'lucide-react';
import { SubtitleSegment } from '../types/subtitle';
import { AppSettings } from '../types/settings';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleSegment[];
  settings: AppSettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  settings,
}) => {
  const [downloadFormat, setDownloadFormat] = useState<'srt' | 'txt' | 'json'>('srt');

  if (!isOpen) return null;

  /**
   * Helper to format milliseconds into SRT timestamp format (HH:MM:SS,mmm)
   */
  const formatSrtTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const millis = (ms % 1000).toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${millis}`;
  };

  /**
   * Generate SRT subtitle content
   */
  const generateSrt = () => {
    let output = '';
    subtitles.forEach((sub, index) => {
      const startTime = sub.rawTimeMs || index * 4000;
      const endTime = startTime + 3500;
      output += `${index + 1}\n`;
      output += `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n`;
      if (settings.displayMode === 'bilingual') {
        output += `${sub.thaiText}\n${sub.englishText}\n\n`;
      } else if (settings.displayMode === 'thai-only') {
        output += `${sub.thaiText}\n\n`;
      } else {
        output += `${sub.englishText}\n\n`;
      }
    });
    return output;
  };

  /**
   * Generate Plain Text transcript
   */
  const generateTxt = () => {
    return subtitles
      .map(s => `[${s.timestamp}] ${s.speaker}:\n(EN) ${s.englishText}\n(TH) ${s.thaiText}\n`)
      .join('\n');
  };

  const handleDownload = () => {
    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (downloadFormat === 'srt') {
      content = generateSrt();
      ext = 'srt';
    } else if (downloadFormat === 'txt') {
      content = generateTxt();
      ext = 'txt';
    } else {
      content = JSON.stringify(subtitles, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting_subtitles_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-cyan-400 border border-indigo-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">ส่งออกคำบรรยาย (Export Subtitles)</h2>
              <p className="text-xs text-slate-400">ดาวน์โหลดคำบรรยายเพื่อนำไปใช้ในวิดีโอหรือจัดเก็บเอกสาร</p>
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
        <div className="p-6 space-y-4">
          <label className="block text-xs font-medium text-slate-300">
            เลือกรูปแบบไฟล์ที่ต้องการ (Export Format)
          </label>

          <div className="grid grid-cols-3 gap-3">
            {/* SRT */}
            <button
              onClick={() => setDownloadFormat('srt')}
              className={`p-3.5 rounded-xl border text-center transition-all ${
                downloadFormat === 'srt'
                  ? 'bg-indigo-600/20 border-cyan-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Film className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
              <div className="text-xs font-semibold text-white">ไฟล์ซับไตเติล .SRT</div>
              <div className="text-[10px] text-slate-400 mt-1">สำหรับ YouTube, Premiere, VLC</div>
            </button>

            {/* TXT */}
            <button
              onClick={() => setDownloadFormat('txt')}
              className={`p-3.5 rounded-xl border text-center transition-all ${
                downloadFormat === 'txt'
                  ? 'bg-indigo-600/20 border-cyan-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <FileText className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
              <div className="text-xs font-semibold text-white">ข้อความถอดเสียง .TXT</div>
              <div className="text-[10px] text-slate-400 mt-1">บทบันทึกการประชุมพร้อมเวลา</div>
            </button>

            {/* JSON */}
            <button
              onClick={() => setDownloadFormat('json')}
              className={`p-3.5 rounded-xl border text-center transition-all ${
                downloadFormat === 'json'
                  ? 'bg-indigo-600/20 border-cyan-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Code className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <div className="text-xs font-semibold text-white">โครงสร้างข้อมูล .JSON</div>
              <div className="text-[10px] text-slate-400 mt-1">ข้อมูลแบบ Raw สำหรับนักพัฒนา</div>
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-xs text-slate-300">
            <span className="font-semibold text-cyan-300">จำนวนคำบรรยายทั้งหมด: </span>
            {subtitles.length} ประโยค
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleDownload}
            disabled={subtitles.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดทันที</span>
          </button>
        </div>
      </div>
    </div>
  );
};
