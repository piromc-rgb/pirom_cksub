export interface SubtitleSegment {
  id: string;
  timestamp: string; // e.g. "10:24:12"
  rawTimeMs: number;
  speaker: string;
  englishText: string;
  thaiText: string;
  isFinal: boolean;
  confidence?: number;
}

export type AudioInputMode = 'mic' | 'tab';

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
