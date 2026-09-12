import React, { useState, useEffect, useRef } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  MeetingControls 
} from './components/MeetingControls';
import {
  SpeakerBar
} from './components/SpeakerBar';
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

import { SubtitleSegment, AudioInputMode, SpeakerProfile, SpeakerColor, DEFAULT_SPEAKERS } from './types/subtitle';
import { AppSettings, DEFAULT_SETTINGS } from './types/settings';
import { MeetingSpeechRecognizer } from './services/speechRecognition';
import { DeepgramNova3Recognizer } from './services/deepgramNova3';
import { translateEnglishToThai } from './services/translationService';
import { SubtitlePiPManager } from './services/pipManager';
import { SpeakerDiarizer } from './services/speakerDiarizer';

export const App: React.FC = () => {
  // State
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [currentInterim, setCurrentInterim] = useState<SubtitleSegment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioInputMode>('mic');
  const [isPipActive, setIsPipActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Multi-Speaker State
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>(() => {
    try {
      const saved = localStorage.getItem('chaken_speakers');
      return saved ? JSON.parse(saved) : DEFAULT_SPEAKERS;
    } catch {
      return DEFAULT_SPEAKERS;
    }
  });
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>('spk_1');
  const [autoDiarize, setAutoDiarize] = useState<boolean>(true);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const activeSpeakerRef = useRef<SpeakerProfile>(DEFAULT_SPEAKERS[0]);

  // Keep activeSpeakerRef in sync
  useEffect(() => {
    const found = speakers.find((s) => s.id === activeSpeakerId) || speakers[0] || DEFAULT_SPEAKERS[0];
    activeSpeakerRef.current = found;
    speakerDiarizerRef.current?.setActiveSpeaker(found.id);
  }, [activeSpeakerId, speakers]);

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

  // Services references
  const speechRecognizerRef = useRef<MeetingSpeechRecognizer | null>(null);
  const deepgramRecognizerRef = useRef<DeepgramNova3Recognizer | null>(null);
  const speakerDiarizerRef = useRef<SpeakerDiarizer | null>(null);
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

  // Initialize Speaker Diarizer
  useEffect(() => {
    speakerDiarizerRef.current = new SpeakerDiarizer(speakers, {
      onSpeakerChanged: (newSpkId) => {
        setActiveSpeakerId(newSpkId);
      },
      onVoiceActivity: (isSpeaking) => {
        setIsVoiceActive(isSpeaking);
      },
    });

    return () => {
      speakerDiarizerRef.current?.stop();
    };
  }, []);

  // Sync speakers & autoDiarize state with Diarizer
  useEffect(() => {
    if (speakerDiarizerRef.current) {
      speakerDiarizerRef.current.setSpeakers(speakers);
      speakerDiarizerRef.current.setEnabled(autoDiarize);
    }
  }, [speakers, autoDiarize]);

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
      deepgramRecognizerRef.current?.stop();
    };
  }, [audioMode, settings]);

  // Speaker Actions
  const handleSelectSpeaker = (spkId: string) => {
    setActiveSpeakerId(spkId);
  };

  const handleAddSpeaker = () => {
    const nextNum = speakers.length + 1;
    const colors: SpeakerColor[] = ['cyan', 'purple', 'emerald', 'amber', 'rose', 'indigo', 'blue'];
    const nextColor = colors[speakers.length % colors.length];
    const baselinePitch = 120 + ((speakers.length * 55) % 190);

    const newSpk: SpeakerProfile = {
      id: `spk_${Date.now()}`,
      name: `Speaker ${nextNum}`,
      color: nextColor,
      pitchBaseline: baselinePitch,
    };

    setSpeakers((prev) => {
      const updated = [...prev, newSpk];
      try {
        localStorage.setItem('chaken_speakers', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setActiveSpeakerId(newSpk.id);
  };

  const handleUpdateSpeaker = (id: string, updates: Partial<SpeakerProfile>) => {
    setSpeakers((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      try {
        localStorage.setItem('chaken_speakers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (updates.name) {
      setSubtitles((prev) =>
        prev.map((sub) => (sub.speakerId === id ? { ...sub, speaker: updates.name! } : sub))
      );
    }
  };

  const handleDeleteSpeaker = (id: string) => {
    if (speakers.length <= 1) return;
    const remaining = speakers.filter((s) => s.id !== id);
    setSpeakers(remaining);
    try {
      localStorage.setItem('chaken_speakers', JSON.stringify(remaining));
    } catch {}

    if (activeSpeakerId === id && remaining.length > 0) {
      setActiveSpeakerId(remaining[0].id);
    }
  };

  const handleReassignSpeaker = (segmentId: string, newSpeaker: SpeakerProfile) => {
    setSubtitles((prev) =>
      prev.map((s) =>
        s.id === segmentId ? { ...s, speakerId: newSpeaker.id, speaker: newSpeaker.name } : s
      )
    );
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
  const handleInterimSpeech = (rawEnglishText: string, speakerId?: string) => {
    const englishText = rawEnglishText.trim();
    if (!englishText) return;

    if (speakerId && autoDiarize) {
      const exists = speakers.some((s) => s.id === speakerId);
      if (exists) {
        if (activeSpeakerId !== speakerId) {
          setActiveSpeakerId(speakerId);
        }
      } else {
        const nextNum = speakers.length + 1;
        const colors: SpeakerColor[] = ['cyan', 'purple', 'emerald', 'amber', 'rose', 'indigo', 'blue'];
        const nextColor = colors[speakers.length % colors.length];
        const newSpk: SpeakerProfile = {
          id: speakerId,
          name: `Speaker ${nextNum}`,
          color: nextColor,
          pitchBaseline: 150,
        };
        setSpeakers((prev) => [...prev, newSpk]);
        setActiveSpeakerId(speakerId);
      }
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    latestInterimEnglishRef.current = englishText;
    const currentThai = interimThaiRef.current;
    const targetSpkId = speakerId || activeSpeakerId;
    const targetSpk = speakers.find((s) => s.id === targetSpkId) || activeSpeakerRef.current;

    const interimObj: SubtitleSegment = {
      id: 'interim',
      timestamp: timeStr,
      rawTimeMs: Date.now() - meetingStartTimeRef.current,
      speaker: targetSpk.name,
      speakerId: targetSpk.id,
      englishText,
      thaiText: currentThai,
      isFinal: false,
    };

    setCurrentInterim(interimObj);

    // Trigger instant continuous streaming translation
    triggerStreamingTranslation(englishText);
  };

  // Handle Confirmed Sentence Finalization
  const handleFinalSpeech = (englishText: string, confidence: number, speakerId?: string) => {
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

    if (speakerId && autoDiarize) {
      if (activeSpeakerId !== speakerId) {
        setActiveSpeakerId(speakerId);
      }
    }

    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current);
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const targetSpkId = speakerId || activeSpeakerId;
    const targetSpk = speakers.find((s) => s.id === targetSpkId) || activeSpeakerRef.current;

    // Use current translated Thai text immediately to ensure 0ms latency and NO disappearing gap!
    const initialThai = interimThaiRef.current || '';
    const segmentId = Date.now().toString();

    const newSegment: SubtitleSegment = {
      id: segmentId,
      timestamp: timeStr,
      rawTimeMs: Date.now() - meetingStartTimeRef.current,
      speaker: targetSpk.name,
      speakerId: targetSpk.id,
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
    }).catch(() => {});
  };

  // Toggle listening
  const handleToggleListen = async () => {
    if (isListening) {
      // Stop
      speechRecognizerRef.current?.stop();
      deepgramRecognizerRef.current?.stop();
      speakerDiarizerRef.current?.stop();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      setIsVoiceActive(false);
      setIsListening(false);
      setCurrentInterim(null);
    } else {
      // Start
      meetingStartTimeRef.current = Date.now();

      // Check if Deepgram Nova-3 is selected but key is missing
      if (settings.sttEngine === 'deepgram-nova3') {
        if (!settings.deepgramApiKey?.trim()) {
          alert('กรุณากรอก Deepgram API Key ในการตั้งค่า (Settings) เพื่อใช้งานโมเดล Nova-3');
          setIsSettingsOpen(true);
          return;
        }
      }

      let activeStream: MediaStream | null = null;

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

            if (stream.getAudioTracks().length > 0) {
              activeStream = stream;
              speakerDiarizerRef.current?.start(stream);
            }
          }
        } catch (e) {
          console.log('Tab audio request dismissed or not supported:', e);
        }
      } else {
        // Direct Microphone
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            activeStream = stream;
            speakerDiarizerRef.current?.start(stream);
          }
        } catch (e) {
          console.warn('Microphone stream for diarizer not available:', e);
        }
      }

      if (settings.sttEngine === 'deepgram-nova3' && settings.deepgramApiKey?.trim()) {
        if (!activeStream) {
          try {
            activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = activeStream;
          } catch (e) {
            alert('ไม่สามารถเปิดใช้งานไมโครโฟนหรือสัญญาณเสียงได้');
            return;
          }
        }

        deepgramRecognizerRef.current = new DeepgramNova3Recognizer(
          settings.deepgramApiKey,
          activeStream,
          {
            onInterim: (text, spkId) => {
              handleInterimSpeech(text, spkId);
            },
            onFinal: (text, confidence, spkId) => {
              handleFinalSpeech(text, confidence, spkId);
            },
            onError: (err) => {
              console.warn('Deepgram Nova-3 error:', err);
              alert(err);
            },
            onStatusChange: (listening) => {
              setIsListening(listening);
            },
          }
        );
        deepgramRecognizerRef.current.start();
      } else {
        // Free Web Speech API
        speechRecognizerRef.current?.start();
        setIsListening(true);
      }
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

  const activeSpeakerProfile = speakers.find((s) => s.id === activeSpeakerId) || speakers[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        isListening={isListening}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSummary={() => setIsSummaryOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onRequestPip={handleRequestPip}
        isPipActive={isPipActive}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

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
          activeSpeaker={activeSpeakerProfile?.name}
          sttEngine={settings.sttEngine}
        />

        {/* Multi-Speaker Management Bar */}
        <SpeakerBar
          speakers={speakers}
          activeSpeakerId={activeSpeakerId}
          autoDiarize={autoDiarize}
          onSelectSpeaker={handleSelectSpeaker}
          onToggleAutoDiarize={() => setAutoDiarize(!autoDiarize)}
          onAddSpeaker={handleAddSpeaker}
          onUpdateSpeaker={handleUpdateSpeaker}
          onDeleteSpeaker={handleDeleteSpeaker}
          isVoiceActive={isVoiceActive}
        />

        {/* Live Subtitle Stream Component */}
        <div className="flex-1">
          <LiveSubtitleFeed
            subtitles={subtitles}
            currentInterim={currentInterim}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            speakers={speakers}
            onReassignSpeaker={handleReassignSpeaker}
          />
        </div>
      </main>

      {/* In-app Floating Subtitle Overlay */}
      <FloatingPipBar
        currentSubtitle={currentInterim || (subtitles.length > 0 ? subtitles[subtitles.length - 1] : null)}
        settings={settings}
        speakers={speakers}
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
        speakers={speakers}
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
    </div>
  );
};

export default App;
