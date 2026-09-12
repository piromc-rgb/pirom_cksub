export type SpeakerColor = 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue';

export interface SpeakerProfile {
  id: string;
  name: string;
  color: SpeakerColor;
  pitchBaseline?: number; // Estimated F0 in Hz (e.g. 110 for deep voice, 210 for high voice)
  isDefault?: boolean;
}

export const DEFAULT_SPEAKERS: SpeakerProfile[] = [
  { id: 'spk_1', name: 'Speaker 1 (Me)', color: 'cyan', pitchBaseline: 130, isDefault: true },
  { id: 'spk_2', name: 'Speaker 2', color: 'purple', pitchBaseline: 210 },
  { id: 'spk_3', name: 'Speaker 3', color: 'emerald', pitchBaseline: 170 },
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
