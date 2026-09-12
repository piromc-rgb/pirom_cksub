export interface DeepgramHandlers {
  onInterim: (text: string, speakerId?: string) => void;
  onFinal: (text: string, confidence: number, speakerId?: string) => void;
  onError: (error: string) => void;
  onStatusChange: (isListening: boolean) => void;
}

export class DeepgramNova3Recognizer {
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream;
  private apiKey: string;
  private handlers: DeepgramHandlers;
  private isCurrentlyListening: boolean = false;
  private isManuallyStopped: boolean = false;
  private lastFinalTranscript: string = '';

  constructor(apiKey: string, stream: MediaStream, handlers: DeepgramHandlers) {
    this.apiKey = apiKey.trim();
    this.stream = stream;
    this.handlers = handlers;
  }

  public updateStream(stream: MediaStream) {
    this.stream = stream;
  }

  public start() {
    if (!this.apiKey) {
      this.handlers.onError('กรุณากรอก Deepgram API Key ในการตั้งค่า (Settings) เพื่อใช้งานโมเดล Nova-3');
      return;
    }

    this.isManuallyStopped = false;
    this.lastFinalTranscript = '';
    this.initWebSocket();
  }

  private initWebSocket() {
    try {
      // Nova-3 State-of-the-Art model endpoint with smart formatting, diarization, and interim streaming
      const params = new URLSearchParams({
        model: 'nova-3',
        language: 'en',
        smart_format: 'true',
        interim_results: 'true',
        diarize: 'true',
        punctuate: 'true',
        utterance_end_ms: '1000',
        vad_events: 'true',
      });

      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

      // In browser, pass apiKey via WebSocket subprotocol 'token'
      this.socket = new WebSocket(wsUrl, ['token', this.apiKey]);

      this.socket.onopen = () => {
        this.isCurrentlyListening = true;
        this.handlers.onStatusChange(true);
        this.startMediaRecording();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = (event) => {
        console.warn('Deepgram WebSocket error:', event);
        this.handlers.onError('Deepgram Nova-3 connection error. กรุณาตรวจสอบความถูกต้องของ API Key');
      };

      this.socket.onclose = (event) => {
        this.isCurrentlyListening = false;
        this.handlers.onStatusChange(false);
        this.stopMediaRecording();

        // If connection dropped unexpectedly and not manually stopped, reconnect
        if (!this.isManuallyStopped && event.code !== 1000) {
          console.log('Deepgram connection closed, attempting reconnect...');
          setTimeout(() => {
            if (!this.isManuallyStopped) {
              this.initWebSocket();
            }
          }, 1500);
        }
      };
    } catch (err: any) {
      this.handlers.onError(`Failed to connect to Deepgram: ${err.message}`);
    }
  }

  private startMediaRecording() {
    try {
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(event.data);
        }
      };

      this.mediaRecorder.start(250); // Send audio chunks every 250ms for low-latency STT
    } catch (e: any) {
      console.warn('MediaRecorder init error for Deepgram:', e);
      this.handlers.onError(`Audio recording error: ${e.message}`);
    }
  }

  private stopMediaRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      this.mediaRecorder = null;
    }
  }

  private handleMessage(rawData: string) {
    try {
      const data = JSON.parse(rawData);

      // Deepgram result format
      if (data.type === 'Results' || data.channel) {
        const alt = data.channel?.alternatives?.[0];
        const transcript = alt?.transcript || '';
        const confidence = alt?.confidence || 0.95;

        // Auto-extract speaker ID from Deepgram Nova-3 diarization words
        let speakerId: string | undefined;
        if (alt?.words && alt.words.length > 0 && typeof alt.words[0].speaker === 'number') {
          speakerId = `spk_${alt.words[0].speaker + 1}`;
        }

        const cleanTranscript = transcript.trim();
        if (cleanTranscript) {
          if (data.is_final) {
            if (cleanTranscript !== this.lastFinalTranscript) {
              this.lastFinalTranscript = cleanTranscript;
              this.handlers.onFinal(cleanTranscript, confidence, speakerId);
            }
          } else {
            this.handlers.onInterim(cleanTranscript, speakerId);
          }
        }
      }
    } catch (e) {
      console.warn('Deepgram message parsing error:', e);
    }
  }

  public stop() {
    this.isManuallyStopped = true;
    this.stopMediaRecording();
    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          // Send close stream message if possible
          this.socket.send(JSON.stringify({ type: 'CloseStream' }));
        }
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }
    this.isCurrentlyListening = false;
    this.handlers.onStatusChange(false);
  }

  public isListening(): boolean {
    return this.isCurrentlyListening;
  }
}
