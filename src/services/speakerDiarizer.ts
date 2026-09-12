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

  // Pitch tracking & conversational state
  private recentPitches: number[] = [];
  private lastVoicedTimestamp: number = 0;
  private silenceDurationMs: number = 0;
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
      this.lastVoicedTimestamp = Date.now();
      this.lastAnalysisTime = 0;
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
    // Throttle CPU-intensive autocorrelation loop to every 100ms instead of 16ms (60fps)
    if (now - this.lastAnalysisTime < 100) {
      this.animFrameId = requestAnimationFrame(this.loop);
      return;
    }
    this.lastAnalysisTime = now;

    (this.analyser as any).getFloatTimeDomainData(this.timeBuffer);

    const { rms, pitch } = this.detectPitchAndEnergy(this.timeBuffer, this.audioContext?.sampleRate || 44100);

    const isSpeaking = rms > 0.018 && pitch > 65 && pitch < 400;

    if (this.callbacks.onVoiceActivity) {
      this.callbacks.onVoiceActivity(isSpeaking, pitch, rms);
    }

    if (isSpeaking) {
      this.silenceDurationMs = now - this.lastVoicedTimestamp;
      this.lastVoicedTimestamp = now;

      if (this.isEnabled && this.speakers.length > 1) {
        this.recentPitches.push(pitch);
        if (this.recentPitches.length > 8) {
          this.recentPitches.shift();
        }

        // If after a significant conversational pause (> 1100ms) or significant pitch shift
        if (this.silenceDurationMs > 1100 && this.recentPitches.length >= 4) {
          const avgPitch = this.recentPitches.reduce((a, b) => a + b, 0) / this.recentPitches.length;
          const detectedSpeakerId = this.classifySpeaker(avgPitch);

          if (detectedSpeakerId && detectedSpeakerId !== this.activeSpeakerId) {
            this.activeSpeakerId = detectedSpeakerId;
            this.callbacks.onSpeakerChanged(detectedSpeakerId);
          }
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Find closest speaker profile matching fundamental pitch F0
   */
  private classifySpeaker(pitchHz: number): string | null {
    if (this.speakers.length <= 1) return null;

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
   * Time-domain autocorrelation pitch detection
   */
  private detectPitchAndEnergy(buffer: any, sampleRate: number): { rms: number; pitch: number } {
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);

    if (rms < 0.015) {
      return { rms, pitch: 0 };
    }

    // Autocorrelation within human vocal range (70Hz - 450Hz)
    const minPeriod = Math.floor(sampleRate / 450);
    const maxPeriod = Math.floor(sampleRate / 70);

    let bestR = 0;
    let bestPeriod = -1;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let r = 0;
      for (let i = 0; i < buffer.length - period; i++) {
        r += buffer[i] * buffer[i + period];
      }
      if (r > bestR) {
        bestR = r;
        bestPeriod = period;
      }
    }

    let pitch = 0;
    if (bestPeriod > 0 && bestR > 0.3 * sumSquares) {
      pitch = sampleRate / bestPeriod;
    }

    return { rms, pitch };
  }
}
