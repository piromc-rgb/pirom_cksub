import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ListTodo, 
  Check, 
  Copy, 
  Download, 
  FileText, 
  Loader2,
  RotateCw
} from 'lucide-react';
import { SubtitleSegment, SpeakerProfile } from '../types/subtitle';
import { AppSettings } from '../types/settings';
import { generateMeetingSummary } from '../services/translationService';
import { getSpeakerBadgeClasses } from './SpeakerBar';

interface SmartSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleSegment[];
  settings: AppSettings;
  speakers?: SpeakerProfile[];
}

export const SmartSummaryModal: React.FC<SmartSummaryModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  settings,
  speakers = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    executiveSummary: string;
    keyPoints: string[];
    actionItems: { task: string; owner: string; deadline?: string }[];
    decisions: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Calculate speaker statistics - always executed at top level
  const speakerStats = useMemo(() => {
    const total = subtitles.length;
    if (total === 0) return [];

    const countMap: Record<string, { name: string; count: number; speakerId?: string }> = {};
    for (const sub of subtitles) {
      const spkName = sub.speaker || 'Unknown';
      if (!countMap[spkName]) {
        countMap[spkName] = { name: spkName, count: 0, speakerId: sub.speakerId };
      }
      countMap[spkName].count++;
    }

    return Object.values(countMap)
      .map((item) => {
        const percent = Math.round((item.count / total) * 100);
        const matched = speakers.find((s) => s.id === item.speakerId || s.name === item.name);
        return {
          ...item,
          percent,
          color: matched?.color || 'cyan',
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [subtitles, speakers]);

  const handleGenerate = async () => {
    if (subtitles.length === 0) return;
    setLoading(true);
    try {
      const res = await generateMeetingSummary(subtitles, {
        geminiKey: settings.geminiApiKey,
      });
      setSummaryData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && subtitles.length > 0 && !summaryData) {
      handleGenerate();
    }
  }, [isOpen, subtitles.length]);

  if (!isOpen) return null;

  const getMarkdownSummary = () => {
    if (!summaryData) return '';

    const speakerSection =
      speakerStats.length > 0
        ? `\n## สถิติการมีส่วนร่วมของผู้พูด (Speaker Participation)\n` +
          speakerStats
            .map((s) => `- **${s.name}**: ${s.count} ประโยค (${s.percent}%)`)
            .join('\n') +
          '\n'
        : '';

    return `# 📋 สรุปการประชุมอัจฉริยะ (CHAKEN Sub AI Meeting Minutes)
วันที่: ${new Date().toLocaleDateString('th-TH')} | จำนวนข้อความ: ${subtitles.length} ประโยค
${speakerSection}
## 1. บทสรุปผู้บริหาร (Executive Summary)
${summaryData.executiveSummary}

## 2. ประเด็นสำคัญในการหารือ (Key Discussion Points)
${summaryData.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## 3. สิ่งที่ต้องทำต่อ (Action Items)
${summaryData.actionItems.map(a => `- [ ] **${a.task}** (ผู้รับผิดชอบ: ${a.owner || 'ยังไม่ระบุ'}, กำหนดส่ง: ${a.deadline || 'เร็วๆ นี้'})`).join('\n')}

## 4. ข้อตกลงและมติที่ประชุม (Agreed Decisions)
${summaryData.decisions.map(d => `- ✅ ${d}`).join('\n')}
`;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(getMarkdownSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([getMarkdownSummary()], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `Meeting_Summary_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>CHAKEN Sub Meeting Minutes</span>
                <span className="text-[11px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  AI สรุปผล
                </span>
              </h2>
              <p className="text-xs text-slate-400">สรุปใจความสำคัญ มติที่ประชุม และ Action Items เป็นภาษาไทย</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subtitles.length > 0 && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                title="สร้างสรุปใหม่จากบทสนทนาล่าสุด"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">สร้างสรุปใหม่</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {subtitles.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-200">ยังไม่มีประโยคการประชุมในขณะนี้</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                กรุณากดปุ่ม <strong>"เริ่มแปลสด (Start Translation)"</strong> แล้วพูดสนทนาเพื่อให้ระบบเริ่มบันทึกประโยค จากนั้นระบบจะสร้างสรุปการประชุมอัจฉริยะ (AI Minutes) ให้ทันทีครับ
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
              <p className="text-sm font-medium text-slate-300">AI กำลังวิเคราะห์และสรุปผลการประชุมเป็นภาษาไทย...</p>
              <p className="text-xs text-slate-500">กรุณารอสักครู่ (Extracting key decisions and actions)</p>
            </div>
          ) : summaryData ? (
            <div className="space-y-6">
              {/* Speaker Participation Stats */}
              {speakerStats.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                    <span>👥 สัดส่วนการพูดคุยของผู้ร่วมประชุม (Speaker Participation)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {speakerStats.map((spk, idx) => {
                      const badgeClass = getSpeakerBadgeClasses(spk.color);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}>
                              🎙️ {spk.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-400">{spk.count} ประโยค</span>
                            <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded-md">
                              {spk.percent}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Executive Summary */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                  <span>📌 บทสรุปผู้บริหาร (Executive Summary)</span>
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {summaryData.executiveSummary}
                </p>
              </div>

              {/* Key Discussion Points */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                  <span>💬 ประเด็นสำคัญที่หารือ (Key Discussion Points)</span>
                </h3>
                <ul className="space-y-2">
                  {summaryData.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                        {index + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Items */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-amber-400" />
                  <span>สิ่งที่ต้องทำต่อ (Action Items)</span>
                </h3>
                <div className="space-y-2.5">
                  {summaryData.actionItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span className="text-slate-200 font-medium">{item.task}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          👤 {item.owner}
                        </span>
                        {item.deadline && (
                          <span className="bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded text-[11px] border border-amber-500/20">
                            ⏳ {item.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agreed Decisions */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>ข้อตกลงและมติที่ประชุม (Decisions)</span>
                </h3>
                <ul className="space-y-2">
                  {summaryData.decisions.map((dec, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-emerald-200/90">
                      <span className="text-emerald-400">✓</span>
                      <span>{dec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {summaryData && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
            <button
              onClick={handleGenerate}
              className="text-xs text-slate-400 hover:text-white underline transition-colors"
            >
              สร้างสรุปใหม่อีกครั้ง (Regenerate)
            </button>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก Markdown'}</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด (.md)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
