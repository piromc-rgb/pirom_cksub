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

import { 
  SubtitleSegment, 
  AudioInputMode, 
  SpeakerProfile, 
  SpeakerColor, 
  VoiceToneCategory,
  VoiceTonePreset,
  VOICE_TONE_PRESETS,
  DEFAULT_SPEAKERS 
} from './types/subtitle';
import { AppSettings, DEFAULT_SETTINGS } from './types/settings';
import { MeetingSpeechRecognizer } from './services/speechRecognition';
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
  const [livePitchHz, setLivePitchHz] = useState<number>(0);
  const [detectedTone, setDetectedTone] = useState<VoiceTonePreset | undefined>(undefined);
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
  const speakerDiarizerRef = useRef<SpeakerDiarizer | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const pipManagerRef = useRef<SubtitlePiPManager | null>(null);
  const interimTimeoutRef = useRef<any>(null);
  const meetingStartTimeRef = useRef<number>(Date.now());
  const interimThaiRef = useRef<string>('');
  const interimReqIdRef = useRef<number>(0);

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
      onVoiceActivity: (isSpeaking, pitchHz, _volume, tone) => {
        setIsVoiceActive(isSpeaking);
        if (isSpeaking) {
          setLivePitchHz(pitchHz);
          setDetectedTone(tone);
        } else {
          setLivePitchHz(0);
        }
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

    const toneSequence: VoiceToneCategory[] = ['young-male', 'young-female', 'mature-male', 'mature-female', 'child'];
    const nextTone = toneSequence[speakers.length % toneSequence.length];
    const presetInfo = VOICE_TONE_PRESETS.find((p) => p.id === nextTone) || VOICE_TONE_PRESETS[0];

    const newSpk: SpeakerProfile = {
      id: `spk_${Date.now()}`,
      name: `Speaker ${nextNum}`,
      color: nextColor,
      toneCategory: nextTone,
      pitchBaseline: presetInfo.baselinePitch,
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

  // Handle Interim (Word-by-word streaming)
  const handleInterimSpeech = (englishText: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const currentThai = interimThaiRef.current;
    const activeSpk = activeSpeakerRef.current;
    const tonePreset = activeSpk.toneCategory
      ? VOICE_TONE_PRESETS.find((p) => p.id === activeSpk.toneCategory)
      : undefined;

    const interimObj: SubtitleSegment = {
      id: 'interim',
      timestamp: timeStr,
      rawTimeMs: Date.now() - meetingStartTimeRef.current,
      speaker: activeSpk.name,
      speakerId: activeSpk.id,
      speakerTone: tonePreset ? `${tonePreset.emoji} ${tonePreset.shortLabel}` : undefined,
      englishText,
      thaiText: currentThai,
      isFinal: false,
    };

    setCurrentInterim(interimObj);

    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current);
    }

    const reqId = ++interimReqIdRef.current;

    interimTimeoutRef.current = setTimeout(async () => {
      const th = await translateEnglishToThai(englishText, {
        engine: settings.translationEngine,
        geminiKey: settings.geminiApiKey,
        openaiKey: settings.openaiApiKey,
        customTerms: settings.customTerms,
      });

      if (reqId !== interimReqIdRef.current) return;

      if (th && th.trim()) {
        interimThaiRef.current = th.trim();
        setCurrentInterim((prev) => (prev ? { ...prev, thaiText: th.trim() } : null));
      }
    }, 220);
  };

  // Handle Confirmed Sentence Finalization
  const handleFinalSpeech = async (englishText: string, confidence: number) => {
    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current);
    }
    interimReqIdRef.current++;

    const clean = englishText.trim();
    if (!clean) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const activeSpk = activeSpeakerRef.current;
    const tonePreset = activeSpk.toneCategory
      ? VOICE_TONE_PRESETS.find((p) => p.id === activeSpk.toneCategory)
      : undefined;

    let thaiText = await translateEnglishToThai(clean, {
      engine: settings.translationEngine,
      geminiKey: settings.geminiApiKey,
      openaiKey: settings.openaiApiKey,
      customTerms: settings.customTerms,
    });

    if (!thaiText && interimThaiRef.current) {
      thaiText = interimThaiRef.current;
    }

    const newSegment: SubtitleSegment = {
      id: Date.now().toString(),
      timestamp: timeStr,
      rawTimeMs: Date.now() - meetingStartTimeRef.current,
      speaker: activeSpk.name,
      speakerId: activeSpk.id,
      speakerTone: tonePreset ? `${tonePreset.emoji} ${tonePreset.shortLabel}` : undefined,
      englishText: clean,
      thaiText: thaiText || '',
      isFinal: true,
      confidence,
    };

    setSubtitles((prev) => [...prev, newSegment]);
    interimThaiRef.current = '';
    setCurrentInterim(null);
  };

  // Toggle listening
  const handleToggleListen = async () => {
    if (isListening) {
      // Stop
      speechRecognizerRef.current?.stop();
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
              speakerDiarizerRef.current?.start(stream);
            }
          }
        } catch (e) {
          console.log('Tab audio request dismissed or not supported:', e);
        }
        speechRecognizerRef.current?.start();
        setIsListening(true);
      } else {
        // Direct Microphone
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            speakerDiarizerRef.current?.start(stream);
          }
        } catch (e) {
          console.warn('Microphone stream for diarizer not available:', e);
        }
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
          livePitchHz={livePitchHz}
          detectedTone={detectedTone}
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
