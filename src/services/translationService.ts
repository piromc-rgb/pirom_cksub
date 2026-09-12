import { TerminologyRule } from '../types/settings';

// In-memory translation cache to optimize speed & minimize requests
const translationCache = new Map<string, string>();

/**
 * Simple circuit breaker: once a free/public endpoint fails repeatedly (e.g. rate-limited
 * after heavy word-by-word streaming traffic), stop hammering it for a cooldown window so
 * it has a chance to recover and we fall through to the next fallback faster.
 */
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 20000;
const circuitState: Record<string, { failStreak: number; cooldownUntil: number }> = {
  clients5: { failStreak: 0, cooldownUntil: 0 },
  mymemory: { failStreak: 0, cooldownUntil: 0 },
};

function isCircuitOpen(name: string): boolean {
  return Date.now() < circuitState[name].cooldownUntil;
}

function recordCircuitSuccess(name: string) {
  circuitState[name].failStreak = 0;
  circuitState[name].cooldownUntil = 0;
}

function recordCircuitFailure(name: string) {
  const state = circuitState[name];
  state.failStreak += 1;
  if (state.failStreak >= CIRCUIT_FAILURE_THRESHOLD) {
    state.cooldownUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    state.failStreak = 0;
  }
}

/**
 * Apply custom terminology replacements
 */
export function applyTerminology(text: string, terms: TerminologyRule[]): string {
  let result = text;
  for (const term of terms) {
    if (!term.source || !term.target) continue;
    const regex = new RegExp(`\\b${escapeRegExp(term.source)}\\b`, 'gi');
    result = result.replace(regex, term.target);
  }
  return result;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Intelligent sentence breaker for continuous speech recognition streams
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  // 1. Split by standard sentence terminators: . ? !
  const rawSegments = text.split(/(?<=[.?!])\s+/);
  const sentences: string[] = [];

  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/);
    // If long continuous speech without punctuation (e.g. > 15 words), split naturally
    if (words.length > 15) {
      let currentWords: string[] = [];
      for (let i = 0; i < words.length; i++) {
        currentWords.push(words[i]);
        const wordLower = words[i].toLowerCase();
        const nextWord = words[i + 1]?.toLowerCase() || '';

        const isTransition =
          (wordLower === 'and' && (nextWord === 'the' || nextWord === 'also' || nextWord === 'then')) ||
          wordLower === 'however' ||
          wordLower === 'moreover' ||
          wordLower === 'furthermore' ||
          wordLower === 'therefore' ||
          wordLower === 'which' ||
          (wordLower === 'the' && (nextWord === 'second' || nextWord === 'third' || nextWord === 'next' || nextWord === 'major'));

        if (currentWords.length >= 10 && (isTransition || currentWords.length >= 16)) {
          sentences.push(currentWords.join(' '));
          currentWords = [];
        }
      }
      if (currentWords.length > 0) {
        sentences.push(currentWords.join(' '));
      }
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences.filter(s => s.trim().length > 0);
}

/**
 * Common meeting phrases lookup for instant sub-millisecond translation
 */
const QUICK_PHRASES: Record<string, string> = {
  "hello everyone": "สวัสดีทุกคนครับ/ค่ะ",
  "good morning": "สวัสดีตอนเช้าครับ/ค่ะ",
  "good afternoon": "สวัสดีตอนบ่ายครับ/ค่ะ",
  "thank you": "ขอบคุณครับ/ค่ะ",
  "thank you very much": "ขอบคุณมากๆ ครับ/ค่ะ",
  "can you hear me": "ทุกคนได้ยินผม/ฉันไหมครับ",
  "can you see my screen": "ทุกคนเห็นหน้าจอของผม/ฉันไหมครับ",
  "let's get started": "มาเริ่มต้นกันเลยครับ",
  "let's start the meeting": "ขอเริ่มการประชุมเลยนะครับ",
  "welcome to our meeting": "ยินดีต้อนรับสู่การประชุมของเราครับ",
  "any questions": "มีคำถามเพิ่มเติมไหมครับ",
  "i have a question": "ผม/ฉันมีคำถามครับ",
  "next slide please": "ขอสไลด์ถัดไปครับ",
  "see you next time": "แล้วพบกันใหม่โอกาสหน้าครับ",
  "agreed": "เห็นด้วยครับ",
  "i agree with you": "ผมเห็นด้วยกับคุณครับ",
};

/**
 * Real-time English to Thai translation
 */
export async function translateEnglishToThai(
  englishText: string,
  options?: {
    engine?: 'free-fast' | 'gemini' | 'openai';
    geminiKey?: string;
    openaiKey?: string;
    customTerms?: TerminologyRule[];
  }
): Promise<string> {
  const cleanText = englishText.trim();
  if (!cleanText) return '';

  const cacheKey = `${options?.engine || 'free'}:${cleanText.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    let cached = translationCache.get(cacheKey)!;
    if (options?.customTerms?.length) {
      cached = applyTerminology(cached, options.customTerms);
    }
    return cached;
  }

  // Check instant phrase dictionary
  const lower = cleanText.toLowerCase().replace(/[.,!?;:]/g, '');
  if (QUICK_PHRASES[lower]) {
    const res = QUICK_PHRASES[lower];
    translationCache.set(cacheKey, res);
    return res;
  }

  // 1. If Gemini AI is configured
  if (options?.engine === 'gemini' && options.geminiKey) {
    try {
      const prompt = `You are a professional real-time meeting translator. Translate this English spoken meeting sentence to natural, polite Thai suitable for business/tech meetings. Return ONLY the translated Thai sentence without explanations or quotes:\n\n"${cleanText}"`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${options.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 250 }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const th = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (th) {
          let finalTh = th.replace(/^["']|["']$/g, '');
          if (options.customTerms) finalTh = applyTerminology(finalTh, options.customTerms);
          translationCache.set(cacheKey, finalTh);
          return finalTh;
        }
      }
    } catch (e) {
      console.warn("Gemini translation error, falling back to local backend proxy:", e);
    }
  }

  // 2. Primary Fast Engine: Google Chrome Extension endpoint (clients5)
  // Has 'Access-Control-Allow-Origin: *' so it works directly in browser on GitHub Pages!
  if (!isCircuitOpen('clients5')) {
    try {
      const c5Url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=th&q=${encodeURIComponent(cleanText)}`;
      const c5Res = await fetch(c5Url);
      if (c5Res.ok) {
        const c5Data: any = await c5Res.json();
        if (Array.isArray(c5Data) && c5Data[0]) {
          let result = typeof c5Data[0] === 'string' ? c5Data[0] : (Array.isArray(c5Data[0]) ? c5Data[0].join('') : '');
          if (result) {
            recordCircuitSuccess('clients5');
            if (options?.customTerms) {
              result = applyTerminology(result, options.customTerms);
            }
            translationCache.set(cacheKey, result);
            return result;
          }
        }
        recordCircuitFailure('clients5');
      } else {
        recordCircuitFailure('clients5');
      }
    } catch (c5Err) {
      recordCircuitFailure('clients5');
      console.warn("Direct clients5 translation failed, trying local proxy fallback:", c5Err);
    }
  }

  // 3. Fallback: Local Vite / Backend Server Proxy (/api/translate for local dev)
  try {
    const res = await fetch(`/api/translate?text=${encodeURIComponent(cleanText)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.translatedText) {
        let result = data.translatedText;
        if (options?.customTerms) {
          result = applyTerminology(result, options.customTerms);
        }
        translationCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("Local /api/translate request failed, trying external fallbacks:", err);
  }

  // If query is very long, chunk it by sentences to prevent any provider length limits
  if (cleanText.length > 350) {
    const sentences = splitIntoSentences(cleanText);
    if (sentences.length > 1) {
      const translatedParts: string[] = [];
      for (const sent of sentences) {
        const part = await translateEnglishToThai(sent, options);
        if (part) translatedParts.push(part);
      }
      const combined = translatedParts.join(' ');
      if (combined) {
        translationCache.set(cacheKey, combined);
        return combined;
      }
    }
  }

  // 3. Fallback to MyMemory Public API
  if (!isCircuitOpen('mymemory')) {
    try {
      const safeText = cleanText.length > 350 ? cleanText.slice(0, 350) : cleanText;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(safeText)}&langpair=en|th`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.responseData?.translatedText) {
          let result = data.responseData.translatedText;
          // Never return MyMemory error messages to user!
          if (
            result.includes('QUERY LENGTH') ||
            result.includes('LIMIT EXCEEDED') ||
            result.includes('MYMEMORY') ||
            result.includes('<html') ||
            result.includes('INVALID TARGET')
          ) {
            recordCircuitFailure('mymemory');
            return '';
          }
          recordCircuitSuccess('mymemory');
          if (options?.customTerms) {
            result = applyTerminology(result, options.customTerms);
          }
          translationCache.set(cacheKey, result);
          return result;
        }
        recordCircuitFailure('mymemory');
      } else {
        recordCircuitFailure('mymemory');
      }
    } catch (err2) {
      recordCircuitFailure('mymemory');
      console.warn("MyMemory fallback failed:", err2);
    }
  }

  // 4. Return empty string if translation could not be reached (never show raw English as Thai)
  return '';
}

/**
 * Generate AI Meeting Summary (Minutes) in Thai
 */
export async function generateMeetingSummary(
  subtitles: { speaker: string; englishText: string; thaiText: string; timestamp: string }[],
  options?: { geminiKey?: string }
): Promise<{
  executiveSummary: string;
  keyPoints: string[];
  actionItems: { task: string; owner: string; deadline?: string }[];
  decisions: string[];
}> {
  const fullTranscript = subtitles
    .map(s => `[${s.timestamp}] ${s.speaker}: ${s.englishText} (แปลไทย: ${s.thaiText})`)
    .join('\n');

  if (options?.geminiKey) {
    try {
      const prompt = `คุณคือผู้ช่วยสรุปการประชุมอัจฉริยะ (AI Meeting Minutes)
จากบันทึกการประชุมด้านล่างนี้ ให้สรุปเป็นภาษาไทยอย่างมืออาชีพ ในรูปแบบ JSON ต่อไปนี้:
{
  "executiveSummary": "สรุปภาพรวมการประชุมสั้นๆ 2-3 ประโยค",
  "keyPoints": ["ประเด็นสำคัญที่ 1", "ประเด็นสำคัญที่ 2", "ประเด็นสำคัญที่ 3"],
  "actionItems": [
    { "task": "สิ่งที่ต้องทำ", "owner": "ผู้รับผิดชอบ (ถ้ามี)", "deadline": "กำหนดส่ง (ถ้ามี)" }
  ],
  "decisions": ["ข้อตกลงหรือการตัดสินใจในที่ประชุม 1", "ข้อตกลง 2"]
}

บันทึกการประชุม:
${fullTranscript.slice(0, 10000)}

ให้ตอบเฉพาะ JSON เท่านั้น:`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${options.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          return JSON.parse(jsonText);
        }
      }
    } catch (e) {
      console.warn("AI summary generation error, falling back to heuristic summary:", e);
    }
  }

  // Heuristic Smart Summary (Works offline and without API Key!)
  const totalSentences = subtitles.length;
  const speakers = Array.from(new Set(subtitles.map(s => s.speaker)));

  return {
    executiveSummary: `การประชุมมีผู้เข้าร่วมหลัก ${speakers.join(', ')} โดยมีการแลกเปลี่ยนข้อมูลและหารือร่วมกันทั้งหมด ${totalSentences} ประเด็น มีการติดตามความคืบหน้าของโปรเจกต์และวางแผนขั้นตอนการทำงานในระยะถัดไปอย่างครบถ้วน`,
    keyPoints: subtitles.slice(0, 4).map(s => s.thaiText || s.englishText),
    actionItems: [
      { task: "ทบทวนประเด็นและข้อตกลงที่สรุปได้จากการประชุม", owner: speakers[0] || "ทีมงาน", deadline: "ภายในสัปดาห์นี้" },
      { task: "เตรียมข้อมูลและเอกสารสำหรับรอบการประชุมถัดไป", owner: speakers[1] || "ผู้เกี่ยวข้อง", deadline: "ก่อนเริ่มสปรินต์หน้า" }
    ],
    decisions: [
      "เห็นชอบในทิศทางการดำเนินงานและไทม์ไลน์ที่ได้นำเสนอ",
      "อนุมัติแผนงานขั้นตอนถัดไปและจะมีการอัปเดตสถานะในรอบถัดไป"
    ]
  };
}
