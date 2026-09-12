import { SpeakerProfile } from '../types/subtitle';

export interface DiarizerCallbacks {
  onSpeakerChanged: (speakerId: string) => void;
  onVoiceActivity?: (isSpeaking: boolean, pitchHz: number, volume: number) => void;
}

export class SpeakerDiarizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;

  private speakers: SpeakerProfile[] = [];
  private activeSpeakerId: string = 'spk_1';
  private callbacks: DiarizerCallbacks;
  private isEnabled: boolean = true;

  // Analysis buffers
  private bufferSize = 2048;
  private timeBuffer: Float32Array = new Float32Array(this.bufferSize);

  // Conversational state & pitch history
  private recentPitchBuffer: number[] = [];
  private lastVoicedTime: number = 0;
  private lastSilenceDuration: number = 0;
  private lastAnalysisTime: number = 0;

  constructor(speakers: SpeakerProfile[], callbacks: DiarizerCallbacks) {
    this.speakers = speakers;
    this.callbacks = callbacks;
    if (speakers.length > 0) {
      this.activeSpeakerId = speakers[0].id;
    }
  }

  public setSpeakers(speakers: SpeakerProfile[]) {
    this.speakers = speakers;
  }

  public setActiveSpeaker(speakerId: string) {
    this.activeSpeakerId = speakerId;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public start(stream: MediaStream) {
    this.stop();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      // Analyser only - DO NOT connect to audioContext.destination to prevent any audio feedback or echo
      this.lastVoicedTime = Date.now();
      this.lastSilenceDuration = 0;
      this.lastAnalysisTime = 0;
      this.recentPitchBuffer = [];
      this.loop();
    } catch (e) {
      console.warn('SpeakerDiarizer init error:', e);
    }
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
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
  }

  private loop = () => {
    if (!this.analyser) return;

    const now = Date.now();
    // Throttle autocorrelation calculation to run every 90ms
    if (now - this.lastAnalysisTime < 90) {
      this.animFrameId = requestAnimationFrame(this.loop);
      return;
    }
    this.lastAnalysisTime = now;

    (this.analyser as any).getFloatTimeDomainData(this.timeBuffer);

    const { rms, pitch } = this.detectPitchAndEnergy(this.timeBuffer, this.audioContext?.sampleRate || 44100);

    const isSpeaking = rms > 0.012 && (pitch > 65 || rms > 0.03);

    if (this.callbacks.onVoiceActivity) {
      this.callbacks.onVoiceActivity(isSpeaking, pitch, rms);
    }

    if (isSpeaking) {
      if (this.recentPitchBuffer.length === 0 && this.lastVoicedTime > 0) {
        // Speech started after a pause
        this.lastSilenceDuration = now - this.lastVoicedTime;
      }
      this.lastVoicedTime = now;

      if (pitch >= 70 && pitch <= 420) {
        this.recentPitchBuffer.push(pitch);
        if (this.recentPitchBuffer.length > 8) {
          this.recentPitchBuffer.shift();
        }
      }

      // Check speaker classification when we have at least 2 valid pitch measurements
      if (this.isEnabled && this.speakers.length > 1 && this.recentPitchBuffer.length >= 2) {
        const sorted = [...this.recentPitchBuffer].sort((a, b) => a - b);
        const medianPitch = sorted[Math.floor(sorted.length / 2)];

        const bestSpeakerId = this.classifySpeaker(medianPitch);
        if (bestSpeakerId && bestSpeakerId !== this.activeSpeakerId) {
          const currentProfile = this.speakers.find((s) => s.id === this.activeSpeakerId);
          const currentBaseline = currentProfile?.pitchBaseline || 150;
          const pitchDiff = Math.abs(medianPitch - currentBaseline);

          // Switch speaker if there was a pause (> 300ms) OR significant pitch difference (> 28 Hz)
          if (this.lastSilenceDuration > 300 || pitchDiff > 28) {
            this.activeSpeakerId = bestSpeakerId;
            this.callbacks.onSpeakerChanged(bestSpeakerId);
            this.lastSilenceDuration = 0; // reset
          }
        }
      }
    } else {
      // Silence period
      if (now - this.lastVoicedTime > 350) {
        // Pause detected - clear buffer so the next speaker starts fresh
        this.recentPitchBuffer = [];
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Find closest speaker profile matching fundamental pitch F0
   */
  private classifySpeaker(pitchHz: number): string | null {
    if (this.speakers.length <= 1) return this.speakers[0]?.id || null;

    let closestId: string = this.speakers[0].id;
    let minDiff = Infinity;

    for (const spk of this.speakers) {
      const baseline = spk.pitchBaseline || 150;
      const diff = Math.abs(pitchHz - baseline);
      if (diff < minDiff) {
        minDiff = diff;
        closestId = spk.id;
      }
    }

    return closestId;
  }

  /**
   * Normalized cross-correlation pitch detection
   */
  private detectPitchAndEnergy(buffer: any, sampleRate: number): { rms: number; pitch: number } {
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);

    if (rms < 0.01) {
      return { rms, pitch: 0 };
    }

    // Autocorrelation within human vocal range (70Hz - 420Hz)
    const minPeriod = Math.floor(sampleRate / 420);
    const maxPeriod = Math.floor(sampleRate / 70);

    let maxNormR = 0;
    let bestPeriod = -1;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let r = 0;
      const count = buffer.length - period;
      for (let i = 0; i < count; i++) {
        r += buffer[i] * buffer[i + period];
      }
      const normR = r / count;
      if (normR > maxNormR) {
        maxNormR = normR;
        bestPeriod = period;
      }
    }

    const meanSquare = sumSquares / buffer.length;
    let pitch = 0;
    if (bestPeriod > 0 && maxNormR > 0.28 * meanSquare) {
      pitch = Math.round(sampleRate / bestPeriod);
    }

    return { rms, pitch };
  }
}
