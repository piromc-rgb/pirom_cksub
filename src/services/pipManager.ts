import { SubtitleSegment } from '../types/subtitle';
import { AppSettings } from '../types/settings';

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
      window?: Window | null;
    };
  }
}

export class SubtitlePiPManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private animId: number | null = null;
  private currentSubtitle: SubtitleSegment | null = null;
  private settings: AppSettings;
  private docPipWindow: Window | null = null;

  constructor(settings: AppSettings) {
    this.settings = settings;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 960;
    this.canvas.height = 240;
    this.ctx = this.canvas.getContext('2d');

    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
  }

  public updateSettings(settings: AppSettings) {
    this.settings = settings;
    if (this.docPipWindow) {
      this.updateDocPipContent();
    }
  }

  public updateSubtitle(sub: SubtitleSegment | null) {
    this.currentSubtitle = sub;
    if (this.docPipWindow) {
      this.updateDocPipContent();
    }
  }

  public isPiPActive(): boolean {
    return document.pictureInPictureElement === this.video || !!this.docPipWindow;
  }

  /**
   * Request floating PiP window
   */
  public async requestPiP(): Promise<'doc-pip' | 'video-pip'> {
    // 1. Try Document Picture-in-Picture API (Chrome 111+)
    if (window.documentPictureInPicture && typeof window.documentPictureInPicture.requestWindow === 'function') {
      try {
        this.docPipWindow = await window.documentPictureInPicture.requestWindow({
          width: 800,
          height: 200,
        });

        // Copy styles to the pip window
        const allStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
        allStyles.forEach(style => {
          this.docPipWindow!.document.head.appendChild(style.cloneNode(true));
        });

        this.docPipWindow.document.body.className = 'bg-[#0a0d14] text-white p-4 m-0 overflow-hidden flex flex-col justify-center';
        this.updateDocPipContent();

        this.docPipWindow.addEventListener('pagehide', () => {
          this.docPipWindow = null;
        });

        return 'doc-pip';
      } catch (err) {
        console.warn('Document PiP failed or not permitted, falling back to Canvas PiP:', err);
      }
    }

    // 2. Canvas Video PiP fallback (Supported in all modern browsers)
    this.startCanvasRenderLoop();
    this.stream = (this.canvas as any).captureStream(30);
    this.video.srcObject = this.stream;
    await this.video.play();
    await this.video.requestPictureInPicture();

    this.video.addEventListener('leavepictureinpicture', () => {
      this.stopCanvasRenderLoop();
    }, { once: true });

    return 'video-pip';
  }

  public async exitPiP() {
    if (this.docPipWindow) {
      this.docPipWindow.close();
      this.docPipWindow = null;
    }
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
    }
    this.stopCanvasRenderLoop();
  }

  private updateDocPipContent() {
    if (!this.docPipWindow) return;
    const body = this.docPipWindow.document.body;
    const sub = this.currentSubtitle;

    if (!sub || (!sub.englishText && !sub.thaiText)) {
      body.innerHTML = `
        <div style="font-family: 'Inter', 'Prompt', sans-serif; text-align: center; color: #64748b; font-size: 14px;">
          <div style="margin-bottom: 4px; font-weight: 600; color: #38bdf8;">✦ CHAKEN Sub EN ➔ TH</div>
          Waiting for meeting audio... (รอรับเสียงการประชุม)
        </div>
      `;
      return;
    }

    const thaiColor = this.settings.textColor === 'yellow' ? '#fde047' : this.settings.textColor === 'cyan' ? '#38bdf8' : '#ffffff';

    let content = '';
    if (this.settings.displayMode === 'bilingual' || this.settings.displayMode === 'en-only') {
      content += `<div style="font-size: 11px; color: #cbd5e1; opacity: 0.9; line-height: 1.3; margin-bottom: 3px;">${sub.englishText}</div>`;
    }
    if ((this.settings.displayMode === 'bilingual' || this.settings.displayMode === 'thai-only') && sub.thaiText) {
      content += `<div style="font-size: 14px; font-weight: 600; color: ${thaiColor}; line-height: 1.4;">${sub.thaiText}</div>`;
    }

    body.innerHTML = `
      <div style="font-family: 'Inter', 'Prompt', sans-serif; background: rgba(15, 23, 42, ${this.settings.bgOpacity}); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(56, 189, 248, 0.2);">
        ${content}
      </div>
    `;
  }

  private startCanvasRenderLoop() {
    const render = () => {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Dark glass background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      // Gradient Accent bar on top
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#4f46e5');
      grad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, 4);

      if (!this.currentSubtitle) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px Prompt, Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦ CHAKEN Sub - กำลังรอรับเสียงการประชุม EN ➔ TH', w / 2, h / 2);
      } else {
        ctx.textAlign = 'left';
        let y = 35;

        // English Text (Top Row)
        if (this.settings.displayMode !== 'thai-only') {
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '400 13px Inter, sans-serif';
          ctx.fillText(this.currentSubtitle.englishText, 30, y, w - 60);
          y += 26;
        }

        // Thai Text (Bottom Row)
        if (this.settings.displayMode !== 'en-only' && this.currentSubtitle.thaiText) {
          ctx.fillStyle = this.settings.textColor === 'yellow' ? '#fde047' : this.settings.textColor === 'cyan' ? '#38bdf8' : '#ffffff';
          ctx.font = '600 16px Prompt, sans-serif';
          ctx.fillText(this.currentSubtitle.thaiText, 30, y, w - 60);
        }
      }

      this.animId = requestAnimationFrame(render);
    };

    render();
  }

  private stopCanvasRenderLoop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
