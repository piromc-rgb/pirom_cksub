import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { 
  Header 
} from './components/Header';
import {
  MeetingControls
} from './components/MeetingControls';
import {
  LiveSubtitleFeed 
} from './components/LiveSubtitleFeed';
import { 
  FloatingPipBar 
} from './components/FloatingPipBar';
import { 
  SettingsModal 
} from './components/SettingsModal';
import { 
  SmartSummaryModal 
} from './components/SmartSummaryModal';
import { 
  ShareLiveModal 
} from './components/ShareLiveModal';
import {
  ExportModal
} from './components/ExportModal';
import {
  HeadphoneSetupModal
} from './components/HeadphoneSetupModal';

import { SubtitleSegment, AudioInputMode } from './types/subtitle';
import { AppSettings, DEFAULT_SETTINGS } from './types/settings';
import { MeetingSpeechRecognizer } from './services/speechRecognition';
import {
  translateEnglishToThai,
  isFreeTranslationRateLimited,
  getFreeTranslationCooldownRemainingMs,
} from './services/translationService';
import { SubtitlePiPManager } from './services/pipManager';

export const App: React.FC = () => {
  // State
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [currentInterim, setCurrentInterim] = useState<SubtitleSegment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioInputMode>('mic');
  const [isPipActive, setIsPipActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('felo_app_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHeadphoneGuideOpen, setIsHeadphoneGuideOpen] = useState(false);

  // Services references
  const speechRecognizerRef = useRef<MeetingSpeechRecognizer | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const pipManagerRef = useRef<SubtitlePiPManager | null>(null);
  const interimTimeoutRef = useRef<any>(null);
  const meetingStartTimeRef = useRef<number>(Date.now());
  const interimThaiRef = useRef<string>('');
  const latestInterimEnglishRef = useRef<string>('');
  const isTranslatingRef = useRef<boolean>(false);
  const queuedTextRef = useRef<string>('');
  const lastTranslatedTextRef = useRef<string>('');
  const lastFinalTextRef = useRef<string>('');
  const lastFinalTimeRef = useRef<number>(0);
  const lastDispatchTimeRef = useRef<number>(0);
  const pendingDispatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTranslationRateLimited, setIsTranslationRateLimited] = useState(false);
  const rateLimitClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('felo_app_settings', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Initialize PiP Manager
  useEffect(() => {
    pipManagerRef.current = new SubtitlePiPManager(settings);
  }, []);

  // Sync settings with PiP Manager
  useEffect(() => {
    if (pipManagerRef.current) {
      pipManagerRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Sync latest subtitle with PiP
  useEffect(() => {
    if (pipManagerRef.current) {
      const latest = currentInterim || (subtitles.length > 0 ? subtitles[subtitles.length - 1] : null);
      pipManagerRef.current.updateSubtitle(latest);
    }
  }, [currentInterim, subtitles]);

  // Clean up pending translation timers on unmount
  useEffect(() => {
    return () => {
      if (pendingDispatchTimerRef.current) clearTimeout(pendingDispatchTimerRef.current);
      if (rateLimitClearTimerRef.current) clearTimeout(rateLimitClearTimerRef.current);
    };
  }, []);

  // Initialize Speech Recognizer
  useEffect(() => {
    speechRecognizerRef.current = new MeetingSpeechRecognizer({
      onInterim: (text: string) => {
        handleInterimSpeech(text);
      },
      onFinal: (text: string, confidence: number) => {
        handleFinalSpeech(text, confidence);
      },
      onError: (err: string) => {
        console.warn('Speech recognition warning:', err);
      },
      onStatusChange: (listening: boolean) => {
        setIsListening(listening);
      },
    });

    return () => {
      speechRecognizerRef.current?.stop();
    };
  }, [audioMode, settings]);

  // Surface it on screen when the free translation endpoints are rate-limited, and
  // auto-clear the notice once their cooldown window has passed.
  const refreshTranslationHealthStatus = () => {
    const limited = isFreeTranslationRateLimited();
    setIsTranslationRateLimited(limited);

    if (rateLimitClearTimerRef.current) {
      clearTimeout(rateLimitClearTimerRef.current);
      rateLimitClearTimerRef.current = null;
    }
    if (limited) {
      const remaining = getFreeTranslationCooldownRemainingMs();
      rateLimitClearTimerRef.current = setTimeout(() => {
        setIsTranslationRateLimited(isFreeTranslationRateLimited());
      }, remaining + 250);
    }
  };

  // Real-time continuous streaming translation pipeline
  // Throttled to a minimum interval between dispatches: the Web Speech API can fire
  // interim results many times per second, and translating every single tick floods
  // the free translation endpoints until they start rate-limiting the whole session.
  const INTERIM_DISPATCH_INTERVAL_MS = 400;

  const runTranslationQueue = () => {
    if (isTranslatingRef.current) return;

    const processQueue = async () => {
      isTranslatingRef.current = true;
      lastDispatchTimeRef.current = Date.now();
      while (queuedTextRef.current && queuedTextRef.current !== lastTranslatedTextRef.current) {
        const textToTranslate = queuedTextRef.current;
        try {
          const th = await translateEnglishToThai(textToTranslate, {
            engine: settings.translationEngine,
            geminiKey: settings.geminiApiKey,
            openaiKey: settings.openaiApiKey,
            customTerms: settings.customTerms,
          });

          if (th && th.trim()) {
            lastTranslatedTextRef.current = textToTranslate;
            interimThaiRef.current = th.trim();
            setCurrentInterim((prev) => {
              if (!prev) return null;
              return { ...prev, thaiText: th.trim() };
            });
          } else {
            lastTranslatedTextRef.current = textToTranslate;
          }
        } catch (err) {
          console.warn('Streaming translation caught error:', err);
          lastTranslatedTextRef.current = textToTranslate;
        } finally {
          refreshTranslationHealthStatus();
        }
      }
      isTranslatingRef.current = false;
    };

    processQueue();
  };

  const triggerStreamingTranslation = (text: string) => {
    queuedTextRef.current = text;
    if (isTranslatingRef.current) return;

    const elapsed = Date.now() - lastDispatchTimeRef.current;
    if (elapsed >= INTERIM_DISPATCH_INTERVAL_MS) {
      runTranslationQueue();
      return;
    }

    if (pendingDispatchTimerRef.current) return;
    pendingDispatchTimerRef.current = setTimeout(() => {
      pendingDispatchTimerRef.current = null;
      runTranslationQueue();
    }, INTERIM_DISPATCH_INTERVAL_MS - elapsed);
  };

  // Handle Interim (Word-by-word streaming)
  const handleInterimSpeech = (rawEnglishText: string) => {
    const englishText = rawEnglishText.trim();
    if (!englishText) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    latestInterimEnglishRef.current = englishText;
    const currentThai = interimThaiRef.current;

    const interimObj: SubtitleSegment = {
      id: 'interim',
      timestamp: timeStr,
      rawTimeMs: Date.now() - meetingStartTimeRef.current,
      englishText,
      thaiText: currentThai,
      isFinal: false,
    };

    setCurrentInterim(interimObj);

    // Trigger instant continuous streaming translation
    triggerStreamingTranslation(englishText);
  };

  // Handle Confirmed Sentence Finalization
  const handleFinalSpeech = (englishText: string, confidence: number) => {
    const clean = englishText.trim();
    if (!clean) return;

    const normalize = (s: string) => s.replace(/[.,/#!$%^&*;:{}=\-_`~()?'"]/g, '').trim().toLowerCase();
    const normClean = normalize(clean);

    // Guard against duplicate final speech calls within a short time window
    const nowMs = Date.now();
    if (
      normalize(lastFinalTextRef.current) === normClean &&
      nowMs - lastFinalTimeRef.current < 4000
    ) {
      console.warn('Duplicate final speech skipped:', clean);
      return;
    }

    lastFinalTextRef.current = clean;
    lastFinalTimeRef.current = nowMs;

    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current);
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // Use current translated Thai text immediately to ensure 0ms latency and NO disappearing gap!
    const initialThai = interimThaiRef.current || '';
    const segmentId = Date.now().toString();

    const newSegment: SubtitleSegment = {
      id: segmentId,
      timestamp: timeStr,
      rawTimeMs: Date.now() - meetingStartTimeRef.current,
      englishText: clean,
      thaiText: initialThai,
      isFinal: true,
      confidence,
    };

    // 1. Immediately commit new finalized segment to subtitles list (with consecutive duplicate protection)
    setSubtitles((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (normalize(last.englishText) === normClean) {
          return prev;
        }
      }
      return [...prev, newSegment];
    });

    // 2. Clear or adjust interim without rollback or ghosting

    setCurrentInterim((prev) => {
      if (!prev) return null;
      const normPrev = normalize(prev.englishText);
      // If the interim text matches or was part of the finalized sentence, clear it
      if (normPrev === normClean || normClean.startsWith(normPrev) || normClean.endsWith(normPrev)) {
        return null;
      }
      // If the interim already contains NEW words beyond the finalized sentence, retain only the new words
      if (normPrev.startsWith(normClean) && prev.englishText.length > clean.length) {
        const remaining = prev.englishText.slice(clean.length).trim();
        if (remaining) {
          return {
            ...prev,
            englishText: remaining,
            thaiText: '',
          };
        }
        return null;
      }
      return null;
    });

    const normLatest = normalize(latestInterimEnglishRef.current);
    if (!normLatest || normLatest === normClean || normClean.startsWith(normLatest) || normClean.endsWith(normLatest)) {
      latestInterimEnglishRef.current = '';
      interimThaiRef.current = '';
      queuedTextRef.current = '';
      lastTranslatedTextRef.current = '';
    }

    // 3. In background: refine the Thai translation if needed (without freezing the UI)
    translateEnglishToThai(clean, {
      engine: settings.translationEngine,
      geminiKey: settings.geminiApiKey,
      openaiKey: settings.openaiApiKey,
      customTerms: settings.customTerms,
    }).then((refinedThai) => {
      if (refinedThai && refinedThai.trim() && refinedThai.trim() !== initialThai) {
        setSubtitles((prev) =>
          prev.map((s) => (s.id === segmentId ? { ...s, thaiText: refinedThai.trim() } : s))
        );
      }
    }).catch(() => {})
      .finally(() => refreshTranslationHealthStatus());
  };

  // Toggle listening
  const handleToggleListen = async () => {
    if (isListening) {
      // Stop
      speechRecognizerRef.current?.stop();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      setIsListening(false);
      setCurrentInterim(null);
    } else {
      // Start
      meetingStartTimeRef.current = Date.now();

      if (audioMode === 'tab') {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });
            audioStreamRef.current = stream;
            // Stop video track since we only need meeting audio
            stream.getVideoTracks().forEach((track) => track.stop());
          }
        } catch (e) {
          console.log('Tab audio request dismissed or not supported:', e);
        }
      }

      // Free Web Speech API
      speechRecognizerRef.current?.start();
      setIsListening(true);
    }
  };

  // Switch Audio Mode
  const handleChangeAudioMode = (mode: AudioInputMode) => {
    if (isListening) {
      handleToggleListen();
    }
    setAudioMode(mode);
  };

  // Request PiP
  const handleRequestPip = async () => {
    if (!pipManagerRef.current) return;
    try {
      if (isPipActive) {
        await pipManagerRef.current.exitPiP();
        setIsPipActive(false);
      } else {
        await pipManagerRef.current.requestPiP();
        setIsPipActive(true);
      }
    } catch (e) {
      console.error('PiP request error:', e);
    }
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Clear
  const handleClearTranscript = () => {
    if (confirm('คุณต้องการล้างข้อความคำบรรยายทั้งหมดใช่หรือไม่?')) {
      setSubtitles([]);
      setCurrentInterim(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        isListening={isListening}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSummary={() => setIsSummaryOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenHeadphoneGuide={() => setIsHeadphoneGuideOpen(true)}
        onRequestPip={handleRequestPip}
        isPipActive={isPipActive}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Translation Rate-Limit Notice */}
      {isTranslationRateLimited && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2 text-amber-300 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              บริการแปลภาษาฟรีถูกจำกัดการใช้งานชั่วคราว (rate limit) คำบรรยายอาจไม่ถูกแปลชั่วขณะ
              ระบบจะลองใหม่โดยอัตโนมัติภายในไม่กี่วินาที
            </span>
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Meeting Controls Bar */}
        <MeetingControls
          isListening={isListening}
          audioMode={audioMode}
          onToggleListen={handleToggleListen}
          onChangeAudioMode={handleChangeAudioMode}
          onClearTranscript={handleClearTranscript}
          subtitleCount={subtitles.length}
        />

        {/* Live Subtitle Stream Component */}
        <div className="flex-1">
          <LiveSubtitleFeed
            subtitles={subtitles}
            currentInterim={currentInterim}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        </div>
      </main>

      {/* In-app Floating Subtitle Overlay */}
      <FloatingPipBar
        currentSubtitle={currentInterim || (subtitles.length > 0 ? subtitles[subtitles.length - 1] : null)}
        settings={settings}
        onRequestNativePip={handleRequestPip}
        isNativePipActive={isPipActive}
      />

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(s) => setSettings(s)}
      />

      <SmartSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        subtitles={subtitles}
        settings={settings}
      />

      <ShareLiveModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        subtitles={subtitles}
        settings={settings}
      />

      <HeadphoneSetupModal
        isOpen={isHeadphoneGuideOpen}
        onClose={() => setIsHeadphoneGuideOpen(false)}
      />
    </div>
  );
};

export default App;
