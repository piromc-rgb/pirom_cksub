import React, { useState, useEffect, useRef } from 'react';
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

import { SubtitleSegment, AudioInputMode } from './types/subtitle';
import { AppSettings, DEFAULT_SETTINGS } from './types/settings';
import { MeetingSpeechRecognizer } from './services/speechRecognition';
import { translateEnglishToThai } from './services/translationService';
import { SubtitlePiPManager } from './services/pipManager';

export const App: React.FC = () => {
  // State
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [currentInterim, setCurrentInterim] = useState<SubtitleSegment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioInputMode>('mic');
  const activeSpeaker = 'Speaker';
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

  // Services references
  const speechRecognizerRef = useRef<MeetingSpeechRecognizer | null>(null);
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

  // Handle Interim (Word-by-word streaming)
  const handleInterimSpeech = (englishText: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // Always preserve latest translated Thai text via ref so it NEVER wipes to empty & flickers!
    const currentThai = interimThaiRef.current;

    const interimObj: SubtitleSegment = {
      id: 'interim',
      timestamp: timeStr,
      rawTimeMs: Date.now() - meetingStartTimeRef.current,
      speaker: activeSpeaker,
      englishText,
      thaiText: currentThai,
      isFinal: false,
    };

    setCurrentInterim(interimObj);

    // Cancel pending debounce timer
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

      // Discard stale out-of-order network responses
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

    // Translate full finalized sentence
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
      speaker: activeSpeaker,
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
      setIsListening(false);
      setCurrentInterim(null);
    } else {
      // Start
      meetingStartTimeRef.current = Date.now();
      if (audioMode === 'tab') {
        // Tab screen audio capture + speech recognition
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });
            // Screen audio captured successfully
            stream.getVideoTracks().forEach((track) => track.stop()); // Stop unnecessary video track
          }
        } catch (e) {
          console.log('Tab audio request dismissed or not supported:', e);
        }
        speechRecognizerRef.current?.start();
        setIsListening(true);
      } else {
        // Direct Microphone
        speechRecognizerRef.current?.start();
        setIsListening(true);
      }
    }
  };

  // Switch Audio Mode
  const handleChangeAudioMode = (mode: AudioInputMode) => {
    if (isListening) {
      handleToggleListen(); // Stop currently active session first
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
        onRequestPip={handleRequestPip}
        isPipActive={isPipActive}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Meeting Controls Bar */}
        <MeetingControls
          isListening={isListening}
          audioMode={audioMode}
          onToggleListen={handleToggleListen}
          onChangeAudioMode={handleChangeAudioMode}
          onClearTranscript={handleClearTranscript}
          subtitleCount={subtitles.length}
          activeSpeaker={activeSpeaker}
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
    </div>
  );
};

export default App;
