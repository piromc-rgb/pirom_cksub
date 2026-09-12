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
  private isManuallyStopped = false;
  private isCurrentlyListening = false;
  private handlers: SpeechRecognitionHandlers;
  private lang = 'en-US';

  constructor(handlers: SpeechRecognitionHandlers, lang = 'en-US') {
    this.handlers = handlers;
    this.lang = lang;
    this.initRecognition();
  }

  public isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.handlers.onError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.lang;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isCurrentlyListening = true;
      this.handlers.onStatusChange(true);
    };

    let lastInterimText = '';
    let lastInterimConfidence = 0.85;

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 0.9;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          finalTranscript = finalTranscript ? `${finalTranscript} ${text.trim()}` : text.trim();
          if (item[0]?.confidence) confidence = item[0].confidence;
        } else {
          interimTranscript = interimTranscript ? `${interimTranscript} ${text.trim()}` : text.trim();
        }
      }

      // CRITICAL: Process finalized chunk FIRST so it doesn't wipe subsequent interim
      if (finalTranscript.trim()) {
        lastInterimText = '';
        this.handlers.onFinal(finalTranscript.trim(), confidence);
      }

      // Then process any new interim for the next sentence
      if (interimTranscript.trim()) {
        lastInterimText = interimTranscript.trim();
        lastInterimConfidence = confidence;
        this.handlers.onInterim(interimTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      // Ignore routine 'no-speech' network interruptions
      if (event.error === 'no-speech') {
        return;
      }
      console.warn('Speech recognition event error:', event.error);
      if (event.error === 'not-allowed') {
        this.handlers.onError('Microphone access denied. Please allow microphone permissions in browser settings.');
      } else {
        this.handlers.onError(`Speech error: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      this.isCurrentlyListening = false;
      this.handlers.onStatusChange(false);

      // CRITICAL: Flush any unfinalized interim speech so trailing words are NEVER lost on cut!
      if (lastInterimText.trim()) {
        const flushText = lastInterimText.trim();
        lastInterimText = '';
        this.handlers.onFinal(flushText, lastInterimConfidence);
      }

      // Auto-restart if not manually stopped
      if (!this.isManuallyStopped) {
        try {
          this.recognition.start();
        } catch (e) {
          // Ignore rapid restart collision
        }
      }
    };
  }

  public start() {
    this.isManuallyStopped = false;
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) return;

    try {
      this.recognition.start();
    } catch (e: any) {
      console.warn('Recognition start caught error:', e);
    }
  }

  public stop() {
    this.isManuallyStopped = true;
    if (this.recognition && this.isCurrentlyListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Recognition stop error:', e);
      }
    }
  }

  public isListening(): boolean {
    return this.isCurrentlyListening;
  }
}
