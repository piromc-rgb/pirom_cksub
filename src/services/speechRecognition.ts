// Web Speech API interface definitions
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface SpeechRecognitionHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string, confidence: number) => void;
  onError: (error: string) => void;
  onStatusChange: (isListening: boolean) => void;
}

export class MeetingSpeechRecognizer {
  private recognition: any = null;
  private isExplicitlyStopped = true;
  private isCurrentlyListening = false;
  private handlers: SpeechRecognitionHandlers;
  private lang = 'en-US';
  private restartTimeoutId: any = null;
  private heartbeatIntervalId: any = null;
  private pendingInterim = '';

  constructor(handlers: SpeechRecognitionHandlers, lang = 'en-US') {
    this.handlers = handlers;
    this.lang = lang;
    this.initRecognition();
    this.startWatchdog();
  }

  public isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public updateHandlers(handlers: Partial<SpeechRecognitionHandlers>) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  private initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.handlers.onError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.lang;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isCurrentlyListening = true;
        this.handlers.onStatusChange(true);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 0.9;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = (item[0]?.transcript || '').trim();
          if (!text) continue;

          if (item.isFinal) {
            finalTranscript = finalTranscript ? `${finalTranscript} ${text}` : text;
            if (item[0].confidence) confidence = item[0].confidence;
          } else {
            interimTranscript = interimTranscript ? `${interimTranscript} ${text}` : text;
          }
        }

        if (interimTranscript) {
          this.pendingInterim = interimTranscript;
          this.handlers.onInterim(interimTranscript);
        }

        if (finalTranscript) {
          this.pendingInterim = '';
          this.handlers.onFinal(finalTranscript, confidence);
        }
      };

      this.recognition.onerror = (event: any) => {
        const err = event.error;
        // 'no-speech' is routine when user pauses talking - never terminate session
        if (err === 'no-speech') {
          return;
        }

        // 'aborted' happens during soft restart or device switch - safe to ignore
        if (err === 'aborted') {
          return;
        }

        console.warn('Speech recognition event error:', err);

        if (err === 'not-allowed') {
          this.isExplicitlyStopped = true;
          this.handlers.onError('Microphone access denied. Please allow microphone permissions in browser settings.');
          this.handlers.onStatusChange(false);
          return;
        }

        if (err === 'network' || err === 'audio-capture') {
          // Temporary network or audio glitch: schedule auto-recovery
          this.scheduleRestart(300);
        }
      };

      this.recognition.onend = () => {
        this.isCurrentlyListening = false;

        // Flush unfinalized interim speech so words spoken right before a pause are NEVER dropped!
        if (this.pendingInterim.trim()) {
          const textToFlush = this.pendingInterim.trim();
          this.pendingInterim = '';
          this.handlers.onFinal(textToFlush, 0.9);
        }

        // Auto-resurrect recognition seamlessly if user did not explicitly stop
        if (!this.isExplicitlyStopped) {
          this.scheduleRestart(120);
        } else {
          this.handlers.onStatusChange(false);
        }
      };
    } catch (e) {
      console.warn('Init SpeechRecognition error:', e);
    }
  }

  private scheduleRestart(delayMs = 120) {
    if (this.isExplicitlyStopped) return;
    if (this.restartTimeoutId) clearTimeout(this.restartTimeoutId);

    this.restartTimeoutId = setTimeout(() => {
      this.safeRestart();
    }, delayMs);
  }

  private safeRestart() {
    if (this.isExplicitlyStopped) return;
    if (this.isCurrentlyListening) return;

    try {
      this.recognition?.start();
    } catch (e: any) {
      // Re-initialize a fresh instance if Chrome entered an invalid state
      this.initRecognition();
      try {
        this.recognition?.start();
      } catch (err) {
        console.warn('Recognition restart retry error:', err);
      }
    }
  }

  private startWatchdog() {
    if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);

    // Watchdog every 2 seconds: ensures recognition never hangs silently
    this.heartbeatIntervalId = setInterval(() => {
      if (!this.isExplicitlyStopped && !this.isCurrentlyListening) {
        this.safeRestart();
      }
    }, 2000);
  }

  public start() {
    this.isExplicitlyStopped = false;
    this.pendingInterim = '';

    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) return;

    try {
      this.recognition.start();
    } catch (e: any) {
      this.initRecognition();
      try {
        this.recognition?.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  }

  public stop() {
    this.isExplicitlyStopped = true;
    this.pendingInterim = '';

    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Recognition stop error:', e);
      }
    }
    this.isCurrentlyListening = false;
    this.handlers.onStatusChange(false);
  }

  public destroy() {
    this.stop();
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  public isListening(): boolean {
    return this.isCurrentlyListening;
  }
}
