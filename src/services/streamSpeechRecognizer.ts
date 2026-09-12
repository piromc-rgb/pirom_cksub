export interface StreamSpeechHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string, confidence: number) => void;
  onError: (error: string) => void;
  onStatusChange: (isListening: boolean) => void;
}

export interface StreamSpeechOptions {
  geminiApiKey?: string;
  openaiApiKey?: string;
  enablePassThrough?: boolean; // Route audio to headphones so user can hear
}

export class StreamSpeechRecognizer {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  private isCurrentlyListening = false;
  private handlers: StreamSpeechHandlers;
  private options: StreamSpeechOptions;

  // Voice Activity Detection
  private isVoiceActive = false;
  private speechStartTime = 0;
  private silenceStartTime = 0;
  private audioChunks: Blob[] = [];

  constructor(handlers: StreamSpeechHandlers, options: StreamSpeechOptions = {}) {
    this.handlers = handlers;
    this.options = options;
  }

  public updateOptions(options: Partial<StreamSpeechOptions>) {
    this.options = { ...this.options, ...options };
  }

  public start(stream: MediaStream) {
    this.stop();
    this.mediaStream = stream;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        this.handlers.onError('Web Audio API is not supported in this browser.');
        return;
      }

      this.audioContext = new AudioCtx();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Analyser for Voice Activity Detection (VAD) - strictly NO destination connection to prevent any echo
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.sourceNode.connect(this.analyser);

      // 3. MediaRecorder for digital audio slicing
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          const combinedBlob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
          this.audioChunks = [];
          this.transcribeBlob(combinedBlob);
        }
      };

      this.mediaRecorder.start(1000); // 1-second chunks
      this.isCurrentlyListening = true;
      this.handlers.onStatusChange(true);

      this.monitorVoiceActivity();
    } catch (err: any) {
      console.error('StreamSpeechRecognizer start failed:', err);
      this.handlers.onError(`Stream Audio Error: ${err.message || err}`);
    }
  }

  public stop() {
    this.isCurrentlyListening = false;
    this.handlers.onStatusChange(false);

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.mediaRecorder = null;

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaStream = null;
    this.audioChunks = [];
  }

  public getStream(): MediaStream | null {
    return this.mediaStream;
  }

  public isListening(): boolean {
    return this.isCurrentlyListening;
  }

  private monitorVoiceActivity = () => {
    if (!this.analyser || !this.isCurrentlyListening) return;

    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(buffer);

    // Compute RMS volume
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const val = (buffer[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / buffer.length);
    const now = Date.now();

    const isSpeakingNow = rms > 0.025;

    if (isSpeakingNow) {
      if (!this.isVoiceActive) {
        this.isVoiceActive = true;
        this.speechStartTime = now;
      }
      this.silenceStartTime = 0;

      // If speech duration exceeds 3.5 seconds, trigger a chunk transcription
      if (now - this.speechStartTime > 3500 && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.requestData();
        this.flushCurrentChunk();
        this.speechStartTime = now;
      }
    } else {
      if (this.isVoiceActive) {
        if (!this.silenceStartTime) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime > 1000) {
          // Pause > 1s after speech -> Finalize sentence chunk!
          this.isVoiceActive = false;
          this.silenceStartTime = 0;
          this.flushCurrentChunk();
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.monitorVoiceActivity);
  };

  private flushCurrentChunk() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;
    try {
      this.mediaRecorder.requestData();
      setTimeout(() => {
        if (this.audioChunks.length > 0) {
          const blob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() || 'audio/webm' });
          this.audioChunks = [];
          this.transcribeBlob(blob);
        }
      }, 150);
    } catch (e) {
      console.warn('Flush audio chunk error:', e);
    }
  }

  private async transcribeBlob(blob: Blob) {
    if (blob.size < 2000) return; // Ignore empty / silence blips

    // 1. If Gemini API Key is provided: Use Gemini 1.5 Flash Direct Audio Transcription
    if (this.options.geminiApiKey) {
      try {
        const base64Audio = await this.blobToBase64(blob);
        const prompt = `You are a real-time speech-to-text transcriber for online meetings. Listen to this audio clip and transcribe the English spoken words verbatim.
Rules:
- Return ONLY the exact transcribed text.
- Do not add timestamps, speaker labels, or conversational remarks.
- If the clip contains no speech or only noise/silence, return an empty string.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.options.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: blob.type.split(';')[0] || 'audio/webm',
                        data: base64Audio,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 200,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            const cleanText = text.replace(/^["']|["']$/g, '').trim();
            if (cleanText) {
              this.handlers.onFinal(cleanText, 0.95);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Gemini stream transcription error:', err);
      }
    }

    // 2. If OpenAI Whisper API Key is provided
    if (this.options.openaiApiKey) {
      try {
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.options.openaiApiKey}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.text?.trim()) {
            this.handlers.onFinal(data.text.trim(), 0.95);
            return;
          }
        }
      } catch (err) {
        console.warn('OpenAI Whisper transcription error:', err);
      }
    }

    // 3. If no API key configured, guide user
    if (!this.options.geminiApiKey && !this.options.openaiApiKey) {
      this.handlers.onError(
        'กำลังดักฟังเสียงจากหูฟัง/แท็บได้สมบูรณ์ แต่ยังไม่ได้ใส่ Google Gemini API Key ในหน้าตั้งค่า (ใส่เพื่อถอดเสียงภาษาอังกฤษจากหูฟังได้ฟรีทันที)'
      );
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  }
}
