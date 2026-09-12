import { SpeakerProfile } from '../types/subtitle';

export interface DiarizerCallbacks {
  onSpeakerChanged: (speakerId: string) => void;
  onVoiceActivity?: (isSpeaking: boolean, pitchHz: number, volume: number) => void;
}

export class SpeakerDiarizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private lowpassNode: BiquadFilterNode | null = null;
  private animFrameId: number | null = null;

  private speakers: SpeakerProfile[] = [];
  private activeSpeakerId: string = 'spk_male';
  private callbacks: DiarizerCallbacks;
  private isEnabled: boolean = true;

  // Analysis buffers
  private bufferSize = 2048;
  private timeBuffer: Float32Array = new Float32Array(this.bufferSize);

  // Conversational state & gender voting history
  private recentPitchBuffer: number[] = [];
  private recentGenderVotes: string[] = [];
  private lastVoicedTime: number = 0;
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

      // Low-pass filter (350 Hz) keeps the fundamental frequency F0 (80-300 Hz)
      // and eliminates upper harmonics / formants that cause octave errors
      this.lowpassNode = this.audioContext.createBiquadFilter();
      this.lowpassNode.type = 'lowpass';
      this.lowpassNode.frequency.value = 350;
      this.lowpassNode.Q.value = 0.7;

      this.sourceNode.connect(this.lowpassNode);
      this.lowpassNode.connect(this.analyser);

      // Analyser only - DO NOT connect to audioContext.destination to prevent any audio feedback or echo
      this.lastVoicedTime = Date.now();
      this.lastAnalysisTime = 0;
      this.recentPitchBuffer = [];
      this.recentGenderVotes = [];
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
    if (this.lowpassNode) {
      try {
        this.lowpassNode.disconnect();
      } catch (e) {}
      this.lowpassNode = null;
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
    // Throttle autocorrelation calculation to run every 80ms
    if (now - this.lastAnalysisTime < 80) {
      this.animFrameId = requestAnimationFrame(this.loop);
      return;
    }
    this.lastAnalysisTime = now;

    (this.analyser as any).getFloatTimeDomainData(this.timeBuffer);

    const { rms, pitch } = this.detectPitchAndEnergy(this.timeBuffer, this.audioContext?.sampleRate || 44100);

    const isSpeaking = rms > 0.01 && (pitch > 65 || rms > 0.025);

    if (this.callbacks.onVoiceActivity) {
      this.callbacks.onVoiceActivity(isSpeaking, pitch, rms);
    }

    if (isSpeaking) {
      this.lastVoicedTime = now;

      if (pitch >= 75 && pitch <= 360) {
        const detectedGenderId = this.classifyGender(pitch);
        this.recentPitchBuffer.push(pitch);
        this.recentGenderVotes.push(detectedGenderId);

        if (this.recentGenderVotes.length > 5) {
          this.recentGenderVotes.shift();
        }
        if (this.recentPitchBuffer.length > 5) {
          this.recentPitchBuffer.shift();
        }

        // Evaluate votes over last few frames for smooth, reliable switching
        if (this.isEnabled && this.speakers.length > 1 && this.recentGenderVotes.length >= 2) {
          const maleSpeaker = this.speakers.find((s) => s.gender === 'male' || s.id === 'spk_male') || this.speakers[0];
          const femaleSpeaker = this.speakers.find((s) => s.gender === 'female' || s.id === 'spk_female') || this.speakers[1];

          let maleCount = 0;
          let femaleCount = 0;
          for (const vote of this.recentGenderVotes) {
            if (vote === maleSpeaker.id) maleCount++;
            else if (femaleSpeaker && vote === femaleSpeaker.id) femaleCount++;
          }

          const consensusId = maleCount >= femaleCount ? maleSpeaker.id : (femaleSpeaker ? femaleSpeaker.id : maleSpeaker.id);

          if (consensusId && consensusId !== this.activeSpeakerId) {
            this.activeSpeakerId = consensusId;
            this.callbacks.onSpeakerChanged(consensusId);
          }
        }
      }
    } else {
      // Pause
      if (now - this.lastVoicedTime > 400) {
        this.recentGenderVotes = [];
        this.recentPitchBuffer = [];
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Classify whether pitch belongs to Male or Female voice profile
   */
  private classifyGender(pitchHz: number): string {
    const maleSpeaker = this.speakers.find((s) => s.gender === 'male' || s.id === 'spk_male') || this.speakers[0];
    const femaleSpeaker = this.speakers.find((s) => s.gender === 'female' || s.id === 'spk_female') || this.speakers[1] || this.speakers[0];

    // Standard acoustic separation threshold between adult male and female speech: 165 Hz
    // Male F0: 85 - 160 Hz (center ~120 Hz)
    // Female F0: 175 - 265 Hz (center ~215 Hz)
    const threshold = 165;

    return pitchHz < threshold ? maleSpeaker.id : femaleSpeaker.id;
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

    if (rms < 0.008) {
      return { rms, pitch: 0 };
    }

    // Autocorrelation within human vocal range (75Hz - 380Hz)
    const minPeriod = Math.floor(sampleRate / 380);
    const maxPeriod = Math.floor(sampleRate / 75);

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
    if (bestPeriod > 0 && maxNormR > 0.22 * meanSquare) {
      pitch = Math.round(sampleRate / bestPeriod);
    }

    return { rms, pitch };
  }
}
