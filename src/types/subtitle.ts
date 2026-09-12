export type SpeakerColor = 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue';

export type VoiceToneCategory =
  | 'mature-male'   // ชายวัยกลางคน / ทุ้มต่ำ
  | 'young-male'    // ชายวัยหนุ่ม
  | 'mature-female' // หญิงวัยทำงาน / ทุ้มอบอุ่น
  | 'young-female'  // หญิงสาว / เสียงใส
  | 'child';        // เด็ก / เสียงแหลมสูง

export interface VoiceTonePreset {
  id: VoiceToneCategory;
  name: string;
  shortLabel: string;
  emoji: string;
  minPitch: number;
  maxPitch: number;
  baselinePitch: number;
  description: string;
}

export const VOICE_TONE_PRESETS: VoiceTonePreset[] = [
  {
    id: 'mature-male',
    name: 'ชายวัยกลางคน (ทุ้มต่ำ)',
    shortLabel: 'ชายวัยกลางคน',
    emoji: '🧔',
    minPitch: 70,
    maxPitch: 125,
    baselinePitch: 105,
    description: 'โทนเสียงทุ้มต่ำ ลึก หนักแน่น (70-125 Hz)',
  },
  {
    id: 'young-male',
    name: 'ชายวัยหนุ่ม (โทนมาตรฐาน)',
    shortLabel: 'ชายวัยหนุ่ม',
    emoji: '👨',
    minPitch: 125,
    maxPitch: 165,
    baselinePitch: 140,
    description: 'โทนเสียงผู้ชายทั่วไป โปร่ง ชัดเจน (125-165 Hz)',
  },
  {
    id: 'mature-female',
    name: 'หญิงวัยทำงาน (ทุ้มอบอุ่น)',
    shortLabel: 'หญิงวัยทำงาน',
    emoji: '👩',
    minPitch: 165,
    maxPitch: 210,
    baselinePitch: 185,
    description: 'โทนเสียงผู้หญิงระดับกลาง อบอุ่น สุภาพ (165-210 Hz)',
  },
  {
    id: 'young-female',
    name: 'หญิงสาว (เสียงใส)',
    shortLabel: 'หญิงสาว',
    emoji: '👧',
    minPitch: 210,
    maxPitch: 260,
    baselinePitch: 230,
    description: 'โทนเสียงผู้หญิงระดับสูง เสียงใส กังวาน (210-260 Hz)',
  },
  {
    id: 'child',
    name: 'เด็ก / เสียงแหลมสูง',
    shortLabel: 'เด็ก/เสียงสูง',
    emoji: '🧒',
    minPitch: 260,
    maxPitch: 450,
    baselinePitch: 310,
    description: 'โทนเสียงเด็กหรือเสียงแหลมสูงพิเศษ (260-450 Hz)',
  },
];

export function detectVoiceTonePreset(pitchHz: number): VoiceTonePreset {
  if (pitchHz <= 0) return VOICE_TONE_PRESETS[1]; // default young-male
  if (pitchHz < 125) return VOICE_TONE_PRESETS[0]; // mature-male
  if (pitchHz < 165) return VOICE_TONE_PRESETS[1]; // young-male
  if (pitchHz < 210) return VOICE_TONE_PRESETS[2]; // mature-female
  if (pitchHz < 260) return VOICE_TONE_PRESETS[3]; // young-female
  return VOICE_TONE_PRESETS[4]; // child / high pitch
}

export interface SpeakerProfile {
  id: string;
  name: string;
  color: SpeakerColor;
  toneCategory?: VoiceToneCategory;
  pitchBaseline?: number; // Estimated F0 in Hz
  isDefault?: boolean;
}

export const DEFAULT_SPEAKERS: SpeakerProfile[] = [
  { 
    id: 'spk_1', 
    name: 'Speaker 1 (Me)', 
    color: 'cyan', 
    toneCategory: 'young-male', 
    pitchBaseline: 140, 
    isDefault: true 
  },
  { 
    id: 'spk_2', 
    name: 'Speaker 2', 
    color: 'purple', 
    toneCategory: 'young-female', 
    pitchBaseline: 230 
  },
  { 
    id: 'spk_3', 
    name: 'Speaker 3', 
    color: 'emerald', 
    toneCategory: 'mature-male', 
    pitchBaseline: 105 
  },
];

export interface SubtitleSegment {
  id: string;
  timestamp: string; // e.g. "10:24:12"
  rawTimeMs: number;
  speaker: string;
  speakerId?: string;
  speakerTone?: string; // e.g. "👨 ชายวัยหนุ่ม"
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
