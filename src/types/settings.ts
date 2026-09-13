export interface TerminologyRule {
  id: string;
  source: string; // English term (e.g., "PR", "sprint")
  target: string; // Thai translation (e.g., "Pull Request", "รอบการทำงาน")
}

export type SubtitleDisplayMode = 'bilingual' | 'thai-only' | 'en-only';
export type SubtitleFontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type SubtitleThemeColor = 'cyan' | 'yellow' | 'white' | 'emerald';

export interface AppSettings {
  displayMode: SubtitleDisplayMode;
  fontSize: SubtitleFontSize;
  textColor: SubtitleThemeColor;
  bgOpacity: number; // 0.2 to 1.0
  showTimestamp: boolean;
  autoScroll: boolean;
  customTerms: TerminologyRule[];
  geminiApiKey?: string;
  openaiApiKey?: string;
  sttEngine: 'web-speech';
  translationEngine: 'free-fast' | 'gemini' | 'openai';
  duplicateGuardMs: number; // Window to suppress repeated final speech results (ms)
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'bilingual',
  fontSize: 'medium',
  textColor: 'cyan',
  bgOpacity: 0.85,
  showTimestamp: true,
  autoScroll: true,
  customTerms: [
    { id: '1', source: 'sprint', target: 'รอบการพัฒนา (Sprint)' },
    { id: '2', source: 'pull request', target: 'การส่งโค้ดตรวจสอบ (Pull Request)' },
    { id: '3', source: 'standup', target: 'การประชุมอัปเดตสั้นๆ (Standup)' },
    { id: '4', source: 'KPI', target: 'ดัชนีชี้วัดความสำเร็จ (KPI)' },
    { id: '5', source: 'backend', target: 'ระบบหลังบ้าน (Backend)' },
    { id: '6', source: 'deploy', target: 'นำระบบขึ้นใช้งานจริง (Deploy)' },
  ],
  sttEngine: 'web-speech',
  translationEngine: 'free-fast',
  duplicateGuardMs: 4000,
};
