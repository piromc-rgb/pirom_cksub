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
  HeadphoneSetupModal
} from './components/HeadphoneSetupModal';

import { SubtitleSegment, AudioInputMode, SpeakerProfile, SpeakerColor, DEFAULT_SPEAKERS } from './types/subtitle';
import { AppSettings, DEFAULT_SETTINGS } from './types/settings';
import { MeetingSpeechRecognizer } from './services/speechRecognition';
import { translateEnglishToThai } from './services/translationService';
import { SubtitlePiPManager } from './services/pipManager';
import { SpeakerDiarizer } from './services/speakerDiarizer';
import { StreamSpeechRecognizer } from './services/streamSpeechRecognizer';

export const App: React.FC = () => {
  // State
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [currentInterim, setCurrentInterim] = useState<SubtitleSegment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioInputMode>('mic'); // Default to direct microphone mode
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
  const [isHeadphoneGuideOpen, setIsHeadphoneGuideOpen] = useState(false);

  // Services references
  const speechRecognizerRef = useRef<MeetingSpeechRecognizer | null>(null);
  const streamSpeechRecognizerRef = useRef<StreamSpeechRecognizer | null>(null);
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

    if (streamSpeechRecognizerRef.current) {
      streamSpeechRecognizerRef.current.updateOptions({
        geminiApiKey: newSettings.geminiApiKey || settings.geminiApiKey,
        openaiApiKey: newSettings.openaiApiKey || settings.openaiApiKey,
      });
    }
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

  // Handlers ref so speech recognizers are never stopped or torn down during settings changes
  const handleInterimSpeechRef = useRef<(text: string) => void>(() => {});
  const handleFinalSpeechRef = useRef<(text: string, confidence: number) => void>(() => {});

  // Initialize Stream Speech Recognizer (for direct digital headphone/tab audio)
  useEffect(() => {
    streamSpeechRecognizerRef.current = new StreamSpeechRecognizer(
      {
        onInterim: (text: string) => {
          handleInterimSpeechRef.current(text);
        },
        onFinal: (text: string, confidence: number) => {
          handleFinalSpeechRef.current(text, confidence);
        },
        onError: (err: string) => {
          console.warn('Stream Speech Recognizer notice:', err);
        },
        onStatusChange: (listening: boolean) => {
          setIsListening(listening);
        },
      },
      {
        geminiApiKey: settings.geminiApiKey,
        openaiApiKey: settings.openaiApiKey,
      }
    );

    return () => {
      streamSpeechRecognizerRef.current?.stop();
    };
  }, []);

  // Keep StreamSpeechRecognizer options in sync without tearing down the recognizer
  useEffect(() => {
    streamSpeechRecognizerRef.current?.updateOptions({
      geminiApiKey: settings.geminiApiKey,
      openaiApiKey: settings.openaiApiKey,
    });
  }, [settings.geminiApiKey, settings.openaiApiKey]);

  // Initialize Microphone Speech Recognizer (Web Speech API) - runs once on mount
  useEffect(() => {
    speechRecognizerRef.current = new MeetingSpeechRecognizer({
      onInterim: (text: string) => {
        handleInterimSpeechRef.current(text);
      },
      onFinal: (text: string, confidence: number) => {
        handleFinalSpeechRef.current(text, confidence);
      },
      onError: (err: string) => {
        console.warn('Speech recognition warning:', err);
      },
      onStatusChange: (listening: boolean) => {
        setIsListening(listening);
      },
    });

    return () => {
      speechRecognizerRef.current?.destroy();
    };
  }, []);

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

  // Handle Interim (Word-by-word streaming)
  const handleInterimSpeech = (englishText: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const currentThai = interimThaiRef.current;
    const activeSpk = activeSpeakerRef.current;

    const interimObj: SubtitleSegment = {
      id: 'interim',
      timestamp: timeStr,
      rawTimeMs: Date.now() - meetingStartTimeRef.current,
      speaker: activeSpk.name,
      speakerId: activeSpk.id,
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
      englishText: clean,
      thaiText: thaiText || '',
      isFinal: true,
      confidence,
    };

    setSubtitles((prev) => [...prev, newSegment]);
    interimThaiRef.current = '';
    setCurrentInterim(null);
  };

  handleInterimSpeechRef.current = handleInterimSpeech;
  handleFinalSpeechRef.current = handleFinalSpeech;

  // Toggle listening
  const handleToggleListen = async () => {
    if (isListening) {
      // Stop all recording & recognizers
      speechRecognizerRef.current?.stop();
      streamSpeechRecognizerRef.current?.stop();
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

      if (audioMode === 'headphones' || audioMode === 'tab') {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });

            // Stop unused video track
            displayStream.getVideoTracks().forEach((track) => track.stop());

            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length === 0) {
              alert('คำเตือน: คุณไม่ได้ติ๊ก "แชร์เสียงของแท็บ (Share tab audio)" กรุณากดเริ่มใหม่อีกครั้งแล้วติ๊กแชร์เสียงด้วยนะครับ');
              displayStream.getTracks().forEach((t) => t.stop());
              return;
            }

            audioStreamRef.current = displayStream;

            // Start Diarizer with digital tab stream (analyser only, no destination connection)
            speakerDiarizerRef.current?.start(displayStream);

            // Transcribe:
            if (settings.geminiApiKey || settings.openaiApiKey) {
              streamSpeechRecognizerRef.current?.start(displayStream);
            } else {
              // Web Speech API listens to mic (without any audio loopback echo!)
              speechRecognizerRef.current?.start();
            }

            setIsListening(true);
          }
        } catch (e) {
          console.log('Headphone/Tab audio request cancelled:', e);
        }
      } else {
        // Direct Microphone mode
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
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
          onOpenHeadphoneGuide={() => setIsHeadphoneGuideOpen(true)}
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

      <HeadphoneSetupModal
        isOpen={isHeadphoneGuideOpen}
        onClose={() => setIsHeadphoneGuideOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
      />
    </div>
  );
};

export default App;
