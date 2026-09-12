export type SpeakerColor = 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue';

export type SpeakerGender = 'male' | 'female';

export interface SpeakerProfile {
  id: string;
  name: string;
  color: SpeakerColor;
  gender?: SpeakerGender;
  pitchBaseline?: number; // Estimated F0 in Hz (e.g. 120 for male voice, 215 for female voice)
  isDefault?: boolean;
}

export const DEFAULT_SPEAKERS: SpeakerProfile[] = [
  { id: 'spk_male', name: 'ผู้ชาย (Male)', color: 'cyan', gender: 'male', pitchBaseline: 120, isDefault: true },
  { id: 'spk_female', name: 'ผู้หญิง (Female)', color: 'rose', gender: 'female', pitchBaseline: 215 },
];

export interface SubtitleSegment {
  id: string;
  timestamp: string; // e.g. "10:24:12"
  rawTimeMs: number;
  speaker: string;
  speakerId?: string;
  englishText: string;
  thaiText: string;
  isFinal: boolean;
  confidence?: number;
}

export type AudioInputMode = 'mic' | 'tab' | 'headphones';

export interface MeetingSummaryData {
  title: string;
  date: string;
  duration: string;
  executiveSummary: string;
  keyPoints: string[];
  actionItems: { task: string; owner: string; deadline?: string }[];
  decisions: string[];
  translatedTranscript: SubtitleSegment[];
}
